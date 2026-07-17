#!/usr/bin/env bash
# challenge_thread.sh
# Uso: ./challenge_thread.sh <owner/repo> <pr_number> <comment_id> "<razón>"
#
# Responde a un comentario de CodeRabbit en desacuerdo, etiquetando al bot
# para que aprenda, y luego resuelve el thread. Esto entrena el learning
# del repo para que CR no re-sugiera el mismo issue en PRs futuros.
#
# Requiere:
# - gh CLI autenticado
# - comment_id: databaseId del primer comentario del thread (desde fetch_cr_comments.sh)
# - razón: explicación breve de por qué CR se equivocó
#
# Ejemplo:
#   ./challenge_thread.sh tu-org/tu-repo 42 1234567890 \
#     "This check is intentional — the upstream API returns 200 for deleted records"

set -euo pipefail

REPO="${1:?Usage: $0 <owner/repo> <pr_number> <comment_id> <reason>}"
PR="${2:?Usage: $0 <owner/repo> <pr_number> <comment_id> <reason>}"
COMMENT_ID="${3:?Usage: $0 <owner/repo> <pr_number> <comment_id> <reason>}"
REASON="${4:?Usage: $0 <owner/repo> <pr_number> <comment_id> <reason>}"

# Post reply al thread mencionando al bot — CR registra esto como learning
REPLY_BODY="@coderabbitai ${REASON}"

gh api \
  --method POST \
  "repos/${REPO}/pulls/${PR}/comments/${COMMENT_ID}/replies" \
  -f body="${REPLY_BODY}" \
  --jq '.html_url' \
  | sed 's/^/Challenge posted: /'

echo "Note: CodeRabbit will reply to this and learn from your feedback."
echo "      To also resolve the thread now, run: resolve_thread.sh <thread_id>"
