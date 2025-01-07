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
    console.log("count: ", count);
    if (count === 0) {
        return 'black'; // Marker 顏色為黑色
    }
    const levels = [10000, 5000, 1000, 500, 250, 125, 75, 50, 25, 5, 0]; // 層級
    const maxLightness = 90; // 最淺藍色
    const minLightness = 20; // 最深藍色
    const hue = 240; // 藍色的 HSL 色相

    // 找到對應區間，計算光亮度
    for (let i = 0; i < levels.length; i++) {
        if (count >= levels[i]) {
            const lightness = minLightness + (i * (maxLightness - minLightness) / (levels.length - 1));
            return `hsl(${hue}, 100%, ${lightness}%)`;
        }
    }
    return `hsl(${hue}, 100%, ${maxLightness}%)`; // 預設最淺藍色
}

function getColor(count) {
    console.log("count: ", count);
    const levels = [10000, 5000, 1000, 500, 250, 125, 75, 50, 25, 5, 0]; // 層級
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

function getComplementaryColor(hslColor) {
    const regex = /hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/;
    const match = hslColor.match(regex);
    if (match) {
        let hue = parseInt(match[1]);
        const saturation = parseInt(match[2]);
        const lightness = parseInt(match[3]);

        // 特殊情況處理
        if (lightness === 0) {
            return 'hsl(0, 0%, 100%)'; // 純黑的互補色為白色
        }
        if (lightness === 100) {
            return 'hsl(0, 0%, 0%)'; // 純白的互補色為黑色
        }

        // 計算互補色
        hue = (hue + 180) % 360; // 色相加 180 度
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    return 'white'; // 如果格式不正確，返回白色
}

// 創建自定義圖標，顯示 count 並保持顏色
function createCustomIconWithCount(count, color) {
    // 確保 count 是數字
    const isZero = count === 0; // 檢查數字類型的零
    const complementColor = isZero ? 'white' : getComplementaryColor(color);

    console.log(count);
    // 創建顯示 count 的 div，並保持顏色
    const icon = L.divIcon({
        className: 'count-icon', // 用於樣式
        html: `<div style="background-color: ${color}; color: ${complementColor}; font-size: 14px; font-weight: bold; text-align: center; line-height: 20px; width: 20px; height: 20px; border-radius: 50%;border: 2px solid white;">${count}</div>`,
        iconSize: [20, 20], // 設定圖標大小
        iconAnchor: [10, 10] // 圖標的錨點（中心）
    });
    return icon;
}

function fetchAllAddressesAndRenderMarkers(map) {
    fetch('http://127.0.0.1:5000/api/all-address')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
                return;
            }

            // 將地址渲染為黑色的 Marker
            data.forEach(address => {
                const [lat, lng] = address.split(',').map(coord => parseFloat(coord.trim()));

                if (!isNaN(lat) && !isNaN(lng)) {
                    const customIcon = createCustomIconWithCount('0','black'); // 使用黑色 marker
                    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

                    // 在 Popup 中添加按鈕，允許查看該地址的圖表
                    marker.bindPopup(`
                        <strong>Photo Address:</strong> ${address}<br>
                        <div id="chart-container-${address}" style="width: 100%; height: 300px; text-align: center;">
                            Loading chart...
                        </div>
                    `);
                    marker.on('popupopen', function () {
                        const chartContainerId = `chart-container-${address}`;
                        const chartContainer = document.getElementById(chartContainerId);

                        fetch(`http://127.0.0.1:5000/api/chart-for-address?address=${encodeURIComponent(address)}`)
                            .then(response => response.json())
                            .then(data => {
                                if (data.chart_html) {
                                    // 插入圖表的 HTML
                                    console.log(data.chart_html)
                                    chartContainer.innerHTML = data.chart_html;

                                    // 確保返回的 HTML 中的腳本正確執行
                                    const scripts = chartContainer.querySelectorAll('script');
                                    scripts.forEach(oldScript => {
                                        const newScript = document.createElement('script');
                                        newScript.textContent = oldScript.textContent;
                                        document.body.appendChild(newScript);
                                        newScript.remove(); // 避免腳本多次執行
                                    });
                                } else {
                                    chartContainer.innerHTML = '<p>No chart data available.</p>';
                                }
                            })
                            .catch(error => {
                                console.error('Error loading chart:', error);
                                chartContainer.innerHTML = '<p>Error loading chart.</p>';
                            });
                    });
                }
            });
        })
        .catch(error => console.error('Error fetching all addresses:', error));
}

let currentFilter = 'all'; // 當前選擇的過濾條件

// 初始化時間選擇器和下拉式選單
function initControls(map, onTimeRangeChange, onFilterChange) {
    const controlsContainer = L.control({ position: 'topright' });

    controlsContainer.onAdd = function () {
        const div = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control');
        div.innerHTML = `
            <div style="position: fixed; top: 100px; left: 0px; z-index: 1000;">
                <!-- 漢堡菜單按鈕 -->
                <button id="menu-toggle" style="
                    background: #fff;
                    border: none;
                    padding: 5px 10px;
                    cursor: pointer;
                    border-radius: 5px;
                    writing-mode: vertical-rl; /* 文字竖向排列 */
                    text-orientation: upright; /* 文字方向直立 */
                    box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
                    display: block; /* 默認顯示 */
                ">
                    menu <!-- 漢堡圖標 -->
                </button>
    
                <!-- 控件容器 -->
                <div id="menu-content" style="
                    background: white;
                    padding: 10px;
                    border-radius: 8px;
                    box-shadow: 0 0 5px rgba(0,0,0,0.5);
                    flex-direction:column;
                    gap:10px;
                    width: 200px; /* 控件寬度 */
                    transform: translateX(-220px); /* 起始位置在左側外面 */
                    transition: transform 0.3s ease; /* 滑出滑入過渡動畫 */
                    text-align :center;
                ">
                    <p style="margin: 0; padding: 0; font-size:13px;font-weight: bold;">SELECT TIME</p>
                    <div style="display: flex; justify-content: space-between;">
                        <div>
                            <label>Start</label>
                            <button type="button" id="start-time" style="width: 100%; padding: 5px; cursor: pointer; border-radius: 5px; border: 2px solid #ccc;background-color: white;" onfocus="this.style.borderColor='blue'"onblur="this.style.borderColor='#ccc'" /* 邊框圓角 */">${new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ")}</button>
                        </div>
                        <div>
                            <label>End</label>
                            <button type="button" id="end-time" style="width: 100%; padding: 5px; cursor: pointer;border-radius: 5px; border: 2px solid #ccc;background-color: white;" onfocus="this.style.borderColor='blue'"onblur="this.style.borderColor='#ccc'" /* 邊框圓角 */">${new Date().toISOString().slice(0, 16).replace("T", " ")}</button>
                        </div>
                    </div>
                    <button id="fetch-data" style="background-color : white;border-radius: 5px;">Conform</button>
                    <div style = "display:flex; flex-direction:row;">
                    <label style="text-align: left;padding:5px;">Filter</label>
                    <select id="mosquito-box" style="width: 150px; padding: 5px;">
                        <option value="all">All</option>
                        <option value="m0">H</option>
                        <option value="m1">IG</option>
                        <option value="m2">W</option>
                        <option value="m3">WB</option>
                        <option value="m4">GR</option>
                    </select>
                    </div>
                    <div id="close-menu" style="
                        position: absolute;
                        top: 0px;
                        right: 5px;
                        cursor: pointer;
                        font-size: 20px;
                        font-weight: bold;
                        color:rgb(10, 2, 2);
                    ">
                        &times; <!-- X 符號 -->
                    </div>
                </div>
            </div>
        `;
        return div;
    };

    // 添加展開/收起功能
    document.addEventListener('DOMContentLoaded', () => {
        const menuToggle = document.getElementById('menu-toggle');
        const menuContent = document.getElementById('menu-content');
        const closeMenuButton = document.getElementById('close-menu');
    
        // 點擊漢堡按鈕展開控件
        menuToggle.addEventListener('click', () => {
            menuContent.style.display = 'flex'; // 顯示控件
            // 確保動畫延後執行，避免 display 改變導致動畫無效
            setTimeout(() => {
                menuContent.style.transform = 'translateX(0)'; // 背景和內容一起滑出
            }, 10); // 短暫延遲
            menuToggle.style.display = 'none'; // 隱藏漢堡按鈕
        });
    
        // 點擊關閉按鈕收起控件
        closeMenuButton.addEventListener('click', () => {
            menuContent.style.transform = 'translateX(-220px)'; // 背景和內容一起滑入
            setTimeout(() => {
                menuContent.style.display = 'none'; // 隱藏控件
                menuToggle.style.display = 'block'; // 顯示漢堡按鈕
            }, 300); // 等待滑入動畫結束後隱藏
        });
    });

    controlsContainer.addTo(map);

    // 初始化 Flatpickr 時間選擇器
    const startTimePicker = flatpickr("#start-time", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true, // 使用 24 小時制
        defaultDate: new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // 預設為一天前
        onChange: function(selectedDates, dateStr, instance) {
            // 設置 end-time 的最小時間為選擇的 start-time
            endTimePicker.set('minDate', dateStr); // 更新 end-time 的 minDate

            // 刷新 end-time 選擇器的狀態
            endTimePicker.redraw();

            // 顯示選擇的開始時間
            document.getElementById('start-time').innerText = dateStr;
        }
    });

    // 初始化 End Time 時間選擇器
    const endTimePicker = flatpickr("#end-time", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true, // 使用 24 小時制
        defaultDate: new Date(), // 預設為現在
        onChange: function(selectedDates, dateStr, instance) {
            // 設置 start-time 的最大時間為選擇的 end-time
            startTimePicker.set('maxDate', dateStr); // 更新 start-time 的 maxDate

            // 刷新 start-time 選擇器的狀態
            startTimePicker.redraw();

            // 顯示選擇的結束時間
            document.getElementById('end-time').innerText = dateStr;
        }
    });

    // 綁定按鈕點擊事件
    document.getElementById('fetch-data').addEventListener('click', () => {
        const startTime = document.getElementById('start-time').innerText;
        const endTime = document.getElementById('end-time').innerText;
        onTimeRangeChange(startTime, endTime); // 調用回呼函數
    });

    // 綁定過濾條件更新事件
    document.getElementById('mosquito-box').addEventListener('change', (event) => {
        currentFilter = event.target.value;
        onFilterChange(currentFilter); // 調用回呼函數
    });
}



// 獲取預設的時間
function getDefaultStartTime() {
    const now = new Date();
    now.setHours(now.getHours() - 24, 0, 0, 0); // 設為整點
    return now.toISOString().slice(0, 16);
}

function getDefaultEndTime() {
    const now = new Date();
    now.setMinutes(0, 0, 0); // 清除秒數和毫秒，保證整分
    return now.toISOString().slice(0, 16);
}

function getJanuaryFirstTime() {
    const now = new Date();
    const januaryFirst = new Date(now.getFullYear(), 0, 1, 8, 0, 0);
    return januaryFirst.toISOString().slice(0, 16); // 返回 YYYY-MM-DDTHH:mm 格式
}

function getJanuarySecondTime() {
    const now = new Date();
    const januarySecond = new Date(now.getFullYear(), 0, 2, 8, 0, 0);
    return januarySecond.toISOString().slice(0, 16); // 返回 YYYY-MM-DDTHH:mm 格式
}

function fetchDataByTimeAndRenderMarkers(startTime, endTime, map) {
    const formatDateToSQLFormat = (date) => {
        const isoDate = new Date(date);
        return isoDate.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    };

    const formattedStartTime = formatDateToSQLFormat(startTime);
    const formattedEndTime = formatDateToSQLFormat(endTime);

    fetch(`http://127.0.0.1:5000/api/data-by-time?start_time=${formattedStartTime}&end_time=${formattedEndTime}`)
        .then(response => response.json())
        .then(data => {
            renderMarkers(data, map); // 渲染標記
        })
        .catch(error => console.error('Error fetching data:', error));
}

let markers = []

function renderMarkers(data, map) {
    if (data.error) {
        console.error(data.error);
        return;
    }
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer); // 移除之前的標記
        }
    });

    data.forEach(item => {
        const [lat, lng] = item.photo_address.split(',').map(coord => parseFloat(coord.trim()));

        if (!isNaN(lat) && !isNaN(lng)) {
            const mosquitoCount = currentFilter === 'all' 
                ? parseInt(item.count, 10) // 將總數轉換為整數
                : parseInt(item[currentFilter], 10); // 將對應的蚊蟲類型數量轉換為整數
            
            console.log("item: ", item)
            const color = getColor(mosquitoCount); // 根據 count 設定顏色

            // 創建自定義圖標並添加到地圖上
            const customIcon = createCustomIconWithCount(mosquitoCount, color);

            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

            // 更新 Popup 顯示多出的 device_name
            marker.bindPopup(`
                <strong>Device Name:</strong> ${item.device_name}<br>
                <strong>Photo Address:</strong> ${item.photo_address}<br>
                <strong>Total Count:</strong> ${item.count}<br>
                <strong>m0:</strong> ${item.m0}, <strong>m1:</strong> ${item.m1}, <strong>m2:</strong> ${item.m2}, <strong>m3:</strong> ${item.m3}, <strong>m4:</strong> ${item.m4}<br>
                <div id="chart-container-${item.photo_address}">
                    Loading chart...
                </div>
            `);
            marker.on('popupopen', function () {
                const chartContainerId = `chart-container-${item.photo_address}`;
                const chartContainer = document.getElementById(chartContainerId);

                fetch(`http://127.0.0.1:5000/api/chart-for-address?address=${encodeURIComponent(item.photo_address)}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.chart_html) {
                            // 插入圖表 HTML
                            chartContainer.innerHTML = data.chart_html;

                            // 確保返回的 HTML 中的腳本正確執行
                            const scripts = chartContainer.querySelectorAll('script');
                            scripts.forEach(oldScript => {
                                const newScript = document.createElement('script');
                                newScript.textContent = oldScript.textContent;
                                document.body.appendChild(newScript);
                                newScript.remove(); // 避免腳本多次執行
                            });
                        } else {
                            chartContainer.innerHTML = '<p>No chart data available.</p>';
                        }
                    })
                    .catch(error => {
                        console.error('Error loading chart:', error);
                        chartContainer.innerHTML = '<p>Error loading chart.</p>';
                    });
            });
        }
    });
}

