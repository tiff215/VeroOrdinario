import { NextFunction, Request, RequestHandler, Response } from "express";

/** Envuelve una ruta async para que cualquier error llegue al middleware de errores. */
export const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
