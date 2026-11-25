import { Router } from "express";
import { auth } from "../middlewares/auth";
import { requireRol } from "../middlewares/rol";
import { UsuarioRepo } from "../repositories/usuario.repo";
import { AlimentoService } from "../services/alimento.service";
import { HttpError } from "../utils/HttpError";
import { asyncHandler } from "../utils/asyncHandler";

const idDe = (valor: string): number => {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "Identificador inválido");
  return n;
};

export function adminRoutes(alimentos: AlimentoService, usuarios: UsuarioRepo): Router {
  const router = Router();
  router.use(auth, requireRol("admin"));            // todo lo de este archivo es solo para admin

  router.get("/alimentos", asyncHandler(async (req, res) => {
    res.json(await alimentos.buscar(req.query.q, 500));
  }));
  router.get("/alimentos/:id", asyncHandler(async (req, res) => {
    res.json(await alimentos.obtener(idDe(req.params.id)));
  }));
  router.post("/alimentos", asyncHandler(async (req, res) => {
    res.status(201).json(await alimentos.crear(req.body));
  }));
  router.put("/alimentos/:id", asyncHandler(async (req, res) => {
    res.json(await alimentos.actualizar(idDe(req.params.id), req.body));
  }));
  router.delete("/alimentos/:id", asyncHandler(async (req, res) => {
    await alimentos.eliminar(idDe(req.params.id));
    res.status(204).end();
  }));

  router.get("/usuarios", asyncHandler(async (_req, res) => {
    res.json(await usuarios.listar());
  }));

  return router;
}
