# Railway: Operate, Debug, Troubleshoot

Logs (with full filter syntax), SSH into running containers, run commands locally with prod env, connect to managed databases, common failure modes.

## Logs

### Stream live
```bash
railway logs --service <id> --environment <id>             # streamed deploy + build
railway logs --service <id> --build                        # build phase only
railway logs --service <id> --deployment <deploymentId>    # specific deployment
railway logs --service <id> --lines 500                    # last 500 lines, then exit
railway logs --service <id> --json | jq '. | select(.severity == "error")'
```

### Filter syntax (server-side)
Railway supports a query language for log filtering:

| Token | Matches |
|---|---|
| `error` | substring "error" anywhere |
| `"connection refused"` | exact phrase |
| `@level:error` | structured log with level=error (also `warn`, `info`, `debug`) |
| `@status:>=500` | HTTP logs with status code 500+ |
| `@status:[400 TO 499]` | range |
| `@duration:>10000` | numeric, ms |
| `@srcIp:1.2.3.4` | HTTP source IP |
| `@edgeRegion:us-west2` | which edge served the request |
| `@responseDetails:` | non-empty response details |
| `@clientUa:Mozilla*` | wildcard on user-agent |
| `replica:<replicaId>` | restrict to one replica |
| `-@level:info` | negation (exclude info-level) |
| `error OR timeout` | OR (default is AND) |

Apply via:
```bash
railway logs --filter '@level:error AND @status:>=500' --service <id>
```

Or in dashboard → Service → Logs → filter bar.

For structured logs Railway color-codes by `level` field. **Emit single-line JSON** with at least a `level` and `message` field for the best DX:
```json
{"level":"error","message":"Failed to connect to DB","attempts":3,"db":"postgres"}
```

### Limits
- 500 lines/sec/replica rate limit (excess gets dropped)
- Retention: 3 days (Hobby), 30 days (Pro), 90 days (Enterprise)

### Forwarding to external observability
There's no native log drain. Options:
- Run an OpenTelemetry collector or Vector/Fluent Bit sidecar process
- Emit OTLP from the app directly (Datadog, Axiom, Loki, Tempo, Honeycomb, Grafana Cloud)
- Deploy the "OpenTelemetry LGTM" template

## SSH into a running container

```bash
# from the dashboard, copy the SSH command (it includes the deployment ID):
railway ssh --project <id> --environment <id> --service <id>

# or to a specific replica:
railway ssh --project <id> --environment <id> --service <id> --replica <replicaId>
```

You get an interactive shell INSIDE the running deploy. Useful for:
- Inspecting filesystem state (mounted volume, generated files)
- Running ad-hoc diagnostics
- Verifying what env vars actually got injected (`env | grep RAILWAY`)
- Reading log files written to disk

The session has the same env vars as the running container. Don't run long-running processes that compete with the main process.

## Run a command with prod env vars (locally)

```bash
# run a one-shot command using the linked service's env vars:
railway run --service <id> --environment <id> -- pnpm prisma migrate status

# spawn an interactive subshell with vars injected:
railway shell --service <id>

# with project token (CI):
railway run --service-token <token> -- ./scripts/migrate.sh
```

`railway run` is a local execution that pulls down the service's variables and injects them into the spawned process. Useful for migrations, scripts, debugging — without exposing secrets in your shell history.

`railway shell` is the same but spawns an interactive subshell (you stay there until `exit`).

## Connect to a managed database

```bash
# auto-picks the right client (psql / mysql / redis-cli / mongosh):
railway connect Postgres --environment <id>
railway connect Redis    --environment <id>
railway connect MySQL    --environment <id>
railway connect Mongo    --environment <id>
```

This launches the appropriate client locally, connecting through Railway's TCP proxy. No need to find the connection string yourself.

For programmatic access, use the connection URL via reference variable:
```bash
DATABASE_URL=$(railway variable get DATABASE_URL --service <id> --json | jq -r '.value')
psql "$DATABASE_URL"
```

## Metrics

Dashboard → Service → Metrics shows: CPU%, memory, disk, network bytes in/out, HTTP request volume, response time percentiles. Threshold alerts → Webhooks (Discord/Slack auto-formatting) or email.

For programmatic access, use the GraphQL `metrics` query (undocumented; replay from dashboard DevTools).

## Auto-restart behavior

Railway will auto-restart per `restartPolicyType` (default `ON_FAILURE` with maxRetries=10). After max retries the service stays in CRASHED state until you intervene. To recover:

1. Check `railway logs` for the cause
2. Fix the issue (env var, code, dependency)
3. `railway redeploy` (re-runs build) or `railway restart` (just restarts container)

## Common failures and fixes

### Build fails with "no start command found"
Railpack couldn't infer how to start your app. Set explicit start in `railway.toml`:
```toml
[deploy]
startCommand = "node dist/server.js"
```
Or add a `start` script to `package.json`.

### Build hangs at "Generating BuildKit graph"
Railpack is taking forever resolving providers. Force the provider:
```json
{ "$schema": "https://schema.railpack.com", "providers": ["node"] }
```
Or fall back to a Dockerfile (Railway auto-picks it if present).

### Cache miss every deploy
Something early in your Dockerfile changes every commit (often the entire source tree being copied before deps install). Standard fix:
```dockerfile
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .                                  # only after deps cached
RUN pnpm run build
```
Also: ensure `RAILWAY_DEPLOYMENT_ID` is consumed AFTER cacheable layers, not before. Railway notes that build cache hit is "not guaranteed" because the build infra scales up/down. For deterministic caching, build the image yourself in CI (GitHub Actions → GHCR) and deploy as Image Source.

### Healthcheck times out
- App not binding to `0.0.0.0:$PORT` (or `[::]:$PORT` for dual-stack). Check with `railway ssh` → `netstat -tlnp` (or `ss -tlnp`).
- App takes >300s to be ready. Increase `healthcheckTimeout` to e.g. 600.
- Healthcheck endpoint hits the DB and DB is slow → use a cheap endpoint that doesn't.
- Hostname filter blocking `healthcheck.railway.app` → allowlist it.

### CRASHED loop
- `OOMKilled`: memory limit hit. Either raise plan ceiling, optimize, or scale horizontally.
- Unhandled rejection / crash on boot: read logs, fix.
- DB connection failure: usually env var not set, or trying to reach private DNS during pre-deploy.

### Service runs but can't reach another service privately
- Are you on a legacy (pre Oct 16, 2025) IPv6-only environment? Bind `[::]`. Set `family: 0` on ioredis. `--host ::` on uvicorn.
- Are you using `http://` (not `https://`)? Wireguard handles encryption at the network layer; you must use `http://`.
- Are you in pre-deploy? Private network is unavailable there. Use the public DB URL for pre-deploy migrations.

### Variables changes don't take effect
You set them via dashboard but didn't deploy. Variables changes are STAGED. Either:
- Use `railway variable set` (auto-deploys), or
- Trigger `serviceInstanceDeploy` after editing in dashboard

### Custom domain returns 404
Both DNS records must be set: CNAME (or ALIAS for apex) AND TXT verification. If the TXT is missing, Railway returns 404 indefinitely. See `networking.md`.

### "Problem processing request" from `serviceCreate` mutation
GraphQL `serviceCreate` is finicky when `source` is included in the same call. Workaround:
1. Create empty service: `serviceCreate(input: {projectId, name})`
2. Connect source: `serviceConnect(id: <serviceId>, input: {repo: "owner/repo"})` or `serviceInstanceUpdate` with `source` in input

### Cron job stops running
- Service exited non-zero on previous run and `restartPolicyType` was wrong → cron was treated like a normal service. Set `restartPolicyType = "NEVER"`.
- Previous run still alive when next was scheduled → next was SKIPPED (this is by design).
- Cron sub-5-minute interval → not allowed.

### Egress costs spiked
Most likely:
- Frontend on Vercel/external pulling from Railway DB → switch frontend to Railway, or accept egress
- Using `DATABASE_PUBLIC_URL` instead of `DATABASE_URL` (private) → switch to private
- Service-to-service via public domain instead of `*.railway.internal`

### Volume hits 100%
App goes offline while volume resizes. Monitor disk metric, set up an alert at 80%, resize proactively:
```bash
./.claude/skills/railway/scripts/railway-api.sh \
  'mutation($id: String!, $input: VolumeUpdateInput!) { volumeUpdate(volumeId: $id, input: $input) { id } }' \
  '{"id":"<volumeId>","input":{"size": 50}}'   # GB
```
As of Jan 30, 2026 (Zero-Downtime Volume Resizing), live grow is supported.

## Webhooks (deployment events)

Dashboard → service Settings → Webhooks. Subscribes to deployment state transitions. Discord and Slack URLs are auto-formatted; for custom systems point at your own endpoint and parse the JSON payload.

## Audit logs (Enterprise)

18-month retention of all dashboard/API actions. Reachable via dashboard or GraphQL. Useful for compliance.

## Quick reference

| Want to | How |
|---|---|
| Tail logs | `railway logs -s <id>` |
| Filter logs | `railway logs --filter "@level:error" -s <id>` |
| Build logs | `railway logs --build -s <id>` |
| SSH into container | `railway ssh -s <id>` |
| Run cmd with prod env | `railway run -s <id> -- <cmd>` |
| Subshell with prod env | `railway shell -s <id>` |
| Open DB shell | `railway connect Postgres` |
| Get one variable | `railway variable get KEY -s <id> --json` |
| Restart container | `railway restart -s <id>` |
| Roll back | GraphQL `deploymentRollback(id)` |
