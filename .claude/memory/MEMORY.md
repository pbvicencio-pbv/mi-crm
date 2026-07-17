# MEMORY.md — CRM Pulse

Memoria del proyecto (versionada, compartible). Leer al iniciar cada sesión junto con
`gotchas.md`. Actualizar al resolver bugs, completar features o descubrir contexto relevante, y
commitear junto al trabajo. Convertir fechas relativas a absolutas.

---

## Qué es

CRM Pulse: CRM para negocios pequeños de ventas (no perder ventas por falta de seguimiento).
Entidades: clientes, interacciones, seguimientos, ventas, usuarios. Multi-vendedor (propietario del
cliente + vendedor de la venta). Roles: `dueña`, `vendedor`. Producto en español.

## Decisiones de stack / arquitectura

- Backend/DB: **Convex** + **Convex Auth (Password)**. NO Supabase/Postgres → no hay RLS;
  autorización dentro de cada función.
- Front: Next.js 15 (App Router, TS) + Tailwind (mobile-first).
- Deploy: **Railway** desde `master` (auto-deploy en cada push) + `npx convex deploy` para las
  funciones. NO Vercel.
- Convex dev deployment: `elated-donkey-854` (team `ponciano-betancourt`, proyecto `crm-pulse`).
- Fuente de verdad de producto: el diseño en `design/PROY CRM Pulse/` (11 pantallas). MVP =
  pantallas completas al 100%.
- Derivados NO se persisten (estado/valor de cliente, último contacto, total de venta).
- Borrado = archivar (soft-delete, campo `archivado`).

## Estado del MVP (al 16-jul-2026)

- **Hecho y desplegado**: M0 (diseño, 11 pantallas) · M1 (fundación) · shell de navegación (TAL-8)
  · Agenda del día (TAL-16 / M4.3).
- **En curso**: M2 — Login/Auth real con Convex Auth (M2.1/TAL-9 cuentas semilla + M2.2/TAL-10
  login + protección de rutas). Plan aprobado por el flujo de auditoría antes de codificar.
- **Pendiente**: M3 (clientes) · M4 (seguimiento/interacciones) · M5 (ventas) · M6 (cierre).
- Higiene Linear pendiente: M1.1–M1.3 siguen en Todo aunque están hechas.

## Auth (contexto M2)

- `usuarios` tiene `authId` (enlace con la identidad de Convex Auth). Decisión de plan M2:
  enlazar por `authId` (Convex Auth `users._id`), resolver con `getAuthUserId`.
- Login real pendiente; mientras tanto `resolverUsuario` usa fallback dev `CRM_DEV_USER_EMAIL`
  (solo sin identidad). Semillas env-gated con `CRM_ALLOW_SEED=true`.

## Cómo se trabaja con este dueño

- Planes **en pantalla** (no archivo) + ciclo de auditoría **GO/NO-GO** antes de implementar código.
- Push a `master` = deploy: solo con aprobación explícita.
- Commits en español, Conventional Commits, **sin referencias a IA**.
- Decisiones agrupadas en revisiones de plan; dudas sueltas de una en una.
