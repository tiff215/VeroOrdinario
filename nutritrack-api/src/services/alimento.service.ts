import { Componente } from "../domain/componente";
import { aplicarEtiquetas } from "../domain/decorators";
import { DatosAlimento, TipoAlimento, obtenerCreator } from "../domain/factory";
import { Nutricion } from "../domain/types";
import { AlimentoRepo, AlimentoRow, DatosGuardar } from "../repositories/alimento.repo";
import { HttpError } from "../utils/HttpError";

export interface AlimentoDTO extends Nutricion {
  id: number;
  nombre: string;
  tipo: TipoAlimento;
  porcion_g: number;
  etiquetas: string[];
  componentes?: { id: number; nombre: string; cantidad: number }[];
}

const r1 = (n: number): number => Math.round(n * 10) / 10;
const CAMPOS_NUTRICION = ["calorias", "proteinas", "carbohidratos", "grasas", "fibra"] as const;

/**
 * Aquí se JUNTAN tres patrones al leer un alimento de la BD:
 *   Factory Method (crea Ingrediente o Platillo) -> Composite (el platillo suma sus hijos)
 *   -> Decorator (cada etiqueta envuelve al objeto).
 */
export class AlimentoService {
  constructor(private readonly repo: AlimentoRepo) {}

  /** Construye el objeto del dominio de un alimento (recursivo para platillos). */
  async construir(id: number, visitados: Set<number> = new Set()): Promise<Componente> {
    if (visitados.has(id)) throw new HttpError(400, "Un platillo no puede contenerse a sí mismo");
    const fila = await this.repo.porId(id);
    if (!fila) throw new HttpError(404, `El alimento ${id} no existe`);
    const etiquetas = await this.repo.etiquetasDe(id);

    const datos: DatosAlimento = { id: fila.id, nombre: fila.nombre, tipo: fila.tipo };
    if (fila.tipo === "platillo") {
      const siguiente = new Set(visitados).add(id);
      const hijos = await this.repo.componentesDe(id);
      datos.componentes = [];
      for (const h of hijos) {
        datos.componentes.push({ comp: await this.construir(h.componente_id, siguiente), factor: h.cantidad });
      }
    } else {
      datos.nutricion = {
        calorias: fila.calorias, proteinas: fila.proteinas, carbohidratos: fila.carbohidratos,
        grasas: fila.grasas, fibra: fila.fibra,
      };
    }
    const base = obtenerCreator(fila.tipo).crear(datos);   // FACTORY METHOD
    return aplicarEtiquetas(base, etiquetas);               // DECORATOR
  }

  async nutricionDe(id: number): Promise<Nutricion> {
    return (await this.construir(id)).nutricion();          // COMPOSITE (polimorfismo)
  }

  private async aDTO(fila: AlimentoRow, conComponentes: boolean): Promise<AlimentoDTO> {
    const comp = await this.construir(fila.id);
    const n = comp.nutricion();
    const dto: AlimentoDTO = {
      id: fila.id, nombre: fila.nombre, tipo: fila.tipo, porcion_g: fila.porcion_g,
      calorias: r1(n.calorias), proteinas: r1(n.proteinas), carbohidratos: r1(n.carbohidratos),
      grasas: r1(n.grasas), fibra: r1(n.fibra),
      etiquetas: comp.etiquetas(),
    };
    if (fila.tipo === "platillo" && conComponentes) {
      const hijos = await this.repo.componentesDe(fila.id);
      dto.componentes = hijos.map(h => ({ id: h.componente_id, nombre: h.nombre, cantidad: h.cantidad }));
    }
    return dto;
  }

  async buscar(q: unknown, limite = 50): Promise<AlimentoDTO[]> {
    const filas = await this.repo.buscar(String(q ?? "").trim(), limite);
    return Promise.all(filas.map(f => this.aDTO(f, true)));
  }

  async obtener(id: number): Promise<AlimentoDTO> {
    const fila = await this.repo.porId(id);
    if (!fila || !fila.activo) throw new HttpError(404, "Alimento no encontrado");
    return this.aDTO(fila, true);
  }

  // ---------- administración ----------
  async crear(body: unknown): Promise<AlimentoDTO> {
    const datos = await this.validar(body);
    const id = await this.repo.crear(datos);
    return this.obtener(id);
  }

  async actualizar(id: number, body: unknown): Promise<AlimentoDTO> {
    const actual = await this.repo.porId(id);
    if (!actual || !actual.activo) throw new HttpError(404, "Alimento no encontrado");
    const datos = await this.validar(body, id);
    await this.repo.actualizar(id, datos);
    return this.obtener(id);
  }

  async eliminar(id: number): Promise<void> {
    const usados = await this.repo.platillosQueUsan(id);
    if (usados.length) {
      throw new HttpError(409, `No se puede eliminar: lo usan los platillos ${usados.join(", ")}`);
    }
    if (!(await this.repo.desactivar(id))) throw new HttpError(404, "Alimento no encontrado");
  }

  /** Valida y limpia lo que manda el formulario del administrador. */
  private async validar(body: unknown, idActual?: number): Promise<DatosGuardar> {
    const b = (body ?? {}) as Record<string, unknown>;
    const nombre = String(b.nombre ?? "").trim();
    if (!nombre || nombre.length > 120) throw new HttpError(400, "El nombre es obligatorio (máximo 120 caracteres)");
    if (b.tipo !== "simple" && b.tipo !== "platillo") throw new HttpError(400, "El tipo debe ser 'simple' o 'platillo'");
    const tipo: TipoAlimento = b.tipo;

    const porcion = Number(b.porcion_g ?? 100);
    if (!Number.isFinite(porcion) || porcion <= 0) throw new HttpError(400, "La porción debe ser mayor a 0");

    const nutr = { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0, fibra: 0 };
    if (tipo === "simple") {
      for (const k of CAMPOS_NUTRICION) {
        const v = Number(b[k] ?? 0);
        if (!Number.isFinite(v) || v < 0) throw new HttpError(400, `El valor de ${k} no puede ser negativo`);
        nutr[k] = v;
      }
    }

    const etiquetas = [...new Set(
      (Array.isArray(b.etiquetas) ? b.etiquetas : [])
        .map(e => String(e).trim().toLowerCase())
        .filter(e => e.length > 0 && e.length <= 50)
    )];

    // Platillo: unir ingredientes repetidos y validar que existan
    const mapa = new Map<number, number>();
    if (tipo === "platillo") {
      const lista = Array.isArray(b.componentes) ? b.componentes : [];
      for (const c of lista as Record<string, unknown>[]) {
        const cid = Number(c.id), cant = Number(c.cantidad);
        if (!Number.isInteger(cid) || !Number.isFinite(cant) || cant <= 0) {
          throw new HttpError(400, "Cada ingrediente necesita un id y una cantidad mayor a 0");
        }
        mapa.set(cid, (mapa.get(cid) ?? 0) + cant);
      }
      if (mapa.size === 0) throw new HttpError(400, "Un platillo necesita al menos un ingrediente");
      for (const cid of mapa.keys()) {
        const fila = await this.repo.porId(cid);
        if (!fila || !fila.activo) throw new HttpError(400, `El ingrediente ${cid} no existe o está desactivado`);
      }
      if (idActual !== undefined && (await this.formaCiclo(idActual, [...mapa.keys()]))) {
        throw new HttpError(400, "Ese cambio crearía un platillo que se contiene a sí mismo");
      }
    }

    return {
      nombre, tipo, porcion_g: porcion, ...nutr, etiquetas,
      componentes: [...mapa].map(([id, cantidad]) => ({ id, cantidad })),
    };
  }

  /** ¿Algún componente nuevo contiene (directa o indirectamente) al platillo que se edita? */
  private async formaCiclo(platilloId: number, componentes: number[]): Promise<boolean> {
    const pendientes = [...componentes];
    const vistos = new Set<number>();
    while (pendientes.length) {
      const id = pendientes.pop()!;
      if (id === platilloId) return true;
      if (vistos.has(id)) continue;
      vistos.add(id);
      (await this.repo.componentesDe(id)).forEach(h => pendientes.push(h.componente_id));
    }
    return false;
  }
}
