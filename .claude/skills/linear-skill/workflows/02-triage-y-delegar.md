# Workflow — Triage y delegación a agentes IA

Este es el flujo más crítico del skill. Cuando llegan issues nuevas (de cualquier fuente: ideas internas, bugs reportados, feedback de usuarios), tienen que pasar por triage humano antes de cualquier acción. Y cuando se delega a un agente IA, hay que hacerlo con un patrón muy específico para mantener trazabilidad.

> Nota TAL: el team TAL **no tiene estado `Triage` ni `In Review`** (estados: Backlog, Todo, In Progress, Done, Canceled, Duplicate). El "triage" es una **actividad**, no un estado: las issues sin clasificar viven en `Backlog`. Tampoco hay cycles ni labels `vertical/*`, `type/*` o `actor/*`: el trabajo se organiza por **project + milestones** y las únicas labels son `Feature`, `Bug`, `Improvement`.

## Cuándo usar este workflow

- Cuando el humano dice "vamos a hacer triage del backlog"
- Cuando el humano pega contenido (Slack thread, email, mensaje de Notion) y dice "convierte esto en issues"
- Cuando hay issues sin clasificar en `Backlog` esperando triage
- Cuando el humano dice "delega esto a Claude" / "que lo haga tu agente IA" / "que lo haga el agente"

## Parte 1 — Triage humano

### Paso 1.1 — Recoger inputs por clasificar

Listar lo que está sin clasificar en `Backlog`:

```
list_issues(team="TAL", stateType="backlog", first=50)
```

O si el humano va a triagear contenido que aún no está en Linear:

```
1. Pídele que pegue el contenido (Slack thread, email, lo que sea)
2. Para cada item de trabajo identificable, ejecutar paso 1.2 en bucle
```

### Paso 1.2 — Para cada issue, decidir 6 cosas

Para cada issue a triagear, completa estos 6 campos antes de darla por clasificada:

1. **¿Es real?** O cancelar (state = `Canceled` o `Duplicate`)
2. **¿Existe ya?** Buscar duplicados con `list_issues(query=<keywords>)`. Si hay duplicado, marcar como `duplicateOf` la existente y cancelar.
3. **¿A qué project/milestone pertenece?** Asignar `projectId` (p. ej. PROY CRM Pulse) y `projectMilestoneId` (M0–M6). En TAL no hay initiatives ni labels `vertical/*`.
4. **¿Tipo de trabajo?** Label `Feature` | `Bug` | `Improvement` (las tres únicas en TAL; no existe taxonomía `type/*`).
5. **¿Prioridad?** `Urgent` (1) | `High` (2) | `Normal` (3) | `Low` (4).
6. **¿Estimate?** Fibonacci 1, 2, 3, 5, 8. Si >5, romper en sub-issues.

### Paso 1.3 — Mover al estado correcto

Después de triagear, la issue va a uno de estos estados:

- `Backlog` — clasificada pero sin compromiso inmediato. Es donde vive el 80% del trabajo.
- `Todo` — priorizada, para hacerse pronto (en TAL no hay cycles; "pronto" = milestone activo).
- `In Progress` — alguien ya está trabajando.

NUNCA dejar issues sin clasificar tras la sesión de triage. Si no se puede decidir, cancelar y reabrir cuando haya más info.

### Paso 1.4 — Decidir: ¿humano o IA?

Esta es la decisión clave del triage moderno. Para cada issue priorizada, pregúntate:

```
✓ Sí delegable a IA (se rastrea con el campo `delegate`; TAL no tiene label actor/*):
  - Scope < 1 día de trabajo
  - Tiene tests existentes en el repo
  - No toca infra crítica (DB migrations, auth, payments)
  - No hay ambigüedad de producto/UX
  - El "qué hacer" está claramente definido en la description
  - Es repetitivo (refactors mecánicos, type updates, doc updates)
  - Bug bien aislado con repro claro

✗ No delegable a IA (sin delegate; lo toma un humano):
  - Decisión arquitectónica
  - Decisión de UX o de producto
  - Debugging exploratorio profundo
  - Cambios de configuración de infra
  - Cualquier cosa con ambigüedad significativa
  - Trabajo que requiere conversación con stakeholders
```

## Parte 2 — Delegación a agente IA

Cuando una issue se ha decidido como delegable, el patrón estricto es:

### Paso 2.1 — Validar prerequisites

- [ ] La issue tiene description con criterios de aceptación claros
- [ ] La issue tiene su project/milestone y label (`Feature` | `Bug` | `Improvement`)
- [ ] Estimate está puesto y es ≤ 5
- [ ] Si el agente es de coding, sabes a qué repo aplica
- [ ] Si la issue requiere acceso a credenciales/secrets, hay un mecanismo seguro

Si falta cualquiera, **rellenar antes de delegar**. Un agente con contexto incompleto produce ruido.

### Paso 2.2 — Asignar al agente

Mantener al humano como `assignee` (responsable). El agente entra como `delegate`:

```
save_issue(
  identifier="TAL-X",
  assignee="<humano que va a revisar>",  // NO el agente
  delegate="<agente IA>",
  state="In Progress"
  // TAL no tiene label actor/*: la delegación se rastrea con el campo delegate
)
```

### Paso 2.3 — Documentar el plan inicial

Comentario que orienta al agente:

```
save_comment(
  issue="TAL-X",
  body=`Delegada a @<agente>.

## Contexto adicional
[Lo que el agente necesita saber pero no está en la description]

## Plan inicial sugerido
1. [Primer paso concreto]
2. [Segundo]
3. [...]

## Branch
Usa: \`ai/TAL-X-{slug}\`

## Definición de hecho
- [ ] Tests existentes pasan
- [ ] PR abierto vinculado a esta issue
- [ ] Descripción de PR con resumen de cambios

## Reviewer
@<humano que revisa>`
)
// Nota: reemplaza TAL-X por el identificador real de la issue en identifier, issue y branch.
```

### Paso 2.4 — El agente ejecuta

Si el agente es tu agente IA:
- Recibe el webhook AgentSessionEvent
- Crea worktree, abre rama
- Trabaja, commitea, pushea
- Abre PR con `Closes TAL-X`
- La integración GitHub vincula el PR; como TAL no tiene estado `In Review`, la issue permanece en `In Progress` hasta el merge (que la pasa a `Done`)

Si el agente es Claude Code interactivo (este skill):
- El humano (tú) pide a Claude Code "trabaja en TAL-X"
- Claude Code lee la issue, abre branch, trabaja, abre PR
- Comenta progreso en la issue

### Paso 2.5 — Review humano

Cuando el PR está listo para revisión (la issue sigue en `In Progress`, ya que TAL no tiene `In Review`):

1. El humano `assignee` revisa el PR en GitHub
2. Si todo bien → aprobar y mergear → automation pasa la issue a `Done`
3. Si hay cambios pequeños → comentar en PR, el agente itera
4. Si hay cambios mayores → comentar en la issue y mantenerla en `In Progress` (TAL no tiene label `actor/needs-review`)

### Paso 2.6 — Auditoría post-merge

Periódicamente (p. ej. al cierre de cada milestone), revisar las issues delegadas a IA (por el campo `delegate`):

- ¿Qué % se mergearon directamente?
- ¿Qué % requirió cambios significativos?
- ¿Hubo regresiones?

Si una issue delegada a IA tuvo problemas:
- Documentar el post-mortem en un comentario de la issue
- Comentar qué falló para futuras delegations
- Considerar si ese tipo de trabajo es realmente delegable

## Parte 3 — Patrones específicos

### Patrón A — Bug delegado a agente

Bugs son los mejores candidatos a IA porque son acotados. Plantilla:

```markdown
## Repro
1. Pasos exactos
2. Resultado esperado
3. Resultado observado

## Donde mirar
- archivo.ts línea 42
- otro-archivo.ts función xyz

## Test que debería pasar
[código del test que actualmente falla]
```

### Patrón B — Refactor mecánico delegado

Refactors deterministas (rename, type updates, deprecation removals) son ideales:

```markdown
## Cambio
Reemplazar todas las llamadas a `oldFunction` por `newFunction(opts)`.

## Archivos afectados
[Lista preliminar; el agente puede expandir]
- src/api/user.ts
- src/api/team.ts
- ...

## Verificación
- [ ] Tests existentes pasan
- [ ] No queda ninguna ref a `oldFunction` (`grep -r`)
```

### Patrón C — Feature pequeña delegada

Solo si la spec es muy clara y el scope es chico:

```markdown
## Comportamiento esperado
[Descripción precisa de lo que el usuario debe ver/hacer]

## Criterios de aceptación
- [ ] Endpoint devuelve <X> cuando <Y>
- [ ] Si error, devuelve <Z>
- [ ] Test de integración cubriendo flow happy path

## Diseño / mockup
[Link a Figma si hay]
```

### Patrón D — Investigación NO delegada

Cuando una issue es para entender algo (debugging exploratorio, análisis de logs):

```
NO delegar. El agente sin guía produce explicaciones plausibles pero falsas.
Asignar a humano. Si después se identifica el bug, ESE puede ser delegado.
```

## Parte 4 — Anti-patrones

❌ **Asignar al agente como assignee primario**: pierdes la responsabilidad humana. Siempre como delegate.

❌ **Delegar issues con criterios de aceptación vagos**: el agente inventa los criterios y no son los que esperabas.

❌ **No registrar la delegación (campo `delegate`)**: pierdes la capacidad de auditar trabajo de IA después.

❌ **Permitir que el agente cierre la issue directamente**: solo PR + automation de GitHub. Si el agente cierra issues, perderás el step de review.

❌ **Delegar cosas críticas para validar a IA**: NO. El primer review siempre humano para tareas en categorías nuevas.

❌ **Multi-delegate**: Linear permite un delegate; si quieres dos agentes, romper en sub-issues, una para cada agente.

❌ **No comunicar el plan inicial al agente**: el agente sin plan inventa. Comentario con plan reduce divergencia.

## Parte 5 — Checklist final del workflow

Antes de dar por clasificada una issue:

```
[ ] Assignee humano asignado
[ ] Label puesta (Feature | Bug | Improvement)
[ ] Priority puesta
[ ] Estimate puesto (≤5)
[ ] Si va a IA: delegate asignado
[ ] Si va a IA: comentario con plan inicial publicado
[ ] State = Backlog (si no es inmediato) o Todo/In Progress (si arranca ya)
[ ] Si pertenece a project: projectId puesto
[ ] Si pertenece a milestone: projectMilestoneId puesto
```

Si todos los checks pasan, la issue está lista para arrancar.
