# UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the IA around a sidebar shell, fuse the home page into a live "Asta" search+assign+recap screen, rework the Listone filters, add a Settings section, and reskin everything with Tailwind tokens + shadcn/ui + lucide-react, matching the approved mockup (https://claude.ai/code/artifact/baf4742d-6472-472f-8198-e9b925bc5539).

**Architecture:** Next.js 15 App Router stays as-is (server components fetch, client components handle interaction). Role limits and default credits move from the hardcoded `ROLE_LIMITS` constant into a DB-backed `LeagueSettings` singleton row, fetched server-side and passed down as props — client components can no longer import it directly. The assign flow (`AssignModal`) and add-player flow (`AddPlayerForm`) become shared, controlled dialogs so both the Listone table and the new home page can trigger them.

**Tech Stack:** Next.js 15, React 19, Prisma 5 + SQLite, Tailwind 3, shadcn/ui (Radix-based, copied into repo), lucide-react, `next/font/google`, Vitest (new — no test runner currently installed).

## Global Constraints

- Sidebar fixed width: 238px.
- Filter panel collapsed width: 52px.
- Role limit defaults (become `LeagueSettings` DB defaults, currently hardcoded in `lib/roles.ts:16`): P=3, D=8, C=8, A=6.
- `LeagueSettings.defaultCredits` default: 500 (matches existing `TeamForm.tsx:19` default).
- Role color mapping, used everywhere a role badge/pill appears: P=teal (`--teal` `#1FA97E`), D=indigo (`--indigo` `#5B4FE9`), C=amber (`--amber` `#C98A1B`), A=coral (`--coral` `#F0654B`).
- UI label is **"Wishlist"** everywhere a user-facing string is shown. The DB field name stays `watchlist` — no rename of the Prisma field or its query params.
- No test framework is installed today. This plan adds **Vitest** for pure-logic functions and Next.js route handlers (which are plain async functions and can be imported and called directly). Client/server components with no extractable pure logic are verified manually: `npx tsc --noEmit`, `npm run build`, then `npm run dev` + a browser checklist given in the task. This mirrors the project instruction to verify UI changes in a real browser rather than claim untested success.
- Nomenclature elsewhere (routes, model names, existing component names not explicitly renamed by a task) stays as in the current codebase.

---

## File Structure

**New files:**
- `lib/fonts.ts` — `next/font/google` exports for Manrope + JetBrains Mono
- `lib/leagueSettings.ts` — `getLeagueSettings`, `updateLeagueSettings`, `getRoleLimit`
- `lib/roleLimit.ts` — pure `evaluateRoleLimit()` used by the assign/role-change API logic
- `app/components/ui/dialog.tsx`, `select.tsx`, `command.tsx` — shadcn-generated primitives
- `app/components/Sidebar.tsx` — nav shell (replaces the `<nav>` in `app/layout.tsx`)
- `app/components/AssignDialog.tsx` — shared assign-to-team dialog (replaces `AssignModal` in `PlayersTable.tsx`)
- `app/components/AddPlayerDialog.tsx` — shared add-player dialog (replaces `AddPlayerForm.tsx`)
- `app/api/settings/route.ts` — GET/PATCH for `LeagueSettings`
- `app/settings/page.tsx`, `app/settings/LeagueRulesCard.tsx`, `app/settings/ListoneCard.tsx`, `app/settings/TeamsCard.tsx`, `app/settings/PlayersCard.tsx`
- `app/settings/import/page.tsx` — moved from `app/players/import/page.tsx`
- `app/players/PlayerSearchBar.tsx` — extracted text-search input (was part of `PlayerFilters.tsx`)
- `app/players/FilterPanel.tsx` — collapsible filter panel, multi-role chips (replaces `PlayerFilters.tsx`)
- `vitest.config.ts`
- `lib/leagueSettings.test.ts`, `lib/roleLimit.test.ts`, `lib/players.test.ts`, `lib/roles.test.ts`

**Modified files:**
- `tailwind.config.ts`, `app/globals.css` — design tokens
- `app/layout.tsx` — fonts, sidebar shell, drop old `<nav>`
- `prisma/schema.prisma` — `Player.assignedAt`, `LeagueSettings` model
- `app/api/players/[id]/route.ts` — DB-backed role limits, set/clear `assignedAt`
- `app/players/PlayersTable.tsx` — accept `roleLimits` prop, use `AssignDialog`
- `app/players/page.tsx` — drop Import link / `AddPlayerForm` / `WipePlayersButton`, fetch `roleLimits`, new filter UI
- `lib/players.ts` — multi-value role filter, `getRecentAcquisitions()`
- `app/api/players/route.ts` — parse multi-value `role` query param
- `app/page.tsx` — real Asta home page (was a redirect)
- `app/teams/page.tsx` — drop `DeleteTeamButton` / create `TeamForm` (moved to Settings), fetch `roleLimits`
- `app/watchlist/page.tsx` — pass `roleLimits` prop to `PlayersTable`
- `lib/roles.ts` — keep `ROLE_ORDER`/`ROLE_LABELS`/`isValidRole` static, add `parseRoleParam`
- `package.json` — add `vitest`, `lucide-react`, shadcn deps, `"test"` script

**Deleted files:**
- `app/players/AddPlayerForm.tsx` (replaced by `AddPlayerDialog`)
- `app/players/import/page.tsx` (moved to `app/settings/import/page.tsx`)
- `app/players/PlayerFilters.tsx` (replaced by `PlayerSearchBar` + `FilterPanel`)

---

### Task 1: Styling foundation — Tailwind tokens, fonts, shadcn/ui, lucide

**Files:**
- Modify: `package.json`
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`
- Create: `lib/fonts.ts`
- Modify: `app/layout.tsx`
- Create (via shadcn CLI): `components.json`, `lib/utils.ts`, `app/components/ui/dialog.tsx`, `app/components/ui/select.tsx`, `app/components/ui/command.tsx`

**Interfaces:**
- Produces: CSS custom properties `--page`, `--surface`, `--surface-2`, `--border`, `--ink`, `--ink-dim`, `--indigo`, `--indigo-soft`, `--coral`, `--coral-soft`, `--teal`, `--teal-soft`, `--amber`, `--amber-soft` (Tailwind color tokens `bg-page`, `text-ink`, etc.), plus shadcn's own `--background`/`--foreground`/`--card`/`--primary`/`--secondary`/`--accent`/`--destructive`/`--border`/`--input`/`--ring`/`--radius` (consumed by `app/components/ui/*`). Exports `manrope`, `jetbrainsMono` from `lib/fonts.ts` (both have a `.variable` string prop for use in `className`).

- [ ] **Step 1: Install lucide-react**

```bash
npm install lucide-react
```

- [ ] **Step 2: Run shadcn init**

```bash
npx shadcn@latest init -d
```

If it prompts interactively instead of using `-d` defaults, answer: style = **New York**, base color = **Neutral**, CSS variables = **yes**. This generates `components.json`, `lib/utils.ts`, and rewrites `app/globals.css` / `tailwind.config.ts` with shadcn's own `--background`/`--foreground`/etc. tokens.

- [ ] **Step 3: Add the three primitives needed**

```bash
npx shadcn@latest add dialog select command -y
```

Confirms `app/components/ui/dialog.tsx`, `app/components/ui/select.tsx`, `app/components/ui/command.tsx` exist.

- [ ] **Step 4: Overwrite shadcn's default `:root` HSL values with the mockup palette**

Open `app/globals.css`. Shadcn's init wrote a `:root { ... }` block inside `@layer base`. Replace the color values (keep `--radius` line if present, or add it) with:

```css
@layer base {
  :root {
    --background: 232 23% 94%;        /* page #ECEDF3 */
    --foreground: 231 19% 13%;        /* ink #1B1D28 */
    --card: 0 0% 100%;                /* surface #FFFFFF */
    --card-foreground: 231 19% 13%;
    --popover: 0 0% 100%;
    --popover-foreground: 231 19% 13%;
    --primary: 245 78% 61%;           /* indigo #5B4FE9 */
    --primary-foreground: 0 0% 100%;
    --secondary: 228 33% 97%;         /* surface-2 #F5F6FA */
    --secondary-foreground: 231 19% 13%;
    --muted: 228 33% 97%;
    --muted-foreground: 230 8% 57%;   /* ink-dim #8A8D9B */
    --accent: 247 74% 96%;            /* indigo-soft #EDEBFC */
    --accent-foreground: 245 78% 61%;
    --destructive: 9 85% 62%;         /* coral #F0654B */
    --destructive-foreground: 0 0% 100%;
    --border: 232 17% 92%;            /* border #E7E8EE */
    --input: 232 17% 92%;
    --ring: 245 78% 61%;
    --radius: 1rem;
  }
}
```

- [ ] **Step 5: Add app-specific named tokens on top of shadcn's**

In the same `:root` block, add (these back the `bg-page`, `text-ink-dim`, `role-*` utility classes used throughout the redesign; shadcn's tokens alone don't cover role colors or the raw page/surface names used in the plan's component code):

```css
    --page: #ECEDF3;
    --surface: #FFFFFF;
    --surface-2: #F5F6FA;
    --ink: #1B1D28;
    --ink-dim: #8A8D9B;
    --indigo: #5B4FE9;
    --indigo-soft: #EDEBFC;
    --coral: #F0654B;
    --coral-soft: #FDE7E1;
    --teal: #1FA97E;
    --teal-soft: #E1F6EC;
    --amber: #C98A1B;
    --amber-soft: #FBEEDA;
```

- [ ] **Step 6: Register the named tokens in `tailwind.config.ts`**

Add to `theme.extend.colors` (keep whatever shadcn's init already put there for `background`/`primary`/etc. — this is additive):

```ts
      colors: {
        page: "var(--page)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--ink)",
        "ink-dim": "var(--ink-dim)",
        indigo: { DEFAULT: "var(--indigo)", soft: "var(--indigo-soft)" },
        coral: { DEFAULT: "var(--coral)", soft: "var(--coral-soft)" },
        teal: { DEFAULT: "var(--teal)", soft: "var(--teal-soft)" },
        amber: { DEFAULT: "var(--amber)", soft: "var(--amber-soft)" },
      },
```

- [ ] **Step 7: Create `lib/fonts.ts`**

```ts
import { Manrope, JetBrains_Mono } from "next/font/google";

export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-jbmono",
});
```

- [ ] **Step 8: Wire fonts into `tailwind.config.ts`**

Add to `theme.extend`:

```ts
      fontFamily: {
        sans: ["var(--font-manrope)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jbmono)", "ui-monospace", "monospace"],
      },
```

- [ ] **Step 9: Apply fonts and background in `app/layout.tsx`**

Replace the `<html>`/`<body>` opening tags:

```tsx
import "./globals.css";
import { manrope, jetbrainsMono } from "@/lib/fonts";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-page text-ink font-sans">
        {/* nav replaced in Task 2 */}
        <div className="p-6">{children}</div>
      </body>
    </html>
  );
}
```

(Leave the existing `<nav>` block in place for now — Task 2 replaces it.)

- [ ] **Step 10: Verify build**

```bash
npx tsc --noEmit
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 11: Manual verification**

```bash
npm run dev
```

Open `http://localhost:3000/players`. Confirm: page background is light grey (not white), body text renders in a geometric sans (Manrope — check via devtools computed `font-family`), no console errors about missing fonts.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tailwind.config.ts app/globals.css lib/fonts.ts app/layout.tsx components.json lib/utils.ts app/components/ui
git commit -m "feat: add design tokens, fonts, shadcn/ui primitives"
```

---

### Task 2: Sidebar navigation shell

**Files:**
- Create: `app/components/Sidebar.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: nothing external.
- Produces: `<Sidebar />` — a client component rendering the 238px nav. Later tasks add real data (Task 13 wires the status card).

- [ ] **Step 1: Create `app/components/Sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gavel, List, Users, Star, Settings } from "lucide-react";

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
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold ${
        active ? "bg-indigo-soft text-indigo" : "text-ink-dim hover:bg-surface-2 hover:text-ink"
      }`}
    >
      <Icon size={17} strokeWidth={1.8} />
      {label}
    </Link>
  );
}

export default function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-[238px] flex-col gap-6 border-r border-border bg-surface p-5">
      <div className="flex items-center gap-2.5 px-1">
        <div className="h-7 w-7 flex-shrink-0 rounded-[9px] bg-gradient-to-br from-indigo to-[#8B7FF0]" />
        <span className="text-[14.5px] font-extrabold">ao-fanta</span>
      </div>

      <nav className="flex flex-col gap-0.5">
        <div className="mb-2 px-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-dim/70">
          Principale
        </div>
        {PRIMARY_LINKS.map((l) => (
          <NavLink key={l.href} {...l} />
        ))}
      </nav>

      <nav className="flex flex-col gap-0.5">
        <div className="mb-2 px-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-dim/70">
          Configurazione
        </div>
        {CONFIG_LINKS.map((l) => (
          <NavLink key={l.href} {...l} />
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Wire it into `app/layout.tsx`, remove the old `<nav>`**

```tsx
import "./globals.css";
import { manrope, jetbrainsMono } from "@/lib/fonts";
import Sidebar from "@/app/components/Sidebar";

export const metadata = {
  title: "Fantacalcio Auction Manager",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="flex bg-page text-ink font-sans">
        <Sidebar />
        <div className="flex-1 p-8">{children}</div>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 4: Manual verification**

`npm run dev`, open `/`, `/players`, `/teams`, `/watchlist`. Confirm sidebar renders on every page, the link matching the current path is highlighted (indigo background), clicking each link navigates correctly. `/settings` will 404 until Task 6 — that's expected.

- [ ] **Step 5: Commit**

```bash
git add app/components/Sidebar.tsx app/layout.tsx
git commit -m "feat: replace top nav with sidebar shell"
```

---

### Task 3: Prisma schema — `assignedAt` + `LeagueSettings`

**Files:**
- Modify: `prisma/schema.prisma`
- Create (generated): `prisma/migrations/<timestamp>_add_assigned_at_and_league_settings/migration.sql`
- Create: `lib/leagueSettings.ts`
- Create: `vitest.config.ts`
- Create: `lib/leagueSettings.test.ts`
- Modify: `package.json` (add `vitest`, `"test"` script)

**Interfaces:**
- Produces: `getLeagueSettings(): Promise<LeagueSettings>` (Prisma model, singleton row, auto-created with defaults on first read), `updateLeagueSettings(patch: Partial<Pick<LeagueSettings, "limitP"|"limitD"|"limitC"|"limitA"|"defaultCredits">>): Promise<LeagueSettings>`, `getRoleLimit(settings: LeagueSettings, role: Role): number`.

- [ ] **Step 1: Update `prisma/schema.prisma`**

```prisma
model Player {
  id            String   @id @default(uuid())
  name          String
  role          String
  serieATeam    String
  fantasyTeamId String?
  fantasyTeam   Team?    @relation(fields: [fantasyTeamId], references: [id])
  cost          Int?
  starter       Boolean  @default(false)
  watchlist     Boolean  @default(false)
  assignedAt    DateTime?
  createdAt     DateTime @default(now())

  @@index([fantasyTeamId])
  @@index([role])
}

model LeagueSettings {
  id             String @id @default("singleton")
  limitP         Int    @default(3)
  limitD         Int    @default(8)
  limitC         Int    @default(8)
  limitA         Int    @default(6)
  defaultCredits Int    @default(500)
}
```

(Add `assignedAt DateTime?` to the existing `Player` model; add the new `LeagueSettings` model; `Team` model is untouched.)

- [ ] **Step 2: Generate and apply the migration**

```bash
npm run prisma:migrate -- --name add_assigned_at_and_league_settings
```

Expected: creates `prisma/migrations/<timestamp>_add_assigned_at_and_league_settings/`, applies to `prisma/dev.db`, regenerates the Prisma client.

- [ ] **Step 3: Install Vitest and add the test script**

```bash
npm install -D vitest
```

Add to `package.json` `"scripts"`:

```json
    "test": "vitest run"
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 5: Write the failing test for `lib/leagueSettings.ts`**

```ts
// lib/leagueSettings.test.ts
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { getLeagueSettings, updateLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";

afterAll(async () => {
  await prisma.leagueSettings.deleteMany({ where: { id: "singleton" } });
  await prisma.$disconnect();
});

describe("getLeagueSettings", () => {
  it("creates and returns the default singleton row on first read", async () => {
    const settings = await getLeagueSettings();
    expect(settings.limitP).toBe(3);
    expect(settings.limitD).toBe(8);
    expect(settings.limitC).toBe(8);
    expect(settings.limitA).toBe(6);
    expect(settings.defaultCredits).toBe(500);
  });

  it("returns the same row on a second read instead of recreating it", async () => {
    const first = await getLeagueSettings();
    const second = await getLeagueSettings();
    expect(second.id).toBe(first.id);
  });
});

describe("updateLeagueSettings", () => {
  it("persists a partial patch", async () => {
    await getLeagueSettings();
    const updated = await updateLeagueSettings({ limitA: 7 });
    expect(updated.limitA).toBe(7);
    expect(updated.limitP).toBe(3);
  });
});

describe("getRoleLimit", () => {
  it("maps each role to its column", async () => {
    const settings = await getLeagueSettings();
    expect(getRoleLimit(settings, "P")).toBe(settings.limitP);
    expect(getRoleLimit(settings, "A")).toBe(settings.limitA);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
npx vitest run lib/leagueSettings.test.ts
```

Expected: FAIL — `lib/leagueSettings.ts` doesn't exist yet.

- [ ] **Step 7: Implement `lib/leagueSettings.ts`**

```ts
import { prisma } from "@/lib/prisma";
import type { LeagueSettings } from "@prisma/client";
import type { Role } from "@/lib/roles";

const SINGLETON_ID = "singleton";

export async function getLeagueSettings(): Promise<LeagueSettings> {
  return prisma.leagueSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });
}

export async function updateLeagueSettings(
  patch: Partial<Pick<LeagueSettings, "limitP" | "limitD" | "limitC" | "limitA" | "defaultCredits">>
): Promise<LeagueSettings> {
  await getLeagueSettings();
  return prisma.leagueSettings.update({ where: { id: SINGLETON_ID }, data: patch });
}

export function getRoleLimit(settings: LeagueSettings, role: Role): number {
  const byRole: Record<Role, number> = {
    P: settings.limitP,
    D: settings.limitD,
    C: settings.limitC,
    A: settings.limitA,
  };
  return byRole[role];
}
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
npx vitest run lib/leagueSettings.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/dev.db lib/leagueSettings.ts lib/leagueSettings.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat: add LeagueSettings model and Player.assignedAt"
```

---

### Task 4: Make role limits DB-backed everywhere they're used

**Files:**
- Create: `lib/roleLimit.ts`
- Create: `lib/roleLimit.test.ts`
- Modify: `app/api/players/[id]/route.ts`
- Modify: `app/players/PlayersTable.tsx`
- Modify: `app/players/page.tsx:1-49`
- Modify: `app/watchlist/page.tsx`
- Modify: `app/teams/page.tsx`

**Interfaces:**
- Consumes: `getLeagueSettings`, `getRoleLimit` from `lib/leagueSettings.ts` (Task 3).
- Produces: `evaluateRoleLimit(count: number, limit: number, roleLabel: string): { ok: boolean; error?: string }` — pure function, no DB. `PlayersTable` now requires a `roleLimits: Record<Role, number>` prop (previously imported `ROLE_LIMITS` from `lib/roles.ts` directly).

- [ ] **Step 1: Write the failing test for the pure limit check**

```ts
// lib/roleLimit.test.ts
import { describe, it, expect } from "vitest";
import { evaluateRoleLimit } from "@/lib/roleLimit";

describe("evaluateRoleLimit", () => {
  it("allows when count is below limit", () => {
    expect(evaluateRoleLimit(2, 6, "Attaccanti")).toEqual({ ok: true });
  });

  it("blocks when count has reached the limit", () => {
    const result = evaluateRoleLimit(6, 6, "Attaccanti");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Attaccanti");
  });

  it("blocks when count exceeds the limit", () => {
    expect(evaluateRoleLimit(7, 6, "Attaccanti").ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/roleLimit.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/roleLimit.ts`**

```ts
export function evaluateRoleLimit(
  count: number,
  limit: number,
  roleLabel: string
): { ok: boolean; error?: string } {
  if (count >= limit) {
    return { ok: false, error: `Limite raggiunto per ruolo ${roleLabel} (${limit}/${limit})` };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/roleLimit.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Update `app/api/players/[id]/route.ts` to use DB-backed limits**

Replace the `checkRoleLimit` function and the import line, and replace the inline role-full check inside `PATCH` for the assignment branch:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidRole, ROLE_LABELS, type Role } from "@/lib/roles";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { evaluateRoleLimit } from "@/lib/roleLimit";

async function checkRoleLimit(
  playerTeamId: string | null,
  newRole: string,
  playerId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!playerTeamId || !isValidRole(newRole)) return { ok: true };

  const count = await prisma.player.count({
    where: { fantasyTeamId: playerTeamId, role: newRole, id: { not: playerId } },
  });
  const settings = await getLeagueSettings();
  const limit = getRoleLimit(settings, newRole as Role);
  return evaluateRoleLimit(count, limit, ROLE_LABELS[newRole as Role]);
}
```

In the `fantasyTeamId !== null` (assignment) branch, replace:

```ts
      const role = isValidRole(body.role) ? body.role : player.role;
      if (isValidRole(role)) {
        const roleCount = await prisma.player.count({
          where: { fantasyTeamId: body.fantasyTeamId, role, id: { not: id } },
        });
        const limit = ROLE_LIMITS[role];
        if (roleCount >= limit) {
          return NextResponse.json(
            { error: `Limite raggiunto per ruolo ${ROLE_LABELS[role]} (${limit}/${limit})` },
            { status: 400 }
          );
        }
      }
```

with:

```ts
      const role = isValidRole(body.role) ? body.role : player.role;
      if (isValidRole(role)) {
        const roleCount = await prisma.player.count({
          where: { fantasyTeamId: body.fantasyTeamId, role, id: { not: id } },
        });
        const settings = await getLeagueSettings();
        const limit = getRoleLimit(settings, role);
        const check = evaluateRoleLimit(roleCount, limit, ROLE_LABELS[role]);
        if (!check.ok) {
          return NextResponse.json({ error: check.error }, { status: 400 });
        }
      }
```

Also, in the same `fantasyTeamId !== null` branch, set `data.assignedAt = new Date();` alongside the existing `data.fantasyTeamId = body.fantasyTeamId;` / `data.cost = body.cost;` lines. In the `fantasyTeamId === null` (release) branch, set `data.assignedAt = null;` alongside `data.cost = null;`.

- [ ] **Step 6: Update `app/players/PlayersTable.tsx` to take `roleLimits` as a prop**

Change the component signature and the `AssignModal` internals to stop importing `ROLE_LIMITS`:

```tsx
import { ROLE_LABELS, isValidRole, ROLE_ORDER, type Role } from "@/lib/roles";

export default function PlayersTable({
  players,
  teams,
  roleLimits,
}: {
  players: PlayerWithTeam[];
  teams: TeamSummary[];
  roleLimits: Record<Role, number>;
}) {
```

Pass `roleLimits` down to `<AssignModal player={assigning} teams={teams} roleLimits={roleLimits} ... />`, and inside `AssignModal`, replace `ROLE_LIMITS[role]` with `roleLimits[role]` (add `roleLimits: Record<Role, number>` to its prop type). (This whole modal is replaced by `AssignDialog` in Task 10 — this step just removes the stale import so the build stays green in the meantime.)

- [ ] **Step 7: Update the three server pages that render `PlayersTable`**

`app/players/page.tsx` — add the settings fetch and pass the prop:

```tsx
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER } from "@/lib/roles";
// ...
  const [players, teams, serieATeams, leagueSettings] = await Promise.all([
    getFilteredPlayers(filters),
    getTeamsWithRoster(),
    getDistinctSerieATeams(),
    getLeagueSettings(),
  ]);
  const roleLimits = Object.fromEntries(
    ROLE_ORDER.map((r) => [r, getRoleLimit(leagueSettings, r)])
  ) as Record<(typeof ROLE_ORDER)[number], number>;
// ...
      <PlayersTable
        players={players}
        teams={teams.map((t) => ({ id: t.id, name: t.name, remainingCredits: t.remainingCredits, roleCounts: t.roleCounts }))}
        roleLimits={roleLimits}
      />
```

`app/watchlist/page.tsx` — same pattern: fetch `leagueSettings`, compute `roleLimits`, pass to `<PlayersTable ... roleLimits={roleLimits} />`.

`app/teams/page.tsx` — replace the static `ROLE_LIMITS` import/usage:

```tsx
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER, ROLE_LABELS } from "@/lib/roles";
// ...
export default async function TeamsPage() {
  const [teams, leagueSettings] = await Promise.all([getTeamsWithRoster(), getLeagueSettings()]);
  // ...
                  {ROLE_ORDER.map((role) => (
                    <span key={role} title={ROLE_LABELS[role]}>
                      {role} {team.roleCounts[role]}/{getRoleLimit(leagueSettings, role)}
                    </span>
                  ))}
```

(Remove the now-unused `ROLE_LIMITS` import from `lib/roles.ts` in this file.)

- [ ] **Step 8: `lib/roles.ts` keeps only the static, non-configurable parts**

Leave `ROLE_ORDER`, `ROLE_LABELS`, `isValidRole` as they are. Remove `ROLE_LIMITS` entirely (its last remaining consumers were updated in Steps 6–7).

- [ ] **Step 9: Run all tests, typecheck, build**

```bash
npx vitest run
npx tsc --noEmit
npm run build
```

Expected: all pass. `tsc` will catch any remaining `ROLE_LIMITS` import you missed — fix and re-run until clean.

- [ ] **Step 10: Manual verification**

`npm run dev`. On `/players`, assign a player to a team whose role count is at the limit (or temporarily lower a limit via `sqlite3 prisma/dev.db "UPDATE LeagueSettings SET limitA=0"` to force it) — confirm the error message still shows. On `/teams`, confirm role counts still show `P 1/3` etc. Revert any manual DB edit (`UPDATE LeagueSettings SET limitA=6`).

- [ ] **Step 11: Commit**

```bash
git add lib/roleLimit.ts lib/roleLimit.test.ts lib/roles.ts app/api/players/[id]/route.ts app/players/PlayersTable.tsx app/players/page.tsx app/watchlist/page.tsx app/teams/page.tsx
git commit -m "refactor: make role limits DB-backed via LeagueSettings"
```

---

### Task 5: Settings API route

**Files:**
- Create: `app/api/settings/route.ts`

**Interfaces:**
- Consumes: `getLeagueSettings`, `updateLeagueSettings` from `lib/leagueSettings.ts`.
- Produces: `GET /api/settings` → `LeagueSettings` JSON. `PATCH /api/settings` with body `{ limitP?, limitD?, limitC?, limitA?, defaultCredits? }` → updated `LeagueSettings` JSON, or `400` with `{ error }` if any provided value isn't a non-negative integer.

- [ ] **Step 1: Implement the route**

```ts
// app/api/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getLeagueSettings, updateLeagueSettings } from "@/lib/leagueSettings";

const FIELDS = ["limitP", "limitD", "limitC", "limitA", "defaultCredits"] as const;

export async function GET() {
  const settings = await getLeagueSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const patch: Record<string, number> = {};

  for (const field of FIELDS) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== "number" || body[field] < 0 || !Number.isInteger(body[field])) {
      return NextResponse.json({ error: `${field} deve essere un intero >= 0` }, { status: 400 });
    }
    patch[field] = body[field];
  }

  const settings = await updateLeagueSettings(patch);
  return NextResponse.json(settings);
}
```

- [ ] **Step 2: Manual verification with curl**

```bash
npm run dev &
sleep 2
curl -s http://localhost:3000/api/settings
curl -s -X PATCH http://localhost:3000/api/settings -H "Content-Type: application/json" -d '{"limitA": 7}'
curl -s -X PATCH http://localhost:3000/api/settings -H "Content-Type: application/json" -d '{"limitA": -1}'
kill %1
```

Expected: first call returns the settings JSON; second returns it with `limitA: 7`; third returns `400` with an `error` field.

- [ ] **Step 3: Reset the test edit and commit**

```bash
curl -s -X PATCH http://localhost:3000/api/settings -H "Content-Type: application/json" -d '{"limitA": 6}'
git add app/api/settings/route.ts
git commit -m "feat: add settings API route for league rules"
```

---

### Task 6: `/settings` page shell + Regole lega card

**Files:**
- Create: `app/settings/page.tsx`
- Create: `app/settings/LeagueRulesCard.tsx`

**Interfaces:**
- Consumes: `GET /api/settings`, `PATCH /api/settings` (Task 5), `getLeagueSettings` (Task 3).
- Produces: `/settings` route, rendering a grid of cards. This task ships only the Regole lega card; Tasks 7–9 add the other three.

- [ ] **Step 1: Implement `app/settings/LeagueRulesCard.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { errorMessage } from "@/lib/http";
import type { LeagueSettings } from "@prisma/client";

export default function LeagueRulesCard({ settings }: { settings: LeagueSettings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    limitP: settings.limitP,
    limitD: settings.limitD,
    limitC: settings.limitC,
    limitA: settings.limitA,
    defaultCredits: settings.defaultCredits,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-amber-soft text-amber">
          <SlidersHorizontal size={18} strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[14.5px] font-extrabold">Regole lega</h3>
          <p className="text-xs text-ink-dim">Limiti per ruolo e crediti di default</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {(["limitP", "limitD", "limitC", "limitA"] as const).map((field) => (
          <div key={field} className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold">{field.replace("limit", "")}</label>
            <input
              type="number"
              min={0}
              value={form[field]}
              onChange={(e) => setForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
              className="rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-center font-mono text-sm"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-ink-dim">Crediti squadra (default)</label>
        <input
          type="number"
          min={0}
          value={form.defaultCredits}
          onChange={(e) => setForm((f) => ({ ...f, defaultCredits: Number(e.target.value) }))}
          className="rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-coral">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="self-start rounded-lg bg-indigo px-3.5 py-2 text-[12.5px] font-bold text-white disabled:opacity-50"
      >
        {saving ? "Salvataggio…" : "Salva modifiche"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Implement `app/settings/page.tsx`**

```tsx
import { getLeagueSettings } from "@/lib/leagueSettings";
import LeagueRulesCard from "./LeagueRulesCard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getLeagueSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold">Impostazioni</h1>
        <p className="text-sm text-ink-dim">Configurazione della lega e gestione dei dati.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <LeagueRulesCard settings={settings} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 4: Manual verification**

`npm run dev`, open `/settings`. Change a role limit, click "Salva modifiche", confirm the page refreshes with the new value persisted (reload the page to double check it survived). Reset values back to 3/8/8/6/500 afterward.

- [ ] **Step 5: Commit**

```bash
git add app/settings/page.tsx app/settings/LeagueRulesCard.tsx
git commit -m "feat: add Settings page with Regole lega card"
```

---

### Task 7: Move Listone import/wipe into Settings

**Files:**
- Create: `app/settings/import/page.tsx` (moved content from `app/players/import/page.tsx`)
- Create: `app/settings/ListoneCard.tsx`
- Modify: `app/settings/page.tsx`
- Modify: `app/players/page.tsx`
- Delete: `app/players/import/page.tsx`

**Interfaces:**
- Consumes: existing `/api/import` route (unchanged), `WipePlayersButton` (unchanged component, only its usage location moves).
- Produces: `/settings/import` (same behavior as the old `/players/import`), `ListoneCard` rendered in `/settings`.

- [ ] **Step 1: Move the import page**

```bash
git mv app/players/import/page.tsx app/settings/import/page.tsx
```

No content changes needed — the page has no relative imports to its old location (`@/lib/xlsxImport` is an absolute alias).

- [ ] **Step 2: Create `app/settings/ListoneCard.tsx`**

```tsx
import Link from "next/link";
import { Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import WipePlayersButton from "@/app/players/WipePlayersButton";

export default async function ListoneCard() {
  const count = await prisma.player.count();

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-soft to-surface-2 text-indigo">
          <Upload size={18} strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[14.5px] font-extrabold">Listone</h3>
          <p className="text-xs text-ink-dim">Import ed eliminazione dei giocatori</p>
        </div>
      </div>
      <p className="text-xs text-ink-dim">File attuale: {count} giocatori.</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/settings/import"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo px-3.5 py-2 text-[12.5px] font-bold text-white"
        >
          <Upload size={14} strokeWidth={1.8} />
          Importa CSV/Excel
        </Link>
        <WipePlayersButton />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add it to `app/settings/page.tsx`**

```tsx
import { getLeagueSettings } from "@/lib/leagueSettings";
import LeagueRulesCard from "./LeagueRulesCard";
import ListoneCard from "./ListoneCard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getLeagueSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold">Impostazioni</h1>
        <p className="text-sm text-ink-dim">Configurazione della lega e gestione dei dati.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ListoneCard />
        <LeagueRulesCard settings={settings} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Remove the Import link and Wipe button from `/players`**

In `app/players/page.tsx`, remove the `<Link href="/players/import">` and `<WipePlayersButton />` lines and their now-unused imports (`Link` stays if used elsewhere in the file — check; `WipePlayersButton` import is removed).

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 6: Manual verification**

`npm run dev`. Confirm `/players/import` now 404s and `/settings/import` works identically to what `/players/import` used to do (file select → column mapping → preview → import). Confirm `/players` no longer shows an Import link or Svuota DB button. Confirm `/settings` shows the Listone card with the current player count and a working "Svuota DB" button (test with a throwaway import first if you want to avoid wiping real data, or skip the destructive click and just confirm the button renders and is wired — `WipePlayersButton`'s own confirm/prompt flow is unchanged from before).

- [ ] **Step 7: Commit**

```bash
git add -A app/settings app/players/page.tsx
git commit -m "feat: move listone import/wipe into Settings"
```

---

### Task 8: Move team create/delete into Settings

**Files:**
- Create: `app/settings/TeamsCard.tsx`
- Modify: `app/settings/page.tsx`
- Modify: `app/teams/page.tsx`

**Interfaces:**
- Consumes: existing `TeamForm` (mode="create"), `DeleteTeamButton`, `getTeamsWithRoster` (unchanged).
- Produces: `TeamsCard` in Settings; `/teams` keeps only roster viewing/editing (`TeamForm` mode="edit", `ReleasePlayerButton`, `ReleaseAllButton`).

- [ ] **Step 1: Create `app/settings/TeamsCard.tsx`**

```tsx
import { Users, Trash2 } from "lucide-react";
import { getTeamsWithRoster } from "@/lib/teams";
import TeamForm from "@/app/teams/TeamForm";
import DeleteTeamButton from "@/app/teams/DeleteTeamButton";

export default async function TeamsCard() {
  const teams = await getTeamsWithRoster();

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-teal-soft text-teal">
          <Users size={18} strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[14.5px] font-extrabold">Squadre</h3>
          <p className="text-xs text-ink-dim">Crea ed elimina squadre di lega</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {teams.map((t) => (
          <div key={t.id} className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-2.5 py-2">
            <span className="flex-1 text-[12.5px] font-bold">{t.name}</span>
            <span className="font-mono text-[11px] text-ink-dim">{t.totalCredits} cr</span>
            <DeleteTeamButton teamId={t.id} disabled={t.players.length > 0} />
          </div>
        ))}
        {teams.length === 0 && <p className="text-xs text-ink-dim">Nessuna squadra creata.</p>}
      </div>

      <TeamForm mode="create" />
    </div>
  );
}
```

`DeleteTeamButton`'s existing markup (a plain "Elimina" text button) is fine here as-is — no visual pass in this task, per the mockup's "dettagli più avanti" note.

- [ ] **Step 2: Add it to `app/settings/page.tsx`**

```tsx
import TeamsCard from "./TeamsCard";
// ...
      <div className="grid grid-cols-2 gap-4">
        <ListoneCard />
        <TeamsCard />
        <LeagueRulesCard settings={settings} />
      </div>
```

- [ ] **Step 3: Remove create/delete from `app/teams/page.tsx`**

Remove the top-level `<TeamForm mode="create" />` from the page header, and remove `<DeleteTeamButton .../>` from each team section. Remove the now-unused `DeleteTeamButton` import (keep `TeamForm` import — `mode="edit"` is still used per-team).

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 5: Manual verification**

`npm run dev`. On `/settings`, create a new team via the Squadre card, confirm it appears in the mini-list. Try deleting a team with players assigned — confirm the delete button is disabled (title tooltip explains why). Delete an empty team, confirm it disappears from both the Settings list and `/teams`. On `/teams`, confirm the create/delete controls are gone but "Modifica" (edit), release-player, and release-all still work.

- [ ] **Step 6: Commit**

```bash
git add app/settings/TeamsCard.tsx app/settings/page.tsx app/teams/page.tsx
git commit -m "feat: move team create/delete into Settings"
```

---

### Task 9: `AddPlayerDialog` — controlled, reusable

**Files:**
- Create: `app/components/AddPlayerDialog.tsx`
- Create: `app/settings/PlayersCard.tsx`
- Modify: `app/settings/page.tsx`
- Delete: `app/players/AddPlayerForm.tsx`

**Interfaces:**
- Consumes: `app/components/ui/dialog.tsx` (Task 1), existing `POST /api/players` route (unchanged).
- Produces: `<AddPlayerDialog open, onOpenChange, initialName?, onCreated?: (player) => void />` — a controlled dialog (no internal trigger button, unlike the old `AddPlayerForm`). Task 11 (home page) opens this from the search empty-state with `initialName` pre-filled.

- [ ] **Step 1: Create `app/components/AddPlayerDialog.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { errorMessage } from "@/lib/http";
import { ROLE_ORDER } from "@/lib/roles";

export default function AddPlayerDialog({
  open,
  onOpenChange,
  initialName = "",
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onCreated?: (player: { id: string; name: string }) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState<string>(ROLE_ORDER[0]);
  const [serieATeam, setSerieATeam] = useState("");
  const [starter, setStarter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, serieATeam, starter }),
    });

    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }

    const player = await res.json();
    setName("");
    setSerieATeam("");
    setStarter(false);
    onOpenChange(false);
    onCreated?.(player);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuovo giocatore</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome e cognome"
            required
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          >
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            value={serieATeam}
            onChange={(e) => setSerieATeam(e.target.value)}
            placeholder="Squadra Serie A"
            required
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={starter} onChange={(e) => setStarter(e.target.checked)} />
            Titolare
          </label>
          {error && <p className="text-sm text-coral">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="text-sm text-ink-dim">
              Annulla
            </button>
            <button type="submit" className="rounded-lg bg-indigo px-3.5 py-2 text-[12.5px] font-bold text-white">
              Salva
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `app/settings/PlayersCard.tsx`**

```tsx
"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import AddPlayerDialog from "@/app/components/AddPlayerDialog";

export default function PlayersCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--coral)_12%,white)] text-coral">
          <UserPlus size={18} strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[14.5px] font-extrabold">Giocatori</h3>
          <p className="text-xs text-ink-dim">Aggiungi un giocatore fuori listone</p>
        </div>
      </div>
      <p className="text-xs text-ink-dim">
        Serve durante l&apos;asta se viene chiamato un giocatore assente dal file importato.
      </p>
      <button
        onClick={() => setOpen(true)}
        className="self-start rounded-lg bg-indigo px-3.5 py-2 text-[12.5px] font-bold text-white"
      >
        Aggiungi giocatore
      </button>
      <AddPlayerDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
```

- [ ] **Step 3: Add `PlayersCard` to `app/settings/page.tsx`**

```tsx
import PlayersCard from "./PlayersCard";
// ...
      <div className="grid grid-cols-2 gap-4">
        <ListoneCard />
        <TeamsCard />
        <PlayersCard />
        <LeagueRulesCard settings={settings} />
      </div>
```

- [ ] **Step 4: Delete the old form**

```bash
git rm app/players/AddPlayerForm.tsx
```

Confirm nothing still imports it (Task 7 already removed its usage from `app/players/page.tsx`).

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 6: Manual verification**

`npm run dev`, open `/settings`, click "Aggiungi giocatore" on the Giocatori card, fill the form, submit. Confirm the dialog closes, and the new player shows up on `/players` (search for the name you used).

- [ ] **Step 7: Commit**

```bash
git add -A app/components/AddPlayerDialog.tsx app/settings
git commit -m "feat: extract AddPlayerDialog, move add-player into Settings"
```

---

### Task 10: `AssignDialog` — shared, controlled assign flow

**Files:**
- Create: `app/components/AssignDialog.tsx`
- Modify: `app/players/PlayersTable.tsx`

**Interfaces:**
- Consumes: `app/components/ui/dialog.tsx`, `app/components/ui/select.tsx` (Task 1), existing `PATCH /api/players/[id]` route (unchanged, already sets `assignedAt` per Task 4).
- Produces: `<AssignDialog player: PlayerWithTeam | null, teams: TeamSummary[], roleLimits: Record<Role, number>, open: boolean, onOpenChange: (open: boolean) => void, onAssigned: () => void />`. `player={null}` while closed is fine — the dialog just doesn't render its content.

- [ ] **Step 1: Create `app/components/AssignDialog.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { errorMessage } from "@/lib/http";
import { ROLE_LABELS, isValidRole, type Role } from "@/lib/roles";
import type { PlayerWithTeam, TeamSummary } from "@/lib/types";

const ROLE_BADGE_BG: Record<Role, string> = {
  P: "bg-teal",
  D: "bg-indigo",
  C: "bg-amber",
  A: "bg-coral",
};

export default function AssignDialog({
  player,
  teams,
  roleLimits,
  open,
  onOpenChange,
  onAssigned,
}: {
  player: PlayerWithTeam | null;
  teams: TeamSummary[];
  roleLimits: Record<Role, number>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [cost, setCost] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTeamId(teams[0]?.id ?? "");
      setCost(0);
      setError(null);
    }
  }, [open, teams]);

  if (!player) return null;

  const selectedTeam = teams.find((t) => t.id === teamId);
  const overBudget = selectedTeam ? cost > selectedTeam.remainingCredits : false;
  const role = isValidRole(player.role) ? player.role : null;
  const roleFull = selectedTeam && role ? selectedTeam.roleCounts[role] >= roleLimits[role] : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch(`/api/players/${player!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fantasyTeamId: teamId, cost }),
    });

    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }

    onAssigned();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-[13px] font-extrabold text-white ${
                role ? ROLE_BADGE_BG[role] : "bg-ink-dim"
              }`}
            >
              {player.role}
            </span>
            <div>
              <DialogTitle>Assegna {player.name}</DialogTitle>
              <p className="text-[11.5px] text-ink-dim">{player.serieATeam}</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold text-ink-dim">Squadra</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[13.5px]"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (residui: {t.remainingCredits})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold text-ink-dim">Costo (crediti)</label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
              min={0}
              required
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[13.5px]"
            />
          </div>

          {overBudget && (
            <p className="rounded-lg bg-amber-soft px-2.5 py-2 text-xs font-medium text-amber">
              Attenzione: costo superiore ai crediti residui della squadra.
            </p>
          )}
          {roleFull && role && (
            <p className="rounded-lg bg-coral-soft px-2.5 py-2 text-xs font-medium text-coral">
              Limite raggiunto per ruolo {ROLE_LABELS[role]} ({selectedTeam!.roleCounts[role]}/
              {roleLimits[role]}).
            </p>
          )}
          {error && <p className="text-xs text-coral">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="text-sm text-ink-dim">
              Annulla
            </button>
            <button
              type="submit"
              disabled={roleFull}
              className="rounded-lg bg-teal px-3.5 py-2 text-[12.5px] font-bold text-white disabled:opacity-40"
            >
              Conferma
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Replace `AssignModal` usage in `app/players/PlayersTable.tsx`**

Remove the entire `AssignModal` function at the bottom of the file. Change the `assigning` state usage:

```tsx
import AssignDialog from "@/app/components/AssignDialog";
// ...
  const [assigning, setAssigning] = useState<PlayerWithTeam | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
// ...
      {teams.length > 0 ? (
        <button type="button" onClick={() => { setAssigning(p); setAssignOpen(true); }} className="text-blue-600 text-xs">
          Assegna
        </button>
      ) : (
// ...

      <AssignDialog
        player={assigning}
        teams={teams}
        roleLimits={roleLimits}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssigned={() => {
          setAssignOpen(false);
          router.refresh();
        }}
      />
```

(Remove the `{assigning && (...)}` block that used to conditionally render the inline `AssignModal` — `AssignDialog` handles its own open/closed rendering via the `open` prop.)

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 4: Manual verification**

`npm run dev`, open `/players`. Click "Assegna" on a free agent — confirm the dialog opens with focus trapped inside it, `Esc` closes it, clicking the backdrop closes it, submitting assigns the player and the table refreshes. Try assigning past a role limit — confirm the warning shows and Confirm is disabled.

- [ ] **Step 5: Commit**

```bash
git add app/components/AssignDialog.tsx app/players/PlayersTable.tsx
git commit -m "feat: extract shared AssignDialog with focus trap and Esc/backdrop close"
```

---

### Task 11: `/` — Asta home page (search, recap, wishlist, ultimi acquisti)

**Files:**
- Modify: `app/page.tsx`
- Modify: `lib/players.ts`
- Modify: `app/api/players/route.ts`
- Create: `lib/players.test.ts`

**Interfaces:**
- Consumes: `getFilteredPlayers`, `getTeamsWithRoster`, `getLeagueSettings`/`getRoleLimit`, `AssignDialog`, `AddPlayerDialog`.
- Produces: `getRecentAcquisitions(limit?: number): Promise<PlayerWithTeam[]>` in `lib/players.ts`, sorted by `assignedAt` descending, only players with a `fantasyTeamId`.

- [ ] **Step 1: Write the failing test for `getRecentAcquisitions`**

```ts
// lib/players.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { getRecentAcquisitions } from "@/lib/players";

let teamId: string;
const playerIds: string[] = [];

beforeAll(async () => {
  const team = await prisma.team.create({
    data: { name: "__test_team__", coach: "test", totalCredits: 100 },
  });
  teamId = team.id;

  const older = await prisma.player.create({
    data: { name: "__older__", role: "A", serieATeam: "Test", fantasyTeamId: teamId, cost: 10, assignedAt: new Date("2026-01-01") },
  });
  const newer = await prisma.player.create({
    data: { name: "__newer__", role: "D", serieATeam: "Test", fantasyTeamId: teamId, cost: 5, assignedAt: new Date("2026-06-01") },
  });
  const unassigned = await prisma.player.create({
    data: { name: "__unassigned__", role: "C", serieATeam: "Test" },
  });
  playerIds.push(older.id, newer.id, unassigned.id);
});

afterAll(async () => {
  await prisma.player.deleteMany({ where: { id: { in: playerIds } } });
  await prisma.team.delete({ where: { id: teamId } });
  await prisma.$disconnect();
});

describe("getRecentAcquisitions", () => {
  it("returns only assigned players, newest first", async () => {
    const recent = await getRecentAcquisitions(10);
    const names = recent.map((p) => p.name);
    expect(names.indexOf("__newer__")).toBeLessThan(names.indexOf("__older__"));
    expect(names).not.toContain("__unassigned__");
  });

  it("respects the limit", async () => {
    const recent = await getRecentAcquisitions(1);
    expect(recent.length).toBe(1);
    expect(recent[0].name).toBe("__newer__");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/players.test.ts
```

Expected: FAIL — `getRecentAcquisitions` is not exported.

- [ ] **Step 3: Implement `getRecentAcquisitions` in `lib/players.ts`**

Add below `getFilteredPlayers`:

```ts
export async function getRecentAcquisitions(limit = 5) {
  return prisma.player.findMany({
    where: { fantasyTeamId: { not: null } },
    include: { fantasyTeam: { select: { id: true, name: true } } },
    orderBy: { assignedAt: "desc" },
    take: limit,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/players.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Add multi-value role filtering (needed by the home search, which filters free agents by name only, but shares `getFilteredPlayers` with `/players` — Task 12 depends on this)**

In `lib/players.ts`, change the `PlayerFilters` type and the `where.role` assignment:

```ts
export type PlayerFilters = {
  role?: string[];
  serieATeam?: string;
  freeAgentOnly?: boolean;
  starterOnly?: boolean;
  watchlistOnly?: boolean;
  search?: string;
};

export async function getFilteredPlayers(filters: PlayerFilters) {
  const where: Prisma.PlayerWhereInput = {};

  if (filters.role && filters.role.length > 0) where.role = { in: filters.role };
  if (filters.serieATeam) where.serieATeam = filters.serieATeam;
  // ...unchanged below this line
```

In `app/api/players/route.ts`, update the `GET` handler to parse a comma-separated `role` param:

```ts
import { parseRoleParam } from "@/lib/roles";
// ...
  const players = await getFilteredPlayers({
    role: parseRoleParam(searchParams.get("role")),
    serieATeam: searchParams.get("serieATeam") ?? undefined,
    freeAgentOnly: searchParams.get("freeAgentOnly") === "true",
    starterOnly: searchParams.get("starterOnly") === "true",
    watchlistOnly: searchParams.get("watchlistOnly") === "true",
    search: searchParams.get("search") ?? undefined,
  });
```

Add `parseRoleParam` to `lib/roles.ts`:

```ts
export function parseRoleParam(value?: string | null): Role[] {
  if (!value) return [];
  return value.split(",").filter(isValidRole);
}
```

- [ ] **Step 6: Write the failing test for `parseRoleParam`**

```ts
// lib/roles.test.ts
import { describe, it, expect } from "vitest";
import { parseRoleParam, isValidRole } from "@/lib/roles";

describe("parseRoleParam", () => {
  it("returns an empty array for null/undefined", () => {
    expect(parseRoleParam(null)).toEqual([]);
    expect(parseRoleParam(undefined)).toEqual([]);
  });

  it("splits a comma-separated list into valid roles", () => {
    expect(parseRoleParam("A,C")).toEqual(["A", "C"]);
  });

  it("drops invalid entries", () => {
    expect(parseRoleParam("A,X,D")).toEqual(["A", "D"]);
  });
});

describe("isValidRole", () => {
  it("accepts P/D/C/A", () => {
    expect(isValidRole("A")).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isValidRole("X")).toBe(false);
  });
});
```

Run `npx vitest run lib/roles.test.ts` — expect FAIL (function doesn't exist yet) — then confirm it passes once Step 5's `parseRoleParam` is in place: `npx vitest run lib/roles.test.ts` → PASS (5 tests).

- [ ] **Step 7: Build the Asta home page — `app/page.tsx`**

```tsx
import { getFilteredPlayers, getRecentAcquisitions } from "@/lib/players";
import { getTeamsWithRoster } from "@/lib/teams";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER } from "@/lib/roles";
import AstaSearch from "@/app/components/AstaSearch";

export const dynamic = "force-dynamic";

export default async function AstaPage() {
  const [teams, leagueSettings, wishlist, recent] = await Promise.all([
    getTeamsWithRoster(),
    getLeagueSettings(),
    getFilteredPlayers({ watchlistOnly: true, freeAgentOnly: true }),
    getRecentAcquisitions(5),
  ]);

  const roleLimits = Object.fromEntries(
    ROLE_ORDER.map((r) => [r, getRoleLimit(leagueSettings, r)])
  ) as Record<(typeof ROLE_ORDER)[number], number>;

  const teamSummaries = teams.map((t) => ({
    id: t.id,
    name: t.name,
    remainingCredits: t.remainingCredits,
    roleCounts: t.roleCounts,
  }));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[22px] font-extrabold">Asta</h1>
        <p className="text-sm text-ink-dim">Cerca un giocatore chiamato e assegnalo in due click.</p>
      </div>

      <AstaSearch teams={teamSummaries} roleLimits={roleLimits} />

      <div>
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-dim/70">
          Crediti squadre
        </div>
        <div className="grid grid-cols-3 gap-3.5">
          {teams.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-surface p-4.5 shadow-sm">
              <div className="mb-3.5 flex items-start justify-between">
                <div>
                  <div className="text-sm font-extrabold">{t.name}</div>
                  <div className="text-[11.5px] text-ink-dim">{t.players.length} giocatori</div>
                </div>
                <div className="text-right font-mono text-[22px] font-bold">
                  {t.remainingCredits}
                  <span className="block font-sans text-[11px] font-semibold text-ink-dim">
                    / {t.totalCredits} cr
                  </span>
                </div>
              </div>
              <div className="mb-3.5 grid grid-cols-4 gap-1.5">
                {ROLE_ORDER.map((role) => (
                  <div
                    key={role}
                    className={`rounded-lg py-1.5 text-center font-mono text-[11px] font-bold ${
                      { P: "bg-teal-soft text-teal", D: "bg-indigo-soft text-indigo", C: "bg-amber-soft text-amber", A: "bg-coral-soft text-coral" }[role]
                    }`}
                  >
                    {role} {t.roleCounts[role]}/{roleLimits[role]}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {teams.length === 0 && (
            <p className="col-span-3 text-sm text-ink-dim">
              Nessuna squadra ancora — creane una in Impostazioni.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="rounded-2xl border border-border bg-surface p-4.5 shadow-sm">
          <h3 className="mb-3 text-[13.5px] font-extrabold">Wishlist</h3>
          {wishlist.length === 0 && <p className="text-xs text-ink-dim">Nessun giocatore in wishlist.</p>}
          {wishlist.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 py-2">
              <span className="flex-1 text-[13px] font-bold">
                {p.name} <span className="font-normal text-ink-dim">({p.serieATeam})</span>
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4.5 shadow-sm">
          <h3 className="mb-3 text-[13.5px] font-extrabold">Ultimi acquisti</h3>
          {recent.length === 0 && <p className="text-xs text-ink-dim">Nessun acquisto ancora.</p>}
          {recent.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 py-2">
              <span className="flex-1 text-[13px] font-bold">
                {p.name} <span className="font-normal text-ink-dim">— {p.fantasyTeam?.name}</span>
              </span>
              <span className="font-mono text-[12.5px] font-bold text-coral">{p.cost} cr</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Build `app/components/AstaSearch.tsx` (search + assign + add-empty-state)**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import AssignDialog from "@/app/components/AssignDialog";
import AddPlayerDialog from "@/app/components/AddPlayerDialog";
import type { PlayerWithTeam, TeamSummary } from "@/lib/types";
import type { Role } from "@/lib/roles";

const DEBOUNCE_MS = 200;

export default function AstaSearch({
  teams,
  roleLimits,
}: {
  teams: TeamSummary[];
  roleLimits: Record<Role, number>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerWithTeam[]>([]);
  const [assigning, setAssigning] = useState<PlayerWithTeam | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/players?search=${encodeURIComponent(query)}&freeAgentOnly=true`);
      if (res.ok) setResults(await res.json());
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [query]);

  return (
    <div className="rounded-[20px] border border-border bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-ink-dim">
        <Search size={15} strokeWidth={1.8} />
        Chi è in asta?
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim/50" size={18} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per nome giocatore…"
          className="w-full rounded-[13px] border-[1.5px] border-border bg-surface-2 py-3.5 pl-11 pr-4 text-base focus:border-indigo focus:bg-surface focus:outline-none"
        />
      </div>

      {query.trim() && (
        <div className="mt-2.5 border-t border-border pt-1">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setAssigning(p);
                setAssignOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-1.5 py-2.5 text-left hover:bg-surface-2"
            >
              <span className="flex h-6.5 w-6.5 flex-shrink-0 items-center justify-center rounded-lg bg-ink text-[11px] font-extrabold text-white">
                {p.role}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold">{p.name}</span>
                <span className="block text-[11.5px] text-ink-dim">{p.serieATeam}</span>
              </span>
            </button>
          ))}
          {results.length === 0 && (
            <button
              onClick={() => setAddOpen(true)}
              className="flex w-full items-center gap-2 rounded-lg px-1.5 py-2.5 text-left text-sm text-indigo hover:bg-surface-2"
            >
              Aggiungi &quot;{query}&quot; al listone
            </button>
          )}
        </div>
      )}

      <AssignDialog
        player={assigning}
        teams={teams}
        roleLimits={roleLimits}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssigned={() => {
          setAssignOpen(false);
          setQuery("");
          router.refresh();
        }}
      />
      <AddPlayerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        initialName={query}
        onCreated={() => {
          setQuery("");
          router.refresh();
        }}
      />
    </div>
  );
}
```

- [ ] **Step 9: Verify build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 10: Manual verification**

`npm run dev`, open `/` (no longer redirects to `/players`). Confirm: credit cards render per team with correct role-limit pills; Wishlist panel lists watchlist free agents; Ultimi acquisti is empty until you assign someone (assign a player via the search box, confirm it then appears here with today's date implied by ordering). Type a name that doesn't exist, confirm the "Aggiungi … al listone" row appears and opens `AddPlayerDialog` pre-filled.

- [ ] **Step 11: Commit**

```bash
git add app/page.tsx app/components/AstaSearch.tsx lib/players.ts lib/players.test.ts lib/roles.ts lib/roles.test.ts app/api/players/route.ts
git commit -m "feat: build Asta home page with search, assign, and recap"
```

---

### Task 12: `/players` — Listone filters rework

**Files:**
- Create: `app/players/PlayerSearchBar.tsx`
- Create: `app/players/FilterPanel.tsx`
- Modify: `app/players/page.tsx`
- Delete: `app/players/PlayerFilters.tsx`

**Interfaces:**
- Consumes: `getFilteredPlayers` (Task 11's multi-role `role: string[]`), `getDistinctSerieATeams` (unchanged).
- Produces: URL contract change — `?role=A` becomes `?role=A,C` (comma-separated). No other query param names change.

- [ ] **Step 1: Create `app/players/PlayerSearchBar.tsx`** (search-only, extracted from the old `PlayerFilters`)

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";

const DEBOUNCE_MS = 250;

export default function PlayerSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set("search", search);
      else params.delete("search");
      router.replace(`${pathname}?${params.toString()}`);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="relative mb-3.5">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim/50" size={16} />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cerca per nome…"
        className="w-full rounded-[11px] border border-border bg-surface py-2.5 pl-10 pr-3.5 text-[13.5px] focus:border-indigo focus:outline-none"
      />
    </div>
  );
}
```

- [ ] **Step 2: Create `app/players/FilterPanel.tsx`** (multi-role chips, collapsible, active-filter chips)

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, ChevronRight, X } from "lucide-react";
import { ROLE_ORDER, parseRoleParam, type Role } from "@/lib/roles";

const ROLE_CHIP_ON: Record<Role, string> = {
  P: "border-teal bg-teal-soft text-teal",
  D: "border-indigo bg-indigo-soft text-indigo",
  C: "border-amber bg-amber-soft text-amber",
  A: "border-coral bg-coral-soft text-coral",
};

export default function FilterPanel({
  serieATeams,
  resultCount,
}: {
  serieATeams: string[];
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);

  const activeRoles = parseRoleParam(searchParams.get("role"));
  const activeSerieATeam = searchParams.get("serieATeam") ?? "";
  const activeBooleans = (["freeAgentOnly", "starterOnly", "watchlistOnly"] as const).filter(
    (k) => searchParams.get(k) === "true"
  );
  const activeCount = activeRoles.length + (activeSerieATeam ? 1 : 0) + activeBooleans.length;

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function toggleRole(role: Role) {
    const next = activeRoles.includes(role)
      ? activeRoles.filter((r) => r !== role)
      : [...activeRoles, role];
    setParam("role", next.join(","));
  }

  function toggleBoolean(key: string) {
    setParam(key, searchParams.get(key) === "true" ? "" : "true");
  }

  function resetAll() {
    router.replace(pathname);
  }

  const BOOLEAN_LABELS: Record<string, string> = {
    freeAgentOnly: "Svincolati",
    starterOnly: "Titolari",
    watchlistOnly: "Wishlist",
  };

  if (collapsed) {
    return (
      <aside className="flex w-[52px] flex-shrink-0 flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 pt-4 shadow-sm">
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo text-[10px] font-extrabold text-white">
            {activeCount}
          </span>
        )}
        <button onClick={() => setCollapsed(false)} className="rounded-md p-1 text-ink-dim hover:bg-surface-2">
          <ChevronRight size={15} className="rotate-180" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-[272px] flex-shrink-0 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold">
          <SlidersHorizontal size={15} className="text-ink-dim" />
          Filtri
        </div>
        <button onClick={() => setCollapsed(true)} className="rounded-md p-0.5 text-ink-dim hover:bg-surface-2">
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="mb-4.5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-dim/70">Ruolo</div>
        <div className="flex gap-1.5">
          {ROLE_ORDER.map((role) => (
            <button
              key={role}
              onClick={() => toggleRole(role)}
              className={`flex-1 rounded-lg border-[1.5px] py-1.5 text-[12px] font-extrabold ${
                activeRoles.includes(role) ? ROLE_CHIP_ON[role] : "border-border text-ink-dim"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4.5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-dim/70">Squadra Serie A</div>
        <select
          value={activeSerieATeam}
          onChange={(e) => setParam("serieATeam", e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-[12.5px]"
        >
          <option value="">Tutte le squadre</option>
          {serieATeams.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4.5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-dim/70">Stato</div>
        {(["freeAgentOnly", "starterOnly", "watchlistOnly"] as const).map((key) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 py-1 text-[12.5px]">
            <input
              type="checkbox"
              checked={searchParams.get(key) === "true"}
              onChange={() => toggleBoolean(key)}
              className="h-3.75 w-3.75 accent-indigo"
            />
            {BOOLEAN_LABELS[key]}
          </label>
        ))}
      </div>

      {activeCount > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {activeRoles.map((r) => (
            <span key={r} className="inline-flex items-center gap-1 rounded-full bg-indigo-soft px-2 py-1 text-[11px] font-bold text-indigo">
              {r}
              <X size={11} className="cursor-pointer" onClick={() => toggleRole(r)} />
            </span>
          ))}
          {activeSerieATeam && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-soft px-2 py-1 text-[11px] font-bold text-indigo">
              {activeSerieATeam}
              <X size={11} className="cursor-pointer" onClick={() => setParam("serieATeam", "")} />
            </span>
          )}
          {activeBooleans.map((k) => (
            <span key={k} className="inline-flex items-center gap-1 rounded-full bg-indigo-soft px-2 py-1 text-[11px] font-bold text-indigo">
              {BOOLEAN_LABELS[k]}
              <X size={11} className="cursor-pointer" onClick={() => toggleBoolean(k)} />
            </span>
          ))}
        </div>
      )}

      <button onClick={resetAll} className="text-[11.5px] font-bold text-ink-dim hover:text-coral">
        Azzera tutto
      </button>
      <div className="mt-2 text-[11px] text-ink-dim/70">{resultCount} risultati</div>
    </aside>
  );
}
```

- [ ] **Step 3: Update `app/players/page.tsx`**

```tsx
import { getFilteredPlayers } from "@/lib/players";
import { getTeamsWithRoster, getDistinctSerieATeams } from "@/lib/teams";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER, parseRoleParam } from "@/lib/roles";
import PlayerSearchBar from "./PlayerSearchBar";
import FilterPanel from "./FilterPanel";
import PlayersTable from "./PlayersTable";

export const dynamic = "force-dynamic";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const filters = {
    role: parseRoleParam(params.role),
    serieATeam: params.serieATeam,
    freeAgentOnly: params.freeAgentOnly === "true",
    starterOnly: params.starterOnly === "true",
    watchlistOnly: params.watchlistOnly === "true",
    search: params.search,
  };

  const [players, teams, serieATeams, leagueSettings] = await Promise.all([
    getFilteredPlayers(filters),
    getTeamsWithRoster(),
    getDistinctSerieATeams(),
    getLeagueSettings(),
  ]);
  const roleLimits = Object.fromEntries(
    ROLE_ORDER.map((r) => [r, getRoleLimit(leagueSettings, r)])
  ) as Record<(typeof ROLE_ORDER)[number], number>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-extrabold">Listone</h1>
        <p className="text-sm text-ink-dim">{players.length} giocatori</p>
      </div>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <PlayerSearchBar />
          <PlayersTable
            players={players}
            teams={teams.map((t) => ({ id: t.id, name: t.name, remainingCredits: t.remainingCredits, roleCounts: t.roleCounts }))}
            roleLimits={roleLimits}
          />
        </div>
        <FilterPanel serieATeams={serieATeams} resultCount={players.length} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Delete the old filters component**

```bash
git rm app/players/PlayerFilters.tsx
```

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 6: Manual verification**

`npm run dev`, open `/players`. Click role chips P and A — confirm the URL shows `?role=P,A` and the table shows only portieri+attaccanti. Confirm the active-filter chips list them and each `×` removes just that one. Confirm "Azzera tutto" clears the URL back to `/players`. Collapse the filter panel via the chevron — confirm it shrinks to a 52px rail showing the active-filter count badge, and expands back on click. Confirm the search box (now above the table, not in the filter panel) still filters by name with the existing debounce.

- [ ] **Step 7: Commit**

```bash
git add -A app/players
git commit -m "feat: rework Listone filters with multi-role chips and collapsible panel"
```

---

### Task 13: Sidebar status widget — wire real data

**Files:**
- Modify: `app/components/Sidebar.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `prisma.player.count()`.
- Produces: nothing consumed by later tasks — this is the last task.

`Sidebar` currently has no data. Since it renders on every page via the root layout (a server component), the simplest correct approach is to fetch the counts in `RootLayout` (already a server component) and pass them down, rather than making `Sidebar` itself async (it needs `usePathname`, so it must stay a client component).

- [ ] **Step 1: Add a small server-side helper inline in `app/layout.tsx`**

```tsx
import "./globals.css";
import { manrope, jetbrainsMono } from "@/lib/fonts";
import Sidebar from "@/app/components/Sidebar";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Fantacalcio Auction Manager",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [assigned, total] = await Promise.all([
    prisma.player.count({ where: { fantasyTeamId: { not: null } } }),
    prisma.player.count(),
  ]);

  return (
    <html lang="it" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="flex bg-page text-ink font-sans">
        <Sidebar assignedCount={assigned} totalCount={total} />
        <div className="flex-1 p-8">{children}</div>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Add the status card to `app/components/Sidebar.tsx`**

Add the prop and render the card below the two `<nav>` blocks:

```tsx
export default function Sidebar({
  assignedCount,
  totalCount,
}: {
  assignedCount: number;
  totalCount: number;
}) {
  const pct = totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0;

  return (
    <aside className="sticky top-0 flex h-screen w-[238px] flex-col gap-6 border-r border-border bg-surface p-5">
      {/* ...brand + nav blocks unchanged... */}

      <div className="mt-auto rounded-2xl bg-gradient-to-br from-coral-soft to-surface-2 p-4">
        <div className="mb-2 text-[11px] font-bold">Stato asta</div>
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-black/10">
          <div className="h-full rounded-full bg-coral" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[11px] text-ink-dim">
          <span className="font-mono font-bold text-ink">{assignedCount}</span> / {totalCount} giocatori assegnati
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 4: Manual verification**

`npm run dev`. Confirm the sidebar's bottom card shows the real assigned/total count matching what `/players` reports, on every route (it's in the root layout). Assign or release a player, reload any page, confirm the count updates.

- [ ] **Step 5: Commit**

```bash
git add app/components/Sidebar.tsx app/layout.tsx
git commit -m "feat: wire sidebar status widget to real player counts"
```

---

## Self-Review Notes

- **Spec coverage:** sidebar+icons (Task 2), home=Asta fused page (Task 11), toolbar→sidebar (Task 2), Settings section with all four sub-items (Tasks 6–9), search separated from list with dialog assign (Tasks 10–11), Listone filters reworked (Task 12), style stack — Tailwind tokens/shadcn/lucide/fonts (Task 1). `/teams` redesign and dark mode explicitly out of scope per the design spec — not tasked.
- **Type consistency checked:** `roleLimits: Record<Role, number>` prop name and shape is identical across `PlayersTable`, `AssignDialog`, `AstaSearch`, `app/page.tsx`, `app/players/page.tsx`, `app/watchlist/page.tsx`. `getRoleLimit(settings, role)` signature matches its one definition (Task 3) and all three call sites (Tasks 4, 11, 12). `parseRoleParam` defined once (Task 11, `lib/roles.ts`) and consumed identically in `app/api/players/route.ts` and `app/players/FilterPanel.tsx`/`page.tsx`.
- **No placeholders:** every step has real code or a real shell command; CLI-prompt steps (shadcn init) give the exact answers to give if prompted instead of a bare "configure it".
