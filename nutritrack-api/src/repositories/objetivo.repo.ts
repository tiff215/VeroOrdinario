import { conTransaccion, pool } from "../config/db";
import { Objetivo } from "../domain/types";

export class ObjetivoRepo {
  async vigente(uid: number): Promise<Objetivo | undefined> {
    const r = await pool.query<Objetivo>(
      `SELECT calorias, proteinas, carbohidratos, grasas FROM objetivos
        WHERE usuario_id = $1 AND vigente`,
      [uid]
    );
    return r.rows[0];
  }

  /** Marca el anterior como no vigente y crea el nuevo, todo en una transacción. */
  async reemplazar(uid: number, o: Objetivo): Promise<void> {
    await conTransaccion(async c => {
      await c.query("UPDATE objetivos SET vigente = FALSE WHERE usuario_id = $1 AND vigente", [uid]);
      await c.query(
        `INSERT INTO objetivos (usuario_id, calorias, proteinas, carbohidratos, grasas, vigente)
         VALUES ($1,$2,$3,$4,$5,TRUE)`,
        [uid, o.calorias, o.proteinas, o.carbohidratos, o.grasas]
      );
    });
  }
}
