#!/usr/bin/env bash
# ids-from-url.sh - parse projectId, serviceId, environmentId from a Railway dashboard URL
#
# Supported URL shapes:
#   https://railway.com/project/<projectId>
#   https://railway.com/project/<projectId>?environmentId=<envId>
#   https://railway.com/project/<projectId>/service/<serviceId>
#   https://railway.com/project/<projectId>/service/<serviceId>?environmentId=<envId>
#   https://railway.app/...   (legacy domain - still works, redirects)
#
# Output (JSON):
#   {"projectId":"...","serviceId":"...","environmentId":"..."}
#   Missing fields are null.
#
# Exits 1 if no projectId could be parsed.

set -euo pipefail

URL="${1:-}"
if [[ -z "$URL" ]]; then
  echo "Usage: ids-from-url.sh <railway-dashboard-url>" >&2
  exit 64
fi

# normalize: strip fragment, decode %2F just in case
URL="${URL%%#*}"

PROJECT_ID=""
SERVICE_ID=""
ENV_ID=""

# project ID
if [[ "$URL" =~ /project/([0-9a-fA-F-]{36}) ]]; then
  PROJECT_ID="${BASH_REMATCH[1]}"
fi

# service ID
if [[ "$URL" =~ /service/([0-9a-fA-F-]{36}) ]]; then
  SERVICE_ID="${BASH_REMATCH[1]}"
fi

# environment ID (query param) — alternancia explícita: ? o &
if [[ "$URL" =~ (\?|\&)environmentId=([0-9a-fA-F-]{36}) ]]; then
  ENV_ID="${BASH_REMATCH[2]}"
fi

if [[ -z "$PROJECT_ID" ]]; then
  echo "ERROR: Could not parse a projectId from URL: $URL" >&2
  echo "Expected something like: https://railway.com/project/<uuid>/service/<uuid>?environmentId=<uuid>" >&2
  exit 1
fi

jq -nc \
  --arg p "$PROJECT_ID" \
  --arg s "$SERVICE_ID" \
  --arg e "$ENV_ID" \
  '{
    projectId: $p,
    serviceId: (if $s == "" then null else $s end),
    environmentId: (if $e == "" then null else $e end)
  }'
