# CRM Pulse — Paquete de referencia de diseño

Este repositorio contiene el **prototipo de UI de CRM Pulse** en HTML. Es la
**fuente de verdad visual y de interacción** del producto: pantallas, flujos,
estados, copy y sistema de diseño.

> ⚠️ **Importante — no es código para copiar tal cual.**
> El repositorio destino es **React + Tailwind CSS**. Estos archivos HTML son
> **referencia de diseño (UI/UX)**, no componentes de producción. Úsalos para
> entender *qué* construir y *cómo se ve/comporta*, y **reimplementa** cada
> pantalla como componentes React idiomáticos con Tailwind. No pegues el HTML
> ni el JS de estos archivos en la app: los tokens, la maquetación y la lógica
> deben traducirse al stack destino.

---

## Cómo usar este paquete

| Rol | Cómo aprovecharlo | Empieza por |
|-----|-------------------|-------------|
| **Diseño UI/UX** | Fuente viva de pantallas, estados, copy y uso del design system. Abre cualquier `.dc.html` en el navegador. | `*.gallery.dc.html` + `_ds/` |
| **Programación** | Especificación de comportamiento: rutas, guards, overlays, estados. Reimplementa en React + Tailwind mapeando los tokens del DS. | `CRM Pulse.dc.html` + `Guia App Shell.dc.html` |
| **Auditoría** | Verifica cobertura de roles/permisos, puntos de integración (auth, push, datos) y trazabilidad pantalla↔requisito. | Sección "Puntos de integración" + "Roles y permisos" |
| **Testing / QA** | Cada galería documenta los estados esperados (vacío, error, validación, carga) por viewport → base de casos de prueba. | `*.gallery.dc.html` + "Matriz de estados" |

### Ver las pantallas
Los archivos `.dc.html` se abren **directamente en el navegador**. Empieza por:

- **`CRM Pulse.dc.html`** — el App Shell completo, interactivo (login → todas las pantallas).
- **`Guia App Shell.dc.html`** — documento de referencia imprimible (pantallas, rutas, roles). Léelo primero.

---

## Arquitectura (resumen)

SPA gobernada por dos ejes de estado en `CRM Pulse.dc.html`:

- **`route`** — qué pantalla se muestra (`hoy`, `clientes`, `ficha`, `ventas`, `equipo`, `cuenta`).
- **`overlay`** — qué modal/formulario flota encima (`nuevo`, `editar`, `venta`, `interaccion`, `seguimiento`, `confirmData`).

**Roles:** `dueña` y `vendedor`. `equipo` es solo para `dueña`; hay guards de degradación de rol y de integridad al eliminar. Detalle completo en `Guia App Shell.dc.html`.

### Convención de nombres (importante)
Sin espacios en nombres de archivo. Cada pantalla tiene un nombre base y un sufijo que indica su rol:

- **`*.screen.dc.html`** — el **componente** real de la pantalla (responsivo vía prop `mode`: `mobile` / `desktop`).
- **`*.gallery.dc.html`** — la **galería** de ese mismo componente: lo muestra en varios viewports (móvil/tablet/escritorio) y estados (vacío, error, validación…). Importa al `.screen` correspondiente.

El nombre base empareja el par (ej. `ClientesLista.screen` ↔ `ClientesLista.gallery`).

### Pantallas → archivos de referencia
| Pantalla | Componente | Galería |
|---|---|---|
| Agenda Hoy | `AgendaDia.screen.dc.html` | `AgendaDia.gallery.dc.html` |
| Clientes (lista) | `ClientesLista.screen.dc.html` | `ClientesLista.gallery.dc.html` |
| Ficha Cliente 360 | `Ficha360.screen.dc.html` | `Ficha360.gallery.dc.html` |
| Cliente (alta/edición) | `ClienteForm.screen.dc.html` | `ClienteForm.gallery.dc.html` |
| Venta (form) | `VentaForm.screen.dc.html` | `VentaForm.gallery.dc.html` |
| Interacción (form) | `InteraccionForm.screen.dc.html` | `InteraccionForm.gallery.dc.html` |
| Seguimiento (form) | `SeguimientoForm.screen.dc.html` | `SeguimientoForm.gallery.dc.html` |
| Mi cuenta | `CuentaPerfil.screen.dc.html` | `CuentaPerfil.gallery.dc.html` |
| Login | `LoginScreen.dc.html` | — |

---

## 🔌 Puntos de integración (pendientes en el prototipo)

El prototipo **simula** estas capas. Al reimplementar en React, conéctalas a
servicios reales. Búscalas por estos puntos:

### 1. Autenticación (auth provider)
- **Dónde en el prototipo:** `LoginScreen.dc.html` + el estado `authed` / `login()` / `logout()` en `CRM Pulse.dc.html`.
- **Hoy:** `login()` solo pone `authed: true` sin validar credenciales.
- **A integrar:** proveedor de identidad real (OAuth/SSO, Auth0, Cognito, Firebase Auth o el que defina el equipo). El gate `showLogin` debe depender de la sesión real; `logout()` debe invalidar el token/sesión. El **rol** (`dueña`/`vendedor`) debe venir de los claims/perfil del usuario autenticado, no del switch manual del prototipo.

### 2. Notificaciones push
- **Dónde en el prototipo:** los seguimientos y recordatorios de `AgendaDia.screen.dc.html` y el overlay `seguimiento`.
- **Hoy:** no hay notificaciones; los recordatorios solo existen en pantalla.
- **A integrar:** servicio de push (FCM / APNs vía tu backend, o Web Push). Un seguimiento agendado debe programar una notificación; disparar recordatorios de tareas “vencidas / de hoy”. Registrar service worker y permisos en el arranque de la app.

### Otras capas simuladas a sustituir por API real
- **Datos** (clientes, ventas, interacciones): hoy en estado en memoria dentro del shell → reemplazar por capa de datos/fetch contra el backend.
- **Persistencia**: las ediciones no sobreviven a un recargado → conectar a la API/store real.

---

## Roles y permisos (para Auditoría)

Dos roles: **dueña** y **vendedor**. El rol condiciona qué se ve y adónde se puede estar.

- La pantalla `equipo` (Usuarios) es **solo dueña**: `showEquipo = route === 'equipo' && roleDuena`. Un vendedor no la ve en el nav.
- **Guard de degradación:** si estás en `equipo` y cambias a vendedor, el shell te expulsa a `hoy`.
- **Guard de integridad:** si eliminas el cliente cuya Ficha estás viendo, `route` cae de `ficha` a `clientes`.
- Toda acción destructiva (eliminar cliente/venta) pasa por el overlay de confirmación `confirmData` (“Esta acción no se puede deshacer”).

> **Nota de auditoría:** en el prototipo el rol se cambia con un switch manual. En producción debe venir de los claims del usuario autenticado (ver "Puntos de integración").

---

## Matriz de estados (para Testing / QA)

Cada galería (`*.gallery.dc.html`) muestra la pantalla en **3 viewports** (móvil 375px, tablet 768px, escritorio 1280px) y en los estados relevantes. Úsala como catálogo de casos de prueba:

| Pantalla | Estados documentados en la galería |
|---|---|
| Agenda Hoy | Con pendientes · Todo al día |
| Clientes (lista) | Lista normal · Búsqueda activa · Vacío |
| Ficha Cliente 360 | Ficha llena · Sin actividad |
| Cliente (form) | Alta (vacío) · Edición (precargado) · Validación (nombre en error) |
| Venta (form) | Vacío · Con datos + total · Validación (importe) |
| Interacción (form) | Vacío · Con contenido |
| Seguimiento (form) | Vacío (con atajos) · "En 3 días" + motivo |
| Mi cuenta | Dueña · Vendedor · Cargando (skeleton) · Error + reintentar |

Criterios transversales a verificar: responsividad en los 3 viewports, foco/teclado (anillo indigo 3px), copy en sentence case, cifras con `JetBrains Mono` tabular, y que ninguna acción destructiva ocurra sin confirmación.

---

## Sistema de diseño

Bajo `_ds/pulse-crm-ds-pbv-…/` viven los **tokens y estilos** de **Pulse CRM DS PBV**:
color de marca indigo `#4F46E5`, neutros slate, fondos planos, **Plus Jakarta Sans**
(UI) y **JetBrains Mono** (cifras/fechas/IDs), íconos tipo Lucide.

**Al pasar a Tailwind:** mapea estos tokens a `tailwind.config` (colores, fuentes,
radios, sombras) en lugar de usar valores arbitrarios, para que la implementación
herede exactamente el DS.

---

## Estructura del paquete

```
CRM Pulse.dc.html        App Shell interactivo (empieza aquí)
Guia App Shell.dc.html   Documento de referencia (pantallas, rutas, roles)
*.dc.html                Pantallas y formularios de referencia
_ds/                     Design system (tokens, estilos, componentes)
doc-page.js / support.js  Runtime del prototipo (no portar al repo destino)
```

*Documento y prototipo internos — CRM Pulse, jul 2026.*
