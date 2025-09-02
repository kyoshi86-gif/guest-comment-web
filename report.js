// report.js
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// ✅ Ganti sesuai kredensial Supabase kamu
const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";
const supabase = createClient(supabaseUrl, supabaseKey);

let pieAsal, pieMedia, pieAcara, pieUsia, barRating;

// 🎨 Warna konsisten
const COLORS = [
  "#4285F4", "#EA4335", "#FBBC05", "#34A853",
  "#A142F4", "#FF6D01", "#46BDC6", "#9AA0A6"
];

// ================= INIT ==================
document.addEventListener("DOMContentLoaded", async () => {
  await loadTahun();
  setDefaultFilters();
  await loadReport();

  document.getElementById("btnProses").addEventListener("click", loadReport);
  document.getElementById("btnReset").addEventListener("click", resetFilters);

  document.getElementById("startDate").addEventListener("change", handleDateChange);
  document.getElementById("endDate").addEventListener("change", handleDateChange);
});

// ================= HANDLE DATE CHANGE ==================
function handleDateChange() {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  if (startDate && endDate && startDate > endDate) {
    alert("Tanggal awal tidak boleh lebih besar dari tanggal akhir!");
    document.getElementById("endDate").value = "";
    return;
  }

  if (startDate || endDate) {
    toggleFilters(true); // disable tahun & bulan
  } else {
    toggleFilters(false); 
    setDefaultFilters(); // aktifkan default lagi kalau tanggal kosong
  }
}

// ================= FILTER ==================
function setDefaultFilters() {
  const now = new Date();
  document.getElementById("tahun").value = now.getFullYear();
  document.getElementById("bulan").value = now.getMonth() + 1;
}

async function loadTahun() {
  const { data, error } = await supabase
    .from("v_feedback_report")
    .select("tahun")
    .order("tahun", { ascending: false });

  if (error) {
    console.error("loadTahun error:", error);
    alert("Gagal memuat data tahun!");
    return;
  }

  const tahunSet = [...new Set(data.map((d) => d.tahun))];
  const cbTahun = document.getElementById("tahun");
  cbTahun.innerHTML = "";
  tahunSet.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    cbTahun.appendChild(opt);
  });
}

function resetFilters() {
  setDefaultFilters();
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  toggleFilters(false);
  loadReport();
}

// ================= LOAD REPORT ==================
async function loadReport() {
  const tahun = document.getElementById("tahun").value;
  const bulan = document.getElementById("bulan").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  let data = [];

  if (startDate && endDate) {
    const res = await supabase
      .from("guest_comments")
      .select("*")
      .gte("tgl", startDate)
      .lte("tgl", endDate);

    if (res.error) {
      console.error("loadReport error:", res.error);
      alert("Gagal mengambil data berdasarkan tanggal!");
      return;
    }
    data = aggregateManual(res.data);
  } else {
    let query = supabase.from("v_feedback_report").select("*");
    if (tahun) query = query.eq("tahun", tahun);
    if (bulan) query = query.eq("bulan", bulan);

    const res = await query;
    if (res.error) {
      console.error("loadReport error:", res.error);
      alert("Gagal mengambil data laporan!");
      return;
    }
    data = res.data;
  }

  console.log("Report Data:", data);
  renderCharts(data);
}

// ================= TOGGLE FILTERS ==================
function toggleFilters(disable) {
  document.getElementById("tahun").disabled = disable;
  document.getElementById("bulan").disabled = disable;
}

// ================= AGGREGASI MANUAL ==================
function aggregateManual(rows) {
  if (!rows || rows.length === 0) return [];

  const avg = (field) =>
    rows.reduce((sum, r) => sum + (r[field] || 0), 0) / rows.length;

  return [
    {
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
    },
  ];
}

function countBy(rows, field) {
  const map = {};
  rows.forEach((r) => {
    const key = r[field] || "Lainnya";
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

// ================= RENDER CHARTS ==================
function renderCharts(data) {
  if (!data || data.length === 0) return;

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

  const rating = data[0] || {};

  pieAsal = renderPie("pieAsal", "Asal", asalData);
  pieMedia = renderPie("pieMedia", "Media Sosial", mediaData);
  pieAcara = renderPie("pieAcara", "Acara", acaraData);
  pieUsia = renderPie("pieUsia", "Usia", usiaData);

  barRating = renderBar("barRating", rating);
}

// ================= UTIL ==================
function groupCount(data, field, fieldCount) {
  const result = {};
  data.forEach((row) => {
    const key = row[field] || "Lainnya";
    result[key] = (result[key] || 0) + (row[fieldCount] || 0);
  });
  return Object.entries(result).map(([label, value]) => ({ label, value }));
}

function objToArray(obj) {
  return Object.entries(obj).map(([label, value]) => ({ label, value }));
}

// ================= CHART.JS ==================
function renderPie(canvasId, title, dataset) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (Chart.getChart(ctx)) Chart.getChart(ctx).destroy();

  return new Chart(ctx, {
    type: "pie",
    data: {
      labels: dataset.map((d) => d.label),
      datasets: [{
        data: dataset.map((d) => d.value),
        backgroundColor: COLORS.slice(0, dataset.length),
      }],
    },
    options: {
      plugins: {
        legend: { display: false },
        datalabels: {
          color: "#fff",
          font: { weight: "bold" },
          formatter: (value, ctx) => {
            let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            return sum ? ((value / sum) * 100).toFixed(1) + "%" : "0%";
          }
        },
        title: { display: true, text: title, font: { size: 16, weight: "bold" } }
      }
    },
    plugins: [ChartDataLabels]
  });
}

function renderBar(canvasId, rating) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (Chart.getChart(ctx)) Chart.getChart(ctx).destroy();

  return new Chart(ctx, {
    type: "bar",
    data: {
      labels: [
        "Food Quality","Beverage Quality","Serving Speed",
        "Service","Cleanliness","Ambience","Price"
      ],
      datasets: [{
        data: [
          rating.avg_food_quality,
          rating.avg_beverage_quality,
          rating.avg_serving_speed,
          rating.avg_service,
          rating.avg_cleanliness,
          rating.avg_ambience,
          rating.avg_price,
        ],
        backgroundColor: COLORS.slice(0, 7),
      }],
    },
    options: {
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: "end",
          align: "end",
          color: "#000",
          formatter: (value) => value ? value.toFixed(2) : "0.00"
        },
        title: { display: true, text: "Rata-rata Rating", font: { size: 16, weight: "bold" } }
      },
      scales: {
        y: { beginAtZero: true, max: 5, grid: { display: true } },
        x: { grid: { display: false } }
      }
    },
    plugins: [ChartDataLabels]
  });
}
