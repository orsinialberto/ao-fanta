// lib/roleLimit.test.ts
import { describe, it, expect } from "vitest";
import { evaluateRoleLimit } from "@/lib/roleLimit";

describe("evaluateRoleLimit", () => {
  it("allows when count is below limit", () => {
    expect(evaluateRoleLimit(2, 6, "Attaccanti")).toEqual({ ok: true });
  });

  it("blocks when count has reached the limit", () => {
    const result = evaluateRoleLimit(6, 6, "Attaccanti");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Attaccanti");
  });

  it("blocks when count exceeds the limit", () => {
    expect(evaluateRoleLimit(7, 6, "Attaccanti").ok).toBe(false);
  });
});
