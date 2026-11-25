import { Router } from "express";
import { AuthService } from "../services/auth.service";
import { asyncHandler } from "../utils/asyncHandler";

export function authRoutes(auth: AuthService): Router {
  const router = Router();

  router.post("/registro", asyncHandler(async (req, res) => {
    const { nombre, email, password } = req.body ?? {};
    res.status(201).json(await auth.registrar(nombre, email, password));
  }));

  router.post("/login", asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    res.json(await auth.login(email, password));
  }));

  return router;
}
