---
name: nextjs-web
description: Use this skill for any Next.js (App Router) web application work — creating pages, routes, layouts, components, API routes, server actions, caching strategies, i18n, testing, or performance optimization. Trigger whenever the user mentions Next.js, App Router, web app, web frontend, React server components, shadcn/ui, Tailwind setup, ISR, proxy.ts, "use cache", or any web-related task. Also trigger for web-specific tasks like SEO, Core Web Vitals, Lighthouse, Playwright E2E, or Vitest unit tests in a Next.js context.
---

# nextjs-web — Next.js App Router

Production-grade Next.js 16 web apps with the App Router. Everything here is self-contained and works in any standalone Next.js project.

---

⚠️ PULSE CRM corre en Next.js 15.1 — Lee las notas de compatibilidad antes de generar código:

- proxy.ts NO existe en 15.1 → usa middleware.ts
- "use cache" requiere experimental.dynamicIO: true
- cacheComponents: true NO existe en 15.1

Ver notas detalladas en cada sección.

---

## Table of Contents

1. [Stack & Versions](#1-stack--versions)
2. [Architecture Decision: App Router + Cache Components](#2-architecture-decision)
3. [Route Structure](#3-route-structure)
4. [Server vs Client Components](#4-server-vs-client-components)
5. [Feature Module Pattern](#5-feature-module-pattern)
6. [Workflow: Create a Feature End-to-End](#6-workflow)
7. [Antipatterns](#7-antipatterns)
8. [Reference Files](#8-reference-files)

---

## Quick Start

```bash
npx create-next-app@latest my-app --typescript --tailwind --eslint --app --src-dir
cd my-app && npm run dev
```

Server Component fetching data from a database:

```tsx
// app/page.tsx (Server Component)
import { db } from '@/lib/db';

export default async function HomePage() {
  const posts = await db.post.findMany({ take: 10 });
  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Blog</h1>
      {posts.map(post => (
        <article key={post.id} className="mb-4 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold">{post.title}</h2>
          <p className="text-gray-600 mt-2">{post.excerpt}</p>
        </article>
      ))}
    </main>
  );
}
```

---

## 1. Stack & Versions

These versions are **verified as of February 23, 2026**.

| Technology | Version | Role |
|---|---|---|
| Next.js | **16.1.6** | Framework (App Router) |
| React | **19.2.4** (bundled via Next.js) | UI library |
| TypeScript | **5.9.3** | Type safety |
| Tailwind CSS | **4.2.0** | Styling (CSS-first `@theme`) |
| shadcn/ui CLI | **3.8.5** | Component library (copy-paste) |
| next-intl | **4.8.3** | Internationalization |
| Vitest | **4.0.18** | Unit/component testing |
| Playwright | **1.58.2** | E2E testing |
| React Testing Library | **16.3.2** | Component testing |
| next-safe-action | **8.0.12** | Type-safe server actions |
| React Compiler | **1.0** | Auto-memoization (opt-in) |

### Node.js requirement

Next.js 16 requires **Node.js 20.9+** (Node 18 dropped). Set in your project's `package.json`:

```json
{ "engines": { "node": ">=20.9.0" } }
```

### Key config: `next.config.ts`

```ts
// ⚠️ PULSE CRM (Next.js 15.1): Este next.config.ts
// es para Next.js 16. Para 15.1 usa esta versión:
//
// const nextConfig: NextConfig = {
//   experimental: {
//     dynamicIO: true,  // habilita "use cache"
//   },
//   // reactCompiler: false por defecto en 15.1
//   // NO uses cacheComponents ni cacheHandlers
//   // NO uses cacheLife como key de primer nivel
//   images: {
//     remotePatterns: [
//       { protocol: 'https', hostname: '**.convex.cloud' }
//     ],
//   },
// }
//
// Aplica el next.config.ts de Next.js 16 solo cuando
// el proyecto migre a esa versión.
```

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Cache Components model — replaces old revalidate/dynamicIO/PPR
  cacheComponents: true,

  // React Compiler — auto-memoización de componentes.
  // ⚠️ Activar solo si experimentas problemas de
  // rendimiento de renderizado. Para proyectos nuevos
  // como PULSE CRM, mantener en false hasta necesitarlo.
  reactCompiler: false,

  // Custom cache life profiles
  cacheLife: {
    content: { stale: 3600, revalidate: 900, expire: 86400 },
    realtime: { stale: 5, revalidate: 5, expire: 30 },
  },

  // Self-hosted ISR: custom cache handlers (skip if deploying to Vercel)
  cacheHandlers: {
    // ⚠️ PULSE CRM + Railway: omite este bloque completo.
    // Requiere Redis configurado y los archivos
    // cache-handlers/memory.js y cache-handlers/redis.js
    // en el proyecto. Solo aplica en deployments con
    // Redis externo (Upstash, Railway Redis addon, etc.)
    default: require.resolve('./cache-handlers/memory.js'),
    remote: require.resolve('./cache-handlers/redis.js'),
  },

  // Turbopack is the default bundler — no flag needed
  // Use --webpack flag only if a critical plugin is incompatible

  images: {
    qualities: [75, 90],
    remotePatterns: [{ protocol: 'https', hostname: '**.example.com' }],
  },
}

export default nextConfig
```

---

## 2. Architecture Decision: App Router + Cache Components

### Why App Router with `"use cache"` over Pages Router

Next.js 16 replaces all implicit caching with the explicit `"use cache"` directive. This gives fine-grained, composable control over what is cached, for how long, and how it's invalidated. The old `revalidate` segment config, `unstable_cache`, `experimental.dynamicIO`, and `experimental.ppr` are all removed.

The mental model is simple: **everything is dynamic by default** → you opt specific functions/components into caching with `"use cache"`. This is more predictable than the old system where `fetch()` was cached by default.

### Why `proxy.ts` over `middleware.ts`

`middleware.ts` is deprecated in Next.js 16 (still functional, but will be removed). `proxy.ts` is the stable replacement. Key difference: `proxy.ts` runs on Node.js runtime (not Edge), giving access to the full Node.js API. Migration is a file rename + function rename. See `references/app-router.md` § 5 for the full pattern.

⚠️ PULSE CRM (Next.js 15.1): proxy.ts NO existe en esta versión. Usar middleware.ts es la forma correcta y estable. Si Claude Code crea proxy.ts en este proyecto, el archivo será ignorado y la autenticación y redirecciones no funcionarán.
Usa proxy.ts solo cuando el proyecto migre a Next.js 16+.

### Why shadcn/ui over custom component library

shadcn/ui is not a dependency — it's copy-paste source code. This means: zero version lock-in, full customization, Server Component compatibility for presentational components, and Tailwind v4 OKLCH theming built-in. Five visual styles (Vega, Nova, Maia, Lyra, Mira) cover most design aesthetics. Since Dec 2025, it supports both Radix UI and Base UI primitives.

### Why next-intl over Paraglide

Both are excellent. next-intl wins for production App Router projects because it provides built-in routing strategies (prefix, domain, localized pathnames), date/number/list formatting, and dynamic key support — all with ~2KB client bundle. Paraglide is better only when bundle size is the absolute top priority and you don't need built-in formatting. See `references/i18n.md` for full comparison.

---

## 3. Route Structure

Recommended internal structure for a Next.js App Router project:

```
your-app/
├── next.config.ts
├── proxy.ts                          # Auth, locale redirect, feature flags
├── postcss.config.mjs                # @tailwindcss/postcss
├── app/
│   ├── globals.css                   # @import "tailwindcss" + @theme
│   ├── layout.tsx                    # Root layout: fonts, providers, i18n
│   ├── page.tsx                      # Landing / home
│   ├── not-found.tsx                 # Global 404
│   ├── error.tsx                     # Global error boundary
│   ├── loading.tsx                   # Global loading (wraps in Suspense)
│   ├── sitemap.ts                    # Dynamic sitemap generation
│   ├── robots.ts                     # Robots.txt generation
│   ├── [locale]/                     # i18n route group (next-intl)
│   │   ├── layout.tsx                # Locale layout (NextIntlClientProvider)
│   │   ├── page.tsx                  # Localized home
│   │   ├── (marketing)/              # Route group — shared marketing layout
│   │   │   ├── layout.tsx
│   │   │   ├── about/page.tsx
│   │   │   └── pricing/page.tsx
│   │   ├── (app)/                    # Route group — app layout (sidebar, nav)
│   │   │   ├── layout.tsx
│   │   │   ├── feed/
│   │   │   │   ├── page.tsx          # Feed list with filters
│   │   │   │   ├── loading.tsx       # Feed skeleton
│   │   │   │   └── [itemId]/
│   │   │   │       ├── page.tsx      # Item detail
│   │   │   │       └── not-found.tsx # Item-specific 404
│   │   │   ├── search/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── (auth)/                   # Route group — minimal auth layout
│   │       ├── layout.tsx
│   │       ├── login/page.tsx
│   │       └── register/page.tsx
│   └── api/                          # API routes (outside locale group)
│       └── webhooks/
│           └── route.ts
├── components/
│   ├── ui/                           # shadcn/ui components (generated)
│   ├── layout/                       # App shell: Sidebar, Header, Footer
│   └── shared/                       # Reusable composed components
├── lib/
│   ├── actions/                      # Server actions (next-safe-action)
│   ├── queries/                      # Cached data-fetching functions
│   ├── utils.ts                      # cn() helper, misc utilities
│   └── safe-action.ts                # next-safe-action client config
├── messages/                         # i18n JSON files (en.json, es.json, etc.)
├── cache-handlers/                   # Custom ISR cache handlers (self-hosted)
├── public/                           # Static assets
└── tests/
    ├── unit/                         # Vitest unit tests
    ├── e2e/                          # Playwright E2E tests
    └── visual/                       # Visual regression (Playwright screenshots)
```

### Route conventions (Next.js 16)

| File | Purpose |
|---|---|
| `page.tsx` | UI unique to a route (makes route publicly accessible) |
| `layout.tsx` | Shared UI that wraps children (persists across navigations) |
| `loading.tsx` | Auto-wrapped in `<Suspense>` around `page.tsx` |
| `error.tsx` | Error boundary (`'use client'` required) |
| `not-found.tsx` | 404 UI (call `notFound()` to trigger) |
| `default.tsx` | Fallback for parallel routes (**required** in Next.js 16) |
| `proxy.ts` | Network boundary handler (replaces middleware) |

---

## 4. Server vs Client Components

### Decision framework

| Use Server Component when… | Use Client Component when… |
|---|---|
| Fetching data | Using `useState`, `useEffect`, `useRef` |
| Accessing backend resources directly | Handling browser events (onClick, onChange) |
| Rendering static or cached content | Using browser APIs (localStorage, geolocation) |
| Reducing client JS bundle | Using context providers |
| SEO-critical content | Animations that require JS |

### The `"use cache"` + `<Suspense>` pattern

This is the core architecture pattern for Next.js 16. Cache the static shell, stream the dynamic parts:

```tsx
// app/[locale]/(app)/feed/page.tsx — Server Component (default)
import { Suspense } from 'react'
import { FeedList } from './feed-list'        // Server: cached
import { TrendingSidebar } from './trending'   // Server: dynamic, streamed

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <FeedList category={category} />
      <Suspense fallback={<TrendingSkeleton />}>
        <TrendingSidebar />
      </Suspense>
    </div>
  )
}
```

```tsx
// app/[locale]/(app)/feed/feed-list.tsx — Cached Server Component
import { cacheLife, cacheTag } from 'next/cache'
import { getItems } from '@/lib/queries/items'

export async function FeedList({ category }: { category?: string }) {
  'use cache'
  cacheLife('content')                      // Custom profile from next.config
  cacheTag('feed', `feed-${category ?? 'all'}`)

  const items = await getItems({ category })
  return <div>{/* render items */}</div>
}
```

### The `'use client'` boundary rule

Place `'use client'` as **low in the tree as possible**. Never put it in `layout.tsx` or `page.tsx` — instead, extract interactive bits into leaf components:

```tsx
// ✅ Correct: page.tsx is a Server Component, FavoriteButton is client
// app/[locale]/(app)/feed/[itemId]/page.tsx
import { getItem } from '@/lib/queries/items'
import { FavoriteButton } from '@/components/shared/favorite-button'

export default async function ItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params
  const item = await getItem(itemId)
  return (
    <article>
      <h1>{item.title}</h1>
      <p>{item.description}</p>
      <FavoriteButton itemId={itemId} isFavorite={item.isFavorite} />
    </article>
  )
}
```

---

## 5. Feature Module Pattern

Each feature follows a consistent structure. The pattern applies regardless of the feature domain:

```
feed/
├── page.tsx              # Route entry — Server Component, composes sub-components
├── loading.tsx           # Skeleton UI
├── error.tsx             # Error boundary ('use client')
├── not-found.tsx         # 404 for this route
├── feed-list.tsx         # Cached data-fetching Server Component
├── feed-filters.tsx      # Client Component — interactive filters
├── feed-card.tsx         # Server Component — presentational card
└── [itemId]/
    ├── page.tsx          # Item detail
    └── not-found.tsx     # Item not found
```

Shared data-fetching and actions live in `lib/`:

```
lib/
├── queries/
│   └── items.ts          # Cached queries with 'use cache'
├── actions/
│   └── items.ts          # Server actions with next-safe-action
└── types/
    └── items.ts          # Shared TypeScript types
```

---

## 6. Workflow: Create a Feature End-to-End

When creating a new feature (e.g., Search), follow this sequence:

### Step 1 — Types

Define the feature's types in `lib/types/search.ts`.

### Step 2 — Queries

Create cached data-fetching functions in `lib/queries/search.ts`:

```ts
import { cacheLife, cacheTag } from 'next/cache'

export async function searchItems(query: string, filters: SearchFilters) {
  'use cache'
  cacheLife('seconds')
  cacheTag('search', `search-${query}`)

  const results = await fetch(`${process.env.API_URL}/search?q=${query}`, { /* ... */ })
  return results.json() as Promise<SearchResult[]>
}
```

### Step 3 — Actions

Create server actions in `lib/actions/search.ts` using next-safe-action:

```ts
'use server'
import { actionClient } from '@/lib/safe-action'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'

export const saveSearch = actionClient
  .inputSchema(z.object({ query: z.string().min(1), userId: z.string() }))
  .action(async ({ parsedInput }) => {
    await db.savedSearches.create({ data: parsedInput })
    revalidateTag('saved-searches')
    return { success: true }
  })
```

### Step 4 — Route files

Create `app/[locale]/(app)/search/page.tsx`, `loading.tsx`, `error.tsx`. The page composes Server Components (cached query results) with Client Components (search input, filters).

### Step 5 — Components

Build feature-specific components in the route directory. Extract reusable components to `components/shared/`. Use shadcn/ui primitives for UI elements — see `references/components.md`.

### Step 6 — i18n

Add translation keys to `messages/en.json` (and other locales). Use `getTranslations()` in Server Components, `useTranslations()` in Client Components. See `references/i18n.md`.

### Step 7 — Tests

Write Vitest unit tests for queries and actions. Write Playwright E2E tests for the full user flow. See `references/testing.md`.

---

## 7. Antipatterns

### ❌ AP-1: Putting `'use client'` too high in the tree

**Problem**: Wrapping a page or layout in `'use client'` converts ALL children to Client Components, bloating the JS bundle and losing Server Component benefits.

**Fix**: Extract only the interactive parts into small Client Components. The page itself stays as a Server Component.

### ❌ AP-2: Using the old caching model

**Problem**: Using `export const revalidate = 60`, `unstable_cache`, or relying on implicit `fetch()` caching. These are removed in Next.js 16.

**Fix**: Use `'use cache'` + `cacheLife()` + `cacheTag()`. All caching is explicit and opt-in.

### ❌ AP-3: Calling `cookies()` or `headers()` inside `'use cache'` scope

**Problem**: Dynamic request APIs cannot be used inside cached functions. This throws a build error.

**Fix**: Pass the needed values as arguments to the cached function, or use the experimental `'use cache: private'` variant.

### ❌ AP-4: Forgetting `await` on `params`, `searchParams`, `cookies()`, `headers()`

**Problem**: In Next.js 16, these are all `Promise`-based. Accessing them synchronously silently breaks.

**Fix**: Always `await params`, `await searchParams`, `await cookies()`, `await headers()`.

### ❌ AP-5: Missing `default.tsx` in parallel routes

**Problem**: Next.js 16 requires explicit `default.tsx` for all parallel route slots. Build fails without them.

**Fix**: Add `default.tsx` to every `@slot/` directory returning the appropriate fallback.

### ❌ AP-6: Using `tailwind.config.js` instead of CSS-first `@theme`

**Problem**: Tailwind v4 uses CSS-based configuration. The old JS config still works but misses performance gains and is a legacy path.

**Fix**: Define tokens in `globals.css` with `@theme { }`. See `references/components.md` § 1.

### ❌ AP-7: Importing server-only code in Client Components

**Problem**: Importing a module that uses `'use cache'`, database clients, or `'server-only'` in a `'use client'` file causes build errors or leaks server secrets.

**Fix**: Use the `server-only` package as a guard. Pass data as props from Server Components to Client Components — never import server modules directly.

### ❌ AP-8: Not using `<Suspense>` around dynamic content in cached pages

**Problem**: Without `<Suspense>`, the entire page becomes dynamic when any part is dynamic, negating the cache.

**Fix**: Wrap dynamic sections in `<Suspense>` boundaries. The cached shell renders instantly; dynamic content streams in.

---

## Design tokens (optional)

If you use a design-token pipeline (e.g. Style Dictionary) that emits CSS custom properties, import the generated `variables.css` in `globals.css` and bridge to Tailwind v4 via `@theme { --color-primary: var(--ds-color-primary); }`. This lets shadcn/ui components consume design tokens through Tailwind utilities, and supports dynamic theming with `[data-theme="dark"]` selectors.

```css
/* app/globals.css */
@import "tailwindcss";
@import "./tokens/variables.css";  /* your generated tokens */

@theme {
  --color-primary: var(--ds-color-primary);
  --color-surface: var(--ds-color-bg-surface);
  --color-on-surface: var(--ds-color-text-primary);
}
```

### stripe-skill
Use Server Actions for creating Checkout Sessions and PaymentIntents. Stripe webhook handler goes in `app/api/webhooks/stripe/route.ts` with `req.text()` for raw body access. Pricing pages can use Server Components with cached `stripe.prices.list()` via `"use cache"`. Do NOT use Edge Runtime — Stripe SDK requires Node.js.

### supabase-skill
Use `@supabase/ssr` for cookie-based auth. Create `createBrowserClient()` for client components and `createServerClient()` for server components/actions. Auth session refresh goes in `proxy.ts` (Next.js 16). Server Components can query Supabase directly — no API routes needed for simple reads. Use RLS policies for security, not server-side middleware checks.

### convex-skill
Wrap the app in `ConvexProvider` (root layout). Use `preloadQuery` / `fetchQuery` from `convex/nextjs` in Server Components, then `usePreloadedQuery` on the client for hydrated real-time data. Convex reactivity eliminates the need for `"use cache"` on Convex-sourced data — queries auto-update when data changes. Use `ConvexProviderWithClerk` if using Clerk auth.

---

## 8. Reference Files

Read these files for detailed patterns. Each file has its own table of contents.

| File | Read when you need... |
|---|---|
| `references/app-router.md` | Routes, layouts, `"use cache"`, `proxy.ts`, streaming, `generateStaticParams`, Metadata API, Server Actions patterns |
| `references/components.md` | Tailwind v4 `@theme` setup, shadcn/ui integration, component patterns, responsive design, dark mode |
| `references/i18n.md` | next-intl setup, routing strategies, Server/Client usage, formatting, SEO, Paraglide comparison |
| `references/performance.md` | ISR strategies, Core Web Vitals, `next/image`, `next/font`, bundle analysis, React Compiler, self-hosted caching |
| `references/testing.md` | Vitest setup, RTL patterns, Playwright E2E, visual regression, Server Component testing limitations, CI integration |
