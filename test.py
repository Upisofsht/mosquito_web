import os
import sys
from ut.chart import generate_last_24h_chart

def main():
    # 調用圖表生成函數
    chart_path = generate_last_24h_chart()
    if chart_path:
        print(f"圖表已生成，存儲於: {chart_path}")
    else:
        print("圖表生成失敗。")

if __name__ == "__main__":
    main()
