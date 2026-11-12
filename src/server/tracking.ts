import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { toCents } from "@/lib/money";
import type { OrderStatus } from "@/lib/order-status";

export const TRACKING_TOKEN_RE = /^[a-f0-9]{64}$/;

export type TrackedOrder = {
  number: number;
  status: OrderStatus;
  mode: "DINE_IN" | "PICKUP";
  tableName: string | null;
  createdAt: string;
  totalCents: number;
  notes: string | null;
  items: {
    name: string;
    quantity: number;
    unitPriceCents: number;
    note: string | null;
    options: string[];
  }[];
  history: { status: OrderStatus; at: string }[];
};

/** Busca por token aleatório (~244 bits). Não expõe nome, telefone nem ids. */
export async function getTrackedOrder(token: string): Promise<TrackedOrder | null> {
  if (!TRACKING_TOKEN_RE.test(token)) return null;
  const { data } = await createAdminClient()
    .from("orders")
    .select(
      `number, status, mode, notes, total, created_at, tables ( name ),
       order_items ( product_name, unit_price, quantity, note, order_item_complements ( name ) ),
       order_status_history ( to_status, created_at )`,
    )
    .eq("tracking_token", token)
    .maybeSingle();
  if (!data) return null;

  type Row = typeof data & {
    tables: { name: string } | null;
    order_items: {
      product_name: string;
      unit_price: string;
      quantity: number;
      note: string | null;
      order_item_complements: { name: string }[];
    }[];
    order_status_history: { to_status: OrderStatus; created_at: string }[];
  };
  const row = data as unknown as Row;

  return {
    number: row.number,
    status: row.status as OrderStatus,
    mode: row.mode as "DINE_IN" | "PICKUP",
    tableName: row.tables?.name ?? null,
    createdAt: row.created_at,
    totalCents: toCents(row.total),
    notes: row.notes,
    items: row.order_items.map((i) => ({
      name: i.product_name,
      quantity: i.quantity,
      unitPriceCents: toCents(i.unit_price),
      note: i.note,
      options: i.order_item_complements.map((c) => c.name),
    })),
    history: [...row.order_status_history]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((h) => ({ status: h.to_status, at: h.created_at })),
  };
}
