const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbz8jdul-sh4ElPZ4i1tHTB15dbvUfENQPnYJaC7p-__p176argqziNmiYx5PDomYUnu/exec";

let allDataRaw = [];
let queue = [];

// Langsung jalankan saat halaman dibuka
window.onload = fetchData;

async function fetchData() {
    const tableBody = document.getElementById('tableBody');
    const loader = document.getElementById('loader');
    
    loader.style.display = 'block';
    tableBody.innerHTML = '';
    queue = [];
    updateSubmitBar();

    try {
        const response = await fetch(URL_WEB_APP);
        allDataRaw = await response.json();
        renderTable(allDataRaw);
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-5">Gagal terhubung ke server. Pastikan URL sudah benar.</td></tr>`;
    } finally {
        loader.style.display = 'none';
    }
}

function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-5 fw-bold text-muted">Tidak ada data pending. Semua sudah divalidasi! ✅</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="small text-muted">${item.timestamp}</td>
            <td class="fw-bold">${item.nama}</td>
            <td><span class="badge bg-light text-primary border border-primary">${item.toko}</span></td>
            <td>${item.rak}</td>
            <td>${formatChecklist(item.checklist)}</td>
            <td><a href="${item.foto}" target="_blank" class="btn btn-sm btn-outline-info">Lihat Foto</a></td>
            <td class="text-center">
                <div class="d-flex justify-content-center gap-4">
                    <div class="text-center">
                        <input type="checkbox" class="cb-ok" name="row-${item.row}" onclick="handleQueue(${item.row}, 'OK', this)">
                        <div class="small fw-bold text-success mt-1" style="font-size:0.6rem">OK</div>
                    </div>
                    <div class="text-center">
                        <input type="checkbox" class="cb-nok" name="row-${item.row}" onclick="handleQueue(${item.row}, 'NOK', this)">
                        <div class="small fw-bold text-danger mt-1" style="font-size:0.6rem">NOK</div>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function handleQueue(rowId, status, el) {
    const rowGroup = document.getElementsByName(`row-${rowId}`);
    rowGroup.forEach(cb => { if(cb !== el) cb.checked = false; });

    queue = queue.filter(q => q.row !== rowId);
    if (el.checked) {
        queue.push({ row: rowId, status: status });
    }
    updateSubmitBar();
}

function updateSubmitBar() {
    const bar = document.getElementById('submitBar');
    const count = document.getElementById('countSelected');
    count.innerText = queue.length;
    bar.style.display = queue.length > 0 ? 'block' : 'none';
}

async function kirimData() {
    if (!confirm(`Kirim validasi untuk ${queue.length} data? Data yang disubmit akan hilang dari list.`)) return;
    
    document.getElementById('loader').style.display = 'block';
    
    try {
        await fetch(URL_WEB_APP, {
            method: 'POST',
            mode: 'no-cors', // Menangani redirect Google
            cache: 'no-cache',
            body: JSON.stringify(queue)
        });
        
        // Refresh data setelah submit (dengan delay agar GSheet sempat memproses)
        setTimeout(() => {
            alert("Validasi Berhasil Disimpan!");
            fetchData();
        }, 1000);
    } catch (e) {
        alert("Gagal mengirim data.");
        document.getElementById('loader').style.display = 'none';
    }
}

function formatChecklist(txt) {
    const items = ["Plano", "Label Price", "Display", "Kebersihan"];
    let html = '<div class="checklist-box">';
    items.forEach(k => {
        const ok = new RegExp(`${k}.*(ada|ya|ok|v|lengkap)`, 'i').test(txt);
        html += `<div class="checklist-item"><span>${k}</span><span style="color:${ok?'green':'red'}">${ok?'✔':'✖'}</span></div>`;
    });
    return html + '</div>';
}

// Filter Pencarian
document.getElementById('inputNama').oninput = filter;
document.getElementById('inputToko').oninput = filter;
document.getElementById('inputTanggal').onchange = filter;

function filter() {
    const n = document.getElementById('inputNama').value.toLowerCase();
    const t = document.getElementById('inputToko').value.toLowerCase();
    const d = document.getElementById('inputTanggal').value;
    const f = allDataRaw.filter(i => {
        return i.nama.toLowerCase().includes(n) && 
               i.toko.toLowerCase().includes(t) && 
               (d === "" || i.timestamp.startsWith(d));
    });
    renderTable(f);
}
