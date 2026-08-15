# Wishlist a tre liste (A/B/C) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire il flag booleano `Player.watchlist` con un tier ordinale A/B/C, così che la wishlist diventi tre liste di priorità con una pagina a tre sezioni e un filtro multi-select.

**Architecture:** Migrazione additiva in due tempi. Prima si aggiunge `wishlistTier` accanto a `watchlist` e si costruisce tutto il nuovo comportamento (data layer, API, tabella, toolbar, pagina); solo l'ultimo task rimuove la colonna vecchia e i suoi riferimenti residui. Ogni task lascia il progetto compilabile e con la suite verde — nessuna finestra in cui l'app è rotta.

**Tech Stack:** Next.js 15 (App Router, server components), Prisma 5 + SQLite, React 19, Tailwind v4 con token custom, vitest (`environment: node`, DB reale su `test.db`).

Spec di riferimento: `docs/superpowers/specs/2026-08-15-wishlist-tiers-design.md`

## Global Constraints

- Tutta la copy UI è in **italiano**. I nomi di codice (variabili, tipi, funzioni, file) sono in **inglese**, come nel resto del progetto.
- **Nessuna nuova dipendenza** runtime o dev.
- Solo desktop. Nessun dark mode.
- Solo token del design system: niente arbitrary values Tailwind (`text-[13px]`, `rounded-[14px]`). Usare `text-small`, `text-small-dense`, `text-label`, `rounded-sm`, `rounded-md`, `border-line`, `text-ink-3`, `bg-accent-bg`, `text-accent`, `duration-fast`, `ease-standard` ecc.
- **Nessun colore nuovo** per i tier: le pillole usano l'accento esistente (`border-accent bg-accent-bg text-accent` da attive). I token `--color-role-*` restano riservati ai ruoli P/D/C/A.
- Test: `npm test` (vitest run). Type check: `npx tsc --noEmit`.
- I test toccano un DB reale (`prisma/test.db`, ricreato dal globalSetup). I test che creano righe devono ripulirle in `afterAll`, come fa `lib/players.test.ts`.
- Commit dopo ogni task.

## File Structure

**Nuovi:**

| File | Responsabilità |
|---|---|
| `lib/wishlist.ts` | Vocabolario del dominio tier: ordine, tipo, etichette, validazione, parsing URL, raggruppamento, peso di ordinamento. Puro, zero import da Prisma o React. Gemello di `lib/roles.ts`. |
| `lib/wishlist.test.ts` | Test del modulo sopra. |
| `app/players/WishlistTierCell.tsx` | Le tre pillole A/B/C di una riga della tabella. Client component, stateless, riceve valore + callback. |
| `app/wishlist/page.tsx` | La pagina a tre sezioni (rinominata da `app/watchlist/page.tsx`). |
| `app/wishlist/loading.tsx` | Skeleton (rinominato da `app/watchlist/loading.tsx`). |

**Modificati:**

| File | Cosa cambia |
|---|---|
| `prisma/schema.prisma` | `+ wishlistTier String?` con indice; alla fine `- watchlist Boolean`. |
| `lib/types.ts` | `PlayerWithTeam.watchlist` → `wishlistTier: string \| null`. |
| `lib/players.ts` | `PlayerFilters.watchlistOnly` → `wishlistTier?: string[]`. |
| `lib/filterParams.ts` | `PlayerFilterState.watchlistOnly` → `wishlistTier: WishlistTier[]`; nuovo `toggleTier`. |
| `lib/filterParams.test.ts` | Aggiornati i casi che citano `watchlistOnly`. |
| `lib/players.test.ts` | Nuovo describe per il filtro tier. |
| `app/api/players/route.ts` | Query param `watchlistOnly` → `wishlistTier`. |
| `app/api/players/[id]/route.ts` | PATCH accetta `wishlistTier` (null o tier valido, altrimenti 400). |
| `app/players/PlayersTable.tsx` | Colonna stella → `WishlistTierCell`; sort key `watchlist` → `wishlistTier`. |
| `app/players/ListoneToolbar.tsx` | Checkbox "Wishlist" → gruppo chip A/B/C. |
| `app/components/Sidebar.tsx` | `/watchlist` → `/wishlist`. |

**Eliminati alla fine:** `app/watchlist/` (rinominata, non copiata).

---

### Task 1: Il modulo `lib/wishlist.ts`

Modulo puro, additivo: nessun file esistente lo importa ancora, quindi niente si rompe.

**Files:**
- Create: `lib/wishlist.ts`
- Test: `lib/wishlist.test.ts`

**Interfaces:**
- Consumes: niente.
- Produces:
  - `TIER_ORDER: readonly ["A", "B", "C"]`
  - `type WishlistTier = "A" | "B" | "C"`
  - `TIER_LABELS: Record<WishlistTier, string>`
  - `isValidTier(value: string): value is WishlistTier`
  - `parseTierParam(value?: string | null): WishlistTier[]`
  - `groupByTier<T extends { wishlistTier: string | null }>(players: T[]): Record<WishlistTier, T[]>`
  - `tierSortWeight(tier: string | null): number`

- [ ] **Step 1: Scrivi il test che fallisce**

Crea `lib/wishlist.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  TIER_ORDER,
  TIER_LABELS,
  isValidTier,
  parseTierParam,
  groupByTier,
  tierSortWeight,
} from "@/lib/wishlist";

describe("TIER_ORDER / TIER_LABELS", () => {
  it("lists the tiers from most to least important", () => {
    expect(TIER_ORDER).toEqual(["A", "B", "C"]);
  });

  it("has an Italian label for every tier", () => {
    expect(TIER_LABELS).toEqual({ A: "Big", B: "Medi", C: "Low cost" });
  });
});

describe("isValidTier", () => {
  it("accepts A/B/C", () => {
    expect(isValidTier("A")).toBe(true);
    expect(isValidTier("C")).toBe(true);
  });

  it("rejects anything else, including lowercase", () => {
    expect(isValidTier("D")).toBe(false);
    expect(isValidTier("a")).toBe(false);
    expect(isValidTier("")).toBe(false);
  });
});

describe("parseTierParam", () => {
  it("returns an empty array for null/undefined", () => {
    expect(parseTierParam(null)).toEqual([]);
    expect(parseTierParam(undefined)).toEqual([]);
  });

  it("splits a comma-separated list into valid tiers", () => {
    expect(parseTierParam("A,C")).toEqual(["A", "C"]);
  });

  it("drops invalid entries", () => {
    expect(parseTierParam("A,X,B")).toEqual(["A", "B"]);
  });
});

describe("groupByTier", () => {
  it("always returns all three keys, even when empty", () => {
    expect(groupByTier([])).toEqual({ A: [], B: [], C: [] });
  });

  it("files each player under its tier, preserving input order", () => {
    const players = [
      { id: "1", wishlistTier: "B" },
      { id: "2", wishlistTier: "A" },
      { id: "3", wishlistTier: "B" },
    ];
    const groups = groupByTier(players);
    expect(groups.A.map((p) => p.id)).toEqual(["2"]);
    expect(groups.B.map((p) => p.id)).toEqual(["1", "3"]);
    expect(groups.C).toEqual([]);
  });

  it("ignores players with no tier or an unknown tier", () => {
    const groups = groupByTier([
      { id: "1", wishlistTier: null },
      { id: "2", wishlistTier: "Z" },
    ]);
    expect(groups).toEqual({ A: [], B: [], C: [] });
  });
});

describe("tierSortWeight", () => {
  it("orders A before B before C", () => {
    expect(tierSortWeight("A")).toBeLessThan(tierSortWeight("B"));
    expect(tierSortWeight("B")).toBeLessThan(tierSortWeight("C"));
  });

  it("sinks players with no tier below every tier", () => {
    expect(tierSortWeight(null)).toBeGreaterThan(tierSortWeight("C"));
  });

  it("treats an unknown tier like no tier", () => {
    expect(tierSortWeight("Z")).toBe(tierSortWeight(null));
  });
});
```

- [ ] **Step 2: Lancia il test e verifica che fallisca**

Run: `npm test -- lib/wishlist.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/wishlist"`.

- [ ] **Step 3: Scrivi l'implementazione minima**

Crea `lib/wishlist.ts`:

```ts
export const TIER_ORDER = ["A", "B", "C"] as const;
export type WishlistTier = (typeof TIER_ORDER)[number];

/**
 * A is where the credits go, C is where the leftovers go. The labels are the
 * only place this ordering is spelled out for the user.
 */
export const TIER_LABELS: Record<WishlistTier, string> = {
  A: "Big",
  B: "Medi",
  C: "Low cost",
};

export function isValidTier(value: string): value is WishlistTier {
  return (TIER_ORDER as readonly string[]).includes(value);
}

export function parseTierParam(value?: string | null): WishlistTier[] {
  if (!value) return [];
  return value.split(",").filter(isValidTier);
}

/**
 * Always returns all three buckets so callers can render a stable set of
 * sections without checking for missing keys. Players with no tier (or a tier
 * the database somehow holds outside A/B/C) are dropped.
 */
export function groupByTier<T extends { wishlistTier: string | null }>(
  players: T[]
): Record<WishlistTier, T[]> {
  const groups: Record<WishlistTier, T[]> = { A: [], B: [], C: [] };
  for (const player of players) {
    if (player.wishlistTier && isValidTier(player.wishlistTier)) {
      groups[player.wishlistTier].push(player);
    }
  }
  return groups;
}

/** Sort weight for the listone column: A, B, C, then everything untiered. */
export function tierSortWeight(tier: string | null): number {
  if (!tier || !isValidTier(tier)) return TIER_ORDER.length + 1;
  return TIER_ORDER.indexOf(tier) + 1;
}
```

- [ ] **Step 4: Lancia il test e verifica che passi**

Run: `npm test -- lib/wishlist.test.ts`
Expected: PASS, 12 test.

- [ ] **Step 5: Commit**

```bash
git add lib/wishlist.ts lib/wishlist.test.ts
git commit -m "feat: add the wishlist tier vocabulary"
```

---

### Task 2: La colonna `wishlistTier` nel database

Additiva: `watchlist` resta al suo posto, niente si rompe.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_wishlist_tier/migration.sql` (generato da Prisma)

**Interfaces:**
- Consumes: niente.
- Produces: `Player.wishlistTier: string | null` sul Prisma Client.

- [ ] **Step 1: Aggiungi il campo allo schema**

In `prisma/schema.prisma`, dentro `model Player`, sotto la riga `watchlist`:

```prisma
  watchlist     Boolean  @default(false)
  wishlistTier  String?
```

e aggiungi l'indice accanto a quelli esistenti in fondo al model:

```prisma
  @@index([fantasyTeamId])
  @@index([role])
  @@index([wishlistTier])
```

- [ ] **Step 2: Genera e applica la migration**

Run: `npx prisma migrate dev --name add_wishlist_tier`
Expected: crea `prisma/migrations/<timestamp>_add_wishlist_tier/`, applica su `prisma/dev.db`, rigenera il client. Nessun prompt: la colonna è nullable, non c'è perdita di dati.

- [ ] **Step 3: Verifica che il client conosca il campo**

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npm test`
Expected: tutti verdi (il globalSetup ricrea `test.db` dallo schema aggiornato).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add the wishlistTier column"
```

---

### Task 3: Il filtro per tier nel data layer

Aggiunge `wishlistTier` a fianco di `watchlistOnly`, che resta funzionante fino al Task 8.

**Files:**
- Modify: `lib/players.ts:5-12` (type `PlayerFilters`), `lib/players.ts:21` (clausola where)
- Modify: `lib/filterParams.ts` (state, read, write, count, nuovo `toggleTier`)
- Test: `lib/players.test.ts`, `lib/filterParams.test.ts`

**Interfaces:**
- Consumes: `TIER_ORDER`, `WishlistTier`, `parseTierParam` da `lib/wishlist.ts` (Task 1).
- Produces:
  - `PlayerFilters.wishlistTier?: string[]`
  - `PlayerFilterState.wishlistTier: WishlistTier[]`
  - `toggleTier(tiers: WishlistTier[], tier: WishlistTier): WishlistTier[]`

- [ ] **Step 1: Scrivi i test che falliscono**

In `lib/players.test.ts`, aggiungi l'import di `getFilteredPlayers` alla riga di import esistente:

```ts
import { getRecentAcquisitions, getFilteredPlayers } from "@/lib/players";
```

Dentro il `beforeAll` esistente, dopo la creazione di `unassigned`, aggiungi tre giocatori con tier e mettili in `playerIds`:

```ts
  const tierA = await prisma.player.create({
    data: { name: "__tier_a__", role: "A", serieATeam: "Test", wishlistTier: "A" },
  });
  const tierC = await prisma.player.create({
    data: { name: "__tier_c__", role: "A", serieATeam: "Test", wishlistTier: "C" },
  });
  playerIds.push(older.id, newer.id, unassigned.id, tierA.id, tierC.id);
```

(sostituisci la `playerIds.push(...)` già presente con questa riga, non aggiungerne una seconda)

In fondo al file aggiungi:

```ts
describe("getFilteredPlayers, wishlistTier", () => {
  it("returns only players in the requested tiers", async () => {
    const players = await getFilteredPlayers({ wishlistTier: ["A"] });
    const names = players.map((p) => p.name);
    expect(names).toContain("__tier_a__");
    expect(names).not.toContain("__tier_c__");
    expect(names).not.toContain("__unassigned__");
  });

  it("accepts several tiers at once", async () => {
    const players = await getFilteredPlayers({ wishlistTier: ["A", "C"] });
    const names = players.map((p) => p.name);
    expect(names).toContain("__tier_a__");
    expect(names).toContain("__tier_c__");
  });

  it("ignores an empty tier list rather than returning nothing", async () => {
    const players = await getFilteredPlayers({ wishlistTier: [] });
    expect(players.map((p) => p.name)).toContain("__unassigned__");
  });
});
```

In `lib/filterParams.test.ts`, aggiungi `toggleTier` agli import da `@/lib/filterParams` e aggiungi in fondo:

```ts
describe("wishlistTier filtering", () => {
  it("reads a comma-separated tier list from the query string", () => {
    expect(readFilterState(new URLSearchParams("wishlistTier=A,C")).wishlistTier).toEqual([
      "A",
      "C",
    ]);
  });

  it("drops invalid tiers", () => {
    expect(readFilterState(new URLSearchParams("wishlistTier=A,X,B")).wishlistTier).toEqual([
      "A",
      "B",
    ]);
  });

  it("defaults to an empty selection", () => {
    expect(EMPTY_FILTER_STATE.wishlistTier).toEqual([]);
  });

  it("serialises tiers as a comma-separated list", () => {
    expect(writeFilterState({ ...EMPTY_FILTER_STATE, wishlistTier: ["A", "C"] })).toBe(
      "wishlistTier=A%2CC"
    );
  });

  it("round-trips through readFilterState", () => {
    const state = { ...EMPTY_FILTER_STATE, search: "lauta", wishlistTier: ["B" as const] };
    expect(readFilterState(new URLSearchParams(writeFilterState(state)))).toEqual(state);
  });

  it("counts each selected tier as its own active filter", () => {
    expect(activeFilterCount({ ...EMPTY_FILTER_STATE, wishlistTier: ["A", "B"] })).toBe(2);
  });
});

describe("toggleTier", () => {
  it("adds a tier that is not selected", () => {
    expect(toggleTier(["A"], "C")).toEqual(["A", "C"]);
  });

  it("removes a tier that is selected", () => {
    expect(toggleTier(["A", "C"], "A")).toEqual(["C"]);
  });
});
```

- [ ] **Step 2: Lancia i test e verifica che falliscano**

Run: `npm test -- lib/filterParams.test.ts lib/players.test.ts`
Expected: FAIL — `toggleTier is not a function` e `wishlistTier` undefined nello state.

- [ ] **Step 3: Implementa il filtro in `lib/players.ts`**

Nel type `PlayerFilters`, aggiungi sotto `watchlistOnly`:

```ts
  watchlistOnly?: boolean;
  wishlistTier?: string[];
```

In `getFilteredPlayers`, sotto la riga `if (filters.watchlistOnly) where.watchlist = true;`:

```ts
  if (filters.wishlistTier && filters.wishlistTier.length > 0) {
    where.wishlistTier = { in: filters.wishlistTier };
  }
```

- [ ] **Step 4: Implementa lo stato in `lib/filterParams.ts`**

Aggiungi in cima l'import:

```ts
import { parseTierParam, type WishlistTier } from "@/lib/wishlist";
```

In `PlayerFilterState`, sotto `watchlistOnly`:

```ts
  watchlistOnly: boolean;
  wishlistTier: WishlistTier[];
```

In `EMPTY_FILTER_STATE`, sotto `watchlistOnly: false`:

```ts
  wishlistTier: [],
```

In `readFilterState`, sotto la riga `watchlistOnly`:

```ts
    wishlistTier: parseTierParam(params.get("wishlistTier")),
```

In `writeFilterState`, subito dopo la riga che serializza `serieATeam` e prima del ciclo su `BOOLEAN_KEYS`:

```ts
  if (state.wishlistTier.length > 0) params.set("wishlistTier", state.wishlistTier.join(","));
```

In `activeFilterCount`, aggiungi l'addendo:

```ts
  return (
    state.role.length +
    state.wishlistTier.length +
    (state.serieATeam ? 1 : 0) +
    BOOLEAN_KEYS.filter((key) => state[key]).length
  );
```

E in fondo al file, accanto a `toggleRole`:

```ts
export function toggleTier(tiers: WishlistTier[], tier: WishlistTier): WishlistTier[] {
  return tiers.includes(tier) ? tiers.filter((t) => t !== tier) : [...tiers, tier];
}
```

- [ ] **Step 5: Lancia i test e verifica che passino**

Run: `npm test`
Expected: PASS su tutta la suite.

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 6: Commit**

```bash
git add lib/players.ts lib/filterParams.ts lib/players.test.ts lib/filterParams.test.ts
git commit -m "feat: filter players by wishlist tier"
```

---

### Task 4: Le API accettano il tier

**Files:**
- Modify: `app/api/players/route.ts:6-17` (GET)
- Modify: `app/api/players/[id]/route.ts:59` (PATCH)

**Interfaces:**
- Consumes: `isValidTier`, `parseTierParam` da `lib/wishlist.ts`; `PlayerFilters.wishlistTier` (Task 3).
- Produces: `PATCH /api/players/:id` con body `{ wishlistTier: "A" | "B" | "C" | null }`; `GET /api/players?wishlistTier=A,C`.

- [ ] **Step 1: Aggiungi il parametro di query alla GET**

In `app/api/players/route.ts`, aggiungi l'import:

```ts
import { parseTierParam } from "@/lib/wishlist";
```

e dentro `getFilteredPlayers({ ... })`, sotto `watchlistOnly`:

```ts
    wishlistTier: parseTierParam(searchParams.get("wishlistTier")),
```

- [ ] **Step 2: Accetta il tier nella PATCH**

In `app/api/players/[id]/route.ts`, aggiungi l'import:

```ts
import { isValidTier } from "@/lib/wishlist";
```

e sotto la riga `if (body.watchlist !== undefined) data.watchlist = !!body.watchlist;`:

```ts
  if (body.wishlistTier !== undefined) {
    // null clears the tier; anything outside A/B/C is a client bug, not a value
    // to silently coerce.
    if (body.wishlistTier !== null && !isValidTier(body.wishlistTier)) {
      return NextResponse.json({ error: "Invalid wishlist tier" }, { status: 400 });
    }
    data.wishlistTier = body.wishlistTier;
  }
```

- [ ] **Step 3: Verifica a mano contro il server di sviluppo**

Run: `npm run dev` in un terminale, poi in un altro:

```bash
PLAYER_ID=$(curl -s 'http://localhost:3000/api/players' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)[0].id))')
curl -s -X PATCH "http://localhost:3000/api/players/$PLAYER_ID" -H 'Content-Type: application/json' -d '{"wishlistTier":"A"}'
curl -s -X PATCH "http://localhost:3000/api/players/$PLAYER_ID" -H 'Content-Type: application/json' -d '{"wishlistTier":"Z"}'
curl -s "http://localhost:3000/api/players?wishlistTier=A" | head -c 200
```

Expected: la prima PATCH risponde con il giocatore e `"wishlistTier":"A"`; la seconda risponde `{"error":"Invalid wishlist tier"}` con status 400; la GET filtrata contiene quel giocatore.

(Se il listone è vuoto, importa prima un CSV da `/players/import` o crea un giocatore con `curl -X POST http://localhost:3000/api/players -H 'Content-Type: application/json' -d '{"name":"Test","role":"A","serieATeam":"Inter"}'`.)

- [ ] **Step 4: Verifica tipi e suite**

Run: `npx tsc --noEmit && npm test`
Expected: nessun errore, suite verde.

- [ ] **Step 5: Commit**

```bash
git add app/api/players/route.ts "app/api/players/[id]/route.ts"
git commit -m "feat: accept a wishlist tier in the players API"
```

---

### Task 5: Le pillole A/B/C in tabella

**Files:**
- Create: `app/players/WishlistTierCell.tsx`
- Modify: `lib/types.ts:17` (`PlayerWithTeam`)
- Modify: `app/players/PlayersTable.tsx` (sort key, colonna, handler)

**Interfaces:**
- Consumes: `TIER_ORDER`, `WishlistTier`, `tierSortWeight` da `lib/wishlist.ts`; la PATCH del Task 4.
- Produces: `PlayerWithTeam.wishlistTier: string | null`; il componente
  `WishlistTierCell({ value: string | null, onChange: (tier: WishlistTier | null) => void })`.

- [ ] **Step 1: Aggiungi il campo al tipo condiviso**

In `lib/types.ts`, dentro `PlayerWithTeam`, sotto `watchlist`:

```ts
  watchlist: boolean;
  wishlistTier: string | null;
```

Il tipo è `string | null` e non `WishlistTier | null` perché la riga arriva da Prisma, dove la colonna è una stringa libera: la validazione sta al confine (API) e nel raggruppamento.

- [ ] **Step 2: Crea il componente**

Crea `app/players/WishlistTierCell.tsx`:

```tsx
"use client";

import { TIER_ORDER, TIER_LABELS, type WishlistTier } from "@/lib/wishlist";

/**
 * Three always-visible pills rather than a cycling star: during auction prep a
 * player gets sorted into a list in one click, and clicking the pill that is
 * already active is how you take them off the wishlist entirely.
 */
export default function WishlistTierCell({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (tier: WishlistTier | null) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {TIER_ORDER.map((tier) => {
        const active = value === tier;
        return (
          <button
            key={tier}
            type="button"
            aria-pressed={active}
            title={`Lista ${tier} — ${TIER_LABELS[tier]}`}
            onClick={() => onChange(active ? null : tier)}
            className={`h-6 w-6 rounded-sm border font-mono text-small-dense font-semibold transition-colors duration-fast ease-standard ${
              active
                ? "border-accent bg-accent-bg text-accent"
                : "border-transparent text-ink-3 hover:border-line-strong hover:text-ink-2"
            }`}
          >
            {tier}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Sostituisci la colonna nella tabella**

In `app/players/PlayersTable.tsx`:

Aggiungi gli import:

```tsx
import { tierSortWeight, type WishlistTier } from "@/lib/wishlist";
import WishlistTierCell from "./WishlistTierCell";
```

Cambia il type `SortKey` (ultima voce):

```tsx
type SortKey = "name" | "role" | "serieATeam" | "starter" | "fantasyTeam" | "cost" | "wishlistTier";
```

In `ALL_COLUMNS`, l'ultima voce:

```tsx
  { key: "wishlistTier", label: "Wish" },
```

Nello `switch` di ordinamento, sostituisci il `case "watchlist"`:

```tsx
        case "wishlistTier":
          aVal = tierSortWeight(a.wishlistTier);
          bVal = tierSortWeight(b.wishlistTier);
          break;
```

Sostituisci `toggleWatchlist` con:

```tsx
  async function setTier(player: PlayerWithTeam, tier: WishlistTier | null) {
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wishlistTier: tier }),
    });
    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }
    setError(null);
    router.refresh();
  }
```

Sostituisci la `<td>` con il bottone stella della wishlist (quella con `onClick={() => toggleWatchlist(p)}`, **non** quella con `title="Titolare"`) con:

```tsx
                <td className="h-11 border-b border-line px-3 align-middle">
                  <WishlistTierCell
                    value={p.wishlistTier}
                    onChange={(tier) => setTier(p, tier)}
                  />
                </td>
```

L'import di `Star` da lucide-react resta: lo usa ancora la colonna "Titolare".

- [ ] **Step 4: Verifica tipi e suite**

Run: `npx tsc --noEmit && npm test`
Expected: nessun errore, suite verde.

- [ ] **Step 5: Verifica a mano nel browser**

Run: `npm run dev`, apri `http://localhost:3000/players`.
Expected: la colonna "Wish" mostra tre pillole A/B/C per riga. Click su `B` la evidenzia in accento; ricarica la pagina e resta evidenziata. Click su `A` sposta l'evidenza su `A`. Click di nuovo su `A` la spegne, nessuna pillola attiva. L'header "Wish" ordina la tabella mettendo prima le A e in fondo i giocatori senza tier.

- [ ] **Step 6: Commit**

```bash
git add app/players/WishlistTierCell.tsx app/players/PlayersTable.tsx lib/types.ts
git commit -m "feat: set the wishlist tier from the listone table"
```

---

### Task 6: I chip A/B/C nel toolbar

**Files:**
- Modify: `app/players/ListoneToolbar.tsx`

**Interfaces:**
- Consumes: `TIER_ORDER`, `TIER_LABELS` da `lib/wishlist.ts`; `toggleTier` e `PlayerFilterState.wishlistTier` da `lib/filterParams.ts` (Task 3).
- Produces: niente per i task successivi.

- [ ] **Step 1: Aggiorna import e label**

In `app/players/ListoneToolbar.tsx`, aggiungi:

```tsx
import { TIER_ORDER, TIER_LABELS } from "@/lib/wishlist";
```

e aggiungi `toggleTier` alla lista di import da `@/lib/filterParams`.

Togli `watchlistOnly` da `BOOLEAN_LABELS`, che resta:

```tsx
const BOOLEAN_LABELS = {
  freeAgentOnly: "Svincolati",
  starterOnly: "Titolari",
} as const;
```

- [ ] **Step 2: Aggiungi il gruppo di chip tier**

Subito dopo il `<div className="flex gap-1">` dei chip ruolo (cioè dopo la sua chiusura `</div>` e prima del `<select>` delle squadre), inserisci:

```tsx
        {showStatusToggles && (
          <div className="flex items-center gap-1.5">
            {/* Labelled because "C" means centrocampista two chip groups to the
                left, and an unlabelled A/B/C row next to P/D/C/A reads wrong. */}
            <span className="text-label uppercase text-ink-3">Wish</span>
            <div className="flex gap-1">
              {TIER_ORDER.map((tier) => {
                const active = state.wishlistTier.includes(tier);
                return (
                  <button
                    key={tier}
                    type="button"
                    aria-pressed={active}
                    title={`Lista ${tier} — ${TIER_LABELS[tier]}`}
                    onClick={() =>
                      push({ ...state, wishlistTier: toggleTier(state.wishlistTier, tier) })
                    }
                    className={`h-7 w-7 rounded-sm border font-mono text-small-dense font-semibold transition-colors duration-fast ease-standard ${
                      active
                        ? "border-accent bg-accent-bg text-accent"
                        : "border-line-strong bg-surface text-ink-3 hover:border-ink-3 hover:text-ink-2"
                    }`}
                  >
                    {tier}
                  </button>
                );
              })}
            </div>
          </div>
        )}
```

- [ ] **Step 3: Aggiungi i chip tier alla riga dei filtri attivi**

Nel blocco `{activeCount > 0 && ( ... )}`, subito dopo il `.map` dei chip ruolo:

```tsx
          {state.wishlistTier.map((tier) => (
            <Chip
              key={`tier-${tier}`}
              label={`Wish ${tier}`}
              onRemove={() =>
                push({ ...state, wishlistTier: toggleTier(state.wishlistTier, tier) })
              }
            />
          ))}
```

E nel bottone "Azzera tutto", aggiungi il reset del tier:

```tsx
            onClick={() => push({ ...state, role: [], wishlistTier: [], serieATeam: "", freeAgentOnly: false, starterOnly: false, watchlistOnly: false })}
```

- [ ] **Step 4: Verifica tipi e suite**

Run: `npx tsc --noEmit && npm test`
Expected: nessun errore, suite verde.

- [ ] **Step 5: Verifica a mano nel browser**

Run: `npm run dev`, apri `http://localhost:3000/players`.
Expected: accanto ai chip ruolo compare "WISH" con tre chip A/B/C. Click su `A` filtra la tabella ai soli giocatori in lista A e l'URL diventa `?wishlistTier=A`; click anche su `C` dà `?wishlistTier=A,C` e mostra entrambe le liste. In basso compaiono i chip "Wish A" e "Wish C", rimuovibili con la X. "Azzera tutto" li toglie e riporta l'URL a `/players`. La vecchia checkbox "Wishlist" non c'è più.

- [ ] **Step 6: Commit**

```bash
git add app/players/ListoneToolbar.tsx
git commit -m "feat: filter the listone by wishlist tier"
```

---

### Task 7: La pagina `/wishlist` a tre sezioni

**Files:**
- Create: `app/wishlist/page.tsx` (via `git mv` da `app/watchlist/page.tsx`)
- Create: `app/wishlist/loading.tsx` (via `git mv` da `app/watchlist/loading.tsx`)
- Modify: `app/components/Sidebar.tsx:12`

**Interfaces:**
- Consumes: `TIER_ORDER`, `TIER_LABELS`, `groupByTier` da `lib/wishlist.ts`; `PlayerFilters.wishlistTier` (Task 3).
- Produces: la rotta `/wishlist`. La rotta `/watchlist` smette di esistere.

- [ ] **Step 1: Rinomina la cartella**

Run:

```bash
git mv app/watchlist app/wishlist
```

- [ ] **Step 2: Riscrivi la pagina a tre sezioni**

Sostituisci **tutto** il contenuto di `app/wishlist/page.tsx` con:

```tsx
import { getFilteredPlayers } from "@/lib/players";
import { getTeamsWithRoster, getDistinctSerieATeams } from "@/lib/teams";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER, type Role } from "@/lib/roles";
import { TIER_ORDER, TIER_LABELS, groupByTier } from "@/lib/wishlist";
import { readSearchParams } from "@/lib/filterParams";
import PageHeader from "@/app/components/PageHeader";
import ListoneToolbar from "../players/ListoneToolbar";
import PlayersTable from "../players/PlayersTable";

export const dynamic = "force-dynamic";

export default async function WishlistPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const filters = readSearchParams(params);

  const [players, teams, serieATeams, leagueSettings] = await Promise.all([
    // The route is the filter: only free agents, only players in a list, always.
    // The tier filter is forced past whatever the URL says — here the sections
    // are the tiers, so filtering by tier on top of them would say it twice.
    getFilteredPlayers({
      ...filters,
      wishlistTier: [...TIER_ORDER],
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

  const teamSummaries = teams.map((t) => ({
    id: t.id,
    name: t.name,
    remainingCredits: t.remainingCredits,
    roleCounts: t.roleCounts,
  }));

  const groups = groupByTier(players);

  return (
    <>
      <PageHeader
        title="Wishlist"
        subtitle="Solo svincolati. Sposta un giocatore fra le liste dalle pillole A/B/C."
      />
      <ListoneToolbar
        serieATeams={serieATeams}
        resultCount={players.length}
        showStatusToggles={false}
      />
      {TIER_ORDER.map((tier) => (
        <section key={tier} className="mt-8">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-h2">
              Lista {tier} — {TIER_LABELS[tier]}
            </h2>
            <span className="font-mono text-small-dense tabular-nums text-ink-3">
              {groups[tier].length} giocatori
            </span>
          </div>
          {groups[tier].length === 0 ? (
            // Empty sections stay on the page so its shape does not depend on
            // the data. EmptyState is too heavy to repeat three times here.
            <p className="border-t border-line py-4 text-small text-ink-3">
              Nessun giocatore in questa lista.
            </p>
          ) : (
            <PlayersTable
              players={groups[tier]}
              teams={teamSummaries}
              roleLimits={roleLimits}
              showCost={false}
            />
          )}
        </section>
      ))}
    </>
  );
}
```

- [ ] **Step 3: Aggiorna lo skeleton**

Sostituisci il contenuto di `app/wishlist/loading.tsx` con una versione a tre sezioni, così il caricamento ha la stessa forma della pagina:

```tsx
import PageHeader from "@/app/components/PageHeader";
import { Skeleton, SkeletonRows } from "@/app/components/Skeleton";
import { TIER_ORDER } from "@/lib/wishlist";

export default function Loading() {
  return (
    <>
      <PageHeader title="Wishlist" />
      <Skeleton className="h-8 w-full" />
      {TIER_ORDER.map((tier) => (
        <div key={tier} className="mt-8">
          <Skeleton className="h-6 w-48" />
          <div className="mt-2">
            <SkeletonRows count={3} />
          </div>
        </div>
      ))}
    </>
  );
}
```

- [ ] **Step 4: Aggiorna il link in sidebar**

In `app/components/Sidebar.tsx`, in `PRIMARY_LINKS`:

```tsx
  { href: "/wishlist", label: "Wishlist", icon: Star },
```

- [ ] **Step 5: Verifica che non resti nessun riferimento a `/watchlist`**

Run: `grep -rn "/watchlist" app lib --include=*.ts --include=*.tsx`
Expected: nessun risultato.

- [ ] **Step 6: Verifica tipi e suite**

Run: `npx tsc --noEmit && npm test`
Expected: nessun errore, suite verde.

- [ ] **Step 7: Verifica a mano nel browser**

Run: `npm run dev`.
Expected: la voce "Wishlist" in sidebar porta a `/wishlist` e risulta attiva. La pagina mostra tre sezioni "Lista A — Big", "Lista B — Medi", "Lista C — Low cost", ognuna col suo conteggio; una lista vuota mostra "Nessun giocatore in questa lista". La ricerca per nome nel toolbar filtra tutte e tre le sezioni. Cambiando tier a un giocatore dalle pillole, questo salta nella sezione corrispondente al refresh. Ordinando per "Nome" in una sezione, le altre due non cambiano ordine. `http://localhost:3000/watchlist` dà 404.

- [ ] **Step 8: Commit**

```bash
git add app/wishlist app/components/Sidebar.tsx
git commit -m "feat: split the wishlist page into three tier sections"
```

---

### Task 8: Rimuovi il vecchio flag `watchlist`

Ultimo passo: la colonna e i suoi riferimenti residui escono di scena.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_drop_watchlist_flag/migration.sql`
- Modify: `lib/types.ts`, `lib/players.ts`, `lib/filterParams.ts`, `lib/filterParams.test.ts`
- Modify: `app/api/players/route.ts`, `app/api/players/[id]/route.ts`
- Modify: `app/players/ListoneToolbar.tsx` (solo "Azzera tutto")

**Interfaces:**
- Consumes: niente di nuovo.
- Produces: nessun riferimento a `watchlist` nel repo.

- [ ] **Step 1: Togli il campo dallo schema**

In `prisma/schema.prisma`, cancella la riga:

```prisma
  watchlist     Boolean  @default(false)
```

- [ ] **Step 2: Genera la migration senza applicarla**

Run: `npx prisma migrate dev --name drop_watchlist_flag --create-only`
Expected: crea la cartella della migration con dentro il `DROP COLUMN` (in SQLite, la ricostruzione della tabella). Non applica ancora nulla, quindi nessun prompt interattivo sulla perdita di dati.

- [ ] **Step 3: Applica la migration**

Run: `npx prisma migrate deploy && npx prisma generate`
Expected: `1 migration applied`, client rigenerato. La colonna sparisce da `prisma/dev.db`.

- [ ] **Step 4: Togli i riferimenti nel codice**

`lib/types.ts` — cancella da `PlayerWithTeam`:

```ts
  watchlist: boolean;
```

`lib/players.ts` — cancella da `PlayerFilters` la riga `watchlistOnly?: boolean;` e da `getFilteredPlayers` la riga:

```ts
  if (filters.watchlistOnly) where.watchlist = true;
```

`lib/filterParams.ts` — cancella `watchlistOnly: boolean;` da `PlayerFilterState`, `watchlistOnly: false,` da `EMPTY_FILTER_STATE`, la riga `watchlistOnly: params.get(...)` da `readFilterState`, e togli la chiave da `BOOLEAN_KEYS`, che resta:

```ts
const BOOLEAN_KEYS = ["freeAgentOnly", "starterOnly"] as const;
```

`app/api/players/route.ts` — cancella dalla GET:

```ts
    watchlistOnly: searchParams.get("watchlistOnly") === "true",
```

`app/api/players/[id]/route.ts` — cancella:

```ts
  if (body.watchlist !== undefined) data.watchlist = !!body.watchlist;
```

`app/players/ListoneToolbar.tsx` — nel bottone "Azzera tutto", togli `watchlistOnly: false` dall'oggetto:

```tsx
            onClick={() => push({ ...state, role: [], wishlistTier: [], serieATeam: "", freeAgentOnly: false, starterOnly: false })}
```

- [ ] **Step 5: Aggiorna i test che citano `watchlistOnly`**

In `lib/filterParams.test.ts`:

- nel test "reads every field": togli `watchlistOnly=true` dalla query string e `watchlistOnly: true` dall'oggetto atteso;
- nel test "round-trips through readFilterState": togli `watchlistOnly: true` dallo `state`;
- nel test "counts a team and each active toggle": sostituisci `watchlistOnly: true` con `starterOnly: true` (l'atteso resta `3`).

- [ ] **Step 6: Verifica che non resti nessuna traccia**

Run: `grep -rni "watchlist" app lib prisma/schema.prisma`
Expected: nessun risultato. (Le vecchie migration in `prisma/migrations/` citano la colonna: è storia applicata, non si tocca.)

- [ ] **Step 7: Verifica tipi e suite**

Run: `npx tsc --noEmit && npm test`
Expected: nessun errore, suite verde.

Run: `npm run build`
Expected: build completata senza errori.

- [ ] **Step 8: Verifica a mano nel browser**

Run: `npm run dev`.
Expected: `/players` e `/wishlist` funzionano come nel Task 7; il filtro tier e le pillole continuano a salvare. Nessun errore in console.

- [ ] **Step 9: Commit**

```bash
git add prisma app lib
git commit -m "refactor: drop the superseded watchlist flag"
```

---

### Task 9: Aggiorna il README

**Files:**
- Modify: `README.md` (sezione "Funzionalità")

**Interfaces:**
- Consumes: niente.
- Produces: niente.

- [ ] **Step 1: Riscrivi le due voci interessate**

In `README.md`, nella sezione "Funzionalità", sostituisci la riga della watchlist:

```markdown
- **Wishlist** (`/wishlist`) — giocatori svincolati divisi in tre liste di priorità: **A** (big), **B** (medi), **C** (low cost). Il tier si assegna dalle pillole A/B/C nella colonna "Wish" del listone; riclick sulla pillola attiva toglie il giocatore dalla wishlist.
```

e nella riga "Giocatori", sostituisci `watchlist` con `tier wishlist` nell'elenco dei filtri:

```markdown
- **Giocatori** (`/players`) — elenco con filtri (nome, ruolo, squadra Serie A, svincolati, titolari, tier wishlist), assegnazione a squadra, aggiunta manuale.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: describe the three wishlist tiers"
```
