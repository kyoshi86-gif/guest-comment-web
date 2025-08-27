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

// Bersihkan form / reset state
function clearForm(){
  form.reset();
  rowId.value = "";
  mediaOtherInput.disabled = true;
  eventOtherInput.disabled = true;
  btnUpdate.disabled = true;
  btnDelete.disabled = true;
  btnSave.disabled   = false;   // ⬅️ aktifkan lagi Save setelah reset
}

let chartInstance = null;

async function onReport() {
  try {
    const { data, error } = await supabase.from('guest_comments').select('*');
    if (error) throw error;

    // Hitung jumlah berdasarkan media
    const counts = {};
    data.forEach(row => {
      const sumber = row.media || "Tidak diketahui";
      counts[sumber] = (counts[sumber] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const values = Object.values(counts);

    const ctx = document.getElementById('reportChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: [
            '#FF6384','#36A2EB','#FFCE56','#4BC0C0',
            '#9966FF','#FF9F40','#8BC34A','#00BCD4'
          ],
          borderColor: "#fff",
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: { color:'#fff' }
          },
          tooltip: { enabled: false },
          datalabels: {
            color: '#000',
            font: { weight: 'bold' },
            formatter: (value, ctx) => {
              const total = ctx.chart.data.datasets[0].data
                .reduce((a, b) => a + b, 0);
              const percent = ((value / total) * 100).toFixed(1) + "%";
              return `${value} (${percent})`;  // tampilkan angka + persen
            },
            anchor: 'end',
            align: 'end',
            offset: 10,
            clamp: true
          }
        }
      },
      plugins: [ChartDataLabels]
    });

  } catch (err) {
    console.error("Report error:", err.message);
  }
}

// Tutup modal
function closeReport(){
  document.getElementById("reportModal").style.display = "none";
}
