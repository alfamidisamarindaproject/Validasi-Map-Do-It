// GANTI DENGAN URL WEB APP ANDA YANG BARU (SETELAH DEPLOY ULANG)
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbyipjR5a_wQq4zYp22Mdi0ihWkdJ6yfV6wlNj4aPxWmstgCZVsU49-ClmWMqFmotWqJ/exec";

let allDataRaw = [];
let filteredData = []; 
let queue = [];

document.addEventListener('DOMContentLoaded', () => {
    cekStatusLogin(); 

    // Listeners for Filter
    ['inputNama', 'inputToko', 'inputTanggal'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', runFilter);
            el.addEventListener('change', runFilter);
        }
    });

    // Re-render saat layar di-resize (Putar layar HP atau resize window PC)
    window.addEventListener('resize', () => {
        if (filteredData.length > 0) renderData(filteredData);
    });
});

function cekStatusLogin() {
    const sesiUser = localStorage.getItem('sesiLoginMAP');
    
    if (sesiUser) {
        const userData = JSON.parse(sesiUser);
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        
        document.getElementById('displayUserName').innerText = userData.name;
        document.getElementById('displayUserRole').innerText = userData.role;
        
        // Hiasan Khusus Admin
        const roleIcon = document.getElementById('roleIcon');
        if (userData.role === 'Admin') {
            roleIcon.className = "bi bi-stars fs-5 admin-icon";
            document.getElementById('displayUserRole').style.background = "#ffc107";
            document.getElementById('displayUserRole').style.color = "#000";
        }
        
        fetchData(); 
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }
}

async function prosesLogin(e) {
    e.preventDefault();
    
    const user = document.getElementById('logUsername').value.trim();
    const pass = document.getElementById('logPassword').value.trim();
    const btn = document.getElementById('btnLogin');
    
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Memeriksa...';
    btn.disabled = true;

    try {
        const urlLogin = `${URL_WEB_APP}?action=login&username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
        
        const response = await fetch(urlLogin);
        const result = await response.json();
        
        if (result.success) {
            localStorage.setItem('sesiLoginMAP', JSON.stringify({
                name: result.name,
                role: result.role
            }));
            
            Swal.fire({
                icon: 'success',
                title: result.role === 'Admin' ? 'Akses Admin Terbuka' : 'Berhasil!',
                text: `Selamat datang, ${result.name}`,
                timer: 1500,
                showConfirmButton: false
            });
            
            setTimeout(() => { cekStatusLogin(); }, 1500);
        } else {
            Swal.fire('Login Gagal', result.message, 'error');
        }
    } catch (err) {
        Swal.fire('Koneksi Error', 'Gagal memverifikasi login. Cek URL Anda.', 'error');
    } finally {
        btn.innerHTML = 'MASUK <i class="bi bi-arrow-right-circle ms-2"></i>';
        btn.disabled = false;
    }
}

function prosesLogout() {
    Swal.fire({
        title: 'Keluar aplikasi?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Ya, Keluar'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('sesiLoginMAP'); 
            document.getElementById('logUsername').value = '';
            document.getElementById('logPassword').value = '';
            cekStatusLogin(); 
        }
    });
}

async function fetchData() {
    const container = document.getElementById('dataContainer');
    container.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;"></div>
            <h5 class="text-muted fw-bold mt-3">Menyinkronkan Data...</h5>
        </div>`;
    queue = []; updateSubmitBar();

    try {
        const response = await fetch(URL_WEB_APP);
        const data = await response.json();
        
        allDataRaw = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : []);
        filteredData = [...allDataRaw];
        renderData(filteredData);
    } catch (err) {
        container.innerHTML = `<div class="text-center text-danger py-5"><i class="bi bi-wifi-off fs-1 d-block mb-3"></i><h5 class="fw-bold">Gagal Mengambil Data</h5></div>`;
    }
}

function parseChecklist(txt) {
    if (!txt) return '<span class="text-muted fst-italic small">Kosong</span>';
    const categories = [{ key: "PLANOGRAM", label: "Planogram" }, { key: "LABEL PRICE", label: "Label Price" }, { key: "EXP CHECKED", label: "Expired" }, { key: "CLEANING", label: "Kebersihan" }];
    let html = '<div class="checklist-box">';
    categories.forEach(cat => {
        const isOK = new RegExp(`${cat.key}\\s+OK`, 'i').test(txt);
        html += `<div class="checklist-item"><span class="text-secondary">${cat.label}</span><span class="status-pill ${isOK ? 'status-ok' : 'status-nok'}">${isOK ? '<i class="bi bi-check"></i> OK' : '<i class="bi bi-x"></i> NOK'}</span></div>`;
    });
    return html + '</div>';
}

// LOGIKA RENDER DINAMIS (HP = Card, PC = Table)
function renderData(data) {
    const container = document.getElementById('dataContainer');
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="text-center py-5 text-muted"><i class="bi bi-check-circle fs-1 d-block mb-3 text-success opacity-50"></i><h5 class="fw-bold">Semua data sudah divalidasi / Kosong.</h5></div>`;
        return;
    }

    const isMobile = window.innerWidth < 768; // Deteksi Layar HP

    if (isMobile) {
        // --- TAMPILAN MOBILE (KARTU) ---
        let htmlCards = `<div class="row px-1">`;
        data.forEach(item => {
            const inQueue = queue.find(q => q.row === item.row);
            const okC = inQueue && inQueue.status === 'OK' ? 'checked' : '';
            const nokC = inQueue && inQueue.status === 'NOK' ? 'checked' : '';

            htmlCards += `
            <div class="col-12 mb-3">
                <div class="mobile-card">
                    <div class="mobile-card-header">
                        <span class="badge bg-primary rounded-pill px-3 py-2"><i class="bi bi-shop me-1"></i>${item.toko || '-'}</span>
                        <span class="small text-muted fw-bold"><i class="bi bi-clock me-1"></i>${(item.timestamp||'').split(' ')[0] || '-'}</span>
                    </div>
                    <div class="mobile-card-body">
                        <div class="d-flex justify-content-between mb-3">
                            <div>
                                <h6 class="fw-bold mb-0 text-dark">${item.nama || '-'}</h6>
                                <span class="small text-muted">Rak: ${item.rak || '-'}</span>
                            </div>
                            <button class="btn btn-sm btn-dark rounded-3 px-3 shadow-sm" onclick="bukaPopup('${item.foto}')">
                                <i class="bi bi-image"></i> Foto
                            </button>
                        </div>
                        ${parseChecklist(item.checklist)}
                        <hr class="text-muted opacity-25 my-3">
                        <div class="d-flex gap-2 w-100 validation-group">
                            <input type="radio" class="btn-check" name="row-mob-${item.row}" id="ok-mob-${item.row}" ${okC} onchange="handleQueue(${item.row}, 'OK')">
                            <label class="btn btn-outline-success flex-grow-1 fw-bold py-2 rounded-3" for="ok-mob-${item.row}">OK</label>

                            <input type="radio" class="btn-check" name="row-mob-${item.row}" id="nok-mob-${item.row}" ${nokC} onchange="handleQueue(${item.row}, 'NOK')">
                            <label class="btn btn-outline-danger flex-grow-1 fw-bold py-2 rounded-3" for="nok-mob-${item.row}">NOK</label>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        htmlCards += `</div>`;
        container.innerHTML = htmlCards;

    } else {
        // --- TAMPILAN PC/LAPTOP (TABEL) ---
        let htmlTable = `
        <div class="table-container">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th class="ps-4">Waktu</th><th>Nama</th><th>Toko</th><th>Rak</th>
                            <th>Checklist</th><th>Foto</th><th class="text-center pe-4">Validasi</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        data.forEach(item => {
            const inQueue = queue.find(q => q.row === item.row);
            const okC = inQueue && inQueue.status === 'OK' ? 'checked' : '';
            const nokC = inQueue && inQueue.status === 'NOK' ? 'checked' : '';

            htmlTable += `
                <tr>
                    <td class="small text-muted ps-4">${item.timestamp || '-'}</td>
                    <td class="fw-bold text-dark">${item.nama || '-'}</td>
                    <td><span class="badge bg-light text-primary border border-primary px-2 py-1">${item.toko || '-'}</span></td>
                    <td class="fw-bold">${item.rak || '-'}</td>
                    <td style="min-width: 220px;">${parseChecklist(item.checklist)}</td>
                    <td><button class="btn btn-sm btn-dark px-3 fw-bold shadow-sm rounded-pill" onclick="bukaPopup('${item.foto}')"><i class="bi bi-image me-1"></i> Foto</button></td>
                    <td class="text-center pe-4">
                        <div class="validation-group btn-group shadow-sm">
                            <input type="radio" class="btn-check" name="row-desk-${item.row}" id="ok-desk-${item.row}" ${okC} onchange="handleQueue(${item.row}, 'OK')">
                            <label class="btn btn-outline-success px-3" for="ok-desk-${item.row}">OK</label>

                            <input type="radio" class="btn-check" name="row-desk-${item.row}" id="nok-desk-${item.row}" ${nokC} onchange="handleQueue(${item.row}, 'NOK')">
                            <label class="btn btn-outline-danger px-3" for="nok-desk-${item.row}">NOK</label>
                        </div>
                    </td>
                </tr>`;
        });
        htmlTable += `</tbody></table></div></div>`;
        container.innerHTML = htmlTable;
    }
}

function handleQueue(rowId, status) {
    queue = queue.filter(q => q.row !== rowId);
    queue.push({ row: rowId, status: status });
    
    // Sinkronisasi status jika pengguna meresize layar (Tabel vs Card)
    const deskOk = document.getElementById(`ok-desk-${rowId}`);
    const deskNok = document.getElementById(`nok-desk-${rowId}`);
    const mobOk = document.getElementById(`ok-mob-${rowId}`);
    const mobNok = document.getElementById(`nok-mob-${rowId}`);
    
    if(status === 'OK') {
        if(deskOk) deskOk.checked = true;
        if(mobOk) mobOk.checked = true;
    } else {
        if(deskNok) deskNok.checked = true;
        if(mobNok) mobNok.checked = true;
    }
    
    updateSubmitBar();
}

function tandaiSemua(status) {
    if (filteredData.length === 0) return;
    filteredData.forEach(item => {
        handleQueue(item.row, status);
    });
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `${filteredData.length} data ditandai ${status}`, showConfirmButton: false, timer: 1500 });
}

function resetPilihan() { 
    queue = []; 
    document.querySelectorAll('.btn-check').forEach(r => r.checked = false); 
    updateSubmitBar(); 
}

function updateSubmitBar() {
    const bar = document.getElementById('submitBar');
    document.getElementById('countSelected').innerText = queue.length;
    bar.style.display = queue.length > 0 ? 'block' : 'none';
}

async function kirimData() {
    const res = await Swal.fire({ title: 'Simpan Validasi?', text: `${queue.length} data akan dikirim ke server.`, icon: 'question', showCancelButton: true, confirmButtonText: 'Ya, Simpan', confirmButtonColor: '#198754' });
    if (!res.isConfirmed) return;

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        await fetch(URL_WEB_APP, { method: 'POST', mode: 'no-cors', body: JSON.stringify(queue) });
        setTimeout(() => { Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data validasi tersimpan.', timer: 1500, showConfirmButton: false }); fetchData(); }, 1500);
    } catch (e) { Swal.fire('Error', 'Gagal mengirim data!', 'error'); }
}

function bukaPopup(url) {
    if(!url || url.length < 10) return Swal.fire('Info', 'Tidak ada foto terlampir.', 'info');
    const myModal = new bootstrap.Modal(document.getElementById('modalFoto'));
    const imgEl = document.getElementById('frameFoto');
    const loadEl = document.getElementById('loadingGambar');
    
    let finalUrl = url;
    const match = url.match(/[-\w]{25,}/);
    if (match) finalUrl = `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1000`;

    imgEl.style.display = 'none'; loadEl.style.display = 'block'; imgEl.src = finalUrl;
    myModal.show();
    imgEl.onload = () => { loadEl.style.display = 'none'; imgEl.style.display = 'inline-block'; };
    imgEl.onerror = () => { loadEl.style.display = 'none'; myModal.hide(); Swal.fire('Error', 'Gagal memuat foto.', 'error'); };
}

function runFilter() {
    const n = document.getElementById('inputNama').value.toLowerCase();
    const t = document.getElementById('inputToko').value.toLowerCase();
    const d = document.getElementById('inputTanggal').value;
    filteredData = allDataRaw.filter(i => (i.nama || '').toLowerCase().includes(n) && (i.toko || '').toLowerCase().includes(t) && (d === "" || (i.timestamp || '').includes(d)));
    renderData(filteredData);
}
