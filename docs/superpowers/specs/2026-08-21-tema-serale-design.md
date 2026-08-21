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

### Il modello di profondità, ribaltato

La pagina è la superficie **più chiara**; card, tabelle e pannelli ci si
appoggiano sopra **più scuri**. Vassoi su una scrivania bianca, non fogli su
un tavolo grigio. Il `surface-sunk` scende di un altro gradino, perché è
incassato dentro il riquadro.

Il verso conta meno del salto: quello che risolve il difetto 1 è che ci *sia*
uno stacco misurabile, 1.16 nel tema giorno e 1.18 nel tema sera, senza
introdurre una sola ombra.

### Palette giorno — «Acciaio & Verderame»

Grigi freddi d'acciaio, senza deriva di tinta, e un accento verderame — rame
ossidato — al posto dell'indaco.

```
--color-paper          #fcfdfe     la pagina, la cosa più chiara
--color-surface        #e7edf1     i riquadri, 1.16 sotto la pagina
--color-surface-sunk   #dae3ea
--color-ink            #101519
--color-ink-2          #48535c
--color-ink-3          #77838e
--color-line           #cbd6de
--color-line-strong    #b3c1cc
--color-accent         #0a5566
--color-accent-hover   #083f4d
--color-accent-bg      #d3e6ec
--color-danger         #a8243a
--color-danger-bg      #f6e3e7
--color-danger-line    #e2c2c9
--color-role-p         #2b7742    --color-role-p-soft  #e3f1e7
--color-role-d         #3d4eac    --color-role-d-soft  #e4e8f5
--color-role-c         #7d4f9c    --color-role-c-soft  #ede5f3
--color-role-a         #b53f2a    --color-role-a-soft  #f6e8e4
```

**Come si risolve il difetto 2.** Portando l'accento sul verderame (216°) si
libera lo slot indaco, quindi il ruolo D **torna al suo colore storico**
`#3d4eac`: la collisione a 7° si scioglie spostando l'accento invece del
ruolo, e per chi usa l'app non c'è niente da riapprendere sul difensore.

Il prezzo è che il portiere deve muoversi: il suo verde-azzurro `#0d7a6b`
resterebbe a 36° dall'accento nuovo. Diventa un verde d'erba `#2b7742`, a 62°.

Distanza minima fra le cinque tinte codificanti: **39°** (D/C), contro i 7°
di partenza.

Sull'accento: l'ottanio `#0e6d80` del mockup faceva 5.45 di contrasto sulla
pagina, meno dell'indaco che sostituiva. Approfondito a `#0a5566` risale a
8.23, quindi la direzione non costa più contrasto — che nel banco di prova era
il suo unico difetto misurato.

### Palette sera — «Grafite Verderame»

Stesso rapporto ribaltato di segno: pagina grafite chiara, riquadri quasi neri.

```
--color-paper          #1d272d     la pagina
--color-surface        #10181d     i riquadri, 1.18 sotto la pagina
--color-surface-sunk   #05090b
--color-ink            #e6edf2
--color-ink-2          #9aa8b3
--color-ink-3          #6f7e8a
--color-line           #3a4a54
--color-line-strong    #50626d
--color-accent         #4ec4d8
--color-accent-hover   #6fd4e5
--color-accent-bg      #0d3742
--color-danger         #f0757f
--color-danger-bg      #2e161c
--color-danger-line    #4d242c
--color-role-p         #5fce7e    --color-role-p-soft  #0f2a18
--color-role-d         #8496ff    --color-role-d-soft  #161c3a
--color-role-c         #d68ae0    --color-role-c-soft  #291a2f
--color-role-a         #f8808e    --color-role-a-soft  #31171c
```

L'accento resta verderame anche di sera, schiarito: è quello che rende i due
temi la stessa app. I ruoli passano da 4,5–6,2 di contrasto a 6,2–9,1 — sono
più leggibili che di giorno, ed è il motivo ergonomico per cui il tema esiste.
Distanza minima di tinta: **48°**, più larga che nel giorno.

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
- Il prugna del ruolo C e l'indaco del ruolo D, che torna al suo valore
  storico.
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
