# Workflow — Bug handling

Manejo de bugs end-to-end: desde reporte hasta cierre. Este flujo es distinto al de features porque los bugs requieren repro verificable y pueden ser urgent (afectando producción).

## Cuándo ejecutar

- Cuando alguien reporta un comportamiento inesperado
- Cuando un test/CI falla en main
- Cuando hay errores en Sentry / logs / monitoreo
- Cuando un usuario externo reporta algo via support

## Paso 1 — Recoger el reporte

Antes de crear la issue, juntar la info mínima:

```
1. Síntoma: ¿qué pasa que no debería?
2. Repro: pasos exactos para reproducir
3. Resultado esperado vs observado
4. Ambiente: producción / staging / local
5. Frecuencia: siempre / a veces / 1 sola vez
6. Severidad: ¿afecta a usuarios pagados? ¿bloquea revenue?
7. Evidencia: logs, screenshots, error messages, sentry link
```

Si falta repro reproducible → **NO crear issue todavía**. Pedir más info al reporter. Bugs sin repro son ruido.

## Paso 2 — Buscar duplicados

```
list_issues(
  team="TAL",
  query="<keywords del síntoma>",
  label="Bug",
  first=10,
  includeArchived=false
)
```

Si encuentras un bug similar:
- En estado abierto → **comentar en ese**, no crear nuevo. Añadir info adicional como evidencia.
- Cerrado pero reciente (último mes) → puede ser regresión. Crear nuevo bug, vincular como `relatedTo` el cerrado.
- Cerrado hace tiempo → crear nuevo bug.

## Paso 3 — Determinar severidad y prioridad

**Severidad** (interna, para triage):

| Severity | Significado |
|---|---|
| S1 — Crítico | Producción caída. Revenue o seguridad afectados |
| S2 — Alto | Feature crítica rota. Workaround difícil |
| S3 — Medio | Feature secundaria rota. Workaround existe |
| S4 — Bajo | Cosmético, edge case. Sin impacto real |

**Mapeo a Linear priority**:

| Severity | Linear priority | Cuándo |
|---|---|---|
| S1 | Urgent (1) | Hoy. Drop everything. |
| S2 | High (2) | En curso (milestone activo) |
| S3 | Normal (3) | Backlog / próximo milestone |
| S4 | Low (4) | Backlog, sin compromiso |

> TAL no usa cycles: el "cuándo" se prioriza por project + milestones, no por sprint semanal.

## Paso 4 — Crear el bug

Usar plantilla `examples/issue-templates/bug.md`:

```
save_issue(
  team="TAL",
  title="<descripción concisa del síntoma>",
  description="<usar plantilla bug.md>",
  labels=["Bug"],  // en TAL solo existen Feature, Bug, Improvement (sin vertical/area)
  priority=<según severity>,
  project="PROY CRM Pulse",  // + projectMilestoneId (M0–M6) si aplica; TAL no usa cycles
  state="In Progress" if S1 (drop everything),
  assignee="<quien va a investigar>"
)
```

## Paso 5a — Si es S1 (urgent / hot fix)

Flujo separado más rápido:

```
1. Crear el bug con priority=1, state=In Progress (en el milestone activo; TAL no usa cycles)
2. Notificar al equipo (Slack manual, no esperar Linear notifications)
3. Asignar al humano más cercano al área afectada
4. Investigación + fix en branch dedicado (NO esperar al cycle planning)
5. Hot fix → PR → merge → deploy
6. Post-mortem en comment de la issue (o documento si es grande)
7. ¿Es delegable a IA? → NO para S1. Humano siempre.
8. Cerrar issue con merge del PR
9. Una vez resuelto, comment con timeline:
   - Detectado: HH:MM
   - Diagnosticado: HH:MM
   - Fix mergeado: HH:MM
   - Deployado: HH:MM
   - Tiempo total: X minutos
```

## Paso 5b — Si es S2 / S3

Flujo normal:

```
1. Crear el bug con priority y labels correctos
2. Si S2 → priorizar en el milestone activo
3. Si S3 → backlog / próximo milestone
4. Si tiene repro automatizable y scope claro → delegable a IA (campo delegate; TAL no tiene label actor/*)
5. Si requiere investigación → humano
6. Asignar
```

## Paso 5c — Si es S4

```
1. Crear con priority=4, en backlog
2. Backlog
3. Etiquetar bien para que sea encontrable
4. Posiblemente nunca se haga; aceptarlo
```

## Paso 6 — Investigación

Para bugs no triviales, comentar el avance en la issue:

```
save_comment(
  issue="TAL-X",
  body=`## Investigación

### Lo que sé
- ...

### Lo que descarté
- No es A porque ...
- No es B porque ...

### Hipótesis actual
- C, porque ...

### Próximos pasos
- ...`
)
```

Esto preserva el knowledge y hace fácil que otra persona retome.

## Paso 7 — Fix

Patrón estándar:

```
1. Branch: bug/TAL-X-<slug>  (o ai/TAL-X-<slug> si delegado a IA)
2. Test que reproduce el bug (debería fallar antes del fix)
3. Fix mínimo
4. Test debe pasar
5. PR con "Fixes TAL-X"
6. Review humano
7. Merge → automation cierra issue
```

**Para S1**, branch `hotfix/TAL-X-<slug>`, deploy directo a producción tras review.

## Paso 8 — Verificación post-fix

Antes de marcar como Done:

- [ ] Test añadido cubre el bug
- [ ] Manual: reproducir el bug original — ya no ocurre
- [ ] No regresiones detectadas (CI verde)
- [ ] Si afectaba producción, verificado en producción

## Paso 9 — Documentación post-mortem (solo S1)

Para cualquier S1, post-mortem brevísimo en la issue:

```
## Post-mortem

### Qué pasó
[1 párrafo]

### Causa raíz
[Por qué pasó técnicamente]

### Por qué no lo detectamos antes
[Análisis honesto]

### Cómo prevenir similares
- [ ] Acción 1
- [ ] Acción 2
```

Las "acciones de prevención" se convierten en sub-issues o issues nuevas (label `Improvement`).

## Anti-patrones de bug handling

❌ **Crear issue sin repro reproducible**: ruido. Pedir info primero.

❌ **No buscar duplicados antes de crear**: causa que se trabajen en paralelo bugs idénticos.

❌ **Marcar como S1 todo lo que parece urgent al humano que reporta**: la severidad es objetiva (impacto medible), no subjetiva (urgencia percibida).

❌ **Delegar S1 a IA**: el riesgo es alto y la ambigüedad inicial también. Humano siempre.

❌ **Cerrar bug sin test de regresión**: el bug volverá.

❌ **No documentar post-mortem en S1**: perdemos la lección. Mínimo 1 párrafo.

❌ **Investigar sin documentar avance**: si pausas o alguien retoma, no hay continuidad.

❌ **Hot fix sin review** (incluso en S1): siempre 4 ojos. Aunque sea rápido (5 min de review).

## Patrones útiles

### Bug con repro intermitente

Más difícil. Patrón:

```
1. Issue con label `Bug` y nota "intermitente" en el título/descripción (TAL no tiene label investigation/*)
2. Añadir más logging primero (sub-issue)
3. Esperar que ocurra de nuevo con logs activos
4. Una vez con logs, repro estable → fix normal
```

### Bug que no es bug (es feature mal entendida)

```
1. Verificar en spec / docs
2. Si sí es comportamiento esperado → cerrar como Canceled con razón
3. Pero crear sub-issue con label `Improvement` si la documentación es ambigua
```

### Bug que requiere coordinación con servicio externo

```
1. Marcar la dependencia externa en la descripción (TAL no tiene label external-blocker)
2. Comentar dependencia (ticket en JIRA del partner, etc.)
3. State = Backlog hasta que la dependencia se resuelva
4. NO comprometerla en el milestone activo (no podemos terminarla)
```
