
// Konfigurasi Supabase
const SUPABASE_URL = "https://drdflrzsvfakdnhqniaa.supabase.co"; // ganti dengan URL project
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8"; // ganti dengan anon key
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("saveBtn");
  const acaraLainnyaRadio = document.getElementById("acaraLainnyaRadio");
  const acaraLainnyaInput = document.getElementById("acara_lainnya");

  // aktifkan textbox jika pilih "Lainnya"
  document.querySelectorAll("input[name='acara']").forEach(radio => {
    radio.addEventListener("change", () => {
      if (acaraLainnyaRadio.checked) {
        acaraLainnyaInput.disabled = false;
      } else {
        acaraLainnyaInput.disabled = true;
        acaraLainnyaInput.value = "";
      }
    });
  });

  saveBtn.addEventListener("click", saveComment);
});

async function saveComment() {
  const tgl = document.getElementById("tgl").value;
  const jam = document.getElementById("jam").value;
  const no_meja = document.getElementById("no_meja").value;
  const nama_tamu = document.getElementById("nama_tamu").value;
  const komentar = document.getElementById("komentar").value;
  const rating = document.getElementById("rating").value;
  const asal = document.querySelector("input[name='asal']:checked").value;
  const acara = document.querySelector("input[name='acara']:checked").value;
  const acara_lainnya = document.getElementById("acara_lainnya").value;

  if (!tgl || !jam || !no_meja || !nama_tamu || !rating) {
    alert("Harap lengkapi semua data wajib!");
    return;
  }

  const { error } = await supabase.from("guest_comments").insert([
    { tgl, jam, no_meja, nama_tamu, komentar, rating, asal, acara, acara_lainnya }
  ]);

  if (error) {
    alert("❌ Gagal simpan: " + error.message);
  } else {
    alert("✅ Data berhasil disimpan!");
    document.getElementById("guestForm").reset();
    document.getElementById("acara_lainnya").disabled = true;
  }
}