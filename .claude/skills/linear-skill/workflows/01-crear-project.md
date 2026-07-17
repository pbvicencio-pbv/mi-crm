# Workflow — Crear un Project con milestones

Sigue este playbook cuando el humano pida crear un nuevo Project. Asegura que el Project respete el Linear Method y quede bien organizado con sus milestones. (Nota: en TAL las initiatives no están habilitadas hoy; el trabajo se organiza por project + milestones.)

## Pre-requisitos a verificar

Antes de tocar nada, valida:

- [ ] **¿Encaja en la estrategia actual?** En TAL los projects son "PROY CRM Pulse" (MVP en curso) y "CRM - RESTO PRD" (post-MVP). Si el trabajo no justifica un project propio, quizá es backlog del team. (Las initiatives no están habilitadas hoy en TAL: no hay initiative parent que asignar.)
- [ ] **¿Tiene fecha de entrega clara?** Sin targetDate, no es project todavía. Es idea.
- [ ] **¿Tiene un único lead?** Si dos personas pelean por owner, asignar a una.
- [ ] **¿Es realmente acotado?** Si es trabajo continuo sin fin → no project, es backlog del team.
- [ ] **¿Existe ya algo similar?** `list_projects` con texto similar antes de crear.

## Paso 1 — Recoger inputs del humano

Pide explícitamente si no los tienes:

```
1. Nombre (en imperativo, sin año, sin redundancias):
   ✓ "Lanzar Gestión de clientes v1"
   ✗ "Clientes 2026"
   ✗ "CRM Pulse Clientes 2026"

2. (Initiative parent — no aplica en TAL: las initiatives no están habilitadas; el project cuelga directo del team TAL)

3. Lead (humano único, no agente)

4. Target date (día/mes/quarter/half/year)

5. Resumen de 1 línea (campo summary)

6. Descripción más larga (campo description, project spec)
```

Si el humano da info parcial, propón valores razonables y pide confirmación:

```
Propongo:
- Nombre: "Lanzar Gestión de clientes v1"
- Lead: Ponciano Betancourt
- Target: fin de Q3 2026 (30 sept)
- Summary: "Alta, edición y ficha de clientes con estado calculado"
- Description: a redactar contigo

¿Confirmas o ajustas?
```

## Paso 2 — Redactar el project spec (description)

Usa la plantilla del Linear Method. Mantenla **breve** (1 pantalla).

```markdown
## Why
[Por qué este project importa AHORA. Conexión con la estrategia del producto.
 1-2 párrafos máximo]

## What
[Lo que entrega este project, en bullets cortos]
- ...
- ...

## How
[Approach high-level — sin código, sin wireframes detallados]

## Success criteria
- [ ] Criterio medible y verificable
- [ ] Otro criterio medible

## Out of scope
[Lo que NO se hace en este project — gestiona expectativas]

## Risks
[Qué podría descarrilar — opcional pero útil]
```

Si el humano no tiene aún claros los criterios de éxito → no crees el project. Pídelo. Un project sin success criteria es vapor.

## Paso 3 — Crear el project en Linear

Usando MCP:

```
save_project(
  team="TAL",
  name="<nombre del paso 1>",
  description="<spec del paso 2>",
  summary="<una línea>",
  lead="<user identifier>",
  state="planned",  // o "started" si arranca esta semana
  targetDate="<ISO date o quarter>"
  // initiatives: no aplica en TAL (no están habilitadas)
)
```

Recoge el `id` del project creado para los siguientes pasos.

## Paso 4 — Diseñar los milestones

> Referencia real: el project activo **PROY CRM Pulse** usa 7 milestones — M0 · Diseño, M1 · Fundación técnica, M2 · Autenticación, acceso y usuarios, M3 · Gestión de clientes, M4 · Seguimiento e interacciones, M5 · Ventas, M6 · Cierre del MVP.

Un project típico tiene **3-5 milestones**, no más. Patrón típico:

| Milestone | Significado |
|---|---|
| M1: Diseño / Spec aprobado | Antes de tocar código, hay claridad |
| M2: Backend / núcleo funcional | Lo crítico funciona end-to-end |
| M3: Frontend / UX completa | Lo demás funciona |
| M4: Beta cerrada | Validación con usuarios reales |
| M5: Lanzamiento público | El project termina |

Adaptar al tipo de project. Para refactors:

| Milestone |
|---|
| M1: Audit completo y plan |
| M2: Migración de módulos no críticos |
| M3: Migración de módulos críticos |
| M4: Cleanup y deprecation |

Para integraciones nuevas:

| Milestone |
|---|
| M1: PoC funcionando local |
| M2: Auth y flow real |
| M3: Manejo de errores y retries |
| M4: Lanzamiento a producción |

## Paso 5 — Crear los milestones en Linear

Para cada milestone:

```
save_milestone(
  project="<projectId>",
  name="<nombre>",
  description="<lo que entrega este milestone>",
  targetDate="<ISO date>",
  sortOrder=<1024 * N>  // 1024, 2048, 3072, ... para orden manual
)
```

**Importante**: las fechas de los milestones deben ser monotónicas (M1 < M2 < M3...) y la del último milestone ≤ targetDate del project.

## Paso 6 — Confirmar al humano

Resumen para revisión:

```
✓ Project creado: TAL → "Lanzar Gestión de clientes v1"
  URL: https://linear.app/...
  Lead: Ponciano Betancourt
  Target: 30 sept 2026
  
  Milestones:
  - M1: Diseño aprobado — 31 may
  - M2: Backend con datos reales — 30 jun
  - M3: Frontend funcional — 31 jul
  - M4: Beta cerrada — 31 ago
  - M5: Lanzamiento público — 30 sept
  
¿Quieres que arranque a poblar issues bajo M1?
```

## Paso 7 — Opcional: poblar primeras issues

Si el humano dice "sí, poblamos issues":

1. Pide al humano la lista de "primeras 5-10 cosas que harías" para M1
2. Para cada una, sigue el flujo de `prompts/crear-issue.md` (con dedupe)
3. Asigna cada issue a `projectMilestoneId = M1`
4. Estado inicial: `Todo` si M1 arranca ya, o `Backlog` si es más adelante (los cycles no están habilitados en TAL)
5. Estima cada una (Fibonacci ≤ 5)

## Errores a evitar

❌ **Crear el project con fecha "TBD"** — si no hay fecha, no hay project.

❌ **Llamar al project con el año en el nombre** — el año no aporta al nombre; el nombre describe el entregable, no el calendario.

❌ **Crear más de 5-6 milestones** — diluye la barra de progreso. Si necesitas más, considera dos projects.

❌ **Asumir que hay una initiative parent** — en TAL las initiatives no están habilitadas; el project cuelga directo del team TAL. No pierdas tiempo buscando a qué initiative vincularlo.

❌ **Description larga y exhaustiva** — Linear Method dice brevedad. Specs largas van en Documents adjuntos al project.

❌ **Asignar al equipo entero como lead** — un único lead. Punto.

❌ **Crear el project en estado "started"** sin que realmente esté empezado — usa `planned` hasta que realmente arranque.

## Variantes

### Variante A — Project pequeño sin milestones

Si el project es chico (terminable en pocas semanas, ~10 issues), saltar milestones está bien. La barra de progreso del project usa todas las issues directamente.

### Variante B — Project compartido entre teams

Cuando creemos un team adicional (ej: Operaciones), un project puede pertenecer a varios teams pasando `teamIds: [...]` en lugar de uno solo. **No aplica hoy** porque solo tenemos team TAL.

### Variante C — Project como sub-effort de uno mayor

Linear no soporta nesting de projects. Si necesitas eso, alternativas:
1. Initiative madre con sub-initiatives → projects bajo cada sub-initiative (requiere habilitar initiatives; hoy no están en TAL)
2. Un solo project con milestones que reflejen las "sub-fases"

## Después de crear

- Linear pedirá un primer Project Update si has configurado weekly. El primero suele ser "Project arrancado, M1 en progreso".
- Comparte la URL del project con stakeholders relevantes (vía Slack o Linear Asks).
- Si el project tiene impacto visible, planifica un changelog público al lanzamiento.
