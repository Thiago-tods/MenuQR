import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutSchema, type CheckoutInput } from "@/lib/schemas";
import { priceOrder, PricingError } from "@/lib/pricing";
import { fromCents } from "@/lib/money";
import { isOpenNow, type OpeningHours } from "@/lib/hours";
import { loadCatalog } from "@/server/catalog";
import { limitByClient } from "@/server/request-limit";

export type CreateOrderResult =
  | { ok: true; trackingToken: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const fail = (error: string): CreateOrderResult => ({ ok: false, error });

export async function createOrder(input: CheckoutInput): Promise<CreateOrderResult> {
  const limit = Number(process.env.ORDER_RATE_LIMIT) || 5; // pedidos por IP a cada 10 min
  if (!limitByClient("order", await headers(), limit, 10 * 60_000)) {
    return fail("Muitos pedidos em pouco tempo. Tente novamente em alguns minutos.");
  }

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados informados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const data = parsed.data;
  const db = createAdminClient();

  const { data: settings } = await db
    .from("restaurant_settings")
    .select("accepting_orders, closed_message, opening_hours")
    .eq("id", 1)
    .single();
  if (!settings) return fail("Restaurante não configurado.");
  if (!settings.accepting_orders || !isOpenNow(settings.opening_hours as OpeningHours)) {
    return fail(settings.closed_message);
  }

  // A mesa é validada pelo código aleatório do QR Code, nunca por número livre.
  let tableId: string | null = null;
  if (data.mode === "DINE_IN") {
    const { data: table } = await db
      .from("tables")
      .select("id")
      .eq("public_code", data.tableCode!)
      .eq("active", true)
      .maybeSingle();
    if (!table) return fail("Mesa inválida. Leia o QR Code da mesa novamente.");
    tableId = table.id;
  }

  let priced;
  try {
    const catalog = await loadCatalog(
      [...new Set(data.items.map((i) => i.productId))],
      db,
    );
    priced = priceOrder(data.items, catalog);
  } catch (e) {
    if (e instanceof PricingError) return fail(e.message);
    throw e;
  }

  const { data: order, error } = await db
    .from("orders")
    .insert({
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      mode: data.mode,
      table_id: tableId,
      notes: data.notes || null,
      payment_status: "NOT_INTEGRATED",
      subtotal: fromCents(priced.subtotalCents),
      total: fromCents(priced.totalCents),
    })
    .select("id, tracking_token")
    .single();
  if (error || !order) return fail("Não foi possível criar o pedido.");

  try {
    for (const line of priced.lines) {
      const { data: item, error: itemError } = await db
        .from("order_items")
        .insert({
          order_id: order.id,
          product_id: line.productId,
          product_name: line.productName,
          unit_price: fromCents(line.unitPriceCents),
          quantity: line.quantity,
          note: line.note,
        })
        .select("id")
        .single();
      if (itemError || !item) throw itemError ?? new Error("item");
      if (line.options.length > 0) {
        const { error: optError } = await db.from("order_item_complements").insert(
          line.options.map((o) => ({
            order_item_id: item.id,
            option_id: o.optionId,
            group_name: o.groupName,
            name: o.name,
            price: fromCents(o.priceCents),
          })),
        );
        if (optError) throw optError;
      }
    }
  } catch {
    // Sem transação entre chamadas HTTP: desfaz o pedido parcial (cascade apaga os itens).
    await db.from("orders").delete().eq("id", order.id);
    return fail("Não foi possível registrar os itens do pedido.");
  }

  return { ok: true, trackingToken: order.tracking_token };
}
