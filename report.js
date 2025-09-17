// report.js
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Supabase config
const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";
const supabase = createClient(supabaseUrl, supabaseKey);

// Warna
const COLORS = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1"];

// ----------------- PLUGIN PIE LABELS -----------------
const outlabelsPlugin = {
  id: "outlabelsPlugin",
  afterDraw(chart) {
    if (chart.config.type !== "pie" && chart.config.type !== "doughnut") return;
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    if (!meta) return;
    const total = dataset.data.reduce((s, v) => s + (v || 0), 0);

    meta.data.forEach((arc, i) => {
      const value = dataset.data[i] || 0;
      if (!value) return;
      const mid = (arc.startAngle + arc.endAngle) / 2;
      const x = arc.x + Math.cos(mid) * (arc.outerRadius + 20);
      const y = arc.y + Math.sin(mid) * (arc.outerRadius + 20);
      const percent = total ? ((value / total) * 100).toFixed(1) : "0.0";
      ctx.save();
      ctx.fillStyle = "#111";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${chart.data.labels[i]}: ${value} (${percent}%)`, x, y);
      ctx.restore();
    });
  }
};

// ----------------- PLUGIN BAR LABELS -----------------
const barLabelPlugin = {
  id: "barLabelPlugin",
  afterDatasetsDraw(chart) {
    if (chart.config.type !== "bar") return;
    const ctx = chart.ctx;
    chart.data.datasets.forEach((dataset, i) => {
      chart.getDatasetMeta(i).data.forEach((bar, j) => {
        const val = dataset.data[j];
        if (val == null) return;
        ctx.save();
        ctx.fillStyle = "#111";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(val.toFixed(2), bar.x, bar.y - 6);
        ctx.restore();
      });
    });
  }
};

// ----------------- GLOBAL VAR -----------------
let pieAsal, pieMedia, pieAcara, pieUsia, barRating;
let ytdData = []; // simpan data YTD untuk line chart

document.addEventListener("DOMContentLoaded", async () => {
  await loadTahun();
  setDefaultFilters();
  await loadReport();

  document.getElementById("btnProses").addEventListener("click", loadReport);
  document.getElementById("btnReset").addEventListener("click", resetFilters);
  document.getElementById("btnBack").addEventListener("click", () => {
    document.getElementById("ytdSection").style.display = "none";
    document.getElementById("lineChartsContainer").style.display = "none";
    document.getElementById("mainCharts").style.display = "flex";
  });
});

// ----------------- FILTER -----------------
function setDefaultFilters() {
  const now = new Date();
  document.getElementById("tahun").value = now.getFullYear();
  document.getElementById("bulan").value = now.getMonth() + 1;
}

async function loadTahun() {
  const { data } = await supabase.from("v_feedback_report").select("tahun").order("tahun",{ascending:false});
  const sel = document.getElementById("tahun");
  sel.innerHTML = "";
  (data || [ {tahun:new Date().getFullYear()} ]).forEach(r=>{
    const opt = document.createElement("option");
    opt.value = r.tahun;
    opt.textContent = r.tahun;
    sel.appendChild(opt);
  });
}

function resetFilters() {
  setDefaultFilters();
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  loadReport();
}

// ----------------- REPORT -----------------
async function loadReport() {
  const tahun = document.getElementById("tahun").value;
  const bulan = document.getElementById("bulan").value;
  let { data, error } = await supabase
    .from("v_feedback_report")
    .select("*")
    .eq("tahun", tahun)
    .eq("bulan", bulan);

  if (error) { console.error(error); return; }
  renderCharts(data);
}

function destroyIfExists(id) {
  const c = document.getElementById(id);
  const chart = Chart.getChart(c);
  if (chart) chart.destroy();
}

function renderCharts(data) {
  if (!data || !data.length) return;

  const d = data[0];

  // parse JSON string jadi object
  const asal = typeof d.asal_count === "string" ? JSON.parse(d.asal_count) : d.asal_count;
  const media = typeof d.media_count === "string" ? JSON.parse(d.media_count) : d.media_count;
  const acara = typeof d.acara_count === "string" ? JSON.parse(d.acara_count) : d.acara_count;
  const usia = typeof d.usia_count === "string" ? JSON.parse(d.usia_count) : d.usia_count;

  pieAsal = renderPie("pieAsal", "Asal", asal);
  pieMedia = renderPie("pieMedia", "Media", media);
  pieAcara = renderPie("pieAcara", "Acara", acara);
  pieUsia = renderPie("pieUsia", "Usia", usia);

  barRating = renderBar("barRating", d);
}

function renderPie(id, title, obj) {
  destroyIfExists(id);
  if (!obj || Object.keys(obj).length === 0) return;

  const labels = Object.keys(obj);
  const values = Object.values(obj);

  return new Chart(document.getElementById(id), {
    type: "pie",
    data: { labels, datasets:[{ data:values, backgroundColor:COLORS }] },
    options: { 
      responsive:true, 
      plugins:{ legend:{ display:true, position:"bottom" } } 
    },
    plugins:[outlabelsPlugin]
  });
}


function renderBar(id, d) {
  destroyIfExists(id);
  const labels = ["Food Quality","Beverage","Speed","Service","Cleanliness","Ambience","Price"];
  const vals = [
    d.avg_food_quality, d.avg_beverage_quality, d.avg_serving_speed,
    d.avg_service, d.avg_cleanliness, d.avg_ambience, d.avg_price
  ];
  return new Chart(document.getElementById(id), {
    type:"bar",
    data:{ labels, datasets:[{ data:vals, backgroundColor:COLORS }] },
    options:{ responsive:true, scales:{y:{max:5,beginAtZero:true}}, onClick:()=>showYTD() },
    plugins:[barLabelPlugin]
  });
}

// ----------------- LINE CHART -----------------
async function showYTD() {
  document.getElementById("mainCharts").style.display = "none";
  document.getElementById("ytdSection").style.display = "block";
  document.getElementById("lineChartsContainer").style.display = "grid";

  const tahun = document.getElementById("tahun").value;
  const { data } = await supabase.from("v_feedback_report").select("*").eq("tahun",tahun).order("bulan");
  ytdData = data || [];

  renderLineCharts();
}

function renderLineCharts() {
  const charts = [
    {id:"chart_food",field:"avg_food_quality",label:"Food Quality"},
    {id:"chart_beverage",field:"avg_beverage_quality",label:"Beverage"},
    {id:"chart_speed",field:"avg_serving_speed",label:"Speed"},
    {id:"chart_service",field:"avg_service",label:"Service"},
    {id:"chart_cleanliness",field:"avg_cleanliness",label:"Cleanliness"},
    {id:"chart_ambience",field:"avg_ambience",label:"Ambience"},
    {id:"chart_price",field:"avg_price",label:"Price"}
  ];
  charts.forEach(cfg=>{
    destroyIfExists(cfg.id);
    new Chart(document.getElementById(cfg.id), {
      type:"line",
      data:{
        labels:["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"],
        datasets:[{
          label:cfg.label,
          data: ytdData.map(r=>r[cfg.field]||0),
          borderColor:"#4e79a7",
          backgroundColor:"rgba(78,121,167,0.2)",
          fill:true, tension:0.3
        }]
      },
      options:{ responsive:true, scales:{y:{max:5,beginAtZero:true}}, plugins:{legend:{display:false},title:{display:true,text:cfg.label}} }
    });
  });
}
