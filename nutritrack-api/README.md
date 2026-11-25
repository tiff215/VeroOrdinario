# NutriTrack API (Express + TypeScript + PostgreSQL)

## Arranque rápido
1. Crea la base `nutritrack` en PostgreSQL y ejecuta `sql/schema.sql` y después `sql/seed.sql`.
2. `copy .env.example .env` (Windows) o `cp .env.example .env` y pon tu contraseña de PostgreSQL.
3. `npm install`
4. `npx ts-node src/probar-bd.ts`  → debe imprimir "Conexión correcta".
5. `npm run crear-admin -- correo@ejemplo.com TuPassword "Tu Nombre"`
6. `npm run dev`  → http://localhost:3000/api/salud

## Scripts
| Comando | Qué hace |
|---|---|
| npm run dev | Servidor con reinicio automático |
| npm run build / npm start | Compila a dist/ y ejecuta lo compilado |
| npm run typecheck | Revisa tipos sin generar archivos |
| npm test | Pruebas Jest de los 5 patrones |
| npm run crear-admin -- correo pass "Nombre" | Crea o promueve un administrador |
