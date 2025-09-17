// report.js
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Supabase config (tidak usah ubah kecuali perlu)
const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";
const supabase = createClient(supabaseUrl, supabaseKey);

// Konstanta
const COLORS = ["#4e79a7","#f28e2b","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ac"];
const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

// ----------------- PLUGIN: OUTLABELS -----------------
const outlabelsPlugin = {
  id: 'outlabelsPlugin',
  afterDraw(chart) {
    if (chart.config.type !== 'pie' && chart.config.type !== 'doughnut') return;
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0] || {data:[]};
    const meta = chart.getDatasetMeta(0);
    const total = (dataset.data || []).reduce((s, v) => s + (v || 0), 0);
    if (!meta || !meta.data) return;
    meta.data.forEach((arc, i) => {
      const value = (dataset.data[i] || 0);
      if (value === 0) return;
      const start = arc.startAngle, end = arc.endAngle, mid = (start+end)/2;
      const cx = arc.x, cy = arc.y;
      const outer = arc.outerRadius || Math.min(chart.width, chart.height)/2;
      const lineStartX = cx + Math.cos(mid) * (outer * 0.9);
      const lineStartY = cy + Math.sin(mid) * (outer * 0.9);
      const lineEndX = cx + Math.cos(mid) * (outer + 18);
      const lineEndY = cy + Math.sin(mid) * (outer + 18);
      const isRight = Math.cos(mid) >= 0;
      const textX = lineEndX + (isRight ? 8 : -8);
      const textY = lineEndY + 4;

      ctx.save();
      ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lineStartX, lineStartY); ctx.lineTo(lineEndX, lineEndY); ctx.stroke();

      ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(lineEndX, lineEndY, 2.5, 0, Math.PI*2); ctx.fill();

      const label = chart.data.labels[i] ?? "Lainnya";
      const percent = total ? ((value/total)*100).toFixed(1) : "0.0";

      ctx.font = "12px Arial"; ctx.fillStyle = "#111"; ctx.textAlign = isRight ? "left" : "right";
      ctx.fillText(`${label} — ${value}`, textX, textY);
      ctx.fillText(`(${percent}%)`, textX, textY + 14);
      ctx.restore();
    });
  }
};

// ----------------- PLUGIN: BAR LABELS -----------------
const barLabelPlugin = {
  id: 'barLabelPlugin',
  afterDatasetsDraw(chart) {
    if (chart.config.type !== 'bar') return;
    const ctx = chart.ctx;
    chart.data.datasets.forEach((dataset, dsIndex) => {
      const meta = chart.getDatasetMeta(dsIndex);
      meta.data.forEach((bar, index) => {
        const val = dataset.data[index];
        if (val === null || val === undefined) return;
        const x = bar.x;
        const y = bar.y - 6;
        ctx.save();
        ctx.fillStyle = '#111'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
        ctx.fillText(Number(val).toFixed(2), x, y);
        ctx.restore();
      });
    });
  }
};

// ----------------- GLOBALS -----------------
let pieAsal, pieMedia, pieAcara, pieUsia, barRating;
let ytdData = []; // akan terisi saat showYTD dipanggil

// ----------------- HELPERS -----------------
function destroyIfExists(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
}

function objToArray(obj) {
  return Object.entries(obj || {}).map(([label, value]) => ({label, value}));
}

function groupCount(data, field, fieldCount) {
  const res = {};
  (data||[]).forEach(row => {
    const k = row[field] || "Lainnya";
    res[k] = (res[k] || 0) + (row[fieldCount] || 0);
  });
  return Object.entries(res).map(([label, value]) => ({label, value}));
}

function countBy(rows, field) {
  const m = {};
  (rows||[]).forEach(r => {
    const k = r[field] || "Lainnya";
    m[k] = (m[k] || 0) + 1;
  });
  return m;
}

// Ambil nilai rata-rata tiap bulan: kembalikan array 12 (Jan..Des) berisi number atau null
function getMonthlyValues(rows, field) {
  const map = {}; // bulan -> {sum, count}
  (rows || []).forEach(r => {
    const b = Number(r.bulan);
    if (!b || b < 1 || b > 12) return;
    const raw = r[field];
    // jika nilai kosong/NULL di sumber → abaikan (tandai tidak ada)
    if (raw === null || raw === undefined || raw === "") {
      // jangan masukkan sebagai 0; ini dianggap 'tidak ada'
      return;
    }
    const v = Number(raw);
    if (isNaN(v)) return;
    if (!map[b]) map[b] = { sum: 0, count: 0 };
    map[b].sum += v;
    map[b].count += 1;
  });

  const arr = new Array(12).fill(null);
  for (let m = 1; m <= 12; m++) {
    if (map[m]) arr[m - 1] = map[m].sum / map[m].count; // rata-rata bulan m
    else arr[m - 1] = null; // tidak ada data -> null => gap
  }
  return arr;
}

// ----------------- LOAD TAHUN & FILTERS -----------------
async function loadTahun() {
  try {
    const res = await supabase.from("v_feedback_report").select("tahun").order("tahun", { ascending: false });
    const sel = document.getElementById("tahun");
    sel.innerHTML = "";
    const currentYear = new Date().getFullYear();
    if (!res || res.error || !res.data || res.data.length === 0) {
      const opt = document.createElement("option"); opt.value = currentYear; opt.textContent = currentYear; sel.appendChild(opt);
      sel.value = currentYear;
      return;
    }
    const years = [...new Set(res.data.map(r => r.tahun))];
    if (!years.includes(currentYear)) years.unshift(currentYear);
    years.forEach(y => { const opt = document.createElement("option"); opt.value = y; opt.textContent = y; sel.appendChild(opt); });
    sel.value = currentYear;
  } catch (err) {
    console.warn("loadTahun error:", err);
    const sel = document.getElementById("tahun");
    const cy = new Date().getFullYear();
    sel.innerHTML = `<option value="${cy}">${cy}</option>`;
    sel.value = cy;
  }
}

function setDefaultFilters() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const selT = document.getElementById("tahun");
  if (selT) {
    // pastikan currentYear ada
    const found = Array.from(selT.options).some(o => Number(o.value) === currentYear);
    if (!found) {
      const o = document.createElement("option"); o.value = currentYear; o.textContent = currentYear; selT.insertBefore(o, selT.firstChild);
    }
    selT.value = currentYear;
  }
  const selB = document.getElementById("bulan");
  if (selB) selB.value = currentMonth; // set ke bulan berjalan
}

function toggleFilters(disable) {
  const t = document.getElementById("tahun"); const b = document.getElementById("bulan");
  if (t) t.disabled = disable; if (b) b.disabled = disable;
}

function handleDateChange() {
  const s = document.getElementById("startDate").value;
  const e = document.getElementById("endDate").value;
  if (s && e && s > e) { alert("Tanggal awal tidak boleh lebih besar dari tanggal akhir!"); document.getElementById("endDate").value = ""; return; }
  toggleFilters(Boolean(s || e));
}

function resetFilters() {
  setDefaultFilters();
  const sd = document.getElementById("startDate"); const ed = document.getElementById("endDate");
  if (sd) sd.value = ""; if (ed) ed.value = ""; toggleFilters(false); loadReport();
}

// ----------------- LOAD & AGGREGATE -----------------
async function loadReport() {
  const tahun = document.getElementById("tahun").value;
  const bulan = document.getElementById("bulan").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  try {
    let out = [];
    if (startDate && endDate) {
      const res = await supabase.from("guest_comments").select("*").gte("tgl", startDate).lte("tgl", endDate);
      if (res.error) { console.error("loadReport error:", res.error); alert("Gagal mengambil data berdasarkan tanggal!"); return; }
      out = aggregateManual(res.data);
    } else {
      let q = supabase.from("v_feedback_report").select("*");
      if (tahun) q = q.eq("tahun", tahun);
      if (bulan) q = q.eq("bulan", bulan);
      const res = await q;
      if (res.error) { console.error("loadReport error:", res.error); alert("Gagal mengambil data laporan!"); return; }
      out = res.data || [];
    }
    renderCharts(out);
  } catch (err) {
    console.error("loadReport exception:", err);
  }
}

function aggregateManual(rows) {
  if (!rows || rows.length === 0) return [];
  const avg = (field) => rows.reduce((s, r) => s + (Number(r[field]) || 0), 0) / rows.length;
  return [{
    asal: null, asal_count: countBy(rows,"asal"),
    media_source: null, media_count: countBy(rows,"media_source"),
    event_type: null, acara_count: countBy(rows,"event_type"),
    age_range: null, usia_count: countBy(rows,"age_range"),
    avg_food_quality: avg("food_quality"),
    avg_beverage_quality: avg("beverage_quality"),
    avg_serving_speed: avg("serving_speed"),
    avg_service: avg("service_rating"),
    avg_cleanliness: avg("cleanliness"),
    avg_ambience: avg("ambience"),
    avg_price: avg("price_rating"),
  }];
}

// ----------------- RENDER CHARTS -----------------
function renderCharts(data) {
  if (!data || data.length === 0) {
    ["pieAsal","pieMedia","pieAcara","pieUsia","barRating"].forEach(id => destroyIfExists(id));
    return;
  }

  let asalData, mediaData, acaraData, usiaData;
  if (data.length === 1 && typeof data[0].asal_count === "object") {
    asalData = objToArray(data[0].asal_count);
    mediaData = objToArray(data[0].media_count);
    acaraData = objToArray(data[0].acara_count);
    usiaData = objToArray(data[0].usia_count);
  } else {
    asalData = groupCount(data, "asal", "asal_count");
    mediaData = groupCount(data, "media_source", "media_count");
    acaraData = groupCount(data, "event_type", "acara_count");
    usiaData = groupCount(data, "age_range", "usia_count");
  }

  pieAsal = renderPie("pieAsal", "Asal", asalData);
  pieMedia = renderPie("pieMedia", "Media Sosial", mediaData);
  pieAcara = renderPie("pieAcara", "Acara", acaraData);
  pieUsia = renderPie("pieUsia", "Usia", usiaData);

  const rating = data[0] || {};
  barRating = renderBar("barRating", {
    avg_food_quality: rating.avg_food_quality,
    avg_beverage_quality: rating.avg_beverage_quality,
    avg_serving_speed: rating.avg_serving_speed,
    avg_service: rating.avg_service,
    avg_cleanliness: rating.avg_cleanliness,
    avg_ambience: rating.avg_ambience,
    avg_price: rating.avg_price
  });
}

function renderPie(canvasId, title, dataset) {
  destroyIfExists(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const labels = (dataset||[]).map(d=>d.label);
  const values = (dataset||[]).map(d=>d.value);

  const cfg = {
    type: 'pie',
    data: { labels, datasets: [{ data: values, backgroundColor: COLORS.slice(0, values.length) }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top:20, bottom:40 } },
      plugins: {
        legend: { display: false },
        title: { display: false, text: title },
        tooltip: { callbacks: { label: (ctx) => { const v = ctx.raw; const tot = values.reduce((s,x)=>s+(x||0),0); const p = tot ? ((v/tot)*100).toFixed(1) : "0.0"; return `${ctx.label}: ${v} (${p}%)`; } } }
      }
    },
    plugins: [outlabelsPlugin]
  };

  return new Chart(canvas, cfg);
}

function renderBar(canvasId, rating) {
  destroyIfExists(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const labels = ["Food Quality","Beverage Quality","Serving Speed","Service","Cleanliness","Ambience","Price"];
  const dataVals = [
    rating.avg_food_quality ?? 0,
    rating.avg_beverage_quality ?? 0,
    rating.avg_serving_speed ?? 0,
    rating.avg_service ?? 0,
    rating.avg_cleanliness ?? 0,
    rating.avg_ambience ?? 0,
    rating.avg_price ?? 0,
  ];

  const cfg = {
    type: 'bar',
    data: { labels, datasets: [{ label:'Average', data: dataVals, backgroundColor: COLORS.slice(0, labels.length) }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding:20 },
      plugins: { legend:{display:false}, title:{display:false} },
      scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 } }, x: { grid: { display:false } } },
      onClick: (evt, elements) => { if (elements && elements.length > 0) showYTD(); }
    },
    plugins: [barLabelPlugin]
  };

  return new Chart(canvas, cfg);
}

// ----------------- SHOW YTD & LINE CHARTS -----------------
async function showYTD() {
  const tahun = document.getElementById("tahun").value || new Date().getFullYear();
  try {
    const res = await supabase.from("v_feedback_report").select("*").eq("tahun", tahun).order("bulan", { ascending: true });
    if (res.error) { console.error("Gagal ambil data YTD:", res.error); alert("Gagal mengambil data YTD. Cek console."); return; }
    ytdData = res.data || [];

    // toggle view
    const main = document.getElementById("mainCharts");
    const ytd = document.getElementById("ytdSection");
    const container = document.getElementById("lineChartsContainer");
    if (main) main.style.display = "none";
    if (ytd) ytd.style.display = "block";
    if (container) container.style.display = "grid";

    const charts = [
      { id: "chart_food", field: "avg_food_quality", label: "Food Quality" },
      { id: "chart_beverage", field: "avg_beverage_quality", label: "Beverage" },
      { id: "chart_speed", field: "avg_serving_speed", label: "Serving Speed" },
      { id: "chart_service", field: "avg_service", label: "Service" },
      { id: "chart_cleanliness", field: "avg_cleanliness", label: "Cleanliness" },
      { id: "chart_ambience", field: "avg_ambience", label: "Ambience" },
      { id: "chart_price", field: "avg_price", label: "Price" }
    ];

    charts.forEach(cfg => renderLineChart(cfg.id, cfg));
  } catch (err) {
    console.error("showYTD exception:", err);
  }
}

function renderLineChart(canvasId, cfg) {
  destroyIfExists(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Dapatkan 12 nilai (null bila tidak ada)
  const values = getMonthlyValues(ytdData, cfg.field);

  const cfgChart = {
    type: "line",
    data: {
      labels: MONTHS,
      datasets: [{
        label: cfg.label,
        data: values,
        borderColor: "#4e79a7",
        backgroundColor: "rgba(78,121,167,0.12)",
        fill: false,      // <--- penting: jangan fill supaya tidak 'menjuntai' ke bawah
        spanGaps: false,  // <--- penting: jangan sambung titik null -> akan putus
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      elements: { line: { borderWidth: 2 } },
      plugins: { legend: { display: false }, title: { display: true, text: cfg.label } },
      scales: {
        y: { min: 0, max: 5, ticks: { stepSize: 1 } },
        x: { grid: { display: false } }
      }
    }
  };

  return new Chart(canvas, cfgChart);
}

// ----------------- DOM READY: pasang listener & inisialisasi -----------------
document.addEventListener("DOMContentLoaded", async () => {
  await loadTahun();
  setDefaultFilters();
  await loadReport();

  const btnProses = document.getElementById("btnProses");
  const btnReset = document.getElementById("btnReset");
  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");
  const btnBack = document.getElementById("btnBack");

  if (btnProses) btnProses.addEventListener("click", loadReport);
  if (btnReset) btnReset.addEventListener("click", resetFilters);
  if (startDate) startDate.addEventListener("change", handleDateChange);
  if (endDate) endDate.addEventListener("change", handleDateChange);
  if (btnBack) btnBack.addEventListener("click", () => {
    const main = document.getElementById("mainCharts");
    const ytd = document.getElementById("ytdSection");
    if (ytd) ytd.style.display = "none";
    if (main) main.style.display = "block";
  });
});
