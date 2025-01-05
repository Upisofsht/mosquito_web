from flask import Flask, jsonify, send_from_directory, render_template_string, request
from flask_cors import CORS  # 匯入 Flask-CORS
import random
import ut.sqlFunctions as sqlFunc
from ut.chart import generate_interactive_chart
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

    # 確保傳入的時間為 SQL 格式
    start_time = convert_to_sql_time_format(start_time)
    end_time = convert_to_sql_time_format(end_time)

    results = sqlFunc.get_data_by_time(start_time, end_time)
    if results:
        return jsonify(results)
    else:
        return jsonify({"error": "No data found"}), 404
    
@app.route('/api/all-address', methods=['GET'])
def get_all_addresses():
    results = sqlFunc.get_all_photo_addresses()
    if results:
        return jsonify(results)
    else:
        return jsonify({"error": "No addresses found"}), 404

@app.route('/api/chart', methods=['GET'])
def get_chart():
    # 生成圖表 HTML
    chart_html = generate_interactive_chart()
    return jsonify({"chart_html": chart_html})

@app.route('/api/chart-for-address', methods=['GET'])
def get_chart_for_address():
    address = request.args.get('address')
    if not address:
        return jsonify({"error": "Missing address parameter"}), 400

    from ut.chart import generate_chart_for_address
    chart_html = generate_chart_for_address(address)
    if chart_html:
        return jsonify({"chart_html": chart_html})
    else:
        return jsonify({"error": "No chart available for this address"}), 404


if __name__ == '__main__':
    app.run(debug=True)
