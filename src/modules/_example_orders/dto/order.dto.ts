import { z } from "zod";
import { OrderStatusEnum } from "../enums/order-status.enum";

// ──────────────────────────────────────────────────────────────────────────
// Create
// ──────────────────────────────────────────────────────────────────────────
export const createOrderDtoBodySchema = z.object({
  customerName: z.string().min(1).max(255),
  amount: z.number().positive(),
});
export type TCreateOrderDtoBodySchema = z.infer<
  typeof createOrderDtoBodySchema
>;

export const createOrderDtoServiceSchema = createOrderDtoBodySchema;
export type TCreateOrderDtoServiceSchema = z.infer<
  typeof createOrderDtoServiceSchema
>;

// ──────────────────────────────────────────────────────────────────────────
// Get (by id)
// ──────────────────────────────────────────────────────────────────────────
export const getOrderDtoParamSchema = z.object({
  id: z.string().uuid(),
});
export type TGetOrderDtoParamSchema = z.infer<typeof getOrderDtoParamSchema>;

// ──────────────────────────────────────────────────────────────────────────
// List
// ──────────────────────────────────────────────────────────────────────────
export const listOrdersDtoQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(OrderStatusEnum).optional(),
});
export type TListOrdersDtoQuerySchema = z.infer<
  typeof listOrdersDtoQuerySchema
>;
export type TListOrdersDtoServiceSchema = TListOrdersDtoQuerySchema;

// ──────────────────────────────────────────────────────────────────────────
// Update
// ──────────────────────────────────────────────────────────────────────────
export const updateOrderDtoParamSchema = z.object({
  id: z.string().uuid(),
});
export type TUpdateOrderDtoParamSchema = z.infer<
  typeof updateOrderDtoParamSchema
>;

export const updateOrderDtoBodySchema = z.object({
  customerName: z.string().min(1).max(255).optional(),
  amount: z.number().positive().optional(),
  status: z.nativeEnum(OrderStatusEnum).optional(),
});
export type TUpdateOrderDtoBodySchema = z.infer<
  typeof updateOrderDtoBodySchema
>;

export const updateOrderDtoServiceSchema = updateOrderDtoBodySchema.extend({
  id: z.string().uuid(),
});
export type TUpdateOrderDtoServiceSchema = z.infer<
  typeof updateOrderDtoServiceSchema
>;

// ──────────────────────────────────────────────────────────────────────────
// Delete
// ──────────────────────────────────────────────────────────────────────────
export const deleteOrderDtoParamSchema = z.object({
  id: z.string().uuid(),
});
export type TDeleteOrderDtoParamSchema = z.infer<
  typeof deleteOrderDtoParamSchema
>;
