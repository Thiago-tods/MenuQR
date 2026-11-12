import { createClient } from "@supabase/supabase-js";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/**
 * O checkout recusa pedidos fora do horário de funcionamento, o que quebraria o E2E à noite.
 * Abre o restaurante 24 h durante os testes e restaura os horários originais no final.
 * Sem a chave de serviço, não faz nada (os testes dependem então do horário real).
 */
export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return async () => {};

  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: original } = await db
    .from("restaurant_settings")
    .select("opening_hours, accepting_orders")
    .eq("id", 1)
    .single();
  if (!original) return async () => {};

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
