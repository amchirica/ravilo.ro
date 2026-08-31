export const USER_ROLES = [
  "CUSTOMER",
  "STAFF",
  "EDITOR",
  "MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "DISABLED", "PENDING_VERIFICATION"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PUBLISH_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export const ORDER_STATUSES = [
  "DRAFT",
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "UNPAID",
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILLMENT_STATUSES = ["UNFULFILLED", "PARTIAL", "FULFILLED", "RETURNED"] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const PAYMENT_PROVIDERS = ["STRIPE", "NETOPIA", "EUPLATESC", "PAYU", "MOCK"] as const;
export type PaymentProviderKey = (typeof PAYMENT_PROVIDERS)[number];

export const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const HOMEPAGE_SECTION_TYPES = [
  "HERO",
  "CATEGORY_GRID",
  "FEATURED_PRODUCTS",
  "COLLECTION",
  "RAVILO_PICKS",
  "SHOP_BY_PROBLEM",
  "BUNDLE",
  "EDITORIAL",
  "NEW_ARRIVALS",
  "BESTSELLERS",
  "TRUST",
  "JOURNAL",
  "NEWSLETTER",
  "CUSTOM_BANNER",
] as const;
export type HomepageSectionType = (typeof HOMEPAGE_SECTION_TYPES)[number];

export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  DRAFT: ["PENDING_PAYMENT", "CANCELLED"],
  PENDING_PAYMENT: ["PAID", "CANCELLED", "FAILED" as OrderStatus].filter(Boolean) as OrderStatus[],
  PAID: ["PROCESSING", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"],
  PROCESSING: ["READY_TO_SHIP", "SHIPPED", "CANCELLED", "REFUNDED"],
  READY_TO_SHIP: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED" as OrderStatus].filter(Boolean) as OrderStatus[],
  DELIVERED: ["REFUNDED", "PARTIALLY_REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ["REFUNDED"],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus, override = false): boolean {
  if (override) return true;
  if (from === to) return true;
  return (ALLOWED_ORDER_TRANSITIONS[from] ?? []).includes(to);
}
