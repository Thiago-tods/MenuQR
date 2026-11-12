"use server";

import { createOrder, type CreateOrderResult } from "@/server/create-order";
import type { CheckoutInput } from "@/lib/schemas";

export async function submitOrder(input: CheckoutInput): Promise<CreateOrderResult> {
  return createOrder(input);
}
