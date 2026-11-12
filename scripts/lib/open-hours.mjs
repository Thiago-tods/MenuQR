/**
 * Testes e scripts criam pedidos de verdade, e o checkout recusa pedidos fora do horário de
 * funcionamento. `forceOpen()` abre o restaurante 24 h e devolve uma função que restaura os
 * horários e o estado originais. Precisa da chave de serviço; sem ela não faz nada.
 */
import { createClient } from "@supabase/supabase-js";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export async function forceOpen() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
  if (!url || !key) return async () => {};

  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: original, error } = await db
    .from("restaurant_settings")
    .select("opening_hours, accepting_orders")
    .eq("id", 1)
    .single();
  if (error || !original)
    throw new Error(`forceOpen: ${error?.message ?? "sem configurações"}`);

  const allDay = Object.fromEntries(
    DAYS.map((d) => [d, { open: "00:00", close: "23:59" }]),
  );
  await db
    .from("restaurant_settings")
    .update({ opening_hours: allDay, accepting_orders: true })
    .eq("id", 1);

  return async () => {
    await db.from("restaurant_settings").update(original).eq("id", 1);
  };
}
