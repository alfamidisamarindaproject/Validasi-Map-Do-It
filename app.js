// Ganti dengan URL Script Anda
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlJNuEDbHjf9QV-WBtAafjmgrK8lnffRDOvtabU_ZkCPrtdyWjcvlWK9Jaj0_HiCU/exec";

let allData = []; // Simpan data mentah agar filter bisa instant

document.addEventListener('DOMContentLoaded', () => {
    loadData();

    // Listener Filter Real-time
    document.getElementById('filter-nama').addEventListener('input', applyFilters);
    document.getElementById('filter-toko').addEventListener('input', applyFilters);
    document.getElementById('filter-tanggal').addEventListener('change', applyFilters);
    document.getElementById('refresh-btn').addEventListener('click', loadData);
});

function loadData() {
    const tableBody = document.getElementById('data-table-body');
    const loading = document.getElementById('loading');

    loading.style.display = 'block';
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Tunggu sebentar, sedang memuat data...</td></tr>';

    fetch(SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            allData = data;
            loading.style.display = 'none';
            displayData(allData); // Tampilkan semua data saat pertama buka
        })
        .catch(err => {
            loading.style.display = 'none';
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Gagal memuat data GSheet. Pastikan link Apps Script sudah benar.</td></tr>';
        });
}

function applyFilters() {
    const qNama = document.getElementById('filter-nama').value.toLowerCase();
    const qToko = document.getElementById('filter-toko').value.toLowerCase();
    const qTgl = document.getElementById('filter-tanggal').value;

    const filtered = allData.filter(item => {
        const itemNama = (item.nama || "").toLowerCase();
        const itemToko = (item.toko || "").toLowerCase();
        const itemTgl = (item.timestamp || "").split('T')[0];

        return itemNama.includes(qNama) && 
               itemToko.includes(qToko) && 
               (qTgl === "" || itemTgl === qTgl);
    });

    displayData(filtered);
}

function displayData(data) {
    const tableBody = document.getElementById('data-table-body');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Data tidak ditemukan.</td></tr>';
        return;
    }

    data.forEach((item, index) => {
        const row = document.createElement('tr');
        
        let fotoBtn = `<span class="text-muted small">No Photo</span>`;
        if (item.foto && item.foto.includes('http')) {
            fotoBtn = `<button type="button" class="btn-view" onclick="bukaPopupFoto('${item.foto.trim()}')">Lihat Foto</button>`;
        }

        row.innerHTML = `
            <td class="text-muted small">${(item.timestamp || "").split('T')[0]}</td>
            <td><strong>${item.nama}</strong></td>
            <td><span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">${item.toko}</span></td>
            <td><span class="fw-bold">${item.rak}</span></td>
            <td>${generateChecklistUI(item.checklist)}</td>
            <td>${fotoBtn}</td>
            <td class="text-center">
                <input class="form-check-input" type="checkbox" id="check-${index}">
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function generateChecklistUI(text) {
    const cats = ["Plano", "Label Price", "Display", "Kebersihan"];
    let html = '<div class="checklist-box">';
    cats.forEach(c => {
        // Deteksi centang: mencari kata kunci "ada", "ok", "ya", "v"
        const isTrue = new RegExp(`${c}.*(ada|ya|ok|v|lengkap|bersih)`, 'i').test(text);
        html += `<div class="checklist-item">
                    <span class="text-secondary">${c}</span>
                    <span class="${isTrue ? 'check-v' : 'check-x'}">${isTrue ? '✔' : '✖'}</span>
                 </div>`;
    });
    return html + '</div>';
}

window.bukaPopupFoto = function(url) {
    const modalEl = document.getElementById('fotoModal');
    const imgEl = document.getElementById('img-modal-target');
    const loadEl = document.getElementById('loading-foto');
    const modal = new bootstrap.Modal(modalEl);

    let dUrl = url;
    if (url.includes('drive.google.com')) {
        const id = url.split('/d/')[1]?.split('/')[0] || url.split('id=')[1]?.split('&')[0];
        dUrl = `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
    }

    loadEl.style.display = 'block';
    imgEl.style.display = 'none';
    imgEl.src = dUrl;
    modal.show();

    imgEl.onload = () => {
        loadEl.style.display = 'none';
        imgEl.style.display = 'block';
    };
}
