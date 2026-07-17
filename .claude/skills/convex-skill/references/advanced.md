# Advanced Patterns Reference — Components, Testing, Deployment, Debugging

## Table of Contents

1. [Convex components](#1-convex-components)
2. [Testing with convex-test](#2-testing-with-convex-test)
3. [Deployment and environments](#3-deployment-and-environments)
4. [Debugging and common pitfalls](#4-debugging-and-common-pitfalls)
5. [Performance optimization](#5-performance-optimization)
6. [convex-helpers library](#6-convex-helpers-library)
7. [ESLint configuration](#7-eslint-configuration)
8. [Hono integration](#8-hono-integration)
9. [Codemod para migrar ctx.db](#9-codemod-para-migrar-ctxdb)
10. [Limites de paginacion avanzados (v1.32.0+)](#10-límites-de-paginación-avanzados-v1320)

---

## 1. Convex components

Components are **self-contained backend modules** with their own tables, functions, file storage, and scheduled functions. They run in isolated sandboxes but participate in the same transaction as your app code.

### Installation pattern

```bash
npm install @convex-dev/agent @convex-dev/rate-limiter
```

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

const app = defineApp();
app.use(agent);
app.use(rateLimiter);
export default app;
```

Access via generated `components` object:
```typescript
import { components } from "./_generated/api";
```

### Available components (verificados febrero 2026)

| Package | ~Descargas/sem | Purpose |
|---------|---------------|---------|
| `@convex-dev/workpool` | 62K | Background jobs con reintentos |
| `@convex-dev/rate-limiter` | 41K | Token bucket / fixed window |
| `@convex-dev/better-auth` | 33K | Better Auth adapter |
| `@convex-dev/workflow` | 31K | Workflows durables multi-paso |
| `@convex-dev/migrations` | 31K | Migraciones de datos en vivo |
| `@convex-dev/resend` | 26K | Emails con Resend |
| `@convex-dev/agent` | 24K | Agentes IA con threads y tools |
| `@convex-dev/action-retrier` | 19K | Reintentos con backoff |
| `@convex-dev/aggregate` | 19K | Sumas, conteos, B-tree |
| `@convex-dev/rag` | 12K | Retrieval-Augmented Generation |
| `@convex-dev/r2` | 11K | Cloudflare R2 storage |
| `@convex-dev/action-cache` | 11K | Cache de resultados de actions |
| `@convex-dev/persistent-text-streaming` | 7K | Streaming texto IA persistente |
| `@convex-dev/crons` | 6K | Cron jobs dinámicos (runtime) |
| `@convex-dev/stripe` | 5K | Integración Stripe |

### Rate limiting example

```typescript
import { RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

const rateLimiter = new RateLimiter(components.rateLimiter, {
  sendMessage: { kind: "token bucket", rate: 10, period: 60000, capacity: 10 },
  createAccount: { kind: "fixed window", rate: 3, period: 3600000 },
});

export const sendMessage = mutation({
  args: { body: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject;
    await rateLimiter.limit(ctx, "sendMessage", { key: userId, throws: true });
    // ... proceed
  },
});
```

---

## 2. Testing with convex-test

Última versión: **convex-test 0.0.41** (febrero 2026).

### Setup

```bash
npm install --save-dev convex-test vitest @edge-runtime/vm
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
  },
});
```

### Basic tests

```typescript
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

test("create and list tasks", async () => {
  const t = convexTest(schema);
  await t.mutation(api.tasks.create, { text: "Test task" });
  const tasks = await t.query(api.tasks.list);
  expect(tasks).toMatchObject([{ text: "Test task" }]);
});
```

### Authenticated tests

```typescript
test("authenticated operations", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ name: "Alice", email: "alice@example.com" });

  await asUser.mutation(api.tasks.create, { text: "Alice's task" });
  const tasks = await asUser.query(api.tasks.list);
  expect(tasks).toHaveLength(1);
});
```

### Direct database seeding

```typescript
test("with seeded data", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await ctx.db.insert("tasks", { text: "Seeded", completed: false });
  });
  const tasks = await t.query(api.tasks.list);
  expect(tasks).toHaveLength(1);
});
```

### HTTP action tests

```typescript
test("webhook endpoint", async () => {
  const t = convexTest(schema);
  const response = await t.fetch("/webhook", {
    method: "POST",
    body: JSON.stringify({ event: "test" }),
  });
  expect(response.status).toBe(200);
});
```

### Scheduled function tests

```typescript
import { vi } from "vitest";

test("scheduled cleanup", async () => {
  vi.useFakeTimers();
  const t = convexTest(schema);
  await t.mutation(api.tasks.scheduleCleanup, {});
  vi.advanceTimersByTime(60000);
  await t.finishInProgressScheduledFunctions();
  // Assert cleanup happened...
  vi.useRealTimers();
});
```

---

## 3. Deployment and environments

### Deploy to production

```bash
npx convex deploy                                  # Interactive
npx convex deploy --cmd "npm run build"             # Deploy backend, then build frontend
CONVEX_DEPLOY_KEY=prod:... npx convex deploy        # CI (non-interactive)
```

### Multiple environments

| Environment | Command | Notes |
|-------------|---------|-------|
| Dev | `npx convex dev` | Each team member gets their own deployment |
| Production | `npx convex deploy` | Single production deployment |
| Preview | `npx convex deploy --preview-create branch-name` | Fresh deployment per PR (free) |
| Self-hosted | Docker | Open-source backend, SQLite/Postgres/MySQL |

### CI/CD

Use `CONVEX_DEPLOY_KEY` env var for non-interactive deploys. For preview deployments, generate a separate Preview Deploy Key in the Dashboard.

```yaml
# GitHub Actions example
- name: Deploy to Convex
  env:
    CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}
  run: npx convex deploy --cmd "npm run build"
```

### Limits and quotas

| Resource | Free/Starter | Professional ($25/member/mo) |
|----------|-------------|------------------------------|
| Database storage | 0.5 GiB | 50 GiB |
| Database bandwidth | 1 GiB/month | 50 GiB/month |
| Function calls | 1M/month | 25M/month |
| File storage | 1 GiB | 100 GiB |
| Query/mutation timeout | 1 second | 1 second |
| Action timeout | 10 minutes | 10 minutes |
| Documents scanned/query | 32,000 | 32,000 |
| Documents written/mutation | 16,000 | 16,000 |
| Concurrent queries | 16 | 256 |
| Concurrent Node actions | 64 | 1,000 |
| Argument/return size | 16 MiB | 16 MiB |
| HTTP action body | 20 MB | 20 MB |

---

## 4. Debugging and common pitfalls

### Error handling best practices

- **Use `ConvexError` for expected errors** (auth failures, validation, business rules) — `.data` reaches client
- **Use standard `Error` for bugs** — message redacted to "Server Error" in production
- Full stack traces always available in Dashboard Logs

### Common pitfalls and fixes

| Pitfall | Fix |
|---------|-----|
| Floating promises (forgetting `await`) | Always `await` all Convex calls. Enable `no-floating-promises` ESLint rule |
| OCC conflicts (reading whole table) | Use targeted `.withIndex()` queries instead of `.collect()` |
| `.collect()` on large tables | Use `.take(n)`, `.first()`, or `.paginate()` |
| `Date.now()` in queries | Invalidates cache every time. Pass timestamp from client or use coarser checks |
| Missing validators | Always define `args` AND `returns` on all functions |
| `undefined` in documents | Gets stripped (like `JSON.stringify`). Use `v.null()` for explicit absence |
| Missing `"use node"` | Node.js packages in actions need the file to start with `"use node"` |
| Queries in `"use node"` files | Never — only actions go in Node.js files |
| Calling actions from mutations | Schedule them: `ctx.scheduler.runAfter(0, internal.myAction, args)` |
| `ctx.runQuery` in queries | Use helper functions instead (same transaction, no overhead) |

### Console logging

`console.log`, `console.warn`, `console.error`, `console.time`, `console.timeEnd` — all work. Dev: forwarded to browser. Production: Dashboard + log streaming only.

### Dashboard features

- **Data browser**: Browse, filter, edit documents in all tables
- **Logs viewer**: Real-time logs with text/function/status/severity filters
- **Functions page**: List, run directly, per-function charts (invocation rate, exception rate, cache hit rate)
- **Health/Insights**: Deep performance analytics
- **Log streaming** (Pro): Axiom, Datadog, or custom webhook

---

## 5. Performance optimization

### Index design

- Add indexes for any field used in `.filter()` on tables with >100 rows
- Compound indexes: put equality fields first, range field last
- `_creationTime` is automatically appended — no need to add it
- Don't create redundant indexes: `["foo"]` is subsumed by `["foo", "bar"]`

### Query optimization

- Prefer `.take(n)` over `.collect()` — stops scanning early
- Use `.withIndex()` + narrow ranges to minimize documents scanned
- Move `.filter()` conditions into `.withIndex()` range expressions where possible
- For counts: use `@convex-dev/aggregate` component instead of `.collect().length`

### Mutation optimization

- Keep mutations focused — read/write only what's needed
- Avoid `.collect()` in mutations (causes OCC conflicts with any write)
- Batch writes where possible (single mutation, multiple `ctx.db.insert` calls)

### Client optimization

- Use `"skip"` to avoid unnecessary queries
- Use `usePaginatedQuery` for long lists instead of loading everything
- Optimistic updates for immediate UI feedback on mutations

---

## 6. convex-helpers library

```bash
npm install convex-helpers
```

| Utility | Import | Purpose |
|---------|--------|---------|
| Relationship helpers | `convex-helpers/server/relationships` | `getAll`, `getOneFrom`, `getManyFrom`, `getManyVia` |
| Custom functions | `convex-helpers/server/customFunctions` | `customQuery`, `customMutation`, `customAction` for middleware |
| Filter helper | `convex-helpers/server/filter` | `filter()` for unlimited TS filters with pagination |
| Row-level security | `convex-helpers/server/rowLevelSecurity` | `wrapDatabaseReader`, `wrapDatabaseWriter` |
| Zod validation | `convex-helpers/server/zod` | `zCustomQuery`, `zCustomMutation` (Zod 3 and 4) |
| Migrations | `convex-helpers/server/migrations` | Define and run data migrations |
| Triggers | `convex-helpers/server/triggers` | Attach functions to table changes |
| Sessions | `convex-helpers/server/sessions` | Client-side session ID management |
| CRUD | `convex-helpers/server/crud` | Auto-generate standard CRUD operations |
| QueryStream | `convex-helpers/server/queryStream` | SQL-like UNION ALL, JOIN, DISTINCT, GROUP BY |
| `useStableQuery` | `convex-helpers/react` | Return stale data when params change (instead of `undefined`) |

---

## 7. ESLint configuration

El plugin `@convex-dev/eslint-plugin` ya es **GA** (General Availability).

```javascript
// eslint.config.js
import convexPlugin from "@convex-dev/eslint-plugin";
export default [...convexPlugin.configs.recommended];
```

Enforces:
- Argument validators on all public functions
- Warnings on unbounded `.collect()`
- Floating promises detection

---

## 8. Hono integration

Para HTTP routing avanzado (middleware, params, validación), se puede usar Hono como alternativa al router HTTP nativo de Convex:

```typescript
import { Hono } from "hono";
import { HonoWithConvex, HttpRouterWithHono } from "convex-helpers/server/hono";
import { ActionCtx } from "./_generated/server";

const app: HonoWithConvex<ActionCtx> = new Hono();

app.get("/api/hello", async (c) => {
  return c.json({ message: "Hello from Hono + Convex" });
});

export default new HttpRouterWithHono(app);
```

> **Nota:** Las rutas definidas con Hono siguen las mismas limitaciones de Convex HTTP actions (timeout, body size, etc.).

---

## 9. Codemod para migrar ctx.db

Para migrar del API antigua (`ctx.db.get(id)`) al API nueva con tabla explícita (`ctx.db.get("table", id)`):

```bash
npx @convex-dev/codemod@latest explicit-ids
# Migra automáticamente:
# ctx.db.get(id)         → ctx.db.get("table", id)
# ctx.db.patch(id, data) → ctx.db.patch("table", id, data)
# ctx.db.delete(id)      → ctx.db.delete("table", id)
# ctx.db.replace(id, data) → ctx.db.replace("table", id, data)
```

---

## 10. Límites de paginación avanzados (v1.32.0+)

A partir de v1.32.0, `.paginate()` acepta opciones para controlar límites de lectura:

```typescript
.paginate({
  cursor,
  numItems: 25,
  maximumRowsRead: 1000,    // Máx. documentos escaneados (default: 32000)
  maximumBytesRead: 1048576, // Máx. bytes leídos (1 MB)
})
```

Estas opciones son útiles para evitar timeouts en tablas con documentos grandes o cuando se necesita un control más fino del rendimiento.
