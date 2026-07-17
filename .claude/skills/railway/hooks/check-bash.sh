#!/usr/bin/env bash
# check-bash.sh — Pre-tool-use hook: classify bash commands by risk
#
# Reads the proposed bash command from stdin (sent as JSON by the agent harness).
# Outputs a JSON decision: {"action":"allow"|"prompt"|"block","reason":"..."}
#
# Policy:
#   ALLOW (no prompt):
#     - railway: read-only commands (status, list, logs, whoami, variable get/list,
#                volume list, domain list, etc.)
#     - railway up, railway redeploy, railway restart  (deploy ops, recoverable)
#     - the skill's own scripts/* helpers when called read-only or for known mutations
#     - jq, grep, cat, ls, head, tail, curl (safe inspection)
#
#   PROMPT:
#     - railway variable set / delete  (mutates state, redeploys)
#     - railway link / unlink  (changes local state)
#     - railway run / railway shell  (executes arbitrary local code with prod env)
#     - GraphQL mutations via railway-api.sh
#
#   BLOCK:
#     - railway delete (service)
#     - railway down (removes deployment)
#     - railway volume delete  /  bucket delete  /  domain delete
#     - GraphQL *Delete mutations
#     - rm -rf, sudo, chmod 777, etc. (general bash danger)
#
# Note: this hook tightens defaults specifically for railway operations.
# Per the PreToolUse hook contract:
#   - decision "block" is honored regardless of allowed-tools (defense in depth).
#   - decision "prompt" can be bypassed by allowed-tools (auto-allow).
#   - decision "allow" skips the permission prompt entirely.
# Destructive ops (delete/down/etc.) blocked here CANNOT be auto-allowed even
# if a broader allowed-tools entry would otherwise match.

set -uo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "$INPUT")

decision() {
  local action="$1"
  local reason="$2"
  jq -nc --arg a "$action" --arg r "$reason" '{action: $a, reason: $r}'
  exit 0
}

# Block obviously dangerous patterns first
case "$CMD" in
  *"rm -rf /"*|*"rm -rf ~"*|*"rm -rf ."*)
    decision "block" "Refusing to rm -rf with broad target"
    ;;
  *"sudo "*|*" sudo "*)
    decision "block" "sudo not allowed in this skill"
    ;;
esac

# Block destructive railway operations (require explicit user confirmation in chat)
case "$CMD" in
  *"railway delete"*)
    decision "block" "railway delete is destructive — confirm in chat first"
    ;;
  *"railway service delete"*|*"railway environment delete"*)
    decision "block" "railway service/environment delete is destructive — confirm in chat first"
    ;;
  *"railway down"*)
    decision "block" "railway down removes the deployment — confirm in chat first"
    ;;
  *"railway volume delete"*|*"railway bucket delete"*|*"railway domain delete"*)
    decision "block" "destructive resource delete — confirm in chat first"
    ;;
  *"serviceDelete"*|*"projectDelete"*|*"environmentDelete"*|*"volumeDelete"*|*"customDomainDelete"*|*"tcpProxyDelete"*)
    decision "block" "GraphQL *Delete mutation — confirm in chat first"
    ;;
esac

# Prompt for state-mutating but recoverable operations
case "$CMD" in
  *"railway variable set"*|*"railway variable delete"*)
    decision "prompt" "Variable change will trigger a redeploy"
    ;;
  *"railway link"*|*"railway unlink"*)
    decision "prompt" "Changing local link state"
    ;;
  *"railway run"*|*"railway shell"*)
    decision "prompt" "Executing arbitrary local command with production env vars"
    ;;
  *"variableUpsert"*|*"variableCollectionUpsert"*|*"serviceInstanceUpdate"*|*"customDomainCreate"*|*"volumeCreate"*|*"volumeUpdate"*|*"deploymentRollback"*)
    decision "prompt" "GraphQL mutation will modify Railway state"
    ;;
esac

# Auto-allow read-only or recoverable railway ops + skill helpers + safe shell
case "$CMD" in
  railway*status*|railway*list*|railway*logs*|railway*whoami*|railway*--version*|railway*--help*)
    decision "allow" "railway read-only command"
    ;;
  *"railway variable get"*|*"railway variable list"*|*"railway volume list"*|*"railway domain list"*|*"railway domain info"*|*"railway connect"*)
    decision "allow" "railway inspection / connection command"
    ;;
  *"railway up"*|*"railway redeploy"*|*"railway restart"*)
    decision "allow" "railway deploy operation (recoverable)"
    ;;
  ./.claude/skills/railway/scripts/railway-doctor.sh*|./.claude/skills/railway/scripts/ids-from-url.sh*)
    decision "allow" "skill helper (read-only)"
    ;;
  ./.claude/skills/railway/scripts/railway-api.sh*query*|./.claude/skills/railway/scripts/railway-api.sh*'__schema'*|./.claude/skills/railway/scripts/railway-api.sh*'__type'*)
    decision "allow" "railway-api.sh introspection / read-only query"
    ;;
  jq*|grep*|cat*|ls*|head*|tail*|echo*|which*|*"command -v "*|command\ -v)
    decision "allow" "safe inspection command"
    ;;
esac

# Default: prompt — let the harness's normal flow handle it
decision "prompt" "default: prompting user for approval"
