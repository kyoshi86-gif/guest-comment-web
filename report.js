// ====== Update All Charts ======
async function updateCharts() {
  const tahun = parseInt(tahunSelect.value);
  const bulan = parseInt(bulanSelect.value);
  const { today } = getCurrentYearMonth();

  let filterStart, filterEnd;

  if (startDate.value && endDate.value) {
    filterStart = startDate.value;
    filterEnd = endDate.value;
  } else {
    filterStart = `${tahun}-${String(bulan).padStart(2,"0")}-01`;
    filterEnd = today;
  }

  // === Ambil data agregat rating ===
  const { data: ratingData, error: ratingError } = await supabase.rpc("get_rating_avg", {
    p_year: tahun,
    p_month: bulan
  });
  if (ratingError) console.error("Rating error:", ratingError);

  // === Ambil data usia ===
  const { data: usiaData, error: usiaError } = await supabase
    .from("guest_comments")
    .select("usia")
    .gte("tanggal", filterStart).lte("tanggal", filterEnd);
  if (usiaError) console.error("Usia error:", usiaError);

  // === Ambil data acara ===
  const { data: acaraData, error: acaraError } = await supabase
    .from("guest_comments")
    .select("acara")
    .gte("tanggal", filterStart).lte("tanggal", filterEnd);
  if (acaraError) console.error("Acara error:", acaraError);

  // === Ambil data media ===
  const { data: mediaData, error: mediaError } = await supabase
    .from("guest_comments")
    .select("media")
    .gte("tanggal", filterStart).lte("tanggal", filterEnd);
  if (mediaError) console.error("Media error:", mediaError);

  // === Ambil data asal ===
  const { data: asalData, error: asalError } = await supabase
    .from("guest_comments")
    .select("asal")
    .gte("tanggal", filterStart).lte("tanggal", filterEnd);
  if (asalError) console.error("Asal error:", asalError);

  // ====== Hapus chart lama ======
  [chartAsal, chartMedia, chartAcara, chartUsia, chartRating].forEach(ch => ch && ch.destroy());

  // ====== Render Chart Rating ======
  if (ratingData && ratingData.length > 0) {
    const r = ratingData[0];
    const fields = ["food_quality","beverage_quality","serving_speed","service","cleanliness","ambience","price"];
    const values = fields.map(f => r[f]);
    chartRating = renderBarChart(
      document.getElementById("chartRating"),
      "Rating Rata-rata",
      fields.map(f => f.replace("_"," ")),
      values
    );
  }

  // ====== Helper count ======
  const countBy = (arr, field) => {
    const counts = {};
    arr.forEach(row => {
      const key = row[field] || "Lainnya";
      counts[key] = (counts[key] || 0) + 1;
    });
    return { labels: Object.keys(counts), values: Object.values(counts) };
  };

  // ====== Render Pie Charts ======
  const usia = countBy(usiaData, "usia");
  const acara = countBy(acaraData, "acara");
  const media = countBy(mediaData, "media");
  const asal = countBy(asalData, "asal");

  chartUsia = renderPieChart(document.getElementById("chartUsia"), "Usia", usia.labels, usia.values);
  chartAcara = renderPieChart(document.getElementById("chartAcara"), "Acara", acara.labels, acara.values);
  chartMedia = renderPieChart(document.getElementById("chartMedia"), "Media Sosial", media.labels, media.values);
  chartAsal = renderPieChart(document.getElementById("chartAsal"), "Asal", asal.labels, asal.values);
}
