/**
 * Crea (o promueve) un usuario administrador.
 * Uso: npm run crear-admin -- correo@ejemplo.com MiPassword "Nombre Apellido"
 */
import bcrypt from "bcrypt";
import { pool } from "../config/db";

async function main(): Promise<void> {
  const [email, password, nombre = "Administrador"] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Uso: npm run crear-admin -- correo@ejemplo.com contraseña "Nombre"');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("La contraseña debe tener al menos 6 caracteres");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1,$2,$3,'admin')
     ON CONFLICT (email) DO UPDATE SET rol = 'admin', password_hash = EXCLUDED.password_hash`,
    [nombre, email.toLowerCase(), hash]
  );
  console.log(`Administrador listo: ${email}`);
  await pool.end();
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
