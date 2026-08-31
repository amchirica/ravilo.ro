import { describe, expect, it } from "vitest";
import { hasPermission, canAssignRole } from "../src/server/rbac";

describe("rbac", () => {
  it("does not grant admin rights to customers", () => {
    expect(hasPermission("CUSTOMER", "product.write")).toBe(false);
    expect(hasPermission("CUSTOMER", "order.refund")).toBe(false);
    expect(hasPermission("EDITOR", "order.refund")).toBe(false);
    expect(hasPermission("MANAGER", "product.write")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "admin.manage")).toBe(true);
  });

  it("prevents admins from creating super admins", () => {
    expect(canAssignRole("ADMIN", "SUPER_ADMIN")).toBe(false);
    expect(canAssignRole("ADMIN", "MANAGER")).toBe(true);
    expect(canAssignRole("SUPER_ADMIN", "ADMIN")).toBe(true);
  });
});
