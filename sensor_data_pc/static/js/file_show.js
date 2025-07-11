let sortState = {
    column: null,
    ascending: true
};

let originalData = [];
const columnOrder = ["date", "time", "temp", "humid", "region"];
let sensorChart = null;

const columnLabelMap = {
    date: "日付",
    time: "時刻",
    temp: "温度(℃)",
    humid: "湿度(%)",
    region: "場所"
};

fetch('/data.json')
    .then(response => response.json())
    .then(data => {
        console.log("[DEBUG] Fetched data:", data);
        originalData = data;
        populateTable(data);

        const table = document.getElementById('csv-table');
        const tbody = table.querySelector('tbody');

        setupFilters(tbody);
        renderTableRows(data, tbody);
        updateChart(data);

        const dateInput = document.getElementById('chartDate');
        dateInput.addEventListener('change', () => {
            const selectedDate = dateInput.value;
            let filtered = filteredData();
            if (selectedDate) {
                filtered = filtered.filter(row => row.date === selectedDate);
            }
            renderTableRows(filtered, tbody);
            updateChart(filtered);
        });

        const resetDateBtn = document.getElementById('resetDateButton');
        resetDateBtn.addEventListener('click', () => {
            dateInput.value = "";
            const filtered = filteredData();
            renderTableRows(filtered, tbody);
            updateChart(filtered);
        });

        document.getElementById("toggle-extreme")?.addEventListener("change", function () {
            document.querySelectorAll(".data-row").forEach(row => {
                if (row.classList.contains("highlight_Danger")) {
                    row.classList.toggle("hidden", this.checked);
                }
            });
            const filtered = filteredData();
            renderTableRows(filtered, tbody);
            updateChart(filtered);
        });

        document.getElementById("location-select")?.addEventListener("change", function () {
            onFilterChange(document.querySelector("#csv-table tbody"));
        });
    });

function timeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
    return 0;
}

function setupFilters(tbody) {
    const inputs = ["tempMin", "tempMax", "humidMin", "humidMax", "timeMin", "timeMax"];
    inputs.forEach(id => document.getElementById(id).addEventListener("input", () => onFilterChange(tbody)));

    document.getElementById("resetButton").addEventListener("click", () => {
        inputs.forEach(id => document.getElementById(id).value = "");
        renderTableRows(originalData, tbody);
        updateChart(originalData);
        document.getElementById('chartDate').value = "";
    });
}

function timeStrToDate(timeStr) {
    const parts = timeStr.trim().split(":").map(Number);
    if (parts.length < 2 || parts.some(isNaN)) return null;
    const [h, m, s = 0] = parts;
    if (h > 23 || m > 59 || s > 59) return null;
    return new Date(new Date().setHours(h, m, s, 0));
}

function onFilterChange(tbody) {
    let filtered = filteredData();
    const selectedDate = document.getElementById('chartDate').value;
    if (selectedDate) filtered = filtered.filter(row => row.date === selectedDate);
    const selectedLocation = document.getElementById("location-select").value;
    if (selectedLocation !== "all") filtered = filtered.filter(row => row.Location === selectedLocation);
    renderTableRows(filtered, tbody);
    updateChart(filtered);
}

function filteredData() {
    const hideExtreme = document.getElementById("toggle-extreme")?.checked;
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

        if (hideExtreme && (temp < 0 || temp > 35 || humid < 20 || humid > 80)) return false;

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
        const tr = document.createElement("tr");
        tr.classList.add("data-row");
        tr.dataset.location = row.location;
        const temp = parseFloat(row.temp);
        const humid = parseFloat(row.humid);
        if (temp < 0 || temp > 35 || humid < 20 || humid > 80) tr.classList.add("highlight_Danger");
        [row.date, row.time, row.temp, row.humid, row.location].forEach(cell => {
            const td = document.createElement("td");
            td.textContent = cell;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

function updateChart(data) {
    const ctx = document.getElementById('sensorChart')?.getContext('2d');
    if (!ctx) return;

    const sortedData = [...data].sort((a, b) => {
        const aTime = new Date(`${a.date}T${a.time}`);
        const bTime = new Date(`${b.date}T${b.time}`);
        return aTime - bTime;
    });

    const labels = [], tempData = [], humidData = [];
    sortedData.forEach(d => {
        const time = new Date(`${d.date}T${d.time}`);
        const temp = parseFloat(d.temp);
        const humid = parseFloat(d.humid);
        if (!isNaN(temp) && !isNaN(humid)) {
            labels.push(time);
            tempData.push(temp);
            humidData.push(humid);
        }
    });

    if (sensorChart) sensorChart.destroy();
    sensorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: '温度 (℃)', data: tempData, borderColor: 'rgba(255, 99, 132, 1)', backgroundColor: 'rgba(255, 99, 132, 0.2)', fill: false, tension: 0.1 },
                { label: '湿度 (%)', data: humidData, borderColor: 'rgba(54, 162, 235, 1)', backgroundColor: 'rgba(54, 162, 235, 0.2)', fill: false, tension: 0.1 }
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


function populateTable(data) {
    const tbody = document.querySelector("#csv-table tbody");
    const thead = document.querySelector("#csv-table thead");
    tbody.innerHTML = "";
    thead.innerHTML = "";

    const header = ["日付", "時刻", "温度", "湿度", "場所"];
    const tr = document.createElement("tr");
    header.forEach((h, index) => {
        const th = document.createElement("th");
        th.textContent = h;
        th.style.cursor = "pointer";
        th.addEventListener("click", () => sortTableByColumn(filteredData(), index, tbody));
        tr.appendChild(th);
    });
    thead.appendChild(tr);
}

function sortTableByColumn(data, columnIndex, tbody) {
    const key = columnOrder[columnIndex];
    if (sortState.column === columnIndex) sortState.ascending = !sortState.ascending;
    else { sortState.column = columnIndex; sortState.ascending = true; }

    data.sort((a, b) => {
        let valA = a[key], valB = b[key];
        const timePattern = /^\d{1,2}:\d{2}:\d{2}$/;
        if (timePattern.test(valA) && timePattern.test(valB)) {
            valA = timeToSeconds(valA);
            valB = timeToSeconds(valB);
        } else {
            const numA = parseFloat(valA), numB = parseFloat(valB);
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
