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

  // aktifkan kembali tahun & bulan
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
  let error = null;

  if (startDate && endDate) {
    // ❌ kalau pakai tanggal, disable tahun & bulan
    toggleFilters(true);

    // 🔄 Ambil langsung dari tabel asli lalu agregasi manual
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
    // ✅ Default ambil dari view
    toggleFilters(false);

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
// ... (bagian renderCharts, groupCount, objToArray, renderPie, renderBar tetap sama)

// ================= INIT ==================
document.addEventListener("DOMContentLoaded", async () => {
  await loadTahun(); // isi combobox tahun dari data
  setDefaultFilters(); // set default tahun & bulan sekarang
  await loadReport(); // load report pertama kali

  document.getElementById("btnProses").addEventListener("click", loadReport);
  document.getElementById("btnReset").addEventListener("click", resetFilters);

  // ✅ Auto-disable tahun & bulan kalau user pilih rentang tanggal
  document.getElementById("startDate").addEventListener("change", handleDateChange);
  document.getElementById("endDate").addEventListener("change", handleDateChange);
});

// ================= HANDLE DATE CHANGE ==================
function handleDateChange() {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  if (startDate || endDate) {
    toggleFilters(true);   // disable tahun & bulan
  } else {
    toggleFilters(false);  // kalau tanggal dikosongkan lagi → aktifkan lagi
  }
}
