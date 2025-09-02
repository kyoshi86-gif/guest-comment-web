// report.js
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";
const supabase = createClient(supabaseUrl, supabaseKey);

let pieAsal, pieMedia, pieAcara, pieUsia, barRating;

// ================= INIT ==================
document.addEventListener("DOMContentLoaded", async () => {
  await loadTahun();
  setDefaultFilters();
  await loadReport();

  document.getElementById("btnProses").addEventListener("click", loadReport);
  document.getElementById("btnReset").addEventListener("click", resetFilters);
});

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
  loadReport();
}

// ================= LOAD REPORT ==================
async function loadReport() {
  const tahun = document.getElementById("tahun").value;
  const bulan = document.getElementById("bulan").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  let query;

  if (startDate && endDate) {
    // 🔄 ambil langsung dari tabel asli guest_comments
    query = supabase
      .from("guest_comments")
      .select("*")
      .gte("tgl", startDate)
      .lte("tgl", endDate);
  } else {
    // default ambil dari view
    query = supabase
      .from("v_feedback_report")
      .select("*");

    if (tahun) query = query.eq("tahun", tahun);
    if (bulan) query = query.eq("bulan", bulan);
  }

  const { data, error } = await query;

  if (error) {
    console.error("loadReport error:", error);
    return;
  }

  console.log("Report Data:", data);
  renderCharts(data, !!(startDate && endDate));
}

// ================= RENDER CHARTS ==================
function renderCharts(data, isRaw = false) {
  let asalData, mediaData, acaraData, usiaData, rating;

  if (isRaw) {
    // Kalau pakai data mentah dari guest_comments
    asalData = groupCount(data, "asal");
    mediaData = groupCount(data, "media_source");
    acaraData = groupCount(data, "event_type");
    usiaData = groupCount(data, "age_range");

    // hitung rata-rata rating manual
    rating = {
      avg_food_quality: avg(data, "food_quality"),
      avg_beverage_quality: avg(data, "beverage_quality"),
      avg_serving_speed: avg(data, "serving_speed"),
      avg_service: avg(data, "service_rating"),
      avg_cleanliness: avg(data, "cleanliness"),
      avg_ambience: avg(data, "ambience"),
      avg_price: avg(data, "price_rating"),
    };
  } else {
    // Kalau pakai view teragregasi
    asalData = groupCount(data, "asal", "asal_count");
    mediaData = groupCount(data, "media_source", "media_count");
    acaraData = groupCount(data, "event_type", "acara_count");
    usiaData = groupCount(data, "age_range", "usia_count");

    rating = data.length > 0 ? data[0] : {};
  }

  pieAsal = renderPie("pieAsal", "Asal", asalData);
  pieMedia = renderPie("pieMedia", "Media Sosial", mediaData);
  pieAcara = renderPie("pieAcara", "Acara", acaraData);
  pieUsia = renderPie("pieUsia", "Usia", usiaData);

  renderBar("barRating", rating);
}

// ================= UTIL ==================
function groupCount(data, field, fieldCount = null) {
  const result = {};
  data.forEach((row) => {
    const key = row[field] || "Lainnya";
    const value = fieldCount ? (row[fieldCount] || 0) : 1;
    result[key] = (result[key] || 0) + value;
  });
  return Object.entries(result).map(([label, value]) => ({
    label,
    value,
  }));
}

function avg(data, field) {
  if (!data.length) return 0;
  return data.reduce((sum, row) => sum + (row[field] || 0), 0) / data.length;
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
