//圖表生成
function loadInteractiveChart() {
    fetch('http://127.0.0.1:5000/api/chart')
        .then(response => response.json())
        .then(data => {
            const chartContainer = document.getElementById('chart-container');
            chartContainer.innerHTML = data.chart_html;

            // 確保 Plotly 的腳本正確執行
            const scripts = chartContainer.getElementsByTagName('script');
            for (let script of scripts) {
                eval(script.innerText); // 執行嵌入的 JavaScript
            }
        })
        .catch(error => console.error('Error loading chart:', error));
}
document.addEventListener('DOMContentLoaded', loadInteractiveChart);

function fetchChartForAddress(address) {
    console.log(`Fetching chart for address: ${address}`);
    fetch(`http://127.0.0.1:5000/api/chart-for-address?address=${encodeURIComponent(address)}`)
        .then(response => response.json())
        .then(data => {
            if (data.chart_html) {
                const container = document.getElementById('address-charts-container');
                container.innerHTML = `<h3>Chart for ${address}</h3>`;

                // 將返回的 HTML 插入到一個臨時容器中
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = data.chart_html;

                // 將內容插入到主容器
                container.appendChild(tempDiv);

                // 遍歷所有腳本並執行
                const scripts = tempDiv.querySelectorAll('script');
                scripts.forEach(oldScript => {
                    const newScript = document.createElement('script');
                    newScript.textContent = oldScript.textContent;
                    document.body.appendChild(newScript);
                    newScript.remove(); // 避免腳本多次執行
                });

                window.scrollTo(0, container.offsetTop); // 自動滾動到圖表位置
            } else {
                console.error('No chart found for the address.');
            }
        })
        .catch(error => console.error('Error fetching chart for address:', error));
}