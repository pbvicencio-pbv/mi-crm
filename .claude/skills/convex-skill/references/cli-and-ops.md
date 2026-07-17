# CLI and Operations Reference

## Table of Contents

1. [Complete CLI reference](#1-complete-cli-reference)
2. [Project initialization](#2-project-initialization)
3. [convex.json configuration](#3-convexjson-configuration)
4. [Environment variables](#4-environment-variables)
5. [Data import/export](#5-data-importexport)
6. [CI/CD setup](#6-cicd-setup)

---

## 1. Complete CLI reference

### Development

| Command | Purpose |
|---------|---------|
| `npx convex dev` | Watch mode: push changes, generate types, show logs |
| `npx convex dev --once` | Push once and exit (no watch) |
| `npx convex dev --tail-logs always` | Show all server logs continuously |
| `npx convex codegen` | Regenerate types without pushing |

### Deployment

| Command | Purpose |
|---------|---------|
| `npx convex deploy` | Deploy to production (interactive) |
| `npx convex deploy --yes` | Deploy sin confirmación interactiva (CI/CD) |
| `npx convex deploy --dry-run` | Verificar sin deployar (validación) |
| `npx convex deploy --cmd "npm run build"` | Deploy backend, then run frontend build |
| `npx convex deploy --preview-create branch-name` | Create preview deployment |
| `CONVEX_DEPLOY_KEY=prod:... npx convex deploy` | CI/CD non-interactive deploy |

### Running functions

| Command | Purpose |
|---------|---------|
| `npx convex run functionName '{"arg": "value"}'` | Run a function directly |
| `npx convex run functionName --watch` | Run query with live updates |

### Logs

| Command | Purpose |
|---------|---------|
| `npx convex logs` | Tail deployment logs |
| `npx convex logs --prod` | Tail production logs |

### Environment variables

| Command | Purpose |
|---------|---------|
| `npx convex env list` | List all environment variables (dev) |
| `npx convex env list --prod` | List all environment variables (producción) |
| `npx convex env set KEY value` | Set environment variable (dev) |
| `npx convex env set --prod KEY value` | Set environment variable (producción) |
| `npx convex env get KEY` | Get environment variable |
| `npx convex env remove KEY` | Remove environment variable |

> **⚠️ CRÍTICO**: Sin `--prod`, los comandos `env` solo aplican al entorno de desarrollo.
> Siempre usar `--prod` para configurar variables en producción.

### Running functions in production

| Command | Purpose |
|---------|---------|
| `npx convex run --prod module:function '{}'` | Run function in production |
| `npx convex logs --prod` | Tail production logs |

### Diagnostics (v1.32.0+)

| Command | Purpose |
|---------|---------|
| `npx convex insights` | Diagnosticar conflictos OCC, límites y rendimiento |

### Data management

| Command | Purpose |
|---------|---------|
| `npx convex data` | List all tables |
| `npx convex data tableName --limit 10` | Display table data |
| `npx convex import --table name file.jsonl` | Import data from JSONL |
| `npx convex export --path dir` | Export all data to directory |

### Utilities

| Command | Purpose |
|---------|---------|
| `npx convex dashboard` | Open dashboard in browser |
| `npx convex auth` | Manage authentication settings |

---

## 2. Project initialization

```bash
# New project
npm install convex
npx convex dev  # First run: login → create project → generate types → watch mode

# Existing project (clone)
npm install
npx convex dev  # Connects to existing project via .env.local
```

First run creates:
- `convex/` directory (if not exists)
- `convex/_generated/` with typed API, data model, and server exports
- `.env.local` with `CONVEX_DEPLOYMENT` and public URL variable

---

## 3. convex.json configuration

```json
{
  "$schema": "./node_modules/convex/schemas/convex.schema.json",
  "codegen": {
    "staticApi": true,
    "staticDataModel": true
  },
  "node": {
    "externalPackages": ["stripe"]
  },
  "bundler": {
    "includeSourcesContent": false
  },
  "typescriptCompiler": "tsGo"
}
```

### Key settings

| Setting | Purpose | When to use |
|---------|---------|-------------|
| `codegen.staticApi: true` | Static API type generation | Large codebases — dramatically improves TS language server performance |
| `codegen.staticDataModel: true` | Static data model types | Same as above |
| `node.externalPackages` | Paquetes npm que requieren Node.js runtime | Declarar aquí paquetes como `stripe`, `bcrypt`, etc. Se importan con `(await import("stripe")).default` en actions/httpActions |
| `bundler.includeSourcesContent: false` | Exclude source maps | Production optimization |
| `typescriptCompiler: "tsGo"` | Usar tsGo para compilación más rápida | Proyectos grandes — reduce significativamente el tiempo de `npx convex dev` |

> **Nota:** Node.js 18 ya no es soportado desde v1.31.5 — se requiere **Node.js 20+**.

---

## 4. Environment variables

### Client-side URL vars (framework-specific)

| Framework | Variable | Access |
|-----------|----------|--------|
| Next.js | `NEXT_PUBLIC_CONVEX_URL` | `process.env.NEXT_PUBLIC_CONVEX_URL` |
| Vite / SvelteKit | `VITE_CONVEX_URL` | `import.meta.env.VITE_CONVEX_URL` |
| Create React App | `REACT_APP_CONVEX_URL` | `process.env.REACT_APP_CONVEX_URL` |
| Expo | `EXPO_PUBLIC_CONVEX_URL` | `process.env.EXPO_PUBLIC_CONVEX_URL` |

### Server-side (in Convex functions)

Set via CLI or Dashboard:
```bash
npx convex env set OPENAI_API_KEY sk-...
npx convex env set STRIPE_SECRET_KEY sk_live_...
```

Access in functions: `process.env.OPENAI_API_KEY`

**Built-in variables** (always available):
- `CONVEX_CLOUD_URL` — Your deployment's cloud URL
- `CONVEX_SITE_URL` — Your HTTP actions URL (`https://<deployment>.convex.site`)

### CI/CD variables

| Variable | Purpose |
|----------|---------|
| `CONVEX_DEPLOY_KEY` | Production deployment authentication |
| Preview Deploy Key | Separate key for preview deployments |

---

## 5. Data import/export

### Import

```bash
# Import JSONL file into a table
npx convex import --table users users.jsonl

# JSONL format (one JSON object per line):
# {"name": "Alice", "email": "alice@example.com"}
# {"name": "Bob", "email": "bob@example.com"}
```

### Export

```bash
# Export all tables to a directory
npx convex export --path ./backup

# Creates one .jsonl file per table
```

### Programmatic data manipulation

For complex migrations, use the `@convex-dev/migrations` component or write internal mutations that batch-process documents:

```typescript
export const migrateUsers = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(500);
    let count = 0;
    for (const user of users) {
      if (user.role === undefined) {
        await ctx.db.patch("users", user._id, { role: "member" });
        count++;
      }
    }
    return count;
  },
});
```

---

## 6. CI/CD setup

### GitHub Actions

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - name: Deploy Convex + build frontend
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}
        run: npx convex deploy --cmd "npm run build"
      # Then deploy frontend to Vercel/Netlify/etc.
```

### Preview deployments (per-PR)

```yaml
name: Preview
on:
  pull_request:

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - name: Create preview deployment
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_PREVIEW_DEPLOY_KEY }}
        run: |
          npx convex deploy --preview-create ${{ github.head_ref }} \
            --cmd "npm run build"
```

### Vercel integration

Set `CONVEX_DEPLOY_KEY` in Vercel's environment variables. In `package.json`:
```json
{
  "scripts": {
    "build": "npx convex deploy --cmd 'next build'"
  }
}
```

Or use Vercel's build command: `npx convex deploy --cmd "next build"`.
