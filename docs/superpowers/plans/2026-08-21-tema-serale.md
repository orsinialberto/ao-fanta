# Tema serale «Grafite» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un tema scuro «Grafite» selezionabile a mano con default sul sistema, e nello stesso giro riparare due difetti misurati del tema chiaro (profondità nulla fra fondo e superficie, accento e ruolo D a 7° di tinta).

**Architecture:** Tailwind v4 emette `var(--color-*)` nelle utility, verificato sul CSS buildato. Quindi il tema scuro è un blocco CSS che ridefinisce le stesse variabili di `@theme`, senza toccare le classi nei componenti. L'unico lavoro sui componenti è sostituire i 21 `text-white` e le 2 tendine scritte a mano con token semantici, perché quelli non possono cambiare col tema. La logica di scelta del tema vive in due funzioni pure in `lib/theme.ts`, testate; il componente `ThemeToggle` resta un guscio sottile.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS v4 (`@theme`), Vitest 4, lucide-react.

**Spec:** `docs/superpowers/specs/2026-08-21-tema-serale-design.md`

## Global Constraints

- Nessuna dipendenza nuova. Solo pacchetti già in `package.json`.
- Nessun colore scritto a mano nei componenti: ogni colore passa da un token `--color-*`.
- Nessun colore può essere definito **solo** dentro un blocco `@media` o `[data-theme]`. Ogni token esiste in `@theme` e viene al massimo ridefinito.
- Il fondo resta tinta unita in entrambi i temi: nessun gradiente, nessun blur, nessuna texture.
- Tipografia, scala tipografica, raggi, spaziature, durate e curve di motion restano invariati.
- La regola "card con hairline, mai ombra" resta: la profondità arriva dal salto di luminanza, non da ombre nuove.
- I 133 test esistenti devono restare verdi a ogni commit.
- Chiave localStorage: esattamente `ao-fanta-theme`. Valori: esattamente `light`, `dark`, `system`.
- I commenti nel codice si scrivono in italiano, come nel resto del repo, e spiegano il *perché*, non il *cosa*.

---

### Task 1: Logica del tema (`lib/theme.ts`)

Due funzioni pure, zero DOM, zero React. È l'unica parte con logica vera; tutto il resto è cablaggio.

**Files:**
- Create: `lib/theme.ts`
- Test: `lib/theme.test.ts`

**Interfaces:**
- Consumes: niente (primo task)
- Produces:
  - `type ThemeChoice = "light" | "dark" | "system"`
  - `type ResolvedTheme = "light" | "dark"`
  - `THEME_STORAGE_KEY: "ao-fanta-theme"`
  - `parseThemeChoice(raw: string | null): ThemeChoice`
  - `resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme`
  - `nextChoice(current: ThemeChoice): ThemeChoice`

- [ ] **Step 1: Write the failing test**

Create `lib/theme.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  THEME_STORAGE_KEY,
  parseThemeChoice,
  resolveTheme,
  nextChoice,
  type ThemeChoice,
} from "./theme";

describe("THEME_STORAGE_KEY", () => {
  it("è la chiave concordata con lo script inline", () => {
    expect(THEME_STORAGE_KEY).toBe("ao-fanta-theme");
  });
});

describe("parseThemeChoice", () => {
  it("accetta i tre valori validi", () => {
    expect(parseThemeChoice("light")).toBe("light");
    expect(parseThemeChoice("dark")).toBe("dark");
    expect(parseThemeChoice("system")).toBe("system");
  });

  it("ripiega su system quando non c'è niente in memoria", () => {
    expect(parseThemeChoice(null)).toBe("system");
  });

  // Un localStorage sporco (versione vecchia, modifica a mano) non deve
  // rompere l'avvio: qualunque cosa non riconosciuta vale "segui il sistema".
  it("ripiega su system su valori non riconosciuti", () => {
    expect(parseThemeChoice("")).toBe("system");
    expect(parseThemeChoice("Dark")).toBe("system");
    expect(parseThemeChoice("grafite")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("una scelta esplicita ignora il sistema", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("in modalità system segue il sistema", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("nextChoice", () => {
  it("cicla chiaro → scuro → sistema → chiaro", () => {
    expect(nextChoice("light")).toBe("dark");
    expect(nextChoice("dark")).toBe("system");
    expect(nextChoice("system")).toBe("light");
  });

  it("il ciclo torna al punto di partenza in tre passi", () => {
    const start: ThemeChoice = "light";
    expect(nextChoice(nextChoice(nextChoice(start)))).toBe(start);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/theme.test.ts`
Expected: FAIL — `Failed to resolve import "./theme"`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/theme.ts`:

```ts
export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/**
 * Condivisa con lo script inline in `app/layout.tsx`. Se cambia qui va
 * cambiata anche lì a mano: quello script gira prima del bundle e non può
 * importare da questo modulo.
 */
export const THEME_STORAGE_KEY = "ao-fanta-theme";

const CHOICES: readonly ThemeChoice[] = ["light", "dark", "system"];

export function parseThemeChoice(raw: string | null): ThemeChoice {
  return CHOICES.includes(raw as ThemeChoice) ? (raw as ThemeChoice) : "system";
}

export function resolveTheme(
  choice: ThemeChoice,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (choice === "system") return systemPrefersDark ? "dark" : "light";
  return choice;
}

export function nextChoice(current: ThemeChoice): ThemeChoice {
  const i = CHOICES.indexOf(current);
  return CHOICES[(i + 1) % CHOICES.length];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/theme.test.ts`
Expected: PASS — 8 test.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — 145 test (133 esistenti + 8 nuovi), 15 file.

- [ ] **Step 6: Commit**

```bash
git add lib/theme.ts lib/theme.test.ts
git commit -m "feat: add pure theme-choice logic"
```

---

### Task 2: Strato dei token (`app/globals.css`)

Il cuore del lavoro. Riscrive il blocco colore chiaro, aggiunge i token semantici e il blocco scuro.

**Files:**
- Modify: `app/globals.css:1-80` (blocco `@theme`) e `app/globals.css:96-126` (`@layer base`)

**Interfaces:**
- Consumes: niente
- Produces: i token che i Task 3 e 5 usano come classi Tailwind — `text-on-accent`, `text-on-role`, `text-on-danger`, `bg-scrim`, `bg-scrim-strong`, e la variante `dark:`

- [ ] **Step 1: Sostituire il blocco colore chiaro**

In `app/globals.css`, sostituire l'intero blocco colore (dal commento `/* ── colour ── */` fino alla riga `--color-role-a-soft: ...;`) con:

```css
  /* ── colour ───────────────────────────────────────────── */
  /* Questi sono i valori del tema chiaro e la sorgente unica da cui Tailwind
     genera le utility. Il tema scuro più in basso ridefinisce le stesse
     variabili: nessun colore nasce dentro un blocco @media o [data-theme],
     altrimenti nello stato non marcato la pagina resterebbe scoperta. */

  /* Il fondo è più scuro della superficie di un salto di 1.18. Il sistema
     vieta le ombre sulle card, quindi la profondità la deve fare la
     luminanza: con paper a #fafbff il salto era 1.03, cioè nessuno, e la
     tabella non si staccava dalla pagina. */
  --color-paper: #eaecf6;
  --color-surface: #ffffff;
  --color-surface-sunk: #eff1f9;
  --color-ink: #16161f;
  --color-ink-2: #52526b;
  --color-ink-3: #8a8a9e;
  --color-line: #dcdfef;
  --color-line-strong: #c8cce2;
  --color-accent: #3b3a8f;
  --color-accent-hover: #2f2e77;
  --color-accent-bg: #e2e2f4;
  /* Cremisi invece di rosso-arancio: il pericolo deve restare caldo per farsi
     leggere come tale, ma la ruggine sul fondo lilla vira al marrone. */
  --color-danger: #b32642;
  --color-danger-bg: #fbeef1;
  --color-danger-line: #eecdd5;

  /* Testo e icone sopra un riempimento pieno. Esistono come token perché nel
     tema scuro i riempimenti sono chiari e vogliono testo scuro: un
     `text-white` scritto a mano lì diventa illeggibile (2.23 di contrasto). */
  --color-on-accent: #ffffff;
  --color-on-role: #ffffff;
  --color-on-danger: #ffffff;

  /* Tendine. Nel tema scuro `--color-ink` è chiaro, quindi `bg-ink/40`
     produrrebbe un velo bianco: servono token propri. */
  --color-scrim: rgb(22 22 31 / 0.40);
  --color-scrim-strong: rgb(16 17 25 / 0.44);

  /* Quattro famiglie, quattro angoli della ruota. Il D era #3f4fb5, a sette
     gradi di tinta dall'accento: nel listone il badge del difensore e la pill
     della squadra finiscono sulla stessa riga con lo stesso blu-viola.
     Spostandolo all'azzurro acciaio la distanza minima fra le cinque tinte
     codificanti passa da 7° a 31°. */
  --color-role-p: #0d7a6b;
  --color-role-p-soft: #e3f2ef;
  --color-role-d: #0d6f9e;
  --color-role-d-soft: #e4eef4;
  --color-role-c: #7d4f9c;
  --color-role-c-soft: #f2ecf7;
  --color-role-a: #b93848;
  --color-role-a-soft: #f9e9ed;
```

- [ ] **Step 2: Aggiungere la variante `dark:` e il blocco scuro**

Subito **dopo** la chiusura del blocco `@theme` (la `}` che segue `--duration-base`), inserire:

```css
/* Copre due casi: il tema marcato a mano sull'elemento root, e — per chi ha
   JavaScript disattivato, unico caso in cui lo script inline non marca
   niente — la preferenza di sistema. */
@custom-variant dark {
  &:where([data-theme="dark"], [data-theme="dark"] *) {
    @slot;
  }
  @media (prefers-color-scheme: dark) {
    &:where(:root:not([data-theme="light"]) *) {
      @slot;
    }
  }
}

/* ── tema scuro «Grafite» ──────────────────────────────────
   Stessa profondità del chiaro (1.18 fra superficie e fondo). I colori dei
   ruoli qui sono più leggibili che nel tema chiaro — da 6.0 a 8.9 contro
   4.5–6.0 — ed è il motivo per cui questo tema esiste: l'asta si fa di sera.
   ──────────────────────────────────────────────────────── */
:root[data-theme="dark"] {
  --color-paper: #101216;
  --color-surface: #1e222b;
  --color-surface-sunk: #171a21;
  --color-ink: #e9ecf2;
  --color-ink-2: #a4abb8;
  --color-ink-3: #78818f;
  --color-line: #2c313b;
  --color-line-strong: #3e4653;
  --color-accent: #9b8cf5;
  /* Su fondo scuro un hover più cupo legge come disabilitato: schiarisce. */
  --color-accent-hover: #b0a4f8;
  --color-accent-bg: #282350;
  --color-danger: #f0757f;
  --color-danger-bg: #33191f;
  --color-danger-line: #54282f;

  --color-on-accent: #101216;
  --color-on-role: #101216;
  --color-on-danger: #101216;

  --color-scrim: rgb(0 0 0 / 0.62);
  --color-scrim-strong: rgb(0 0 0 / 0.70);

  --color-role-p: #3ec7a4;
  --color-role-p-soft: #122e29;
  --color-role-d: #4fb3e8;
  --color-role-d-soft: #172742;
  --color-role-c: #d68ae0;
  --color-role-c-soft: #2e1f35;
  --color-role-a: #f8808e;
  --color-role-a-soft: #361c21;

  /* Un'ombra al 6% su fondo grafite non esiste: serve nero pieno e più stacco. */
  --shadow-overlay:
    0 1px 2px rgb(0 0 0 / 0.40),
    0 16px 40px -12px rgb(0 0 0 / 0.70);
}

/* Stessi valori per chi non ha ancora scelto e ha il sistema in scuro. Il
   :not([data-theme="light"]) serve perché una scelta esplicita deve battere
   l'OS in entrambe le direzioni. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-paper: #101216;
    --color-surface: #1e222b;
    --color-surface-sunk: #171a21;
    --color-ink: #e9ecf2;
    --color-ink-2: #a4abb8;
    --color-ink-3: #78818f;
    --color-line: #2c313b;
    --color-line-strong: #3e4653;
    --color-accent: #9b8cf5;
    --color-accent-hover: #b0a4f8;
    --color-accent-bg: #282350;
    --color-danger: #f0757f;
    --color-danger-bg: #33191f;
    --color-danger-line: #54282f;

    --color-on-accent: #101216;
    --color-on-role: #101216;
    --color-on-danger: #101216;

    --color-scrim: rgb(0 0 0 / 0.62);
    --color-scrim-strong: rgb(0 0 0 / 0.70);

    --color-role-p: #3ec7a4;
    --color-role-p-soft: #122e29;
    --color-role-d: #4fb3e8;
    --color-role-d-soft: #172742;
    --color-role-c: #d68ae0;
    --color-role-c-soft: #2e1f35;
    --color-role-a: #f8808e;
    --color-role-a-soft: #361c21;

    --shadow-overlay:
      0 1px 2px rgb(0 0 0 / 0.40),
      0 16px 40px -12px rgb(0 0 0 / 0.70);
  }
}
```

- [ ] **Step 3: Impedire la transizione al cambio tema**

Dentro `@layer base`, dopo la regola `body`, aggiungere:

```css
  /* Al cambio di tema ogni elemento con una transition sul colore
     partirebbe insieme: 180 ms di poltiglia. Durante lo switch le
     transizioni si spengono, e l'attributo viene tolto al frame dopo. */
  [data-theme-switching] *,
  [data-theme-switching] *::before,
  [data-theme-switching] *::after {
    transition: none !important;
  }
```

- [ ] **Step 4: Verificare che il build passi e che i token ci siano tutti**

Run:
```bash
npm run build && \
grep -c "color-on-accent\|color-scrim\|#0d6f9e\|#101216\|#4fb3e8" .next/static/css/app/layout.css
```
Expected: build verde, e il conteggio maggiore di zero.

- [ ] **Step 5: Verificare che l'override del tema sia strutturalmente corretto**

Run:
```bash
grep -n 'data-theme="dark"\|prefers-color-scheme' .next/static/css/app/layout.css | head
```
Expected: compaiono sia la regola `[data-theme="dark"]` sia il blocco `@media (prefers-color-scheme: dark)`.

- [ ] **Step 6: Blindare i due blocchi scuri contro la deriva**

La palette scura è scritta due volte — una per la scelta a mano, una per la preferenza di sistema — perché in CSS puro non c'è modo di condividere un blocco di dichiarazioni fra un selettore e un altro dentro una media query. Due copie che divergono in silenzio sono il rischio vero di questo task, quindi lo copre un test.

Create `app/globals.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// new URL invece di __dirname: vitest carica questo file come ESM, dove
// __dirname non esiste.
const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

/** Estrae le dichiarazioni --color-* / --shadow-* del blocco che parte da `start`. */
function tokensOfBlockAt(start: number): Record<string, string> {
  const open = css.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = css.slice(open + 1, end);
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--(?:color|shadow)-[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].replace(/\s+/g, " ").trim();
  }
  return out;
}

describe("token del tema scuro", () => {
  const manual = tokensOfBlockAt(css.indexOf(':root[data-theme="dark"]'));
  const system = tokensOfBlockAt(
    css.indexOf(':root:not([data-theme="light"])')
  );

  it("i due blocchi esistono e non sono vuoti", () => {
    expect(Object.keys(manual).length).toBeGreaterThan(20);
    expect(Object.keys(system).length).toBeGreaterThan(20);
  });

  it("la scelta a mano e la preferenza di sistema dichiarano gli stessi token", () => {
    expect(Object.keys(manual).sort()).toEqual(Object.keys(system).sort());
  });

  it("con gli stessi valori", () => {
    expect(system).toEqual(manual);
  });
});

describe("nessun colore nasce in un blocco di override", () => {
  // Un token definito solo sotto [data-theme] o dentro @media lascia scoperto
  // lo stato non marcato: la pagina renderizza il testo di un tema sul fondo
  // dell'altro. Ogni token scuro deve avere un gemello chiaro in @theme.
  const themeBlock = tokensOfBlockAt(css.indexOf("@theme"));
  const manual = tokensOfBlockAt(css.indexOf(':root[data-theme="dark"]'));

  it("ogni token del tema scuro esiste anche in @theme", () => {
    const mancanti = Object.keys(manual).filter((k) => !(k in themeBlock));
    expect(mancanti).toEqual([]);
  });
});
```

- [ ] **Step 7: Eseguire il nuovo test**

Run: `npx vitest run app/globals.test.ts`
Expected: PASS — 4 test. Se fallisce "con gli stessi valori", i due blocchi sono già divergenti: allinearli prima di proseguire.

- [ ] **Step 8: Commit**

```bash
git add app/globals.css app/globals.test.ts
git commit -m "feat: add dark theme tokens and fix light-theme depth"
```

---

### Task 3: Token semantici al posto dei colori fissi

Sostituzione meccanica: 21 `text-white` in 16 file, più le due tendine scritte a mano. Nessun cambio di comportamento nel tema chiaro — i token valgono `#ffffff` e `rgb(16 17 25 / 0.44)`, esattamente quello che c'era.

**Files:**
- Modify: `lib/roleStyles.ts:21-24`
- Modify: `app/components/RoleBadge.tsx:21`
- Modify: `app/components/AssignDialog.tsx:155`
- Modify: `app/components/AddPlayerDialog.tsx:108`
- Modify: `app/components/AssignPanel.tsx:259`
- Modify: `app/components/ConfirmDialog.tsx:101`
- Modify: `app/components/Sidebar.tsx:103`
- Modify: `app/components/ui/dialog.tsx:24`
- Modify: `app/settings/ListoneCard.tsx:17`
- Modify: `app/settings/PlayersCard.tsx:17`
- Modify: `app/settings/LeagueRulesCard.tsx:85`
- Modify: `app/settings/MarkStartersCard.tsx:56`
- Modify: `app/settings/import/page.tsx:283,417`
- Modify: `app/players/ResetStartersButton.tsx:16`
- Modify: `app/players/ReleaseAllTeamsButton.tsx:16`
- Modify: `app/players/WipePlayersButton.tsx:16`
- Modify: `app/teams/TeamForm.tsx:49,80`
- Modify: `app/wishlist/ResetWishlistButtons.tsx:46`

**Interfaces:**
- Consumes: i token `--color-on-accent`, `--color-on-role`, `--color-on-danger`, `--color-scrim`, `--color-scrim-strong` dal Task 2
- Produces: niente di nuovo per i task successivi

- [ ] **Step 1: Mappare ogni occorrenza al token giusto**

La regola è: guarda il riempimento sotto il testo.

| Riempimento sotto | Classe nuova |
|---|---|
| `bg-accent` / `file:bg-accent` | `text-on-accent` / `file:text-on-accent` |
| `bg-role-*` | `text-on-role` |
| `bg-danger` / `hover:bg-danger` | `text-on-danger` / `hover:text-on-danger` |

Elenco completo, con il riempimento che decide:

| File:riga | Riempimento | Sostituzione |
|---|---|---|
| `lib/roleStyles.ts:21` | `bg-role-p` | `text-white` → `text-on-role` |
| `lib/roleStyles.ts:22` | `bg-role-d` | `text-white` → `text-on-role` |
| `lib/roleStyles.ts:23` | `bg-role-c` | `text-white` → `text-on-role` |
| `lib/roleStyles.ts:24` | `bg-role-a` | `text-white` → `text-on-role` |
| `app/components/RoleBadge.tsx:21` | `ROLE_BADGE_BG` | `text-white` → `text-on-role` |
| `app/teams/TeamForm.tsx:80` | `bg-role-p` | `text-white` → `text-on-role` |
| `app/components/AssignDialog.tsx:155` | `bg-accent` | `text-white` → `text-on-accent` |
| `app/components/AddPlayerDialog.tsx:108` | `bg-accent` | `text-white` → `text-on-accent` |
| `app/components/AssignPanel.tsx:259` | `bg-accent` | `text-white` → `text-on-accent` |
| `app/settings/ListoneCard.tsx:17` | `bg-accent` | `text-white` → `text-on-accent` |
| `app/settings/PlayersCard.tsx:17` | `bg-accent` | `text-white` → `text-on-accent` |
| `app/settings/LeagueRulesCard.tsx:85` | `bg-accent` | `text-white` → `text-on-accent` |
| `app/settings/MarkStartersCard.tsx:56` | `file:bg-accent` | `file:text-white` → `file:text-on-accent` |
| `app/settings/import/page.tsx:283` | `bg-accent` | `text-white` → `text-on-accent` |
| `app/settings/import/page.tsx:417` | `bg-accent` | `text-white` → `text-on-accent` |
| `app/teams/TeamForm.tsx:49` | `bg-accent` | `text-white` → `text-on-accent` |
| `app/components/ConfirmDialog.tsx:101` | `bg-danger` | `text-white` → `text-on-danger` |
| `app/players/ResetStartersButton.tsx:16` | `hover:bg-danger` | `hover:text-white` → `hover:text-on-danger` |
| `app/players/ReleaseAllTeamsButton.tsx:16` | `hover:bg-danger` | `hover:text-white` → `hover:text-on-danger` |
| `app/players/WipePlayersButton.tsx:16` | `hover:bg-danger` | `hover:text-white` → `hover:text-on-danger` |
| `app/wishlist/ResetWishlistButtons.tsx:46` | `hover:bg-danger` | `hover:text-white` → `hover:text-on-danger` |

- [ ] **Step 2: Applicare le sostituzioni sui riempimenti accento**

I file con `bg-accent` (o `file:bg-accent`) hanno tutti la forma `hover:text-white` assente e `text-white` presente una volta sola per riga. Applicare, file per file, la sostituzione dalla tabella. Su `app/settings/MarkStartersCard.tsx:56` la classe è prefissata: diventa `file:text-on-accent`.

- [ ] **Step 3: Applicare le sostituzioni sui ruoli e sul pericolo**

`lib/roleStyles.ts` diventa, nel blocco `ROLE_PILL_FULL`:

```ts
/** Filled role colours, for a pill whose role has reached its limit. */
export const ROLE_PILL_FULL: Record<Role, string> = {
  P: "bg-role-p text-on-role",
  D: "bg-role-d text-on-role",
  C: "bg-role-c text-on-role",
  A: "bg-role-a text-on-role",
};
```

`app/components/RoleBadge.tsx:21` diventa:

```tsx
      className={`inline-flex shrink-0 items-center justify-center font-mono font-semibold text-on-role ${SIZES[size]} ${bg}`}
```

I quattro pulsanti pericolo (`ResetStartersButton`, `ReleaseAllTeamsButton`, `WipePlayersButton`, `ResetWishlistButtons`) hanno tutti `hover:bg-danger hover:text-white`: diventa `hover:bg-danger hover:text-on-danger`.

`app/components/ConfirmDialog.tsx:101` ha `bg-danger ... text-white`: diventa `text-on-danger`.

- [ ] **Step 4: Sostituire le due tendine**

`app/components/Sidebar.tsx:103` — l'overlay del drawer mobile:

```tsx
          className="fixed inset-0 z-40 bg-scrim md:hidden"
```

`app/components/ui/dialog.tsx:24` — la tendina dei dialog:

```tsx
      "fixed inset-0 z-50 bg-scrim-strong data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
```

- [ ] **Step 5: Verificare che non sia rimasto niente**

Run:
```bash
grep -rn "text-white" app lib; echo "text-white rimasti: $(grep -ro 'text-white' app lib | wc -l)"
grep -rnoE "(bg|text|border|ring|fill|stroke)-\[[^]]*(rgb|#)[^]]*\]" app lib
```
Expected: zero `text-white`, zero utility con colore arbitrario. Entrambi i comandi non stampano righe di risultato.

- [ ] **Step 6: Verificare build e test**

Run: `npm run build && npm test`
Expected: build verde, 145 test verdi.

- [ ] **Step 7: Commit**

```bash
git add app lib
git commit -m "refactor: replace hardcoded white and scrims with theme tokens"
```

---

### Task 4: Il selettore di tema

Il componente e il cablaggio nel layout, script anti-lampo compreso.

**Files:**
- Create: `app/components/ThemeToggle.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: da `lib/theme.ts` — `THEME_STORAGE_KEY`, `parseThemeChoice`, `resolveTheme`, `nextChoice`, `type ThemeChoice`
- Produces: `<ThemeToggle />`, componente client senza props

- [ ] **Step 1: Scrivere il componente**

Create `app/components/ThemeToggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  THEME_STORAGE_KEY,
  parseThemeChoice,
  resolveTheme,
  nextChoice,
  type ThemeChoice,
} from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const META: Record<ThemeChoice, { icon: typeof Sun; label: string }> = {
  light: { icon: Sun, label: "Tema chiaro" },
  dark: { icon: Moon, label: "Tema scuro" },
  system: { icon: Monitor, label: "Tema di sistema" },
};

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  // Spegne le transizioni per un frame: senza, ogni elemento con una
  // transition sul colore parte insieme e lo switch diventa poltiglia.
  root.setAttribute("data-theme-switching", "");
  root.setAttribute("data-theme", resolveTheme(choice, window.matchMedia(DARK_QUERY).matches));
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => root.removeAttribute("data-theme-switching"));
  });
}

export default function ThemeToggle() {
  // Parte da "system" e si allinea dopo il mount: il valore vero sta in
  // localStorage, che sul server non esiste. Lo script inline nel layout ha
  // già dipinto la pagina giusta, quindi non si vede nessun salto.
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    setChoice(parseThemeChoice(window.localStorage.getItem(THEME_STORAGE_KEY)));
  }, []);

  // Il sistema va ascoltato solo mentre lo si sta seguendo.
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  function cycle() {
    const next = nextChoice(choice);
    setChoice(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    apply(next);
  }

  const { icon: Icon, label } = META[choice];
  const nextLabel = META[nextChoice(choice)].label.toLowerCase();

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${label}. Attiva ${nextLabel}.`}
      title={label}
      className="fixed right-4 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface text-ink-2 transition-colors duration-fast ease-standard hover:text-ink md:right-6 md:top-5"
    >
      <Icon size={16} strokeWidth={1.7} />
    </button>
  );
}
```

- [ ] **Step 2: Cablare il layout**

Modify `app/layout.tsx`. Sostituire il blocco `return (...)` e aggiungere le importazioni:

```tsx
import "./globals.css";
import { manrope, jetbrainsMono } from "@/lib/fonts";
import Sidebar from "@/app/components/Sidebar";
import ThemeToggle from "@/app/components/ThemeToggle";
import { prisma } from "@/lib/prisma";
import { getLeagueSettings } from "@/lib/leagueSettings";

export const metadata = {
  title: "Fantacalcio Auction Manager",
};

// Allinea la barra di stato del browser al tema, così su telefono non resta
// una striscia chiara sopra una pagina scura.
export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eaecf6" },
    { media: "(prefers-color-scheme: dark)", color: "#101216" },
  ],
};

/**
 * Gira prima del primo paint e prima del bundle, quindi non può importare da
 * `lib/theme.ts`: la chiave e i tre valori sono duplicati a mano. Senza questo
 * script, a ogni reload si vede un lampo del tema sbagliato.
 */
const THEME_BOOTSTRAP = `
(function () {
  try {
    var raw = localStorage.getItem("ao-fanta-theme");
    var choice = raw === "light" || raw === "dark" ? raw : "system";
    var dark = choice === "dark" ||
      (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [assigned, teamCount, settings] = await Promise.all([
    prisma.player.count({ where: { fantasyTeamId: { not: null } } }),
    prisma.team.count(),
    getLeagueSettings(),
  ]);
  const rosterSize = settings.limitP + settings.limitD + settings.limitC + settings.limitA;
  const total = teamCount * rosterSize;

  return (
    // suppressHydrationWarning perché lo script sopra scrive data-theme
    // sull'elemento prima che React idrati.
    <html
      lang="it"
      className={`${manrope.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="flex bg-paper text-ink font-sans">
        <Sidebar assignedCount={assigned} totalCount={total} />
        <ThemeToggle />
        {/* min-w-0 annulla il min-width:auto implicito dei flex item. Senza,
            l'overflow-x-auto di PlayersTable non contiene niente e la tabella
            allarga la pagina. */}
        <main className="mx-auto w-full min-w-0 max-w-[1240px] flex-1 px-4 pb-16 pt-20 md:px-12 md:pt-10">
          {children}
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verificare build e test**

Run: `npm run build && npm test`
Expected: build verde, 145 test verdi.

- [ ] **Step 4: Verificare che lo script finisca nel documento e non nel bundle**

Lo script anti-lampo deve stare nell'HTML servito: se finisse in un chunk differito girerebbe dopo il primo paint e il lampo resterebbe.

Run:
```bash
grep -c "ao-fanta-theme" app/layout.tsx
grep -rl "ao-fanta-theme" .next/static/chunks/ 2>/dev/null | head
```
Expected: il primo comando stampa `1`; il secondo non stampa nulla (la stringa non è finita in un chunk client).

Poi, con `npm run dev` avviato in un altro terminale, aprire `http://localhost:3000` e confermare in DevTools che `<html>` porta già `data-theme` nel sorgente della pagina.

- [ ] **Step 5: Commit**

```bash
git add app/components/ThemeToggle.tsx app/layout.tsx
git commit -m "feat: add theme toggle with system default"
```

---

### Task 5: Il pallino, e verifica finale

`public/ball.png` è line art nera su fondo trasparente: sul fondo grafite sparisce.

**Files:**
- Modify: `app/components/Sidebar.tsx:95,117`

**Interfaces:**
- Consumes: la variante `dark:` dal Task 2
- Produces: niente

- [ ] **Step 1: Invertire il pallino nel tema scuro**

In `app/components/Sidebar.tsx` ci sono due `<Image src="/ball.png" …>`, una nell'header mobile (riga ~95) e una nella sidebar (riga ~117). Aggiungere `dark:invert` a entrambe le `className`:

```tsx
        <Image src="/ball.png" alt="" width={20} height={20} className="shrink-0 dark:invert" priority />
```

L'inversione porta il contorno da nero a bianco e il riempimento da crema a ardesia scura, che è esattamente il rapporto giusto sul fondo grafite. Una seconda immagine sarebbe un asset in più da tenere allineato.

- [ ] **Step 2: Verificare che la variante produca CSS**

Run:
```bash
npm run build && grep -c 'data-theme="dark"' .next/static/css/app/layout.css
```
Expected: build verde, conteggio ≥ 2 (il blocco token più la regola di `invert`).

- [ ] **Step 3: Verifica completa automatica**

Run:
```bash
npm test
grep -rn "text-white" app lib
grep -rnoE "(bg|text|border|ring|fill|stroke)-\[[^]]*(rgb|#)[^]]*\]" app lib
grep -c "#0d6f9e\|#4fb3e8\|#eaecf6\|#101216" .next/static/css/app/layout.css
```
Expected: 145 test verdi; i due grep non stampano nulla; l'ultimo conteggio è maggiore di zero.

- [ ] **Step 4: Verifica manuale**

Avviare `npm run dev` e controllare, **in entrambi i temi**:

1. `/` — asta: barra di stato, pannello di assegnazione aperto, badge ruolo.
2. `/players` — listone: intestazioni tabella, badge ruolo, pill squadra. Confermare che il badge D azzurro e la pill squadra indaco non si confondano più.
3. `/teams` — card squadra, pill ruolo piene e vuote, pulsanti pericolo in hover.
4. `/wishlist` — sezioni per tier.
5. `/settings` — tutte le card, pulsanti accento, zona pericolo.
6. Drawer mobile aperto sotto i 768 px: la tendina deve essere scura in entrambi i temi, mai bianca.
7. Un dialog di conferma aperto: tendina, ombra e pulsante pericolo.
8. Il selettore in alto a destra: tre stati in ciclo, e la scelta sopravvive al reload senza lampo.
9. Con il selettore su «sistema», cambiare aspetto a macOS: la pagina segue senza reload.

- [ ] **Step 5: Commit**

```bash
git add app/components/Sidebar.tsx
git commit -m "fix: invert ball mark in dark theme"
```

---

## Note per chi esegue

- **Non** aggiungere ombre alle card per dare profondità: quella arriva dal salto di luminanza fra `--color-paper` e `--color-surface`, ed è già tarata a 1.18 in entrambi i temi.
- **Non** inventare nuovi valori esadecimali. Ogni colore in questo piano è stato misurato: le 27 coppie del tema scuro e le 17 del chiaro passano tutte le soglie WCAG previste, e le distanze di tinta sono state calcolate in OKLCH. Cambiare un valore a occhio rompe una di queste due proprietà.
- Se un token sembra mancare, controllare che esista in `@theme` prima di aggiungerlo a un blocco di override: un colore definito solo dentro `[data-theme="dark"]` o dentro `@media` lascia scoperto lo stato non marcato.
