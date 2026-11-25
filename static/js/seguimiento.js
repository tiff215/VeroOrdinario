const D = JSON.parse(document.getElementById("chart-data").textContent);
const green = "#2E7D5B", honey = "#E9A93B", tomato = "#C93D25";
new Chart(document.getElementById("cTend"), {
  type: "line",
  data: { labels: D.labels, datasets: [
    { label: "Calorías consumidas", data: D.serie, borderColor: green, backgroundColor: green, tension: .25 },
    { label: "Meta", data: D.labels.map(() => D.meta), borderColor: tomato, borderDash: [6, 4], pointRadius: 0 } ] },
  options: { maintainAspectRatio: false }
});
new Chart(document.getElementById("cCumpl"), {
  type: "bar",
  data: { labels: D.labels, datasets: [{ label: "% de la meta", data: D.cumpl,
    backgroundColor: D.cumpl.map(v => v > 110 ? tomato : v >= 90 ? green : honey) }] },
  options: { maintainAspectRatio: false, plugins: { legend: { display: false } } }
});
new Chart(document.getElementById("cMacros"), {
  type: "doughnut",
  data: { labels: ["Proteínas", "Carbohidratos", "Grasas"], datasets: [{ data: D.macros, backgroundColor: [green, honey, tomato] }] },
  options: { maintainAspectRatio: false }
});
