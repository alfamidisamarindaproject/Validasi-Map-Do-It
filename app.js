// ===== URL WEB APP ANDA =====
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbwN-DMvo0HBiX9nsqEyNVEoiuMw1-5f2LrbokdxXBIIu0EDOrYJdN0OwQvmqjQoF5YGvw/exec";

let allDataRaw = [];
let filteredData = []; 
let queue = [];
let searchTimeout = null; 

document.addEventListener('DOMContentLoaded', () => {
    cekStatusLogin(); 

    // Fitur Filter Otomatis (Debounce)
    ['inputNama', 'inputToko', 'inputTanggal'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(runFilter, 300);
            });
        }
    });

    window.addEventListener('resize', () => {
        if (filteredData.length > 0) renderData(filteredData);
    });
});

// 1. CEK LOGIN & SESSION
function cekStatusLogin() {
    const sesiUser = localStorage.getItem('sesiLoginMAP');
    if (sesiUser) {
        if (document.activeElement) document.activeElement.blur(); 
        const userData = JSON.parse(sesiUser);
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        
        document.getElementById('displayUserName').innerText = userData.name;
        document.getElementById('displayUserRole').innerText = userData.role;
        
        const inisial = userData.name.charAt(0).toUpperCase();
        const avatarEl = document.getElementById('avatarInisial');
        avatarEl.innerText = inisial;
        
        if (userData.role === 'Admin') avatarEl.classList.add('admin-avatar');
        
        fetchData(); 
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }
}

// 2. AMBIL DATA DARI SERVER
async function fetchData() {
    showSkeleton();
    queue = []; 
    updateSubmitBar();

    try {
        const timeSt = new Date().getTime(); 
        const response = await fetch(`${URL_WEB_APP}?action=getData&_t=${timeSt}`);
        const result = await response.json();
        
        if(result.success === false) {
             document.getElementById('dataContainer').innerHTML = `<div class="text-center text-danger py-5"><i class="bi bi-exclamation-triangle fs-1 d-block mb-2"></i><div>${result.message}</div></div>`;
             return;
        }
        
        allDataRaw = Array.isArray(result.data) ? result.data : [];
        filteredData = [...allDataRaw];
        renderData(filteredData);
    } catch (err) {
        document.getElementById('dataContainer').innerHTML = `<div class="text-center text-danger py-5"><i class="bi bi-wifi-off fs-1 d-block mb-2"></i><div class="fw-bold">Koneksi Gagal</div></div>`;
    }
}

// 3. PARSER CHECKLIST (Konsep Regex dari kode baru)
function parseChecklistGrid(txt) {
    if (!txt) return '<div class="text-muted small fst-italic">Data Kosong</div>';
    
    // Menyesuaikan kategori Alfamidi Anda
    const categories = [
        { key: "PLANOGRAM", label: "Plano" }, 
        { key: "LABEL PRICE", label: "Label" }, 
        { key: "EXP CHECKED", label: "Exp" }, 
        { key: "CLEANING", label: "Bersih" }
    ];
    
    let html = '<div class="check-grid">';
    categories.forEach(cat => {
        // Menggunakan konsep Regex test agar lebih akurat membaca teks
        const isOK = new RegExp(cat.key, 'i').test(txt);
        const icon = isOK ? '<i class="bi bi-check-circle-fill icon-ok"></i>' : '<i class="bi bi-x-circle-fill icon-nok"></i>';
        html += `<div class="check-item"><span>${cat.label}</span>${icon}</div>`;
    });
    return html + '</div>';
}

// 4. RENDER DATA (LOGIKA DESKTOP & MOBILE)
function renderData(data) {
    const container = document.getElementById('dataContainer');
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="text-center py-5 text-muted"><i class="bi bi-inbox fs-1"></i><h6 class="mt-3">Tidak ada data untuk divalidasi.</h6></div>`;
        return;
    }

    const isMobile = window.innerWidth < 768; 

    if (isMobile) {
        let htmlCards = `<div class="row">`;
        data.forEach(item => {
            const inQueue = queue.find(q => q.row === item.row);
            const statusClass = inQueue ? 'item-done' : ''; 
            const okC = inQueue && inQueue.status === 'OK' ? 'checked' : '';
            const nokC = inQueue && inQueue.status === 'NOK' ? 'checked' : '';

            htmlCards += `
            <div class="col-12 mb-3">
                <div class="data-card ${statusClass}" id="card-${item.row}">
                    <div class="data-card-header">
                        <span class="badge bg-primary rounded-pill">${item.toko || '-'}</span>
                        <span class="small text-muted">${(item.timestamp||'').split(' ')[0]}</span>
                    </div>
                    <div class="data-card-body">
                        <div class="d-flex justify-content-between mb-2">
                            <div><strong class="d-block">${item.nama}</strong><small class="text-muted">Rak: ${item.rak}</small></div>
                            <button class="btn btn-outline-primary btn-sm rounded-circle" onclick="bukaPopup('${item.foto}')"><i class="bi bi-image"></i></button>
                        </div>
                        ${parseChecklistGrid(item.checklist)}
                        <div class="validation-group mt-3">
                            <input type="radio" class="btn-check" name="row-mob-${item.row}" id="ok-mob-${item.row}" ${okC} onchange="handleQueue(${item.row}, 'OK')">
                            <label class="btn btn-outline-success" for="ok-mob-${item.row}">OK</label>
                            <input type="radio" class="btn-check" name="row-mob-${item.row}" id="nok-mob-${item.row}" ${nokC} onchange="handleQueue(${item.row}, 'NOK')">
                            <label class="btn btn-outline-danger" for="nok-mob-${item.row}">NOK</label>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        container.innerHTML = htmlCards + `</div>`;
    } else {
        // Mode Tabel Desktop tetap sama namun dengan parsing baru
        let htmlTable = `<div class="data-card"><div class="table-responsive"><table class="table table-custom table-hover"><thead><tr><th>Waktu</th><th>Personil</th><th>Toko</th><th>Checklist</th><th class="text-center">Foto</th><th class="text-center">Aksi</th></tr></thead><tbody>`;
        data.forEach(item => {
            const inQueue = queue.find(q => q.row === item.row);
            const statusClass = inQueue ? 'item-done' : '';
            const okC = inQueue && inQueue.status === 'OK' ? 'checked' : '';
            const nokC = inQueue && inQueue.status === 'NOK' ? 'checked' : '';
            htmlTable += `<tr class="${statusClass}" id="row-${item.row}"><td>${(item.timestamp||'').split(' ')[0]}</td><td><strong>${item.nama}</strong><br><small>Rak: ${item.rak}</small></td><td>${item.toko}</td><td>${parseChecklistGrid(item.checklist)}</td><td class="text-center"><button class="btn btn-light btn-sm" onclick="bukaPopup('${item.foto}')"><i class="bi bi-image text-primary"></i></button></td><td><div class="validation-group"><input type="radio" class="btn-check" name="row-desk-${item.row}" id="ok-desk-${item.row}" ${okC} onchange="handleQueue(${item.row}, 'OK')"><label class="btn btn-outline-success" for="ok-desk-${item.row}">OK</label><input type="radio" class="btn-check" name="row-desk-${item.row}" id="nok-desk-${item.row}" ${nokC} onchange="handleQueue(${item.row}, 'NOK')"><label class="btn btn-outline-danger" for="nok-desk-${item.row}">NOK</label></div></td></tr>`;
        });
        container.innerHTML = htmlTable + `</tbody></table></div></div>`;
    }
}

// 5. LOGIKA ANTRIAN VALIDASI (Konsep handleQueue dari kode baru)
function handleQueue(rowId, status) {
    queue = queue.filter(q => q.row !== rowId);
    queue.push({ row: rowId, status: status });
    
    // Sinkronisasi visual agar baris jadi transparan (done)
    document.getElementById(`row-${rowId}`)?.classList.add('item-done');
    document.getElementById(`card-${rowId}`)?.classList.add('item-done');
    
    updateSubmitBar();
}

// 6. POPUP FOTO (Konsep Thumbnail Otomatis dari kode baru)
function bukaPopup(url) {
    if(!url || url.length < 10) return Swal.fire('Info', 'Tidak ada foto.', 'info');
    
    const myModal = new bootstrap.Modal(document.getElementById('modalFoto'));
    const imgEl = document.getElementById('frameFoto');
    const loadEl = document.getElementById('loadingGambar');

    let finalUrl = url;
    // Ubah link Drive biasa ke Link Thumbnail biar cepat loadingnya
    const match = url.match(/[-\w]{25,}/);
    if (match) finalUrl = `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1000`;

    imgEl.style.display = 'none'; 
    loadEl.style.display = 'block'; 
    imgEl.src = finalUrl;
    myModal.show();
    
    imgEl.onload = () => { loadEl.style.display = 'none'; imgEl.style.display = 'block'; };
}

// 7. FILTERING (Logika runFilter dari kode baru)
function runFilter() {
    const n = document.getElementById('inputNama').value.toLowerCase();
    const t = document.getElementById('inputToko').value.toLowerCase();
    const d = document.getElementById('inputTanggal').value;
    
    filteredData = allDataRaw.filter(i => {
        const matchNama = (i.nama || '').toLowerCase().includes(n);
        const matchToko = (i.toko || '').toLowerCase().includes(t);
        const matchDate = (d === "" || (i.timestamp || '').includes(d));
        return matchNama && matchToko && matchDate;
    });
    renderData(filteredData);
}

// Fungsi pembantu lainnya (Kirim, Logout, dll) tetap menggunakan kode lama Anda
function updateSubmitBar() {
    const bar = document.getElementById('submitBar');
    document.getElementById('countSelected').innerText = queue.length;
    queue.length > 0 ? bar.classList.add('show') : bar.classList.remove('show');
}

async function kirimData() {
    const res = await Swal.fire({ title: 'Kirim Validasi?', text: `${queue.length} data akan diproses.`, icon: 'question', showCancelButton: true, confirmButtonColor: '#10B981' });
    if (!res.isConfirmed) return;

    Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        await fetch(URL_WEB_APP, { method: 'POST', mode: 'no-cors', body: JSON.stringify(queue) });
        setTimeout(() => { 
            Swal.fire({ icon: 'success', title: 'Terkirim', timer: 1500, showConfirmButton: false }); 
            fetchData(); 
        }, 1200);
    } catch (e) { Swal.fire('Error', 'Gagal kirim data.', 'error'); }
}

function prosesLogout() {
    localStorage.removeItem('sesiLoginMAP');
    location.reload();
}

function showSkeleton() {
    document.getElementById('dataContainer').innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><div class="mt-2 text-muted">Sinkronisasi Data...</div></div>`;
}
