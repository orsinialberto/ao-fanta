import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// new URL invece di __dirname: vitest carica questo file come ESM, dove
// __dirname non esiste.
const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

/** Estrae le dichiarazioni --color-* / --shadow-* del blocco che parte da `start`. */
function tokensOfBlockAt(start: number): Record<string, string> {
  const open = css.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = css.slice(open + 1, end);
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--(?:color|shadow)-[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].replace(/\s+/g, " ").trim();
  }
  return out;
}

/**
 * Il selettore di sistema compare due volte: dentro @custom-variant è
 * annidato in un `&:where(… *)`, nel blocco dei token apre direttamente una
 * graffa. È la graffa che distingue i due.
 */
function systemBlockStart(): number {
  const m = /^\s*:root:not\(\[data-theme="light"\]\)\s*\{/m.exec(css);
  expect(m, "blocco token del tema di sistema non trovato").not.toBeNull();
  return m!.index;
}

describe("token del tema scuro", () => {
  const manual = tokensOfBlockAt(css.indexOf(':root[data-theme="dark"]'));
  const system = tokensOfBlockAt(systemBlockStart());

  it("i due blocchi esistono e non sono vuoti", () => {
    expect(Object.keys(manual).length).toBeGreaterThan(20);
    expect(Object.keys(system).length).toBeGreaterThan(20);
  });

  it("la scelta a mano e la preferenza di sistema dichiarano gli stessi token", () => {
    expect(Object.keys(manual).sort()).toEqual(Object.keys(system).sort());
  });

  it("con gli stessi valori", () => {
    expect(system).toEqual(manual);
  });
});

describe("nessun colore nasce in un blocco di override", () => {
  // Un token definito solo sotto [data-theme] o dentro @media lascia scoperto
  // lo stato non marcato: la pagina renderizza il testo di un tema sul fondo
  // dell'altro. Ogni token scuro deve avere un gemello chiaro in @theme.
  const themeBlock = tokensOfBlockAt(css.indexOf("@theme"));
  const manual = tokensOfBlockAt(css.indexOf(':root[data-theme="dark"]'));

  it("ogni token del tema scuro esiste anche in @theme", () => {
    const mancanti = Object.keys(manual).filter((k) => !(k in themeBlock));
    expect(mancanti).toEqual([]);
  });
});
