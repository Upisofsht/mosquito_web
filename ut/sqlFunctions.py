import mysql.connector

# 資料庫連接函數
def connect_to_database():
    try:
        conn = mysql.connector.connect(
            host="localhost",       
            user="root",            
            password="",            
            database="mosquito"     
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
        
def get_all_photo_addresses():
    """
    從 device 表中獲取所有 device_id，並查詢每個 device_id 最新的 photo_id，
    然後返回這些 photo_address 的列表。
    """
    conn = connect_to_database()
    if not conn:
        return []

    try:
        cursor = conn.cursor(dictionary=True)
        
        # 從 device 表中獲取所有 device_id
        device_query = "SELECT device_id FROM device"
        cursor.execute(device_query)
        devices = cursor.fetchall()
        
        if not devices:
            return []

        addresses = []
        
        for device in devices:
            device_id = device["device_id"]
            
            # 查詢該 device_id 最新的 photo_id 和對應的 photo_address
            photo_query = """
            SELECT photo_address
            FROM photo
            WHERE device_id = %s
            AND photo_time = (
                SELECT MAX(photo_time)
                FROM photo
                WHERE device_id = %s
            )
            LIMIT 1
            """
            cursor.execute(photo_query, (device_id, device_id))
            photo_result = cursor.fetchone()
            
            if photo_result and photo_result["photo_address"]:
                addresses.append(photo_result["photo_address"])

        return addresses
    except mysql.connector.Error as err:
        print(f"SQL Error: {err}")
        return []
    finally:
        cursor.close()
        conn.close()


def get_data_with_device_name(start_time, end_time):
    """
    根據指定時間範圍，從資料庫中篩選出符合條件的資料。
    最終返回包含 device_name, photo_address, count, m0, m1, m2, m3, m4 的資料。
    """
    conn = connect_to_database()
    if not conn:
        return []

    try:
        cursor = conn.cursor(dictionary=True)
        
        # 找到所有的 device_id 和 device_name
        device_query = """
        SELECT device_id, device_name
        FROM device
        """
        cursor.execute(device_query)
        devices = cursor.fetchall()

        results = []
        
        for device in devices:
            device_id = device["device_id"]
            device_name = device["device_name"]
            
            # 找到該 device_id 中 photo_id 最大的一筆資料的 photo_address
            photo_query = """
            SELECT photo_address
            FROM photo
            WHERE device_id = %s
            AND photo_time = (
                SELECT MAX(photo_time)
                FROM photo
                WHERE device_id = %s
            )
            LIMIT 1
            """
            cursor.execute(photo_query, (device_id, device_id))
            photo_result = cursor.fetchone()
            
            if not photo_result or not photo_result["photo_address"]:
                continue
            
            photo_address = photo_result["photo_address"]
            
            # 找到該時間範圍內的 photo_id
            photo_ids_query = """
            SELECT photo_id
            FROM photo
            WHERE device_id = %s
            AND photo_time BETWEEN %s AND %s
            """
            cursor.execute(photo_ids_query, (device_id, start_time, end_time))
            photo_ids = [row["photo_id"] for row in cursor.fetchall()]
            
            if not photo_ids:
                continue
            
            # 找到這些 photo_id 在 seg_photo 中的 SP_id 和 mosquito_id
            seg_photo_query = """
            SELECT mosquito_id
            FROM seg_photo
            WHERE photo_id IN (%s)
            """ % ','.join(['%s'] * len(photo_ids))
            cursor.execute(seg_photo_query, photo_ids)
            seg_photo_results = cursor.fetchall()
            
            # 計算 m0~m4 和 count
            m_counts = {"m0": 0, "m1": 0, "m2": 0, "m3": 0, "m4": 0}
            for result in seg_photo_results:
                mosquito_id = result["mosquito_id"]
                if mosquito_id in ["0", "1", "2", "3", "4"]:
                    m_counts[f"m{mosquito_id}"] += 1
            
            count = len(seg_photo_results)
            
            # 添加結果到列表
            results.append({
                "device_name": device_name,
                "photo_address": photo_address,
                "count": count,
                **m_counts
            })
        
        return results
    except mysql.connector.Error as err:
        print(f"SQL Error: {err}")
        return []
    finally:
        cursor.close()
        conn.close()
