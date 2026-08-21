import { describe, it, expect } from "vitest";
import {
  parseAndValidateRows,
  computeReconcile,
  parseAndValidateStatsRows,
  computeStatsReconcile,
} from "@/lib/importReconcile";

describe("parseAndValidateRows", () => {
  const mapping = { name: "Nome", role: "Ruolo", serieATeam: "Squadra" };

  it("extracts valid rows using the column mapping", () => {
    const { valid, errors } = parseAndValidateRows(
      [{ Nome: "Osimhen", Ruolo: "ATT", Squadra: "Napoli" }],
      mapping
    );
    expect(valid).toEqual([{ name: "Osimhen", role: "A", serieATeam: "Napoli" }]);
    expect(errors).toEqual([]);
  });

  it("reports a missing name with the 1-indexed-plus-header row number", () => {
    const { valid, errors } = parseAndValidateRows(
      [{ Nome: "", Ruolo: "ATT", Squadra: "Napoli" }],
      mapping
    );
    expect(valid).toEqual([]);
    expect(errors).toEqual(["Riga 2: nome mancante"]);
  });

  it("reports an unrecognized role", () => {
    const { valid, errors } = parseAndValidateRows(
      [{ Nome: "Osimhen", Ruolo: "XX", Squadra: "Napoli" }],
      mapping
    );
    expect(valid).toEqual([]);
    expect(errors).toEqual(['Riga 2: ruolo non valido "XX"']);
  });

  it("reports a missing serieATeam", () => {
    const { valid, errors } = parseAndValidateRows(
      [{ Nome: "Osimhen", Ruolo: "ATT", Squadra: "" }],
      mapping
    );
    expect(valid).toEqual([]);
    expect(errors).toEqual(["Riga 2: squadra Serie A mancante"]);
  });
});

describe("computeReconcile", () => {
  it("leaves an unchanged player out of create/update/delete", () => {
    const existing = [{ id: "1", name: "Osimhen", role: "A", serieATeam: "Napoli" }];
    const validRows = [{ name: "Osimhen", role: "A", serieATeam: "Napoli" }];
    const result = computeReconcile(validRows, existing);
    expect(result.toCreate).toEqual([]);
    expect(result.toUpdate).toEqual([]);
    expect(result.toDeleteIds).toEqual([]);
  });

  it("updates a player whose serieATeam changed", () => {
    const existing = [{ id: "1", name: "Osimhen", role: "A", serieATeam: "Napoli" }];
    const validRows = [{ name: "Osimhen", role: "A", serieATeam: "Galatasaray" }];
    const result = computeReconcile(validRows, existing);
    expect(result.toUpdate).toEqual([{ id: "1", name: "Osimhen", role: "A", serieATeam: "Galatasaray" }]);
    expect(result.toCreate).toEqual([]);
    expect(result.toDeleteIds).toEqual([]);
  });

  it("updates a player whose role changed", () => {
    const existing = [{ id: "1", name: "Osimhen", role: "A", serieATeam: "Napoli" }];
    const validRows = [{ name: "Osimhen", role: "D", serieATeam: "Napoli" }];
    const result = computeReconcile(validRows, existing);
    expect(result.toUpdate).toEqual([{ id: "1", name: "Osimhen", role: "D", serieATeam: "Napoli" }]);
    expect(result.toCreate).toEqual([]);
    expect(result.toDeleteIds).toEqual([]);
  });

  it("uses only the last row when the file has duplicate names", () => {
    const validRows = [
      { name: "Osimhen", role: "A", serieATeam: "Napoli" },
      { name: "Osimhen", role: "A", serieATeam: "Galatasaray" },
    ];
    const result = computeReconcile(validRows, []);
    expect(result.toCreate).toEqual([{ name: "Osimhen", role: "A", serieATeam: "Galatasaray" }]);
  });

  it("matches names case/accent-insensitively so it updates rather than duplicates", () => {
    const existing = [{ id: "1", name: "Vlahović", role: "A", serieATeam: "Juventus" }];
    const validRows = [{ name: "vlahovic", role: "A", serieATeam: "Milan" }];
    const result = computeReconcile(validRows, existing);
    expect(result.toUpdate).toEqual([{ id: "1", name: "vlahovic", role: "A", serieATeam: "Milan" }]);
    expect(result.toCreate).toEqual([]);
  });

  it("creates a player whose name isn't in the existing DB", () => {
    const validRows = [{ name: "Nuovo Acquisto", role: "C", serieATeam: "Roma" }];
    const result = computeReconcile(validRows, []);
    expect(result.toCreate).toEqual([{ name: "Nuovo Acquisto", role: "C", serieATeam: "Roma" }]);
    expect(result.toUpdate).toEqual([]);
    expect(result.toDeleteIds).toEqual([]);
  });

  it("deletes an existing player absent from the file", () => {
    const existing = [{ id: "1", name: "Ritirato", role: "A", serieATeam: "Bologna" }];
    const result = computeReconcile([], existing);
    expect(result.toDeleteIds).toEqual(["1"]);
    expect(result.toDeleteNames).toEqual(["Ritirato"]);
  });

  it("deletes every duplicate but one when two existing players normalize to the same name", () => {
    const existing = [
      { id: "1", name: "Osimhen", role: "A", serieATeam: "Napoli" },
      { id: "2", name: "osimhen", role: "A", serieATeam: "Napoli" },
    ];
    const validRows = [{ name: "Osimhen", role: "A", serieATeam: "Napoli" }];
    const result = computeReconcile(validRows, existing);
    // The first encountered ("1") is the one eligible to match the file row;
    // it's unchanged so it's neither created nor updated. The duplicate
    // ("2") can never be "the" match and is unconditionally deleted.
    expect(result.toCreate).toEqual([]);
    expect(result.toUpdate).toEqual([]);
    expect(result.toDeleteIds).toEqual(["2"]);
    expect(result.toDeleteNames).toEqual(["osimhen"]);
  });

  it("does not protect an existing player from deletion when the file has a row for them that failed validation", () => {
    // Compose the two functions for real: a raw row with a bad role is
    // dropped by parseAndValidateRows into errors, not valid, so it never
    // reaches computeReconcile as a valid row — the player must still be
    // diffed as missing.
    const mapping = { name: "Nome", role: "Ruolo", serieATeam: "Squadra" };
    const { valid, errors } = parseAndValidateRows(
      [{ Nome: "Osimhen", Ruolo: "XX", Squadra: "Napoli" }],
      mapping
    );
    expect(valid).toEqual([]);
    expect(errors).toEqual(['Riga 2: ruolo non valido "XX"']);

    const existing = [{ id: "1", name: "Osimhen", role: "A", serieATeam: "Napoli" }];
    const result = computeReconcile(valid, existing);
    expect(result.toDeleteIds).toEqual(["1"]);
  });
});

describe("parseAndValidateStatsRows", () => {
  const mapping = {
    name: "Nome",
    mediaVoto: "Mv",
    fantaMedia: "Fm",
    goals: "Gf",
    assists: "Ass",
    appearances: "Pv",
  };

  it("extracts valid stats rows using the column mapping", () => {
    const { valid, errors } = parseAndValidateStatsRows(
      [{ Nome: "Osimhen", Mv: 6.36, Fm: 7.58, Gf: 12, Ass: 3, Pv: 30 }],
      mapping
    );
    expect(valid).toEqual([
      { name: "Osimhen", mediaVoto: 6.36, fantaMedia: 7.58, goals: 12, assists: 3, appearances: 30 },
    ]);
    expect(errors).toEqual([]);
  });

  it("reports a missing name with the 1-indexed-plus-header row number", () => {
    const { valid, errors } = parseAndValidateStatsRows(
      [{ Nome: "", Mv: 6.36, Fm: 7.58, Gf: 12, Ass: 3, Pv: 30 }],
      mapping
    );
    expect(valid).toEqual([]);
    expect(errors).toEqual(["Riga 2: nome mancante"]);
  });

  it("treats a blank stat cell as null rather than an error", () => {
    const { valid, errors } = parseAndValidateStatsRows(
      [{ Nome: "Osimhen", Mv: "", Fm: 7.58, Gf: 12, Ass: 3, Pv: 30 }],
      mapping
    );
    expect(valid).toEqual([
      { name: "Osimhen", mediaVoto: null, fantaMedia: 7.58, goals: 12, assists: 3, appearances: 30 },
    ]);
    expect(errors).toEqual([]);
  });

  it("reports a non-numeric stat cell", () => {
    const { valid, errors } = parseAndValidateStatsRows(
      [{ Nome: "Osimhen", Mv: "n/d", Fm: 7.58, Gf: 12, Ass: 3, Pv: 30 }],
      mapping
    );
    expect(valid).toEqual([]);
    expect(errors).toEqual(['Riga 2: valore non numerico per "mediaVoto"']);
  });

  it("accepts comma decimal separators", () => {
    const { valid } = parseAndValidateStatsRows(
      [{ Nome: "Osimhen", Mv: "6,36", Fm: 7.58, Gf: 12, Ass: 3, Pv: 30 }],
      mapping
    );
    expect(valid[0].mediaVoto).toBe(6.36);
  });
});

describe("computeStatsReconcile", () => {
  it("matches a file row to an existing player by name and updates their stats", () => {
    const existing = [{ id: "1", name: "Osimhen" }];
    const validRows = [
      { name: "Osimhen", mediaVoto: 6.36, fantaMedia: 7.58, goals: 12, assists: 3, appearances: 30 },
    ];
    const result = computeStatsReconcile(validRows, existing);
    expect(result.toUpdate).toEqual([
      { id: "1", name: "Osimhen", mediaVoto: 6.36, fantaMedia: 7.58, goals: 12, assists: 3, appearances: 30 },
    ]);
    expect(result.notFoundNames).toEqual([]);
  });

  it("matches names case/accent-insensitively", () => {
    const existing = [{ id: "1", name: "Vlahović" }];
    const validRows = [
      { name: "vlahovic", mediaVoto: 6, fantaMedia: 6, goals: 0, assists: 0, appearances: 10 },
    ];
    const result = computeStatsReconcile(validRows, existing);
    expect(result.toUpdate[0].id).toBe("1");
  });

  it("reports a file row with no matching existing player as not found, without creating it", () => {
    const validRows = [
      { name: "Sconosciuto", mediaVoto: 6, fantaMedia: 6, goals: 0, assists: 0, appearances: 5 },
    ];
    const result = computeStatsReconcile(validRows, []);
    expect(result.toUpdate).toEqual([]);
    expect(result.notFoundNames).toEqual(["Sconosciuto"]);
  });

  it("leaves an existing player untouched when the file has no row for them", () => {
    const existing = [{ id: "1", name: "SenzaStat" }];
    const result = computeStatsReconcile([], existing);
    expect(result.toUpdate).toEqual([]);
    expect(result.notFoundNames).toEqual([]);
  });
});
