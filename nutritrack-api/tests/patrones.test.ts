import { Ingrediente, Platillo } from "../src/domain/componente";
import { aplicarEtiquetas, Fortificado, SinGluten, Vegano } from "../src/domain/decorators";
import { obtenerCreator } from "../src/domain/factory";
import { DatosEvento, Evento, NotificacionPort, NotificadorBD, Observer, Subject } from "../src/domain/observers";
import {
  CalculadorIndicadores, CumplimientoCalorico, DistribucionMacros, TendenciaSemanal,
} from "../src/domain/strategies";
import { ConsumoPorDia, Nutricion, Objetivo } from "../src/domain/types";

const n = (calorias: number, proteinas = 0, carbohidratos = 0, grasas = 0, fibra = 0): Nutricion =>
  ({ calorias, proteinas, carbohidratos, grasas, fibra });
const objetivo: Objetivo = { calorias: 2000, proteinas: 100, carbohidratos: 250, grasas: 60 };

describe("Composite", () => {
  it("un ingrediente devuelve sus propios valores", () => {
    expect(new Ingrediente(1, "Arroz", n(130, 2.7, 28)).nutricion().calorias).toBe(130);
  });
  it("un platillo suma sus componentes multiplicados por la cantidad", () => {
    const p = new Platillo(10, "Bowl");
    p.agregar(new Ingrediente(1, "Pollo", n(165, 31)), 1.5);
    p.agregar(new Ingrediente(2, "Arroz", n(130, 2.7, 28)), 2);
    const total = p.nutricion();
    expect(total.calorias).toBeCloseTo(165 * 1.5 + 130 * 2);
    expect(total.proteinas).toBeCloseTo(31 * 1.5 + 2.7 * 2);
  });
  it("un platillo puede contener otro platillo", () => {
    const salsa = new Platillo(20, "Salsa");
    salsa.agregar(new Ingrediente(3, "Tomate", n(18)), 2);
    const plato = new Platillo(21, "Plato");
    plato.agregar(salsa, 1);
    plato.agregar(new Ingrediente(4, "Pasta", n(150)), 1);
    expect(plato.nutricion().calorias).toBe(18 * 2 + 150);
  });
  it("rechaza cantidades no positivas", () => {
    expect(() => new Platillo(1, "X").agregar(new Ingrediente(1, "Y", n(1)), 0)).toThrow();
  });
});

describe("Factory Method", () => {
  it("crea Ingrediente para tipo simple y Platillo para tipo platillo", () => {
    const i = obtenerCreator("simple").crear({ id: 1, nombre: "Manzana", tipo: "simple", nutricion: n(52) });
    const p = obtenerCreator("platillo").crear({
      id: 2, nombre: "Ensalada", tipo: "platillo", componentes: [{ comp: i, factor: 2 }],
    });
    expect(i).toBeInstanceOf(Ingrediente);
    expect(p).toBeInstanceOf(Platillo);
    expect(p.nutricion().calorias).toBe(104);
  });
  it("rechaza tipos desconocidos y datos incompletos", () => {
    expect(() => obtenerCreator("bebida")).toThrow(/no soportado/);
    expect(() => obtenerCreator("simple").crear({ id: 1, nombre: "X", tipo: "simple" })).toThrow();
  });
});

describe("Decorator", () => {
  const base = () => new Ingrediente(1, "Avena", n(389, 16.9, 66.3, 6.9, 10.6));
  it("agrega etiquetas apilando decoradores", () => {
    const d = new Vegano(new SinGluten(base()));
    expect(d.etiquetas()).toEqual(["sin gluten", "vegano"]);
    expect(d.nutricion().calorias).toBe(389);
  });
  it("Fortificado modifica la nutrición", () => {
    const d = new Fortificado(base(), 5, 10);
    expect(d.nutricion().fibra).toBeCloseTo(15.6);
    expect(d.nutricion().proteinas).toBeCloseTo(26.9);
  });
  it("aplicarEtiquetas convierte textos de la BD en decoradores (incluye personalizadas)", () => {
    const d = aplicarEtiquetas(base(), ["vegano", "alto en fibra"]);
    expect(d.etiquetas()).toEqual(["vegano", "alto en fibra"]);
    expect(d.getNombre()).toBe("Avena");
  });
});

describe("Strategy", () => {
  const consumo: ConsumoPorDia = { "2026-11-23": n(1800, 90, 200, 50), "2026-11-24": n(2200, 110, 280, 70) };
  it("CumplimientoCalorico devuelve el % de la meta por día", () => {
    expect(new CumplimientoCalorico().calcular(consumo, objetivo)).toEqual({ "2026-11-23": 90, "2026-11-24": 110 });
  });
  it("DistribucionMacros suma 100 %", () => {
    const m = new DistribucionMacros().calcular(consumo, objetivo);
    expect(m.proteinas + m.carbohidratos + m.grasas).toBeCloseTo(100, 0);
  });
  it("TendenciaSemanal calcula promedio y desviación", () => {
    const t = new TendenciaSemanal().calcular(consumo, objetivo);
    expect(t).toEqual({ promedio: 2000, meta: 2000, desviacion: 0, serie: [1800, 2200] });
  });
  it("el contexto permite cambiar de estrategia en ejecución", () => {
    const ctx = new CalculadorIndicadores<Record<string, number>>(new CumplimientoCalorico());
    expect(ctx.ejecutar(consumo, objetivo)["2026-11-23"]).toBe(90);
    ctx.setStrategy(new DistribucionMacros());
    expect(Object.keys(ctx.ejecutar(consumo, objetivo))).toEqual(["proteinas", "carbohidratos", "grasas"]);
  });
  it("sin consumo no truena", () => {
    expect(new TendenciaSemanal().calcular({}, objetivo).promedio).toBe(0);
  });
});

describe("Observer", () => {
  class Emisor extends Subject {
    emitir(e: Evento, d: DatosEvento) { return this.notificar(e, d); }
  }
  it("avisa a todos los observadores suscritos", async () => {
    const llamadas: string[] = [];
    const o: Observer = { actualizar: async e => { llamadas.push(e); } };
    const s = new Emisor();
    s.suscribir(o); s.suscribir(o);                 // no se duplica
    await s.emitir("excedido", { usuarioId: 1 });
    expect(llamadas).toEqual(["excedido"]);
  });
  it("deja de avisar a quien se desuscribe", async () => {
    const o: Observer = { actualizar: jest.fn().mockResolvedValue(undefined) };
    const s = new Emisor();
    s.suscribir(o); s.desuscribir(o);
    await s.emitir("excedido", { usuarioId: 1 });
    expect(o.actualizar).not.toHaveBeenCalled();
  });
  it("NotificadorBD guarda el mensaje y evita duplicados del mismo día", async () => {
    const guardados: string[] = [];
    const repo: NotificacionPort = {
      crear: async (_u, _t, m) => { guardados.push(m); },
      existeHoy: async (_u, _t, m) => guardados.includes(m),
    };
    const s = new Emisor();
    s.suscribir(new NotificadorBD(repo));
    await s.emitir("registro_pendiente", { usuarioId: 1, momento: "desayuno" });
    await s.emitir("registro_pendiente", { usuarioId: 1, momento: "desayuno" });
    await s.emitir("registro_pendiente", { usuarioId: 1, momento: "cena" });
    expect(guardados).toEqual(["Aún no registras: desayuno", "Aún no registras: cena"]);
  });
});
