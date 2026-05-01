import { z } from "zod";
import type { Receipt, ReceiptItem } from "./types";

const cents = z.number().int();
const positiveCents = z.number().int().nonnegative();

export const receiptItemSchema = z.object({
  id: z.string().min(1),
  rawName: z.string().min(1),
  canonicalName: z.string().min(1).nullable(),
  rawQuantity: z.string().min(1).nullable(),
  unitPrice: cents.nullable(),
  totalPrice: positiveCents,
}) satisfies z.ZodType<ReceiptItem>;

export const receiptSchema = z.object({
  id: z.string().min(1),
  purchaseDate: z.string().min(1),
  store: z.string().min(1).nullable(),
  total: positiveCents,
  items: z.array(receiptItemSchema),
  rawExtraction: z.unknown(),
  modelUsed: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}) satisfies z.ZodType<Receipt>;
