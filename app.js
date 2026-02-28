const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlJNuEDbHjf9QV-WBtAafjmgrK8lnffRDOvtabU_ZkCPrtdyWjcvlWK9Jaj0_HiCU/exec";

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadData);
});

/**
 * Fungsi untuk mengubah teks dari GSheet menjadi simbol centang/silang
 * Diasumsikan data checklist di GSheet dipisahkan dengan koma atau karakter lain
 * atau jika Anda ingin memecah satu string menjadi kategori tetap.
 */
function formatChecklist(text) {
    if (!text) return '-';

    // List kategori yang ingin ditampilkan
    const categories = ["Plano", "Label Price", "Display", "Kebersihan"];
    
    // Logika: Kita cek apakah kata tersebut ada dalam teks dari GSheet
    // Misal teks GSheet: "Plano ada, Label Price tidak, Display ada"
    return `<ul class="list-unstyled mb-0" style="font-size: 0.8rem; text-align: left;">
        ${categories.map(cat => {
            // Cek apakah kategori tersebut ditandai sebagai 'ada', 'ya', atau 'ok' dalam teks
            const regex = new RegExp(`${cat}\\s*[:=-]?\\s*(ada|ya|ok|v|check)`, 'i');
            const isExist = regex.test(text);
            
            return `<li>
                ${isExist ? '<span class="text-success fw-bold">✔</span>' : '<span class="text-danger fw-bold">✖</span>'} 
                <span class="text-muted">${cat}</span>
            </li>`;
        }).join('')}
    </ul>`;
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
                    <td class="small text-muted">${item.timestamp || '-'}</td>
                    <td><strong>${item.nama || '-'}</strong></td>
                    <td>${item.toko || '-'}</td>
                    <td><span class="badge bg-secondary rounded-pill">${item.rak || '-'}</span></td>
                    <td class="bg-light shadow-sm rounded">
                        ${formatChecklist(item.checklist)}
                    </td>
                    <td>${fotoBtn}</td>
                    <td class="text-center">
                        <select class="form-select form-select-sm select-status" style="width: 125px; margin: 0 auto;">
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
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Gagal memuat data.</td></tr>`;
        });
}

// Fungsi Pop-up Foto (Tetap sama dengan sebelumnya untuk kestabilan)
window.bukaPopupFoto = function(urlFoto) {
    const modalElement = document.getElementById('fotoModal');
    const imgTarget = document.getElementById('img-modal-target');
    const loadingFoto = document.getElementById('loading-foto');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);

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
        alert("Gambar tidak dapat dimuat. Cek izin sharing Drive.");
    };
}
