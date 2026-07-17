# Troubleshooting

Errores comunes con CodeRabbit y cómo resolverlos.

## "No review appeared on my PR"

Causas en orden de probabilidad:

### 1. CR GitHub App no está instalado en este repo

```bash
gh api "repos/OWNER/REPO/installation" 2>/dev/null | jq -r '.app_slug'
# Debe devolver: coderabbitai
```

Si devuelve 404 o vacío: el app no tiene acceso. Ir a https://github.com/apps/coderabbitai/installations/new y añadir este repo.

### 2. El PR está en draft

CR ignora drafts por default. Opciones:
- Marcar el PR como "Ready for review".
- O habilitar review de drafts en `.coderabbit.yaml`:
  ```yaml
  reviews:
    auto_review:
      drafts: true
  ```

### 3. El target branch no está en `base_branches`

Si tu `.coderabbit.yaml` tiene:
```yaml
reviews:
  auto_review:
    base_branches: [main, master]
```

Y tu PR apunta a `develop`, CR no revisa. Añadir `develop` a la lista.

### 4. `path_filters` excluye todos los archivos cambiados

Verifica que los paths del PR no estén completamente excluidos por el YAML. Forzar un review manual para ver el comportamiento:

```bash
gh pr comment <PR> --body "@coderabbitai review"
```

Si CR responde "No files to review" o similar, el problema es `path_filters`.

### 5. Rate limit del plan alcanzado

Los límites son por developer y por organización (Pro 5 / Pro+ 10 PR reviews, refill continuo). Si el bot posteó "Rate limit exceeded", ver la sección dedicada más abajo — el review NO se reintenta solo.

### 6. Título del PR matching `ignore_title_keywords`

Si configuraste:
```yaml
reviews:
  auto_review:
    ignore_title_keywords: ["WIP", "DO NOT MERGE"]
```

Y tu PR tiene "WIP" en el título, CR lo skipea. Renombrar o remover keyword.

### 7. Webhook failure entre GitHub y CR

- GitHub repo → Settings → Webhooks → buscar el de `coderabbitai`
- Ver "Recent Deliveries"
- Si hay 5xx consistentes, es downtime de CR. Check https://status.coderabbit.ai o su Twitter.

---

## "Rate limit exceeded — el bot pide esperar"

El bot postea/edita un comentario `> [!WARNING] Rate limit exceeded` con la espera exacta (típico 7-16 min). Claves:

1. **El review bloqueado NO se reintenta solo.** Tras la espera, re-disparar con `@coderabbitai review` o empujar un commit nuevo. En gates pre-merge de olas multi-PR, vigilar este aviso — un push en ráfaga que cae en el límite pierde su review en silencio.
2. **Ver cuota sin gastarla**: `@coderabbitai rate limit` (el walkthrough de cada review también la muestra desde 2026-04).
3. **Si las esperas se alargan más de lo normal**: es la Fair Usage Policy espaciando el refill por actividad sostenida/en ráfaga de tu identidad (no hay mensaje distinto). Reducir actividad lo restaura con el tiempo. El add-on usage-based NO exime de esto.
4. **Reducir consumo**: batching de pushes, `auto_pause_after_reviewed_commits: 1-2`, `ignore_usernames` para bots de deps, drafts/WIP. Playbook completo: `rate-limits.md`.

---

## "El review tomó 10+ minutos"

Es normal en PRs grandes. CR se posiciona como **"Slow AI"** (1-3 min típico, 10+ en PRs de 50+ archivos).

Opciones:
- Esperar (suele terminar eventualmente).
- PR más pequeño (mejor práctica independiente).
- Cancelar y re-disparar con `@coderabbitai review` (incremental, más rápido).

Si consistentemente >15 min en PRs pequeños, es issue upstream — reportar a CR support.

---

## "CR comenta lo mismo que ya arreglé"

Causas:

### 1. No disparaste re-review después de tu push

CR revisa automáticamente commits nuevos, pero a veces el webhook tarda. Forzar:
```bash
gh pr comment <PR> --body "@coderabbitai review"
```

### 2. El fix no está en el diff que CR ve

Verifica:
```bash
gh pr diff <PR> | grep -A2 "archivo_que_fijaste"
```

Si tu cambio no aparece, es porque:
- No hiciste push (`git status` + `git push`).
- Pusheaste a la branch equivocada.
- El fix está en otro commit que no es parte del PR.

### 3. El thread no se resolvió

Aunque fixeaste, si el thread sigue "abierto", CR puede re-comentar. Resuelve con:
```bash
bash scripts/resolve_thread.sh <thread_id>
```

---

## "Language es-ES pero el review está en inglés"

CR respeta `language: es-ES` pero:
- A veces ignora términos técnicos y deja nombres de APIs, funciones, y errores en inglés (esto es correcto).
- Si TODO el review está en inglés: verifica que `.coderabbit.yaml` está en la raíz del repo (no en subdirectorio) y que la branch del PR tiene este archivo.

Para debug:
```bash
gh pr comment <PR> --body "@coderabbitai configuration"
```

CR responde con la config efectiva. Verifica que `language: es-ES` está ahí.

---

## "CR no aprende — repite sugerencias ya rechazadas"

El learning del knowledge base requiere:

1. `knowledge_base.opt_out: false` (o el campo ausente — default es false).
2. Haber dismiseado/resuelto threads **con razonamiento** (challenge con `@coderabbitai <razón>`).
3. Tiempo — el learning se actualiza en el background, no en tiempo real.
4. Plan Pro (free tier tiene learning limitado).

Si después de 2-4 semanas de uso activo CR sigue repitiendo:
- Verificar la config de KB:
  ```yaml
  knowledge_base:
    opt_out: false
    learnings:
      scope: auto
  ```
- Usar más `@coderabbitai` replies explícitos con razones.
- Usar `.coderabbit.yaml` con `reviews.instructions` explícitas — es más confiable que esperar que el KB aprenda.

---

## "Rate limit al hacer muchas queries GraphQL"

GitHub GraphQL tiene 5000 points/hora. Para un repo típico:
- `fetch_cr_comments.sh`: ~10-50 points por llamada.
- `resolve_thread.sh`: ~1 point.
- `cr_metrics.sh` (20 PRs): ~200-500 points.

Si te encuentras con rate limit:
```bash
# Verificar usage actual
gh api rate_limit --jq '.resources.graphql'

# Esperar y reintentar
sleep 60
```

Para loops grandes (bulk resolve), añadir `sleep 0.5` entre llamadas.

---

## "CR comentó un secret, ¿qué hago?"

Si CR detecta un secreto (via gitleaks/trufflehog) y lo comenta en el PR:

1. **El secret ya está expuesto** en el historial de Git (y CR lo leyó).
2. Revocar el secret inmediatamente (API key, token).
3. Rotar en producción.
4. Usar `git filter-repo` o BFG para limpiar el historial (opcional, más trabajo).
5. Añadir el archivo/patrón a `.gitignore` y a `reviews.path_filters` para el futuro.

**No solo borres el commit** — el secret ya está en el webhook que CR recibió y en el historial de la branch remote.

---

## "CR bloquea merge pero no veo qué hay que arreglar"

Si tienes `pre_merge_checks.<X>.mode: error` o `request_changes_workflow: true`, CR puede bloquear merge.

Verificar:
```bash
gh pr checks <PR>
```

Busca el check de CodeRabbit. Si está failing:
- Click en "Details" → te lleva a la UI de CR con el motivo.
- O en el PR, ve los review comments no resueltos.

Para destrabar temporalmente (emergencia):
- Admin override en GitHub (si tu repo lo permite).
- O temporalmente en `.coderabbit.yaml`:
  ```yaml
  pre_merge_checks:
    docstrings:
      mode: warning  # cambiar de error a warning
  ```

---

## "Quiero desinstalar CR de un repo temporalmente"

Opciones de menor a mayor destructividad:

1. **Pausar** (preserva config, fácil de reanudar):
   ```bash
   gh pr comment <any_pr> --body "@coderabbitai pause"
   ```

2. **Deshabilitar auto_review** (manual-only):
   ```yaml
   reviews:
     auto_review:
       enabled: false
   ```
   Puedes seguir invocando con `@coderabbitai review` manualmente.

3. **Remover repo del app**:
   GitHub → Settings → Applications → CodeRabbit → Configure → uncheck repo.

4. **Desinstalar app completamente**:
   GitHub → Settings → Applications → CodeRabbit → Uninstall.

---

## "Cómo sé qué plan tiene esta organización?"

1. **En un PR activo** (fuente primaria): `@coderabbitai rate limit` muestra tu cuota (el límite delata el plan: 5 = Pro, 10 = Pro+). No consume review. Detalle en `rate-limits.md`.
2. **Dashboard**: `app.coderabbit.ai/settings/subscription` → card "Plan details" (requiere rol Admin/Billing Admin).

NO existe API de CodeRabbit para consultar el plan (verificado 2026-06-12 contra su OpenAPI). Ningún plan tiene reviews ilimitados: Pro 5 y Pro+ 10 PR reviews por developer con refill continuo; features Pro+ (custom checks, unit tests, simplify, merge conflicts) se ignoran en silencio en orgs Pro.

---

## "Claude Code no encuentra esta skill"

Verificar que SKILL.md está en el directorio correcto:

```bash
# Para Claude Code (user-level):
ls ~/.claude/skills/coderabbit-review/SKILL.md

# O project-level:
ls .claude/skills/coderabbit-review/SKILL.md
```

Si falta:
- Re-instalar desde el .skill: sigue las instrucciones del README.md.
- O clonar manualmente: `cp -r coderabbit-review ~/.claude/skills/`.

---

## Recursos adicionales

- CR docs: https://docs.coderabbit.ai
- Status page: https://status.coderabbit.ai
- Discord community: https://discord.gg/coderabbit
- Support (Pro+): support@coderabbit.ai
