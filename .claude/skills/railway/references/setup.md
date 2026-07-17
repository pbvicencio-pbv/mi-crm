# Railway: Setup & Project Initialization

Covers installation, authentication, creating projects, adding services, linking the local repo, and monorepo configuration.

## Installation

Pick one — all produce the same `railway` binary:

```bash
brew install railway                                  # macOS (recommended)
npm install -g @railway/cli                           # macOS/Linux/Windows (Node ≥16)
scoop install railway                                 # Windows
cargo install railwayapp --locked                     # from source (Rust)
docker pull ghcr.io/railwayapp/cli:4.44.0             # for CI containers (pin version)
paru -S railwayapp-cli   # or:   yay -S railwayapp-cli  # Arch
```

The official `cli.new` one-liner installer exists but pipes a remote script
into `bash`, so we don't keep it inline here. If you need it, fetch the
script first to a file, inspect it, and only then execute it. See
<https://docs.railway.com/reference/cli> for the canonical instructions.

Verify:
```bash
railway --version
```

Upgrade in place:
```bash
railway upgrade
```

## Authentication

### Interactive (laptop/dev)
```bash
railway login                # opens browser
railway login --browserless  # for SSH/headless: prints a pairing code
railway whoami --json
railway logout
```

### Headless / CI (token-based)
Set ONE of these env vars and the CLI/scripts pick it up automatically:

| Env var | Token type | Scope | Use case |
|---|---|---|---|
| `RAILWAY_API_TOKEN` | account or workspace | full | scripted workspace ops, multi-project automation |
| `RAILWAY_PROJECT_TOKEN` | project-scoped | single project + environment | CI deploys, per-project isolation |
| `RAILWAY_TOKEN` | generic | treated as project token by helper script | Railway's own CI examples use this name |

Get tokens:
- Account / workspace: https://railway.com/account/tokens
- Project: dashboard → project → Settings → Tokens

For skill use, prefer `RAILWAY_API_TOKEN` if you'll touch multiple projects, else `RAILWAY_PROJECT_TOKEN` for least privilege.

## Create a project

### From scratch (CLI)
```bash
railway init -n my-project              # prompts for workspace if multiple
railway init -n my-project --workspace <id>
```

### From the dashboard then link locally
```bash
# user creates project at https://railway.com/new
cd my-repo/
railway link --project <projectId> --environment production
```

### From GraphQL (programmatic, multi-project automation)
```graphql
mutation projectCreate($input: ProjectCreateInput!) {
  projectCreate(input: $input) { id name }
}
```
Variables:
```json
{ "input": { "name": "my-project", "description": "...", "workspaceId": "..." } }
```
Run with `./.claude/skills/railway/scripts/railway-api.sh '<query>' '<variables>'`.

## Add a service

### From a GitHub repo
```bash
railway add --service api --repo myorg/my-repo
```
Connects a repo, triggers a deploy on push to the configured branch. The branch and root directory can be set in dashboard after creation.

### From a Docker image (e.g. Caddy proxy, Redis, custom registry)
```bash
railway add --service caddy --image caddy:2-alpine
railway add --service api --image ghcr.io/myorg/api:v1.2.3
```
Private registry credentials go in service Settings → Source → Private Image Credentials (or via GraphQL `serviceConnect`).

### From a database template
```bash
railway add --database postgres
railway add --database redis
railway add --database mysql
railway add --database mongo
```
These are real container services — *you* own the volume, restart policy, region. They're not "managed" in the AWS RDS sense. For HA Postgres see `data.md`.

### Empty service (then connect later via GraphQL)
```bash
railway add --service worker
# then update its source via serviceInstanceUpdate GraphQL mutation
```

This is the canonical pattern when GraphQL `serviceCreate` with a `source` field returns "Problem processing request" — create empty, then `serviceConnect` or `serviceInstanceUpdate` with the source.

## Link the local repo

```bash
railway link                                          # interactive
railway link --project <id> --environment production  --service api
railway unlink                                        # remove the link
railway status --json                                 # show current link
```

**Important**: in this skill, **always pass `--project/--service/--environment` explicitly** on every command rather than relying on `railway link` state. The user's local link state can drift; explicit flags are robust.

## Monorepo configuration

Railway supports two styles of monorepo:

### Style A: isolated-directory monorepo
Each service has its own subdirectory with its own dependencies (e.g. `apps/api/`, `apps/web/`).

In each service's dashboard Settings → Service → set **Root Directory** to `apps/api`. Railway will treat that directory as the build context. Your `Dockerfile` or Railpack auto-detection runs from there.

### Style B: shared monorepo (Turborepo, Nx, pnpm/yarn workspaces)
All packages share a single `node_modules` and `package.json` at the root.

**DO NOT set Root Directory.** Instead:
- Build context stays at repo root
- Set custom **Build Command**: `pnpm install --frozen-lockfile && pnpm --filter api build`
- Set custom **Start Command**: `pnpm --filter api start`
- Set **Watch Patterns** so unrelated commits don't rebuild this service:
  ```
  apps/api/**
  packages/shared/**
  package.json
  pnpm-lock.yaml
  turbo.json
  ```

**Footgun**: `NIXPACKS_TURBO_APP_NAME` is **ignored by Railpack** (the new default builder). The Turborepo-on-Nixpacks integration is effectively gone — use the Build Command + Watch Patterns approach above.

**Footgun**: the `railway.toml` config file does **not** follow Root Directory. If your service's root is `apps/api`, set the **Config-as-Code Path** to `apps/api/railway.toml` in service Settings.

## Set up `railway.toml`

Drop this in your repo (or in `apps/<svc>/` for monorepos with appropriate Config Path):

```toml
[build]
builder = "RAILPACK"
watchPatterns = ["src/**", "package.json", "pnpm-lock.yaml"]

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 120
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
overlapSeconds = 20
drainingSeconds = 10
```

Per-environment overrides:
```toml
[environments.production.deploy]
restartPolicyType = "ALWAYS"

[environments.staging.deploy]
healthcheckTimeout = 60
```

Settings priority: `environments.<name>.deploy` > top-level `[deploy]` > dashboard.

The full schema is at `https://railway.com/railway.schema.json` (use as `$schema` in `railway.json`). For the full reference see `configure.md`.

## Verify everything works

```bash
./.claude/skills/railway/scripts/railway-doctor.sh
railway status --json
railway list --json | jq
railway logs --build         # stream the latest build
```

## Where to go next

- Deploy code: `deploy.md`
- Configure variables, healthcheck, scaling: `configure.md`
- Connect a database, set up volumes: `data.md`
- Add a custom domain: `networking.md`
- Set up GitHub Actions CI: `ci.md`
