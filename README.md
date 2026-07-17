# CRM Pulse

CRM para negocios pequeños: **no perder ventas por falta de seguimiento**. Reúne en un solo lugar cada cliente, su historial de interacciones, sus seguimientos y sus ventas.

## Stack
- **Next.js 15** (App Router, TypeScript) · **Tailwind CSS** (mobile-first)
- **Convex** — base de datos reactiva + backend de funciones (`query`/`mutation`)
- **Convex Auth** (proveedor Password) — se configura en M2
- **Despliegue: Railway** (front/app) + Convex en producción (`npx convex deploy`)

## Requisitos
- Node.js ≥ 20 (probado con Node 24) · npm

## Puesta en marcha
```bash
# 1. Dependencias
npm install

# 2. Convex (crea el proyecto, genera convex/_generated y escribe NEXT_PUBLIC_CONVEX_URL en .env.local)
npx convex dev        # dejar corriendo en una terminal

# 3. App Next.js (en otra terminal)
npm run dev           # http://localhost:3000
```
Copia `.env.local.example` a `.env.local` (si no lo genera Convex) y rellena `NEXT_PUBLIC_CONVEX_URL`.

> La app arranca aunque Convex no esté conectado todavía (el provider lo tolera); las queries de datos empiezan a funcionar tras `npx convex dev`.

## Estructura
```
convex/                 Backend + esquema de datos (fuente de verdad del modelo)
  schema.ts             5 entidades: clientes, interacciones, seguimientos, ventas, usuarios
  <entidad>.ts          query/mutation por entidad (stubs)
src/
  app/
    layout.tsx          Layout raíz (fuentes del DS + provider de Convex)
    page.tsx            Redirige a /hoy
    login/              P1 · Acceso
    (app)/              Zona autenticada (shell de navegación)
      hoy/              P2 · Agenda del día
      clientes/         P3 lista · nuevo (P5) · [id] ficha (P4)
      ventas/           P9 · Ventas y oportunidades
      equipo/           P11 · Usuarios (solo dueña)
      cuenta/           P10 · Mi cuenta
  components/           ui (design system) · layout · por feature
  lib/                  utils (cn) · format (dinero, fechas)
design/                 Paquete de diseño (fuente de verdad visual/UX) — NO copiar HTML/JS
```

## Fuentes de verdad
- **Diseño:** `design/PROY CRM Pulse/` — empezar por `CRM Pulse.dc.html` (App Shell) y `Guia App Shell.dc.html`.
- **Plan / tareas:** Linear, equipo *Talent Academy Curso*, proyecto **PROY CRM Pulse** (cada issue enlaza su pantalla de diseño).
- **PRD:** Notion — "CRM - PRD" (adenda 15-jul-2026) y "CRM Cambios y Mejoras".

## Reglas del modelo (recordatorio)
- `estado` y `valor` del cliente, `último contacto` y `total` de venta son **derivados** (no se persisten).
- Borrado = **archivar** (soft-delete): campo `archivado`; listas y derivados ignoran archivados.
- Autorización dentro de cada función de Convex (no hay RLS); `Equipo` solo para rol `duena`.
