# Gestione giocatori/squadre: svincoli, ruolo, filtri, ordinamento, wipe

## Contesto

App fantacalcio (Next.js + Prisma + SQLite). Pagine esistenti: `/teams` (rose squadre,
elenco read-only) e `/players` (tabella filtrabile, assegna/svincola/watchlist/titolare).
Sei richieste correlate per completare la gestione di giocatori e rose.

## 1. Svincola giocatore singolo dalla pagina squadra

- Nuovo client component `app/teams/ReleasePlayerButton.tsx`, stesso pattern di
  `DeleteTeamButton.tsx`.
- Bottone "Svincola" per riga giocatore in `app/teams/page.tsx`.
- `confirm()` → `PATCH /api/players/[id]` con `{ fantasyTeamId: null }` (endpoint già
  esistente, azzera anche `cost` lato server) → `router.refresh()`.

## 2. Svincola tutti i giocatori di una squadra

- Nuovo endpoint `POST /api/teams/[id]/release-all/route.ts`:
  `prisma.player.updateMany({ where: { fantasyTeamId: id }, data: { fantasyTeamId: null, cost: null } })`.
- Nuovo client component `app/teams/ReleaseAllButton.tsx`, accanto al bottone "Elimina"
  in ogni sezione squadra. Disabled se `team.players.length === 0`. `confirm()` prima
  della chiamata, poi `router.refresh()`.

## 3. Filtro squadra Serie A come dropdown dinamico

- Nuova funzione in `lib/teams.ts`: `getDistinctSerieATeams()` →
  `prisma.player.findMany({ distinct: ["serieATeam"], select: { serieATeam: true }, orderBy: { serieATeam: "asc" } })`,
  mappata a `string[]`.
- `app/players/page.tsx` la calcola (in parallelo a `getFilteredPlayers`/`getTeamsWithRoster`)
  e la passa come prop `serieATeams` a `PlayerFilters`.
- `PlayerFilters.tsx`: l'`<input>` testo per `serieATeam` diventa `<select>` con opzione
  "Tutte le squadre" + le squadre della prop, stesso pattern del filtro ruolo esistente.
  Rimossi lo stato locale `serieATeam` e il relativo debounce (non serve più: select
  aggiorna l'URL subito, come il filtro ruolo).

## 4. Cambio ruolo giocatore

- In `PlayersTable.tsx`, cella "Ruolo" diventa `<select>` inline (stesso pattern di
  `toggleStarter`/`toggleWatchlist`), opzioni da `ROLE_ORDER`.
- `onChange` → `PATCH /api/players/[id]` con `{ role: nuovoRuolo }` → `router.refresh()`.
  In caso di errore (limite ruolo), `alert(await errorMessage(res))`, nessun refresh
  (il valore torna a quello del server al prossimo render).
- **Route handler** (`app/api/players/[id]/route.ts`): il controllo limite-ruolo esiste
  oggi solo dentro il branch `body.fantasyTeamId !== undefined`. Va esteso perché scatti
  anche quando cambia solo `role` su un giocatore già assegnato a una squadra:
  - Se `body.role !== undefined` ed `body.fantasyTeamId === undefined` (cambio ruolo puro):
    leggere il player corrente (`fantasyTeamId`), e se non null, contare i giocatori dello
    stesso `fantasyTeamId` con il nuovo ruolo (escludendo l'id corrente) e confrontare con
    `ROLE_LIMITS`; se pieno, 400 con lo stesso messaggio già usato per l'assegnazione.
  - Nessun cambiamento al comportamento quando `fantasyTeamId` è presente nel body (già
    gestito).

## 5. Svuota database giocatori

- Nuovo `DELETE` in `app/api/players/route.ts`: `prisma.player.deleteMany({})`. Cancella
  tutti i giocatori, comprese le assegnazioni a squadre (le rose si svuotano di
  conseguenza, i `Team` restano).
- Nuovo client component `app/players/WipePlayersButton.tsx` in `app/players/page.tsx`
  accanto a "Import"/"Aggiungi giocatore". Azione distruttiva e irreversibile: conferma
  testuale che richiede di digitare `ELIMINA` in un prompt (`prompt()`) prima di procedere,
  non un semplice `confirm()`. Poi `DELETE /api/players` → `router.refresh()`.

## 6. Ordinamento colonne tabella giocatori

- `PlayersTable.tsx` diventa stateful: `useState<{ key: SortKey; dir: "asc" | "desc" } | null>`.
- Header di ogni colonna ordinabile (Nome, Ruolo, Squadra Serie A, Titolare, Stato/Squadra
  fantacalcio, Costo, Watchlist) diventa cliccabile, con indicatore ▲/▼ sulla colonna
  attiva. Click su stessa colonna inverte direzione; click su colonna diversa resetta a
  `asc`.
- Sort client-side con `useMemo` sull'array `players` ricevuto via props (dataset piccolo,
  ~600 righe, coerente con il post-filtro accent-insensitive già fatto in JS in
  `lib/players.ts`). Nessuna modifica a `getFilteredPlayers` o a query param URL — stato
  di ordinamento non sopravvive a refresh pagina (comportamento accettato).
- Colonna "Stato" ordina per nome squadra fantacalcio (stringa vuota/"Svincolato" per i
  liberi, in modo che finiscano insieme in un capo dell'ordinamento).

## Fuori scope

- Persistenza dell'ordinamento in URL/localStorage.
- Filtro squadra Serie A multi-select.
- Undo per svincola-tutti / wipe database.
