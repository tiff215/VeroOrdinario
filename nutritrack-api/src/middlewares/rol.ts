import { NextFunction, Request, Response } from "express";
import { Rol } from "../domain/types";
import { HttpError } from "../utils/HttpError";
import { usuarioDe } from "./auth";

/** Guardia 2: solo deja pasar al rol indicado. Va DESPUÉS de auth. */
export const requireRol = (rol: Rol) => (req: Request, _res: Response, next: NextFunction): void => {
  if (usuarioDe(req).rol !== rol) return next(new HttpError(403, "No tienes permiso para esta acción"));
  next();
};
