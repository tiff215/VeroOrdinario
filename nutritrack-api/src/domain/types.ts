export interface Nutricion {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  fibra: number;
}

export const MOMENTOS = ["desayuno", "colacion_am", "comida", "colacion_pm", "cena"] as const;
export type Momento = (typeof MOMENTOS)[number];

export type Rol = "admin" | "cliente";

export interface Objetivo {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

/** Consumo total por día: { "2026-11-24": Nutricion } */
export type ConsumoPorDia = Record<string, Nutricion>;

export const NUTRICION_VACIA = (): Nutricion => ({
  calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0, fibra: 0,
});

export const CLAVES_NUTRICION: (keyof Nutricion)[] =
  ["calorias", "proteinas", "carbohidratos", "grasas", "fibra"];

/** Multiplica todos los valores nutricionales por un factor. */
export function escalar(n: Nutricion, factor: number): Nutricion {
  const r = NUTRICION_VACIA();
  CLAVES_NUTRICION.forEach(k => (r[k] = n[k] * factor));
  return r;
}

export function sumar(a: Nutricion, b: Nutricion): Nutricion {
  const r = NUTRICION_VACIA();
  CLAVES_NUTRICION.forEach(k => (r[k] = a[k] + b[k]));
  return r;
}
