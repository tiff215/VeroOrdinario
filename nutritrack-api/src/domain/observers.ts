/**
 * PATRÓN OBSERVER
 * Un Subject avisa a todos sus Observers cuando ocurre un evento, sin conocerlos en detalle.
 */
export type Evento = "objetivo_cumplido" | "excedido" | "registro_pendiente";

export interface DatosEvento { usuarioId: number; momento?: string; }

export interface Observer {
  actualizar(evento: Evento, datos: DatosEvento): Promise<void>;
}

export abstract class Subject {
  private readonly observers: Observer[] = [];

  suscribir(o: Observer): void {
    if (!this.observers.includes(o)) this.observers.push(o);
  }
  desuscribir(o: Observer): void {
    const i = this.observers.indexOf(o);
    if (i >= 0) this.observers.splice(i, 1);
  }
  protected async notificar(evento: Evento, datos: DatosEvento): Promise<void> {
    await Promise.all(this.observers.map(o => o.actualizar(evento, datos)));
  }
}

/** Lo que el observador necesita de la base de datos (se inyecta, así es fácil de probar). */
export interface NotificacionPort {
  crear(usuarioId: number, tipo: string, mensaje: string): Promise<void>;
  existeHoy(usuarioId: number, tipo: string, mensaje: string): Promise<boolean>;
}

/** Observador concreto: guarda el aviso en la tabla notificaciones (una vez por día y mensaje). */
export class NotificadorBD implements Observer {
  constructor(private readonly repo: NotificacionPort) {}

  async actualizar(evento: Evento, d: DatosEvento): Promise<void> {
    const mensajes: Record<Evento, string> = {
      objetivo_cumplido: "¡Alcanzaste tu objetivo de hoy!",
      excedido: "Superaste tu meta calórica de hoy.",
      registro_pendiente: `Aún no registras: ${d.momento ?? "una comida"}`,
    };
    const mensaje = mensajes[evento];
    if (await this.repo.existeHoy(d.usuarioId, evento, mensaje)) return;
    await this.repo.crear(d.usuarioId, evento, mensaje);
  }
}
