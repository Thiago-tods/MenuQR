import { z } from "zod";

export const cartLineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  note: z.string().max(200).optional(),
  optionIds: z.array(z.string().uuid()).max(30),
});

export const checkoutSchema = z
  .object({
    customerName: z.string().trim().min(2, "Informe seu nome.").max(80),
    customerPhone: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .refine(
        (v) => v.length === 10 || v.length === 11,
        "Telefone com DDD, 10 ou 11 dígitos.",
      ),
    mode: z.enum(["DINE_IN", "PICKUP"]),
    /** Código público da mesa (vem do QR Code), nunca o número digitado. */
    tableCode: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    notes: z.string().trim().max(300).optional(),
    items: z.array(cartLineSchema).min(1, "O carrinho está vazio.").max(40),
  })
  .refine((v) => v.mode !== "DINE_IN" || !!v.tableCode, {
    path: ["tableCode"],
    message: "Consumo no local exige o QR Code da mesa.",
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: z.boolean(),
});

export const productSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(400),
  categoryId: z.string().uuid(),
  priceCents: z.coerce.number().int().min(0).max(1_000_000),
  prepMinutes: z.coerce.number().int().min(0).max(240).nullable(),
  available: z.boolean(),
  featured: z.boolean(),
  imageUrl: z.string().url().nullable(),
  groupIds: z.array(z.string().uuid()),
});

export const groupSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    minSelect: z.coerce.number().int().min(0).max(20),
    maxSelect: z.coerce.number().int().min(1).max(20),
    options: z
      .array(
        z.object({
          id: z.string().uuid().optional(),
          name: z.string().trim().min(1).max(60),
          priceCents: z.coerce.number().int().min(0).max(100_000),
          available: z.boolean(),
        }),
      )
      .min(1)
      .max(40),
  })
  .refine((g) => g.minSelect <= g.maxSelect, {
    path: ["minSelect"],
    message: "O mínimo não pode ser maior que o máximo.",
  });
