import { Router } from "express";
import { auth, usuarioDe } from "../middlewares/auth";
import { requireRol } from "../middlewares/rol";
import { AlimentoService } from "../services/alimento.service";
import { NotificacionService } from "../services/notificacion.service";
import { SeguimientoService } from "../services/seguimiento.service";
import { HttpError } from "../utils/HttpError";
import { asyncHandler } from "../utils/asyncHandler";

const idDe = (valor: string): number => {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "Identificador inválido");
  return n;
};

export function clienteRoutes(
  alimentos: AlimentoService, seguimiento: SeguimientoService, notificaciones: NotificacionService
): Router {
  const router = Router();
  const guardia = [auth, requireRol("cliente")];

  // Buscador (alimentos simples y platillos, con valores nutricionales)
  router.get("/alimentos", ...guardia, asyncHandler(async (req, res) => {
    res.json(await alimentos.buscar(req.query.q));
  }));
  router.get("/alimentos/:id", ...guardia, asyncHandler(async (req, res) => {
    res.json(await alimentos.obtener(idDe(req.params.id)));
  }));

  // Registros de comida
  router.post("/registros", ...guardia, asyncHandler(async (req, res) => {
    const { alimentoId, momento, porciones, fecha } = req.body ?? {};
    res.status(201).json(await seguimiento.registrarComida(usuarioDe(req).id, alimentoId, momento, porciones, fecha));
  }));
  router.get("/registros", ...guardia, asyncHandler(async (req, res) => {
    res.json(await seguimiento.registrosDelDia(usuarioDe(req).id, req.query.fecha));
  }));
  router.delete("/registros/:id", ...guardia, asyncHandler(async (req, res) => {
    await seguimiento.eliminarRegistro(usuarioDe(req).id, idDe(req.params.id));
    res.status(204).end();
  }));

  // Objetivos
  router.get("/objetivos", ...guardia, asyncHandler(async (req, res) => {
    res.json(await seguimiento.objetivoVigente(usuarioDe(req).id));
  }));
  router.put("/objetivos", ...guardia, asyncHandler(async (req, res) => {
    res.json(await seguimiento.actualizarObjetivo(usuarioDe(req).id, req.body));
  }));

  // Hábitos vs. objetivos (Strategy)
  router.get("/seguimiento", ...guardia, asyncHandler(async (req, res) => {
    const dias = Number(req.query.dias ?? 7);
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) throw new HttpError(400, "dias debe estar entre 1 y 365");
    res.json(await seguimiento.seguimiento(usuarioDe(req).id, dias));
  }));

  // Avisos (Observer)
  router.get("/notificaciones", ...guardia, asyncHandler(async (req, res) => {
    res.json(await notificaciones.listar(usuarioDe(req).id));
  }));
  router.patch("/notificaciones/:id/leida", ...guardia, asyncHandler(async (req, res) => {
    await notificaciones.marcarLeida(usuarioDe(req).id, idDe(req.params.id));
    res.json({ ok: true });
  }));

  return router;
}
