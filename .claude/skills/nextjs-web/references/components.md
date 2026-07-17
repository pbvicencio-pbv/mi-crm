# Components & Styling — Tailwind CSS 4.2 + shadcn/ui


## Table of Contents

1. [Tailwind CSS 4.2 Setup](#1-tailwind-css-42-setup)
2. [The `@theme` Directive](#2-the-theme-directive)
3. [Dark Mode](#3-dark-mode)
4. [shadcn/ui Integration](#4-shadcnui-integration)
5. [Layout Components](#5-layout-components)
6. [Content Components](#6-content-components)
7. [Interactive Components](#7-interactive-components)
8. [Responsive Design](#8-responsive-design)
9. [Animations](#9-animations)

---

## 1. Tailwind CSS 4.2 Setup

### Installation with Next.js 16

```bash
pnpm add -D tailwindcss @tailwindcss/postcss postcss
```

```js
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
export default config
```

No `autoprefixer` needed — Tailwind v4 handles it internally via Lightning CSS. No `tailwind.config.js` needed — configuration is CSS-first.

### Entry point

```css
/* app/globals.css */
@import "tailwindcss";

/* Font variables from next/font (set in layout.tsx) */
@theme inline {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

/* Design tokens */
@theme {
  /* Colors — OKLCH for wider gamut */
  --color-background: oklch(0.99 0 0);
  --color-foreground: oklch(0.15 0 0);
  --color-primary: oklch(0.55 0.22 260);
  --color-primary-foreground: oklch(0.98 0 0);
  --color-secondary: oklch(0.93 0.01 260);
  --color-secondary-foreground: oklch(0.20 0 0);
  --color-muted: oklch(0.95 0.01 260);
  --color-muted-foreground: oklch(0.55 0.02 260);
  --color-accent: oklch(0.93 0.01 260);
  --color-destructive: oklch(0.58 0.22 29);
  --color-border: oklch(0.90 0.01 260);
  --color-ring: oklch(0.55 0.22 260);
  --color-card: oklch(0.99 0 0);
  --color-card-foreground: oklch(0.15 0 0);
  --color-popover: oklch(0.99 0 0);
  --color-input: oklch(0.90 0.01 260);

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 oklch(0 0 0 / 0.05);

  /* Custom breakpoint */
  --breakpoint-3xl: 1920px;
}
```

### Key changes from Tailwind v3

| v3 | v4 | Notes |
|---|---|---|
| `tailwind.config.js` | `@theme { }` in CSS | JS config still works via `@config` |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` | Single import |
| `content: ['./app/**/*.tsx']` | Auto-detection | No content config needed |
| `bg-opacity-50` | `bg-black/50` | Opacity modifier syntax |
| `shadow-sm` | `shadow-xs` | Scale shifted down |
| `rounded-sm` | `rounded-xs` | Scale shifted down |
| `bg-gradient-to-r` | `bg-linear-to-r` | Renamed |
| Default border color `gray-200` | `currentColor` | Explicit border color required |
| PostCSS `tailwindcss` | `@tailwindcss/postcss` | New plugin package |

### Migration

```bash
npx @tailwindcss/upgrade
```

Automates ~90% of changes. Review manually: border colors, shadow/rounded scale shifts, opacity utility migration.

---

## 2. The `@theme` Directive

### Primitives → Semantic → Component tokens

```css
@theme {
  /* Primitive tokens (raw values) */
  --color-blue-500: oklch(0.62 0.22 260);
  --color-blue-600: oklch(0.55 0.22 260);
  --color-neutral-50: oklch(0.98 0 0);
  --color-neutral-900: oklch(0.15 0 0);

  /* Semantic tokens (purpose-based) — reference primitives */
  --color-primary: var(--color-blue-600);
  --color-background: var(--color-neutral-50);
  --color-foreground: var(--color-neutral-900);
}
```

### Using tokens in components

Tokens generate both utility classes AND CSS variables:

```tsx
// Using as utility class
<div className="bg-primary text-primary-foreground" />

// Using as CSS variable (in custom CSS or inline)
<div style={{ backgroundColor: 'var(--color-primary)' }} />
```

### `@theme inline` — variables without utilities

Use `@theme inline` for values that should only be CSS variables, not generate utility classes:

```css
@theme inline {
  --font-sans: var(--font-geist-sans);      /* Only var(--font-sans), no .font-sans */
  --sidebar-width: 280px;                    /* Only var(--sidebar-width) */
}
```

### Extending theme with `@theme extend`

```css
@theme extend {
  --color-brand-50: oklch(0.97 0.02 260);
  --color-brand-500: oklch(0.62 0.22 260);
  --color-brand-900: oklch(0.25 0.12 260);
}
```

---

## 3. Dark Mode

### CSS-based (default: `prefers-color-scheme`)

```css
@theme {
  --color-background: oklch(0.99 0 0);
  --color-foreground: oklch(0.15 0 0);
}

/* Dark overrides using @custom-variant */
@custom-variant dark (&:where(.dark, .dark *));
```

Usage in HTML — add `dark` class to `<html>`:

```tsx
// components/theme-toggle.tsx
'use client'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return <button onClick={() => setDark(!dark)}>Toggle theme</button>
}
```

### shadcn/ui dark mode tokens

shadcn/ui components reference semantic tokens that have dark variants:

```css
@theme {
  --color-background: oklch(0.99 0 0);
  --color-foreground: oklch(0.15 0 0);
  --color-card: oklch(0.99 0 0);
  --color-card-foreground: oklch(0.15 0 0);
  /* ... all semantic tokens */
}

.dark {
  --color-background: oklch(0.10 0 0);
  --color-foreground: oklch(0.93 0 0);
  --color-card: oklch(0.13 0 0);
  --color-card-foreground: oklch(0.93 0 0);
  /* ... dark overrides */
}
```

---

## 4. shadcn/ui Integration

### Initialize in the web app

```bash
cd your-app
npx shadcn@latest init
```

Configuration (`components.json`):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### Adding components

```bash
npx shadcn@latest add button card dialog input label select textarea
npx shadcn@latest add dropdown-menu sheet sidebar sonner
npx shadcn@latest add table tabs badge skeleton separator
```

Components are copied to `components/ui/`. They are source code, not dependencies — customize freely.

### Full project scaffold (Dec 2025+)

```bash
npx shadcn@latest create
```

Interactive wizard to choose: Radix UI vs Base UI primitives, visual style (Vega/Nova/Maia/Lyra/Mira), base color, and plugins.

### The `cn()` utility

```ts
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Server Component compatibility

| Category | Example Components | Server Component? |
|---|---|---|
| Presentational | Badge, Card, Skeleton, Table, Separator | ✅ Yes |
| Interactive | Dialog, Dropdown, Tabs, Sheet, Select | ❌ Client only |
| Form | Input, Textarea, Label, Checkbox, Switch | ⚠️ Depends on usage |

When `rsc: true` in `components.json`, the CLI auto-adds `'use client'` to interactive components.

### New components (2025)

| Component | Use case |
|---|---|
| Button Group | Grouped actions |
| Empty | Empty state illustrations |
| Field | Form field wrapper with label + error |
| Input Group | Input with prefix/suffix |
| Kbd | Keyboard shortcut display |
| Spinner | Loading indicator |

---

## 5. Layout Components

### App shell with Sidebar

```tsx
// components/layout/sidebar.tsx
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Home, Search, User, Settings } from 'lucide-react'

const items = [
  { title: 'Feed', url: '/en/feed', icon: Home },
  { title: 'Search', url: '/en/search', icon: Search },
  { title: 'Profile', url: '/en/profile', icon: User },
  { title: 'Settings', url: '/en/settings', icon: Settings },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
```

### Header with search

```tsx
// components/layout/header.tsx
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import Form from 'next/form'

export function Header() {
  return (
    <header className="flex h-14 items-center gap-4 border-b px-4">
      <SidebarTrigger />
      <Form action="/en/search" className="flex-1 max-w-md">
        <Input name="q" placeholder="Search..." className="w-full" />
      </Form>
      <Button variant="ghost" size="sm">Sign out</Button>
    </header>
  )
}
```

---

## 6. Content Components

### Content card (Server Component)

```tsx
// components/shared/content-card.tsx
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import Link from 'next/link'

interface ContentCardProps {
  item: {
    id: string
    title: string
    summary: string
    category: string
    imageUrl: string
    author: string
    date: string
  }
  locale: string
}

export function ContentCard({ item, locale }: ContentCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <Link href={`/${locale}/feed/${item.id}`}>
        <div className="relative aspect-video">
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{item.category}</Badge>
            <span className="text-sm text-muted-foreground">{item.date}</span>
          </div>
          <CardTitle className="line-clamp-2">{item.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-3 text-muted-foreground">{item.summary}</p>
        </CardContent>
        <CardFooter>
          <span className="text-sm text-muted-foreground">by {item.author}</span>
        </CardFooter>
      </Link>
    </Card>
  )
}
```

### Skeleton loading

```tsx
// components/shared/content-card-skeleton.tsx
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ContentCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4 mt-2" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-4 w-32" />
      </CardFooter>
    </Card>
  )
}
```

### Empty state

```tsx
import { Empty } from '@/components/ui/empty'
import { Search } from 'lucide-react'

export function NoResults({ query }: { query: string }) {
  return (
    <Empty>
      <Empty.Icon><Search /></Empty.Icon>
      <Empty.Title>No results found</Empty.Title>
      <Empty.Description>
        We couldn't find anything matching "{query}". Try a different search.
      </Empty.Description>
    </Empty>
  )
}
```

---

## 7. Interactive Components

### Filter bar (Client Component)

```tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const categories = ['all', 'tech', 'design', 'business'] as const

export function FeedFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const active = searchParams.get('category') ?? 'all'

  function setCategory(category: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (category === 'all') params.delete('category')
    else params.set('category', category)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-3">
      {/* Desktop: buttons */}
      <div className="hidden md:flex gap-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={active === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Mobile: select */}
      <div className="md:hidden w-full">
        <Select value={active} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
```

### Dialog / Modal

```tsx
'use client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function CreateItemDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Item</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create new item</DialogTitle>
          <DialogDescription>Fill in the details below.</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
```

### Toast notifications with Sonner

```tsx
// app/[locale]/layout.tsx — add <Toaster /> to root
import { Toaster } from '@/components/ui/sonner'

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}
```

```tsx
// In any Client Component
import { toast } from 'sonner'

toast.success('Item created successfully')
toast.error('Failed to create item')
toast.loading('Creating item...')
```

---

## 8. Responsive Design

### Tailwind v4 breakpoints

Default: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1536px).

Custom breakpoints via `@theme`:

```css
@theme {
  --breakpoint-3xl: 1920px;
  --breakpoint-tablet: 820px;
}
```

### Container queries (built-in in v4)

```tsx
<div className="@container">
  <div className="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 gap-4">
    {items.map(item => <ContentCard key={item.id} item={item} />)}
  </div>
</div>
```

### Responsive grid pattern

```tsx
// Feed grid — adapts from 1 to 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
  {items.map(item => <ContentCard key={item.id} item={item} locale={locale} />)}
</div>

// Dashboard — sidebar collapses on mobile
<div className="flex flex-col lg:flex-row gap-6">
  <main className="flex-1">{children}</main>
  <aside className="w-full lg:w-80">{sidebar}</aside>
</div>
```

---

## 9. Animations

### Tailwind v4 transition utilities

```tsx
<div className="transition-all duration-200 hover:scale-105 hover:shadow-lg" />
```

### tw-animate-css (replaces tailwindcss-animate)

shadcn/ui uses `tw-animate-css` for component animations. Install:

```bash
pnpm add -D tw-animate-css
```

```css
/* globals.css — add after @import "tailwindcss" */
@import "tw-animate-css";
```

### Custom animations in CSS

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
```

### `@starting-style` for entry animations (new in v4)

```css
/* Animate dialog appearance without JS */
dialog[open] {
  opacity: 1;
  transform: scale(1);
  @starting-style {
    opacity: 0;
    transform: scale(0.95);
  }
  transition: opacity 0.2s, transform 0.2s;
}
```
