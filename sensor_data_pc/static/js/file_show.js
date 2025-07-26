let sortState = { column: null, ascending: true };
let originalData = [];
let currentFilteredData = [];
let sensorChart = null;

const columnOrder = ["date", "time", "temp", "humid", "location"];
const columnLabelMap = {
    date: "日付", time: "時刻", temp: "温度(℃)",
    humid: "湿度(%)", location: "場所"
};

window.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
    const data = await (await fetch('/data.json')).json();
    originalData = data;
    const tbody = document.querySelector('#csv-table tbody');

    populateTableHeader();
    setupEventListeners(tbody);

    const today = new Date().toISOString().split("T")[0];
    const uniqueDates = [...new Set(data.map(d => d.date))].sort();
    const defaultDate = uniqueDates.includes(today) ? today : uniqueDates[0];
    document.getElementById("chartDate").value = defaultDate;

    refreshDisplay(tbody);
}

function setupEventListeners(tbody) {
    const ids = ["chartDate", "resetDateButton", "toggle-extreme", "location-select"];
    ids.forEach(id => document.getElementById(id)?.addEventListener("change", () => refreshDisplay(tbody)));

    document.getElementById("resetDateButton").addEventListener("click", () => {
        const today = new Date().toISOString().split("T")[0];
        const uniqueDates = [...new Set(originalData.map(d => d.date))].sort();
        const defaultDate = uniqueDates.includes(today) ? today : uniqueDates[0];
        document.getElementById("chartDate").value = defaultDate;
        refreshDisplay(tbody);
    });

    ["tempMin", "tempMax", "humidMin", "humidMax", "timeMin", "timeMax"]
        .forEach(id => document.getElementById(id).addEventListener("input", () => refreshDisplay(tbody)));

    document.getElementById("resetButton").addEventListener("click", () => {
        ["tempMin", "tempMax", "humidMin", "humidMax", "timeMin", "timeMax"].forEach(id => document.getElementById(id).value = "");
        refreshDisplay(tbody);
    });
}

function refreshDisplay(tbody) {
    updateFilteredData();
    renderTableRows(currentFilteredData, tbody);
    updateChart(currentFilteredData);
}

function updateFilteredData() {
    const hideExtreme = document.getElementById("toggle-extreme").checked;
    const tempMin = parseFloat(document.getElementById("tempMin").value);
    const tempMax = parseFloat(document.getElementById("tempMax").value);
    const humidMin = parseFloat(document.getElementById("humidMin").value);
    const humidMax = parseFloat(document.getElementById("humidMax").value);
    const timeMin = document.getElementById("timeMin").value;
    const timeMax = document.getElementById("timeMax").value;
    const selectedDate = document.getElementById("chartDate").value;
    const selectedLocation = document.getElementById("location-select").value;

    const minSec = timeMin ? timeToSeconds(timeMin) : null;
    const maxSec = timeMax ? timeToSeconds(timeMax) : null;

    currentFilteredData = originalData.filter(row => {
        const temp = parseFloat(row.temp);
        const humid = parseFloat(row.humid);
        const timeSec = timeToSeconds(row.time);
        return (!hideExtreme || (temp >= 0 && temp <= 35 && humid >= 20 && humid <= 80)) &&
               (!isNaN(tempMin) ? temp >= tempMin : true) &&
               (!isNaN(tempMax) ? temp <= tempMax : true) &&
               (!isNaN(humidMin) ? humid >= humidMin : true) &&
               (!isNaN(humidMax) ? humid <= humidMax : true) &&
               (!selectedDate || row.date === selectedDate) &&
               (selectedLocation === "all" || row.location === selectedLocation) &&
               (minSec === null || timeSec >= minSec) &&
               (maxSec === null || timeSec <= maxSec);
    });
}

function timeToSeconds(timeStr) {
    const [h, m, s = 0] = timeStr.split(":").map(Number);
    return h * 3600 + m * 60 + s;
}

function populateTableHeader() {
    const thead = document.querySelector("#csv-table thead");
    thead.innerHTML = "";
    const tr = document.createElement("tr");
    ["日付", "時刻", "温度", "湿度", "場所"].forEach((h, idx) => {
        const th = document.createElement("th");
        th.textContent = h;
        th.style.cursor = "pointer";
        th.addEventListener("click", () => sortTableByColumn(idx));
        tr.appendChild(th);
    });
    thead.appendChild(tr);
}

function sortTableByColumn(idx) {
    const key = columnOrder[idx];
    sortState.ascending = sortState.column === idx ? !sortState.ascending : true;
    sortState.column = idx;

    currentFilteredData.sort((a, b) => {
        let valA = a[key], valB = b[key];
        if (key === "time") {
            valA = new Date(`${a.date}T${a.time}`);
            valB = new Date(`${b.date}T${b.time}`);
        } else if (key === "date") {
            valA = new Date(a.date);
            valB = new Date(b.date);
        } else {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        }
        return (valA < valB ? -1 : valA > valB ? 1 : 0) * (sortState.ascending ? 1 : -1);
    });

    const tbody = document.querySelector("#csv-table tbody");
    renderTableRows(currentFilteredData, tbody);
    updateChart(currentFilteredData);
}

function renderTableRows(data, tbody) {
    tbody.innerHTML = "";
    data.forEach(row => {
        const tr = document.createElement("tr");
        tr.classList.add("data-row");
        if (row.temp < 0 || row.temp > 35 || row.humid < 20 || row.humid > 80) {
            tr.classList.add("highlight_Danger");
        }
        [row.date, row.time, row.temp, row.humid, row.location].forEach(cell => {
            const td = document.createElement("td");
            td.textContent = cell;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    updateStatistics(data);
}

function updateChart(data) {
    const ctx = document.getElementById('sensorChart')?.getContext('2d');
    if (!ctx) return;

    const sorted = [...data].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    const labels = sorted.map(d => new Date(`${d.date}T${d.time}`));
    const tempData = sorted.map(d => parseFloat(d.temp));
    const humidData = sorted.map(d => parseFloat(d.humid));

    if (sensorChart) sensorChart.destroy();
    sensorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: '温度 (℃)', data: tempData, borderColor: 'rgba(255,99,132,1)', backgroundColor: 'rgba(255,99,132,0.2)', fill: false, tension: 0.1 },
                { label: '湿度 (%)', data: humidData, borderColor: 'rgba(54,162,235,1)', backgroundColor: 'rgba(54,162,235,0.2)', fill: false, tension: 0.1 }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'minute', displayFormats: { minute: 'HH:mm' }, tooltipFormat: 'HH:mm:ss' },
                    title: { display: true, text: '時刻' }
                },
                y: { beginAtZero: false, title: { display: true, text: '値' } }
            },
            plugins: { legend: { display: true } }
        }
    });
}

function updateStatistics(data) {
    const stats = arr => {
        if (!arr.length) return ["-", "-", "-", "-"];
        const sorted = [...arr].sort((a, b) => a - b);
        const mean = (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
        const median = sorted[Math.floor(arr.length / 2)].toFixed(1);
        const max = Math.max(...arr).toFixed(1);
        const modeMap = {};
        arr.forEach(v => modeMap[v] = (modeMap[v] || 0) + 1);
        const maxFreq = Math.max(...Object.values(modeMap));
        const modes = Object.entries(modeMap).filter(([_, v]) => v === maxFreq).map(([k]) => k);
        const mode = modes.length === 1 ? modes[0] : `${modes[0]} 他`;
        return [max, median, mean, mode];
    };

    const temps = data.map(d => parseFloat(d.temp)).filter(v => !isNaN(v));
    const humids = data.map(d => parseFloat(d.humid)).filter(v => !isNaN(v));

    const [tMax, tMed, tMean, tMode] = stats(temps);
    const [hMax, hMed, hMean, hMode] = stats(humids);

    document.getElementById("stat-temp-max").textContent = tMax;
    document.getElementById("stat-temp-median").textContent = tMed;
    document.getElementById("stat-temp-mean").textContent = tMean;
    document.getElementById("stat-temp-mode").textContent = tMode;

    document.getElementById("stat-humid-max").textContent = hMax;
    document.getElementById("stat-humid-median").textContent = hMed;
    document.getElementById("stat-humid-mean").textContent = hMean;
    document.getElementById("stat-humid-mode").textContent = hMode;
}
