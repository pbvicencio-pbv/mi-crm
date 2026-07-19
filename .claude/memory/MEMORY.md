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
- Deploy: **Railway** desde `main` (auto-deploy en cada push) + `npx convex deploy` para las
  funciones. NO Vercel.
- Convex dev deployment: `elated-donkey-854` (team `ponciano-betancourt`, proyecto `crm-pulse`).
- Fuente de verdad de producto: el diseño en `design/PROY CRM Pulse/` (11 pantallas). MVP =
  pantallas completas al 100%.
- Derivados NO se persisten (estado/valor de cliente, último contacto, total de venta).
- Borrado = archivar (soft-delete, campo `archivado`).

## Estado del MVP (al 18-jul-2026)

- **Hecho y DESPLEGADO en prod (pusheado; `origin/main` y local en `312595e`)**: M0 · M1 ·
  shell (TAL-8) · Agenda (TAL-16) · M2.1/TAL-9 + M2.2/TAL-10 (login/rutas) · **M2.3/TAL-32 +
  M2.4/TAL-48** (Equipo + Mi cuenta; `bf5d715`+`971fe44`) · **M3.1** = TAL-11 (alta/edición) +
  TAL-34 (prioridad) + P5 de TAL-35 (`df88017`; `clientes.crear/actualizar/obtener` con
  propietario validado server-side, `usuarios.opcionesAsignacion`, `ClienteForm`, `ui/Textarea`,
  rutas nuevo/editar) · **M3.2** = TAL-12 (lista + búsqueda) + TAL-36 (orden/filtro por prioridad)
  → `88b4c75` (docs `8420402`): `clientes.listar` (acotada, estado derivado con
  `derivarEstadoCliente`), `ClientesListaView` (vista pura testeable) + `ClientesLista` (contenedor),
  `ui/Badge` variant "outline". 98 tests (13 nuevos: 4 convex + 9 componente). Verify navegador 12/12
  (lista **poblada** read-only con datos demo: búsqueda, filtro, orden, badges, responsive).
- **Gate de acceso verificado en prod (18-jul)**: peticiones sin cookies a `/`, `/hoy`, `/clientes`
  responden **307 → /login**; `/login` 200. NO hay bypass. Landing directo a `/hoy` en un navegador
  ya usado = **sesión persistida** (cookie Convex Auth, `maxAge` 30 días en `middleware.ts`), no un fallo.
- **M3.3 = TAL-13 (Ficha 360)**: **DESPLEGADA y cerrada** (Linear **Done**; `312595e` en
  `origin/main`, push autorizado por el dueño). Plan NO-GO→GO y GO de cierre recibidos. Backend:
  `clientes.ficha`
  (query reactiva read-only; `requireUsuario`; `null` si archivado/inexistente) con derivados —estado,
  **valor** = Σ ganadas no archivadas `importe*cantidad` (`derivarValorCliente` nuevo), último
  contacto = max(interacciones.fecha)— + bloques poblados en lectura (próximo seguimiento pendiente,
  interacciones desc por fecha, ventas no archivadas con `total`, nombres con fallback "Usuario no
  disponible"); 3 índices aditivos (`interacciones.por_cliente_fecha`,
  `ventas.por_cliente_archivado_fecha`, `seguimientos.por_cliente_estado_fecha`) **ya empujados a
  `elated-donkey-854`** vía `convex dev --once`. Front: `page.tsx`→`FichaCliente` (contenedor) +
  `FichaClienteView` (vista pura) + contacto multicanal `wa.me`/`tel`/`mailto` (oculto si falta el
  dato) + CTAs M4/M5 con `disabled` real. Plan pasó por NO-GO→GO (2 mayores: índice de próximo
  seguimiento + `total` de venta). **Gates verdes**: tsc, lint, 118 tests (13 nuevos), build, `convex
  dev --once`. **Verify Playwright PASS** (login demo → ficha a 1280 y 375; vacío "Cliente Prueba" +
  poblado "Diego Herrera": valor $0 con venta abierta de $26K = correcto, contacto oculto sin datos).
- **M3 restante**: TAL-49 (M3.4 estado auto-calc) → **Done**. **TAL-59 (archivar · parte CLIENTES)
  → Done** (18-jul; GO de plan y de cierre) — ver bullet TAL-59 abajo. La parte de ventas se difiere
  a M5.2/TAL-50 (como indica el propio issue).
- **M4 EN CURSO** — rama **`feat/m4-seguimiento`** (creada desde `main`, **pusheada a GitHub**; NO
  fusionada a `main`). TAL-14/TAL-15/TAL-17 movidas a **Todo** (TAL-16 Agenda ya Done). **TAL-14 (M4.1
  Registrar interacción)** → **Done** (Linear; commit `2dc246d` pusheado a `origin/feat/m4-seguimiento`): mutation `interacciones.registrar`
  (autoriza con `requireUsuario`; `registrado_por` server-side; rechaza cliente inexistente/archivado;
  valida `fecha` server-side = entero seguro/>0/no-futuro con tolerancia 5 min; normaliza `canal` por
  tipo —solo "mensaje"—; límite nota 2000). Validadores `tipo/canalInteraccion` movidos a
  **`convex/lib/validadores.ts`** (los `convex/*.ts` públicos solo exportan funciones; lo compartido va
  en `lib/`), importados por `clientes.ts` e `interacciones.ts`. Front: **`InteraccionForm`** (vista
  pura) + modal en `FichaCliente` (`Modal` ganó props opcionales `subtitle` + `size="lg"` +
  `aria-describedby`) + CTAs de interacción activadas en la ficha (seguimiento/ventas siguen `disabled`).
  **Contrato de fecha**: el form omite `fecha` si sigue siendo hoy (server usa `Date.now()`); si se
  cambia, envía el **mediodía local** de ese día (evita "00:00" perdiendo el último contacto).
  **Gates verdes**: tsc, lint, build, **140 tests** (+22 nuevos: 10 backend, 9 form, 3 ficha),
  `convex dev --once` (funciones empujadas a `elated-donkey-854`; SIN cambio de esquema). **Smoke
  Playwright PASS**: login demo (Elena) → ficha → modal a 1280 y 375; derivación Llamada/WhatsApp OK;
  **sin pulsar Guardar → sin escritura al live**. Commit `2dc246d` en la rama (pusheado); **sin merge a `main`**.
- **TAL-15 (M4.2 Programar seguimiento)** IMPLEMENTADA (Linear In Progress; plan NO-GO→GO, 1 mayor:
  techo/validez de `fecha_objetivo`). Backend: `seguimientos.crearSeguimiento` (`requireUsuario`;
  `responsable` server-side; rechaza cliente inexistente/archivado; `fecha_objetivo` = entero
  seguro / >0 / ≤ `now+5 años` —garantiza representable por `Date`, permite *vencidos*—; motivo ≤2000).
  Front: **`ui/Calendario.tsx`** (calendario propio: lunes primero `L M X J V S D`, marca hoy/seleccionado,
  `min=hoy` deshabilita pasado, navegación de mes) + **`SeguimientoForm`** (atajos Mañana/En 3 días/En 1
  semana + calendario sincronizados; banner "Agenda (Hoy)") + CTA "Programar seguimiento" activada en la
  ficha (estado de modal como unión interacción|seguimiento). Helpers de fecha extraídos a
  **`src/lib/fecha.ts`** (browser-local; distinto de `agenda.ts` que es TZ-aware) y `InteraccionForm`
  refactorizado. **Gates verdes**: tsc, lint, build, **163 tests** (+23), `convex dev --once` (aditivo;
  `_generated` SIN cambio porque `seguimientos` ya existía como módulo). **Smoke Playwright PASS** (modal +
  calendario a 1280/375; atajo "En 3 días" → día 21 con hoy=18; pasado deshabilitado; **sin Agendar → sin
  escritura al live**). Commit `7a218c2` en la rama (pusheado).
- **TAL-17 (M4.4 Cerrar seguimiento)** IMPLEMENTADA (Linear In Progress). La Agenda ya cerraba (TAL-16,
  `AgendaHoy` → `seguimientos.cerrar`); esta pasada habilita "Marcar hecho" en la **ficha**: `FichaCliente`
  usa la mutation existente `seguimientos.cerrar` + `cerrandoSeguimiento` + toast; `FichaClienteView`
  habilita el botón. **Sin backend nuevo**. **171 tests** (+3). Smoke: botón habilitado en ficha con
  pendiente (Diego Herrera) **sin pulsarlo** (cerrar escribiría al live). Committeado en la rama.
- **TAL-60 (endurecimiento pre-merge)** → **Done** (commit `966088c`): (A) borrado `convex/health.ts`
  (query `ping` pública sin auth, código muerto; confirmado fuera de `_generated`); (B) validación
  server-side de longitudes en `clientes` crear/actualizar (nombre≤120 y no vacío, telefono≤40,
  email≤200+sanidad básica, empresa≤120, cargo≤80, ciudad≤80, notas≤2000; opcionales vacíos→undefined) +
  tests; (D) `EquipoAdmin` contraseña `type=password`+toggle+`autoComplete=new-password`; docs
  `CLAUDE.md`/`AGENTS.md` a **Next 15.5 / Convex 1.42**. Origen: auditoría NO-GO de pre-merge (hallazgos
  **preexistentes**, no de TAL-14/15/17).
- **M4 COMPLETO Y DESPLEGADO** (18-jul): merge fast-forward de `feat/m4-seguimiento` a `main`
  (`312595e..0a8bd2c`) y **push a `main` autorizado por el dueño** → Railway auto-deploy (deployment
  `bcf6126f`). TAL-14/15/17 + endurecimiento **TAL-60** en **Done** (Linear); TAL-16 (Agenda) ya estaba
  Done. `origin/main` = `0a8bd2c` (el push arrastró también el docs `3f0f43f`, solo memoria, que quedaba
  local). Auditoría pre-merge sin bloqueantes. **Siguiente**: M5 (ventas) · M6 (cierre) · TAL-59
  (archivar).
- **TAL-59 (Archivar/soft-delete · parte CLIENTES) → Done** (18-jul; GO de plan y de cierre). Rama
  `feat/tal-59-archivar`, merge fast-forward a `main` + push (Railway auto-deploy). Backend
  `clientes.archivarCliente` (`requireUsuario`; idempotente `{ok,yaArchivado}` estilo `seguimientos.cerrar`;
  `get`→`patch` acotado sin escaneo → no amplía read-set/OCC; **sin cascada** — `listar`/`obtener`/`ficha`
  y la Agenda ya ocultan lo del cliente archivado); ya en `elated-donkey-854` vía `convex dev --once`
  (aditivo, sin cambio de esquema). Front: **`ui/ConfirmDialog.tsx`** reutilizable (overlay papelera + copy
  reversible + botón danger; durante el archivado deshabilita confirmar/cancelar y **bloquea cierre por
  backdrop/Escape** → anti doble-submit); ficha "Eliminar cliente" → navega a `/clientes` (guard de
  integridad); lista reestructurada de `<Link>` completo a **stretched-link + menú ⋮** (Editar/Eliminar)
  para no anidar interactivos. Copy: "Se archivará a {nombre} y dejará de aparecer en tus listas. Podrás
  recuperarlo más adelante." **Gates verdes**: tsc, lint, **188 tests** (+17), build, `convex dev --once`.
  **Smoke Playwright PASS** (1280/375; abrir confirm desde lista y ficha + **Cancelar**, sin escritura al
  live). **Ventas (`archivarVenta` + ⋮ en la pantalla de ventas) → M5.2/TAL-50** (hoy `ventas.ts` es stub;
  reutilizará `ConfirmDialog`). Gotcha nuevo (`gotchas.md`): `role="menuitem"` anula el rol implícito →
  en tests usar `getByRole("menuitem")`, no `button`/`link`.
- **M5 · Ventas — COMPLETO Y DESPLEGADO** (18-jul): rama `feat/m5-ventas` (desde `main`), merge
  fast-forward + push (Railway auto-deploy). **TAL-18 (M5.1 registrar venta)** `f9786b8` + **TAL-50
  (M5.2 pantalla /ventas)** `7ab843a` → **Done**. Backend `convex/ventas.ts` (era stub): `crearVenta`,
  `listar`, `actualizarVenta`, `archivarVenta` + `clientes.opcionesActivas`. **Autorización D1** (la
  dueña opera todas; el vendedor solo las suyas: crea a su nombre, edita/archiva `venta.vendedor===yo`);
  `archivarVenta` autoriza ANTES de la idempotencia. **Cascada de soft-delete**: `listar` descarta
  ventas de clientes archivados (cierra el hueco que TAL-59 dejó para M5.2). `total` = importe*cantidad
  derivado; el estado/valor del cliente se recalcula solo. Front: **`VentaForm`** (P8 reutilizable: alta
  desde ficha o /ventas + edición; Vendedor editable solo dueña; Total en vivo), **`/ventas`** =
  `VentasLista`+`VentasListaView` (KPIs En marcha/Ganado y contadores que reflejan Cliente+Periodo;
  chips; "Este trimestre" = trimestre natural client-side; filas stretched-link→ficha; ⋮ Editar/Eliminar
  gateado por D1; reusa `ConfirmDialog`). Sin embudo (F6/TAL-30) ni reporte avanzado (F15/TAL-22). Plan
  NO-GO (3 mayores: cascada, `actualizar` falla-cerrado, D1) → GO. **Gates verdes**: tsc, lint, **232
  tests** (+44), build, `convex dev --once`. **Smokes Playwright PASS** (1280/375, read-only, sin escribir
  al live). **`archivarVenta` cubre la parte de ventas de TAL-59.** La pestaña "Ventas" ya existía en
  `nav-items.ts`. **Siguiente**: M6 (cierre del MVP: pulido móvil + E2E).
- Higiene Linear: **al día**. Verificado 18-jul: NO quedan issues en "Todo" en el proyecto. M1
  (TAL-5/6/7/8) está **Done** y el milestone al 100% (la nota previa de "M1.1–M1.3 en Todo" era
  obsoleta; se cerraron el 16–17-jul). Único trabajo abierto: **M6** (TAL-19 M6.1 + TAL-20 M6.2) en
  **Backlog**.
- **Datos demo en el deployment**: `elated-donkey-854` tiene **5 clientes demo** (+ ventas y
  seguimientos, sembrados para la Agenda). Útil: permite verificar listas/derivados **poblados
  read-only** sin crear datos. NO son clientes reales; aun así no escribir sobre ellos en verify.

### Verify en local (esta máquina)

- `next dev` NO arranca bajo OneDrive (EINVAL readlink en `.next/diagnostics`; ver `gotchas.md`).
  Para verificar en local: `npm run build` → `npm run start` (:3000). Cuentas demo: Elena
  (`elena.demo@pulsecrm.test`, dueña) / Carlos (`carlos.demo@pulsecrm.test`, vendedor); contraseñas
  en `CRM_SEED_PW_*` del deployment. `elated-donkey-854` es COMPARTIDO (sirve la app en vivo de
  Railway, sin `CONVEX_DEPLOY_KEY`): no crear/mutar cuentas reales al verificar.

## Auth (contexto M2)

- `usuarios` tiene `authId` (enlace con la identidad de Convex Auth). Decisión de plan M2:
  enlazar por `authId` (Convex Auth `users._id`), resolver con `getAuthUserId`.
- Login real pendiente; mientras tanto `resolverUsuario` usa fallback dev `CRM_DEV_USER_EMAIL`
  (solo sin identidad). Semillas env-gated con `CRM_ALLOW_SEED=true`.

## Cómo se trabaja con este dueño

- Planes **en pantalla** (no archivo) + ciclo de auditoría **GO/NO-GO** antes de implementar código.
- Push a `main` = deploy: solo con aprobación explícita.
- Commits en español, Conventional Commits, **sin referencias a IA**.
- Decisiones agrupadas en revisiones de plan; dudas sueltas de una en una.
