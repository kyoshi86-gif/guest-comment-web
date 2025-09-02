// Tambahan: chart detail YTD
let ytdCharts = {}; // simpan instance chart

// Fungsi load detail per tahun
async function loadYTD(tahun) {
  const { data, error } = await supabase
    .from("v_feedback_report")
    .select("*")
    .eq("tahun", tahun)
    .order("bulan", { ascending: true });

  if (error) {
    console.error("loadYTD error:", error);
    alert("Gagal mengambil detail YTD!");
    return;
  }
  renderYTDCharts(data, tahun);
}

function renderYTDCharts(rows, tahun) {
  // bulan Jan–Des
  const bulanLabels = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember"
  ];

  // Ambil rata-rata tiap bulan
  const val = (rows, field) => bulanLabels.map((_, idx) => {
    const r = rows.find(rr => rr.bulan === (idx+1));
    return r ? (r[field] || 0) : 0;
  });

  const datasets = {
    food: val(rows, "avg_food_quality"),
    beverage: val(rows, "avg_beverage_quality"),
    serving: val(rows, "avg_serving_speed"),
    service: val(rows, "avg_service"),
    clean: val(rows, "avg_cleanliness"),
    ambience: val(rows, "avg_ambience"),
    price: val(rows, "avg_price"),
  };

  // config chart
  const chartConfigs = [
    { id: "ytdFood",      title: "Kualitas Makanan",   data: datasets.food,     color: "#4e79a7" },
    { id: "ytdBeverage",  title: "Kualitas Minuman",   data: datasets.beverage, color: "#f28e2b" },
    { id: "ytdServing",   title: "Kecepatan Penyajian",data: datasets.serving,  color: "#9e9e9e" },
    { id: "ytdService",   title: "Pelayanan",          data: datasets.service,  color: "#edc949" },
    { id: "ytdClean",     title: "Kebersihan",         data: datasets.clean,    color: "#4e79a7" },
    { id: "ytdAmbience",  title: "Suasana",            data: datasets.ambience, color: "#59a14f" },
    { id: "ytdPrice",     title: "Harga",              data: datasets.price,    color: "#e15759" },
  ];

  chartConfigs.forEach(cfg => {
    destroyIfExists(cfg.id);
    const canvas = document.getElementById(cfg.id);
    if (!canvas) return;

    ytdCharts[cfg.id] = new Chart(canvas, {
      type: "line",
      data: {
        labels: bulanLabels,
        datasets: [{
          label: cfg.title,
          data: cfg.data,
          borderColor: cfg.color,
          backgroundColor: cfg.color,
          tension: 0.3,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } }
        }
      }
    });
  });
}

// Tambahkan handler klik di bar chart
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
    data: { labels, datasets: [{ data: dataVals, backgroundColor: COLORS.slice(0, labels.length) }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (evt, elements) => {
        if (elements.length > 0) {
          const tahun = document.getElementById("tahun").value;
          loadYTD(tahun);
        }
      },
      plugins: { legend: { display: false }, title: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } },
        x: { grid: { display: false } }
      }
    },
    plugins: [barLabelPlugin]
  };

  return new Chart(canvas, cfg);
}
