import type { UserRole } from "@/types/domain";

export const PERMISSIONS = [
  "product.read",
  "product.write",
  "order.read",
  "order.write",
  "order.refund",
  "customer.read",
  "customer.write",
  "discount.read",
  "discount.write",
  "content.read",
  "content.write",
  "inventory.read",
  "inventory.write",
  "settings.write",
  "admin.manage",
  "audit.read",
  "review.moderate",
  "bundle.write",
  "shipping.write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  CUSTOMER: [],
  STAFF: ["product.read", "order.read", "customer.read", "inventory.read", "content.read", "audit.read"],
  EDITOR: ["product.read", "content.read", "content.write", "review.moderate"],
  MANAGER: [
    "product.read",
    "product.write",
    "order.read",
    "order.write",
    "order.refund",
    "customer.read",
    "discount.read",
    "discount.write",
    "content.read",
    "content.write",
    "inventory.read",
    "inventory.write",
    "review.moderate",
    "bundle.write",
    "shipping.write",
    "audit.read",
  ],
  ADMIN: PERMISSIONS,
  SUPER_ADMIN: PERMISSIONS,
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function isStaffRole(role: UserRole): boolean {
  return role !== "CUSTOMER";
}

export function isAdminRole(role: UserRole): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canAssignRole(actor: UserRole, target: UserRole): boolean {
  if (actor === "SUPER_ADMIN") return true;
  if (actor !== "ADMIN") return false;
  return target !== "SUPER_ADMIN" && target !== "ADMIN";
}

export function requiresMfa(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}
