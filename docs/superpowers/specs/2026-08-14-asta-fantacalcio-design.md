# Asta Fantacalcio — Design

Data: 2026-08-14
Stato: approvato

## Obiettivo

App web per gestire l'asta del fantacalcio: catalogo giocatori Serie A, squadre
di lega, assegnazione giocatori a squadre durante l'asta con tracking crediti,
ricerca/filtri, riepilogo rose, watchlist personale.

Uso: singolo utente, locale, durante la sessione d'asta. Nessuna autenticazione,
nessun accesso multi-dispositivo richiesto.

## Stack tecnico

- **Next.js** (App Router) — full-stack, no backend separato
- **SQLite** locale, via **Prisma** ORM (schema come source of truth, migrations incluse)
- **API routes** (Next.js Route Handlers) per CRUD, import, query di riepilogo
- **Server Components** per pagine data-heavy (liste, riepiloghi), **Client Components**
  per parti interattive (filtri, form, modale acquisto)
- **Tailwind** per styling — tool interno, no design system dedicato
- Import CSV/Excel: parsing lato server, upsert massivo dei giocatori

Nessuna autenticazione. Nessun test automatico previsto (tool interno, uso singolo,
verifica manuale prima di ogni sessione d'asta).

### Struttura file (indicativa)

```
prisma/schema.prisma
app/
  players/          -> ricerca + filtri + browse + aggiunta manuale
  players/import/   -> upload CSV/Excel
  teams/             -> riepilogo squadre (rosa + costi + crediti)
  watchlist/         -> giocatori da acquistare
  api/players/...
  api/teams/...
  api/import/...
```

## Data model

### Player

| Colonna           | Tipo                        | Note                                              |
|--------------------|------------------------------|----------------------------------------------------|
| `id`               | uuid, PK                    |                                                      |
| `name`              | string                       | nome + cognome                                      |
| `role`              | enum: GK, DEF, MID, FWD      | sistema Classic                                     |
| `serie_a_team`      | string                       |                                                      |
| `fantasy_team_id`   | uuid, FK → Team, nullable    | null = svincolato (derivato, no colonna separata)   |
| `cost`              | int, nullable                | prezzo pagato in asta; valorizzato solo all'assegnazione |
| `starter`           | boolean                      | titolare nella squadra di Serie A                   |
| `watchlist`         | boolean                      | flag "da acquistare", personale                     |

Nessuna colonna "svincolato": lo stato di svincolo è derivato da `fantasy_team_id IS NULL`.

Nessuna colonna "quotazione base" separata: `cost` rappresenta solo il prezzo
realmente pagato in asta.

### Team

| Colonna            | Tipo    | Note                                             |
|---------------------|---------|----------------------------------------------------|
| `id`                | uuid, PK |                                                    |
| `name`               | string  | nome squadra                                       |
| `coach`              | string  | allenatore                                         |
| `total_credits`      | int     | crediti totali assegnati                           |
| `remaining_credits`  | —       | **calcolato**, non colonna: `total_credits - SUM(cost dei player assegnati)` |

Relazione: 1 Team → N Player.

## Pagine & funzionalità

### `/players` — Browse, ricerca, filtri, aggiunta

- Tabella: nome, ruolo, squadra Serie A, stato (svincolato / assegnato a X),
  costo, titolare
- Filtri: ruolo, squadra Serie A, solo svincolati, titolare, watchlist,
  ricerca testuale per nome
- Azione riga: "Assegna a squadra" → modale (scelta team, inserimento costo
  pagato) → imposta `fantasy_team_id` + `cost`. Se costo > crediti residui
  della squadra → warning visivo, non blocco hard (le aste reali a volte sforano)
- Azione riga: toggle watchlist
- Bottone "Aggiungi giocatore" → form manuale (name, role, serie_a_team,
  starter) — copre i casi in cui il listone importato è incompleto. Nessuna
  distinzione nel model tra giocatore importato o creato a mano

### `/players/import` — Import CSV/Excel

- Upload file listone (formato da definire sulla base di un file di esempio
  che l'utente fornirà — struttura column mapping da adattare di conseguenza)
- Mapping colonne (name, role, serie_a_team), preview, conferma import
- Upsert per nome, per evitare duplicati su re-import
- Righe malformate (ruolo non valido, campi mancanti) → skip + report finale
  ("N righe importate, M scartate con motivo")

**Nota**: il formato esatto del file e il mapping colonne verranno definiti/
adattati quando l'utente fornirà un file Excel di esempio reale.

### `/teams` — Riepilogo squadre

- Una sezione per team: coach, crediti totali, crediti residui (calcolato),
  rosa completa con costo individuale di ogni giocatore, raggruppata per ruolo
- CRUD squadre (nome/coach/crediti totali) integrato in questa pagina
  (add/edit team)
- Cancellazione team con giocatori assegnati → bloccata, serve prima
  svincolare i giocatori

### `/watchlist` — Giocatori da acquistare

- Giocatori con `watchlist = true` e ancora svincolati
- Stessa tabella di `/players`, azione di assegnazione rapida disponibile
  anche qui

## Validazione

- Form: nome obbligatorio, ruolo tra i valori enum, costo ≥ 0 — validazione
  lato client + server
- Import: righe malformate scartate con report, non bloccano l'intero import
- Assegnazione con costo eccedente crediti residui: warning, non blocco

## Fuori scope

- Autenticazione / multi-utente
- Accesso multi-dispositivo in tempo reale
- Test automatici
- Colonna "quotazione base" separata dal costo pagato
