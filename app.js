// === KONFIGURASI SUPABASE ===
const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co"; // ganti
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8"; // ganti
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

document.getElementById("guestForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const guestname = document.getElementById("guestname").value;
  const room = document.getElementById("room").value;
  const date = document.getElementById("date").value;
  const rating = document.getElementById("rating").value;
  const comments = document.getElementById("comments").value;

  const { error } = await supabase.from("guest_comments").insert([
    {
      nama_tamu: guestname,
      kamar: room,
      tgl: date,
      rating: rating,
      komentar: comments
    }
  ]);

  if (error) {
    alert("Error insert: " + error.message);
  } else {
    alert("Data berhasil disimpan");
    document.getElementById("guestForm").reset();
    loadComments();
  }
});

// === LOAD DATA ===
async function loadComments() {
  const { data, error } = await supabase
    .from("guest_comments")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Error load:", error.message);
    return;
  }

  const tbody = document.getElementById("commentTableBody");
  tbody.innerHTML = "";

  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.nama_tamu}</td>
      <td>${row.kamar}</td>
      <td>${row.tgl}</td>
      <td>${row.rating}</td>
      <td>${row.komentar}</td>
    `;
    tbody.appendChild(tr);
  });
}

loadComments();
