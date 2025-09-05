import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co";   // ganti dengan URL Supabase
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";                     // ganti dengan anon key
const supabase = createClient(supabaseUrl, supabaseKey);

let allData = [];
let checkedIds = new Set();

document.addEventListener("DOMContentLoaded", () => {
  loadDataBulanIni();

  document.getElementById("btnFilter").addEventListener("click", applyFilter);
  document.getElementById("btnExport").addEventListener("click", exportExcel);
  document.getElementById("selectAll").addEventListener("change", toggleSelectAll);

  restoreChecked();
});

// === Load Data Bulan Berjalan ===
async function loadDataBulanIni() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("guest-comments")
    .select("*")
    .gte("tanggal", start)
    .lte("tanggal", end)
    .order("tanggal", { ascending: true });

  if (error) {
    console.error("Supabase error:", error);
    return;
  }
  allData = data || [];
  renderTable(allData);
}

// === Render Table ===
function renderTable(data) {
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";

  data.forEach((row, i) => {
    const id = row.id || `${row.tanggal}-${i}`;
    const isChecked = checkedIds.has(id);

    const tr = document.createElement("tr");
    if (isChecked) tr.classList.add("row-checked");

    tr.innerHTML = `
      <td><input type="checkbox" class="row-check" data-id="${id}" ${isChecked ? "checked" : ""}></td>
      <td>${i+1}</td>
      <td>${row.tanggal || ""}</td>
      <td>${row.waktu || ""}</td>
      <td>${row.meja || ""}</td>
      <td>${row.nama || ""}</td>
      <td>${row.asal || ""}</td>
      <td>${row.media || ""}</td>
      <td>${row.acara || ""}</td>
      <td>${row.usia || ""}</td>
      <td>${row.kualitas_makanan || ""}</td>
      <td>${row.kualitas_minuman || ""}</td>
      <td>${row.kecepatan_penyajian || ""}</td>
      <td>${row.pelayanan || ""}</td>
      <td>${row.kebersihan || ""}</td>
      <td>${row.suasana || ""}</td>
      <td>${row.harga || ""}</td>
      <td>${row.saran || ""}</td>
      <td>${row.medsos_lain || ""}</td>
      <td>${row.acara_lain || ""}</td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll(".row-check").forEach(cb => {
    cb.addEventListener("change", function() {
      const id = this.dataset.id;
      if (this.checked) {
        checkedIds.add(id);
        this.closest("tr").classList.add("row-checked");
      } else {
        checkedIds.delete(id);
        this.closest("tr").classList.remove("row-checked");
      }
      saveChecked();
    });
  });
}

// === Filter ===
function apply
