import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/HttpError";

export function noEncontrado(_req: Request, res: Response): void {
  res.status(404).json({ error: "Ruta no encontrada" });
}

/** Guardia final: convierte cualquier error en { error: "mensaje" } con el código correcto. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function manejarErrores(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const e = err as { code?: string; type?: string; message?: string };
  if (e?.type === "entity.parse.failed") { res.status(400).json({ error: "JSON inválido" }); return; }
  if (e?.code === "23505") { res.status(409).json({ error: "Ya existe un registro con esos datos" }); return; }
  if (e?.code === "23503") { res.status(409).json({ error: "El dato está relacionado con otros registros" }); return; }
  if (e?.code === "23514") { res.status(400).json({ error: "Un valor no cumple las reglas de la base de datos" }); return; }
  console.error("Error inesperado:", err);
  res.status(500).json({ error: "Error interno del servidor" });
}
