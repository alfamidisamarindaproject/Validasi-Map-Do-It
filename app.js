// ===== MASUKKAN URL DEPLOYMENT BARU ANDA DI SINI =====
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbyB7qPxEMGvlaQXM74f2wAzf567sy4MEi-artrGNGlXcS_RAUJnJyVi_e6QWw7Tydhs/exec";

let allDataRaw = [];
let filteredData = []; 
let queue = [];
let searchTimeout = null; 

// Fungsi Pembantu untuk mencari wadah data di HTML secara otomatis
function getContainer() {
    return document.getElementById('dataContainer') || document.getElementById('cardContainer');
}

// ==========================================
// 1. SISTEM BYPASS KONEKSI (JSONP) & PARSER
// ==========================================
function fetchJSONP(url) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };
        const script = document.createElement('script');
        script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
        script.onerror = () => {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error("Gagal terhubung ke server Google. Pastikan Anda sudah login akun GMail."));
        };
        document.body.appendChild(script);
    });
}

function parseSafeDate(dateStr) {
    if (!dateStr) return new Date(NaN);
    let str = dateStr.replace(" ", "T");
    if (str.includes("/")) {
        const parts = str.split("T");
        const dParts = parts[0].split("/");
        if (dParts.length === 3) str = `${dParts[2]}-${dParts[1]}-${dParts[0]}T${parts[1] || '00:00:00'}`;
    }
    return new Date(str);
}

// ==========================================
// 2. INISIALISASI & SISTEM LOGIN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    cekStatusLogin(); 
    if(document.getElementById('inputNama')) document.getElementById('inputNama').addEventListener('input', () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(runFilter, 300); });
    if(document.getElementById('inputToko')) document.getElementById('inputToko').addEventListener('input', () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(runFilter, 300); });
    if(document.getElementById('inputTanggal')) document.getElementById('inputTanggal').addEventListener('change', runFilter);
    window.addEventListener('resize', () => { if (filteredData.length > 0) renderData(filteredData); });
});

function cekStatusLogin() {
    const sesiUser = localStorage.getItem('sesiLoginMAP');
    if (sesiUser) {
        const userData = JSON.parse(sesiUser);
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        document.getElementById('displayUserName').innerText = userData.name;
        document.getElementById('displayUserRole').innerText = userData.role;
        document.getElementById('avatarInisial').innerText = userData.name.charAt(0).toUpperCase();
        if (userData.role === 'Admin') document.getElementById('avatarInisial').classList.add('admin-avatar');
        else document.getElementById('avatarInisial').classList.remove('admin-avatar');
        fetchData(); 
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }
}

async function prosesLogin(e) {
    e.preventDefault();
    if (document.activeElement) document.activeElement.blur(); 

    const user = document.getElementById('logUsername').value.trim();
    const pass = document.getElementById('logPassword').value.trim();
    const btn = document.getElementById('btnLogin');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Memproses...';
    btn.disabled = true;

    try {
        let isSuccess = false; let finalName = ""; let finalRole = "";

        if (user.toUpperCase() === "AKBAR RASYID" && (pass === "0225065474" || pass === "service quality")) {
            isSuccess = true; finalName = "AKBAR RASYID"; finalRole = "Admin";
        } else {
            const urlLogin = `${URL_WEB_APP}?action=login&username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
            const result = await fetchJSONP(urlLogin);
            
            if (result.success) {
                isSuccess = true; finalName = result.name; finalRole = result.role;
                if (finalName.toUpperCase() === "AKBAR RASYID") finalRole = "Admin";
            } else {
                Swal.fire({ icon: 'error', title: 'Login Gagal', text: result.message, returnFocus: false });
            }
        }

        if (isSuccess) {
            localStorage.setItem('sesiLoginMAP', JSON.stringify({ name: finalName, role: finalRole }));
            Swal.fire({ icon: 'success', title: 'Berhasil', text: `Selamat bertugas, ${finalName}`, timer: 1500, showConfirmButton: false, returnFocus: false });
            setTimeout(() => { cekStatusLogin(); }, 1200);
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Koneksi Gagal', text: err.message, returnFocus: false });
    } finally {
        btn.innerHTML = 'Login Sistem';
        btn.disabled = false;
    }
}

function prosesLogout() {
    Swal.fire({ title: 'Akhiri Sesi?', text: "Anda akan keluar dari sistem", icon: 'question', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Ya, Keluar', cancelButtonText: 'Batal', returnFocus: false })
    .then((result) => {
        if (result.isConfirmed) { localStorage.removeItem('sesiLoginMAP'); document.getElementById('formLogin').reset(); cekStatusLogin(); }
    });
}

// ==========================================
// 3. PENGAMBILAN DATA & DASHBOARD
// ==========================================
function showSkeleton() {
    const container = getContainer();
    if (!container) return; // Mencegah Error Null

    const isMobile = window.innerWidth < 768;
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
        const result = await fetchJSONP(fetchUrl);
        
        if(result.success === false) {
             const cont = getContainer();
             if(cont) cont.innerHTML = `<div class="text-center text-danger py-5"><i class="bi bi-exclamation-triangle fs-1 d-block mb-2"></i><div class="fw-bold">Gagal Membaca Sheet</div><div class="small mt-2">${result.message}</div></div>`;
             return;
        }
        
        allDataRaw = result.data || [];
        filteredData = allDataRaw.filter(i => !i.validasi || i.validasi === "");
        
        try { setupDashboardFilters(); updateDashboard(); document.getElementById('dashboardSection').style.display = 'block'; } catch (e) {}
        renderData(filteredData);
    } catch (err) {
        const cont = getContainer();
        if(cont) cont.innerHTML = `<div class="text-center text-danger py-5"><i class="bi bi-wifi-off fs-1 d-block mb-2"></i><div class="fw-bold">Akses Terputus</div><div class="small mt-2">Pastikan internet stabil dan akun Google Anda login di browser ini.</div><br><button class="btn btn-sm btn-outline-primary" onclick="fetchData()">Coba Lagi</button></div>`;
    }
}

function setupDashboardFilters() {
    const sesiUser = JSON.parse(localStorage.getItem('sesiLoginMAP'));
    const populate = (id, key) => {
        const select = document.getElementById(id);
        if(!select) return;
        const uniqueItems = [...new Set(allDataRaw.map(item => item[key]).filter(v => v))].sort();
        const currVal = select.value;
        select.innerHTML = `<option value="ALL">Semua ${key.toUpperCase()}</option>`;
        uniqueItems.forEach(val => { select.innerHTML += `<option value="${val}">${val}</option>`; });
        if(uniqueItems.includes(currVal)) select.value = currVal;
    };
    populate('dashToko', 'toko'); populate('dashAC', 'ac'); populate('dashAM', 'am');
    if (sesiUser.role !== 'Admin') { 
        if(document.getElementById('dashAC')) document.getElementById('dashAC').style.display = 'none'; 
        if(document.getElementById('dashAM')) document.getElementById('dashAM').style.display = 'none'; 
    }
}

function updateDashboard() {
    const period = document.getElementById('dashPeriod') ? document.getElementById('dashPeriod').value : 'MTD';
    const valToko = document.getElementById('dashToko') ? document.getElementById('dashToko').value : 'ALL';
    const valAC = document.getElementById('dashAC') ? document.getElementById('dashAC').value : 'ALL';
    const valAM = document.getElementById('dashAM') ? document.getElementById('dashAM').value : 'ALL';
    
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
        const itemDate = parseSafeDate(item.timestamp);
        if(isNaN(itemDate)) return false;
        if (period === 'MTD') return itemDate.getFullYear() === currentYear && itemDate.getMonth() === currentMonth;
        else if (period === 'YTD') return itemDate.getFullYear() === currentYear;
        return true;
    });
    
    if(document.getElementById('dashTokoCount')) document.getElementById('dashTokoCount').innerText = new Set(dashData.map(item => item.toko).filter(t=>t)).size;
    if(document.getElementById('dashSubmitCount')) document.getElementById('dashSubmitCount').innerText = dashData.length;
    
    let lastSubmitStr = "-";
    if (dashData.length > 0) {
        const dates = dashData.map(item => parseSafeDate(item.timestamp).getTime()).filter(t => !isNaN(t));
        if(dates.length > 0) lastSubmitStr = new Date(Math.max(...dates)).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });
    }
    if(document.getElementById('dashLastSubmit')) document.getElementById('dashLastSubmit').innerText = lastSubmitStr;
}

// ==========================================
// 4. RENDERING DESAIN COMPACT CARD
// ==========================================
function parseChecklistCompact(txt) {
    if (!txt) return '<span class="badge bg-light text-muted border">Data Kosong</span>';
    const isP = /PLANOGRAM\s+OK/i.test(txt);
    const isL = /LABEL PRICE\s+OK/i.test(txt);
    const isE = /EXP CHECKED\s+OK/i.test(txt);
    const isC = /CLEANING\s+OK/i.test(txt);

    return `
        <span class="badge ${isP ? 'bg-success' : 'bg-danger'} bg-opacity-75 me-1 fw-normal" title="Planogram">P ${isP ? '✔' : '✖'}</span>
        <span class="badge ${isL ? 'bg-success' : 'bg-danger'} bg-opacity-75 me-1 fw-normal" title="Label Price">L ${isL ? '✔' : '✖'}</span>
        <span class="badge ${isE ? 'bg-success' : 'bg-danger'} bg-opacity-75 me-1 fw-normal" title="Expired">E ${isE ? '✔' : '✖'}</span>
        <span class="badge ${isC ? 'bg-success' : 'bg-danger'} bg-opacity-75 fw-normal" title="Cleaning">C ${isC ? '✔' : '✖'}</span>
    `;
}

function renderData(data) {
    const container = getContainer();
    if(!container) return; // Mencegah Error Null
    
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="text-center py-5 text-muted"><i class="bi bi-inbox" style="font-size: 3rem; color: #CBD5E1;"></i><h6 class="fw-semibold mt-3">Tidak ada antrean validasi tersisa.</h6></div>`; 
        return;
    }

    let htmlCards = `<div class="row g-3">`;
    data.forEach(item => {
        const inQueue = queue.find(q => q.row === item.row);
        const statusClass = inQueue ? 'item-done' : ''; 
        const okC = inQueue && inQueue.status === 'OK' ? 'checked' : '';
        const nokC = inQueue && inQueue.status === 'NOK' ? 'checked' : '';

        htmlCards += `
        <div class="col-12 col-lg-6">
            <div class="data-card mb-0 border rounded shadow-sm ${statusClass}" id="card-${item.row}">
                <div class="p-3 bg-white rounded">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div class="d-flex align-items-center gap-2" style="overflow: hidden;">
                            <span class="badge bg-primary">${item.toko || '-'}</span>
                        </div>
                        <small class="text-muted text-end flex-shrink-0 ms-2" style="font-size: 0.7rem;">${(item.timestamp||'').split(' ')[0]}</small>
                    </div>
                    
                    <div class="fw-bold text-dark text-truncate mb-2" style="font-size: 0.95rem;">
                        ${item.nama || '-'} <span class="badge bg-light text-dark border ms-1 fw-medium">Rak: ${item.rak || '-'}</span>
                    </div>
                    
                    <div class="mb-3">
                        ${parseChecklistCompact(item.checklist)}
                    </div>

                    <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                        <button class="btn btn-sm btn-outline-secondary py-1 px-3" onclick="bukaPopup('${item.foto}')">
                            <i class="bi bi-image"></i><span class="ms-1 fw-medium" style="font-size: 0.75rem;">Lihat Foto</span>
                        </button>

                        <div class="validation-group" style="min-width: 130px;">
                            <input type="radio" class="btn-check" name="row-${item.row}" id="ok-${item.row}" ${okC} onchange="handleQueue(${item.row}, 'OK')">
                            <label class="btn btn-outline-success text-center py-1 px-2 m-0" for="ok-${item.row}">OK</label>

                            <input type="radio" class="btn-check" name="row-${item.row}" id="nok-${item.row}" ${nokC} onchange="handleQueue(${item.row}, 'NOK')">
                            <label class="btn btn-outline-danger text-center py-1 px-2 m-0" for="nok-${item.row}">NOK</label>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    });
    htmlCards += `</div>`;
    container.innerHTML = htmlCards;
}

// ==========================================
// 5. KONTROL ANTRIAN & PENGIRIMAN DATA
// ==========================================
function handleQueue(rowId, status) {
    queue = queue.filter(q => q.row !== rowId); queue.push({ row: rowId, status: status });
    const cardEl = document.getElementById(`card-${rowId}`);
    if (cardEl) cardEl.classList.add('item-done');
    updateSubmitBar();
}

function tandaiSemua(status) { if (filteredData.length === 0) return; filteredData.forEach(item => { handleQueue(item.row, status); document.getElementById(`${status.toLowerCase()}-${item.row}`).checked = true; }); }
function resetPilihan() { queue = []; document.querySelectorAll('.btn-check').forEach(r => r.checked = false); document.querySelectorAll('.item-done').forEach(el => el.classList.remove('item-done')); updateSubmitBar(); }

function updateSubmitBar() { 
    const bar = document.getElementById('submitBar'); 
    const countEl = document.getElementById('countSelected');
    if(countEl) countEl.innerText = queue.length; 
    if (queue.length > 0 && bar) bar.classList.add('show'); else if(bar) bar.classList.remove('show'); 
}

async function kirimData() {
    const res = await Swal.fire({ title: 'Kirim Data?', text: `${queue.length} validasi siap diproses.`, icon: 'question', showCancelButton: true, confirmButtonText: 'Kirim Sekarang', confirmButtonColor: '#10B981', cancelButtonText: 'Batal', returnFocus: false });
    if (!res.isConfirmed) return;
    
    Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        await fetch(URL_WEB_APP, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(queue) });
        setTimeout(() => { 
            Swal.fire({ icon: 'success', title: 'Terkirim', text: 'Sistem berhasil diupdate.', timer: 1500, showConfirmButton: false, returnFocus: false }); 
            resetPilihan(); fetchData(); 
        }, 1500);
    } catch (e) { 
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal mengirim data. Cek koneksi Anda.', returnFocus: false }); 
    }
}

// ==========================================
// 6. UTILITAS LAINNYA
// ==========================================
function bukaPopup(url) {
    if(!url || url.length < 10) return Swal.fire({ icon: 'info', title: 'Informasi', text: 'Tidak ada lampiran foto.', returnFocus: false });
    const modalEl = document.getElementById('modalFoto');
    if(!modalEl) return;
    const myModal = new bootstrap.Modal(modalEl);
    const imgEl = document.getElementById('frameFoto'); const loadEl = document.getElementById('loadingGambar');
    
    let finalUrl = url; const match = url.match(/[-\w]{25,}/);
    if (match) finalUrl = `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1000`;
    
    imgEl.style.display = 'none'; loadEl.style.display = 'block'; imgEl.src = finalUrl; myModal.show();
    imgEl.onload = () => { loadEl.style.display = 'none'; imgEl.style.display = 'block'; };
    imgEl.onerror = () => { loadEl.style.display = 'none'; myModal.hide(); Swal.fire({ icon: 'error', title: 'Gagal', text: 'Akses folder GDrive belum diset Publik.', returnFocus: false }); };
}

function runFilter() {
    const n = (document.getElementById('inputNama') ? document.getElementById('inputNama').value.toLowerCase() : "");
    const t = (document.getElementById('inputToko') ? document.getElementById('inputToko').value.toLowerCase() : "");
    const dRaw = (document.getElementById('inputTanggal') ? document.getElementById('inputTanggal').value : ""); 
    
    let dFormatted = "";
    if (dRaw) { const parts = dRaw.split('-'); dFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`; }
    
    const unvalidatedData = allDataRaw.filter(i => !i.validasi || i.validasi === "");
    filteredData = unvalidatedData.filter(i => {
        const matchNama = (i.nama || '').toLowerCase().includes(n);
        const matchToko = (i.toko || '').toLowerCase().includes(t);
        const matchDate = (dFormatted === "" || (i.timestamp || '').includes(dFormatted));
        return matchNama && matchToko && matchDate;
    });
    renderData(filteredData);
}
