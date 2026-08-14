import { describe, it, expect } from "vitest";
import { groupByDay } from "./dates";

const NOW = new Date("2026-08-14T21:00:00");

type Row = { id: string; at: Date | null };
const at = (id: string, iso: string | null): Row => ({
  id,
  at: iso ? new Date(iso) : null,
});

function labels(rows: Row[]) {
  return groupByDay(rows, (r) => r.at, NOW).map((g) => ({
    label: g.label,
    ids: g.items.map((i) => i.id),
  }));
}

describe("groupByDay", () => {
  it("returns no groups for an empty list", () => {
    expect(labels([])).toEqual([]);
  });

  it("labels the current calendar day 'Oggi'", () => {
    expect(labels([at("a", "2026-08-14T09:15:00")])).toEqual([
      { label: "Oggi", ids: ["a"] },
    ]);
  });

  it("labels the previous calendar day 'Ieri'", () => {
    expect(labels([at("a", "2026-08-13T23:59:00")])).toEqual([
      { label: "Ieri", ids: ["a"] },
    ]);
  });

  it("labels older days with day and short month", () => {
    expect(labels([at("a", "2026-08-11T10:00:00")])).toEqual([
      { label: "11 ago", ids: ["a"] },
    ]);
  });

  it("groups several items of the same day together", () => {
    expect(
      labels([
        at("a", "2026-08-14T20:00:00"),
        at("b", "2026-08-14T08:00:00"),
        at("c", "2026-08-13T12:00:00"),
      ])
    ).toEqual([
      { label: "Oggi", ids: ["a", "b"] },
      { label: "Ieri", ids: ["c"] },
    ]);
  });

  it("keeps the input order of both groups and items", () => {
    expect(
      labels([
        at("a", "2026-08-13T12:00:00"),
        at("b", "2026-08-14T12:00:00"),
        at("c", "2026-08-13T09:00:00"),
      ])
    ).toEqual([
      { label: "Ieri", ids: ["a", "c"] },
      { label: "Oggi", ids: ["b"] },
    ]);
  });

  it("collects items without a date in a trailing group", () => {
    expect(
      labels([at("a", null), at("b", "2026-08-14T12:00:00"), at("c", null)])
    ).toEqual([
      { label: "Oggi", ids: ["b"] },
      { label: "In precedenza", ids: ["a", "c"] },
    ]);
  });

  it("does not treat a date 24h earlier but two calendar days back as 'Ieri'", () => {
    const now = new Date("2026-08-14T00:30:00");
    const groups = groupByDay(
      [at("a", "2026-08-12T23:30:00")],
      (r) => r.at,
      now
    );
    expect(groups[0].label).toBe("12 ago");
  });
});
