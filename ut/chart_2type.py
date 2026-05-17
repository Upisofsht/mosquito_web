import os
import pandas as pd
import plotly.express as px 
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import mysql.connector

# 定義映射
MOSQUITO_NAME_MAPPING = {
    "IG": "IG埃及斑蚊",
    "H": "H熱帶家蚊",
    "W": "W白線斑蚊",
    "WH": "WH白腹斑蚊",
    "GR": "GR地下家蚊",
    "AG": "AG斑蚊類",
    "HG": "HG家蚊類"
}

def select(query, params=None):
    """
    執行 SQL 查詢並返回結果。
    :param query: SQL 查詢語句
    :param params: 查詢的參數 (tuple)
    :return: 查詢結果列表
    """
    conn = None
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Mos@Root!2024",
            database="mosqui"
        )
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params)
        results = cursor.fetchall()
        return results
    except mysql.connector.Error as err:
        print(f"Database Error: {err}")
        return None
    finally:
        if conn:
            cursor.close()
            conn.close()

def generate_last_24h_chart():
    """
    根據 photo 資料生成最近 7 天的圖表，只顯示 mosquito_id >= 5 的資料，並保存到以年-月-日為名稱的檔案。
    :return: 圖表存儲路徑
    """
    history_folder = "history"
    os.makedirs(history_folder, exist_ok=True)

    photo_data = select("SELECT photo_id, photo_time, count FROM photo ORDER BY CAST(photo_id AS UNSIGNED) ASC;")
    mosquito_data = select("SELECT mosquito_id, mosquito_name FROM mosquito WHERE mosquito_id >= 5;")
    seg_photo_data = select("SELECT photo_id, mosquito_id, new FROM seg_photo WHERE mosquito_id >= 5;")
    print(photo_data, mosquito_data, seg_photo_data)
    
    if not photo_data or not mosquito_data:
        print("未從資料庫中獲取到足夠資料。")
        return None

    photo_df = pd.DataFrame(photo_data, columns=["photo_id", "photo_time", "count"])
    mosquito_df = pd.DataFrame(mosquito_data, columns=["mosquito_id", "mosquito_name"])
    seg_photo_df = pd.DataFrame(seg_photo_data, columns=["photo_id", "mosquito_id", "new"])

    photo_df["photo_time"] = pd.to_datetime(photo_df["photo_time"], format="%Y%m%d%H%M%S")
    now = datetime.now()
    last_7days = now - timedelta(days=7)  # 修正：與函數名稱一致，實際為 7 天

    # 移除重複的合併
    merged_df = photo_df.merge(seg_photo_df, on="photo_id", how="left")
    merged_df = merged_df.sort_values(by="photo_time")

    # 修正：正確設置 mosquito_id 為 -1
    for index, row in merged_df.iterrows():
        if pd.isna(row["mosquito_id"]):
            merged_df.at[index, "mosquito_id"] = -1

    # 修正：正確合併 mosquito_df
    merged_df = merged_df.merge(mosquito_df, on="mosquito_id", how="left")
    merged_df["mosquito_name"].fillna("No Mosquito", inplace=True)

    # 修正：正確過濾時間範圍
    merged_df = merged_df[merged_df["photo_time"] >= last_7days]

    # 將 merged_df 中的 mosquito_name 映射為中文名稱
    merged_df["mosquito_name"] = merged_df["mosquito_name"].map(MOSQUITO_NAME_MAPPING).fillna(merged_df["mosquito_name"])
    
    mosquito_names = [MOSQUITO_NAME_MAPPING.get(name, name) for name in mosquito_df["mosquito_name"].tolist()]
    grouped = merged_df.groupby(["photo_time", "mosquito_name"]).size().unstack(fill_value=0)

    # 修正：確保所有 mosquito_names 都有列
    for mosquito in mosquito_names:
        if mosquito not in grouped.columns:
            grouped[mosquito] = 0

    grouped = grouped[mosquito_names]
    plt.figure(figsize=(12, 8))
    for mosquito in mosquito_names:
        plt.plot(grouped.index.strftime("%m/%d %H:%M"), grouped[mosquito], marker="o", label=mosquito)

    plt.xticks(fontsize=10)
    plt.xlabel("Time (MM/DD HH:MM)")  # 修正：移除重複的 xlabel
    plt.ylabel("Count")  # 修正：大小寫一致
    plt.title("Mosquito Count History (Last 7 days, mosquito_id >= 5)")
    plt.legend()
    plt.tight_layout()

    today_date = now.strftime("%Y-%m-%d")
    chart_path = os.path.join(history_folder, f"{today_date}_last_7days_mosquito_history.png")
    plt.savefig(chart_path)
    plt.close()

    return chart_path

def generate_chart_for_address(device_id, start_time, end_time):
    """
    Generate a chart based on mosquito data for a specific address using 'new' instead of 'count'.
    """
    # 查詢設備名稱
    device_result = select("SELECT device_name FROM device WHERE device_id = %s", (device_id,))
    device_name = device_result[0]["device_name"] if device_result else "Unknown Device"

    # 查詢蚊子種類 (mosquito_id >= 5)
    mosquito_data = select("SELECT mosquito_id, mosquito_name FROM mosquito WHERE mosquito_id >= 5;")
    mosquito_names = [MOSQUITO_NAME_MAPPING.get(row["mosquito_name"], row["mosquito_name"]) for row in mosquito_data] if mosquito_data else ["M5", "M6"]

    # 查詢照片數據（移除 count）
    photo_data = select("""
        SELECT photo_id, photo_time
        FROM photo
        WHERE device_id = %s AND photo_time BETWEEN %s AND %s
        ORDER BY photo_time ASC;
    """, (device_id, start_time, end_time))

    # 查詢 seg_photo 數據 (mosquito_id >= 5)
    seg_photo_data = select("""
        SELECT photo_id, mosquito_id, new
        FROM seg_photo
        WHERE mosquito_id >= 5 AND photo_id IN (
            SELECT photo_id FROM photo WHERE device_id = %s AND photo_time BETWEEN %s AND %s
        );
    """, (device_id, start_time, end_time))

    # 轉換時間格式
    try:
        start_time_dt = pd.to_datetime(start_time, format="%Y%m%d%H%M%S")
        end_time_dt = pd.to_datetime(end_time, format="%Y%m%d%H%M%S")
    except ValueError as e:
        print(f"Invalid time format: {e}")
        return None

    # 準備數據框架
    if photo_data:
        photo_df = pd.DataFrame(photo_data, columns=["photo_id", "photo_time"]).astype({"photo_id": str})
        photo_df["photo_time"] = pd.to_datetime(photo_df["photo_time"], format="%Y%m%d%H%M%S")
    else:
        photo_df = pd.DataFrame({
            "photo_id": ["start", "end"],
            "photo_time": [start_time_dt, end_time_dt]
        }).astype({"photo_id": str})

    if seg_photo_data:
        seg_photo_df = pd.DataFrame(seg_photo_data, columns=["photo_id", "mosquito_id", "new"]).astype({"photo_id": str})
    else:
        seg_photo_df = pd.DataFrame(columns=["photo_id", "mosquito_id", "new"], dtype=object)
        seg_photo_df["photo_id"] = seg_photo_df["photo_id"].astype(str)

    mosquito_df = pd.DataFrame(mosquito_data, columns=["mosquito_id", "mosquito_name"]) if mosquito_data else pd.DataFrame({"mosquito_id": [-1], "mosquito_name": ["No Mosquito"]})

    print(f"photo_df photo_id dtype: {photo_df['photo_id'].dtype}")
    print(f"seg_photo_df photo_id dtype: {seg_photo_df['photo_id'].dtype if not seg_photo_df.empty else 'empty'}")
    print(f"photo_df photo_id sample: {photo_df['photo_id'].head().tolist()}")
    print(f"seg_photo_df photo_id sample: {seg_photo_df['photo_id'].head().tolist() if not seg_photo_df.empty else 'empty'}")
    print(f"photo_df shape: {photo_df.shape}")
    print(f"seg_photo_df shape: {seg_photo_df.shape}")

    photo_df["photo_id"] = photo_df["photo_id"].astype(str)
    seg_photo_df["photo_id"] = seg_photo_df["photo_id"].astype(str)

    try:
        merged_df = photo_df.merge(seg_photo_df, on="photo_id", how="left")
    except Exception as e:
        print(f"Merge error: {e}")
        merged_df = photo_df.copy()
        merged_df["mosquito_id"] = -1
        merged_df["new"] = 0

    merged_df.fillna({"mosquito_id": -1, "new": 0}, inplace=True)
    merged_df = merged_df.merge(mosquito_df, on="mosquito_id", how="left")
    merged_df["mosquito_name"].fillna("No Mosquito", inplace=True)

    # 將 merged_df 中的 mosquito_name 映射為中文名稱
    merged_df["mosquito_name"] = merged_df["mosquito_name"].map(MOSQUITO_NAME_MAPPING).fillna(merged_df["mosquito_name"])

    # 使用 new 欄位進行分組和聚合（求和）
    grouped = merged_df.groupby(["photo_time", "mosquito_name"])["new"].sum().unstack(fill_value=0)
    for mosquito in mosquito_names:
        if mosquito not in grouped.columns:
            grouped[mosquito] = 0

    if grouped.empty:
        grouped = pd.DataFrame({
            "photo_time": [start_time_dt, end_time_dt],
            **{name: [0, 0] for name in mosquito_names}
        }).set_index("photo_time")

    grouped = grouped.reset_index()

    fig = px.line(
        grouped,
        x="photo_time",
        y=mosquito_names,
        labels={"value": "New Mosquito Count", "photo_time": "Time"},
        title=f"{device_name} Mosquito Count History ({start_time_dt.strftime('%Y-%m-%d %H:%M:%S')} to {end_time_dt.strftime('%Y-%m-%d %H:%M:%S')}, mosquito_id >= 5)",
        markers=True
    )
    fig.update_traces(mode="lines+markers")
    fig.update_layout(
        xaxis_title="Time",
        yaxis_title="New Mosquito Count",
        template="plotly_white",
        dragmode="pan",
        margin=dict(l=50, r=50, t=50, b=50),
        height=300,
        width=700
    )

    return fig.to_html(full_html=False)