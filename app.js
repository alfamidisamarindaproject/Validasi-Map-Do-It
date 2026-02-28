const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlJNuEDbHjf9QV-WBtAafjmgrK8lnffRDOvtabU_ZkCPrtdyWjcvlWK9Jaj0_HiCU/exec"; // Ganti dengan URL hasil Deploy Apps Script

document.addEventListener('DOMContentLoaded', function() {
    loadData();
});

function loadData() {
    const tableBody = document.getElementById('data-table-body');
    const loading = document.getElementById('loading');

    // Tampilkan loading, kosongkan tabel
    loading.style.display = 'block';
    tableBody.innerHTML = '';

    fetch(SCRIPT_URL)
        .then(response => response.json())
        .then(data => {
            loading.style.display = 'none';

            data.forEach(item => {
                const row = document.createElement('tr');
                
                // Jika foto kosong, tampilkan teks "No Photo"
                const fotoHtml = item.foto ? 
                    `<a href="${item.foto}" target="_blank" class="btn-view">Lihat Foto</a>` : 
                    `<span class="text-muted small">No Photo</span>`;

                row.innerHTML = `
                    <td>${item.timestamp}</td>
                    <td>${item.nama}</td>
                    <td>${item.toko}</td>
                    <td>${item.rak}</td>
                    <td>${item.checklist}</td>
                    <td>${fotoHtml}</td>
                    <td class="text-center">
                        <select class="form-select form-select-sm border-primary">
                            <option value="">-- Pilih --</option>
                            <option value="APPROVE">APPROVE</option>
                            <option value="REJECT">REJECT</option>
                        </select>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            loading.style.display = 'none';
            console.error('Error:', error);
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Gagal memuat data. Periksa koneksi atau URL Apps Script.</td></tr>';
        });
}
