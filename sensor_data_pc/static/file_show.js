fetch('/data.json')
    .then(response => response.json())
    .then(data => {
        const table = document.getElementById('csv-table');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        // 列の作成
        const headerRow = document.createElement('tr');
        Object.keys(data[0]).forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // 行の作成
        data.forEach(row => {
            const tr = document.createElement('tr');
            Object.values(row).forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    });