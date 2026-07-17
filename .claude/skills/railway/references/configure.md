# Railway: Configuration

Variables & secrets, reference variables, healthchecks, restart policy, replicas, regions, watch patterns.

## Variables: the four types

| Type | Lives at | Inject into | CLI flag |
|---|---|---|---|
| Service variable | service+env | that service only | (default) |
| Shared variable | project+env, namespace `shared` | any service that references `${{shared.VAR}}` | `--shared` |
| Reference variable | derived | resolved at deploy time | (uses `${{...}}` syntax) |
| Sealed variable | service+env, write-only | builds + deploys, but never readable back | `--seal` (when supported by your CLI version) |

### Set a service variable
```bash
# CLI - automatically triggers a redeploy:
railway variable set DATABASE_URL "postgres://..." --service <id> --environment <id>

# don't redeploy yet (batch multiple, deploy once):
railway variable set DATABASE_URL "..." --service <id> --skip-deploys
railway variable set REDIS_URL "..."    --service <id> --skip-deploys
railway redeploy --service <id> -y

# get one:
railway variable get DATABASE_URL --service <id> --json

# list all (excluding sealed values):
railway variable list --service <id> --json | jq

# delete:
railway variable delete OLD_VAR --service <id>
```

### Set a shared variable
Shared variables are project-level and accessible from any service via `${{shared.NAME}}`. Set them in the dashboard (project → Variables tab → Shared) or via GraphQL:

```bash
./.claude/skills/railway/scripts/railway-api.sh '
mutation($input: VariableUpsertInput!) {
  variableUpsert(input: $input)
}' '{
  "input": {
    "projectId":"<p>",
    "environmentId":"<e>",
    "name":"STRIPE_SECRET",
    "value":"sk_live_...",
    "shared": true
  }
}'
```

### Reference variable syntax
```
${{ServiceName.VARIABLE}}           # cross-service
${{shared.VARIABLE}}                # project-level shared
${{ VARIABLE }}                     # same-service
${{Postgres.DATABASE_URL}}          # database connection (most common)
${{secret(64)}}                     # template fn - generates secret on deploy
${{secret(32, "abcdef0123456789")}} # custom length + charset
```

References are resolved at deploy time. Changing the underlying value triggers redeploys of dependent services.

### Atomic multi-variable update (no in-between states)

Use `variableCollectionUpsert` to set multiple variables in one call, then deploy once:

```bash
./.claude/skills/railway/scripts/railway-api.sh '
mutation($input: VariableCollectionUpsertInput!) {
  variableCollectionUpsert(input: $input)
}' '{
  "input": {
    "projectId":"<p>",
    "environmentId":"<e>",
    "serviceId":"<s>",
    "variables":{
      "DATABASE_URL":"postgres://...",
      "REDIS_URL":"redis://...",
      "JWT_SECRET":"..."
    },
    "replace": false
  }
}'

# then trigger one deploy:
./.claude/skills/railway/scripts/railway-api.sh \
  'mutation($s: String!, $e: String!) { serviceInstanceDeploy(serviceId: $s, environmentId: $e) }' \
  '{"s":"<s>","e":"<e>"}'
```

`replace: true` wipes all existing variables for that scope. Use with caution.

### Sealed variables (write-only secrets)

Sealed variables can NEVER be read back by anyone — not the dashboard, not the API, not the CLI. They're injected into builds and deploys but otherwise opaque.

**Sealed variables are NOT**:
- Copied to PR environments
- Copied when duplicating environments or services
- Visible in env-sync diffs
- Synced to integrations

**Pattern that works**: seal the secret components inside **shared** variables, and keep URL templates as unsealed `${{...}}` references:

```
# shared, sealed:
DB_PASSWORD = <sealed>

# service variables, unsealed:
DATABASE_URL = postgres://app:${{shared.DB_PASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/app
```

**Footgun**: do NOT seal a shared variable that is referenced via `${{...}}` from another sealed variable's environment — resolution becomes flaky on first-deploys after env duplication. Stick to the pattern above.

### Staged changes

Variables changes via the dashboard or GraphQL are **staged**, not applied. They only take effect on the next deploy. The CLI's `railway variable set` triggers a deploy by default; pass `--skip-deploys` to stage without deploying.

To check what's staged:
```bash
./.claude/skills/railway/scripts/railway-api.sh \
  'query($e: String!) { environmentStagedChanges(environmentId: $e) }' \
  '{"e":"<envId>"}'
```

## System-injected variables (read-only, from Railway)

Railway injects these into every container at runtime. Use them in your code, never override them:

| Variable | Description |
|---|---|
| `PORT` | Bind to `0.0.0.0:$PORT` (or `[::]:$PORT` for dual-stack) |
| `RAILWAY_PUBLIC_DOMAIN` | e.g. `my-api-production.up.railway.app` |
| `RAILWAY_PRIVATE_DOMAIN` | e.g. `my-api.railway.internal` (use over `http://`) |
| `RAILWAY_TCP_PROXY_DOMAIN` | e.g. `roundhouse.proxy.rlwy.net` (if TCP proxy enabled) |
| `RAILWAY_TCP_PROXY_PORT` | external port for TCP proxy |
| `RAILWAY_TCP_APPLICATION_PORT` | internal port the TCP proxy targets |
| `RAILWAY_PROJECT_ID/_NAME` | project metadata |
| `RAILWAY_ENVIRONMENT_ID/_NAME` | environment metadata |
| `RAILWAY_SERVICE_ID/_NAME` | service metadata |
| `RAILWAY_REPLICA_ID` / `RAILWAY_REPLICA_REGION` | per-replica (e.g. `us-west2`) |
| `RAILWAY_DEPLOYMENT_ID`, `RAILWAY_SNAPSHOT_ID` | deployment metadata |
| `RAILWAY_VOLUME_NAME/_MOUNT_PATH` | attached volume (if any) |

**Git variables** (only for GitHub-triggered deploys):
- `RAILWAY_GIT_COMMIT_SHA`
- `RAILWAY_GIT_AUTHOR`
- `RAILWAY_GIT_BRANCH`
- `RAILWAY_GIT_REPO_NAME`
- `RAILWAY_GIT_REPO_OWNER`
- `RAILWAY_GIT_COMMIT_MESSAGE`

**User-configurable behavior variables** (set as service variables):
- `RAILWAY_DEPLOYMENT_OVERLAP_SECONDS` — zero-downtime overlap (default 0)
- `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` — SIGTERM→SIGKILL window (default 0)
- `RAILWAY_DOCKERFILE_PATH` — alternate Dockerfile path
- `RAILWAY_HEALTHCHECK_TIMEOUT_SEC` — healthcheck total timeout (default 300)
- `RAILWAY_RUN_UID` — UID at runtime; set `0` for non-root images writing to volumes
- `RAILWAY_SHM_SIZE_BYTES` — `/dev/shm` size (default 64 MB)

**Critical footgun**: `${{svc.PORT}}` references render EMPTY because `PORT` is runtime-injected, not a service variable. If service A needs to call service B by referencing B's port, set an explicit `PORT=8080` service variable on B.

## Healthchecks

Healthchecks gate traffic during a deploy: Railway hits `healthcheckPath` until 200 OK before flipping traffic from old → new deploy. They are NOT continuous monitoring.

```toml
[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 120         # default 300s; total deadline before deploy fails
```

- The healthcheck request comes from hostname `healthcheck.railway.app` — allowlist this if you have hostname filters
- Your endpoint should return 200 (any 2xx works) and respond fast (<1s)
- Don't hit your DB on this endpoint — keep it cheap
- Bind to `0.0.0.0:$PORT` (or `[::]:$PORT`) — binding to `127.0.0.1` will fail healthchecks
- For continuous uptime monitoring, deploy the Uptime Kuma template separately

If `healthcheckPath` is unset, Railway just waits a brief grace period and assumes healthy. Always set it for production.

## Restart policy

```toml
[deploy]
restartPolicyType = "ON_FAILURE"      # ALWAYS | ON_FAILURE | NEVER
restartPolicyMaxRetries = 10
```

| Policy | Behavior |
|---|---|
| `ALWAYS` | Restart on any exit (zero or non-zero). Pro+ feature. Use for workers, daemons. |
| `ON_FAILURE` | Restart only on non-zero exit. **Default**. Use for HTTP services. |
| `NEVER` | Never restart. Use for cron jobs that should fail loudly. |

For multi-replica services, only the failing replica is restarted (the others keep serving traffic).

## Watch patterns (control what triggers builds)

```toml
[build]
watchPatterns = [
  "src/**",
  "package.json",
  "pnpm-lock.yaml",
  "Dockerfile"
]
```

Only changes matching one of these gitignore-style patterns will trigger a rebuild. Critical for monorepos. Without this, every commit anywhere in the repo redeploys every service.

## Replicas (horizontal scaling)

```bash
# scale to 3 replicas in us-west2:
railway scale --service <id> --replicas 3 --region us-west2

# multi-region:
railway scale --service <id> --replicas 2 --region us-west2
railway scale --service <id> --replicas 1 --region europe-west4-drams3a
```

Or in `railway.toml`:
```toml
[deploy.multiRegionConfig]
"us-west2" = { numReplicas = 2 }
"europe-west4-drams3a" = { numReplicas = 1 }
```

**Important**:
- Each replica gets the FULL plan ceiling. On Pro (1,000 vCPU/1 TB total), 3 replicas = up to 3,000 vCPU/3 TB combined.
- No sticky sessions; load balancing is random within region.
- Cross-region routing is by GeoDNS (closest healthy replica wins).
- **As of Feb 2026**, adding/removing replicas does NOT trigger a rebuild (deploy-less horizontal scaling).
- Up to 50 replicas at 48 vCPU/48 GB each on Enterprise.

## Regions (May 2026)

There are exactly **four** valid region identifiers. Reject anything else.

| Display | Location | Identifier |
|---|---|---|
| US West Metal | California, USA | `us-west2` |
| US East Metal | Virginia, USA | `us-east4-eqdc4a` |
| EU West Metal | Amsterdam, NL | `europe-west4-drams3a` |
| Southeast Asia Metal | Singapore | `asia-southeast1-eqsg3a` |

All regions are Railway Metal (bare-metal). Volumes follow service region — moving a service to a different region migrates the volume with brief downtime.

## Pre-deploy command (migrations)

Already covered in `deploy.md`. Quick recap:

```toml
[deploy]
preDeployCommand = "pnpm prisma migrate deploy"
```

- Runs in an ephemeral container BETWEEN build and deploy
- ❌ NO volume mount, NO private network, NO replicas
- ❌ NO automatic retry — make it idempotent
- Reaches DB only via public URL during pre-deploy phase

## Cron schedule

```toml
[deploy]
cronSchedule = "0 */6 * * *"     # every 6 hours, UTC
restartPolicyType = "NEVER"      # don't restart after success
```

- Standard 5-field crontab, UTC only
- 5-minute minimum granularity
- Service must `exit 0` cleanly
- If a previous run is still alive when the next is scheduled, the next is **skipped** (no overlap)
- Precision is ~"within a few minutes" — for sub-minute scheduling use external triggers

## Service-level applied via GraphQL (most flexible)

```graphql
mutation update($s: String!, $e: String!, $input: ServiceInstanceUpdateInput!) {
  serviceInstanceUpdate(serviceId: $s, environmentId: $e, input: $input)
}
```
Input fields you'll touch most:
```json
{
  "startCommand": "node dist/server.js",
  "buildCommand": "pnpm run build",
  "rootDirectory": "apps/api",
  "healthcheckPath": "/health",
  "healthcheckTimeout": 120,
  "restartPolicyType": "ON_FAILURE",
  "restartPolicyMaxRetries": 10,
  "numReplicas": 2,
  "region": "us-west2",
  "sleepApplication": false,
  "watchPatterns": ["apps/api/**", "packages/shared/**"],
  "preDeployCommand": "pnpm prisma migrate deploy",
  "cronSchedule": null
}
```

This bypasses `railway.toml` and lets you template service config across many projects programmatically.

## Quick reference

| Want to | How |
|---|---|
| Set a variable | `railway variable set KEY value -s <id>` |
| Set without deploying | `railway variable set KEY value -s <id> --skip-deploys` |
| Set many at once | GraphQL `variableCollectionUpsert` |
| Reference another service's URL | `${{ServiceName.RAILWAY_PRIVATE_DOMAIN}}` |
| Reference DB | `${{Postgres.DATABASE_URL}}` |
| Generate strong secret | `${{secret(64)}}` (template only) |
| Healthcheck path | `[deploy] healthcheckPath = "/health"` |
| Restart always | `restartPolicyType = "ALWAYS"` |
| Scale to N | `railway scale --replicas N --region <id>` |
| Multi-region | `[deploy.multiRegionConfig]` per-region table |
| Cron | `[deploy] cronSchedule = "..."` |
