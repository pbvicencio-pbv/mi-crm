#!/usr/bin/env bash
# resolve_thread.sh
# Uso: ./resolve_thread.sh <thread_id>
#
# Resuelve un review thread de CodeRabbit via GraphQL mutation
# `resolveReviewThread`. Idempotente: safe de llamar en threads ya resueltos.
#
# thread_id tiene formato PRRT_xxxxx, obtenido de fetch_cr_comments.sh

set -euo pipefail

THREAD_ID="${1:?Usage: $0 <thread_id>}"

MUTATION='
mutation($threadId: ID!) {
  resolveReviewThread(input: {threadId: $threadId}) {
    thread {
      id
      isResolved
    }
  }
}'

gh api graphql \
  -f query="$MUTATION" \
  -F threadId="$THREAD_ID" \
  --jq '.data.resolveReviewThread.thread | "Resolved: \(.id) (isResolved=\(.isResolved))"'
