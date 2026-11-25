import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Rol } from "../domain/types";
import { UsuarioRepo } from "../repositories/usuario.repo";
import { HttpError } from "../utils/HttpError";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SesionDTO {
  token: string;
  usuario: { id: number; nombre: string; rol: Rol };
}

export class AuthService {
  constructor(private readonly usuarios: UsuarioRepo) {}

  /** Toda cuenta que se registra desde la app es de rol "cliente". */
  async registrar(nombre: unknown, email: unknown, password: unknown) {
    const n = String(nombre ?? "").trim();
    const e = String(email ?? "").trim().toLowerCase();
    const p = String(password ?? "");
    if (n.length < 2 || n.length > 100) throw new HttpError(400, "El nombre debe tener entre 2 y 100 caracteres");
    if (!EMAIL_RE.test(e) || e.length > 120) throw new HttpError(400, "Correo electrónico inválido");
    if (p.length < 6) throw new HttpError(400, "La contraseña debe tener al menos 6 caracteres");

    if (await this.usuarios.porEmail(e)) throw new HttpError(409, "Ese correo ya está registrado");
    const hash = await bcrypt.hash(p, 10);
    const u = await this.usuarios.crear(n, e, hash, "cliente");
    return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
  }

  async login(email: unknown, password: unknown): Promise<SesionDTO> {
    const e = String(email ?? "").trim().toLowerCase();
    const p = String(password ?? "");
    const u = await this.usuarios.porEmail(e);
    // Mismo mensaje si el correo no existe o la contraseña falla (no revela cuál fue)
    if (!u || !(await bcrypt.compare(p, u.password_hash))) {
      throw new HttpError(401, "Correo o contraseña incorrectos");
    }
    const token = jwt.sign({ id: u.id, rol: u.rol, nombre: u.nombre }, env.JWT_SECRET, {
      expiresIn: 60 * 60 * 8, // 8 horas
    });
    return { token, usuario: { id: u.id, nombre: u.nombre, rol: u.rol } };
  }
}
