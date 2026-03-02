const URL_GSHEET = "https://script.google.com/macros/s/AKfycbz8jdul-sh4ElPZ4i1tHTB15dbvUfENQPnYJaC7p-__p176argqziNmiYx5PDomYUnu/exec";

let localData = [];

// Load data otomatis saat halaman dibuka
window.onload = fetchData;

async function fetchData() {
    const tableBody = document.getElementById('tableBody');
    const loader = document.getElementById('loading-state');
    
    tableBody.innerHTML = '';
    loader.style.display = 'block';

    try {
        const response = await fetch(URL_GSHEET);
        localData = await response.json();
        renderTable(localData);
    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Gagal memuat data. Periksa URL Apps Script Anda.</td></tr>`;
    } finally {
        loader.style.display = 'none';
    }
}

function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-5">Data tidak ditemukan.</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        const isOK = item.validasi === "OK" ? "checked" : "";
        const isNOK = item.validasi === "NOK" ? "checked" : "";

        row.innerHTML = `
            <td class="small text-muted">${item.timestamp.toString().split('T')[0]}</td>
            <td class="fw-bold">${item.nama}</td>
            <td><span class="badge bg-light text-primary border border-primary">${item.toko}</span></td>
            <td>${item.rak}</td>
            <td>${formatChecklist(item.checklist)}</td>
            <td><button class="btn btn-sm btn-outline-info" onclick="window.open('${item.foto}', '_blank')">Lihat Foto</button></td>
            <td class="text-center">
                <div class="d-flex justify-content-center gap-3">
                    <div class="text-center">
                        <input type="checkbox" class="status-ok" name="v-${item.row}" ${isOK} onclick="updateValidasi(${item.row}, 'OK', this)">
                        <div class="small fw-bold text-success" style="font-size:0.6rem">OK</div>
                    </div>
                    <div class="text-center">
                        <input type="checkbox" class="status-nok" name="v-${item.row}" ${isNOK} onclick="updateValidasi(${item.row}, 'NOK', this)">
                        <div class="small fw-bold text-danger" style="font-size:0.6rem">NOK</div>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function formatChecklist(text) {
    const keys = ["Plano", "Label Price", "Display", "Kebersihan"];
    let html = '<div class="checklist-box">';
    keys.forEach(k => {
        const ok = new RegExp(`${k}.*(ada|ya|ok|v|lengkap)`, 'i').test(text);
        html += `<div class="checklist-item"><span>${k}</span><span style="color:${ok?'green':'red'}">${ok?'✔':'✖'}</span></div>`;
    });
    return html + '</div>';
}

async function updateValidasi(row, status, el) {
    // Matikan checkbox lainnya di baris yang sama
    const group = document.getElementsByName(`v-${row}`);
    group.forEach(cb => { if(cb !== el) cb.checked = false; });

    const finalValue = el.checked ? status : "";

    try {
        await fetch(URL_GSHEET, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ row: row, status: finalValue })
        });
        console.log("Update sent for row " + row);
    } catch (e) {
        alert("Gagal mengupdate status ke GSheet");
    }
}

// Filter Pencarian
document.getElementById('inputNama').oninput = applyFilters;
document.getElementById('inputToko').oninput = applyFilters;
document.getElementById('inputTanggal').onchange = applyFilters;

function applyFilters() {
    const n = document.getElementById('inputNama').value.toLowerCase();
    const t = document.getElementById('inputToko').value.toLowerCase();
    const d = document.getElementById('inputTanggal').value;

    const filtered = localData.filter(i => {
        return i.nama.toLowerCase().includes(n) && 
               i.toko.toLowerCase().includes(t) && 
               (d === "" || i.timestamp.toString().startsWith(d));
    });
    renderTable(filtered);
}
