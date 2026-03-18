const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbxfbhf3FqnbLdIDdSTxNduCzMdqq5Gw0dfvGJAiKj-b0LUec7Ups_9pJO6rqbBJpJZV/exec";

let allDataRaw = [];
let filteredData = []; 
let queue = [];

// Memastikan script baru berjalan setelah elemen HTML selesai dimuat sepenuhnya
document.addEventListener('DOMContentLoaded', () => {
    fetchData();

    // Memasang event listener ke input pencarian dengan aman
    const inputElements = ['inputNama', 'inputToko', 'inputTanggal'];
    inputElements.forEach(id => {
        const element = document.getElementById(id);
        if(element) {
            element.addEventListener('input', runFilter);
            element.addEventListener('change', runFilter); // Untuk elemen tanggal
        }
    });
});

async function fetchData() {
    const tbody = document.getElementById('tableBody');
    
    // Status Loading
    tbody.innerHTML = `
        <tr><td colspan="7" class="text-center py-5">
            <div class="spinner-border text-primary mb-3" role="status"></div>
            <h5 class="text-muted fw-bold">Mengambil data terbaru dari GSheet...</h5>
        </td></tr>`;
        
    queue = [];
    updateSubmitBar();

    try {
        const response = await fetch(URL_WEB_APP);
        const data = await response.json();
        
        // Memastikan format data yang diterima adalah Array
        allDataRaw = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : []);
        filteredData = [...allDataRaw];
        
        renderTable(filteredData);
    } catch (err) {
        console.error("Error mengambil data: ", err);
        tbody.innerHTML = `
            <tr><td colspan="7" class="text-center text-danger py-5">
                <i class="bi bi-wifi-off fs-1 d-block mb-3"></i>
                <h5 class="fw-bold">Koneksi Terputus / Gagal Mengambil Data</h5>
                <p class="small text-muted mb-0">Pastikan URL Web App sudah benar dan publik.</p>
                <code class="small">${err.message}</code>
            </td></tr>`;
    }
}

function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="7" class="text-center py-5 text-muted">
                <i class="bi bi-inbox fs-1 d-block mb-3 opacity-50"></i>
                <span class="fw-bold">Data kosong atau semua data sudah divalidasi.</span>
            </td></tr>`;
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
            <td>
                <button class="btn btn-sm btn-dark px-3 fw-bold shadow-sm rounded-pill" onclick="bukaPopup('${item.foto}')">
                    <i class="bi bi-image me-1"></i> Lihat Foto
                </button>
            </td>
            <td class="text-center pe-4">
                <div class="validation-group btn-group shadow-sm" role="group">
                    <input type="radio" class="btn-check" name="row-${item.row}" id="ok-${item.row}" autocomplete="off" ${isOkChecked} onchange="handleQueue(${item.row}, 'OK')">
                    <label class="btn btn-outline-success px-3" for="ok-${item.row}"><i class="bi bi-check-lg me-1"></i>OK</label>

                    <input type="radio" class="btn-check" name="row-${item.row}" id="nok-${item.row}" autocomplete="off" ${isNokChecked} onchange="handleQueue(${item.row}, 'NOK')">
                    <label class="btn btn-outline-danger px-3" for="nok-${item.row}"><i class="bi bi-x-lg me-1"></i>NOK</label>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function parseChecklist(txt) {
    if (!txt) return '<span class="text-muted fst-italic">Data Kosong</span>';
    
    const categories = [
        { key: "PLANOGRAM", label: "Planogram" },
        { key: "LABEL PRICE", label: "Label Price" },
        { key: "EXP CHECKED", label: "Expired Check" },
        { key: "CLEANING", label: "Kebersihan Rak" }
    ];

    let html = '<div class="checklist-box">';
    categories.forEach(cat => {
        const regex = new RegExp(`${cat.key}\\s+OK`, 'i');
        const isOK = regex.test(txt);
        
        html += `
            <div class="checklist-item">
                <span class="fw-semibold text-secondary">${cat.label}</span>
                <span class="status-pill ${isOK ? 'status-ok' : 'status-nok'}">
                    ${isOK ? '<i class="bi bi-check-circle-fill me-1"></i>OK' : '<i class="bi bi-x-circle-fill me-1"></i>NOK'}
                </span>
            </div>`;
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
        if(radio) {
            radio.checked = true;
            handleQueue(item.row, status);
        }
    });
    
    Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: `${filteredData.length} data ditandai ${status}`,
        showConfirmButton: false, timer: 1500
    });
}

function resetPilihan() {
    queue = [];
    document.querySelectorAll('.btn-check').forEach(radio => radio.checked = false);
    updateSubmitBar();
}

function updateSubmitBar() {
    const bar = document.getElementById('submitBar');
    document.getElementById('countSelected').innerText = queue.length;
    
    if (queue.length > 0) {
        bar.style.display = 'block';
    } else {
        bar.style.display = 'none';
    }
}

async function kirimData() {
    if (typeof Swal === 'undefined') {
        alert("Sistem masih memuat. Pastikan koneksi internet stabil.");
        return;
    }

    const result = await Swal.fire({
        title: 'Simpan Validasi?',
        text: `Anda akan menyimpan hasil validasi untuk ${queue.length} data.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Ya, Simpan!',
        cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'Menyimpan...',
        text: 'Mohon tunggu, sedang mengirim ke Google Sheet.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading() }
    });

    try {
        await fetch(URL_WEB_APP, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(queue)
        });
        
        setTimeout(() => {
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Data validasi berhasil disimpan.',
                timer: 2000,
                showConfirmButton: false
            });
            fetchData();
        }, 1500);
    } catch (e) {
        Swal.fire('Error', 'Gagal mengirim data! Periksa koneksi internet Anda.', 'error');
    }
}

function bukaPopup(url) {
    if(!url || url === 'undefined' || url.length < 10) {
        Swal.fire('Info', 'Tidak ada lampiran foto untuk baris ini.', 'info');
        return;
    }
    
    const modalEl = document.getElementById('modalFoto');
    const imgEl = document.getElementById('frameFoto');
    const loadEl = document.getElementById('loadingGambar');
    
    if(!modalEl) return;
    const myModal = new bootstrap.Modal(modalEl);

    let finalUrl = url;
    if (url.includes('drive.google.com')) {
        const match = url.match(/[-\w]{25,}/);
        if (match) {
            finalUrl = `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1000`;
        }
    }

    imgEl.style.display = 'none';
    loadEl.style.display = 'block';
    imgEl.src = finalUrl;
    
    myModal.show();
    
    imgEl.onload = () => {
        loadEl.style.display = 'none';
        imgEl.style.display = 'inline-block';
    };
    imgEl.onerror = () => {
        loadEl.style.display = 'none';
        Swal.fire('Gagal', 'Foto gagal dimuat. Pastikan akses folder Google Drive diset ke Publik.', 'error');
        myModal.hide();
    }
}

function runFilter() {
    const inputNama = document.getElementById('inputNama');
    const inputToko = document.getElementById('inputToko');
    const inputTanggal = document.getElementById('inputTanggal');

    const n = inputNama ? inputNama.value.toLowerCase() : '';
    const t = inputToko ? inputToko.value.toLowerCase() : '';
    const d = inputTanggal ? inputTanggal.value : '';
    
    filteredData = allDataRaw.filter(i => {
        return (i.nama || '').toLowerCase().includes(n) && 
               (i.toko || '').toLowerCase().includes(t) && 
               (d === "" || (i.timestamp || '').includes(d));
    });
    
    renderTable(filteredData);
}
