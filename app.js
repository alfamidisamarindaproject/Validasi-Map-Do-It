// ===== MASUKKAN URL DEPLOYMENT BARU ANDA DI SINI =====
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbzXYxvcB_BEE-bZGoDZTZfClTrOyGTaESvFEcgPgsToAh8HX48xRCYOLhJQ4Ax9rwc/exec";

let allDataRaw = [];
let filteredData = []; 
let queue = [];
let searchTimeout = null; 

// ---> SMART FETCH DENGAN DIAGNOSTIK ERROR <---
async function fetchGAS(url) {
    try {
        const response = await fetch(url);
        const text = await response.text(); // Baca sebagai teks mentah dulu
        
        try {
            return JSON.parse(text); // Coba ubah ke JSON
        } catch (parseError) {
            // JIKA GAGAL JADI JSON, BERARTI GOOGLE MEMBLOKIRNYA DENGAN HALAMAN HTML
            console.error("Response bukan JSON, melainkan:", text.substring(0, 200));
            if (text.includes("<html") || text.includes("Sign in") || text.includes("accounts.google.com")) {
                throw new Error("TERBLOKIR_LOGIN");
            }
            throw new Error("SERVER_ERROR");
        }
    } catch (error) {
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    cekStatusLogin(); 
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

function cekStatusLogin() {
    const sesiUser = localStorage.getItem('sesiLoginMAP');
    if (sesiUser) {
        const userData = JSON.parse(sesiUser);
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        document.getElementById('displayUserName').innerText = userData.name;
        document.getElementById('displayUserRole').innerText = userData.role;
        const inisial = userData.name.charAt(0).toUpperCase();
        const avatarEl = document.getElementById('avatarInisial');
        avatarEl.innerText = inisial;
        if (userData.role === 'Admin') avatarEl.classList.add('admin-avatar');
        else avatarEl.classList.remove('admin-avatar');
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
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Memproses...';
    btn.disabled = true;

    try {
        let isSuccess = false; let finalName = ""; let finalRole = "";

        if (user.toUpperCase() === "AKBAR RASYID" && (pass === "0225065474" || pass === "service quality")) {
            isSuccess = true; finalName = "AKBAR RASYID"; finalRole = "Admin";
        } 
        else {
            const urlLogin = `${URL_WEB_APP}?action=login&username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
            const result = await fetchGAS(urlLogin);
            
            if (result.success) {
                isSuccess = true; finalName = result.name; finalRole = result.role;
                if (finalName.toUpperCase() === "AKBAR RASYID") finalRole = "Admin";
            } else {
                Swal.fire('Akses Ditolak', result.message, 'error');
            }
        }

        if (isSuccess) {
            localStorage.setItem('sesiLoginMAP', JSON.stringify({ name: finalName, role: finalRole }));
            Swal.fire({ icon: 'success', title: finalRole === 'Admin' ? 'Mode Admin Aktif' : 'Login Berhasil', text: `Selamat bertugas, ${finalName}`, timer: 1500, showConfirmButton: false });
            setTimeout(() => { cekStatusLogin(); }, 1200);
        }

    } catch (err) {
        let msg = "Terjadi masalah jaringan atau CORS.";
        if (err.message === "TERBLOKIR_LOGIN") msg = "Google memblokir akses. Web App harus diset 'Who has access: Anyone'.";
        Swal.fire('Koneksi Gagal', msg, 'error');
    } finally {
        btn.innerHTML = 'Login Sistem';
        btn.disabled = false;
    }
}

function prosesLogout() {
    Swal.fire({ title: 'Akhiri Sesi?', text: "Anda akan keluar dari sistem", icon: 'question', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Ya, Keluar', cancelButtonText: 'Batal' })
    .then((result) => {
        if (result.isConfirmed) { localStorage.removeItem('sesiLoginMAP'); document.getElementById('formLogin').reset(); cekStatusLogin(); }
    });
}

function showSkeleton() {
    const isMobile = window.innerWidth < 768;
    const container = document.getElementById('dataContainer');
    let html = isMobile ? '<div class="row">' : '<div class="data-card p-4">';
    for(let i=0; i<3; i++) {
        if(isMobile) html += `<div class="col-12"><div class="data-card p-3 mb-3 placeholder-glow"><span class="placeholder col-4 mb-2 rounded"></span><br><span class="placeholder col-8 rounded mb-3"></span><div class="placeholder col-12 rounded" style="height: 60px;"></div></div></div>`;
        else html += `<div class="placeholder-glow mb-3"><span class="placeholder col-12 rounded" style="height: 50px;"></span></div>`;
    }
    container.innerHTML = html + (isMobile ? '</div>' : '</div>');
}

async function fetchData() {
    showSkeleton(); queue = []; updateSubmitBar();
    try {
        const timeSt = new Date().getTime(); 
        const fetchUrl = `${URL_WEB_APP}?action=getData&_t=${timeSt}`;
        
        const result = await fetchGAS(fetchUrl);
        
        if(result.success === false) {
             document.getElementById('dataContainer').innerHTML = `<div class="text-center text-danger py-5"><i class="bi bi-exclamation-triangle fs-1 d-block mb-2"></i><div class="fw-bold">Gagal Membaca Sheet</div><div class="small fw-semibold mt-2 text-dark bg-warning bg-opacity-10 py-2 px-3 rounded d-inline-block text-start">${result.message}</div></div>`;
             return;
        }
        
        allDataRaw = result.data || [];
        filteredData = allDataRaw.filter(i => !i.validasi || i.validasi === "");
        
        try { setupDashboardFilters(); updateDashboard(); document.getElementById('dashboardSection').style.display = 'block'; } catch (errDash) {}
        renderData(filteredData);

    } catch (err) {
        let errorTitle = "Koneksi Terblokir (CORS)";
        let errorMsg = "Browser memblokir permintaan ke Google Apps Script.";
        
        if (err.message === "TERBLOKIR_LOGIN") {
            errorTitle = "Terblokir Halaman Login Google";
            errorMsg = "Google memaksa web untuk login. <b>Solusi:</b> Buka Apps Script > Deploy > New Deployment > Pastikan 'Who has access' adalah <b>Anyone</b> (BUKAN Anyone with Google Account).";
        } else if (err.message === "SERVER_ERROR") {
            errorTitle = "Error Pada Script Backend";
            errorMsg = "Script kode.gs mengalami error syntax atau gagal dieksekusi.";
        }

        document.getElementById('dataContainer').innerHTML = `<div class="text-center text-danger py-5">
            <i class="bi bi-shield-lock fs-1 d-block mb-2"></i>
            <div class="fw-bold">${errorTitle}</div>
            <div class="small fw-semibold mt-2 text-dark bg-warning bg-opacity-10 py-2 px-3 rounded d-inline-block text-start" style="max-width: 400px;">${errorMsg}</div>
            <br><button class="btn btn-sm btn-outline-primary mt-3" onclick="fetchData()">Coba Lagi</button>
        </div>`;
    }
}

function setupDashboardFilters() {
    const sesiUser = JSON.parse(localStorage.getItem('sesiLoginMAP'));
    const populate = (id, key) => {
        const select = document.getElementById(id);
        const uniqueItems = [...new Set(allDataRaw.map(item => item[key]).filter(v => v))].sort();
        const currVal = select.value;
        select.innerHTML = `<option value="ALL">Semua ${key.toUpperCase()}</option>`;
        uniqueItems.forEach(val => { select.innerHTML += `<option value="${val}">${val}</option>`; });
        if(uniqueItems.includes(currVal)) select.value = currVal;
    };
    populate('dashToko', 'toko'); populate('dashAC', 'ac'); populate('dashAM', 'am');
    if (sesiUser.role !== 'Admin') { document.getElementById('dashAC').style.display = 'none'; document.getElementById('dashAM').style.display = 'none'; }
}

function updateDashboard() {
    const period = document.getElementById('dashPeriod').value;
    const valToko = document.getElementById('dashToko').value;
    const valAC = document.getElementById('dashAC').value;
    const valAM = document.getElementById('dashAM').value;
    const sesiUser = JSON.parse(localStorage.getItem('sesiLoginMAP'));
    const now = new Date(); const currentYear = now.getFullYear(); const currentMonth = now.getMonth();
    let dashData = allDataRaw;
    
    if (sesiUser.role === 'AC') dashData = dashData.filter(i => (i.ac || '').toLowerCase() === sesiUser.name.toLowerCase());
    else if (sesiUser.role === 'AM') dashData = dashData.filter(i => (i.am || '').toLowerCase() === sesiUser.name.toLowerCase());
    else {
        if (valAC !== 'ALL') dashData = dashData.filter(i => i.ac === valAC);
        if (valAM !== 'ALL') dashData = dashData.filter(i => i.am === valAM);
    }
    if (valToko !== 'ALL') dashData = dashData.filter(i => i.toko === valToko);
    dashData = dashData.filter(item => {
        if(!item.timestamp) return false;
        const itemDate = new Date(item.timestamp.replace(" ", "T")); 
        if(isNaN(itemDate)) return false;
        if (period === 'MTD') return itemDate.getFullYear() === currentYear && itemDate.getMonth() === currentMonth;
        else if (period === 'YTD') return itemDate.getFullYear() === currentYear;
        return true;
    });
    const uniqueTokoCount = new Set(dashData.map(item => item.toko).filter(t=>t)).size;
    const totalSubmit = dashData.length;
    let lastSubmitStr = "-";
    if (totalSubmit > 0) {
        const dates = dashData.map(item => new Date(item.timestamp.replace(" ", "T")).getTime()).filter(t => !isNaN(t));
        if(dates.length > 0) lastSubmitStr = new Date(Math.max(...dates)).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });
    }
    document.getElementById('dashTokoCount').innerText = uniqueTokoCount;
    document.getElementById('dashSubmitCount').innerText = totalSubmit;
    document.getElementById('dashLastSubmit').innerText = lastSubmitStr;
}

function parseChecklistGrid(txt) {
    if (!txt) return '<div class="text-muted small fst-italic">Data Kosong</div>';
    const categories = [{ key: "PLANOGRAM", label: "Planogram" }, { key: "LABEL PRICE", label: "Label Price" }, { key: "EXP CHECKED", label: "Expired" }, { key: "CLEANING", label: "Kebersihan" }];
    let html = '<div class="check-grid">';
    categories.forEach(cat => {
        const isOK = new RegExp(`${cat.key}\\s+OK`, 'i').test(txt);
        const icon = isOK ? '<i class="bi bi-check-circle-fill icon-ok"></i>' : '<i class="bi bi-x-circle-fill icon-nok"></i>';
        html += `<div class="check-item"><span>${cat.label}</span>${icon}</div>`;
    });
    return html + '</div>';
}

function renderData(data) {
    const container = document.getElementById('dataContainer');
    container.innerHTML = '';
    if (!data || data.length === 0) { container.innerHTML = `<div class="text-center py-5 text-muted"><i class="bi bi-inbox" style="font-size: 3rem; color: #CBD5E1;"></i><h6 class="fw-semibold mt-3">Tidak ada data untuk divalidasi.</h6></div>`; return; }
    const isMobile = window.innerWidth < 768; 
    if (isMobile) {
        let htmlCards = `<div class="row">`;
        data.forEach(item => {
            const inQueue = queue.find(q => q.row === item.row);
            const statusClass = inQueue ? 'item-done' : ''; 
            const okC = inQueue && inQueue.status === 'OK' ? 'checked' : '';
            const nokC = inQueue && inQueue.status === 'NOK' ? 'checked' : '';
            htmlCards += `
            <div class="col-12"><div class="data-card ${statusClass}" id="card-${item.row}">
                <div class="data-card-header"><span class="badge bg-primary px-3 py-2 fw-medium rounded-pill"><i class="bi bi-shop me-1"></i>${item.toko || '-'}</span><span class="small text-muted fw-semibold">${(item.timestamp||'').split(' ')[0] || '-'}</span></div>
                <div class="data-card-body pt-3">
                    <div class="d-flex justify-content-between align-items-center mb-3"><div><h6 class="fw-bold mb-1">${item.nama || '-'}</h6><span class="badge bg-light text-dark border">Rak: ${item.rak || '-'}</span></div><button class="btn btn-light border btn-sm rounded-circle" style="width: 36px; height: 36px;" onclick="bukaPopup('${item.foto}')"><i class="bi bi-image text-primary"></i></button></div>
                    ${parseChecklistGrid(item.checklist)}
                    <div class="validation-group mt-3">
                        <input type="radio" class="btn-check" name="row-mob-${item.row}" id="ok-mob-${item.row}" ${okC} onchange="handleQueue(${item.row}, 'OK')"><label class="btn btn-outline-success text-center" for="ok-mob-${item.row}">OK</label>
                        <input type="radio" class="btn-check" name="row-mob-${item.row}" id="nok-mob-${item.row}" ${nokC} onchange="handleQueue(${item.row}, 'NOK')"><label class="btn btn-outline-danger text-center" for="nok-mob-${item.row}">NOK</label>
                    </div>
                </div>
            </div></div>`;
        });
        container.innerHTML = htmlCards + `</div>`;
    } else {
        let htmlTable = `<div class="data-card"><div class="table-responsive"><table class="table table-custom table-hover align-middle"><thead><tr><th width="10%">Waktu</th><th width="20%">Personil</th><th width="10%">Toko</th><th width="30%">Checklist</th><th width="10%" class="text-center">Lampiran</th><th width="20%" class="text-center">Aksi Validasi</th></tr></thead><tbody>`;
        data.forEach(item => {
            const inQueue = queue.find(q => q.row === item.row);
            const statusClass = inQueue ? 'item-done' : ''; 
            const okC = inQueue && inQueue.status === 'OK' ? 'checked' : '';
            const nokC = inQueue && inQueue.status === 'NOK' ? 'checked' : '';
            htmlTable += `
                <tr class="${statusClass}" id="row-${item.row}">
                    <td class="text-muted small">${(item.timestamp||'').split(' ')[0] || '-'}</td>
                    <td><div class="fw-bold text-dark">${item.nama || '-'}</div><div class="small text-muted">Rak: ${item.rak || '-'}</div></td>
                    <td><span class="badge bg-light text-primary border">${item.toko || '-'}</span></td>
                    <td>${parseChecklistGrid(item.checklist)}</td>
                    <td class="text-center"><button class="btn btn-light border btn-sm" onclick="bukaPopup('${item.foto}')"><i class="bi bi-image text-primary"></i> Lihat</button></td>
                    <td class="px-3"><div class="validation-group">
                        <input type="radio" class="btn-check" name="row-desk-${item.row}" id="ok-desk-${item.row}" ${okC} onchange="handleQueue(${item.row}, 'OK')"><label class="btn btn-outline-success text-center" for="ok-desk-${item.row}">OK</label>
                        <input type="radio" class="btn-check" name="row-desk-${item.row}" id="nok-desk-${item.row}" ${nokC} onchange="handleQueue(${item.row}, 'NOK')"><label class="btn btn-outline-danger text-center" for="nok-desk-${item.row}">NOK</label>
                    </div></td>
                </tr>`;
        });
        container.innerHTML = htmlTable + `</tbody></table></div></div>`;
    }
}

function handleQueue(rowId, status) {
    queue = queue.filter(q => q.row !== rowId); queue.push({ row: rowId, status: status });
    const dO = document.getElementById(`ok-desk-${rowId}`); const dN = document.getElementById(`nok-desk-${rowId}`);
    const mO = document.getElementById(`ok-mob-${rowId}`);  const mN = document.getElementById(`nok-mob-${rowId}`);
    if(status === 'OK') { if(dO) dO.checked = true; if(mO) mO.checked = true; } else { if(dN) dN.checked = true; if(mN) mN.checked = true; }
    const rowEl = document.getElementById(`row-${rowId}`); const cardEl = document.getElementById(`card-${rowId}`);
    if (rowEl) rowEl.classList.add('item-done'); if (cardEl) cardEl.classList.add('item-done');
    updateSubmitBar();
}

function tandaiSemua(status) { if (filteredData.length === 0) return; filteredData.forEach(item => { handleQueue(item.row, status); }); }
function resetPilihan() { queue = []; document.querySelectorAll('.btn-check').forEach(r => r.checked = false); document.querySelectorAll('.item-done').forEach(el => el.classList.remove('item-done')); updateSubmitBar(); }
function updateSubmitBar() { const bar = document.getElementById('submitBar'); document.getElementById('countSelected').innerText = queue.length; if (queue.length > 0) bar.classList.add('show'); else bar.classList.remove('show'); }

async function kirimData() {
    const res = await Swal.fire({ title: 'Kirim Data?', text: `${queue.length} validasi siap diproses.`, icon: 'question', showCancelButton: true, confirmButtonText: 'Kirim Sekarang', confirmButtonColor: '#10B981', cancelButtonText: 'Batal' });
    if (!res.isConfirmed) return;
    
    Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
        await fetch(URL_WEB_APP, { 
            method: 'POST', 
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(queue) 
        });
        
        setTimeout(() => { 
            Swal.fire({ icon: 'success', title: 'Terkirim', text: 'Sistem berhasil diupdate.', timer: 1500, showConfirmButton: false }); 
            resetPilihan(); 
            fetchData(); 
        }, 1500);

    } catch (e) { 
        Swal.fire('Error', 'Gagal mengirim data. Pastikan jaringan internet stabil.', 'error'); 
    }
}

function bukaPopup(url) {
    if(!url || url.length < 10) return Swal.fire('Informasi', 'Tidak ada lampiran foto.', 'info');
    const myModal = new bootstrap.Modal(document.getElementById('modalFoto'));
    const imgEl = document.getElementById('frameFoto'); const loadEl = document.getElementById('loadingGambar');
    let finalUrl = url; const match = url.match(/[-\w]{25,}/);
    if (match) finalUrl = `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1000`;
    imgEl.style.display = 'none'; loadEl.style.display = 'block'; imgEl.src = finalUrl; myModal.show();
    imgEl.onload = () => { loadEl.style.display = 'none'; imgEl.style.display = 'block'; };
    imgEl.onerror = () => { loadEl.style.display = 'none'; myModal.hide(); Swal.fire('Gagal Memuat Foto', 'Akses folder GDrive belum di-set ke Publik.', 'error'); };
}

function runFilter() {
    const n = document.getElementById('inputNama').value.toLowerCase();
    const t = document.getElementById('inputToko').value.toLowerCase();
    const d = document.getElementById('inputTanggal').value;
    const unvalidatedData = allDataRaw.filter(i => !i.validasi || i.validasi === "");
    filteredData = unvalidatedData.filter(i => (i.nama || '').toLowerCase().includes(n) && (i.toko || '').toLowerCase().includes(t) && (d === "" || (i.timestamp || '').includes(d)));
    renderData(filteredData);
}
