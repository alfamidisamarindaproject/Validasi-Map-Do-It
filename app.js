const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbz8jdul-sh4ElPZ4i1tHTB15dbvUfENQPnYJaC7p-__p176argqziNmiYx5PDomYUnu/exec";

let allDataRaw = [];
let queue = [];

window.onload = function() {
    fetchData();
};

async function fetchData() {
    toggleLoading(true);
    const tbody = document.getElementById('tableBody');
    queue = [];
    updateSubmitBar();

    try {
        const response = await fetch(URL_WEB_APP);
        const result = await response.json();
        
        // Pastikan result adalah array
        allDataRaw = Array.isArray(result) ? result : [];
        renderTable(allDataRaw);
    } catch (err) {
        console.error("Fetch Error:", err);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-5">Gagal memuat data. Periksa koneksi internet atau URL script.</td></tr>';
    } finally {
        toggleLoading(false);
    }
}

function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 fw-bold text-muted">✅ Tidak ada data yang perlu divalidasi.</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="small text-muted">${item.timestamp}</td>
            <td class="fw-bold">${item.nama}</td>
            <td><span class="badge bg-light text-primary border">${item.toko}</span></td>
            <td>${item.rak}</td>
            <td>${formatChecklist(item.checklist)}</td>
            <td><button class="btn btn-sm btn-dark fw-bold" onclick="bukaPopup('${item.foto}')">🖼️ FOTO</button></td>
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

function formatChecklist(txt) {
    if (!txt) return '<span class="text-muted small">Kosong</span>';
    
    const items = ["Plano", "Label Price", "Display", "Kebersihan"];
    let html = '<div class="checklist-box">';
    
    items.forEach(k => {
        // Logika pencarian status: mencari kata kunci "Ya", "OK", "Ada", atau simbol centang di dekat nama kategori
        const regex = new RegExp(`${k}.{0,15}(ada|ya|ok|v|lengkap|bersih|\\✔)`, 'i');
        const isOK = regex.test(txt);
        
        html += `
            <div class="checklist-item">
                <span class="fw-semibold">${k}</span>
                <span class="status-badge ${isOK ? 'bg-ok' : 'bg-nok'}">
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
    const displayCount = document.getElementById('countSelected');
    if(displayCount) displayCount.innerText = queue.length;
    if(bar) bar.style.display = queue.length > 0 ? 'block' : 'none';
}

async function kirimData() {
    if (!confirm(`Simpan ${queue.length} validasi? Data akan dipindahkan ke riwayat.`)) return;
    toggleLoading(true);
    try {
        await fetch(URL_WEB_APP, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(queue)
        });
        setTimeout(() => {
            alert("Validasi Berhasil!");
            fetchData();
        }, 1200);
    } catch (e) {
        alert("Gagal kirim data!");
        toggleLoading(false);
    }
}

function bukaPopup(url) {
    if(!url || url.length < 10) return alert("Foto tidak tersedia");
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
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// Filter 
document.getElementById('inputNama').oninput = applyFilter;
document.getElementById('inputToko').oninput = applyFilter;
document.getElementById('inputTanggal').onchange = applyFilter;

function applyFilter() {
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
