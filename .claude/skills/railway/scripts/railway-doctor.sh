#!/usr/bin/env bash
# railway-doctor.sh - preflight checks for the Railway skill
#
# Verifies:
#   - railway CLI installed and version
#   - jq installed (required by railway-api.sh)
#   - curl installed
#   - some form of auth available
#   - prints whoami if authed
#
# Exits 0 if everything is green, 1 if any blocker, 2 if soft warning only.

set -uo pipefail

BLOCKER=0
WARN=0
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

ok()    { printf "${GREEN}✓${RESET} %s\n" "$*"; }
warn()  { printf "${YELLOW}⚠${RESET} %s\n" "$*"; WARN=1; }
fail()  { printf "${RED}✗${RESET} %s\n" "$*"; BLOCKER=1; }

echo "Railway skill preflight check"
echo "─────────────────────────────"

# 1. railway CLI
if command -v railway >/dev/null 2>&1; then
  RW_VER=$(railway --version 2>/dev/null | head -1)
  ok "railway CLI found: $RW_VER"
else
  fail "railway CLI not found. Install with one of:"
  echo "    brew install railway"
  echo "    npm install -g @railway/cli"
  echo "    scoop install railway"
  echo "    See https://docs.railway.com/reference/cli for the official installer (review before running)"
fi

# 2. jq
if command -v jq >/dev/null 2>&1; then
  ok "jq found: $(jq --version)"
else
  fail "jq not found (required by railway-api.sh). Install:"
  echo "    brew install jq | apt install jq | choco install jq"
fi

# 3. curl
if command -v curl >/dev/null 2>&1; then
  ok "curl found"
else
  fail "curl not found"
fi

# 4. auth
AUTHED=0
if [[ -n "${RAILWAY_API_TOKEN:-}" ]]; then
  ok "RAILWAY_API_TOKEN is set (account/workspace token)"
  AUTHED=1
fi
if [[ -n "${RAILWAY_PROJECT_TOKEN:-}" ]]; then
  ok "RAILWAY_PROJECT_TOKEN is set (project-scoped)"
  AUTHED=1
fi
if [[ -n "${RAILWAY_TOKEN:-}" ]]; then
  ok "RAILWAY_TOKEN is set"
  AUTHED=1
fi

if command -v railway >/dev/null 2>&1; then
  if railway whoami --json >/dev/null 2>&1; then
    USER_JSON=$(railway whoami --json 2>/dev/null)
    USER_EMAIL=$(echo "$USER_JSON" | jq -r '.email // .name // "unknown"' 2>/dev/null)
    ok "CLI is authed as: $USER_EMAIL"
    AUTHED=1
  fi
fi

if [[ $AUTHED -eq 0 ]]; then
  warn "No auth detected. For interactive use: railway login"
  echo "    For CI / scripting set one of:"
  echo "      export RAILWAY_API_TOKEN=...     (account/workspace, full scope)"
  echo "      export RAILWAY_PROJECT_TOKEN=... (project-scoped, deploy-only)"
  echo "    Get tokens at https://railway.com/account/tokens"
fi

# 5. linked context (informational only)
if command -v railway >/dev/null 2>&1; then
  if railway status --json >/dev/null 2>&1; then
    STATUS_JSON=$(railway status --json 2>/dev/null)
    PROJ=$(echo "$STATUS_JSON" | jq -r '.name // empty' 2>/dev/null)
    [[ -n "$PROJ" ]] && ok "linked project: $PROJ"
  fi
fi

echo "─────────────────────────────"
if [[ $BLOCKER -eq 1 ]]; then
  echo "Status: BLOCKED — fix the ✗ items above before proceeding"
  exit 1
elif [[ $WARN -eq 1 ]]; then
  echo "Status: ready, with warnings"
  exit 2
else
  echo "Status: ready"
  exit 0
fi
