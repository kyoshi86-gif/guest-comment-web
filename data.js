// data.js (diperbarui)
// --- Supabase Client ---
const SUPABASE_URL = "https://drdflrzsvfakdnhqniaa.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM
const tableBody = document.querySelector("#dataTable tbody");
const selectAllCheckbox = document.getElementById("selectAll");
const filterBtn = document.getElementById("filterBtn");
const exportBtn = document.getElementById("exportBtn");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const filterStartInput = document.getElementById("filterStart");
const filterEndInput = document.getElementById("filterEnd");

let allData = [];

// --- Helper: format tanggal ---
function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// --- Render Table ---
function renderTable(data) {
  if (!tableBody) return;
  tableBody.innerHTML = "";

  data.forEach((row, index) => {
    const tr = document.createElement("tr");

    // Checkbox
    const tdCheck = document.createElement("td");
    tdCheck.style.textAlign = "center";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.index = index;

    // tampilkan checked jika _checked atau _saved (saved dianggap default tercentang)
    const checkedDefault = Boolean(row._checked) || Boolean(row._saved);
    checkbox.checked = checkedDefault;

    // restore visual (jika saved)
    if (row._saved) tr.classList.add("table-success");

    checkbox.addEventListener("change", (e) => {
      // update _checked sesuai interaksi user
      row._checked = e.target.checked;
      // visual: jika dicentang tampil hijau sementara; jika tidak dicentang dan belum saved hapus warna
      if (e.target.checked) {
        tr.classList.add("table-success");
      } else {
        // hanya hilangkan warna jika user juga belum menyimpan (row._saved === false)
        if (!row._saved) tr.classList.remove("table-success");
      }
    });

    tdCheck.appendChild(checkbox);
    tr.appendChild(tdCheck);

    // Kolom Data (wrap text & center)
    const columns = [
      "tgl",
      "jam",
      "no_meja",
      "nama_tamu",
      "asal",
      "media_source",
      "media_other",
      "event_type",
      "service_other",
      "age_range",
      "food_quality",
      "beverage_quality",
      "serving_speed",
      "service_rating",
      "cleanliness",
      "ambience",
      "price_rating",
      "comments",
    ];

    columns.forEach((col) => {
      const td = document.createElement("td");
      td.style.whiteSpace = "normal";
      td.style.textAlign = "center";
      if (col === "tgl" && row[col]) {
        td.textContent = formatDate(row[col]);
      } else {
        td.textContent = row[col] ?? "";
      }
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });

  // update selectAll checkbox state
  updateSelectAllState();
}

function updateSelectAllState() {
  if (!selectAllCheckbox || !tableBody) return;
  const rows = Array.from(tableBody.querySelectorAll("input[type=checkbox]"));
  if (rows.length === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
    return;
  }
  const checkedCount = rows.filter((c) => c.checked).length;
  if (checkedCount === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  } else if (checkedCount === rows.length) {
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
  } else {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = true;
  }
}

// --- Fetch Data dari Supabase ---
// startDate/endDate: JS Date object (optional)
async function fetchData(startDate, endDate) {
  let query = supabase.from("guest_comments").select("*");

  if (startDate && endDate) {
    query = query
      .gte("tgl", startDate.toISOString())
      .lte("tgl", endDate.toISOString());
  } else {
    // Default: bulan berjalan
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    query = query.gte("tgl", firstDay.toISOString()).lte("tgl", lastDay.toISOString());
  }

  query = query.order("tgl", { ascending: true });

  const { data, error } = await query;
  if (error) {
    console.error("Load data error:", error);
    alert("Gagal memuat data: " + (error.message || JSON.stringify(error)));
    return;
  }

  // merge state lama (jika ada) berdasarkan id agar _checked/_saved tidak hilang saat reload
  const merged = (data || []).map((row) => {
    const prev = allData.find((r) => r.id === row.id);
    if (prev) {
      row._checked = prev._checked;
      row._saved = prev._saved;
    } else {
      // jika tidak ada state sebelumnya, biarkan apa adanya (tidak di-check)
      row._checked = Boolean(row._checked) || false;
      row._saved = Boolean(row._saved) || false;
    }
    return row;
  });

  allData = merged;
  renderTable(allData);
}

// --- Event Filter ---
if (filterBtn) {
  filterBtn.addEventListener("click", () => {
    const startVal = filterStartInput ? filterStartInput.value : "";
    const endVal = filterEndInput ? filterEndInput.value : "";

    if (startVal && endVal) {
      fetchData(new Date(startVal), new Date(endVal));
    } else {
      fetchData(); // default bulan berjalan
    }
  });
}

// --- Event Select All ---
if (selectAllCheckbox) {
  selectAllCheckbox.addEventListener("change", (e) => {
    const checked = e.target.checked;
    // update only _checked (temporary), don't modify _saved until user clicks Save
    allData.forEach((row, index) => {
      row._checked = checked;
      const tr = tableBody.children[index];
      if (!tr) return;
      const checkbox = tr.querySelector("input[type=checkbox]");
      if (checkbox) checkbox.checked = checked;
      if (checked) {
        tr.classList.add("table-success");
      } else {
        // jika unchecked, only remove color if not saved
        if (!row._saved) tr.classList.remove("table-success");
      }
    });
  });
}

// --- Export Excel ---
// (menggunakan SheetJS jika sudah include library XLSX di HTML)
if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    if (typeof XLSX === "undefined") {
      alert("Library XLSX tidak ditemukan. Pastikan include SheetJS (xlsx.full.min.js).");
      return;
    }
    const rows = [
      [
        "Tanggal",
        "Jam",
        "No Meja",
        "Nama Tamu",
        "Asal",
        "Media Source",
        "Media Other",
        "Event Type",
        "Service Other",
        "Age Range",
        "Food Quality",
        "Beverage Quality",
        "Serving Speed",
        "Service Rating",
        "Cleanliness",
        "Ambience",
        "Price Rating",
        "Comments",
      ],
      ...allData.map((row) => [
        formatDate(row.tgl),
        row.jam ?? "",
        row.no_meja ?? "",
        row.nama_tamu ?? "",
        row.asal ?? "",
        row.media_source ?? "",
        row.media_other ?? "",
        row.event_type ?? "",
        row.service_other ?? "",
        row.age_range ?? "",
        row.food_quality ?? "",
        row.beverage_quality ?? "",
        row.serving_speed ?? "",
        row.service_rating ?? "",
        row.cleanliness ?? "",
        row.ambience ?? "",
        row.price_rating ?? "",
        row.comments ?? "",
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Guest Comments");
    XLSX.writeFile(workbook, "guest_comments.xlsx");
  });
}

// --- Event Save ---
// Commit saved state to reflect current checkboxes: saved = checked, unsaved = unchecked
if (saveBtn) {
  saveBtn.addEventListener("click", () => {
    // apply current checkbox states to data and saved flag
    const rows = tableBody.querySelectorAll("tr");
    allData.forEach((row, index) => {
      const tr = rows[index];
      if (!tr) return;
      const checkbox = tr.querySelector("input[type=checkbox]");
      const isChecked = checkbox ? checkbox.checked : Boolean(row._saved);
      // commit: saved = current checked
      row._checked = isChecked;
      row._saved = isChecked;
      if (isChecked) tr.classList.add("table-success");
      else tr.classList.remove("table-success");
    });
    updateSelectAllState();
    alert("Perubahan disimpan. Baris yang tersimpan berwarna hijau.");
  });
}

// --- Event Reset ---
// Reset hanya mengembalikan ke kondisi default (bulan berjalan), TIDAK menghapus centang / warna yang sudah tersimpan.
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    // kosongkan input filter tanggal di UI
    if (filterStartInput) filterStartInput.value = "";
    if (filterEndInput) filterEndInput.value = "";

    // fetch default month (merge akan menjaga _saved/_checked bila id sama)
    fetchData();
  });
}

// --- Load awal bulan berjalan ---
fetchData();
