import { crearApp } from "./app";
import { env } from "./config/env";
import { pool } from "./config/db";

const app = crearApp();

const servidor = app.listen(env.PORT, () => {
  console.log(`NutriTrack API escuchando en http://localhost:${env.PORT}/api`);
});

// Apagado ordenado: cierra el servidor y devuelve las conexiones del pool
function apagar(): void {
  servidor.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on("SIGINT", apagar);
process.on("SIGTERM", apagar);
