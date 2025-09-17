import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Supabase config (tetap seperti milikmu)
const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";
const supabase = createClient(supabaseUrl, supabaseKey);

// Warna konsisten (mirip gaya spreadsheet)
const COLORS = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2",
  "#59a14f", "#edc949", "#af7aa1", "#ff9da7",
  "#9c755f", "#bab0ac"
];

// ----------------- PLUGIN: OUTLABELS -----------------
const outlabelsPlugin = { /* ... (biarkan sama seperti punyamu) ... */ };

// ----------------- PLUGIN: BAR LABELS -----------------
const barLabelPlugin = { /* ... (biarkan sama seperti punyamu) ... */ };

// ----------------- GLOBAL VAR -----------------
let pieAsal, pieMedia, pieAcara, pieUsia, barRating;
let ytdData = [];   // 👈 fix: deklarasi global

document.addEventListener("DOMContentLoaded", async () => {
  await loadTahun();
  setDefaultFilters();
  await loadReport();

  document.getElementById("btnProses").addEventListener("click", loadReport);
  document.getElementById("btnReset").addEventListener("click", resetFilters);

  document.getElementById("startDate").addEventListener("change", handleDateChange);
  document.getElementById("endDate").addEventListener("change", handleDateChange);
});

// ... semua fungsi filter, loadReport, aggregateManual tetap sama ...

// ----------------- renderBar -----------------
function renderBar(canvasId, rating) {
  destroyIfExists(canvasId);
  const canvas = document.getElementById(canvasId);

  const labels = ["Food Quality","Beverage Quality","Serving Speed","Service","Cleanliness","Ambience","Price"];
  const dataVals = [
    rating.avg_food_quality || 0,
    rating.avg_beverage_quality || 0,
    rating.avg_serving_speed || 0,
    rating.avg_service || 0,
    rating.avg_cleanliness || 0,
    rating.avg_ambience || 0,
    rating.avg_price || 0,
  ];

  const cfg = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Average',
        data: dataVals,
        backgroundColor: COLORS.slice(0, labels.length)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: 20 },
      plugins: {
        legend: { display: false },
        title: { display: false, text: 'Rating Rata-rata', padding: {top:8, bottom:8} },
        tooltip: { enabled: true }
      },
      scales: {
        y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } },
        x: { grid: { display: false } }
      },
      onClick: (evt, elements) => {
        if (elements.length > 0) {
          showYTD();
        }
      }
    },
    plugins: [barLabelPlugin]
  };

  return new Chart(canvas, cfg);
}

// ----------------- LINE CHART -----------------
async function showYTD() {
  const tahun = document.getElementById("tahun").value;

  // Ambil data dari Supabase
  const { data, error } = await supabase
    .from("v_feedback_report")
    .select("*")
    .eq("tahun", tahun)
    .order("bulan", { ascending: true });

  if (error) {
    console.error("Gagal ambil data YTD:", error);
    return;
  }

  ytdData = data || [];

  // toggle view
  document.getElementById("mainCharts").style.display = "none";
  document.getElementById("ytdSection").style.display = "block";
  document.getElementById("lineChartsContainer").style.display = "grid";

  // Render 7 line chart
  renderLineCharts("lineFood", { label: "Food Quality", field: "avg_food_quality" });
  renderLineCharts("lineBeverage", { label: "Beverage Quality", field: "avg_beverage_quality" });
  renderLineCharts("lineSpeed", { label: "Serving Speed", field: "avg_serving_speed" });
  renderLineCharts("lineService", { label: "Service", field: "avg_service" });
  renderLineCharts("lineCleanliness", { label: "Cleanliness", field: "avg_cleanliness" });
  renderLineCharts("lineAmbience", { label: "Ambience", field: "avg_ambience" });
  renderLineCharts("linePrice", { label: "Price", field: "avg_price" });
}

function renderLineCharts(canvasId, cfg) {
  destroyIfExists(canvasId);

  const labels = ytdData.map(r => r.nama_bulan);
  const values = ytdData.map(r => r[cfg.field] ?? null);

  new Chart(document.getElementById(canvasId), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: cfg.label,
        data: values,
        borderColor: "#4e79a7",
        backgroundColor: "rgba(78,121,167,0.2)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } } }
    }
  });
}

// Tombol kembali
document.getElementById("btnBack").addEventListener("click", () => {
  document.getElementById("ytdSection").style.display = "none";
  document.getElementById("mainCharts").style.display = "flex";
});
