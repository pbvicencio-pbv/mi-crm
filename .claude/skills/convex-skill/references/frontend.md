# Frontend Integrations Reference

## Table of Contents

1. [Next.js App Router](#1-nextjs-app-router)
2. [React SPA / Vite](#2-react-spa--vite)
3. [React Native / Expo](#3-react-native--expo)
4. [Other frameworks](#4-other-frameworks)
5. [Plain Node.js / Python clients](#5-plain-nodejs--python-clients)
6. [React hooks reference](#6-react-hooks-reference)
7. [Pagination](#7-pagination)
8. [File storage](#8-file-storage)

---

## 1. Next.js App Router

### Client provider

```tsx
// app/ConvexClientProvider.tsx
"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

// app/layout.tsx
import ConvexClientProvider from "./ConvexClientProvider";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html><body>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </body></html>
  );
}
```

### SSR + reactivity (Server → Client handoff)

```tsx
// Server Component
import { preloadQuery } from "convex/nextjs";
import { api } from "../convex/_generated/api";

export default async function TasksPage() {
  const preloaded = await preloadQuery(api.tasks.list, { list: "default" });
  return <TasksList preloadedTasks={preloaded} />;
}

// Client Component
"use client";
import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "../convex/_generated/api";

export function TasksList({ preloadedTasks }: { preloadedTasks: Preloaded<typeof api.tasks.list> }) {
  const tasks = usePreloadedQuery(preloadedTasks);
  // SSR data on first render → becomes reactive WebSocket subscription
  return tasks.map((t) => <div key={t._id}>{t.text}</div>);
}
```

### Server-only fetching (no reactivity)

```typescript
import { fetchQuery, fetchMutation, fetchAction } from "convex/nextjs";
import { api } from "../convex/_generated/api";

// In Server Components, Server Actions, Route Handlers, middleware
const tasks = await fetchQuery(api.tasks.list, { list: "default" });
await fetchMutation(api.tasks.create, { text: "New task" });
```

### Environment variable

```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

---

## 2. React SPA / Vite

```tsx
// src/main.tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ConvexProvider client={convex}>
    <App />
  </ConvexProvider>,
);
```

```env
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

---

## 3. React Native / Expo

```tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,  // Required for mobile (no window.onbeforeunload)
});

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <Stack />
    </ConvexProvider>
  );
}
```

Same `useQuery`, `useMutation`, `useAction` hooks work identically on mobile.

```env
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

---

## 4. Other frameworks

### Remix
```tsx
// app/root.tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
const convex = new ConvexReactClient(window.ENV.CONVEX_URL);
// Wrap outlet with <ConvexProvider client={convex}>
```

### Svelte / SvelteKit
```bash
npm install convex-svelte
```
```svelte
<script>
  import { setupConvex, useQuery } from "convex-svelte";
  import { api } from "../convex/_generated/api";
  setupConvex(import.meta.env.VITE_CONVEX_URL);
  const tasks = useQuery(api.tasks.list, {});
</script>
{#if $tasks.isLoading}Loading...{:else}{#each $tasks.data as task}{task.text}{/each}{/if}
```

### Vue / Nuxt
Community packages: `convex-vue` / `convex-nuxt`.

---

## 5. Plain Node.js / Python clients

### Node.js — stateless (HTTP)

```typescript
import { ConvexHttpClient } from "convex/browser";
const client = new ConvexHttpClient(process.env.CONVEX_URL!);

const tasks = await client.query(api.tasks.list, { list: "default" });
await client.mutation(api.tasks.create, { text: "From server" });
```

### Node.js — with WebSocket subscriptions

```typescript
import { ConvexClient } from "convex/browser";
const client = new ConvexClient(process.env.CONVEX_URL!);

client.onUpdate(api.tasks.list, { list: "default" }, (tasks) => {
  console.log("Tasks updated:", tasks);
});
```

### Python

```bash
pip install convex
```
```python
from convex import ConvexClient
client = ConvexClient("https://your-deployment.convex.cloud")
tasks = client.query("tasks:list", {"list": "default"})
```

---

## 6. React hooks reference

| Hook | Purpose | Returns |
|------|---------|---------|
| `useQuery(ref, args)` | Reactive subscription | `undefined` while loading, then result |
| `useMutation(ref)` | Returns async callable | Mutations queue in order per client |
| `useAction(ref)` | Returns async callable | Actions run in parallel |
| `usePaginatedQuery(ref, args, opts)` | Paginated reactive query | `{ results, status, loadMore, isLoading }` |
| `useConvexAuth()` | Auth state | `{ isLoading, isAuthenticated }` |
| `useConvex()` | Client instance | `ConvexReactClient` |
| `usePreloadedQuery(preloaded)` | SSR-preloaded data → reactive | Same as useQuery |

### Skip a query conditionally

```typescript
const data = useQuery(api.tasks.get, userId ? { userId } : "skip");
// Returns undefined when skipped (same as loading state)
```

---

## 7. Pagination

### Server side

```typescript
import { paginationOptsValidator } from "convex/server";

export const listMessages = query({
  args: { channelId: v.id("channels"), paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(v.object({ /* message fields */ })),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .paginate(args.paginationOpts);
      // v1.32.0+: opciones avanzadas de paginación disponibles:
      // .paginate({ ...args.paginationOpts, maximumRowsRead: 1000, maximumBytesRead: 1048576 })
  },
});
```

> **v1.32.0+**: `.paginate()` acepta `maximumRowsRead` (default: 32000) y `maximumBytesRead` para controlar límites de lectura. Útil para evitar timeouts con documentos grandes.

### Client side

```tsx
import { usePaginatedQuery } from "convex/react";

function MessageList({ channelId }: { channelId: Id<"channels"> }) {
  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.messages.listMessages,
    { channelId },
    { initialNumItems: 25 },
  );
  // status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted"

  return (
    <>
      {results.map((m) => <Message key={m._id} message={m} />)}
      {status === "CanLoadMore" && (
        <button onClick={() => loadMore(25)}>Load more</button>
      )}
    </>
  );
}
```

Pages are **fully reactive** — they update as items are added/removed.

---

## 8. File storage

### Upload flow (3 steps)

**Step 1 — Server: generate upload URL**
```typescript
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});
```

**Step 2 — Client: POST file to URL**
```typescript
const uploadUrl = await generateUploadUrl();
const result = await fetch(uploadUrl, {
  method: "POST",
  headers: { "Content-Type": file.type },
  body: file,
});
const { storageId } = await result.json();
```

**Step 3 — Server: save storage ID**
```typescript
export const saveFile = mutation({
  args: { storageId: v.id("_storage"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("files", { storageId: args.storageId, name: args.name });
  },
});
```

Upload URLs expire in **1 hour**. HTTP action uploads limited to **20MB**.

### Serving files

```typescript
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => await ctx.storage.getUrl(args.storageId),
});
```

### File metadata and deletion

```typescript
const metadata = await ctx.db.system.get(storageId);
// { _id, _creationTime, contentType, sha256, size }

await ctx.storage.delete(storageId);
```
