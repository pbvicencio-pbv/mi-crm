# Workflow — Feedback a Issue

Convertir feedback (del dueño, de usuarios del CRM, de sesiones de prueba) o de stakeholders externos en issues bien estructuradas en Linear, conservando trazabilidad al origen vía Customer Needs.

## Cuándo ejecutar

- El dueño pega un thread o chat con feedback
- El humano forwarda un email de un partner
- El humano dice "mira lo que me preguntó X, hay que hacer algo"
- Llega un ticket de support
- Hay un comentario en el changelog público

## Paso 1 — Identificar items de trabajo

Un thread de Slack puede contener:

- 0 items (solo conversación)
- 1 item (un pedido claro)
- N items (múltiples pedidos en la misma conversación)

Para cada item identificable:

1. ¿Es **petición de feature**, **reporte de bug**, o **pregunta**?
2. ¿Tiene scope claro o necesita aclaración?

Si necesita aclaración:
- **NO crear issue todavía**
- Pedir al humano que aclare con el reporter
- Cuando vuelva con info → seguir paso 2

## Paso 2 — Crear Customer si no existe

En TAL no hay equipos verticales internos; los "customers" son stakeholders o usuarios del CRM (p. ej. el dueño del negocio, vendedores que lo prueban). Crearlos si no existen (Customer Needs es una función de Linear que puede requerir habilitarse):

```
mutation customerCreate({
  name: "Vendedores piloto",  // o "Dueño del negocio", etc.
  domain: null,           // no aplica para internos
  externalIds: [],
  tier: null
})
```

(Esta mutation no está en MCP — usa GraphQL directo o linear-client.ts)

Customers externos (sponsors, partners externos) sí pueden tener domain.

## Paso 3 — Decidir: ¿Customer Need o Issue directa?

**Customer Need** — si:
- El feedback viene de un canal/persona externa al equipo TAL
- Quieres preservar la fuente para mostrar al stakeholder "te escuchamos"
- Hay potencial de varios feedbacks similares para bundlear

**Issue directa** — si:
- El feedback viene de alguien dentro de TAL
- Es un follow-up técnico interno (de un retro, de un debug session)
- No hay valor en preservar el "quién pidió"

En TAL (equipo interno y pequeño), lo habitual es Issue directa; reserva Customer Need para feedback externo que quieras rastrear.

## Paso 4 — Crear el Customer Need + Issue

Patrón "from need to ticket":

### Si va a ser una issue nueva:

```
1. Crear el issue (bien estructurado, con todo el triage hecho)
2. Crear el Customer Need vinculado al issue:

mutation customerNeedCreate({
  customerId: "<uuid del customer>",
  body: "<texto del feedback original, casi literal>",
  issueId: "<uuid del issue creado>",
  priority: 2  // basado en triage del issue
})
```

### Si vincular a issue existente:

```
mutation customerNeedCreate({
  customerId: "<uuid del customer>",
  body: "<feedback>",
  issueId: "<uuid del issue existente>",
  priority: 2
})
```

Esto incrementa el contador de Customer Needs en esa issue → **señal fuerte de demanda**.

## Paso 5 — Si el feedback genera múltiples issues

A veces un thread genera 3-5 issues. Patrón:

```
1. Crear cada issue con triage completo (vertical, type, priority, estimate)
2. Crear UN solo Customer Need con bundleId compartido:
   - need_1: customerId, body, issueId=A, bundleId="xyz123"
   - need_2: customerId, body, issueId=B, bundleId="xyz123"
   - need_3: customerId, body, issueId=C, bundleId="xyz123"
3. Esto agrupa los needs en la UI del Customer
```

## Paso 6 — Adjuntar la fuente

El Customer Need por sí mismo es metadata. Para preservar la fuente original (Slack thread, email):

```
mutation attachmentLinkURL({
  issueId: "<uuid>",
  url: "<link al thread de Slack o email>",
  title: "Solicitud original de @<persona>",
  subtitle: "<resumen 1 línea>"
})
```

Si el thread de Slack es interno y el link no es público fuera del workspace de Slack, está bien — el equipo de TAL sí puede acceder.

## Paso 7 — Confirmar al humano

Resumen para validación:

```
✅ Procesado feedback de @persona en #canal-X.

Issues creadas:
- TAL-101: "Añadir exportación a PDF de la ficha de cliente"
  → label Feature, priority high, estimate 3
  → vinculado a Customer Need
- TAL-102: "Corregir cálculo del último contacto en la Agenda del día"
  → label Bug, priority medium, estimate 2
  → vinculado a Customer Need

Customer: "Vendedores piloto"
Customer Needs creados: 2 (bundle compartido)

Thread adjunto a ambas.
```

## Paso 8 — Comunicar al solicitante

Una buena práctica (humana, no automatizable):

```
"Gracias por el feedback. Hemos creado las issues TAL-101 y TAL-102.
Esperamos abordar la primera pronto y la segunda más adelante.
Te avisamos cuando estén listas."
```

Linear no envía esto automáticamente — es responsabilidad del humano que recibió el feedback.

## Patrones específicos

### Patrón A — El feedback es ambiguo

```
"Estaría bien que el dashboard fuera más rápido."

→ NO crear issue. Pedir aclaración al humano:
   "Más rápido en qué? Cuál es la página/acción específica? Qué tan rápido?"
```

Cuando vuelva con datos concretos, crear.

### Patrón B — El feedback es duplicado de algo en backlog

```
list_issues(team="TAL", query="<keywords del feedback>", first=10)

→ Si hay match:
   1. NO crear nueva issue
   2. Crear Customer Need vinculado a la EXISTENTE
   3. Considera subir prioridad si era baja (varios needs = más demanda)
```

### Patrón C — El feedback es realmente sobre operación (no desarrollo)

A veces llega feedback que no es de desarrollo:

```
"¿Pueden hacer un post sobre X?"

→ NO crear issue en TAL.
→ Recordar al solicitante que TAL solo hace desarrollo.
→ Redirigir al canal/persona correcto.
```

### Patrón D — El feedback es preguntar cómo usar algo existente

```
"¿Cómo configuro X en el dashboard?"

→ NO crear issue para "implementar X" si X ya existe.
→ Crear issue con label Improvement si la docs es ambigua.
→ Responder al solicitante con instrucciones.
```

## Anti-patrones

❌ **Crear una issue por cada mensaje de Slack sin filtrar**: el 90% no es trabajo.

❌ **Issues con descriptions tipo "ver thread"**: si el thread se borra/archiva, pierdes el contexto. Copia lo importante a la description.

❌ **Customer Needs sin Customer**: pierdes la trazabilidad agregada. Crea el Customer primero.

❌ **Vincular Customer Need a Project en lugar de Issue**: para feedback puntual, Issue. Project Customer Needs son para "demanda agregada de algo grande".

❌ **No comunicar al solicitante**: si nadie le dice que se hizo, asume que fue ignorado y deja de reportar.

## Tip — automatización futura

Linear soporta integración nativa con:
- Intercom → Customer Needs auto
- Zendesk → idem
- Slack → webhook personalizado posible

Si el feedback llega por Slack de forma intensiva, considerar configurar:
- Bot de Slack que captura mensajes con cierta sintaxis (ej: `/feedback`)
- Lo manda a un endpoint
- El endpoint crea Customer Need automáticamente vinculado al canal

Pendiente, no urgente. Primero validar que el flujo manual funciona.
