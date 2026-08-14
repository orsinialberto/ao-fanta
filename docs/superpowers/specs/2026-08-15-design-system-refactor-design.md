# Design System Refactor — Design Spec

Data: 2026-08-15

Mockup approvato: https://claude.ai/code/artifact/dff2205a-5614-4c43-99d7-1228a968733d

## Contesto

Il redesign UX del 2026-08-14 (`2026-08-14-ux-redesign-design.md`) ha risolto l'architettura
dell'informazione: cinque rotte, sidebar, l'asta come home. Quella parte funziona e non si tocca.

Quello che manca è un **sistema visivo**. Oggi il codice contiene sei valori di raggio diversi, circa
nove dimensioni di testo tutte in arbitrary values Tailwind, `font-extrabold` su quasi ogni elemento, e
nessuna transizione. Il token `--radius: 1rem` è definito in `globals.css` e non usato da nessun
componente. Il risultato non è che l'app sia brutta: è che ogni componente nuovo inventa valori nuovi,
e non esiste gerarchia visiva perché tutto ha lo stesso peso.

## Direzione

**Editorial minimal.** Fondo carta appena caldo, molto whitespace, tipografia contrastata, un solo
accento, hairline al posto delle ombre.

**Doppia densità.** `/` (Asta) è una superficie operativa: durante l'asta il loop è "nome chiamato →
cerca → assegna → controlla crediti" in pochi secondi, quindi densa e con tutto sopra la piega. Le altre
quattro rotte restano ariose. Stessi token, densità diversa per contesto.

**Vincoli decisi.** Solo desktop (nessun lavoro responsive/mobile). Nessun dark mode. Nessuna nuova
dipendenza runtime — la motion si fa in CSS puro. L'IA resta invariata: stesse rotte, stessa sidebar,
stessi dati per pagina. Libertà di riorganizzare i layout **interni** alle pagine.

## Diagnosi

| # | Problema | Dove |
|---|---|---|
| 1 | Nessuna scala tipografica — `text-[22px]`, `text-[13.5px]`, `text-[11.5px]`, `text-[10.5px]`, `text-[12.5px]` | ovunque |
| 2 | `font-extrabold` su tutto → zero gerarchia | `page.tsx`, `TeamCard`, `PlayersTable` |
| 3 | Sei raggi diversi, `--radius` definito ma ignorato | `rounded-2xl`, `[20px]`, `[14px]`, `[13px]`, `[11px]`, `rounded-lg` |
| 4 | Spacing arbitrario | `layout.tsx:26`, tutte le card |
| 5 | Zero motion — nessuna `transition` nel progetto | tutto |
| 6 | `alert()` per gli errori | `PlayersTable.tsx:110,124` |
| 7 | Griglie a colonne fisse | `teams/page.tsx:24`, `page.tsx:105` |
| 8 | Coral significa sia "ruolo Attaccante" sia "azione distruttiva" | `roleStyles.ts` vs `PlayersTable.tsx:213` |
| 9 | Ruolo: `RoleBadge` colorato altrove, lettera nuda in tabella | `PlayersTable.tsx:180` |
| 10 | Wishlist: griglia 2×2 dentro griglia 2×2 → colonne ~110px, nomi troncati | `WishlistPanel.tsx:31` |
| 11 | Crediti squadra in fondo a destra: il dato più importante è il meno visibile | `TeamCard.tsx:66` |
| 12 | Nessuno skeleton, nessun empty state progettato | nessun `loading.tsx` |
| 13 | Gradient peach solo nella card sidebar: unico gradient dell'app | `Sidebar.tsx:53` |

## Token

Definiti in un blocco `@theme` dentro `app/globals.css` (Tailwind v4). Sostituiscono sia i token HSL
attuali sia `theme.extend` di `tailwind.config.ts`.

### Colore

```
--paper        #FBFBFA   fondo pagina
--surface      #FFFFFF   card, dialog
--surface-sunk #F4F4F2   input, hover di riga
--ink          #16161A   testo primario
--ink-2        #5C5C66   secondario
--ink-3        #9A9AA3   label, meta
--line         #E6E6E2   hairline
--line-strong  #D4D4CE   bordi attivi
--accent       #3B3A8F   unico accento
--accent-bg    #EAE9F5
--danger       #B3261E   solo in hover sulle azioni distruttive
```

Ruoli, desaturati per stare sulla carta calda:

| Ruolo | Solido | Soft |
|---|---|---|
| P Portieri | `#0F7B62` | `#E7F2EE` |
| D Difensori | `#3D4EAC` | `#EAECF7` |
| C Centrocampisti | `#A66A11` | `#F7EFE2` |
| A Attaccanti | `#C2452D` | `#F9EAE6` |

**Fix del problema 8:** "Svincola" perde il coral. Diventa un ghost in `--ink-3` che vira su `--danger`
solo in hover. Il coral resta esclusivamente il colore degli attaccanti.

### Tipografia

Manrope va ricaricato includendo il peso **400** (`lib/fonts.ts:5` oggi parte da 500 — è la causa
diretta del problema 2).

| Gradino | Specifica | Uso |
|---|---|---|
| `display` | 32 / 700 / −.02em / lh 1.15 | titoli pagina |
| `h2` | 20 / 650 / −.01em | titoli sezione |
| `h3` | 15 / 600 | titoli card |
| `body` | 14 / 400 / lh 1.55 | testo |
| `small` | 13 / 400 | meta |
| `label` | 11 / 600 / uppercase / .08em | intestazioni colonna |

Densità Asta: stessi gradini, `body`→13 e `small`→12, righe da 32px.

Numeri: JetBrains Mono **500** con `tabular-nums`. Oggi è 700 ovunque, più pesante dei nomi che
accompagna.

### Forma

Raggi, quattro gradini: `sm 6px` (badge, chip) · `md 10px` (input, bottoni) · `lg 14px` (card) ·
`xl 20px` (dialog).

Spazio, base 4: `4 8 12 16 24 32 48 64`.

Elevazione: **nessuna ombra sulle card**, solo hairline da 1px. L'ombra resta su dialog e dropdown,
gli unici elementi che galleggiano davvero.

### Motion

CSS puro, nessuna dipendenza. `--ease: cubic-bezier(.2,0,0,1)`, `--dur-fast: 120ms`, `--dur: 180ms`.
Hover con transizione su background e colore; dropdown con `@keyframes` fade + slide 4px; dialog via
gli attributi `data-state` di Radix; barre crediti con `transition: width 400ms`.
`prefers-reduced-motion` va rispettato con la regola globale che azzera durate.

## Layout per pagina

### Shell (`app/layout.tsx`)

Sidebar 238→220px, su `--paper` invece che su `--surface` (oggi è bianca e compete col contenuto),
separata da un hairline verticale. Contenuto `px-48 pt-40`, `max-w 1240`.

Nuovo componente condiviso **PageHeader**: titolo `display`, sottotitolo `body/ink-2`, hairline sotto.
Oggi ogni pagina ripete a mano `<h1 className="text-[22px] font-extrabold">` dentro un `<div>` vuoto.

Card "Stato asta" nella sidebar: via il gradient peach (problema 13), diventa label + barra 3px +
numeri mono, senza box.

### `/` Asta

Griglia `1fr / 296px`, colonna destra **sticky**.

- Sinistra: ricerca hero, risultati **inline** (la card si espande) invece che in overlay, poi Wishlist
  e Ultimi acquisti.
- Destra sticky: crediti squadre, sempre visibili mentre si cerca. È il fix centrale — oggi si cerca in
  cima e i crediti stanno sotto la piega.
- Riga squadra: nome, crediti mono, barra di spesa 2px, quattro pill di ruolo.
- **Pill di ruolo al limite**: quando `roleCounts[r] >= roleLimits[r]` la pill passa da tinta soft a
  colore pieno. Segnale passivo, nessun testo aggiuntivo.
- Wishlist a **colonna singola** (fix problema 10).

### `/players` Listone

`PlayerSearchBar` e `FilterPanel` — oggi due card impilate che occupano ~140px prima della tabella —
si fondono in un unico componente **ListoneToolbar** alto 44px: ricerca, chip P/D/C/A, select squadra
Serie A, toggle di stato, conteggio risultati. I chip dei filtri attivi restano, ma su una seconda riga
che compare solo quando ce ne sono.

Tabella: header sticky, righe da 44px, solo hairline orizzontali (via il bordo esterno arrotondato).
Colonna Ruolo usa `RoleBadge` (fix problema 9). Le azioni Assegna/Svincola compaiono in **row-hover**.

### `/teams` Squadre

`grid-cols-4` → `repeat(auto-fill, minmax(260px, 1fr))` (fix problema 7).

Nella card i crediti risalgono sotto il nome, in corpo 21 mono con barra di spesa (fix problema 11).
Il bottone di rilascio compare in hover sulla riga del giocatore.

### `/watchlist` Wishlist

Riusa `ListoneToolbar` e la tabella del Listone. Nessun layout proprio.

### `/settings` Impostazioni

Da griglia 2×2 di card con icona a **sezioni impilate** larghe max 640px: titolo, hairline, contenuto.
Le impostazioni sono un documento, non una dashboard. `WipePlayersButton` isolato in una zona
distruttiva in fondo.

## Componenti condivisi nuovi

- **PageHeader** — titolo + sottotitolo + hairline, usato dalle cinque pagine.
- **ListoneToolbar** — fusione di `PlayerSearchBar` e `FilterPanel`, usata da `/players` e `/watchlist`.
- **EmptyState** — icona leggera + frase + azione. Oggi gli stati vuoti sono solo testo grigio.
- **InlineError** — banner di errore dentro form e dialog. Elimina i due `alert()` (fix problema 6).
- **loading.tsx** per rotta, con skeleton costruiti su hairline.

## Stack

Migrazione a **Tailwind v4**, configurazione CSS-first: palette, scala tipografica, raggi e spacing
vivono in `@theme` dentro `globals.css`. `tailwind.config.ts` viene eliminato.

Rimozione di `@base-ui/react` da `package.json`: duplica Radix, che è già la libreria usata da
`app/components/ui/dialog.tsx` e `select.tsx`.

Nessun'altra dipendenza aggiunta o rimossa.

## Fuori scope

Dark mode. Responsive e mobile. Ottimistic UI e libreria di toast. Modifiche allo schema Prisma.
Modifiche alle rotte o a quale contenuto sta su quale pagina.

## Criteri di completamento

- Nessun arbitrary value di dimensione testo, raggio o spacing resta nel codice applicativo: tutti i
  valori vengono dai token `@theme`.
- I tredici problemi elencati in Diagnosi sono chiusi.
- `npm run build` passa e `npm run test` passa.
- Le cinque rotte rese a schermo corrispondono ai mockup approvati.
