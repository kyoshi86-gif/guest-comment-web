// report.js
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { Chart, registerables } from "https://cdn.jsdelivr.net/npm/chart.js/dist/chart.esm.js";

Chart.register(...registerables);

const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";
const supabase = createClient(supabaseUrl, supabaseKey);

const COLORS = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1"];

let chartAsal, chartMedia, chartAcara, chartUsia, chartRating;

document.addEventListener("DOMContentLoaded", async () => {
  await loadTahun();
  setDefaultFilters();
  await loadReport();

  document.getElementById("btnProses").addEventListener("click", loadReport);
  document.getElementById("btnReset").addEventListener("click", resetFilters);
});

// ------------ Filter logic ------------
function setDefaultFilters() {
  const now = new Date();
  document.getElementById("tahun").value = now.getFullYear();
  document.getElementById("bulan").value = now.getMonth() + 1;
}

async function loadTahun() {
  const { data, error } = await supabase.from("v_feedback_report").select("tahun").order("tahun", { ascending: false });
  const sel = document.getElementById("tahun");
  sel.innerHTML = "";
  if (error || !data || !data.length) {
    const y = new Date().getFullYear();
    sel.innerHTML = `<option value="${y}">${y}</option>`;
    return;
  }
  [...new Set(data.map(r => r.tahun))].forEach(y => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    sel.appendChild(opt);
  });
}

function resetFilters() {
  setDefaultFilters();
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  loadReport();
}

// ------------ Load Report ------------
async function loadReport() {
  const tahun = document.getElementById("tahun").value;
  const bulan = document.getElementById("bulan").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  let data = [];
  if (startDate && endDate) {
    const res = await supabase.from("guest_comments").select("*").gte("tgl", startDate).lte("tgl", endDate);
    if (res.error) { console.error(res.error); return; }
    data = res.data;
  } else {
    const res = await supabase.from("guest_comments").select("*").gte("tgl", `${tahun}-01-01`).lte("tgl", `${tahun}-12-31`);
    if (res.error) { console.error(res.error); return; }
    data = res.data;
  }

  renderCharts(data);
}

// ------------ Utils ------------
function destroyIfExists(canvasId) {
  const canvas = document.getElementById(canvasId);
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
}

function groupByMonth(data, field) {
  const res = {};
  data.forEach(r => {
    const date = new Date(r.tgl);
    const month = date.toLocaleString("default", { month: "short" });
    const key = r[field] || "Lainnya";
    res[key] = res[key] || {};
    res[key][month] = (res[key][month] || 0) + 1;
  });
  return res;
}

// ------------ Render ------------
function renderCharts(rows) {
  if (!rows || !rows.length) return;

  // Line charts per kategori
  renderLine("pieAsal", "Asal Responden", groupByMonth(rows, "asal"));
  renderLine("pieMedia", "Media Sosial", groupByMonth(rows, "media_source"));
  renderLine("pieAcara", "Acara", groupByMonth(rows, "event_type"));
  renderLine("pieUsia", "Usia", groupByMonth(rows, "age_range"));

  // Rating chart (tetap bar chart rata-rata)
  const avg = (f) => rows.reduce((s, r) => s + (r[f] || 0), 0) / rows.length;
  chartRating = renderBar("barRating", {
    avg_food_quality: avg("food_quality"),
    avg_beverage_quality: avg("beverage_quality"),
    avg_serving_speed: avg("serving_speed"),
    avg_service: avg("service_rating"),
    avg_cleanliness: avg("cleanliness"),
    avg_ambience: avg("ambience"),
    avg_price: avg("price_rating")
  });
}

function renderLine(canvasId, title, grouped) {
  destroyIfExists(canvasId);
  const canvas = document.getElementById(canvasId);

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const datasets = Object.entries(grouped).map(([cat, counts], i) => ({
    label: cat,
    data: months.map(m => counts[m] || 0),
    borderColor: COLORS[i % COLORS.length],
    backgroundColor: COLORS[i % COLORS.length],
    tension: 0.3,
    fill: false,
    pointRadius: 4,
    pointHoverRadius: 6
  }));

  return new Chart(canvas, {
    type: "line",
    data: { labels: months, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true }, title: { display: false } },
      interaction: { mode: "index", intersect: false },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function renderBar(canvasId, rating) {
  destroyIfExists(canvasId);
  const canvas = document.getElementById(canvasId);
  return new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Food Quality","Beverage Quality","Serving Speed","Service","Cleanliness","Ambience","Price"],
      datasets: [{
        label: "Average",
        data: [
          rating.avg_food_quality,
          rating.avg_beverage_quality,
          rating.avg_serving_speed,
          rating.avg_service,
          rating.avg_cleanliness,
          rating.avg_ambience,
          rating.avg_price
        ],
        backgroundColor: COLORS
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
