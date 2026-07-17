# Functions Reference — Queries, Mutations, Actions, HTTP Actions

## Table of Contents

1. [Queries](#1-queries)
2. [Mutations](#2-mutations)
3. [Actions](#3-actions)
4. [HTTP actions](#4-http-actions)
5. [Internal functions](#5-internal-functions)
6. [Helper functions pattern](#6-helper-functions-pattern)
7. [Scheduling and cron jobs](#7-scheduling-and-cron-jobs)
8. [Optimistic updates](#8-optimistic-updates)
9. [Error handling](#9-error-handling)

---

## 1. Queries

Queries are **cached**, **reactive**, and **deterministic**. No `fetch()`, no side effects.

**Context**: `ctx.db` (read-only), `ctx.storage` (file URLs), `ctx.auth` (identity).

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { channelId: v.id("channels") },
  returns: v.array(v.object({
    _id: v.id("messages"),
    _creationTime: v.number(),
    body: v.string(),
    authorId: v.id("users"),
    channelId: v.id("channels"),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(50);
  },
});
```

### Query chain order

```
ctx.db.query("table")
  → .withIndex(indexName, rangeExpr?)       // Select index + range (FAST)
  → .withSearchIndex(indexName, expr)       // Full-text search (alternative to withIndex)
  → .filter(predicate)                     // Post-scan filter (SLOW on large tables)
  → .order("asc" | "desc")                // Default: "asc"
  → terminal method                        // .collect(), .take(n), .first(), .unique(), .paginate()
```

### Terminal methods

| Method | Returns | Behavior |
|--------|---------|----------|
| `.collect()` | `Doc[]` | All results. ⚠️ Full scan if unbounded |
| `.take(n)` | `Doc[]` | First n results. Stops scanning early |
| `.first()` | `Doc \| null` | First result or null |
| `.unique()` | `Doc \| null` | Single result, null if none. **Throws if >1** |
| `.paginate(opts)` | `PaginationResult` | Cursor-based pagination |

Queries are also `AsyncIterable`:
```typescript
for await (const post of ctx.db.query("posts")) {
  if (post.tags.includes(args.tag)) return post;
}
```

### Returning `undefined`
`undefined` is translated to `null` on the client. Convex values don't support `undefined`.

---

## 2. Mutations

Mutations read AND write. The entire handler is a single ACID transaction. All writes commit together or none do.

**Context**: `ctx.db` (read+write), `ctx.storage`, `ctx.auth`, `ctx.scheduler`.

### Write operations (v1.31.0+ API with explicit table names)

```typescript
// Insert — returns Id<"tableName">
const id = await ctx.db.insert("tasks", { text: "Buy groceries", completed: false });

// Patch — shallow merge (new fields added, undefined removes fields)
await ctx.db.patch("tasks", id, { completed: true, tag: "shopping" });

// Replace — overwrites ALL non-system fields
await ctx.db.replace("tasks", id, { text: "Buy food", completed: false });

// Delete
await ctx.db.delete("tasks", id);

// Get by ID — returns document or null
const task = await ctx.db.get("tasks", id);
```

> **Compatibilidad:** La API anterior sin tabla (`ctx.db.get(id)`, `ctx.db.patch(id, ...)`)
> sigue funcionando en v1.32.0 pero está deprecated. La migración a la API nueva con tabla
> se puede automatizar con: `npx @convex-dev/codemod@latest explicit-ids`

### Transaction behavior
- OCC: conflicting mutations are automatically retried
- A mutation reading entire table (`.collect()`) conflicts with ANY write to that table
- Design mutations to read only what they need via targeted index queries

### Client-side mutation ordering
Mutations from a single React client execute **one at a time in order** — guaranteed ordering.

---

## 3. Actions

Actions are NOT part of the sync engine. They cannot directly access `ctx.db`. Use them ONLY when you need: external API calls, Node.js packages, or non-deterministic computation.

| Feature | Query | Mutation | Action |
|---------|-------|----------|--------|
| Read DB | ✅ Direct | ✅ Direct | Via `ctx.runQuery` |
| Write DB | ❌ | ✅ Direct | Via `ctx.runMutation` |
| `fetch()` | ❌ | ❌ | ✅ |
| Deterministic | Required | Required | Not required |
| Auto-retried | ✅ | ✅ | ❌ |
| Timeout | 1 second | 1 second | **10 minutes** |

```typescript
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const callExternalApi = action({
  args: { query: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const doc = await ctx.runQuery(internal.docs.get, { query: args.query });
    const response = await fetch("https://api.example.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: doc.text }),
    });
    const data = await response.json();
    await ctx.runMutation(internal.docs.saveResult, { result: data.answer });
    return data.answer;
  },
});
```

### Node.js runtime

For NPM packages needing Node.js APIs, the file MUST start with `"use node"`:

```typescript
"use node";
import { action } from "./_generated/server";
import Stripe from "stripe";

export const createCheckout = action({
  args: { priceId: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const session = await stripe.checkout.sessions.create({ /* ... */ });
    return session.url!;
  },
});
```

**ONLY actions can use `"use node"`. Never put queries or mutations in such files.**

---

## 4. HTTP actions

Defined in `convex/http.ts`. Exposed at `https://<deployment>.convex.site`.

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Exact path match
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature")!;
    await ctx.runMutation(internal.payments.processWebhook, { body, sig });
    return new Response(null, { status: 200 });
  }),
});

// Prefix matching
http.route({
  pathPrefix: "/api/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    return new Response(JSON.stringify({ path: url.pathname }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
```

**Limits**: Request/response **20MB**. Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH. CORS headers must be added manually.

### CORS en HTTP Actions

Patrón recomendado: archivo `cors.ts` centralizado como fuente única de verdad.

```typescript
// convex/cors.ts — fuente única de verdad para CORS
import { corsHeaders } from "./cors";

const handler = httpAction(async (ctx, request) => {
  // Manejar preflight OPTIONS
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders(request) });
  }
  // ... lógica del endpoint
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...corsHeaders(request) },
  });
});

// ⚠️ IMPORTANTE: Registrar SIEMPRE POST + OPTIONS para cada handler en http.ts
// http.route({ path: "/api/mi-endpoint", method: "POST", handler: miHandler });
// http.route({ path: "/api/mi-endpoint", method: "OPTIONS", handler: miHandler });
```

### Web Crypto API (sin Node.js crypto)

El runtime de Convex **NO soporta** módulos Node.js como `crypto`. Usar Web Crypto API:

```typescript
// ❌ INCORRECTO — falla en Convex
import crypto from "crypto";
const hash = crypto.createHmac("sha256", key).update(data).digest("hex");

// ✅ CORRECTO — Web Crypto API
async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Alternativas Web: btoa/atob en vez de Buffer, TextEncoder/TextDecoder en vez de Buffer.from
```

### Paquetes npm externos (dynamic import)

Paquetes declarados en `convex.json` → `node.externalPackages` se importan dinámicamente en actions y httpActions:

```typescript
// En actions/httpActions — importar dinámicamente
const Stripe = (await import("stripe")).default;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-18.acacia" });

// Para webhooks Stripe, usar constructEventAsync (compatible con Web Crypto):
const event = await stripe.webhooks.constructEventAsync(body, sig, secret);
// ❌ NO usar constructEvent() — requiere Node.js crypto que Convex no soporta
```

---

## 5. Internal functions

Only callable from other Convex functions, scheduler, crons, or Dashboard. Not accessible from clients.

```typescript
import { internalMutation, internalQuery, internalAction } from "./_generated/server";

export const processPayment = internalMutation({
  args: { userId: v.id("users"), amount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => { /* ... */ },
});
```

Reference with `internal.module.function` (NOT `api.module.function`).

---

## 6. Helper functions pattern

For shared logic within the same transaction — plain TypeScript functions taking `ctx`:

```typescript
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

export async function getCurrentUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}
```

**Why not `ctx.runQuery`/`ctx.runMutation`?** Those create SEPARATE transactions. Helper functions run in the SAME transaction — no overhead, full consistency.

---

## 7. Scheduling and cron jobs

### Scheduled functions

```typescript
// Schedule after delay (milliseconds)
const scheduledId = await ctx.scheduler.runAfter(0, internal.emails.sendWelcome, { userId });

// Schedule at specific time (Unix ms)
await ctx.scheduler.runAt(targetTimestamp, internal.reports.generate, { reportId });

// Cancel
await ctx.scheduler.cancel(scheduledId);

// Check status
const fn = await ctx.db.system.get(scheduledId);
// fn.state.kind: "pending" | "inProgress" | "success" | "failed" | "canceled"
```

Scheduling is **transactional** — scheduled functions only run if the enclosing mutation commits.

### Cron jobs (`convex/crons.ts`)

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("clear old messages", { minutes: 5 }, internal.messages.cleanup);
crons.daily("daily digest", { hourUTC: 8, minuteUTC: 0 }, internal.reports.dailyDigest);
crons.weekly("weekly report", { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 }, internal.reports.weekly);
crons.monthly("monthly billing", { day: 1, hourUTC: 0, minuteUTC: 0 }, internal.billing.process);
crons.cron("custom", "*/15 * * * *", internal.tasks.periodicCheck);

export default crons;
```

If a cron job's function is still running when the next trigger fires, the run is **skipped** (not queued).

---

## 8. Optimistic updates

```typescript
const sendMessage = useMutation(api.messages.send).withOptimisticUpdate(
  (localStore, args) => {
    const current = localStore.getQuery(api.messages.list, { channelId: args.channelId });
    if (current !== undefined) {
      localStore.setQuery(api.messages.list, { channelId: args.channelId }, [
        ...current,
        {
          _id: crypto.randomUUID() as Id<"messages">,
          _creationTime: Date.now(),
          body: args.body,
          authorId: args.authorId,
          channelId: args.channelId,
        },
      ]);
    }
  },
);
```

**Critical**: Always create NEW objects — never mutate existing ones (corrupts internal state). Updates are rolled back when the real server response arrives.

---

## 9. Error handling

### ConvexError (application errors that reach the client)

```typescript
import { ConvexError } from "convex/values";

// Simple string
throw new ConvexError("Role already taken");

// Structured data
throw new ConvexError({ message: "Rate limited", retryAfter: 60 });
```

### Client-side handling

```typescript
try {
  await sendMessage({ body: text });
} catch (error) {
  if (error instanceof ConvexError) {
    // error.data contains the structured error
    toast.error(error.data.message ?? String(error.data));
  } else {
    // Developer error — generic "Server Error" in production
    toast.error("Something went wrong");
  }
}
```

**Production behavior**: Error messages from standard `Error` throws are **redacted** to "Server Error". `ConvexError.data` is always passed through. Full stack traces available in Dashboard Logs.

### Logging

`console.log`, `console.warn`, `console.error`, `console.time`, `console.timeEnd` all work. In dev: forwarded to browser console. In production: Dashboard + log streaming only.

### Workflow pattern (mutation → action → mutation)

```typescript
// 1. Client calls mutation to record intent
export const startGeneration = mutation({
  args: { prompt: v.string() },
  returns: v.id("generations"),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("generations", { prompt: args.prompt, status: "pending" });
    await ctx.scheduler.runAfter(0, internal.ai.generate, { generationId: id, prompt: args.prompt });
    return id;
  },
});

// 2. Action does external work
export const generate = internalAction({
  args: { generationId: v.id("generations"), prompt: v.string() },
  handler: async (ctx, args) => {
    const result = await fetch("https://api.openai.com/...", { /* ... */ });
    const data = await result.json();
    await ctx.runMutation(internal.generations.saveResult, {
      id: args.generationId,
      result: data.choices[0].message.content,
    });
  },
});

// 3. Client observes result via reactive query on "generations" table
```
