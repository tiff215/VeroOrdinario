import { Subject } from "../domain/observers";
import { NotificacionRepo, NotificacionRow } from "../repositories/notificacion.repo";
import { RegistroRepo } from "../repositories/registro.repo";
import { HttpError } from "../utils/HttpError";
import { hoyISO } from "../utils/fechas";

/** A partir de qué hora se espera que ya haya registrado cada comida principal. */
const HORA_LIMITE: { momento: string; hora: number }[] = [
  { momento: "desayuno", hora: 11 },
  { momento: "comida", hora: 17 },
  { momento: "cena", hora: 22 },
];

/** Subject del patrón Observer para los avisos de registros pendientes. */
export class NotificacionService extends Subject {
  constructor(private readonly repo: NotificacionRepo, private readonly registros: RegistroRepo) {
    super();
  }

  /** Revisa qué comidas faltan hoy y avisa a los observadores. */
  async revisarPendientes(uid: number, ahora: Date = new Date()): Promise<void> {
    const hechos = new Set(await this.registros.momentosRegistrados(uid, hoyISO()));
    for (const { momento, hora } of HORA_LIMITE) {
      if (ahora.getHours() >= hora && !hechos.has(momento)) {
        await this.notificar("registro_pendiente", { usuarioId: uid, momento });
      }
    }
  }

  async listar(uid: number): Promise<NotificacionRow[]> {
    await this.revisarPendientes(uid);
    return this.repo.listar(uid);
  }

  async marcarLeida(uid: number, id: number): Promise<void> {
    if (!(await this.repo.marcarLeida(uid, id))) throw new HttpError(404, "Aviso no encontrado");
  }
}
