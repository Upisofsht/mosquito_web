// 假設後端提供圖片的基底 URL，例如 http://localhost:3000/mosquito/
const BASE_URL = 'http://120.126.17.57:5001/mosquito/mos_mysql'; // 根據您的伺服器設定調整

// 創建自定義圖標函數（不變）
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

// 顏色計算函數（不變）
function getColor(count) {
    console.log("count: ", count);
    if (count === 0) {
        return 'black';
    }
    const levels = [10000, 5000, 1000, 500, 250, 125, 75, 50, 25, 5, 0];
    const maxLightness = 90;
    const minLightness = 20;
    const hue = 240;

    for (let i = 0; i < levels.length; i++) {
        if (count >= levels[i]) {
            const lightness = minLightness + (i * (maxLightness - minLightness) / (levels.length - 1));
            return `hsl(${hue}, 100%, ${lightness}%)`;
        }
    }
    return `hsl(${hue}, 100%, ${maxLightness}%)`;
}

// 互補色計算函數（不變）
function getComplementaryColor(hslColor) {
    const regex = /hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/;
    const match = hslColor.match(regex);
    if (match) {
        let hue = parseInt(match[1]);
        const saturation = parseInt(match[2]);
        const lightness = parseInt(match[3]);

        if (lightness === 0) {
            return 'hsl(0, 0%, 100%)';
        }
        if (lightness === 100) {
            return 'hsl(0, 0%, 0%)';
        }

        hue = (hue + 180) % 360;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    return 'white';
}

// 創建帶計數的自定義圖標（不變）
function createCustomIconWithCount(count, color) {
    const isZero = count === 0;
    const complementColor = isZero ? 'white' : getComplementaryColor(color);

    console.log(count);
    const icon = L.divIcon({
        className: 'count-icon',
        html: `<div style="background-color: ${color}; color: ${complementColor}; font-size: 14px; font-weight: bold; text-align: center; line-height: 20px; width: 20px; height: 20px; border-radius: 50%;border: 2px solid white;">${count}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    return icon;
}

let currentFilter = 'all';

// 初始化控件（不變）
function initControls(map, onTimeRangeChange, onFilterChange) {
    const controlsContainer = L.control({ position: 'topright' });

    controlsContainer.onAdd = function () {
        const div = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control');
        div.innerHTML = `
            <div style="position: fixed; top: 100px; left: 0px; z-index: 1000;">
                <button id="menu-toggle" style="
                    background: #fff;
                    border: none;
                    padding: 5px 10px;
                    cursor: pointer;
                    border-radius: 5px;
                    writing-mode: vertical-rl;
                    text-orientation: upright;
                    box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
                    display: block;
                ">
                    menu
                </button>
                <div id="menu-content" style="
                    background: white;
                    padding: 10px;
                    border-radius: 8px;
                    box-shadow: 0 0 5px rgba(0,0,0,0.5);
                    flex-direction:column;
                    gap:10px;
                    width: 200px;
                    transform: translateX(-220px);
                    transition: transform 0.3s ease;
                    text-align :center;
                ">
                    <p style="margin: 0; padding: 0; font-size:13px;font-weight: bold;">SELECT TIME</p>
                    <div style="display: flex; justify-content: space-between;">
                        <div>
                            <label>Start</label>
                            <button type="button" id="start-time" style="width: 100%; padding: 5px; cursor: pointer; border-radius: 5px; border: 2px solid #ccc;background-color: white;" onfocus="this.style.borderColor='blue'"onblur="this.style.borderColor='#ccc'">${new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ")}</button>
                        </div>
                        <div>
                            <label>End</label>
                            <button type="button" id="end-time" style="width: 100%; padding: 5px; cursor: pointer;border-radius: 5px; border: 2px solid #ccc;background-color: white;" onfocus="this.style.borderColor='blue'"onblur="this.style.borderColor='#ccc'">${new Date().toISOString().slice(0, 16).replace("T", " ")}</button>
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
                        <option value="m3">WH</option>
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
                        ×
                    </div>
                </div>
            </div>
        `;
        return div;
    };

    document.addEventListener('DOMContentLoaded', () => {
        const menuToggle = document.getElementById('menu-toggle');
        const menuContent = document.getElementById('menu-content');
        const closeMenuButton = document.getElementById('close-menu');

        menuToggle.addEventListener('click', () => {
            menuContent.style.display = 'flex';
            setTimeout(() => {
                menuContent.style.transform = 'translateX(0)';
            }, 10);
            menuToggle.style.display = 'none';
        });

        closeMenuButton.addEventListener('click', () => {
            menuContent.style.transform = 'translateX(-220px)';
            setTimeout(() => {
                menuContent.style.display = 'none';
                menuToggle.style.display = 'block';
            }, 300);
        });
    });

    controlsContainer.addTo(map);

    const startTimePicker = flatpickr("#start-time", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true,
        defaultDate: new Date(new Date().getTime() - 24 * 60 * 60 * 1000),
        onChange: function (selectedDates, dateStr) {
            endTimePicker.set('minDate', dateStr);
            endTimePicker.redraw();
            document.getElementById('start-time').innerText = dateStr;
        }
    });

    const endTimePicker = flatpickr("#end-time", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true,
        defaultDate: new Date(),
        onChange: function (selectedDates, dateStr) {
            startTimePicker.set('maxDate', dateStr);
            startTimePicker.redraw();
            document.getElementById('end-time').innerText = dateStr;
        }
    });

    document.getElementById('fetch-data').addEventListener('click', () => {
        const startTime = document.getElementById('start-time').innerText;
        const endTime = document.getElementById('end-time').innerText;
        onTimeRangeChange(startTime, endTime);
    });

    document.getElementById('mosquito-box').addEventListener('change', (event) => {
        currentFilter = event.target.value;
        onFilterChange(currentFilter);
    });
}

function getDefaultStartTime() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return oneDayAgo.toISOString().slice(0, 16);
}

function getDefaultEndTime() {
    const now = new Date();
    return now.toISOString().slice(0, 16);
}

function fetchDataByTimeAndRenderMarkers(startTime, endTime, map) {
    const formatDateToSQLFormat = (date) => {
        const localDate = new Date(date);
        localDate.setHours(localDate.getHours() + 16);
        return localDate.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    };

    const formattedStartTime = formatDateToSQLFormat(startTime);
    const formattedEndTime = formatDateToSQLFormat(endTime);

    fetch(`/api/data-by-time?start_time=${formattedStartTime}&end_time=${formattedEndTime}`)
        .then(response => response.json())
        .then(data => {
            renderMarkers(data, map, formattedStartTime, formattedEndTime);
        })
        .catch(error => console.error('Error fetching data:', error));
}

let markers = [];

function renderMarkers(data, map, formattedStartTime, formattedEndTime) {
    if (data.error) {
        console.error(data.error);
        return;
    }

    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    data.forEach(item => {
        const [lat, lng] = item.device_address.split(',').map(coord => parseFloat(coord.trim()));

        if (!isNaN(lat) && !isNaN(lng)) {
            const mosquitoCount = currentFilter === 'all'
                ? parseInt(item.count, 10)
                : parseInt(item[currentFilter], 10);
            const color = getColor(mosquitoCount);

            const customIcon = createCustomIconWithCount(mosquitoCount, color);
            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

            marker.bindPopup(`
                <div style="max-width: 1000px; padding: 5px; font-size: 14px; text-align: left; margin: 0 auto; display: flex; align-items: center; gap: 20px;">
                    <div style="flex-shrink: 0;">
                        <button id="toggle-view-${item.device_address}" style="position: absolute; top: 10px; left: 10px; z-index: 10; background-color: #007bff; color: white; padding: 5px 10px; border-radius: 5px;">
                            裝置照片
                        </button>
                        <h3 style="display: flex;justify-content: center; ">Current Data</h3>
                        <p><strong>Device Name:</strong> ${item.device_name}</p>
                        <p><strong>Photo Address:</strong> ${item.device_address}</p>
                        <p><strong>Total Count:</strong> ${item.count}</p>
                        <p><strong>Type Breakdown:</strong> 
                            H: ${item.m0}, IG: ${item.m1}, 
                            W: ${item.m2}, WH: ${item.m3}, GR: ${item.m4}
                        </p>
                        <hr style="border: 1px solid #ccc; margin: 10px 0;">
                        <h3 style="margin-bottom: 10px;">Historical Trend</h3>
                        <div id="chart-container-${item.device_address}" 
                            style="width: 100%; height: 250px; text-align: center; margin: 0 auto;">
                            Loading chart...
                        </div>
                        <div id="photo-container-${item.device_address}" style="display: none;">
                            <h3>歷史照片</h3>
                            <p>這裡顯示裝置的歷史照片。</p>
                        </div>
                    </div>
                </div>
            `);

            marker.on('popupopen', function () {
                const toggleButton = document.getElementById(`toggle-view-${item.device_address}`);
                const chartContainerId = `chart-container-${item.device_address}`;
                const chartContainer = document.getElementById(chartContainerId);
                const photoContainerId = `photo-container-${item.device_address}`;
                const photoContainer = document.getElementById(photoContainerId);

                fetch(`/api/chart-for-id?id=${encodeURIComponent(item.device_id)}&start_time=${formattedStartTime}&end_time=${formattedEndTime}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.chart_html) {
                            chartContainer.innerHTML = data.chart_html;
                            const scripts = chartContainer.querySelectorAll('script');
                            scripts.forEach(oldScript => {
                                const newScript = document.createElement('script');
                                newScript.textContent = oldScript.textContent;
                                document.body.appendChild(newScript);
                                newScript.remove();
                            });
                        } else {
                            chartContainer.innerHTML = '<p>No chart data available.</p>';
                        }
                    })
                    .catch(error => {
                        console.error('Error loading chart:', error);
                        chartContainer.innerHTML = '<p>Error loading chart.</p>';
                    });

                toggleButton.addEventListener('click', function () {
                    if (photoContainer.style.display === 'none') {
                        photoContainer.style.display = 'block';
                        chartContainer.style.display = 'none';
                        toggleButton.textContent = '裝置數據';

                        fetch(`/api/device-photos?id=${encodeURIComponent(item.device_id)}`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                }
                                return response.json();
                            })
                            .then(photoData => {
                                if (photoData && photoData.photos) {
                                    let photoContent = '<h4>歷史照片列表</h4><ul>';
                                    photoData.photos.forEach(photo => {
                                        // 檢查 photo.path 是否為完整 URL
                                        let photoUrl;
                                        if (photo.path.startsWith('http://') || photo.path.startsWith('https://')) {
                                            // 如果是完整 URL，直接使用並修剪多餘斜杠
                                            photoUrl = photo.path.replace(/\/+/g, '/');
                                        } else {
                                            // 如果是相對路徑，與 BASE_URL 拼接
                                            const base = BASE_URL.replace(/\/+$/, ''); // 移除 BASE_URL 結尾的斜杠
                                            const path = photo.path.replace(/^\/+/, ''); // 移除 photo.path 開頭的斜杠
                                            photoUrl = `${base}/${path}`; // 拼接時確保只有一個斜杠
                                        }
                                        console.log('Attempting to load image:', photoUrl); // 調試用
                                        photoContent += `
                                            <li style="display: flex; align-items: flex-start; gap: 20px; margin-bottom: 15px;">
                                                <div style="flex: 1;">
                                                    <p><strong>拍攝時間:</strong> ${photo.time}</p>
                                                    <p><strong>位置:</strong> ${photo.location}</p>
                                                    <p><strong>蚊子種類:</strong> ${photo.mosquito_types.join(', ')}</p>
                                                </div>
                                                <div style="flex: 1; text-align: center;">
                                                    <p><strong>照片:</strong></p>
                                                    <img src="${photoUrl}" alt="Device Photo" style="max-width: 100%; max-height: 200px; border: 1px solid #ccc; border-radius: 5px; margin-top: 5px;" onerror="console.error('Failed to load image: ${photoUrl}')">
                                                </div>
                                            </li>
                                        `;
                                    });
                                    photoContent += '</ul>';
                                    photoContainer.innerHTML = photoContent;
                                } else {
                                    photoContainer.innerHTML = '<p>沒有找到相關照片。</p>';
                                }
                            })
                            .catch(error => {
                                console.error('Error loading photos:', error);
                                photoContainer.innerHTML = '<p>無法加載照片資料。</p>';
                            });
                    } else {
                        photoContainer.style.display = 'none';
                        chartContainer.style.display = 'block';
                        toggleButton.textContent = '裝置照片';
                    }
                });
            });
        }
    });
}