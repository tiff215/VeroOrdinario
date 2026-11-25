/** Error con código HTTP. Los servicios lo lanzan; el middleware de errores lo convierte en respuesta. */
export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}
