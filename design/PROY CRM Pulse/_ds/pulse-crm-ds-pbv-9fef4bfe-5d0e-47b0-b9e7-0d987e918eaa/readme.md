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
