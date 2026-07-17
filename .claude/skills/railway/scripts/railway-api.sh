#!/usr/bin/env bash
# railway-api.sh - GraphQL helper for the Railway Public API
#
# Usage:
#   ./railway-api.sh '<query_or_mutation>' '<variables_json>'
#   ./railway-api.sh "$(cat query.graphql)" '{"projectId":"abc"}'
#   echo '<query>' | ./railway-api.sh - '<variables>'
#
# Auth precedence (highest first):
#   $RAILWAY_API_TOKEN     - account or workspace token (Authorization: Bearer)
#   $RAILWAY_PROJECT_TOKEN - project token (Project-Access-Token header, scoped)
#   $RAILWAY_TOKEN         - generic; treated as project token if PROJECT_TOKEN unset, else as API token
#
# Get tokens at:
#   - Account/Workspace: https://railway.com/account/tokens
#   - Project: project Settings → Tokens (in the dashboard)
#
# Outputs:
#   - On success: pretty-printed JSON of `data` field (or full response if --raw)
#   - On GraphQL errors: prints `errors` array to stderr, exits 1
#   - On HTTP errors: prints status + body to stderr, exits 2

set -euo pipefail

ENDPOINT="${RAILWAY_GRAPHQL_ENDPOINT:-https://backboard.railway.com/graphql/v2}"
RAW=0
QUERY=""
VARS="{}"

usage() {
  cat >&2 <<'EOF'
Usage: railway-api.sh [--raw] <query> [variables_json]
       railway-api.sh [--raw] - [variables_json]   (read query from stdin)

Examples:
  ./railway-api.sh 'query { me { id email } }'
  ./railway-api.sh 'query($id: String!) { project(id: $id) { name } }' '{"id":"abc-123"}'
  cat mutation.graphql | ./railway-api.sh - '{"input":{...}}'
  ./railway-api.sh --raw 'query { me { id } }'   # full response, not just data
EOF
  exit 64
}

# arg parsing
while [[ $# -gt 0 ]]; do
  case "$1" in
    --raw) RAW=1; shift ;;
    -h|--help) usage ;;
    -) QUERY="$(cat)"; shift ;;
    *)
      if [[ -z "$QUERY" ]]; then QUERY="$1"
      else VARS="$1"
      fi
      shift
      ;;
  esac
done

[[ -z "$QUERY" ]] && usage

# auth header selection
AUTH_HEADER=""
if [[ -n "${RAILWAY_API_TOKEN:-}" ]]; then
  AUTH_HEADER="Authorization: Bearer ${RAILWAY_API_TOKEN}"
elif [[ -n "${RAILWAY_PROJECT_TOKEN:-}" ]]; then
  AUTH_HEADER="Project-Access-Token: ${RAILWAY_PROJECT_TOKEN}"
elif [[ -n "${RAILWAY_TOKEN:-}" ]]; then
  # heuristic: account tokens start with a UUID-ish pattern; project tokens too.
  # Default to Project-Access-Token since RAILWAY_TOKEN is the canonical project-token env var.
  AUTH_HEADER="Project-Access-Token: ${RAILWAY_TOKEN}"
else
  echo "ERROR: No auth token found. Set one of:" >&2
  echo "  RAILWAY_API_TOKEN     (account or workspace token)" >&2
  echo "  RAILWAY_PROJECT_TOKEN (project-scoped token)" >&2
  echo "  RAILWAY_TOKEN         (treated as project token)" >&2
  echo "Get tokens at https://railway.com/account/tokens" >&2
  exit 3
fi

# validate variables JSON
if ! echo "$VARS" | jq empty 2>/dev/null; then
  echo "ERROR: variables argument is not valid JSON: $VARS" >&2
  exit 64
fi

# build payload
PAYLOAD=$(jq -nc --arg q "$QUERY" --argjson v "$VARS" '{query: $q, variables: $v}')

# call API
HTTP_RESPONSE=$(mktemp)
trap 'rm -f "$HTTP_RESPONSE"' EXIT

HTTP_STATUS=$(curl -sS -o "$HTTP_RESPONSE" -w '%{http_code}' \
  --connect-timeout 5 --max-time 30 \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "$PAYLOAD" || echo "000")

BODY=$(cat "$HTTP_RESPONSE")

# HTTP-level errors
if [[ "$HTTP_STATUS" -lt 200 || "$HTTP_STATUS" -ge 300 ]]; then
  echo "HTTP ${HTTP_STATUS} from Railway GraphQL API" >&2
  echo "$BODY" >&2
  exit 2
fi

# GraphQL-level errors
if echo "$BODY" | jq -e '.errors' >/dev/null 2>&1; then
  echo "GraphQL errors:" >&2
  echo "$BODY" | jq '.errors' >&2
  exit 1
fi

# rate limit hint (informational, to stderr)
RL_REMAINING=$(grep -i '^x-ratelimit-remaining:' /dev/null 2>/dev/null || true)
# (curl -i would give us headers; keeping output clean for piping)

# emit
if [[ "$RAW" -eq 1 ]]; then
  echo "$BODY" | jq .
else
  echo "$BODY" | jq '.data'
fi
