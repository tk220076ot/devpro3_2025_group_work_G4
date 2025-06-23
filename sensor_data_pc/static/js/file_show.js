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

fetch('/data.json')
    .then(response => response.json())
    .then(data => {
        console.log("[DEBUG] Fetched data:", data);
        originalData = data;

        const table = document.getElementById('csv-table');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        // ヘッダー作成
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

        setupFilters(tbody);
        renderTableRows(data, tbody);
        updateChart(data);

        // 日付選択イベント追加
        const dateInput = document.getElementById('chartDate');
        dateInput.addEventListener('change', () => {
            const selectedDate = dateInput.value; // yyyy-mm-dd形式

            let filtered = filteredData();
            if (selectedDate) {
                filtered = filtered.filter(row => row.date === selectedDate);
            }

            renderTableRows(filtered, tbody);
            updateChart(filtered);
        });

        // 日付リセットボタン
        const resetDateBtn = document.getElementById('resetDateButton');
        resetDateBtn.addEventListener('click', () => {
            dateInput.value = "";
            const filtered = filteredData();  // 入力フィルターはそのまま活かす
            renderTableRows(filtered, tbody);
            updateChart(filtered);
        });
});

function timeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
        const [h, m, s] = parts;
        return h * 3600 + m * 60 + s;
    } else if (parts.length === 2) {
        const [h, m] = parts;
        return h * 3600 + m * 60;
    }
    return 0;
}

function setupFilters(tbody) {
    const inputs = [
        "tempMin", "tempMax",
        "humidMin", "humidMax",
        "timeMin", "timeMax"
    ];

    inputs.forEach(id => {
        document.getElementById(id).addEventListener("input", () => {
            onFilterChange(tbody);
        });
    });

    const resetBtn = document.getElementById("resetButton");
    resetBtn.addEventListener("click", () => {
        console.log("[DEBUG] Reset button clicked");
        inputs.forEach(id => document.getElementById(id).value = "");
        renderTableRows(originalData, tbody);
        updateChart(originalData);

        // 日付選択もリセットしておく
        const dateInput = document.getElementById('chartDate');
        if (dateInput) {
            dateInput.value = "";
        }
    });
}

function timeStrToDate(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') {
        console.warn(`[WARN] Invalid time string:`, timeStr);
        return null;
    }

    const parts = timeStr.trim().split(":").map(Number);

    if (parts.length < 2 || parts.some(isNaN)) {
        console.warn(`[WARN] Failed to parse time:`, timeStr);
        return null;
    }

    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const s = parts[2] ?? 0;

    if (h > 23 || m > 59 || s > 59) {
        console.warn(`[WARN] Time out of range:`, timeStr);
        return null;
    }

    const now = new Date();
    const result = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s);

    // console.log(`[DEBUG] timeStrToDate("${timeStr}") ->`, result);

    return result;
}

function onFilterChange(tbody) {
    let filtered = filteredData();

    // 日付選択中なら日付でも絞り込む
    const selectedDate = document.getElementById('chartDate').value;
    if (selectedDate) {
        filtered = filtered.filter(row => row.date === selectedDate);
    }

    renderTableRows(filtered, tbody);
    updateChart(filtered);
}


function filteredData() {
    const tempMin = parseFloat(document.getElementById("tempMin").value);
    const tempMax = parseFloat(document.getElementById("tempMax").value);
    const humidMin = parseFloat(document.getElementById("humidMin").value);
    const humidMax = parseFloat(document.getElementById("humidMax").value);
    const timeMin = document.getElementById("timeMin").value;
    const timeMax = document.getElementById("timeMax").value;

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

function renderTableRows(data, tbody) {
    tbody.innerHTML = "";
    data.forEach(row => {
        const tr = document.createElement('tr');
        columnOrder.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = row[cell];
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

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

function updateChart(data) {
    const ctx = document.getElementById('sensorChart')?.getContext('2d');
    if (!ctx) {
        console.error("[ERROR] Canvas element not found");
        return;
    }

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
        } else {
            console.warn(`[WARN] Skipping invalid data:`, d);
        }
    });

    if (sensorChart) {
        sensorChart.destroy();
    }

    sensorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
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
                        displayFormats: {
                            second: 'HH:mm:ss'
                        },
                        tooltipFormat: 'HH:mm:ss'
                    },
                    title: {
                        display: true,
                        text: '時刻'
                    }
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: '値'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}
