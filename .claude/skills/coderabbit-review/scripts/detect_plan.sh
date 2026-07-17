#!/usr/bin/env bash
# detect_plan.sh — Paso 0 del skill: detectar la org del repo y el plan CodeRabbit aplicable.
#
# NO existe API pública de subscription/plan (metrics/audit-logs son Enterprise-only),
# así que este script NO adivina el plan por org: defaultea a Pro (conservador) e
# imprime una nota para que verifiques tu plan real.
#
# Cómo verificar tu plan real:
#   - Dashboard: app.coderabbit.ai/settings/subscription
#   - En vivo (no consume review): comentar "@coderabbitai rate limit" en un PR
# Si tu org está en Pro+, exporta CR_PLAN=pro-plus antes de correr este script:
#   CR_PLAN=pro-plus ./detect_plan.sh
# Detalle completo de límites y fair usage: ../references/rate-limits.md
set -euo pipefail

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
if [ -z "$REPO" ]; then
  REMOTE="$(git remote get-url origin 2>/dev/null || true)"
  [ -n "$REMOTE" ] && REPO="$(echo "$REMOTE" | sed -E 's#.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#')"
fi
if [ -z "$REPO" ]; then
  echo "ERROR: no se pudo derivar el repo (gh sin auth y sin remote origin)" >&2
  exit 1
fi
ORG="${REPO%%/*}"

# Sin API pública de plan → default conservador a Pro. Overridea con CR_PLAN si
# ya verificaste que tu org es Pro+.
PLAN="${CR_PLAN:-pro}"
case "$PLAN" in
  pro-plus)
    PR_REVIEWS=10
    CHAT=100
    PRO_PLUS_FEATURES="yes"
    ;;
  pro)
    PR_REVIEWS=5
    CHAT=50
    PRO_PLUS_FEATURES="no"
    ;;
  *)
    echo "ERROR: CR_PLAN='$PLAN' no reconocido (usa 'pro' o 'pro-plus')" >&2
    exit 1
    ;;
esac

echo "repo=$REPO"
echo "org=$ORG"
echo "plan=$PLAN"
echo "pr_reviews_per_dev=$PR_REVIEWS"
echo "chat_per_dev=$CHAT"
echo "files_per_review=300"
# pre_merge_checks.custom_checks y finishing_touches.custom requieren Pro+ (en Pro se ignoran):
echo "pro_plus_yaml_features=$PRO_PLUS_FEATURES"
echo "note=plan asumido '$PLAN' (default conservador; no hay API pública de plan). Verifica el tuyo en app.coderabbit.ai/settings/subscription o con '@coderabbitai rate limit' en un PR; si es Pro+, corre con CR_PLAN=pro-plus." >&2
