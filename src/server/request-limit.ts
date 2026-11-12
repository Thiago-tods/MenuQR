import "server-only";
import { getClientIp, proxyModeFromEnv, UNKNOWN_IP } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";

/** Sem proxy declarado todos compartilham um balde; o limite sobe para não travar usuários reais. */
const SHARED_BUCKET_MULTIPLIER = 20;
let warned = false;

/**
 * Limita por cliente. Retorna false quando o limite foi excedido.
 * O IP só vem de cabeçalhos quando TRUSTED_PROXY declara a hospedagem (ver docs/SECURITY.md).
 */
export function limitByClient(
  scope: string,
  headers: { get(name: string): string | null },
  limit: number,
  windowMs: number,
): boolean {
  const mode = proxyModeFromEnv(process.env.TRUSTED_PROXY);
  const ip = getClientIp(headers, mode);

  if (ip === UNKNOWN_IP) {
    if (!warned && process.env.NODE_ENV === "production") {
      warned = true;
      console.warn(
        "[MenuQR] TRUSTED_PROXY não definido: o limite por IP usa um balde único. Defina TRUSTED_PROXY=vercel (ou cloudflare).",
      );
    }
    return rateLimit(`${scope}:${ip}`, limit * SHARED_BUCKET_MULTIPLIER, windowMs);
  }
  return rateLimit(`${scope}:${ip}`, limit, windowMs);
}
