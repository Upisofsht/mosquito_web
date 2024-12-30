function getColor(level) {
    const maxLevel = 7; // 層級最大值
    const hue = 240; // 藍色的 HSL 色相
    const saturation = 100; // 飽和度
    const lightness = 20 + (level / maxLevel) * 60; // 光亮度隨 level 增加
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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