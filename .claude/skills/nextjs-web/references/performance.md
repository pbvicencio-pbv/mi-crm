# Performance — ISR, Core Web Vitals, Bundling

## Table of Contents

1. [ISR with Cache Components](#1-isr-with-cache-components)
2. [Self-Hosted Caching](#2-self-hosted-caching)
3. [Core Web Vitals](#3-core-web-vitals)
4. [Image Optimization](#4-image-optimization)
5. [Font Optimization](#5-font-optimization)
6. [React Compiler](#6-react-compiler)
7. [Bundle Analysis](#7-bundle-analysis)
8. [Turbopack](#8-turbopack)
9. [Edge Runtime vs Node.js](#9-edge-runtime)

---

## 1. ISR with Cache Components

### The new ISR model

In Next.js 16, ISR is built on the `"use cache"` model instead of the old `revalidate` segment config. The concept is the same — pre-render at build time, regenerate in the background — but with much finer granularity.

### Pattern by use case

**Content sites (blog, docs, marketing)**

```tsx
// lib/queries/posts.ts
export async function getPost(slug: string) {
  'use cache'
  cacheLife('days')                     // stale: 1 day, revalidate: 1 day, expire: 7 days
  cacheTag('posts', `post-${slug}`)

  return await cms.getPost(slug)
}

// Invalidate from CMS webhook
// app/api/webhooks/cms/route.ts
export async function POST(req: NextRequest) {
  const { slug } = await req.json()
  revalidateTag(`post-${slug}`)
  return Response.json({ ok: true })
}
```

**E-commerce (product pages)**

```tsx
// Product info: cached with long TTL
export async function getProduct(id: string) {
  'use cache'
  cacheLife('hours')
  cacheTag('products', `product-${id}`)
  return await db.products.findUnique({ where: { id } })
}

// Price: short cache or dynamic
export async function getPrice(id: string) {
  'use cache'
  cacheLife('seconds')
  cacheTag(`price-${id}`)
  return await pricing.getPrice(id)
}

// Cart: fully dynamic, never cached
export async function getCart(userId: string) {
  // No 'use cache' — always fresh
  return await db.carts.findUnique({ where: { userId } })
}
```

**Dashboard (real-time-ish data)**

```tsx
// Cached shell + streamed live data
export default async function DashboardPage() {
  return (
    <div>
      <DashboardHeader />                         {/* Static shell */}
      <Suspense fallback={<MetricsSkeleton />}>
        <LiveMetrics />                            {/* Streams with 'use cache' + cacheLife('seconds') */}
      </Suspense>
    </div>
  )
}
```

### `generateStaticParams` + Cache Components

At build time, routes returned by `generateStaticParams` are pre-rendered. The `'use cache'` functions inside them are evaluated and stored. On subsequent requests, stale content is served while revalidation happens in the background.

```tsx
// Pre-render top 100 products at build time
export async function generateStaticParams() {
  const products = await getTopProducts(100)
  return products.map((p) => ({ productId: p.id }))
}

// Other product pages are generated on first request (ISR)
export const dynamicParams = true
```

---

## 2. Self-Hosted Caching

### Custom cache handlers

For non-Vercel deployments, implement cache handlers:

```ts
// next.config.ts
const nextConfig = {
  cacheComponents: true,
  cacheHandlers: {
    default: require.resolve('./cache-handlers/memory.js'),
    remote: require.resolve('./cache-handlers/redis.js'),
  },
}
```

### Redis cache handler example

```ts
// cache-handlers/redis.js
import { createClient } from 'redis'

const client = createClient({ url: process.env.REDIS_URL })
client.connect()

module.exports = {
  async get(key) {
    const data = await client.get(key)
    return data ? JSON.parse(data) : null
  },

  async set(key, value, { revalidate, tags }) {
    const ttl = revalidate ?? 3600
    await client.set(key, JSON.stringify(value), { EX: ttl })
    // Store tag → key mapping for invalidation
    for (const tag of tags ?? []) {
      await client.sAdd(`tag:${tag}`, key)
    }
  },

  async revalidateTag(tag) {
    const keys = await client.sMembers(`tag:${tag}`)
    if (keys.length > 0) {
      await client.del(keys)
      await client.del(`tag:${tag}`)
    }
  },
}
```

### Community solution: @neshca/cache-handler

Purpose-built for distributed Next.js ISR. Supports Redis, Memcached, and custom stores:

```bash
pnpm add @neshca/cache-handler
```

---

## 3. Core Web Vitals

### Current thresholds (2026)

| Metric | Good | Needs improvement | Poor | Measures |
|---|---|---|---|---|
| **LCP** | ≤ 2.5s | ≤ 4.0s | > 4.0s | Loading performance |
| **INP** | ≤ 200ms | ≤ 500ms | > 500ms | Interactivity (replaced FID March 2024) |
| **CLS** | ≤ 0.1 | ≤ 0.25 | > 0.25 | Visual stability |

### LCP optimization

1. **Preload LCP image**: Use `preload` prop (replaces `priority` in v16)
   ```tsx
   <Image src="/hero.jpg" alt="Hero" width={1200} height={600} preload />
   ```

2. **Server Components for above-the-fold**: Eliminate client JS for hero sections

3. **`"use cache"` for data-fetching**: Cached content serves instantly

4. **Streaming**: `<Suspense>` prevents data-fetching from blocking the initial shell

5. **Avoid layout shifts**: Set explicit `width`/`height` on images, use `next/font`

### INP optimization

1. **React Compiler**: Auto-memoizes to prevent unnecessary re-renders

2. **`useTransition()`**: Wrap non-urgent updates to keep the UI responsive
   ```tsx
   const [isPending, startTransition] = useTransition()
   function handleFilter(category: string) {
     startTransition(() => router.push(`?category=${category}`))
   }
   ```

3. **`useDeferredValue()`**: Debounce expensive renders
   ```tsx
   const deferredQuery = useDeferredValue(searchQuery)
   // Render with deferredQuery — doesn't block input
   ```

4. **Client Component code-splitting**: `dynamic()` for heavy components
   ```tsx
   const HeavyChart = dynamic(() => import('./chart'), { ssr: false })
   ```

### CLS optimization

1. **`next/font`**: Self-hosts fonts at build time — zero CLS from font loading
2. **`next/image`**: Auto-generates `width`/`height` — reserves space before load
3. **Skeleton loading**: Match exact dimensions of final content
4. **Avoid inserting content above existing content**: Use fixed-height containers

### Monitoring

```tsx
// app/layout.tsx (or a Client Component)
'use client'
import { useReportWebVitals } from 'next/web-vitals'

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // Send to analytics
    analytics.track('web-vital', {
      name: metric.name,        // LCP, INP, CLS, FCP, TTFB
      value: metric.value,
      rating: metric.rating,    // 'good' | 'needs-improvement' | 'poor'
    })
  })
  return null
}
```

---

## 4. Image Optimization

### `next/image` in Next.js 16

```tsx
import Image from 'next/image'

// Local image (auto width/height from import)
import heroImage from '@/public/hero.jpg'
<Image src={heroImage} alt="Hero" preload placeholder="blur" />

// Remote image (explicit dimensions required)
<Image
  src="https://cdn.example.com/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
/>

// Fill mode (parent must be positioned)
<div className="relative aspect-video">
  <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
</div>
```

### v16 breaking changes for images

| Change | Details |
|---|---|
| `priority` → `preload` | `priority` prop deprecated |
| `images.qualities` required | Default: `[75]`, set in next.config |
| `minimumCacheTTL` default | 60s → 14400s (4 hours) |
| `dangerouslyAllowLocalIP` | Local IPs blocked by default |

### Best practices

- Use `preload` only for LCP images (above the fold)
- Always provide `sizes` for responsive images — prevents downloading oversized images
- Use `placeholder="blur"` for local images (auto-generated blur data URL)
- Set multiple `qualities` for different use cases: `[75, 90]`
- Configure `remotePatterns` in next.config for external image domains

---

## 5. Font Optimization

### `next/font` with Tailwind v4

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export default function RootLayout({ children }) {
  return (
    <html className={`${inter.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

```css
/* globals.css */
@theme inline {
  --font-sans: var(--font-inter);
  --font-mono: var(--font-jetbrains);
}
```

### How it works

`next/font` self-hosts font files at build time. Fonts are served from the same domain — no external requests, no CLS from font swap, no Google tracking. The CSS `size-adjust` property is applied to prevent layout shift.

### Local fonts

```tsx
import localFont from 'next/font/local'

const customFont = localFont({
  src: [
    { path: '../fonts/Custom-Regular.woff2', weight: '400' },
    { path: '../fonts/Custom-Bold.woff2', weight: '700' },
  ],
  variable: '--font-custom',
})
```

---

## 6. React Compiler

### What it does

React Compiler 1.0 automatically memoizes components, hooks, and values at build time. It replaces manual `useMemo`, `useCallback`, and `React.memo` for most use cases.

### Enable in Next.js 16

```ts
// next.config.ts
const nextConfig = {
  reactCompiler: true,
}
```

### What it optimizes

- Component re-renders: only re-renders when props actually change
- Hook dependencies: auto-detects what to memoize
- Conditional paths: memoizes branches that manual hooks cannot
- JSX elements: avoids re-creating unchanged subtrees

### Performance impact

Meta's production data: up to 12% faster initial page loads, >2.5× faster interactions on complex pages.

### When to keep manual memoization

- `useMemo` for expensive computations with known hot paths
- `useCallback` when passing to third-party libraries that require stable references
- `React.memo` as an escape hatch for specific perf issues the compiler doesn't handle

### Gradual adoption

```ts
// Opt-in per file with annotation mode
const nextConfig = {
  reactCompiler: { compilationMode: 'annotation' },
}
```

```tsx
// Add "use memo" to individual files
'use memo'

export function ExpensiveComponent() { /* ... */ }
```

### Build-time impact

The compiler uses Babel (not SWC), which slows builds. For large projects, this can add 10-30% build time. Evaluate the tradeoff — the runtime gains usually far outweigh the build cost.

---

## 7. Bundle Analysis

### Turbopack Bundle Analyzer (experimental, 16.1+)

```bash
next build --analyze
```

Generates an interactive visualization with import chain tracing. Shows why each module was included and which page/component imported it.

### Legacy: @next/bundle-analyzer

```bash
pnpm add -D @next/bundle-analyzer
```

```ts
// next.config.ts
import withBundleAnalyzer from '@next/bundle-analyzer'

const nextConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})({ /* ... */ })
```

```bash
ANALYZE=true next build
```

### `optimizePackageImports`

Auto-transforms barrel imports to direct imports, preventing large libraries from bloating the bundle:

```ts
// next.config.ts
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'date-fns'],
  },
}
```

### Code splitting strategies

1. **Route-based**: Automatic — each page is a separate chunk
2. **`dynamic()` imports**: Manual split for heavy components
   ```tsx
   const Chart = dynamic(() => import('@/components/chart'), {
     loading: () => <Skeleton className="h-64 w-full" />,
     ssr: false,  // Client-only for browser APIs
   })
   ```
3. **`React.lazy()` + Suspense**: For client-side-only splits
4. **`next/dynamic` with named exports**:
   ```tsx
   const Component = dynamic(() =>
     import('@/components/heavy').then((mod) => mod.SpecificComponent)
   )
   ```

---

## 8. Turbopack

### Status in Next.js 16

Turbopack is the **default bundler** for both `next dev` and `next build`. Webpack is available via `--webpack` flag.

### Performance gains

| Metric | vs Webpack | Source |
|---|---|---|
| Server startup | **76.7% faster** | Vercel benchmarks |
| Fast Refresh (HMR) | **96.3% faster** | Vercel benchmarks |
| Initial route compile | **45.8% faster** | Vercel benchmarks |
| Production build | **2-5× faster** | Third-party benchmarks |
| Cached rebuild | **~10× faster** | react.dev: 3.7s → 380ms |

### File System Caching

Stable in 16.1 for `next dev` (on by default). For production builds, opt in:

```ts
// next.config.ts
const nextConfig = {
  turbopackFileSystemCacheForBuild: true,  // Beta — opt-in
}
```

### Known limitations

- **Webpack plugins NOT supported** — fundamentally different architecture
- Partial Webpack loader support: `@svgr/webpack`, `babel-loader`, `url-loader`, `file-loader` work
- No support for: `@vanilla-extract/css`, StyleX, Sass custom functions
- Incomplete tree-shaking for CommonJS modules and barrel files
- Cannot be used outside Next.js

### When to fall back to Webpack

- Project depends on a critical Webpack plugin with no alternative
- Using vanilla-extract or StyleX for styling
- Encountering a Turbopack-specific bug in production builds

```bash
next dev --webpack
next build --webpack
```

---

## 9. Edge Runtime vs Node.js

### When to use Edge Runtime

| Use case | Runtime | Why |
|---|---|---|
| `proxy.ts` | Node.js (forced) | Only runtime available for proxy |
| Geo-based personalization | Edge | Low latency at the edge |
| Simple auth checks | Edge | Fast redirect, no DB needed |
| API routes with DB access | Node.js | Full API access |
| ISR / `'use cache'` | Node.js | Cache handlers need full Node |
| Server Actions | Node.js | Database writes, full APIs |

### Set per route

```tsx
// app/api/lightweight/route.ts
export const runtime = 'edge'

export async function GET() {
  return Response.json({ timestamp: Date.now() })
}
```

### Edge limitations

- **1-4 MB code size limit** on Vercel
- No `fs`, `net`, `child_process`, `dns` modules
- No native Node.js addons
- Limited `crypto` API
- Streaming responses work but with platform-specific behavior
