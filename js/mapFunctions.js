// 假設後端提供圖片的基底 URL
const BASE_URL = 'https://mosweb.ddns.net/mosquito/mos_mysql';
// 版面：查詢工具列在 index.html 的 #app-toolbar；#map-container 用 flex:1 + min-height:0 填滿剩餘高度；版面變動後請 map.invalidateSize()。

// re-test 用 cache-buster：照片檔名固定，re-test 後覆寫同檔。
// 需對「本 session 已 re-test 過」的 photo_id URL 加 ?v=<ts> 強制重抓，避開 Caddy max-age=86400 快取。
const RETEST_CACHE_KEY = 'mos.retestedPhotos';
function getRetestMap() {
    try {
        return JSON.parse(sessionStorage.getItem(RETEST_CACHE_KEY) || '{}');
    } catch (e) {
        return {};
    }
}
function markPhotoRetested(photoId) {
    if (!photoId) return;
    const m = getRetestMap();
    m[String(photoId)] = Date.now();
    try {
        sessionStorage.setItem(RETEST_CACHE_KEY, JSON.stringify(m));
    } catch (e) {}
}
function appendCacheBuster(url, photoId) {
    const ts = getRetestMap()[String(photoId)];
    if (!ts) return url;
    return url + (url.includes('?') ? '&' : '?') + 'v=' + ts;
}

// 圖片加載函數，防止無限迴圈
function loadImage(imgElement, primaryUrl, fallbackUrl = `${BASE_URL}/default.jpg`) {
    imgElement.dataset.fallbackTried = false;
    imgElement.src = primaryUrl;
    imgElement.onerror = () => {
        if (!imgElement.dataset.fallbackTried) {
            imgElement.dataset.fallbackTried = true;
            console.warn(`Failed to load image: ${primaryUrl}, trying fallback: ${fallbackUrl}`);
            imgElement.src = fallbackUrl;
        } else {
            imgElement.style.display = 'none';
            console.error(`Failed to load fallback image: ${fallbackUrl}`);
        }
    };
}

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

// 顏色計算函數 — Vector Watch 四階色票
//   0           → slate-zero (#5A6B7E)
//   1   – 25    → teal-low   (#1B95A8)
//   26  – 100   → amber-mid  (#D97706)
//   101 +       → coral-high (#DB4C4C)
function getColor(count) {
    const n = parseInt(count, 10);
    if (!Number.isFinite(n) || n <= 0) return '#5A6B7E';
    if (n <= 25)  return '#1B95A8';
    if (n <= 100) return '#D97706';
    return '#DB4C4C';
}

// 互補色（marker 文字顏色）。新版 marker 一律白字，這支 helper 仍保留以兼容舊呼叫。
function getComplementaryColor(/* hex */) {
    return '#FFFFFF';
}

// 創建帶計數的自定義圖標（大數字縮小字級或顯示 999+，完整數字見 tooltip）
function createCustomIconWithCount(count, color) {
    const n = parseInt(count, 10);
    const num = isNaN(n) ? 0 : n;
    // 一律白字，不再用互補色（與新四階色票相容）
    const complementColor = '#FFFFFF';
    let label = String(num);
    let fontSize = 12;
    let size = 36;
    if (num > 999) {
        label = '999+';
        fontSize = 11;
        size = 56;
    } else if (num > 99) {
        fontSize = 13;
        size = 48;
    } else if (num > 9) {
        fontSize = 13;
        size = 42;
    } else if (num > 0) {
        fontSize = 13;
        size = 38;
    } else {
        // num === 0
        fontSize = 12;
        size = 32;
    }
    const half = Math.round(size / 2);
    return L.divIcon({
        className: 'count-icon',
        html: `<div class="mos-marker-count" style="background-color:${color};color:${complementColor};font-size:${fontSize}px;width:${size}px;height:${size}px;line-height:${size}px;">${label}</div>`,
        iconSize: [size, size],
        iconAnchor: [half, half]
    });
}

let lastMarkerPayload = null;

// ============================================================
// Vector Watch — Plotly theme overlay
// Re-skins the server-rendered Plotly figure to match the dashboard:
// teal/amber/coral series, slate gridlines, transparent background,
// matching font stack. Safe to call repeatedly.
// ============================================================
const VW_PLOTLY_PALETTE = [
    '#0E7C8E', // teal-600 (primary / AG)
    '#D97706', // amber-mid (HG)
    '#7A5BD9', // species-ag / Other
    '#15A36F', // ok-500
    '#DB4C4C', // alert-600
    '#5A6B7E', // slate-500
];
function applyVectorWatchPlotlyTheme(root) {
    if (typeof Plotly === 'undefined' || !root) return;
    const gd = root.querySelector('.plotly-graph-div');
    if (!gd || !gd.data) return;

    // Per-trace color override: cycle through VW palette while
    // preserving original trace names and types.
    const traceUpdate = {};
    (gd.data || []).forEach((tr, i) => {
        const col = VW_PLOTLY_PALETTE[i % VW_PLOTLY_PALETTE.length];
        if (!traceUpdate['line.color']) traceUpdate['line.color'] = [];
        if (!traceUpdate['marker.color']) traceUpdate['marker.color'] = [];
        traceUpdate['line.color'].push(col);
        traceUpdate['marker.color'].push(col);
    });

    const layoutUpdate = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor:  'rgba(0,0,0,0)',
        font: {
            family: '"Inter","Noto Sans TC",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
            size:   12,
            color:  '#2A3A4A',
        },
        colorway: VW_PLOTLY_PALETTE,
        xaxis: {
            gridcolor: '#ECF0F4',
            zerolinecolor: '#DCE3EB',
            linecolor: '#DCE3EB',
            tickfont:  { color: '#5A6B7E', size: 11 },
            title:     { font: { color: '#425466', size: 12 } },
        },
        yaxis: {
            gridcolor: '#ECF0F4',
            zerolinecolor: '#DCE3EB',
            linecolor: '#DCE3EB',
            tickfont:  { color: '#5A6B7E', size: 11 },
            title:     { font: { color: '#425466', size: 12 } },
        },
        legend: {
            font: { color: '#2A3A4A', size: 11 },
            bgcolor: 'rgba(255,255,255,.7)',
            bordercolor: '#DCE3EB',
            borderwidth: 1,
        },
        margin: { l: 48, r: 16, t: 18, b: 38 },
        hoverlabel: {
            bgcolor: '#0F1B26',
            bordercolor: '#0F1B26',
            font: {
                family: '"Inter","Noto Sans TC",system-ui,sans-serif',
                color: '#FFFFFF',
                size: 11,
            },
        },
    };

    try {
        if (Object.keys(traceUpdate).length) {
            const indices = (gd.data || []).map((_, i) => i);
            Plotly.restyle(gd, traceUpdate, indices);
        }
        Plotly.relayout(gd, layoutUpdate);
    } catch (e) {
        // Theme is best-effort; never break the popup if Plotly internals
        // change shape.
        console.warn('VW Plotly theme apply failed:', e);
    }
}
let lastFormattedStartTime = null;
let lastFormattedEndTime = null;
let deviceMarkersLayer = null;

function getDeviceMarkersLayer(map) {
    if (!deviceMarkersLayer || !map.hasLayer(deviceMarkersLayer)) {
        deviceMarkersLayer = L.layerGroup().addTo(map);
    }
    return deviceMarkersLayer;
}

/** device_id（或後備 id 字串）→ L.Marker，供頂欄「選裝置」跳轉 */
const markerRegistry = new Map();

function syncDeviceJumpSelect(entries) {
    const sel = document.getElementById('device-jump');
    if (!sel) {
        return;
    }
    const placeholder = sel.querySelector('option[value=""]');
    sel.innerHTML = '';
    if (placeholder) {
        sel.appendChild(placeholder);
    } else {
        const opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = '— 選擇裝置 —';
        sel.appendChild(opt0);
    }
    const sorted = [...entries].sort((a, b) =>
        String(a.name).localeCompare(String(b.name), 'zh-Hant')
    );
    sorted.forEach(({ key, name, countLabel }) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = `${name}（${countLabel}）`;
        sel.appendChild(opt);
    });
}

function setupDeviceJumpHandler(map) {
    const sel = document.getElementById('device-jump');
    if (!sel || sel.dataset.jumpBound === '1') {
        return;
    }
    sel.dataset.jumpBound = '1';
    let deviceJumpGeneration = 0;
    sel.addEventListener('change', () => {
        const key = sel.value;
        if (!key) {
            return;
        }
        const marker = markerRegistry.get(key);
        if (marker) {
            map.closePopup();

            const ll = marker.getLatLng();
            const z = Math.max(map.getZoom(), 15);
            const center = map.getCenter();
            const viewChanged =
                Math.abs(center.lat - ll.lat) > 1e-7 ||
                Math.abs(center.lng - ll.lng) > 1e-7 ||
                map.getZoom() !== z;

            const gen = ++deviceJumpGeneration;
            const openWhenMapReady = () => {
                if (gen !== deviceJumpGeneration) {
                    return;
                }
                marker.openPopup();
                // 勿呼叫 popup.update()：Leaflet 對字串內容會整段重設 innerHTML，會抹掉圖表／照片等非同步載入的資料。
                requestAnimationFrame(() => {
                    if (gen !== deviceJumpGeneration) {
                        return;
                    }
                    map.invalidateSize();
                });
            };

            if (viewChanged) {
                map.once('moveend', openWhenMapReady);
                map.setView(ll, z, { animate: true });
            } else {
                openWhenMapReady();
            }
        }
        sel.value = '';
    });
}

function devicePopupIdSuffix(deviceId, deviceAddress) {
    const raw =
        deviceId != null && String(deviceId) !== ''
            ? String(deviceId)
            : String(deviceAddress || 'unknown');
    return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function formatSqlRangeForDisplay(start, end) {
    if (!start || !end || String(start).length < 12 || String(end).length < 12) {
        return '';
    }
    const s = String(start);
    const e = String(end);
    const fmt = (t) =>
        `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)} ${t.slice(8, 10)}:${t.slice(10, 12)}`;
    return `查詢區間：${fmt(s)} ～ ${fmt(e)}`;
}

/** 歷史照片列表單筆 HTML（popup 內動態插入，class 對應 styles.css） */
function buildPhotoListItemHtml(photo, mosquitoNameMapping) {
    const photoUrlBase =
        photo.path.startsWith('http://') || photo.path.startsWith('https://')
            ? photo.path.replace(/\/+/g, '/')
            : `${BASE_URL.replace(/\/+$/, '')}/${photo.path.replace(/^\/+/, '')}`;
    const photoIdForBuster = photo.photo_id != null ? String(photo.photo_id) : '';
    const photoUrl = appendCacheBuster(photoUrlBase, photoIdForBuster);
    const totalMosquitoCount = photo.count || 0;
    const mosquitoStats =
        photo.mosquito_types &&
        photo.mosquito_counts &&
        photo.mosquito_types.length === photo.mosquito_counts.length &&
        photo.mosquito_types.length > 0
            ? photo.mosquito_types
                  .map(
                      (type, index) =>
                          `<p class="mos-photo-card__stat-line">${mosquitoNameMapping[type] || type}：${photo.mosquito_counts[index]} 隻</p>`
                  )
                  .join('')
            : '<p class="mos-photo-card__stat-line mos-photo-card__stat-line--muted">未檢測到新蚊子</p>';
    const currentMosquitoStats =
        photo.current_mosquito_types &&
        photo.current_mosquito_counts &&
        photo.current_mosquito_types.length === photo.current_mosquito_counts.length &&
        photo.current_mosquito_types.length > 0
            ? photo.current_mosquito_types
                  .map(
                      (type, index) =>
                          `<p class="mos-photo-card__stat-line">${mosquitoNameMapping[type] || type}：${photo.current_mosquito_counts[index]} 隻</p>`
                  )
                  .join('')
            : '<p class="mos-photo-card__stat-line mos-photo-card__stat-line--muted">目前無蚊子</p>';
    const formattedTime = `${photo.time.slice(0, 4)}-${photo.time.slice(4, 6)}-${photo.time.slice(6, 8)} ${photo.time.slice(8, 10)}:${photo.time.slice(10, 12)}:${photo.time.slice(12, 14)}`;
    const photoId = photo.photo_id != null ? String(photo.photo_id) : '';
    const needsLabel = photo.needs_label ? 1 : 0;
    const labelBtnText = needsLabel ? '已標記' : '待標記';
    const labelCls = needsLabel ? 'mos-btn--label-done' : 'mos-btn--label-todo';
    const photoActions = photoId
        ? `<div class="mos-photo-card__actions"><button type="button" class="mos-btn mos-btn--sm mos-btn--secondary re-test-btn" data-photo-id="${photoId}">重新測試</button><button type="button" class="mos-btn mos-btn--sm mos-btn--soft label-toggle-btn ${labelCls}" data-photo-id="${photoId}" data-needs-label="${needsLabel}">${labelBtnText}</button></div>`
        : '';
    return `
        <li class="mos-photo-card">
            <div class="mos-photo-card__grid">
                <div class="mos-photo-card__meta">
                    <p class="mos-photo-card__time">${formattedTime}</p>
                    <p class="mos-photo-card__row"><span class="mos-photo-card__k">位置</span> ${photo.location}</p>
                    <p class="mos-photo-card__row"><span class="mos-photo-card__k">總數</span> ${totalMosquitoCount} 隻</p>
                    <div class="mos-photo-card__block">
                        <span class="mos-photo-card__k">目前種類</span>
                        ${currentMosquitoStats}
                    </div>
                    <div class="mos-photo-card__block">
                        <span class="mos-photo-card__k">新增種類</span>
                        ${mosquitoStats}
                    </div>
                </div>
                <div class="mos-photo-card__thumb">
                    <span class="mos-photo-card__k mos-photo-card__k--thumb">預覽</span>
                    <img class="mos-photo-card__img" src="${photoUrl}" alt="" data-primary-url="${photoUrl}">
                </div>
            </div>
            ${photoActions}
        </li>`;
}

function reapplyMarkersFromCache(map) {
    if (lastMarkerPayload && map) {
        renderMarkers(lastMarkerPayload, map, lastFormattedStartTime, lastFormattedEndTime, false);
    }
}

let currentFilter = 'all';

function initControls(map, onTimeRangeChange, onFilterChange) {
    const onFilter =
        typeof onFilterChange === 'function' ? onFilterChange : () => reapplyMarkersFromCache(map);

    const now = new Date();
    const currentTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16)
        .replace('T', ' ');
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16)
        .replace('T', ' ');

    const startBtn = document.getElementById('start-time');
    const endBtn = document.getElementById('end-time');
    if (startBtn && !startBtn.textContent.trim()) {
        startBtn.textContent = sevenDaysAgo;
    }
    if (endBtn && !endBtn.textContent.trim()) {
        endBtn.textContent = currentTime;
    }

    setupDeviceJumpHandler(map);

    const startTimePicker = flatpickr('#start-time', {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true,
        defaultDate: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
        onChange: function (selectedDates, dateStr) {
            endTimePicker.set('minDate', dateStr);
            endTimePicker.redraw();
            const el = document.getElementById('start-time');
            if (el) {
                el.textContent = dateStr;
            }
        }
    });

    const endTimePicker = flatpickr('#end-time', {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true,
        defaultDate: new Date(new Date().getTime() + 8 * 60 * 60 * 1000),
        onChange: function (selectedDates, dateStr) {
            startTimePicker.set('maxDate', dateStr);
            startTimePicker.redraw();
            const el = document.getElementById('end-time');
            if (el) {
                el.textContent = dateStr;
            }
        }
    });

    const fetchBtn = document.getElementById('fetch-data');
    if (fetchBtn) {
        fetchBtn.addEventListener('click', () => {
            const startTime = document.getElementById('start-time').textContent.trim();
            const endTime = document.getElementById('end-time').textContent.trim();
            onTimeRangeChange(startTime, endTime);
        });
    }

    const mosquitoBox = document.getElementById('mosquito-box');
    if (mosquitoBox) {
        mosquitoBox.addEventListener('change', (event) => {
            currentFilter = event.target.value;
            onFilter();
        });
    }

    requestAnimationFrame(() => map.invalidateSize());
}

function getDefaultStartTime() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000);
    return oneDayAgo.toISOString().slice(0, 16);
}

function getDefaultEndTime() {
    const now2 = new Date();
    const now = new Date(now2.getTime() + 8 * 60 * 60 * 1000);
    return now.toISOString().slice(0, 16);
}

function fetchDataByTimeAndRenderMarkers(startTime, endTime, map) {
    const formatDateToSQLFormat = (date) => {
        const localDate = new Date(date);
        localDate.setHours(localDate.getHours() + 8);
        return localDate.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    };

    const formattedStartTime = formatDateToSQLFormat(startTime);
    const formattedEndTime = formatDateToSQLFormat(endTime);

    fetch(`/api/data-by-time?start_time=${formattedStartTime}&end_time=${formattedEndTime}`)
        .then(response => response.json())
        .then(data => {
            if (!data.error && Array.isArray(data)) {
                lastMarkerPayload = data;
                lastFormattedStartTime = formattedStartTime;
                lastFormattedEndTime = formattedEndTime;
                window.__lastMarkers = data;
                document.dispatchEvent(new CustomEvent('mos:markers-loaded', { detail: data }));
            }
            renderMarkers(data, map, formattedStartTime, formattedEndTime, true);
        })
        .catch(error => console.error('Error fetching data:', error));
}

function renderMarkers(data, map, formattedStartTime, formattedEndTime, fitMapToMarkers = false) {
    if (data.error) {
        console.error(data.error);
        return;
    }
    if (!Array.isArray(data)) {
        console.error('renderMarkers: 預期為陣列', data);
        return;
    }

    const MOSQUITO_NAME_MAPPING = {
        "IG": "IG埃及斑蚊",
        "H": "H熱帶家蚊",
        "W": "W白線斑蚊",
        "WH": "WH白腹斑蚊",
        "GR": "GR地下家蚊",
        "AG": "AG斑蚊類",
        "HG": "HG家蚊類",
        "M5": "AG斑蚊類",
        "M6": "HG家蚊類"
    };

    const markerLayer = getDeviceMarkersLayer(map);
    markerLayer.clearLayers();
    markerRegistry.clear();
    const deviceJumpByKey = new Map();

    data.forEach(item => {
        const [lat, lng] = item.device_address.split(',').map(coord => parseFloat(coord.trim()));

        if (!isNaN(lat) && !isNaN(lng)) {
            const idSuf = devicePopupIdSuffix(item.device_id, item.device_address);
            const mosquitoCount = currentFilter === 'all'
                ? parseInt(item.count, 10)
                : parseInt(item[currentFilter], 10);
            const color = getColor(mosquitoCount);

            const customIcon = createCustomIconWithCount(mosquitoCount, color);
            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(markerLayer);
            const countFull = Number.isFinite(mosquitoCount) ? mosquitoCount : 0;
            const regKey =
                item.device_id != null && String(item.device_id) !== ''
                    ? String(item.device_id)
                    : idSuf;
            markerRegistry.set(regKey, marker);
            deviceJumpByKey.set(regKey, {
                key: regKey,
                name: item.device_name || regKey,
                countLabel: `${countFull} 隻`
            });
            marker.bindTooltip(`${item.device_name}：${countFull} 隻`, {
                sticky: true,
                direction: 'top'
            });

            const rangeLabel = formatSqlRangeForDisplay(formattedStartTime, formattedEndTime);

            const originalContent = `
                <div class="mos-popup">
                    <div class="mos-popup__inner">
                        <header class="mos-popup__header">
                            <div class="mos-popup__tabs" role="tablist" aria-label="裝置檢視">
                                <button type="button" role="tab" id="popup-tab-data-${idSuf}" class="mos-popup__tab mos-popup__tab--active" aria-selected="true">資料</button>
                                <button type="button" role="tab" id="popup-tab-trend-${idSuf}" class="mos-popup__tab" aria-selected="false">趨勢</button>
                                <button type="button" role="tab" id="popup-tab-photo-${idSuf}" class="mos-popup__tab" aria-selected="false">相簿</button>
                            </div>
                            <div class="mos-popup__head-text">
                                <h3 class="mos-popup__title">目前資料</h3>
                                <p class="mos-popup__range">${rangeLabel}</p>
                            </div>
                        </header>
                        <div id="popup-panel-data-${idSuf}" class="mos-popup__page mos-popup__page--active">
                            <section class="mos-popup__card">
                                <dl class="mos-popup__dl">
                                    <div class="mos-popup__dl-item">
                                        <dt>裝置名稱</dt>
                                        <dd><button type="button" id="device-name-btn-${idSuf}" class="mos-btn mos-btn--accent">${item.device_name}</button></dd>
                                    </div>
                                    <div class="mos-popup__dl-item">
                                        <dt>座標／地址</dt>
                                        <dd class="mos-popup__mono">${item.device_address}</dd>
                                    </div>
                                    <div class="mos-popup__dl-item">
                                        <dt>時間範圍總數</dt>
                                        <dd><span class="mos-popup__stat">${item.count} 隻</span></dd>
                                    </div>
                                    <div class="mos-popup__dl-item">
                                        <dt>種類統計</dt>
                                        <dd class="mos-popup__stats-inline">AG斑紋類 ${item.m5} 隻 · HG家蚊類 ${item.m6} 隻</dd>
                                    </div>
                                </dl>
                                <div class="mos-popup__actions">
                                    <button type="button" id="take-photo-btn-${idSuf}" class="mos-btn mos-btn--primary">拍照</button>
                                    <button type="button" id="reset-btn-${idSuf}" class="mos-btn mos-btn--danger">重置</button>
                                </div>
                            </section>
                        </div>
                        <div id="popup-panel-trend-${idSuf}" class="mos-popup__page">
                            <div class="mos-popup__page-inner">
                                <h3 class="mos-popup__page-title">歷史趨勢</h3>
                                <div id="chart-container-${idSuf}" class="mos-popup__chart mos-popup__chart--page"><span class="mos-popup__skeleton">開啟本頁後載入圖表…</span></div>
                            </div>
                        </div>
                        <div id="popup-panel-photo-${idSuf}" class="mos-popup__page">
                            <div class="mos-popup__page-inner">
                                <h3 class="mos-popup__page-title">歷史照片</h3>
                                <div id="photo-container-${idSuf}" class="mos-popup__photos mos-popup__photos--page">
                                    <p class="mos-popup__hint">切換到「相簿」時載入列表。</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const settingsContent = `
                <div class="mos-popup mos-popup--settings">
                    <header class="mos-popup__settings-head">
                        <h2 class="mos-popup__heading">${item.device_name}</h2>
                        <p class="mos-popup__settings-sub">裝置設定</p>
                    </header>
                    <div class="mos-popup__field">
                        <label class="mos-popup__label">拍照時間</label>
                        <div class="mos-popup__inline-inputs">
                            <select id="hour-select-${idSuf}" class="mos-select" aria-label="時"></select>
                            <span class="mos-popup__time-sep">:</span>
                            <select id="minute-select-${idSuf}" class="mos-select" aria-label="分"></select>
                            <span class="mos-popup__time-sep">:</span>
                            <span class="mos-popup__time-fixed">30</span>
                            <button type="button" id="add-time-btn-${idSuf}" class="mos-btn mos-btn--secondary mos-btn--sm">添加</button>
                        </div>
                    </div>
                    <div id="time-list-${idSuf}" class="mos-popup__section mos-popup__panel">
                        <h4 class="mos-popup__panel-title">待提交的時間</h4>
                        <ul id="time-list-ul-${idSuf}" class="mos-popup__list"></ul>
                    </div>
                    <div id="stored-times-${idSuf}" class="mos-popup__section mos-popup__panel">
                        <h4 class="mos-popup__panel-title">已儲存的拍照時間</h4>
                        <ul id="stored-times-ul-${idSuf}" class="mos-popup__list"></ul>
                    </div>
                    <div class="mos-popup__field">
                        <label class="mos-popup__label">重置時間</label>
                        <div class="mos-popup__inline-inputs">
                            <select id="reset-hour-select-${idSuf}" class="mos-select" aria-label="重置-時"></select>
                            <span class="mos-popup__time-sep">:</span>
                            <select id="reset-minute-select-${idSuf}" class="mos-select" aria-label="重置-分"></select>
                            <span class="mos-popup__time-sep">:</span>
                            <span class="mos-popup__time-fixed">30</span>
                            <button type="button" id="set-reset-time-btn-${idSuf}" class="mos-btn mos-btn--secondary mos-btn--sm">加入重置</button>
                        </div>
                    </div>
                    <div id="reset-time-list-${idSuf}" class="mos-popup__section mos-popup__panel">
                        <h4 class="mos-popup__panel-title">重置時間</h4>
                        <ul id="reset-time-list-ul-${idSuf}" class="mos-popup__list"></ul>
                    </div>
                    <button type="button" id="submit-times-btn-${idSuf}" class="mos-btn mos-btn--primary mos-popup__block-btn">提交拍照時間</button>
                    <button type="button" id="submit-reset-times-btn-${idSuf}" class="mos-btn mos-btn--secondary mos-popup__block-btn">提交重置時間</button>
                    <button type="button" id="device-name-btn-${idSuf}" class="mos-btn mos-btn--ghost mos-popup__block-btn">返回</button>
                </div>
            `;

            marker.bindPopup(originalContent);

            const bindEvents = () => {
                const chartContainer = document.getElementById(`chart-container-${idSuf}`);
                const photoContainer = document.getElementById(`photo-container-${idSuf}`);
                const panelData = document.getElementById(`popup-panel-data-${idSuf}`);
                const panelTrend = document.getElementById(`popup-panel-trend-${idSuf}`);
                const panelPhoto = document.getElementById(`popup-panel-photo-${idSuf}`);
                const tabData = document.getElementById(`popup-tab-data-${idSuf}`);
                const tabTrend = document.getElementById(`popup-tab-trend-${idSuf}`);
                const tabPhoto = document.getElementById(`popup-tab-photo-${idSuf}`);
                const deviceNameButton = document.getElementById(`device-name-btn-${idSuf}`);
                const addTimeButton = document.getElementById(`add-time-btn-${idSuf}`);
                const submitTimesButton = document.getElementById(`submit-times-btn-${idSuf}`);
                const timeListUl = document.getElementById(`time-list-ul-${idSuf}`);
                const storedTimesUl = document.getElementById(`stored-times-ul-${idSuf}`);
                const hourSelect = document.getElementById(`hour-select-${idSuf}`);
                const minuteSelect = document.getElementById(`minute-select-${idSuf}`);
                const secondSelect = document.getElementById(`second-select-${idSuf}`);
                const takePhotoButton = document.getElementById(`take-photo-btn-${idSuf}`);
                const resetButton = document.getElementById(`reset-btn-${idSuf}`);
                const resetHourSelect = document.getElementById(`reset-hour-select-${idSuf}`);
                const resetMinuteSelect = document.getElementById(`reset-minute-select-${idSuf}`);
                const resetSecondSelect = document.getElementById(`second-select-${idSuf}`);
                const setResetTimeButton = document.getElementById(`set-reset-time-btn-${idSuf}`);
                const resetTimeListUl = document.getElementById(`reset-time-list-ul-${idSuf}`);
                const submitResetTimesButton = document.getElementById(`submit-reset-times-btn-${idSuf}`);

                let scheduledTimes = [];
                let storedTimes = [];
                let resetTimes = [];

                // 初始化時間選擇器選項
                if (hourSelect && minuteSelect) {
                    if (hourSelect.options.length === 0) {
                        for (let h = 0; h <= 23; h++) {
                            const option = document.createElement('option');
                            option.value = h.toString().padStart(2, '0');
                            option.text = h.toString().padStart(2, '0');
                            hourSelect.appendChild(option);
                        }
                    }
                    if (minuteSelect.options.length === 0) {
                        for (let m = 0; m <= 59; m++) {
                            const option = document.createElement('option');
                            option.value = m.toString().padStart(2, '0');
                            option.text = m.toString().padStart(2, '0');
                            minuteSelect.appendChild(option);
                        }
                    }
                }

                // 初始化重置時間選擇器選項
                if (resetHourSelect && resetMinuteSelect) {
                    if (resetHourSelect.options.length === 0) {
                        for (let h = 0; h <= 23; h++) {
                            const option = document.createElement('option');
                            option.value = h.toString().padStart(2, '0');
                            option.text = h.toString().padStart(2, '0');
                            resetHourSelect.appendChild(option);
                        }
                    }
                    if (resetMinuteSelect.options.length === 0) {
                        for (let m = 0; m <= 59; m++) {
                            const option = document.createElement('option');
                            option.value = m.toString().padStart(2, '0');
                            option.text = m.toString().padStart(2, '0');
                            resetMinuteSelect.appendChild(option);
                        }
                    }
                }

                // 載入並顯示資料庫中的拍照時間
                const loadStoredTimes = () => {
                    fetch(`/api/device-times?device_id=${encodeURIComponent(item.device_id)}&type=select`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`HTTP error! Status: ${response.status}`);
                            }
                            return response.json();
                        })
                        .then(data => {
                            if (!data || !data.hasOwnProperty('times')) {
                                storedTimesUl.innerHTML = '<li>無已儲存的時間或無法載入</li>';
                                return;
                            }
                            if (data.times && Array.isArray(data.times) && data.times.length > 0) {
                                storedTimes = data.times.filter(time => time && typeof time === 'string' && time.length >= 6);
                                storedTimesUl.innerHTML = '';
                                if (storedTimes.length > 0) {
                                    storedTimes.forEach(time => {
                                        const formattedTime = `${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`;
                                        const li = document.createElement('li');
                                        li.innerHTML = `${formattedTime} <button type="button" class="mos-btn mos-btn--xs mos-btn--danger-outline delete-time-btn" data-time="${time}">刪除</button>`;
                                        storedTimesUl.appendChild(li);
                                    });

                                    const deleteButtons = storedTimesUl.getElementsByClassName('delete-time-btn');
                                    Array.from(deleteButtons).forEach(button => {
                                        button.addEventListener('click', function () {
                                            const timeToDelete = this.getAttribute('data-time');
                                            fetch('/api/delete-time', {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify({
                                                    device_id: item.device_id,
                                                    select_time: timeToDelete,
                                                    type: 'select'
                                                })
                                            })
                                            .then(response => response.json())
                                            .then(data => {
                                                if (data.success) {
                                                    alert('時間已成功刪除！');
                                                    this.parentElement.remove();
                                                    storedTimes = storedTimes.filter(t => t !== timeToDelete);
                                                } else {
                                                    alert('刪除失敗：' + data.error);
                                                }
                                            })
                                            .catch(error => {
                                                console.error('Error deleting time:', error);
                                                alert('刪除過程中發生錯誤');
                                            });
                                        });
                                    });
                                } else {
                                    storedTimesUl.innerHTML = '<li>無有效已儲存的時間</li>';
                                }
                            } else {
                                storedTimesUl.innerHTML = '<li>無已儲存的時間</li>';
                            }
                        })
                        .catch(error => {
                            console.error('Error loading times:', error);
                            storedTimesUl.innerHTML = `<li>無法載入時間 (錯誤: ${error.message})</li>`;
                        });
                };

                // 載入並顯示資料庫中的重置時間
                const loadResetTimes = () => {
                    fetch(`/api/device-times?device_id=${encodeURIComponent(item.device_id)}&type=reset`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`HTTP error! Status: ${response.status}`);
                            }
                            return response.json();
                        })
                        .then(data => {
                            if (!data || !data.hasOwnProperty('times')) {
                                resetTimeListUl.innerHTML = '<li>無已儲存的重置時間或無法載入</li>';
                                return;
                            }
                            if (data.times && Array.isArray(data.times) && data.times.length > 0) {
                                resetTimes = data.times.filter(time => time && typeof time === 'string' && time.length >= 6);
                                resetTimeListUl.innerHTML = '';
                                if (resetTimes.length > 0) {
                                    resetTimes.forEach(time => {
                                        const formattedTime = `${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`;
                                        const li = document.createElement('li');
                                        li.innerHTML = `${formattedTime} <button type="button" class="mos-btn mos-btn--xs mos-btn--danger-outline delete-reset-time-btn" data-time="${time}">刪除</button>`;
                                        resetTimeListUl.appendChild(li);
                                    });

                                    const deleteButtons = resetTimeListUl.getElementsByClassName('delete-reset-time-btn');
                                    Array.from(deleteButtons).forEach(button => {
                                        button.addEventListener('click', function () {
                                            const timeToDelete = this.getAttribute('data-time');
                                            fetch('/api/delete-time', {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify({
                                                    device_id: item.device_id,
                                                    select_time: timeToDelete,
                                                    type: 'reset'
                                                })
                                            })
                                            .then(response => response.json())
                                            .then(data => {
                                                if (data.success) {
                                                    alert('重置時間已成功刪除！');
                                                    this.parentElement.remove();
                                                    resetTimes = resetTimes.filter(t => t !== timeToDelete);
                                                } else {
                                                    alert('刪除失敗：' + data.error);
                                                }
                                            })
                                            .catch(error => {
                                                console.error('Error deleting reset time:', error);
                                                alert('刪除過程中發生錯誤');
                                            });
                                        });
                                    });
                                } else {
                                    resetTimeListUl.innerHTML = '<li>無有效已儲存的重置時間</li>';
                                }
                            } else {
                                resetTimeListUl.innerHTML = '<li>無已儲存的重置時間</li>';
                            }
                        })
                        .catch(error => {
                            console.error('Error loading reset times:', error);
                            resetTimeListUl.innerHTML = `<li>無法載入重置時間 (錯誤: ${error.message})</li>`;
                        });
                };

                if (storedTimesUl) {
                    loadStoredTimes();
                }
                if (resetTimeListUl) {
                    loadResetTimes();
                }

                let chartRequestStarted = false;

                function resizePlotlyInChart() {
                    if (typeof Plotly === 'undefined' || !chartContainer) {
                        return;
                    }
                    const gd = chartContainer.querySelector('.plotly-graph-div');
                    if (gd) {
                        try {
                            Plotly.Plots.resize(gd);
                        } catch (e) {
                            /* ignore */
                        }
                    }
                }

                function ensureChartLoaded() {
                    if (!chartContainer) {
                        return;
                    }
                    if (chartRequestStarted) {
                        requestAnimationFrame(() => requestAnimationFrame(resizePlotlyInChart));
                        return;
                    }
                    chartRequestStarted = true;
                    chartContainer.innerHTML = '<span class="mos-popup__skeleton">載入圖表中…</span>';
                    fetch(
                        `/api/chart-for-id?id=${encodeURIComponent(item.device_id)}&start_time=${formattedStartTime || '20250601000000'}&end_time=${formattedEndTime || '20250606230700'}`
                    )
                        .then((response) => {
                            if (!response.ok) {
                                throw new Error(`HTTP error! Status: ${response.status}`);
                            }
                            return response.json();
                        })
                        .then((data) => {
                            if (data.error) {
                                console.error('Chart API error:', data.error);
                                chartContainer.innerHTML = `<p class="mos-popup__error">無法載入圖表：${data.error}</p>`;
                            } else if (data.chart_html) {
                                chartContainer.innerHTML = data.chart_html;
                                chartContainer.querySelectorAll('script').forEach((oldScript) => {
                                    const newScript = document.createElement('script');
                                    newScript.textContent = oldScript.textContent;
                                    document.body.appendChild(newScript);
                                    newScript.remove();
                                });
                                // ---- Vector Watch theming: tint Plotly chart after server inject ----
                                applyVectorWatchPlotlyTheme(chartContainer);
                            } else {
                                chartContainer.innerHTML =
                                    '<p class="mos-popup__chart-msg">此時間範圍沒有新增蚊子。</p>';
                            }
                        })
                        .catch((error) => {
                            console.error('Error loading chart:', error);
                            chartContainer.innerHTML =
                                '<p class="mos-popup__chart-msg">此時間範圍沒有新增蚊子。</p>';
                        })
                        .finally(() => {
                            requestAnimationFrame(() => requestAnimationFrame(resizePlotlyInChart));
                        });
                }

                function wirePhotoListInteractions(startTime, endTime) {
                    if (!photoContainer) {
                        return;
                    }
                    photoContainer.querySelectorAll('img').forEach((img) => {
                        loadImage(img, img.getAttribute('data-primary-url'));
                        img.onerror = () => {
                            if (img.dataset.fallbackTried) {
                                img.style.display = 'none';
                                const errorMessage = document.createElement('p');
                                errorMessage.className = 'mos-popup__error';
                                errorMessage.textContent = '無法載入照片';
                                img.parentNode.appendChild(errorMessage);
                            }
                        };
                    });
                    photoContainer.querySelectorAll('.re-test-btn').forEach((btn) => {
                        btn.addEventListener('click', function (e) {
                            e.stopPropagation();
                            const pid = this.getAttribute('data-photo-id');
                            if (!pid) return;
                            this.disabled = true;
                            this.textContent = '處理中...';
                            fetch('/api/re-test', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ photo_id: pid })
                            })
                                .then((res) => res.json())
                                .then((data) => {
                                    if (data.success) {
                                        markPhotoRetested(pid);
                                        alert(
                                            data.message ||
                                                '重新測試已加入佇列，請稍後點「重新整理」或重整頁面查看結果。'
                                        );
                                        this.disabled = false;
                                        this.textContent = '重新測試';
                                        const refreshBtn = photoContainer.querySelector('.photo-list-refresh-btn');
                                        if (refreshBtn) refreshBtn.focus();
                                    } else {
                                        alert('重新測試失敗：' + (data.error || '未知錯誤'));
                                        this.disabled = false;
                                        this.textContent = '重新測試';
                                    }
                                })
                                .catch((err) => {
                                    console.error('Re-test error:', err);
                                    alert('重新測試請求失敗，請稍後再試。');
                                    this.disabled = false;
                                    this.textContent = '重新測試';
                                });
                        });
                    });
                    photoContainer.querySelectorAll('.label-toggle-btn').forEach((btn) => {
                        btn.addEventListener('click', function (e) {
                            e.stopPropagation();
                            const pid = this.getAttribute('data-photo-id');
                            if (!pid) return;
                            this.disabled = true;
                            fetch('/api/photo-label-toggle', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ photo_id: pid })
                            })
                                .then((res) => res.json())
                                .then((data) => {
                                    if (data.success) {
                                        const newVal = data.needs_label ? 1 : 0;
                                        this.setAttribute('data-needs-label', newVal);
                                        this.textContent = newVal ? '已標記' : '待標記';
                                        this.classList.remove('mos-btn--label-done', 'mos-btn--label-todo');
                                        this.classList.add(newVal ? 'mos-btn--label-done' : 'mos-btn--label-todo');
                                    } else {
                                        alert('切換失敗：' + (data.error || '未知錯誤'));
                                    }
                                    this.disabled = false;
                                })
                                .catch(() => {
                                    this.disabled = false;
                                    alert('請求失敗');
                                });
                        });
                    });
                    photoContainer.querySelectorAll('.photo-list-refresh-btn').forEach((refreshBtn) => {
                        refreshBtn.addEventListener('click', function () {
                            const btn = this;
                            btn.textContent = '載入中...';
                            btn.disabled = true;
                            fetch(
                                `/api/device-photos?id=${encodeURIComponent(item.device_id)}&start_time=${startTime}&end_time=${endTime}`
                            )
                                .then((res) => res.json())
                                .then((photoData) => {
                                    if (photoData && photoData.photos && photoData.photos.length > 0) {
                                        photoData.photos.sort((a, b) => b.time.localeCompare(a.time));
                                        let newContent = `<div class="mos-photo-list"><div class="mos-photo-list__toolbar"><h4 class="mos-photo-list__title">歷史照片</h4><button type="button" class="mos-btn mos-btn--sm mos-btn--ghost photo-list-refresh-btn">重新整理</button></div><p class="mos-popup__hint">重新測試完成後可點「重新整理」更新列表。</p><ul class="mos-photo-list__ul">`;
                                        photoData.photos.forEach((photo) => {
                                            newContent += buildPhotoListItemHtml(photo, MOSQUITO_NAME_MAPPING);
                                        });
                                        newContent += '</ul></div>';
                                        photoContainer.innerHTML = newContent;
                                        wirePhotoListInteractions(startTime, endTime);
                                    } else {
                                        photoContainer.innerHTML =
                                            '<p class="mos-popup__empty">此時間範圍內沒有照片。</p>';
                                    }
                                    btn.textContent = '重新整理';
                                    btn.disabled = false;
                                })
                                .catch(() => {
                                    btn.textContent = '重新整理';
                                    btn.disabled = false;
                                });
                        });
                    });
                }

                function loadPhotosIntoPanel() {
                    if (!photoContainer) {
                        return;
                    }
                    const startTime = formattedStartTime || '20250601000000';
                    const endTime = formattedEndTime || '20250606230700';
                    photoContainer.innerHTML = '<span class="mos-popup__skeleton">載入照片中…</span>';
                    fetch(
                        `/api/device-photos?id=${encodeURIComponent(item.device_id)}&start_time=${startTime}&end_time=${endTime}`
                    )
                        .then((response) => response.json())
                        .then((photoData) => {
                            if (photoData && photoData.photos && photoData.photos.length > 0) {
                                photoData.photos.sort((a, b) => b.time.localeCompare(a.time));
                                let photoContent = `<div class="mos-photo-list"><div class="mos-photo-list__toolbar"><h4 class="mos-photo-list__title">歷史照片</h4><button type="button" class="mos-btn mos-btn--sm mos-btn--ghost photo-list-refresh-btn">重新整理</button></div><p class="mos-popup__hint">重新測試完成後可點「重新整理」更新列表。</p><ul class="mos-photo-list__ul">`;
                                photoData.photos.forEach((photo) => {
                                    photoContent += buildPhotoListItemHtml(photo, MOSQUITO_NAME_MAPPING);
                                });
                                photoContent += '</ul></div>';
                                photoContainer.innerHTML = photoContent;
                                wirePhotoListInteractions(startTime, endTime);
                            } else {
                                photoContainer.innerHTML =
                                    '<p class="mos-popup__empty">此時間範圍內沒有照片。</p>';
                            }
                        })
                        .catch((error) => {
                            console.error('Error loading photos:', error);
                            photoContainer.innerHTML =
                                '<p class="mos-popup__error">無法載入照片資料。</p>';
                        });
                }

                function showPopupPage(name) {
                    const pages = [
                        { key: 'data', panel: panelData, tab: tabData },
                        { key: 'trend', panel: panelTrend, tab: tabTrend },
                        { key: 'photo', panel: panelPhoto, tab: tabPhoto }
                    ];
                    pages.forEach(({ key, panel, tab }) => {
                        if (!panel || !tab) return;
                        const on = key === name;
                        panel.classList.toggle('mos-popup__page--active', on);
                        tab.classList.toggle('mos-popup__tab--active', on);
                        tab.setAttribute('aria-selected', on ? 'true' : 'false');
                    });
                    if (name === 'trend') {
                        ensureChartLoaded();
                    } else if (name === 'photo') {
                        loadPhotosIntoPanel();
                    }
                }

                if (tabData) {
                    tabData.onclick = (e) => {
                        e.stopPropagation();
                        showPopupPage('data');
                    };
                }
                if (tabTrend) {
                    tabTrend.onclick = (e) => {
                        e.stopPropagation();
                        showPopupPage('trend');
                    };
                }
                if (tabPhoto) {
                    tabPhoto.onclick = (e) => {
                        e.stopPropagation();
                        showPopupPage('photo');
                    };
                }
                showPopupPage('data');

                // device-name-btn 切換事件
                if (deviceNameButton) {
                    deviceNameButton.addEventListener('click', function (event) {
                        event.stopPropagation();
                        const popup = marker.getPopup();
                        if (popup.getContent() === originalContent) {
                            popup.setContent(settingsContent);
                            setTimeout(() => bindEvents(), 0);
                        } else {
                            popup.setContent(originalContent);
                            setTimeout(() => bindEvents(), 0);
                        }
                    });
                }

                // 拍照按鈕事件
                if (takePhotoButton) {
                    takePhotoButton.addEventListener('click', function (event) {
                        event.stopPropagation();
                        fetch('/api/take-photo', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                device_id: item.device_id
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                alert('已成功觸發拍照！');
                            } else {
                                alert('拍照失敗：' + data.error);
                            }
                        })
                        .catch(error => {
                            console.error('Error triggering photo:', error);
                            alert('拍照過程中發生錯誤');
                        });
                    });
                }

                // 重置按鈕事件
                if (resetButton) {
                    resetButton.addEventListener('click', function (event) {
                        event.stopPropagation();
                        fetch('/api/reset-device', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                device_id: item.device_id
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                alert('已成功重置裝置！');
                            } else {
                                alert('重置失敗：' + data.error);
                            }
                        })
                        .catch(error => {
                            console.error('Error resetting device:', error);
                            alert('重置過程中發生錯誤');
                        });
                    });
                }

                // 添加時間按鈕事件
                if (addTimeButton) {
                    addTimeButton.addEventListener('click', function (event) {
                        event.stopPropagation();
                        const hour = hourSelect.value;
                        const minute = minuteSelect.value;
                        const timeStr = `${hour}${minute}30`; // 固定秒數為 30
                        if (storedTimes.includes(timeStr)) {
                            alert('此時間已在資料庫中存在！');
                        } else if (scheduledTimes.includes(timeStr)) {
                            alert('此時間已在此提交列表中！');
                        } else {
                            scheduledTimes.push(timeStr);
                            const li = document.createElement('li');
                            li.textContent = `${hour}:${minute}:30`;
                            timeListUl.appendChild(li);
                        }
                    });
                }

                // 設定重置時間按鈕事件
                if (setResetTimeButton) {
                    setResetTimeButton.addEventListener('click', function (event) {
                        event.stopPropagation();
                        if (!resetHourSelect || !resetMinuteSelect) {
                            console.error('One or more reset time selectors are null:', { resetHourSelect, resetMinuteSelect });
                            alert('時間選擇器未正確加載，請刷新頁面！');
                            return;
                        }
                        const hour = resetHourSelect.value;
                        const minute = resetMinuteSelect.value;
                        const timeStr = `${hour}${minute}30`; // 固定秒數為 30
                        if (resetTimes.includes(timeStr)) {
                            alert('此重置時間已存在！');
                        } else {
                            resetTimes.push(timeStr);
                            const li = document.createElement('li');
                            li.textContent = `${hour}:${minute}:30`;
                            if (resetTimeListUl) {
                                resetTimeListUl.appendChild(li);
                            } else {
                                console.error('resetTimeListUl is null for device:', item.device_id);
                            }
                        }
                    });
                }

                if (submitTimesButton) {
                    submitTimesButton.addEventListener('click', function (event) {
                        event.stopPropagation();
                        if (scheduledTimes.length > 0) {
                            const uniqueTimes = [...new Set(scheduledTimes)];
                            if (uniqueTimes.length !== scheduledTimes.length) {
                                alert('檢測到重複時間，已自動過濾！');
                                scheduledTimes = uniqueTimes;
                            }

                            fetch('/api/schedule-photo', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    device_id: item.device_id,
                                    times: scheduledTimes
                                })
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    alert('拍照時間已成功提交！');
                                    scheduledTimes = [];
                                    timeListUl.innerHTML = '';
                                    loadStoredTimes();
                                } else {
                                    alert('提交失敗：' + data.error);
                                }
                            })
                            .catch(error => {
                                console.error('Error submitting times:', error);
                                alert('提交過程中發生錯誤');
                            });
                        } else {
                            alert('請先添加至少一個拍照時間');
                        }
                    });
                }

                // 提交重置時間按鈕事件
                if (submitResetTimesButton) {
                    submitResetTimesButton.addEventListener('click', function (event) {
                        event.stopPropagation();
                        if (resetTimes.length > 0) {
                            const uniqueTimes = [...new Set(resetTimes)];
                            if (uniqueTimes.length !== resetTimes.length) {
                                alert('檢測到重複時間，已自動過濾！');
                                resetTimes = uniqueTimes;
                            }

                            fetch('/api/set-reset-times', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    device_id: item.device_id,
                                    reset_times: resetTimes
                                })
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    alert('重置時間已成功提交！');
                                    resetTimes = [];
                                    resetTimeListUl.innerHTML = '';
                                    loadResetTimes();
                                } else {
                                    alert('提交失敗：' + data.error);
                                }
                            })
                            .catch(error => {
                                console.error('Error submitting reset times:', error);
                                alert('提交過程中發生錯誤');
                            });
                        } else {
                            alert('請先添加至少一個重置時間');
                        }
                    });
                }

            };

            marker.on('popupopen', bindEvents);
        }
    });

    syncDeviceJumpSelect(Array.from(deviceJumpByKey.values()));

    if (fitMapToMarkers) {
        const layers = markerLayer.getLayers();
        if (layers.length === 1) {
            const ll = layers[0].getLatLng();
            map.setView(ll, Math.max(map.getZoom(), 12));
        } else if (layers.length > 1) {
            const b = markerLayer.getBounds();
            if (b.isValid()) {
                map.fitBounds(b, { padding: [40, 40], maxZoom: 16 });
            }
        }
    }
}