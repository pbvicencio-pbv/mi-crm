# coderabbit-review — Skill de Claude Code

Una **skill de [Claude Code](https://claude.com/claude-code)** que convierte al asistente en un experto operando **CodeRabbit** (la GitHub App que revisa cada Pull Request automáticamente) y aplicando buenas prácticas de revisión en GitHub.

Cubre el ciclo completo:

- **Setup** de CodeRabbit en un repo y plantillas de `.coderabbit.yaml` por tipo de proyecto (Node/TypeScript, Python, Go, Rust, monorepo, docs, Solidity/DeFi).
- **Triage por severidad** de los comentarios del bot (seguridad, bugs, refactors, nitpicks, performance) — para atender lo que importa y no ahogarse en ruido.
- **Resolución de hilos** de review con la API GraphQL de GitHub (los review threads no se resuelven por REST).
- **Modo agéntico**: iterar fixes hasta que el review quede limpio, cuidando el presupuesto de reviews.
- **Buenas prácticas**: Conventional Commits, gates pre-merge y tuning de configuración para reducir ruido.

## Qué es una skill de Claude Code

Una skill es una carpeta con un `SKILL.md` (más `references/`, `scripts/` y `assets/` de apoyo) que Claude Code carga bajo demanda cuando la tarea lo requiere. No es un programa que ejecutes tú: es conocimiento y herramientas que el asistente usa por ti.

## Instalación

1. **Descomprime** el ZIP descargado. Obtendrás una carpeta llamada `coderabbit-review/`.
2. **Copia** esa carpeta completa a una de estas ubicaciones:
   - **Para todos tus proyectos (global):** `~/.claude/skills/coderabbit-review/`
   - **Solo para un proyecto:** `<tu-proyecto>/.claude/skills/coderabbit-review/`
3. **Reinicia Claude Code** (cierra y vuelve a abrir la sesión) para que detecte la skill.

Estructura esperada tras copiar:

```text
~/.claude/skills/coderabbit-review/
├── SKILL.md
├── references/
├── scripts/
└── assets/
```

## Cómo se usa

Una vez instalada, no hace falta invocarla a mano: Claude Code la carga automáticamente cuando tu petición menciona GitHub, un Pull Request, `git push`, un merge, CodeRabbit, `@coderabbitai` o `.coderabbit.yaml`. También puedes pedírselo explícitamente, por ejemplo:

- "Configura CodeRabbit en este repo."
- "Mira qué dijo CodeRabbit en el PR #42 y triagea los comentarios."
- "Resuelve los comentarios críticos del review y deja los nitpicks."
- "CodeRabbit está muy ruidoso, ajústame la config."

## Requisitos

- Una cuenta de GitHub con la GitHub App de **CodeRabbit** instalada en tu organización o repositorio.
- El CLI `gh` de GitHub autenticado (los scripts derivan el repo dinámicamente y usan `gh api`).

## Licencia

MIT.

---

Cortesía de Talent Academy · Vibe Coder.
