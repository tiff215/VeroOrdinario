import { pool } from "../config/db";
import { NotificacionPort } from "../domain/observers";

export interface NotificacionRow {
  id: number; tipo: string; mensaje: string; leida: boolean; creada_en: Date;
}

export class NotificacionRepo implements NotificacionPort {
  async crear(uid: number, tipo: string, mensaje: string): Promise<void> {
    await pool.query(
      "INSERT INTO notificaciones (usuario_id, tipo, mensaje) VALUES ($1,$2,$3)",
      [uid, tipo, mensaje]
    );
  }

  async existeHoy(uid: number, tipo: string, mensaje: string): Promise<boolean> {
    const r = await pool.query(
      `SELECT 1 FROM notificaciones
        WHERE usuario_id = $1 AND tipo = $2 AND mensaje = $3 AND creada_en::date = CURRENT_DATE LIMIT 1`,
      [uid, tipo, mensaje]
    );
    return (r.rowCount ?? 0) > 0;
  }

  async listar(uid: number): Promise<NotificacionRow[]> {
    const r = await pool.query<NotificacionRow>(
      `SELECT id, tipo, mensaje, leida, creada_en FROM notificaciones
        WHERE usuario_id = $1 ORDER BY creada_en DESC, id DESC LIMIT 50`,
      [uid]
    );
    return r.rows;
  }

  async marcarLeida(uid: number, id: number): Promise<boolean> {
    const r = await pool.query(
      "UPDATE notificaciones SET leida = TRUE WHERE id = $1 AND usuario_id = $2",
      [id, uid]
    );
    return (r.rowCount ?? 0) > 0;
  }
}
