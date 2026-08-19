# Fondamenta motion + materiali Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dare all'app un motore a molle riusabile (`Spring` + `useSpring`), un tema scuro completo con toggle, e una chrome di pagina sticky in vetro che ospita la ricerca esistente di ogni schermata — sotto-progetto 1 di 5 nel porting del redesign Apple-style del mockup nell'app reale.

**Architecture:** `lib/spring.ts` porta la matematica pura del mockup (integratore a passi fissi, nessuna dipendenza) separata dallo scheduling `requestAnimationFrame`, così la fisica è testabile in vitest (`environment: "node"`) senza timer del browser. `lib/useSpring.ts` la wrappa in un hook simmetrico a `useState`. Il tema scuro riusa gli stessi token `--color-*` che Tailwind v4 già genera da `@theme` in `app/globals.css`: ridefinirli sotto un selettore più specifico (`:root[data-theme="dark"]`) flippa ogni utility (`bg-paper`, `text-ink`, ecc.) senza toccare una sola classe nei componenti. Stesso meccanismo per i tre stati di vetro (chiaro/scuro/ridotto), quindi `Sidebar` e `PageChrome` restano scritti una volta sola.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 (token in `@theme` dentro `app/globals.css`, PostCSS via `@tailwindcss/postcss`), lucide-react, vitest (`environment: "node"`).

**Spec:** `docs/superpowers/specs/2026-08-19-motion-materials-foundation-design.md`

## Global Constraints

- **Nessuna dipendenza nuova.** Né runtime né dev. Niente framer-motion/motion, niente next-themes.
- **Nessun test DOM.** `vitest.config.ts` usa `environment: "node"`, niente jsdom/`@testing-library`. Si testano solo le funzioni pure di `lib/spring.ts`; l'hook React e i componenti si verificano a mano.
- **Niente arbitrary value Tailwind** di dimensione testo, raggio o spacing (regola del design system, già in vigore in questo repo — vedi `docs/superpowers/specs/2026-08-15-design-system-refactor-design.md`). Le uniche eccezioni ammesse restano quelle già esistenti (`w-[220px]`, `w-[calc(100%-2rem)]`); questo piano non ne aggiunge altre. I valori dinamici (posizione/altezza dell'indicatore, `mask-image`) passano per `style={{ ... }}`, non per classi Tailwind — coerente con `TeamCreditsPanel`/`Sidebar` che già usano `style={{ width: ... }}` per le barre di progresso.
- **`--color-glass-chrome`, `--color-glass-panel`, `--blur-chrome`** — nomi esatti dei nuovi token, sotto `@theme` in `app/globals.css`, accanto ai token colore esistenti.
- **`ao-fanta-theme`** — chiave `localStorage` esatta per il tema salvato.
- **Il tema esplicito vince sempre** sul `prefers-color-scheme` di sistema, in entrambe le direzioni. Se non c'è una scelta salvata, nessun attributo `data-theme` viene forzato via JS: la preferenza di sistema resta gestita interamente da CSS (`@media (prefers-color-scheme: dark)`), che è già flash-free e reattiva a un cambio live del tema di sistema — lo script anti-flash serve solo a evitare un lampo quando la scelta esplicita salvata differisce dal tema di sistema.
- **`response: 0.35, damping: 1`** per l'indicatore di navigazione — nessun overshoot, nessuno slancio di gesto da portare.
- **Copy in italiano**, `aria-label` incluso sul toggle tema.
- **Commit in inglese**, Conventional Commits, come tutta la history del repo.

## Verifica manuale — procedura condivisa

Diversi task chiudono con un controllo a mano (nessun tool browser è disponibile in questo processo). Ogni volta significa questo:

1. `npm run dev` in un terminale separato (se non gira già).
2. Chrome su `http://localhost:3000`.
3. Dove il task lo richiede: `Cmd+Option+I` per aprire DevTools, icona del telefono per il device toolbar, oppure il pannello Rendering (`Cmd+Shift+P` → "Show Rendering") per forzare `prefers-color-scheme`/`prefers-reduced-motion`/`prefers-contrast` senza cambiare le impostazioni di sistema.

---

### Task 1: Motore a molle puro (`lib/spring.ts`)

**Files:**
- Create: `lib/spring.ts`
- Test: `lib/spring.test.ts`

**Interfaces:**
- Consumes: niente.
- Produces:
  - `type SpringState = { value: number; velocity: number }`
  - `type SpringTuning = { response: number; damping: number }`
  - `springAdvance(state: SpringState, target: number, dtSeconds: number, tuning: SpringTuning): SpringState`
  - `springSettled(state: SpringState, target: number): boolean`
  - `class Spring` — costruttore `(value: number, tuning?: Partial<SpringTuning>)`; proprietà pubbliche `value: number`, `velocity: number`, `target: number`, `response: number`, `damping: number`, `onUpdate: ((value: number, velocity: number) => void) | null`, `onRest: (() => void) | null`; metodi `set(target: number, opts?: { velocity?: number; response?: number; damping?: number }): void`, `jump(value: number): void`, `stop(): void`.

- [ ] **Step 1: Write the failing test**

Crea `lib/spring.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { springAdvance, springSettled } from "@/lib/spring";

describe("springAdvance", () => {
  it("critically damped (damping=1) settles at the target without meaningful overshoot", () => {
    let state = { value: 0, velocity: 0 };
    const target = 100;
    const tuning = { response: 0.4, damping: 1 };
    let maxValue = 0;
    for (let i = 0; i < 400; i++) {
      state = springAdvance(state, target, 1 / 60, tuning);
      maxValue = Math.max(maxValue, state.value);
    }
    expect(maxValue).toBeLessThanOrEqual(target + 0.5);
    expect(state.value).toBeCloseTo(target, 0);
    expect(springSettled(state, target)).toBe(true);
  });

  it("under-damped (damping<1) overshoots past the target at least once, by design", () => {
    let state = { value: 0, velocity: 0 };
    const target = 100;
    const tuning = { response: 0.4, damping: 0.5 };
    let maxValue = 0;
    for (let i = 0; i < 200; i++) {
      state = springAdvance(state, target, 1 / 60, tuning);
      maxValue = Math.max(maxValue, state.value);
    }
    expect(maxValue).toBeGreaterThan(target);
  });

  it("chops a large dt into stable sub-steps instead of one unstable jump", () => {
    const state = { value: 0, velocity: 0 };
    const next = springAdvance(state, 100, 0.5, { response: 0.4, damping: 1 });
    expect(Number.isFinite(next.value)).toBe(true);
    expect(Math.abs(next.value)).toBeLessThan(1000);
  });

  it("carries velocity forward across successive advances instead of resetting it", () => {
    let state = { value: 0, velocity: 0 };
    const tuning = { response: 0.4, damping: 1 };
    state = springAdvance(state, 100, 1 / 60, tuning);
    expect(state.velocity).toBeGreaterThan(0);
    const velocityAfterOneStep = state.velocity;
    state = springAdvance(state, 100, 1 / 60, tuning);
    expect(state.velocity).toBeGreaterThan(0);
    expect(state.velocity).not.toBe(velocityAfterOneStep);
  });
});

describe("springSettled", () => {
  it("is false while far from the target", () => {
    expect(springSettled({ value: 0, velocity: 0 }, 100)).toBe(false);
  });

  it("is true once value and velocity are both within the settle epsilon", () => {
    expect(springSettled({ value: 99.95, velocity: 0.01 }, 100)).toBe(true);
  });

  it("is false when close in value but still moving fast", () => {
    expect(springSettled({ value: 99.99, velocity: 5 }, 100)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/spring.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/spring"`.

- [ ] **Step 3: Write the pure physics + the Spring class**

Crea `lib/spring.ts`:

```ts
/**
 * Motore a molle Apple-style: due parametri (response, damping) invece
 * della tripletta massa/rigidezza/smorzamento. La parte fisica
 * (springAdvance/springSettled) è pura — nessun timer, nessun global del
 * browser — perché è l'unica testabile: vitest.config.ts gira in
 * environment "node". La classe Spring aggiunge sopra lo scheduling
 * requestAnimationFrame.
 */

export type SpringState = { value: number; velocity: number };
export type SpringTuning = { response: number; damping: number };

const SUBSTEP_HZ = 240;
const SETTLE_EPSILON = 0.08;

function springSubstep(state: SpringState, target: number, h: number, tuning: SpringTuning): SpringState {
  const w = (2 * Math.PI) / tuning.response;
  const acceleration = -w * w * (state.value - target) - 2 * tuning.damping * w * state.velocity;
  const velocity = state.velocity + acceleration * h;
  const value = state.value + velocity * h;
  return { value, velocity };
}

/**
 * Avanza `state` verso `target` su `dtSeconds`, tagliato in sotto-passi
 * fissi da 1/240s così l'integrazione resta stabile a qualunque frame
 * rate (o con un dt anomalo, es. un tab tornato attivo dopo minuti).
 */
export function springAdvance(
  state: SpringState,
  target: number,
  dtSeconds: number,
  tuning: SpringTuning
): SpringState {
  const steps = Math.max(1, Math.ceil(dtSeconds / (1 / SUBSTEP_HZ)));
  const h = dtSeconds / steps;
  let next = state;
  for (let i = 0; i < steps; i++) {
    next = springSubstep(next, target, h, tuning);
  }
  return next;
}

/** Vero quando `state` è abbastanza vicino a `target`, in valore e velocità, da poter fermare l'animazione. */
export function springSettled(state: SpringState, target: number): boolean {
  return Math.abs(target - state.value) < SETTLE_EPSILON && Math.abs(state.velocity) < SETTLE_EPSILON;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Molla animata via requestAnimationFrame. Il ri-target con `set()`
 * mantiene valore e velocità correnti — mai un salto, mai un "muro" alla
 * velocità — perché è esattamente questo che rende un'animazione
 * interrompibile: prende il valore *a schermo*, non quello logico.
 */
export class Spring {
  value: number;
  velocity = 0;
  target: number;
  response: number;
  damping: number;
  onUpdate: ((value: number, velocity: number) => void) | null = null;
  onRest: (() => void) | null = null;

  private raf: number | null = null;
  private last = 0;

  constructor(value: number, tuning: Partial<SpringTuning> = {}) {
    this.value = value;
    this.target = value;
    this.response = tuning.response ?? 0.4;
    this.damping = tuning.damping ?? 1;
  }

  set(target: number, opts: { velocity?: number; response?: number; damping?: number } = {}): void {
    this.target = target;
    if (opts.velocity !== undefined) this.velocity = opts.velocity;
    if (opts.response !== undefined) this.response = opts.response;
    if (opts.damping !== undefined) this.damping = opts.damping;

    if (prefersReducedMotion()) {
      this.value = target;
      this.velocity = 0;
      this.emit();
      this.onRest?.();
      return;
    }
    this.play();
  }

  jump(value: number): void {
    this.stop();
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.emit();
  }

  stop(): void {
    if (this.raf !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.raf);
    }
    this.raf = null;
  }

  private emit(): void {
    this.onUpdate?.(this.value, this.velocity);
  }

  private play(): void {
    if (this.raf !== null || typeof requestAnimationFrame === "undefined") return;
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  private tick(now: number): void {
    const dt = Math.min((now - this.last) / 1000, 1 / 30);
    this.last = now;
    const next = springAdvance(
      { value: this.value, velocity: this.velocity },
      this.target,
      dt,
      { response: this.response, damping: this.damping }
    );
    this.value = next.value;
    this.velocity = next.velocity;
    this.emit();

    if (springSettled({ value: this.value, velocity: this.velocity }, this.target)) {
      this.value = this.target;
      this.velocity = 0;
      this.emit();
      this.raf = null;
      this.onRest?.();
      return;
    }
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/spring.test.ts`
Expected: PASS, 7 test.

- [ ] **Step 5: Full suite and type check**

Run: `npm test && npx tsc --noEmit`
Expected: tutti i test verdi, nessun errore di tipo.

- [ ] **Step 6: Commit**

```bash
git add lib/spring.ts lib/spring.test.ts
git commit -m "feat: add spring physics engine (response/damping, interruptible)"
```

---

### Task 2: Hook React (`lib/useSpring.ts`)

**Files:**
- Create: `lib/useSpring.ts`

**Interfaces:**
- Consumes: `Spring` da `@/lib/spring` (Task 1).
- Produces: `useSpring(initial: number, tuning?: { response?: number; damping?: number }): [number, (target: number, opts?: { velocity?: number; response?: number; damping?: number }) => void, (value: number) => void]` — tupla `[value, set, jump]`. `set`/`jump` sono referenzialmente stabili fra i render (chiudono su un `useRef`, avvolti in `useCallback`), così possono stare in un dependency array di `useEffect` senza farlo ri-eseguire ad ogni render.

Nessun test automatico per questo file (vedi Global Constraints — nessun jsdom/`@testing-library` in questo repo). Il comportamento si verifica indirettamente nei Task 6/7, dove l'hook viene usato in un componente reale.

- [ ] **Step 1: Write the hook**

Crea `lib/useSpring.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Spring } from "@/lib/spring";

type SpringSetOpts = { velocity?: number; response?: number; damping?: number };

/**
 * Binding React per Spring: si legge come uno useState, si ri-punta come
 * il suo setter. L'istanza di Spring si crea una volta sola e vive in un
 * ref — set()/jump() la ri-puntano, non la ricreano mai, così un'animazione
 * in corso non viene mai riavviata da un re-render.
 */
export function useSpring(
  initial: number,
  tuning: { response?: number; damping?: number } = {}
): [number, (target: number, opts?: SpringSetOpts) => void, (value: number) => void] {
  const springRef = useRef<Spring | null>(null);
  if (springRef.current === null) {
    springRef.current = new Spring(initial, tuning);
  }
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const spring = springRef.current!;
    spring.onUpdate = (v) => setValue(v);
    return () => {
      spring.onUpdate = null;
      spring.stop();
    };
  }, []);

  const set = useCallback((target: number, opts?: SpringSetOpts) => {
    springRef.current!.set(target, opts);
  }, []);

  const jump = useCallback((value: number) => {
    springRef.current!.jump(value);
  }, []);

  return [value, set, jump];
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add lib/useSpring.ts
git commit -m "feat: add useSpring React hook wrapping the spring engine"
```

---

### Task 3: Tema scuro — token e script anti-flash

**Files:**
- Modify: `app/globals.css` (dopo il blocco `@theme { ... }`)
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: niente.
- Produces: attributo `data-theme="light" | "dark"` su `<html>`, letto/scritto da Task 4. Chiave `localStorage` `"ao-fanta-theme"`.

- [ ] **Step 1: Aggiungi la palette scura**

In `app/globals.css`, subito dopo la chiusura del blocco `@theme { ... }` (dopo la riga `}` che segue `--duration-base: 180ms;`) e prima di `@layer base {`, inserisci:

```css
/*
 * Tailwind v4 compila @theme in `:root, :host { --color-paper: ...; }` e
 * ogni utility (bg-paper, text-ink, ...) legge quei custom property via
 * var(). Ridefinirli qui sotto un selettore più specifico di `:root, :host`
 * (un attribute selector ha specificità maggiore di un semplice :root)
 * flippa ogni utility della app, senza toccare una classe nei componenti.
 */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-paper: #101014;
    --color-surface: #1a1a20;
    --color-surface-sunk: #202028;
    --color-ink: #f3f3f6;
    --color-ink-2: #a6a6b2;
    --color-ink-3: #7d7d8a;
    --color-line: #2a2a33;
    --color-line-strong: #3a3a45;
    --color-accent: #9d9bf0;
    --color-accent-hover: #b4b2f7;
    --color-accent-bg: #26253f;
    --color-danger: #ef8079;
    --color-danger-bg: #2c1614;
    --color-danger-line: #4a221e;

    --color-role-p: #4fc4a4;
    --color-role-p-soft: #10281f;
    --color-role-d: #8f9ce8;
    --color-role-d-soft: #1a1d33;
    --color-role-c: #e0a851;
    --color-role-c-soft: #2b2110;
    --color-role-a: #f08a72;
    --color-role-a-soft: #2e1a15;
  }
}

:root[data-theme="dark"] {
  --color-paper: #101014;
  --color-surface: #1a1a20;
  --color-surface-sunk: #202028;
  --color-ink: #f3f3f6;
  --color-ink-2: #a6a6b2;
  --color-ink-3: #7d7d8a;
  --color-line: #2a2a33;
  --color-line-strong: #3a3a45;
  --color-accent: #9d9bf0;
  --color-accent-hover: #b4b2f7;
  --color-accent-bg: #26253f;
  --color-danger: #ef8079;
  --color-danger-bg: #2c1614;
  --color-danger-line: #4a221e;

  --color-role-p: #4fc4a4;
  --color-role-p-soft: #10281f;
  --color-role-d: #8f9ce8;
  --color-role-d-soft: #1a1d33;
  --color-role-c: #e0a851;
  --color-role-c-soft: #2b2110;
  --color-role-a: #f08a72;
  --color-role-a-soft: #2e1a15;
}
```

- [ ] **Step 2: Verifica che Tailwind rigeneri le utility con i nuovi valori**

Run:

```bash
node -e '
const postcss = require("postcss");
const tw = require("@tailwindcss/postcss");
const fs = require("fs");
const css = fs.readFileSync("app/globals.css", "utf8");
postcss([tw()]).process(css, { from: "app/globals.css" }).then(result => {
  const hasDark = result.css.includes(":root[data-theme=\"dark\"]") && result.css.includes("--color-paper: #101014");
  console.log(hasDark ? "OK: dark tokens compiled" : "FAIL: dark tokens missing");
}).catch(e => { console.error("ERROR", e.message); process.exit(1); });
'
```

Expected: `OK: dark tokens compiled`.

- [ ] **Step 3: Script anti-flash in layout.tsx**

In `app/layout.tsx`, aggiungi un `<head>` esplicito come primo figlio di `<html>`, prima di `<body>`. Sostituisci:

```tsx
  return (
    <html lang="it" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="flex bg-paper text-ink font-sans">
```

con:

```tsx
  return (
    <html lang="it" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Applica il tema salvato prima dell'idratazione React, altrimenti
            la pagina lampeggia nel tema di sistema per un frame quando la
            scelta esplicita lo contraddice. Se non c'è una scelta salvata
            non tocca nulla: il CSS gestisce già il tema di sistema da solo,
            senza lampi e in modo reattivo a un cambio live. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("ao-fanta-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();',
          }}
        />
      </head>
      <body className="flex bg-paper text-ink font-sans">
```

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 5: Verifica manuale**

1. `npm run dev`, apri `http://localhost:3000`.
2. DevTools → Rendering → "Emulate CSS media feature prefers-color-scheme" → `dark`. La pagina passa a fondo scuro senza ricaricare (gestito da CSS, nessun JS coinvolto).
3. Console: `localStorage.setItem("ao-fanta-theme", "light")` poi ricarica con `prefers-color-scheme: dark` ancora emulato — la pagina deve restare **chiara** (la scelta esplicita vince). `localStorage.removeItem("ao-fanta-theme")` e ricarica: torna a seguire il sistema (scuro).

- [ ] **Step 6: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add dark theme tokens and flash-free theme script"
```

---

### Task 4: Toggle tema (`ThemeToggle`)

**Files:**
- Create: `app/components/ThemeToggle.tsx`
- Modify: `app/components/Sidebar.tsx`

**Interfaces:**
- Consumes: attributo `data-theme` e chiave `localStorage` `"ao-fanta-theme"` (Task 3).
- Produces: `export default function ThemeToggle(): JSX.Element` — nessuna prop.

- [ ] **Step 1: Crea il componente**

Crea `app/components/ThemeToggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "ao-fanta-theme";
type Theme = "light" | "dark";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  // "light" lato server per evitare un mismatch di idratazione; il tema
  // reale (salvato o di sistema) si applica dopo il mount, stesso motivo
  // per cui TierSection tiene le liste aperte lato server e applica la
  // preferenza salvata solo dopo.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setTheme(stored === "dark" || stored === "light" ? stored : systemTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  }

  const Icon = theme === "dark" ? Sun : Moon;
  const label = theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors duration-fast ease-standard hover:bg-surface-sunk hover:text-ink"
    >
      <Icon size={15} strokeWidth={1.7} />
    </button>
  );
}
```

- [ ] **Step 2: Wire nel Sidebar**

In `app/components/Sidebar.tsx`, aggiungi l'import:

```tsx
import ThemeToggle from "@/app/components/ThemeToggle";
```

Poi sostituisci il blocco finale della sidebar (il `<nav className="mt-auto ...">` con dentro `CONFIG_LINKS`):

```tsx
        <nav className="mt-auto flex flex-col gap-px">
          {CONFIG_LINKS.map((l) => (
            <NavLink key={l.href} {...l} />
          ))}
        </nav>
      </aside>
```

con:

```tsx
        <div className="mt-auto flex items-center gap-1">
          <nav className="flex flex-1 flex-col gap-px">
            {CONFIG_LINKS.map((l) => (
              <NavLink key={l.href} {...l} />
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </aside>
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 4: Verifica manuale**

1. `npm run dev`, apri `http://localhost:3000`.
2. In fondo alla sidebar, accanto a "Impostazioni", c'è un pulsante luna/sole. Cliccalo: la pagina passa a tema scuro/chiaro, l'icona cambia.
3. Ricarica la pagina: il tema scelto resta (letto da `localStorage` prima dell'idratazione, nessun lampo).
4. `localStorage.getItem("ao-fanta-theme")` in console conferma `"dark"` o `"light"` dopo il click.

- [ ] **Step 5: Commit**

```bash
git add app/components/ThemeToggle.tsx app/components/Sidebar.tsx
git commit -m "feat: add theme toggle to the sidebar"
```

---

### Task 5: Token vetro, fallback accessibilità, chrome della sidebar

**Files:**
- Modify: `app/globals.css`
- Modify: `app/components/Sidebar.tsx`

**Interfaces:**
- Consumes: niente.
- Produces: token Tailwind `--color-glass-chrome`, `--color-glass-panel`, `--blur-chrome` → utility `bg-glass-chrome`, `bg-glass-panel`, `blur-chrome`, `backdrop-blur-chrome`, consumate da questo task (solo `bg-glass-chrome`/`backdrop-blur-chrome`) e dal Task 7 (`bg-glass-chrome`/`backdrop-blur-chrome`). `bg-glass-panel` resta definito ma non consumato — riservato al sotto-progetto 2 (spec, sezione "Materiali vetro").

- [ ] **Step 1: Token vetro nel blocco `@theme`**

In `app/globals.css`, dentro il blocco `@theme { ... }`, subito dopo la riga `--color-role-a-soft: #f9eae6;` e prima del commento `/* ── typography ─...`, inserisci:

```css

  /* ── materiali (vetro) ───────────────────────────────── */
  --color-glass-chrome: rgba(251, 251, 250, 0.72);
  --color-glass-panel: rgba(255, 255, 255, 0.66);
  --blur-chrome: 20px;
```

- [ ] **Step 2: Valori scuri per gli stessi token**

Nei due blocchi aggiunti al Task 3 (`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` e `:root[data-theme="dark"] { ... }`), aggiungi in fondo a **entrambi** (dopo `--color-role-a-soft: #2e1a15;` in ciascuno):

```css
    --color-glass-chrome: rgba(16, 16, 20, 0.66);
    --color-glass-panel: rgba(38, 38, 46, 0.58);
```

- [ ] **Step 3: Fallback accessibilità — sempre gli stessi token, mai i componenti**

In fondo a `app/globals.css` (dopo il blocco `@media (prefers-reduced-motion: reduce) { ... }` già esistente), aggiungi:

```css

/* Vetro finto: superficie piena, niente sfocatura. Nessun componente che
   usa bg-glass-chrome/backdrop-blur-chrome deve sapere che questo esiste —
   è lo stesso trucco della palette scura, sul token invece che sul CSS del
   componente. */
@media (prefers-reduced-transparency: reduce) {
  :root {
    --color-glass-chrome: var(--color-surface);
    --color-glass-panel: var(--color-surface);
    --blur-chrome: 0px;
  }
}

@media (prefers-contrast: more) {
  :root {
    --color-glass-chrome: var(--color-surface);
    --color-glass-panel: var(--color-surface);
    --blur-chrome: 0px;
  }
}
```

- [ ] **Step 4: Verifica che Tailwind generi le utility vetro**

Run:

```bash
node -e '
const postcss = require("postcss");
const tw = require("@tailwindcss/postcss");
const fs = require("fs");
const css = fs.readFileSync("app/globals.css", "utf8");
postcss([tw()]).process(css, { from: "app/globals.css" }).then(result => {
  const ok = result.css.includes(".bg-glass-chrome") && result.css.includes(".backdrop-blur-chrome");
  console.log(ok ? "OK: glass utilities compiled" : "FAIL: glass utilities missing");
}).catch(e => { console.error("ERROR", e.message); process.exit(1); });
'
```

Expected: `OK: glass utilities compiled`.

- [ ] **Step 5: Applica il vetro alla sidebar**

In `app/components/Sidebar.tsx`, nell'header mobile, sostituisci:

```tsx
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-paper px-4 md:hidden">
```

con:

```tsx
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-glass-chrome px-4 backdrop-blur-chrome md:hidden">
```

E nell'`<aside>`, sostituisci (dentro il template literal):

```tsx
        className={`fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-col gap-6 overflow-y-auto border-r border-line bg-paper p-4 transition-transform duration-base ease-standard md:sticky md:z-auto md:visible md:translate-x-0 md:left-auto ${
```

con:

```tsx
        className={`fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-col gap-6 overflow-y-auto border-r border-line bg-glass-chrome p-4 backdrop-blur-chrome transition-transform duration-base ease-standard md:sticky md:z-auto md:visible md:translate-x-0 md:left-auto ${
```

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 7: Verifica manuale**

1. `npm run dev`, apri `http://localhost:3000`. La sidebar ha uno sfondo leggermente traslucido — se metti la finestra sopra un colore acceso dietro (non applicabile in browser, ma il contenuto della pagina che scorre sotto la sidebar sticky su schermi molto alti deve intravedersi leggermente sfocato).
2. DevTools → Rendering → "Emulate CSS media feature prefers-reduced-transparency" → `reduce`. La sidebar torna a una superficie piena (`--color-surface`), niente più `backdrop-filter`.
3. Ripeti con "Emulate CSS media feature prefers-contrast" → `more`. Stesso risultato: superficie piena.
4. Restringi la finestra sotto 768px: l'header mobile in alto ha lo stesso trattamento vetro.

- [ ] **Step 8: Commit**

```bash
git add app/globals.css app/components/Sidebar.tsx
git commit -m "feat: add glass material tokens and apply them to the sidebar"
```

---

### Task 6: Indicatore di navigazione a molla

**Files:**
- Modify: `app/components/Sidebar.tsx`

**Interfaces:**
- Consumes: `useSpring` da `@/lib/useSpring` (Task 2).
- Produces: nessuna nuova API pubblica — comportamento visivo interno al componente.

- [ ] **Step 1: Aggiungi l'import e lo stato**

In `app/components/Sidebar.tsx`, aggiungi l'import:

```tsx
import { useSpring } from "@/lib/useSpring";
```

Nel componente `Sidebar`, subito dopo `const pct = spendPercent(assignedCount, totalCount);`, aggiungi:

```tsx
  const primaryNavRef = useRef<HTMLElement>(null);
  const [indicatorHeight, setIndicatorHeight] = useState(0);
  const [indicatorY, setIndicatorY, jumpIndicatorY] = useSpring(0, { response: 0.35, damping: 1 });
  const hasMeasuredIndicator = useRef(false);

  // L'indicatore segue il link attivo leggendo la sua posizione dal DOM
  // (stesso offsetTop del mockup) invece di ricalcolarla dai dati: è la
  // fonte di verità più semplice, e non richiede che NavLink esponga altro
  // oltre a un data-attribute quando è quello attivo.
  useEffect(() => {
    const nav = primaryNavRef.current;
    const activeLink = nav?.querySelector<HTMLElement>('[data-active="true"]');
    if (!nav || !activeLink) return;

    setIndicatorHeight(activeLink.offsetHeight);
    if (hasMeasuredIndicator.current) {
      setIndicatorY(activeLink.offsetTop);
    } else {
      jumpIndicatorY(activeLink.offsetTop);
      hasMeasuredIndicator.current = true;
    }
  }, [pathname, setIndicatorY, jumpIndicatorY]);
```

Aggiungi `useRef` agli import di React già presenti (`useEffect, useState` → `useEffect, useRef, useState`):

```tsx
import { useEffect, useRef, useState } from "react";
```

- [ ] **Step 2: `NavLink` espone il proprio stato attivo nel DOM**

Sostituisci la funzione `NavLink`:

```tsx
function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Gavel }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-2 py-2 text-small transition-colors duration-fast ease-standard ${
        active
          ? "bg-surface font-semibold text-ink ring-1 ring-inset ring-line"
          : "font-medium text-ink-2 hover:bg-surface-sunk hover:text-ink"
      }`}
    >
      <Icon size={15} strokeWidth={1.7} />
      {label}
    </Link>
  );
}
```

con:

```tsx
function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Gavel }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      {...(active ? { "data-active": "true" } : {})}
      className={`relative z-10 flex items-center gap-3 rounded-md px-2 py-2 text-small transition-colors duration-fast ease-standard ${
        active ? "font-semibold text-ink" : "font-medium text-ink-2 hover:bg-surface-sunk hover:text-ink"
      }`}
    >
      <Icon size={15} strokeWidth={1.7} />
      {label}
    </Link>
  );
}
```

Nota: `bg-surface font-semibold text-ink ring-1 ring-inset ring-line` sparisce da qui — quello stile si sposta sull'indicatore (Step 3). `NavLink` da attivo tiene solo `font-semibold text-ink` (il colore/peso del testo), che deve leggersi sopra l'indicatore.

- [ ] **Step 3: L'elemento indicatore**

Nel JSX di `Sidebar`, sostituisci:

```tsx
        <nav className="flex flex-col gap-px">
          {PRIMARY_LINKS.map((l) => (
            <NavLink key={l.href} {...l} />
          ))}
        </nav>
```

con:

```tsx
        <nav ref={primaryNavRef} className="relative flex flex-col gap-px">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 rounded-md bg-surface ring-1 ring-inset ring-line will-change-transform"
            style={{ height: indicatorHeight, transform: `translateY(${indicatorY}px)` }}
          />
          {PRIMARY_LINKS.map((l) => (
            <NavLink key={l.href} {...l} />
          ))}
        </nav>
```

`primaryNavRef` è tipizzato `HTMLElement` (Step 1) perché `<nav>` è un `HTMLElement`, non un `HTMLDivElement` — coerente con `ref={primaryNavRef}` su un tag `<nav>`.

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 5: Verifica manuale**

1. `npm run dev`, apri `http://localhost:3000`.
2. La voce "Asta" ha lo sfondo/bordo attivo. Clicca "Listone": l'indicatore **scivola** verso il basso invece di scomparire e riapparire, si ferma senza rimbalzare (damping 1, nessun overshoot).
3. Clicca rapidamente fra più voci in sequenza: l'indicatore non deve mai "saltare" — parte sempre dalla sua posizione attuale, anche se interrotto a metà corsa.
4. DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion" → `reduce`: l'indicatore scatta istantaneamente sulla voce cliccata, nessuno scivolamento.
5. Ricarica la pagina su `/players`: l'indicatore appare già su "Listone" al primo paint, senza scivolare da "Asta" (verifica il `jump` iniziale).

- [ ] **Step 6: Commit**

```bash
git add app/components/Sidebar.tsx
git commit -m "feat: animate the sidebar nav indicator with a spring"
```

---

### Task 7: Chrome di pagina (`PageChrome`) e ricerca sticky

**Files:**
- Create: `app/components/PageChrome.tsx`
- Modify: `app/page.tsx`
- Modify: `app/players/page.tsx`
- Modify: `app/wishlist/page.tsx`
- Modify: `app/teams/page.tsx`
- Modify: `app/settings/page.tsx`

**Interfaces:**
- Consumes: token `bg-glass-chrome`/`backdrop-blur-chrome` (Task 5).
- Produces: `export default function PageChrome({ children }: { children?: React.ReactNode }): JSX.Element`.

**Decisione di scope (vedi spec, sezione "Comportamento ricerca"):** su Listone e Wishlist, `PageChrome` ospita l'intero `ListoneToolbar` (ricerca **e** chip di filtro insieme), non solo il campo di ricerca isolato — separare ricerca e filtri dentro `ListoneToolbar` è un refactor del componente stesso, fuori scope per questo sotto-progetto (fondamenta), riservato al sotto-progetto 2 ("Card e pannelli"). `ListoneToolbar` ha già un proprio `border-b border-line pb-3` e `AstaSearch` ha già un proprio `rounded-lg border ... bg-surface`: nidificati dentro `PageChrome` restano visivamente corretti ma non ancora armonizzati col vetro — cleanup esplicitamente rimandato al sotto-progetto 2, non un difetto di questo task.

- [ ] **Step 1: Crea il componente**

Crea `app/components/PageChrome.tsx`:

```tsx
/**
 * Striscia sticky in vetro in cima al contenuto di ogni pagina. Ospita la
 * ricerca (o i filtri) che quella pagina ha già — nessun comportamento di
 * ricerca cambia qui, solo dove vive: prima era parte del flusso della
 * pagina, ora resta visibile mentre si scorre. Le pagine senza ricerca
 * (Squadre, Impostazioni) montano <PageChrome /> senza figli: la striscia
 * resta comunque visibile, per coerenza visiva fra le schermate.
 */
export default function PageChrome({ children }: { children?: React.ReactNode }) {
  return (
    <div
      className="sticky top-14 z-10 -mx-4 mb-6 flex items-center gap-3 border-b border-line bg-glass-chrome px-4 py-3 backdrop-blur-chrome md:top-0 md:-mx-12 md:px-12"
      style={{
        // Scroll-edge mask invece di un hairline: la striscia si dissolve
        // dove il contenuto la incontra, solo dove la chrome flottante
        // copre davvero qualcosa sotto di sé.
        maskImage: "linear-gradient(to bottom, #000 0 72%, rgba(0,0,0,.5) 88%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 0 72%, rgba(0,0,0,.5) 88%, transparent 100%)",
      }}
    >
      {children}
    </div>
  );
}
```

`top-14` (56px) combacia con l'altezza dell'header mobile (`h-14` in `Sidebar.tsx`), così la chrome si aggancia esattamente sotto di esso senza sovrapporlo; su desktop (`md:top-0`) l'header mobile è nascosto e non c'è niente sopra cui agganciarsi. `-mx-4`/`md:-mx-12` cancellano il padding orizzontale di `<main>` (`px-4 md:px-12` in `app/layout.tsx`) così lo sfondo vetro arriva ai bordi della colonna di contenuto; `px-4`/`md:px-12` sullo stesso elemento riportano il contenuto (i figli) allineato con tutto il resto della pagina.

- [ ] **Step 2: Wire in Asta**

In `app/page.tsx`, aggiungi l'import:

```tsx
import PageChrome from "@/app/components/PageChrome";
```

Sostituisci:

```tsx
  return (
    <>
      <PageHeader
        title="Asta"
        subtitle={`${assigned} di ${teams.length * rosterSize} giocatori assegnati · ${
          teams.length
        } squadre in gioco`}
      />

      <div className="grid grid-cols-1 items-start gap-8 text-body-dense lg:grid-cols-[1fr_296px]">
        <div>
          <h2 className="mb-3 text-label uppercase text-ink-3">Ricerca Giocatore</h2>
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
```

con:

```tsx
  return (
    <>
      <PageChrome>
        <AstaSearch
          teams={teams.map((t) => ({
            id: t.id,
            name: t.name,
            remainingCredits: t.remainingCredits,
            roleCounts: t.roleCounts,
          }))}
          roleLimits={roleLimits}
        />
      </PageChrome>

      <PageHeader
        title="Asta"
        subtitle={`${assigned} di ${teams.length * rosterSize} giocatori assegnati · ${
          teams.length
        } squadre in gioco`}
      />

      <div className="grid grid-cols-1 items-start gap-8 text-body-dense lg:grid-cols-[1fr_296px]">
        <div>
          <section className="mt-6">
```

La label "Ricerca Giocatore" sparisce: era lì a introdurre il campo dentro il flusso della pagina; in una chrome sempre visibile in cima a ogni schermata è ridondante (il mockup, allo stesso modo, non ne ha una).

- [ ] **Step 3: Wire in Listone**

In `app/players/page.tsx`, aggiungi l'import:

```tsx
import PageChrome from "@/app/components/PageChrome";
```

Sostituisci:

```tsx
      <PageHeader
        title="Listone"
        subtitle="Tutti i giocatori disponibili, con filtri e assegnazione diretta."
      />
      <ListoneToolbar serieATeams={serieATeams} resultCount={players.length} />
```

con:

```tsx
      <PageChrome>
        <ListoneToolbar serieATeams={serieATeams} resultCount={players.length} />
      </PageChrome>
      <PageHeader
        title="Listone"
        subtitle="Tutti i giocatori disponibili, con filtri e assegnazione diretta."
      />
```

- [ ] **Step 4: Wire in Wishlist**

In `app/wishlist/page.tsx`, aggiungi l'import:

```tsx
import PageChrome from "@/app/components/PageChrome";
```

Sostituisci:

```tsx
      <PageHeader
        title="Wishlist"
        subtitle="Solo svincolati. Sposta un giocatore fra le liste dalle pillole A/B/C."
      />
      <ListoneToolbar
        serieATeams={serieATeams}
        resultCount={players.length}
        showStatusToggles={false}
      />
```

con:

```tsx
      <PageChrome>
        <ListoneToolbar
          serieATeams={serieATeams}
          resultCount={players.length}
          showStatusToggles={false}
        />
      </PageChrome>
      <PageHeader
        title="Wishlist"
        subtitle="Solo svincolati. Sposta un giocatore fra le liste dalle pillole A/B/C."
      />
```

- [ ] **Step 5: Wire in Squadre (chrome vuota)**

In `app/teams/page.tsx`, aggiungi l'import:

```tsx
import PageChrome from "@/app/components/PageChrome";
```

Sostituisci:

```tsx
  return (
    <>
      <PageHeader
        title="Squadre"
        subtitle="Passa il mouse su un giocatore per rilasciarlo."
      />
```

con:

```tsx
  return (
    <>
      <PageChrome />
      <PageHeader
        title="Squadre"
        subtitle="Passa il mouse su un giocatore per rilasciarlo."
      />
```

- [ ] **Step 6: Wire in Impostazioni (chrome vuota)**

In `app/settings/page.tsx`, aggiungi l'import:

```tsx
import PageChrome from "@/app/components/PageChrome";
```

Sostituisci:

```tsx
  return (
    <>
      <PageHeader
        title="Impostazioni"
        subtitle="Configurazione della lega e gestione dei dati."
      />
```

con:

```tsx
  return (
    <>
      <PageChrome />
      <PageHeader
        title="Impostazioni"
        subtitle="Configurazione della lega e gestione dei dati."
      />
```

- [ ] **Step 7: Type check e suite**

Run: `npx tsc --noEmit && npm test`
Expected: nessun errore di tipo, tutti i test verdi (nessuno di questi file ha test propri).

- [ ] **Step 8: Verifica manuale**

1. `npm run dev`, apri `http://localhost:3000` (Asta). La ricerca è nella striscia in cima, sopra il titolo "Asta". Scorri la pagina: la striscia resta visibile, il contenuto sotto si dissolve leggermente dove la incontra (scroll-edge mask) invece di un bordo netto.
2. Vai su `/players` (Listone): ricerca + chip di ruolo/wish/stato sono nella striscia in cima.
3. Vai su `/wishlist`: stessa striscia, senza i chip di stato (comportamento invariato di `ListoneToolbar`).
4. Vai su `/teams` e `/settings`: la striscia in vetro c'è ma è vuota — solo lo sfondo, nessun campo dentro.
5. Restringi sotto 768px su ciascuna pagina: la striscia si aggancia subito sotto l'header mobile (nessuna sovrapposizione), non sopra.
6. Coi controlli di accessibilità del Task 5 (reduced-transparency/contrast) ancora emulati: la striscia diventa una superficie piena su ogni pagina, coerente con la sidebar.

- [ ] **Step 9: Commit**

```bash
git add app/components/PageChrome.tsx app/page.tsx app/players/page.tsx app/wishlist/page.tsx app/teams/page.tsx app/settings/page.tsx
git commit -m "feat: add sticky glass page chrome hosting each page's search"
```

---

## Self-Review

**Copertura dello spec:**

| Requisito dello spec | Task |
|---|---|
| Motore a molle puro, riusabile, interrompibile | Task 1 |
| Hook `useSpring` simmetrico a `useState` | Task 2 |
| `prefers-reduced-motion` salta al target | Task 1 (`Spring.set`) |
| Tema scuro, esplicito vince sul sistema in entrambe le direzioni | Task 3 |
| Toggle in sidebar vicino a "Impostazioni" | Task 4 |
| Script anti-flash | Task 3 |
| Token vetro `--color-glass-chrome`/`--color-glass-panel`/`--blur-chrome` | Task 5 |
| `prefers-reduced-transparency` → superficie piena | Task 5 |
| `prefers-contrast: more` → superficie piena | Task 5 |
| Chrome vetro su sidebar (strutturale, pesante) | Task 5 |
| Indicatore di navigazione a molla, nessun overshoot | Task 6 |
| `PageChrome` sticky, scroll-edge mask | Task 7 |
| Ricerca esistente riposizionata, comportamento invariato | Task 7 |
| Squadre/Impostazioni: chrome vuota ma presente | Task 7 |
| Nessuna dipendenza nuova | Global Constraints; nessun task installa nulla |

**Placeholder:** nessun "TBD"/"simile al Task N senza codice"; ogni step porta il codice o il comando esatto, incluse le verifiche postcss eseguibili.

**Coerenza dei tipi:** `SpringState`, `SpringTuning`, `springAdvance`, `springSettled` (Task 1) usati con le stesse firme in `Spring` (Task 1) e in nessun altro punto direttamente. `useSpring` (Task 2) restituisce `[value, set, jump]`; Task 6 lo destruttura esattamente come `[indicatorY, setIndicatorY, jumpIndicatorY]`, stesso ordine. `PageChrome` (Task 7) dichiarato con `children?: React.ReactNode` e usato sia con figli (Asta/Listone/Wishlist) sia senza (Squadre/Impostazioni), coerente con la prop opzionale.
