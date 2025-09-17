// report.js
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Supabase config
const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";
const supabase = createClient(supabaseUrl, supabaseKey);

// Warna konsisten
const COLORS = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2",
  "#59a14f", "#edc949", "#af7aa1", "#ff9da7",
  "#9c755f", "#bab0ac"
];

// ----------------- PLUGIN PIE LABELS -----------------
const outlabelsPlugin = {
  id: 'outlabelsPlugin',
  afterDraw(chart) {
    if (chart.config.type !== 'pie' && chart.config.type !== 'doughnut') return;
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    const total = dataset.data.reduce((s, v) => s + (v || 0), 0);
    if (!meta || !meta.data) return;

    meta.data.forEach((arc, i) => {
      const value = dataset.data[i] || 0;
      if (value === 0) return;
      const mid = (arc.startAngle + arc.endAngle) / 2;

      const cx = arc.x;
      const cy = arc.y;
      const outer = arc.outerRadius;

      const lineStartX = cx + Math.cos(mid) * (outer * 0.9);
      const lineStartY = cy + Math.sin(mid) * (outer * 0.9);
      const lineEndX = cx + Math.cos(mid) * (outer + 18);
      const lineEndY = cy + Math.sin(mid) * (outer + 18);

      const isRight = Math.cos(mid) >= 0;
      const textX = lineEndX + (isRight ? 8 : -8);
      const textY = lineEndY + 4;

      ctx.save();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lineStartX, lineStartY);
      ctx.lineTo(lineEndX, lineEndY);
      ctx.stroke();
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(lineEndX, lineEndY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      const label = chart.data.labels[i] ?? "Lainnya";
      const percent = total ? ((value / total) * 100).toFixed(1) : "0.0";

      ctx.font = "12px Arial";
      ctx.textAlign = isRight ? "left" : "right";
      ctx.fillText(`${label} — ${value}`, textX, textY);
      ctx.fillText(`(${percent}%)`, textX, textY + 14);
      ctx.restore();
    });
  }
};

// ----------------- PLUGIN BAR LABELS -----------------
const barLabelPlugin = {
  id: 'barLabelPlugin',
  afterDatasetsDraw(chart) {
    if (chart.config.type !== 'bar') return;
    const ctx = chart.ctx;
    chart.data.datasets.forEach((dataset, dsIndex) => {
      const meta = chart.getDatasetMeta(dsIndex);
      meta.data.forEach((bar, index) => {
        const val = dataset.data[index];
        if (val == null) return;
        const x = bar.x;
        const y = bar.y - 6;
        ctx.save();
        ctx.fillStyle = '#111';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(Number(val).toFixed(2), x, y);
        ctx.restore();
      });
    });
  }
};

// ----------------- GLOBAL VAR -----------------
let pieAsal, pieMedia, pieAcara, pieUsia, barRating;

// ----------------- INIT -----------------
document.addEventListener("DOMContentLoaded", async () => {
  await loadTahun();
  setDefaultFilters();
  await loadReport();

  document.getElementById("btnProses").addEventListener("click", loadReport);
  document.getElementById("btnReset").addEventListener("click", resetFilters);

  document.getElementById("startDate").addEventListener("change", handleDateChange);
  document.getElementById("endDate").addEventListener("change", handleDateChange);

  document.getElementById("btnBack").addEventListener("click", () => {
    document.getElementById("ytdSection").style.display = "none";
    document.getElementById("lineChartsContainer").style.display = "none";
    document.getElementById("mainCharts").style.display = "flex";
  });
});

// ----------------- FILTER HANDLER -----------------
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
  const { data, error } = await supabase.from("v_feedback_report").select("tahun").order("tahun", { ascending: false });
  const sel = document.getElementById("tahun");
  if (error || !data) {
    const y = new Date().getFullYear();
    sel.innerHTML = `<option value="${y}">${y}</option>`;
    return;
  }
  const years = [...new Set(data.map(r => r.tahun))];
  sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");
  if (years.length) sel.value = years[0];
}

function resetFilters() {
  setDefaultFilters();
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  toggleFilters(false);
  loadReport();
}

// ----------------- LOAD REPORT -----------------
async function loadReport() {
  const tahun = document.getElementById("tahun").value;
  const bulan = document.getElementById("bulan").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  let data = [];
  if (startDate && endDate) {
    const res = await supabase.from("guest_comments").select("*").gte("tgl", startDate).lte("tgl", endDate);
    if (res.error) { alert("Gagal ambil data tanggal!"); return; }
    data = aggregateManual(res.data);
  } else {
    let q = supabase.from("v_feedback_report").select("*");
    if (tahun) q = q.eq("tahun", tahun);
    if (bulan) q = q.eq("bulan", bulan);
    const res = await q;
    if (res.error) { alert("Gagal ambil data laporan!"); return; }
    data = res.data;
  }
  renderCharts(data);
}

function aggregateManual(rows) {
  if (!rows || rows.length === 0) return [];
  const avg = f => rows.reduce((s, r) => s + (r[f] || 0), 0) / rows.length;
  return [{
    asal_count: countBy(rows, "asal"),
    media_count: countBy(rows, "media_source"),
    acara_count: countBy(rows, "event_type"),
    usia_count: countBy(rows, "age_range"),
    avg_food_quality: avg("food_quality"),
    avg_beverage_quality: avg("beverage_quality"),
    avg_serving_speed: avg("serving_speed"),
    avg_service: avg("service_rating"),
    avg_cleanliness: avg("cleanliness"),
    avg_ambience: avg("ambience"),
    avg_price: avg("price_rating"),
  }];
}

function countBy(rows, field) {
  const m = {};
  rows.forEach(r => { m[r[field] || "Lainnya"] = (m[r[field] || "Lainnya"] || 0) + 1; });
  return m;
}

// ----------------- RENDER -----------------
function destroyIfExists(canvasId) {
  const c = document.getElementById(canvasId);
  const ex = Chart.getChart(c);
  if (ex) ex.destroy();
}

function renderCharts(data) {
  if (!data || data.length === 0) return;

  const asalData = objToArray(data[0].asal_count);
  const mediaData = objToArray(data[0].media_count);
  const acaraData = objToArray(data[0].acara_count);
  const usiaData = objToArray(data[0].usia_count);

  pieAsal = renderPie("pieAsal", asalData);
  pieMedia = renderPie("pieMedia", mediaData);
  pieAcara = renderPie("pieAcara", acaraData);
  pieUsia = renderPie("pieUsia", usiaData);

  barRating = renderBar("barRating", data[0]);
}

function objToArray(obj) {
  return Object.entries(obj).map(([label, value]) => ({ label, value }));
}

function renderPie(canvasId, dataset) {
  destroyIfExists(canvasId);
  const c = document.getElementById(canvasId);
  return new Chart(c, {
    type: "pie",
    data: {
      labels: dataset.map(d => d.label),
      datasets: [{ data: dataset.map(d => d.value), backgroundColor: COLORS }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
    plugins: [outlabelsPlugin]
  });
}

function renderBar(canvasId, r) {
  destroyIfExists(canvasId);
  const c = document.getElementById(canvasId);
  return new Chart(c, {
    type: "bar",
    data: {
      labels: ["Food Quality","Beverage Quality","Serving Speed","Service","Cleanliness","Ambience","Price"],
      datasets: [{
        label: "Average",
        data: [
          r.avg_food_quality, r.avg_beverage_quality, r.avg_serving_speed,
          r.avg_service, r.avg_cleanliness, r.avg_ambience, r.avg_price
        ],
        backgroundColor: COLORS
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, onClick: () => showYTD(), plugins: { legend: { display: false } } },
    plugins: [barLabelPlugin]
  });
}

// ----------------- YTD -----------------
async function showYTD() {
  document.getElementById("mainCharts").style.display = "none";
  document.getElementById("ytdSection").style.display = "block";
  document.getElementById("lineChartsContainer").style.display = "grid";

  const tahun = document.getElementById("tahun").value;
  const { data, error } = await supabase.from("v_feedback_report").select("*").eq("tahun", tahun).order("bulan");
  if (error || !data) return;

  renderLineCharts(data);
}

function groupByMonthAverage(data, field) {
  const monthly = {};
  data.forEach(r => {
    const b = r.bulan;
    if (!monthly[b]) monthly[b] = { total: 0, count: 0 };
    monthly[b].total += Number(r[field] || 0);
    monthly[b].count++;
  });
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return monthly[m] ? monthly[m].total / monthly[m].count : null;
  });
}

function renderLineCharts(data) {
  const chartConfigs = [
    { id: "chart_food", label: "Food Quality", field: "avg_food_quality" },
    { id: "chart_beverage", label: "Beverage Quality", field: "avg_beverage_quality" },
    { id: "chart_speed", label: "Serving Speed", field: "avg_serving_speed" },
    { id: "chart_service", label: "Service", field: "avg_service" },
    { id: "chart_cleanliness", label: "Cleanliness", field: "avg_cleanliness" },
    { id: "chart_ambience", label: "Ambience", field: "avg_ambience" },
    { id: "chart_price", label: "Price", field: "avg_price" }
  ];

  chartConfigs.forEach(cfg => {
    destroyIfExists(cfg.id);
    const ctx = document.getElementById(cfg.id);
    if (!ctx) return;

    new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"],
        datasets: [{
          label: cfg.label,
          data: groupByMonthAverage(data, cfg.field),
          borderColor: "#4e79a7",
          backgroundColor: "rgba(78,121,167,0.2)",
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: "#76b7b2"
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: cfg.label } } }
    });
  });
}
