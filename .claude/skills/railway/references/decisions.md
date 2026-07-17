# Railway: Architectural Decisions

When to use what. Functions vs containers, cron vs worker vs queue, single-region vs multi-region, monorepo styles.

## Workload type → Railway primitive

| Workload | Use |
|---|---|
| HTTP API, long-running | Service (container) with healthcheck |
| Always-on background worker | Service with `restartPolicyType = "ALWAYS"`, no domain, no healthcheck |
| Scheduled task (every X minutes/hours) | Service with `cronSchedule`, `restartPolicyType = "NEVER"` |
| Bursty / event-driven, brief execution, TS only | Railway Functions (Bun, ≤96 KB single file) |
| Async task fan-out, retry, dead-letter | Worker service consuming from Redis (BullMQ) or Postgres (graphile-worker, pg-boss) queue |
| WebSockets, SSE, gRPC | Service (with longer healthcheck path); 60-sec idle timeout on edge |
| Static frontend / SSR | Service (Next.js / Astro / SvelteKit) — Railpack auto-detects |
| Stateful database | Database template service + volume |
| Object storage (uploads, backups) | Bucket (S3-compatible, free egress) |
| TCP / non-HTTP service | Service + TCP Proxy enabled |
| Multi-region failover | Multi-region replicas via `multiRegionConfig` |

## Functions vs services

**Use Railway Functions when**:
- Single TypeScript/Bun file under 96 KB
- Stateless, no volumes, no long-running processes
- Bursty traffic (functions scale by request, charged only when running)
- You'd otherwise reach for Vercel Edge Functions or Cloudflare Workers

**Use a service when**:
- Multi-file project, framework, dependencies
- Stateful (volumes, sticky in-memory cache, WebSocket sessions)
- Long-running (workers, schedulers, daemons)
- Non-TS runtime (Python, Go, Rust, Java, Ruby, etc.)
- >96 KB compiled

`railway functions {new, list, pull, push, delete, link} [--watch]` for management.

## Cron vs worker vs queue

**Cron service** (lightest):
```toml
[deploy]
cronSchedule = "0 */6 * * *"
restartPolicyType = "NEVER"
```
- 5-min minimum, UTC
- No overlap (next run skipped if previous still alive)
- Service must `exit 0` cleanly
- Use for: nightly reports, periodic data sync, scheduled cleanups

**Worker service** (always-on consumer):
```toml
[deploy]
restartPolicyType = "ALWAYS"
# no healthcheckPath, no domain
```
- Connect to Redis/Postgres for work source
- Use BullMQ/Sidekiq/Celery/graphile-worker
- Use for: high-volume background processing, retries, fan-out, work that must survive crashes

**Queue + worker** (production-grade async):
- Producer service writes jobs to Redis/Postgres
- Worker service(s) consume — scale horizontally with `--replicas`
- Failed jobs → dead-letter queue + alerting
- Use for: anything that needs at-least-once delivery, retries with backoff, observability into queue depth

## Healthcheck path strategy

| Service type | Healthcheck path |
|---|---|
| HTTP API | `/health` returning `{status: "ok"}` from a cheap endpoint (no DB calls) |
| HTTP API with deep checks | separate `/health` (cheap) and `/health/deep` (DB+Redis ping) — Railway uses cheap one for gating; external monitoring uses deep |
| Worker (no HTTP) | omit healthcheckPath; rely on `restartPolicyType = "ALWAYS"` |
| Cron | omit healthcheckPath; `restartPolicyType = "NEVER"` |
| Frontend (Next.js) | `/api/health` route or just `/` (returns 200 on root) |

## Restart policy strategy

```
ON_FAILURE   ← default. HTTP services that should restart on crash but not on clean exit.
ALWAYS       ← workers, daemons, long-running jobs that must keep going.
NEVER        ← cron jobs, batch tasks, anything where a failure should fail loudly.
```

## Region strategy

**Single region** (start here for 99% of apps):
- All services in one region (e.g. `us-west2`)
- Cheapest, simplest, lowest internal latency
- Pick region closest to your users (or DB if write-heavy)

**Multi-region** (when latency matters globally):
- Replicate stateless API across `us-west2` + `europe-west4-drams3a` + `asia-southeast1-eqsg3a`
- Single primary DB in one region (cross-region private network NOT supported across envs — but multi-region is in-env)
- GeoDNS routes users to nearest healthy replica
- Costs 3x compute (one set per region)

**Global DB**: Railway doesn't yet offer cross-region DB replication out of the box. For globally distributed reads, you build it (or use external service like Neon/PlanetScale via TCP proxy).

## Monorepo: Style A vs Style B

**Style A (isolated subdirectories)**: each service has its own `apps/<svc>/package.json` and dependencies.
- Set Root Directory to `apps/<svc>` per service
- Each subdir builds independently
- Set `apps/<svc>/railway.toml` with **Config-as-Code Path** in service Settings (the file does NOT auto-follow Root Directory)

**Style B (shared workspace)**: pnpm/yarn/npm workspaces, Turborepo, Nx — single root `node_modules`.
- Do NOT set Root Directory
- Custom Build Command: `pnpm install && pnpm --filter <svc> build`
- Custom Start Command: `pnpm --filter <svc> start`
- Set `watchPatterns = ["apps/<svc>/**", "packages/shared/**", "package.json", "pnpm-lock.yaml"]`
- `NIXPACKS_TURBO_APP_NAME` is **ignored by Railpack** — don't rely on it

Style A is simpler. Style B saves disk in the build cache and supports cross-package imports natively. Pick A unless you specifically need workspace links.

## Database choice

| Need | Use |
|---|---|
| OLTP, ACID, mature | Postgres |
| Cache, pub/sub, queue backend | Redis |
| Document, flexible schema | Mongo |
| Legacy MySQL apps | MySQL |
| Vector search | `postgres-pg-vector` template |
| Time-series | Postgres + TimescaleDB extension (template) or self-deploy InfluxDB |
| Graph | self-deploy Neo4j / Memgraph |
| Production HA | HA Postgres (Patroni + HAProxy + etcd, EXPERIMENTAL May 2026) |

## When NOT to use Railway

| Need | Better alternative |
|---|---|
| Edge / CDN-cached frontend with framework-aware ISR | Vercel / Cloudflare |
| Strict cost predictability (flat monthly) | Render / DO App Platform |
| BYOC, run on your own AWS / GCP account | Northflank / Coolify (self-host) |
| GPU workloads (training, inference) | Modal / RunPod / Lambda Labs |
| HIPAA + extreme compliance / data residency | AWS direct, with Railway Enterprise as bridge |
| Sub-minute cron precision | External scheduler (Cloudflare Cron, GHA schedule) |

## Migration anti-patterns

- **Don't migrate AWS RDS to a single-replica Postgres template** for production. Railway's standard Postgres template is single-AZ. Either accept downtime risk, use HA Postgres (still experimental), or keep RDS via TCP proxy.
- **Don't lift-and-shift Vercel serverless to Railway Functions.** Vercel functions are Node-flavored, Railway Functions are Bun. Rewrites needed.
- **Don't split logical services into too many Railway services prematurely.** Each adds plan-fee overhead, network hops. Start with 1-3 services, split when there's a real reason (independent scaling, language barrier).

## Decision flowchart for "where do I run this?"

```
Is it stateful (needs disk persistence)?
├─ Yes → Service + volume (or DB template)
└─ No
   │
   Is it a single TS/Bun file under 96KB, stateless, bursty?
   ├─ Yes → Railway Functions
   └─ No
      │
      Does it run on a schedule?
      ├─ Yes → Cron service (cronSchedule + NEVER)
      └─ No
         │
         Is it a long-running consumer of a queue?
         ├─ Yes → Worker service (ALWAYS, no domain)
         └─ No → HTTP service (ON_FAILURE, healthcheckPath)
```

## Quick reference

| Question | Answer |
|---|---|
| HTTP API? | Service, ON_FAILURE, healthcheck `/health` |
| Background worker? | Service, ALWAYS, no domain |
| Scheduled job? | Service, NEVER, `cronSchedule` |
| Tiny serverless? | Functions (Bun, ≤96 KB) |
| Multi-region? | `multiRegionConfig` |
| Monorepo (workspaces)? | Custom Build/Start Cmd + Watch Patterns, NO Root Directory |
| Monorepo (isolated)? | Set Root Directory + per-svc `railway.toml` |
| Production DB? | Postgres template, plan for HA when GA |
| Object storage? | Buckets (free egress) |
| Non-HTTP traffic? | TCP Proxy |
