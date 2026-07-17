# Title (replace this)

[Imperativo + qué + dónde]

---

> **Issue delegada a agente IA**. Asignar el agente como `delegate`; el humano `assignee` revisa el PR. (El label `actor/ai` es ASPIRACIONAL: en TAL no existe hoy; los únicos labels son `Feature`, `Bug`, `Improvement`.)

## Contexto

[Por qué este trabajo. Vínculo con el project/milestone si aplica (en TAL no hay initiatives).]

## Tarea

[Descripción clara y acotada. Si es bug, ver bug.md. Si es feature, ver feature.md.]

## Por qué es delegable

- ✅ Scope < 1 día de trabajo
- ✅ Tests existentes en el repo
- ✅ No toca infra crítica (auth/payments/migrations)
- ✅ Sin ambigüedad de producto/UX
- ✅ Repro reproducible (si es bug)
- ✅ Especificación clara de input/output

## Criterios de aceptación

- [ ] Criterio verificable 1
- [ ] Criterio verificable 2
- [ ] Tests existentes pasan
- [ ] Test añadido para el cambio
- [ ] PR vinculado a esta issue con `Closes TAL-X`
- [ ] Branch name: `ai/TAL-X-<slug>`

## Información para el agente

### Archivos relevantes
[Lista de archivos donde está el cambio]
- `src/path/to/file.ts`
- `src/path/to/other.ts`

### Approach sugerido
[Plan de 3-5 pasos claros]
1. ...
2. ...
3. ...

### Tests a añadir
```typescript
test('caso esperado', () => {
  // ...
});

test('edge case 1', () => {
  // ...
});
```

## Out of scope

- ❌ X (otra issue si se necesita)
- ❌ Y (no entra aquí)

## Reviewer

@<humano> — revisará el PR (en TAL no hay estado "In Review"; el flujo es In Progress → Done).

## Restricciones específicas

- NO modificar X sin discutir
- NO añadir nuevas dependencies
- Mantener estilo del archivo (linting)

---

**Labels sugeridos**: `Feature` / `Bug` / `Improvement` (los únicos del workspace; `actor/ai` es ASPIRACIONAL, no existe hoy)
**Delegate**: nombre del agente (tu agente IA, code-agent, etc.)
**Assignee**: humano que va a revisar
**Estimate**: 1, 2 o 3 (issues IA mejor pequeñas)

## Después de cerrar

Si la issue se completó sin problemas → great.

Si requirió mucho rework humano → comentar en la issue qué falló (lección para futuras delegations). (El label `actor/needs-review` es ASPIRACIONAL: en TAL no existe hoy.)
