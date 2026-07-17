# Prompt — Issue template para Features

Plantilla específica para issues de tipo Feature. Usar al crear cualquier issue con label `Feature`.

## Estructura

```markdown
## Contexto

[1-2 párrafos: ¿por qué esta feature? ¿qué problema resuelve?
¿quién la usará? ¿en qué milestone del project encaja?]

## Comportamiento esperado

[Descripción precisa de lo que el usuario debe poder hacer/ver
después de completar esta issue. Como user story si aplica.]

Como [tipo de usuario]
quiero [acción]
para [beneficio]

## Criterios de aceptación

- [ ] Criterio medible 1
- [ ] Criterio medible 2
- [ ] Criterio medible 3
- [ ] Tests añadidos para el happy path
- [ ] Tests añadidos para edge cases identificados

## Diseño / mockup

[Link a Figma, screenshot, o descripción visual si aplica]

## Implementación sugerida

[High-level. NO escribir código aquí — solo dirección.]
- Endpoint: `POST /api/...`
- Componente: `<NewComponent>`
- DB: nueva columna en `users.preferences`

## Out of scope

[Lo que explícitamente NO entra en esta issue. Importante para no scope-creep.]
- ❌ X (será otra issue)
- ❌ Y (decidiremos después)

## Dependencias

[Si depende de otra issue, link. Si depende de algo externo, mencionar.]
- Bloqueada por TAL-99 (necesitamos el login nuevo primero)
- Requiere acceso a API X (pendiente credenciales)

## Notas técnicas

[Solo si hay decisiones arquitectónicas, gotchas conocidos, refs a docs internos]

## Recursos

[Links a specs, decision records, customer requests relacionadas]
- [Customer request original](link)
- [Spec en Notion](link)
```

## Checklist de calidad antes de crear

Antes de meter el issue, verifica:

- [ ] **Title** es imperativo, claro y específico (no "Feature X" sino "Implementar X en Y")
- [ ] **Contexto** responde al "por qué" no solo al "qué"
- [ ] **Criterios de aceptación** son verificables (checkbox-able)
- [ ] **Out of scope** está poblado (al menos "ninguno por ahora")
- [ ] **Estimate** es ≤ 5 (si más, descomponer)
- [ ] **Label** = `Feature`
- [ ] **Priority** está puesta (no None)
- [ ] **Project** = `PROY CRM Pulse` (salvo trabajo post-MVP)
- [ ] **Milestone** (M0–M6) asignado

## Ejemplos de buenas features

### Ejemplo 1 — Backend feature

```markdown
# Title
Añadir query de estadísticas de ventas por vendedor

## Contexto

La dueña necesita ver el total de ventas ganadas agregado por vendedor
(no venta por venta) para revisar el desempeño del equipo.
Hoy tiene que abrir cada cliente y sumar a mano, lo cual no escala.

Esta query lo habilita y evita los cálculos manuales.

## Comportamiento esperado

Como dueña
quiero una query de Convex que reciba un rango de fechas
para obtener métricas agregadas por vendedor (ventas ganadas, monto total, nº de clientes).

## Criterios de aceptación

- [ ] La query devuelve, por vendedor, `{ ganadas, montoTotal, clientes }`
- [ ] Acepta `desde` y `hasta` (fechas ISO), default últimos 30 días
- [ ] Acepta `agrupar=dia|semana|mes`
- [ ] Autorización dentro de la query: solo el rol `dueña`
- [ ] Ignora clientes y ventas archivados
- [ ] Test cubriendo rangos válidos e inválidos
- [ ] Test cubriendo el caso sin datos (devolver ceros)

## Implementación sugerida

- Derivar estado y valor en la query (no persistirlos; ver CLAUDE.md)
- Reutilizar los helpers de `convex/lib/derivados.ts`
- Filtrar por `archivado != true`

## Out of scope

- ❌ Stats por cliente individual (será otra issue)
- ❌ Export CSV (TAL-XXX si se necesita después)
- ❌ Realtime más allá de la reactividad nativa de Convex

## Dependencias

- El rol `dueña` ya existe (TAL-50, Done)

## Recursos

- [Solicitud original de la dueña](link)
```

### Ejemplo 2 — Frontend feature

```markdown
# Title
Agregar filtro por estado en la lista de clientes

## Contexto

La lista de clientes muestra todos los clientes mezclados. Los vendedores
quieren filtrar por estado (nuevo lead, en negociación, ganado, perdido)
para enfocarse en los que requieren seguimiento.

## Comportamiento esperado

Como vendedor
quiero seleccionar un estado en la lista de clientes
para ver solo los clientes y contadores de ese estado.

## Criterios de aceptación

- [ ] Filtro arriba de la lista, con opciones:
      Todos / Nuevo lead / En negociación / Ganado / Perdido
- [ ] Al cambiar la selección, la lista y los contadores
      se actualizan
- [ ] La selección persiste en la URL (`?estado=en_negociacion`) para enlaces compartibles
- [ ] "Todos" muestra el comportamiento actual
- [ ] Loading state visible durante el cambio
- [ ] Mobile-friendly (375px) y escritorio (≥1280px)

## Diseño / mockup

[Link al diseño "Clientes - filtro por estado" en design/PROY CRM Pulse]

## Implementación sugerida

- Componente `<FiltroEstado>` reutilizable
- Estado en la URL vía Next.js searchParams (no en local state)
- El estado del cliente se DERIVA en la query, no se persiste (ver CLAUDE.md)

## Out of scope

- ❌ Filtros combinados (estado + propietario) — TAL-XXX si se necesita
- ❌ Guardar la preferencia del usuario — otra issue

## Dependencias

- TAL-78 query de clientes con estado derivado, Done
- Diseño confirmado

## Recursos

- [Diseño](link)
- [TAL-78 query de clientes](link)
```

## Plantilla minimalista

Para features muy pequeñas (estimate 1-2), versión reducida:

```markdown
## Qué
[1 frase sobre qué hace la feature]

## Por qué
[1 frase sobre por qué importa]

## Criterios
- [ ] Cosa 1
- [ ] Cosa 2
- [ ] Test

## Notas
[Si hay alguna]
```

## Anti-patrones

❌ **Description = title repetido**: si la description no añade nada al title, no la metas.

❌ **Criterios vagos**: "que funcione bien" no es verificable. "Endpoint responde 200 con shape X" sí.

❌ **Mezclar features en una issue**: si hay "Y, Z, y W" → tres issues o sub-issues.

❌ **Implementación detallada con pseudocódigo**: no en la issue, en el PR. La issue dice qué, no cómo en detalle.

❌ **Falta de "out of scope"**: invita scope-creep durante development.

❌ **Sin dependency tracking**: si depende de otra issue, mencionarlo evita arrancar bloqueado.

❌ **Customer-driven sin link al customer need**: si vino de feedback, vincularlo via Customer Need.
