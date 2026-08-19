# Fondamenta motion + materiali — design

**Data:** 2026-08-19
**Stato:** approvato
**Sotto-progetto:** 1 di 5 (porting del redesign Apple-style del mockup `asta-mockup.html` nell'app reale)

## Contesto

Il mockup (artifact "Asta ao-fanta") ha validato un linguaggio visivo — vetro traslucido, molle interrompibili, indicatori di navigazione che scivolano invece di scattare — sopra i token esistenti dell'app (`app/globals.css`). Portarlo tutto in un colpo solo è troppo: tocca cinque aree indipendenti (fondamenta, card/pannelli, dialog/fogli, notifiche toast, drawer mobile). Questo spec copre solo la prima: le fondamenta che gli altri quattro sotto-progetti costruiranno sopra.

Stato di partenza, verificato nel repo:
- **Nessun tema scuro.** `app/globals.css` definisce un'unica palette sotto `@theme`. Nessun `prefers-color-scheme` o `data-theme` in `app/globals.css` o `app/layout.tsx`.
- **Nessun `backdrop-filter`.** Zero occorrenze nel CSS applicativo.
- **Nessun motore a molle.** Le transizioni sono tutte CSS (`transition-colors duration-fast ease-standard` ecc.), niente `requestAnimationFrame` custom.
- **La ricerca vive dentro ogni pagina, non in una chrome condivisa.** `AstaSearch` è dentro `app/page.tsx`; la ricerca di `ListoneToolbar` è dentro `app/players/page.tsx` e `app/wishlist/page.tsx` (riutilizzato). `app/teams/page.tsx` e `app/settings/page.tsx` non hanno ricerca.
- **Il link attivo della sidebar è uno stato statico**, non un indicatore che si muove: `app/components/Sidebar.tsx` applica `bg-surface font-semibold text-ink ring-1 ring-inset ring-line` al link con `active === true` (righe 24-30), nessun elemento separato che trasla.
- **Nessuna dipendenza di animazione** in `package.json` (niente framer-motion/motion, niente next-themes).

## Obiettivo

Dare all'app un motore a molle riusabile, un tema scuro completo, e una chrome di pagina in vetro con la ricerca sempre visibile — senza cambiare cosa fa nessuna ricerca esistente, solo dove vive e come si muove l'indicatore di navigazione.

## Architettura

### Motore a molle

`lib/spring.ts` — porta 1:1 la classe `Spring` del mockup: parametri Apple (`response`, `damping`), interrompibile per costruzione (`set()` mantiene valore e velocità correnti, mai un salto), nessuna dipendenza. Stessa matematica, stesso integratore a passi fissi (240Hz) del mockup.

`lib/useSpring.ts` — hook che la wrappa per React:

```ts
function useSpring(
  initial: number,
  opts?: { response?: number; damping?: number }
): [number, (target: number, opts?: { velocity?: number; response?: number; damping?: number }) => void]
```

Crea la `Spring` una volta (`useRef`), la ripulisce (`spring.stop()`) su unmount, e forza un re-render a ogni tick tramite uno `useState` interno aggiornato da `spring.onUpdate`. L'uso è simmetrico a `useState`: `const [x, setX] = useSpring(0, { response: 0.35 })`.

Rispetta `prefers-reduced-motion`: se attivo, `set()` salta direttamente al target (nessuna animazione), stesso comportamento del mockup.

### Tema scuro

`data-theme="light" | "dark"` su `<html>`, persistito in `localStorage` (`ao-fanta-theme`). Se non c'è una scelta salvata, segue `prefers-color-scheme` del sistema. Un piccolo script inline in `app/layout.tsx`, eseguito prima dell'idratazione React, legge `localStorage` e applica `data-theme` immediatamente — altrimenti la pagina lampeggia nel tema sbagliato al primo paint (pattern standard per App Router, non richiede una dipendenza: è ~10 righe di JS puro in un tag `<script>` inline).

`app/globals.css` guadagna la palette scura completa, sulla stessa struttura a token già in uso: valori base su `:root`, ridefiniti sotto `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` per il default di sistema, ridefiniti di nuovo sotto `:root[data-theme="dark"] { ... }` perché la scelta esplicita vinca in entrambe le direzioni. Stessa struttura del mockup.

Il toggle vive nella sidebar, vicino al link "Impostazioni" (in fondo, come nel mockup). Nuovo componente `app/components/ThemeToggle.tsx`, client, legge/scrive `localStorage` e `document.documentElement.dataset.theme`.

### Materiali vetro

Nuovi token in `app/globals.css`, accanto a quelli esistenti: `--glass-chrome` (superficie strutturale, più pesante — sidebar, chrome di pagina), `--glass-panel` (superficie interattiva, più leggera — riservato al sotto-progetto 2, non usato qui), `--blur-chrome`. Valori diversi per tema chiaro/scuro, stessa gerarchia peso-vetro=gerarchia del mockup (§12 della skill apple-design: strutturale pesante, interattivo leggero).

### Chrome di pagina

`app/components/PageChrome.tsx` — client, sticky in cima a `<main>` (sotto l'header mobile esistente), vetro con scroll-edge mask (stessa tecnica del mockup: `mask-image` sfumata invece di un hairline sotto la chrome). Riceve `children` opzionale: la pagina ci passa dentro la propria ricerca esistente, invariata nel comportamento. `children` è opzionale perché `Squadre` e `Impostazioni` montano `<PageChrome />` senza figli — la striscia vetro resta visibile per coerenza su ogni pagina (confermato in fase di brainstorming: "barra sticky vetro senza campo ricerca"), semplicemente vuota.

```tsx
<PageChrome>
  <AstaSearch teams={...} roleLimits={...} />
</PageChrome>
```

### Indicatore di navigazione a molla

`Sidebar.tsx` guadagna un elemento assoluto (`nav-ind`, ricalcato dal mockup) posizionato con `useSpring` sulla coordinata Y del link attivo, letta da `getBoundingClientRect()` relativa al contenitore `<nav>`. Al cambio pagina, la molla anima verso la nuova posizione (`response: 0.35, damping: 1` — nessun overshoot, stesso valore del mockup per gli indicatori senza slancio di gesto). Lo stile statico attuale (`bg-surface ring-1 ...`) si sposta dall'elemento `<Link>` all'indicatore stesso; il testo/icona del link torna trasparente sopra, cambiando solo colore (`text-ink` vs `text-ink-2`) come già fa oggi.

## Non obiettivi (rimandati ai sotto-progetti 2-5)

- Vetro su `TeamCreditsPanel`, `TeamCard`, wishlist, chip filtri (sotto-progetto 2).
- Qualsiasi cambiamento a `AssignDialog`/`AddPlayerDialog`/`ConfirmDialog` (sotto-progetto 3).
- Notifiche toast (sotto-progetto 4) — non esistono oggi, non introdotte qui.
- Drag 1:1 sul drawer mobile della sidebar (sotto-progetto 5) — il drawer resta sulla transizione CSS attuale, riceve solo vetro e (se il link attivo cambia mentre è aperto) l'indicatore a molla condiviso con la sidebar desktop.
- Haptics (`navigator.vibrate`) — nessuna azione in questo sotto-progetto la giustifica ancora; arriverà con dialog/toast.

## Vincoli di comportamento

- **Nessuna dipendenza nuova**, né runtime né dev.
- **Nessun cambiamento di comportamento della ricerca** su nessuna pagina — `PageChrome` è un contenitore di layout, non riscrive `AstaSearch` o `ListoneToolbar`.
- **Il tema esplicito vince sempre** sul `prefers-color-scheme` di sistema, in entrambe le direzioni.
- **`prefers-reduced-motion`** disattiva l'animazione dell'indicatore di navigazione (salta al target) ma non il tema scuro né il vetro, che non sono movimento.
- **`prefers-reduced-transparency`** sostituisce vetro con superficie piena (`--surface`, niente `backdrop-filter`) su sidebar e chrome di pagina.
- **`prefers-contrast: more`** sostituisce vetro con superficie piena a bordo definito, stesso trattamento del mockup.
- **Copy in italiano**, incluso `aria-label` del toggle tema.

## Verifica

`lib/spring.ts`/`lib/useSpring.ts`: la matematica della molla (tempo di assestamento, nessun overshoot con `damping=1`, interruzione senza salto) testabile come funzioni pure in vitest (`environment: "node"`), stesso pattern di `lib/bidInput.ts`. L'hook React stesso non è testabile in questo setup (nessun jsdom/`@testing-library`, per scelta del repo) — il piano dovrà isolare la logica di molla pura dal wiring `useRef`/`useState` così la parte testabile lo sia davvero.

Il comportamento visivo (vetro nei due temi, toggle, indicatore che scorre, scroll-edge mask, le tre media query di accessibilità) resta verifica manuale da browser a `npm run dev` — nessun tool browser disponibile ai subagent in questo processo; da eseguire dopo l'implementazione, come già fatto per l'inserimento veloce del costo.
