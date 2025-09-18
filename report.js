// report.js (REPLACE ALL with this)
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Supabase config - jangan ubah kecuali perlu
const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";
const supabase = createClient(supabaseUrl, supabaseKey);

// Constants
const COLORS = ["#4e79a7","#f28e2b","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ac"];
const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

// ----------------- PLUGINS -----------------
const outlabelsPlugin = {
  id: 'outlabelsPlugin',
  afterDraw(chart) {
    if (chart.config.type !== 'pie' && chart.config.type !== 'doughnut') return;
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0] || { data: [] };
    const meta = chart.getDatasetMeta(0);
    const total = (dataset.data || []).reduce((s, v) => s + (v || 0), 0);
    if (!meta || !meta.data) return;
    meta.data.forEach((arc, i) => {
      const value = dataset.data[i] || 0;
      if (value === 0) return;
      const start = arc.startAngle, end = arc.endAngle, mid = (start + end) / 2;
      const cx = arc.x, cy = arc.y;
      const outer = arc.outerRadius || Math.min(chart.width, chart.height) / 2;
      const sx = cx + Math.cos(mid) * (outer * 0.9);
      const sy = cy + Math.sin(mid) * (outer * 0.9);
      const ex = cx + Math.cos(mid) * (outer + 18);
      const ey = cy + Math.sin(mid) * (outer + 18);
      const isRight = Math.cos(mid) >= 0;
      const tx = ex + (isRight ? 8 : -8);
      const ty = ey + 4;
      ctx.save();
      ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2); ctx.fill();
      const label = chart.data.labels[i] ?? "Lainnya";
      const percent = total ? ((value / total) * 100).toFixed(1) : "0.0";
      ctx.font = "12px Arial"; ctx.fillStyle = "#111"; ctx.textAlign = isRight ? "left" : "right";
      ctx.fillText(`${label} — ${value}`, tx, ty);
      ctx.fillText(`(${percent}%)`, tx, ty + 14);
      ctx.restore();
    });
  }
};

const barLabelPlugin = {
  id: 'barLabelPlugin',
  afterDatasetsDraw(chart) {
    if (chart.config.type !== 'bar') return;
    const ctx = chart.ctx;
    chart.data.datasets.forEach((dataset) => {
      const meta = chart.getDatasetMeta(0);
      meta.data.forEach((bar, index) => {
        const val = dataset.data[index];
        if (val === null || val === undefined) return;
        const x = bar.x;
        const y = bar.y - 6;
        ctx.save(); ctx.fillStyle = '#111'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
        ctx.fillText(Number(val).toFixed(2), x, y); ctx.restore();
      });
    });
  }
};

// ----------------- GLOBALS -----------------
let pieAsal, pieMedia, pieAcara, pieUsia, barRating;
let ytdData = []; // will hold monthly aggregated array (length 12)

// ----------------- HELPERS -----------------
function destroyIfExists(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
}

function objToArray(obj) {
  return Object.entries(obj || {}).map(([label, value]) => ({ label, value }));
}

function groupCount(data, field, fieldCount) {
  const res = {};
  (data || []).forEach(row => {
    const k = row[field] || "Lainnya";
    res[k] = (res[k] || 0) + (Number(row[fieldCount]) || 0);
  });
  return Object.entries(res).map(([label, value]) => ({ label, value }));
}

function countBy(rows, field) {
  const m = {};
  (rows || []).forEach(r => {
    const k = r[field] || "Lainnya";
    m[k] = (m[k] || 0) + 1;
  });
  return m;
}

// determine reasonable weight for a row: prefer real counts if available
function getRowWeight(row) {
  const counts = [
    Number(row.asal_count) || 0,
    Number(row.media_count) || 0,
    Number(row.acara_count) || 0,
    Number(row.usia_count) || 0
  ].filter(n => isFinite(n) && n > 0);
  let w = 0;
  if (counts.length) w = Math.max(...counts);
  if (!w) w = 1;
  return w;
}

// Aggregate view rows into one fixed-length (12) monthly array,
// each element has fields avg_food_quality ... avg_price (numbers or null)
function aggregateMonthlyFromView(rows) {
  // initialize accumulators
  const metrics = ["avg_food_quality","avg_beverage_quality","avg_serving_speed","avg_service","avg_cleanliness","avg_ambience","avg_price"];
  const months = Array.from({ length: 12 }, (_, i) => {
    const sums = {};
    const weights = {};
    metrics.forEach(m => { sums[m] = 0; weights[m] = 0; });
    return { bulan: i + 1, sums, weights };
  });

  (rows || []).forEach(row => {
    const b = Number(row.bulan);
    if (!Number.isInteger(b) || b < 1 || b > 12) return;
    const idx = b - 1;
    const w = getRowWeight(row);
    metrics.forEach(m => {
      const raw = row[m];
      if (raw === null || raw === undefined || raw === "") return;
      const num = Number(raw);
      if (!isFinite(num)) return;
      months[idx].sums[m] += num * w;
      months[idx].weights[m] += w;
    });
  });

  // finalize monthly averages (or null)
  return months.map(m => {
    const obj = { bulan: m.bulan };
    Object.keys(m.sums).forEach(metric => {
      const wt = m.weights[metric];
      if (wt && wt > 0) {
        let avg = m.sums[metric] / wt;
        if (!isFinite(avg)) obj[metric] = null;
        else {
          avg = Math.min(5, Math.max(0, avg));
          obj[metric] = Math.round(avg * 100) / 100;
        }
      } else {
        obj[metric] = null;
      }
    });
    return obj;
  });
}

// compute overall aggregated averages across arbitrary rows (for bar chart)
function computeOverallRatings(rows) {
  const metrics = ["avg_food_quality","avg_beverage_quality","avg_serving_speed","avg_service","avg_cleanliness","avg_ambience","avg_price"];
  const sums = Object.fromEntries(metrics.map(m => [m, 0]));
  const weights = Object.fromEntries(metrics.map(m => [m, 0]));
  (rows || []).forEach(row => {
    const w = getRowWeight(row);
    metrics.forEach(m => {
      const raw = row[m];
      if (raw === null || raw === undefined || raw === "") return;
      const num = Number(raw);
      if (!isFinite(num)) return;
      sums[m] += num * w;
      weights[m] += w;
    });
  });
  const out = {};
  metrics.forEach(m => {
    out[m] = weights[m] > 0 ? Math.round((sums[m] / weights[m]) * 100) / 100 : null;
  });
  return out;
}

// ----------------- CHART RENDERERS -----------------
function renderPie(canvasId, title, dataset) {
  destroyIfExists(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const labels = (dataset || []).map(d => d.label);
  const values = (dataset || []).map(d => d.value);
  const cfg = {
    type: 'pie',
    data: { labels, datasets: [{ data: values, backgroundColor: COLORS.slice(0, values.length) }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 20, bottom: 40 } },
      plugins: { legend: { display: false }, title: { display: false, text: title } }
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
    data: { labels, datasets: [{ label: 'Average', data: dataVals, backgroundColor: COLORS.slice(0, labels.length) }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: 20 },
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 } }, x: { grid: { display: false } } },
      onClick: (evt, elements) => { if (elements && elements.length > 0) showYTD(); }
    },
    plugins: [barLabelPlugin]
  };
  return new Chart(canvas, cfg);
}

function renderLineChart(canvasId, monthlyArray, cfg) {
  destroyIfExists(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  // monthlyArray must be length 12; pick values (number or null)
  const values = (monthlyArray || Array.from({length:12}, ()=>({})) ).map(r => {
    const v = r[cfg.field];
    return (v === null || v === undefined) ? null : Number(v);
  });

  const cfgChart = {
    type: "line",
    data: {
      labels: MONTHS,
      datasets: [{
        label: cfg.label,
        data: values,
        borderColor: "#4e79a7",
        backgroundColor: "rgba(78,121,167,0.12)",
        fill: false,       // NO fill -> avoid area drooping
        spanGaps: false,   // do not connect nulls -> gaps
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
      scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 } }, x: { grid: { display: false } } }
    }
  };
  return new Chart(canvas, cfgChart);
}

// ----------------- MAIN: loadReport & showYTD -----------------
async function loadTahun() {
  try {
    const res = await supabase.from("v_feedback_report").select("tahun").order("tahun", { ascending: false });
    const sel = document.getElementById("tahun");
    sel.innerHTML = "";
    const currentYear = new Date().getFullYear();
    if (!res || res.error || !res.data || res.data.length === 0) {
      const opt = document.createElement("option"); opt.value = currentYear; opt.textContent = currentYear; sel.appendChild(opt);
      sel.value = currentYear; return;
    }
    const years = [...new Set(res.data.map(r => r.tahun))];
    if (!years.includes(currentYear)) years.unshift(currentYear);
    years.forEach(y => { const o = document.createElement("option"); o.value = y; o.textContent = y; sel.appendChild(o); });
    sel.value = currentYear;
  } catch (err) {
    console.warn("loadTahun error:", err);
    const sel = document.getElementById("tahun"); const cy = new Date().getFullYear();
    sel.innerHTML = `<option value="${cy}">${cy}</option>`; sel.value = cy;
  }
}

function setDefaultFilters() {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  const selT = document.getElementById("tahun");
  if (selT) {
    const found = Array.from(selT.options).some(o => Number(o.value) === cy);
    if (!found) { const o = document.createElement("option"); o.value = cy; o.textContent = cy; selT.insertBefore(o, selT.firstChild); }
    selT.value = cy;
  }
  const selB = document.getElementById("bulan");
  if (selB) selB.value = cm;
}

function toggleFilters(disable) {
  const t = document.getElementById("tahun"), b = document.getElementById("bulan");
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
  const sd = document.getElementById("startDate"), ed = document.getElementById("endDate");
  if (sd) sd.value = ""; if (ed) ed.value = ""; toggleFilters(false); loadReport();
}

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
  const avg = (f) => rows.reduce((s, r) => s + (Number(r[f]) || 0), 0) / rows.length;
  return [{
    asal: null, asal_count: countBy(rows, "asal"),
    media_source: null, media_count: countBy(rows, "media_source"),
    event_type: null, acara_count: countBy(rows, "event_type"),
    age_range: null, usia_count: countBy(rows, "age_range"),
    avg_food_quality: avg("food_quality"),
    avg_beverage_quality: avg("beverage_quality"),
    avg_serving_speed: avg("serving_speed"),
    avg_service: avg("service_rating"),
    avg_cleanliness: avg("cleanliness"),
    avg_ambience: avg("ambience"),
    avg_price: avg("price_rating")
  }];
}

function renderCharts(data) {
  if (!data || data.length === 0) {
    ["pieAsal","pieMedia","pieAcara","pieUsia","barRating"].forEach(id => destroyIfExists(id));
    return;
  }

  let asalData, mediaData, acaraData, usiaData;
  if (data.length === 1 && typeof data[0].asal_count === "object") {
    // manual aggregated object from aggregateManual
    asalData = objToArray(data[0].asal_count);
    mediaData = objToArray(data[0].media_count);
    acaraData = objToArray(data[0].acara_count);
    usiaData = objToArray(data[0].usia_count);

    const rating = {
      avg_food_quality: data[0].avg_food_quality ?? 0,
      avg_beverage_quality: data[0].avg_beverage_quality ?? 0,
      avg_serving_speed: data[0].avg_serving_speed ?? 0,
      avg_service: data[0].avg_service ?? 0,
      avg_cleanliness: data[0].avg_cleanliness ?? 0,
      avg_ambience: data[0].avg_ambience ?? 0,
      avg_price: data[0].avg_price ?? 0
    };
    pieAsal = renderPie("pieAsal", "Asal", asalData);
    pieMedia = renderPie("pieMedia", "Media Sosial", mediaData);
    pieAcara = renderPie("pieAcara", "Acara", acaraData);
    pieUsia = renderPie("pieUsia", "Usia", usiaData);
    barRating = renderBar("barRating", rating);
  } else {
    // Data is rows from view (might be many rows for the same month)
    asalData = groupCount(data, "asal", "asal_count");
    mediaData = groupCount(data, "media_source", "media_count");
    acaraData = groupCount(data, "event_type", "acara_count");
    usiaData = groupCount(data, "age_range", "usia_count");

    pieAsal = renderPie("pieAsal", "Asal", asalData);
    pieMedia = renderPie("pieMedia", "Media Sosial", mediaData);
    pieAcara = renderPie("pieAcara", "Acara", acaraData);
    pieUsia = renderPie("pieUsia", "Usia", usiaData);

    // compute overall aggregated rating for the selected filter (tahun+bulan)
    const agg = computeOverallRatings(data);
    const rating = {
      avg_food_quality: agg.avg_food_quality ?? 0,
      avg_beverage_quality: agg.avg_beverage_quality ?? 0,
      avg_serving_speed: agg.avg_serving_speed ?? 0,
      avg_service: agg.avg_service ?? 0,
      avg_cleanliness: agg.avg_cleanliness ?? 0,
      avg_ambience: agg.avg_ambience ?? 0,
      avg_price: agg.avg_price ?? 0
    };
    barRating = renderBar("barRating", rating);
  }
}

// ----------------- showYTD -----------------
async function showYTD() {
  const tahun = document.getElementById("tahun").value || new Date().getFullYear();
  try {
    const res = await supabase
      .from("v_feedback_report")
      .select("bulan, avg_food_quality, avg_beverage_quality, avg_serving_speed, avg_service, avg_cleanliness, avg_ambience, avg_price, asal_count, media_count, acara_count, usia_count")
      .eq("tahun", tahun)
      .order("bulan", { ascending: true });

    if (res.error) { console.error("Gagal ambil data YTD:", res.error); alert("Gagal mengambil data YTD. Cek console."); return; }

    // Re-aggregate per month into exactly 12 rows
    const monthly = aggregateMonthlyFromView(res.data || []);
    ytdData = monthly; // store for potential debugging

    // toggle UI
    const main = document.getElementById("mainCharts");
    const ytd = document.getElementById("ytdSection");
    const container = document.getElementById("lineChartsContainer");
    if (main) main.style.display = "none";
    if (ytd) ytd.style.display = "block";
    if (container) container.style.display = "grid";

    // render 7 line charts (IDs in report.html: chart_food, chart_beverage, ...)
    renderLineChart("chart_food", monthly, { label: "Food Quality", field: "avg_food_quality" });
    renderLineChart("chart_beverage", monthly, { label: "Beverage", field: "avg_beverage_quality" });
    renderLineChart("chart_speed", monthly, { label: "Serving Speed", field: "avg_serving_speed" });
    renderLineChart("chart_service", monthly, { label: "Service", field: "avg_service" });
    renderLineChart("chart_cleanliness", monthly, { label: "Cleanliness", field: "avg_cleanliness" });
    renderLineChart("chart_ambience", monthly, { label: "Ambience", field: "avg_ambience" });
    renderLineChart("chart_price", monthly, { label: "Price", field: "avg_price" });

  } catch (err) {
    console.error("showYTD exception:", err);
  }
}

// ----------------- INIT & EVENTS -----------------
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
