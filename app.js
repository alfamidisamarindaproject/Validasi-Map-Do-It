// URL Web App dari Google Apps Script Anda
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlJNuEDbHjf9QV-WBtAafjmgrK8lnffRDOvtabU_ZkCPrtdyWjcvlWK9Jaj0_HiCU/exec";

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    // Pasang event listener untuk tombol refresh
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadData);
    }
});

/**
 * Fungsi untuk mengambil data dari Google Sheets
 */
function loadData() {
    const tableBody = document.getElementById('data-table-body');
    const loading = document.getElementById('loading');

    // Tampilkan indikator loading dan kosongkan tabel
    loading.style.display = 'block';
    tableBody.innerHTML = '';

    fetch(SCRIPT_URL)
        .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        })
        .then(data => {
            loading.style.display = 'none';
            
            if (data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Tidak ada data ditemukan di GSheet.</td></tr>';
                return;
            }

            data.forEach(item => {
                const row = document.createElement('tr');
                
                // Logika Tombol Foto
                let fotoBtn = `<span class="text-muted small">No Photo</span>`;
                if (item.foto && item.foto.trim() !== "" && item.foto.includes('http')) {
                    // Gunakan button murni (bukan <a>) untuk memicu popup
                    fotoBtn = `<button type="button" class="btn-view" onclick="bukaPopupFoto('${item.foto.trim()}')">Lihat Foto</button>`;
                }

                row.innerHTML = `
                    <td class="small text-muted">${item.timestamp || '-'}</td>
                    <td><strong>${item.nama || '-'}</strong></td>
                    <td>${item.toko || '-'}</td>
                    <td><span class="badge bg-secondary rounded-pill">${item.rak || '-'}</span></td>
                    <td class="text-wrap" style="min-width: 220px; max-width: 300px;">${item.checklist || '-'}</td>
                    <td>${fotoBtn}</td>
                    <td class="text-center">
                        <select class="form-select form-select-sm select-status" style="width: 130px; margin: 0 auto;">
                            <option value="">Pilih</option>
                            <option value="APPROVE" class="text-success fw-bold">APPROVE</option>
                            <option value="REJECT" class="text-danger fw-bold">REJECT</option>
                        </select>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(err => {
            loading.style.display = 'none';
            console.error("Fetch error:", err);
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Gagal memuat data. Error: ${err.message}</td></tr>`;
        });
}

/**
 * Fungsi untuk menangani Pop-up Foto dengan konversi link Google Drive
 * @param {string} urlFoto - URL mentah dari GSheet
 */
window.bukaPopupFoto = function(urlFoto) {
    const modalElement = document.getElementById('fotoModal');
    const imgTarget = document.getElementById('img-modal-target');
    const loadingFoto = document.getElementById('loading-foto');
    
    // Inisialisasi Modal Bootstrap
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);

    let finalUrl = urlFoto;

    // --- LOGIKA KONVERSI GOOGLE DRIVE ---
    // Mengubah link sharing biasa menjadi link direct thumbnail berkualitas tinggi
    if (urlFoto.includes('drive.google.com')) {
        let fileId = "";
        
        // Pola 1: /file/d/[ID]/view
        if (urlFoto.includes('/d/')) {
            fileId = urlFoto.split('/d/')[1].split('/')[0];
        } 
        // Pola 2: ?id=[ID]
        else if (urlFoto.includes('id=')) {
            fileId = urlFoto.split('id=')[1].split('&')[0];
        }

        if (fileId) {
            // Menggunakan Thumbnail API (sz=w1200 untuk resolusi tinggi)
            // Ini jauh lebih stabil untuk ditampilkan di tag <img> daripada link /uc?
            finalUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
        }
    }

    // Siapkan tampilan modal sebelum muncul
    loadingFoto.style.display = 'block';
    imgTarget.style.display = 'none';
    imgTarget.src = finalUrl;

    modalInstance.show();

    // Event saat gambar berhasil dimuat
    imgTarget.onload = () => {
        loadingFoto.style.display = 'none';
        imgTarget.style.display = 'block';
    };

    // Event jika gambar gagal dimuat
    imgTarget.onerror = () => {
        loadingFoto.style.display = 'none';
        
        // Fallback terakhir: Coba link uc?export=view jika thumbnail gagal
        if (finalUrl.includes('thumbnail')) {
            const idMatch = finalUrl.match(/id=([^&]+)/);
            if (idMatch) {
                imgTarget.src = `https://docs.google.com/uc?export=view&id=${idMatch[1]}`;
                return; // Berhenti agar tidak alert dulu
            }
        }
        
        alert("Gambar tidak dapat dimuat.\n\nHal ini biasanya terjadi karena:\n1. Link di GSheet bukan link foto.\n2. Izin file di Google Drive belum diset 'Siapa saja yang memiliki link'.");
    };
}
