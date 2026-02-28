// Ganti dengan URL yang Anda dapatkan dari Deploy Google Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlJNuEDbHjf9QV-WBtAafjmgrK8lnffRDOvtabU_ZkCPrtdyWjcvlWK9Jaj0_HiCU/exec";

document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.querySelector('tbody');

    // Fungsi untuk memuat data
    fetch(SCRIPT_URL)
        .then(response => response.json())
        .then(data => {
            // Kosongkan tabel contoh
            tableBody.innerHTML = '';

            data.forEach(item => {
                const row = document.createElement('tr');
                
                // Format tanggal jika perlu (opsional)
                const date = new Date(item.timestamp).toLocaleString('id-ID');

                row.innerHTML = `
                    <td>${date}</td>
                    <td>${item.nama}</td>
                    <td>${item.toko}</td>
                    <td>${item.rak}</td>
                    <td>${item.checklist}</td>
                    <td>
                        <a href="${item.foto}" target="_blank" class="btn btn-sm btn-info text-white">
                            Lihat Foto
                        </a>
                    </td>
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
            console.error('Error fetching data:', error);
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Gagal memuat data dari GSheet.</td></tr>';
        });
});
