import { z } from "zod";

export const addressSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  company: z.string().trim().max(120).optional(),
  cui: z.string().trim().max(20).optional(),
  registrationNumber: z.string().trim().max(40).optional(),
  country: z.string().trim().length(2).default("RO"),
  county: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  street: z.string().trim().min(1).max(120),
  number: z.string().trim().min(1).max(20),
  building: z.string().trim().max(20).optional(),
  entrance: z.string().trim().max(20).optional(),
  floor: z.string().trim().max(10).optional(),
  apartment: z.string().trim().max(20).optional(),
  postalCode: z.string().trim().min(4).max(12),
  phone: z.string().trim().min(8).max(30),
});

export const checkoutSchema = z.object({
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  phone: z.string().trim().min(8).max(30),
  customerNotes: z.string().max(1000).optional().default(""),
  shipping: addressSchema,
  billing: addressSchema.optional(),
  sameAsShipping: z.boolean().default(true),
  shippingMethodId: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
    z.string().min(1).optional(),
  ),
  discountCode: z.string().trim().max(40).optional(),
  marketingConsent: z.boolean().default(false),
});

export const cartItemSchema = z.object({
    variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
});
