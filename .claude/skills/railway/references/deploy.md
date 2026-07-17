# Railway: Deploy, Redeploy, Rollback, Restart

Covers triggering deploys, monitoring them, rolling back, and restarting services.

## The deploy lifecycle

```
INITIALIZING → BUILDING → DEPLOYING → SUCCESS
                                    ↘ FAILED      (build or deploy error)
                                    ↘ CRASHED     (running but exited unexpectedly)
                                    ↘ REMOVING → REMOVED
```

Other states you'll encounter:
- `SLEEPING` — serverless app-sleep activated (no inbound traffic for 10+ min)
- `SKIPPED` — cron run skipped because previous run still alive
- `WAITING` / `QUEUED` — waiting for a build slot or pre-deploy

A deploy goes "Active" only after the healthcheck returns 200 OK on the configured path. Until then, traffic stays on the previous deploy.

## Trigger a deploy

### From a Git push
If the service is connected to a GitHub repo, every push to the configured branch deploys automatically. Disable this in dashboard → service Settings → Auto-Deploy if you want CI-only deploys.

### From the local working directory (`railway up`)
```bash
# from a linked repo:
railway up

# explicit (preferred for skill use - robust against link state):
railway up \
  --service <serviceId> \
  --environment <envId> \
  --detach \
  --message "Deploy v1.2.3"

# CI mode - streams build logs only, exits when build done (good for GitHub Actions):
railway up --ci --service <serviceId>

# subdir as build context (file paths inside archive will be rooted at <subdir>):
railway up --path-as-root apps/api
```

`railway up` scans the cwd, applies `.gitignore` and `.railwayignore`, compresses, uploads, and triggers a deploy. By default it streams logs until SUCCESS or FAILED. Use `--detach` to return immediately.

### From a registry image (no source code transfer)
```bash
railway redeploy --service <id>   # re-pulls the image and deploys
```
For services connected to an image source, just trigger a redeploy. The image will be re-pulled.

### From GraphQL (no CLI required)
```graphql
mutation deploy($serviceId: String!, $environmentId: String!) {
  serviceInstanceDeploy(serviceId: $serviceId, environmentId: $environmentId)
}
```
```bash
./.claude/skills/railway/scripts/railway-api.sh \
  'mutation($s: String!, $e: String!) { serviceInstanceDeploy(serviceId: $s, environmentId: $e) }' \
  '{"s":"<serviceId>","e":"<envId>"}'
```

## Watch the deploy

```bash
# all logs (deploy + build), streamed:
railway logs --service <id> --environment <id>

# just the build phase:
railway logs --build --service <id>

# specific deployment ID:
railway logs --deployment <deploymentId>

# JSON output for parsing:
railway logs --json --service <id> | jq

# only the last 200 lines:
railway logs --lines 200 --service <id>

# server-side filtering (CLI ≥4.9):
railway logs --filter "@level:error" --service <id>
railway logs --filter "@status:>=500" --service <id>
```

Filter syntax (full reference in `operate.md`):
- `keyword` or `"phrase"` — substring search
- `@level:error|warn|info|debug`
- `@status:>=500` — HTTP logs only
- `replica:<replicaId>` — single-replica scope
- `-@level:info` — negate
- `OR`, implicit `AND`

## Redeploy

Re-runs the latest deploy with the same code (re-pulls image, re-runs build):
```bash
railway redeploy                        # current linked service
railway redeploy --service <id> -y      # explicit, skip confirmation
```

Useful when:
- An external dep changed (e.g. you bumped a Docker base image tag)
- You want to retry a CRASHED service after fixing an env var
- You want to re-trigger a healthcheck after fixing the endpoint

## Restart

Restarts the running container WITHOUT redeploying (no rebuild, no image pull):
```bash
railway restart --service <id>
```

Use this when:
- Your app got into a bad state but the code/image is fine
- You changed a variable and want it to take effect (note: variable changes via `railway variable set` already auto-redeploy unless `--skip-deploys`)

## Rollback

Roll back to a previous successful deployment:
```bash
# 1. list past deploys to find the one you want
./.claude/skills/railway/scripts/railway-api.sh '
query($input: DeploymentListInput!) {
  deployments(input: $input, first: 20) {
    edges { node { id status createdAt staticUrl meta } }
  }
}' '{"input":{"projectId":"<p>","environmentId":"<e>","serviceId":"<s>"}}'

# 2. trigger rollback via GraphQL (no direct CLI command)
./.claude/skills/railway/scripts/railway-api.sh \
  'mutation($id: String!) { deploymentRollback(id: $id) }' \
  '{"id":"<deploymentId>"}'
```

Or, in the dashboard: Deployments tab → click the kebab menu on a previous SUCCESS deploy → Rollback.

**Caveats**:
- Rollback re-runs the previous deploy from the same image/source — it does NOT touch your variables. If you also need to revert variables, do that separately.
- Rollback creates a new deployment record (it doesn't reactivate the old one).

## Take a service down

```bash
railway down                # remove the latest deployment of the linked service
railway down -y             # skip confirmation
```

This stops the service. The service still exists; only the active deployment is removed. To bring it back, `railway redeploy` or trigger a new deploy.

To delete the service entirely:
```bash
railway delete --service <id> -y
```

⚠️ Deleting a service deletes its deploy history, variables, and (if attached) prompts about its volume. Confirm with the user before doing this.

## Zero-downtime deploys

By default, Railway does NOT overlap the old and new deploys — it stops the old container before the new one is healthy. To get zero-downtime:

```toml
[deploy]
overlapSeconds = 30                 # keep old deploy running 30s after new is Active
drainingSeconds = 10                # SIGTERM → SIGKILL window
```

Or as env vars on the service:
- `RAILWAY_DEPLOYMENT_OVERLAP_SECONDS=30`
- `RAILWAY_DEPLOYMENT_DRAINING_SECONDS=10`

**For Node.js**: `npm start` does NOT forward SIGTERM to your child process by default. Either:
- use `node dist/server.js` directly as the start command, or
- use `dumb-init` / `tini` in the Dockerfile entrypoint, or
- in the start script use `exec` to replace the shell: `exec node dist/server.js`

**Volume gotcha**: Railway prevents two deployments from being active and mounted to the same volume simultaneously. Services with attached volumes get brief downtime regardless of `overlapSeconds`. Plan stateful deploys around this.

## Pre-deploy commands (migrations)

`preDeployCommand` runs BETWEEN build and deploy, in a separate ephemeral container. Use for DB migrations:

```toml
[deploy]
preDeployCommand = "pnpm prisma migrate deploy"
```

**Critical limitations**:
- ❌ NO volume access (volumes are not mounted yet)
- ❌ NO private networking (the service isn't on the network yet)
- ❌ NO replicas (single ephemeral container)
- ❌ NO automatic retry — if pre-deploy fails, the deploy fails. Make migrations idempotent.

If your migration needs the database, reference the **public** `${{Postgres.DATABASE_PUBLIC_URL}}` during pre-deploy (Railway lets pre-deploy reach the public DB endpoint). Be aware this counts as egress.

For migrations that need private DNS, run them at app startup instead (gated by an env flag like `RUN_MIGRATIONS_ON_BOOT=1`).

## Deploy a template

```bash
railway deploy --template <templateId>
```
Browses the marketplace at https://railway.com/templates. After deploy, services land in your project and you can override variables, regions, etc.

## Common issues during deploy

- **Build hangs at "Generating BuildKit graph"** → likely Railpack auto-detection picked the wrong provider. Add a `railpack.json` with explicit `providers: ["node"]` or similar.
- **"No start command found"** → Railpack couldn't infer one. Either add a `start` script to `package.json` or set `startCommand` in `railway.toml`.
- **Healthcheck timeout** → app takes longer than 300s to bind. Increase `healthcheckTimeout` or move slow init out of the request path.
- **Cache miss on every build** → check if `RAILWAY_DEPLOYMENT_ID` is consumed early in your Dockerfile and bursting the cache. Move that line below cacheable steps.
- **CRASHED loop** → Read logs (`railway logs`). Common causes: missing env var, port binding mismatch, signal handling.
- **"Deploy failed" with no clear log** → check Build logs and Deploy logs separately: `railway logs --build` vs `railway logs`.

For deeper troubleshooting see `operate.md`.

## Quick reference

| Want to | Command |
|---|---|
| Deploy current dir | `railway up -s <id> -e <id>` |
| Re-trigger latest with same code | `railway redeploy -s <id> -y` |
| Restart container only | `railway restart -s <id>` |
| Take service offline | `railway down -s <id> -y` |
| Roll back to specific deploy | GraphQL `deploymentRollback(id)` |
| Watch logs | `railway logs -s <id> -e <id>` |
| Build logs only | `railway logs --build -s <id>` |
| Tail with filter | `railway logs --filter "@level:error" -s <id>` |
