# ao-fanta

Gestionale locale per aste di fantacalcio. Next.js 15 + Prisma + SQLite.

## Requisiti

- Node.js 18+
- npm

## Setup

1. Installa le dipendenze:

   ```bash
   npm install
   ```

2. Crea il file `.env` copiando l'esempio:

   ```bash
   cp .env.example .env
   ```

3. Crea il database SQLite ed esegui le migration:

   ```bash
   npm run prisma:migrate
   ```

4. Avvia il server di sviluppo:

   ```bash
   npm run dev
   ```

5. Apri [http://localhost:3000](http://localhost:3000) — reindirizza a `/players`.

## Script disponibili

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Avvia il server di sviluppo |
| `npm run build` | Build di produzione |
| `npm run start` | Avvia il server di produzione (dopo `build`) |
| `npm run prisma:migrate` | Crea/applica migration Prisma sul DB locale |
| `npm run prisma:generate` | Rigenera il Prisma Client (serve dopo modifiche a `schema.prisma`) |

## Funzionalità

- **Squadre** (`/teams`) — crea/modifica/elimina squadre fantacalcio, crediti residui calcolati in automatico.
- **Giocatori** (`/players`) — elenco con filtri (nome, ruolo, squadra Serie A, svincolati, titolari, watchlist), assegnazione a squadra, aggiunta manuale.
- **Import** (`/players/import`) — carica un file CSV/Excel, mappa le colonne del listone ai campi (nome, ruolo, squadra), preview prima di confermare.
- **Watchlist** (`/watchlist`) — giocatori svincolati marcati da tenere d'occhio durante l'asta.

## Note

- Ruolo giocatore atteso nel file di import: `GK`, `DEF`, `MID`, `FWD` (case-insensitive). Se il listone reale usa i codici italiani (P/D/C/A) va adattato il mapping in `app/players/import/page.tsx`.
- Database SQLite locale (`dev.db`), pensato per uso singolo-utente in locale, non per deploy multi-utente.
