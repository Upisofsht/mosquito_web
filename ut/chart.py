import os
import pandas as pd
import plotly.express as px 
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import mysql.connector

def select(query, params=None):
    """
    執行 SQL 查詢並返回結果。
    :param query: SQL 查詢語句
    :param params: 查詢的參數 (tuple)
    :return: 查詢結果列表
    """
    conn = None
    try:
        # 建立資料庫連線
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="mosquito"
        )
        cursor = conn.cursor(dictionary=True)  # 返回字典格式的結果

        # 執行查詢
        cursor.execute(query, params)
        results = cursor.fetchall()

        return results
    except mysql.connector.Error as err:
        print(f"Database Error: {err}")
        return None
    finally:
        # 關閉連線
        if conn:
            cursor.close()
            conn.close()


def generate_last_24h_chart():
    """
    根據 photo 資料生成最近 7 天的圖表，並保存到以年-月-日為名稱的檔案。
    :return: 圖表存儲路徑
    """
    # 創建 history 資夾
    history_folder = "history"
    os.makedirs(history_folder, exist_ok=True)

    # 獲取 photo 資料
    photo_data = select("SELECT photo_id, photo_time, count FROM photo ORDER BY CAST(photo_id AS UNSIGNED) ASC;")
    mosquito_data = select("SELECT mosquito_id, mosquito_name FROM mosquito;")
    seg_photo_data = select("SELECT photo_id, mosquito_id FROM seg_photo;")
    print(photo_data,mosquito_data,seg_photo_data)
    
    if not photo_data or not mosquito_data:
        print("未從資料庫中獲取到足夠資料。")
        return None

    # 將資料轉換為 DataFrame
    photo_df = pd.DataFrame(photo_data, columns=["photo_id", "photo_time", "count"])
    mosquito_df = pd.DataFrame(mosquito_data, columns=["mosquito_id", "mosquito_name"])
    seg_photo_df = pd.DataFrame(seg_photo_data, columns=["photo_id", "mosquito_id"])

    # 確保 photo_time 是 datetime 格式
    photo_df["photo_time"] = pd.to_datetime(photo_df["photo_time"], format="%Y%m%d%H%M%S")

    # 計算最近 7 小時範圍
    now = datetime.now()
    last_24h = now - timedelta(hours=168)

    # 合併資料表，找到每張照片對應的蚊子種類
    merged_df = photo_df.merge(seg_photo_df, on="photo_id", how="left")

    # 處理找不到 mosquito_id 的情況，包含所有歷史數據
    merged_df = merged_df.sort_values(by="photo_time")
    for index, row in merged_df.iterrows():
        if pd.isna(row["mosquito_id"]):
            # 搜索先前的記錄，累積數量直到滿足 count
            previous_rows = merged_df[(merged_df["photo_time"] < row["photo_time"]) & (~pd.isna(merged_df["mosquito_id"]))]
            cumulative_count = 0
            for _, prev_row in previous_rows.iterrows():
                cumulative_count += 1
                if cumulative_count == row["count"]:
                    merged_df.at[index, "mosquito_id"] = prev_row["mosquito_id"]
                    break

    # 合併蚊子名稱
    merged_df = merged_df.merge(mosquito_df, on="mosquito_id", how="left")

    # 僅保留最近 24 小時的資料
    merged_df = merged_df[merged_df["photo_time"] >= last_24h]

    # 確保所有蚊子種類都出現在結果中，即使數量為 0
    mosquito_names = mosquito_df["mosquito_name"].tolist()
    grouped = merged_df.groupby(["photo_time", "mosquito_name"]).size().unstack(fill_value=0)
    for mosquito in mosquito_names:
        if mosquito not in grouped.columns:
            grouped[mosquito] = 0

    # 繪製圖表
    grouped = grouped[mosquito_names]  # 保持列的順序一致
    plt.figure(figsize=(12, 8))
    for mosquito in mosquito_names:
        plt.plot(grouped.index.strftime("%m/%d %H:%M"), grouped[mosquito], marker="o", label=mosquito)

    plt.xticks(fontsize=10)
    plt.xlabel("Time (MM/DD HH:MM)")
    plt.ylabel("Count")
    plt.title("Mosquito Count History (Last 7 days)")
    plt.legend()
    plt.tight_layout()

    # 使用目前日期生成檔案名稱
    today_date = now.strftime("%Y-%m-%d")
    chart_path = os.path.join(history_folder, f"{today_date}_last_7days_mosquito_history.png")

    # 儲存圖表
    plt.savefig(chart_path)
    plt.close()

    return chart_path

def generate_chart_for_address(device_id):
    """
    根據指定的 device_id，生成蚊蟲種類數量的時間線圖表。
    """
    # 查詢裝置名稱（使用參數化查詢並透過字典存取）
    device_result = select("SELECT device_name FROM device WHERE device_id = %s", (device_id,))
    if not device_result:
        return None
    device_name = device_result[0]["device_name"]

    # 查詢 photo 資料（只取得 photo_id 與 photo_time）
    photo_data = select("""
        SELECT photo_id, photo_time
        FROM photo 
        WHERE device_id = %s
        ORDER BY CAST(photo_id AS UNSIGNED) ASC;
    """, (device_id,))

    # 查詢蚊子名稱
    mosquito_data = select("SELECT mosquito_id, mosquito_name FROM mosquito;")
    
    # 查詢 seg_photo 資料，包含 new 欄位
    seg_photo_data = select("SELECT photo_id, mosquito_id, new FROM seg_photo;")

    if not photo_data or not mosquito_data or not seg_photo_data:
        # 如果資料不足，返回空圖表
        return None

    # 將資料轉換為 DataFrame
    photo_df = pd.DataFrame(photo_data, columns=["photo_id", "photo_time"])
    mosquito_df = pd.DataFrame(mosquito_data, columns=["mosquito_id", "mosquito_name"])
    seg_photo_df = pd.DataFrame(seg_photo_data, columns=["photo_id", "mosquito_id", "new"])

    # 確保 photo_time 為 datetime 格式
    photo_df["photo_time"] = pd.to_datetime(photo_df["photo_time"], format="%Y%m%d%H%M%S")

    # 過濾 seg_photo，只保留 new != 0 的記錄
    filtered_seg_photo = seg_photo_df[seg_photo_df["new"] != 0]
    merged_df = photo_df.merge(filtered_seg_photo, on="photo_id", how="left")
    # 對於完全沒有 new != 0 的 photo_id，填補 mosquito_id 為 -1
    merged_df.fillna({"mosquito_id": -1}, inplace=True)
    
    # 合併蚊子名稱，若無資料則標記為 "No Mosquito"
    merged_df = merged_df.merge(mosquito_df, on="mosquito_id", how="left")
    merged_df["mosquito_name"].fillna("No Mosquito", inplace=True)

    # 按時間與蚊子種類分組，計算每種蚊子的數量
    mosquito_names = mosquito_df["mosquito_name"].tolist()
    grouped = merged_df.groupby(["photo_time", "mosquito_name"]).size().unstack(fill_value=0)
    for mosquito in mosquito_names:
        if mosquito not in grouped.columns:
            grouped[mosquito] = 0

    # 重設索引以便繪圖
    grouped = grouped.reset_index()

    # 使用 Plotly 繪製圖表
    fig = px.line(
        grouped,
        x="photo_time",  # X 軸為時間
        y=mosquito_names,  # Y 軸為各蚊子種類的數量
        labels={"value": "Count", "photo_time": "Time"},
        title=f"{device_name} Mosquito Count History",
        markers=True  # 顯示每個數據點
    )
    fig.update_traces(mode="lines+markers")  # 為折線圖添加點
    fig.update_layout(
        xaxis_title="Time",
        yaxis_title="Mosquito Count",
        template="plotly_white",
        dragmode="pan",  # 預設平移模式
        margin=dict(l=50, r=50, t=50, b=50),  # 邊距設定
        height=300,  # 圖表高度
        width=700   # 圖表寬度
    )

    return fig.to_html(full_html=False)

