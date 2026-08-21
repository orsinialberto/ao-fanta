import { describe, it, expect } from "vitest";
import {
  THEME_STORAGE_KEY,
  parseThemeChoice,
  resolveTheme,
  nextChoice,
  type ThemeChoice,
} from "./theme";

describe("THEME_STORAGE_KEY", () => {
  it("è la chiave concordata con lo script inline", () => {
    expect(THEME_STORAGE_KEY).toBe("ao-fanta-theme");
  });
});

describe("parseThemeChoice", () => {
  it("accetta i tre valori validi", () => {
    expect(parseThemeChoice("light")).toBe("light");
    expect(parseThemeChoice("dark")).toBe("dark");
    expect(parseThemeChoice("system")).toBe("system");
  });

  it("ripiega su system quando non c'è niente in memoria", () => {
    expect(parseThemeChoice(null)).toBe("system");
  });

  // Un localStorage sporco (versione vecchia, modifica a mano) non deve
  // rompere l'avvio: qualunque cosa non riconosciuta vale "segui il sistema".
  it("ripiega su system su valori non riconosciuti", () => {
    expect(parseThemeChoice("")).toBe("system");
    expect(parseThemeChoice("Dark")).toBe("system");
    expect(parseThemeChoice("grafite")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("una scelta esplicita ignora il sistema", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("in modalità system segue il sistema", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("nextChoice", () => {
  it("cicla chiaro → scuro → sistema → chiaro", () => {
    expect(nextChoice("light")).toBe("dark");
    expect(nextChoice("dark")).toBe("system");
    expect(nextChoice("system")).toBe("light");
  });

  it("il ciclo torna al punto di partenza in tre passi", () => {
    const start: ThemeChoice = "light";
    expect(nextChoice(nextChoice(nextChoice(start)))).toBe(start);
  });
});
