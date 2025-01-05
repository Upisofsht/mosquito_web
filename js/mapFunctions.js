// 創建自定義圖標函數
function createCustomIcon(color) {
    return L.divIcon({
        className: "custom-icon",
        html: `<div style="
            background-color: ${color};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid white;
            "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}

function getColor(count) {
    const levels = [10000, 5000, 1000, 500, 250, 125, 75, 50, 25, 5]; // 層級
    const maxLightness = 90; // 最淺藍色
    const minLightness = 20; // 最深藍色
    const hue = 240; // 藍色的 HSL 色相

    // 如果 count 為 0，返回黑色
    if (count === 0) {
        return 'black';
    }

    // 找到對應區間，計算光亮度
    for (let i = 0; i < levels.length; i++) {
        if (count >= levels[i]) {
            const lightness = minLightness + (i * (maxLightness - minLightness) / (levels.length - 1));
            return `hsl(${hue}, 100%, ${lightness}%)`;
        }
    }
    return `hsl(${hue}, 100%, ${maxLightness}%)`; // 預設最淺藍色
}

// 從 /api/all-data 獲取數據並渲染標記
function fetchAllDataAndRenderMarkers(map) {
    fetch('http://127.0.0.1:5000/api/all-data')
        .then(response => response.json())
        .then(data => {
            let currentFilter = 'all'; // 默認過濾條件

            // 渲染地圖標記的函數
            const renderMarkers = () => {
                map.eachLayer((layer) => {
                    if (layer instanceof L.Marker) {
                        map.removeLayer(layer); // 清除之前的標記
                    }
                });

                data.forEach(item => {
                    const [lat, lng] = item.photo_address.split(',').map(coord => parseFloat(coord.trim()));

                    if (!isNaN(lat) && !isNaN(lng)) {
                        // 選擇對應的值顯示在彈窗中
                        const displayValue =
                            currentFilter === 'all'
                                ? item.count
                                : item[currentFilter];

                        // 選擇顏色基於顯示的值
                        const customIcon = createCustomIcon(getColor(displayValue));

                        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

                        // 綁定彈窗
                        marker.bindPopup(`
                            <strong>Photo Address:</strong> ${item.photo_address}<br>
                            <strong>${currentFilter === 'all' ? 'Total Count' : `Mosquito (${currentFilter})`}:</strong> ${displayValue}<br>
                            <strong>Types:</strong> 
                            m0=${item.m0}, m1=${item.m1}, m2=${item.m2}, m3=${item.m3}, m4=${item.m4}
                        `);
                    }
                });
            };

            // 初始渲染標記
            renderMarkers();

            // 當選單改變時重新渲染
            addDropdownToMap(map, (filter) => {
                currentFilter = filter;
                renderMarkers();
            });
        })
        .catch(error => console.error('Error fetching all-data:', error));
}

// 添加下拉式選單到地圖
function addDropdownToMap(map, onChange) {
    const dropdown = L.control({ position: 'topright' });

    dropdown.onAdd = function () {
        const div = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control');
        div.innerHTML = `
            <select id="mosquito-box" style="width: 150px; padding: 5px;">
                <option value="all">All</option>
                <option value="m0">H</option>
                <option value="m1">IG</option>
                <option value="m2">W</option>
                <option value="m3">WH</option>
                <option value="m4">GR</option>
            </select>
        `;
        return div;
    };

    dropdown.addTo(map);

    // 綁定選項改變的事件處理
    document.getElementById('mosquito-box').addEventListener('change', (event) => {
        onChange(event.target.value);
    });
}

function updateChart() {
    const todayDate = new Date().toISOString().split('T')[0]; // 獲取今日日期
    const chartPath = `/history/${todayDate}_last_7days_mosquito_history.png`; // 圖表檔案路徑
    const chartImage = document.getElementById('chart-image');

    // 設置圖片路徑
    chartImage.src = chartPath;

    // 如果圖表無法加載，顯示預設訊息
    chartImage.onerror = () => {
        chartImage.src = '';
        chartImage.alt = 'Chart not available.';
    };
}

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