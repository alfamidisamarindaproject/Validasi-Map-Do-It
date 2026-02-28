const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlJNuEDbHjf9QV-WBtAafjmgrK8lnffRDOvtabU_ZkCPrtdyWjcvlWK9Jaj0_HiCU/exec";

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    document.getElementById('refresh-btn').addEventListener('click', loadData);
});

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
                    // Murni button, memanggil fungsi popup tanpa tag <a>
                    fotoBtn = `<button type="button" class="btn-view" onclick="bukaPopupFoto('${item.foto}')">Lihat Foto</button>`;
                }

                row.innerHTML = `
                    <td class="small text-muted">${item.timestamp}</td>
                    <td><strong>${item.nama}</strong></td>
                    <td>${item.toko}</td>
                    <td><span class="badge bg-secondary rounded-pill">${item.rak}</span></td>
                    <td class="text-wrap" style="min-width: 200px;">${item.checklist}</td>
                    <td>${fotoBtn}</td>
                    <td class="text-center">
                        <select class="form-select form-select-sm select-status">
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
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Gagal memuat data GSheet.</td></tr>';
        });
}

window.bukaPopupFoto = function(urlFoto) {
    const modalElement = document.getElementById('fotoModal');
    const imgTarget = document.getElementById('img-modal-target');
    const loadingFoto = document.getElementById('loading-foto');
    const modalInstance = new bootstrap.Modal(modalElement);

    // Konversi Google Drive Link agar bisa tampil langsung di <img>
    let directUrl = urlFoto;
    if (urlFoto.includes('drive.google.com')) {
        directUrl = urlFoto.replace("/view?usp=sharing", "").replace("file/d/", "uc?export=view&id=");
    }

    loadingFoto.style.display = 'block';
    imgTarget.style.display = 'none';
    imgTarget.src = directUrl;

    modalInstance.show();

    imgTarget.onload = () => {
        loadingFoto.style.display = 'none';
        imgTarget.style.display = 'block';
    };

    imgTarget.onerror = () => {
        loadingFoto.style.display = 'none';
        alert("Gambar tidak dapat dimuat. Pastikan izin sharing Google Drive sudah publik.");
    };
}
