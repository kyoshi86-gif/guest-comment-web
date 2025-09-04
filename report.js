// report.js
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Supabase config
const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const supabase = createClient(supabaseUrl, supabaseKey);

// Warna konsisten
const COLORS = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2",
  "#59a14f", "#edc949", "#af7aa1", "#ff9da7",
  "#9c755f", "#bab0ac"
];

// ----------------- INIT -----------------
document.addEventListener("DOMContentLoaded", async () => {
  await loadTahun();
  setDefaultFilters();
  await loadReport();

  document.getElementById("btnProses").addEventListener("click", loadReport);
  document.getElementById("btnReset").addEventListener("click", resetFilters);

  document.getElementById("startDate").addEventListener("change", handleDateChange);
  document.getElementById("endDate").addEventListener("change", handleDateChange);
});

// ----------------- FILTER -----------------
function handleDateChange() {
  const s = document.getElementById("startDate").value;
  const e = document.getElementById("endDate").value;
  if (s && e && s > e) {
    alert("Tanggal awal tidak boleh lebih besar dari tanggal akhir!");
    document.getElementById("endDate").value = "";
    return;
  }
  toggleFilters(Boolean(s || e));
}

function toggleFilters(disable) {
  document.getElementById("tahun").disabled = disable;
  document.getElementById("bulan").disabled = disable;
}

function setDefaultFilters() {
  const now = new Date();
  document.getElementById("tahun").value = now.getFullYear();
  document.getElementById("bulan").value = now.getMonth() + 1;
}

async function loadTahun() {
  const { data, error } = await supabase.from("v_feedback_report")
    .select("tahun").order("tahun", { ascending: false });
  const sel = document.getElementById("tahun");
  sel.innerHTML = "";

  if (error || !data) {
    const y = new Date().getFullYear();
    sel.innerHTML = `<option value="${y}">${y}</option>`;
    return;
  }
  const years = [...new Set(data.map(r => r.tahun))];
  years.forEach(y => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    sel.appendChild(opt);
  });
  if (years.length) sel.value = years[0];
}

function resetFilters() {
  setDefaultFilters();
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  toggleFilters(false);
  loadReport();
}

// ----------------- LOAD DATA -----------------
async function loadReport() {
  const tahun = document.getElementById("tahun").value;
  const bulan = document.getElementById("bulan").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  let data = [];
  if (startDate && endDate) {
    const res = await supabase.from("guest_comments")
      .select("*").gte("tgl", startDate).lte("tgl", endDate);
    if (res.error) { console.error(res.error); return; }
    data = res.data;
  } else {
    let q = supabase.from("v_feedback_report").select("*");
    if (tahun) q = q.eq("tahun", tahun);
    if (bulan) q = q.eq("bulan", bulan);
    const res = await q;
    if (res.error) { console.error(res.error); return; }
    data = res.data;
  }

  renderCharts(data);
}

// ----------------- RENDER -----------------
function destroyIfExists(canvasId) {
  const canvas = document.getElementById(canvasId);
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
}

function renderCharts(data) {
  if (!data || data.length === 0) {
    ["lineAsal","lineMedia","lineAcara","lineUsia","lineRating"].forEach(id => destroyIfExists(id));
    return;
  }

  // grup data per bulan untuk YTD
  const months = [...new Set(data.map(d => d.bulan))].sort((a,b) => a-b);

  // helper untuk line chart kategori count
  function buildLineDataset(fieldCount) {
    const byLabel = {};
    data.forEach(row => {
      const m = row.bulan;
      const counts = row[fieldCount] || {};
      Object.entries(counts).forEach(([label, value]) => {
        if (!byLabel[label]) byLabel[label] = {};
        byLabel[label][m] = value;
      });
    });
    return Object.entries(byLabel).map(([label, monthVals], idx) => ({
      label,
      data: months.map(m => monthVals[m] || 0),
      borderColor: COLORS[idx % COLORS.length],
      backgroundColor: COLORS[idx % COLORS.length],
      tension: 0.3,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6
    }));
  }

  // ASAL
  destroyIfExists("lineAsal");
  new Chart(document.getElementById("lineAsal"), {
    type: "line",
    data: { labels: months, datasets: buildLineDataset("asal_count") },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });

  // MEDIA
  destroyIfExists("lineMedia");
  new Chart(document.getElementById("lineMedia"), {
    type: "line",
    data: { labels: months, datasets: buildLineDataset("media_count") },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });

  // ACARA
  destroyIfExists("lineAcara");
  new Chart(document.getElementById("lineAcara"), {
    type: "line",
    data: { labels: months, datasets: buildLineDataset("acara_count") },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });

  // USIA
  destroyIfExists("lineUsia");
  new Chart(document.getElementById("lineUsia"), {
    type: "line",
    data: { labels: months, datasets: buildLineDataset("usia_count") },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });

  // RATING rata-rata
  destroyIfExists("barRating");
  const ratingKeys = [
    "avg_food_quality","avg_beverage_quality","avg_serving_speed",
    "avg_service","avg_cleanliness","avg_ambience","avg_price"
  ];
  const ratingLabels = [
    "Food","Beverage","Serving Speed","Service","Cleanliness","Ambience","Price"
  ];
  const ratingDatasets = ratingKeys.map((key, idx) => ({
    label: ratingLabels[idx],
    data: data.map(d => d[key] || 0),
    borderColor: COLORS[idx % COLORS.length],
    backgroundColor: COLORS[idx % COLORS.length],
    tension: 0.3,
    fill: false,
    pointRadius: 4,
    pointHoverRadius: 6
  }));
  new Chart(document.getElementById("barRating"), {
    type: "line",
    data: { labels: months, datasets: ratingDatasets },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } } },
      plugins: { legend: { position: "bottom" } }
    }
  });
}
