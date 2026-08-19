# Inserimento veloce del costo — design

**Data:** 2026-08-19
**Stato:** approvato

## Problema

All'asta il prezzo di un giocatore salta: si apre a 10 e si chiude a 40. Oggi
ci sono due modi di inserirlo, e nessuno dei due regge quel salto.

1. **Nell'app reale** (`app/components/AssignDialog.tsx:120`) il costo è un
   `<input type="number">` che parte da `0`. Si può digitare — quindi il caso
   "40" si risolve — ma:
   - parte da `0`, che non è mai un'offerta valida: il primo gesto è sempre
     cancellare lo zero;
   - su iPhone `type="number"` apre la tastiera numerica ma mostra anche le
     frecce e accetta `e`, `+`, `-`, `.`;
   - il campo non è a fuoco quando il dialog si apre, quindi il flusso
     "cerca → Invio → digita prezzo → Invio" si spezza a metà;
   - non c'è modo di aggiustare di 5 o 10 senza riscrivere il numero.
2. **Nel mockup** (artifact `Asta ao-fanta`) il costo si muove solo con i
   pulsanti `+` / `−`, un credito per pressione. Da 10 a 40 sono 30 tap.

## Obiettivo

Portare il costo dall'apertura alla chiusura in **un gesto o una digitazione**,
sia da tastiera che da telefono, senza aggiungere dipendenze.

## Soluzione

Un componente unico, `CostField`, usato sia dal dialog di assegnazione sia dal
mockup. Quattro modi di inserire lo stesso numero, tutti sullo stesso valore:

1. **Digitare.** La cifra grande *è* il campo. Si apre già a fuoco e già
   selezionata: digitare `40` sostituisce quello che c'era. `inputMode="numeric"`
   con `pattern="[0-9]*"` apre il tastierino sul telefono e accetta solo cifre.
   Invio conferma (submit del form), Esc chiude il dialog.
2. **Frecce.** `↑`/`↓` = ±1. `Shift+↑`/`Shift+↓` = ±10.
3. **Tenere premuto `+` / `−`.** Il primo credito parte al pointer-down. Dopo
   400 ms il pulsante ripete, e la ripetizione accelera: 1/tick lento, poi
   1/tick veloce, poi 5, poi 10. Da 10 a 40 sono ~1,2 secondi di pressione.
4. **Scrub sulla cifra.** Trascinando orizzontalmente sul numero il valore
   segue il dito: piano è fine (8 px per credito), veloce è grosso (1 px per
   credito). È il gesto rapido su mobile, dove non si vuole aprire la tastiera.

In più tre pillole di scorciatoia — `+5`, `+10`, `+25` — perché il rilancio
tipico è un incremento, non un valore assoluto.

## Vincoli di comportamento

- **Minimo 1, massimo 999.** Zero non è un'offerta; 999 è oltre qualsiasi
  budget di lega (default 500) e tiene la cifra dentro tre caratteri.
- **Il campo non blocca l'over-budget.** Resta il comportamento di oggi: si
  può confermare un costo superiore ai crediti residui, con l'`InlineError` che
  già esiste in `AssignDialog`. Il campo avvisa, non impedisce.
- **Feedback al pointer-down**, mai al rilascio: pulsanti, pillole e scrub
  reagiscono appena il dito tocca.
- **Nessuna nuova dipendenza**, né runtime né dev.

## Non obiettivi

- Prezzo suggerito automatico. Il modello `Player` non ha una quotazione
  (`prisma/schema.prisma`), quindi non c'è niente da cui suggerire.
- Cronologia dei rilanci o timer d'asta.
- Modifica del costo dopo l'assegnazione (esiste già in Impostazioni →
  Modifica giocatore).

## Verifica

Le funzioni pure (parsing, clamp, curva di ripetizione, curva di scrub) stanno
in `lib/bidInput.ts` e sono coperte da vitest. Il componente si verifica a mano
sul dev server: `vitest.config.ts` usa `environment: "node"` e il repo non ha
`@testing-library`, che questo lavoro non introduce.
