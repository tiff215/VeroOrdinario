import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Rol } from "../domain/types";
import { HttpError } from "../utils/HttpError";

export interface UsuarioToken { id: number; rol: Rol; nombre: string; }
export interface AuthRequest extends Request { usuario?: UsuarioToken; }

/** Guardia 1: verifica que la petición traiga un token válido. */
export function auth(req: Request, _res: Response, next: NextFunction): void {
  const cabecera = req.headers.authorization;
  if (!cabecera?.startsWith("Bearer ")) return next(new HttpError(401, "Falta el token de sesión"));
  try {
    const p = jwt.verify(cabecera.slice(7), env.JWT_SECRET) as jwt.JwtPayload;
    (req as AuthRequest).usuario = { id: Number(p.id), rol: p.rol as Rol, nombre: String(p.nombre) };
    next();
  } catch {
    next(new HttpError(401, "Sesión inválida o expirada"));
  }
}

/** Obtiene el usuario que dejó el guardia; las rutas lo usan en lugar de confiar en el cuerpo de la petición. */
export function usuarioDe(req: Request): UsuarioToken {
  const u = (req as AuthRequest).usuario;
  if (!u) throw new HttpError(401, "No autenticado");
  return u;
}
