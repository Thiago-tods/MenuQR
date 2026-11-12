import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

/**
 * Infra dos testes de RLS.
 *
 * - `svc` (service_role) só monta/desmonta fixtures e confere o estado do banco.
 *   NUNCA é usado para simular um usuário.
 * - Cada papel (anon, outsider, staff, admin) usa a chave `anon` + JWT real obtido por
 *   login com senha, exatamente como o navegador.
 */
export const env = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  allowed: process.env.RLS_TEST_ALLOW === "yes",
};

export const runId = randomBytes(4).toString("hex");
export const P = `rls-${runId}`;

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

export const svc = (): SupabaseClient => createClient(env.url, env.serviceKey, opts);
export const anonClient = (): SupabaseClient => createClient(env.url, env.anonKey, opts);

export type TestUser = { id: string; email: string; client: SupabaseClient };

/** Cria o usuário no Auth (setup) e devolve um cliente logado com a chave anon. */
export async function createUser(
  admin: SupabaseClient,
  label: string,
  role: "admin" | "staff" | null,
): Promise<TestUser> {
  const email = `${P}-${label}@example.com`; // domínio reservado (RFC 2606), nunca entrega e-mail
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser(${label}): ${error?.message}`);
  if (role) {
    const p = await admin
      .from("profiles")
      .insert({ id: data.user.id, full_name: `${P} ${label}`, role });
    if (p.error) throw new Error(`profile(${label}): ${p.error.message}`);
  }
  const client = anonClient();
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw new Error(`login(${label}): ${login.error.message}`);
  return { id: data.user.id, email, client };
}

type Result = { data?: unknown; error?: unknown };
type PgError = { code?: string; message?: string };

/** Escrita que NÃO pode ter efeito: erro de política/permissão OU nenhuma linha afetada. */
export function expectBlocked(res: Result, what: string) {
  const rows = Array.isArray(res.data) ? res.data.length : res.data ? 1 : 0;
  if (!res.error && rows > 0) {
    throw new Error(`${what}: a escrita foi PERMITIDA (${rows} linha(s) afetada(s))`);
  }
}

export const isDenied = (res: Result) => {
  const e = res.error as PgError | null | undefined;
  return !!e && (e.code === "42501" || /permission|policy/i.test(e.message ?? ""));
};
