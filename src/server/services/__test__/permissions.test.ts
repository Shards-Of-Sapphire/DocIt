// src/server/services/__tests__/permissions.test.ts
import { describe, it, expect } from "vitest";
import { can } from "@/lib/permissions";

describe("permissions matrix", () => {
  it("viewer can read but not approve", () => {
    expect(can("VIEWER", "event:read")).toBe(true);
    expect(can("VIEWER", "document:approve")).toBe(false);
  });
  it("advisor can approve documents but not generate certificates", () => {
    expect(can("ADVISOR", "document:approve")).toBe(true);
    expect(can("ADVISOR", "certificate:generate")).toBe(false);
  });
  it("admin can do everything", () => {
    expect(can("ADMIN", "certificate:generate")).toBe(true);
    expect(can("ADMIN", "member:manage")).toBe(true);
  });
});
