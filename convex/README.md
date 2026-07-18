# convex/ — Backend y base de datos (Convex)

Toda la persistencia y la lógica de servidor del CRM viven aquí como funciones `query` / `mutation` / `action`. La UI de Next.js consume estas funciones con `useQuery` / `useMutation` (reactivas).

## Archivos
- `schema.ts` — esquema de las 5 entidades (clientes, interacciones, seguimientos, ventas, usuarios). **Fuente de verdad del modelo de datos** (TAL-7).
- `clientes.ts` · `ventas.ts` · `interacciones.ts` · `seguimientos.ts` · `usuarios.ts` — funciones por entidad (queries/mutations).
- `_generated/` — tipos y APIs que **genera** `npx convex dev` (se versiona en el repo).
- `auth.*` — se añaden en M2.1 (TAL-9) al configurar Convex Auth (proveedor Password).

## Convenciones
- Relaciones con `v.id("<tabla>")`.
- `_creationTime` = fecha de alta (no crear `created_at` manual).
- **Derivados (no se persisten):** estado y valor del cliente, último contacto, total de venta.
- **Borrado = archivar** (`archivado: boolean`); listas y derivados ignoran archivados.
- **Autorización dentro de cada función** (no hay RLS): comprobar el rol del usuario actual.

## Arranque
```bash
npx convex dev     # crea el proyecto/deployment, genera _generated y observa cambios
```
Genera `NEXT_PUBLIC_CONVEX_URL` en `.env.local`. Correr en paralelo a `npm run dev`.
