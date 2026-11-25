import {
  CalculadorIndicadores, CumplimientoCalorico, DistribucionMacros, TendenciaSemanal,
} from "../domain/strategies";
import { Subject } from "../domain/observers";
import {
  ConsumoPorDia, MOMENTOS, Momento, NUTRICION_VACIA, Nutricion, Objetivo, escalar, sumar,
} from "../domain/types";
import { ObjetivoRepo } from "../repositories/objetivo.repo";
import { RegistroRepo } from "../repositories/registro.repo";
import { HttpError } from "../utils/HttpError";
import { fechaValida, hoyISO, restarDias } from "../utils/fechas";
import { AlimentoService } from "./alimento.service";

const UMBRAL_EXCEDIDO = 1.10;   // más del 110 % de la meta
const UMBRAL_CUMPLIDO = 0.95;   // desde el 95 % de la meta
const r1 = (n: number): number => Math.round(n * 10) / 10;

export interface RegistroDTO extends Nutricion {
  id: number; alimentoId: number; alimento: string; momento: Momento; porciones: number; fecha: string;
}

/** Subject del Observer (avisa al registrar) y contexto del Strategy (indicadores). */
export class SeguimientoService extends Subject {
  constructor(
    private readonly registros: RegistroRepo,
    private readonly objetivos: ObjetivoRepo,
    private readonly alimentos: AlimentoService
  ) {
    super();
  }

  /** Nutrición de varios alimentos, calculando cada uno una sola vez. */
  private async nutriciones(ids: number[]): Promise<Map<number, Nutricion>> {
    const mapa = new Map<number, Nutricion>();
    for (const id of new Set(ids)) mapa.set(id, await this.alimentos.nutricionDe(id));
    return mapa;
  }

  async registrarComida(uid: number, alimentoId: unknown, momento: unknown, porciones: unknown, fecha: unknown) {
    const aid = Number(alimentoId);
    const p = Number(porciones);
    const f = fecha ? String(fecha) : hoyISO();
    if (!Number.isInteger(aid)) throw new HttpError(400, "alimentoId inválido");
    if (!MOMENTOS.includes(momento as Momento)) throw new HttpError(400, "Momento de comida inválido");
    if (!Number.isFinite(p) || p <= 0 || p > 50) throw new HttpError(400, "Las porciones deben ser mayores a 0 (máximo 50)");
    if (!fechaValida(f)) throw new HttpError(400, "Fecha inválida (usa AAAA-MM-DD)");
    await this.alimentos.obtener(aid);                      // 404 si no existe o está desactivado

    const id = await this.registros.crear(uid, aid, momento as Momento, p, f);
    if (f === hoyISO()) await this.evaluarObjetivo(uid, f);  // OBSERVER
    return { id };
  }

  /** Compara el total del día con el objetivo y dispara el evento correspondiente. */
  private async evaluarObjetivo(uid: number, fecha: string): Promise<void> {
    const obj = await this.objetivos.vigente(uid);
    if (!obj) return;
    const total = (await this.consumoPorDia(uid, fecha, fecha))[fecha] ?? NUTRICION_VACIA();
    if (total.calorias > obj.calorias * UMBRAL_EXCEDIDO) {
      await this.notificar("excedido", { usuarioId: uid });
    } else if (total.calorias >= obj.calorias * UMBRAL_CUMPLIDO) {
      await this.notificar("objetivo_cumplido", { usuarioId: uid });
    }
  }

  async registrosDelDia(uid: number, fecha: unknown): Promise<RegistroDTO[]> {
    const f = fecha ? String(fecha) : hoyISO();
    if (!fechaValida(f)) throw new HttpError(400, "Fecha inválida (usa AAAA-MM-DD)");
    const filas = await this.registros.listarPorFecha(uid, f);
    const nut = await this.nutriciones(filas.map(r => r.alimento_id));
    return filas.map(r => {
      const n = escalar(nut.get(r.alimento_id)!, r.porciones);
      return {
        id: r.id, alimentoId: r.alimento_id, alimento: r.nombre, momento: r.momento,
        porciones: r.porciones, fecha: r.fecha,
        calorias: r1(n.calorias), proteinas: r1(n.proteinas), carbohidratos: r1(n.carbohidratos),
        grasas: r1(n.grasas), fibra: r1(n.fibra),
      };
    });
  }

  async eliminarRegistro(uid: number, id: number): Promise<void> {
    if (!(await this.registros.eliminar(uid, id))) throw new HttpError(404, "Registro no encontrado");
  }

  /** Total consumido por día (solo días con registros) entre dos fechas. */
  async consumoPorDia(uid: number, desde: string, hasta: string): Promise<ConsumoPorDia> {
    const filas = await this.registros.listarPorRango(uid, desde, hasta);
    const nut = await this.nutriciones(filas.map(r => r.alimento_id));
    const consumo: ConsumoPorDia = {};
    for (const r of filas) {
      const aporte = escalar(nut.get(r.alimento_id)!, r.porciones);
      consumo[r.fecha] = sumar(consumo[r.fecha] ?? NUTRICION_VACIA(), aporte);
    }
    return consumo;
  }

  // ---------- objetivos ----------
  async objetivoVigente(uid: number): Promise<Objetivo> {
    const o = await this.objetivos.vigente(uid);
    if (!o) throw new HttpError(404, "Aún no has configurado tus objetivos");
    return o;
  }

  async actualizarObjetivo(uid: number, body: unknown): Promise<Objetivo> {
    const b = (body ?? {}) as Record<string, unknown>;
    const o: Objetivo = {
      calorias: Number(b.calorias), proteinas: Number(b.proteinas),
      carbohidratos: Number(b.carbohidratos), grasas: Number(b.grasas),
    };
    for (const [k, v] of Object.entries(o)) {
      if (!Number.isFinite(v) || v <= 0) throw new HttpError(400, `El objetivo de ${k} debe ser mayor a 0`);
    }
    if (o.calorias > 20000) throw new HttpError(400, "El objetivo de calorías no es realista");
    await this.objetivos.reemplazar(uid, o);
    return o;
  }

  // ---------- módulo de innovación: hábitos vs. objetivos ----------
  async seguimiento(uid: number, dias: number) {
    const obj = await this.objetivos.vigente(uid);
    const consumo = await this.consumoPorDia(uid, restarDias(dias - 1), hoyISO());
    if (!obj || Object.keys(consumo).length === 0) {
      return { cumplimiento: {}, tendencia: {}, macros: {} };
    }
    // STRATEGY: el mismo contexto ejecuta tres algoritmos intercambiables
    const cumplimiento = new CalculadorIndicadores(new CumplimientoCalorico()).ejecutar(consumo, obj);
    const macros = new CalculadorIndicadores(new DistribucionMacros()).ejecutar(consumo, obj);
    const tendencia = new CalculadorIndicadores(new TendenciaSemanal()).ejecutar(consumo, obj);
    return { cumplimiento, tendencia, macros };
  }
}
