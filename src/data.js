
import { supabase } from "./supabaseClient.js"
import { checkAuth, logout } from "./base.js";

checkAuth();
document.getElementById("logout").onclick = logout;

document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("#dataTable tbody");
  const selectAllCheckbox = document.getElementById("selectAll");
  const filterBtn = document.getElementById("filterBtn");
  const exportBtn = document.getElementById("exportBtn");
  const saveBtn = document.getElementById("saveBtn");
  const resetBtn = document.getElementById("resetBtn");
  const filterStartInput = document.getElementById("filterStart");
  const filterEndInput = document.getElementById("filterEnd");
  const uploadInput = document.getElementById("uploadExcel");

  let allData = [];

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
  }

  function checkSaveButtonVisibility() {
    if (!allData || allData.length === 0) {
      if (saveBtn) saveBtn.style.display = "none";
      return;
    }
    const changed = allData.some(r => Boolean(r._checked) !== Boolean(r.is_saved));
    if (saveBtn) saveBtn.style.display = changed ? "inline-block" : "none";
  }

  function renderTable(data) {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    const highlightCols = ["food_quality","beverage_quality","serving_speed","service_rating","cleanliness","ambience","price_rating"];

    data.forEach((row, index) => {
      const tr = document.createElement("tr");

      const tdCheck = document.createElement("td");
      tdCheck.style.textAlign = "center";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.index = index;
      checkbox.checked = row._checked;

      if (row.is_saved) tr.classList.add("table-success");

      checkbox.addEventListener("change", (e) => {
        row._checked = e.target.checked;
        if (e.target.checked) tr.classList.add("table-success");
        else if (!row.is_saved) tr.classList.remove("table-success");
        checkSaveButtonVisibility();
      });

      tdCheck.appendChild(checkbox);
      tr.appendChild(tdCheck);

      const columns = ["tgl","jam","no_meja","nama_tamu","asal","media_source","media_other","event_type","event_other","age_range","food_quality","beverage_quality","serving_speed","service_rating","cleanliness","ambience","price_rating","comments"];
      columns.forEach(col => {
        const td = document.createElement("td");
        td.style.whiteSpace = "normal";
        td.style.textAlign = "center";
        let value = row[col] ?? "";
        if (col === "tgl" && row[col]) value = formatDate(row[col]);
        td.textContent = value;
        if (highlightCols.includes(col) && (String(value).trim() === "1" || String(value).trim() === "2")) {
          td.style.backgroundColor = "red"; 
          td.style.color = "white"; 
          td.style.fontWeight = "bold";
        }
        tr.appendChild(td);
      });

      tableBody.appendChild(tr);
    });

    updateSelectAllState();
    checkSaveButtonVisibility();
  }

  function updateSelectAllState() {
    if (!selectAllCheckbox || !tableBody) return;
    const rows = Array.from(tableBody.querySelectorAll("input[type=checkbox]"));
    const checkedCount = rows.filter(c => c.checked).length;
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

  async function fetchData(startDate, endDate) {
    let query = supabase.from("guest_comments").select("*");
    if (startDate && endDate) {
      query = query.gte("tgl", startDate.toISOString()).lte("tgl", endDate.toISOString());
    } else {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      query = query.gte("tgl", firstDay.toISOString()).lte("tgl", lastDay.toISOString());
    }
    query = query.order("tgl", { ascending: true });
    const { data, error } = await query;
    if (error) { console.error(error); alert("Gagal memuat data"); return; }

    allData = (data || []).map(r => {
      r._checked = r.is_saved === true;
      return r;
    });

    renderTable(allData);
    checkSaveButtonVisibility();
  }

  // --- Save ---
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const rows = tableBody.querySelectorAll("tr");
      allData.forEach((row, index) => {
        const tr = rows[index];
        if (!tr) return;
        const cb = tr.querySelector("input[type=checkbox]");
        const isChecked = cb ? cb.checked : Boolean(row.is_saved);
        row._checked = isChecked;
        row.is_saved = isChecked;
        if (isChecked) tr.classList.add("table-success");
        else tr.classList.remove("table-success");
      });
      updateSelectAllState();
      checkSaveButtonVisibility();

      // 🔹 Update hanya kolom is_saved
      for (const r of allData) {
        const { error } = await supabase
          .from("guest_comments")
          .update({ is_saved: r.is_saved })
          .eq("id", r.id);

        if (error) {
          console.error("Update gagal untuk id:", r.id, error);
        }
      }
      alert("Perubahan disimpan");
      console.log("Update selesai");
    });
  }

  // --- Filter ---
  if (filterBtn) {
    filterBtn.addEventListener("click", () => {
      const startVal = filterStartInput ? filterStartInput.value : "";
      const endVal = filterEndInput ? filterEndInput.value : "";
      if (startVal && endVal) {
        const startDate = new Date(startVal);
        const endDate = new Date(endVal);
        if (endDate < startDate) { alert("Tanggal akhir tidak boleh lebih kecil dari tanggal mulai."); return; }
        fetchData(startDate, endDate);
      } else fetchData();
    });
  }

  // --- Select All ---
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", (e) => {
      const checked = e.target.checked;
      allData.forEach((r, i) => {
        r._checked = checked;
        const tr = tableBody.children[i]; if (!tr) return;
        const cb = tr.querySelector("input[type=checkbox]");
        if (cb) cb.checked = checked;
        if (checked) tr.classList.add("table-success"); 
        else if (!r.is_saved) tr.classList.remove("table-success");
      });
      checkSaveButtonVisibility();
    });
  }

  // --- Reset ---
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (filterStartInput) filterStartInput.value = "";
      if (filterEndInput) filterEndInput.value = "";
      fetchData();
    });
  }

  // --- Export ---
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (typeof XLSX === "undefined") { alert("Library XLSX tidak ditemukan."); return; }
      const rows = [["Tanggal","Jam","No Meja","Nama","Asal","Media Sosial","Media Lainnya","Acara","Acara Lainnya","Usia","Food Quality","Beverage Quality","Serving Speed","Service","Cleanliness","Ambience","Price","Comments"],
        ...allData.map(r => [formatDate(r.tgl),r.jam??"",r.no_meja??"",r.nama_tamu??"",r.asal??"",r.media_source??"",r.media_other??"",r.event_type??"",r.event_other??"",r.age_range??"",r.food_quality??"",r.beverage_quality??"",r.serving_speed??"",r.service_rating??"",r.cleanliness??"",r.ambience??"",r.price_rating??"",r.comments??""])
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Guest Comments");
      XLSX.writeFile(wb, "guest_comments.xlsx");
    });
  }

  // --- Upload ---
  if (uploadInput) {
    uploadInput.addEventListener("change", handleFileUpload);
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(event) {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const expectedHeader = ["Tanggal","Jam","No Meja","Nama","Asal","Media Sosial","Media Lainnya","Acara","Acara Lainnya","Usia","Food Quality","Beverage Quality","Serving Speed","Service","Cleanliness","Ambience","Price","Comments"];
        const headerRow = jsonData[0] || [];
        const isValid = expectedHeader.every((col, i) => headerRow[i] === col);
        if (!isValid) { alert("Format header tidak sesuai"); return; }

        const newRows = jsonData.slice(1).map(r => ({
          tgl:r[0]?new Date(r[0]):null, jam:r[1]??"", no_meja:r[2]??"", nama_tamu:r[3]??"", asal:r[4]??"",
          media_source:r[5]??"", media_other:r[6]??"", event_type:r[7]??"", service_other:r[8]??"", age_range:r[9]??"",
          food_quality:r[10]??"", beverage_quality:r[11]??"", serving_speed:r[12]??"", service_rating:r[13]??"", cleanliness:r[14]??"",
          ambience:r[15]??"", price_rating:r[16]??"", comments:r[17]??""
        }));

        const { error } = await supabase.from("guest_comments").insert(newRows);
        if (error) { console.error(error); alert("Upload gagal"); }
        else { alert("Upload berhasil!"); fetchData(); }

      } catch (err) { console.error(err); alert("Gagal membaca file Excel"); }
    };
    reader.readAsArrayBuffer(file);
  }

  // --- Realtime Supabase untuk update warna otomatis ---
  supabase.channel('guest_comments_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_comments' }, payload => {
      const updated = payload.new;
      if (!updated) return;
      const rowIndex = allData.findIndex(r => r.id === updated.id);
      if (rowIndex >= 0) {
        allData[rowIndex].is_saved = updated.is_saved;
        allData[rowIndex]._checked = updated.is_saved;
        renderTable(allData);
      }
    })
    .subscribe();

  // --- Load awal bulan berjalan ---
  fetchData();
});
