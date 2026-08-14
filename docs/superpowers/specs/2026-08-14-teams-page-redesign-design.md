# Redesign pagina Squadre

## Contesto

La pagina `/teams` usa markup Tailwind non allineato al resto dell'app (già ridisegnata: homepage, listone, impostazioni). Layout attuale: una sezione full-width per squadra, elenco giocatori in righe verticali, azioni "Modifica" e "Svincola tutto" per squadra dentro la pagina stessa.

## Obiettivo

1. Allineare visivamente `/teams` al design system già in uso (`rounded-2xl border-border bg-surface shadow-sm`, pill ruoli `ROLE_PILL_BG`, font mono per numeri).
2. Passare da layout a righe (una squadra = una sezione larga) a layout a colonne: griglia fissa 4 colonne x 2 righe (8 squadre, numero fisso di lega).
3. Rimuovere dalla pagina Squadre le azioni di configurazione "Modifica" (rinomina/allenatore/crediti) e "Svincola tutto", spostandole in Impostazioni.
4. Sostituire la riga "Residui: 300" con formato `residui / totale` (stile homepage), eliminando la riga "Spesi: X/Y" separata.

## Design

### 1. Squadre page (`app/teams/page.tsx` + nuovo `app/teams/TeamCard.tsx`)

- Contenitore: `grid grid-cols-4 gap-4`. 8 squadre → esattamente 2 righe piene. Il numero di squadre di lega è fisso a 8; non serve gestione wrap per conteggi diversi.
- Nessun bottone a livello pagina (via `<h1>` + eventuali azioni globali).
- **TeamCard** (una per squadra), stile coerente con le card homepage (`rounded-2xl border border-border bg-surface p-[18px] shadow-sm`):
  - Header: nome squadra (bold, `text-[14.5px] font-extrabold`) + allenatore (`text-xs text-ink-dim`). Nessun bottone.
  - Riga crediti: `{remainingCredits} / {totalCredits}`, stesso pattern homepage (`font-mono font-bold tabular-nums` per residui, `text-ink-dim` per `/ totale`). Sostituisce sia "Spesi: X/Y" che "Residui: Z".
  - Riga ruoli: 4 pill compatte P/D/C/A con conteggio/limite (`ROLE_PILL_BG`, stesso stile della tabella "Crediti squadre" in homepage).
  - Lista giocatori: raggruppata per ruolo (`ROLE_ORDER`), righe compatte — nome, squadra Serie A, costo, bottone `ReleasePlayerButton` (svincolo singolo, invariato). Lista sempre visibile per intero (non collassabile), la card cresce in altezza in base alla rosa.
  - Stato vuoto: "Nessun giocatore assegnato." se rosa vuota (comportamento invariato).

### 2. Settings TeamsCard (`app/settings/TeamsCard.tsx`)

Riga squadra passa da (nome, crediti, elimina) a (nome, crediti, **Modifica**, **Svincola tutto**, Elimina):

- **Modifica**: istanzia `TeamForm mode="edit" team={t}` (già supporta rinomina/allenatore/crediti via `PATCH /api/teams/:id`, nessuna modifica di logica).
- **Svincola tutto**: istanzia `ReleaseAllButton teamId={t.id} teamName={t.name} isDisabled={t.players.length === 0}` (nessuna modifica di logica, stessa API `POST /api/teams/:id/release-all`).
- **Elimina**: invariato (`DeleteTeamButton`).

`TeamForm` e `ReleaseAllButton` vengono ristilizzati per usare i token del design system (`indigo`/`coral`/`surface-2`/bordi coerenti) invece delle classi Tailwind generiche attuali (`bg-blue-600`, `border-orange-300`), dato che ora vivono nella pagina Impostazioni già ridisegnata.

### 3. File toccati

- `app/teams/page.tsx` — riscritto: griglia 4 colonne, usa `TeamCard`.
- `app/teams/TeamCard.tsx` — nuovo componente, singola card squadra.
- `app/settings/TeamsCard.tsx` — aggiunge `TeamForm mode="edit"` e `ReleaseAllButton` per riga.
- `app/teams/TeamForm.tsx`, `app/teams/ReleaseAllButton.tsx` — solo restyling classi Tailwind, nessuna modifica di logica/props.

### Non in scope

- Nessuna modifica alle API route (`/api/teams/*`, `/api/players/:id`).
- Nessuna modifica allo svincolo singolo giocatore (resta in Squadre, invariato).
- Nessuna gestione di conteggio squadre diverso da 8 (lega fissa a 8 squadre).

## Testing

Nessuna logica di business cambia (stesse API, stessi dati). Verifica manuale in browser:
- Griglia 4x2 corretta con 8 squadre in `/teams`.
- Riga crediti mostra `residui / totale`, non più "Residui: 300" né riga "Spesi" separata.
- "Modifica" e "Svincola tutto" funzionano da Impostazioni → Squadre.
- Svincolo giocatore singolo continua a funzionare da dentro la card in `/teams`.
