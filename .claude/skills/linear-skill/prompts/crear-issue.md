# Prompt — Crear issue (con dedupe)

Plantilla para crear una nueva issue en Linear, asegurando dedupe previo y triage completo. Úsala cuando el humano pida "crea una issue para X" o pegue un fragmento que se debe convertir en issue.

## Flow recomendado

### Paso 1 — Buscar duplicados ANTES de crear

```
list_issues(
  team="TAL",
  query="<keywords del titulo propuesto>",
  first=10,
  includeArchived=false
)
```

Mostrar al humano los matches:

```
Antes de crear, encontré estas issues similares:
- TAL-87 "Exportar lista de clientes a CSV" (Backlog, prioridad Normal)
- TAL-65 "Exportar clientes" (Done, hace 2 meses)

¿Crear nueva o relacionar con alguna existente?
```

Esperar respuesta antes de proceder.

### Paso 2 — Recoger inputs mínimos

Si faltan, pedir explícitamente. Inputs requeridos:

| Campo | Default si no se da |
|---|---|
| `title` | OBLIGATORIO — pedir |
| `description` | Estructurar con plantilla (abajo) |
| `label` | Feature / Bug / Improvement — inferir o pedir |
| `priority` | Default: 3 (Normal) — pedir confirmación |
| `estimate` | Pedir o sugerir |
| `assignee` | Default: nadie en backlog, pedir si se trabaja esta semana |
| `project` | En TAL casi siempre "PROY CRM Pulse" — confirmar |
| `projectMilestone` | El milestone (M0–M6) al que pertenece |

### Paso 3 — Estructurar el title

Patrón **imperativo + qué + dónde (si aplica)**:

```
✓ "Implementar recordatorio de seguimiento vencido (Agenda)"
✓ "Corregir cálculo del valor del cliente (ventas ganadas)"
✓ "Migrar el login a Convex Auth (Password)"

✗ "Bug en ventas"
✗ "Login"  
✗ "necesidad: hacer una pantalla de clientes"
```

### Paso 4 — Estructurar la description

Plantilla universal (adaptar según type):

```markdown
## Contexto
[Por qué esta issue importa. 1-2 párrafos de contexto.
Si es feature: a quién sirve. Si es bug: qué está roto.]

## Comportamiento esperado / criterios de aceptación
- [ ] Criterio 1 (verificable)
- [ ] Criterio 2 (verificable)
- [ ] ...

## Información adicional
[Links a Figma, docs, threads de Slack, etc.]

## Out of scope
[Lo que explícitamente NO entra en esta issue]
```

Para bugs, ver plantilla específica en `examples/issue-templates/bug.md`.

Para features, ver `examples/issue-templates/feature.md`.

### Paso 5 — Decidir milestone

TAL organiza el trabajo por **project + milestone**, no por "vertical" (en TAL no existe la taxonomía `vertical/*`). Ubicar la issue en su milestone dentro del project **PROY CRM Pulse**:

| Área del trabajo | Milestone |
|---|---|
| Diseño de pantallas | M0 · Diseño |
| Fundación técnica (stack, esquema, deploy) | M1 · Fundación técnica |
| Login, sesión, usuarios, roles | M2 · Autenticación, acceso y usuarios |
| Clientes / contactos | M3 · Gestión de clientes |
| Seguimientos e interacciones (Agenda) | M4 · Seguimiento e interacciones |
| Ventas / oportunidades | M5 · Ventas |
| Pulido y cierre del MVP | M6 · Cierre del MVP |

Si toca varios milestones, poner solo el principal y mencionar los otros en description.

### Paso 6 — Decidir label

Los ÚNICOS labels del workspace son tres. Elegir uno:

| Si es... | Label |
|---|---|
| Funcionalidad nueva | `Feature` |
| Algo roto que hay que corregir | `Bug` |
| Mejora, refactor, mantenimiento, deps, CI, docs, hardening | `Improvement` |

### Paso 7 — Decidir priority

```
Urgent (1) → bloqueando producción/deploy HOY
High (2) → prioritario, debe entregarse esta semana
Normal (3) → priorizado, siguiente en la fila
Low (4) → nice-to-have, sin compromiso
```

Si se prioriza para la semana en curso, usar al menos `Normal`.

### Paso 8 — Estimar

Fibonacci:

```
1 = trabajo trivial, < 2h          (typo, log fix, dep update)
2 = pequeño, ~medio día            (función nueva acotada, refactor pequeño)
3 = mediano, 1 día                 (feature de tamaño chico, bug normal)
5 = grande, 2-3 días               (feature significativa, refactor moderado)
8 = épico, debería ser sub-issues  (feature grande, sólo si excepcional)
```

Si > 5: NO crear así. Pedir al humano que dividamos en sub-issues primero.

### Paso 9 — Considerar si va a un agente IA

Antes de cerrar el formulario, pregúntate:

```
¿Esta issue cumple criterios de delegable a un agente IA?
(ver workflows/02-triage-y-delegar.md sección 1.4)
  Sí → asignar la issue al agente IA (en TAL no existe label actor/*; la delegación es por asignación)
  No → seguir adelante
```

### Paso 10 — Crear

```
save_issue(
  team="TAL",
  title="<titulo formateado>",
  description="<description estructurada>",
  labels=["Feature"],   // uno de: Feature | Bug | Improvement
  priority=<N>,
  estimate=<N>,
  project="PROY CRM Pulse",
  projectMilestone="M2 · Autenticación, acceso y usuarios",  // el milestone que corresponda
  state="Backlog" if backlog else "Todo",
  assignee="<user o null>"
)
```

### Paso 11 — Confirmar al humano

```
✅ Issue creada: TAL-X "<titulo>"
   URL: https://linear.app/talent-academy-curso/...
   
   Label: Feature
   Priority: High
   Estimate: 3
   Project: PROY CRM Pulse
   Milestone: M2 · Autenticación, acceso y usuarios
   Assignee: @persona

¿Algo que ajustar?
```

## Variantes

### Variante A — Crear varias issues de un golpe

Si el humano pega una lista:

```
1. Para cada item, ejecutar dedupe + triage independiente
2. Pero crearlas TODAS antes de confirmar
3. Resumen al final con todos los IDs creados
4. Si alguna requiere clarificación → no crearla, listar las que sí se pudo
```

### Variante B — Crear sub-issue

Mismo flow, pero pasando `parent="TAL-X"`:

```
save_issue(
  team="TAL",
  parent="TAL-100",  // identifier del parent
  title="Sub-tarea: ...",
  ...
)
```

La sub-issue hereda del parent: project y milestone (si el parent los tiene). Pero puedes overrideearlos. TAL no usa cycles.

### Variante C — Crear issue con template de Linear

Si el team tiene templates configurados:

```
save_issue(
  team="TAL",
  template="Bug Report",  // nombre del template
  title="<titulo>",
  ...  // los demás campos overridean los del template
)
```

## Anti-patrones

❌ **No buscar duplicados**: causa fragmentación del backlog.

❌ **Description vacía o "ver Slack"**: contexto perdido a futuro.

❌ **Sin milestone**: la issue queda fuera del avance del project (M0–M6) y no se puede seguir.

❌ **Estimate aspiracional vs realista**: usa 5 si crees que es 3 — siempre acaba siendo más.

❌ **Comprometer más trabajo del que cabe en la semana**: revisa la carga antes.

❌ **Title que es síntoma en vez de acción**: "Login no funciona" → "Corregir validación de password en login"
