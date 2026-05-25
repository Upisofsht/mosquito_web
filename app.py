from flask import Flask, jsonify, send_from_directory, render_template_string, request
from flask_cors import CORS
import random
import ut.sqlFunctions as sqlFunc
from ut.chart_2type import generate_chart_for_address
from datetime import datetime, timedelta
import os
import sys
import logging
import json as json_module
import urllib.request
import urllib.error
import mysql.connector
from apscheduler.schedulers.background import BackgroundScheduler
import ssl
import re

# MQTT：觸發 Pi 拍照用
try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False

MQTT_BROKER = os.getenv('MQTT_BROKER', 'mosweb.ddns.net')
MQTT_PORT = int(os.getenv('MQTT_PORT', '1883'))
MQTT_TAKE_PHOTO_TOPIC = "device/{device_id}/command"
MQTT_TAKE_PHOTO_PAYLOAD = "take_photo"

def publish_take_photo(device_id):
    """發送 MQTT 指令讓 Pi 即時拍照（Pi 收到後會把 DB take_photo 清 0，避免重複觸發）"""
    if not MQTT_AVAILABLE:
        logging.warning("paho-mqtt 未安裝，略過 MQTT 發送")
        return
    try:
        client = mqtt.Client(client_id=f"web_{device_id}_trigger")
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        topic = MQTT_TAKE_PHOTO_TOPIC.format(device_id=device_id)
        client.publish(topic, MQTT_TAKE_PHOTO_PAYLOAD)
        client.disconnect()
        logging.info(f"MQTT 已發送 take_photo 至 {topic}")
    except Exception as e:
        logging.warning(f"MQTT 發送失敗 (不影響 DB 觸發): {e}")

# 嘗試載入環境變數
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("警告: python-dotenv 未安裝")
    pass

app = Flask(__name__)

# 日誌：寫入檔案並輪替，避免單檔過大（NSSM 可不導向 stdout/stderr）
LOG_DIR = os.getenv('LOG_DIR', os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs'))
LOG_FILE = os.path.join(LOG_DIR, 'mosquito_web.log')
LOG_MAX_BYTES = 5 * 1024 * 1024   # 單檔約 5MB
LOG_BACKUP_COUNT = 2
try:
    from logging.handlers import RotatingFileHandler
    os.makedirs(LOG_DIR, exist_ok=True)
    _fh = RotatingFileHandler(LOG_FILE, maxBytes=LOG_MAX_BYTES, backupCount=LOG_BACKUP_COUNT, encoding='utf-8')
    _fh.setLevel(logging.INFO)
    _fh.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(message)s'))
    logging.getLogger().addHandler(_fh)
    logging.getLogger().setLevel(logging.INFO)
except Exception as e:
    print(f"無法建立 log 檔 {LOG_FILE}: {e}")

# 限制 CORS 來源以提高安全性
CORS(app, resources={r"/api/*": {"origins": "https://mosweb.ddns.net"}})

# 設定圖片檔案的實際儲存目錄
PHOTO_STORAGE_DIR = os.getenv('PHOTO_STORAGE_DIR', 'D:/mosquito/mos_mysql')
BASE_PHOTO_URL = os.getenv('BASE_PHOTO_URL', 'https://mosweb.ddns.net/mosquito/mos_mysql/')

# 隨機生成高雄附近的 Marker 數據
def generate_markers():
    markers = []
    for level in range(1, 8):
        latitude = round(random.uniform(22.6, 22.8), 6)
        longitude = round(random.uniform(120.2, 120.4), 6)
        markers.append({"latitude": latitude, "longitude": longitude, "level": level})
    return markers

# 提供 index.html
@app.route('/')
def home():
    return send_from_directory('.', 'index.html')

# 提供靜態資源 (CSS 和 JS)
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('js', filename)

@app.route('/mosquito/mos_mysql/<path:filename>')
def serve_photo(filename):
    try:
        return send_from_directory(PHOTO_STORAGE_DIR, filename)
    except Exception as e:
        logging.error(f"Failed to serve photo {filename}: {str(e)}, "
                      f"Referer: {request.headers.get('Referer', 'None')}, "
                      f"User-Agent: {request.headers.get('User-Agent', 'None')}")
        return jsonify({"error": "Photo not found"}), 404


@app.route('/history/<path:filename>')
def serve_history_chart(filename):
    """LINE Bot 歷史紀錄折線圖。Caddy 把 /history/* 送到 5001（除了 callback/upload/getphoto 外都過來），
    但圖檔是 new2.py 那邊產生的，所以這裡轉一手到 PHOTO_STORAGE_DIR/history/。"""
    try:
        return send_from_directory(os.path.join(PHOTO_STORAGE_DIR, 'history'), filename)
    except Exception as e:
        logging.error(f"Failed to serve history chart {filename}: {e}")
        return jsonify({"error": "Chart not found"}), 404

@app.route('/api/markers', methods=['GET'])
def get_markers():
    return jsonify(generate_markers())

def convert_to_sql_time_format(iso_time):
    try:
        if 'T' in iso_time:
            dt = datetime.strptime(iso_time, '%Y-%m-%dT%H:%M')
        else:
            dt = datetime.strptime(iso_time, '%Y%m%d%H%M%S')
        return dt.strftime('%Y%m%d%H%M%S')
    except ValueError as e:
        raise ValueError(f"Invalid time format: {iso_time}. Expected ISO or SQL format.") from e

def validate_time_format(time_str):
    """驗證時間格式為 YYYYMMDDHHMMSS"""
    if not time_str or len(time_str) != 14 or not time_str.isdigit():
        return False
    try:
        datetime.strptime(time_str, '%Y%m%d%H%M%S')
        return True
    except ValueError:
        return False

@app.route('/api/data-by-time', methods=['GET'])
def get_data_by_time():
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')

    if not start_time or not end_time:
        return jsonify({"error": "Missing start_time or end_time"}), 400
    
    # 驗證時間格式
    if not validate_time_format(start_time) or not validate_time_format(end_time):
        return jsonify({"error": "Invalid time format. Expected YYYYMMDDHHMMSS"}), 400

    print("start: ", start_time)
    results = sqlFunc.get_data_with_device_name(start_time, end_time)
    if results:
        return jsonify(results)
    else:
        return jsonify({"error": "No data found"}), 404

@app.route('/api/all-address', methods=['GET'])
def get_all_addresses():
    results = sqlFunc.get_all_device_addresses()
    if results:
        return jsonify(results)
    else:
        return jsonify({"error": "No addresses found"}), 404

_PI_FILES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'mos-pi')
_PI_ALLOWED_FILES = {
    'main.py', 'fetcher.py', 'mqtt_service.py', 'cam.py',
    'sender.py', 'connect.py', 'config_loader.py', 'SQL.py',
    'wifi_locator.py', 'updater.py', 'tunnel_manager.py',
}

@app.route('/api/pi-version', methods=['GET'])
def get_pi_version():
    version_file = os.path.join(_PI_FILES_DIR, 'version.txt')
    try:
        with open(version_file, 'r') as f:
            return jsonify({"version": f.read().strip()})
    except Exception:
        return jsonify({"error": "version file not found"}), 404

@app.route('/api/pi-files/<filename>', methods=['GET'])
def get_pi_file(filename):
    if filename not in _PI_ALLOWED_FILES:
        return jsonify({"error": "not found"}), 404
    return send_from_directory(os.path.abspath(_PI_FILES_DIR), filename)

_TRAFFIC_ALERT_THRESHOLD_BYTES = int(os.getenv('TRAFFIC_ALERT_THRESHOLD_BYTES', str(4 * 1024 ** 3)))

@app.route('/traffic')
def traffic_page():
    period_key = datetime.now().strftime('%Y-%m')
    try:
        rows = sqlFunc.select(
            "SELECT d.device_id, d.device_name, "
            "       COALESCE(t.used_bytes, 0) AS used_bytes, "
            "       t.alerted_at, t.updated_at, d.last_seen "
            "FROM device d "
            "LEFT JOIN device_traffic t "
            "  ON d.device_id = t.device_id AND t.period_key = %s "
            "ORDER BY used_bytes DESC, d.device_name",
            (period_key,),
        ) or []
    except Exception as e:
        return f"<pre>查詢失敗: {e}</pre>", 500

    now = datetime.now()
    threshold_gb = _TRAFFIC_ALERT_THRESHOLD_BYTES / (1024 ** 3)
    items = []
    for r in rows:
        used = r.get('used_bytes') or 0
        used_gb = used / (1024 ** 3)
        used_mb = used / (1024 ** 2)
        usage_str = (f"{used_gb:.2f} GB" if used_gb >= 1
                     else (f"{used_mb:.1f} MB" if used > 0 else "—"))
        pct = min(100, used_gb / threshold_gb * 100) if threshold_gb > 0 else 0
        if pct >= 100:
            color = '#dc2626'
        elif pct >= 75:
            color = '#f59e0b'
        else:
            color = '#10b981'
        last_seen = r.get('last_seen')
        if isinstance(last_seen, str):
            try:
                last_seen = datetime.strptime(last_seen, '%Y-%m-%d %H:%M:%S')
            except Exception:
                last_seen = None
        online = bool(last_seen and (now - last_seen).total_seconds() < 180)
        updated_at = r.get('updated_at')
        items.append({
            'device_id':   r['device_id'],
            'device_name': r['device_name'] or r['device_id'],
            'usage_str':   usage_str,
            'pct':         pct,
            'color':       color,
            'alerted_at':  r.get('alerted_at'),
            'updated_at':  updated_at.strftime('%m-%d %H:%M') if updated_at else '—',
            'online':      online,
        })

    html = render_template_string(_TRAFFIC_TEMPLATE,
                                  items=items,
                                  period_key=period_key,
                                  threshold_gb=threshold_gb,
                                  generated_at=now.strftime('%Y-%m-%d %H:%M:%S'))
    return html


_TRAFFIC_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-TW"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>4G 流量監測</title>
<style>
  body { font-family: -apple-system, "Segoe UI", "Microsoft JhengHei", sans-serif;
         background: #0f172a; color: #e2e8f0; margin: 0; padding: 24px; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .meta { color: #94a3b8; font-size: 13px; margin-bottom: 20px; }
  table { width: 100%; max-width: 900px; border-collapse: collapse;
          background: #1e293b; border-radius: 8px; overflow: hidden; }
  th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #334155; }
  th { background: #334155; font-weight: 600; font-size: 13px; color: #cbd5e1; }
  tr:last-child td { border-bottom: none; }
  .bar-wrap { background: #334155; border-radius: 4px; height: 8px; width: 160px; overflow: hidden; }
  .bar { height: 100%; transition: width .3s; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%;
         margin-right: 6px; vertical-align: middle; }
  .online  { background: #10b981; }
  .offline { background: #6b7280; }
  .alert { color: #f87171; font-weight: 600; }
  .footer { color: #64748b; font-size: 12px; margin-top: 16px; }
</style></head>
<body>
  <h1>📊 4G 流量監測</h1>
  <div class="meta">本月 {{ period_key }}　|　警告閾值 {{ '%.1f' % threshold_gb }} GB　|　更新於 {{ generated_at }}</div>
  <table>
    <thead><tr><th>裝置</th><th>本月用量</th><th>進度</th><th>最後回報</th><th>狀態</th></tr></thead>
    <tbody>
    {% for it in items %}
      <tr>
        <td>{{ it.device_name }} <span style="color:#64748b">({{ it.device_id }})</span></td>
        <td{% if it.alerted_at %} class="alert"{% endif %}>{{ it.usage_str }}{% if it.alerted_at %} ⚠️{% endif %}</td>
        <td>
          <div class="bar-wrap"><div class="bar" style="width:{{ it.pct }}%; background:{{ it.color }}"></div></div>
        </td>
        <td style="color:#94a3b8">{{ it.updated_at }}</td>
        <td><span class="dot {{ 'online' if it.online else 'offline' }}"></span>{{ '在線' if it.online else '離線' }}</td>
      </tr>
    {% endfor %}
    </tbody>
  </table>
  <div class="footer">資料來自 device_traffic 表，Pi 每小時上報一次。頁面手動重新整理。</div>
</body></html>
"""


@app.route('/api/device-health', methods=['GET'])
def get_device_health():
    rows = sqlFunc.select(
        "SELECT device_id, device_name, last_seen, cpu_temp, disk_pct, pending_count FROM device ORDER BY device_name"
    )
    if not rows:
        return jsonify([])
    now = datetime.now()
    result = []
    for r in rows:
        last_seen = r.get('last_seen')
        online = False
        if last_seen:
            if isinstance(last_seen, str):
                last_seen = datetime.strptime(last_seen, '%Y-%m-%d %H:%M:%S')
            online = (now - last_seen).total_seconds() < 180
        result.append({
            'device_id':    r['device_id'],
            'device_name':  r['device_name'],
            'online':       online,
            'cpu_temp':     r.get('cpu_temp'),
            'disk_pct':     r.get('disk_pct'),
            'pending_count': r.get('pending_count'),
        })
    return jsonify(result)

@app.route('/api/chart-for-id', methods=['GET'])
def get_chart_for_address():
    id = request.args.get('id')
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')

    if not id:
        return jsonify({"error": "Missing id parameter"}), 400
    if not start_time or not end_time:
        return jsonify({"error": "Missing start_time or end_time parameter"}), 400

    try:
        if not (start_time.isdigit() and end_time.isdigit() and len(start_time) == 14 and len(end_time) == 14):
            return jsonify({"error": "Invalid time format. Expected YYYYMMDDHHMMSS"}), 400
        datetime.strptime(start_time, '%Y%m%d%H%M%S')
        datetime.strptime(end_time, '%Y%m%d%H%M%S')
    except ValueError:
        return jsonify({"error": "Invalid time format. Expected YYYYMMDDHHMMSS"}), 400

    try:
        print(f"Generating chart for id={id}, start_time={start_time}, end_time={end_time}")
        chart_html = generate_chart_for_address(id, start_time, end_time)
        if chart_html:
            return jsonify({"chart_html": chart_html}), 200
        else:
            return jsonify({"error": "Failed to generate chart due to invalid data or configuration"}), 500
    except Exception as e:
        print(f"Error generating chart: {str(e)}")
        return jsonify({"error": f"Failed to generate chart: {str(e)}"}), 500

@app.route('/api/device-photos', methods=['GET'])
def get_device_photos():
    device_id = request.args.get('id')
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')

    print(f"Fetching photos for device_id: {device_id}, start_time: {start_time}, end_time: {end_time}")
    if not device_id:
        return jsonify({'error': 'Device ID is required'}), 400
    
    # 驗證 device_id 格式（防止注入攻擊）
    if not re.match(r'^[A-Za-z0-9]{1,50}$', device_id):
        return jsonify({'error': 'Invalid device ID format'}), 400

    if not start_time or not end_time:
        return jsonify({"error": "Missing start_time or end_time parameter"}), 400
    
    # 使用統一的時間驗證函數
    if not validate_time_format(start_time) or not validate_time_format(end_time):
        return jsonify({"error": "Invalid time format. Expected YYYYMMDDHHMMSS"}), 400

    query = """
        SELECT `photo_id`, `photo_time`, `photo_storage`, `photo_address`, `count`, COALESCE(`needs_label`, 0) AS `needs_label`
        FROM `photo` 
        WHERE `device_id` = %s AND `photo_time` BETWEEN %s AND %s;
    """
    
    photos = sqlFunc.select(query, (device_id, start_time, end_time))
    print(f"Photos found in database: {len(photos) if photos else 0}")
    result = []
    if photos:
        query_seg_photo_new = """
            SELECT sp.photo_id, m.mosquito_name, COUNT(*) as mosquito_count
            FROM seg_photo sp
            JOIN mosquito m ON sp.mosquito_id = m.mosquito_id
            WHERE sp.new != 0
            GROUP BY sp.photo_id, sp.mosquito_id, m.mosquito_name;
        """
        seg_photo_new_records = sqlFunc.select(query_seg_photo_new)

        query_seg_photo_all = """
            SELECT sp.photo_id, m.mosquito_name, COUNT(*) as mosquito_count
            FROM seg_photo sp
            JOIN mosquito m ON sp.mosquito_id = m.mosquito_id
            GROUP BY sp.photo_id, sp.mosquito_id, m.mosquito_name;
        """
        seg_photo_all_records = sqlFunc.select(query_seg_photo_all)

        seg_photo_new_dict = {}
        for record in seg_photo_new_records:
            photo_id = record['photo_id']
            if photo_id not in seg_photo_new_dict:
                seg_photo_new_dict[photo_id] = []
            seg_photo_new_dict[photo_id].append((record['mosquito_name'], record['mosquito_count']))

        seg_photo_all_dict = {}
        for record in seg_photo_all_records:
            photo_id = record['photo_id']
            if photo_id not in seg_photo_all_dict:
                seg_photo_all_dict[photo_id] = []
            seg_photo_all_dict[photo_id].append((record['mosquito_name'], record['mosquito_count']))

        for photo in photos:
            photo_id = photo['photo_id']
            mosquito_new_info = seg_photo_new_dict.get(photo_id, [])
            mosquito_types = [info[0] for info in mosquito_new_info]
            mosquito_counts = [info[1] for info in mosquito_new_info]

            mosquito_all_info = seg_photo_all_dict.get(photo_id, [])
            current_mosquito_types = [info[0] for info in mosquito_all_info]
            current_mosquito_counts = [info[1] for info in mosquito_all_info]

            result.append({
                'photo_id': photo['photo_id'],
                'time': photo['photo_time'],
                'location': photo['photo_address'],
                'path': photo['photo_storage'],
                'mosquito_types': mosquito_types,
                'mosquito_counts': mosquito_counts,
                'current_mosquito_types': current_mosquito_types,
                'current_mosquito_counts': current_mosquito_counts,
                'count': photo['count'],
                'needs_label': 1 if photo.get('needs_label') else 0
            })
        print(f"Returning {len(result)} photos in response")
        return jsonify({'photos': result})
    else:
        return jsonify({'photos': None})

@app.route('/api/schedule-photo', methods=['POST'])
def schedule_photo():
    data = request.get_json()
    device_id = data.get('device_id')
    times = data.get('times', [])

    if not device_id or not times:
        return jsonify({"error": "Missing device_id or times"}), 400
    
    # 安全驗證：檢查設備是否在允許列表中
    allowed_devices = sqlFunc.select("SELECT device_id FROM device;")
    allowed_device_ids = [row['device_id'] for row in allowed_devices] if allowed_devices else []
    if device_id not in allowed_device_ids:
        logging.warning(f"Unauthorized schedule_photo attempt from {request.remote_addr}: device_id={device_id}")
        return jsonify({"error": "Unauthorized device"}), 403

    try:
        # 檢查現有時間
        existing_query = """
            SELECT select_time FROM device_time WHERE device_id = %s
        """
        existing_times = sqlFunc.select(existing_query, (device_id,))
        existing_times_list = [row['select_time'] for row in existing_times if row['select_time']]

        new_times = [t for t in times if t not in existing_times_list]  # 過濾已存在時間
        if not new_times:
            return jsonify({"error": "All times already exist"}), 400

        # 插入新時間
        insert_query = """
            INSERT INTO device_time (device_id, select_time) VALUES (%s, %s)
        """
        for time_str in new_times:
            sqlFunc.execute(insert_query, (device_id, time_str))

        return jsonify({"success": True, "message": f"Scheduled {len(new_times)} new photo times for device {device_id}"}), 200
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@app.route('/api/device-times', methods=['GET'])
def get_device_times():
    device_id = request.args.get('device_id')
    time_type = request.args.get('type', 'select')
    if not device_id:
        return jsonify({"error": "Missing device_id"}), 400

    column = 'select_time' if time_type == 'select' else 'reset_time'
    query = f"""
        SELECT {column} FROM device_time WHERE device_id = %s
    """
    try:
        results = sqlFunc.select(query, (device_id,))
        if results:
            times = [row[column] for row in results if row[column]]  # 過濾 null 值
            print(f"Retrieved times for device_id={device_id}, type={time_type}: {times}")  # 添加日誌
            return jsonify({"times": times}), 200
        else:
            print(f"No records found for device_id={device_id}, type={time_type}")  # 添加日誌
            return jsonify({"times": []}), 200
    except mysql.connector.Error as e:
        print(f"Database error for device_id={device_id}, type={time_type}: {str(e)}")  # 記錄資料庫錯誤
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        print(f"Unexpected error for device_id={device_id}, type={time_type}: {str(e)}")  # 記錄其他錯誤
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/take-photo', methods=['POST'])
def take_photo():
    data = request.get_json()
    device_id = data.get('device_id')

    if not device_id:
        return jsonify({"error": "Missing device_id"}), 400
    
    # 安全驗證：檢查設備是否在允許列表中
    allowed_devices = sqlFunc.select("SELECT device_id FROM device;")
    allowed_device_ids = [row['device_id'] for row in allowed_devices] if allowed_devices else []
    if device_id not in allowed_device_ids:
        logging.warning(f"Unauthorized take_photo attempt from {request.remote_addr}: device_id={device_id}")
        return jsonify({"error": "Unauthorized device"}), 403

    query = """
        UPDATE device SET take_photo = 1 WHERE device_id = %s
    """
    try:
        affected_rows = sqlFunc.execute(query, (device_id,))
        if affected_rows > 0:
            publish_take_photo(device_id)  # MQTT 即時觸發，Pi 收到後會把 DB take_photo 清 0
            return jsonify({"success": True, "message": f"Triggered photo for device {device_id}"}), 200
        else:
            return jsonify({"error": "Device not found"}), 404
    except mysql.connector.Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/get-photo', methods=['POST'])
def get_photo():
    data = request.get_json()
    device_id = data.get('device_id')

    if not device_id:
        return jsonify({"error": "Missing device_id"}), 400

    query = """
        UPDATE device SET take_photo = -1 WHERE device_id = %s
    """
    try:
        affected_rows = sqlFunc.execute(query, (device_id,))
        if affected_rows > 0:
            return jsonify({"success": True, "message": f"Triggered photo for device {device_id}"}), 200
        else:
            return jsonify({"error": "Device not found"}), 404
    except mysql.connector.Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/reset-device', methods=['POST'])
def reset_device():
    data = request.get_json()
    device_id = data.get('device_id')

    if not device_id:
        return jsonify({"error": "Missing device_id"}), 400
    
    # 安全驗證：檢查設備是否在允許列表中
    allowed_devices = sqlFunc.select("SELECT device_id FROM device;")
    allowed_device_ids = [row['device_id'] for row in allowed_devices] if allowed_devices else []
    if device_id not in allowed_device_ids:
        logging.warning(f"Unauthorized reset_device attempt from {request.remote_addr}: device_id={device_id}")
        return jsonify({"error": "Unauthorized device"}), 403

    # 檢查當前 temp 值
    check_query = """
        SELECT temp FROM device WHERE device_id = %s
    """
    try:
        result = sqlFunc.select(check_query, (device_id,))
        if not result:
            return jsonify({"error": "Device not found"}), 404

        current_temp = result[0]['temp']

        if current_temp == -1:
            return jsonify({"success": True, "message": f"Device {device_id} already reset"}), 200
        else:
            update_query = """
                UPDATE device SET temp = -1 WHERE device_id = %s
            """
            affected_rows = sqlFunc.execute(update_query, (device_id,))
            if affected_rows > 0:
                return jsonify({"success": True, "message": f"Reset device {device_id}"}), 200
            else:
                return jsonify({"error": "Device not found"}), 404
    except mysql.connector.Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/delete-time', methods=['POST'])
def delete_time():
    data = request.get_json()
    device_id = data.get('device_id')
    select_time = data.get('select_time')
    time_type = data.get('type', 'select')  # 預設為 'select'，可選 'reset'

    if not device_id or not select_time:
        return jsonify({"error": "Missing device_id or select_time"}), 400

    column = 'select_time' if time_type == 'select' else 'reset_time'
    query = f"""
        DELETE FROM device_time WHERE device_id = %s AND {column} = %s
    """
    try:
        affected_rows = sqlFunc.execute(query, (device_id, select_time))
        if affected_rows > 0:
            return jsonify({"success": True, "message": f"Deleted {column} {select_time} for device {device_id}"}), 200
        else:
            return jsonify({"error": "Time not found"}), 404
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@app.route('/mosquito/mos_mysql/default.jpg')
def serve_default_image():
    default_path = os.path.join(PHOTO_STORAGE_DIR, 'default.jpg')
    if os.path.exists(default_path):
        return send_from_directory(PHOTO_STORAGE_DIR, 'default.jpg')
    else:
        logging.warning(f"Default image requested but not found: {request.remote_addr}, "
                        f"Referer: {request.headers.get('Referer', 'None')}, "
                        f"User-Agent: {request.headers.get('User-Agent', 'None')}")
        return jsonify({"error": "Default image not available"}), 404

@app.route('/api/set-reset-times', methods=['POST'])
def set_reset_times():
    data = request.get_json()
    device_id = data.get('device_id')
    reset_times = data.get('reset_times', [])

    if not device_id or not reset_times:
        return jsonify({"error": "Missing device_id or reset_times"}), 400

    try:
        # 檢查現有重置時間
        existing_query = """
            SELECT reset_time FROM device_time WHERE device_id = %s
        """
        existing_times = sqlFunc.select(existing_query, (device_id,))
        existing_times_list = [row['reset_time'] for row in existing_times if row['reset_time']]

        new_times = [t for t in reset_times if t not in existing_times_list]  # 過濾已存在時間
        if not new_times:
            return jsonify({"error": "All reset times already exist"}), 400

        # 插入新重置時間
        insert_query = """
            INSERT INTO device_time (device_id, reset_time) VALUES (%s, %s)
        """
        for time_str in new_times:
            sqlFunc.execute(insert_query, (device_id, time_str))

        return jsonify({"success": True, "message": f"Scheduled {len(new_times)} new reset times for device {device_id}"}), 200
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@app.route('/api/photo-label-toggle', methods=['POST'])
def photo_label_toggle():
    """切換該筆照片的 needs_label（0↔1），回傳新的 needs_label。"""
    data = request.get_json()
    photo_id = data.get('photo_id') if data else None
    if not photo_id:
        return jsonify({"error": "缺少 photo_id"}), 400
    photo_id = str(photo_id).strip()
    if not re.match(r'^[0-9]{1,20}$', photo_id):
        return jsonify({"error": "photo_id 格式不正確"}), 400

    row = sqlFunc.select("SELECT COALESCE(needs_label, 0) AS needs_label FROM photo WHERE photo_id = %s", (photo_id,))
    if not row:
        return jsonify({"error": "找不到該筆照片"}), 404
    current = 1 if (row[0].get('needs_label') or 0) else 0
    new_val = 0 if current else 1
    sqlFunc.execute("UPDATE photo SET needs_label = %s WHERE photo_id = %s", (new_val, photo_id))
    return jsonify({"success": True, "needs_label": new_val}), 200


@app.route('/api/re-test', methods=['POST'])
def re_test_photo():
    """轉發到 new2 的 /api/re-test，將該筆紀錄的資料夾以與上傳相同格式丟進 photo_queue。"""
    data = request.get_json()
    photo_id = data.get('photo_id') if data else None

    if not photo_id:
        return jsonify({"error": "缺少 photo_id"}), 400
    photo_id = str(photo_id).strip()
    if not re.match(r'^[0-9]{1,20}$', photo_id):
        return jsonify({"error": "photo_id 格式不正確"}), 400

    # 確認該筆紀錄存在
    row = sqlFunc.select(
        "SELECT photo_id, photo_storage FROM photo WHERE photo_id = %s",
        (photo_id,)
    )
    if not row:
        return jsonify({"error": "找不到該筆照片紀錄"}), 404

    # 呼叫 new2 的 /api/re-test（與上傳相同流程：整個資料夾丟進 queue）
    new2_url = os.getenv('NEW2_RE_TEST_URL', 'http://127.0.0.1:5000').rstrip('/') + '/api/re-test'
    try:
        req = urllib.request.Request(
            new2_url,
            data=json_module.dumps({"photo_id": photo_id}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode('utf-8')
            result = json_module.loads(body) if body else {}
            if result.get('success'):
                return jsonify({"success": True, "message": result.get("message", "重新測試已加入佇列，與上傳相同流程處理。")}), 202
            return jsonify({"error": result.get("error", "未知錯誤")}), 400
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8') if e.fp else ''
        try:
            err = json_module.loads(body)
            return jsonify({"error": err.get("error", body or str(e))}), e.code
        except Exception:
            return jsonify({"error": body or str(e)}), e.code
    except urllib.error.URLError as e:
        logging.warning("Re-test 無法連線 new2: %s", e.reason)
        return jsonify({"error": f"無法連線至偵測服務 (new2)，請確認服務已啟動: {e.reason}"}), 503
    except Exception as e:
        logging.exception("呼叫 new2 re-test 失敗")
        return jsonify({"error": f"重新測試請求失敗: {str(e)}"}), 500

# 定時任務：檢查並更新 temp 為 -1，支援多次重置並補償錯過的時間
def check_reset_times():
    current_time = datetime.now().strftime('%H%M%S')  # 當前時間格式 HHMMSS
    current_datetime = datetime.strptime(current_time, '%H%M%S')  # 轉為 datetime 物件
    print(f"Checking reset times at {current_time}")

    # 定義 10 秒的時間範圍（前 10 秒到後 10 秒）
    time_window = timedelta(seconds=10)
    start_time = (current_datetime - time_window).strftime('%H%M%S')
    end_time = (current_datetime + time_window).strftime('%H%M%S')

    query = """
        SELECT device_id, reset_time FROM device_time 
        WHERE reset_time BETWEEN %s AND %s
    """
    try:
        results = sqlFunc.select(query, (start_time, end_time))
        if results:
            for row in results:
                device_id = row['device_id']
                reset_time_str = row['reset_time']
                reset_time = datetime.strptime(reset_time_str, '%H%M%S')  # 轉為 datetime 物件
                time_diff = abs((current_datetime - reset_time).total_seconds())  # 計算時間差（秒）

                if time_diff <= 10:  # 只在 10 秒範圍內觸發
                    update_query = """
                        UPDATE device SET temp = -1 WHERE device_id = %s
                    """
                    affected_rows = sqlFunc.execute(update_query, (device_id,))
                    if affected_rows > 0:
                        print(f"Updated temp to -1 for device {device_id} at {current_time} (matched reset_time: {reset_time_str}, diff: {time_diff} seconds)")
                    else:
                        print(f"No update for device {device_id}, device not found")
                else:
                    print(f"Reset time {reset_time_str} for device {device_id} is outside 10-second window (diff: {time_diff} seconds), waiting...")
        else:
            print(f"No matching reset times within 10-second window at {current_time}")
    except Exception as e:
        print(f"Error in check_reset_times: {str(e)}")

@app.route('/<device_id>')
def device_page(device_id):
    # 從資料庫查詢 device_name
    device_name_query = """
        SELECT device_name FROM device WHERE device_id = %s
    """
    device_name_result = sqlFunc.select(device_name_query, (device_id,))
    device_name = device_name_result[0]['device_name'] if device_name_result else device_id  # 預設用 device_id 如果查不到

    # 定義 gets 資料夾路徑（修正路徑，確保 D: 後有 \）
    gets_dir = os.path.join('D:\\', 'mosquito', 'mos_mysql', 'gets', device_name)
    print(f"Checking gets directory: {gets_dir}")  # 調試用，檢查路徑
    
    # 儲存時間和圖片路徑的列表
    photo_entries = []
    
    # 檢查 gets/<device_name>/ 下的子資料夾
    if os.path.exists(gets_dir):
        for folder_name in os.listdir(gets_dir):
            folder_path = os.path.join(gets_dir, folder_name)
            if os.path.isdir(folder_path):
                # 驗證資料夾名稱是否為 YYYYMMDDHHMMSS 格式
                if (len(folder_name) == 14 and folder_name.isdigit() and 
                    all(folder_name[i:i+2].isdigit() for i in range(0, 14, 2))):
                    image_path = os.path.join(folder_path, 'img_5.jpg')
                    if os.path.exists(image_path):
                        print(f"Found image at: {image_path}")  # 調試用，確認找到圖片
                        # 調整為相對路徑，基於 gets 資料夾
                        relative_path = os.path.relpath(image_path, os.path.join('D:\\', 'mosquito', 'mos_mysql', 'gets')).replace('\\', '/')
                        photo_entries.append({
                            'time': folder_name,  # 使用資料夾名稱作為時間
                            'image_path': relative_path  # 相對路徑
                        })
        # 按時間降序排序（最新的最上面）
        photo_entries.sort(key=lambda x: x['time'], reverse=True)
    else:
        print(f"Directory not found: {gets_dir}")  # 調試用，檢查路徑是否存在
    
    # 渲染 HTML 頁面
    html = render_template_string("""
        <!DOCTYPE html>
        <html>
        <head>
            <title>https://drive.google.com/drive/folders/1pFCJCFi3x3JRndV_JuKuzKwEpZQLrRx8?usp=sharing {{ device_id }}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 50px; }
                h1 { text-align: center; }
                button { padding: 10px 20px; font-size: 16px; cursor: pointer; background-color: #4CAF50; color: white; border: none; border-radius: 5px; }
                button:hover { background-color: #45a049; }
                .photo-container { display: flex; flex-direction: column; align-items: center; gap: 20px; } /* 改為垂直排列，居中對齊 */
                .photo-item { display: flex; align-items: center; width: 100%; max-width: 500px; } /* 限制寬度，確保水平對齊 */
                .photo-item .time { font-weight: bold; width: 150px; text-align: right; margin-right: 20px; }
                .photo-item img { max-width: 300px; max-height: 300px; border: 1px solid #ddd; }
            </style>
        </head>
        <body>
            <h1>Device ID: {{ device_id }}</h1>
            <button onclick="takePhoto('{{ device_id }}')">Take Photo</button>
            <div class="photo-container">
                {% for entry in photo_entries %}
                    <div class="photo-item">
                        <div class="time">{{ entry.time }}</div>
                        <img src="{{ url_for('serve_gets_photo', filename=entry.image_path) }}" alt="Photo for {{ entry.time }}">
                    </div>
                {% endfor %}
            </div>
            <script>
                function takePhoto(deviceId) {
                    fetch('/api/get-photo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ device_id: deviceId })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert(data.message);
                        } else {
                            alert('Error: ' + data.error);
                        }
                    })
                    .catch(error => alert('Network error: ' + error));
                }
            </script>
        </body>
        </html>
    """, device_id=device_id, photo_entries=photo_entries)

    return html

# 新增路由來服務 gets 下的圖片
@app.route('/mosquito/mos_mysql/gets/<path:filename>')
def serve_gets_photo(filename):
    full_path = os.path.join('D:\\', 'mosquito', 'mos_mysql', 'gets', filename)
    try:
        return send_from_directory(os.path.dirname(full_path), os.path.basename(filename))
    except Exception as e:
        print(f"Failed to serve gets photo {filename}: {str(e)}")
        return jsonify({"error": "Photo not found"}), 404

    
# 全局初始化調度器
scheduler = BackgroundScheduler()
scheduler.add_job(check_reset_times, 'interval', seconds=10)  # 每10秒檢查一次

if __name__ == '__main__':
    try:
        with app.app_context():
            scheduler.start()  # 在應用上下文內啟動
        app.run(debug=False, host='0.0.0.0', port=5001)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
'''
@app.route('/api/device-photos', methods=['GET'])
def get_device_photos():
    device_id = request.args.get('id')
    print(device_id)
    query = """
        SELECT `photo_id`, `photo_time`, `photo_storage`, `photo_address` 
        FROM `photo` 
        WHERE `device_id` = %s;
    """
    
    photos = sqlFunc.select(query, (device_id,))
    result = []
    if photos:
        for i in photos:
            print(i)
            query2 = f"SELECT `mosquito_id` FROM `seg_photo` WHERE `photo_id` = {i['photo_id']}"
            try:
                seg_photo_records = sqlFunc.select(query2)
                # 取出所有的 mosquito_id
                mosquito_ids = [record['mosquito_id'] for record in seg_photo_records]
                if mosquito_ids:
                    placeholders = ','.join(['%s'] * len(mosquito_ids))
                    query3 = f"SELECT `mosquito_name` FROM `mosquito` WHERE `mosquito_id` IN ({placeholders});"
                    mosquito_name_records = sqlFunc.select(query3, tuple(mosquito_ids))
                    mosquito_names = [record['mosquito_name'] for record in mosquito_name_records]
                else:
                    mosquito_names = []
            except Exception as e:
                mosquito_names = []
                print('None', e)
            result.append({
                'time': i['photo_time'],
                'location': i['photo_address'],
                'path': i['photo_storage'],  # 直接使用 photo_storage 中的路徑
                'mosquito_types': mosquito_names  # 將所有的名稱放進列表中
            })
        return jsonify({'photos': result})
    else:
        return jsonify({'photos': None})
'''