import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co";   // ganti dengan URL Supabase
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";                     // ganti dengan anon key
const supabase = createClient(supabaseUrl, supabaseKey);

let allData = [];
let checkedIds = new Set();

// === Simpan checkbox state ke localStorage ===
function saveChecked() {
  localStorage.setItem("checkedIds", JSON.stringify([...checkedIds]));
}

// === Load checkbox state dari localStorage ===
function loadChecked() {
  const saved = localStorage.getItem("checkedIds");
  if (saved) {
    checkedIds = new Set(JSON.parse(saved));
  }
}

// === Render tabel ===
function renderTable(data) {
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";

  data.forEach((row, index) => {
    const tr = document.createElement("tr");

    // checkbox
    const tdCheck = document.createElement("td");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.classList.add("row-check");
    cb.setAttribute("data-id", row.id);
    if (checkedIds.has(String(row.id))) {
      cb.checked = true;
      tr.classList.add("row-checked");
    }
    cb.addEventListener("change", function () {
      const id = this.getAttribute("data-id");
      if (this.checked) {
        checkedIds.add(id);
        tr.classList.add("row-checked");
      } else {
        checkedIds.delete(id);
        tr.classList.remove("row-checked");
      }
      saveChecked();
    });
    tdCheck.appendChild(cb);
    tr.appendChild(tdCheck);

    // isi data
    const fields = [
      row.tanggal,
      row.waktu,
      row.meja,
      row.nama,
      row.asal,
      row.media_sosial,
      row.acara,
      row.usia,
      row.kualitas_makanan,
      row.kualitas_minuman,
      row.kecepatan_penyajian,
      row.pelayanan,
      row.kebersihan,
      row.suasana,
      row.harga,
      row.saran,
      row.medsos_lain,
      row.acara_lain,
    ];

    fields.forEach((f) => {
      const td = document.createElement("td");
      td.textContent = f ?? "";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// === Load data dari Supabase ===
async function loadData() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("guest_comments")
    .select("*")
    .gte("tgl", startOfMonth.toISOString());

  if (error) {
    console.error("Load data error:", error);
    return;
  }

  allData = data || [];
  renderTable(allData);
}

// === Filter data ===
function applyFilter() {
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  let filtered = [...allData];

  if (start) {
    filtered = filtered.filter((row) => row.tanggal >= start);
  }
  if (end) {
    filtered = filtered.filter((row) => row.tanggal <= end);
  }

  renderTable(filtered);
}

// === Reset filter ===
function resetFilter() {
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  renderTable(allData);
}

// === Export Excel ===
function exportExcel() {
  const table = document.getElementById("dataTable");
  const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
  XLSX.writeFile(wb, "data.xlsx");
}

// === Init setelah DOM siap ===
document.addEventListener("DOMContentLoaded", () => {
  loadChecked();
  loadData();

  // tombol filter
  document.getElementById("btnFilter").addEventListener("click", applyFilter);
  document.getElementById("btnReset").addEventListener("click", resetFilter);
  document.getElementById("btnExport").addEventListener("click", exportExcel);

  // select all
  document.getElementById("selectAll").addEventListener("change", function () {
    const checks = document.querySelectorAll(".row-check");
    checks.forEach((cb) => {
      cb.checked = this.checked;
      const id = cb.getAttribute("data-id");
      if (this.checked) {
        checkedIds.add(id);
        cb.closest("tr").classList.add("row-checked");
      } else {
        checkedIds.delete(id);
        cb.closest("tr").classList.remove("row-checked");
      }
    });
    saveChecked();
  });
});