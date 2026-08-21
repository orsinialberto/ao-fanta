# Tema serale — design

**Data:** 2026-08-21
**Stato:** approvato

## Problema

L'asta si fa di sera, per due o tre ore, spesso con le luci basse. Il tema
chiaro in quelle condizioni è una lampada puntata addosso. L'app oggi ha un
tema solo e nessuno strato di theming: `app/globals.css` definisce i token in
un unico blocco `@theme` e non esiste alcun modo di sostituirli.

Misurando i token per aggiungere il tema scuro sono emersi due difetti nel
tema chiaro attuale, entrambi indipendenti dalla temperatura del colore.

### Difetto 1 — niente galleggia

Il sistema stabilisce che le card usano un filo di bordo, mai un'ombra
(`app/globals.css:70`). Senza ombra la profondità la deve fare il salto di
luminanza fra fondo e superficie. Oggi quel salto è:

```
--color-surface #ffffff  vs  --color-paper #fafbff  →  1.03
```

Un rapporto di 1.0 significa "identici". Tabella, card e pagina sono lo stesso
foglio piatto, e il bordo hairline regge da solo un lavoro che non è suo.

### Difetto 2 — l'accento e il ruolo D sono lo stesso colore

```
--color-accent  #3b3a8f   OKLCH H = 279°
--color-role-d  #3f4fb5   OKLCH H = 272°
                          distanza:      7°
```

Sette gradi di tinta non sono distinguibili a occhio. Nel listone il badge D e
la pill della squadra assegnataria finiscono sulla stessa riga
(`app/players/PlayersTable.tsx`), e sono due codifiche semantiche diverse rese
con lo stesso blu-viola.

## Obiettivo

1. Un tema scuro «Grafite» attivabile a mano, con default sul sistema.
2. Riparare i due difetti del tema chiaro nello stesso giro, perché i token
   vengono riscritti comunque.
3. Nessuna regressione: tipografia, spaziature, raggi e la regola
   "hairline, mai ombra" restano intatte. Fondo tinta unita in entrambi i temi.

## Vincolo verificato

Tailwind v4 emette `var(--color-*)` nelle utility, non i valori inlinati.
Verificato sul CSS buildato (`.next/static/css/app/layout.css:1105`):

```css
.bg-paper { background-color: var(--color-paper); }
```

Quindi ridefinire le variabili in un blocco `[data-theme="dark"]` cambia ogni
utility che le usa, senza toccare le classi nei componenti. È questo che rende
il tema scuro fattibile senza riscrivere il markup.

Unica eccezione nota: i modificatori di opacità emettono un fallback con
l'esadecimale inlinato prima del ramo `@supports` con la variabile. Il ramo
`@supports` vince su qualunque browser moderno, ma la semantica di `bg-ink/40`
resta comunque sbagliata su fondo scuro (vedi `--color-scrim`).

## Soluzione

### Struttura della cascata

Tre blocchi, in questo ordine:

```css
@theme { /* chiaro: unica sorgente delle utility Tailwind */ }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* scuro di sistema */ }
}

:root[data-theme="dark"] { /* scuro scelto a mano */ }
```

Il `:not([data-theme="light"])` serve perché la scelta esplicita deve battere
l'OS **in entrambe le direzioni**: chiaro scelto a mano su macOS in dark mode,
e scuro scelto a mano su macOS in light mode.

Nessun colore viene definito solo dentro il blocco media o solo dentro
`[data-theme]`: ogni token esiste in `@theme` e viene al massimo ridefinito.

### Token nuovi

Il tema scuro non può riusare il bianco fisso: ci sono 21 occorrenze di
`text-white` in 16 file, e su fondo scuro il bianco sopra un badge verde acqua
fa 2.23 di contrasto — illeggibile.

| Token | Chiaro | Scuro | Sostituisce |
|---|---|---|---|
| `--color-on-accent` | `#ffffff` | `#101216` | `text-white` sui bottoni accento |
| `--color-on-role` | `#ffffff` | `#101216` | `text-white` su badge e pill ruolo |
| `--color-on-danger` | `#ffffff` | `#101216` | `text-white` sui bottoni pericolo |
| `--color-scrim` | `rgb(22 22 31 / 0.40)` | `rgb(0 0 0 / 0.62)` | `bg-ink/40` in `Sidebar.tsx:103` |
| `--color-scrim-strong` | `rgb(16 17 25 / 0.44)` | `rgb(0 0 0 / 0.70)` | `bg-[rgba(16,17,25,0.44)]` in `ui/dialog.tsx:24` |

Un censimento completo delle utility a valore arbitrario
(`grep -rnoE "(bg\|text\|border\|ring\|fill\|stroke)-\[[^]]+\]" app lib`)
conferma che la tendina dei dialog è l'**unico** colore scritto a mano fuori
dai token: tutti gli altri risultati sono dimensioni tipografiche.

Tre token distinti e non uno solo perché conflaterebbero significati diversi:
se un giorno servisse un accento chiaro con testo scuro mantenendo il bianco
sui badge ruolo, un token unico bloccherebbe la scelta.

`--shadow-overlay` ha una variante scura più profonda: su fondo grafite
un'ombra al 6% è invisibile.

### Palette chiara — «Ghiaccio profondo»

La tinta lilla resta identica. Cambiano la profondità e il ruolo D.

| Token | Da | A | Perché |
|---|---|---|---|
| `--color-paper` | `#fafbff` | `#eaecf6` | profondità 1.03 → 1.18 |
| `--color-surface-sunk` | `#f2f3fa` | `#eff1f9` | resta incassato rispetto a `surface` |
| `--color-line` | `#e4e5f0` | `#dcdfef` | deve leggersi su entrambi i fondi |
| `--color-line-strong` | `#d2d4e4` | `#c8cce2` | idem |
| `--color-ink-2` | `#5a5a6b` | `#52526b` | il fondo più scuro toglie contrasto |
| `--color-ink-3` | `#9797a8` | `#8a8a9e` | idem |
| `--color-accent-bg` | `#eae9f8` | `#e2e2f4` | deve restare distinguibile da `paper` |
| `--color-role-d` | `#3f4fb5` | `#0d6f9e` | difetto 2 |
| `--color-role-d-soft` | `#e9ecf9` | `#e4eef4` | segue il ruolo D |

Tutti gli altri token restano quelli in produzione, prugna del ruolo C incluso.

**Scelta del nuovo D.** Sono state misurate tre strade, tutte in OKLCH:

- spostare D verso un blu più puro → arriva al massimo a 16–21° dall'accento,
  insufficiente;
- spostare l'accento verso il viola profondo → finisce a 9° dal prugna del
  ruolo C, peggio di prima;
- spostare D verso l'azzurro acciaio → **41° dall'accento**.

Con `#0d6f9e` la distanza minima fra le cinque tinte codificanti passa da 7°
(accento/D) a 31° (accento/C), 4,4 volte meglio. La coppia più stretta diventa
accento e prugna, che sono già oggi a 31° e convivono.

### Palette scura — «Grafite»

```
--color-paper          #101216
--color-surface        #1e222b     profondità 1.18, identica al chiaro
--color-surface-sunk   #171a21
--color-ink            #e9ecf2
--color-ink-2          #a4abb8
--color-ink-3          #78818f
--color-line           #2c313b
--color-line-strong    #3e4653
--color-accent         #9b8cf5
--color-accent-hover   #b0a4f8
--color-accent-bg      #282350
--color-danger         #f0757f
--color-danger-bg      #33191f
--color-danger-line    #54282f
--color-role-p         #3ec7a4    --color-role-p-soft  #122e29
--color-role-d         #4fb3e8    --color-role-d-soft  #172742
--color-role-c         #d68ae0    --color-role-c-soft  #2e1f35
--color-role-a         #f8808e    --color-role-a-soft  #361c21
```

Sul fondo grafite i ruoli passano da 4,5–6,0 di contrasto a 6,0–8,9: sono più
leggibili che nel tema chiaro, che è il motivo ergonomico per cui il tema
esiste. Le distanze di tinta nello scuro sono più larghe che nel chiaro
(minimo 32°, accento/D).

`--color-accent-hover` nel tema scuro **schiarisce** invece di scurire: su
fondo scuro un hover più cupo legge come disabilitato.

### Attivazione e persistenza

La logica sta in `lib/theme.ts`, due funzioni pure:

```ts
type ThemeChoice = "light" | "dark" | "system";
type Resolved = "light" | "dark";

resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): Resolved
nextChoice(current: ThemeChoice): ThemeChoice   // light → dark → system → light
```

Il componente `ThemeToggle` resta sottile: legge, chiama, scrive. Le due
funzioni sono l'unica parte con logica e vanno sotto test.

- Chiave localStorage: `ao-fanta-theme`, valori `light` | `dark` | `system`.
  Un valore assente o non riconosciuto vale `system`.
- Uno script inline bloccante in `<head>` applica `data-theme` prima del primo
  paint. Senza, al reload si vede un lampo del tema sbagliato.
- `suppressHydrationWarning` su `<html>`, perché lo script muta l'attributo
  prima che React idrati.
- Il listener `matchMedia("(prefers-color-scheme: dark)")` è attivo **solo**
  in modalità `system`, e viene rimosso appena si sceglie a mano.

### Il controllo

Elemento fisso in `app/layout.tsx`, angolo in alto a destra:
`top-3 right-4 md:top-5 md:right-6`, `z-30`.

- Su mobile cade dentro la banda dell'header esistente (`h-14`).
- Su desktop sta sopra il `PageHeader`, che comincia a `md:pt-10`.
- `z-30` e non di più perché il drawer mobile (`z-50`) e la sua tendina
  (`z-40`) devono coprirlo.

Bottone ciclico con tre icone lucide: `Sun` → `Moon` → `Monitor`.
`aria-label` annuncia lo stato corrente e quello successivo.

**Compromesso accettato:** essendo fisso al viewport, su schermi larghi sta nel
margine, lontano dalla colonna da 1240px. L'alternativa — ancorarlo dentro
`main` — lo farebbe scorrere via con la pagina. Per un controllo che si cerca
di rado ma si vuole trovare sempre nello stesso posto, fisso è preferibile.

### `ball.png`

`public/ball.png` è line art nera su fondo trasparente: sul fondo grafite
sparisce. Serve una variante Tailwind custom, che è comunque utile avere per
qualunque ritocco puntuale futuro:

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

e `dark:invert` sull'immagine, che rende il contorno chiaro e il riempimento
scuro.

## Cosa non cambia

- Tipografia, scala tipografica, raggi, spaziature, durate e curve di motion.
- La regola "card con hairline, mai ombra": la profondità arriva dal salto di
  luminanza, non da ombre nuove.
- Il fondo resta tinta unita in entrambi i temi: nessun gradiente.
- Il prugna del ruolo C, l'indaco dell'accento chiaro, i ruoli P, C, A.
- Nessuna dipendenza aggiunta.

## Verifica

- Test unitari su `resolveTheme` e `nextChoice`, scritti prima
  dell'implementazione (`lib/theme.test.ts`).
- `npm run build` verde.
- I 133 test esistenti restano verdi.
- Grep del CSS buildato: nessun `text-white` residuo sui riempimenti accento,
  ruolo o pericolo; entrambi i set di token presenti.
- Giro manuale sui due temi: listone, asta, squadre, wishlist, impostazioni,
  drawer mobile aperto, dialog di assegnazione e di conferma aperti.

## Rischi

| Rischio | Mitigazione |
|---|---|
| Lampo di tema sbagliato al reload | Script inline bloccante prima del paint |
| Un `text-white` sfuggito resta bianco su fondo chiaro nello scuro | Grep finale su `app/` e `lib/`, zero occorrenze ammesse |
| `bg-ink/40` produce una tendina bianca nello scuro | Sostituito da `--color-scrim` |
| La tendina dei dialog resta troppo chiara nello scuro | Sostituita da `--color-scrim-strong` |
| Regressione silenziosa sul tema chiaro | I contrasti del chiaro sono ricalcolati e documentati sopra |
