import { z } from "zod";

const phoneRegex = /^\+380\d{9}$/;

export const UserInsertSchema = z.object({
  telegramId: z.string().min(1).max(255),
  username: z.string().min(1).max(255).optional().nullable(),
  firstName: z.string().min(1).max(255).optional().nullable(),
  languageCode: z.string().length(2).optional().nullable(),
  phone: z
    .string()
    .regex(phoneRegex, "invalid_phone_format")
    .optional()
    .nullable(),
});

export const OrderInsertSchema = z.object({
  userId: z.number().int().positive(),
  serviceType: z.string().min(3).max(255),
  description: z.string().min(3).max(2000).optional().nullable(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
});

export type UserInsertInput = z.infer<typeof UserInsertSchema>;
export type OrderInsertInput = z.infer<typeof OrderInsertSchema>;