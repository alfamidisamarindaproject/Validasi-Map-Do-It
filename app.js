const URL_GSHEET = "https://script.google.com/macros/s/AKfycbz8jdul-sh4ElPZ4i1tHTB15dbvUfENQPnYJaC7p-__p176argqziNmiYx5PDomYUnu/exec";

let localData = [];
let updatesQueue = []; // Antrian data yang akan disubmit

window.onload = fetchData;

async function fetchData() {
    toggleLoader(true);
    updatesQueue = [];
    updateCountDisplay();
    try {
        const response = await fetch(URL_GSHEET);
        localData = await response.json();
        renderTable(localData);
    } catch (err) {
        alert("Gagal ambil data!");
    }
    toggleLoader(false);
}

function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5">Semua data sudah divalidasi (Kosong).</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="small text-muted">${item.timestamp.toString().split('T')[0]}</td>
            <td class="fw-bold">${item.nama}</td>
            <td><span class="badge bg-light text-primary border border-primary">${item.toko}</span></td>
            <td>${item.rak}</td>
            <td>${formatChecklist(item.checklist)}</td>
            <td><button class="btn btn-sm btn-info text-white" onclick="window.open('${item.foto}','_blank')">Foto</button></td>
            <td class="text-center">
                <div class="d-flex justify-content-center gap-3">
                    <div class="text-center">
                        <input type="checkbox" class="cb-ok" name="v-${item.row}" onclick="addToQueue(${item.row}, 'OK', this)">
                        <div class="small fw-bold text-success" style="font-size:0.6rem">OK</div>
                    </div>
                    <div class="text-center">
                        <input type="checkbox" class="cb-nok" name="v-${item.row}" onclick="addToQueue(${item.row}, 'NOK', this)">
                        <div class="small fw-bold text-danger" style="font-size:0.6rem">NOK</div>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function addToQueue(rowId, status, el) {
    // Matikan checkbox pasangannya
    const group = document.getElementsByName(`v-${rowId}`);
    group.forEach(cb => { if(cb !== el) cb.checked = false; });

    // Hapus data lama di antrian untuk baris yang sama (jika ada)
    updatesQueue = updatesQueue.filter(item => item.row !== rowId);

    // Tambahkan ke antrian jika diceklis
    if (el.checked) {
        updatesQueue.push({ row: rowId, status: status });
    }
    
    updateCountDisplay();
}

async function submitValidasi() {
    if (updatesQueue.length === 0) return alert("Pilih minimal satu data untuk divalidasi!");
    
    if (!confirm(`Simpan ${updatesQueue.length} data validasi? Data yang divalidasi akan hilang dari daftar.`)) return;

    toggleLoader(true);
    try {
        await fetch(URL_GSHEET, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(updatesQueue)
        });
        
        // Setelah sukses, ambil data terbaru (data yang sudah divalidasi otomatis hilang dari GSheet)
        setTimeout(fetchData, 1500); 
    } catch (e) {
        alert("Gagal submit!");
        toggleLoader(false);
    }
}

function updateCountDisplay() {
    document.getElementById('countUpdate').innerText = updatesQueue.length;
}

function toggleLoader(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

function formatChecklist(text) {
    const keys = ["Plano", "Label Price", "Display", "Kebersihan"];
    let html = '<div>';
    keys.forEach(k => {
        const ok = new RegExp(`${k}.*(ada|ya|ok|v|lengkap)`, 'i').test(text);
        html += `<div class="checklist-item"><span>${k}</span><span style="color:${ok?'green':'red'}">${ok?'✔':'✖'}</span></div>`;
    });
    return html + '</div>';
}

// Filter logic (Real-time)
document.getElementById('inputNama').oninput = runFilter;
document.getElementById('inputToko').oninput = runFilter;
document.getElementById('inputTanggal').onchange = runFilter;

function runFilter() {
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
