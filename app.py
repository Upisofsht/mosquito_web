from flask import Flask, jsonify, send_from_directory, render_template_string, request
from flask_cors import CORS
import random
import ut.sqlFunctions as sqlFunc
from ut.chart import generate_chart_for_address
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# 設定圖片檔案的實際儲存目錄
PHOTO_STORAGE_DIR = 'C:/mosquito/mos_mysql'  # 請根據您的實際路徑調整
BASE_PHOTO_URL = 'http://120.126.17.57:5001/mosquito/mos_mysql/'

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

# 提供圖片檔案
@app.route('/mosquito/mos_mysql/<path:filename>')
def serve_photo(filename):
    return send_from_directory(PHOTO_STORAGE_DIR, filename)

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

@app.route('/api/data-by-time', methods=['GET'])
def get_data_by_time():
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')

    if not start_time or not end_time:
        return jsonify({"error": "Missing start_time or end_time"}), 400

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

@app.route('/api/chart-for-id', methods=['GET'])
def get_chart_for_address():
    id = request.args.get('id')
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')
    print(start_time, end_time)
    if not id:
        return jsonify({"error": "Missing address parameter"}), 400

    chart_html = generate_chart_for_address(id, start_time, end_time)
    if chart_html:
        return jsonify({"chart_html": chart_html})
    else:
        return jsonify({"error": "No chart available for this address"}), 404

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
            query2 = f"SELECT `mosquito_id` FROM `seg_photo` WHERE `photo_id` = {int(i['photo_id'])}"
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)