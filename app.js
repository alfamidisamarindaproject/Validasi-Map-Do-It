// ===== URL WEB APP ANDA =====
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbwhRUHLx_Q3UmW7gEdJqUqrDQBDnEwgzM-yCmYGVu_bvXahjPGyCyhWPi_Rl-VOU8gO/exec";

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

// ==========================================
// 1. FITUR LOGIN
// ==========================================
async function prosesLogin(e) {
    e.preventDefault();
    const user = document.getElementById('logUsername').value.trim();
    const pass = document.getElementById('logPassword').value.trim();
    const btn = document.getElementById('btnLogin');

    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Memproses...';
    btn.disabled = true;

    try {
        // Bypass Admin Khusus
        if (user.toUpperCase() === "AKBAR RASYID" && pass === "0225065474") {
            suksesLogin("AKBAR RASYID", "Admin");
            return;
        }

        // Fetch ke GSheet untuk cek struktur AC/AM
        const urlLogin = `${URL_WEB_APP}?action=login&username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
        const response = await fetch(urlLogin);
        const result = await response.json();

        if (result.success) {
            suksesLogin(result.name, result.role);
        } else {
            Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: result.message, confirmButtonColor: '#2563EB' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Koneksi Gagal', text: 'Pastikan internet stabil dan URL Web App valid.', confirmButtonColor: '#2563EB' });
    } finally {
        btn.innerHTML = 'Login Sistem';
        btn.disabled = false;
    }
}

function suksesLogin(name, role) {
    localStorage.setItem('sesiLoginMAP', JSON.stringify({ name: name, role: role }));
    Swal.fire({
        icon: 'success',
        title: role === 'Admin' ? 'Mode Admin Aktif' : 'Login Berhasil',
        text: `Selamat bertugas, ${name}`,
        timer: 1500,
        showConfirmButton: false
    });
    setTimeout(() => { cekStatusLogin(); }, 1200);
}

// ==========================================
// 2. CEK LOGIN & SESSION
// ==========================================
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

// ==========================================
// 3. AMBIL DATA DARI SERVER (UPDATE FITUR TERBARU)
// ==========================================
async function fetchData() {
    showSkeleton();
    queue = []; 
    updateSubmitBar();

    try {
        const timeSt = new Date().getTime(); 
        
        // --- FITUR TERBARU: Menarik Data Sesi User ---
        const sesiUser = JSON.parse(localStorage.getItem('sesiLoginMAP'));
        const reqUser = encodeURIComponent(sesiUser.name);
        const reqRole = encodeURIComponent(sesiUser.role);

        // --- Mengirim username & role ke parameter URL ---
        const response = await fetch(`${URL_WEB_APP}?action=getData&username=${reqUser}&role=${reqRole}&_t=${timeSt}`);
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

function parseChecklistGrid(txt) {
    if (!txt) return '<div class="text-muted small fst-italic">Data Kosong</div>';
    
    const categories = [
        { key: "PLANOGRAM", label: "Plano" }, 
        { key: "LABEL PRICE", label: "Label" }, 
        { key: "EXP CHECKED", label: "Exp" }, 
        { key: "CLEANING", label: "Bersih" }
    ];
    
    let html = '<div class="check-grid">';
    categories.forEach(cat => {
        const isOK = new RegExp(cat.key, 'i').test(txt);
        const icon = isOK ? '<i class="bi bi-check-circle-fill icon-ok"></i>' : '<i class="bi bi-x-circle-fill icon-nok"></i>';
        html += `<div class="check-item"><span>${cat.label}</span>${icon}</div>`;
    });
    return html + '</div>';
}

function renderData(data) {
    const container = document.getElementById('dataContainer');
    container.innerHTML = '';

    if (!data || data.length === 0) {
        // Teks disesuaikan jika data area kosong
        container.innerHTML = `<div class="text-center py-5 text-muted"><div class="d-inline-flex justify-content-center align-items-center bg-light rounded-circle mb-3" style="width: 80px; height: 80px;"><i class="bi bi-inbox fs-1 text-secondary"></i></div><h6 class="fw-bold">Semua Selesai!</h6><p class="small">Tidak ada data untuk divalidasi di area Anda saat ini.</p></div>`;
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
            <div class="col-12">
                <div class="data-card ${statusClass}" id="card-${item.row}">
                    <div class="data-card-header">
                        <span class="badge bg-primary rounded-pill px-3 py-2 fw-semibold shadow-sm">${item.toko || '-'}</span>
                        <span class="small fw-bold text-muted">${(item.timestamp||'').split(' ')[0]}</span>
                    </div>
                    <div class="data-card-body">
                        <div class="d-flex justify-content-between mb-3 align-items-center">
                            <div><strong class="d-block text-dark fs-6 mb-1">${item.nama}</strong><span class="badge bg-light text-dark border border-secondary-subtle">Rak: ${item.rak}</span></div>
                            <button class="btn btn-outline-primary btn-sm rounded-circle shadow-sm" style="width: 40px; height: 40px;" onclick="bukaPopup('${item.foto}')"><i class="bi bi-image"></i></button>
                        </div>
                        ${parseChecklistGrid(item.checklist)}
                        <div class="validation-group mt-3 shadow-sm">
                            <input type="radio" class="btn-check" name="row-mob-${item.row}" id="ok-mob-${item.row}" ${okC} onchange="handleQueue(${item.row}, 'OK')">
                            <label class="btn btn-outline-success text-uppercase fw-bold" for="ok-mob-${item.row}">OK</label>
                            <input type="radio" class="btn-check" name="row-mob-${item.row}" id="nok-mob-${item.row}" ${nokC} onchange="handleQueue(${item.row}, 'NOK')">
                            <label class="btn btn-outline-danger text-uppercase fw-bold" for="nok-mob-${item.row}">NOK</label>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        container.innerHTML = htmlCards + `</div>`;
    } else {
        let htmlTable = `<div class="data-card shadow-sm"><div class="table-responsive"><table class="table table-custom table-hover align-middle"><thead><tr><th width="10%">Waktu</th><th width="20%">Personil</th><th width="15%">Toko</th><th width="30%">Checklist</th><th class="text-center" width="10%">Foto</th><th class="text-center" width="15%">Aksi</th></tr></thead><tbody>`;
        data.forEach(item => {
            const inQueue = queue.find(q => q.row === item.row);
            const statusClass = inQueue ? 'item-done' : '';
            const okC = inQueue && inQueue.status === 'OK' ? 'checked' : '';
            const nokC = inQueue && inQueue.status === 'NOK' ? 'checked' : '';
            
            htmlTable += `<tr class="${statusClass}" id="row-${item.row}"><td class="fw-medium text-muted">${(item.timestamp||'').split(' ')[0]}</td><td><strong class="text-dark d-block">${item.nama}</strong><span class="badge bg-light border text-muted">Rak: ${item.rak}</span></td><td><span class="fw-semibold text-primary">${item.toko}</span></td><td>${parseChecklistGrid(item.checklist)}</td><td class="text-center"><button class="btn btn-light border btn-sm shadow-sm" onclick="bukaPopup('${item.foto}')"><i class="bi bi-image text-primary"></i></button></td><td><div class="validation-group"><input type="radio" class="btn-check" name="row-desk-${item.row}" id="ok-desk-${item.row}" ${okC} onchange="handleQueue(${item.row}, 'OK')"><label class="btn btn-outline-success fw-bold" for="ok-desk-${item.row}">OK</label><input type="radio" class="btn-check" name="row-desk-${item.row}" id="nok-desk-${item.row}" ${nokC} onchange="handleQueue(${item.row}, 'NOK')"><label class="btn btn-outline-danger fw-bold" for="nok-desk-${item.row}">NOK</label></div></td></tr>`;
        });
        container.innerHTML = htmlTable + `</tbody></table></div></div>`;
    }
}

// ==========================================
// 4. LOGIKA VALIDASI & TOMBOL MASSAL
// ==========================================
function handleQueue(rowId, status) {
    queue = queue.filter(q => q.row !== rowId);
    queue.push({ row: rowId, status: status });
    
    document.getElementById(`row-${rowId}`)?.classList.add('item-done');
    document.getElementById(`card-${rowId}`)?.classList.add('item-done');
    
    updateSubmitBar();
}

function tandaiSemua(status) {
    if (filteredData.length === 0) {
        return Swal.fire('Info', 'Tidak ada data yang ditampilkan untuk ditandai.', 'info');
    }
    
    filteredData.forEach(item => { 
        handleQueue(item.row, status); 
        // Force update radio UI
        const rMob = document.getElementById(`${status.toLowerCase()}-mob-${item.row}`);
        const rDesk = document.getElementById(`${status.toLowerCase()}-desk-${item.row}`);
        if(rMob) rMob.checked = true;
        if(rDesk) rDesk.checked = true;
    });
}

function resetPilihan() {
    queue = [];
    document.querySelectorAll('.btn-check').forEach(r => r.checked = false);
    document.querySelectorAll('.item-done').forEach(el => el.classList.remove('item-done'));
    updateSubmitBar();
}

function updateSubmitBar() {
    const bar = document.getElementById('submitBar');
    document.getElementById('countSelected').innerText = queue.length;
    queue.length > 0 ? bar.classList.add('show') : bar.classList.remove('show');
}

// ==========================================
// 5. FILTERING
// ==========================================
function runFilter() {
    const n = document.getElementById('inputNama').value.toLowerCase();
    const t = document.getElementById('inputToko').value.toLowerCase();
    const dRaw = document.getElementById('inputTanggal').value;
    
    let dFormatted = "";
    if (dRaw) {
        const parts = dRaw.split('-');
        if(parts.length === 3) dFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`; 
    }
    
    filteredData = allDataRaw.filter(i => {
        const matchNama = (i.nama || '').toLowerCase().includes(n);
        const matchToko = (i.toko || '').toLowerCase().includes(t);
        const matchDate = (dFormatted === "" || (i.timestamp || '').includes(dFormatted));
        return matchNama && matchToko && matchDate;
    });
    
    renderData(filteredData);
    
    setTimeout(() => {
        queue.forEach(q => {
            const rbMob = document.getElementById(`${q.status.toLowerCase()}-mob-${q.row}`);
            const rbDesk = document.getElementById(`${q.status.toLowerCase()}-desk-${q.row}`);
            if (rbMob) rbMob.checked = true;
            if (rbDesk) rbDesk.checked = true;
            document.getElementById(`card-${q.row}`)?.classList.add('item-done');
            document.getElementById(`row-${q.row}`)?.classList.add('item-done');
        });
    }, 50);
}

// ==========================================
// 6. POPUP FOTO & UTILITAS
// ==========================================
function bukaPopup(url) {
    if(!url || url.length < 10) return Swal.fire('Info', 'Tidak ada foto.', 'info');
    
    const myModal = new bootstrap.Modal(document.getElementById('modalFoto'));
    const imgEl = document.getElementById('frameFoto');
    const loadEl = document.getElementById('loadingGambar');

    let finalUrl = url;
    const match = url.match(/[-\w]{25,}/);
    if (match) finalUrl = `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1000`;

    imgEl.style.display = 'none'; 
    loadEl.style.display = 'block'; 
    imgEl.src = finalUrl;
    myModal.show();
    
    imgEl.onload = () => { loadEl.style.display = 'none'; imgEl.style.display = 'block'; };
}

async function kirimData() {
    const res = await Swal.fire({ title: 'Kirim Data?', text: `${queue.length} validasi siap diproses.`, icon: 'question', showCancelButton: true, confirmButtonText: 'Ya, Kirim', confirmButtonColor: '#10B981' });
    if (!res.isConfirmed) return;

    Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        await fetch(URL_WEB_APP, { method: 'POST', mode: 'no-cors', body: JSON.stringify(queue) });
        setTimeout(() => { 
            Swal.fire({ icon: 'success', title: 'Terkirim', timer: 1500, showConfirmButton: false }); 
            resetPilihan();
            fetchData(); 
        }, 1200);
    } catch (e) { Swal.fire('Error', 'Gagal kirim data.', 'error'); }
}

function prosesLogout() {
    Swal.fire({
        title: 'Akhiri Sesi?', text: "Anda akan keluar dari sistem", icon: 'question',
        showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Keluar'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('sesiLoginMAP');
            location.reload();
        }
    });
}

function showSkeleton() {
    document.getElementById('dataContainer').innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><div class="mt-2 text-muted fw-medium">Sinkronisasi Area Anda...</div></div>`;
}
