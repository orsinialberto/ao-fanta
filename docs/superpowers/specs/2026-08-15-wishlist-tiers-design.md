# Wishlist a tre liste (A/B/C) — Design Spec

Data: 2026-08-15

## Contesto

Oggi la wishlist è una lista sola: `Player.watchlist` è un booleano, la rotta `/watchlist` mostra i
soli svincolati marcati, e in tabella si marca con una stella toggle. Durante la preparazione all'asta
questo non basta: i giocatori marcati non sono tutti uguali. Alcuni sono obiettivi primari su cui si
spende, altri sono ripieghi di fascia media, altri sono scommesse da prendere a due crediti.

Servono tre liste con priorità esplicita:

- **A — Big**: i giocatori più importanti
- **B — Medi**: fascia intermedia
- **C — Low cost**: da prendere a poco

Un giocatore sta in **una sola** lista: la priorità è ordinale, non un insieme di etichette.

## Decisioni prese

| Domanda | Scelta |
|---|---|
| Appartenenza multipla? | No — un tier per giocatore, campo singolo |
| Layout della pagina | Tre sezioni impilate, una tabella per lista |
| Come si assegna dal listone | Tre pillole A/B/C in colonna, un click deterministico |
| Filtro nel toolbar | Multi-select A/B/C, come il filtro ruolo |
| Migrazione dei dati esistenti | Nessuna — il DB è di test, si azzera |
| Nome della rotta | Rinominata `/watchlist` → `/wishlist` |

## Modello dati

```prisma
model Player {
  // watchlist Boolean @default(false)   ← rimosso
  wishlistTier String?                   // null | "A" | "B" | "C"

  @@index([wishlistTier])
}
```

`String?` e non un enum: SQLite con Prisma non supporta gli enum, e il campo `role` segue già lo stesso
schema — stringa nel DB, validazione e tipi in `lib/roles.ts`. La migrazione droppa la colonna
`watchlist` senza portare i dati: i giocatori oggi marcati perdono la marcatura.

### `lib/wishlist.ts` (nuovo)

Gemello di `lib/roles.ts`, stesso vocabolario:

```ts
export const TIER_ORDER = ["A", "B", "C"] as const;
export type WishlistTier = (typeof TIER_ORDER)[number];

export const TIER_LABELS: Record<WishlistTier, string> = {
  A: "Big",
  B: "Medi",
  C: "Low cost",
};

export function isValidTier(value: string): value is WishlistTier;
export function parseTierParam(value?: string | null): WishlistTier[];
export function groupByTier<T extends { wishlistTier: string | null }>(
  players: T[]
): Record<WishlistTier, T[]>;
```

`groupByTier` è pura e restituisce sempre tutte e tre le chiavi, anche vuote: la pagina non deve
gestire il caso "chiave assente".

## Filtri

`lib/players.ts` — `PlayerFilters`:

```ts
// watchlistOnly?: boolean;   ← rimosso
wishlistTier?: string[];
```

```ts
if (filters.wishlistTier?.length) where.wishlistTier = { in: filters.wishlistTier };
```

`lib/filterParams.ts` — `PlayerFilterState.watchlistOnly` diventa `wishlistTier: WishlistTier[]`,
serializzato in CSV come `role` (`?wishlistTier=A,C`). Esce da `BOOLEAN_KEYS`; `writeFilterState` lo
scrive solo se non vuoto; `activeFilterCount` somma `wishlistTier.length`. Serve anche un
`toggleTier`, gemello di `toggleRole`.

`ListoneToolbar.tsx` — la checkbox "Wishlist" sparisce dal gruppo `BOOLEAN_LABELS` (restano
"Svincolati" e "Titolari"). Al suo posto un gruppo di tre chip A/B/C accanto ai chip ruolo, stesso
comportamento e stessa resa visiva. Nella riga dei filtri attivi i chip si etichettano "Wish A".
"Azzera tutto" resetta anche `wishlistTier`.

## Colonna in tabella

`PlayersTable.tsx` è già a ~250 righe: la cella tier va in un componente suo,
`app/players/WishlistTierCell.tsx`, che riceve il giocatore e una callback.

Comportamento: tre pillole A/B/C sempre visibili, quella attiva evidenziata. Click su una pillola
diversa cambia tier; click sulla pillola già attiva rimuove il giocatore dalla wishlist
(`wishlistTier: null`). Un click per ogni transizione, nessun ciclo da indovinare.

La chiamata resta la PATCH esistente:

```ts
fetch(`/api/players/${player.id}`, {
  method: "PATCH",
  body: JSON.stringify({ wishlistTier: nextTier }), // string | null
});
```

Ordinamento: la sort key `watchlist` diventa `wishlistTier`, con ordine A → B → C → nessun tier in
fondo (peso 1/2/3/4). L'header della colonna resta "Wish".

## API

`app/api/players/[id]/route.ts` — al posto di `if (body.watchlist !== undefined)`:

```ts
if (body.wishlistTier !== undefined) {
  if (body.wishlistTier !== null && !isValidTier(body.wishlistTier)) {
    return NextResponse.json({ error: "Invalid wishlist tier" }, { status: 400 });
  }
  data.wishlistTier = body.wishlistTier;
}
```

`app/api/players/route.ts` — il parametro di query `watchlistOnly` diventa
`wishlistTier` letto con `parseTierParam`.

## Pagina `/wishlist`

La cartella `app/watchlist/` viene rinominata `app/wishlist/` (con il suo `loading.tsx`), e la voce
in `app/components/Sidebar.tsx` punta alla nuova rotta. L'etichetta "Wishlist" è già quella giusta.

La pagina fetcha una volta sola i giocatori svincolati con un tier assegnato
(`getFilteredPlayers({ ...filters, wishlistTier: [...TIER_ORDER], freeAgentOnly: true })` — lo
spread perché `TIER_ORDER` è `readonly`), poi raggruppa
in memoria con `groupByTier` e renderizza tre blocchi:

```
Lista A — Big                    12 giocatori
[PlayersTable]

Lista B — Medi                   31 giocatori
[PlayersTable]

Lista C — Low cost                8 giocatori
[PlayersTable]
```

Una sezione vuota resta visibile con una riga "Nessun giocatore in questa lista": la struttura della
pagina non cambia forma a seconda dei dati. L'`EmptyState` interno alla tabella non va bene qui —
è pensato per "nessun risultato per questi filtri" e occuperebbe troppo spazio ripetuto tre volte.

Il `ListoneToolbar` in cima resta uno solo e filtra tutte e tre le sezioni (nome, ruolo, squadra
Serie A). I chip tier restano nascosti su questa rotta: le sezioni *sono* i tier, un filtro tier
sopra sarebbe un secondo modo di dire la stessa cosa. Il conteggio risultati del toolbar è il totale
delle tre liste.

`PlayersTable` viene renderizzata tre volte sulla stessa pagina: ogni istanza ha il suo stato di
ordinamento locale, il che è corretto — le liste si ordinano indipendentemente.

## Tipi

`lib/types.ts` — `PlayerWithTeam.watchlist: boolean` diventa `wishlistTier: string | null`.

## Test

Suite vitest già presente.

- `lib/filterParams.test.ts`: estendere i test esistenti con il round-trip di `wishlistTier`
  (parse da URL, serializzazione, conteggio filtri attivi, reset).
- `lib/wishlist.test.ts` (nuovo): `parseTierParam` scarta i valori non validi;
  `groupByTier` restituisce sempre tre chiavi e ignora i giocatori con tier `null`.

## Fuori scope

- Budget o conteggi per lista (quanti crediti pianificati per la lista A) — non richiesto.
- Riordino manuale dentro una lista.
- Assegnazione tier ai giocatori già acquistati: la wishlist resta una vista di soli svincolati.
