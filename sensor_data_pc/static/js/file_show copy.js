let sortState = {
    column: null,
    ascending: true
};

let originalData = [];
const columnOrder = ["date", "time", "temp", "humid"];
let sensorChart = null;

const columnLabelMap = {
    date: "日付",
    time: "時刻",
    temp: "温度(℃)",
    humid: "湿度(%)"
};

// データ取得と初期描画
fetch('/data.json')
    .then(response => response.json())
    .then(data => {
        console.log("[DEBUG] Fetched data:", data);
        originalData = data;

        const table = document.getElementById('csv-table');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        createTableHeader(thead, tbody);
        setupFilters(tbody);
        renderTableRows(originalData, tbody);
        updateChart(originalData);
    })
    .catch(err => {
    console.error("[ERROR] Failed to fetch data:", err);
});

// ヘッダー作成とソートイベント付与
function createTableHeader(thead, tbody) {
    const headerRow = document.createElement('tr');
    columnOrder.forEach((col, index) => {
        const th = document.createElement('th');
        th.textContent = columnLabelMap[col] || col;
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
        sortTableByColumn(filteredData(), index, tbody);
        });
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
}

// フィルター値をまとめて取得
function getFilterValues() {
    return {
        tempMin: parseFloat(document.getElementById("tempMin").value),
        tempMax: parseFloat(document.getElementById("tempMax").value),
        humidMin: parseFloat(document.getElementById("humidMin").value),
        humidMax: parseFloat(document.getElementById("humidMax").value),
        timeMin: document.getElementById("timeMin").value,
        timeMax: document.getElementById("timeMax").value
    };
}

// 秒に変換（HH:MM:SS または HH:MM）
function timeToSeconds(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
        const [h, m, s] = parts;
        return h * 3600 + m * 60 + s;
    }
    if (parts.length === 2) {
        const [h, m] = parts;
        return h * 3600 + m * 60;
    }
    return 0;
}

// 時刻文字列 → Dateオブジェクト (当日の日時)
function timeStrToDate(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;

    const parts = timeStr.trim().split(":").map(Number);
    if (parts.length < 2 || parts.some(isNaN)) return null;

    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const s = parts[2] ?? 0;

    if (h > 23 || m > 59 || s > 59) return null;

    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s);
}

// フィルター条件で絞り込み
function filteredData() {
    const { tempMin, tempMax, humidMin, humidMax, timeMin, timeMax } = getFilterValues();
    const minSec = timeMin ? timeToSeconds(timeMin) : null;
    const maxSec = timeMax ? timeToSeconds(timeMax) : null;

    return originalData.filter(row => {
        const temp = parseFloat(row.temp);
        const humid = parseFloat(row.humid);
        const time = timeToSeconds(row.time);

        if (!isNaN(tempMin) && temp < tempMin) return false;
        if (!isNaN(tempMax) && temp > tempMax) return false;
        if (!isNaN(humidMin) && humid < humidMin) return false;
        if (!isNaN(humidMax) && humid > humidMax) return false;
        if (minSec !== null && time < minSec) return false;
        if (maxSec !== null && time > maxSec) return false;

        return true;
    });
}

// フィルター入力変更時
function onFilterChange(tbody) {
    const filtered = filteredData();
    renderTableRows(filtered, tbody);
    updateChart(filtered);
}

// フィルターのセットアップ（inputイベントとリセットボタン）
function setupFilters(tbody) {
    const inputs = ["tempMin", "tempMax", "humidMin", "humidMax", "timeMin", "timeMax"];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener("input", () => onFilterChange(tbody));
    });

    const resetBtn = document.getElementById("resetButton");
    resetBtn.addEventListener("click", () => {
        inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = "";
        });
        renderTableRows(originalData, tbody);
        updateChart(originalData);
    });
}

// テーブル行を描画（DocumentFragmentでまとめて追加）
// 追加を一度にすることで、描画回数を削減
function renderTableRows(data, tbody) {
    tbody.innerHTML = "";
    const fragment = document.createDocumentFragment();
    data.forEach(row => {
        const tr = document.createElement('tr');
        columnOrder.forEach(cell => {
        const td = document.createElement('td');
        td.textContent = row[cell];
        tr.appendChild(td);
        });
        fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
}

// 列でソート
function sortTableByColumn(data, columnIndex, tbody) {
    const key = columnOrder[columnIndex];

    if (sortState.column === columnIndex) {
        sortState.ascending = !sortState.ascending;
    } else {
        sortState.column = columnIndex;
        sortState.ascending = true;
    }

    data.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        const timePattern = /^\d{1,2}:\d{2}:\d{2}$/;
        if (timePattern.test(valA) && timePattern.test(valB)) {
        valA = timeToSeconds(valA);
        valB = timeToSeconds(valB);
        } else {
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
            valA = numA;
            valB = numB;
        }
        }

        if (valA < valB) return sortState.ascending ? -1 : 1;
        if (valA > valB) return sortState.ascending ? 1 : -1;
        return 0;
    });

    renderTableRows(data, tbody);
}

// チャート用データ整形
function prepareChartData(data) {
    const labels = [];
    const tempData = [];
    const humidData = [];

    data.forEach(d => {
        const time = timeStrToDate(d.time);
        const temp = parseFloat(d.temp);
        const humid = parseFloat(d.humid);

        if (time instanceof Date && !isNaN(temp) && !isNaN(humid)) {
        labels.push(time);
        tempData.push(temp);
        humidData.push(humid);
        }
    });

    return { labels, tempData, humidData };
}

// チャート更新
function updateChart(data) {
    const ctx = document.getElementById('sensorChart')?.getContext('2d');
    if (!ctx) {
        console.error("[ERROR] Canvas element not found");
        return;
    }

    const { labels, tempData, humidData } = prepareChartData(data);

    if (sensorChart) sensorChart.destroy();

    sensorChart = new Chart(ctx, {
        type: 'line',
        data: {
        labels,
        datasets: [
            {
            label: '温度 (℃)',
            data: tempData,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: false,
            tension: 0.1
            },
            {
            label: '湿度 (%)',
            data: humidData,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            fill: false,
            tension: 0.1
            }
        ]
        },
        options: {
        responsive: true,
        scales: {
            x: {
            type: 'time',
            time: {
                unit: 'second',
                displayFormats: { second: 'HH:mm:ss' },
                tooltipFormat: 'HH:mm:ss'
            },
            title: { display: true, text: '時刻' }
            },
            y: {
            beginAtZero: false,
            title: { display: true, text: '値' }
            }
        },
        plugins: { legend: { display: true } }
        }
    });
}
