const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlJNuEDbHjf9QV-WBtAafjmgrK8lnffRDOvtabU_ZkCPrtdyWjcvlWK9Jaj0_HiCU/exec";

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    document.getElementById('refresh-btn').addEventListener('click', loadData);
});

/**
 * Logika Checklist: Mengubah teks GSheet menjadi baris Centang/Silang
 */
function generateChecklistUI(rawData) {
    if (!rawData) return '<div class="text-muted small italic">Tidak ada data</div>';

    // Definisikan kategori yang dipantau
    const categories = ["Plano", "Label Price", "Display", "Kebersihan"];
    let html = '<div class="checklist-box">';
    
    categories.forEach(cat => {
        // Cari kata kunci kategori + indikasi positif (ada/ya/ok/v)
        const regexPositif = new RegExp(`${cat}.*(ada|ya|ok|v|lengkap|bersih)`, 'i');
        const isTrue = regexPositif.test(rawData);

        html += `
            <div class="checklist-item">
                <span class="text-secondary">${cat}</span>
                <span class="${isTrue ? 'check-v' : 'check-x'}">${isTrue ? '✔' : '✖'}</span>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

function loadData() {
    const tableBody = document.getElementById('data-table-body');
    const loading = document.getElementById('loading');

    loading.style.display = 'block';
    tableBody.innerHTML = '';

    fetch(SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            loading.style.display = 'none';
            data.forEach(item => {
                const row = document.createElement('tr');
                
                let fotoBtn = `<span class="text-muted small">No Photo</span>`;
                if (item.foto && item.foto.includes('http')) {
                    fotoBtn = `<button type="button" class="btn-view" onclick="bukaPopupFoto('${item.foto.trim()}')">Lihat Foto</button>`;
                }

                row.innerHTML = `
                    <td class="small text-muted">${item.timestamp.split('T')[0] || item.timestamp}</td>
                    <td><div class="fw-bold text-dark">${item.nama}</div></td>
                    <td><span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">${item.toko}</span></td>
                    <td><span class="text-secondary small fw-bold">${item.rak}</span></td>
                    <td>${generateChecklistUI(item.checklist)}</td>
                    <td>${fotoBtn}</td>
                    <td class="text-center">
                        <select class="form-select form-select-sm select-status">
                            <option value="">PILIH</option>
                            <option value="APPROVE" class="text-success">APPROVE</option>
                            <option value="REJECT" class="text-danger">REJECT</option>
                        </select>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(err => {
            loading.style.display = 'none';
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Koneksi GSheet Gagal. Periksa URL Apps Script.</td></tr>';
        });
}

window.bukaPopupFoto = function(urlFoto) {
    const modalElement = document.getElementById('fotoModal');
    const imgTarget = document.getElementById('img-modal-target');
    const loadingFoto = document.getElementById('loading-foto');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);

    // Konversi Link Drive ke format Thumbnail (Stabil & Cepat)
    let finalUrl = urlFoto;
    if (urlFoto.includes('drive.google.com')) {
        let fileId = "";
        if (urlFoto.includes('/d/')) fileId = urlFoto.split('/d/')[1].split('/')[0];
        else if (urlFoto.includes('id=')) fileId = urlFoto.split('id=')[1].split('&')[0];
        if (fileId) finalUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
    }

    loadingFoto.style.display = 'block';
    imgTarget.style.display = 'none';
    imgTarget.src = finalUrl;
    modalInstance.show();

    imgTarget.onload = () => {
        loadingFoto.style.display = 'none';
        imgTarget.style.display = 'block';
    };

    imgTarget.onerror = () => {
        loadingFoto.style.display = 'none';
        alert("Gambar gagal dimuat. Pastikan file Google Drive sudah diset 'Anyone with the link'.");
    };
}
