# Prompt — Operaciones en lote (batch update)

Plantilla para operaciones que afectan a varias issues a la vez. Linear no tiene mutation `bulk*` — hay que iterar. Este prompt explica cómo hacerlo bien sin chocar con rate limits ni perder datos.

## Cuándo usar

- "Mueve todas las issues con label X al milestone Y"
- "Cambia la prioridad de las issues abiertas del project Z a high"
- "Reasigna al agente IA todas las issues delegadas del milestone actual"
- "Archiva las issues canceladas de hace más de 1 mes"
- "Asigna todas las issues sin owner del backlog a @persona"

## Antes de empezar

Para cualquier batch operation, siempre:

```
1. Confirmar al humano qué se va a tocar (count + sample)
2. Pedir confirmación explícita
3. Ejecutar con throttling
4. Reportar resultados (éxito y errores)
```

**Si la operación afecta a > 20 issues**: usar GraphQL directo o el script `scripts/batch-issues.ts`. El MCP no es ideal para batches grandes (latencia, contexto consumido).

## Patrón base

### Paso 1 — Listar y verificar

```
list_issues(<filtros que el humano pidió>, first=100)
```

Ojo: `first=100` máximo. Si hay más, paginar o pedir filtros más estrictos.

### Paso 2 — Mostrar muestra al humano

```
Voy a actualizar 23 issues con tu cambio:

Sample (primeras 5):
- TAL-87 "Exportar lista de clientes a CSV"
- TAL-91 "Migrar login a Convex Auth"
- TAL-95 "Refactor de la Agenda del día"
- TAL-103 "Configurar CI del build de Next.js"
- TAL-110 "Agregar logs estructurados en mutations"
... (18 más)

Cambio: añadir label `Improvement`

¿Procedo? (yes / no / show all)
```

Esperar confirmación.

### Paso 3 — Ejecutar con throttling

Para cada issue:

```
save_issue(
  identifier="TAL-X",
  <campos a cambiar>
)
```

Con throttle:

```
Ritmo seguro: 5 requests/segundo, espera 200ms entre cada lote.
Para 23 issues: ~5 segundos total.
```

### Paso 4 — Reportar

```
✅ Actualizadas 22/23 issues.
   - 22 exitosas
   - 1 error: TAL-95 (issue archivada, ya no se puede modificar)

¿Quieres que reintente o lo dejamos así?
```

## Patrones específicos

### Patrón 1 — Cambiar labels en lote

**⚠️ Cuidado**: `labelIds` reemplaza el set entero. Si solo quieres añadir, hay que leer + escribir.

Patrón correcto:

```python
for identifier in identifiers:
    issue = get_issue(identifier=identifier)
    current_labels = [l.id for l in issue.labels]
    new_labels = current_labels + [new_label_id]  # añadir
    # o: [l for l in current_labels if l != remove_label_id]  # quitar
    save_issue(identifier=identifier, labelIds=new_labels)
```

Para batches grandes esto duplica las requests. Mejor usar `scripts/batch-issues.ts` que hace ambos en una sola pasada de GraphQL.

### Patrón 2 — Mover de milestone

TAL organiza el trabajo por **milestones** (M0–M6), no por cycles. Para reubicar issues entre milestones:

```python
for identifier in identifiers:
    save_issue(identifier=identifier, projectMilestone="<targetMilestoneId>")
```

Caso real: "mueve estas 5 issues de M4 a M5 porque se replanificó el alcance":

```python
for identifier in ["TAL-87", "TAL-91", "TAL-95", "TAL-103", "TAL-110"]:
    save_issue(identifier=identifier, projectMilestone="<M5-id>")
```

> Nota conceptual: en teams que SÍ usan cycles, Linear mueve automáticamente las issues incompletas al cerrar el cycle. TAL no usa cycles hoy.

### Patrón 3 — Reasignar owner

Cuando alguien sale de vacaciones:

```python
issues_to_reassign = list_issues(
    team="TAL",
    assignee="<persona en vacaciones>",
    stateType=["unstarted", "started"],
    first=50
)

for issue in issues_to_reassign:
    save_issue(identifier=issue.identifier, assignee="<cubrir>")
    save_comment(
        issue=issue.identifier,
        body=f"Reasignada a @{cubrir} mientras @{persona} está fuera. Original owner: @{persona}"
    )
```

### Patrón 4 — Subir prioridad

Cuando un Customer Need agrupa muchas issues y se decide promover:

```python
issues = list_issues(team="TAL", priority=4, label="Improvement", first=50)

for issue in issues:
    if issue_has_customer_needs(issue):  # check via GraphQL
        save_issue(identifier=issue.identifier, priority=2)  # low → high
```

### Patrón 5 — Archivar

Para limpieza:

```python
# Issues canceladas o completadas hace > N días
old_completed = list_issues(
    team="TAL",
    stateType=["completed", "canceled"],
    completedAfter=null,  # filter por completedAt < threshold
    first=100
)

# Linear normalmente las archiva auto. Solo manual si necesario.
for issue in old_completed:
    archive_issue(identifier=issue.identifier)
```

## Operaciones destructivas

Estas operaciones requieren **doble confirmación**:

- `delete_issue` (rara vez la respuesta correcta — preferir Cancel)
- Borrar labels que están en uso
- Archivar projects activos
- Borrar comments

Antes de ejecutar:

```
⚠️ Vas a borrar 12 comments de prueba en TAL-150.
Esta acción es IRREVERSIBLE.

Sample:
- "test test"
- "asdfasdf"
- "deleteme"

Confirma escribiendo "borrar comments" para proceder.
```

Solo proceder si el humano escribe la frase exacta. Si dice "yes" o "ok", no es suficiente.

## Cómo usar el script `batch-issues.ts`

Para batches > 20 issues, conviene usar el script en lugar del MCP:

```bash
# Ver el script completo en scripts/batch-issues.ts
ts-node scripts/batch-issues.ts \
  --filter '{"team":{"key":{"eq":"TAL"}},"label":{"name":{"eq":"Improvement"}}}' \
  --update '{"priority":2}' \
  --dry-run
```

Con `--dry-run` solo muestra lo que haría. Sin él, ejecuta.

El script hace:
1. Paginación automática (no se pierde nada >50)
2. Throttling correcto
3. Retry on rate limit
4. Logging detallado
5. Diff antes de cada update

## Anti-patrones de batch

❌ **Ejecutar sin confirmar al humano**: si te equivocas con el filtro, tocas decenas de issues incorrectas.

❌ **Sin throttling**: rate limit y posible bloqueo temporal del API.

❌ **Sin dry-run para >20 issues**: ejecutar a ciegas es peligroso.

❌ **Update con `labelIds` sobrescribiendo todo**: si no leíste antes, pierdes labels.

❌ **No reportar errores**: si 5 de 50 fallan y no avisas, hay inconsistencia silenciosa.

❌ **Ejecutar batch mientras el equipo trabaja las issues in progress**: las modificaciones masivas a issues "in progress" desorientan al equipo. Hacerlo viernes tarde / lunes muy temprano.

❌ **Olvidar comentar en cada issue por qué cambió**: para cambios significativos, breve comment ayuda al owner a no preguntarse "qué pasó".
