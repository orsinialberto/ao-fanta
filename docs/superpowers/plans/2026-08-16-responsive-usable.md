# Responsive "livello usabile" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere ao-fanta usabile da telefono — navigazione raggiungibile, zero scroll orizzontale della pagina, nessun controllo tagliato — senza ridisegnare le tabelle e senza toccare il rendering desktop.

**Architecture:** Mobile-first sulle classi Tailwind: la classe nuda descrive il mobile, il prefisso `md:`/`lg:` ripristina il comportamento desktop di oggi. La sidebar diventa un drawer che si possiede lo stato da solo (barra fissa + backdrop + aside che passa da `fixed` a `md:sticky`), quindi `layout.tsx` non cambia struttura, solo classi. Le tabelle restano tabelle e scrollano orizzontalmente dentro il loro contenitore, cosa che oggi non funziona perché al `<main>` manca `min-w-0`.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS v4 (config in `@theme` dentro `app/globals.css`), lucide-react, TypeScript, vitest (`environment: "node"`).

**Spec:** `docs/superpowers/specs/2026-08-16-responsive-usable-design.md`

## Global Constraints

- **Nessuna nuova dipendenza.** Né runtime né dev. Niente librerie di drawer, focus trap o test DOM.
- **Nessun test automatico nuovo.** `vitest.config.ts` usa `environment: "node"` senza jsdom né `@testing-library`. Non aggiungerli.
- **Breakpoint di default Tailwind v4**, nessuno custom: `sm` = 40rem/640px, `md` = 48rem/768px, `lg` = 64rem/1024px. Non aggiungere `--breakpoint-*` a `@theme`.
- **`md` (768px) è la soglia sidebar.** Sopra: colonna fissa. Sotto: drawer.
- **Mobile-first.** Classe nuda = mobile, prefisso = desktop. Non scrivere `max-md:`.
- **Il desktop non cambia di un pixel.** A 1280px il rendering dev'essere identico a prima.
- **Niente arbitrary value** di dimensione testo, raggio o spacing nel codice applicativo (regola del design system, `docs/superpowers/specs/2026-08-15-design-system-refactor-design.md`). Le due sole eccezioni ammesse in questo piano: `w-[220px]` (già esistente) e `w-[calc(100%-2rem)]` sul `DialogContent` (Task 5), che è un gutter, non uno spacing da scala.
- **Copy UI in italiano.** `aria-label` inclusi.
- **Token esistenti, non valori grezzi.** Le durate sono `duration-fast` (120ms) e `duration-base` (180ms), l'easing è `ease-standard`, i colori sono `ink`/`ink-2`/`ink-3`/`paper`/`surface`/`surface-sunk`/`line`/`line-strong`/`accent`. Sono tutti definiti in `app/globals.css`.
- **Commit in inglese**, Conventional Commits, come tutta la history del repo.

## Verifica manuale — procedura condivisa

Diversi task chiudono con un controllo visivo. Ogni volta significa questo, e nient'altro:

1. `npm run dev` in un terminale separato (se non gira già).
2. Apri Chrome su `http://localhost:3000`, `Cmd+Option+I`, poi `Cmd+Shift+M` per il device toolbar.
3. Metti la larghezza a mano su ognuno dei tre viewport: **375×667**, **768×1024**, **1280×800**.
4. Su ogni viewport, incolla questo nella console e leggi il risultato:

```js
[document.documentElement.scrollWidth, window.innerWidth]
```

I due numeri devono essere uguali. Se il primo è più grande, la pagina scrolla orizzontalmente e il task non è finito.

Le rotte da girare, quando un task dice "tutte le rotte": `/`, `/players`, `/teams`, `/wishlist`, `/settings`.

---

### Task 1: Guscio di layout responsive

Il `<main>` ha 96px di padding orizzontale fissi e, cosa peggiore, è un flex item senza `min-w-0`. Il `min-width: auto` implicito dei flex item fa sì che il contenuto largo (la tabella del listone) allarghi la pagina invece di scrollare dentro il proprio `overflow-x-auto`. Questa è la singola riga che rompe più cose.

**Files:**
- Modify: `app/layout.tsx:24`
- Test: nessuno (nessun ambiente di test DOM — vedi Global Constraints)

**Interfaces:**
- Consumes: niente.
- Produces: il `<main>` con `min-w-0` e padding responsive. Il Task 2 cambierà il solo padding-top di questo stesso elemento da `pt-6` a `pt-20` per fare posto alla barra mobile.

- [ ] **Step 1: Verifica che il meta viewport ci sia già**

Next.js 15 emette da solo `<meta name="viewport" content="width=device-width, initial-scale=1" />` quando non c'è un export `viewport`. Confermalo invece di darlo per scontato — senza quel tag ogni altra riga di questo piano è inutile, perché il telefono renderizza a 980px virtuali e poi rimpicciolisce.

Con `npm run dev` attivo:

```bash
curl -s http://localhost:3000 | grep -o '<meta name="viewport"[^>]*>'
```

Atteso: una riga contenente `width=device-width`.

Se il comando non stampa nulla, e solo in quel caso, aggiungi questo export in `app/layout.tsx` subito sotto `metadata`:

```tsx
export const viewport = {
  width: "device-width",
  initialScale: 1,
};
```

- [ ] **Step 2: Rendi responsive il padding del main e sbloccalo in larghezza**

In `app/layout.tsx`, sostituisci la riga 24:

```tsx
        <main className="w-full max-w-[1240px] flex-1 px-12 pb-16 pt-10">
```

con:

```tsx
        {/* min-w-0 annulla il min-width:auto implicito dei flex item. Senza,
            l'overflow-x-auto di PlayersTable non contiene niente e la tabella
            allarga la pagina. */}
        <main className="w-full min-w-0 max-w-[1240px] flex-1 px-4 pb-16 pt-6 md:px-12 md:pt-10">
```

- [ ] **Step 3: Type-check e suite esistente**

```bash
npx tsc --noEmit && npm test
```

Atteso: `tsc` non stampa nulla; vitest chiude verde. Nessun test tocca i componenti, quindi qui stai solo confermando di non aver rotto niente.

- [ ] **Step 4: Verifica manuale**

Segui la procedura condivisa qui sopra su `/players`, che è la rotta con la tabella più larga.

- A **1280px**: identico a prima. Padding laterale generoso, tabella intera visibile.
- A **768px**: `scrollWidth === innerWidth`. La tabella scrolla **dentro** il suo riquadro, non trascina la pagina.
- A **375px**: `scrollWidth === innerWidth`. La sidebar occupa ancora mezzo schermo ed è brutto — è previsto, la sistema il Task 2. Quello che conta qui è che la pagina non scrolli in orizzontale.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx
git commit -m "fix: let the main column shrink and pad it responsively"
```

---

### Task 2: Sidebar come drawer sotto md

Il pezzo grosso, e l'unico con logica vera. `Sidebar.tsx` prende uno stato `open` e rende tre superfici: una barra fissa in alto (solo mobile), un backdrop (solo mobile, solo da aperto) e l'aside, che passa da `fixed` fuori schermo a `md:sticky` nel flusso. Barra e backdrop sono `fixed`, quindi `layout.tsx` non ha bisogno di wrapper nuovi.

**Files:**
- Modify: `app/components/Sidebar.tsx` (riscrittura del componente `Sidebar`; `NavLink` e le costanti `PRIMARY_LINKS`/`CONFIG_LINKS` restano identici)
- Modify: `app/layout.tsx:24` (solo `pt-6` → `pt-20`)
- Test: nessuno

**Interfaces:**
- Consumes: dal Task 1, il `<main>` con `px-4 pb-16 pt-6 md:px-12 md:pt-10`.
- Produces: `<Sidebar assignedCount={number} totalCount={number} />` — firma delle props invariata rispetto a oggi, `app/layout.tsx:23` non va toccata. L'aside espone `id="sidebar-nav"`.

- [ ] **Step 1: Aggiungi gli import necessari**

In `app/components/Sidebar.tsx`, sostituisci le righe 1-6:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gavel, List, Users, Star, Settings } from "lucide-react";
import { spendPercent } from "@/lib/credits";
```

con:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gavel, List, Users, Star, Settings, Menu, X } from "lucide-react";
import { spendPercent } from "@/lib/credits";
```

`Menu` e `X` esistono entrambe in `lucide-react` v1 e sono già lo stile di icona usato nel file (`size` esplicito, `strokeWidth={1.7}`).

- [ ] **Step 2: Sostituisci il componente Sidebar**

Sempre in `app/components/Sidebar.tsx`, sostituisci l'intero `export default function Sidebar` (dalla riga 35 alla fine del file) con questo. `NavLink`, `PRIMARY_LINKS` e `CONFIG_LINKS` sopra restano invariati.

```tsx
export default function Sidebar({
  assignedCount,
  totalCount,
}: {
  assignedCount: number;
  totalCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pct = spendPercent(assignedCount, totalCount);

  // Il drawer è una superficie di navigazione: essere atterrati su una rotta
  // nuova è il segnale che ha finito il suo lavoro e deve togliersi di mezzo.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);

    // Senza questo la pagina dietro al drawer scorre sotto il dito.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-paper px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Apri menu"
          aria-expanded={open}
          aria-controls="sidebar-nav"
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-md text-ink-2 transition-colors duration-fast ease-standard hover:bg-surface-sunk hover:text-ink"
        >
          <Menu size={18} strokeWidth={1.7} />
        </button>
        <div className="h-5 w-5 shrink-0 rounded-sm bg-accent" />
        <span className="text-h3">ao-fanta</span>
      </header>

      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-ink/40 md:hidden"
        />
      )}

      {/* invisible da chiuso toglie i link dall'ordine di tabulazione senza
          smontarli, così la transform può animare. md:visible lo riporta su
          desktop, dove il drawer non esiste come concetto. */}
      <aside
        id="sidebar-nav"
        className={`fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-col gap-6 border-r border-line bg-paper p-4 transition-transform duration-base ease-standard md:sticky md:z-auto md:visible md:translate-x-0 ${
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-2">
          <div className="h-5 w-5 shrink-0 rounded-sm bg-accent" />
          <span className="text-h3">ao-fanta</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Chiudi menu"
            className="-mr-1 ml-auto flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition-colors duration-fast ease-standard hover:bg-surface-sunk hover:text-ink md:hidden"
          >
            <X size={16} strokeWidth={1.7} />
          </button>
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
            <span className="font-mono font-medium tabular-nums text-ink">{assignedCount}</span> di{" "}
            {totalCount} assegnati
          </span>
        </div>

        <nav className="mt-auto flex flex-col gap-px">
          {CONFIG_LINKS.map((l) => (
            <NavLink key={l.href} {...l} />
          ))}
        </nav>
      </aside>
    </>
  );
}
```

- [ ] **Step 3: Fai spazio alla barra fissa**

La `<header>` mobile è `fixed` e alta `h-14` (56px), quindi non occupa spazio nel flusso: senza compenso il contenuto ci finisce sotto. In `app/layout.tsx`, cambia `pt-6` in `pt-20` (56px di barra + 24px di respiro). `md:pt-10` lo annulla già da 768px in su, dove la barra è `md:hidden`.

Sostituisci:

```tsx
        <main className="w-full min-w-0 max-w-[1240px] flex-1 px-4 pb-16 pt-6 md:px-12 md:pt-10">
```

con:

```tsx
        <main className="w-full min-w-0 max-w-[1240px] flex-1 px-4 pb-16 pt-20 md:px-12 md:pt-10">
```

- [ ] **Step 4: Type-check e suite esistente**

```bash
npx tsc --noEmit && npm test
```

Atteso: `tsc` silenzioso, vitest verde.

- [ ] **Step 5: Verifica manuale del drawer**

A **375px**, su `/`:

1. La sidebar non si vede. In cima c'è una barra con hamburger e wordmark.
2. Tap sull'hamburger: il drawer entra da sinistra, il resto va sotto un velo scuro.
3. `Escape` lo chiude.
4. Riaprilo, tap sul velo: si chiude.
5. Riaprilo, tap sulla X in alto a destra nel drawer: si chiude.
6. Riaprilo, tap su "Listone": naviga **e** il drawer si chiude da solo.
7. Con il drawer aperto, prova a scorrere la pagina dietro: non deve muoversi. Chiudilo e verifica che lo scroll torni a funzionare.
8. Da drawer chiuso, premi `Tab` ripetutamente: il focus non deve mai finire su un link di navigazione fuori schermo.

A **1280px**, su tutte le rotte: nessuna barra in alto, sidebar identica a prima, nessun velo, nessuna X. Il link attivo è ancora evidenziato.

Su tutte e cinque le rotte a **375px**, esegui il controllo `scrollWidth`/`innerWidth` della procedura condivisa.

- [ ] **Step 6: Commit**

```bash
git add app/components/Sidebar.tsx app/layout.tsx
git commit -m "feat: turn the sidebar into a drawer below md"
```

---

### Task 3: Listone e wishlist usabili in colonna stretta

Due file. La toolbar è una riga `flex` senza `flex-wrap` con dentro ricerca, quattro chip ruolo, tre chip wishlist, una select e due checkbox: sotto i 640px straborda. La tabella ha già `overflow-x-auto` e dal Task 1 scrolla davvero, ma il suo header `sticky top-0` finisce sotto la barra mobile alta 56px.

`PlayersTable` e `ListoneToolbar` sono condivisi fra `/players` e `/wishlist` (`app/wishlist/page.tsx:8-9`): una modifica sola copre entrambe le rotte.

**Files:**
- Modify: `app/players/ListoneToolbar.tsx:66-67`
- Modify: `app/players/PlayersTable.tsx:153` e `app/players/PlayersTable.tsx:159`
- Test: nessuno

**Interfaces:**
- Consumes: dal Task 1 il `min-w-0` sul `<main>`, senza cui l'`overflow-x-auto` della tabella non contiene niente; dal Task 2 la barra mobile `h-14`, che è il numero da cui viene `top-14`.
- Produces: niente per i task successivi.

- [ ] **Step 1: Manda a capo la toolbar**

In `app/players/ListoneToolbar.tsx`, sostituisci le righe 66-67:

```tsx
      <div className="flex items-center gap-4">
        <div className="flex w-56 items-center gap-2 rounded-md border border-line bg-surface-sunk px-3 py-1.5 transition-colors duration-fast ease-standard focus-within:border-accent">
```

con:

```tsx
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex w-full items-center gap-2 rounded-md border border-line bg-surface-sunk px-3 py-1.5 transition-colors duration-fast ease-standard focus-within:border-accent sm:w-56">
```

`w-full` sotto 640px dà al campo di ricerca una riga tutta sua e spinge i gruppi di chip sotto; `sm:w-56` riporta la larghezza fissa di oggi. `gap-y-3` è il respiro fra le righe che si formano solo quando la toolbar va a capo, quindi su desktop non si vede.

- [ ] **Step 2: Stacca l'header sticky da sotto la barra mobile**

In `app/players/PlayersTable.tsx`, riga 153, sostituisci `sticky top-0` con `sticky top-14 md:top-0`. La classe completa diventa:

```tsx
                  className="sticky top-14 z-10 cursor-pointer select-none whitespace-nowrap border-b border-line bg-paper px-3 py-3 text-left text-label uppercase text-ink-3 transition-colors duration-fast ease-standard hover:text-ink-2 md:top-0"
```

Poi riga 159, la colonna vuota delle azioni, stessa correzione:

```tsx
              <th className="sticky top-14 z-10 border-b border-line bg-paper px-3 py-3 md:top-0" />
```

- [ ] **Step 3: Type-check e suite esistente**

```bash
npx tsc --noEmit && npm test
```

Atteso: `tsc` silenzioso, vitest verde. `lib/filterParams.test.ts` copre la logica dei filtri e non è stata toccata: deve restare verde.

- [ ] **Step 4: Verifica manuale**

A **375px** su `/players`:

1. Il campo di ricerca prende tutta la larghezza; chip ruolo, chip wishlist, select e checkbox stanno sotto, andati a capo, nessuno tagliato.
2. Scrivi due lettere nella ricerca: i risultati si filtrano e il conteggio "N risultati" si aggiorna.
3. Tap su un chip ruolo: si attiva e sotto compare la pillola del filtro con la X.
4. Scorri la tabella lateralmente: scrolla il riquadro, non la pagina.
5. Scorri la pagina in verticale: l'header della tabella si ferma **sotto** la barra mobile, non sparisce dietro.
6. Controllo `scrollWidth`/`innerWidth`.

A **375px** su `/wishlist`: stessa toolbar (senza le due checkbox di stato), tre tabelle una per lista, stesso comportamento di scroll.

A **1280px** su `/players`: toolbar su una riga sola come prima, header incollato a `top-0`.

- [ ] **Step 5: Commit**

```bash
git add app/players/ListoneToolbar.tsx app/players/PlayersTable.tsx
git commit -m "fix: wrap the listone toolbar and offset the sticky table header"
```

---

### Task 4: Asta impilata sotto lg

`app/page.tsx:43` e il suo scheletro di caricamento fissano `grid-cols-[1fr_296px]`. La soglia giusta è `lg`, non `md`: a 768px, tolti i 220px di sidebar e i 96px di padding, restano ~452px, e sottraendo i 296 del pannello ne resterebbero 156 per la lista degli acquisti.

Il pannello va corretto insieme: `TeamCreditsPanel` è `sticky top-10`, sensato in una colonna laterale, sbagliato quando è impilato in fondo alla pagina.

**Files:**
- Modify: `app/page.tsx:43`
- Modify: `app/loading.tsx:8`
- Modify: `app/components/TeamCreditsPanel.tsx:22`
- Test: nessuno

**Interfaces:**
- Consumes: dal Task 1 il padding responsive del `<main>`.
- Produces: niente per i task successivi.

- [ ] **Step 1: Impila la griglia dell'asta**

In `app/page.tsx`, riga 43, sostituisci:

```tsx
      <div className="grid grid-cols-[1fr_296px] items-start gap-8 text-body-dense">
```

con:

```tsx
      <div className="grid grid-cols-1 items-start gap-8 text-body-dense lg:grid-cols-[1fr_296px]">
```

- [ ] **Step 2: Allinea lo scheletro di caricamento**

Lo scheletro deve avere la stessa forma della pagina, altrimenti il contenuto salta quando arriva. In `app/loading.tsx`, riga 8, sostituisci:

```tsx
      <div className="grid grid-cols-[1fr_296px] items-start gap-8">
```

con:

```tsx
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_296px]">
```

- [ ] **Step 3: Togli lo sticky al pannello quando è impilato**

In `app/components/TeamCreditsPanel.tsx`, riga 22, sostituisci:

```tsx
    <aside className="sticky top-10">
```

con:

```tsx
    {/* Sotto lg il pannello è impilato in fondo alla pagina, dove restare
        incollato in alto non vuol dire niente. */}
    <aside className="static lg:sticky lg:top-10">
```

- [ ] **Step 4: Type-check e suite esistente**

```bash
npx tsc --noEmit && npm test
```

Atteso: `tsc` silenzioso, vitest verde.

- [ ] **Step 5: Verifica manuale**

A **375px** su `/`:

1. La barra di ricerca è a piena larghezza, gli acquisti recenti sotto, il pannello "Crediti squadre" in fondo a piena larghezza.
2. Il pannello scorre insieme alla pagina, non resta incollato in alto.
3. Ricarica con `Cmd+Shift+R` e guarda lo scheletro: è impilato anche lui, e il contenuto vero non salta quando lo sostituisce.
4. Controllo `scrollWidth`/`innerWidth`.

A **768px**: ancora impilato — è voluto, vedi il calcolo qui sopra.

A **1280px**: due colonne come prima, pannello incollato a `top-10` mentre scorri.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/loading.tsx app/components/TeamCreditsPanel.tsx
git commit -m "fix: stack the asta panel below the list under lg"
```

---

### Task 5: Form, dialog e badge di scorciatoie

Gli ultimi tre punti stretti. Quattro input numerici affiancati in `grid-cols-4`; i dialog che a 375px toccano entrambi i bordi dello schermo; e il badge `↑↓ · ⏎ assegna · esc` che su un telefono, dove tastiera fisica non c'è, si prende metà della barra di ricerca dell'asta.

**Files:**
- Modify: `app/settings/LeagueRulesCard.tsx:51`
- Modify: `app/components/ui/dialog.tsx:41`
- Modify: `app/components/AstaSearch.tsx:93`
- Test: nessuno

**Interfaces:**
- Consumes: niente dai task precedenti.
- Produces: niente.

- [ ] **Step 1: Due colonne per i limiti di ruolo**

In `app/settings/LeagueRulesCard.tsx`, riga 51, sostituisci:

```tsx
      <div className="mb-4 grid grid-cols-4 gap-2.5">
```

con:

```tsx
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
```

Due per riga sotto 640px: Por/Dif sopra, Cen/Att sotto. Sono già quattro campi con etichetta e pallino colorato, e a 375px in fila da quattro l'input diventa più stretto del suo `px-3`.

- [ ] **Step 2: Dai un gutter ai dialog**

`DialogContent` è `fixed` e centrato con una translate, quindi non c'è nessun genitore che possa dargli un margine: la larghezza deve dirlo lui. In `app/components/ui/dialog.tsx`, riga 41, sostituisci il pezzo iniziale della stringa di classi:

```
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border bg-surface p-6 shadow-overlay duration-base data-[state=open]:animate-in
```

con:

```
"fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border bg-surface p-6 shadow-overlay duration-base data-[state=open]:animate-in
```

Cambia solo `w-full` in `w-[calc(100%-2rem)]`: il resto della riga, che è lunga, resta identico. 16px di respiro per lato sotto i 544px; sopra vince `max-w-lg` e il desktop non cambia. Questo è l'unico arbitrary value nuovo del piano, ed è sanzionato dallo spec perché esprime un gutter, non uno spacing da scala.

- [ ] **Step 3: Nascondi il badge di scorciatoie su mobile**

In `app/components/AstaSearch.tsx`, riga 93, sostituisci:

```tsx
        <span className="shrink-0 rounded-sm border border-line px-2 py-px font-mono text-small-dense text-ink-3">
```

con:

```tsx
        <span className="hidden shrink-0 rounded-sm border border-line px-2 py-px font-mono text-small-dense text-ink-3 md:inline-block">
```

- [ ] **Step 4: Type-check e suite esistente**

```bash
npx tsc --noEmit && npm test
```

Atteso: `tsc` silenzioso, vitest verde.

- [ ] **Step 5: Verifica manuale**

A **375px**:

1. Su `/settings`, la card "Regole lega" mostra i quattro limiti due per riga. Cambia un valore, tap su "Salva modifiche", ricarica: il valore nuovo è rimasto.
2. Su `/`, la barra di ricerca dell'asta non ha più il badge delle scorciatoie e il campo di testo si prende lo spazio.
3. Sempre su `/`, cerca un giocatore e tappalo per aprire il dialog di assegnazione: ha margine su entrambi i lati, non tocca i bordi. Il select della squadra si apre e resta dentro lo schermo.
4. Su `/teams`, apri un `ReleaseAllButton` o un `DeleteTeamButton` per vedere `ConfirmDialog`: stesso gutter.
5. Controllo `scrollWidth`/`innerWidth` su `/settings` e `/teams`.

A **1280px**: dialog identici a prima (`max-w-sm` e `max-w-lg` vincono comunque), quattro limiti in fila, badge scorciatoie di nuovo visibile.

- [ ] **Step 6: Passata finale sui criteri di accettazione**

Prima dell'ultimo commit, gira tutte e cinque le rotte (`/`, `/players`, `/teams`, `/wishlist`, `/settings`) ai tre viewport **375×667**, **768×1024**, **1280×800**, con il controllo `scrollWidth`/`innerWidth` ogni volta. Sono 15 combinazioni e servono a chiudere il criterio 1 dello spec.

Poi una build vera, che è più severa del type-check:

```bash
npm run build
```

Atteso: build completata senza errori.

- [ ] **Step 7: Commit**

```bash
git add app/settings/LeagueRulesCard.tsx app/components/ui/dialog.tsx app/components/AstaSearch.tsx
git commit -m "fix: give forms, dialogs and the asta search room on narrow screens"
```

---

## Note per chi esegue

- **Se un viewport non passa il controllo `scrollWidth`, non andare avanti.** Trova l'elemento colpevole prima di committare, con questo in console:

```js
[...document.querySelectorAll("*")].filter(el => el.getBoundingClientRect().right > window.innerWidth + 1)
```

- **`app/teams/page.tsx:36` e `app/teams/loading.tsx:8` non vanno toccati.** Usano già `grid-cols-[repeat(auto-fill,minmax(260px,1fr))]`, che è responsive da solo: a 375px meno 32px di padding restano 343px, sopra i 260 richiesti, quindi collassa a una colonna senza aiuto.
- **`app/settings/import/page.tsx:152` non va toccata.** La sua tabella di anteprima è già dentro un `overflow-x-auto` e dal Task 1 funziona.
- **`app/settings/page.tsx:22` e `app/settings/loading.tsx:8` non vanno toccati.** `max-w-[640px]` è un massimo, non una larghezza: sotto quella soglia si restringe da solo.
- **Fuori scope, non aggiungerli in corsa:** `PlayersTable` come lista di card, `TeamCreditsPanel` collassabile, dialog full-screen, l'`autoFocus` di `AstaSearch` che su telefono apre la tastiera al caricamento, dark mode, target touch da 44px. Sono il "livello buono" e vanno in un piano loro.
