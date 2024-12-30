from flask import Flask, jsonify
from flask_cors import CORS  # 匯入 Flask-CORS
import random

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

if __name__ == '__main__':
    app.run(debug=True)
