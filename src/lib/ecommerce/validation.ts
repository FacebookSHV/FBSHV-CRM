import { z } from "zod";

export const skuParamSchema = z.object({
  sku: z.string().trim().min(1).max(80)
});

export const productIdParamSchema = z.object({
  id: z.string().trim().min(1).max(120)
});

export const inventoryCheckSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  quantity: z.coerce.number().int().positive().max(999)
});

export const facebookOrderSchema = z.object({
  customerId: z.string().trim().min(1),
  conversationId: z.string().trim().optional(),
  sku: z.string().trim().min(1).max(80),
  quantity: z.coerce.number().int().positive().max(999),
  note: z.string().trim().max(500).optional()
});

export const webhookEventSchema = z.object({
  eventId: z.string().trim().min(1),
  type: z.string().trim().min(1),
  occurredAt: z.string().trim().min(1),
  data: z.record(z.unknown()).default({})
});
