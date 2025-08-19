// Konfigurasi Supabase
const SUPABASE_URL = "https://drdflrzsvfakdnhqniaa.supabase.co"; // ganti dengan URL project
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8"; // ganti dengan anon key
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Simpan Data
async function saveComment() {
  const guestname = document.getElementById("guestname").value;
  const table_number = document.getElementById("table_number").value;
  const rating = document.getElementById("rating").value;
  const comments = document.getElementById("comments").value;
  const date = document.getElementById("date").value;

  if (!guestname || !rating || !date) {
    alert("Isi minimal Nama, Rating, dan Tanggal!");
    return;
  }

  const { error } = await supabase.from("guest_comments").insert([
    {
      nama_tamu: guestname,
      kamar: table_number,  // dipakai untuk No Meja
      rating: rating,
      komentar: comments,
      tgl: date,
    },
  ]);

  if (error) {
    alert("Error insert: " + error.message);
  } else {
    alert("Data berhasil disimpan");
    clearForm();
    loadComments();
  }
}

// Tampilkan Data
async function loadComments() {
  const { data, error } = await supabase
    .from("guest_comments")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Error load:", error.message);
    return;
  }

  const tbody = document.querySelector("#reportTable tbody");
  tbody.innerHTML = "";

  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.nama_tamu}</td>
      <td>${row.kamar}</td>
      <td>${row.rating}</td>
      <td>${row.komentar}</td>
      <td>${row.tgl}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Hapus form
function clearForm() {
  document.getElementById("guestname").value = "";
  document.getElementById("table_number").value = "";
  document.getElementById("rating").value = "";
  document.getElementById("comments").value = "";
  document.getElementById("date").value = "";
}

// Load data saat halaman dibuka
window.onload = loadComments;
