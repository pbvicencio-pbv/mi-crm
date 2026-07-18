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
- **M3 restante**: TAL-49 (M3.4 estado auto-calc) → **Done** (reconciliado: se cerró en Linear el
  18-jul aunque este MEMORY lo daba por pendiente). Queda **TAL-59** (archivar) en Todo.
- **M4 EN CURSO** — rama **`feat/m4-seguimiento`** (creada desde `main`, **pusheada a GitHub**; NO
  fusionada a `main`). TAL-14/TAL-15/TAL-17 movidas a **Todo** (TAL-16 Agenda ya Done). **TAL-14 (M4.1
  Registrar interacción)** IMPLEMENTADA (Linear In Progress): mutation `interacciones.registrar`
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
  **sin pulsar Guardar → sin escritura al live**. Commit en la rama; **sin merge a `main`** (pendiente
  de aprobación al cerrar M4).
- **Pendiente**: TAL-15 (programar seguimiento) · TAL-17 (cerrar seguimiento) · M5 (ventas) · M6
  (cierre) · TAL-59 (archivar).
- Higiene Linear pendiente: M1.1–M1.3 siguen en Todo aunque están hechas.
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
