let sortState = {
    column: null,
    ascending: true
};

let originalData = [];
let currentFilteredData = [];
let sensorChart = null;

const columnOrder = ["date", "time", "temp", "humid", "location"];
const columnLabelMap = {
    date: "日付",
    time: "時刻",
    temp: "温度(℃)",
    humid: "湿度(%)",
    location: "場所"
};

window.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
    const response = await fetch('/data.json');
    const data = await response.json();
    originalData = data;

    const tbody = document.getElementById('csv-table').querySelector('tbody');
    populateTable(data);
    setupFilters(tbody);
    setupEventListeners(tbody);

    const uniqueDates = [...new Set(data.map(d => d.date))].sort();
    const today = new Date().toISOString().split("T")[0];
    const defaultDate = uniqueDates.includes(today) ? today : uniqueDates[0];
    document.getElementById("chartDate").value = defaultDate;

    updateFilteredData();
    renderTableRows(currentFilteredData, tbody);
    updateChart(currentFilteredData);
}

function setupEventListeners(tbody) {
    document.getElementById("chartDate")?.addEventListener("change", () => {
        updateFilteredData();
        renderTableRows(currentFilteredData, tbody);
        updateChart(currentFilteredData);
    });

    document.getElementById("resetDateButton")?.addEventListener("click", () => {
        const uniqueDates = [...new Set(originalData.map(d => d.date))].sort();
        const today = new Date().toISOString().split("T")[0];
        const defaultDate = uniqueDates.includes(today) ? today : uniqueDates[0];
        document.getElementById("chartDate").value = defaultDate;

        updateFilteredData();
        renderTableRows(currentFilteredData, tbody);
        updateChart(currentFilteredData);
    });

    document.getElementById("toggle-extreme")?.addEventListener("change", () => {
        updateFilteredData();
        renderTableRows(currentFilteredData, tbody);
        updateChart(currentFilteredData);
    });

    document.getElementById("location-select")?.addEventListener("change", () => {
        updateFilteredData();
        renderTableRows(currentFilteredData, tbody);
        updateChart(currentFilteredData);
    });
}

function setupFilters(tbody) {
    const inputs = ["tempMin", "tempMax", "humidMin", "humidMax", "timeMin", "timeMax"];
    inputs.forEach(id => document.getElementById(id).addEventListener("input", () => {
        updateFilteredData();
        renderTableRows(currentFilteredData, tbody);
        updateChart(currentFilteredData);
    }));

    document.getElementById("resetButton").addEventListener("click", () => {
        inputs.forEach(id => document.getElementById(id).value = "");
        document.getElementById("filterDate").value = "";
        updateFilteredData();
        renderTableRows(currentFilteredData, tbody);
        updateChart(currentFilteredData);
    });

    document.getElementById("filterDate")?.addEventListener("input", () => {
        updateFilteredData();
        renderTableRows(currentFilteredData, tbody);
        updateChart(currentFilteredData);
    });
}

function updateFilteredData() {
    const hideExtreme = document.getElementById("toggle-extreme")?.checked;
    const tempMin = parseFloat(document.getElementById("tempMin").value);
    const tempMax = parseFloat(document.getElementById("tempMax").value);
    const humidMin = parseFloat(document.getElementById("humidMin").value);
    const humidMax = parseFloat(document.getElementById("humidMax").value);
    const timeMin = document.getElementById("timeMin").value;
    const timeMax = document.getElementById("timeMax").value;
    const chartDate = document.getElementById("chartDate").value;
    const selectedLocation = document.getElementById("location-select").value;

    const minSec = timeMin ? timeToSeconds(timeMin) : null;
    const maxSec = timeMax ? timeToSeconds(timeMax) : null;

    currentFilteredData = originalData.filter(row => {
        const temp = parseFloat(row.temp);
        const humid = parseFloat(row.humid);
        const time = timeToSeconds(row.time);

        if (hideExtreme && (temp < 0 || temp > 35 || humid < 20 || humid > 80)) return false;
        if (!isNaN(tempMin) && temp < tempMin) return false;
        if (!isNaN(tempMax) && temp > tempMax) return false;
        if (!isNaN(humidMin) && humid < humidMin) return false;
        if (!isNaN(humidMax) && humid > humidMax) return false;
        if (chartDate && row.date !== chartDate) return false;
        if (selectedLocation !== "all" && row.location !== selectedLocation) return false;
        if (minSec !== null && time < minSec) return false;
        if (maxSec !== null && time > maxSec) return false;

        return true;
    });
}

function timeToSeconds(timeStr) {
    const parts = timeStr.split(":").map(Number);
    return parts.length === 3 ? parts[0]*3600 + parts[1]*60 + parts[2] : parts[0]*3600 + parts[1]*60;
}

function populateTable(data) {
    const thead = document.querySelector("#csv-table thead");
    thead.innerHTML = "";
    const tr = document.createElement("tr");
    ["日付", "時刻", "温度", "湿度", "場所"].forEach((h, index) => {
        const th = document.createElement("th");
        th.textContent = h;
        th.style.cursor = "pointer";
        th.addEventListener("click", () => sortTableByColumn(index));
        tr.appendChild(th);
    });
    thead.appendChild(tr);
}

function sortTableByColumn(columnIndex) {
    const key = columnOrder[columnIndex];
    sortState.ascending = sortState.column === columnIndex ? !sortState.ascending : true;
    sortState.column = columnIndex;

    currentFilteredData.sort((a, b) => {
        let valA = a[key], valB = b[key];

        if (key === "time") {
            valA = new Date(`${a.date}T${a.time}`);
            valB = new Date(`${b.date}T${b.time}`);
        } else if (key === "date") {
            valA = new Date(a.date);
            valB = new Date(b.date);
        } else {
            const numA = parseFloat(valA), numB = parseFloat(valB);
            if (!isNaN(numA) && !isNaN(numB)) {
                valA = numA; valB = numB;
            }
        }

        return valA < valB ? (sortState.ascending ? -1 : 1) : valA > valB ? (sortState.ascending ? 1 : -1) : 0;
    });

    const tbody = document.getElementById("csv-table").querySelector("tbody");
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
    const labels = [], tempData = [], humidData = [];
    sorted.forEach(d => {
        labels.push(new Date(`${d.date}T${d.time}`));
        tempData.push(parseFloat(d.temp));
        humidData.push(parseFloat(d.humid));
    });

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
                x: { type: 'time', time: { unit: 'minute', displayFormats: { minute: 'HH:mm' }, tooltipFormat: 'HH:mm:ss' }, title: { display: true, text: '時刻' } },
                y: { beginAtZero: false, title: { display: true, text: '値' } }
            },
            plugins: { legend: { display: true } }
        }
    });
}

function updateStatistics(data) {
    const temps = data.map(d => parseFloat(d.temp)).filter(t => !isNaN(t));
    const humids = data.map(d => parseFloat(d.humid)).filter(h => !isNaN(h));

    const stat = (arr) => {
        if (arr.length === 0) return ["-", "-", "-", "-"];
        const max = Math.max(...arr).toFixed(1);
        const median = arr.sort((a, b) => a - b)[Math.floor(arr.length / 2)].toFixed(1);
        const mean = (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
        const modeMap = {};
        arr.forEach(v => modeMap[v] = (modeMap[v] || 0) + 1);
        const maxFreq = Math.max(...Object.values(modeMap));
        const modes = Object.entries(modeMap).filter(([k, v]) => v === maxFreq).map(([k]) => k);
        const mode = modes.length === 1 ? modes[0] : `${modes[0]} 他`;  // ← ここを変更

        return [max, median, mean, mode];
    };

    const [tMax, tMed, tMean, tMode] = stat(temps);
    const [hMax, hMed, hMean, hMode] = stat(humids);

    document.getElementById("stat-temp-max").textContent = tMax;
    document.getElementById("stat-temp-median").textContent = tMed;
    document.getElementById("stat-temp-mean").textContent = tMean;
    document.getElementById("stat-temp-mode").textContent = tMode;

    document.getElementById("stat-humid-max").textContent = hMax;
    document.getElementById("stat-humid-median").textContent = hMed;
    document.getElementById("stat-humid-mean").textContent = hMean;
    document.getElementById("stat-humid-mode").textContent = hMode;
}
