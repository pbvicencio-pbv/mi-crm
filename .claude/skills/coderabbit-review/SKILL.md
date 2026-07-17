---
name: coderabbit-review
description: "Workflow de CodeRabbit para GitHub App. Cargar este skill cuando la tarea implique GitHub, git push, subir cambios a GitHub, abrir o actualizar PR, pull request, merge, revisión de CodeRabbit, @coderabbitai, .coderabbit.yaml, triage de comentarios, resolver threads, reducir ruido de review, configurar filtros o idioma, dar de alta CodeRabbit en un repo, medir calidad del review, rate limits, fair usage, cuota de reviews o detección de plan (Pro/Pro+). Cubre setup, YAML, triage, fixes, resolución de hilos, chat commands, métricas y presupuesto de reviews. Paso 0: detectar el plan de la cuenta/organización y trabajar acorde a él. No usar el CLI salvo petición explícita del usuario."
license: MIT
---

# CodeRabbit: workflow experto para revisión de PRs con la GitHub App

Esta skill convierte a Claude Code en un experto trabajando con CodeRabbit instalado como **GitHub App** (no el CLI de pago). Cubre el ciclo completo: setup inicial de un repo, plantillas de configuración por tipo de proyecto, y workflow para leer, triagear y resolver comentarios de review.

## Cuándo debe cargarse

Cargar esta skill antes de proceder si la tarea menciona o implica cualquiera de estos casos:

- GitHub en el contexto de subir cambios, abrir o actualizar un PR, mergear o preparar una revisión.
- `git push`, "subir a GitHub", "abre un PR", "actualiza el PR", "haz merge", "revisa el PR".
- CodeRabbit, `@coderabbitai`, `.coderabbit.yaml`, comentarios de review, threads de review o tuning de ruido del review.

Si además existe un `AGENTS.md` del repo con reglas específicas sobre PRs o CodeRabbit, esta skill se usa junto con esas reglas, no como sustituto.

## Contexto crítico: integración y plan

CodeRabbit tiene dos formas de integración. La skill asume la primera:

1. **GitHub App (incluido en el seat: Pro $24/dev/mes anual, Pro+ $48)** — el bot revisa cada PR automáticamente y publica comentarios. **Usar esto.**
2. **CodeRabbit CLI (`coderabbit review`)** — desde 2026 está incluido en el seat con cuota propia por plan (Pro 5 / Pro+ 10 CLI reviews por dev), ya no se cobra aparte. Aun así este workflow es GitHub App only: **no usar el CLI** salvo petición explícita del usuario.

### Paso 0 — Detectar el plan de la cuenta/organización (SIEMPRE primero)

Los límites de CodeRabbit son **por developer y por organización**, y varios features del yaml dependen del plan. Antes de operar (setup, triage, loop, config), ejecutar:

```bash
bash <SKILL_DIR>/scripts/detect_plan.sh
```

No existe API pública de subscription de CodeRabbit para resolver el plan automáticamente. Determínalo por dos vías: consulta tu plan en `app.coderabbit.ai/settings/subscription`, y/o comenta `@coderabbitai rate limit` en un PR (no consume review) para ver la cuota viva. Adaptar el trabajo al plan detectado:

- **Pro+ (10 reviews/dev, chat 100)**: margen para re-reviews en gates; `pre_merge_checks.custom_checks` y `finishing_touches.custom` disponibles.
- **Pro (5 reviews/dev, chat 50)**: presupuesto a la mitad — batching de pushes agresivo, valorar `auto_pause_after_reviewed_commits: 1-2`; las secciones Pro+ del yaml se ignoran en silencio (no rompen).

Presupuesto completo, Fair Usage Policy y mitigaciones: `references/rate-limits.md`.

### Verificar que CodeRabbit está activo en el repo

```bash
gh api repos/:owner/:repo/installation 2>/dev/null | jq -r '.app_slug' | grep -i coderabbit
```

También revisar si existe `.coderabbit.yaml` o `.coderabbit.yml` en la raíz del repo.

## Arquitectura del workflow

CodeRabbit publica dos tipos de comentarios en un PR:

- **Review comments (inline)** — adjuntos a líneas específicas. Son los que importan para fixing. Tienen un `thread_id` con prefijo `PRRT_` (Pull Request Review Thread) accesible solo por GraphQL.
- **Issue comments (top-level)** — el walkthrough, el summary, el poem. No tienen thread. Se leen, no se resuelven.

**Esto importa porque resolver un thread de review NO se puede hacer con REST API de GitHub** — solo con la mutación GraphQL `resolveReviewThread`. Es idempotente, así que es seguro llamarla en threads ya resueltos.

Los comentarios de CodeRabbit incluyen campos semi-estructurados que Claude Code debe aprender a leer:
- **🛠️ Refactor suggestion** / **⚠️ Potential issue** / **🧹 Nitpick (optional)** / **🛡️ Security** — categoría
- **Committable suggestion** — bloque ` ```suggestion ... ``` ` que se puede commitear con un click
- **🤖 Prompt for AI Agents** — prompt pre-formateado que CodeRabbit genera para agentes tipo Claude Code. Es oro puro para que CC haga el fix.
- **🔗 Analysis chain** — el razonamiento del bot (suele estar en details collapsados)

## Comandos del skill

Esta skill expone seis comandos conceptuales. El usuario puede invocarlos con lenguaje natural o literalmente.

### 1. `setup` — Configurar CodeRabbit desde cero en un repo

Cuando el usuario dice "configura CodeRabbit en este repo", "quiero empezar a usar CR aquí", "setup CR", o añade un repo nuevo:

1. Verifica que el GitHub App esté instalado en la organización (no se puede hacer por CLI, hay que guiar al usuario al navegador: `https://github.com/apps/coderabbitai/installations/new`).
2. Detecta el tipo de proyecto leyendo archivos indicadores: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `hardhat.config.*`, `foundry.toml`, `pnpm-workspace.yaml`, `lerna.json`, `turbo.json`, etc.
3. Selecciona la plantilla apropiada de `assets/coderabbit-templates/` y la copia como `.coderabbit.yaml` en la raíz.
4. Personaliza la plantilla con el nombre del repo y ajustes específicos detectados (paths de tests, carpetas generadas a excluir).
5. Propone un commit con mensaje: `chore(ci): add .coderabbit.yaml`.
6. Instruye al usuario: el primer review aparecerá en el siguiente PR abierto. Para disparar review en un PR existente, comentar `@coderabbitai review`.

**IMPORTANTE**: usa `profile: chill` como default sensato (empezar asertivo causa abandono por ruido) y fija `language` al idioma del equipo (p. ej. `es-ES` o `en-US`), configurable, no hardcodeado.

Ver `references/setup-guide.md` para el detalle del proceso de instalación del GitHub App (pasos UI que no son automatizables).

### 2. `triage` — Leer un PR y clasificar comentarios de CR

Cuando el usuario dice "mira qué dijo CR en el PR X", "triagea los comentarios", "qué vale la pena atender del review":

Ejecutar `scripts/fetch_cr_comments.sh <owner/repo> <pr_number>` que:
1. Usa `gh api graphql` para obtener los review threads del PR con `id`, `isResolved`, `path`, `line`, `body`.
2. Filtra solo los de `author.login == "coderabbitai"` o `"coderabbitai[bot]"`.
3. Output JSON con shape: `{thread_id, path, line, category, is_committable, has_ai_prompt, body, resolved}`.

Luego Claude Code **debe** clasificar cada comentario sin aplicar fixes todavía:

| Categoría | Qué es | Acción por defecto |
|---|---|---|
| 🛡️ **Security** | Inyección, auth, secrets, XSS, SSRF | **SIEMPRE atender** |
| ⚠️ **Potential issue / Bug** | Null check faltante, race condition, error handling | **Atender** salvo contradicción clara |
| 🛠️ **Refactor suggestion** | Diseño, patrones, legibilidad | **Evaluar** — ¿mejora real? |
| 🧹 **Nitpick (optional)** | Estilo, naming menor, comentarios | **Ignorar** por defecto — resolver sin fix |
| 📊 **Performance** | N+1, loop allocations, cache | **Atender** si es hot path |
| ℹ️ **Informational** | LGTM, positive feedback | **Ignorar** |

Presentar al usuario una tabla resumen antes de tocar código:

```
PR #42 — 12 comentarios de CodeRabbit
  ✅ 3 críticos (security/bug) — atender
  ⚠️ 4 refactors — revisar caso por caso
  🧹 5 nitpicks — resolver sin fix

¿Procedo con los 3 críticos en modo auto y te consulto los 4 refactors?
```

**Nunca aplicar fixes sin este triage primero**. La razón #1 de que equipos abandonen CR es aplicar nitpicks en automático y luego el equipo se cansa de commits ruidosos.

Ver `references/comment-taxonomy.md` para la taxonomía completa con ejemplos reales.

### 3. `resolve` — Aplicar fixes para comentarios seleccionados

Una vez aceptado el triage por el usuario, para cada comentario a atender:

1. Leer el `body` del comentario. Si contiene **"🤖 Prompt for AI Agents"**, usar ese prompt literalmente como guía del fix — es el prompt que CodeRabbit diseñó para agentes como Claude Code. Si no, interpretar el comentario estándar.
2. Si contiene un bloque `committable suggestion`, evaluar si aplicarlo tal cual (ventaja: CR lo registra como "aceptado"). Si necesita adaptación, usar Edit tool normal.
3. Aplicar el fix con Read/Edit, agrupando cambios por archivo.
4. **No commitear uno por uno**. Hacer un único commit al final con mensaje descriptivo:
   ```
   fix(review): address CodeRabbit feedback

   - add null check in auth middleware (thread abc)
   - fix race condition in cache invalidation (thread def)
   - validate input on /api/users endpoint (thread ghi)
   ```
5. Después de push, resolver cada thread atendido con GraphQL usando `scripts/resolve_thread.sh <thread_id>`.
6. Para nitpicks que no vas a arreglar pero el usuario acordó resolver, también usar `resolve_thread.sh` sin fix.
7. Para nitpicks con los que **discrepas activamente** (no es un bug, CR se equivocó), usa `scripts/challenge_thread.sh <thread_id> "<razón breve>"` que publica una respuesta al thread tipo `@coderabbitai this is intentional because <razón>` y lo marca como resuelto. CR aprende de esto para el próximo review.

### 4. `loop` — Modo agentic: iterar hasta que CR apruebe

Cuando el usuario dice "resuelve todo automáticamente", "hasta que CR diga OK", "en modo auto":

Loop iterativo (máximo 3 iteraciones para evitar ping-pong infinito):
1. `triage` el PR.
2. `resolve` comentarios críticos (🛡️ security, ⚠️ bugs). Ignorar nitpicks.
3. Push cambios.
4. Comentar `@coderabbitai review` para disparar re-review incremental.
5. Esperar 3-5 minutos (CR es deliberadamente "Slow AI", 1-3 min típico).
6. Volver a 1. Terminar cuando:
   - No hay comentarios nuevos de categoría crítica, O
   - Iteraciones == 3 (reportar al usuario).
7. Si CR responde "Rate limit exceeded": el mensaje indica la espera exacta (7-16 min típico) — esperar ESO y re-disparar con `@coderabbitai review` (incremental; `full review` gasta lo mismo pero re-revisa todo). El review bloqueado NO se reintenta solo. Antes de iterar, `@coderabbitai rate limit` muestra la cuota restante sin gastarla.

**Reglas de seguridad del loop:**
- Correr `pnpm validate` / `npm test` / equivalente **antes de cada push**. Nunca pushear código roto.
- No auto-aceptar `committable suggestions` en paths de producción (`src/`, `lib/`, `app/`) sin review humana explícita del usuario. En tests y docs, OK.
- Si la CI falla después de un fix de CR, **revertir ese fix** y respond al thread con explicación.

### 5. `chat` — Interactuar con @coderabbitai directamente

El bot acepta varios comandos en comentarios del PR. Claude Code debe saberlos:

| Comando | Uso |
|---|---|
| `@coderabbitai review` | Review incremental (solo cambios nuevos desde el último review) — consume 1 review |
| `@coderabbitai full review` | Review completo desde cero, ignora reviews previos — consume 1 review |
| `@coderabbitai rate limit` | Cuota de PR reviews restante + refill timing — NO consume review |
| `@coderabbitai summary` | Regenera el summary del PR |
| `@coderabbitai resolve` | Resuelve todos los comentarios de CR en el PR |
| `@coderabbitai configuration` | Muestra la configuración actual en YAML (útil para debug) |
| `@coderabbitai ignore` (en descripción del PR) | Pausa reviews en este PR |
| `@coderabbitai pause` / `@coderabbitai resume` | Pausa/reanuda reviews en el repo |
| `@coderabbitai generate unit tests for this file` | (en review comment) — pide tests |
| `@coderabbitai explica en español por qué esto es un problema` | chat libre |

Usar `gh pr comment <PR> --body "@coderabbitai review"` para disparar desde CLI.

**Presupuesto**: los reviews automáticos incrementales tras cada push consumen del mismo bucket por-developer-por-org que `review`/`full review` (Pro 5 / Pro+ 10, refill continuo). `rate limit`, `pause`, `resume`, `ignore` y `configuration` no consumen. No mandar varios comandos `@coderabbitai` en ráfaga — algunos se pierden sin error; esperar a que termine uno antes del siguiente.

**Patrón avanzado útil**: cuando Claude Code no entiende por qué CR flaggeó algo, responder en el mismo thread de review con `@coderabbitai explain more` y CR elabora. Esto entrena el learning del repo.

### 6. `config` — Editar `.coderabbit.yaml` para tuning

Cuando el usuario dice "CR está muy ruidoso", "está comentando nitpicks que no me interesan", "quiero excluir X path", "no quiero que flagee Y":

1. Leer el `.coderabbit.yaml` actual.
2. Identificar el tipo de ajuste necesario:
   - **Ruido general** → confirmar `profile: chill` y añadir `instructions:` con reglas negativas ("Do not comment on import ordering, line length, or missing docstrings on internal functions").
   - **Path noise** → añadir a `reviews.path_filters` (sintaxis: `!**/migrations/**` para excluir).
   - **Path-specific focus** → usar `reviews.path_instructions` con pattern + instruction plano.
   - **Linter false positives** → deshabilitar el linter específico en `reviews.tools.<nombre>.enabled: false`.
   - **Lenguaje** → `language: es-ES` para comentarios en español.
   - **Tono** → `tone_instructions:` para hacer comentarios más directos ("Be direct and concise. Skip pleasantries.").
3. Antes de guardar, validar YAML con `python -c "import yaml; yaml.safe_load(open('.coderabbit.yaml'))"`.
4. Commit con `chore(ci): tune CodeRabbit config — <razón>`.
5. Los cambios aplican al **siguiente** review, no al actual. Para aplicar ya: `@coderabbitai review` en el PR.

Ver `references/yaml-reference.md` para la referencia completa de campos del schema 2026-03-13.

## Plantillas YAML por tipo de proyecto

Están en `assets/coderabbit-templates/`. Selecciona según el repo:

| Plantilla | Cuándo usar |
|---|---|
| `base.yaml` | Cualquier repo como punto de partida. Chill + exclusiones universales. |
| `node-typescript.yaml` | `package.json` presente, TS/JS. Añade ESLint/Biome config. |
| `python.yaml` | `pyproject.toml` o `requirements.txt`. Añade Ruff/Pylint config. |
| `go.yaml` | `go.mod`. Añade golangci-lint config. |
| `rust.yaml` | `Cargo.toml`. Añade Clippy config. |
| `solidity-defi.yaml` | `hardhat.config.*`, `foundry.toml`. Contratos Solidity/DeFi: foco en reentrancia, overflow, slippage, MEV. |
| `monorepo.yaml` | `pnpm-workspace.yaml`, `turbo.json`, `lerna.json`. Usa `path_instructions` por paquete. |
| `docs-only.yaml` | Repos de documentación puros. Solo review en `*.md`, sin linters de código. |

## Path instructions avanzadas por dominio

Para repos con áreas sensibles, `reviews.path_instructions` permite dar a CodeRabbit foco extra por patrón de path (pattern + instrucción en texto plano). Ejemplos genéricos:

- Paths de integración con APIs de terceros → "Focus on rate limiting, API key handling, and input validation."
- Paths de email (`ses`, `smtp`, `mailer`) → "Focus on email deliverability patterns (SPF/DKIM references), bounce handling, and unsubscribe compliance."
- Paths de webhooks → "Focus on webhook signature validation, rate limiting, and PII handling."
- Paths de contratos on-chain (`contracts`, `solidity`) → "Focus on slippage tolerance, transaction simulation before send, gas estimation safety, and private key handling. Flag any hardcoded addresses or magic numbers."
- Repos críticos prod-facing → `pre_merge_checks` con `docstrings: true` e `issue_assessment: true`.

Ver `assets/coderabbit-templates/advanced-path-instructions.yaml` para un ejemplo completo con path_instructions por dominio.

## Métricas y tracking

Cuando el usuario pregunta "cómo vamos con CR", "está sirviendo?", "cuántos nitpicks ignoramos":

Ejecutar `scripts/cr_metrics.sh <owner/repo> [--since YYYY-MM-DD]` que genera:

- **Acceptance rate**: % de comentarios que resultaron en un cambio de código (detectado por commits después del comentario que tocan el archivo/línea comentada).
- **Resolve rate**: % de threads resueltos vs abiertos.
- **Challenge rate**: % de threads respondidos con `@coderabbitai` en disagreement (calidad del señal).
- **Median time to resolve**: tiempo entre comentario de CR y resolución del thread.
- **Nitpick ratio**: % de comentarios marcados como `🧹 Nitpick`.
- **Category breakdown**: conteo por security/bug/refactor/nitpick/perf.

Output como tabla markdown. Si el nitpick ratio es >40%, sugerir tune de `.coderabbit.yaml`. Si el acceptance rate es <30%, revisar si `profile` está correcto o `instructions` están demasiado permisivas.

## Principios operativos (no negociables)

1. **Nunca apliques nitpicks en automático.** Siempre triage primero, usuario decide.
2. **Nunca commits por cada comentario individual.** Agrupa cambios en un solo commit por sesión de review.
3. **Siempre corre tests antes de push** en el loop agentic. CI rota por fixes de review es peor que el bug original.
4. **Resuelve threads con GraphQL, no intentes con REST.** GitHub REST API no tiene endpoint para `resolveReviewThread`.
5. **Usa el "Prompt for AI Agents" cuando exista.** Es el prompt optimizado que CR diseñó para que agentes como CC apliquen el fix correctamente.
6. **Si discrepas con CR, respóndele en el thread.** El bot aprende del codebase y mejora. Silencio = re-aparece la próxima vez.
7. **El veredicto del bot NO es vinculante para merge.** El equipo siempre puede mergear con CR en desacuerdo si hay justificación. Documentarlo en el thread.
8. **No uses el CLI de CodeRabbit salvo petición explícita.** El workflow GitHub App + `gh` CLI + GraphQL no gasta nada extra; el CLI tiene cuota propia por plan y queda fuera de este workflow.
9. **Cuida el presupuesto de reviews.** Cada push con incremental review activo gasta 1 review del bucket por-developer-por-org. Batching de commits antes de push; ante "Rate limit exceeded" el re-review NO llega solo — re-disparar tras la espera del mensaje. Detalle: `references/rate-limits.md`.

## Referencias internas

- `references/setup-guide.md` — instalación completa del GitHub App paso a paso.
- `references/yaml-reference.md` — schema de `.coderabbit.yaml` completo (chill vs assertive vs followup, path_filters syntax, linters, tools, knowledge_base, pre_merge_checks).
- `references/comment-taxonomy.md` — cómo reconocer cada tipo de comentario de CR con ejemplos.
- `references/graphql-api.md` — mutaciones GraphQL necesarias (`resolveReviewThread`, query de threads).
- `references/rate-limits.md` — planes y precios 2026, límites por developer/org, Fair Usage Policy, add-on usage-based y playbook anti-rate-limit.
- `references/troubleshooting.md` — errores comunes: rate limits, webhook failures, review no aparece, path filter excluye todo.
- `assets/coderabbit-templates/` — 9 plantillas YAML por tipo de proyecto.
- `scripts/` — helpers ejecutables en bash (sin dependencias Python).

## Infraestructura reutilizable del skill (v2)

### Detección dinámica de repo (nunca hardcodear owner/org)

Todos los scripts del skill derivan el slug del repo en tiempo de ejecución. Patrón estándar:

```bash
REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
# Fallback si gh no está autenticado:
if [ -z "$REPO" ]; then
  REMOTE="$(git remote get-url origin 2>/dev/null || true)"
  [ -n "$REMOTE" ] && REPO="$(echo "$REMOTE" | sed -E 's#.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#')"
fi
```

Ningún script asume una organización concreta. Cada uno puede ejecutarse en cualquier repo autenticado.

### Pinning de GitHub Actions

Política codificada en los templates de workflow del skill:

| Proveedor | Pinning | Ejemplo |
|---|---|---|
| `actions/*`, `github/*` (oficiales GitHub) | Tag mayor | `actions/checkout@v4` |
| Vendor verificado (p. ej. `docker/*`, `hashicorp/*`) | Tag mayor | `docker/build-push-action@v6` |
| Terceros (p. ej. `tj-actions/*`, `peter-evans/*`) | SHA completo + comentario del tag | `tj-actions/changed-files@ed68ef82c095e0d48ec87eccea555d944a631a4c # v46` |

Razón: incidentes documentados (PwnedRabbit ago-2025, compromiso `tj-actions/changed-files` mar-2025) demostraron que los tags mutables de terceros son vector real de supply chain. Oficiales GitHub/vendor verificados se consideran aceptables.

