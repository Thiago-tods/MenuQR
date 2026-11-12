"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { limitByClient } from "@/server/request-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(200),
});

export async function signIn(_: { error?: string } | undefined, formData: FormData) {
  if (!limitByClient("login", await headers(), 8, 10 * 60_000)) {
    return { error: "Muitas tentativas. Aguarde alguns minutos." };
  }
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Informe e-mail e senha válidos." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "E-mail ou senha incorretos." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "Este usuário não tem acesso administrativo." };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
