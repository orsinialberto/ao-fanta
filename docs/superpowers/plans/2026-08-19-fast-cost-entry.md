# Inserimento veloce del costo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare il costo di un giocatore da 10 a 40 in una digitazione, un trascinamento o una pressione lunga, invece di 30 tap sul `+`.

**Architecture:** Tutta la matematica (parsing, clamp, curva di accelerazione della pressione lunga, curva di scrub) sta in un modulo puro `lib/bidInput.ts`, testato con vitest. Un solo componente client `app/components/CostField.tsx` consuma quel modulo e implementa i quattro modi di input (digitazione, frecce, pressione lunga, scrub) con Pointer Events nativi. `AssignDialog` smette di avere un suo `<input type="number">` e monta `CostField`. Il mockup viene riallineato per ultimo, così la fonte di design non resta indietro rispetto al codice.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 (token in `@theme` dentro `app/globals.css`), lucide-react, vitest (`environment: "node"`).

**Spec:** `docs/superpowers/specs/2026-08-19-fast-cost-entry-design.md`

## Global Constraints

- **Nessuna nuova dipendenza.** Né runtime né dev. Niente librerie di gesture, spring o test DOM.
- **Nessun test DOM.** `vitest.config.ts` usa `environment: "node"` e il repo non ha `@testing-library`. Non aggiungerli. Si testano solo le funzioni pure di `lib/bidInput.ts`; il componente si verifica a mano.
- **`MIN_BID = 1`, `MAX_BID = 999`.** Valori esatti, definiti una volta sola in `lib/bidInput.ts` e importati da chiunque altro.
- **Ritardo prima della ripetizione: 400 ms.** Soglia dello scrub: 4 px.
- **Il campo non blocca l'over-budget.** Confermare sopra i crediti residui resta possibile: l'`InlineError` di `AssignDialog` avvisa e basta.
- **Feedback al pointer-down**, mai al rilascio.
- **Copy UI in italiano**, `aria-label` inclusi.
- **Token esistenti, non valori grezzi.** Colori `ink`/`ink-2`/`ink-3`/`surface`/`line`/`line-strong`/`accent`/`danger`, testi `text-display`/`text-body`/`text-small`/`text-label`, durate `duration-fast`/`duration-base`, easing `ease-standard`. Sono in `app/globals.css`.
- **Commit in inglese**, Conventional Commits, come tutta la history del repo.

## Verifica manuale — procedura condivisa

Diversi task chiudono con un controllo a mano. Ogni volta significa questo:

1. `npm run dev` in un terminale separato (se non gira già).
2. Chrome su `http://localhost:3000` (la home è l'Asta).
3. Cerca `Lautaro` nel campo di ricerca, `Invio` per aprire il dialog di assegnazione.
4. Dove il task chiede il mobile: `Cmd+Option+I`, `Cmd+Shift+M`, viewport **375×667**.

---

### Task 1: Modulo puro `lib/bidInput.ts`

**Files:**
- Create: `lib/bidInput.ts`
- Test: `lib/bidInput.test.ts`

**Interfaces:**
- Consumes: niente.
- Produces:
  - `MIN_BID: 1`, `MAX_BID: 999`
  - `parseBid(raw: string): number | null` — `null` quando la stringa non contiene cifre (campo in corso di svuotamento)
  - `clampBid(value: number): number`
  - `bumpBid(current: number, delta: number): number`
  - `repeatTick(elapsedMs: number): { delta: number; intervalMs: number }`
  - `scrubCredits(dxPx: number, speedPxPerSec: number): number` — crediti frazionari con segno

- [ ] **Step 1: Write the failing test**

Crea `lib/bidInput.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  MIN_BID,
  MAX_BID,
  parseBid,
  clampBid,
  bumpBid,
  repeatTick,
  scrubCredits,
} from "@/lib/bidInput";

describe("parseBid", () => {
  it("legge una stringa di cifre", () => {
    expect(parseBid("40")).toBe(40);
  });

  it("ignora tutto ciò che non è una cifra, perché il tastierino mobile manda anche altro", () => {
    expect(parseBid("4e0")).toBe(40);
    expect(parseBid("-12")).toBe(12);
    expect(parseBid("1.5")).toBe(15);
  });

  it("toglie gli zeri iniziali", () => {
    expect(parseBid("007")).toBe(7);
  });

  it("restituisce null sul vuoto, così il campo può restare vuoto mentre si digita", () => {
    expect(parseBid("")).toBeNull();
    expect(parseBid("abc")).toBeNull();
  });

  it("non clampa: il clamp è di clampBid", () => {
    expect(parseBid("0")).toBe(0);
    expect(parseBid("100000")).toBe(100000);
  });
});

describe("clampBid", () => {
  it("tiene il valore dentro i limiti dell'asta", () => {
    expect(clampBid(40)).toBe(40);
    expect(clampBid(0)).toBe(MIN_BID);
    expect(clampBid(-5)).toBe(MIN_BID);
    expect(clampBid(5000)).toBe(MAX_BID);
  });

  it("arrotonda i frazionari che arrivano dallo scrub", () => {
    expect(clampBid(12.4)).toBe(12);
    expect(clampBid(12.6)).toBe(13);
  });

  it("non propaga NaN al campo", () => {
    expect(clampBid(Number.NaN)).toBe(MIN_BID);
  });
});

describe("bumpBid", () => {
  it("somma il delta e clampa", () => {
    expect(bumpBid(10, 25)).toBe(35);
    expect(bumpBid(3, -10)).toBe(MIN_BID);
    expect(bumpBid(995, 25)).toBe(MAX_BID);
  });
});

describe("repeatTick", () => {
  it("parte lento, un credito per tick", () => {
    expect(repeatTick(0)).toEqual({ delta: 1, intervalMs: 120 });
    expect(repeatTick(599)).toEqual({ delta: 1, intervalMs: 120 });
  });

  it("dopo mezzo secondo raddoppia la frequenza", () => {
    expect(repeatTick(600)).toEqual({ delta: 1, intervalMs: 60 });
    expect(repeatTick(1499)).toEqual({ delta: 1, intervalMs: 60 });
  });

  it("dopo un secondo e mezzo sale a cinque crediti per tick", () => {
    expect(repeatTick(1500)).toEqual({ delta: 5, intervalMs: 60 });
  });

  it("dopo tre secondi sale a dieci: 10 → 40 in poco più di un secondo", () => {
    expect(repeatTick(3000)).toEqual({ delta: 10, intervalMs: 60 });
    expect(repeatTick(9000)).toEqual({ delta: 10, intervalMs: 60 });
  });
});

describe("scrubCredits", () => {
  it("è fine quando il dito va piano: otto pixel per credito", () => {
    expect(scrubCredits(8, 100)).toBeCloseTo(1);
    expect(scrubCredits(-8, 100)).toBeCloseTo(-1);
  });

  it("è medio a velocità media: tre pixel per credito", () => {
    expect(scrubCredits(9, 500)).toBeCloseTo(3);
  });

  it("è grosso quando il dito corre: un pixel per credito", () => {
    expect(scrubCredits(30, 1200)).toBeCloseTo(30);
  });

  it("usa il modulo della velocità, non il suo segno", () => {
    expect(scrubCredits(-30, -1200)).toBeCloseTo(-30);
  });

  it("restituisce zero senza spostamento", () => {
    expect(scrubCredits(0, 900)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/bidInput.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/bidInput"`.

- [ ] **Step 3: Write minimal implementation**

Crea `lib/bidInput.ts`:

```ts
/**
 * La matematica dell'inserimento del costo, isolata dal componente perché è
 * l'unica parte testabile: `vitest.config.ts` gira in `environment: "node"`.
 */

/** Zero non è un'offerta valida all'asta. */
export const MIN_BID = 1;
/** Oltre qualsiasi budget di lega (default 500) e lungo tre caratteri. */
export const MAX_BID = 999;

/**
 * Legge quello che c'è nel campo. Restituisce `null` quando non c'è nessuna
 * cifra: serve a lasciare il campo vuoto mentre si cancella per riscrivere,
 * invece di rimetterci dentro un 1 sotto le dita.
 */
export function parseBid(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return null;
  return Number(digits);
}

export function clampBid(value: number): number {
  if (!Number.isFinite(value)) return MIN_BID;
  return Math.min(MAX_BID, Math.max(MIN_BID, Math.round(value)));
}

export function bumpBid(current: number, delta: number): number {
  return clampBid(current + delta);
}

/**
 * Curva della pressione lunga su `+` / `−`. Il tempo è quello passato da
 * quando il dito è sceso; il chiamante applica il primo credito subito e
 * aspetta 400 ms prima del primo tick.
 *
 * Le soglie servono a coprire il salto tipico dell'asta (10 → 40) in poco
 * più di un secondo di pressione, restando comunque precisi al credito nei
 * primi mezzo secondo.
 */
export function repeatTick(elapsedMs: number): { delta: number; intervalMs: number } {
  if (elapsedMs < 600) return { delta: 1, intervalMs: 120 };
  if (elapsedMs < 1500) return { delta: 1, intervalMs: 60 };
  if (elapsedMs < 3000) return { delta: 5, intervalMs: 60 };
  return { delta: 10, intervalMs: 60 };
}

/**
 * Crediti guadagnati trascinando `dxPx` orizzontalmente sulla cifra, alla
 * velocità `speedPxPerSec`. Piano = fine, veloce = grosso: la stessa logica
 * dello scrubbing di un video, dove allontanarsi cambia la precisione.
 *
 * Il risultato è frazionario di proposito: il componente accumula e applica
 * solo la parte intera, altrimenti trascinare piano non muoverebbe mai nulla.
 */
export function scrubCredits(dxPx: number, speedPxPerSec: number): number {
  const speed = Math.abs(speedPxPerSec);
  const pixelsPerCredit = speed < 200 ? 8 : speed < 800 ? 3 : 1;
  return dxPx / pixelsPerCredit;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/bidInput.test.ts`
Expected: PASS, 18 test.

- [ ] **Step 5: Run the whole suite and the type check**

Run: `npm test && npx tsc --noEmit`
Expected: tutti i test verdi, nessun errore di tipo.

- [ ] **Step 6: Commit**

```bash
git add lib/bidInput.ts lib/bidInput.test.ts
git commit -m "feat: add bid input maths for fast cost entry"
```

---

### Task 2: Componente `CostField`

**Files:**
- Create: `app/components/CostField.tsx`
- Test: nessuno automatico (vedi Global Constraints) — verifica manuale nello Step 3

**Interfaces:**
- Consumes: `MIN_BID`, `MAX_BID`, `parseBid`, `clampBid`, `bumpBid`, `repeatTick`, `scrubCredits` da `@/lib/bidInput` (Task 1).
- Produces: `export default function CostField(props: { value: number; onChange: (next: number) => void; remainingCredits?: number; autoFocus?: boolean })`.

- [ ] **Step 1: Write the component**

Crea `app/components/CostField.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  MIN_BID,
  MAX_BID,
  parseBid,
  clampBid,
  bumpBid,
  repeatTick,
  scrubCredits,
} from "@/lib/bidInput";

/** Il rilancio all'asta è un incremento, non un valore assoluto. */
const QUICK_BUMPS = [5, 10, 25] as const;
/** Quanto si tiene premuto prima che il pulsante inizi a ripetere. */
const REPEAT_DELAY_MS = 400;
/** Sotto questa soglia il gesto è un tap (metti a fuoco), non uno scrub. */
const SCRUB_THRESHOLD_PX = 4;

export default function CostField({
  value,
  onChange,
  remainingCredits,
  autoFocus = false,
}: {
  value: number;
  onChange: (next: number) => void;
  remainingCredits?: number;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // I gesti leggono il valore dentro closure che vivono più a lungo di un
  // render (timer di ripetizione, pointermove), quindi serve un ref.
  const valueRef = useRef(value);
  valueRef.current = value;

  const repeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrub = useRef<{ lastX: number; lastT: number; carry: number; active: boolean } | null>(null);

  // Il valore può cambiare da fuori (riapertura del dialog su un altro
  // giocatore): il draft segue, ma non mentre lo si sta scrivendo.
  useEffect(() => {
    if (parseBid(draft) !== value) setDraft(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => () => stopRepeat(), []);

  function commit(next: number) {
    const clamped = clampBid(next);
    setDraft(String(clamped));
    onChange(clamped);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
    setDraft(digits);
    const parsed = parseBid(digits);
    if (parsed !== null) onChange(clampBid(parsed));
  }

  function handleBlur() {
    const parsed = parseBid(draft);
    commit(parsed === null ? MIN_BID : parsed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const step = (e.shiftKey ? 10 : 1) * (e.key === "ArrowUp" ? 1 : -1);
    commit(bumpBid(valueRef.current, step));
  }

  function stopRepeat() {
    if (repeatTimer.current !== null) clearTimeout(repeatTimer.current);
    repeatTimer.current = null;
  }

  /** Il primo credito parte al pointer-down: il feedback non aspetta il rilascio. */
  function startRepeat(direction: 1 | -1) {
    stopRepeat();
    commit(bumpBid(valueRef.current, direction));
    const startedAt = Date.now();
    const tick = () => {
      const { delta, intervalMs } = repeatTick(Date.now() - startedAt);
      commit(bumpBid(valueRef.current, direction * delta));
      repeatTimer.current = setTimeout(tick, intervalMs);
    };
    repeatTimer.current = setTimeout(tick, REPEAT_DELAY_MS);
  }

  function onScrubDown(e: React.PointerEvent<HTMLInputElement>) {
    scrub.current = { lastX: e.clientX, lastT: e.timeStamp, carry: 0, active: false };
  }

  function onScrubMove(e: React.PointerEvent<HTMLInputElement>) {
    const s = scrub.current;
    if (!s) return;

    const dx = e.clientX - s.lastX;
    if (!s.active) {
      if (Math.abs(dx) < SCRUB_THRESHOLD_PX) return;
      s.active = true;
      // Da qui è un trascinamento, non una selezione di testo: il campo esce
      // di scena (e su mobile la tastiera si chiude) e il puntatore resta
      // agganciato anche fuori dai bordi.
      inputRef.current?.blur();
      inputRef.current?.setPointerCapture(e.pointerId);
    }

    const dt = Math.max(e.timeStamp - s.lastT, 1);
    s.carry += scrubCredits(dx, (dx / dt) * 1000);
    const whole = Math.trunc(s.carry);
    if (whole !== 0) {
      s.carry -= whole;
      commit(bumpBid(valueRef.current, whole));
    }
    s.lastX = e.clientX;
    s.lastT = e.timeStamp;
  }

  function onScrubUp(e: React.PointerEvent<HTMLInputElement>) {
    const s = scrub.current;
    scrub.current = null;
    if (!s) return;
    if (s.active) inputRef.current?.releasePointerCapture(e.pointerId);
    else inputRef.current?.select(); // tap secco: pronto per digitare il prezzo
  }

  const overBudget = remainingCredits !== undefined && value > remainingCredits;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          onPointerDown={onScrubDown}
          onPointerMove={onScrubMove}
          onPointerUp={onScrubUp}
          onPointerCancel={onScrubUp}
          autoFocus={autoFocus}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={3}
          aria-label="Costo in crediti"
          aria-describedby="cost-field-hint"
          className="w-[4.5ch] touch-pan-y select-none rounded-md bg-transparent text-center font-mono text-display tabular-nums text-ink caret-accent focus:outline-none"
        />
        <span className="text-small text-ink-3">crediti</span>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Diminuisci di 1 credito"
            onPointerDown={() => startRepeat(-1)}
            onPointerUp={stopRepeat}
            onPointerLeave={stopRepeat}
            onPointerCancel={stopRepeat}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-ink transition-colors duration-fast ease-standard hover:border-line-strong active:bg-surface-sunk"
          >
            <Minus size={18} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            aria-label="Aumenta di 1 credito"
            onPointerDown={() => startRepeat(1)}
            onPointerUp={stopRepeat}
            onPointerLeave={stopRepeat}
            onPointerCancel={stopRepeat}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-ink transition-colors duration-fast ease-standard hover:border-line-strong active:bg-surface-sunk"
          >
            <Plus size={18} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {QUICK_BUMPS.map((bump) => (
          <button
            key={bump}
            type="button"
            onPointerDown={() => commit(bumpBid(valueRef.current, bump))}
            className="rounded-sm border border-line-strong bg-surface px-2 py-0.5 font-mono text-small-dense font-medium tabular-nums text-ink-2 transition-colors duration-fast ease-standard hover:border-accent hover:text-accent"
          >
            +{bump}
          </button>
        ))}
        <span
          id="cost-field-hint"
          className={`ml-auto text-small-dense ${overBudget ? "text-danger" : "text-ink-3"}`}
        >
          {remainingCredits === undefined
            ? `da ${MIN_BID} a ${MAX_BID}`
            : `residui ${remainingCredits}`}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 3: Verifica manuale**

Segui la procedura condivisa fino al dialog aperto — a questo punto il dialog monta ancora il vecchio `<input type="number">`, quindi il componente si prova temporaneamente da lì: nessuna azione richiesta finché non è fatto il Task 3. Se vuoi provarlo prima, fai il Task 3 e torna qui.

- [ ] **Step 4: Commit**

```bash
git add app/components/CostField.tsx
git commit -m "feat: add CostField with typing, hold-to-repeat and scrub input"
```

---

### Task 3: `AssignDialog` monta `CostField`

**Files:**
- Modify: `app/components/AssignDialog.tsx:38` (stato iniziale), `:44` (reset all'apertura), `:118-127` (il campo costo)

**Interfaces:**
- Consumes: `CostField` (Task 2), `MIN_BID` (Task 1).
- Produces: nessuna nuova API. Il `PATCH /api/players/[id]` continua a ricevere `{ fantasyTeamId, cost }` con `cost` intero ≥ 1.

- [ ] **Step 1: Import del componente e della costante**

In `app/components/AssignDialog.tsx`, sotto gli import esistenti:

```tsx
import CostField from "@/app/components/CostField";
import { MIN_BID } from "@/lib/bidInput";
```

- [ ] **Step 2: Il costo parte da 1, non da 0**

Sostituisci `const [cost, setCost] = useState(0);` con:

```tsx
const [cost, setCost] = useState(MIN_BID);
```

e dentro lo `useEffect` di apertura sostituisci `setCost(0);` con:

```tsx
      setCost(MIN_BID);
```

- [ ] **Step 3: Sostituisci il campo**

Sostituisci il blocco del costo (il `<div>` con la label "Costo (crediti)" e il suo `<input type="number">`) con:

```tsx
          <div>
            <label className="mb-1 block text-label uppercase text-ink-3">Costo (crediti)</label>
            <CostField
              value={cost}
              onChange={setCost}
              remainingCredits={selectedTeam?.remainingCredits}
              autoFocus
            />
          </div>
```

Nient'altro cambia: `overBudget`, l'`InlineError` che avvisa e il `handleSubmit` restano quelli di prima.

- [ ] **Step 4: Type check e suite**

Run: `npx tsc --noEmit && npm test`
Expected: nessun errore di tipo, tutti i test verdi (nessuno tocca questo componente).

- [ ] **Step 5: Verifica manuale — desktop**

Procedura condivisa, poi in ordine:

1. Il dialog si apre con `1` **già selezionato**. Digita `40`: il campo mostra `40` senza passare da `140`.
2. `↑` tre volte → `43`. `Shift+↑` → `53`. `Shift+↓` → `43`.
3. Tieni premuto `+` contando: dopo ~1,2 s devi essere passato da 43 a oltre 70. Rilascia: si ferma subito.
4. Tieni premuto `−` fino in fondo: si ferma a `1`, non va sotto.
5. Clicca `+25` → `26`. Poi `+10`, `+5`.
6. Trascina orizzontalmente **sulla cifra**, piano: cambia di poco. Veloce: cambia di molto.
7. Scegli una squadra con pochi residui e porta il costo sopra: `residui NNN` diventa rosso e compare l'`InlineError`, ma **Conferma** resta cliccabile.
8. `Invio` conferma e assegna. Controlla in `/teams` che il costo salvato sia quello mostrato.

- [ ] **Step 6: Verifica manuale — mobile (375×667)**

1. Tap sulla cifra: si apre il **tastierino numerico**, non la tastiera intera, e il valore è selezionato.
2. Trascina orizzontalmente sulla cifra: la tastiera si chiude e il numero segue il dito.
3. Trascina **verticalmente** partendo dalla cifra: la pagina scorre (è `touch-pan-y`), il valore non cambia.
4. I pulsanti `+` / `−` sono 44×44 px: si centrano col pollice al primo colpo.

- [ ] **Step 7: Commit**

```bash
git add app/components/AssignDialog.tsx
git commit -m "feat: use CostField for auction cost entry"
```

---

### Task 4: Riallinea il mockup

**Files:**
- Modify: `/private/tmp/claude-501/-Users-albertoorsini-dev-ao-fanta/df3838c7-cf80-4aa9-941a-e41c980d80e1/scratchpad/asta-mockup.html` (blocco `.stepper` nel markup del lotto, e il blocco `setBid` nello script)

**Interfaces:**
- Consumes: le stesse curve del Task 1, riscritte in JS semplice dentro il file (il mockup è un unico HTML autonomo, non importa da `lib/`).
- Produces: niente per il codice; è la fonte di design che deve smettere di mostrare solo `+` / `−`.

- [ ] **Step 1: Porta le quattro modalità nel mockup**

Nel markup del lotto, sostituisci lo `<span class="bid-value" id="bidValue">` con un input:

```html
<input class="bid-value" id="bidValue" value="86" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" aria-label="Costo in crediti">
```

e aggiungi, sotto la riga `.bid`, le pillole di rilancio:

```html
<div class="quick-bumps">
  <button class="chip chip-w tap" data-bump="5">+5</button>
  <button class="chip chip-w tap" data-bump="10">+10</button>
  <button class="chip chip-w tap" data-bump="25">+25</button>
</div>
```

Nello script, accanto alle altre primitive, aggiungi le tre curve — stessi numeri del Task 1:

```js
const MIN_BID = 1, MAX_BID = 999;
const clampBid = v => Number.isFinite(v) ? Math.min(MAX_BID, Math.max(MIN_BID, Math.round(v))) : MIN_BID;
const repeatTick = ms => ms < 600 ? { delta: 1, intervalMs: 120 }
  : ms < 1500 ? { delta: 1, intervalMs: 60 }
  : ms < 3000 ? { delta: 5, intervalMs: 60 }
  : { delta: 10, intervalMs: 60 };
const scrubCredits = (dx, speed) => dx / (Math.abs(speed) < 200 ? 8 : Math.abs(speed) < 800 ? 3 : 1);
```

Poi: `#bidValue` accetta la digitazione (`input` → `clampBid`), `↑`/`↓` con `shift` per la decina, `+` / `−` ripetono con `repeatTick` dopo 400 ms, e il pointer-drag orizzontale sulla cifra usa `scrubCredits` con la stessa soglia di 4 px e lo stesso accumulatore frazionario.

- [ ] **Step 2: Verifica**

Run: `node --check` sullo script estratto e lo smoke test già in `scratchpad/smoke.mjs`, aggiungendo il caso della digitazione:

```bash
cd /private/tmp/claude-501/-Users-albertoorsini-dev-ao-fanta/df3838c7-cf80-4aa9-941a-e41c980d80e1/scratchpad
node smoke.mjs
```

Expected: tutti i check PASS, incluso `bid stepped`.

- [ ] **Step 3: Ripubblica l'artifact**

Ripubblica **lo stesso path** `scratchpad/asta-mockup.html`, così l'URL resta `https://claude.ai/code/artifact/413b8f76-f404-4caa-a665-9a1699771f20` invece di crearne un secondo.

- [ ] **Step 4: Commit**

Il mockup vive fuori dal repo, quindi non c'è niente da committare. Se lo si vuole versionare, copiarlo in `docs/superpowers/mockups/asta.html` e committare con:

```bash
git add docs/superpowers/mockups/asta.html
git commit -m "docs: sync auction mockup with fast cost entry"
```

---

## Self-Review

**Copertura dello spec:**

| Requisito dello spec | Task |
|---|---|
| Digitare, campo a fuoco e selezionato, tastierino numerico | Task 2 (Step 1), Task 3 (Step 3, `autoFocus`) |
| Frecce ±1 e Shift ±10 | Task 2 (`handleKeyDown`) |
| Pressione lunga con accelerazione, 400 ms di attesa | Task 1 (`repeatTick`) + Task 2 (`startRepeat`) |
| Scrub sulla cifra, fine/grosso per velocità | Task 1 (`scrubCredits`) + Task 2 (`onScrubMove`) |
| Pillole +5 / +10 / +25 | Task 2 (`QUICK_BUMPS`) |
| Minimo 1, massimo 999 | Task 1 (`clampBid`), verificato nel Task 3 Step 5.4 |
| Over-budget avvisa e non blocca | Task 3 (Step 3 lascia intatti `overBudget` e `InlineError`), verificato Step 5.7 |
| Feedback al pointer-down | Task 2 (tutti i controlli usano `onPointerDown`) |
| Nessuna nuova dipendenza | Global Constraints; nessun task installa nulla |
| Mockup allineato | Task 4 |

**Placeholder:** nessun "TBD"/"simile a sopra"; ogni step porta il codice o il comando esatto.

**Coerenza dei tipi:** `MIN_BID`, `MAX_BID`, `parseBid`, `clampBid`, `bumpBid`, `repeatTick`, `scrubCredits` sono definiti nel Task 1 e usati con quegli stessi nomi e firme nei Task 2 e 3; `CostField` è dichiarato nel Task 2 con le quattro prop (`value`, `onChange`, `remainingCredits`, `autoFocus`) usate nel Task 3.
