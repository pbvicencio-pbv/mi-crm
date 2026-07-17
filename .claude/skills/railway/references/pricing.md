# Railway: Pricing, Limits, Cost Optimization

May 2026 pricing. Railway is **usage-based** with a flat plan fee that includes equivalent usage credit.

## Plans (May 2026)

| | Trial | Hobby | Pro | Enterprise |
|---|---|---|---|---|
| Subscription | Free | $5/mo | $20/mo | from $2,000/mo |
| Included credit | $5 (one-time, 30 days) | $5/mo | $20/mo | custom |
| Projects | 1 | 50 | 100 | Unlimited |
| Services / project | 3 | 50 | 100 | Unlimited |
| vCPU / service | 1 | 48 | 1,000 | 2,400 |
| RAM / service | 0.5 GB | 48 GB | 1 TB | 2.4 TB |
| Replicas / service | 1 | (limited) | up to 50 @ 48vCPU/48GB each | Highest |
| Volume storage / vol | 0.5 GB | 5 GB | 1 TB | 5 TB |
| Volumes / project | 1 | 10 | 20 (raisable) | Unlimited |
| Build timeout | 10 min | 40 min | 90 min | 90+ min |
| Concurrent builds | 1 | 3 | 10 | 10+ |
| Log retention | 3 days | 7 days | 30 days | 90 days |
| Project members | 1 | 3 | Unlimited | Unlimited |
| Static outbound IPs | ❌ | ❌ | ✅ | ✅ |
| Audit logs | ❌ | ❌ | ❌ | ✅ (18 mo) |

**Note**: each replica gets the FULL plan ceiling. On Pro, 3 replicas = up to 3,000 vCPU / 3 TB combined (subject to billing).

## Usage rates (post-Metal)

Railway bills by the **second** for compute and **GB-second** for memory and volume.

| Resource | Rate |
|---|---|
| **vCPU** | $0.00000772 / vCPU-second (~$20 / vCPU-month if 100% utilized 24/7) |
| **RAM** | $0.00000386 / GB-second (~$10 / GB-month if 100% utilized 24/7) |
| **Volume storage** | $0.00000006 / GB-second ($0.15 / GB-month) |
| **Egress** | $0.05 / GB (was $0.10/GB pre-Metal — halved June 2025) |
| **Object storage (Buckets)** | $0.015 / GB-month, **free egress, free S3 ops** |

These rates are post-Metal-migration (June 27, 2025). Disk dropped from $0.25 → $0.15/GB-month, egress halved, billing precision improved.

## Cost math examples

### Small API
- 0.5 vCPU avg, 256 MB RAM, 1 replica, 24/7
- vCPU: 0.5 × $20 = **$10/mo**
- RAM: 0.25 × $10 = **$2.50/mo**
- Total compute: ~$12.50/mo
- Plus egress, plus DB

### Postgres (small)
- 1 vCPU avg, 1 GB RAM, 10 GB volume, 24/7
- vCPU: 1 × $20 = $20
- RAM: 1 × $10 = $10
- Volume: 10 × $0.15 = $1.50
- ~$31.50/mo

### Cron job (every 6h, 30s runtime)
- ~$0.001/mo if it sleeps in between (negligible)
- The compute is billed only while the cron is running

### Worker (always-on, 1 vCPU, 512 MB)
- vCPU: 1 × $20 = $20
- RAM: 0.5 × $10 = $5
- ~$25/mo

### Stateful service with 100 GB volume
- Volume: 100 × $0.15 = **$15/mo** just for storage
- Plus compute, plus backups (incremental, only delta billed)

## Regions

| Display | Location | Identifier |
|---|---|---|
| US West Metal | California | `us-west2` |
| US East Metal | Virginia | `us-east4-eqdc4a` |
| EU West Metal | Amsterdam | `europe-west4-drams3a` |
| Southeast Asia Metal | Singapore | `asia-southeast1-eqsg3a` |

All regions are Railway Metal (bare-metal). Same pricing across regions. Volumes are pinned to region — region change = brief downtime + migration. **Reject any region ID that isn't one of these four** as of May 2026.

## What gets billed

| Charge line | Source |
|---|---|
| Compute | vCPU + RAM, by the second, for every running replica |
| Volume storage | GB × seconds, for every attached volume |
| Egress (compute) | bytes leaving the platform from compute services |
| Egress (DB public URL) | bytes through the TCP proxy when using `*_PUBLIC_URL` |
| Object storage | GB-month (free egress) |
| Backups | incremental delta only |
| Build minutes | counted within plan limits, not billed extra below cap |

## What does NOT get billed

- Inbound traffic (free)
- Egress between services on the same private network (free — that's the whole point of using `*.railway.internal`)
- S3 ops on Buckets (free)
- Bucket egress (free)
- Failed deploys (build time is not billed)
- Sleeping services' compute (storage still billed)

## Cost-optimization checklist

1. **Use private networking everywhere internal.** Service-to-service via `*.railway.internal` is free; via public domain is egress-billed.
2. **Use `${{Postgres.DATABASE_URL}}` (private), not `DATABASE_PUBLIC_URL`.** Apps connecting through the TCP proxy pay egress.
3. **Right-size services.** Set memory caps in code/dashboard so a memory leak doesn't drift into ever-higher RAM bills. Watch the metrics tab.
4. **Use sleeping (serverless mode) on staging/dev.** After 10 min idle, compute pauses (storage continues billing). Wakes on first inbound. NOT for production.
5. **Disable PR environments for low-value branches** — every open PR runs real workloads.
6. **Use Focused PR Environments** in monorepos (Jan 2026 feature) so unchanged services don't get duplicated.
7. **Replace AWS S3 with Buckets** when the workload tolerates regional storage. Free egress alone often saves more than the storage cost.
8. **Co-locate DB and dependents** in the same region — cross-region private traffic is rare but not free in all cases.
9. **Set workspace usage limits**:
   - **Soft limit**: notify when reached
   - **Hard limit**: pause services when reached (last-resort backstop)
10. **Set per-replica resource limits** in service Settings → Resource Caps so single replicas don't grow unbounded.
11. **Use scheduled cron with `restartPolicyType = "NEVER"`** so failed runs fail loudly, not in a restart loop.
12. **Watch your egress** — Railway shows it in the Usage tab. Spikes usually = frontend on Vercel pulling from Railway, or DB public URL accidentally used.
13. **Build images yourself in CI for deterministic caching** (Railway's BuildKit cache is best-effort). Faster deploys = less compute time billed.
14. **Don't stack replicas you don't need.** Each replica gets the FULL plan ceiling — adding a replica when one would do triples potential RAM bill.
15. **Drop unused environments.** Old preview envs that no one looks at still rack up storage if they have volumes.

## Cost-control mechanics

Workspace Settings → Usage Limits:
- Compute usage cap (separate from Agent token cap as of Apr 2026)
- Soft cap: email notification
- Hard cap: services paused at threshold

Per-service Resource Caps:
- vCPU max
- RAM max
- Useful to prevent a single buggy service from devouring the budget

Billing is per-workspace, with detailed breakdown at `Settings → Billing → Usage`.

## Special line items

- **Railway Agent (LLM tokens)**: when using Railway Agent, LLM tokens are billed separately. Cap independently.
- **Static outbound IPs**: Pro+ feature, separate small monthly fee per IP block.
- **HIPAA / BAA**: $1,000/month addon (Enterprise).
- **AWS Marketplace billing**: same Railway pricing, billed through AWS contract (procurement convenience).

## Free trial limits (re-check on signup)

The Trial plan is intended for evaluation only. Limits at Trial:
- $5 one-time credit, expires after 30 days
- 1 project, 3 services per project
- 1 vCPU, 0.5 GB RAM per service
- 1 replica
- 0.5 GB volume, 1 volume per project
- 10-min build timeout, 1 concurrent build
- 3-day log retention
- 1 project member

Once trial credit exhausts, services pause. Upgrade to Hobby ($5/mo) or Pro ($20/mo) to continue.

## Quick reference

| Want to estimate | Math |
|---|---|
| Compute / month | (avg vCPU × $20) + (avg GB RAM × $10) per replica |
| Volume / month | size GB × $0.15 |
| Egress | bytes_out_GB × $0.05 |
| Bucket | size GB × $0.015 (egress free) |
| Plan fee included usage | $5 on Hobby, $20 on Pro (counts against compute) |
