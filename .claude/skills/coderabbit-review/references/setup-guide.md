# Setup Guide: CodeRabbit GitHub App

Esta guía cubre el setup completo de CodeRabbit en un repo de GitHub usando el **GitHub App** (incluido en los planes de pago Pro/Pro+/Enterprise). No cubre el CLI (fuera del alcance de esta guía).

## Prerrequisitos

- Plan CodeRabbit Pro o Pro+ activo en la organización (cómo detectar el plan: `rate-limits.md`).
- Admin access a la organización de GitHub (o al repo personal).
- `gh` CLI instalado y autenticado (`gh auth login`).

## Paso 1: Instalar el GitHub App

El GitHub App se instala desde el navegador — no es automatizable:

1. Ir a **https://github.com/apps/coderabbitai/installations/new**
2. Elegir la organización o cuenta personal.
3. Seleccionar repos:
   - **All repositories**: el app tiene acceso a todos (futuros incluidos). Recomendado para orgs pequeñas donde todos los repos serán reviewed.
   - **Only select repositories**: selección manual. Recomendado para orgs grandes donde quieres control fino.
4. Click **Install & Authorize**.
5. Serás redirigido a **app.coderabbit.ai** — completar el setup asociando la cuenta.

**Si ves "Request" en lugar de "Install"**: tu usuario no es owner de la org. Pide al owner que apruebe, o que te de permisos de admin.

## Paso 2: Verificar la instalación

```bash
# Verificar que el app está instalado en el repo
gh api "repos/OWNER/REPO/installation" 2>/dev/null | jq -r '.app_slug'
# Esperado output: coderabbitai
```

Si devuelve error 404, el app no está instalado en este repo específico.

## Paso 3: Crear `.coderabbit.yaml`

Esta skill tiene 9 plantillas en `../assets/coderabbit-templates/`:

```
base.yaml                       # Punto de partida genérico (español, chill)
node-typescript.yaml            # package.json → TS/JS projects
python.yaml                     # pyproject.toml → Python
go.yaml                         # go.mod → Go
rust.yaml                       # Cargo.toml → Rust
solidity-defi.yaml              # hardhat/foundry → DeFi (Solidity/EVM)
monorepo.yaml                   # pnpm-workspace.yaml / turbo.json
docs-only.yaml                  # Solo markdown
advanced-path-instructions.yaml # Stack completo con path_instructions detalladas por dominio
```

Usa `detect_project_type.sh` para auto-detectar:

```bash
TEMPLATE=$(bash scripts/detect_project_type.sh .)
cp "assets/coderabbit-templates/${TEMPLATE}.yaml" .coderabbit.yaml
```

Ajusta a tu repo específico:
- Edita `reviews.path_filters` si tienes carpetas generadas específicas no cubiertas.
- Edita `reviews.path_instructions` con foco por subdirectorio.
- Si el repo es de un dominio muy específico (ej: solo contratos DeFi), usa la plantilla especializada (`solidity-defi.yaml`) en lugar de `advanced-path-instructions.yaml`.

## Paso 4: Commit y push

```bash
git add .coderabbit.yaml
git commit -m "chore(ci): add CodeRabbit config"
git push
```

CodeRabbit lee la config en cada PR — no hay que reiniciar ni reinstalar.

## Paso 5: Probar

1. Abrir un PR con cualquier cambio.
2. Esperar 1-3 min — CodeRabbit publicará un review completo automáticamente.
3. Verificar que los comentarios están en español (confirma que `language: es-ES` funcionó).
4. Si no aparece review:
   - Ver `troubleshooting.md` en esta skill.
   - O forzar con: `gh pr comment <PR> --body "@coderabbitai review"`.

## Paso 6: Integrar con Claude Code (opcional pero recomendado)

La skill oficial `coderabbitai/skills` instala dos skills comunitarias de autofix:

```bash
# Opcional: solo si quieres usar las skills oficiales de CR (requieren CLI de pago)
# npx skills add coderabbitai/skills -a claude-code
```

**No las instales si vas a usar esta skill (`coderabbit-review`)** — esta skill ya cubre workflow pasivo + agentic + triage + config usando el GitHub App, sin el costo del CLI.

## Paso 7 (opcional): Habilitar Issue Planner

CodeRabbit Issue Planner (beta desde feb 2026) integra con Linear, Jira, GitHub Issues. Útil para que CR entienda el "por qué" del PR antes de revisar código.

1. Ir a **app.coderabbit.ai** → Integrations → conectar Linear/Jira.
2. En tus PRs, incluir referencias a issues como `Closes #123` o `Fixes #456`.
3. CR leerá el issue y adaptará el review al contexto.

La integración Jira/Linear para contexto de reviews requiere plan Pro; el producto de planning (CodeRabbit Plan / issue planning) requiere Pro+.

## Costos (verificado 2026-06-12)

- **Free**: $0 — solo summaries de PR (3/dev), reviews vía IDE/CLI limitados, trial de 14 días de Pro+.
- **Pro**: $24/dev/mes anual ($30 mensual) — 5 PR reviews por developer con refill continuo, 300 archivos/review, chat 50, linters/SAST, integraciones, analytics.
- **Pro+**: $48/dev/mes anual ($60 mensual) — 10 PR reviews/dev, chat 100, custom pre-merge checks, unit test generation, merge conflict resolution, CodeRabbit Plan.
- **Enterprise**: contactar ventas — 12 reviews/dev, self-hosting, SSO, RBAC, API access, audit logs.
- **Add-on usage-based** (Pro y superiores): $1.00/crédito, $0.25 por archivo revisado, para seguir revisando al agotar la cuota del plan.

NO hay reviews "ilimitados" en ningún plan: los límites son por developer y por organización, con refill continuo y Fair Usage Policy. Detalle completo y mitigaciones: `rate-limits.md`.

## Deshabilitar temporalmente

Si necesitas pausar reviews temporalmente en un PR específico:
- Añadir `@coderabbitai ignore` en cualquier parte de la descripción del PR.

Para pausar en todo el repo:
- En el PR comentar `@coderabbitai pause`. Reanudar con `@coderabbitai resume`.

Para deshabilitar completamente:
- Ir a **GitHub Settings → Applications → CodeRabbit → Configure → Select repositories** y remover el repo.
