# GraphQL API for CodeRabbit threads

GitHub's REST API **does not support resolving review threads**. Solo GraphQL lo soporta. Este doc cubre las queries y mutations que esta skill usa.

## Por qué GraphQL

- Thread resolution (`resolveReviewThread`) es GraphQL-only.
- Thread metadata completa (isResolved, isOutdated, startLine) es más fácil en una sola query.
- La mutation es idempotente — safe de llamar en threads ya resueltos.

## Autenticación

`gh` CLI maneja el token automáticamente:

```bash
gh auth status   # verifica que estás logueado con scope repo
```

Si necesitas scopes extra:
```bash
gh auth refresh -s repo,read:org
```

## Query: listar review threads de un PR

```graphql
query($owner: String!, $name: String!, $pr: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) {
        nodes {
          id                # PRRT_xxxxx — úsalo para resolve
          isResolved
          isOutdated        # true si la línea comentada ya no existe
          path
          line              # línea del último comentario del rango
          startLine         # línea inicial (para comentarios multi-línea)
          comments(first: 20) {
            nodes {
              id            # node ID del comentario (para GraphQL)
              databaseId    # ID numérico (para REST API si necesitas)
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
}
```

**CLI:**
```bash
gh api graphql \
  -f query="<QUERY>" \
  -F owner="tu-org" \
  -F name="tu-repo" \
  -F pr=42
```

## Mutation: resolver un thread

```graphql
mutation($threadId: ID!) {
  resolveReviewThread(input: {threadId: $threadId}) {
    thread {
      id
      isResolved
    }
  }
}
```

**CLI:**
```bash
gh api graphql \
  -f query='mutation($threadId: ID!){resolveReviewThread(input:{threadId:$threadId}){thread{id isResolved}}}' \
  -F threadId="PRRT_kwDOL12345"
```

Idempotente: llamar en thread ya resuelto devuelve `isResolved: true` sin error.

## Mutation: des-resolver un thread (rare)

```graphql
mutation($threadId: ID!) {
  unresolveReviewThread(input: {threadId: $threadId}) {
    thread {
      id
      isResolved
    }
  }
}
```

Útil si resolviste por error y necesitas reabrir la discusión.

## Query: obtener comentarios top-level (issue comments) de un PR

Estos son los comentarios que NO están atados a líneas de código (el walkthrough, summary, respuestas a `@coderabbitai`, etc).

```graphql
query($owner: String!, $name: String!, $pr: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $pr) {
      comments(first: 50) {
        nodes {
          id
          author { login }
          body
          createdAt
          url
        }
      }
    }
  }
}
```

Para el workflow de esta skill, los issue comments de CR son informacionales — no requieren resolve. Solo los review threads importan.

## Post reply a un thread (mencionar @coderabbitai)

Esto usa REST (GraphQL no tiene mutation para reply a review comment):

```bash
gh api \
  --method POST \
  "repos/${OWNER}/${REPO}/pulls/${PR}/comments/${COMMENT_ID}/replies" \
  -f body="@coderabbitai <razón del disagreement>"
```

Donde `COMMENT_ID` es `databaseId` (no node ID) del comentario al que respondes.

## Patrones comunes

### Obtener solo threads NO resueltos de CR

```bash
gh api graphql -f query='...' -F owner=X -F name=Y -F pr=N \
  | jq '.data.repository.pullRequest.reviewThreads.nodes[]
        | select(.isResolved == false)
        | select(.comments.nodes[0].author.login | test("coderabbitai"; "i"))'
```

### Contar threads abiertos por categoría

```bash
gh api graphql -f query='...' -F owner=X -F name=Y -F pr=N \
  | jq '[.data.repository.pullRequest.reviewThreads.nodes[]
         | select(.isResolved == false)
         | select(.comments.nodes[0].author.login | test("coderabbitai"; "i"))
         | .comments.nodes[0].body
         | if test("Security|🛡️") then "security"
           elif test("Nitpick|🧹") then "nitpick"
           elif test("Refactor|🛠️") then "refactor"
           else "other" end]
        | group_by(.) | map({category: .[0], count: length})'
```

### Bulk resolve threads ya fixeados

```bash
# Después de un push, CR suele marcar algunos threads como "addressed"
# automáticamente si tienes auto_review_comments habilitado. Para los que
# siguen abiertos pero sabes que fixeaste:

for thread_id in $(cat resolved_threads.txt); do
  ./scripts/resolve_thread.sh "$thread_id"
  sleep 0.5  # rate limiting
done
```

## Errores comunes

**"Could not resolve to a node with the global id"**
- El `thread_id` está mal. Debe tener prefijo `PRRT_`. Verifica con la query de listado.
- No uses el databaseId del comentario como thread_id — son diferentes.

**"The user does not have permission"**
- Tu token no tiene scope `repo` con write access al repo.
- `gh auth refresh -s repo` para re-autorizar.

**Rate limiting (GraphQL tiene 5000 points/hora)**
- El listado de threads consume ~10-50 points dependiendo del tamaño del PR.
- Resolve consume ~1 point.
- En flujos típicos (decenas de PRs/día) no deberías llegar al límite.
- Si pasa: `sleep 60 && retry`.

## Referencias

- GitHub GraphQL explorer: https://docs.github.com/en/graphql/overview/explorer
- Schema: https://docs.github.com/en/graphql/reference/mutations#resolvereviewthread
- Rate limits: https://docs.github.com/en/graphql/overview/resource-limitations
