# Testing — Vitest, Playwright, RTL

## Table of Contents

1. [Testing Strategy](#1-testing-strategy)
2. [Vitest Setup](#2-vitest-setup)
3. [Unit Testing Patterns](#3-unit-testing-patterns)
4. [Component Testing with RTL](#4-component-testing-with-rtl)
5. [Server Component Testing Limitations](#5-server-component-testing-limitations)
6. [Playwright E2E Setup](#6-playwright-e2e-setup)
7. [E2E Testing Patterns](#7-e2e-testing-patterns)
8. [Visual Regression Testing](#8-visual-regression-testing)
9. [CI Integration](#9-ci-integration)

---

## 1. Testing Strategy

### Testing pyramid for Next.js 16

| Layer | Tool | Coverage target | What to test |
|---|---|---|---|
| Unit (60%) | Vitest | Queries, actions, utils, hooks | Business logic, data transformations, server actions |
| Component (20%) | Vitest + RTL | Client Components | Interactive behavior, state, user events |
| E2E (15%) | Playwright | Full user flows | Navigation, forms, auth, critical paths |
| Visual (5%) | Playwright screenshots | UI consistency | Layout, responsive design, dark mode |

### What goes where

| Concern | Test type | Notes |
|---|---|---|
| Cached query functions | Unit (Vitest) | Mock external APIs, test cache tags |
| Server actions (next-safe-action) | Unit (Vitest) | Mock DB, test validation + error handling |
| Utility functions | Unit (Vitest) | Pure functions, formatters |
| Custom hooks | Unit (Vitest + renderHook) | State logic, side effects |
| Client Components | Component (Vitest + RTL) | User interactions, state changes |
| Async Server Components | E2E (Playwright) | **Cannot unit test** — use E2E |
| Full page renders | E2E (Playwright) | Navigation, auth guards, form submissions |
| Cross-browser layout | Visual (Playwright) | Screenshots across viewports |

---

## 2. Vitest Setup

### Install

```bash
pnpm add -D vitest @vitejs/plugin-react vite-tsconfig-paths @testing-library/react @testing-library/dom @testing-library/jest-dom jsdom
```

Note: `@testing-library/dom` is now a **peer dependency** of `@testing-library/react` — must be installed explicitly.

### Configuration

```ts
// vitest.config.mts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/component/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['lib/**', 'components/**'],
      exclude: ['components/ui/**'],  // Exclude generated shadcn components
    },
  },
})
```

### Setup file

```ts
// tests/setup.ts
import '@testing-library/jest-dom/vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
}))

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
  useFormatter: () => ({
    dateTime: (date: Date) => date.toISOString(),
    number: (num: number) => String(num),
  }),
}))
```

### Package.json scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 3. Unit Testing Patterns

### Testing cached query functions

```ts
// tests/unit/queries/items.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the database / API
vi.mock('@/lib/db', () => ({
  db: {
    items: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import { getItems, getItem } from '@/lib/queries/items'
import { db } from '@/lib/db'

describe('getItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns items for a given category', async () => {
    const mockItems = [
      { id: '1', title: 'Item 1', category: 'tech' },
      { id: '2', title: 'Item 2', category: 'tech' },
    ]
    vi.mocked(db.items.findMany).mockResolvedValue(mockItems)

    const result = await getItems({ category: 'tech' })

    expect(result).toEqual(mockItems)
    expect(db.items.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { category: 'tech' } })
    )
  })

  it('returns all items when no category', async () => {
    vi.mocked(db.items.findMany).mockResolvedValue([])
    const result = await getItems({})
    expect(result).toEqual([])
  })
})
```

### Testing server actions (next-safe-action)

```ts
// tests/unit/actions/items.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: { items: { create: vi.fn() } },
}))

import { createItem } from '@/lib/actions/items'
import { db } from '@/lib/db'
import { revalidateTag } from 'next/cache'

describe('createItem action', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates an item and revalidates feed', async () => {
    const mockItem = { id: '1', title: 'New Item', category: 'tech' }
    vi.mocked(db.items.create).mockResolvedValue(mockItem)

    // next-safe-action returns { data, serverError, validationErrors }
    const result = await createItem({
      title: 'New Item',
      description: 'A test item',
      category: 'tech',
    })

    expect(result?.data?.item).toEqual(mockItem)
    expect(revalidateTag).toHaveBeenCalledWith('feed')
  })

  it('rejects invalid input', async () => {
    const result = await createItem({
      title: '',        // Too short
      description: 'A test item',
      category: 'tech',
    })

    expect(result?.validationErrors).toBeDefined()
    expect(db.items.create).not.toHaveBeenCalled()
  })
})
```

### Testing utility functions

```ts
// tests/unit/utils.test.ts
import { describe, it, expect } from 'vitest'
import { cn, formatDate, truncate } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('handles conflicts by keeping last', () => {
    expect(cn('px-4', 'px-8')).toBe('px-8')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra')
  })
})
```

### Testing custom hooks

```ts
// tests/unit/hooks/use-debounce.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/use-debounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } }
    )

    rerender({ value: 'world' })
    expect(result.current).toBe('hello')  // Still old value

    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current).toBe('world')  // Now updated
  })
})
```

---

## 4. Component Testing with RTL

### Testing a Client Component

```tsx
// tests/component/feed-filters.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeedFilters } from '@/app/[locale]/(app)/feed/feed-filters'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams('category=tech'),
}))

describe('FeedFilters', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders category buttons', () => {
    render(<FeedFilters />)
    expect(screen.getByText('all')).toBeInTheDocument()
    expect(screen.getByText('tech')).toBeInTheDocument()
    expect(screen.getByText('design')).toBeInTheDocument()
  })

  it('navigates on category click', () => {
    render(<FeedFilters />)
    fireEvent.click(screen.getByText('design'))
    expect(mockPush).toHaveBeenCalledWith('?category=design')
  })

  it('clears category when "all" clicked', () => {
    render(<FeedFilters />)
    fireEvent.click(screen.getByText('all'))
    expect(mockPush).toHaveBeenCalledWith('?')
  })
})
```

### Testing a form with server action

```tsx
// tests/component/create-item-form.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateItemForm } from '@/app/[locale]/(app)/feed/create-item-form'

vi.mock('@/lib/actions/items', () => ({
  createItem: vi.fn().mockResolvedValue({ data: { item: { id: '1' } } }),
}))

describe('CreateItemForm', () => {
  it('submits form data', async () => {
    const user = userEvent.setup()
    render(<CreateItemForm />)

    await user.type(screen.getByLabelText('Title'), 'New Item')
    await user.type(screen.getByLabelText('Description'), 'A description')
    await user.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(screen.getByText(/creating/i)).toBeInTheDocument()
    })
  })

  it('shows validation errors', async () => {
    const { createItem } = await import('@/lib/actions/items')
    vi.mocked(createItem).mockResolvedValue({
      validationErrors: { title: { _errors: ['Title is required'] } },
    })

    const user = userEvent.setup()
    render(<CreateItemForm />)
    await user.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument()
    })
  })
})
```

---

## 5. Server Component Testing Limitations

### The problem

Async Server Components that perform data fetching (`async function Page() { const data = await fetch(...) }`) **cannot be unit tested** with Vitest or Jest. Neither test runner supports the React Server Components runtime.

### Official recommendation

Use **Playwright E2E tests** for pages that are async Server Components.

### What CAN be tested

| Component type | Testable with Vitest + RTL? |
|---|---|
| Sync Server Component (no data fetching) | ✅ Yes (render as function) |
| Client Component | ✅ Yes |
| Async Server Component | ❌ No — use Playwright |
| Server Action (the function, not the UI) | ✅ Yes (call directly) |
| Cached query function | ✅ Yes (mock external deps) |
| Custom hook | ✅ Yes (renderHook) |

### Workaround pattern: extract logic from RSC

Instead of testing the page RSC directly, test the pieces it uses:

```
Page.tsx (async RSC) ← Test with Playwright E2E
  ├── getItems() (cached query) ← Test with Vitest (mock DB)
  ├── ContentCard (sync component) ← Test with Vitest + RTL
  └── FavoriteButton (client component) ← Test with Vitest + RTL
```

---

## 6. Playwright E2E Setup

### Install

```bash
pnpm add -D @playwright/test
npx playwright install
```

### Configuration

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 7. E2E Testing Patterns

### Full page flow: Feed → Item detail

```ts
// tests/e2e/feed.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Feed', () => {
  test('loads feed and navigates to item detail', async ({ page }) => {
    await page.goto('/en/feed')

    // Wait for content to load (streaming)
    await expect(page.getByRole('heading', { name: 'Feed' })).toBeVisible()

    // Check items loaded
    const cards = page.locator('[data-testid="content-card"]')
    await expect(cards.first()).toBeVisible()

    // Click first item
    await cards.first().click()

    // Verify navigation to detail page
    await expect(page).toHaveURL(/\/en\/feed\//)
    await expect(page.getByRole('article')).toBeVisible()
  })

  test('filters by category', async ({ page }) => {
    await page.goto('/en/feed')

    await page.getByRole('button', { name: 'tech' }).click()
    await expect(page).toHaveURL(/category=tech/)

    // Verify filtered content
    const badges = page.locator('[data-testid="category-badge"]')
    for (const badge of await badges.all()) {
      await expect(badge).toHaveText('tech')
    }
  })

  test('shows empty state for no results', async ({ page }) => {
    await page.goto('/en/feed?category=nonexistent')
    await expect(page.getByText('No items found')).toBeVisible()
  })
})
```

### Auth flow

```ts
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/en/feed')
    await expect(page).toHaveURL(/\/en\/login/)
  })

  test('login flow', async ({ page }) => {
    await page.goto('/en/login')
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL(/\/en\/feed/)
    await expect(page.getByRole('heading', { name: 'Feed' })).toBeVisible()
  })
})
```

### Search with debounce

```ts
test('search with live results', async ({ page }) => {
  await page.goto('/en/search')

  const input = page.getByPlaceholder('Search for content...')
  await input.fill('react')

  // Wait for debounced results
  await expect(page.getByText(/results for "react"/)).toBeVisible({ timeout: 2000 })
})
```

### i18n — locale switching

```ts
test('switches locale and preserves route', async ({ page }) => {
  await page.goto('/en/feed')
  await page.getByRole('button', { name: /español/i }).click()

  await expect(page).toHaveURL(/\/es\/contenido/)  // Localized pathname
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
})
```

---

## 8. Visual Regression Testing

### Playwright screenshot comparison

```ts
// tests/visual/feed.visual.ts
import { test, expect } from '@playwright/test'

test.describe('Visual regression', () => {
  test('feed page desktop', async ({ page }) => {
    await page.goto('/en/feed')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('feed-desktop.png', {
      maxDiffPixelRatio: 0.01,
    })
  })

  test('feed page mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/en/feed')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('feed-mobile.png', {
      maxDiffPixelRatio: 0.01,
    })
  })

  test('dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/en/feed')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('feed-dark.png', {
      maxDiffPixelRatio: 0.01,
    })
  })
})
```

### Updating snapshots

```bash
npx playwright test --update-snapshots
```

---

## 9. CI Integration

### GitHub Actions workflow

```yaml
# .github/workflows/web-tests.yml
name: Web Tests
on:
  pull_request:
    paths: ['./**', 'packages/**']

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web test:coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps
      - run: pnpm --filter web build
      - run: pnpm --filter web test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: ./playwright-report/

  lighthouse:
    runs-on: ubuntu-latest
    needs: [unit]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web build
      - run: pnpm --filter web start &
      - uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            http://localhost:3000/en
            http://localhost:3000/en/feed
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

### Lighthouse budget

```json
// ./lighthouse-budget.json
[{
  "path": "/*",
  "timings": [
    { "metric": "largest-contentful-paint", "budget": 2500 },
    { "metric": "interactive", "budget": 3800 },
    { "metric": "cumulative-layout-shift", "budget": 0.1 }
  ],
  "resourceSizes": [
    { "resourceType": "script", "budget": 300 },
    { "resourceType": "total", "budget": 800 }
  ]
}]
```
