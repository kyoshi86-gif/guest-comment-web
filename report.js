// report.js
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

// ----------------- PLUGIN: OUTLABELS (custom, Chart.js v4 safe) -----------------
// ----------------- PLUGIN: OUTLABELS (custom, Chart.js v4 safe) -----------------
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

      const start = arc.startAngle;
      const end = arc.endAngle;
      const mid = (start + end) / 2;

      const cx = arc.x;
      const cy = arc.y;
      const outer = arc.outerRadius || Math.min(chart.width, chart.height) / 2;

      const lineStartX = cx + Math.cos(mid) * (outer * 0.9);
      const lineStartY = cy + Math.sin(mid) * (outer * 0.9);

      const lineEndX = cx + Math.cos(mid) * (outer + 18);
      const lineEndY = cy + Math.sin(mid) * (outer + 18);

      const isRight = Math.cos(mid) >= 0;
      const textX = lineEndX + (isRight ? 8 : -8);
      const textY = lineEndY + 4;

      // leader line
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

      // label text di 2 baris
      const label = chart.data.labels[i] ?? "Lainnya";
      const percent = total ? ((value / total) * 100).toFixed(1) : "0.0";

      ctx.font = "12px Arial";
      ctx.fillStyle = "#111";
      ctx.textAlign = isRight ? "left" : "right";

      // baris pertama: Label — value
      ctx.fillText(`${label} — ${value}`, textX, textY);

      // baris kedua: (percent%)
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
        // top y coordinate of bar
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

// ----------------- UTILS & SUPABASE + CHART LOGIC (tetap seperti strukturmu) -----------------
let pieAsal, pieMedia, pieAcara, pieUsia, barRating;

document.addEventListener("DOMContentLoaded", async () => {
  await loadTahun();
  setDefaultFilters();
  await loadReport();

  document.getElementById("btnProses").addEventListener("click", loadReport);
  document.getElementById("btnReset").addEventListener("click", resetFilters);

  document.getElementById("startDate").addEventListener("change", handleDateChange);
  document.getElementById("endDate").addEventListener("change", handleDateChange);
});

// handle date picker change (validasi & toggle)
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
  // coba ambil tahun unik dari view; fallback jika kosong isi 1 tahun
  const { data, error } = await supabase.from("v_feedback_report").select("tahun").order("tahun", {ascending:false});
  if (error || !data) {
    console.warn("loadTahun: fallback karena error atau data kosong", error);
    const sel = document.getElementById("tahun");
    sel.innerHTML = `<option value="${new Date().getFullYear()}">${new Date().getFullYear()}</option>`;
    return;
  }
  const years = [...new Set(data.map(r => r.tahun))];
  const sel = document.getElementById("tahun");
  sel.innerHTML = "";
  years.forEach(y => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    sel.appendChild(opt);
  });
  // set default to first (latest)
  if (years.length) sel.value = years[0];
}

function resetFilters() {
  setDefaultFilters();
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  toggleFilters(false);
  loadReport();
}

async function loadReport() {
  const tahun = document.getElementById("tahun").value;
  const bulan = document.getElementById("bulan").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  let data = [];

  if (startDate && endDate) {
    // ambil dari tabel asli, lalu agregasi manual
    const res = await supabase.from("guest_comments").select("*").gte("tgl", startDate).lte("tgl", endDate);
    if (res.error) { console.error("loadReport error:", res.error); alert("Gagal mengambil data berdasarkan tanggal!"); return; }
    data = aggregateManual(res.data);
  } else {
    // ambil dari view agregasi
    let q = supabase.from("v_feedback_report").select("*");
    if (tahun) q = q.eq("tahun", tahun);
    if (bulan) q = q.eq("bulan", bulan);
    const res = await q;
    if (res.error) { console.error("loadReport error:", res.error); alert("Gagal mengambil data laporan!"); return; }
    data = res.data;
  }

  // render chart
  renderCharts(data);
}

function aggregateManual(rows) {
  if (!rows || rows.length === 0) return [];
  const avg = field => rows.reduce((s, r) => s + (r[field] || 0), 0) / rows.length;
  return [
    {
      asal: null,
      asal_count: countBy(rows, "asal"),
      media_source: null,
      media_count: countBy(rows, "media_source"),
      event_type: null,
      acara_count: countBy(rows, "event_type"),
      age_range: null,
      usia_count: countBy(rows, "age_range"),
      avg_food_quality: avg("food_quality"),
      avg_beverage_quality: avg("beverage_quality"),
      avg_serving_speed: avg("serving_speed"),
      avg_service: avg("service_rating"),
      avg_cleanliness: avg("cleanliness"),
      avg_ambience: avg("ambience"),
      avg_price: avg("price_rating"),
    }
  ];
}

function countBy(rows, field) {
  const m = {};
  rows.forEach(r => {
    const k = r[field] || "Lainnya";
    m[k] = (m[k] || 0) + 1;
  });
  return m;
}

// Render helpers
function objToArray(obj) {
  return Object.entries(obj).map(([label, value]) => ({label, value}));
}

function groupCount(data, field, fieldCount) {
  const res = {};
  data.forEach(row => {
    const k = row[field] || "Lainnya";
    res[k] = (res[k] || 0) + (row[fieldCount] || 0);
  });
  return Object.entries(res).map(([label, value]) => ({label, value}));
}

// Destroy chart safely by canvas element
function destroyIfExists(canvasId) {
  const canvas = document.getElementById(canvasId);
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
}

// Main render
function renderCharts(data) {
  // jika data kosong, kosongkan chart area
  if (!data || data.length === 0) {
    ["pieAsal","pieMedia","pieAcara","pieUsia","barRating"].forEach(id => destroyIfExists(id));
    return;
  }

  // prepare datasets
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

  // render pies
  pieAsal = renderPie("pieAsal", "Asal", asalData);
  pieMedia = renderPie("pieMedia", "Media Sosial", mediaData);
  pieAcara = renderPie("pieAcara", "Acara", acaraData);
  pieUsia = renderPie("pieUsia", "Usia", usiaData);

  // render bar (rata-rata)
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

// renderPie menggunakan plugin outlabelsPlugin
function renderPie(canvasId, title, dataset) {
  destroyIfExists(canvasId);
  const canvas = document.getElementById(canvasId);

  const labels = dataset.map(d => d.label);
  const values = dataset.map(d => d.value);

  const cfg = {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: COLORS.slice(0, values.length)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 20, bottom: 40 }},
      plugins: {
        legend: { display: false }, // hilangkan legend
        title: { display: false, text: title, padding: {top: 8, bottom: 8} },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.raw;
              const tot = values.reduce((s,x)=>s+(x||0),0);
              const p = tot ? ((v/tot)*100).toFixed(1) : "0.0";
              return `${ctx.label}: ${v} (${p}%)`;
            }
          }
        }
      }
    },
    plugins: [outlabelsPlugin] // plugin custom menggambar garis & label di luar
  };

  return new Chart(canvas, cfg);
}

// renderBar dengan plugin barLabelPlugin
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
        title: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 }, grid: { display: true } },
        x: { grid: { display: false } }
      },
      // <<< Tambah onClick event di sini
      onClick: async (evt, elements) => {
        if (elements.length > 0) {
          const tahun = document.getElementById("tahun").value;
          await showYTDChart(tahun);
        }
      }
    },
    plugins: [barLabelPlugin]
  };

  return new Chart(canvas, cfg);
}


// ---- Fungsi untuk render Year-to-Date Chart ----
async function showYTDChart(tahun) {
  // ambil data per bulan sepanjang tahun
  const { data, error } = await supabase
    .from("v_feedback_report")
    .select("*")
    .eq("tahun", tahun)
    .order("bulan", { ascending: true });

  if (error) {
    console.error("YTD error:", error);
    alert("Gagal ambil data YTD!");
    return;
  }

  const bulanLabels = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

  const datasets = [
    { key: "avg_food_quality", label: "Food Quality", color: COLORS[0] },
    { key: "avg_beverage_quality", label: "Beverage Quality", color: COLORS[1] },
    { key: "avg_serving_speed", label: "Serving Speed", color: COLORS[2] },
    { key: "avg_service", label: "Service", color: COLORS[3] },
    { key: "avg_cleanliness", label: "Cleanliness", color: COLORS[4] },
    { key: "avg_ambience", label: "Ambience", color: COLORS[5] },
    { key: "avg_price", label: "Price", color: COLORS[6] },
  ].map(cfg => ({
    label: cfg.label,
    data: data.map(r => r[cfg.key] || 0),
    borderColor: cfg.color,
    backgroundColor: cfg.color,
    tension: 0.3
  }));

  // hancurkan semua chart sebelumnya
  ["pieAsal","pieMedia","pieAcara","pieUsia","barRating"].forEach(id => destroyIfExists(id));

  const canvas = document.getElementById("barRating");
  const ctx = canvas.getContext("2d");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: bulanLabels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: `Year-to-Date Ratings (${tahun})` }
      },
      scales: {
        y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } }
      }
    }
  });

  // Tambahkan tombol kembali
  const container = canvas.closest(".card-body");
  let btnBack = document.getElementById("btnBack");
  if (!btnBack) {
    btnBack = document.createElement("button");
    btnBack.id = "btnBack";
    btnBack.className = "btn btn-sm btn-outline-secondary mt-2";
    btnBack.textContent = "⬅ Kembali ke Ringkasan";
    btnBack.onclick = loadReport;
    container.appendChild(btnBack);
  }
}

// ==== Ubah onClick di renderBar ====
onClick: async (evt, elements) => {
  if (elements.length > 0) {
    const tahun = document.getElementById("tahun").value;
    await showYTDChartsPerKategori(tahun);
  }
}

// Fungsi tampilkan YTD per kategori (line chart terpisah)
async function showYTDChartsPerKategori(tahun) {
  const { data, error } = await supabase
    .from("v_feedback_report")
    .select("*")
    .eq("tahun", tahun)
    .order("bulan", { ascending: true });

  if (error) {
    console.error(error);
    alert("Gagal ambil data YTD");
    return;
  }

  const bulanLabels = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

  const categories = [
    { key: "avg_food_quality", label: "Food Quality", color: COLORS[0] },
    { key: "avg_beverage_quality", label: "Beverage Quality", color: COLORS[1] },
    { key: "avg_serving_speed", label: "Serving Speed", color: COLORS[2] },
    { key: "avg_service", label: "Service", color: COLORS[3] },
    { key: "avg_cleanliness", label: "Cleanliness", color: COLORS[4] },
    { key: "avg_ambience", label: "Ambience", color: COLORS[5] },
    { key: "avg_price", label: "Price", color: COLORS[6] },
  ];

  // kosongkan isi container
  const container = document.querySelector("#chartContainer");
  container.innerHTML = "";

  // generate chart per kategori
  categories.forEach(cat => {
    const col = document.createElement("div");
    col.className = "col-md-6"; // 2 kolom per row

    col.innerHTML = `
      <div class="card">
        <div class="card-header">${cat.label} (YTD ${tahun})</div>
        <div class="card-body chart-container">
          <canvas id="line-${cat.key}"></canvas>
        </div>
      </div>
    `;
    container.appendChild(col);

    const ctx = col.querySelector("canvas").getContext("2d");

    new Chart(ctx, {
      type: "line",
      data: {
        labels: bulanLabels,
        datasets: [{
          label: cat.label,
          data: data.map(r => r[cat.key] || 0),
          borderColor: cat.color,
          backgroundColor: cat.color,
          tension: 0.3,
          fill: false,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: cat.color
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
          datalabels: {
            align: 'top',
            anchor: 'end',
            formatter: v => v.toFixed(2)
          }
        },
        scales: {
          y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } }
        }
      }
    });
  });

  // Tombol kembali
  let btnBack = document.getElementById("btnBack");
  if (!btnBack) {
    btnBack = document.createElement("button");
    btnBack.id = "btnBack";
    btnBack.className = "btn btn-sm btn-outline-secondary my-3";
    btnBack.textContent = "⬅ Kembali ke Ringkasan";
    btnBack.onclick = loadReport;
    container.prepend(btnBack);
  }
}
