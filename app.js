const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlJNuEDbHjf9QV-WBtAafjmgrK8lnffRDOvtabU_ZkCPrtdyWjcvlWK9Jaj0_HiCU/exec";
let allData = []; // Menyimpan data asli untuk filtering

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    // Event Listeners untuk Filter
    document.getElementById('filter-nama').addEventListener('input', applyFilters);
    document.getElementById('filter-toko').addEventListener('input', applyFilters);
    document.getElementById('filter-tanggal').addEventListener('change', applyFilters);
    document.getElementById('refresh-btn').addEventListener('click', loadData);
});

function loadData() {
    const loading = document.getElementById('loading');
    const tableBody = document.getElementById('data-table-body');

    loading.style.display = 'block';
    tableBody.innerHTML = '';

    fetch(SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            allData = data; // Simpan data ke global variable
            loading.style.display = 'none';
            displayData(allData);
        })
        .catch(err => {
            loading.style.display = 'none';
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Gagal memuat data.</td></tr>';
        });
}

function applyFilters() {
    const valNama = document.getElementById('filter-nama').value.toLowerCase();
    const valToko = document.getElementById('filter-toko').value.toLowerCase();
    const valTanggal = document.getElementById('filter-tanggal').value;

    const filtered = allData.filter(item => {
        // Filter Tanggal (asumsi format timestamp GSheet diawali YYYY-MM-DD)
        const itemDate = item.timestamp.split('T')[0]; 
        
        return (item.nama.toLowerCase().includes(valNama)) &&
               (item.toko.toLowerCase().includes(valToko)) &&
               (valTanggal === "" || itemDate === valTanggal);
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
        const fotoBtn = item.foto.includes('http') ? 
            `<button class="btn-view" onclick="bukaPopupFoto('${item.foto}')">Lihat Foto</button>` : '-';

        row.innerHTML = `
            <td class="text-muted small">${item.timestamp.split('T')[0]}</td>
            <td><strong>${item.nama}</strong></td>
            <td><span class="badge bg-primary bg-opacity-10 text-primary">${item.toko}</span></td>
            <td>${item.rak}</td>
            <td>${generateChecklistUI(item.checklist)}</td>
            <td>${fotoBtn}</td>
            <td class="text-center">
                <div class="form-check d-inline-block">
                    <input class="form-check-input" type="checkbox" id="check-${index}">
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function generateChecklistUI(text) {
    const categories = ["Plano", "Label Price", "Display", "Kebersihan"];
    let html = '<div class="checklist-box">';
    categories.forEach(cat => {
        const isTrue = new RegExp(`${cat}.*(ada|ya|ok|v|lengkap|bersih)`, 'i').test(text);
        html += `<div class="checklist-item"><span>${cat}</span><span class="${isTrue?'check-v':'check-x'}">${isTrue?'✔':'✖'}</span></div>`;
    });
    return html + '</div>';
}

window.bukaPopupFoto = function(url) {
    const imgTarget = document.getElementById('img-modal-target');
    const loadingFoto = document.getElementById('loading-foto');
    const modal = new bootstrap.Modal(document.getElementById('fotoModal'));

    let directUrl = url;
    if (url.includes('drive.google.com')) {
        const fileId = url.split('/d/')[1]?.split('/')[0] || url.split('id=')[1]?.split('&')[0];
        directUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
    }

    loadingFoto.style.display = 'block';
    imgTarget.style.display = 'none';
    imgTarget.src = directUrl;
    modal.show();

    imgTarget.onload = () => { loadingFoto.style.display = 'none'; imgTarget.style.display = 'block'; };
}
