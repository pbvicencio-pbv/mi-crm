#!/usr/bin/env bash
# fetch_cr_comments.sh
# Uso: ./fetch_cr_comments.sh <owner/repo> <pr_number>
#
# Obtiene review threads de un PR vía GitHub GraphQL API, filtra los de
# CodeRabbit, y los emite como JSON con shape accionable para Claude Code.
#
# Requiere: gh CLI autenticado con scope `repo`.

set -euo pipefail

REPO="${1:?Usage: $0 <owner/repo> <pr_number>}"
PR="${2:?Usage: $0 <owner/repo> <pr_number>}"
OWNER="${REPO%/*}"
NAME="${REPO#*/}"

# Query GraphQL: obtiene todos los review threads con sus comentarios
# y metadata de resolución. Páginación hasta 100 threads — suficiente para PRs normales.
QUERY='
query($owner: String!, $name: String!, $pr: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          startLine
          comments(first: 20) {
            nodes {
              id
              databaseId
              author { login }
              body
              createdAt
              url
            }
          }
        }
      }
    }
  }
}'

RAW=$(gh api graphql \
  -f query="$QUERY" \
  -F owner="$OWNER" \
  -F name="$NAME" \
  -F pr="$PR")

# Filtrar threads donde el primer comentario es de CodeRabbit,
# extraer categoría del cuerpo, y normalizar.
echo "$RAW" | jq -r '
  .data.repository.pullRequest.reviewThreads.nodes[]
  | select(.comments.nodes[0].author.login | test("coderabbitai"; "i"))
  | {
      thread_id: .id,
      resolved: .isResolved,
      outdated: .isOutdated,
      path: .path,
      line: (.line // .startLine),
      first_comment_id: .comments.nodes[0].databaseId,
      first_comment_url: .comments.nodes[0].url,
      created_at: .comments.nodes[0].createdAt,
      body: .comments.nodes[0].body,
      category: (
        .comments.nodes[0].body
        | if test("🛡️|Security|vulnerabilidad"; "i") then "security"
          elif test("⚠️ Potential issue|Potential bug|bug potencial"; "i") then "bug"
          elif test("🛠️ Refactor suggestion|Refactor"; "i") then "refactor"
          elif test("🧹 Nitpick|nitpick \\(optional\\)"; "i") then "nitpick"
          elif test("⚡|Performance|performance"; "i") then "performance"
          elif test("📝 Documentation|Documentation"; "i") then "docs"
          else "other"
          end
      ),
      has_committable_suggestion: (.comments.nodes[0].body | test("```suggestion")),
      has_ai_prompt: (.comments.nodes[0].body | test("Prompt for AI Agents|🤖")),
      is_coderabbit: true
    }
'
