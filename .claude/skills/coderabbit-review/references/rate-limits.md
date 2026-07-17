# Rate limits, Fair Usage y presupuesto de reviews

Estado verificado: **2026-06-12** contra docs oficiales vivas (`docs.coderabbit.ai/management/plans`,
`/management/usage-based-addon`, `/configuration/auto-review`, `/reference/configuration`, `/faq`,
`/changelog`, OpenAPI `docs.coderabbit.ai/openapi.json`) y mensajes literales del bot en PRs públicos.
Si han pasado meses desde esa fecha, re-verificar contra las fuentes antes de tomar decisiones de cuota.

## Planes y precios (2026-06)

| Plan | Precio | PR reviews/dev | CLI | Chat | Files/review | Linked repos | MCP servers |
|---|---|---|---|---|---|---|---|
| Free | $0 (trial 14d de Pro+) | 3 (solo summary) | 3 | n/a | 150 | 0 | — |
| OSS | $0 | 1–10 (según proyecto) | 3 | 25 | 150 | — | — |
| Pro | $24/dev/mes anual ($30 mensual) | 5 | 5 | 50 | 300 | 1 | 5 |
| Pro+ | $48/dev/mes anual ($60 mensual) | 10 | 10 | 100 | 300 | 10 | 15 |
| Enterprise | contactar ventas | 12 | 12 | 100 | 300 | 20 | 20 |

Pro+ añade sobre Pro: CodeRabbit Plan / issue planning, generate unit tests, simplify code,
merge conflict resolution, custom pre-merge checks y `finishing_touches.custom` (ver gates abajo).
Add-on aparte: CodeRabbit Agent for Slack a $0.50/minuto de agente activo.

## Mecánica del límite

- **Por developer, por organización.** El bot lo dice literal: "CodeRabbit enforces hourly rate
  limits for each developer per organization". La misma identidad GitHub tiene buckets
  independientes en cada org (Pro+ en una org no se contamina con Pro en otra).
- **Allowance refillable continua** — no hay reset en punto de hora: "reviews become available
  again over time instead of resetting all at once at the top of the hour". La tasa numérica de
  refill NO está publicada.
- **Qué consume 1 review** (cita literal de docs): "Each PR review run uses one PR review from
  this allowance, **including automatic incremental reviews after new pushes**, manual
  `@coderabbitai review`, and manual `@coderabbitai full review`." Cada push a un PR con
  incremental review activo gasta lo mismo que un review manual.
- **Qué NO consume review**: `@coderabbitai rate limit` (garantizado por FAQ: "without consuming
  a review"), `pause`, `resume`, `ignore`, `configuration`, `help`, resolver threads vía GraphQL.
- **Al agotar la cuota**: CR pausa nuevos reviews y postea/edita un comentario de aviso. El review
  bloqueado **NO se reintenta solo** — hay que re-disparar con `@coderabbitai review` tras la
  espera, o empujar un commit nuevo.

Mensaje real del bot (formato observado en PRs públicos, esperas reales de 7–16 minutos):

```markdown
> [!WARNING]
> ## Rate limit exceeded
>
> @usuario has exceeded the limit for the number of commits or files that can
> be reviewed per hour. Please wait **7 minutes and 43 seconds** before
> requesting another review.
>
> ⌛ How to resolve this issue?
> After the wait time has elapsed, a review can be triggered using the
> `@coderabbitai review` command as a PR comment. Alternatively, push new
> commits to this PR.
```

## Fair Usage Limits Policy

Sección oficial: `https://docs.coderabbit.ai/management/plans#fair-usage-limits-policy`
(no es página separada). Diseñada explícitamente para workflows con agentes: "As teams adopt
agents and bots, a single developer identity can open many PRs or repeatedly request reviews
on large changes in a short period."

- **Triggers**: (a) "many PR reviews over a sustained period" de una misma identidad, o
  (b) "a concentrated burst of review requests". Se evalúa "based on recent activity in the
  organization" y "can react more quickly to unusually concentrated bursts".
- **Efecto**: "CodeRabbit may temporarily space out additional PR reviews for that developer" —
  el refill se ralentiza para esa identidad. **La allowance del plan no cambia.**
- **No hay mensaje distinto**: el throttle de fair usage se manifiesta como el mismo aviso
  "Rate limit exceeded" con esperas más largas.
- **Recuperación**: "Reducing or pausing review activity lets recent usage come down over time,
  which can restore faster refill behavior."
- **El add-on usage-based NO bypassa la fair usage** — cubre el over-limit del plan, no el
  espaciado por actividad bot-like de una identidad.

## Mitigaciones (priorizadas)

1. **Batching de pushes** — commitear local con frecuencia, empujar en lotes. Única práctica
   confirmada por experiencias independientes de primera mano y recomendada por el propio bot
   ("We recommend that you space out your commits").
2. **`reviews.auto_review.auto_pause_after_reviewed_commits`** (default 5 desde 2026-02-12) —
   pausa los incrementales tras N commits revisados desde la última pausa; `0` lo desactiva.
   Mitigación oficial de fair usage: ponerlo en `1` o `2` en repos con ramas calientes. Warning
   literal de docs: con `0`, "active branches use review allowance quickly because every eligible
   push can trigger another review". Tras la pausa, el siguiente review se pide con
   `@coderabbitai review` (el contador se resetea al levantar la pausa).
3. **`ignore_usernames: ["dependabot[bot]", ...]`** — los PRs de bots de dependencias se revisan
   por defecto y consumen actividad; excluirlos es práctica estándar. Precedencia absoluta sobre
   los demás controles (match exacto, case-sensitive, sin wildcards).
4. **Drafts + WIP**: `drafts: false` es default (abrir PR como draft y marcar ready al final es el
   opt-out más limpio por PR); `ignore_title_keywords: ["WIP", ...]` salta el review en silencio.
5. **Opt-in por label**: `auto_review.enabled: false` + `labels: ["review-ready"]` invierte el
   default — nada se revisa sin label (la clave `labels` dispara review incluso con `enabled:
   false`). Sintaxis negativa disponible: `"!do-not-review"`.
6. **Por PR**: `@coderabbitai pause`/`resume` (comentario) o `@coderabbitai ignore` (en la
   DESCRIPCIÓN del PR, no en comentario). No consumen cuota.
7. **Add-on usage-based** (Pro/Pro+/Enterprise, no en trial): $1.00 = 1 crédito; $0.25 por archivo
   revisado (4 archivos/crédito). One-time, suscripción mensual o auto-refill (cap mensual mínimo
   $20; si el refill excede el cap, se salta). Se activa en
   `app.coderabbit.ai/settings/subscription?tab=usage` (rol admin). Los créditos se consumen solo
   tras agotar la allowance del seat. Resuelve el muro del límite de plan; NO la fair usage.

## Cómo consultar plan y cuota

- **`@coderabbitai rate limit`** (o `@coderabbitai reviews remaining?`) en cualquier PR — devuelve
  límite y refill timing **sin consumir review**. Desde 2026-04-28 el walkthrough de cada review
  también muestra la cuota restante y cuándo rellena.
- **Dashboard**: `app.coderabbit.ai/settings/subscription` (Billing Overview → card "Plan
  details"; requiere rol Admin/Billing Admin — los members no tienen acceso).
- **NO existe API de subscription/plan/usage** — verificado contra el OpenAPI vivo 2026-06-12:
  los únicos endpoints son reports (deprecated), metrics y audit-logs (Enterprise-only) y gestión
  de seats/roles. Tampoco sirve la API de GitHub Marketplace (solo refleja compras hechas por
  GitHub billing, que no es el flujo normal). Por eso el plan se resuelve con verificación viva:
  el comando `@coderabbitai rate limit` en un PR (el límite delata el plan: 5 = Pro, 10 = Pro+).
- Comandos `@coderabbitai` en ráfaga pueden perderse sin error — esperar a que termine uno antes
  de mandar el siguiente.

## Cómo saber el plan de tu organización

No hay una API para consultarlo. Dos vías fiables:

- **Dashboard**: `app.coderabbit.ai/settings/subscription` (requiere rol Admin/Billing Admin).
- **En un PR**: comenta `@coderabbitai rate limit` — el límite que reporta delata el plan
  (5 reviews/dev = Pro, 10 = Pro+). No consume review.

Si gestionas varias orgs, recuerda que el plan es por organización: la misma identidad GitHub
puede ser Pro+ en una y Pro en otra.

### Gates de features por plan (relevante al compartir `.coderabbit.yaml` entre orgs)

- `pre_merge_checks` built-in (title/description/docstrings/issue_assessment): **Pro**.
- `pre_merge_checks.custom_checks`: **Pro+** (máx 20 por org). En orgs Pro no aplican.
- Finishing Touches: autofix y docstrings = **Pro**; unit tests, simplify, merge conflicts y
  `finishing_touches.custom` (máx 5) = **Pro+**.
- `knowledge_base` / integración Jira-Linear para contexto: **Pro**. CodeRabbit Plan (planning
  de issues): **Pro+**.
- `linked_repositories` por encima del límite del plan: la config se preserva pero "only the
  first N items are active" — trunca sin romper.

Copiar el yaml de un repo Pro+ a un repo de org Pro no rompe nada: las secciones Pro+ se ignoran
en silencio. Documentarlo en el PR si se hace a propósito.

## Calibración para equipos de alto volumen

Si mergeas muchos PRs al día bajo una sola identidad GitHub (por ejemplo, con revisiones
incrementales activas, decenas de review runs/día del mismo developer), estás dentro del
throughput de Pro+ con refill continuo, pero también en el perfil "sustained high-volume +
bursts" que la Fair Usage Policy vigila. Reglas operativas útiles:

1. En gates pre-merge, vigilar el aviso "Rate limit exceeded" — el re-review NO llega solo;
   re-disparar con `@coderabbitai review` tras la espera del mensaje.
2. Espaciar los merges/pushes cuando sea posible (batching > goteo).
3. Si vas a sostener el volumen varios días, valorar el add-on usage-based con compra one-time
   antes de empezar, sabiendo que no exime de fair usage.
4. En orgs Pro (5 reviews/dev) el margen es la mitad — aplicar las mitigaciones con más
   agresividad.

## No verificado (huecos explícitos de la investigación 2026-06-12)

- Tasa numérica del refill (reviews/minuto) — no publicada.
- Formato exacto de la respuesta del bot a `rate limit` y si consume allowance de Chat.
- Si un review pausado por cuota se ejecuta solo al refillar (docs solo dice "pauses new reviews
  until more reviews become available"); el mensaje del bot indica re-trigger manual.
- Si `@coderabbitai review` manual levanta la auto-pausa de `auto_pause_after_reviewed_commits`
  de forma permanente o solo ejecuta ese review (`resume` sí reactiva los automáticos).
- Ventana "rolling 7-day" para medir actividad — apareció en snippets de buscador, NO está en docs
  ("recent activity" sin ventana). Cooldowns de ~30s/10 comandos-min que circulan en skills de
  terceros: sin fuente, especulación.
