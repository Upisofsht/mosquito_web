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
    console.log("count: ", count)
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
                    const customIcon = createCustomIcon('black'); // 使用黑色 marker
                    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

                    // 在 Popup 中添加按鈕，允許查看該地址的圖表
                    marker.bindPopup(`
                        <strong>Photo Address:</strong> ${address}<br>
                        <button onclick="fetchChartForAddress('${address}')">View Chart</button>
                    `);
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
            <div style="background: white; padding: 10px; border-radius: 8px; box-shadow: 0 0 5px rgba(0,0,0,0.5);">
                <label>Start:</label>
                <input type="text" id="start-time" placeholder="Select Start Time">
                <label>End:</label>
                <input type="text" id="end-time" placeholder="Select End Time">
                <button id="fetch-data" style="margin-left: 10px;">Update</button>
                <hr>
                <label>Filter:</label>
                <select id="mosquito-box" style="width: 150px; padding: 5px;">
                    <option value="all">All</option>
                    <option value="m0">H</option>
                    <option value="m1">IG</option>
                    <option value="m2">W</option>
                    <option value="m3">WB</option>
                    <option value="m4">GR</option>
                </select>
            </div>
        `;
        return div;
    };

    controlsContainer.addTo(map);

    // 等到 DOM 元素生成後再初始化 Flatpickr
    flatpickr("#start-time", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true, // 強制使用 24 小時制
        // defaultDate: getJanuaryFirstTime(),
        defaultDate: new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // 預設為一天前
    });

    flatpickr("#end-time", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true, // 強制使用 24 小時制
        // defaultDate: getJanuarySecondTime(),
        defaultDate: new Date(), // 預設為現在
    });

    // 綁定時間選擇器更新事件
    document.getElementById('fetch-data').addEventListener('click', () => {
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
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
            const customIcon = createCustomIcon(getColor(item.count)); // 根據 count 設定顏色
            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

            // 更新 Popup 顯示多出的 device_name
            marker.bindPopup(`
                <strong>Device Name:</strong> ${item.device_name}<br>
                <strong>Photo Address:</strong> ${item.photo_address}<br>
                <strong>Total Count:</strong> ${item.count}<br>
                <strong>m0:</strong> ${item.m0}, <strong>m1:</strong> ${item.m1}, <strong>m2:</strong> ${item.m2}, <strong>m3:</strong> ${item.m3}, <strong>m4:</strong> ${item.m4}<br>
                <button onclick="fetchChartForAddress('${item.photo_address}')">View Chart</button>
            `);
        }
    });
}

