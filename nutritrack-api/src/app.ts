import cors from "cors";
import express from "express";
import { NotificadorBD } from "./domain/observers";
import { manejarErrores, noEncontrado } from "./middlewares/error";
import { AlimentoRepo } from "./repositories/alimento.repo";
import { NotificacionRepo } from "./repositories/notificacion.repo";
import { ObjetivoRepo } from "./repositories/objetivo.repo";
import { RegistroRepo } from "./repositories/registro.repo";
import { UsuarioRepo } from "./repositories/usuario.repo";
import { adminRoutes } from "./routes/admin.routes";
import { authRoutes } from "./routes/auth.routes";
import { clienteRoutes } from "./routes/cliente.routes";
import { AlimentoService } from "./services/alimento.service";
import { AuthService } from "./services/auth.service";
import { NotificacionService } from "./services/notificacion.service";
import { SeguimientoService } from "./services/seguimiento.service";

export function crearApp(): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // 1) Repositorios (hablan con la BD)
  const usuarioRepo = new UsuarioRepo();
  const alimentoRepo = new AlimentoRepo();
  const registroRepo = new RegistroRepo();
  const objetivoRepo = new ObjetivoRepo();
  const notificacionRepo = new NotificacionRepo();

  // 2) Servicios (reciben lo que necesitan: inyección de dependencias)
  const authService = new AuthService(usuarioRepo);
  const alimentoService = new AlimentoService(alimentoRepo);
  const seguimientoService = new SeguimientoService(registroRepo, objetivoRepo, alimentoService);
  const notificacionService = new NotificacionService(notificacionRepo, registroRepo);

  // 3) OBSERVER: los dos "sujetos" avisan al mismo observador, que guarda el aviso en la BD
  const notificador = new NotificadorBD(notificacionRepo);
  seguimientoService.suscribir(notificador);
  notificacionService.suscribir(notificador);

  // 4) Rutas
  app.get("/api/salud", (_req, res) => { res.json({ ok: true }); });
  app.use("/api/auth", authRoutes(authService));
  app.use("/api/admin", adminRoutes(alimentoService, usuarioRepo));
  app.use("/api", clienteRoutes(alimentoService, seguimientoService, notificacionService));

  // 5) Manejo de errores (siempre al final)
  app.use(noEncontrado);
  app.use(manejarErrores);
  return app;
}
