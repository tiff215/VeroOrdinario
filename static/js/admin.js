// Filas dinámicas de ingredientes y visibilidad según tipo
const tipo = document.getElementById("tipo");
const box = document.getElementById("platillo-box");
const simple = document.getElementById("simple-box");
function toggle() {
  const p = tipo.value === "platillo";
  box.hidden = !p; simple.hidden = p;
}
tipo.addEventListener("change", toggle); toggle();
document.getElementById("add-row").addEventListener("click", () => {
  const t = document.getElementById("row-tpl").content.cloneNode(true);
  document.getElementById("rows").appendChild(t);
});
document.getElementById("rows").addEventListener("click", e => {
  if (e.target.matches(".rm")) e.target.closest(".row").remove();
});
