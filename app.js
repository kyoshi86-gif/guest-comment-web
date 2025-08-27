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

let chartObjects = {}; // simpan chart biar bisa di-destroy saat refresh

function loadReport() {
  // contoh dataset dummy (nanti bisa diisi dari Supabase)
  const dataAsal = { labels: ["Jogja", "Solo", "Magelang"], values: [120, 80, 40] };
  const dataMedia = { labels: ["Instagram", "Facebook", "Tiktok"], values: [90, 60, 30] };
  const dataUlasan = { labels: ["Puas", "Biasa", "Kurang"], values: [150, 50, 20] };
  const dataAcara = { labels: ["Seminar", "Workshop", "Expo"], values: [40, 30, 20] };
  const dataUsia = { labels: ["<20", "20-30", "31-40", "41+"], values: [20, 60, 50, 30] };

  // definisi semua chart
  renderPie("chartAsal", dataAsal, ["#2ecc71", "#27ae60", "#1e8449"]);
  renderPie("chartMedia", dataMedia, ["#3498db", "#2980b9", "#1f618d"]);
  renderPie("chartUlasan", dataUlasan, ["#f39c12", "#e67e22", "#d35400"]);
  renderBar("chartAcara", dataAcara, ["#9b59b6", "#8e44ad", "#6c3483"]);
  renderBar("chartUsia", dataUsia, ["#34495e", "#7f8c8d", "#95a5a6", "#bdc3c7"]);
}

// fungsi render Pie chart
function renderPie(canvasId, dataset, colors) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  // destroy chart lama
  if (chartObjects[canvasId]) chartObjects[canvasId].destroy();

  chartObjects[canvasId] = new Chart(ctx, {
    type: "pie",
    data: {
      labels: dataset.labels,
      datasets: [{
        data: dataset.values,
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
        datalabels: {
          formatter: (value, context) => {
            let sum = context.chart.data.datasets[0].data.reduce((a,b)=>a+b,0);
            let percentage = ((value/sum)*100).toFixed(1)+"%";
            return value + " (" + percentage + ")";
          },
          color: "#fff",
          font: { weight: "bold" }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

// fungsi render Bar chart
function renderBar(canvasId, dataset, colors) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  if (chartObjects[canvasId]) chartObjects[canvasId].destroy();

  chartObjects[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dataset.labels,
      datasets: [{
        data: dataset.values,
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: "end",
          align: "top",
          formatter: (value, context) => {
            let sum = context.chart.data.datasets[0].data.reduce((a,b)=>a+b,0);
            let percentage = ((value/sum)*100).toFixed(1)+"%";
            return value + " (" + percentage + ")";
          },
          color: "#000",
          font: { weight: "bold" }
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    },
    plugins: [ChartDataLabels]
  });
}
