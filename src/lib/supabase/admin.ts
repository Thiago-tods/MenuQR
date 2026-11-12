import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com service_role: ignora RLS. Uso exclusivo no servidor, apenas em
 * fluxos que validam tudo antes (criação de pedido e leitura por token).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
