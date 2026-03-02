// GANTI DENGAN URL WEB APP ANDA
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlJNuEDbHjf9QV-WBtAafjmgrK8lnffRDOvtabU_ZkCPrtdyWjcvlWK9Jaj0_HiCU/exec";

let allData = [];

document.addEventListener('DOMContentLoaded', loadData);
document.getElementById('filter-nama').addEventListener('input', applyFilters);
document.getElementById('filter-toko').addEventListener('input', applyFilters);
document.getElementById('filter-tanggal').addEventListener('change', applyFilters);

async function loadData() {
    toggleLoading(true);
    try {
        const response = await fetch(SCRIPT_URL);
        allData = await response.json();
        displayData(allData);
    } catch (e) {
        alert("Gagal memuat data!");
    }
    toggleLoading(false);
}

function displayData(data) {
    const tableBody = document.getElementById('data-table-body');
    tableBody.innerHTML = '';

    data.forEach(item => {
        const row = document.createElement('tr');
        const isOK = item.validasi === "OK" ? "checked" : "";
        const isNOK = item.validasi === "NOK" ? "checked" : "";

        row.innerHTML = `
            <td class="small text-muted">${item.timestamp.toString().split('T')[0]}</td>
            <td><strong>${item.nama}</strong></td>
            <td><span class="badge bg-info text-dark">${item.toko}</span></td>
            <td>${item.rak}</td>
            <td>${generateChecklistUI(item.checklist)}</td>
            <td><button class="btn btn-sm btn-outline-primary" onclick="bukaFoto('${item.foto}')">Lihat</button></td>
            <td>
                <div class="d-flex justify-content-center gap-4">
                    <div class="text-center">
                        <input type="checkbox" class="cb-ok" name="v-${item.row}" ${isOK} onclick="sendUpdate(${item.row}, 'OK', this)">
                        <div class="small text-success fw-bold">OK</div>
                    </div>
                    <div class="text-center">
                        <input type="checkbox" class="cb-nok" name="v-${item.row}" ${isNOK} onclick="sendUpdate(${item.row}, 'NOK', this)">
                        <div class="small text-danger fw-bold">NOK</div>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function applyFilters() {
    const n = document.getElementById('filter-nama').value.toLowerCase();
    const t = document.getElementById('filter-toko').value.toLowerCase();
    const d = document.getElementById('filter-tanggal').value;

    const filtered = allData.filter(i => {
        return i.nama.toLowerCase().includes(n) && 
               i.toko.toLowerCase().includes(t) && 
               (d === "" || i.timestamp.startsWith(d));
    });
    displayData(filtered);
}

async function sendUpdate(rowId, status, el) {
    // Logika eksklusif: jika satu dicentang, matikan yang lain
    const group = document.getElementsByName(`v-${rowId}`);
    group.forEach(cb => { if(cb !== el) cb.checked = false; });

    const finalStatus = el.checked ? status : ""; // Jika uncheck, status kosong

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ row: rowId, status: finalStatus })
        });
        console.log(`Row ${rowId} updated to ${finalStatus}`);
    } catch (e) {
        alert("Gagal mengupdate status ke GSheet!");
    }
}

function generateChecklistUI(text) {
    const cats = ["Plano", "Label Price", "Display", "Kebersihan"];
    let html = '<div class="checklist-box">';
    cats.forEach(c => {
        const ok = new RegExp(`${c}.*(ada|ya|ok|v|lengkap|bersih)`, 'i').test(text);
        html += `<div class="d-flex justify-content-between small">
                    <span class="me-2">${c}</span>
                    <span class="${ok?'check-v':'check-x'}">${ok?'✔':'✖'}</span>
                 </div>`;
    });
    return html + '</div>';
}

function bukaFoto(url) {
    const modal = new bootstrap.Modal(document.getElementById('fotoModal'));
    let dUrl = url;
    if (url.includes('drive.google.com')) {
        const id = url.split('/d/')[1]?.split('/')[0] || url.split('id=')[1]?.split('&')[0];
        dUrl = `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
    }
    document.getElementById('img-modal-target').src = dUrl;
    modal.show();
}

function toggleLoading(show) {
    document.getElementById('loading-screen').style.display = show ? 'flex' : 'none';
}
