
// --- Supabase Client ---
const SUPABASE_URL = "https://drdflrzsvfakdnhqniaa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8"; // ganti dengan anon key kamu
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tableBody = document.querySelector("#dataTable tbody");
const selectAllCheckbox = document.getElementById("selectAll");
const filterBtn = document.getElementById("filterBtn");
const exportBtn = document.getElementById("exportBtn");

let allData = [];

// --- Helper: format tanggal ---
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// --- Render Table ---
function renderTable(data) {
  tableBody.innerHTML = "";
  data.forEach((row, index) => {
    const tr = document.createElement("tr");

    // Checkbox
    const tdCheck = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.index = index;

    // restore state (jika sudah dicentang)
    if (row._checked) {
      checkbox.checked = true;
      tr.classList.add("table-success");
    }

    checkbox.addEventListener("change", (e) => {
      row._checked = e.target.checked;
      if (e.target.checked) {
        tr.classList.add("table-success");
      } else {
        tr.classList.remove("table-success");
      }
    });

    tdCheck.appendChild(checkbox);
    tr.appendChild(tdCheck);

    // Kolom Data
    const columns = [
      "tanggal",
      "nama",
      "asal",
      "media",
      "acara",
      "usia",
      "food_quality",
      "beverage_quality",
      "service_quality",
      "ambience",
      "value_for_money",
    ];

    columns.forEach((col) => {
      const td = document.createElement("td");
      td.textContent = row[col] ?? "";
      td.style.whiteSpace = "normal";
      td.style.textAlign = "center";
      if (col === "tanggal" && row[col]) {
        td.textContent = formatDate(row[col]);
      }
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });
}

// --- Fetch Data dari Supabase ---
async function fetchData(startDate, endDate) {
  let query = supabase.from("guest_comments").select("*");

  if (startDate && endDate) {
    query = query
      .gte("tanggal", startDate.toISOString())
      .lte("tanggal", endDate.toISOString());
  } else {
    // Default bulan berjalan
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    query = query
      .gte("tanggal", firstDay.toISOString())
      .lte("tanggal", lastDay.toISOString());
  }

  query = query.order("tanggal", { ascending: true });

  const { data, error } = await query;
  if (error) {
    console.error("Load data error:", error);
    return;
  }
  allData = data;
  renderTable(allData);
}

// --- Event Filter ---
filterBtn.addEventListener("click", () => {
  const start = document.getElementById("filterStart").value;
  const end = document.getElementById("filterEnd").value;

  if (start && end) {
    fetchData(new Date(start), new Date(end));
  } else {
    fetchData(); // default bulan berjalan
  }
});

// --- Event Select All ---
selectAllCheckbox.addEventListener("change", (e) => {
  const checked = e.target.checked;
  allData.forEach((row, index) => {
    row._checked = checked;
    const tr = tableBody.children[index];
    const checkbox = tr.querySelector("input[type=checkbox]");
    checkbox.checked = checked;
    if (checked) {
      tr.classList.add("table-success");
    } else {
      tr.classList.remove("table-success");
    }
  });
});

// --- Export Excel ---
exportBtn.addEventListener("click", () => {
  const rows = [
    [
      "Tanggal",
      "Nama",
      "Asal",
      "Media",
      "Acara",
      "Usia",
      "Food Quality",
      "Beverage Quality",
      "Service Quality",
      "Ambience",
      "Value for Money",
    ],
    ...allData.map((row) => [
      formatDate(row.tanggal),
      row.nama ?? "",
      row.asal ?? "",
      row.media ?? "",
      row.acara ?? "",
      row.usia ?? "",
      row.food_quality ?? "",
      row.beverage_quality ?? "",
      row.service_quality ?? "",
      row.ambience ?? "",
      row.value_for_money ?? "",
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Guest Comments");
  XLSX.writeFile(workbook, "guest_comments.xlsx");
});

// --- Load awal bulan berjalan ---
fetchData();
