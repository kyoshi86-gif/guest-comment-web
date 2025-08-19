// Inisialisasi Supabase
const { createClient } = supabase;
const supabaseClient = createClient(
  "https://drdflrzsvfakdnhqniaa.supabase.co", // ganti dengan URL Supabase kamu
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8"                         // ganti dengan anon public key
);

// ==== INSERT ====
async function saveComment() {
  const guestname = document.getElementById("guestname").value;
  const room = document.getElementById("room").value;
  const comments = document.getElementById("comments").value;
  const rating = parseInt(document.getElementById("rating").value) || null;
  const date = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

  if (!guestname || !room) {
    alert("Nama tamu dan No Meja wajib diisi!");
    return;
  }

  const { error } = await supabaseClient.from("guest_comments").insert([
    {
      nama_tamu: guestname,
      kamar: room,
      komentar: comments,
      rating: rating,
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

// ==== READ ====
async function loadComments() {
  const table = document.getElementById("commentsTableBody");
  if (!table) return;
  table.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("guest_comments")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Load error:", error);
    return;
  }

  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.id}</td>
      <td>${row.tgl || ""}</td>
      <td>${row.nama_tamu || ""}</td>
      <td>${row.kamar || ""}</td>
      <td>${row.komentar || ""}</td>
      <td>${row.rating || ""}</td>
      <td>
        <button onclick="editComment(${row.id}, '${row.nama_tamu}', '${row.kamar}', '${row.komentar}', ${row.rating})">Edit</button>
        <button onclick="deleteComment(${row.id})">Hapus</button>
      </td>
    `;
    table.appendChild(tr);
  });
}

// ==== UPDATE ====
async function editComment(id, nama, kamar, komentar, rating) {
  document.getElementById("guestname").value = nama;
  document.getElementById("room").value = kamar;
  document.getElementById("comments").value = komentar;
  document.getElementById("rating").value = rating;

  // Ubah tombol simpan jadi update
  const saveBtn = document.querySelector("button[onclick='saveComment()']");
  saveBtn.innerText = "Update";
  saveBtn.setAttribute("onclick", `updateComment(${id})`);
}

async function updateComment(id) {
  const guestname = document.getElementById("guestname").value;
  const room = document.getElementById("room").value;
  const comments = document.getElementById("comments").value;
  const rating = parseInt(document.getElementById("rating").value) || null;

  const { error } = await supabaseClient
    .from("guest_comments")
    .update({
      nama_tamu: guestname,
      kamar: room,
      komentar: comments,
      rating: rating,
    })
    .eq("id", id);

  if (error) {
    alert("Error update: " + error.message);
  } else {
    alert("Data berhasil diupdate");
    resetSaveButton();
    clearForm();
    loadComments();
  }
}

// ==== DELETE ====
async function deleteComment(id) {
  if (!confirm("Yakin hapus data ini?")) return;

  const { error } = await supabaseClient
    .from("guest_comments")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Error delete: " + error.message);
  } else {
    alert("Data berhasil dihapus");
    loadComments();
  }
}

// ==== UTIL ====
function clearForm() {
  document.getElementById("guestname").value = "";
  document.getElementById("room").value = "";
  document.getElementById("comments").value = "";
  document.getElementById("rating").value = "";
}

function resetSaveButton() {
  const saveBtn = document.querySelector("button[onclick^='updateComment']");
  if (saveBtn) {
    saveBtn.innerText = "Simpan";
    saveBtn.setAttribute("onclick", "saveComment()");
  }
}

// Load data saat pertama kali halaman dibuka
document.addEventListener("DOMContentLoaded", loadComments);
