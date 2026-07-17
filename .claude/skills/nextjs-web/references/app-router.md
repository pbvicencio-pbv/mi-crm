# App Router Patterns — Next.js 16.1


## Table of Contents

1. [Route Fundamentals](#1-route-fundamentals)
2. [Layouts and Templates](#2-layouts-and-templates)
3. [The `"use cache"` Model](#3-the-use-cache-model)
4. [On-Demand Invalidation](#4-on-demand-invalidation)
5. [`proxy.ts` — Replacing Middleware](#5-proxyts)
6. [Streaming and Suspense](#6-streaming-and-suspense)
7. [Static Generation with `generateStaticParams`](#7-generatestaticparams)
8. [Metadata API](#8-metadata-api)
9. [Server Actions](#9-server-actions)
10. [Route Handlers](#10-route-handlers)
11. [Parallel and Intercepting Routes](#11-parallel-and-intercepting-routes)

---

## 1. Route Fundamentals

### File conventions in Next.js 16

| File | Purpose | Notes |
|---|---|---|
| `page.tsx` | Route UI | Makes the route publicly accessible |
| `layout.tsx` | Persistent wrapper | Does NOT re-render on navigation |
| `template.tsx` | Re-rendering wrapper | Creates new instance on every navigation |
| `loading.tsx` | Suspense fallback | Auto-wraps page in `<Suspense>` |
| `error.tsx` | Error boundary | Must be `'use client'` |
| `not-found.tsx` | 404 UI | Triggered by `notFound()` |
| `default.tsx` | Parallel route fallback | **Required** for all parallel slots in v16 |
| `route.ts` | API route handler | Cannot coexist with `page.tsx` |
| `proxy.ts` | Network boundary | Root only, replaces middleware |

### Route groups

Organize routes without affecting the URL. Use `(groupName)` directories:

```
app/[locale]/
├── (marketing)/          # URL: /about, /pricing (no /marketing/ prefix)
│   ├── layout.tsx        # Marketing-specific layout (header + footer)
│   ├── about/page.tsx
│   └── pricing/page.tsx
├── (app)/                # URL: /feed, /search (no /app/ prefix)
│   ├── layout.tsx        # App layout (sidebar + navigation)
│   ├── feed/page.tsx
│   └── search/page.tsx
└── (auth)/               # URL: /login, /register
    ├── layout.tsx        # Minimal layout
    └── login/page.tsx
```

### Dynamic routes

```tsx
// app/[locale]/(app)/feed/[itemId]/page.tsx
export default async function ItemPage({
  params,
}: {
  params: Promise<{ locale: string; itemId: string }>
}) {
  const { itemId } = await params  // MUST await in Next.js 16
  // ...
}
```

### Catch-all and optional catch-all

```
[...slug]/page.tsx          # /a, /a/b, /a/b/c — does NOT match /
[[...slug]]/page.tsx        # /, /a, /a/b, /a/b/c — matches root too
```

---

## 2. Layouts and Templates

### Root layout (required)

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: { template: '%s | MyApp', default: 'MyApp' },
  description: 'Cross-platform application',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationMismatch>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

### Nested locale layout

```tsx
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as any)) notFound()

  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
```

### App layout with sidebar

```tsx
// app/[locale]/(app)/layout.tsx
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
```

---

## 3. The `"use cache"` Model

### Three cache variants

| Directive | Storage | Shared across requests | Use case |
|---|---|---|---|
| `'use cache'` | In-memory LRU (per-process) | Yes (same process) | Default, most use cases |
| `'use cache: remote'` | External handler (Redis, KV) | Yes (all instances) | Multi-instance deployments, ISR |
| `'use cache: private'` | Browser memory only | No (per-user) | Personalized, uses cookies/headers |

### `cacheLife` profiles

Built-in: `'seconds'`, `'minutes'`, `'hours'`, `'days'`, `'weeks'`, `'max'`.

Each profile has three parameters:
- **`stale`**: Client Router Cache TTL — how long the browser serves stale content
- **`revalidate`**: Server background regeneration interval
- **`expire`**: Maximum TTL before forced synchronous regeneration

```ts
// Custom profile in next.config.ts
cacheLife: {
  content: { stale: 3600, revalidate: 900, expire: 86400 },
  realtime: { stale: 5, revalidate: 5, expire: 30 },
  catalog: { stale: 604800, revalidate: 86400, expire: 2592000 },
}
```

Usage:

```ts
import { cacheLife, cacheTag } from 'next/cache'

export async function getProducts(category: string) {
  'use cache'
  cacheLife('content')
  cacheTag('products', `products-${category}`)

  const res = await fetch(`${API_URL}/products?category=${category}`)
  return res.json()
}
```

### File-level caching

Apply `'use cache'` at the top of a file to cache all exports:

```ts
// lib/queries/static-data.ts
'use cache'
import { cacheLife } from 'next/cache'

cacheLife('max')

export async function getSiteConfig() { /* ... */ }
export async function getNavigation() { /* ... */ }
```

### What CANNOT be cached

- Functions that call `cookies()`, `headers()`, `searchParams` — these are request-specific
- Functions with side effects (database writes, email sends)
- Functions using `Math.random()` or `Date.now()` for unique values

Workaround for personalized content: use `'use cache: private'` (experimental) or pass dynamic values as arguments.

---

## 4. On-Demand Invalidation

### `revalidateTag(tag)`

```ts
// lib/actions/products.ts
'use server'
import { revalidateTag } from 'next/cache'

export async function updateProduct(productId: string, data: ProductData) {
  await db.products.update({ where: { id: productId }, data })
  revalidateTag('products')                            // Invalidate all product caches
  revalidateTag(`product-${productId}`)                // Invalidate specific product
}
```

### `revalidatePath(path)`

```ts
revalidatePath('/en/feed')              // Revalidate specific path
revalidatePath('/en/feed', 'layout')    // Revalidate layout + all pages under it
revalidatePath('/', 'layout')           // Revalidate everything
```

### `updateTag(tag)` — read-your-own-writes (new in 16.1)

For Server Actions where the user should immediately see their change:

```ts
'use server'
import { updateTag } from 'next/cache'

export async function toggleFavorite(itemId: string) {
  await db.favorites.toggle(itemId)
  updateTag(`item-${itemId}`)  // Client immediately sees updated data
}
```

### Webhook-triggered revalidation

```ts
// app/api/webhooks/route.ts
import { revalidateTag } from 'next/cache'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { type, id } = await request.json()
  const secret = request.headers.get('x-webhook-secret')

  if (secret !== process.env.WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  revalidateTag(`${type}-${id}`)
  return Response.json({ revalidated: true })
}
```

---

## 5. `proxy.ts`

### Basic auth redirect

```ts
// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const token = request.cookies.get('session')?.value
  const isAuthPage = request.nextUrl.pathname.match(/^\/(en|es)\/(login|register)/)
  const isAppPage = request.nextUrl.pathname.match(/^\/(en|es)\/(feed|search|profile|settings)/)

  if (!token && isAppPage) {
    return NextResponse.redirect(new URL('/en/login', request.url))
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/en/feed', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/(en|es)/:path*'],
}
```

### Locale detection in proxy

```ts
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasLocale = /^\/(en|es)(\/|$)/.test(pathname)

  if (!hasLocale) {
    const locale = request.headers.get('accept-language')?.startsWith('es') ? 'es' : 'en'
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url))
  }

  return NextResponse.next()
}
```

### Migration from middleware.ts

```bash
npx @next/codemod@latest middleware-to-proxy .
```

This renames: `middleware.ts` → `proxy.ts`, `middleware()` → `proxy()`, `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`.

---

## 6. Streaming and Suspense

### Pattern: static shell + streamed dynamic content

```tsx
// app/[locale]/(app)/feed/page.tsx
import { Suspense } from 'react'

export default async function FeedPage() {
  return (
    <div className="space-y-6">
      {/* Renders instantly from cache */}
      <FeedHeader />

      {/* Streams as data loads */}
      <Suspense fallback={<FeedListSkeleton />}>
        <FeedList />
      </Suspense>

      {/* Independent stream — doesn't block FeedList */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations />
      </Suspense>
    </div>
  )
}
```

### `loading.tsx` auto-Suspense

The `loading.tsx` file automatically wraps the corresponding `page.tsx` in a `<Suspense>` boundary. Use it for route-level loading states. Use manual `<Suspense>` for more granular control within a page.

### Important: `notFound()` placement

`notFound()` must be called **before** any Suspense boundary and **before** any `await` that suspends. If called after streaming begins, the response status is already 200 and cannot be changed to 404.

```tsx
// ✅ Correct: notFound() before Suspense
export default async function ItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params
  const item = await getItem(itemId)
  if (!item) notFound()  // 404 response

  return (
    <article>
      <h1>{item.title}</h1>
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments itemId={itemId} />
      </Suspense>
    </article>
  )
}
```

---

## 7. `generateStaticParams`

Pre-render dynamic routes at build time:

```tsx
// app/[locale]/(app)/feed/[itemId]/page.tsx
export async function generateStaticParams() {
  const items = await getPopularItems()
  return items.map((item) => ({ itemId: item.id }))
}

// Combined with parent params
// app/[locale]/(app)/feed/[itemId]/page.tsx
export async function generateStaticParams({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params  // Must await in Next.js 16
  const items = await getItemsByLocale(locale)
  return items.map((item) => ({ itemId: item.id }))
}
```

Pages not returned by `generateStaticParams` are generated on-demand (ISR behavior with `"use cache"`).

### `dynamicParams` control

```tsx
export const dynamicParams = false  // Return 404 for non-generated params
export const dynamicParams = true   // Default: generate on-demand
```

---

## 8. Metadata API

### Static metadata

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Feed',
  description: 'Browse the latest content',
  openGraph: {
    title: 'Feed | MyApp',
    images: ['/og/feed.png'],
  },
}
```

### Dynamic metadata

```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ itemId: string }>
}): Promise<Metadata> {
  const { itemId } = await params
  const item = await getItem(itemId)

  return {
    title: item.title,
    description: item.summary,
    openGraph: {
      title: item.title,
      images: [item.imageUrl],
    },
  }
}
```

### Streaming metadata (new in Next.js 16)

`generateMetadata` no longer blocks rendering for JS-capable bots. Metadata streams alongside the page content. For HTML-limited bots (Facebook, WhatsApp), metadata still blocks to ensure correct previews.

### Viewport (separate export)

```tsx
import type { Viewport } from 'next'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
}
```

### Sitemap and robots

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await getAllItemSlugs()
  return [
    { url: 'https://example.com', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...items.map((item) => ({
      url: `https://example.com/en/feed/${item.slug}`,
      lastModified: item.updatedAt,
    })),
  ]
}
```

---

## 9. Server Actions

### Setup with next-safe-action

```ts
// lib/safe-action.ts
import { createSafeActionClient } from 'next-safe-action'

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    console.error('Action error:', e.message)
    return e.message
  },
})

export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return next({ ctx: { userId: session.userId } })
})
```

### Define an action

```ts
// lib/actions/items.ts
'use server'
import { authActionClient } from '@/lib/safe-action'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'

export const createItem = authActionClient
  .inputSchema(z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000),
    category: z.enum(['tech', 'design', 'business']),
  }))
  .action(async ({ parsedInput, ctx }) => {
    const item = await db.items.create({
      data: { ...parsedInput, authorId: ctx.userId },
    })
    revalidateTag('feed')
    return { item }
  })
```

### Use in Client Component

```tsx
'use client'
import { useAction } from 'next-safe-action/hooks'
import { createItem } from '@/lib/actions/items'

export function CreateItemForm() {
  const { execute, result, isExecuting } = useAction(createItem)

  return (
    <form action={(formData) => {
      execute({
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as string,
      })
    }}>
      {/* form fields */}
      <button type="submit" disabled={isExecuting}>
        {isExecuting ? 'Creating...' : 'Create'}
      </button>
      {result.serverError && <p className="text-red-500">{result.serverError}</p>}
    </form>
  )
}
```

### Optimistic updates

```tsx
'use client'
import { useOptimisticAction } from 'next-safe-action/hooks'
import { toggleFavorite } from '@/lib/actions/favorites'

export function FavoriteButton({ itemId, isFavorite }: { itemId: string; isFavorite: boolean }) {
  const { execute, optimisticState } = useOptimisticAction(toggleFavorite, {
    currentState: { isFavorite },
    updateFn: (state) => ({ isFavorite: !state.isFavorite }),
  })

  return (
    <button onClick={() => execute({ itemId })}>
      {optimisticState.isFavorite ? '❤️' : '🤍'}
    </button>
  )
}
```

### Progressive enhancement with `<form>` + `next/form`

```tsx
import Form from 'next/form'

export function SearchForm() {
  return (
    <Form action="/en/search">
      <input name="q" placeholder="Search..." />
      <button type="submit">Search</button>
    </Form>
  )
}
```

`next/form` prefetches the target route layout on hover and performs client-side navigation on submit, with full fallback to standard form submission without JS.

---

## 10. Route Handlers

```ts
// app/api/items/route.ts
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category')

  const items = await getItems({ category })
  return Response.json(items)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const item = await createItem(body)
  return Response.json(item, { status: 201 })
}
```

### Caching route handlers

```ts
export async function GET() {
  'use cache'
  cacheLife('hours')
  cacheTag('api-items')

  const items = await getItems()
  return Response.json(items)
}
```

### CORS headers

```ts
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
```

---

## 11. Parallel and Intercepting Routes

### Parallel routes

Display multiple pages simultaneously. Use `@slotName` directories:

```
app/[locale]/(app)/dashboard/
├── layout.tsx
├── page.tsx
├── @analytics/
│   ├── page.tsx
│   └── default.tsx      ← REQUIRED in Next.js 16
├── @activity/
│   ├── page.tsx
│   └── default.tsx      ← REQUIRED in Next.js 16
└── default.tsx
```

```tsx
// app/[locale]/(app)/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  activity,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  activity: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">{children}</div>
      <div>{analytics}</div>
      <div>{activity}</div>
    </div>
  )
}
```

### Intercepting routes

Show a route in a modal while preserving the URL:

```
app/[locale]/(app)/feed/
├── page.tsx                      # Feed list
├── [itemId]/page.tsx             # Full item page (direct navigation)
└── (.)itemId/                    # Intercepted: show as modal
    └── page.tsx                  # Modal version of item
```

Prefix conventions: `(.)` same level, `(..)` one level up, `(..)(..)` two levels up, `(...)` from root.
