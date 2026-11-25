import { PoolClient } from "pg";
import { conTransaccion, pool } from "../config/db";

export interface AlimentoRow {
  id: number; nombre: string; tipo: "simple" | "platillo"; porcion_g: number;
  calorias: number; proteinas: number; carbohidratos: number; grasas: number; fibra: number; activo: boolean;
}
export interface ComponenteRow { componente_id: number; nombre: string; cantidad: number; }

export interface DatosGuardar {
  nombre: string; tipo: "simple" | "platillo"; porcion_g: number;
  calorias: number; proteinas: number; carbohidratos: number; grasas: number; fibra: number;
  etiquetas: string[]; componentes: { id: number; cantidad: number }[];
}

const escaparLike = (q: string): string => q.replace(/[\\%_]/g, c => `\\${c}`);

export class AlimentoRepo {
  async buscar(q: string, limite: number): Promise<AlimentoRow[]> {
    const r = await pool.query<AlimentoRow>(
      `SELECT * FROM alimentos WHERE activo AND nombre ILIKE $1 ORDER BY nombre LIMIT $2`,
      [`%${escaparLike(q)}%`, limite]
    );
    return r.rows;
  }

  async porId(id: number): Promise<AlimentoRow | undefined> {
    const r = await pool.query<AlimentoRow>("SELECT * FROM alimentos WHERE id = $1", [id]);
    return r.rows[0];
  }

  async componentesDe(platilloId: number): Promise<ComponenteRow[]> {
    const r = await pool.query<ComponenteRow>(
      `SELECT pc.componente_id, a.nombre, pc.cantidad
         FROM platillo_componentes pc JOIN alimentos a ON a.id = pc.componente_id
        WHERE pc.platillo_id = $1 ORDER BY a.nombre`,
      [platilloId]
    );
    return r.rows;
  }

  async etiquetasDe(alimentoId: number): Promise<string[]> {
    const r = await pool.query<{ nombre: string }>(
      `SELECT e.nombre FROM alimento_etiquetas ae JOIN etiquetas e ON e.id = ae.etiqueta_id
        WHERE ae.alimento_id = $1 ORDER BY e.nombre`,
      [alimentoId]
    );
    return r.rows.map(x => x.nombre);
  }

  async crear(d: DatosGuardar): Promise<number> {
    return conTransaccion(async c => {
      const r = await c.query<{ id: number }>(
        `INSERT INTO alimentos (nombre, tipo, porcion_g, calorias, proteinas, carbohidratos, grasas, fibra)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [d.nombre, d.tipo, d.porcion_g, d.calorias, d.proteinas, d.carbohidratos, d.grasas, d.fibra]
      );
      const id = r.rows[0].id;
      await this.guardarRelaciones(c, id, d);
      return id;
    });
  }

  async actualizar(id: number, d: DatosGuardar): Promise<void> {
    await conTransaccion(async c => {
      await c.query(
        `UPDATE alimentos SET nombre=$2, tipo=$3, porcion_g=$4, calorias=$5, proteinas=$6,
                carbohidratos=$7, grasas=$8, fibra=$9 WHERE id=$1`,
        [id, d.nombre, d.tipo, d.porcion_g, d.calorias, d.proteinas, d.carbohidratos, d.grasas, d.fibra]
      );
      await c.query("DELETE FROM alimento_etiquetas WHERE alimento_id = $1", [id]);
      await c.query("DELETE FROM platillo_componentes WHERE platillo_id = $1", [id]);
      await this.guardarRelaciones(c, id, d);
    });
  }

  /** Borrado lógico: no se pierde el historial de quien ya lo registró. */
  async desactivar(id: number): Promise<boolean> {
    const r = await pool.query("UPDATE alimentos SET activo = FALSE WHERE id = $1 AND activo", [id]);
    return (r.rowCount ?? 0) > 0;
  }

  /** Platillos activos que usan este alimento como componente. */
  async platillosQueUsan(id: number): Promise<string[]> {
    const r = await pool.query<{ nombre: string }>(
      `SELECT a.nombre FROM platillo_componentes pc JOIN alimentos a ON a.id = pc.platillo_id
        WHERE pc.componente_id = $1 AND a.activo`,
      [id]
    );
    return r.rows.map(x => x.nombre);
  }

  private async guardarRelaciones(c: PoolClient, id: number, d: DatosGuardar): Promise<void> {
    for (const etiqueta of d.etiquetas) {
      const e = await c.query<{ id: number }>(
        `INSERT INTO etiquetas (nombre) VALUES ($1)
         ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id`,
        [etiqueta]
      );
      await c.query(
        "INSERT INTO alimento_etiquetas (alimento_id, etiqueta_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [id, e.rows[0].id]
      );
    }
    if (d.tipo === "platillo") {
      for (const comp of d.componentes) {
        await c.query(
          "INSERT INTO platillo_componentes (platillo_id, componente_id, cantidad) VALUES ($1,$2,$3)",
          [id, comp.id, comp.cantidad]
        );
      }
    }
  }
}
