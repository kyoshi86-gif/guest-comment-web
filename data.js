// Contoh data dummy (ini bisa diganti fetch dari server / file JSON)
const data = [
  {
    no: 1, tanggal: "2025-07-19", waktu: "07:12", meja: "A1", nama: "Cornelia",
    asal: "Yogyakarta", media: "Instagram", acara: "Dinner", usia: "25 - 35",
    makanan: 4, minuman: 4, penyajian: 3, pelayanan: 5, kebersihan: 5, suasana: 4, harga: 4,
    saran: "So far so good tetapi ada beberapa menu yang sold out.",
    medsoslain: "", acaralain: ""
  },
  {
    no: 2, tanggal: "2025-07-19", waktu: "10:48", meja: "A9", nama: "Escolar",
    asal: "Luar Negeri", media: "Google", acara: "Dinner", usia: "25 - 35",
    makanan: 4, minuman: 4, penyajian: 4, pelayanan: 5, kebersihan: 4, suasana: 5, harga: 5,
    saran: "Tidak ada", medsoslain: "", acaralain: ""
  }
  // Tambahkan data lain sesuai tabel
];

const tbody = document.getElementById("dataBody");

function renderTable(filtered = data) {
  tbody.innerHTML = "";
  filtered.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="rowCheck"></td>
      <td>${row.no}</td>
      <td>${row.tanggal}</td>
      <td>${row.waktu}</td>
      <td>${row.meja}</td>
      <td>${row.nama}</td>
      <td>${row.asal}</td>
      <td>${row.media}</td>
      <td>${row.acara}</td>
      <td>${row.usia}</td>
      <td>${row.makanan}</td>
      <td>${row.minuman}</td>
      <td>${row.penyajian}</td>
      <td>${row.pelayanan}</td>
      <td>${row.kebersihan}</td>
      <td>${row.suasana}</td>
      <td>${row.harga}</td>
      <td class="wrap">${row.saran}</td>
      <td>${row.medsoslain}</td>
      <td>${row.acaralain}</td>
    `;
    tbody.appendChild(tr);
  });
}

renderTable();

// Select All
document.getElementById("selectAll").addEventListener("change", function() {
  document.querySelectorAll(".rowCheck").forEach(cb => cb.checked = this.checked);
});

// Filter
document.getElementById("btnFilter").addEventListener("click", () => {
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  let filtered = data;
  if (start && end) {
    filtered = data.filter(d => d.tanggal >= start && d.tanggal <= end);
  }
  renderTable(filtered);
});

document.getElementById("btnReset").addEventListener("click", () => {
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  renderTable();
});

// Save action
document.getElementById("btnSave").addEventListener("click", () => {
  document.querySelectorAll("#dataBody tr").forEach(tr => {
    const checkbox = tr.querySelector(".rowCheck");
    if (checkbox && checkbox.checked) {
      tr.classList.add("table-success");
    }
  });
  alert("Data berhasil disimpan!");
});
