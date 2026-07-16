# Pulse CRM — Design System (portable guide)

> Single-file export of the Pulse CRM design system for reuse in other projects.
> Contains the full design language, design tokens (as CSS custom properties), and
> the component API/usage docs. Drop this file into any project as the design brief.
> Generated 2026-07-15.

---

# Pulse CRM — Design System

The design system for **Pulse CRM**, a modern CRM for sales teams. It gives design
agents everything needed to build well-branded Pulse interfaces and assets: tokens,
fonts, reusable component primitives, and a full web-app UI kit.

> **Provenance.** No source materials (codebase, Figma, brand kit, decks, logo) were
> provided — the brand brief was only the name *"Pulse CRM DS."* This system was
> authored from scratch as a coherent, opinionated CRM design language. Everything
> here is an original design decision, not a recreation of an existing product.
> If Pulse has real brand assets, share them and this system will be re-grounded on them.

---

## Product context

Pulse CRM is a sales workspace: reps manage **contacts**, move **deals** through a
**pipeline**, track **activity**, and report on performance. The interface is
**data-rich but calm** — dense enough to scan hundreds of records, quiet enough to
work in all day. Core surfaces represented in this system:

- **Web app** (the primary product) — Dashboard, Contacts, Pipeline (kanban), plus
  stubbed Inbox / Reports. See `ui_kits/web-app/`.

---

## Content fundamentals

How Pulse writes.

- **Voice:** clear, confident, low-jargon. Second person (“your pipeline”, “sign in
  to your workspace”). Sales-team-native but never pushy.
- **Casing:** **Sentence case** everywhere — buttons (“New deal”, “View all”), headings
  (“Pipeline by stage”), nav (“Contacts”). No Title Case, no ALL CAPS except the small
  overline/eyebrow labels (`QUALIFIED`, section kickers) which use uppercase + wide tracking.
- **Buttons are verbs:** “New deal”, “Create deal”, “Sign in”, “View pipeline”. Not
  “Submit”, not “OK”.
- **Numbers lead.** Money, rates, counts are first-class and always tabular
  (`$1.28M`, `42.6%`, `1,284 contacts`). Abbreviate large currency (`$284K`, `$1.28M`).
- **Time is relative and short:** “12m ago”, “2h ago”, “Today”, “Overdue”, “Tomorrow”.
- **Status is a single word:** Lead · Qualified · Proposal · Negotiation · Won · Lost.
- **Empty/precise, not cute.** Microcopy explains (“This can’t be undone.”), it doesn’t joke.
- **No emoji.** The brand does not use emoji anywhere in product UI.
- **Punctuation:** curly quotes in marketing copy (“…”), no trailing periods on button labels
  or short table cells; periods on full sentences (dialog body, descriptions).

Examples in use: `New deal` · `Delete deal?` / “This can’t be undone.” · `2 due today`
· `5d in stage` · `Follow up with Northwind on pricing`.

---

## Visual foundations

- **Color.** Indigo (`--brand` `#4F46E5`) is the single interactive/brand color — used for
  primary buttons, active nav, links, focus rings, and the wordmark. A violet accent
  (`--accent` `#7C3AED`) appears only in data-viz and the “pulse” motif. Neutrals are a
  **cool slate** ramp (`#F8FAFC → #0F172A`) for text, surfaces, and borders. Status uses
  four fixed hues: green (won/success), amber (warning/due), red (lost/overdue/danger),
  sky-blue (info/meeting). Backgrounds are flat — **page `#F8FAFC`, cards white**. No
  gradients in product UI (the one exception is the marketing login aside, a solid indigo
  panel with a single soft radial highlight).
- **Typography.** `Plus Jakarta Sans` for all UI (400–800). Display/headings are heavy
  (700–800) and tightly tracked (`-0.02em`); body is 14px/1.5 regular. `JetBrains Mono`
  for all numerics and identifiers (currency, %, dates, deal IDs) with `tabular-nums`.
  UI runs tight — 14px body, 13px table text, 12px captions. Min UI text 12px.
- **Spacing.** 4px base grid (`--space-*`). Comfortable-compact density: 11–14px cell
  padding, 16–24px gaps between cards, 18px card body padding.
- **Radii.** Subtle. 6px default (`--radius-md`, buttons/inputs/badges within reason),
  8px cards (`--radius-lg`), 12px modals (`--radius-xl`), full pills for badges/tags/avatars.
  Nothing sharp (0px) except table rules; nothing bubbly.
- **Borders.** Hairline `1px` slate borders carry most of the structure — `--border-default`
  (`#E2E8F0`) on cards/tables, `--border-subtle` (`#F1F5F9`) for internal dividers,
  `--border-strong` (`#CBD5E1`) on inputs and secondary buttons. Borders do more work
  than shadows here.
- **Shadows / elevation.** Cool-tinted (slate `rgba(15,23,42,…)`), soft, layered. Resting
  cards use `--shadow-xs`; hovered/raised cards `--shadow-md`; dialogs `--shadow-xl`.
  Never black, never harsh.
- **Backgrounds & imagery.** No photography or illustration in the product. Data
  visualization (stage bars, kanban) carries the visual interest. If imagery is ever
  added it should be cool-toned and restrained. No textures, no patterns, no grain.
- **Animation.** Fast and functional. `--duration-fast 120ms` for hover/press,
  `--duration-base 180ms` for dialogs, `--duration-slow 260ms` for bars filling. Standard
  ease `cubic-bezier(0.2,0,0,1)`; dialogs use a gentle `ease-out` pop (8px rise + slight
  scale). **No bounce, no infinite/decorative loops.**
- **Hover states.** Text/ghost controls → slate `--surface-sunken` fill + darker text.
  Primary button → one step darker indigo (`--brand-hover`). Cards → raise to `shadow-md`
  + stronger border. Table rows → `--surface-hover` tint; row actions fade in.
- **Press states.** Buttons nudge down `0.5px` (no shrink). Solid buttons go one step
  darker again (`--brand-active`).
- **Focus.** Always a 3px soft indigo ring (`--ring`), 2px offset for keyboard focus;
  danger controls get a red ring (`--ring-danger`).
- **Transparency / blur.** Used sparingly — only the dialog overlay (`rgba(15,23,42,0.45)`,
  no blur). Chrome is opaque.
- **Cards.** White surface, `1px` `--border-default`, `--radius-lg` (8px), `--shadow-xs`
  at rest. Optional header (title + subtitle + right-aligned actions, divided by a subtle
  rule) and footer (right-aligned actions on a faint `--surface-page` bar).
- **Layout rules.** Fixed 248px sidebar + 56px topbar; content scrolls, chrome doesn’t.
  Content capped at 1200px and centered.

---

## Iconography

- **System:** **Lucide** — line icons, `2px` stroke, 24px grid, round caps/joins,
  `currentColor` (so they inherit text color). This is the single icon language across
  nav, buttons, table cells, and cards.
- **In this repo:** the UI kit inlines a Lucide-style set in `ui_kits/web-app/icons.jsx`
  (`window.PulseIcon`) so the click-through kit needs zero runtime icon injection.
  **These are Lucide-equivalent glyphs, hand-inlined — a substitution.** In production,
  use the real [`lucide`](https://lucide.dev) package/CDN for the full set and pixel-exact paths.
- **Sizes:** 16px in dense table/inline contexts, 18px in nav and buttons, 15px for
  affix/leading icons.
- **The brand mark** is a pulse/heartbeat waveform (`assets/pulse-mark.svg`) paired with
  the “Pulse.” wordmark (`assets/pulse-wordmark.svg`). It doubles as the app icon.
- **No emoji. No unicode-glyph icons.** Everything is Lucide SVG.

### Logo / brand mark
No logo file was provided, so the brand is set as a **type wordmark** — “Pulse.” in
Plus Jakarta Sans ExtraBold (indigo period) — alongside a generic waveform mark.
Treat both as placeholders: if Pulse has a real logo, drop it into `assets/` and update
the wordmark cards and `AppShell`.

---

## Index / manifest

**Root**
- `styles.css` — the single entry point consumers link (import lines only).
- `readme.md` — this file.
- `SKILL.md` — Agent-Skill front matter for downloadable use.

**Tokens** (`tokens/`, all reached via `styles.css`)
- `fonts.css` — webfont loading (Plus Jakarta Sans + JetBrains Mono, via Google Fonts).
- `colors.css` — palettes + semantic aliases.
- `typography.css` — families, scale, weights, text roles.
- `layout.css` — spacing, radii, borders, shadows, motion, layout constants.
- `base.css` — element resets / typographic baseline.

**Components** (`components/`, each: `.jsx` + `.d.ts` + `.prompt.md` + a group card)
- `forms/` — **Button**, **IconButton**, **Input**, **Select**, **Checkbox**, **Switch**, **Textarea**
- `data/` — **Badge**, **Tag**, **Avatar**, **StatCard**, **ProgressBar**
- `feedback/` — **Dialog**, **Tooltip**, **Toast**
- `navigation/` — **Tabs**
- `layout/` — **Card**

**UI kits** (`ui_kits/`)
- `web-app/` — interactive Login → Dashboard / Contacts / Pipeline recreation. See its README.

**Foundations** (`guidelines/`) — specimen cards for the Design System tab (Colors, Type,
Spacing, Brand).

**Assets** (`assets/`) — `pulse-mark.svg`, `pulse-wordmark.svg`.

### Intentional additions
Authored from scratch (no source inventory), so the component set is the standard CRM
kit above. Two brand-specific choices worth noting: **StatCard** (dashboard KPI tile with
trend delta) and **Tag** vs **Badge** split (Tag = user-applied label, removable; Badge =
system status).

---

## Appendix A — Design tokens (CSS)

Paste these into a `styles.css` (or split across `tokens/*.css`) and reference the
custom properties throughout. Fonts load from Google Fonts.

### Fonts
```css
/* ============================================================
   Pulse CRM — Webfonts
   Plus Jakarta Sans (UI) + JetBrains Mono (data/numeric).
   Substitution note: no brand font files were provided, so
   these are loaded from Google Fonts as the working typefaces.
   Swap the @import for local @font-face rules if brand
   binaries become available.
   ============================================================ */

@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&family=JetBrains+Mono:wght@400;500;600&display=swap');
```

### Colors
```css
/* ============================================================
   Pulse CRM — Color tokens
   Base palettes + semantic aliases. Light-first.
   ============================================================ */

:root {
  /* ---- Brand: Indigo ------------------------------------- */
  --indigo-50:  #eef2ff;
  --indigo-100: #e0e7ff;
  --indigo-200: #c7d2fe;
  --indigo-300: #a5b4fc;
  --indigo-400: #818cf8;
  --indigo-500: #6366f1;
  --indigo-600: #4f46e5;  /* primary brand */
  --indigo-700: #4338ca;
  --indigo-800: #3730a3;
  --indigo-900: #312e81;
  --indigo-950: #1e1b4b;

  /* ---- Pulse accent: Violet (data-viz, live signals) ----- */
  --violet-50:  #f5f3ff;
  --violet-100: #ede9fe;
  --violet-200: #ddd6fe;
  --violet-400: #a78bfa;
  --violet-500: #8b5cf6;
  --violet-600: #7c3aed;

  /* ---- Neutral: Slate ------------------------------------ */
  --slate-50:  #f8fafc;
  --slate-100: #f1f5f9;
  --slate-200: #e2e8f0;
  --slate-300: #cbd5e1;
  --slate-400: #94a3b8;
  --slate-500: #64748b;
  --slate-600: #475569;
  --slate-700: #334155;
  --slate-800: #1e293b;
  --slate-900: #0f172a;
  --slate-950: #020617;
  --white: #ffffff;

  /* ---- Semantic palettes --------------------------------- */
  --green-50:  #ecfdf5;
  --green-100: #d1fae5;
  --green-500: #10b981;
  --green-600: #059669;
  --green-700: #047857;

  --amber-50:  #fffbeb;
  --amber-100: #fef3c7;
  --amber-500: #f59e0b;
  --amber-600: #d97706;
  --amber-700: #b45309;

  --red-50:  #fef2f2;
  --red-100: #fee2e2;
  --red-500: #ef4444;
  --red-600: #dc2626;
  --red-700: #b91c1c;

  --sky-50:  #eff6ff;
  --sky-100: #dbeafe;
  --sky-500: #3b82f6;
  --sky-600: #2563eb;
  --sky-700: #1d4ed8;

  /* ========================================================
     Semantic aliases — reference these in product UI.
     ======================================================== */

  /* Brand / interactive */
  --brand:            var(--indigo-600);
  --brand-hover:      var(--indigo-700);
  --brand-active:     var(--indigo-800);
  --brand-subtle:     var(--indigo-50);
  --brand-subtle-hover: var(--indigo-100);
  --brand-border:     var(--indigo-200);
  --brand-fg:         var(--white);          /* text on brand */
  --accent:           var(--violet-600);
  --accent-subtle:    var(--violet-50);

  /* Text */
  --text-primary:   var(--slate-900);
  --text-secondary: var(--slate-600);
  --text-muted:     var(--slate-400);
  --text-brand:     var(--indigo-600);
  --text-on-brand:  var(--white);
  --text-link:      var(--indigo-600);

  /* Surfaces */
  --surface-page:    var(--slate-50);
  --surface-card:    var(--white);
  --surface-sunken:  var(--slate-100);
  --surface-hover:   var(--slate-50);
  --surface-inverse: var(--slate-900);

  /* Borders / dividers */
  --border-subtle:  var(--slate-100);
  --border-default: var(--slate-200);
  --border-strong:  var(--slate-300);
  --border-focus:   var(--indigo-500);

  /* Status — foreground / background / border trios */
  --success-fg: var(--green-700);
  --success-bg: var(--green-50);
  --success-solid: var(--green-600);
  --success-border: var(--green-100);

  --warning-fg: var(--amber-700);
  --warning-bg: var(--amber-50);
  --warning-solid: var(--amber-500);
  --warning-border: var(--amber-100);

  --danger-fg: var(--red-700);
  --danger-bg: var(--red-50);
  --danger-solid: var(--red-600);
  --danger-border: var(--red-100);

  --info-fg: var(--sky-700);
  --info-bg: var(--sky-50);
  --info-solid: var(--sky-600);
  --info-border: var(--sky-100);

  /* Focus ring */
  --ring: 0 0 0 3px var(--indigo-200);
  --ring-danger: 0 0 0 3px var(--red-100);
}
```

### Typography
```css
/* ============================================================
   Pulse CRM — Typography tokens
   Plus Jakarta Sans for UI, JetBrains Mono for data/numeric.
   ============================================================ */

:root {
  /* Families */
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;

  /* Weights */
  --fw-regular:  400; /* @kind font */
  --fw-medium:   500; /* @kind font */
  --fw-semibold: 600; /* @kind font */
  --fw-bold:     700; /* @kind font */
  --fw-extrabold: 800; /* @kind font */

  /* Type scale (px) — CRM UI runs tight; body is 14. */
  --text-xs:   12px;
  --text-sm:   13px;
  --text-base: 14px;   /* default body */
  --text-md:   15px;
  --text-lg:   16px;
  --text-xl:   18px;
  --text-2xl:  22px;
  --text-3xl:  28px;
  --text-4xl:  36px;
  --text-5xl:  48px;

  /* Line heights */
  --leading-tight:  1.2;
  --leading-snug:   1.35;
  --leading-normal: 1.5;
  --leading-relaxed: 1.65;

  /* Letter spacing */
  --tracking-tight:  -0.02em;
  --tracking-snug:   -0.01em;
  --tracking-normal: 0;
  --tracking-wide:   0.04em;

  /* ---- Semantic text roles ---- */
  --display:   var(--fw-extrabold) var(--text-4xl)/var(--leading-tight) var(--font-sans);
  --heading:   var(--fw-bold) var(--text-2xl)/var(--leading-snug) var(--font-sans);
  --title:     var(--fw-semibold) var(--text-lg)/var(--leading-snug) var(--font-sans);
  --body:      var(--fw-regular) var(--text-base)/var(--leading-normal) var(--font-sans);
  --label:     var(--fw-medium) var(--text-sm)/var(--leading-snug) var(--font-sans);
  --caption:   var(--fw-medium) var(--text-xs)/var(--leading-snug) var(--font-sans);
  --overline:  var(--fw-semibold) var(--text-xs)/1 var(--font-sans);  /* + uppercase + tracking-wide */
}
```

### Spacing, radii, shadows, motion, layout
```css
/* ============================================================
   Pulse CRM — Spacing, radii, shadows, layout tokens
   4px base grid.
   ============================================================ */

:root {
  /* Spacing scale (4px base) */
  --space-0:  0;
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  /* Radii — subtle, 6px default */
  --radius-none: 0;
  --radius-sm:  4px;
  --radius-md:  6px;   /* inputs, buttons, badges */
  --radius-lg:  8px;   /* cards */
  --radius-xl:  12px;  /* modals, large panels */
  --radius-2xl: 16px;
  --radius-full: 9999px;

  /* Borders */
  --border-width: 1px;

  /* Shadows — cool-tinted, soft. Layered elevation. */
  --shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-md: 0 4px 8px -2px rgba(15, 23, 42, 0.10), 0 2px 4px -2px rgba(15, 23, 42, 0.06);
  --shadow-lg: 0 12px 20px -4px rgba(15, 23, 42, 0.12), 0 4px 8px -4px rgba(15, 23, 42, 0.06);
  --shadow-xl: 0 24px 40px -8px rgba(15, 23, 42, 0.18), 0 8px 16px -8px rgba(15, 23, 42, 0.08);

  /* Focus ring width reference used by components */
  --focus-ring-width: 3px;

  /* Layout constants */
  --sidebar-width: 248px;
  --topbar-height: 56px;
  --content-max: 1200px;

  /* Motion */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1); /* @kind other */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1); /* @kind other */
  --duration-fast: 120ms; /* @kind other */
  --duration-base: 180ms; /* @kind other */
  --duration-slow: 260ms; /* @kind other */
}
```

---

## Appendix B — Component library (API & usage)

Each primitive is a self-contained React component styled entirely via the tokens above.

### Forms

#### Button

Action trigger — use for any click action; `primary` for the single main action per view, `secondary` for supporting actions, `ghost` for low-emphasis/toolbar actions, `danger` for destructive ones.

```jsx
<Button variant="primary" iconLeft={<PlusIcon />}>New deal</Button>
<Button variant="secondary" size="sm">Filter</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="danger">Delete</Button>
```

Variants: `primary | secondary | ghost | danger`. Sizes: `sm | md | lg`. Props: `fullWidth`, `iconLeft`, `iconRight`, `disabled`, plus native button attrs. Only one primary button per section.

#### Checkbox

Checkbox for multi-select lists, table row selection, and opt-in settings.

```jsx
<Checkbox label="Email me about new leads" defaultChecked />
<Checkbox label="Include closed deals" description="Won and lost from the last 12 months" />
<Checkbox aria-label="Select row" />
```

Props: `label`, `description`, plus native checkbox attrs (`checked`, `defaultChecked`, `onChange`, `disabled`).

#### IconButton

Icon-only button for toolbars, table row actions, and dismiss controls. Always pass `aria-label`.

```jsx
<IconButton aria-label="More actions"><MoreIcon /></IconButton>
<IconButton variant="outline" aria-label="Filter"><FilterIcon /></IconButton>
<IconButton variant="solid" aria-label="Add"><PlusIcon /></IconButton>
```

Variants: `ghost | outline | solid`. Sizes: `sm | md | lg`.

#### Input

Labeled single-line text field. Handles label, helper/error text, and leading/trailing affixes (search icon, currency symbol, etc).

```jsx
<Input label="Company" placeholder="Acme Inc." required />
<Input label="Deal value" prefix="$" defaultValue="24,000" />
<Input label="Email" error="Enter a valid email" defaultValue="bad@" />
<Input size="sm" prefix={<SearchIcon />} placeholder="Search contacts" />
```

Props: `label`, `hint`, `error`, `required`, `size` (`sm|md`), `prefix`, `suffix`, plus native input attrs. `error` overrides `hint` and applies the danger style.

#### Select

Styled dropdown built on a native `<select>`. Pass options as strings or `{value,label}`.

```jsx
<Select label="Stage" options={['Lead','Qualified','Proposal','Won']} />
<Select label="Owner" placeholder="Assign to…" options={[{value:'am',label:'Ana M.'},{value:'jt',label:'Jon T.'}]} />
<Select size="sm" options={['Newest','Oldest']} />
```

Props: `label`, `size` (`sm|md`), `options`, `placeholder`, plus native select attrs.

#### Switch

Toggle for settings that apply immediately (notifications, auto-assign, visibility).

```jsx
<Switch label="Auto-assign new leads" defaultChecked />
<Switch label="Notify me on Slack" />
```

Props: `label`, plus native checkbox attrs (`checked`, `defaultChecked`, `onChange`, `disabled`). Use Checkbox instead when the choice is part of a form the user submits.

#### Textarea

Multi-line input for notes, activity log entries, and descriptions. Resizes vertically.

```jsx
<Textarea label="Note" placeholder="Log a call or add context…" />
<Textarea label="Description" hint="Visible to your team" rows={5} />
```

Props: `label`, `hint`, `error`, plus native textarea attrs (`rows`, `maxLength`, …).


### Data

#### Avatar

Person avatar for contacts, deal owners, comment authors. Shows an image, or colored initials derived deterministically from `name`.

```jsx
<Avatar name="Ana Márquez" status="online" />
<Avatar name="Jon Tran" src="/photos/jon.jpg" size="lg" />
<Avatar name="Priya Shah" size="sm" />
```

Sizes: `xs | sm | md | lg | xl`. `status`: `online | away | offline`. Color is auto-picked from the name — same name always maps to the same color.

#### Badge

Small pill for status and category — deal stage, lead health, sync state. Pair `tone` with meaning (success = won, danger = lost/overdue).

```jsx
<Badge tone="success" dot>Won</Badge>
<Badge tone="warning">Follow-up due</Badge>
<Badge tone="brand" variant="soft">Qualified</Badge>
<Badge tone="neutral" variant="outline">Draft</Badge>
```

Tones: `neutral | brand | success | warning | danger | info`. Variants: `soft | solid | outline`. Add `dot` for a status dot.

#### ProgressBar

Linear progress / quota bar — goal attainment, sales quota, import progress.

```jsx
<ProgressBar label="Q3 quota" value={68} showValue />
<ProgressBar value={92} tone="success" size="sm" />
<ProgressBar label="Deals closing" value={7} max={12} showValue format={(v,m)=>`${v}/${m}`} />
```

Props: `value`, `max`, `label`, `showValue`, `tone` (`brand|accent|success|warning|danger`), `size` (`sm|md`), `format`.

#### StatCard

KPI tile for dashboards — one metric with a trend delta. Format `value` yourself (currency, %, counts).

```jsx
<StatCard label="Pipeline value" value="$1.28M" delta={12} note="vs last month" icon={<TrendIcon/>} />
<StatCard label="Win rate" value="42.6%" delta={-3} note="vs last quarter" />
<StatCard label="Open deals" value="184" />
```

Props: `label`, `value`, `delta` (signed %, colors + arrow auto), `note`, `icon`.

#### Tag

User-applied labels and segments — contact tags, saved-filter chips. Unlike Badge (status), Tag is neutral and often removable.

```jsx
<Tag color="#7c3aed">Enterprise</Tag>
<Tag color="#10b981" onRemove={() => remove(id)}>Champion</Tag>
<Tag>Newsletter</Tag>
```

Props: `color` (hex swatch), `onRemove` (adds a × button).


### Feedback

#### Dialog

Centered modal for create/edit forms and confirmations. You control `open`; it closes on Escape, overlay click, and the × — all via `onClose`.

```jsx
<Dialog
  open={open}
  onClose={() => setOpen(false)}
  title="Delete deal?"
  description="This can't be undone."
  footer={<><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button><Button variant="danger">Delete</Button></>}
>
  Acme renewal ($84,000) will be permanently removed.
</Dialog>
```

Props: `open`, `onClose`, `title`, `description`, `size` (`sm|md|lg`), `footer`, `children`.

#### Toast

Transient confirmation/error notification. Presentational only — you own placement (usually bottom-right, stacked), enter/exit animation, and auto-dismiss timing.

```jsx
<Toast tone="success" title="Deal saved" description="Acme renewal moved to Proposal." onClose={dismiss} />
<Toast tone="danger" title="Sync failed" description="Reconnect your Gmail account." onClose={dismiss} />
```

Tones: `success | danger | warning | info`. Props: `title`, `description`, `onClose`.

#### Tooltip

Short hover/focus hint. Wrap the trigger element; the bubble shows on hover and keyboard focus.

```jsx
<Tooltip label="Sync with Gmail">
  <IconButton aria-label="Sync"><MailIcon/></IconButton>
</Tooltip>
<Tooltip label="Weighted by probability" side="right"><InfoIcon/></Tooltip>
```

Props: `label`, `side` (`top|bottom|right`). Keep labels to a few words.


### Navigation

#### Tabs

Underline tab bar for switching views inside a page — contact detail sections, pipeline filters. Renders the bar only; you render the panel for the active value.

```jsx
<Tabs
  tabs={[{value:'all',label:'All',count:184},{value:'mine',label:'My deals',count:32},{value:'won',label:'Won'}]}
  defaultValue="all"
  onChange={setView}
/>
```

Controlled (`value` + `onChange`) or uncontrolled (`defaultValue`). Tab items support `icon` and `count`.


### Layout

#### Card

Surface container for grouped content — the base panel behind lists, forms, charts. Set `flush` when the body holds a table or list that should reach the card edges.

```jsx
<Card title="Recent activity" subtitle="Last 7 days" actions={<Button size="sm" variant="ghost">View all</Button>}>
  …content…
</Card>

<Card title="Contacts" flush>
  <table>…</table>
</Card>

<Card title="New deal" footer={<><Button variant="ghost">Cancel</Button><Button>Save</Button></>}>
  …form…
</Card>
```

Props: `title`, `subtitle`, `actions`, `footer`, `elevation` (`flat|default|raised`), `flush`.

