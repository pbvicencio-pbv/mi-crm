# `.coderabbit.yaml` Reference

Schema version: v2 — campos de esta referencia verificados contra docs oficiales el 2026-06-12.
Fuente canónica: https://coderabbit.ai/integrations/schema.v2.json

Para auto-completion en tu editor, añade esta línea en la primera línea del YAML:

```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
```

Este doc cubre los campos que importan en la práctica. La referencia completa vive en https://docs.coderabbit.ai/reference/configuration.

## Tabla de contenidos

- [Top-level fields](#top-level-fields)
- [reviews](#reviews)
- [reviews.path_filters](#reviewspath_filters)
- [reviews.path_instructions](#reviewspath_instructions)
- [reviews.tools (linters)](#reviewstools)
- [reviews.auto_review](#reviewsauto_review)
- [chat](#chat)
- [knowledge_base](#knowledge_base)
- [pre_merge_checks](#pre_merge_checks)

## Top-level fields

```yaml
language: es-ES        # Idioma de comentarios. ISO 639-1 con región. Defaults to en-US.
                       # Valores útiles: es-ES (España), es-MX (México), en-US, pt-BR, fr-FR.

tone_instructions: |   # El tono del bot (no qué debe comentar).
  Be direct and concise. Skip pleasantries.
  Explain reasoning in one sentence.

early_access: false    # Features beta de CR. Default false.
```

## reviews

```yaml
reviews:
  profile: chill       # chill | assertive | followup
                       # chill: bugs/security/logic only. Start here.
                       # assertive: + style, naming, docs, best practices.
                       # followup: assertive + tracks if comments were addressed in next commits.

  request_changes_workflow: false
                       # true → bloquea merge hasta que el usuario resuelva explícitamente
                       # cada thread de CR. Default false. Útil para repos críticos.

  high_level_summary: true      # Summary en la descripción del PR. Muy útil.
  high_level_summary_in_walkthrough: false
                                # Si true, el summary va en el walkthrough en lugar de la descripción.
  high_level_summary_placeholder: ""
                                # Placeholder en la descripción que CR reemplaza con el summary.
                                # Ejemplo: "@coderabbitai summary" como literal en tu template de PR.

  poem: false          # "A whimsical poem to celebrate the changes". Entertainingly useless.
                       # Desactivar en repos profesionales.

  review_status: true  # Muestra status de review como check de GitHub. Útil para merge gates.

  collapse_walkthrough: false
                       # true → walkthrough colapsado por default. Menos ruido visual.

  sequence_diagrams: false
                       # true → CR genera diagramas Mermaid de control flow cuando aplica.
                       # Útil en PRs complejos. Caro en PRs triviales.

  changed_files_summary: true
                       # Tabla con archivos cambiados y una línea de descripción por archivo.

  auto_title_placeholder: "@coderabbitai title"
                       # Si incluyes este literal en el título del PR, CR lo reemplaza
                       # con un título autogenerado.

  auto_review:
    enabled: true      # Si false, CR no revisa automáticamente. Hay que pedir con @coderabbitai review
                       # (ojo: `labels` y `description_keyword` disparan review incluso con enabled: false).
    auto_incremental_review: true
                       # Re-ejecuta el review en cada push. Si false, solo revisa al abrir el PR;
                       # los pushes posteriores se ignoran hasta trigger manual.
                       # PRESUPUESTO: cada incremental automático consume 1 review del bucket
                       # por-developer-por-org, igual que un @coderabbitai review manual.
    auto_pause_after_reviewed_commits: 5
                       # Default 5 (feature activa desde 2026-02). Pausa los incrementales tras N
                       # commits REVISADOS desde la última pausa; 0 lo desactiva. Tras la pausa:
                       # @coderabbitai review pide el siguiente on demand; @coderabbitai resume
                       # reactiva los automáticos (el contador se resetea al levantar la pausa).
                       # Mitigación oficial de fair usage: 1-2 en ramas calientes. Warning oficial
                       # contra 0: "every eligible push can trigger another review" — quema cuota.
    drafts: false      # Si true, también revisa PRs en draft (default: los drafts se saltan).
    base_branches: []  # Regex de branches destino ADICIONALES a revisar. La default branch del
                       # repo SIEMPRE está incluida (no hace falta listar main). ".*" = todas.
    ignore_title_keywords: []
                       # PRs con estos keywords en el título no se revisan (case-insensitive,
                       # skip silencioso). Ej: ["WIP", "DO NOT MERGE", "[skip-review]"]
    labels: []         # Labels que controlan qué PRs se revisan; "!" niega ("!do-not-review").
                       # Patrón opt-in puro: enabled: false + labels: ["review-ready"].
    ignore_usernames: []
                       # Salta reviews de PRs de estos autores (match exacto, case-sensitive, sin
                       # wildcards; precedencia sobre TODOS los demás controles). Práctica estándar:
                       # ["dependabot[bot]", "renovate[bot]"] — por defecto sus PRs SÍ gastan reviews.
    description_keyword: ""
                       # Keyword en la DESCRIPCIÓN del PR que dispara review con enabled: false.

  auto_review_comments:
    enabled: true      # CR puede auto-resolver sus propios comentarios cuando detecta que
                       # el fix fue aplicado en commits siguientes.

  # Instrucción global aplicada a todo el repo (después de tone_instructions).
  instructions: |
    Do not comment on:
    - Import ordering
    - Line length
    - Missing docstrings on internal functions

    Focus extra on:
    - Error handling completeness
    - Security vulnerabilities
    - Input validation
```

## reviews.path_filters

Sintaxis glob para incluir/excluir archivos del review.

**Sintaxis:**
- `"path/to/**"` — incluye
- `"!path/to/**"` — excluye
- Orden importa: excludes posteriores sobre-escriben includes previos.

**Patrones útiles:**
```yaml
reviews:
  path_filters:
    # Excluir dependencias
    - "!**/node_modules/**"
    - "!**/vendor/**"
    - "!**/__pycache__/**"

    # Excluir artefactos de build
    - "!**/dist/**"
    - "!**/build/**"
    - "!**/.next/**"
    - "!**/target/**"

    # Excluir lockfiles (cambian frecuentemente, no hay nada que revisar)
    - "!**/*.lock"
    - "!**/pnpm-lock.yaml"

    # Excluir generated code
    - "!**/*.generated.*"
    - "!**/*.pb.go"
    - "!**/generated/**"

    # Excluir minified
    - "!**/*.min.js"

    # Excluir binarios y assets
    - "!**/*.png"
    - "!**/*.svg"

    # Excluir snapshots (tests)
    - "!**/*.snap"
    - "!**/__snapshots__/**"
```

**Docs-only repo (invertir lógica):**
```yaml
reviews:
  path_filters:
    - "!**/*"          # Excluir todo
    - "**/*.md"        # Volver a incluir solo markdown
    - "**/*.mdx"
```

## reviews.path_instructions

Instrucciones específicas por subdirectorio. El patrón usa glob estándar.

```yaml
reviews:
  path_instructions:
    - path: "**/api/**,**/routes/**"
      instructions: |
        HTTP endpoints. Mandatory focus:
        - Input validation (zod/yup/joi/pydantic)
        - Rate limiting
        - Auth/authz decorators
        - Error handling without stack trace leaks

    - path: "**/*.test.ts,**/*.spec.ts,**/__tests__/**"
      instructions: |
        Test code. Do not flag `any` or coverage concerns.
        Focus on: specific assertions, mock cleanup, test ordering.

    - path: "packages/shared/**"
      instructions: |
        Shared package. Any change affects multiple consumers.
        Flag breaking changes in public APIs explicitly.
```

## reviews.tools

Habilitar/deshabilitar linters específicos que CR corre en sandbox.

Linters soportados (lista parcial, hay 40+):

```yaml
reviews:
  tools:
    # JavaScript/TypeScript
    eslint: {enabled: true}
    biome: {enabled: true}
    prettier: {enabled: false}   # Formatting-only, genera ruido

    # Python
    ruff: {enabled: true}
    pylint: {enabled: false}     # Ruidoso por default; enable si tu proyecto ya lo usa
    bandit: {enabled: true}      # Security linter

    # Go
    golangci-lint: {enabled: true}

    # Rust
    clippy: {enabled: true}

    # PHP
    phpstan: {enabled: true, level: 5}
    phpmd: {enabled: true}
    phpcs: {enabled: true}

    # Shell
    shellcheck: {enabled: true}

    # Swift
    swiftlint:
      enabled: true
      config_file: ".swiftlint.yml"

    # Infra / IaC
    checkov: {enabled: true}     # Terraform, K8s, CloudFormation security

    # Secrets detection
    gitleaks: {enabled: true}
    trufflehog: {enabled: true}

    # Markdown / docs
    markdownlint: {enabled: true}
    languagetool:
      enabled: true
      enabled_rules: [SPELLING_RULE, GRAMMAR]

    # YAML
    yamllint: {enabled: true}

    # Kubernetes
    kubelinter: {enabled: true}

    # Ruby
    rubocop: {enabled: true}

    # .NET
    dotnet_format: {enabled: true}
```

## chat

Comportamiento del bot en interacciones con usuarios.

```yaml
chat:
  auto_reply: true     # CR responde automáticamente cuando es mencionado.
```

## knowledge_base

Aprendizaje persistente del repo a lo largo del tiempo.

```yaml
knowledge_base:
  opt_out: false       # true → desactiva KB completamente (privacidad).
                       # Solo usar si tienes requerimientos duros de no-retención.

  learnings:
    scope: auto        # auto (del repo actual) | local (solo org) | global (todos los repos del account)
                       # "auto" suele ser lo correcto.

  issues:
    scope: auto        # Leer issues de Linear/Jira/GitHub como contexto.

  pull_requests:
    scope: auto        # Leer PRs previos para detectar patrones del repo.
```

## pre_merge_checks

Feature Pro que añade quality gates antes de permitir merge.

```yaml
pre_merge_checks:
  docstrings:
    mode: warning      # off | warning | error
                       # warning: comenta pero no bloquea
                       # error: bloquea merge

  issue_assessment:
    mode: warning      # CR verifica que el PR efectivamente resuelve el issue referenciado.

  title:
    mode: warning
    requirements: |
      PR title must follow Conventional Commits:
      feat|fix|chore|docs|refactor|test|ci(scope): description
```

## Ejemplos pequeños útiles

**Silenciar solo nitpicks globalmente:**
```yaml
reviews:
  profile: chill
  instructions: |
    Do not post comments marked as "Nitpick (optional)".
    Focus only on bugs, security issues, and significant refactors.
```

**Comentarios en español pero keep technical terms en inglés:**
```yaml
language: es-ES
tone_instructions: |
  Escribe en español, pero mantén términos técnicos en inglés cuando sean
  estándar de la industria (ej: "race condition", "null pointer", "dependency injection").
  No traduzcas nombres de APIs, funciones o frameworks.
```

**Repo Solidity con foco máximo en seguridad:**
```yaml
reviews:
  profile: assertive
  instructions: |
    This is production DeFi code managing real funds. Zero tolerance
    for security issues. Flag ALL potential reentrancy, access control
    gaps, integer overflow, oracle manipulation, and front-running risks.
    Err on the side of false positives over false negatives.
```

**Deshabilitar el walkthrough (solo inline comments):**
```yaml
reviews:
  high_level_summary: false
  changed_files_summary: false
  sequence_diagrams: false
  poem: false
```

## Validación

Siempre validar el YAML antes de commitear:

```bash
python3 -c "import yaml; yaml.safe_load(open('.coderabbit.yaml'))" && echo "Valid YAML"

# O con yq si lo tienes
yq eval '.' .coderabbit.yaml > /dev/null && echo "Valid"
```

Para verificar que CR lee la config correctamente, en un PR comentar:
```
@coderabbitai configuration
```

El bot responde con la config efectiva (merge de tu YAML + defaults).
