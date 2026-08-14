# UX Redesign — Design Spec

Data: 2026-08-14

## Contesto

App attuale (`app/players`, `app/teams`, `app/watchlist`) funziona ma non ha una IA pensata: `/` fa redirect a `/players`, nav è 4 link testuali in `app/layout.tsx`, filtri e ricerca sono nella stessa pagina, l'assegnazione durante asta live richiede più click di navigazione tra pagine.

Riferimento visivo fornito dall'utente: dashboard con sidebar, card gradient, font Manrope + JetBrains Mono. Mockup interattivo approvato: https://claude.ai/code/artifact/baf4742d-6472-472f-8198-e9b925bc5539

## Obiettivo

Ridisegnare IA e UX prima, poi stile. Priorità: il loop durante asta live (nome chiamato → cerca → assegna → vedi crediti aggiornati) deve stare su una pagina sola, senza navigazione.

## Rotte e navigazione

Sidebar verticale fissa (238px), sostituisce la nav orizzontale attuale. Due gruppi:

| Rotta | Sezione | Icona (lucide) | Note |
|---|---|---|---|
| `/` | **Asta** | `Gavel` | era redirect a `/players`, ora home reale |
| `/players` | **Listone** | `List` | ricerca+filtri rivisti |
| `/teams` | **Squadre** | `Users` | invariata, fuori scope |
| `/watchlist` | **Wishlist** | `Star` | invariata nei dati, UI coerente col resto |
| `/settings` | **Impostazioni** | `Settings` | nuova |
| `/settings/import` | — | — | ex `/players/import`, spostata |

Voce attiva: sfondo indigo tenue + icona piena. In fondo alla sidebar, card di stato asta (giocatori assegnati / totale + barra), sostituisce la "help card" del riferimento.

Nomenclatura UI: **Wishlist** ovunque (non "watchlist"). Il campo DB resta `watchlist` — nessuna migration solo per rinominare una label.

## `/` — Asta (home, pagina fusa ricerca+recap)

Non esiste una pagina "ricerca" separata: la home **è** il punto in cui si cerca e si assegna durante l'asta.

**Hero ricerca** — input largo, autofocus al mount. Digitando, dropdown live (pattern `Command`/combobox) con badge ruolo colorato, squadra Serie A, stato. `↑↓` naviga, `Enter` apre la dialog di assegnazione, `Esc` chiude. Zero risultati → riga "Aggiungi *{query}* al listone" che apre la stessa form di creazione giocatore usata in Impostazioni.

**Dialog assegna** — sostituisce `AssignModal` in `app/players/PlayersTable.tsx:264` (oggi un `<form>` con `inset-0`, senza focus trap, senza chiusura su Esc, senza chiusura su click esterno). Nuova versione: header con badge ruolo + nome, select squadra (mostra crediti residui per opzione), input costo, warning inline se si supera il budget residuo o il limite di ruolo, chiusura su Esc/click backdrop/bottone Annulla, focus trap.

**Recap crediti** — una card per squadra: nome, crediti residui/totale, barra di spesa, 4 pill ruolo (`P 1/3 D 3/8 C 2/8 A 1/6`) che segnalano visivamente il limite raggiunto.

**Pannelli inferiori** — due colonne: Wishlist (svincolati marcati, con bottone Assegna diretto) e Ultimi acquisti (raggruppati per giorno, richiede campo `assignedAt`, vedi sezione Dati).

## `/players` — Listone

Layout a due colonne: tabella (flex) + pannello filtri a destra, **collassabile** (toggle che lo riduce a rail di 52px con badge del numero di filtri attivi — mitiga la perdita di spazio per la tabella a 7 colonne).

Filtri riorganizzati rispetto a oggi (`app/players/PlayerFilters.tsx`):
- **Ruolo**: da select singola a **checkbox multipli** (chip P/D/C/A, colorati). Cambia la query in `lib/players.ts:17` da `where.role = filters.role` a `where.role = { in: [...] }`; l'URL passa da `?role=A` a `?role=A,C`.
- **Squadra Serie A**: invariata, select.
- **Stato**: Svincolati / Titolari / Wishlist, invariati come checkbox.
- Riga "filtri attivi" con chip rimovibili + "Azzera tutto" + conteggio risultati.

Search resta sopra la tabella (non nel pannello filtri). Cambio ruolo inline e le altre azioni per-riga (star wishlist, toggle titolare, assegna/svincola) restano in tabella — sono azioni per-giocatore, non configurazione, e già funzionano bene in `PlayersTable.tsx`.

## `/settings` — Impostazioni (nuova)

Quattro card:

1. **Listone** — link a `/settings/import` (ex `AddPlayerForm`/import flow) + `WipePlayersButton` (distruttivo, conferma esplicita).
2. **Squadre** — crea/elimina squadra (`TeamForm` mode create, `DeleteTeamButton`). `/teams` resta la vista di consultazione/modifica roster, non si tocca in questa fase.
3. **Giocatori** — form aggiungi singolo giocatore (oggi `AddPlayerForm` in `/players`). Resta **anche** raggiungibile dall'empty-state della ricerca in `/` — stesso componente, due punti di ingresso.
4. **Regole lega** — limiti per ruolo (oggi `ROLE_LIMITS` hardcoded in `lib/roles.ts:16`) e crediti di default squadra, editabili. Vedi sezione Dati per il costo di questa parte.

## Stile

- Tailwind (già installato, `theme.extend` oggi vuoto) resta il motore di stile. Aggiunta di token custom in `tailwind.config.ts` per replicare la palette del riferimento: `page`, `surface`, `border`, `ink`/`ink-dim`, `indigo` (accent), più `teal`/`coral`/`amber` come colori ruolo (P/A rispettivamente teal/coral, D indigo, C amber) — non semantici good/warn/danger, sono identità di ruolo.
- `shadcn/ui` per Dialog, Select, Command/combobox: componenti copiati nel repo (base Radix), accessibili out-of-the-box (focus trap, ARIA, tastiera), niente dipendenza runtime opaca.
- `lucide-react` per le icone della sidebar e delle azioni.
- `next/font/google` per Manrope + JetBrains Mono (self-hosted da Next, non `<link>` a Google Fonts — niente richiesta esterna, niente layout shift).

## Modifiche dati

```prisma
// Player — aggiunta
assignedAt DateTime?   // set al momento dell'assegnazione, azzerato allo svincolo

// nuovo model
model LeagueSettings {
  id             String @id @default("singleton")
  limitP         Int    @default(3)
  limitD         Int    @default(8)
  limitC         Int    @default(8)
  limitA         Int    @default(6)
  defaultCredits Int    @default(500)
}
```

`assignedAt` serve solo al pannello "Ultimi acquisti" in home — se il pannello viene ridimensionato o rimandato, questa migration si può tagliare senza impatto sul resto.

`LeagueSettings` rende `ROLE_LIMITS` configurabile: oggi è una costante sincrona importata direttamente in `app/teams/page.tsx`, `app/players/PlayersTable.tsx` (client component) e `lib/roles.ts`. Diventare dato-da-DB significa che i client component non possono più importarla direttamente — va fetchata server-side e passata come prop. È la parte più invasiva del redesign: tocca file che il resto del lavoro non toccherebbe. Resta nello scope perché l'utente l'ha richiesta esplicitamente, ma va implementata come modulo a parte, testabile in isolamento dal resto della UI.

## Fuori scope (rimandato)

- Redesign `/teams` (rimandato esplicitamente dall'utente)
- Dark mode nell'app reale (il mockup lo dimostra come proof-of-concept, ma l'app oggi non ha theming — decisione se portarlo in produzione rimandata)
- Responsive/mobile
- Autenticazione

## Riferimenti

- Mockup interattivo approvato: https://claude.ai/code/artifact/baf4742d-6472-472f-8198-e9b925bc5539 (file sorgente: scratchpad sessione, non nel repo)
- Codice attuale: `app/layout.tsx`, `app/players/*`, `app/teams/*`, `app/watchlist/page.tsx`, `lib/roles.ts`, `lib/players.ts`, `lib/teams.ts`
