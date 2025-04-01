import mysql.connector

# 資料庫連接函數
def connect_to_database():
    try:
        conn = mysql.connector.connect(
            host="localhost",       
            user="root",            
            password="",            
            database="mosqui"     
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None

# 通用的 SELECT 函數
def select(query, params=None):
    """
    執行 SQL 查詢並返回結果。
    :param query: SQL 查詢語句
    :param params: 查詢的參數 (tuple)
    :return: 查詢結果列表
    """
    conn = None
    try:
        # 使用資料庫連接
        conn = connect_to_database()
        if not conn:
            print("無法連接到資料庫")
            return None
        
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

def get_max_data_by_device():
    query = """
    WITH MaxData AS (
        SELECT 
            device_id,
            MAX(data_id) AS max_data_id
        FROM 
            data
        GROUP BY 
            device_id
    )
    SELECT 
        m.data_id,
        p.photo_address,
        (m.m0 + m.m1 + m.m2 + m.m3 + m.m4) AS count,
        m.m0,
        m.m1,
        m.m2,
        m.m3,
        m.m4
    FROM 
        data AS m
    JOIN 
        photo AS p
    ON 
        m.photo_id = p.photo_id
    JOIN 
        MaxData AS md
    ON 
        m.device_id = md.device_id AND m.data_id = md.max_data_id;
    """
    return select(query)

def get_data_by_time(start_time, end_time):
    conn = connect_to_database()
    if not conn:
        return []

    try:
        cursor = conn.cursor(dictionary=True)
        query = """
        SELECT 
            p.photo_address,
            SUM(m.m0 + m.m1 + m.m2 + m.m3 + m.m4) AS count,
            SUM(m.m0) AS m0,
            SUM(m.m1) AS m1,
            SUM(m.m2) AS m2,
            SUM(m.m3) AS m3,
            SUM(m.m4) AS m4
        FROM 
            data AS m
        JOIN 
            photo AS p
        ON 
            m.photo_id = p.photo_id
        WHERE 
            m.photo_time BETWEEN %s AND %s
        GROUP BY 
            p.photo_address;
        """
        cursor.execute(query, (start_time, end_time))
        results = cursor.fetchall()
        return results
    except mysql.connector.Error as err:
        print(f"SQL Error: {err}")
        return []
    finally:
        cursor.close()
        conn.close()
        
def get_all_device_addresses():
    """
    從 device 表中獲取所有 device_address。
    """
    conn = connect_to_database()
    if not conn:
        return []

    try:
        cursor = conn.cursor(dictionary=True)

        # 從 device 表中直接獲取 device_address
        query = "SELECT device_address FROM device WHERE device_address IS NOT NULL"
        cursor.execute(query)
        results = cursor.fetchall()

        # 返回所有 device_address
        return [row["device_address"] for row in results]
    except mysql.connector.Error as err:
        print(f"SQL Error: {err}")
        return []
    finally:
        cursor.close()
        conn.close()

def get_data_with_device_name(start_time, end_time):
    """
    根據指定時間範圍，計算各設備的蚊子總數和分種類統計。
    """
    conn = connect_to_database()
    if not conn:
        return []

    try:
        cursor = conn.cursor(dictionary=True)
        
        # 獲取所有設備的基本信息
        device_query = """
        SELECT device_id, device_name, device_address
        FROM device
        """
        cursor.execute(device_query)
        devices = cursor.fetchall()

        results = []
        
        for device in devices:
            device_id = device["device_id"]
            device_name = device["device_name"]
            device_address = device["device_address"] if device["device_address"] else "Unknown"
            
            # 在時間範圍內查找 photo_id 和 count
            photo_query = """
            SELECT photo_id, count
            FROM photo
            WHERE device_id = %s
            AND photo_time BETWEEN %s AND %s
            """
            cursor.execute(photo_query, (device_id, start_time, end_time))
            photos = cursor.fetchall()
            
            count = 0  # 預設總數為 0
            m_counts = {"m0": 0, "m1": 0, "m2": 0, "m3": 0, "m4": 0}

            if photos:
                # 提取所有 photo_id
                photo_ids = [photo["photo_id"] for photo in photos]

                # 查找 seg_photo 中符合條件的記錄
                seg_photo_query = """
                SELECT 
                    sp.mosquito_id, 
                    SUM(sp.new) AS new_count,
                    mt.mosquito_type,
                    SUM(CASE WHEN mt.mosquito_type = 'HG' THEN sp.new ELSE 0 END) as hg_count,
                    SUM(CASE WHEN mt.mosquito_type = 'AG' THEN sp.new ELSE 0 END) as ag_count
                FROM seg_photo sp
                LEFT JOIN mosquitotype mt ON sp.isAedes = mt.isAedes
                WHERE sp.photo_id IN (%s)
                GROUP BY sp.mosquito_id, mt.mosquito_type
                """ % ','.join(['%s'] * len(photo_ids))
                cursor.execute(seg_photo_query, photo_ids)
                seg_photo_results = cursor.fetchall()

                # 計算總數和分種類數量
                hg_count = 0
                ag_count = 0
                for result in seg_photo_results:
                    mosquito_id = result["mosquito_id"]
                    new_count = result["new_count"]
                    count += new_count  # 累加總數
                    if mosquito_id in ["0", "1", "2", "3", "4"]:
                        m_counts[f"m{mosquito_id}"] += new_count
                    if result["mosquito_type"] == "HG":
                        hg_count += new_count
                    elif result["mosquito_type"] == "AG":
                        ag_count += new_count

                # 獲取 mosquito_type
                mosquito_type_query = """
                SELECT DISTINCT mt.mosquito_type
                FROM seg_photo sp
                LEFT JOIN mosquitotype mt ON sp.isAedes = mt.isAedes
                WHERE sp.photo_id IN (%s)
                LIMIT 1
                """ % ','.join(['%s'] * len(photo_ids))
                cursor.execute(mosquito_type_query, photo_ids)
                mosquito_type_result = cursor.fetchone()
                mosquito_type = mosquito_type_result["mosquito_type"] if mosquito_type_result else "N/A"
            else:
                # 無數據情況下所有計數都保持為 0
                hg_count = 0
                ag_count = 0
                pass

            # 添加結果到列表，保持原始名稱
            results.append({
                "device_id": device_id,
                "device_name": device_name,
                "device_address": device_address,
                "count": count,  # 使用原始名稱
                "hg_count": hg_count,
                "ag_count": ag_count,
                **m_counts
            })
        
        return results
    except mysql.connector.Error as err:
        print(f"SQL Error: {err}")
        return []
    finally:
        cursor.close()
        conn.close()
