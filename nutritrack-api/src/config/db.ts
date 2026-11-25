import { Pool, PoolClient, types } from "pg";
import { env } from "./env";

// PostgreSQL entrega NUMERIC como texto y DATE como objeto Date.
// Aquí los convertimos una sola vez: NUMERIC -> number, DATE -> "YYYY-MM-DD".
types.setTypeParser(1700, (v: string) => parseFloat(v));
types.setTypeParser(1082, (v: string) => v);

/** Pool: grupo de conexiones abiertas que se prestan y se devuelven. Se crea UNA sola vez. */
export const pool = new Pool({ connectionString: env.DATABASE_URL, max: 10 });

/** Ejecuta varias consultas como una unidad: o se guardan todas o ninguna. */
export async function conTransaccion<T>(fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await pool.connect();      // pedir prestada una conexión
  try {
    await cliente.query("BEGIN");
    const resultado = await fn(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    cliente.release();                        // devolverla al pool
  }
}
