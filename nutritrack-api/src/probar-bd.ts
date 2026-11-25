// Prueba de humo: comprueba que la API puede hablar con PostgreSQL
import { pool } from "./config/db";

async function main(): Promise<void> {
  const r = await pool.query("SELECT NOW() AS ahora");
  console.log("Conexión correcta. Hora de la BD:", r.rows[0].ahora);
  await pool.end();
}
main().catch(e => { console.error("Falló la conexión:", e.message); process.exit(1); });
