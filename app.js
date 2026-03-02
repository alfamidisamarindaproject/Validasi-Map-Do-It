const URL_GSHEET = "https://script.google.com/macros/s/AKfycbz8jdul-sh4ElPZ4i1tHTB15dbvUfENQPnYJaC7p-__p176argqziNmiYx5PDomYUnu/exec";

let database = [];

// Event listeners untuk filter real-time
document.getElementById('filterNama').addEventListener('input', runFilter);
document.getElementById('filterToko').addEventListener('input', runFilter);
document.getElementById('filterTanggal').addEventListener('change', runFilter);

async function loadData() {
    showLoading(true);
    try {
        const response = await fetch(URL_GSHEET);
        database = await response.json();
        renderTable(database);
    } catch (err) {
        alert("Gagal memuat data dari Google Sheets!");
    } finally {
        showLoading(false);
    }
}

function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Data tidak ditemukan.</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        const isOK = item.validasi === "OK" ? "checked" : "";
        const isNOK = item.validasi === "NOK" ? "checked" : "";

        row.innerHTML = `
            <td class="small text-muted">${item.timestamp.split('T')[0]}</td>
            <td class="fw-bold">${item.nama}</td>
            <td><span class="badge bg-light text-primary border border-primary">${item.toko}</span></td>
            <td>${item.rak}</td>
            <td>${createChecklist(item.checklist)}</td>
            <td><button class="btn-view" onclick="zoomFoto('${item.foto}')">Lihat</button></td>
            <td class="text-center">
                <div class="d-flex justify-content-center gap-4">
                    <div class="text-center">
                        <input type="checkbox" class="status-ok" name="v-${item.row}" ${isOK} onclick="submitValidasi(${item.row}, 'OK', this)">
                        <div class="small fw-bold text-success">OK</div>
                    </div>
                    <div class="text-center">
                        <input type="checkbox" class="status-nok" name="v-${item.row}" ${isNOK} onclick="submitValidasi(${item.row}, 'NOK', this)">
                        <div class="small fw-bold text-danger">NOK</div>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function runFilter() {
    const n = document.getElementById('filterNama').value.toLowerCase();
    const t = document.getElementById('filterToko').value.toLowerCase();
    const d = document.getElementById('filterTanggal').value;

    const filtered = database.filter(i => {
        return i.nama.toLowerCase().includes(n) && 
               i.toko.toLowerCase().includes(t) && 
               (d === "" || i.timestamp.startsWith(d));
    });
    renderTable(filtered);
}

async function submitValidasi(rowNumber, status, el) {
    // Matikan checkbox pasangannya
    const group = document.getElementsByName(`v-${rowNumber}`);
    group.forEach(cb => { if(cb !== el) cb.checked = false; });

    const finalValue = el.checked ? status : ""; // Kosongkan jika uncheck

    try {
        // Mengirim data menggunakan mode no-cors agar tidak terhalang kebijakan redirect Google
        await fetch(URL_GSHEET, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ row: rowNumber, status: finalValue })
        });
        console.log("Update Berhasil");
    } catch (e) {
        alert("Gagal mengirim validasi!");
    }
}

function createChecklist(text) {
    const keys = ["Plano", "Label Price", "Display", "Kebersihan"];
    let ui = '<div style="background: #f9f9f9; padding: 5px; border-radius: 5px;">';
    keys.forEach(k => {
        const ok = new RegExp(`${k}.*(ada|ya|ok|v|lengkap)`, 'i').test(text);
        ui += `<div class="checklist-item">
                <span>${k}</span>
                <span style="color:${ok?'green':'red'}">${ok?'✔':'✖'}</span>
               </div>`;
    });
    return ui + '</div>';
}

function zoomFoto(url) {
    if(!url || !url.includes('http')) return alert("Foto tidak tersedia");
    const modal = new bootstrap.Modal(document.getElementById('fotoModal'));
    let dUrl = url;
    if (url.includes('drive.google.com')) {
        const id = url.split('/d/')[1]?.split('/')[0] || url.split('id=')[1]?.split('&')[0];
        dUrl = `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
    }
    document.getElementById('imgPreview').src = dUrl;
    modal.show();
}

function showLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

// Jalankan load data saat halaman siap
window.onload = loadData;
