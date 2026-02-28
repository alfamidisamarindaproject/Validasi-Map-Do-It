// GANTI DENGAN URL WEB APP GSCRIPT ANDA
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlJNuEDbHjf9QV-WBtAafjmgrK8lnffRDOvtabU_ZkCPrtdyWjcvlWK9Jaj0_HiCU/exec"; 

document.addEventListener('DOMContentLoaded', function() {
    loadData();
});

function loadData() {
    const tableBody = document.getElementById('data-table-body');
    const loading = document.getElementById('loading');

    loading.style.display = 'block';
    tableBody.innerHTML = '';

    fetch(SCRIPT_URL)
        .then(response => response.json())
        .then(data => {
            loading.style.display = 'none';

            data.forEach(item => {
                const row = document.createElement('tr');
                
                // Cek ketersediaan foto
                let fotoBtn = `<span class="text-muted small italic">Tidak ada foto</span>`;
                if (item.foto && item.foto.includes('http')) {
                    fotoBtn = `<button type="button" class="btn-view" onclick="bukaPopupFoto('${item.foto}')">Lihat Foto</button>`;
                }

                row.innerHTML = `
                    <td class="text-muted">${item.timestamp}</td>
                    <td><strong>${item.nama}</strong></td>
                    <td>${item.toko}</td>
                    <td><span class="badge bg-secondary">${item.rak}</span></td>
                    <td style="max-width: 250px;">${item.checklist}</td>
                    <td>${fotoBtn}</td>
                    <td class="text-center">
                        <select class="form-select form-select-sm border-primary" style="width: 130px; margin: 0 auto;">
                            <option value="">-- Pilih --</option>
                            <option value="APPROVE" class="text-success">APPROVE</option>
                            <option value="REJECT" class="text-danger">REJECT</option>
                        </select>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            loading.style.display = 'none';
            console.error('Fetch error:', error);
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Gagal memuat data GSheet. Pastikan URL Script benar.</td></tr>';
        });
}

// Logika Pop-up Modal Foto
function bukaPopupFoto(urlFoto) {
    const modalElement = document.getElementById('fotoModal');
    const imgModalTarget = document.getElementById('img-modal-target');
    const loadingFoto = document.getElementById('loading-foto');
    
    const myModal = new bootstrap.Modal(modalElement);
    
    // Reset Modal
    loadingFoto.style.display = 'block';
    imgModalTarget.style.display = 'none';
    imgModalTarget.src = ''; 

    // Load Gambar
    imgModalTarget.src = urlFoto;
    myModal.show();

    imgModalTarget.onload = function() {
        loadingFoto.style.display = 'none';
        imgModalTarget.style.display = 'block';
    };

    imgModalTarget.onerror = function() {
        loadingFoto.style.display = 'none';
        alert('Gagal memuat gambar. Pastikan izin akses file di Google Drive sudah "Anyone with the link".');
    };
}
