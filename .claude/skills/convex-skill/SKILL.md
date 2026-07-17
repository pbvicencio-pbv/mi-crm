---
name: convex
description: >
  Comprehensive mastery of Convex — the reactive TypeScript backend platform (database + server functions + real-time sync). Use this skill for ANY task involving Convex: writing queries/mutations/actions, defining schemas, setting up auth (Clerk or Convex Auth), configuring frontends (Next.js, Vite, React Native/Expo, Svelte, Vue), building AI agents/RAG, file storage, scheduling/crons, HTTP endpoints, testing with convex-test, deploying, debugging, CLI usage, components, or migrating to Convex. Trigger whenever the user mentions "convex", "convex.dev", convex imports (e.g. "convex/server", "convex/values", "convex/react"), Convex function patterns (useQuery, useMutation, ctx.db), or any reactive backend work. Also trigger for questions about Convex architecture, performance optimization, schema design, or comparison with Firebase/Supabase/PlanetScale. If in doubt, trigger — this skill covers the entire Convex ecosystem as of February 2026.
---

# Convex Mastery — Complete Skill for Claude Code

## §1 Architecture (internalize this — it drives every decision)

Convex is a **reactive TypeScript backend**: database → server functions → WebSocket client subscriptions. Every `useQuery` creates a live subscription. When data changes, Convex re-executes affected queries and pushes results. No polling, no cache invalidation, no WebSocket management.

**The database is document-relational**: JSON documents in tables, typed `Id<"tableName">` as foreign keys. **ACID transactions with serializable isolation** via optimistic concurrency control (OCC). Every mutation = automatic transaction.

**Determinism is enforced** in queries/mutations: `Math.random()` is seeded, `Date.now()` frozen at start, `fetch()` forbidden. This enables caching, retries, and reactive invalidation. **Actions** are the escape hatch for non-deterministic work.

**Reactivity mechanism**: Each query execution records precise index ranges read (read-set). When a mutation commits, the engine checks overlap between write-set and all subscriptions' read-sets. Overlapping queries re-execute and push to clients. All query results on a client reflect the same logical timestamp.

### Contexto de PULSE CRM (este proyecto)

- **Stack**: Next.js (App Router, TS) + Convex (backend/DB reactivo) + Railway (hosting de la
  app; `npx convex deploy` para funciones) + GitHub (push a `main` = deploy). **Backend = Convex; NO Supabase.**
- **Propósito**: CRM de ventas para negocios pequeños (proyecto académico); núcleo = no perder
  ventas por falta de seguimiento. Entidades reales (5): `clientes` (contactos), `interacciones`
  (actividades: llamada/mensaje/visita), `seguimientos` (próximo contacto → "Agenda del día"),
  `ventas` (oportunidades) y `usuarios`.
  - Jerga genérica → modelo real: contactos→`clientes`; actividades→`interacciones`;
    oportunidades/pipeline→`ventas` (+ estado del cliente derivado). **"empresa" NO es tabla:**
    es un campo `string` opcional en `clientes`.
- **Auth**: **Convex Auth** (`@convex-dev/auth`), provider **Password**. Next.js con
  `ConvexAuthNextjsProvider` (NO Clerk, NO `ConvexProviderWithClerk`). SIN auto-registro público:
  las cuentas se aprovisionan por `seedAuth`. Convex Auth ancla `@auth/core` a una versión exacta
  (~0.41.1): no subirla a "latest" (rompe el login).
- **Identidad/roles**: tabla propia `usuarios` (perfil + `rol`) enlazada a la identidad de Convex
  Auth (`users._id`) vía `usuarios.authId`. Se resuelve con `resolverUsuario`/`requireUsuario`
  (`convex/lib/auth.ts`), NO con `ctx.auth.getUserIdentity()` + `tokenIdentifier`. Roles: `duena`
  (ve todo) y `vendedor` (acotado a lo suyo). No hay "admin/member".
- **Autorización = modelo Convex, NO RLS**: cada `query`/`mutation` autoriza DENTRO de sí misma y
  falla CERRADO (nunca `identidad ?? dev`).
- **Derivados NO se persisten**: estado del cliente, valor (Σ ventas ganadas), último contacto y
  total de venta se calculan en queries. **Borrado = archivar** (`archivado`); listas y derivados
  ignoran archivados.

---

## §2 Decision Trees (use these BEFORE writing any code)

### Which function type?

```
Need to read DB only?                    → query / internalQuery
Need to read + write DB?                 → mutation / internalMutation
Need fetch(), Node.js packages, or       → action / internalAction
  non-deterministic behavior?
Need an HTTP endpoint (webhooks, APIs)?  → httpAction (in convex/http.ts)

Called from client?                       → public (query/mutation/action)
Called from server, scheduler, or crons?  → internal (internalQuery/internalMutation/internalAction)
```

### How to handle external API calls from mutations?

```
❌ WRONG: Call action from mutation directly
✅ RIGHT: mutation records intent in DB → ctx.scheduler.runAfter(0, internal.myAction, args)
          → action does external call → action calls internalMutation to save result
          → client observes result via reactive query
```

### Which terminal method for DB queries?

```
Need all results (SMALL table only)?     → .collect()     ⚠️ DANGER on large tables
Need first N results?                    → .take(n)       ✅ Preferred
Need exactly one result?                 → .first()       Returns null if none
Need unique result (throws if >1)?       → .unique()      Returns null if none
Need paginated results?                  → .paginate(opts) Cursor-based
```

### Index vs filter?

```
ALWAYS use .withIndex() for indexed fields (fast, narrows scan)
ONLY use .filter() for fields NOT in any index (slow, post-scan)
Combine: .withIndex(...).filter(...) when you need both
```

---

## §3 The 10 Commandments of Convex (NEVER violate these)

1. **Define `args` AND `returns` validators on ALL functions** — queries, mutations, actions, internal variants. Use `returns: v.null()` for void functions.
2. **Use `.withIndex()` instead of `.filter()`** on indexed fields. `.filter()` scans everything.
3. **Use `internal` functions** for scheduler, crons, and server-to-server calls. Never expose them via `api`.
4. **Use plain helper functions for shared logic** — NOT `ctx.runQuery`/`ctx.runMutation` within queries/mutations (those create separate transactions).
5. **Always `await` all Convex async calls.** No floating promises. Ever.
6. **Never call actions from mutations directly** — schedule them with `ctx.scheduler.runAfter(0, ...)`.
7. **Never use `fetch()` in queries or mutations** — only in actions.
8. **Never put queries/mutations in `"use node"` files** — only actions go there.
9. **Never use unbounded `.collect()`** on large tables — use `.take(n)`, `.first()`, or `.paginate()`.
10. **Handle `undefined` from `useQuery`** (loading state) and `null` from `ctx.db.get()` (not found).

---

## §4 Core Code Patterns (quick reference)

### Schema definition

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    avatarId: v.optional(v.id("_storage")),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  messages: defineTable({
    authorId: v.id("users"),
    channelId: v.id("channels"),
    body: v.string(),
  })
    .index("by_channel", ["channelId"])
    .searchIndex("search_body", {
      searchField: "body",
      filterFields: ["channelId"],
    }),
});
```

### Query

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

### Mutation

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const send = mutation({
  args: { body: v.string(), channelId: v.id("channels") },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");
    return await ctx.db.insert("messages", {
      body: args.body,
      channelId: args.channelId,
      authorId: identity.subject,
    });
  },
});
```

### Action (external APIs)

```typescript
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const summarize = action({
  args: { docId: v.id("documents") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const doc = await ctx.runQuery(internal.documents.getById, { id: args.docId });
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Summarize: ${doc.text}` }] }),
    });
    const data = await response.json();
    await ctx.runMutation(internal.documents.saveSummary, { id: args.docId, summary: data.choices[0].message.content });
    return data.choices[0].message.content;
  },
});
```

### Helper function (shared logic, same transaction)

```typescript
import { QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

export async function getAuthUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError("User not found");
  return user;
}
```

### Client usage (React)

```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function Chat({ channelId }: { channelId: Id<"channels"> }) {
  const messages = useQuery(api.messages.list, { channelId });
  const send = useMutation(api.messages.send);

  if (messages === undefined) return <div>Loading...</div>;  // undefined = loading
  return (
    <>
      {messages.map((m) => <div key={m._id}>{m.body}</div>)}
      <button onClick={() => send({ body: "Hello", channelId })}>Send</button>
    </>
  );
}
```

### Skip query conditionally

```typescript
const data = useQuery(api.tasks.get, condition ? { id } : "skip");
```

---

## §5 Project Structure

```
project-root/
├── convex/                     # Backend
│   ├── _generated/             # Auto-generated (commit to repo)
│   │   ├── api.d.ts            # Typed API object
│   │   ├── dataModel.d.ts      # Doc<T>, Id<T>
│   │   └── server.d.ts         # Typed constructors
│   ├── schema.ts               # Database schema (source of truth)
│   ├── http.ts                 # HTTP router
│   ├── crons.ts                # Cron jobs
│   ├── convex.config.ts        # Component registration
│   ├── auth.config.ts          # Auth provider config (Clerk)
│   ├── auth.ts                 # Convex Auth config (if using built-in)
│   └── [domain].ts             # Function files by domain
├── convex.json                 # Project config
└── .env.local                  # CONVEX_DEPLOYMENT + URL vars
```

### Essential imports cheat sheet

```typescript
// Server functions
import { query, mutation, action, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { httpAction } from "./_generated/server";
import { api, internal, components } from "./_generated/api";
import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Values and schema
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { Infer } from "convex/values";
import { defineSchema, defineTable } from "convex/server";
import { paginationOptsValidator } from "convex/server";
import { httpRouter } from "convex/server";
import { cronJobs } from "convex/server";

// Utilidades de tamaño (v1.31.7+)
import { getConvexSize, getDocumentSize } from "convex/values";

// Client (React)
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useQuery, useMutation, useAction, usePaginatedQuery } from "convex/react";
import { useConvexAuth, useConvex } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

// Next.js SSR
import { preloadQuery, fetchQuery, fetchMutation, fetchAction } from "convex/nextjs";
import { usePreloadedQuery } from "convex/react";

// Clerk integration
import { ConvexProviderWithClerk } from "convex/react-clerk";

// Node.js client
import { ConvexHttpClient } from "convex/browser";
```

---

## §6 Reference Files — read the appropriate one BEFORE writing code

Each reference covers a domain in depth. Read the relevant file(s) for the task at hand:

| Topic | Reference File | When to Read |
|-------|---------------|--------------|
| Schema, validators, indexes, data modeling | `references/schema-and-data.md` | Designing data models, adding tables, configuring indexes, defining validators |
| Queries, mutations, actions, HTTP actions | `references/functions.md` | Writing any Convex function, choosing function type, scheduling, crons |
| Auth (Clerk, Convex Auth), authorization | `references/auth.md` | Setting up authentication, adding authorization checks, configuring providers |
| Frontend (Next.js, Vite, RN/Expo, SSR, hooks) | `references/frontend.md` | Wiring up client apps, SSR/preloading, React hooks, file uploads from UI |
| AI agents, RAG, vector search, embeddings | `references/ai-and-search.md` | Building AI features, full-text search, vector similarity, streaming responses |
| Components, scheduling, testing, deployment | `references/advanced.md` | Installing components, writing tests with convex-test, deploying, debugging |
| CLI commands, env vars, CI/CD, convex.json | `references/cli-and-ops.md` | Running CLI operations, setting up CI/CD, configuring environments |

**When in doubt, read the reference.** These files contain the complete patterns, edge cases, and gotchas that the quick reference above omits.

---

## §7 Version Lock (February 2026)

| Component | Version | Status |
|-----------|---------|--------|
| Convex Runtime | v1.32.0 | Current |
| Convex Auth | v0.0.90 | Beta |
| convex-test | 0.0.41 | Stable |
| Node.js | ≥ 20 | Required (18 dropped since v1.31.5) |
| Explicit table names API | v1.32.0 | Current (legacy `ctx.db.get(id)` deprecated) |

> **Compatibilidad:** La API anterior de `ctx.db` sin tabla (`ctx.db.get(id)`, `ctx.db.patch(id, ...)`) sigue funcionando (deprecated). Para migrar: `npx @convex-dev/codemod@latest explicit-ids`

For the absolute latest API details, consult: `https://docs.convex.dev/llms-full.txt`

---

## §8 Common Gotchas

1. **OCC conflict trap**: Broad table scans in mutations (e.g., `.collect()`) conflict with ANY write to that table, causing optimistic concurrency failures.
   → Always use targeted `.withIndex()` queries; never `.collect()` in mutations on active tables.

2. **Floating promises**: Forgetting `await` on Convex async calls silently drops operations with no error.
   → Always `await` all Convex calls; enable lint rule `no-floating-promises`.

3. **`Date.now()` in queries**: Returns the frozen timestamp from query start, and invalidates reactive cache every execution.
   → Pass timestamps from the client as arguments, or use coarser time-bucket checks.

4. **Returning `undefined`**: Convex translates `undefined` to `null` across the wire. `undefined` is stripped from documents (like `JSON.stringify`).
   → Use `null` explicitly in Convex values; never rely on `undefined` semantics.

5. **Schema push failures**: First `npx convex dev` after schema changes validates ALL existing documents against the new schema.
   → Use `schemaValidation: false` temporarily during data migrations, then re-enable.

6. **Missing `"use node"` directive**: Actions using Node.js-only packages (Stripe, bcrypt, etc.) fail silently or throw at runtime.
   → Add `"use node"` as the first line of the file. Never put queries/mutations in `"use node"` files.

7. **Optimistic update mutation**: Mutating objects in `localStore` directly causes React state inconsistencies.
   → Always create new objects (spread/copy) in optimistic update functions.

8. **`ctx.runQuery`/`ctx.runMutation` in queries**: Creates separate transactions instead of sharing the parent transaction.
   → Use plain helper functions (not `ctx.runQuery`) to share logic within the same transaction.

9. **Unbounded `.collect()` on large tables**: Reads entire table into memory, hitting document/bandwidth limits.
   → Use `.take(n)`, `.first()`, `.unique()`, or `.paginate()` instead.

10. **`useQuery` returning `undefined`**: `undefined` means "still loading", not "no data". `null` from `.first()`/`.unique()` means "not found".
    → Always handle the loading state (`=== undefined`) before rendering data.

### Gotchas específicos de PULSE CRM

11. **OCC al mover oportunidades en paralelo**: dos usuarios cambiando el estado de la MISMA venta
    chocan por OCC (aislamiento serializable). La mutation debe ser CORTA y ACOTADA (`ctx.db.get(id)`
    + validar transición + `patch(id)`); nunca `.collect()`/escaneo de `ventas` dentro de ella
    (amplía el read-set y multiplica conflictos). Hazla idempotente (estado terminal → no-op), como
    `seguimientos.cerrar`.

12. **Búsqueda de contactos por texto parcial**: usar `withSearchIndex` sobre `buscar_nombre`
    (`searchField:"nombre"`), NO `.filter()` con substrings (scan, sin prefix/relevancia). El
    searchIndex actual es solo por nombre (suficiente para el MVP). Si más adelante se acota la
    búsqueda por vendedor/archivado, requeriría `filterFields:["propietario","archivado"]` para
    hacerlo DENTRO del índice y no post-página.

13. **Recordatorios de seguimiento sin duplicar al reprogramar**: HOY la Agenda es PULL (sin
    scheduler ni push). Si más adelante se agenda un recordatorio con `ctx.scheduler.runAt(...)`,
    guardar el `Id<"_scheduledFunctions">` en el propio `seguimiento` y, al reprogramar, hacer
    `ctx.scheduler.cancel(idAnterior)` ANTES de agendar el nuevo (persistiendo el nuevo id en el
    mismo `patch`), para no dejar dos recordatorios vivos.

---

## §9 Decision Workflows

### "I need to set up a new Convex project"

1. Run `npm create convex@latest` or `npx convex init` in existing project
2. Read `references/cli-and-ops.md` → Project initialization, convex.json configuration
3. Define schema in `convex/schema.ts` — read `references/schema-and-data.md`
4. Run `npx convex dev` to start dev server with live push
5. Wire up frontend provider — read `references/frontend.md` for your framework

### "I need to model data with relationships"

1. Read `references/schema-and-data.md` → document-relational patterns, `v.id("tableName")` for foreign keys
2. Design indexes for your access patterns (compound indexes for multi-field queries)
3. Choose 1:1 (embedded or referenced), 1:N (referenced with index), or M:N (junction table)
4. Define validators with `v.object()` for nested data, `v.union()` for polymorphism
5. Add search indexes if full-text or vector search is needed

### "I need real-time updates in the frontend"

1. Read `references/frontend.md` → React hooks (`useQuery`, `usePaginatedQuery`)
2. Every `useQuery` is automatically live — no extra setup needed
3. Handle loading state (`=== undefined`) and empty state (`[]` or `null`)
4. For optimistic updates, pass `optimisticUpdate` option to `useMutation`
5. Use `"skip"` as second arg to conditionally disable subscriptions

### "I need to call an external API"

1. Read `references/functions.md` → Actions section
2. Create an `action` (or `internalAction`) — only function type that allows `fetch()`
3. **Never** call an action from a mutation directly
4. Pattern: mutation saves intent → `ctx.scheduler.runAfter(0, internal.myAction, args)` → action does external call → action calls `internalMutation` to save result
5. For Node.js packages, add `"use node"` at top of file

### "I need to add authentication"

1. Read `references/auth.md` — choose between Clerk integration or Convex Auth (built-in, beta)
2. **Clerk**: Configure `auth.config.ts`, wrap app with `ConvexProviderWithClerk`, use `ctx.auth.getUserIdentity()`
3. **Convex Auth**: Install `@convex-dev/auth`, configure `auth.ts`, supports email/password + OAuth
4. Create helper function `getAuthUser(ctx)` for reuse across functions
5. Use `Authenticated`/`Unauthenticated`/`AuthLoading` components for conditional rendering

### "I need to add full-text or vector search"

1. Read `references/ai-and-search.md` → Full-text search or Vector search sections
2. **Full-text**: Add `searchIndex` to schema, use `ctx.db.query("table").withSearchIndex(...)` in queries
3. **Vector**: Add `vectorIndex` to schema, use `ctx.db.query("table").withVectorIndex(...)`, provide embeddings
4. For RAG: use the `@convex-dev/rag` component for automatic chunking + embedding pipeline
5. For AI agents: use `@convex-dev/agent` component with tool-calling patterns

### "I need to debug a production issue"

1. Read `references/advanced.md` → Debugging and common pitfalls section
2. Check Convex Dashboard → Logs tab for function errors, slow queries, OCC retries
3. Use `npx convex logs --follow` for real-time log streaming
4. Check for OCC conflicts (retry count in logs), unbounded `.collect()`, missing indexes
5. Use `npx convex data` to inspect documents, `npx convex env` to verify environment variables

---

## §10 Helper Script

**File**: `scripts/convex_helper.ts`

Reusable TypeScript utilities for common Convex patterns:

- `paginatedQuery()` — Wrapper for cursor-based pagination with type safety
- `withRetry()` — Retry with exponential backoff for external API calls in actions
- `batchMutation()` — Group mutations into chunks respecting Convex's 8KB argument limit
- `validateEnv()` — Verify required environment variables at startup
- `seedTestData()` — Generate typed test data for convex-test

```typescript
import { paginatedQuery, withRetry, batchMutation, validateEnv } from "./scripts/convex_helper";
```

---

## Patrones PULSE CRM

Patrones del proyecto; complementan §1–§10. Ante conflicto mandan `CLAUDE.md` y el diseño
(`design/PROY CRM Pulse/*.dc.html`). El alcance es un MVP académico: los ejemplos con
scheduler/notificaciones se marcan como FUTURO.

### a) Multiusuario — acotar por el usuario de la sesión

`duena` ve todo; `vendedor` solo lo suyo. El scope se aplica DENTRO del índice (antes de
`.take()`/`.paginate()`), nunca con `.filter()` post-scan ni confiando en el cliente.

```typescript
export const listar = query({
  args: {},
  handler: async (ctx) => {
    const usuario = await requireUsuario(ctx); // falla cerrado si no hay sesión
    if (usuario.rol === "duena") {
      return await ctx.db.query("clientes")
        .withIndex("por_archivado", (q) => q.eq("archivado", false)).take(100);
    }
    return await ctx.db.query("clientes")
      .withIndex("por_propietario", (q) => q.eq("propietario", usuario._id))
      .filter((q) => q.eq(q.field("archivado"), false)) // scope por propietario dentro del índice
      .take(100);
  },
});
```

Scope por entidad: `clientes.propietario`, `ventas.vendedor`, `seguimientos.responsable`. La
decisión de acceso vive en la función y usa `requireUsuario` (no `ctx.auth.getUserIdentity()` directo).

### b) Actividades (interacciones) — registro (+ notificación externa FUTURO)

Registrar una interacción es una `mutation` de solo-DB. HOY no hay side-effects externos. Si algún
día se avisa por email/WhatsApp, NUNCA llamar la action desde la mutation: la mutation guarda el
hecho y AGENDA la action (`ctx.scheduler.runAfter`); la action hace el `fetch()` y guarda el
resultado con un `internalMutation`.

```typescript
export const registrar = mutation({
  args: { cliente_id: v.id("clientes") /* , tipo, canal, nota, fecha */ },
  returns: v.id("interacciones"),
  handler: async (ctx, args) => {
    const usuario = await requireUsuario(ctx);
    if (!(await ctx.db.get(args.cliente_id))) throw new ConvexError("Cliente no encontrado");
    const id = await ctx.db.insert("interacciones", { ...args, registrado_por: usuario._id });
    // FUTURO: await ctx.scheduler.runAfter(0, internal.notificaciones.avisar, { id });
    return id;
  },
});
```

### c) Pipeline — estado del cliente DERIVADO + transiciones de la venta

PULSE **no** guarda un pipeline "lead/contactado/propuesta/cerrado". El estado del CLIENTE es
DERIVADO de sus ventas no archivadas (`convex/lib/derivados.ts`): `nuevo_lead → en_negociacion →
ganado/perdido` (precedencia ganada > abierta > perdida > sin ventas). No se persiste ni se "mueve".

Lo que SÍ tiene estado almacenado y transiciones es la **venta** (`abierta → ganada|perdida`); ahí
va la validación (OCC cubre la concurrencia):

```typescript
const TRANSICIONES: Record<string, readonly string[]> = {
  abierta: ["ganada", "perdida"], ganada: [], perdida: [], // ganada/perdida = terminales
};
export const cambiarEstadoVenta = mutation({
  args: { id: v.id("ventas"), nuevo: v.union(v.literal("ganada"), v.literal("perdida")) },
  returns: v.null(),
  handler: async (ctx, { id, nuevo }) => {
    const usuario = await requireUsuario(ctx);
    const venta = await ctx.db.get(id);
    if (!venta) throw new ConvexError("Venta no encontrada");
    if (usuario.rol !== "duena" && venta.vendedor !== usuario._id)
      throw new ConvexError("No autorizado");
    if (!TRANSICIONES[venta.estado].includes(nuevo))
      throw new ConvexError(`Transición inválida: ${venta.estado} → ${nuevo}`);
    await ctx.db.patch(id, { estado: nuevo });
    return null;
  },
});
```

### d) Índices por entidad (los que existen) y qué resuelven

Para el alcance actual los índices del schema bastan. Referencia de qué cubre cada uno:

| Entidad | Índices existentes | Resuelve |
|---|---|---|
| `clientes` | `por_propietario`, `por_prioridad`, `por_archivado`, `searchIndex buscar_nombre` | scope por vendedor, filtro por prioridad, listas no-archivadas, búsqueda por nombre |
| `interacciones` | `por_cliente` | historial de actividades por contacto |
| `seguimientos` | `por_cliente`, `por_estado_fecha`, `por_responsable_estado_fecha` | Agenda (vencidos/hoy/próximas) con scope de vendedor dentro del índice |
| `ventas` | `por_cliente`, `por_estado`, `por_archivado`, `por_cliente_archivado_estado` | ventas por cliente/estado; estado y valor derivados del cliente |
| `usuarios` | `por_email`, `por_authId` | login/resolución de identidad (`.unique()`, falla cerrado) |

> **Fuera del MVP (nota opcional):** si el alcance crece, la revisión de schema identificó mejoras
> (p. ej. `filterFields:["propietario","archivado"]` en `buscar_nombre` para acotar la búsqueda por
> vendedor; `por_vendedor` en `ventas`; `["cliente_id","fecha"]` en `interacciones` si el "último
> contacto" ordena por `fecha` y no por creación). No se aplican hoy.

---

## Cross-Skill Integration

### supabase-skill
Convex and Supabase are alternative backends — choose one per project. Convex excels at zero-config reactivity (every `useQuery` is live) and TypeScript-native functions. Supabase excels at full SQL, self-hosting, and the PostgreSQL ecosystem. If migrating from Supabase to Convex, replace RLS policies with function-level auth checks, Realtime channels with reactive queries, and Edge Functions with Convex actions.

### stripe-skill
Stripe API calls MUST run in Convex **actions** (not queries/mutations) because they require `fetch()`. Store Stripe customer IDs and subscription status in Convex tables. Sync Stripe state back via webhook HTTP actions. Pattern: mutation saves intent → `ctx.scheduler.runAfter(0, internal.stripe.createCheckout, args)` → action calls Stripe → action calls `internalMutation` to save result.

### nextjs-web
Use `ConvexProvider` in the root layout. For SSR, use `preloadQuery` / `fetchQuery` from `convex/nextjs` in Server Components, then `usePreloadedQuery` on the client. Wrap the app with `ConvexProviderWithClerk` if using Clerk auth. Convex handles all data fetching — no need for Next.js `"use cache"` on Convex queries (reactivity handles freshness).

```tsx
// app/layout.tsx
import { ConvexProviderWithClerk } from "convex/react-clerk";
// app/[locale]/(app)/feed/page.tsx — Server Component
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export default async function FeedPage() {
  const preloaded = await preloadQuery(api.feed.list, { limit: 20 });
  return <FeedClient preloaded={preloaded} />;
}
```

### elastic-email / ses-manager
Email sending from Convex follows the same pattern for any email provider: create an **action** (with `"use node"` if using the provider's Node.js SDK) that calls the email API. Schedule it from mutations with `ctx.scheduler.runAfter(0, internal.email.send, args)`. Store delivery status in a Convex table and update it via webhook HTTP actions for bounce/complaint tracking.

---

This skill reflects Convex as of February 2026, including v1.32.0 API with explicit table names, the component ecosystem, AI agent integrations, EU hosting, open-source backend, and all current best practices.
