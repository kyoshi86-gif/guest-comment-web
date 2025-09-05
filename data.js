import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co";   // ganti dengan URL Supabase
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";                     // ganti dengan anon key
const supabase = createClient(supabaseUrl, supabaseKey);

let allData = [];
let checkedIds = new Set();

// === Load Data Supabase ===
async function loadData() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("guest-comments")
    .select("*")
    .gte("tanggal", monthStart)
    .lte("tanggal", monthEnd)
    .order("tanggal", { ascending: true });

  if (error) {
    console.error("Supabase error:", error);
    return;
  }

  allData = data || [];
  restoreChecked();
  renderTable(allData);
}

// === Render Table ===
function renderTable(data) {
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";

  data.forEach((row, i) => {
    const id = row.id || i + 1;
    const isChecked = checkedIds.has(id);

    const tr = document.createElement("tr");
    if (isChecked) tr.classList.add("row-checked");

    tr.innerHTML = `
      <td><input type="checkbox" class="row-check" data-id="${id}" ${isChecked ? "checked" : ""}></td>
      <td>${i + 1}</td>
      <td>${row.tanggal || ""}</td>
      <td>${row.waktu || ""}</td>
      <td>${row.meja || ""}</td>
      <td>${row.nama || ""}</td>
      <td>${row.asal || ""}</td>
      <td>${row.media || ""}</td>
      <td>${row.acara || ""}</td>
      <td>${row.usia || ""}</td>
      <td>${row.makanan || ""}</td>
      <td>${row.minuman || ""}</td>
      <td>${row.penyajian || ""}</td>
      <td>${row.pelayanan || ""}</td>
      <td>${row.kebersihan || ""}</td>
      <td>${row.suasana || ""}</td>
      <td>${row.harga || ""}</td>
      <td>${row.saran || ""}</td>
      <td>${row.medsoslain || ""}</td>
      <td>${row.acaralain || ""}</td>
    `;
    tbody.appendChild(tr);
  });

  // handle checkbox click
  document.querySelectorAll(".row-check").forEach(cb => {
    cb.addEventListener("change", function () {
      const id = this.getAttribute("data-id");
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
function applyFilter() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  let filtered = allData;
  if (from) filtered = filtered.filter(r => r.tanggal >= from);
  if (to) filtered = filtered.filter(r => r.tanggal <= to);
  renderTable(filtered);
}

function resetFilter() {
  document.getElementById("fromDate").value = "";
  document.getElementById("toDate").value = "";
  renderTable(allData);
}

// === Export ===
function exportExcel() {
  const table = document.getElementById("dataTable");
  const wb = XLSX.utils.table_to_book(table, { sheet: "Feedback" });
  XLSX.writeFile(wb, "feedback_database.xlsx");
}

// === Save/Restore Checked Rows ===
function saveChecked() {
  localStorage.setItem("checkedRows", JSON.stringify([...checkedIds]));
}
function restoreChecked() {
  const stored = localStorage.getItem("checkedRows");
  if (stored) checkedIds = new Set(JSON.parse(stored));
}

// === Select All ===
document.getElementById("selectAll").addEventListener("change", function () {
  const checks = document.querySelectorAll(".row-check");
  checks.forEach(cb => {
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

// === Event Listeners ===
document.getElementById("btnFilter").addEventListener("click", applyFilter);
document.getElementById("btnReset").addEventListener("click", resetFilter);
document.getElementById("btnExport").addEventListener("click", exportExcel);

// === Init ===
loadData();