// app.js
// Ganti dengan kredensial dari Supabase Project Settings
const SUPABASE_URL = "https://drdflrzsvfakdnhqniaa.supabase.co"; // ganti dengan URL project
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8"; // ganti dengan anon key
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("guestForm");

// Simpan data
async function saveComment() {
  e.preventDefault();

  const tgl = document.getElementById("tgl").value;
  const jam = document.getElementById("jam").value;
  const no_meja = document.getElementById("no_meja").value;
  const nama = document.getElementById("nama_tamu").value;
  const komentar = document.getElementById("komentar").value;
  const rating = document.getElementById("rating").value;

  // Radio button asal
  const asal = document.querySelector("input[name='asal']:checked")?.value;

  // Radio button acara
  let acara = document.querySelector("input[name='acara']:checked")?.value;
  if (acara === "Lainnya") {
    acara = document.getElementById("acara_lainnya").value || "Lainnya";
  }

  // Insert ke Supabase
  const { data, error } = await supabase
    .from("guest_comments")
    .insert([
      {
        tgl,
        jam,
        no_meja,
        nama,
        komentar,
        rating,
        asal,
        acara,
      },
    ]);

  if (error) {
    alert("❌ Gagal simpan: " + error.message);
  } else {
    alert("✅ Data berhasil disimpan!");
    form.reset();
  }
}

form.addEventListener("submit", saveComment);

// Load data ke tabel
async function loadComments() {
  const { data, error } = await supabase
    .from("guest_comments")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const tableBody = document.getElementById("commentTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = "";

  data.forEach((row, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${row.tgl}</td>
      <td>${row.jam}</td>
      <td>${row.no_meja}</td>
      <td>${row.nama}</td>
      <td>${row.asal}</td>
      <td>${row.acara}</td>
      <td>${row.rating} ⭐</td>
      <td>${row.komentar || ""}</td>
    `;
    tableBody.appendChild(tr);
  });
}

window.addEventListener("DOMContentLoaded", loadComments);
