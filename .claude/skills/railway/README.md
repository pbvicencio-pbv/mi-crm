# Railway Skill

Production-grade skill for managing Railway (railway.com) infrastructure from the agent harness. Route-first architecture, state-of-the-art for May 2026.

## What this skill does

Manages Railway end-to-end:
- Create projects, services, environments, databases
- Deploy (CLI + GraphQL), redeploy, rollback, restart
- Manage variables (incl. shared, sealed, references), atomic batch updates
- Configure healthchecks, restart policies, replicas, regions, cron schedules
- Handle public + private + TCP-proxy networking, custom domains + SSL
- Manage volumes, backups, S3-compatible Buckets
- Full GraphQL API access via a helper script
- Read logs with full filter syntax, SSH into containers, troubleshoot
- Estimate costs, optimize spend
- Decide architecture (Functions vs services, cron vs worker vs queue, etc.)

## Architecture

Route-first SKILL.md that delegates to focused references:
- `SKILL.md` — concise router (~3 KB), loaded into every context
- `references/setup.md` — install, init, link, monorepos
- `references/deploy.md` — up, redeploy, rollback, restart, down
- `references/configure.md` — variables, refs, sealed, healthcheck, restart, scaling
- `references/operate.md` — logs (full filter syntax), ssh, run, troubleshooting
- `references/networking.md` — public/private, custom domains, SSL, TCP proxy, IPv6
- `references/data.md` — DBs, volumes, backups, Buckets
- `references/ci.md` — GitHub Actions, project tokens, PR environments
- `references/graphql.md` — full GraphQL API reference
- `references/pricing.md` — plan limits, regions, cost math
- `references/decisions.md` — architectural decision matrix

Plus:
- `scripts/railway-api.sh` — GraphQL helper (auto-detects auth)
- `scripts/railway-doctor.sh` — preflight check
- `scripts/ids-from-url.sh` — parse projectId/serviceId/envId from dashboard URL
- `templates/railway.toml` — production-grade config-as-code
- `templates/railpack.json` — opt-in Railpack customization
- `templates/Dockerfile` — multi-stage with proper cache layering
- `templates/.railwayignore` — what NOT to upload
- `hooks/pre-tool-use.json` + `hooks/check-bash.sh` — auto-approve safe railway commands, prompt on mutations, block destructive ones

## Installation

### Project-scoped (recommended)
Copy the entire `railway/` directory into your project's `.claude/skills/`:
```bash
mkdir -p .claude/skills
cp -r railway/ .claude/skills/
chmod +x .claude/skills/railway/scripts/*.sh
chmod +x .claude/skills/railway/hooks/check-bash.sh
```

### User-scoped (available across all your projects)
```bash
mkdir -p ~/.claude/skills
cp -r railway/ ~/.claude/skills/
chmod +x ~/.claude/skills/railway/scripts/*.sh
chmod +x ~/.claude/skills/railway/hooks/check-bash.sh
```

### Authenticate
For interactive use:
```bash
railway login
```

For headless / CI:
```bash
export RAILWAY_API_TOKEN="..."     # account/workspace, full scope
# OR
export RAILWAY_PROJECT_TOKEN="..." # project-scoped, deploy-only
```

Get tokens at https://railway.com/account/tokens (account/workspace) or in project Settings → Tokens (project-scoped).

### Verify
```bash
./.claude/skills/railway/scripts/railway-doctor.sh
```

## Usage

Mention Railway in chat — the skill auto-loads on related keywords (deployments, services, environments, build failures, etc.).

Example prompts:
- "Deploy my Next.js app to Railway"
- "My service is crashing, can you check the logs?"
- "Set up a Postgres database with a private connection"
- "Create a PR environment workflow with focused mode"
- "Why is my healthcheck failing?"
- "Estimate the cost of this architecture on Railway"
- "Roll back to the previous deploy"
- "Add a custom domain api.example.com to my service"
- "Set these 5 environment variables atomically and trigger one deploy"

## Updating the skill

Railway ships weekly. Re-run a fresh research pass when:
- A new builder lands (post-Railpack)
- New region added (5th)
- Major GraphQL endpoint changes
- New product surface (Functions evolution, etc.)

Subscribe to the Friday changelog email and watch `https://railway.com/changelog`.

## Sources & verification

This skill was built from:
- Official Railway docs (`docs.railway.com`)
- Railway changelog (`railway.com/changelog`)
- Railway's own `railwayapp/railway-skills` GitHub repo (the agent skills format Railway officially endorses)
- Railpack docs (`railpack.com`)
- Railway blog (`blog.railway.com`)
- GraphQL playground (`railway.com/graphiql`) and Postman collection
- Railway Help Station (`station.railway.com`)
- Community sources: GitHub issues/discussions, Discord, Reddit, Hacker News, dev.to

## License

MIT (or whatever your org prefers — adjust as needed). The skill is yours to modify.
