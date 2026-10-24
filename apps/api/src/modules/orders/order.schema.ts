import { z } from "zod";

export const createOrderSchema = z.object({
  warehouseId: z.string().regex(/^[a-f\d]{24}$/i),
  items: z.array(
    z.object({
      productId: z.string().regex(/^[a-f\d]{24}$/i),
      quantity: z.number().int().min(1).max(100)
    })
  ).min(1).max(50)
});

export type CreateOrderInput =
  z.infer<typeof createOrderSchema>;