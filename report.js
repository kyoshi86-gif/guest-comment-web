// report.js
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// ✅ Ganti sesuai kredensial Supabase kamu
const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";
const supabase = createClient(supabaseUrl, supabaseKey);

let pieAsal, pieMedia, pieAcara, pieUsia, barRating;

// ================= INIT ==================
document.addEventListener("DOMContentLoaded", async () => {
  await loadTahun(); // isi combobox tahun dari data
  setDefaultFilters(); // set default tahun & bulan sekarang
  await loadReport(); // load report pertama kali

  document.getElementById("btnProses").addEventListener("click", loadReport);
  document.getElementById("btnReset").addEventListener("click", resetFilters);
  
  document.getElementById("startDate").addEventListener("change", handleDateChange);
  document.getElementById("endDate").addEventListener("change", handleDateChange);
});

// ================= HANDLE DATE CHANGE ==================
function handleDateChange() {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  if (startDate && endDate) {
    toggleFilters(true);   // disable tahun & bulan kalau rentang tanggal terisi
  } else {
    toggleFilters(false);  // aktifkan lagi kalau kosong
  }
}

// ================= RESET FILTER ==================
function resetFilters() {
  // kosongkan tanggal
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";

  // aktifkan kembali tahun & bulan
  toggleFilters(false);

  // set default tahun & bulan sekarang
  setDefaultFilters();

  // reload report
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
    toggleFilters(true);

    const res = await supabase
      .from("guest_comments")
      .select("*")
      .gte("tgl", startDate)
      .lte("tgl", endDate);

    if (res.error) {
      console.error("loadReport error:", res.error);
      return;
    }
    data = aggregateManual(res.data);
  } else {
    toggleFilters(false);  // pastikan aktif lagi

    let query = supabase.from("v_feedback_report").select("*");
    if (tahun) query = query.eq("tahun", tahun);
    if (bulan) query = query.eq("bulan", bulan);

    const res = await query;
    if (res.error) {
      console.error("loadReport error:", res.error);
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

  // hitung rata-rata rating
  const avg = (field) =>
    rows.reduce((sum, r) => sum + (r[field] || 0), 0) / rows.length;

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

  // kalau data hasil manual (array cuma 1 elemen, countBy berupa object)
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

  renderBar("barRating", rating);
}

// ================= UTIL ==================
function groupCount(data, field, fieldCount) {
  const result = {};
  data.forEach((row) => {
    const key = row[field] || "Lainnya";
    result[key] = (result[key] || 0) + (row[fieldCount] || 0);
  });
  return Object.entries(result).map(([label, value]) => ({
    label,
    value,
  }));
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
      datasets: [
        {
          data: dataset.map((d) => d.value),
          backgroundColor: [
            "#4e79a7",
            "#f28e2b",
            "#e15759",
            "#76b7b2",
            "#59a14f",
            "#edc949",
            "#af7aa1",
            "#ff9da7",
          ],
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: title,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const val = context.raw;
              const total = dataset.reduce((a, b) => a + b.value, 0);
              const percent = total ? ((val / total) * 100).toFixed(1) : 0;
              return `${context.label}: ${val} (${percent}%)`;
            },
          },
        },
      },
    },
  });
}

function renderBar(canvasId, rating) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (Chart.getChart(ctx)) Chart.getChart(ctx).destroy();

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: [
        "Food Quality",
        "Beverage Quality",
        "Serving Speed",
        "Service",
        "Cleanliness",
        "Ambience",
        "Price",
      ],
      datasets: [
        {
          label: "Average Rating",
          data: [
            rating.avg_food_quality,
            rating.avg_beverage_quality,
            rating.avg_serving_speed,
            rating.avg_service,
            rating.avg_cleanliness,
            rating.avg_ambience,
            rating.avg_price,
          ],
          backgroundColor: "#4e79a7",
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 5,
        },
      },
    },
  });
}
