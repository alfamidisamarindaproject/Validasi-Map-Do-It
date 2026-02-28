const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlJNuEDbHjf9QV-WBtAafjmgrK8lnffRDOvtabU_ZkCPrtdyWjcvlWK9Jaj0_HiCU/exec";
let allData = []; // Tempat menyimpan data mentah dari GSheet

document.addEventListener('DOMContentLoaded', () => {
    // Ambil data pertama kali
    loadData();

    // Pasang Event Listener untuk Filter (Real-time)
    document.getElementById('filter-nama').addEventListener('input', applyFilters);
    document.getElementById('filter-toko').addEventListener('input', applyFilters);
    document.getElementById('filter-tanggal').addEventListener('change', applyFilters);
    document.getElementById('refresh-btn').addEventListener('click', loadData);
});

function loadData() {
    const tableBody = document.getElementById('data-table-body');
    const loading = document.getElementById('loading');

    if(loading) loading.style.display = 'block';
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Mengambil data...</td></tr>';

    fetch(SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            allData = data; // Simpan ke variabel global
            if(loading) loading.style.display = 'none';
            displayData(allData); // Tampilkan semua data di awal
        })
        .catch(err => {
            console.error(err);
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Gagal memuat data.</td></tr>';
        });
}

// FUNGSI UTAMA FILTER
function applyFilters() {
    const namaKueri = document.getElementById('filter-nama').value.toLowerCase();
    const tokoKueri = document.getElementById('filter-toko').value.toLowerCase();
    const tanggalKueri = document.getElementById('filter-tanggal').value;

    const dataTersaring = allData.filter(item => {
        // Normalisasi data dari GSheet (mengatasi null/undefined)
        const nama = (item.nama || "").toLowerCase();
        const toko = (item.toko || "").toLowerCase();
        const timestamp = (item.timestamp || ""); // Format biasanya: 2024-05-20T...
        
        // Cek kecocokan
        const cocokNama = nama.includes(namaKueri);
        const cocokToko = toko.includes(tokoKueri);
        const cocokTanggal = tanggalKueri === "" || timestamp.startsWith(tanggalKueri);

        return cocokNama && cocokToko && cocokTanggal;
    });

    displayData(dataTersaring);
}

// FUNGSI MENAMPILKAN DATA KE TABEL
function displayData(data) {
    const tableBody = document.getElementById('data-table-body');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Data tidak ditemukan.</td></tr>';
        return;
    }

    data.forEach((item, index) => {
        const row = document.createElement('tr');
        
        // Link Foto ke Pop-up
        let fotoBtn = '<span class="text-muted small">No Photo</span>';
        if (item.foto && item.foto.includes('http')) {
            fotoBtn = `<button type="button" class="btn-view" onclick="bukaPopupFoto('${item.foto}')">Lihat Foto</button>`;
        }

        row.innerHTML = `
            <td>${item.timestamp ? item.timestamp.split('T')[0] : '-'}</td>
            <td><strong>${item.nama || '-'}</strong></td>
            <td><span class="badge bg-primary bg-opacity-10 text-primary">${item.toko || '-'}</span></td>
            <td>${item.rak || '-'}</td>
            <td>${generateChecklistUI(item.checklist || "")}</td>
            <td>${fotoBtn}</td>
            <td class="text-center">
                <div class="form-check d-flex justify-content-center">
                    <input class="form-check-input" type="checkbox" id="check-${index}" style="transform: scale(1.3); cursor: pointer;">
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// UI Checklist (Tetap menggunakan logika centang/silang)
function generateChecklistUI(text) {
    const categories = ["Plano", "Label Price", "Display", "Kebersihan"];
    let html = '<div class="checklist-box" style="border: 1px solid #ddd; padding: 5px; border-radius: 5px; background: #fff; min-width: 120px;">';
    categories.forEach(cat => {
        const isTrue = new RegExp(`${cat}.*(ada|ya|ok|v|lengkap|bersih)`, 'i').test(text);
        html += `<div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
                    <span>${cat}</span>
                    <span style="color: ${isTrue ? 'green' : 'red'}; font-weight: bold;">${isTrue ? '✔' : '✖'}</span>
                 </div>`;
    });
    return html + '</div>';
}

// Fungsi Modal Foto (Sama seperti sebelumnya)
window.bukaPopupFoto = function(url) {
    const imgTarget = document.getElementById('img-modal-target');
    const loadingFoto = document.getElementById('loading-foto');
    const modal = new bootstrap.Modal(document.getElementById('fotoModal'));

    let directUrl = url;
    if (url.includes('drive.google.com')) {
        const fileId = url.split('/d/')[1]?.split('/')[0] || url.split('id=')[1]?.split('&')[0];
        directUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
    }

    if(loadingFoto) loadingFoto.style.display = 'block';
    imgTarget.style.display = 'none';
    imgTarget.src = directUrl;
    modal.show();

    imgTarget.onload = () => { 
        if(loadingFoto) loadingFoto.style.display = 'none'; 
        imgTarget.style.display = 'block'; 
    };
}
