import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
// Konfigurasi Supabase
const SUPABASE_URL = "https://drdflrzsvfakdnhqniaa.supabase.co"; // ganti dengan URL project
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8"; // ganti dengan anon key

const client = createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
  const btnSave = document.getElementById("btnSave");
  const acaraRadios = document.getElementsByName("acara");
  const acaraLainnya = document.getElementById("acaraLainnya");

  // Aktifkan kolom "lainnya" hanya jika dipilih
  acaraRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      acaraLainnya.disabled = radio.value !== "Lainnya";
    });
  });

  btnSave.addEventListener("click", saveComment);
  loadComments();
});

async function saveComment() {
  const tgl = document.getElementById("tgl").value;
  const jam = document.getElementById("jam").value;
  const meja = document.getElementById("meja").value;
  const nama = document.getElementById("nama").value;
  const komentar = document.getElementById("komentar").value;
  const rating = document.getElementById("rating").value;
  const asal = document.querySelector("input[name='asal']:checked")?.value;
  
  let acara = document.querySelector("input[name='acara']:checked")?.value;
  if (acara === "Lainnya") {
    acara = document.getElementById("acaraLainnya").value;
  }

  if (!tgl || !jam || !meja || !nama || !komentar || !rating || !asal || !acara) {
    alert("Mohon lengkapi semua field!");
    return;
  }

  const { error } = await client.from("guest_comments").insert([{
    tgl, jam, meja, nama_tamu: nama, komentar, rating, asal, acara
  }]);

  if (error) {
    alert("Error insert: " + error.message);
  } else {
    alert("Data berhasil disimpan");
    loadComments();
    document.getElementById("guestForm").reset();
    document.getElementById("acaraLainnya").disabled = true;
  }
}

async function loadComments() {
  const { data, error } = await client.from("guest_comments").select("*").order("id", { ascending: false });
  if (error) {
    console.error("Error load:", error.message);
    return;
  }

  const tbody = document.querySelector("#commentTable tbody");
  tbody.innerHTML = "";

  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.tgl || ""}</td>
      <td>${row.jam || ""}</td>
      <td>${row.meja || ""}</td>
      <td>${row.nama_tamu || ""}</td>
      <td>${row.komentar || ""}</td>
      <td>${row.rating || ""}</td>
      <td>${row.asal || ""}</td>
      <td>${row.acara || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}