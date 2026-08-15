# Design System Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's ad-hoc styling with a single token system (Tailwind v4 `@theme`), then restyle all five routes to the approved editorial-minimal mockup, closing the fifteen defects listed in the spec.

**Architecture:** The IA does not change — same five routes, same sidebar, same data per page. Work proceeds bottom-up: tokens first (Task 1), then pure helpers with unit tests (Task 2), then shared UI primitives (Task 3), then the shell (Task 4), then one route per task (Tasks 5–9), then cleanup (Task 10). Task 1 keeps every current colour name alive as an alias so the app never stops building mid-refactor; Task 10 deletes the aliases once no file references them.

**Tech Stack:** Next.js 15 (App Router), React 19, Prisma 5 + SQLite, **Tailwind v4** (migrated from v3 in Task 1), Radix primitives via shadcn/ui components already copied into `app/components/ui/`, lucide-react, `next/font/google`, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-15-design-system-refactor-design.md`
**Approved mockup:** https://claude.ai/code/artifact/dff2205a-5614-4c43-99d7-1228a968733d

## Global Constraints

- **Desktop only.** No responsive work, no breakpoint variants, no mobile layouts. Fixed sidebar, fixed grid behaviour.
- **No dark mode.** Do not add `next-themes`, a `dark:` variant, or a second palette.
- **No new runtime dependencies.** Motion is CSS-only. Toasts are not installed — errors render inline. The only dependency changes allowed are the Tailwind v4 packages in Task 1 and the removals in Task 10.
- **No arbitrary values in application code.** Every size, radius, colour and space comes from a token utility. `text-[13.5px]`, `p-[18px]`, `rounded-[14px]` and friends are defects, not shortcuts. The only exception is a one-off `w-[220px]`/`w-[296px]` for the two fixed layout columns named below.
- **Spacing scale**, from Tailwind's default `--spacing: 0.25rem`: `gap-1`=4px, `gap-2`=8px, `gap-3`=12px, `gap-4`=16px, `gap-6`=24px, `gap-8`=32px, `gap-12`=48px, `gap-16`=64px. Use only these steps.
- **Type scale**, six steps only: `text-display` (32/700/−.02em), `text-h2` (20/650/−.01em), `text-h3` (15/600), `text-body` (14/400), `text-small` (13/400), `text-label` (11/600/uppercase/.08em). Auction density adds `text-body-dense` (13) and `text-small-dense` (12).
- **Radius scale**, four steps only: `rounded-sm` 6px (badges, chips), `rounded-md` 10px (inputs, buttons), `rounded-lg` 14px (cards), `rounded-xl` 20px (dialogs).
- **No shadows on cards.** Cards get `border border-line`. `shadow-overlay` is allowed only on dialogs and dropdowns.
- **Motion:** `ease-standard` = `cubic-bezier(0.2, 0, 0, 1)`, `duration-fast` = 120ms (hover), `duration-base` = 180ms (overlays), 400ms for credit bar width. Always paired with a `transition-*` utility naming the specific property — never `transition-all`.
- **Numbers** use `font-mono font-medium tabular-nums`. Never `font-bold` on mono.
- **Role colour mapping** (desaturated from the current palette): P=`#0F7B62`, D=`#3D4EAC`, C=`#A66A11`, A=`#C2452D`, with softs `#E7F2EE`, `#EAECF7`, `#F7EFE2`, `#F9EAE6`.
- **`--danger` `#B3261E` is never a role colour and `--color-role-a` is never a destructive colour.** This separation is defect 8; do not reintroduce the overlap.
- **Fixed layout widths:** sidebar `220px`, auction credits column `296px`, settings section column `640px`, main content `max-w-[1240px]` with `px-12` (48px) and `pt-10` (40px).
- **UI language is Italian.** All user-facing strings stay Italian, as today. Code, comments and commit messages are English.
- **No native dialogs.** `alert()`, `confirm()` and `prompt()` must not exist in the codebase when Task 10 finishes.
- Prisma schema, API routes and data-fetching functions in `lib/` are **out of scope** except where a task explicitly says otherwise.

---

## File Structure

**New files:**

| File | Responsibility |
|---|---|
| `lib/credits.ts` | `spendPercent()` — the one place a credits/roster ratio becomes a bar width |
| `lib/credits.test.ts` | Unit tests for the above |
| `lib/filterParams.ts` | Read/write the Listone filter state as a query string; role toggling; active-filter count |
| `lib/filterParams.test.ts` | Unit tests for the above |
| `app/components/PageHeader.tsx` | Title + subtitle + hairline, used by all five routes |
| `app/components/EmptyState.tsx` | Icon + title + description + optional action |
| `app/components/InlineError.tsx` | Error banner for forms and dialogs |
| `app/components/ConfirmDialog.tsx` | Radix dialog with typed confirmation, for irreversible actions |
| `app/components/Skeleton.tsx` | Shimmer bar + `SkeletonRows` list, used by every `loading.tsx` |
| `app/components/TeamCreditsPanel.tsx` | Auction sticky right column |
| `app/players/ListoneToolbar.tsx` | Merged search + filters, shared by Listone and Wishlist |
| `app/(each route)/loading.tsx` | Five route-level skeletons |

**Modified files:**

| File | Change |
|---|---|
| `package.json`, `postcss.config.mjs`, `components.json` | Tailwind v4 migration |
| `app/globals.css` | The entire token system lives here |
| `lib/fonts.ts` | Add Manrope weight 400 |
| `lib/roleStyles.ts` | Desaturated colours, filled-pill variant, chip styles absorbed from two components |
| `app/layout.tsx` | Shell geometry |
| `app/components/Sidebar.tsx` | Gradient card removed |
| `app/page.tsx` | Two-column grid, WishlistPanel removed |
| `app/components/AstaSearch.tsx` | Inline results |
| `app/players/page.tsx`, `PlayersTable.tsx` | Toolbar wiring, table restyle, hover actions |
| `app/watchlist/page.tsx` | Mounts the shared toolbar |
| `app/teams/page.tsx`, `TeamCard.tsx` | Auto-fill grid, credits promoted |
| `app/settings/*.tsx` | Cards become stacked sections |
| `app/players/WipePlayersButton.tsx` | Tokens + ConfirmDialog |

**Deleted files:**

| File | Reason |
|---|---|
| `tailwind.config.ts` | v4 configures in CSS |
| `app/components/WishlistPanel.tsx` | Wishlist leaves the auction page |
| `app/watchlist/RoleFilter.tsx` | Absorbed by `ListoneToolbar` |
| `app/players/PlayerSearchBar.tsx`, `app/players/FilterPanel.tsx` | Merged into `ListoneToolbar` |

---

## Verification Approach

Read this once before starting; every task's verification steps assume it.

This is a visual refactor. Most of it has no assertable behaviour, so the plan is deliberately honest about what is tested and what is looked at:

- **Pure logic gets real TDD.** Task 2 extracts the three genuinely testable pieces (`spendPercent`, filter-param serialisation, role-pill selection) and unit-tests them with Vitest. Those are the only new tests in this plan.
- **No component-testing stack is added.** `@testing-library/react` and jsdom are not installed, and installing them is out of scope. Do not add them.
- **Everything else is verified by three gates**, run at the end of every task:
  1. `npx tsc --noEmit` — types
  2. `npm run test` — the existing suite plus Task 2's additions, never regressed
  3. `npm run build` — the production build, which is also where Tailwind reports unknown utilities
- **Plus a browser check.** Each UI task lists exactly what to look at on which route. Run `npm run dev`, open the route, compare against the mockup section named in the task. Do not report a task complete without having looked at it in the browser.

If a browser check fails, that is a task failure — fix it before committing, don't note it and move on.

---

### Task 1: Tailwind v4 migration and the token system

Foundational. Nothing else in this plan can be done first. The app must look **exactly as it does today** when this task ends — this is a plumbing change, not a visual one. Every current colour name survives as an alias so no component breaks; Task 10 removes the aliases.

**Files:**
- Modify: `package.json`, `postcss.config.mjs`, `components.json`, `app/globals.css`, `lib/fonts.ts`
- Delete: `tailwind.config.ts`

**Interfaces:**
- Consumes: nothing
- Produces: the token utilities every later task uses — colours `paper` `surface` `surface-sunk` `ink` `ink-2` `ink-3` `line` `line-strong` `accent` `accent-hover` `accent-bg` `danger` `danger-bg` `danger-line` `role-p` `role-p-soft` `role-d` `role-d-soft` `role-c` `role-c-soft` `role-a` `role-a-soft`; text sizes `display` `h2` `h3` `body` `small` `label` `body-dense` `small-dense`; radii `sm` `md` `lg` `xl`; `shadow-overlay`; `ease-standard`; `duration-fast` `duration-base`

- [ ] **Step 1: Install the v4 packages**

v4 replaces the PostCSS plugin and handles vendor prefixing itself, so `autoprefixer` goes.

```bash
npm install tailwindcss@^4 @tailwindcss/postcss@^4
npm uninstall autoprefixer
```

- [ ] **Step 2: Point PostCSS at the new plugin**

Replace the whole of `postcss.config.mjs`:

```js
export default {
  plugins: { "@tailwindcss/postcss": {} },
};
```

- [ ] **Step 3: Add Manrope weight 400**

`lib/fonts.ts` currently starts Manrope at 500, which is why every text looks bold (defect 2). Replace the `manrope` export:

```ts
export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});
```

Leave the `jetbrainsMono` export untouched.

- [ ] **Step 4: Write the token system**

Replace the entire contents of `app/globals.css` with the following. Read the three comment blocks — they explain the parts that are not obvious.

```css
@import "tailwindcss";

@theme {
  /* ── colour ───────────────────────────────────────────── */
  --color-paper: #fbfbfa;
  --color-surface: #ffffff;
  --color-surface-sunk: #f4f4f2;
  --color-ink: #16161a;
  --color-ink-2: #5c5c66;
  --color-ink-3: #9a9aa3;
  --color-line: #e6e6e2;
  --color-line-strong: #d4d4ce;
  --color-accent: #3b3a8f;
  --color-accent-hover: #2f2e77;
  --color-accent-bg: #eae9f5;
  --color-danger: #b3261e;
  --color-danger-bg: #fbefed;
  --color-danger-line: #e9cdc9;

  --color-role-p: #0f7b62;
  --color-role-p-soft: #e7f2ee;
  --color-role-d: #3d4eac;
  --color-role-d-soft: #eaecf7;
  --color-role-c: #a66a11;
  --color-role-c-soft: #f7efe2;
  --color-role-a: #c2452d;
  --color-role-a-soft: #f9eae6;

  /* ── typography ───────────────────────────────────────── */
  --font-sans: var(--font-manrope), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-jbmono), ui-monospace, monospace;

  --text-display: 2rem;
  --text-display--line-height: 1.15;
  --text-display--letter-spacing: -0.02em;
  --text-display--font-weight: 700;

  --text-h2: 1.25rem;
  --text-h2--line-height: 1.3;
  --text-h2--letter-spacing: -0.01em;
  --text-h2--font-weight: 650;

  --text-h3: 0.9375rem;
  --text-h3--line-height: 1.4;
  --text-h3--font-weight: 600;

  --text-body: 0.875rem;
  --text-body--line-height: 1.55;

  --text-small: 0.8125rem;
  --text-small--line-height: 1.5;

  --text-label: 0.6875rem;
  --text-label--line-height: 1.4;
  --text-label--letter-spacing: 0.08em;
  --text-label--font-weight: 600;

  /* Auction density only. Same scale, two steps tighter. */
  --text-body-dense: 0.8125rem;
  --text-body-dense--line-height: 1.5;
  --text-small-dense: 0.75rem;
  --text-small-dense--line-height: 1.45;

  /* ── shape ────────────────────────────────────────────── */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  /* Cards use a hairline, never a shadow. This is for things that
     genuinely float: dialogs and dropdowns. */
  --shadow-overlay:
    0 1px 2px rgb(22 22 26 / 0.06),
    0 16px 40px -12px rgb(22 22 26 / 0.22);

  /* ── motion ───────────────────────────────────────────── */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --duration-fast: 120ms;
  --duration-base: 180ms;
}

/* ─────────────────────────────────────────────────────────
   LEGACY ALIASES — deleted in Task 10.
   These keep every component that still uses the old colour
   names building while the routes are migrated one at a time.
   Do not use any of these names in new code.
   ───────────────────────────────────────────────────────── */
@theme {
  --color-page: var(--color-paper);
  --color-surface-2: var(--color-surface-sunk);
  --color-ink-dim: var(--color-ink-2);
  --color-ink-faint: var(--color-ink-3);
  --color-border: var(--color-line);
  --color-input: var(--color-line);
  --color-ring: var(--color-accent);
  --color-background: var(--color-paper);
  --color-foreground: var(--color-ink);
  --color-card: var(--color-surface);
  --color-card-foreground: var(--color-ink);
  --color-popover: var(--color-surface);
  --color-popover-foreground: var(--color-ink);
  --color-primary: var(--color-accent);
  --color-primary-foreground: #ffffff;
  --color-secondary: var(--color-surface-sunk);
  --color-secondary-foreground: var(--color-ink);
  --color-muted: var(--color-surface-sunk);
  --color-muted-foreground: var(--color-ink-2);
  --color-accent-foreground: var(--color-accent);
  --color-destructive: var(--color-danger);
  --color-destructive-foreground: #ffffff;
  --color-indigo: var(--color-accent);
  --color-indigo-soft: var(--color-accent-bg);
  --color-teal: var(--color-role-p);
  --color-teal-soft: var(--color-role-p-soft);
  --color-amber: var(--color-role-c);
  --color-amber-soft: var(--color-role-c-soft);
  --color-coral: var(--color-role-a);
  --color-coral-soft: var(--color-role-a-soft);
}

/* Legacy gradients — the only consumers are the sidebar status card and the
   settings icon badges, both removed by Task 9. Deleted in Task 10. */
@utility bg-lavender {
  background-image: linear-gradient(160deg, #e4e1fa, #f7f5fe);
}
@utility bg-peach {
  background-image: linear-gradient(160deg, #fce0d6, #fcedea);
}
@utility bg-mint {
  background-image: linear-gradient(160deg, #d7f3e1, #eafbf0);
}

@layer base {
  /* v4 changed the default border colour to currentColor. Without this the
     bare `border` class in the shadcn components would draw in the text
     colour. Remove this block only when no bare `border` utility is left. */
  *,
  ::after,
  ::before {
    border-color: var(--color-line);
  }

  body {
    background-color: var(--color-paper);
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-size: var(--text-body);
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }

  h1,
  h2,
  h3,
  h4 {
    text-wrap: balance;
  }

  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Delete the v3 config**

v4 scans the project automatically, so the `content` array — and the comment about `lib/` being easy to miss — is obsolete.

```bash
rm tailwind.config.ts
```

- [ ] **Step 6: Unpin shadcn from the deleted config**

In `components.json`, set the tailwind config path to an empty string. Leave every other key as-is.

```json
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
```

- [ ] **Step 7: Verify the build and the suite**

```bash
npx tsc --noEmit && npm run test && npm run build
```

Expected: all three pass. A build failure naming an unknown utility means an alias is missing from Step 4 — add it to the legacy block rather than editing the component.

- [ ] **Step 8: Verify in the browser that nothing moved**

```bash
npm run dev
```

Visit `/`, `/players`, `/teams`, `/watchlist`, `/settings`. Every page must look **the same as before this task** apart from four intended shifts: text is slightly lighter (weight 400 now exists), colours are slightly deeper (the desaturated role palette), corner radii are slightly tighter (`rounded-lg/md/sm` move from 16/14/12px to 14/10/6px), and card/dialog shadows switch from the old tinted values to Tailwind's stock shadow (`--shadow-overlay` is the only shadow token this task defines; unmigrated `shadow-sm/md/lg` classes fall back to Tailwind's generic values until their route task removes them). Unlike colours, radius and shadow utility class names are unchanged between the old and new scale, so there is no alias that can hold two pixel values under one class name — this delta is accepted for the routes that haven't been migrated yet, and disappears as each route task (4–9) lands. Nothing may be unstyled, mispositioned, or missing a background.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json postcss.config.mjs components.json app/globals.css lib/fonts.ts
git rm tailwind.config.ts
git commit -m "build: migrate to Tailwind v4 and define the design tokens

Config moves from tailwind.config.ts into an @theme block in globals.css.
Adds the editorial-minimal palette, a six-step type scale, four radii and
the motion tokens. Manrope gains weight 400, which the scale needs and the
old font config never loaded.

Every current colour name survives as an alias so the routes can migrate
one at a time; the aliases come out once nothing references them."
```

---

### Task 2: Pure helpers, with tests

The only genuinely testable logic in this refactor. Extracting it also removes three duplications.

**Files:**
- Create: `lib/credits.ts`, `lib/credits.test.ts`, `lib/filterParams.ts`, `lib/filterParams.test.ts`
- Modify: `lib/roleStyles.ts`
- Test: `lib/credits.test.ts`, `lib/filterParams.test.ts`

**Interfaces:**
- Consumes: `Role`, `ROLE_ORDER`, `parseRoleParam` from `lib/roles.ts` (all already exist)
- Produces:
  - `spendPercent(spent: number, total: number): number` — integer 0–100
  - `type PlayerFilterState = { search: string; role: Role[]; serieATeam: string; freeAgentOnly: boolean; starterOnly: boolean; watchlistOnly: boolean }`
  - `readFilterState(params: URLSearchParams): PlayerFilterState`
  - `readSearchParams(params: Record<string, string | undefined>): PlayerFilterState`
  - `writeFilterState(state: PlayerFilterState): string`
  - `toggleRole(roles: Role[], role: Role): Role[]`
  - `activeFilterCount(state: PlayerFilterState): number`
  - `EMPTY_FILTER_STATE: PlayerFilterState`
  - `rolePillClass(role: Role, count: number, limit: number): string`
  - `ROLE_BADGE_BG`, `ROLE_PILL_BG`, `ROLE_PILL_FULL`, `ROLE_CHIP_ON`: `Record<Role, string>`

- [ ] **Step 1: Write the failing test for `spendPercent`**

Create `lib/credits.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { spendPercent } from "@/lib/credits";

describe("spendPercent", () => {
  it("returns the rounded percentage of the total", () => {
    expect(spendPercent(118, 500)).toBe(24);
  });

  it("returns 0 when the total is zero", () => {
    expect(spendPercent(0, 0)).toBe(0);
  });

  it("returns 0 for a negative total rather than a negative width", () => {
    expect(spendPercent(10, -5)).toBe(0);
  });

  it("clamps above 100 so an overspent team cannot overflow its bar", () => {
    expect(spendPercent(600, 500)).toBe(100);
  });

  it("clamps below 0", () => {
    expect(spendPercent(-20, 500)).toBe(0);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run lib/credits.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/credits"`

- [ ] **Step 3: Implement `spendPercent`**

Create `lib/credits.ts`:

```ts
/**
 * Percentage of `total` represented by `spent`, as an integer 0-100.
 *
 * Callers use the result directly as a CSS width, so the clamping matters:
 * a team can be overspent (cost is not validated against remaining credits,
 * only warned about in AssignDialog), and a league can exist with zero teams
 * or zero credits. Neither may produce a bar that overflows or inverts.
 */
export function spendPercent(spent: number, total: number): number {
  if (total <= 0) return 0;
  const pct = Math.round((spent / total) * 100);
  return Math.min(100, Math.max(0, pct));
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run lib/credits.test.ts`
Expected: PASS, 5 tests

- [ ] **Step 5: Write the failing tests for the filter params**

Create `lib/filterParams.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  readFilterState,
  readSearchParams,
  writeFilterState,
  toggleRole,
  activeFilterCount,
  EMPTY_FILTER_STATE,
} from "@/lib/filterParams";

describe("readFilterState", () => {
  it("returns the empty state for an empty query string", () => {
    expect(readFilterState(new URLSearchParams())).toEqual(EMPTY_FILTER_STATE);
  });

  it("reads every field", () => {
    const params = new URLSearchParams(
      "search=lauta&role=A,C&serieATeam=Inter&freeAgentOnly=true&starterOnly=true&watchlistOnly=true"
    );
    expect(readFilterState(params)).toEqual({
      search: "lauta",
      role: ["A", "C"],
      serieATeam: "Inter",
      freeAgentOnly: true,
      starterOnly: true,
      watchlistOnly: true,
    });
  });

  it("drops invalid roles", () => {
    expect(readFilterState(new URLSearchParams("role=A,X,D")).role).toEqual(["A", "D"]);
  });

  it("treats any value other than 'true' as false", () => {
    expect(readFilterState(new URLSearchParams("freeAgentOnly=1")).freeAgentOnly).toBe(false);
  });
});

describe("readSearchParams", () => {
  it("reads Next's searchParams shape", () => {
    expect(readSearchParams({ role: "A,C", serieATeam: "Inter" })).toEqual({
      ...EMPTY_FILTER_STATE,
      role: ["A", "C"],
      serieATeam: "Inter",
    });
  });

  it("drops undefined values instead of stringifying them", () => {
    // URLSearchParams would turn `{ search: undefined }` into "search=undefined",
    // which then filters the player list by the literal text "undefined".
    expect(readSearchParams({ search: undefined }).search).toBe("");
  });
});

describe("writeFilterState", () => {
  it("omits empty and false fields so the URL stays clean", () => {
    expect(writeFilterState(EMPTY_FILTER_STATE)).toBe("");
  });

  it("serialises roles as a comma-separated list", () => {
    expect(writeFilterState({ ...EMPTY_FILTER_STATE, role: ["A", "C"] })).toBe("role=A%2CC");
  });

  it("round-trips through readFilterState", () => {
    const state = {
      search: "lauta",
      role: ["A", "C"] as const,
      serieATeam: "Inter",
      freeAgentOnly: true,
      starterOnly: false,
      watchlistOnly: true,
    };
    expect(readFilterState(new URLSearchParams(writeFilterState({ ...state, role: [...state.role] })))).toEqual({
      ...state,
      role: [...state.role],
    });
  });
});

describe("toggleRole", () => {
  it("adds a role that is not selected", () => {
    expect(toggleRole(["A"], "C")).toEqual(["A", "C"]);
  });

  it("removes a role that is selected", () => {
    expect(toggleRole(["A", "C"], "A")).toEqual(["C"]);
  });
});

describe("activeFilterCount", () => {
  it("is 0 for the empty state", () => {
    expect(activeFilterCount(EMPTY_FILTER_STATE)).toBe(0);
  });

  it("counts each selected role separately", () => {
    expect(activeFilterCount({ ...EMPTY_FILTER_STATE, role: ["A", "C"] })).toBe(2);
  });

  it("counts a team and each active toggle", () => {
    expect(
      activeFilterCount({
        ...EMPTY_FILTER_STATE,
        serieATeam: "Inter",
        freeAgentOnly: true,
        watchlistOnly: true,
      })
    ).toBe(3);
  });

  it("ignores search, which has its own visible input", () => {
    expect(activeFilterCount({ ...EMPTY_FILTER_STATE, search: "lauta" })).toBe(0);
  });
});
```

- [ ] **Step 6: Run them and watch them fail**

Run: `npx vitest run lib/filterParams.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/filterParams"`

- [ ] **Step 7: Implement the filter params module**

Create `lib/filterParams.ts`. This is the single source of truth for the Listone query string — `PlayerSearchBar`, `FilterPanel` and `RoleFilter` each hand-rolled a piece of it today.

```ts
import { parseRoleParam, type Role } from "@/lib/roles";

export type PlayerFilterState = {
  search: string;
  role: Role[];
  serieATeam: string;
  freeAgentOnly: boolean;
  starterOnly: boolean;
  watchlistOnly: boolean;
};

export const EMPTY_FILTER_STATE: PlayerFilterState = {
  search: "",
  role: [],
  serieATeam: "",
  freeAgentOnly: false,
  starterOnly: false,
  watchlistOnly: false,
};

/** Boolean params are the string "true" or absent. Nothing else is truthy. */
const BOOLEAN_KEYS = ["freeAgentOnly", "starterOnly", "watchlistOnly"] as const;

export function readFilterState(params: URLSearchParams): PlayerFilterState {
  return {
    search: params.get("search") ?? "",
    role: parseRoleParam(params.get("role")),
    serieATeam: params.get("serieATeam") ?? "",
    freeAgentOnly: params.get("freeAgentOnly") === "true",
    starterOnly: params.get("starterOnly") === "true",
    watchlistOnly: params.get("watchlistOnly") === "true",
  };
}

/**
 * Serialises to a query string with empty and false fields omitted, so a
 * cleared filter panel produces a bare pathname rather than a trail of
 * `?role=&serieATeam=`. Key order is fixed to keep URLs stable across
 * renders (and the round-trip test meaningful).
 */
export function writeFilterState(state: PlayerFilterState): string {
  const params = new URLSearchParams();
  if (state.search) params.set("search", state.search);
  if (state.role.length > 0) params.set("role", state.role.join(","));
  if (state.serieATeam) params.set("serieATeam", state.serieATeam);
  for (const key of BOOLEAN_KEYS) {
    if (state[key]) params.set(key, "true");
  }
  return params.toString();
}

/**
 * Same as readFilterState, for the shape Next hands a page as `searchParams`.
 * Undefined values are dropped rather than passed to URLSearchParams, which
 * would stringify them into the literal "undefined".
 */
export function readSearchParams(
  params: Record<string, string | undefined>
): PlayerFilterState {
  const defined = Object.entries(params).filter(
    (entry): entry is [string, string] => entry[1] !== undefined
  );
  return readFilterState(new URLSearchParams(defined));
}

export function toggleRole(roles: Role[], role: Role): Role[] {
  return roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
}

/**
 * How many filter chips to show. Search is excluded: it has its own always
 * visible input, so echoing it as a removable chip would be redundant.
 */
export function activeFilterCount(state: PlayerFilterState): number {
  return (
    state.role.length +
    (state.serieATeam ? 1 : 0) +
    BOOLEAN_KEYS.filter((key) => state[key]).length
  );
}
```

- [ ] **Step 8: Run them and watch them pass**

Run: `npx vitest run lib/filterParams.test.ts`
Expected: PASS, 10 tests

- [ ] **Step 9: Rewrite the role styles onto the new tokens**

Replace the entire contents of `lib/roleStyles.ts`. `ROLE_CHIP_ON` is lifted verbatim from the two copies in `FilterPanel.tsx:8` and `RoleFilter.tsx:6` (defect 15) — those files are deleted in Tasks 6 and 7.

Note that every class name is a complete literal string: Tailwind's scanner cannot see interpolated names, so these maps must never be built by concatenation.

```ts
import type { Role } from "@/lib/roles";

/** Solid role colours, for badges on a surface background. */
export const ROLE_BADGE_BG: Record<Role, string> = {
  P: "bg-role-p",
  D: "bg-role-d",
  C: "bg-role-c",
  A: "bg-role-a",
};

/** Soft role colours, for pills and chips below the role limit. */
export const ROLE_PILL_BG: Record<Role, string> = {
  P: "bg-role-p-soft text-role-p",
  D: "bg-role-d-soft text-role-d",
  C: "bg-role-c-soft text-role-c",
  A: "bg-role-a-soft text-role-a",
};

/** Filled role colours, for a pill whose role has reached its limit. */
export const ROLE_PILL_FULL: Record<Role, string> = {
  P: "bg-role-p text-white",
  D: "bg-role-d text-white",
  C: "bg-role-c text-white",
  A: "bg-role-a text-white",
};

/** An active role filter chip. */
export const ROLE_CHIP_ON: Record<Role, string> = {
  P: "border-role-p bg-role-p-soft text-role-p",
  D: "border-role-d bg-role-d-soft text-role-d",
  C: "border-role-c bg-role-c-soft text-role-c",
  A: "border-role-a bg-role-a-soft text-role-a",
};

/**
 * A roster pill flips from soft to filled once the role is full. It is the
 * only signal that a slot is closed, so it has to read peripherally during a
 * live auction — hence a fill change rather than a border or an icon.
 */
export function rolePillClass(role: Role, count: number, limit: number): string {
  return count >= limit ? ROLE_PILL_FULL[role] : ROLE_PILL_BG[role];
}
```

- [ ] **Step 10: Run the full suite and the build**

```bash
npx tsc --noEmit && npm run test && npm run build
```

Expected: all pass. The existing `lib/` tests must still be green.

- [ ] **Step 11: Commit**

```bash
git add lib/credits.ts lib/credits.test.ts lib/filterParams.ts lib/filterParams.test.ts lib/roleStyles.ts
git commit -m "feat: extract the credits, filter-param and role-style helpers

spendPercent clamps a ratio into a bar width; the Sidebar guarded against a
zero total inline and the team cards did not guard at all.

filterParams becomes the single source of truth for the Listone query
string, which PlayerSearchBar, FilterPanel and RoleFilter each hand-rolled a
piece of.

roleStyles moves onto the new role tokens, gains the filled-pill variant for
a role at its limit, and absorbs the role chip styles that FilterPanel and
RoleFilter had copied class for class."
```

---

### Task 3: Shared UI primitives

Five small components with no page wiring. Building them first means Tasks 4–9 assemble rather than invent, and the three missing states (defect 12) exist before any route needs them.

**Files:**
- Create: `app/components/PageHeader.tsx`, `app/components/EmptyState.tsx`, `app/components/InlineError.tsx`, `app/components/ConfirmDialog.tsx`, `app/components/Skeleton.tsx`

**Interfaces:**
- Consumes: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/app/components/ui/dialog`; `errorMessage` from `@/lib/http`; `LucideIcon` type from `lucide-react`
- Produces:
  - `<PageHeader title: string, subtitle?: string />`
  - `<EmptyState icon: LucideIcon, title: string, description?: string, action?: React.ReactNode />`
  - `<InlineError title?: string, message: string />`
  - `<ConfirmDialog open: boolean, onOpenChange: (open: boolean) => void, title: string, description: string, confirmWord: string, confirmLabel: string, onConfirm: () => Promise<Response>, onConfirmed: () => void />`
  - `<Skeleton className?: string />`, `<SkeletonRows count?: number />`

- [ ] **Step 1: Write `PageHeader`**

Create `app/components/PageHeader.tsx`. Every route repeats this markup by hand today, each with its own font size.

```tsx
export default function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-6 border-b border-line pb-4">
      <h1 className="text-display">{title}</h1>
      {subtitle && <p className="mt-1 text-body text-ink-2">{subtitle}</p>}
    </header>
  );
}
```

- [ ] **Step 2: Write `EmptyState`**

Create `app/components/EmptyState.tsx`.

```tsx
import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <Icon size={24} strokeWidth={1.5} className="text-ink-3" />
      <p className="text-h3">{title}</p>
      {description && (
        <p className="max-w-[32ch] text-small text-ink-3">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Write `InlineError`**

Create `app/components/InlineError.tsx`. The message must say what happened *and* how to get out of it — `AssignDialog.tsx:130` already writes warnings this way, and this component generalises that pattern.

```tsx
import { AlertCircle } from "lucide-react";

export default function InlineError({
  title,
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-danger-line bg-danger-bg px-3 py-2"
    >
      <AlertCircle
        size={15}
        strokeWidth={1.8}
        className="mt-px shrink-0 text-danger"
      />
      <p className="text-small text-danger">
        {title && <span className="block font-semibold">{title}</span>}
        {message}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Write `Skeleton`**

Create `app/components/Skeleton.tsx`. It uses Tailwind's built-in `animate-pulse` rather than a custom shimmer keyframe: no new CSS, and the `prefers-reduced-motion` rule from Task 1 already disables it.

```tsx
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-sm bg-surface-sunk ${className}`}
      aria-hidden="true"
    />
  );
}

/** A list of placeholder rows shaped like the app's tables and panels. */
export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Caricamento in corso">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-line py-3 last:border-b-0"
        >
          <Skeleton className="h-5 w-5 shrink-0" />
          <Skeleton className="h-2 w-1/3" />
          <Skeleton className="ml-auto h-2 w-16" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Write `ConfirmDialog`**

Create `app/components/ConfirmDialog.tsx`. This replaces the `confirm()` → `prompt()` → `alert()` chain in `WipePlayersButton` with one dialog that is focus-trapped, escapable, and styled on the design tokens. The typed confirmation stays — it is the right friction for an irreversible wipe — but it happens inside the page instead of in a browser modal.

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import InlineError from "@/app/components/InlineError";
import { errorMessage } from "@/lib/http";

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmWord,
  confirmLabel,
  onConfirm,
  onConfirmed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** The user must type this exactly before the action unlocks. */
  confirmWord: string;
  confirmLabel: string;
  onConfirm: () => Promise<Response>;
  onConfirmed: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setTyped("");
      setError(null);
      setPending(false);
    }
  }, [open]);

  const unlocked = typed === confirmWord;

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const res = await onConfirm();
    setPending(false);
    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }
    onConfirmed();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-small text-ink-2">{description}</p>

          <div>
            <label
              htmlFor="confirm-word"
              className="mb-1 block text-label uppercase text-ink-3"
            >
              Digita {confirmWord} per confermare
            </label>
            <input
              id="confirm-word"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-body transition-colors duration-fast ease-standard focus:border-accent focus:outline-none"
            />
          </div>

          {error && <InlineError message={error} />}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-small text-ink-2 transition-colors duration-fast ease-standard hover:text-ink"
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={!unlocked || pending}
              onClick={handleConfirm}
              className="rounded-md bg-danger px-3 py-2 text-small font-semibold text-white transition-opacity duration-fast ease-standard disabled:opacity-40"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: Restyle `RoleBadge`**

`RoleBadge` is rendered by the auction page, both tables, `AssignDialog` and `EditPlayerCard`, so no route task owns it. Replace the whole of `app/components/RoleBadge.tsx` — the sizes move onto the radius scale and the letter becomes mono, matching every other single-character token in the app.

```tsx
import { isValidRole } from "@/lib/roles";
import { ROLE_BADGE_BG } from "@/lib/roleStyles";

const SIZES = {
  sm: "h-5 w-5 rounded-sm text-small-dense",
  md: "h-6 w-6 rounded-sm text-small",
  lg: "h-8 w-8 rounded-md text-body",
} as const;

export default function RoleBadge({
  role,
  size = "md",
}: {
  role: string;
  size?: keyof typeof SIZES;
}) {
  const bg = isValidRole(role) ? ROLE_BADGE_BG[role] : "bg-ink-3";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-mono font-semibold text-white ${SIZES[size]} ${bg}`}
    >
      {role}
    </span>
  );
}
```

- [ ] **Step 7: Restyle the two shared dialogs**

`AssignDialog` and `AddPlayerDialog` are mounted by the auction page and both tables, so they belong here rather than in a route task. In each file, apply these replacements and leave every handler, effect and piece of state untouched.

In `app/components/AssignDialog.tsx`:

- Subtitle under the title: `className="text-[11.5px] text-ink-dim"` → `className="text-small text-ink-3"`
- Each field label: `className="mb-1.5 block text-[11px] font-bold text-ink-dim"` → `className="mb-1 block text-label uppercase text-ink-3"`
- Each `<select>` and `<input>`: `className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[13.5px]"` → `className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-body transition-colors duration-fast ease-standard focus:border-accent focus:outline-none"`
- Replace both warning paragraphs and the error paragraph with the shared component, importing `InlineError`:

```tsx
          {overBudget && (
            <InlineError
              title="Costo superiore ai crediti residui"
              message={`${selectedTeam!.name} ha ${selectedTeam!.remainingCredits} crediti. Puoi confermare comunque, ma la squadra andrà in negativo.`}
            />
          )}
          {roleFull && role && (
            <InlineError
              title={`Limite raggiunto per ${ROLE_LABELS[role]}`}
              message={`${selectedTeam!.name} ha già ${selectedTeam!.roleCounts[role]} giocatori su ${roleLimits[role]}. Svincolane uno per assegnare ${player.name}.`}
            />
          )}
          {error && <InlineError message={error} />}
```

- Cancel button: `className="text-sm text-ink-dim"` → `className="text-small text-ink-2 transition-colors duration-fast ease-standard hover:text-ink"`
- Confirm button: `className="rounded-lg bg-indigo px-3.5 py-2 text-[12.5px] font-bold text-white disabled:opacity-40"` → `className="rounded-md bg-accent px-3 py-2 text-small font-semibold text-white transition-colors duration-fast ease-standard hover:bg-accent-hover disabled:opacity-40"`

In `app/components/AddPlayerDialog.tsx`, apply the same label, input, cancel-button and submit-button class replacements listed above, and route any error state through `InlineError`.

- [ ] **Step 8: Verify types and build**

```bash
npx tsc --noEmit && npm run build
```

Expected: pass.

- [ ] **Step 9: Verify the dialogs in the browser**

`npm run dev`, open `/players` and click Assegna on any row. The dialog fields are on the token scale, Escape closes it, and a role at its limit shows the inline error naming the team and the player rather than a bare sentence.

- [ ] **Step 10: Commit**

```bash
git add app/components/PageHeader.tsx app/components/EmptyState.tsx app/components/InlineError.tsx app/components/ConfirmDialog.tsx app/components/Skeleton.tsx app/components/RoleBadge.tsx app/components/AssignDialog.tsx app/components/AddPlayerDialog.tsx
git commit -m "feat: add the shared page, state and confirmation primitives

PageHeader replaces the hand-rolled title markup each route repeats with a
different font size. EmptyState, Skeleton and InlineError are the three
states the app has never had as design: today empty is grey text, loading
does not exist, and errors are alert().

ConfirmDialog keeps the typed confirmation that guards the listone wipe but
moves it into a focus-trapped Radix dialog on the design tokens.

RoleBadge, AssignDialog and AddPlayerDialog move onto the tokens here: all
three are mounted from several routes, so no route task owns them."
```

---

### Task 4: The shell

**Files:**
- Modify: `app/layout.tsx`, `app/components/Sidebar.tsx`

**Interfaces:**
- Consumes: `spendPercent` from `lib/credits.ts` (Task 2)
- Produces: the shell geometry every route renders inside — sidebar `w-[220px]`, main `max-w-[1240px] px-12 pt-10 pb-16`

- [ ] **Step 1: Restyle the shell**

In `app/layout.tsx`, replace the `<body>` element and its contents. The sidebar moves onto `paper` so it stops reading as a card competing with the content, and is separated by a hairline instead of a surface change.

```tsx
    <html lang="it" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="flex bg-paper text-ink font-sans">
        <Sidebar assignedCount={assigned} totalCount={total} />
        <main className="w-full max-w-[1240px] flex-1 px-12 pb-16 pt-10">
          {children}
        </main>
      </body>
    </html>
```

Leave the data fetching above it untouched.

- [ ] **Step 2: Restyle the sidebar**

Replace the whole of `app/components/Sidebar.tsx`. The peach gradient card goes (defect 13) — the auction status becomes a label, a 3px bar and a line of numbers with no box around it.

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gavel, List, Users, Star, Settings } from "lucide-react";
import { spendPercent } from "@/lib/credits";

const PRIMARY_LINKS = [
  { href: "/", label: "Asta", icon: Gavel },
  { href: "/players", label: "Listone", icon: List },
  { href: "/teams", label: "Squadre", icon: Users },
  { href: "/watchlist", label: "Wishlist", icon: Star },
];

const CONFIG_LINKS = [{ href: "/settings", label: "Impostazioni", icon: Settings }];

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Gavel }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-2 py-2 text-small transition-colors duration-fast ease-standard ${
        active
          ? "bg-surface font-semibold text-ink shadow-[inset_0_0_0_1px_var(--color-line)]"
          : "font-medium text-ink-2 hover:bg-surface-sunk hover:text-ink"
      }`}
    >
      <Icon size={15} strokeWidth={1.7} />
      {label}
    </Link>
  );
}

export default function Sidebar({
  assignedCount,
  totalCount,
}: {
  assignedCount: number;
  totalCount: number;
}) {
  const pct = spendPercent(assignedCount, totalCount);

  return (
    <aside className="sticky top-0 flex h-screen w-[220px] flex-col gap-6 border-r border-line bg-paper p-4">
      <div className="flex items-center gap-2 px-2">
        <div className="h-5 w-5 shrink-0 rounded-sm bg-accent" />
        <span className="text-h3">ao-fanta</span>
      </div>

      <nav className="flex flex-col gap-px">
        {PRIMARY_LINKS.map((l) => (
          <NavLink key={l.href} {...l} />
        ))}
      </nav>

      <div className="flex flex-col gap-2 px-2">
        <span className="text-label uppercase text-ink-3">Stato asta</span>
        <div className="h-[3px] overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-standard"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-small-dense text-ink-3">
          <span className="font-mono font-semibold tabular-nums text-ink">{assignedCount}</span> di{" "}
          {totalCount} assegnati
        </span>
      </div>

      <nav className="mt-auto flex flex-col gap-px">
        {CONFIG_LINKS.map((l) => (
          <NavLink key={l.href} {...l} />
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Verify types, tests and build**

```bash
npx tsc --noEmit && npm run test && npm run build
```

Expected: all pass.

- [ ] **Step 4: Verify in the browser**

`npm run dev`, then check on any route:
- Sidebar is 220px, sits on the same paper as the content, separated by one hairline — no white panel.
- The active nav item is a white pill with a hairline; inactive items go grey→ink on hover with a visible fade rather than a snap.
- The peach gradient card is gone; the status is a label, a thin accent bar and one line of text.
- Content starts 48px from the sidebar and 40px from the top.

Compare against the sidebar in the mockup's "Schermata · asta" frame.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/components/Sidebar.tsx
git commit -m "feat: restyle the shell onto the design tokens

The sidebar moves off white onto paper so it stops reading as a card
competing with the page content, and loses the peach gradient status card,
which was the only gradient in the app and had nothing to pair with.

Content gains the 48px gutter and 40px top the type scale needs."
```

---

### Task 5: Auction page

The densest surface in the app, and the one whose layout changes most. Two columns: search and history on the left, a sticky credits column on the right, so a name being called and the money available to bid on it are visible at once.

**Files:**
- Modify: `app/page.tsx`, `app/components/AstaSearch.tsx`
- Create: `app/components/TeamCreditsPanel.tsx`, `app/loading.tsx`
- Delete: `app/components/WishlistPanel.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `EmptyState`, `SkeletonRows` (Task 3); `spendPercent` (Task 2); `rolePillClass` (Task 2); existing `getTeamsWithRoster`, `getLeagueSettings`, `getRoleLimit`, `getRecentAcquisitions`, `groupByDay`
- Produces: `<TeamCreditsPanel teams: TeamCredits[], roleLimits: Record<Role, number> />` where `TeamCredits = { id: string; name: string; remainingCredits: number; totalCredits: number; spentCredits: number; roleCounts: Record<Role, number> }`

- [ ] **Step 1: Delete the wishlist panel**

```bash
git rm app/components/WishlistPanel.tsx
```

- [ ] **Step 2: Write the credits panel**

Create `app/components/TeamCreditsPanel.tsx`.

```tsx
import { ROLE_ORDER, type Role } from "@/lib/roles";
import { rolePillClass } from "@/lib/roleStyles";
import { spendPercent } from "@/lib/credits";

export type TeamCredits = {
  id: string;
  name: string;
  remainingCredits: number;
  totalCredits: number;
  spentCredits: number;
  roleCounts: Record<Role, number>;
};

export default function TeamCreditsPanel({
  teams,
  roleLimits,
}: {
  teams: TeamCredits[];
  roleLimits: Record<Role, number>;
}) {
  return (
    <aside className="sticky top-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-label uppercase text-ink-3">Crediti squadre</h2>
        <span className="font-mono text-small-dense tabular-nums text-ink-3">{teams.length}</span>
      </div>

      <div className="rounded-lg border border-line bg-surface px-4">
        {teams.length === 0 && (
          <p className="py-4 text-small-dense text-ink-3">
            Nessuna squadra — creane una in Impostazioni.
          </p>
        )}

        {teams.map((team) => (
          <div key={team.id} className="border-b border-line py-3 last:border-b-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body-dense font-semibold">{team.name}</span>
              <span className="font-mono text-body-dense font-semibold tabular-nums">
                {team.remainingCredits}
                <span className="text-small-dense font-medium text-ink-3">/{team.totalCredits}</span>
              </span>
            </div>

            <div className="my-2 h-[2px] overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500 ease-standard"
                style={{ width: `${spendPercent(team.spentCredits, team.totalCredits)}%` }}
              />
            </div>

            <div className="flex gap-1">
              {ROLE_ORDER.map((role) => (
                <span
                  key={role}
                  className={`rounded-sm px-2 py-px font-mono text-small-dense font-medium tabular-nums ${rolePillClass(
                    role,
                    team.roleCounts[role],
                    roleLimits[role]
                  )}`}
                >
                  {role} {team.roleCounts[role]}/{roleLimits[role]}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Rebuild the auction page**

Replace the whole of `app/page.tsx`. The wishlist query goes with the panel; `recent` grows from 5 to 8 now that it owns the left column.

```tsx
import { getRecentAcquisitions } from "@/lib/players";
import { getTeamsWithRoster } from "@/lib/teams";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER, type Role } from "@/lib/roles";
import { groupByDay } from "@/lib/dates";
import PageHeader from "@/app/components/PageHeader";
import EmptyState from "@/app/components/EmptyState";
import AstaSearch from "@/app/components/AstaSearch";
import TeamCreditsPanel from "@/app/components/TeamCreditsPanel";
import RoleBadge from "@/app/components/RoleBadge";
import { Gavel } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AstaPage() {
  const [teams, leagueSettings, recent] = await Promise.all([
    getTeamsWithRoster(),
    getLeagueSettings(),
    getRecentAcquisitions(8),
  ]);

  const roleLimits = Object.fromEntries(
    ROLE_ORDER.map((r) => [r, getRoleLimit(leagueSettings, r)])
  ) as Record<Role, number>;

  const rosterSize = ROLE_ORDER.reduce((sum, r) => sum + roleLimits[r], 0);
  const assigned = teams.reduce(
    (sum, t) => sum + ROLE_ORDER.reduce((n, r) => n + t.roleCounts[r], 0),
    0
  );

  const recentByDay = groupByDay(recent, (p) => p.assignedAt);

  return (
    <>
      <PageHeader
        title="Asta"
        subtitle={`${assigned} di ${teams.length * rosterSize} giocatori assegnati · ${
          teams.length
        } squadre in gioco`}
      />

      <div className="grid grid-cols-[1fr_296px] items-start gap-8 text-body-dense">
        <div>
          <AstaSearch
            teams={teams.map((t) => ({
              id: t.id,
              name: t.name,
              remainingCredits: t.remainingCredits,
              roleCounts: t.roleCounts,
            }))}
            roleLimits={roleLimits}
          />

          <section className="mt-6">
            {recent.length === 0 && (
              <EmptyState
                icon={Gavel}
                title="Nessun acquisto ancora"
                description="Cerca un giocatore qui sopra e assegnalo per far partire l'asta."
              />
            )}

            {recentByDay.map((group) => (
              <div key={group.label} className="mb-6 last:mb-0">
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-label uppercase text-ink-3">{group.label}</span>
                  <span className="h-px flex-1 bg-line" />
                  <span className="font-mono text-small-dense tabular-nums text-ink-3">
                    {group.items.length}
                  </span>
                </div>
                {group.items.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 border-b border-line py-2 transition-colors duration-fast ease-standard last:border-b-0 hover:bg-surface-sunk"
                  >
                    <RoleBadge role={p.role} size="sm" />
                    <span className="min-w-0 truncate font-medium">{p.name}</span>
                    <span className="ml-auto shrink-0 text-small-dense text-ink-2">
                      {p.fantasyTeam?.name}
                    </span>
                    <span className="shrink-0 font-mono font-medium tabular-nums">{p.cost}</span>
                  </div>
                ))}
              </div>
            ))}
          </section>
        </div>

        <TeamCreditsPanel
          teams={teams.map((t) => ({
            id: t.id,
            name: t.name,
            remainingCredits: t.remainingCredits,
            totalCredits: t.totalCredits,
            spentCredits: t.spentCredits,
            roleCounts: t.roleCounts,
          }))}
          roleLimits={roleLimits}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 4: Make the search results inline**

In `app/components/AstaSearch.tsx`, replace the outer wrapper and the input/results markup. The results now expand the card instead of floating over what is below it. Leave the state, the effect, `handleKeyDown` and both dialogs exactly as they are.

Replace the outer `<div className="rounded-[20px] …">` opening tag with:

```tsx
    <div className="overflow-hidden rounded-lg border border-line-strong bg-surface">
```

Replace the whole `<div className="relative">…</div>` input block with:

```tsx
      <div className="flex items-center gap-3 px-4 py-3">
        <Search className="pointer-events-none shrink-0 text-ink-3" size={17} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cerca per nome giocatore…"
          role="combobox"
          aria-expanded={dropdownOpen}
          aria-controls="asta-search-results"
          aria-activedescendant={
            dropdownOpen && results[activeIndex] ? `asta-result-${results[activeIndex].id}` : undefined
          }
          className="w-full bg-transparent text-h3 font-normal placeholder:text-ink-3 focus:outline-none"
        />
        <span className="shrink-0 rounded-sm border border-line px-2 py-px font-mono text-small-dense text-ink-3">
          ↑↓ · ⏎ assegna · esc
        </span>
      </div>
```

Replace the results container opening tag:

```tsx
        <div id="asta-search-results" role="listbox" className="border-t border-line p-1">
```

Replace each result button's `className` with:

```tsx
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-fast ease-standard ${
                i === activeIndex ? "bg-surface-sunk" : ""
              }`}
```

and its inner spans with:

```tsx
              <RoleBadge role={p.role} size="sm" />
              <span className="text-body-dense font-semibold">{p.name}</span>
              <span className="ml-auto font-mono text-small-dense text-ink-3">{p.serieATeam}</span>
```

Delete the `<ChevronRight …/>` element and its import.

Replace the empty-result button's `className` with:

```tsx
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-body-dense text-accent transition-colors duration-fast ease-standard hover:bg-surface-sunk"
```

- [ ] **Step 5: Add the route skeleton**

Create `app/loading.tsx`:

```tsx
import PageHeader from "@/app/components/PageHeader";
import { Skeleton, SkeletonRows } from "@/app/components/Skeleton";

export default function Loading() {
  return (
    <>
      <PageHeader title="Asta" />
      <div className="grid grid-cols-[1fr_296px] items-start gap-8">
        <div>
          <Skeleton className="h-14 w-full rounded-lg" />
          <div className="mt-6">
            <SkeletonRows count={6} />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </>
  );
}
```

- [ ] **Step 6: Verify types, tests and build**

```bash
npx tsc --noEmit && npm run test && npm run build
```

Expected: all pass. A type error on `spentCredits` or `totalCredits` means `getTeamsWithRoster` was changed — it should not have been; both fields already exist on its return type.

- [ ] **Step 7: Verify in the browser**

`npm run dev`, open `/`:
- No Wishlist panel anywhere on the page.
- Scroll the left column: the credits column stays pinned.
- Type a few letters: results appear **inside** the search card, pushing the content below down — nothing floats over anything.
- A team whose role is at its limit shows that pill filled with the solid role colour, not the soft tint.
- Every card is a hairline box with no shadow.
- With no acquisitions yet, the left column shows the `EmptyState`, not grey text.

Compare against the mockup's "Schermata · asta" frame.

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx app/components/AstaSearch.tsx app/components/TeamCreditsPanel.tsx app/loading.tsx
git commit -m "feat: rebuild the auction page around a sticky credits column

Search sat above the fold and credits below it, so the two things needed in
the same glance during a live auction never were. Credits become a sticky
296px column and search results expand the card instead of floating over
the page.

The wishlist panel is gone: it duplicated a route that already owns that
data and it cost the search the vertical space that is the whole point of
this page. Role pills now fill solid when a role hits its limit.

Recent acquisitions grow from 5 to 8 now that they own the left column."
```

---

### Task 6: Listone

**Files:**
- Create: `app/players/ListoneToolbar.tsx`, `app/players/loading.tsx`
- Modify: `app/players/page.tsx`, `app/players/PlayersTable.tsx`
- Delete: `app/players/PlayerSearchBar.tsx`, `app/players/FilterPanel.tsx`

**Interfaces:**
- Consumes: `readFilterState`, `writeFilterState`, `toggleRole`, `activeFilterCount`, `PlayerFilterState` (Task 2); `ROLE_CHIP_ON` (Task 2); `PageHeader`, `EmptyState`, `InlineError`, `SkeletonRows` (Task 3)
- Produces: `<ListoneToolbar serieATeams: string[], resultCount: number, showStatusToggles?: boolean />` — reused by Task 7

- [ ] **Step 1: Write the toolbar**

Create `app/players/ListoneToolbar.tsx`. This is `PlayerSearchBar` and `FilterPanel` merged into one 44px row: two stacked cards cost about 140px before the table started. `showStatusToggles` exists for the Wishlist route, where the status filters are implied by the route itself.

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { ROLE_ORDER, type Role } from "@/lib/roles";
import { ROLE_CHIP_ON } from "@/lib/roleStyles";
import {
  readFilterState,
  writeFilterState,
  toggleRole,
  activeFilterCount,
} from "@/lib/filterParams";

const DEBOUNCE_MS = 250;

const BOOLEAN_LABELS = {
  freeAgentOnly: "Svincolati",
  starterOnly: "Titolari",
  watchlistOnly: "Wishlist",
} as const;

type BooleanKey = keyof typeof BOOLEAN_LABELS;

export default function ListoneToolbar({
  serieATeams,
  resultCount,
  showStatusToggles = true,
}: {
  serieATeams: string[];
  resultCount: number;
  showStatusToggles?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = readFilterState(new URLSearchParams(searchParams.toString()));
  const [search, setSearch] = useState(state.search);

  // Keep the input in step with back/forward navigation.
  useEffect(() => {
    setSearch(readFilterState(new URLSearchParams(searchParams.toString())).search);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = readFilterState(new URLSearchParams(window.location.search));
      if (current.search === search) return;
      push({ ...current, search });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function push(next: Parameters<typeof writeFilterState>[0]) {
    const qs = writeFilterState(next);
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const activeCount = activeFilterCount(state);

  return (
    <div className="border-b border-line pb-3">
      <div className="flex items-center gap-4">
        <div className="flex w-[230px] items-center gap-2 rounded-md border border-line bg-surface-sunk px-3 py-1.5 transition-colors duration-fast ease-standard focus-within:border-accent">
          <Search size={14} className="shrink-0 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome…"
            className="w-full bg-transparent text-small placeholder:text-ink-3 focus:outline-none"
          />
        </div>

        <div className="flex gap-1">
          {ROLE_ORDER.map((role) => (
            <button
              key={role}
              type="button"
              aria-pressed={state.role.includes(role)}
              onClick={() => push({ ...state, role: toggleRole(state.role, role) })}
              className={`h-7 w-7 rounded-sm border font-mono text-small-dense font-semibold transition-colors duration-fast ease-standard ${
                state.role.includes(role)
                  ? ROLE_CHIP_ON[role]
                  : "border-line-strong bg-surface text-ink-3 hover:border-ink-3 hover:text-ink-2"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        <select
          value={state.serieATeam}
          onChange={(e) => push({ ...state, serieATeam: e.target.value })}
          className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-small text-ink-2 transition-colors duration-fast ease-standard hover:border-ink-3"
        >
          <option value="">Tutte le squadre</option>
          {serieATeams.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>

        {showStatusToggles && (
          <div className="flex gap-4">
            {(Object.keys(BOOLEAN_LABELS) as BooleanKey[]).map((key) => (
              <label
                key={key}
                className={`flex cursor-pointer items-center gap-2 text-small transition-colors duration-fast ease-standard ${
                  state[key] ? "text-ink" : "text-ink-2"
                }`}
              >
                <input
                  type="checkbox"
                  checked={state[key]}
                  onChange={() => push({ ...state, [key]: !state[key] })}
                  className="h-3.5 w-3.5 accent-accent"
                />
                {BOOLEAN_LABELS[key]}
              </label>
            ))}
          </div>
        )}

        <span className="ml-auto font-mono text-small-dense tabular-nums text-ink-3">
          {resultCount} risultati
        </span>
      </div>

      {activeCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {state.role.map((r) => (
            <Chip key={r} label={r} onRemove={() => push({ ...state, role: toggleRole(state.role, r) })} />
          ))}
          {state.serieATeam && (
            <Chip
              label={state.serieATeam}
              onRemove={() => push({ ...state, serieATeam: "" })}
            />
          )}
          {(Object.keys(BOOLEAN_LABELS) as BooleanKey[])
            .filter((key) => state[key])
            .map((key) => (
              <Chip
                key={key}
                label={BOOLEAN_LABELS[key]}
                onRemove={() => push({ ...state, [key]: false })}
              />
            ))}
          <button
            type="button"
            onClick={() => push({ ...state, role: [], serieATeam: "", freeAgentOnly: false, starterOnly: false, watchlistOnly: false })}
            className="ml-2 text-small-dense font-semibold text-ink-3 transition-colors duration-fast ease-standard hover:text-danger"
          >
            Azzera tutto
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-bg px-2 py-1 text-small-dense font-semibold text-accent">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Rimuovi filtro ${label}`}
        className="transition-opacity duration-fast ease-standard hover:opacity-60"
      >
        <X size={11} />
      </button>
    </span>
  );
}
```

- [ ] **Step 2: Delete the two components it replaces**

```bash
git rm app/players/PlayerSearchBar.tsx app/players/FilterPanel.tsx
```

- [ ] **Step 3: Rewire the Listone page**

In `app/players/page.tsx`, swap the imports and the returned markup. The filter reading moves to `readFilterState`; the `getFilteredPlayers` call is unchanged in shape.

Replace the three component imports with:

```tsx
import PageHeader from "@/app/components/PageHeader";
import ListoneToolbar from "./ListoneToolbar";
import PlayersTable from "./PlayersTable";
import { readSearchParams } from "@/lib/filterParams";
```

Replace the `filters` object with:

```tsx
  const filters = readSearchParams(params);
```

Replace the returned JSX with:

```tsx
  return (
    <>
      <PageHeader
        title="Listone"
        subtitle="Tutti i giocatori disponibili, con filtri e assegnazione diretta."
      />
      <ListoneToolbar serieATeams={serieATeams} resultCount={players.length} />
      <PlayersTable
        players={players}
        teams={teams.map((t) => ({ id: t.id, name: t.name, remainingCredits: t.remainingCredits, roleCounts: t.roleCounts }))}
        roleLimits={roleLimits}
      />
    </>
  );
```

- [ ] **Step 4: Restyle the table**

In `app/players/PlayersTable.tsx`, make these changes and leave the sorting logic alone.

Add the imports:

```tsx
import RoleBadge from "@/app/components/RoleBadge";
import EmptyState from "@/app/components/EmptyState";
import InlineError from "@/app/components/InlineError";
import { Users } from "lucide-react";
```

Add error state next to the existing state:

```tsx
  const [error, setError] = useState<string | null>(null);
```

Replace both `alert(await errorMessage(res))` calls (defect 6) with:

```tsx
      setError(await errorMessage(res));
```

and add `setError(null);` as the first line of each handler's success path.

Replace the table wrapper opening tags:

```tsx
      {error && (
        <div className="mb-3">
          <InlineError message={error} />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-small">
```

Replace the header cell `className` with:

```tsx
                    className="sticky top-0 z-10 cursor-pointer select-none whitespace-nowrap border-b border-line bg-paper px-3 py-3 text-left text-label uppercase text-ink-3 transition-colors duration-fast ease-standard hover:text-ink-2"
```

Replace the body row `className` with:

```tsx
                <tr key={p.id} className="group transition-colors duration-fast ease-standard hover:bg-surface-sunk">
```

Give every `<td>` the shared cell classes `border-b border-line px-3 align-middle h-11`, and make these three specific changes:

Name cell:

```tsx
                  <td className="h-11 border-b border-line px-3 align-middle font-semibold">
                    {p.name}
                  </td>
```

Role cell — this is defect 9, the letter becomes the same badge used everywhere else:

```tsx
                  <td className="h-11 w-px border-b border-line px-3 align-middle">
                    <RoleBadge role={p.role} size="sm" />
                  </td>
```

Status pill:

```tsx
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-px text-small-dense font-medium ${
                        p.fantasyTeam
                          ? "bg-accent-bg text-accent"
                          : "border border-line bg-surface-sunk text-ink-3"
                      }`}
                    >
```

Action cell — the buttons appear on row hover (they were two always-on coloured buttons on every row), and "Svincola" drops the coral that collided with the Attaccante role colour (defect 8):

```tsx
                  <td className="h-11 w-px whitespace-nowrap border-b border-line px-3 text-right align-middle">
                    {p.fantasyTeam ? (
                      <button
                        type="button"
                        onClick={() => unassign(p)}
                        className="text-small-dense font-semibold text-ink-3 opacity-0 transition-[opacity,color] duration-fast ease-standard hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        Svincola
                      </button>
                    ) : teams.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAssigning(p);
                          setAssignOpen(true);
                        }}
                        className="text-small-dense font-semibold text-accent opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        Assegna
                      </button>
                    ) : (
                      <span className="text-small-dense text-ink-3">Crea prima una squadra</span>
                    )}
                  </td>
```

Replace the empty row with:

```tsx
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-3 py-6">
                    <EmptyState
                      icon={Users}
                      title="Nessun giocatore da mostrare"
                      description="Nessun risultato per questi filtri. Prova ad azzerarli o a importare il listone da Impostazioni."
                    />
                  </td>
                </tr>
```

- [ ] **Step 5: Add the route skeleton**

Create `app/players/loading.tsx`:

```tsx
import PageHeader from "@/app/components/PageHeader";
import { Skeleton, SkeletonRows } from "@/app/components/Skeleton";

export default function Loading() {
  return (
    <>
      <PageHeader title="Listone" />
      <Skeleton className="h-8 w-full" />
      <div className="mt-4">
        <SkeletonRows count={10} />
      </div>
    </>
  );
}
```

- [ ] **Step 6: Verify types, tests and build**

```bash
npx tsc --noEmit && npm run test && npm run build
```

Expected: all pass.

- [ ] **Step 7: Verify in the browser**

`npm run dev`, open `/players`:
- One toolbar row, not two stacked cards. The table starts much higher up the page.
- Role chips toggle and colour correctly; the URL becomes `?role=A,C`, and clearing every filter leaves a bare `/players` with no trailing `?`.
- Active-filter chips appear only when a filter is on, and each removes its own filter.
- Scroll the table: the header row stays put.
- Assegna/Svincola are invisible until you hover a row, then fade in. Tab through the table — they appear on keyboard focus too.
- The role column shows the coloured badge, matching the auction page.
- Filter down to nothing: the `EmptyState` renders, not a line of grey text.
- Trigger an error (e.g. assign a player to a full role): an inline banner appears above the table. No browser alert.

Compare against the mockup's "Schermata · listone" frame.

- [ ] **Step 8: Commit**

```bash
git add app/players/ListoneToolbar.tsx app/players/page.tsx app/players/PlayersTable.tsx app/players/loading.tsx
git rm app/players/PlayerSearchBar.tsx app/players/FilterPanel.tsx
git commit -m "feat: merge the listone search and filters into one toolbar

PlayerSearchBar and FilterPanel were two stacked cards costing about 140px
before the table began; they become a single 44px row, with the active
filter chips on a second line only when filters are on.

The table gets a sticky header, the shared RoleBadge in the role column
instead of a bare letter, and per-row actions that appear on hover or
keyboard focus rather than two always-on coloured buttons on every row.
Svincola drops the coral it shared with the Attaccante role colour.

Both alert() calls become an inline error banner."
```

---

### Task 7: Wishlist

The smallest task in the plan: the page should own no layout at all.

**Files:**
- Create: `app/watchlist/loading.tsx`
- Modify: `app/watchlist/page.tsx`
- Delete: `app/watchlist/RoleFilter.tsx`

**Interfaces:**
- Consumes: `ListoneToolbar` (Task 6), `PageHeader`, `SkeletonRows` (Task 3)
- Produces: nothing

- [ ] **Step 1: Delete the duplicated filter**

```bash
git rm app/watchlist/RoleFilter.tsx
```

- [ ] **Step 2: Mount the shared toolbar**

Replace the whole of `app/watchlist/page.tsx`. `getDistinctSerieATeams` is now needed here too, for the toolbar's team select.

```tsx
import { getFilteredPlayers } from "@/lib/players";
import { getTeamsWithRoster, getDistinctSerieATeams } from "@/lib/teams";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER, type Role } from "@/lib/roles";
import { readSearchParams } from "@/lib/filterParams";
import PageHeader from "@/app/components/PageHeader";
import ListoneToolbar from "../players/ListoneToolbar";
import PlayersTable from "../players/PlayersTable";

export const dynamic = "force-dynamic";

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const filters = readSearchParams(params);

  const [players, teams, serieATeams, leagueSettings] = await Promise.all([
    // The route is the filter: only free agents, only watchlisted, always.
    getFilteredPlayers({
      ...filters,
      watchlistOnly: true,
      freeAgentOnly: true,
      starterOnly: false,
    }),
    getTeamsWithRoster(),
    getDistinctSerieATeams(),
    getLeagueSettings(),
  ]);

  const roleLimits = Object.fromEntries(
    ROLE_ORDER.map((r) => [r, getRoleLimit(leagueSettings, r)])
  ) as Record<Role, number>;

  return (
    <>
      <PageHeader
        title="Wishlist"
        subtitle="Solo svincolati. Togli la stella per rimuoverli."
      />
      <ListoneToolbar
        serieATeams={serieATeams}
        resultCount={players.length}
        showStatusToggles={false}
      />
      <PlayersTable
        players={players}
        teams={teams.map((t) => ({
          id: t.id,
          name: t.name,
          remainingCredits: t.remainingCredits,
          roleCounts: t.roleCounts,
        }))}
        roleLimits={roleLimits}
        showCost={false}
      />
    </>
  );
}
```

- [ ] **Step 3: Add the route skeleton**

Create `app/watchlist/loading.tsx`:

```tsx
import PageHeader from "@/app/components/PageHeader";
import { Skeleton, SkeletonRows } from "@/app/components/Skeleton";

export default function Loading() {
  return (
    <>
      <PageHeader title="Wishlist" />
      <Skeleton className="h-8 w-full" />
      <div className="mt-4">
        <SkeletonRows count={6} />
      </div>
    </>
  );
}
```

- [ ] **Step 4: Verify types, tests and build**

```bash
npx tsc --noEmit && npm run test && npm run build
```

Expected: all pass.

- [ ] **Step 5: Verify in the browser**

`npm run dev`, open `/watchlist`:
- The toolbar is identical to the Listone's, minus the three status toggles.
- Role chips filter the list and update the URL.
- The table has no Costo column.
- The page is visually indistinguishable from `/players` apart from the title and those two differences.

- [ ] **Step 6: Commit**

```bash
git add app/watchlist/page.tsx app/watchlist/loading.tsx
git rm app/watchlist/RoleFilter.tsx
git commit -m "feat: mount the shared toolbar on the wishlist

RoleFilter duplicated FilterPanel's role chips class for class. The page now
mounts ListoneToolbar with the status toggles hidden — the route already is
that filter — so the role chips exist in exactly one place.

Search and the Serie A team filter come along for free; the wishlist never
had them."
```

---

### Task 8: Squadre

**Files:**
- Create: `app/teams/loading.tsx`
- Modify: `app/teams/page.tsx`, `app/teams/TeamCard.tsx`

**Interfaces:**
- Consumes: `spendPercent` (Task 2), `rolePillClass` (Task 2), `PageHeader`, `EmptyState`, `SkeletonRows` (Task 3)
- Produces: nothing

- [ ] **Step 1: Make the grid adapt**

Replace the returned JSX in `app/teams/page.tsx`. `grid-cols-4` is a fixed count that leaves holes at three teams and crushes at seven (defect 7).

```tsx
  return (
    <>
      <PageHeader
        title="Squadre"
        subtitle="Passa il mouse su un giocatore per rilasciarlo."
      />

      {teams.length === 0 && (
        <EmptyState
          icon={Users}
          title="Nessuna squadra"
          description="Crea la prima squadra in Impostazioni per iniziare l'asta."
        />
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} roleLimits={roleLimits} />
        ))}
      </div>
    </>
  );
```

Add the imports:

```tsx
import PageHeader from "@/app/components/PageHeader";
import EmptyState from "@/app/components/EmptyState";
import { Users } from "lucide-react";
```

- [ ] **Step 2: Promote the credits inside the card**

Replace the whole of `app/teams/TeamCard.tsx`. Credits move from a small number in the bottom-right corner to the top of the card with a spend bar: they are the number you check constantly, and they were the least visible thing on the card (defect 11).

```tsx
import { ROLE_ORDER, ROLE_LABELS, type Role } from "@/lib/roles";
import { rolePillClass } from "@/lib/roleStyles";
import { spendPercent } from "@/lib/credits";
import ReleasePlayerButton from "./ReleasePlayerButton";
import type { getTeamsWithRoster } from "@/lib/teams";

type Team = Awaited<ReturnType<typeof getTeamsWithRoster>>[number];

export default function TeamCard({
  team,
  roleLimits,
}: {
  team: Team;
  roleLimits: Record<Role, number>;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 transition-colors duration-base ease-standard hover:border-line-strong">
      <div>
        <h2 className="text-h2">{team.name}</h2>
        <p className="text-small text-ink-3">{team.coach}</p>
      </div>

      <div>
        <div className="flex items-baseline justify-between font-mono tabular-nums">
          <span className="text-h2 font-semibold">{team.remainingCredits}</span>
          <span className="text-small-dense text-ink-3">di {team.totalCredits} crediti</span>
        </div>
        <div className="mt-2 h-[2px] overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-standard"
            style={{ width: `${spendPercent(team.spentCredits, team.totalCredits)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {ROLE_ORDER.map((role) => {
          const rolePlayers = team.players.filter((p) => p.role === role);
          return (
            <div key={role}>
              <div className="mb-1 flex items-center justify-between gap-2 border-b border-line pb-1">
                <h3 className="text-label uppercase text-ink-3">{ROLE_LABELS[role]}</h3>
                <span
                  className={`rounded-sm px-2 py-px font-mono text-small-dense font-medium tabular-nums ${rolePillClass(
                    role,
                    team.roleCounts[role],
                    roleLimits[role]
                  )}`}
                >
                  {role} {team.roleCounts[role]}/{roleLimits[role]}
                </span>
              </div>
              {rolePlayers.length > 0 ? (
                <ul className="flex flex-col gap-px">
                  {rolePlayers.map((p) => (
                    <li
                      key={p.id}
                      className="group flex items-center justify-between gap-2 py-px text-small"
                    >
                      <span className="min-w-0 truncate font-medium">{p.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-small-dense font-medium tabular-nums text-ink-2">
                          {p.cost}
                        </span>
                        <span className="opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100 focus-within:opacity-100">
                          <ReleasePlayerButton playerId={p.id} playerName={p.name} />
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-small-dense text-ink-3">Nessuno.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add the route skeleton**

Create `app/teams/loading.tsx`:

```tsx
import PageHeader from "@/app/components/PageHeader";
import { Skeleton } from "@/app/components/Skeleton";

export default function Loading() {
  return (
    <>
      <PageHeader title="Squadre" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-80 w-full rounded-lg" />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Verify types, tests and build**

```bash
npx tsc --noEmit && npm run test && npm run build
```

Expected: all pass.

- [ ] **Step 5: Verify in the browser**

`npm run dev`, open `/teams`:
- Resize the window: cards reflow and always fill the row — no trailing gap, no crushed columns.
- Credits are the largest number on the card, at the top, with a bar under them.
- The release button on a player is invisible until you hover that player's row.
- A role at its limit shows a filled pill.
- Cards have a hairline, no shadow, and the border deepens slightly on hover.
- With no teams, the `EmptyState` renders.

Compare against the mockup's "Schermata · squadre" frame and the "Prima / dopo" card comparison.

- [ ] **Step 6: Commit**

```bash
git add app/teams/page.tsx app/teams/TeamCard.tsx app/teams/loading.tsx
git commit -m "feat: promote credits in the team card and let the grid adapt

grid-cols-4 left holes at three teams and crushed the cards at seven; it
becomes auto-fill with a 260px minimum.

Credits were a small number in the bottom-right corner — the most-checked
figure on the card rendered as the least visible thing on it. They move to
the top at h2 with a spend bar, and the release button drops out of the
resting state onto hover."
```

---

### Task 9: Impostazioni

The page that changes most. Five icon-badge cards on a two-column grid — the fifth stranded on a row of its own — become stacked 640px sections ordered by how often each is touched.

**Files:**
- Create: `app/settings/loading.tsx`, `app/settings/SettingsSection.tsx`
- Modify: `app/settings/page.tsx`, `ListoneCard.tsx`, `TeamsCard.tsx`, `PlayersCard.tsx`, `EditPlayerCard.tsx`, `LeagueRulesCard.tsx`, `app/players/WipePlayersButton.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `InlineError`, `ConfirmDialog` (Task 3)
- Produces: `<SettingsSection title: string, hint?: string, description?: string, children />`

- [ ] **Step 1: Write the section wrapper**

Create `app/settings/SettingsSection.tsx`. This is what replaces the card-with-icon-badge chrome.

```tsx
export default function SettingsSection({
  title,
  hint,
  description,
  children,
}: {
  title: string;
  hint?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2">
        <h2 className="text-h2">{title}</h2>
        {hint && (
          <span className="shrink-0 font-mono text-small-dense tabular-nums text-ink-3">{hint}</span>
        )}
      </div>
      {description && <p className="mb-4 max-w-[56ch] text-small text-ink-2">{description}</p>}
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Restack the page**

Replace the returned JSX in `app/settings/page.tsx`. The order is by frequency of use, not by the order the components happened to be written in.

```tsx
  return (
    <>
      <PageHeader
        title="Impostazioni"
        subtitle="Configurazione della lega e gestione dei dati."
      />
      <div className="flex max-w-[640px] flex-col gap-10">
        <LeagueRulesCard settings={settings} />
        <TeamsCard />
        <ListoneCard />
        <PlayersCard />
        <EditPlayerCard />
        <DangerZone />
      </div>
    </>
  );
```

Add `import PageHeader from "@/app/components/PageHeader";` and a `DangerZone` import (created in Step 6).

- [ ] **Step 3: Convert each card to a section**

For each of `ListoneCard.tsx`, `TeamsCard.tsx`, `PlayersCard.tsx`, `EditPlayerCard.tsx` and `LeagueRulesCard.tsx`, apply the same three changes:

1. Delete the icon block entirely — the `<div className="flex h-9 w-9 …">` wrapper, its lucide icon, and the icon's import if now unused. These badges were the only consumers of the `bg-lavender` / `bg-mint` / `bg-peach` gradients.
2. Replace the outer `<div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5 shadow-sm">` and its `<h3>`/`<p>` header with a `<SettingsSection>` carrying the same title and description text.
3. Move any remaining `text-[Npx]` / `p-[Npx]` classes onto the token scale.

`ListoneCard.tsx` becomes:

```tsx
import Link from "next/link";
import { Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import SettingsSection from "./SettingsSection";

export default async function ListoneCard() {
  const count = await prisma.player.count();

  return (
    <SettingsSection
      title="Listone"
      hint={`${count} giocatori`}
      description="Import da CSV o Excel, con mappatura delle colonne e anteprima prima di confermare."
    >
      <Link
        href="/settings/import"
        className="inline-flex h-8 items-center gap-2 rounded-md bg-accent px-3 text-small font-semibold text-white transition-colors duration-fast ease-standard hover:bg-accent-hover"
      >
        <Upload size={14} strokeWidth={1.8} />
        Importa CSV/Excel
      </Link>
    </SettingsSection>
  );
}
```

Note that `WipePlayersButton` has left this component — it belongs to the danger zone now.

`TeamsCard.tsx` keeps its data fetching and its three child buttons, and becomes:

```tsx
import { getTeamsWithRoster } from "@/lib/teams";
import TeamForm from "@/app/teams/TeamForm";
import ReleaseAllButton from "@/app/teams/ReleaseAllButton";
import DeleteTeamButton from "@/app/teams/DeleteTeamButton";
import SettingsSection from "./SettingsSection";

export default async function TeamsCard() {
  const teams = await getTeamsWithRoster();

  return (
    <SettingsSection
      title="Squadre"
      hint={`${teams.length} squadre`}
      description="Le rose si consultano in Squadre. Qui si creano, si rinominano e si eliminano."
    >
      <div className="mb-4">
        {teams.map((t) => (
          <div
            key={t.id}
            className="group flex items-center gap-3 border-b border-line py-2 last:border-b-0"
          >
            <span className="flex-1 text-small font-semibold">{t.name}</span>
            <span className="font-mono text-small-dense tabular-nums text-ink-3">
              {t.totalCredits} cr
            </span>
            <span className="flex items-center gap-3 opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100 focus-within:opacity-100">
              <TeamForm mode="edit" team={t} />
              <ReleaseAllButton
                teamId={t.id}
                teamName={t.name}
                isDisabled={t.players.length === 0}
              />
              <DeleteTeamButton teamId={t.id} disabled={t.players.length > 0} />
            </span>
          </div>
        ))}
        {teams.length === 0 && (
          <p className="text-small text-ink-3">Nessuna squadra creata.</p>
        )}
      </div>
      <TeamForm mode="create" />
    </SettingsSection>
  );
}
```

The remaining three follow the identical mechanical conversion. Keep every form field, handler, effect and piece of state exactly as it is — only the outer wrapper and the header change. The exact wrapper for each:

```tsx
// PlayersCard.tsx
<SettingsSection
  title="Giocatori"
  description="Aggiungi un giocatore assente dal file importato. Serve durante l'asta se viene chiamato un nome che non era nel listone."
>

// EditPlayerCard.tsx
<SettingsSection
  title="Modifica giocatore"
  description="Correggi ruolo e stato di titolare di un giocatore già a listone."
>

// LeagueRulesCard.tsx
<SettingsSection
  title="Regole lega"
  hint={`rosa da ${form.limitP + form.limitD + form.limitC + form.limitA}`}
  description="Limiti per ruolo e crediti assegnati a ogni squadra nuova."
>
```

In `LeagueRulesCard.tsx`, also make these two changes:

- Replace the error paragraph with the shared component, importing `InlineError`:

```tsx
      {error && <InlineError message={error} />}
```

- Move the five number inputs and the save button onto the token scale, replacing each input's `className` with:

```tsx
                className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-center font-mono text-body font-medium tabular-nums transition-colors duration-fast ease-standard focus:border-accent focus:outline-none"
```

and the save button's with:

```tsx
          className="h-8 self-start rounded-md bg-accent px-3 text-small font-semibold text-white transition-colors duration-fast ease-standard hover:bg-accent-hover disabled:opacity-40"
```

- [ ] **Step 4: Restyle the wipe button and give it a real dialog**

Replace the whole of `app/players/WipePlayersButton.tsx`. This is the only file in the project using raw Tailwind palette classes (defect 14) and it chains three native dialogs (defect 6).

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/ConfirmDialog";

export default function WipePlayersButton({ playerCount }: { playerCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-8 shrink-0 rounded-md border border-danger-line bg-surface px-3 text-small font-semibold text-danger transition-colors duration-fast ease-standard hover:bg-danger hover:text-white"
      >
        Svuota
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Svuota il listone"
        description={`Cancella tutti i ${playerCount} giocatori e le assegnazioni delle squadre. Non è reversibile.`}
        confirmWord="ELIMINA"
        confirmLabel="Svuota il listone"
        onConfirm={() => fetch("/api/players", { method: "DELETE" })}
        onConfirmed={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
```

- [ ] **Step 5: Write the danger zone**

Create `app/settings/DangerZone.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import WipePlayersButton from "@/app/players/WipePlayersButton";
import SettingsSection from "./SettingsSection";

export default async function DangerZone() {
  const count = await prisma.player.count();

  return (
    <SettingsSection title="Zona pericolosa">
      <div className="flex items-center gap-4 rounded-lg border border-danger-line bg-danger-bg px-4 py-4">
        <div className="flex-1">
          <p className="text-small font-semibold text-danger">Svuota il listone</p>
          <p className="text-small text-ink-2">
            Cancella tutti i {count} giocatori e le assegnazioni. Non è reversibile.
          </p>
        </div>
        <WipePlayersButton playerCount={count} />
      </div>
    </SettingsSection>
  );
}
```

Add its import to `app/settings/page.tsx`.

- [ ] **Step 6: Add the route skeleton**

Create `app/settings/loading.tsx`:

```tsx
import PageHeader from "@/app/components/PageHeader";
import { Skeleton } from "@/app/components/Skeleton";

export default function Loading() {
  return (
    <>
      <PageHeader title="Impostazioni" />
      <div className="flex max-w-[640px] flex-col gap-10">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 7: Verify types, tests and build**

```bash
npx tsc --noEmit && npm run test && npm run build
```

Expected: all pass. A build error about `bg-lavender` / `bg-mint` / `bg-peach` means an icon badge survived Step 3 — remove it.

- [ ] **Step 8: Verify in the browser**

`npm run dev`, open `/settings`:
- One column, 640px, sections in the order Regole lega → Squadre → Listone → Giocatori → Modifica giocatore → Zona pericolosa.
- No icon badges, no coloured gradient squares anywhere on the page.
- Team row actions appear on hover.
- The danger zone sits at the bottom on a soft red ground.
- Click "Svuota": an in-page dialog opens, Escape closes it, the confirm button stays disabled until you type `ELIMINA` exactly, and no browser modal appears at any point. **Do not complete the wipe** — cancel out. If you want to exercise the success path, do it against a throwaway database, not `prisma/dev.db`.

Compare against the mockup's "Schermata · impostazioni" frame.

- [ ] **Step 9: Commit**

```bash
git add app/settings app/players/WipePlayersButton.tsx
git commit -m "feat: restack settings as sections and isolate the danger zone

Five icon-badge cards on a 2-column grid, the fifth stranded on a row of
its own, become stacked 640px sections ordered by how often each is used.
Settings is a document, not a dashboard. The icon badges were the only
consumers of the lavender/mint/peach gradients.

WipePlayersButton moves into a danger zone at the bottom, drops the raw
border-red-300/text-red-600 classes for the danger tokens, and replaces its
confirm() -> prompt() -> alert() chain with one Radix dialog that keeps the
typed confirmation."
```

---

### Task 10: Cleanup

Nothing references the legacy names any more. This task proves it and removes them.

**Files:**
- Modify: `app/globals.css`, `package.json`
- Modify: any file a grep in Step 1 or Step 2 turns up

**Interfaces:**
- Consumes: everything
- Produces: nothing

- [ ] **Step 1: Find every surviving legacy class**

```bash
grep -rnE '\b(bg|text|border|ring|from|to|accent|placeholder)-(page|surface-2|ink-dim|ink-faint|indigo|coral|teal|amber|lavender|peach|mint)(-soft)?\b' app lib --include=*.tsx --include=*.ts
```

Expected: no output. Any hit is a component a previous task missed — migrate it to the new token now, then re-run until the grep is silent.

- [ ] **Step 2: Find every surviving arbitrary value**

```bash
grep -rnE 'className="[^"]*\b(text|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|gap|rounded|h|leading|tracking)-\[' app --include=*.tsx
```

Expected: only the four intentional layout widths — `w-[220px]`, `w-[296px]`, `max-w-[640px]`, `max-w-[1240px]` — plus `min-w-[640px]` on the players table, `max-w-[32ch]` and `max-w-[56ch]`, and the sidebar's `shadow-[inset_0_0_0_1px_var(--color-line)]`. Anything else is defect 1 or 4 surviving — fix it.

- [ ] **Step 3: Confirm the weight scale replaced the old one**

```bash
grep -rn 'font-extrabold\|font-black' app --include=*.tsx
```

Expected: no output. `font-extrabold` on almost every element is defect 2 — the type scale carries hierarchy through size and the 400/500/600/650/700 steps, so weight 800 has no role left.

- [ ] **Step 4: Confirm no native dialogs remain**

```bash
grep -rnE '\b(alert|confirm|prompt)\(' app lib --include=*.tsx --include=*.ts
```

Expected: no output. Note that `ReleaseAllButton.tsx` and `DeleteTeamButton.tsx` were not touched by any earlier task — if either uses a native dialog, convert it to `ConfirmDialog` now, without a `confirmWord` if the action is reversible (pass the team name as the word only for deletion).

- [ ] **Step 5: Delete the legacy alias block**

In `app/globals.css`, delete the entire second `@theme` block (the one under the `LEGACY ALIASES` comment) and all three `@utility bg-lavender/bg-peach/bg-mint` rules, comments included.

Keep the first `@theme` block and the whole `@layer base` block.

- [ ] **Step 6: Remove the duplicate primitive library**

`@base-ui/react` and `@radix-ui/*` do the same job; `app/components/ui/dialog.tsx` and `select.tsx` use Radix.

```bash
grep -rn "@base-ui" app lib --include=*.tsx --include=*.ts
```

Expected: no output. Then:

```bash
npm uninstall @base-ui/react
```

- [ ] **Step 7: Verify everything**

```bash
npx tsc --noEmit && npm run test && npm run build
```

Expected: all pass. A build failure naming an unknown utility means Step 1 missed a file — that is exactly what this task is for.

- [ ] **Step 8: Final browser pass**

`npm run dev`, then walk all five routes plus `/settings/import`. On each one confirm: no unstyled element, no shadow on a card, no `font-extrabold` weight, hover transitions everywhere they were specified, and the page matches its mockup frame.

- [ ] **Step 9: Commit**

```bash
git add app/globals.css package.json package-lock.json
git commit -m "chore: drop the legacy tokens and the duplicate primitive library

Every route now reads from the @theme tokens, so the compatibility aliases
and the three gradient utilities come out. @base-ui/react goes with them:
it duplicated Radix, which is what the copied shadcn components use."
```

---

## Done When

- The fifteen defects in the spec's Diagnosi table are closed.
- `grep` finds no legacy token class, no unintended arbitrary value, and no `alert`/`confirm`/`prompt` in `app/` or `lib/`.
- `npx tsc --noEmit`, `npm run test` and `npm run build` all pass.
- All five routes have been compared against their mockup frame in a browser.
