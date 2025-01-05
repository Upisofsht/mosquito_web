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

# 現有的範例函數仍可保留，並重構使用 select 函數
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