// ====== KONFIGURASI SUPABASE ======
const SUPABASE_URL = "https://drdflrzsvfakdnhqniaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";

// client Supabase dari global window.supabase (CDN)
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== ELEMEN DOM ======
const form = document.getElementById('gcForm');
const rowId = document.getElementById('row_id');

const mediaLainnyaRadio = document.getElementById('mediaLainnyaRadio');
const eventLainnyaRadio = document.getElementById('eventLainnyaRadio');
const mediaOtherInput   = document.getElementById('media_other');
const eventOtherInput   = document.getElementById('event_other');

const btnSave   = document.getElementById('btnSave');
const btnUpdate = document.getElementById('btnUpdate');
const btnDelete = document.getElementById('btnDelete');
const btnCancel = document.getElementById('btnCancel');
const btnClose  = document.getElementById('btnClose');
const btnReport = document.getElementById('btnReport');

const listBody  = document.getElementById('listBody');

// ====== UTIL ======
function val(id){ return document.getElementById(id).value.trim(); }
function getRadio(name){
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}
function setRadio(name, value){
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
}
function setRequiredRadios(){
  // minimal wajib: tanggal, jam, meja, nama
  // rating tidak dipaksa semua, mengikuti kebiasaan form kertas
}

// Enable/disable input "lainnya"
function setupOtherToggle(){
  document.querySelectorAll('input[name="media_source"]').forEach(r=>{
    r.addEventListener('change', ()=>{
      const on = mediaLainnyaRadio && mediaLainnyaRadio.checked;
      mediaOtherInput.disabled = !on;
      if(!on) mediaOtherInput.value = "";
    });
  });
  document.querySelectorAll('input[name="event_type"]').forEach(r=>{
    r.addEventListener('change', ()=>{
      const on = eventLainnyaRadio && eventLainnyaRadio.checked;
      eventOtherInput.disabled = !on;
      if(!on) eventOtherInput.value = "";
    });
  });
}

// Bersihkan form / reset state
function clearForm(){
  form.reset();
  rowId.value = "";
  mediaOtherInput.disabled = true;
  eventOtherInput.disabled = true;
  btnUpdate.disabled = true;
  btnDelete.disabled = true;
}

// Map form -> payload DB
function formToPayload(){
  const payload = {
    tgl: val('tgl'),
    jam: val('jam'),
    no_meja: val('no_meja'),
    nama_tamu: val('nama_tamu'),
    asal: getRadio('asal'),
    media_source: getRadio('media_source'),
    media_other: mediaOtherInput.value.trim() || null,
    event_type: getRadio('event_type'),
    event_other: eventOtherInput.value.trim() || null,
    age_range: getRadio('age_range'),
    food_quality: parseInt(getRadio('food_quality')) || null,
    beverage_quality: parseInt(getRadio('beverage_quality')) || null,
    serving_speed: parseInt(getRadio('serving_speed')) || null,
    service_rating: parseInt(getRadio('service_rating')) || null,
    cleanliness: parseInt(getRadio('cleanliness')) || null,
    ambience: parseInt(getRadio('ambience')) || null,
    price_rating: parseInt(getRadio('price_rating')) || null,
    comments: document.getElementById('comments').value.trim() || null,
  };
  return payload;
}

function validateMinimal(p){
  if(!p.tgl || !p.jam || !p.no_meja || !p.nama_tamu){
    alert("Mohon isi Tanggal, Jam, No Meja, dan Nama.");
    return false;
  }
  return true;
}

// ====== CRUD ======
async function loadList(){
  const { data, error } = await sb
    .from('guest_comments')
    .select('id,tgl,jam,no_meja,nama_tamu')
    .order('tgl', { ascending: false })   // urutkan tanggal terbaru dulu
    .order('jam', { ascending: false })   // kalau tanggal sama, urutkan jam
    .limit(200);

  if(error){ console.error("Load error:", error.message); return; }

  listBody.innerHTML = "";
  data.forEach((r, i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${r.tgl ?? ""}</td>
      <td>${r.jam ?? ""}</td>
      <td>${r.no_meja ?? ""}</td>
      <td>${r.nama_tamu ?? ""}</td>`;
    tr.addEventListener('click', ()=> selectRow(r.id));
    listBody.appendChild(tr);
  });
}

async function selectRow(id){
  const { data, error } = await sb
    .from('guest_comments')
    .select('*')
    .eq('id', id)
    .single();

  if(error){ alert("Gagal mengambil data: "+error.message); return; }

  // isi form
  rowId.value = data.id;
  document.getElementById('tgl').value = data.tgl ?? "";
  document.getElementById('jam').value = (data.jam ?? "").toString().substring(0,5);
  document.getElementById('no_meja').value = data.no_meja ?? "";
  document.getElementById('nama_tamu').value = data.nama_tamu ?? "";

  setRadio('asal', data.asal);
  setRadio('media_source', data.media_source);
  setRadio('event_type',  data.event_type);
  setRadio('age_range',   data.age_range);

  if(data.media_source === 'Lainnya'){ mediaOtherInput.disabled=false; mediaOtherInput.value = data.media_other ?? ""; }
  if(data.event_type  === 'Lainnya'){ eventOtherInput.disabled=false; eventOtherInput.value = data.event_other ?? ""; }

  setRadio('food_quality',      data.food_quality);
  setRadio('beverage_quality',  data.beverage_quality);
  setRadio('serving_speed',     data.serving_speed);
  setRadio('service_rating',    data.service_rating);
  setRadio('cleanliness',       data.cleanliness);
  setRadio('ambience',          data.ambience);
  setRadio('price_rating',      data.price_rating);

  document.getElementById('comments').value = data.comments ?? "";

  btnUpdate.disabled = false;
  btnDelete.disabled = false;
}

async function onSave(){
  const payload = formToPayload();
  if(!validateMinimal(payload)) return;

  const { error } = await sb.from('guest_comments').insert([payload]);
  if(error){ alert("Gagal simpan: "+error.message); return; }
  alert("Data tersimpan.");
  clearForm();
  loadList();
}

async function onUpdate(){
  const id = rowId.value;
  if(!id){ alert("Pilih data pada tabel (kanan) untuk di-update."); return; }
  const payload = formToPayload();
  if(!validateMinimal(payload)) return;

  const { error } = await sb.from('guest_comments').update(payload).eq('id', id);
  if(error){ alert("Gagal update: "+error.message); return; }
  alert("Data berhasil diupdate.");
  clearForm();
  loadList();
}

async function onDelete(){
  const id = rowId.value;
  if(!id){ alert("Pilih data pada tabel (kanan) untuk dihapus."); return; }
  if(!confirm("Yakin hapus data ini?")) return;

  const { error } = await sb.from('guest_comments').delete().eq('id', id);
  if(error){ alert("Gagal hapus: "+error.message); return; }
  alert("Data dihapus.");
  clearForm();
  loadList();
}

// Tombol lain
function onCancel(){ clearForm(); }
function onClose(){ window.close(); /* mungkin tidak bekerja jika bukan pop-up */ }
function onReport(){ window.open('about:blank','_blank'); /* placeholder */ }

// ====== INIT ======
document.addEventListener('DOMContentLoaded', ()=>{
  setupOtherToggle();
  loadList();

  btnSave.addEventListener('click', onSave);
  btnUpdate.addEventListener('click', onUpdate);
  btnDelete.addEventListener('click', onDelete);
  btnCancel.addEventListener('click', onCancel);
  btnClose.addEventListener('click', onClose);
  btnReport.addEventListener('click', onReport);
});

function showReport() {
  document.getElementById("pageInput").classList.add("hidden");
  document.getElementById("pageReport").classList.remove("hidden");
  loadReport(); // langsung load report default
}

function showInput() {
  document.getElementById("pageReport").classList.add("hidden");
  document.getElementById("pageInput").classList.remove("hidden");
}

let chartObjects = {}; 

// === Fungsi Load Report ===
async function loadReport() {
  const tahun = document.getElementById("cmbTahun").value;
  const bulan = document.getElementById("cmbBulan").value;
  const tglAwal = document.getElementById("txtTglAwal").value;
  const tglAkhir = document.getElementById("txtTglAkhir").value;

  // === Ambil data dari Supabase (contoh query, sesuaikan tabel) ===
  let { data, error } = await supabase
    .from("guest_comment")
    .select("*")
    .gte("tanggal", `${tahun}-${bulan}-01`)
    .lte("tanggal", `${tahun}-${bulan}-31`);

  if (error) {
    console.error(error);
    return;
  }

  // --- Contoh hitung data dummy dari hasil query ---
  // Buat group by sesuai kategori
  let dataAsal = groupCount(data, "asal");
  let dataMedia = groupCount(data, "media");
  let dataAcara = groupCount(data, "acara");
  let dataUsia = groupCount(data, "usia");

  let dataKualitas = {
    labels: ["Food", "Beverage", "Speed", "Service", "Cleanliness", "Ambience", "Price"],
    values: [
      avgScore(data, "food_quality"),
      avgScore(data, "beverage_quality"),
      avgScore(data, "serving_speed"),
      avgScore(data, "service"),
      avgScore(data, "cleanliness"),
      avgScore(data, "ambience"),
      avgScore(data, "price")
    ]
  };

  // --- Render Charts ---
  renderPie("chartAsal", dataAsal);
  renderPie("chartMedia", dataMedia);
  renderPie("chartAcara", dataAcara);
  renderPie("chartUsia", dataUsia);
  renderBar("chartKualitas", dataKualitas);
}

// === Helper group count ===
function groupCount(data, field) {
  let count = {};
  data.forEach(d => {
    if (!d[field]) return;
    count[d[field]] = (count[d[field]] || 0) + 1;
  });
  return { labels: Object.keys(count), values: Object.values(count) };
}

// === Helper avg score ===
function avgScore(data, field) {
  let total = 0, n = 0;
  data.forEach(d => {
    if (d[field] != null) { total += d[field]; n++; }
  });
  return n ? (total / n).toFixed(1) : 0;
}

// === Render Pie ===
function renderPie(canvasId, dataset) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (chartObjects[canvasId]) chartObjects[canvasId].destroy();
  chartObjects[canvasId] = new Chart(ctx, {
    type: "pie",
    data: {
      labels: dataset.labels,
      datasets: [{
        data: dataset.values,
        backgroundColor: dataset.labels.map(() => randomColor())
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
        datalabels: {
          formatter: (value, ctx) => {
            let sum = ctx.chart.data.datasets[0].data.reduce((a,b)=>a+b,0);
            let pct = ((value/sum)*100).toFixed(1)+"%";
            return value+" ("+pct+")";
          },
          color: "#fff"
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

// === Render Bar ===
function renderBar(canvasId, dataset) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (chartObjects[canvasId]) chartObjects[canvasId].destroy();
  chartObjects[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dataset.labels,
      datasets: [{ data: dataset.values, backgroundColor: dataset.labels.map(() => randomColor()) }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: "end",
          align: "top",
          formatter: (value) => value,
          color: "#000",
          font: { weight: "bold" }
        }
      },
      scales: { y: { beginAtZero: true } }
    },
    plugins: [ChartDataLabels]
  });
}

// === Random color generator ===
function randomColor() {
  return "hsl(" + Math.floor(Math.random()*360) + ",70%,60%)";
}

// === Isi Combo Tahun ===
async function loadComboTahun() {
  let { data, error } = await supabase
    .from("guest_comment")
    .select("tanggal");
  if (error) return;

  let years = [...new Set(data.map(d => new Date(d.tanggal).getFullYear()))].sort();
  let cmb = document.getElementById("cmbTahun");
  cmb.innerHTML = "";
  years.forEach(y => {
    let opt = document.createElement("option");
    opt.value = y;
    opt.text = y;
    cmb.appendChild(opt);
  });
}

// === Isi Combo Bulan ===
function loadComboBulan() {
  const bulan = ["01 Januari","02 Februari","03 Maret","04 April","05 Mei","06 Juni","07 Juli","08 Agustus","09 September","10 Oktober","11 November","12 Desember"];
  let cmb = document.getElementById("cmbBulan");
  cmb.innerHTML = "";
  bulan.forEach(b => {
    let opt = document.createElement("option");
    opt.value = b.split(" ")[0]; // "01"
    opt.text = b.split(" ")[1];
    cmb.appendChild(opt);
  });
}

// === Reset ===
function resetFilter() {
  document.getElementById("txtTglAwal").value = "";
  document.getElementById("txtTglAkhir").value = "";
  setDefaultYearMonth();
}

// === Default Tahun Bulan ===
function setDefaultYearMonth() {
  let now = new Date();
  document.getElementById("cmbTahun").value = now.getFullYear();
  document.getElementById("cmbBulan").value = ("0" + (now.getMonth()+1)).slice(-2);
}

// === Saat halaman pertama kali dibuka ===
window.addEventListener("DOMContentLoaded", async () => {
  await loadComboTahun();
  loadComboBulan();
  setDefaultYearMonth();
  loadReport();
});
