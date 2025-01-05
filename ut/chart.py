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

def generate_interactive_chart():
    # 獲取資料
    photo_data = select("SELECT photo_id, photo_time, count FROM photo ORDER BY CAST(photo_id AS UNSIGNED) ASC;")
    mosquito_data = select("SELECT mosquito_id, mosquito_name FROM mosquito;")
    seg_photo_data = select("SELECT photo_id, mosquito_id FROM seg_photo;")

    if not photo_data or not mosquito_data:
        return "<p>No data available to generate chart.</p>"

    # 轉換為 DataFrame
    photo_df = pd.DataFrame(photo_data, columns=["photo_id", "photo_time", "count"])
    mosquito_df = pd.DataFrame(mosquito_data, columns=["mosquito_id", "mosquito_name"])
    seg_photo_df = pd.DataFrame(seg_photo_data, columns=["photo_id", "mosquito_id"])

    # 確保 photo_time 是 datetime 格式
    photo_df["photo_time"] = pd.to_datetime(photo_df["photo_time"], format="%Y%m%d%H%M%S")

    # 計算最近 7 天的時間範圍
    now = datetime.now()
    last_7_days = now - timedelta(days=7)

    # 合併數據
    merged_df = photo_df.merge(seg_photo_df, on="photo_id", how="left")
    for index, row in merged_df.iterrows():
        if pd.isna(row["mosquito_id"]):
            previous_rows = merged_df[
                (merged_df["photo_time"] < row["photo_time"]) & (~pd.isna(merged_df["mosquito_id"]))
            ]
            cumulative_count = 0
            for _, prev_row in previous_rows.iterrows():
                cumulative_count += 1
                if cumulative_count == row["count"]:
                    merged_df.at[index, "mosquito_id"] = prev_row["mosquito_id"]
                    break

    merged_df = merged_df.merge(mosquito_df, on="mosquito_id", how="left")

    # 過濾最近 7 天的數據
    recent_data = merged_df[merged_df["photo_time"] >= last_7_days]

    if recent_data.empty:
        return "<p>No data available for the last 7 days.</p>"

    # 按時間和蚊子種類分組，填充缺失值
    mosquito_names = mosquito_df["mosquito_name"].tolist()
    grouped = recent_data.groupby(["photo_time", "mosquito_name"]).size().unstack(fill_value=0)
    for mosquito in mosquito_names:
        if mosquito not in grouped.columns:
            grouped[mosquito] = 0

    # 將時間列重置為索引
    grouped = grouped.reset_index()

    # 使用 Plotly 繪圖
    fig = px.line(
        grouped,
        x="photo_time",
        y=mosquito_names,
        labels={"value": "Count", "photo_time": "Time"},
        title="Mosquito Count History (Last 7 Days)",
    )
    fig.update_layout(
        xaxis_title="Time",
        yaxis_title="Mosquito Count",
        template="plotly_white",
        dragmode="pan",  # 設置預設模式為平移 (pan2d)
        margin=dict(l=50, r=50, t=50, b=50),  # 設置邊距
        height=600,  # 圖表高度
        width=1000
    )
    # 自訂工具列
    fig_html = fig.to_html(
        full_html=False,
        config={
            "displayModeBar": True,  # 顯示工具列
            "modeBarButtonsToRemove": ["zoom2d", "zoomIn2d", "zoomOut2d", "autoScale2d", "hoverClosestCartesian"],  # 移除不要的按鈕
            "displaylogo": False,  # 隱藏 Plotly 的 logo
        },
    )

    # 返回 HTML 片段
    return fig_html