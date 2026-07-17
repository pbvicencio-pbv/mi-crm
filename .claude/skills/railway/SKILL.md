---
name: railway
description: Operate Railway (railway.com) infrastructure end-to-end - create projects, provision services and databases, manage environments, variables, volumes, domains, and object storage buckets, deploy code, configure healthchecks, scaling, and restart policies, troubleshoot failures, query logs and metrics, and manage everything via CLI + GraphQL. Use this skill whenever the user mentions Railway, deployments, services, environments, buckets, build failures, healthcheck issues, scaling, replicas, volumes, custom domains, cron jobs, workers, or infrastructure operations on Railway, even if they don't say "Railway" explicitly. State of the art as of May 2026 - covers Railpack, Metal regions, IPv4+IPv6 private networking, deploy-less horizontal scaling, sealed variables, and HA Postgres.
allowed-tools: Bash(railway whoami:*), Bash(railway status:*), Bash(railway list:*), Bash(railway logs:*), Bash(railway variables:*), Bash(railway variable:*), Bash(railway volume list:*), Bash(railway domain list:*), Bash(railway domain add:*), Bash(railway service list:*), Bash(railway service create:*), Bash(railway service connect:*), Bash(railway environment list:*), Bash(railway environment create:*), Bash(railway environment connect:*), Bash(railway connect:*), Bash(railway link:*), Bash(railway unlink:*), Bash(railway up:*), Bash(railway redeploy:*), Bash(railway restart:*), Bash(railway run:*), Bash(railway shell:*), Bash(railway --version), Bash(railway --help), Bash(which:*), Bash(command -v:*), Bash(jq:*), Bash(./.claude/skills/railway/scripts/*), Bash(cat:*), Bash(grep:*), Read, Write, Edit
---

# Railway Operations Skill

You are operating Railway infrastructure on behalf of the user. Railway is a usage-based PaaS that runs containers, databases, and Functions on Railway Metal (their bare-metal infrastructure) across four regions: `us-west2`, `us-east4-eqdc4a`, `europe-west4-drams3a`, `asia-southeast1-eqsg3a`.

## Three layers, one mental model

Every Railway operation maps to one of three layers. Choose the **lowest-level layer that does the job**:

1. **CLI** (`railway` binary) — for everyday ops: deploy, logs, variables, link, run, ssh, scale. Always pass `--json` when parsing. Always pass explicit `--project/--service/--environment` flags rather than relying on linked context.
2. **GraphQL API** (`https://backboard.railway.com/graphql/v2`) — for orchestration the CLI can't do: project/env/domain/volume CRUD, log queries, multi-resource batching, anything programmatic across multiple projects. Use the `scripts/railway-api.sh` helper.
3. **Config-as-Code** (`railway.toml` or `railway.json` in the repo) — for declarative, version-controlled service config: build/deploy/healthcheck/restart/scale/cron/multi-region. Settings priority: `environments.<name>.deploy` > `[deploy]` > dashboard.

## Routing — read the right reference

When the user asks for something, read ONE reference file first, not all of them. References are in `references/`:

| User intent | Read |
|---|---|
| "create a project", "new service", "link my repo", monorepo setup | `setup.md` |
| "deploy", "redeploy", "rollback", "restart", `railway up` | `deploy.md` |
| variables, secrets, sealed vars, references, healthcheck, restart policy, replicas, regions | `configure.md` |
| logs, metrics, ssh, troubleshoot, "why is my deploy failing", "service crashing" | `operate.md` |
| domains, custom domain, SSL, TCP proxy, private networking, IPv6 | `networking.md` |
| Postgres/MySQL/Redis/Mongo, volumes, backups, buckets (S3) | `data.md` |
| GitHub Actions, project tokens, PR environments, CI/CD | `ci.md` |
| anything programmatic across many resources, mutations, advanced API | `graphql.md` |
| pricing math, plan limits, cost estimation, regions list | `pricing.md` |
| "should I use Functions or a worker?", architecture decisions | `decisions.md` |

If unsure, start with `setup.md` (it includes navigation), then narrow.

## Before you do anything

1. **Check the CLI is installed and authed**:
   ```bash
   ./.claude/skills/railway/scripts/railway-doctor.sh
   ```
   This verifies `railway --version`, `railway whoami --json`, jq presence. If it fails, read `references/setup.md` § Installation.

2. **If the user pasted a Railway URL**, extract IDs with `./.claude/skills/railway/scripts/ids-from-url.sh "<url>"` instead of calling `railway status`. URLs look like:
   `https://railway.com/project/<projectId>/service/<serviceId>?environmentId=<envId>`

3. **Always pass explicit flags**. Do NOT rely on `railway link` state — pass `--project/--service/--environment` on every command. This is robust against the user's local link state changing.

4. **Surface what you're about to do** for any destructive operation. Confirm before:
   - `railway delete`, `railway down`, `railway volume delete`
   - any `*Delete` GraphQL mutation
   - rotating secrets, deleting environments, removing domains

## The non-negotiables (production defaults)

For every NEW service you scaffold, default to:

```toml
[build]
builder = "RAILPACK"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 120
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
overlapSeconds = 20
drainingSeconds = 10
```

For Node services, use `node` directly (not `npm start`) so SIGTERM is forwarded. Bind `0.0.0.0:$PORT` (or `[::]:$PORT` for dual-stack). Use `*.railway.internal` for service-to-service traffic to avoid egress billing.

## Critical footguns to remember

- **Database credentials are NOT auto-injected anymore.** Reference them explicitly with `${{Postgres.DATABASE_URL}}`.
- **`${{svc.PORT}}` renders empty** because PORT is runtime-injected, not a service variable. If another service needs to reference a PORT, pin it explicitly: `PORT=8080`.
- **Pre-deploy commands have NO volume access and NO private network.** They run before the deploy container exists. Migrations needing the DB private hostname won't work — use the public DB URL during pre-deploy or run migrations at app startup.
- **Variables changes are STAGED, not applied.** After `variableUpsert` you must trigger `serviceInstanceDeploy`. The CLI's `railway variable set` triggers a deploy by default unless you pass `--skip-deploys`.
- **Sealed variables are write-only.** Once sealed they cannot be read back via dashboard/API/CLI. They are NOT copied to PR envs or duplicated environments. Pattern: seal the secret components inside shared variables, keep URL templates as unsealed `${{...}}` references.
- **Legacy environments (pre Oct 16, 2025) are IPv6-only on the private network.** Bind `[::]`, set `family: 0` on ioredis, `--host ::` on uvicorn, etc. Environments created after Oct 16, 2025 are dual-stack.
- **Volumes force brief downtime on deploy** because Railway prevents two deployments mounting the same volume simultaneously. Plan around this for stateful services.
- **Healthcheck is gating-only**, not continuous monitoring. It runs once before traffic switch. For uptime monitoring deploy Uptime Kuma or use an external service.
- **Cron minimum interval is 5 minutes**, UTC only, no overlap (next run skipped if previous still alive). Service must `exit 0` cleanly.
- **Manual volume backups are capped at 50% of the volume size.**

## How to think about cost

Railway is usage-based: $0.00000772/vCPU-second, $0.00000386/GB-RAM-second, $0.15/GB-month volumes, $0.05/GB egress (post-Metal), $0.015/GB-month object storage with free egress. The plan fee ($5 Hobby, $20 Pro) includes equivalent usage credit. Before creating resources, surface estimated monthly cost at expected utilization. See `references/pricing.md` for the math.

## Skill files map

- `SKILL.md` — this file (router)
- `scripts/railway-api.sh` — GraphQL helper. Usage: `./.claude/skills/railway/scripts/railway-api.sh '<query>' '<variables_json>'`
- `scripts/railway-doctor.sh` — preflight checks
- `scripts/ids-from-url.sh` — parse projectId/serviceId/envId from dashboard URL
- `references/*.md` — read on-demand per the routing table above
- `templates/railway.toml` — canonical production-grade config
- `templates/railpack.json` — opt-in Railpack customization
- `templates/Dockerfile` — multi-stage with proper cache layering
- `hooks/pre-tool-use.json` — auto-approves railway:* commands

## When in doubt

- For undocumented GraphQL: do the action in the dashboard while DevTools → Network is open, copy the request, replay via `scripts/railway-api.sh`.
- Postman collection: `https://gql-collection-server.up.railway.app/railway_graphql_collection.json`
- GraphiQL playground: `https://railway.com/graphiql`
- Live changelog: `https://railway.com/changelog` (Railway ships weekly — re-verify if a feature seems missing or has changed)
- Status: `https://status.railway.com`

If a user request implies a feature you're not sure exists yet, try the API and catch the error rather than assuming it doesn't work. Railway changes fast.
