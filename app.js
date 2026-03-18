// ===== MASUKKAN URL WEB APP ANDA YANG BARU DISINI =====
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbzwHoSbtRmgKe1qMNCAqIdDH9Ic57V_icd1Qe4O76WmIauT2CF74Yu-CfiVYd6FpkGM/exec";

let allDataRaw = [];
let filteredData = []; 
let queue = [];
let searchTimeout = null; // Untuk fitur Debounce (Anti-Lag)

document.addEventListener('DOMContentLoaded', () => {
    cekStatusLogin(); 

    // Fitur Debounce untuk Pencarian (Menunggu 300ms setelah user berhenti mengetik baru mencari)
    ['inputNama', 'inputToko', 'inputTanggal'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(runFilter, 300);
            });
        }
    });

    // Re-render jika ukuran layar diubah (PC ke HP atau sebaliknya)
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
        
        const badgeRole = document.getElementById('displayUserRole');
        const roleIcon = document.getElementById('roleIcon');
        
        badgeRole.innerText = userData.role;
        
        // Visual Spesial untuk Admin
        if (userData.role === 'Admin') {
            roleIcon.className = "bi bi-stars fs-5 admin-crown";
            badgeRole.className = "badge role-badge-admin shadow-sm";
        } else {
            roleIcon.className = "bi bi-person-circle fs-5";
            badgeRole.className = "badge bg-secondary opacity-75";
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
    
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Memverifikasi...';
    btn.disabled = true;

    try {
        const urlLogin = `${URL_WEB_APP}?action=login&username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
        const response = await fetch(urlLogin);
        const result = await response.json();
        
        if (result.success) {
            localStorage.setItem('sesiLoginMAP', JSON.stringify({ name: result.name, role: result.role }));
            Swal.fire({
                icon: 'success', title: result.role === 'Admin' ? 'Akses Admin' : 'Akses Diterima',
                text: `Halo, ${result.name}`, timer: 1500, showConfirmButton: false
            });
            setTimeout(() => { cekStatusLogin(); }, 1200);
        } else {
            Swal.fire('Login Gagal', result.message, 'error');
        }
    } catch (err) {
        Swal.fire('Gangguan Koneksi', 'Gagal memverifikasi. Pastikan internet stabil dan URL benar.', 'error');
    } finally {
        btn.innerHTML = 'MASUK SISTEM <i class="bi bi-arrow-right-short ms-1 fs-5"></i>';
        btn.disabled = false;
    }
}

function prosesLogout() {
    Swal.fire({
        title: 'Keluar sesi?', icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#ef4444', confirmButtonText: 'Ya, Keluar', cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('sesiLoginMAP'); 
            document.getElementById('formLogin').reset();
            cekStatusLogin(); 
        }
    });
}

function showSkeletonLoader() {
    const isMobile = window.innerWidth < 768;
    const container = document.getElementById('dataContainer');
    
    let html = isMobile ? '<div class="row px-1">' : '<div class="table-container p-4">';
    for(let i=0; i<3; i++) {
        if(isMobile) {
            html += `<div class="col-12 mb-3"><div class="mobile-card placeholder-glow p-3"><span class="placeholder col-4 mb-2 rounded"></span><br><span class="placeholder col-8 rounded mb-3"></span><div class="placeholder col-12 rounded" style="height: 80px;"></div></div></div>`;
        } else {
            html += `<div class="placeholder-glow mb-3"><span class="placeholder col-12 rounded" style="height: 50px;"></span></div>`;
        }
    }
    html += isMobile ? '</div>' : '</div>';
    container.innerHTML = html;
}

async function fetchData() {
    showSkeletonLoader();
    queue = []; updateSubmitBar();

    try {
        const timeSt = new Date().getTime(); // Anti-Cache mechanism
        const urlGet = `${URL_WEB_APP}?action=getData&_t=${timeSt}`;
        
        const response = await fetch(urlGet);
        const result = await response.json();
        
        if(result.success === false) {
             document.getElementById('dataContainer').innerHTML = `<div class="text-center text-danger py-5"><i class="bi bi-exclamation-octagon fs-1 d-block mb-3"></i><h5 class="fw-bold">Gagal Sinkronisasi Server</h5><p>${result.message}</p></div>`;
             return;
        }
        
        allDataRaw = result.data || [];
        filteredData = [...allDataRaw];
        renderData(filteredData);
    } catch (err) {
        document.getElementById('dataContainer').innerHTML = `<div class="text-center text-danger py-5"><i class="bi bi-wifi-off fs-1 d-block mb-3"></i><h5 class="fw-bold">Koneksi Terputus</h5><p class="small text-muted">Periksa jaringan internet Anda.</p></div>`;
    }
}

function parseChecklist(txt) {
    if (!txt) return '<span class="text-muted fst-italic small">Data Kosong</span>';
    const categories = [{ key: "PLANOGRAM", label: "Planogram" }, { key: "LABEL PRICE", label: "Label Price" }, { key: "EXP CHECKED", label: "Expired" }, { key: "CLEANING", label: "Kebersihan" }];
    let html = '<div class="checklist-box">';
    categories.forEach(cat => {
        const isOK = new RegExp(`${cat.key}\\s+OK`, 'i').test(txt);
        html += `<div class="checklist-item"><span class="text-secondary fw-medium">${cat.label}</span><span class="status-pill ${isOK ? 'status-ok' : 'status-nok'}">${isOK ? '<i class="bi bi-check-lg"></i> OK' : '<i class="bi bi-x-lg"></i> NOK'}</span></div>`;
    });
    return html + '</div>';
}

function renderData(data) {
    const container = document.getElementById('dataContainer');
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="text-center py-5 text-muted"><i class="bi bi-check2-circle" style="font-size: 4rem; color: #cbd5e1;"></i><h5 class="fw-bold mt-3">Selesai! Tidak ada data pending.</h5></div>`;
        return;
    }

    const isMobile = window.innerWidth < 768; 

    if (isMobile) {
        let htmlCards = `<div class="row px-1">`;
        data.forEach(item => {
            const inQueue = queue.find(q => q.row === item.row);
            const statusClass = inQueue ? 'item-done' : ''; // Tambahkan visual redup jika sudah dipilih
            const okC = inQueue && inQueue.status === 'OK' ? 'checked' : '';
            const nokC = inQueue && inQueue.status === 'NOK' ? 'checked' : '';

            htmlCards += `
            <div class="col-12 mb-3">
                <div class="mobile-card ${statusClass}" id="card-${item.row}">
                    <div class="mobile-card-header">
                        <span class="badge bg-primary rounded-pill px-3 py-2 fw-medium"><i class="bi bi-shop me-1"></i>${item.toko || '-'}</span>
                        <span class="small text-muted fw-semibold"><i class="bi bi-clock me-1"></i>${(item.timestamp||'').split(' ')[0] || '-'}</span>
                    </div>
                    <div class="mobile-card-body">
                        <div class="d-flex justify-content-between mb-3 align-items-center">
                            <div>
                                <h6 class="fw-bold mb-0 text-dark" style="font-size: 1.05rem;">${item.nama || '-'}</h6>
                                <span class="small text-muted"><i class="bi bi-layers text-primary me-1"></i> Rak: <span class="fw-bold text-dark">${item.rak || '-'}</span></span>
                            </div>
                            <button class="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-semibold" onclick="bukaPopup('${item.foto}')">
                                <i class="bi bi-image text-primary"></i> Foto
                            </button>
                        </div>
                        ${parseChecklist(item.checklist)}
                        <hr class="text-muted opacity-25 my-3">
                        <div class="d-flex gap-2 w-100 validation-group">
                            <input type="radio" class="btn-check" name="row-mob-${item.row}" id="ok-mob-${item.row}" ${okC} onchange="handleQueue(${item.row}, 'OK')">
                            <label class="btn btn-outline-success flex-grow-1 fw-bold py-2 rounded-3" for="ok-mob-${item.row}"><i class="bi bi-check-lg me-1"></i> OK</label>

                            <input type="radio" class="btn-check" name="row-mob-${item.row}" id="nok-mob-${item.row}" ${nokC} onchange="handleQueue(${item.row}, 'NOK')">
                            <label class="btn btn-outline-danger flex-grow-1 fw-bold py-2 rounded-3" for="nok-mob-${item.row}"><i class="bi bi-x-lg me-1"></i> NOK</label>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        htmlCards += `</div>`;
        container.innerHTML = htmlCards;

    } else {
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
            const statusClass = inQueue ? 'item-done' : ''; // Visual feedback Table
            const okC = inQueue && inQueue.status === 'OK' ? 'checked' : '';
            const nokC = inQueue && inQueue.status === 'NOK' ? 'checked' : '';

            htmlTable += `
                <tr class="${statusClass}" id="row-${item.row}">
                    <td class="small text-muted ps-4 fw-medium">${item.timestamp || '-'}</td>
                    <td class="fw-bold text-dark">${item.nama || '-'}</td>
                    <td><span class="badge bg-light text-primary border border-primary px-3 py-2 rounded-pill">${item.toko || '-'}</span></td>
                    <td class="fw-bold text-secondary">${item.rak || '-'}</td>
                    <td style="min-width: 240px;">${parseChecklist(item.checklist)}</td>
                    <td><button class="btn btn-sm btn-outline-secondary px-3 fw-semibold rounded-pill" onclick="bukaPopup('${item.foto}')"><i class="bi bi-image text-primary me-1"></i> Foto</button></td>
                    <td class="text-center pe-4" style="min-width: 160px;">
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
    
    // Sinkronisasi status Mobile & PC
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

    // Tambahkan class visual 'item-done' agar UI meredup
    const rowEl = document.getElementById(`row-${rowId}`);
    const cardEl = document.getElementById(`card-${rowId}`);
    if (rowEl) rowEl.classList.add('item-done');
    if (cardEl) cardEl.classList.add('item-done');
    
    updateSubmitBar();
}

function tandaiSemua(status) {
    if (filteredData.length === 0) return;
    filteredData.forEach(item => { handleQueue(item.row, status); });
    
    // Notifikasi Toast yang tidak mengganggu
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `${filteredData.length} data ditandai ${status}`, showConfirmButton: false, timer: 1500, background: '#10b981', color: '#fff' });
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
    
    if (queue.length > 0) {
        bar.style.display = 'block';
        // Delay kecil agar animasi CSS transisi transform bisa berjalan
        setTimeout(() => bar.classList.add('show'), 10);
    } else {
        bar.classList.remove('show');
        setTimeout(() => bar.style.display = 'none', 400); // Tunggu animasi selesai
    }
}

async function kirimData() {
    const res = await Swal.fire({ title: 'Simpan ke Server?', text: `${queue.length} hasil validasi akan dikirim.`, icon: 'question', showCancelButton: true, confirmButtonText: 'Ya, Simpan', confirmButtonColor: '#3b82f6', cancelButtonText: 'Batal' });
    if (!res.isConfirmed) return;

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        await fetch(URL_WEB_APP, { method: 'POST', mode: 'no-cors', body: JSON.stringify(queue) });
        setTimeout(() => { 
            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data validasi telah tersimpan.', timer: 1500, showConfirmButton: false }); 
            resetPilihan();
            fetchData(); 
        }, 1200);
    } catch (e) { Swal.fire('Error', 'Gagal mengirim data. Coba lagi.', 'error'); }
}

function bukaPopup(url) {
    if(!url || url.length < 10) return Swal.fire('Info', 'Personil tidak melampirkan foto.', 'info');
    
    const myModal = new bootstrap.Modal(document.getElementById('modalFoto'));
    const imgEl = document.getElementById('frameFoto');
    const loadEl = document.getElementById('loadingGambar');
    
    let finalUrl = url;
    // Mengubah link GDrive biasa menjadi link Thumbnail resolusi tinggi (1000px)
    const match = url.match(/[-\w]{25,}/);
    if (match) finalUrl = `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1000`;

    imgEl.style.display = 'none'; loadEl.style.display = 'block'; imgEl.src = finalUrl;
    myModal.show();
    
    imgEl.onload = () => { loadEl.style.display = 'none'; imgEl.style.display = 'inline-block'; };
    imgEl.onerror = () => { loadEl.style.display = 'none'; myModal.hide(); Swal.fire('Gagal Memuat Foto', 'Pastikan akses folder Google Drive diset ke Publik (Anyone with the link).', 'error'); };
}

function runFilter() {
    const n = document.getElementById('inputNama').value.toLowerCase();
    const t = document.getElementById('inputToko').value.toLowerCase();
    const d = document.getElementById('inputTanggal').value;
    filteredData = allDataRaw.filter(i => (i.nama || '').toLowerCase().includes(n) && (i.toko || '').toLowerCase().includes(t) && (d === "" || (i.timestamp || '').includes(d)));
    renderData(filteredData);
}
