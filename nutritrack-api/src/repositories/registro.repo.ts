import { pool } from "../config/db";
import { Momento } from "../domain/types";

export interface RegistroDia {
  id: number; alimento_id: number; nombre: string; momento: Momento; porciones: number; fecha: string;
}
export interface RegistroRango { alimento_id: number; porciones: number; fecha: string; }

export class RegistroRepo {
  async crear(uid: number, alimentoId: number, momento: Momento, porciones: number, fecha: string): Promise<number> {
    const r = await pool.query<{ id: number }>(
      `INSERT INTO registros_comida (usuario_id, alimento_id, momento, porciones, fecha)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [uid, alimentoId, momento, porciones, fecha]
    );
    return r.rows[0].id;
  }

  async listarPorFecha(uid: number, fecha: string): Promise<RegistroDia[]> {
    const r = await pool.query<RegistroDia>(
      `SELECT r.id, r.alimento_id, a.nombre, r.momento, r.porciones, r.fecha
         FROM registros_comida r JOIN alimentos a ON a.id = r.alimento_id
        WHERE r.usuario_id = $1 AND r.fecha = $2 ORDER BY r.id`,
      [uid, fecha]
    );
    return r.rows;
  }

  async listarPorRango(uid: number, desde: string, hasta: string): Promise<RegistroRango[]> {
    const r = await pool.query<RegistroRango>(
      `SELECT alimento_id, porciones, fecha FROM registros_comida
        WHERE usuario_id = $1 AND fecha BETWEEN $2 AND $3`,
      [uid, desde, hasta]
    );
    return r.rows;
  }

  async momentosRegistrados(uid: number, fecha: string): Promise<string[]> {
    const r = await pool.query<{ momento: string }>(
      "SELECT DISTINCT momento FROM registros_comida WHERE usuario_id = $1 AND fecha = $2",
      [uid, fecha]
    );
    return r.rows.map(x => x.momento);
  }

  /** Solo borra si el registro pertenece al usuario. */
  async eliminar(uid: number, id: number): Promise<boolean> {
    const r = await pool.query("DELETE FROM registros_comida WHERE id = $1 AND usuario_id = $2", [id, uid]);
    return (r.rowCount ?? 0) > 0;
  }
}
