const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha local como "YYYY-MM-DD". */
export function fechaISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export const hoyISO = (): string => fechaISO();

export function restarDias(dias: number, desde: Date = new Date()): string {
  const d = new Date(desde);
  d.setDate(d.getDate() - dias);
  return fechaISO(d);
}

/** Valida que sea una fecha real con formato YYYY-MM-DD. */
export function fechaValida(texto: string): boolean {
  if (!FORMATO.test(texto)) return false;
  const [y, m, d] = texto.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  return fecha.getFullYear() === y && fecha.getMonth() === m - 1 && fecha.getDate() === d;
}
