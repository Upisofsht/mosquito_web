import mysql.connector

# 連接到 MySQL 資料庫
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
    
def get_max_data_by_device():
    conn = connect_to_database()
    if not conn:
        return []

    try:
        cursor = conn.cursor(dictionary=True)
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
            (m.m0 + m.m1 + m.m2 + m.m3 + m.m4) As count,
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
        cursor.execute(query)
        results = cursor.fetchall()
        return results
    except mysql.connector.Error as err:
        print(f"SQL Error: {err}")
        return []
    finally:
        cursor.close()
        conn.close()