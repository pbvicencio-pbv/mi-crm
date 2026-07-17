# Railway: CI/CD Integration

GitHub Actions deploys, project tokens, PR environments (incl. Focused PR Environments), GitOps patterns.

## Two deploy modes

### Mode A: Railway-managed (autodeploy on push)
The default when you `railway add --service api --repo owner/repo`. Railway watches the configured branch; on every push it triggers a build + deploy. No CI required.

**Disable** when:
- You want CI to gate (tests must pass before deploy)
- You want manual approvals
- You want preview environments scoped per PR (see below)

Toggle in dashboard → service Settings → Auto-Deploy.

### Mode B: CI-driven (you control when)
- Disable auto-deploy
- Set up a GitHub Actions workflow that calls `railway up` after tests pass
- Use a project token in repo secrets

## GitHub Actions: canonical workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    container: ghcr.io/railwayapp/cli:4.44.0    # CLI pre-installed (pin version, never `:latest`)
    steps:
      - uses: actions/checkout@v4
      - run: railway up --service ${{ vars.RAILWAY_SERVICE_ID }} --environment ${{ vars.RAILWAY_ENV_ID }} --ci -m "GHA ${{ github.sha }}"
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

Notes:
- `RAILWAY_TOKEN` = a **project token** scoped to the project + environment (Settings → Tokens in dashboard)
- `--ci` mode streams build logs and exits cleanly when build completes (vs default streaming until deploy SUCCESS)
- `-m "<msg>"` tags the deploy for traceability in dashboard history
- Pin the CLI image to a specific tag (e.g. `4.44.0`) — never `:latest`. For maximum determinism, pin by digest: `ghcr.io/railwayapp/cli@sha256:<digest>`.

## Tokens for CI

| Token type | Scope | Use for |
|---|---|---|
| Project token | one project + one environment, deploy/read | per-repo CI deploys (least privilege) |
| Workspace token | all projects in a workspace | multi-project automation |
| Account token | full account | personal scripts only — don't put in CI |

For GHA, prefer a **project token** scoped to the prod environment, named after the repo (e.g. `gha-myrepo-prod`).

## Multiple services from one repo

If your repo deploys to multiple Railway services (API + Worker + Cron), one workflow can deploy them in parallel:

```yaml
jobs:
  deploy:
    strategy:
      matrix:
        include:
          - service_id: api-uuid
            path: apps/api
          - service_id: worker-uuid
            path: apps/worker
    runs-on: ubuntu-latest
    container: ghcr.io/railwayapp/cli:4.44.0
    steps:
      - uses: actions/checkout@v4
      - run: railway up --service ${{ matrix.service_id }} --environment ${{ vars.RAILWAY_ENV_ID }} --ci --path-as-root ${{ matrix.path }} -m "GHA ${{ github.sha }}"
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

`--path-as-root` makes the subdir the build context (so each service gets only its own files uploaded).

## PR environments

Railway creates ephemeral environments per PR automatically when enabled. Each PR gets a full copy of services with their own URLs, DB, etc.

**Enable**: dashboard → project Settings → PR Environments.

### Focused PR Environments (Jan 2026)
A 2026 improvement: in monorepos, only the services touched by the PR's diff get a fresh environment. The rest fall back to the base environment. Massively cheaper for large monorepos with many services.

Enable: dashboard → project Settings → PR Environments → "Focused" mode.

### Per-PR config overrides
```toml
# railway.toml
[environments.pr.deploy]
restartPolicyType = "ON_FAILURE"
healthcheckTimeout = 60
# DB seeded fresh per PR? Use a smaller pool, less RAM, etc.
```

### Cost discipline
PR environments run real workloads. Each open PR can consume real $$. Mitigations:
- Enable Focused PR Environments
- Use sleeping (serverless mode) on non-prod environments — sleeps after 10 min idle
- Set workspace usage limits (soft + hard)
- Cap concurrent open PRs deploying to Railway

### Sealed variables in PR envs
Sealed variables are NOT copied to PR envs (by design — write-only secrets shouldn't propagate). For PR envs to work with sealed secrets:
- Use a separate non-sealed value in PR scope (e.g. test API keys)
- Or fall back gracefully when secret is missing
- Or use `${{shared.X}}` references with a non-sealed shared value at the PR level

## GitOps with `railway.toml` in the repo

Best practice for production: commit `railway.toml` per service. Then config-as-code is reviewed in PRs alongside code changes:

```toml
[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 120
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
overlapSeconds = 30
drainingSeconds = 10

[environments.production.deploy]
restartPolicyType = "ALWAYS"
preDeployCommand = "pnpm prisma migrate deploy"

[environments.staging.deploy]
healthcheckTimeout = 60
```

Railway picks this up automatically on every deploy (settings priority: per-environment > top-level > dashboard).

For monorepos: drop `railway.toml` in each service's root (`apps/api/railway.toml`) and set the **Config-as-Code Path** to `apps/api/railway.toml` in service Settings. (The config file does NOT auto-follow Root Directory — this is one of the more obscure footguns.)

## Variables in CI (rotation, sync)

To rotate or batch-update variables from CI:

```bash
# atomic multi-set + single deploy:
./.claude/skills/railway/scripts/railway-api.sh '
mutation($input: VariableCollectionUpsertInput!) {
  variableCollectionUpsert(input: $input)
}' "$(jq -nc \
  --arg p "$PROJECT_ID" \
  --arg e "$ENV_ID" \
  --arg s "$SERVICE_ID" \
  '{
    input: {
      projectId: $p,
      environmentId: $e,
      serviceId: $s,
      variables: {
        DATABASE_URL: env.DATABASE_URL,
        JWT_SECRET: env.JWT_SECRET
      },
      replace: false
    }
  }')"

# trigger one deploy:
./.claude/skills/railway/scripts/railway-api.sh \
  'mutation($s: String!, $e: String!) { serviceInstanceDeploy(serviceId: $s, environmentId: $e) }' \
  "$(jq -nc --arg s "$SERVICE_ID" --arg e "$ENV_ID" '{s: $s, e: $e}')"
```

For secret stores (Doppler, Vault, AWS Secrets Manager): pull secrets in CI, push to Railway via `variableCollectionUpsert`, deploy. Or use Railway's Doppler integration.

## Deploy from a Docker image you build in CI

For deterministic build caching (Railway's BuildKit cache is "best-effort"), build the image yourself and push to GHCR / Docker Hub:

```yaml
- uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: ghcr.io/${{ github.repository }}:${{ github.sha }}

- run: |
    ./.claude/skills/railway/scripts/railway-api.sh '
      mutation($s: String!, $e: String!, $input: ServiceInstanceUpdateInput!) {
        serviceInstanceUpdate(serviceId: $s, environmentId: $e, input: $input)
      }' "$(jq -nc \
        --arg s "$SERVICE_ID" --arg e "$ENV_ID" \
        --arg img "ghcr.io/${{ github.repository }}:${{ github.sha }}" \
        '{s: $s, e: $e, input: {source: {image: $img}}}')"
    ./.claude/skills/railway/scripts/railway-api.sh \
      'mutation($s: String!, $e: String!) { serviceInstanceDeploy(serviceId: $s, environmentId: $e) }' \
      "$(jq -nc --arg s "$SERVICE_ID" --arg e "$ENV_ID" '{s: $s, e: $e}')"
  env:
    RAILWAY_API_TOKEN: ${{ secrets.RAILWAY_API_TOKEN }}
```

This pattern decouples build from deploy: full build cache control in CI, plus Railway just pulls and runs.

## Pull request gates

Gate Railway deploys behind:
- **All tests pass** (typical)
- **Lint + typecheck pass**
- **Docker image scan clean** (Trivy, Grype)
- **Manual approval** (GHA `environment:` with required reviewers)

Example gate:
```yaml
deploy:
  needs: [test, lint, security-scan]
  environment:
    name: production
    url: https://api.example.com
```

## Webhooks back to CI

Railway can fire webhooks on deploy state changes to trigger downstream work (smoke tests, cache warm, alerting). Railway's webhook payload does **not** match the GitHub `repository_dispatch` contract directly — GitHub requires a JSON body with `event_type` (string, required) and optional `client_payload` (≤10 top-level properties), plus an `Authorization: Bearer <token>` header. Pointing a Railway webhook straight at `https://api.github.com/repos/<owner>/<repo>/dispatches` will fail validation.

Use a small relay (Cloudflare Worker, GHA-callable Lambda, or another Railway service) that:
1. Receives Railway's webhook (validate signature if configured).
2. Maps Railway's payload into `{ event_type: "<your-event>", client_payload: { ...selected fields up to 10 keys } }`.
3. POSTs to `https://api.github.com/repos/<owner>/<repo>/dispatches` with a fine-scoped GitHub token.

Service → Settings → Webhooks → point at your relay endpoint, not at api.github.com directly.

## Quick reference

| Want to | How |
|---|---|
| Deploy from GHA | `railway up --service <id> --ci -m "..."` with `RAILWAY_TOKEN` |
| CLI in CI | `ghcr.io/railwayapp/cli:4.44.0` container (pin version, never `:latest`) |
| Per-PR envs | Project Settings → PR Environments |
| Per-PR (monorepo, cheap) | Focused PR Environments mode |
| Token for CI | Project token (least privilege) |
| Atomic var update | GraphQL `variableCollectionUpsert` + single `serviceInstanceDeploy` |
| Build image yourself | GHA → GHCR → Railway image source + `serviceInstanceUpdate` |
| Per-env config | `[environments.<name>.deploy]` in railway.toml |
