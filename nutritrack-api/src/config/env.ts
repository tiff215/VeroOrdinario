import "dotenv/config";

/** Lee y valida las variables del archivo .env. Si falta alguna, la app no arranca. */
function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable ${nombre} en el archivo .env`);
  return valor;
}

export const env = {
  DATABASE_URL: requerida("DATABASE_URL"),
  JWT_SECRET: requerida("JWT_SECRET"),
  PORT: Number(process.env.PORT ?? 3000),
};
