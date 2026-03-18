// GANTI DENGAN URL WEB APP ANDA YANG BARU
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbxilq1gd1uGA4kKNR1QO1hEOHksVgA6rTgP-f_VfV1o3yiYHrf3NKg4zeE6ldS6fHUt/exec";

let allDataRaw = [];
let filteredData = []; 
let queue = [];

document.addEventListener('DOMContentLoaded', () => {
    cekStatusLogin(); 

    const inputElements = ['inputNama', 'inputToko', 'inputTanggal'];
    inputElements.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', runFilter);
            el.addEventListener('change', runFilter);
        }
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
        
        fetchData(); 
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }
}

async function prosesLogin(e) {
    e.preventDefault();
    
    // Gunakan trim() untuk membuang spasi di awal/akhir input
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
                title: `Berhasil!`,
                text: `Selamat datang, ${result.name}`,
                timer: 1500,
                showConfirmButton: false
            });
            
            setTimeout(() => { cekStatusLogin(); }, 1500);
        } else {
            Swal.fire('Login Gagal', result.message, 'error');
        }
    } catch (err) {
        Swal.fire('Koneksi Error', 'Gagal memverifikasi login. Cek URL atau koneksi Anda.', 'error');
    } finally {
        btn.innerHTML = 'MASUK KE SISTEM <i class="bi bi-box-arrow-in-right ms-2"></i>';
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
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-primary mb-3"></div><h5 class="text-muted fw-bold">Mengambil data dari server...</h5></td></tr>`;
    queue = []; updateSubmitBar();

    try {
        const response = await fetch(URL_WEB_APP);
        const data = await response.json();
        
        allDataRaw = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : []);
        filteredData = [...allDataRaw];
        renderTable(filteredData);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-5"><i class="bi bi-wifi-off fs-1 d-block mb-3"></i><h5 class="fw-bold">Gagal Mengambil Data</h5></td></tr>`;
    }
}

function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted"><i class="bi bi-inbox fs-1 d-block mb-3 opacity-50"></i><span class="fw-bold">Semua data sudah divalidasi.</span></td></tr>`;
        return;
    }

    data.forEach(item => {
        const inQueue = queue.find(q => q.row === item.row);
        const isOkChecked = inQueue && inQueue.status === 'OK' ? 'checked' : '';
        const isNokChecked = inQueue && inQueue.status === 'NOK' ? 'checked' : '';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="small text-muted ps-4">${item.timestamp || '-'}</td>
            <td class="fw-bold text-dark">${item.nama || '-'}</td>
            <td><span class="badge bg-light text-primary border border-primary px-2 py-1">${item.toko || '-'}</span></td>
            <td class="fw-bold">${item.rak || '-'}</td>
            <td>${parseChecklist(item.checklist)}</td>
            <td><button class="btn btn-sm btn-dark px-3 fw-bold shadow-sm rounded-pill" onclick="bukaPopup('${item.foto}')"><i class="bi bi-image me-1"></i> Lihat Foto</button></td>
            <td class="text-center pe-4">
                <div class="validation-group btn-group shadow-sm">
                    <input type="radio" class="btn-check" name="row-${item.row}" id="ok-${item.row}" ${isOkChecked} onchange="handleQueue(${item.row}, 'OK')">
                    <label class="btn btn-outline-success px-3" for="ok-${item.row}">OK</label>

                    <input type="radio" class="btn-check" name="row-${item.row}" id="nok-${item.row}" ${isNokChecked} onchange="handleQueue(${item.row}, 'NOK')">
                    <label class="btn btn-outline-danger px-3" for="nok-${item.row}">NOK</label>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function parseChecklist(txt) {
    if (!txt) return '<span class="text-muted fst-italic">Kosong</span>';
    const categories = [{ key: "PLANOGRAM", label: "Planogram" }, { key: "LABEL PRICE", label: "Label Price" }, { key: "EXP CHECKED", label: "Expired Check" }, { key: "CLEANING", label: "Kebersihan" }];
    let html = '<div class="checklist-box">';
    categories.forEach(cat => {
        const isOK = new RegExp(`${cat.key}\\s+OK`, 'i').test(txt);
        html += `<div class="checklist-item"><span class="fw-semibold text-secondary">${cat.label}</span><span class="status-pill ${isOK ? 'status-ok' : 'status-nok'}">${isOK ? 'OK' : 'NOK'}</span></div>`;
    });
    return html + '</div>';
}

function handleQueue(rowId, status) {
    queue = queue.filter(q => q.row !== rowId);
    queue.push({ row: rowId, status: status });
    updateSubmitBar();
}

function tandaiSemua(status) {
    if (filteredData.length === 0) return;
    filteredData.forEach(item => {
        const radio = document.getElementById(`${status.toLowerCase()}-${item.row}`);
        if(radio) { radio.checked = true; handleQueue(item.row, status); }
    });
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `${filteredData.length} data ditandai ${status}`, showConfirmButton: false, timer: 1500 });
}

function resetPilihan() { queue = []; document.querySelectorAll('.btn-check').forEach(r => r.checked = false); updateSubmitBar(); }

function updateSubmitBar() {
    const bar = document.getElementById('submitBar');
    document.getElementById('countSelected').innerText = queue.length;
    bar.style.display = queue.length > 0 ? 'block' : 'none';
}

async function kirimData() {
    const res = await Swal.fire({ title: 'Simpan Validasi?', text: `${queue.length} data akan disimpan.`, icon: 'question', showCancelButton: true, confirmButtonText: 'Ya, Simpan', confirmButtonColor: '#198754' });
    if (!res.isConfirmed) return;

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        await fetch(URL_WEB_APP, { method: 'POST', mode: 'no-cors', body: JSON.stringify(queue) });
        setTimeout(() => { Swal.fire({ icon: 'success', title: 'Berhasil disimpan', timer: 1500, showConfirmButton: false }); fetchData(); }, 1500);
    } catch (e) { Swal.fire('Error', 'Gagal mengirim data!', 'error'); }
}

function bukaPopup(url) {
    if(!url || url.length < 10) return Swal.fire('Info', 'Tidak ada foto.', 'info');
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
    renderTable(filteredData);
}
