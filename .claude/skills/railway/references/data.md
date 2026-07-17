# Railway: Data — Databases, Volumes, Backups, Buckets

Postgres / MySQL / Redis / Mongo on Railway, volumes (persistent disk), backups, and S3-compatible Buckets.

## Mental model

Railway databases are **container services** running official images, with a volume attached. You own:
- The container's resources (vCPU, RAM)
- The volume (size, region, lifecycle)
- The restart policy
- The connection URL

Railway provides:
- Curated templates with sensible defaults
- Connection URLs as reference variables
- Automated daily backups (with retention by plan)
- HA Postgres template (experimental)

This is NOT the AWS RDS managed-service model. You can `railway ssh` into your Postgres container if you want.

## Provisioning a database

### From the CLI
```bash
railway add --database postgres
railway add --database mysql
railway add --database redis
railway add --database mongo
```

The service is created with:
- Right image (e.g. `postgres:16`)
- Volume attached at the canonical mount path (see below)
- Connection URL exposed via reference variables
- Service name = `Postgres` / `MySQL` / `Redis` / `Mongo`

### From a template
```bash
railway deploy --template postgres-pg-vector       # Postgres + pgvector
railway deploy --template ha-postgres              # HA Postgres (Patroni + HAProxy + etcd)
```

Browse the catalog at `https://railway.com/templates`.

### Canonical mount paths
| Database | Volume mount path |
|---|---|
| PostgreSQL | `/var/lib/postgresql/data` |
| MySQL | `/var/lib/mysql` |
| MongoDB | `/data/db` |
| Redis | `/data` |

These are pre-configured by Railway templates. If you self-deploy a DB image, set the volume mount path manually.

## Connecting to a database

### From another Railway service (private, free)
```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
REDIS_URL    = ${{Redis.REDIS_URL}}
MONGO_URL    = ${{Mongo.MONGO_URL}}
MYSQL_URL    = ${{MySQL.MYSQL_URL}}
```

These resolve to the **private** URL (using `*.railway.internal`). No egress billing.

### From outside Railway (public, billed as egress)
```
DATABASE_PUBLIC_URL  = ${{Postgres.DATABASE_PUBLIC_URL}}
```

This goes through Railway's TCP proxy (`*.proxy.rlwy.net`). Egress at $0.05/GB.

**Best practice**: use the private URL inside Railway, public URL only for local dev / migrations from CI.

### From a local shell
```bash
railway connect Postgres --environment <id>          # spawns psql with prod creds
railway connect Redis    --environment <id>          # spawns redis-cli
railway connect Mongo    --environment <id>          # spawns mongosh
railway connect MySQL    --environment <id>          # spawns mysql client
```

### Pooling (production discipline)
For high-RPS apps, don't open one Postgres connection per HTTP request. Options:
- **PgBouncer template**: deploy alongside, point your app at PgBouncer instead of direct Postgres
- **Prisma**: `?connection_limit=N` in `DATABASE_URL`, where N is small (5-10 per replica)
- **Application-level pool**: most ORMs/drivers default to a pool; ensure size × replicas < Postgres `max_connections`

## High-Availability Postgres

Released March 13, 2026 as Priority Boarding (experimental).

Stack: Patroni for replica management + HAProxy for connection routing + etcd for consensus. One-click upgrade from existing Postgres template; comes with a dedicated monitoring dashboard.

**As of May 2026, do NOT migrate production data**. The feature is still flagged experimental. Test it on staging, watch the changelog for GA announcement.

For production HA today: take frequent backups, use Railway's incremental Copy-on-Write backup system, and have a documented restore runbook.

## Volumes (persistent storage)

Volumes are attached to a single service. They persist across deploys (unlike the container filesystem).

### Create / attach
```bash
# CLI:
railway volume add --service <id> --mount /data

# GraphQL:
./.claude/skills/railway/scripts/railway-api.sh '
mutation($input: VolumeCreateInput!) {
  volumeCreate(input: $input) { id }
}' '{"input":{"projectId":"<p>","environmentId":"<e>","serviceId":"<s>","mountPath":"/data"}}'
```

### List / inspect
```bash
railway volume list --service <id> --json | jq
```

### Resize
As of Jan 30, 2026 (Zero-Downtime Volume Resizing), live grow is supported:
```bash
./.claude/skills/railway/scripts/railway-api.sh \
  'mutation($id: String!, $input: VolumeUpdateInput!) {
     volumeUpdate(volumeId: $id, input: $input) { id name }
   }' \
  '{"id":"<volumeId>","input":{"size": 50}}'      # GB
```

Reaching 100% will force the service offline while it resizes — set up a usage alert at 80%.

### Delete
```bash
./.claude/skills/railway/scripts/railway-api.sh \
  'mutation($id: String!) { volumeDelete(volumeId: $id) }' \
  '{"id":"<volumeId>"}'
```

As of May 1, 2026, deletes are **soft** for 48 hours — recoverable from the dashboard within that window.

### Volume gotchas
- **Volumes are mounted as root** inside the container. If your app runs as non-root, set `RAILWAY_RUN_UID=0` (or chown the volume mount in your Dockerfile entrypoint).
- **Volumes are NOT mounted during build phase or during pre-deploy command.** They only appear at runtime in the deploy container.
- **Two deployments cannot mount the same volume simultaneously.** This means services with volumes always have brief downtime on deploy (regardless of `overlapSeconds`). Plan stateful deploys around this.
- **Volume size is per-volume**, deducted from the volume storage limit on your plan (5 GB Hobby, 1 TB Pro per volume).
- **Volumes follow the service region.** Moving a service across regions migrates the volume with downtime.

## Backups

Two layers:
1. **Volume snapshots** (incremental Copy-on-Write, only delta billed)
2. **Database backups** (Railway-managed for Postgres template; logical or PITR depending on tier)

### Manual volume backup
```bash
./.claude/skills/railway/scripts/railway-api.sh \
  'mutation($id: String!) { volumeInstanceBackupCreate(volumeInstanceId: $id) }' \
  '{"id":"<volumeInstanceId>"}'
```

**Limit**: manual backups capped at **50% of the volume size**. So a 100 GB volume can hold up to 50 GB of manual backups before hitting the cap.

### Scheduled backups
Configured per-volume in dashboard → service → Volumes → Backup Schedule. Frequency: daily / weekly / monthly. Retention: configurable.

**Best practice**: lock release-time snapshots (mark them "important" so they don't auto-prune).

### Restore
Dashboard → service → Volumes → Backups → restore from a snapshot. Or via `volumeInstanceUpdate` GraphQL with the backup ID.

### What backups are NOT
- Not application-level: backing up `/data` for Postgres takes the underlying file pages but doesn't `pg_dump`. For logical backups, run `pg_dump` from a cron service writing to a Bucket.
- Not point-in-time-recovery (unless you use HA Postgres with WAL archiving — still experimental).

## Object storage (Buckets)

S3-compatible object storage, native to Railway. Released Dec 2025 (general), CLI Mar 2026.

### Create
```bash
railway bucket create my-bucket --environment <id>
```

### Get S3 credentials
```bash
railway bucket credentials --bucket my-bucket --environment <id> --json
```

Returns access key, secret key, endpoint URL — use any S3 SDK against `https://buckets.railway.com/<bucket>` (or the regional endpoint).

### Cost
- Storage: **$0.015/GB-month** (cheaper than S3's $0.023)
- Egress: **FREE** (no egress charges, unlike S3 at $0.09/GB)
- S3 ops (PUT/GET/etc): **FREE**

### Use case
- User uploads (images, video)
- Build artifacts (binaries, releases)
- Database logical backups (`pg_dump | aws s3 cp` via CLI)
- Static assets

### Reset credentials
```bash
railway bucket credentials --bucket my-bucket --reset --environment <id>
```

⚠️ Resetting invalidates the previous keys. Update your apps' env vars immediately.

### Delete
```bash
railway bucket delete --bucket my-bucket --environment <id> --2fa-code <code>
```

Requires 2FA if enforced on the workspace.

## Database operational best practices

1. **Always reference DB URL via reference variable**, never hardcode.
2. **Always use the private URL** inside Railway. Public URL only for local dev or external migrations.
3. **Run migrations either** in pre-deploy (using public URL — pre-deploy can't see private network) **or** at app startup gated by a flag.
4. **Make migrations idempotent and backward-compatible** for the duration of the deploy. Pre-deploy doesn't retry on failure.
5. **For destructive schema changes**, use expand-contract: deploy code that handles BOTH schemas → migrate → deploy code that uses only new schema.
6. **Connection pool size × replica count** should be less than DB's `max_connections`. With 3 replicas at 10 conns each, that's 30 — keep Postgres `max_connections >= 50`.
7. **Schedule daily backups**, lock release-time snapshots, alert on disk > 80%.
8. **Co-locate the DB and dependent services in the same region** to minimize latency. Railway doesn't auto-route to "closest DB replica" — you put both in `us-west2` or both in `europe-west4-drams3a`.
9. **Sealed `DB_PASSWORD` shared variable** + unsealed `DATABASE_URL = postgres://app:${{shared.DB_PASSWORD}}@...` pattern, to keep secrets write-only while allowing rotation.

## Quick reference

| Want to | How |
|---|---|
| Add Postgres | `railway add --database postgres` |
| Connect via psql | `railway connect Postgres` |
| Reference DB URL | `${{Postgres.DATABASE_URL}}` (private) |
| Add a volume | `railway volume add --service <id> --mount /data` |
| Resize volume | GraphQL `volumeUpdate` with new `size` (GB) |
| Manual backup | GraphQL `volumeInstanceBackupCreate` (max 50% of volume) |
| Create bucket | `railway bucket create <name>` |
| Bucket egress | FREE |
| HA Postgres | Priority Boarding template (experimental, May 2026) |
