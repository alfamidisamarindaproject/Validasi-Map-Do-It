const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbxfbhf3FqnbLdIDdSTxNduCzMdqq5Gw0dfvGJAiKj-b0LUec7Ups_9pJO6rqbBJpJZV/exec";

let allDataRaw = [];
let queue = [];

window.onload = fetchData;

async function fetchData() {
    toggleLoading(true);
    queue = [];
    updateSubmitBar();
    try {
        const response = await fetch(URL_WEB_APP);
        const data = await response.json();
        allDataRaw = Array.isArray(data) ? data : [];
        renderTable(allDataRaw);
    } catch (err) {
        document.getElementById('tableBody').innerHTML = '<tr><td colspan="7" class="text-center text-danger py-5">Gagal terhubung ke GSheet. Pastikan URL sudah benar.</td></tr>';
    } finally {
        toggleLoading(false);
    }
}

function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 fw-bold text-muted">Semua data sudah divalidasi. ✅</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="small text-muted">${item.timestamp}</td>
            <td class="fw-bold text-dark">${item.nama}</td>
            <td><span class="badge bg-light text-primary border border-primary">${item.toko}</span></td>
            <td>${item.rak}</td>
            <td>${parseChecklist(item.checklist)}</td>
            <td><button class="btn btn-sm btn-dark px-3 fw-bold shadow-sm" onclick="bukaPopup('${item.foto}')">Lihat Foto</button></td>
            <td class="text-center">
                <div class="d-flex justify-content-center gap-4">
                    <div class="text-center">
                        <input type="checkbox" class="cb-ok" name="row-${item.row}" onclick="handleQueue(${item.row}, 'OK', this)">
                        <div class="small fw-bold text-success mt-1">OK</div>
                    </div>
                    <div class="text-center">
                        <input type="checkbox" class="cb-nok" name="row-${item.row}" onclick="handleQueue(${item.row}, 'NOK', this)">
                        <div class="small fw-bold text-danger mt-1">NOK</div>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function parseChecklist(txt) {
    if (!txt) return '<span class="text-muted">Data Kosong</span>';
    
    // Mapping kategori sesuai permintaan
    const categories = [
        { key: "PLANOGRAM", label: "Planogram" },
        { key: "LABEL PRICE", label: "Label Price" },
        { key: "EXP CHECKED", label: "Expired Check" },
        { key: "CLEANING", label: "Kebersihan Rak" }
    ];

    let html = '<div class="checklist-box">';
    categories.forEach(cat => {
        // Mencari teks "OK" setelah kata kunci kategori
        const regex = new RegExp(`${cat.key}\\s+OK`, 'i');
        const isOK = regex.test(txt);
        
        html += `
            <div class="checklist-item">
                <span class="fw-bold">${cat.label}</span>
                <span class="status-pill ${isOK ? 'status-ok' : 'status-nok'}">
                    ${isOK ? '✔ OK' : '✖ NOK'}
                </span>
            </div>`;
    });
    return html + '</div>';
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
    document.getElementById('countSelected').innerText = queue.length;
    bar.style.display = queue.length > 0 ? 'block' : 'none';
}

async function kirimData() {
    if (!confirm(`Simpan validasi untuk ${queue.length} data?`)) return;
    toggleLoading(true);
    try {
        const response = await fetch(URL_WEB_APP, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(queue)
        });
        
        // Mode no-cors tidak mengembalikan response, kita berasumsi sukses jika tidak error
        setTimeout(() => {
            alert("Data Berhasil Divalidasi & Masuk ke GSheet!");
            fetchData();
        }, 1500);
    } catch (e) {
        alert("Gagal mengirim data!");
        toggleLoading(false);
    }
}

function bukaPopup(url) {
    if(!url || url.length < 10) return alert("Foto tidak ada!");
    const modalEl = document.getElementById('modalFoto');
    const imgEl = document.getElementById('frameFoto');
    const loadEl = document.getElementById('loadingGambar');
    const myModal = new bootstrap.Modal(modalEl);

    let finalUrl = url;
    if (url.includes('drive.google.com')) {
        const fileId = url.split('/d/')[1]?.split('/')[0] || url.split('id=')[1]?.split('&')[0];
        finalUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }

    imgEl.style.display = 'none';
    loadEl.style.display = 'block';
    imgEl.src = finalUrl;
    myModal.show();
    imgEl.onload = () => {
        loadEl.style.display = 'none';
        imgEl.style.display = 'inline-block';
    };
}

function toggleLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

// Filter Pencarian Real-time
document.getElementById('inputNama').oninput = runFilter;
document.getElementById('inputToko').oninput = runFilter;
document.getElementById('inputTanggal').onchange = runFilter;

function runFilter() {
    const n = document.getElementById('inputNama').value.toLowerCase();
    const t = document.getElementById('inputToko').value.toLowerCase();
    const d = document.getElementById('inputTanggal').value;
    const filtered = allDataRaw.filter(i => {
        return i.nama.toLowerCase().includes(n) && 
               i.toko.toLowerCase().includes(t) && 
               (d === "" || i.timestamp.includes(d));
    });
    renderTable(filtered);
}
