from flask import Flask, jsonify, send_from_directory, render_template_string
from flask_cors import CORS  # 匯入 Flask-CORS
import random
import ut.sqlFunctions as sqlFunc
from ut.chart import generate_interactive_chart

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

@app.route('/api/all-data', methods=['GET'])
def get_max_data():
    results = sqlFunc.get_max_data_by_device()
    if results:
        return jsonify(results)
    else:
        return jsonify({"error": "No data found"}), 404
    
@app.route('/history/<path:filename>')
def serve_chart(filename):
    return send_from_directory('history', filename)

@app.route('/api/chart', methods=['GET'])
def get_chart():
    # 生成圖表 HTML
    chart_html = generate_interactive_chart()
    return jsonify({"chart_html": chart_html})


if __name__ == '__main__':
    app.run(debug=True)
