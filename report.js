import { createClient } from "https://esm.sh/@supabase/supabase-js";

// 🔑 Ganti dengan URL & KEY Anda
const SUPABASE_URL = "https://drdflrzsvfakdnhqniaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== Elemen DOM ======
const tahunSelect = document.getElementById("tahunSelect");
const bulanSelect = document.getElementById("bulanSelect");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const btnProses = document.getElementById("btnProses");
const btnReset = document.getElementById("btnReset");

// Chart instances
let chartAsal, chartMedia, chartAcara, chartUsia, chartRating;

// ====== Helper ======
function getCurrentYearMonth() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    today: now.toISOString().split("T")[0],
  };
}

// ====== Init Tahun & Bulan ======
async function loadTahunOptions() {
  const { data, error } = await supabase
    .from("feedback")
    .select("tanggal");

  if (error) {
    console.error("Error fetch tahun:", error);
    return;
  }

  if (!data || data.length === 0) return;

  // Ambil tahun unik dari tanggal
  const years = [...new Set(data.map(row => new Date(row.tanggal).getFullYear()))].sort();
  tahunSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");

  // Set default ke tahun & bulan sekarang
  const { year, month } = getCurrentYearMonth();
  tahunSelect.value = year;
  bulanSelect.value = month;
}

// ====== Query Data ======
async function fetchData() {
  const tahun = parseInt(tahunSelect.value);
  const bulan = parseInt(bulanSelect.value);
  const { today } = getCurrentYearMonth();

  let query = supabase.from("feedback").select("*");

  if (startDate.value && endDate.value) {
    // Jika pakai rentang tanggal
    query = query.gte("tanggal", startDate.value).lte("tanggal", endDate.value);
  } else {
    // Default filter: bulan berjalan s/d hari ini
    const start = `${tahun}-${String(bulan).padStart(2,"0")}-01`;
    query = query.gte("tanggal", start).lte("tanggal", today);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetch data:", error);
    return [];
  }
  return data;
}

// ====== Render Charts ======
function renderPieChart(ctx, title, labels, values) {
  return new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [
          "#b9915b","#0b3a1d","#9f7a41","#2a6041","#6c9a8b","#f2c14e"
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom", labels: { color: "#fff" } },
        title: { display: true, text: title, color: "#fff" },
        tooltip: {
          callbacks: {
            label: function (context) {
              let total = context.dataset.data.reduce((a, b) => a + b, 0);
              let value = context.raw;
              let percent = ((value / total) * 100).toFixed(1);
              return `${context.label}: ${value} (${percent}%)`;
            }
          }
        }
      }
    }
  });
}

function renderBarChart(ctx, title, labels, values) {
  return new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Average Score",
        data: values,
        backgroundColor: "#b9915b"
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { ticks: { color: "#fff" } },
        y: { ticks: { color: "#fff", beginAtZero: true, max: 5 } }
      },
      plugins: {
        legend: { labels: { color: "#fff" } },
        title: { display: true, text: title, color: "#fff" }
      }
    }
  });
}

// ====== Update All Charts ======
async function updateCharts() {
  const data = await fetchData();

  const countBy = (field) => {
    const counts = {};
    data.forEach(row => {
      const key = row[field] || "Lainnya";
      counts[key] = (counts[key] || 0) + 1;
    });
    return { labels: Object.keys(counts), values: Object.values(counts) };
  };

  const ratingFields = ["food_quality","beverage_quality","serving_speed","service","cleanliness","ambience","price"];
  const avg = ratingFields.map(f => {
    const vals = data.map(r => r[f] || 0);
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : 0;
  });

  [chartAsal, chartMedia, chartAcara, chartUsia, chartRating].forEach(ch => ch && ch.destroy());

  chartAsal = renderPieChart(document.getElementById("chartAsal"), "Asal", countBy("asal").labels, countBy("asal").values);
  chartMedia = renderPieChart(document.getElementById("chartMedia"), "Media Sosial", countBy("media_sosial").labels, countBy("media_sosial").values);
  chartAcara = renderPieChart(document.getElementById("chartAcara"), "Acara", countBy("acara").labels, countBy("acara").values);
  chartUsia = renderPieChart(document.getElementById("chartUsia"), "Usia", countBy("usia").labels, countBy("usia").values);
  chartRating = renderBarChart(document.getElementById("chartRating"), "Rating Rata-rata", ratingFields.map(f => f.replace("_"," ")), avg);
}

// ====== Event ======
btnProses.addEventListener("click", updateCharts);

btnReset.addEventListener("click", () => {
  const { year, month } = getCurrentYearMonth();
  tahunSelect.value = year;
  bulanSelect.value = month;
  startDate.value = "";
  endDate.value = "";
  updateCharts();
});

// ====== Init ======
loadTahunOptions().then(updateCharts);
