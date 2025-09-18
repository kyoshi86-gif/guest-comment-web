// report.js (versi perbaikan)
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { Chart, registerables } from "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.esm.js";
Chart.register(...registerables);


// Supabase config
const supabaseUrl = "https://drdflrzsvfakdnhqniaa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGZscnpzdmZha2RuaHFuaWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY5MDAsImV4cCI6MjA3MTE2MjkwMH0.I88GG5xoPsO0h5oXBxPt58rfuxIqNp7zQS7jvexXss8";
const supabase = createClient(supabaseUrl, supabaseKey);


const COLORS = [
"#4e79a7", "#f28e2b", "#e15759", "#76b7b2",
"#59a14f", "#edc949", "#af7aa1", "#ff9da7",
"#9c755f", "#bab0ac"
];


// --- plugins ---
const outlabelsPlugin = {
id: 'outlabelsPlugin',
afterDraw(chart) {
if (chart.config.type !== 'pie' && chart.config.type !== 'doughnut') return;
const ctx = chart.ctx;
const dataset = chart.data.datasets && chart.data.datasets[0];
if (!dataset) return;
const meta = chart.getDatasetMeta(0);
if (!meta || !meta.data) return;


const total = dataset.data.reduce((s, v) => s + (v || 0), 0);


meta.data.forEach((arc, i) => {
if (!arc) return;
const value = dataset.data[i] || 0;
if (value === 0) return;


const start = arc.startAngle ?? 0;
const end = arc.endAngle ?? 0;
const mid = (start + end) / 2;
const cx = arc.x;
const cy = arc.y;
const outer = arc.outerRadius || Math.min(chart.width, chart.height) / 2;


const lineStartX = cx + Math.cos(mid) * (outer * 0.9);
const lineStartY = cy + Math.sin(mid) * (outer * 0.9);
const lineEndX = cx + Math.cos(mid) * (outer + 18);
const lineEndY = cy + Math.sin(mid) * (outer + 18);


const isRight = Math.cos(mid) >= 0;
const textX = lineEndX + (isRight ? 8 : -8);
const textY = lineEndY + 4;


ctx.save();
ctx.strokeStyle = "#333";
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(lineStartX, lineStartY);
ctx.lineTo(lineEndX, lineEndY);
ctx.stroke();


ctx.fillStyle = "#333";
const years = [