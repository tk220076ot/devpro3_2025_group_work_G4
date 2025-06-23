let sortState = {
    column: null,
    ascending: true
};

let originalData = [];

fetch('/data.json')
    .then(response => response.json())
    .then(data => {
        originalData = data;

        const table = document.getElementById('csv-table');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        // ヘッダー作成
        const headerRow = document.createElement('tr');
        Object.keys(data[0]).forEach((col, index) => {
            const th = document.createElement('th');
            th.textContent = col;
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => {
                sortTableByColumn(filteredData(), index, tbody);
            });
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        setupFilters(tbody);
        renderTableRows(data, tbody);
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
            const filtered = filteredData();
            renderTableRows(filtered, tbody);
        });
    });
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
        Object.values(row).forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

function sortTableByColumn(data, columnIndex, tbody) {
    const keys = Object.keys(data[0]);
    const key = keys[columnIndex];

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
