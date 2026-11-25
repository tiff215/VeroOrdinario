import { pool } from "../config/db";
import { Rol } from "../domain/types";

export interface UsuarioRow {
  id: number; nombre: string; email: string; password_hash: string; rol: Rol; creado_en: Date;
}
export type UsuarioPublico = Omit<UsuarioRow, "password_hash">;

export class UsuarioRepo {
  async crear(nombre: string, email: string, passwordHash: string, rol: Rol = "cliente"): Promise<UsuarioPublico> {
    const r = await pool.query<UsuarioPublico>(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol, creado_en`,
      [nombre, email, passwordHash, rol]
    );
    return r.rows[0];
  }

  async porEmail(email: string): Promise<UsuarioRow | undefined> {
    const r = await pool.query<UsuarioRow>("SELECT * FROM usuarios WHERE email = $1", [email]);
    return r.rows[0];
  }

  async listar(): Promise<UsuarioPublico[]> {
    const r = await pool.query<UsuarioPublico>(
      "SELECT id, nombre, email, rol, creado_en FROM usuarios ORDER BY id"
    );
    return r.rows;
  }
}
