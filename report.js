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

  let query = supabase.from("v_feedback_report").select("*");

  // Filter default tahun & bulan
  if (tahun) query = query.eq("tahun", tahun);
  if (bulan) query = query.eq("bulan", bulan);

  // Jika ada filter rentang tanggal, override total
  if (startDate && endDate) {
    query = supabase
      .from("v_feedback_report")
      .select("*")
      .gte("tgl", startDate)
      .lte("tgl", endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("loadReport error:", error);
    return;
  }

  console.log("Report Data:", data);
  renderCharts(data);
}

// ================= RENDER CHARTS ==================
function renderCharts(data) {
  const asalData = groupCount(data, "asal", "asal_count");
  const mediaData = groupCount(data, "media", "media_count");
  const acaraData = groupCount(data, "acara", "acara_count");
  const usiaData = groupCount(data, "usia", "usia_count");

  const rating = data.length > 0 ? data[0] : {};

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
