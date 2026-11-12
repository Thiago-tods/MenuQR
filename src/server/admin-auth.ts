import "server-only";
import { redirect } from "next/navigation";
import { errorUrl } from "@/lib/admin-errors";
import { createClient } from "@/lib/supabase/server";

/**
 * Exige usuário autenticado com papel admin. Usa getUser() (valida o token no
 * servidor do Supabase) e consulta profiles sob RLS. Redireciona se falhar.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/admin/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect(errorUrl("/admin/login", "acesso-negado"));
  return { supabase, user: data.user, name: profile.full_name as string | null };
}

/** Versão para Server Actions. Sem sessão ou sem papel admin, volta ao login com um código. */
export async function assertAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(errorUrl("/admin/login", "sessao-expirada"));
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect(errorUrl("/admin/login", "acesso-negado"));
  return { supabase, user: data.user };
}
