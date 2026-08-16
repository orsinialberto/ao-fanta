# Responsive "livello usabile" — design

**Data:** 2026-08-16
**Stato:** approvato

## Problema

Il sito è desktop-only per costruzione. Lo spec del design system
(`2026-08-15-design-system-refactor-design.md`) lo aveva deciso
esplicitamente: *"Solo desktop (nessun lavoro responsive/mobile)"*, e ha
elencato "Responsive e mobile" fra i non-obiettivi. **Questo spec revoca quel
vincolo.**

Oggi in tutto `app/` ci sono 11 prefissi breakpoint, e 7 dei quali stanno
dentro i componenti shadcn copiati (`ui/dialog.tsx`, `ui/select.tsx`). Il
codice applicativo è a zero.

Sotto i 768px il risultato è che:

1. `app/components/Sidebar.tsx:45` è larga 220px fisse e sta nel flusso del
   `flex` sul `<body>`. A 375px mangia il 59% dello schermo e non si può
   chiudere.
2. `app/layout.tsx:24` dà al `<main>` `px-12` (96px di padding orizzontale
   totale). Con la sidebar restano ~180px di contenuto.
3. Il `<main>` è un flex item senza `min-w-0`. Il suo `min-width: auto`
   implicito impedisce a `PlayersTable`'s `overflow-x-auto` di funzionare: la
   tabella allarga la pagina invece di scrollare dentro il suo contenitore.
4. `app/page.tsx:43` e `app/loading.tsx:8` fissano `grid-cols-[1fr_296px]`:
   il pannello crediti resta a 296px a qualsiasi larghezza.
5. `app/settings/LeagueRulesCard.tsx:51` fissa `grid-cols-4`: quattro input
   numerici affiancati sotto i 400px.
6. `app/players/ListoneToolbar.tsx:66` è una riga `flex` senza `flex-wrap`
   con dentro ricerca + 4 chip ruolo + 3 chip wishlist + select + 2
   checkbox.

## Obiettivo

Rendere il sito **usabile** da telefono, non ridisegnarlo. Usabile significa:
navigazione raggiungibile, niente scroll orizzontale della pagina, nessun
controllo tagliato fuori dallo schermo, form compilabili.

## Vincoli decisi

- **Nessuna nuova dipendenza.** Niente librerie di drawer, focus trap o
  test DOM.
- **Nessun test automatico nuovo.** L'ambiente vitest è `environment: "node"`
  senza jsdom né `@testing-library`; montarlo per un solo componente non
  vale il costo. La verifica è: `npx tsc --noEmit` + `npm test` (suite
  esistente, nessuna regressione) + controllo visivo a tre viewport.
- **Breakpoint di default Tailwind v4**, nessuno custom in `@theme`:
  `sm` 40rem/640px, `md` 48rem/768px, `lg` 64rem/1024px.
- **`md` è la soglia sidebar**: sopra resta la colonna fissa di oggi, sotto
  diventa drawer.
- **Mobile-first**: la classe nuda è lo stato mobile, il prefisso `md:`/`lg:`
  riporta il comportamento desktop attuale. Il desktop non deve cambiare di
  un pixel.
- **Regola arbitrary values** del design system: niente arbitrary value di
  dimensione testo, raggio o spacing nel codice applicativo. Le due eccezioni
  ammesse qui sono `w-[220px]` (già esistente, larghezza sidebar) e
  `w-[calc(100%-2rem)]` sul `DialogContent`, che esprime un gutter, non uno
  spacing da scala.
- **Copy UI in italiano**, come tutto il resto dell'app.

## Soluzione

### Sidebar → drawer

`Sidebar.tsx` resta un unico client component e possiede lo stato `open`.
Rende tre cose:

1. Una `<header>` fissa in alto, `md:hidden`, alta `h-14`, con hamburger +
   wordmark.
2. Un backdrop `fixed inset-0`, `md:hidden`, montato solo quando aperto.
3. L'`<aside>`, che passa da `fixed` fuori schermo a `md:sticky` nel flusso.

La barra e il backdrop sono `fixed`, quindi la struttura di `layout.tsx` non
cambia: nessun wrapper nuovo, solo classi. Il `<main>` compensa la barra con
`pt-20` (56px di barra + 24px di respiro) annullato da `md:pt-10`.

Chiusura del drawer: click sul backdrop, tasto `Escape`, bottone X dentro il
drawer, e cambio rotta (`useEffect` su `usePathname`). Mentre è aperto,
`document.body.style.overflow = "hidden"` impedisce alla pagina sotto di
scorrere.

Accessibilità senza librerie: da chiuso l'aside è `invisible`, che lo toglie
dall'ordine di tabulazione; `md:visible` lo riporta su desktop. L'hamburger
porta `aria-expanded` e `aria-controls`, l'aside l'`id` corrispondente.
Niente focus trap: è un menu di cinque link, non un dialog modale.

### Tabelle

Restano tabelle con scroll orizzontale — è la scelta esplicita del "livello
usabile". Diventano davvero scrollabili grazie a `min-w-0` sul `<main>`.
L'header `sticky top-0` diventa `sticky top-14 md:top-0` per non finire sotto
la barra mobile.

### Griglie

- Asta: `grid-cols-1` che diventa `lg:grid-cols-[1fr_296px]`. La soglia è
  `lg`, non `md`, perché a 768px restano ~452px di contenuto e togliendone
  296 per il pannello ne resterebbero 156. `TeamCreditsPanel` perde lo
  `sticky` sotto `lg`, dove è impilato in fondo.
- Regole lega: `grid-cols-2` che diventa `sm:grid-cols-4`.
- Squadre (`teams/page.tsx`) usa già `auto-fill minmax(260px,1fr)`: nessuna
  modifica.

### Toolbar listone

`flex-wrap` con `gap-x-4 gap-y-3`. Il campo di ricerca passa da `w-56` fisso
a `w-full sm:w-56`, così sotto 640px si prende la sua riga e i gruppi di chip
vanno a capo sotto.

### Dialog

`DialogContent` è `w-full max-w-lg` centrato con `fixed`: a 375px tocca
entrambi i bordi. Diventa `w-[calc(100%-2rem)] max-w-lg`, che dà 16px di
gutter per lato e non tocca il desktop (dove vince `max-w-lg`).

Il badge di scorciatoie `↑↓ · ⏎ assegna · esc` in `AstaSearch` diventa
`hidden md:inline-block`: su un telefono non c'è tastiera fisica e occupa
metà della barra di ricerca.

## Fuori scope

- `PlayersTable` come lista di card sotto `md` (è il "livello buono").
- `TeamCreditsPanel` collassabile.
- Dialog full-screen su mobile.
- `autoFocus` su `AstaSearch`, che su telefono apre la tastiera al caricamento
  della pagina.
- Dark mode, target touch da 44px, test DOM.

## Criteri di accettazione

A 375×667, 768×1024 e 1280×800, su tutte e cinque le rotte (`/`, `/players`,
`/teams`, `/wishlist`, `/settings`):

1. `document.documentElement.scrollWidth === window.innerWidth` — la pagina
   non scrolla orizzontalmente.
2. A 375px la navigazione è raggiungibile in un tap e si chiude in quattro
   modi (backdrop, Escape, X, cambio rotta).
3. Nessun controllo interattivo è tagliato o sovrapposto.
4. A 1280px il rendering è identico a prima del lavoro.
5. `npx tsc --noEmit` pulito e `npm test` verde.
