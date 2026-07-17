# Prompt — Reporte semanal

Plantilla para generar el reporte semanal del equipo Talent Academy Curso (TAL). Útil los viernes para compartir con la dueña y los interesados lo entregado en la semana.

## Output esperado

Un Markdown que se puede compartir por:
- Slack (canal del equipo o mensaje directo con la dueña)
- Email
- Document en Linear (asociado al workspace)

Estructura:

```markdown
# CRM Pulse — Semana del <fecha-fecha>

## TL;DR
[1-2 frases con lo más relevante. Lo que el lector se llevaría
si solo leyera esto.]

## Por milestone (project PROY CRM Pulse)

### M2 · Autenticación, acceso y usuarios
- Entregado: ...
- En progreso: ...
- Riesgos: ...

### M3 · Gestión de clientes
[idem]

### M4 · Seguimiento e interacciones
[idem]

### M5 · Ventas
[idem]

## Métricas
- Velocity: X/Y puntos completados (Z%)
- Issues cerradas: N
- Bugs detectados: M (de los cuales X críticos)
- Deploys a main: P

## Highlights
[2-4 cosas notables, con contexto humano. No solo issues.]

## Próxima semana
[Top 3-5 prioridades de la próxima semana]

## Solicitudes / bloqueos
[Cosas que el equipo necesita de fuera]
```

## Cómo generarlo

### Paso 1 — Recoger los datos

```
1. TAL no usa cycles: el corte es la SEMANA. Fija el lunes de la semana en
   ISO como umbral (p. ej. "2026-07-13").

2. Issues completadas esta semana:
   list_issues(
     team="TAL",
     project="PROY CRM Pulse",
     stateType="completed",
     completedAfter="<lunes-de-esta-semana ISO>",
     first=100
   )

3. Issues en progreso (aún activas):
   list_issues(
     team="TAL",
     project="PROY CRM Pulse",
     stateType=["started", "unstarted"],
     first=100
   )

4. Bugs nuevos creados esta semana:
   list_issues(
     team="TAL",
     label="Bug",
     createdAfter="<lunes-de-esta-semana ISO>",
     first=50
   )

5. (Opcional, solo si el workspace usa Customer Needs) demanda de usuarios
   procesada esta semana, vía GraphQL:
   query CustomerNeedsThisWeek { ... }
```

### Paso 2 — Agrupar por milestone

Para cada issue completada, extraer su `projectMilestone.name`. Agrupar (TAL no usa initiatives):

```
M3 · Gestión de clientes:
  - TAL-101 (Done)
  - TAL-103 (Done)
  - TAL-110 (In Progress)

M4 · Seguimiento e interacciones:
  - TAL-87 (Done)
  - TAL-95 (In Progress)
```

### Paso 3 — Generar prosa por sección

Para cada milestone con actividad:

```markdown
### M3 · Gestión de clientes

**Entregado**:
- Lista y ficha de cliente v1 (TAL-101, TAL-103).
  [Highlight humano si aplica: "La dueña ya la usa para dar de alta clientes."]

**En progreso**:
- TAL-110 "Exportar clientes a CSV", entrega esperada el lunes.

**Riesgos**:
- M4 (seguimiento) puede retrasarse si no cierra el diseño esta semana.
```

NO listar issues sin contexto. **Sintetizar**: "varios fixes de auth" es mejor que TAL-87, TAL-91, TAL-95 listados.

### Paso 4 — Calcular métricas

```
velocity_planned = sum(estimate de las issues comprometidas el lunes para la semana)
                  // dato del Project Update del lunes

velocity_completed = sum(estimate de las issues ahora en state Done esta semana)

bugs_new = count(issues creadas esta semana con label Bug)
bugs_critical = count de esas con priority=1

deploys_main = pushes a main que dispararon deploy en Railway esta semana
```

Algunos datos requieren consultar Railway o el historial de git si no están en Linear.

### Paso 5 — Highlights

Esta es la parte humana. Pregúntate:

```
- ¿Hubo alguna entrega especialmente impactante?
- ¿Algún bug crítico resuelto rápido (S1)?
- ¿Algún logro del equipo IA destacable?
- ¿Alguna métrica de producto mejorada (si tenemos visibilidad)?
- ¿Algún reconocimiento que merece visibilidad?
```

Escribir 2-4 highlights concretos, no genéricos:

```
✓ "Publicamos la Agenda del día; la dueña ya la usa para no perder seguimientos"
✓ "Resuelto S1 de login en 23 min (TAL-99). Post-mortem en la issue."
✓ "@persona sacó 4 cambios, incluido el refactor de la ficha de cliente."

✗ "Buen trabajo del equipo"  ← genérico, sin sustancia
✗ "Cerramos 11 issues"        ← ya está en métricas
```

### Paso 6 — Próxima semana

Lo que se planificó para la próxima semana. Para esto, mira el Todo/backlog priorizado del project:

```
list_issues(team="TAL", project="PROY CRM Pulse", stateType="unstarted", first=50)
```

(Si la próxima semana aún no se planifica, mejor escribir "TBD lunes".)

### Paso 7 — Solicitudes / bloqueos

Si el equipo necesita algo de fuera:

```
- "Esperando diseño de M4 (seguimiento). @persona-diseño"
- "Necesitamos credenciales de API X. CC @stakeholder"
- "Decisión pendiente: ¿migrar BD ahora o post-lanzamiento?"
```

Incluir si y solo si hay algo concreto. NO inventar bloqueos por relleno.

### Paso 8 — Output final

Pegar todo el Markdown estructurado.

Opcionalmente, crear como Document en Linear:

```
mutation documentCreate({
  title: "Reporte semanal — CRM Pulse (semana del <fecha>)",
  content: "<markdown>",
  // sin project parent → es workspace document
})
```

O simplemente devolver el Markdown al humano para que lo copie/pegue.

## Variantes

### Variante A — Reporte para la dueña (más alto nivel)

Menos detalle técnico, más impacto:

```
- Foco en milestones (avance del MVP), no en issues individuales
- Métricas de producto si están disponibles (no solo de Linear)
- Quitar la sección "Bugs nuevos detectados" (irrelevante a nivel ejecutivo)
- Highlights centrados en valor entregado, no en cantidad
```

### Variante B — Reporte interno solo del equipo

Más detalle, más honesto:

```
- Incluir issues que NO se completaron y por qué
- Lecciones aprendidas (de retro)
- Trabajo IA: % aceptación, casos de fricción
- Comentarios crudos sobre fricción interna (process, herramientas)
```

### Variante C — Reporte mensual

Agregando 4 semanas:

```
- Velocity trend (4 puntos)
- Milestones status (cambios significativos en el avance del MVP)
- Releases grandes del mes
- Top issues por impacto, no por count
```

## Anti-patrones

❌ **Solo listar identifiers de issues**: ruido, sin valor para el lector.

❌ **Reporte que repite Linear UI**: si el lector ya tiene Linear, ¿por qué leer un dump?

❌ **Métricas sin contexto**: "Velocity 14 puntos" no dice nada sin comparativa.

❌ **Highlights genéricos**: "buen trabajo del equipo" no aporta. Sé específico.

❌ **Reportar todos los milestones aunque no haya actividad**: si esta semana no hubo movimiento en uno, omitirlo con "(sin actividad esta semana)" o no listarlo.

❌ **Omitir riesgos por miedo a transparentar**: el reporte sin riesgos huele a barniz. Si todo está perfect siempre, nadie te cree.

## Tip — Automatización

Una vez tengas un patrón estable, este reporte puede:

1. Generarse automáticamente en un cron (viernes 5pm)
2. Postearse a Slack #crm-pulse
3. Crearse como Document en Linear automáticamente

Implementación de referencia: usar `scripts/linear-client.ts` con un nuevo script `weekly-report.ts` que ejecute todos los queries y formatee el markdown.
