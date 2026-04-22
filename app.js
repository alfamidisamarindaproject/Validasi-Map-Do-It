// GANTI DENGAN URL DEPLOYMENT TERBARU ANDA
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbzXYxvcB_BEE-bZGoDZTZfClTrOyGTaESvFEcgPgsToAh8HX48xRCYOLhJQ4Ax9rwc/exec";

let allDataRaw = [];
let queue = [];
let searchTimeout = null; 

// PENCARI KOTAK OTOMATIS (Mencegah Layar Loading Abadi)
function getContainer() {
    return document.getElementById('cardContainer') || document.getElementById('dataContainer');
}

// TRIK BYPASS CORS GOOGLE VIA JSONP
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
            reject(new Error("Koneksi gagal. Pastikan tab ini sudah login ke akun Google perusahaan Anda."));
        };
        document.body.appendChild(script);
    });
}

window.onload = () => {
    setupEventListeners();
    fetchData();
};

function setupEventListeners() {
    ['inputNama', 'inputToko'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(runFilter, 300); });
    });
    ['filterAC', 'filterAM'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', runFilter);
    });
}

function showSkeleton() {
    const container = getContainer();
    if (!container) return; // Aman dari error null
    
    const isMobile = window.innerWidth < 768;
    let html = isMobile ? '<div class="row">' : '<div class="data-card p-4">';
    for(let i=0; i<3; i++) {
        if(isMobile) html += `<div class="col-12"><div class="data-card p-3 mb-3 placeholder-glow"><span class="placeholder col-4 mb-2 rounded"></span><br><span class="placeholder col-8 rounded mb-3"></span><div class="placeholder col-12 rounded" style="height: 60px;"></div></div></div>`;
        else html += `<div class="placeholder-glow mb-3"><span class="placeholder col-12 rounded" style="height: 50px;"></span></div>`;
    }
    container.innerHTML = html + (isMobile ? '</div>' : '</div>');
}

// 1. PENGAMBILAN DATA (Menggunakan JSONP)
async function fetchData() {
    showSkeleton(); queue = []; updateSubmitBar();
    try {
        const fetchUrl = `${URL_WEB_APP}?action=getData`;
        const result = await fetchJSONP(fetchUrl);
        
        if (result.success) {
            allDataRaw = (result.data || []).filter(i => !i.validasi || i.validasi === "");
            populateDropdowns();
            runFilter(); 
        } else {
            throw new Error(result.message || "Gagal mengambil data");
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        const cont = getContainer();
        if(cont) {
            cont.innerHTML = `
                <div class="text-center text-danger py-5">
                    <i class="bi bi-shield-x fs-1 d-block mb-2"></i>
                    <div class="fw-bold">Akses Diblokir / Terputus</div>
                    <div class="small mt-2 mx-auto" style="max-width: 400px;">
                        ${err.message}
                    </div>
                    <button class="btn btn-sm btn-outline-primary mt-3" onclick="fetchData()">Coba Lagi</button>
                </div>`;
        }
    }
}

function populateDropdowns() {
    const acSelect = document.getElementById('filterAC');
    const amSelect = document.getElementById('filterAM');
    if(!acSelect || !amSelect) return;

    const uniqueAC = [...new Set(allDataRaw.map(item => item.ac).filter(v => v !== ""))].sort();
    const uniqueAM = [...new Set(allDataRaw.map(item => item.am).filter(v => v !== ""))].sort();

    const currAC = acSelect.value;
    const currAM = amSelect.value;

    acSelect.innerHTML = `<option value="ALL">Semua AC</option>`;
    uniqueAC.forEach(val => acSelect.innerHTML += `<option value="${val}">${val}</option>`);
    if(uniqueAC.includes(currAC)) acSelect.value = currAC;

    amSelect.innerHTML = `<option value="ALL">Semua AM</option>`;
    uniqueAM.forEach(val => amSelect.innerHTML += `<option value="${val}">${val}</option>`);
    if(uniqueAM.includes(currAM)) amSelect.value = currAM;
}

// 2. SISTEM FILTER GABUNGAN
function runFilter() {
    const n = (document.getElementById('inputNama') ? document.getElementById('inputNama').value.toLowerCase() : "");
    const t = (document.getElementById('inputToko') ? document.getElementById('inputToko').value.toLowerCase() : "");
    const valAC = (document.getElementById('filterAC') ? document.getElementById('filterAC').value : "ALL");
    const valAM = (document.getElementById('filterAM') ? document.getElementById('filterAM').value : "ALL");
    
    const filtered = allDataRaw.filter(i => {
        const matchNama = (i.nama || '').toLowerCase().includes(n);
        const matchToko = (i.toko || '').toLowerCase().includes(t);
        const matchAC = (valAC === "ALL" || i.ac === valAC);
        const matchAM = (valAM === "ALL" || i.am === valAM);
        
        return matchNama && matchToko && matchAC && matchAM;
    });
    
    renderTable(filtered);
}

// 3. MERENDER DATA DENGAN DESAIN COMPACT CARD
function renderTable(data) {
    const container = getContainer();
    if(!container) return; 
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="text-center py-5 text-muted"><i class="bi bi-check2-circle" style="font-size: 3rem; color: #CBD5E1;"></i><h6 class="fw-semibold mt-3">Semua data sesuai filter telah tervalidasi.</h6></div>`; 
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

// 4. KONTROL ANTRIAN & PENGIRIMAN DATA
function handleQueue(rowId, status) {
    queue = queue.filter(q => q.row !== rowId); queue.push({ row: rowId, status: status });
    const cardEl = document.getElementById(`card-${rowId}`);
    if (cardEl) cardEl.classList.add('item-done');
    updateSubmitBar();
}

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

// 5. POPUP FOTO
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
