from flask import Flask, jsonify, send_from_directory, render_template_string, request
from flask_cors import CORS  # 匯入 Flask-CORS
import random
import ut.sqlFunctions as sqlFunc
from ut.chart import generate_chart_for_address
from datetime import datetime

app = Flask(__name__)
CORS(app)  # 啟用 CORS


# 隨機生成高雄附近的 Marker 數據
def generate_markers():
    markers = []
    for level in range(1, 8):  # 7 個層級
        latitude = round(random.uniform(22.6, 22.8), 6)  # 高雄緯度
        longitude = round(random.uniform(120.2, 120.4), 6)  # 高雄經度
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

@app.route('/api/markers', methods=['GET'])
def get_markers():
    return jsonify(generate_markers())

def convert_to_sql_time_format(iso_time):
    try:
        # 處理 ISO 格式時間，如 '2025-01-01T05:00'
        if 'T' in iso_time:
            dt = datetime.strptime(iso_time, '%Y-%m-%dT%H:%M')
        else:
            # 處理 SQL 格式時間，如 '20250101050000'
            dt = datetime.strptime(iso_time, '%Y%m%d%H%M%S')
        return dt.strftime('%Y%m%d%H%M%S')  # 統一輸出為 SQL 格式
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
    if not id:
        return jsonify({"error": "Missing address parameter"}), 400

    chart_html = generate_chart_for_address(id)
    if chart_html:
        return jsonify({"chart_html": chart_html})
    else:
        return jsonify({"error": "No chart available for this address"}), 404


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port='5001')
