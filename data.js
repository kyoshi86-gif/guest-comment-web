<script type="module">
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";
const supabase = createClient(supabaseUrl, supabaseKey);

let allData = [];
let checkedIds = new Set();

async function loadData() {
  const { data, error } = await supabase
    .from("guest-comments")
    .select("*")
    .order("tanggal", { ascending: true });

  if (error) {
    console.error("Supabase error:", error);
    return;
  }
  allData = data || [];
  renderTable(allData);
}

function renderTable(data) {
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";
  data.forEach((row, i) => {
    const id = row.id || i+1;
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
      <td>${row.makanan || ""}</td>
      <td>${row.minuman || ""}</td>
      <td>${row.penyajian || ""}</td>
      <td>${row.pelayanan || ""}</td>
      <td>${row.kebersihan || ""}</td>
      <td>${row.suasana || ""}</td>
      <td>${row.harga || ""}</td>
      <td>${row.saran || ""}</td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll(".row-check").forEach(cb => {
    cb.addEventListener("change", function() {
      const id = this.getAttribute("data-id");
      if (this.checked) {
        checkedIds.add(id);
        this.closest("tr").classList.add("row-checked");
      } else {
        checkedIds.delete(id);
        this.closest("tr").classList.remove("row-checked");
      }
    });
  });
}

function applyFilter() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  let filtered = allData;
  if (from) filtered = filtered.filter(r => r.tanggal >= from);
  if (to) filtered = filtered.filter(r => r.tanggal <= to);
  renderTable(filtered);
}

function saveSelection() {
  localStorage.setItem("checkedRows", JSON.stringify([...checkedIds]));
  alert(`${checkedIds.size} baris ditandai & disimpan.`);
}

function restoreChecked() {
  const stored = localStorage.getItem("checkedRows");
  if (stored) checkedIds = new Set(JSON.parse(stored));
}

function exportExcel() {
  const table = document.getElementById("dataTable");
  const wb = XLSX.utils.table_to_book(table, { sheet: "Feedback" });
  XLSX.writeFile(wb, "database_feedback.xlsx");
}

document.getElementById("selectAll").addEventListener("change", function() {
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
});

// ✅ expose ke global supaya bisa dipanggil dari onclick HTML
window.applyFilter = applyFilter;
window.saveSelection = saveSelection;
window.exportExcel = exportExcel;

restoreChecked();
loadData();

</script>
