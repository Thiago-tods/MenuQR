import { isIP } from "node:net";

/**
 * IP do cliente para limitar requisições. Cabeçalhos de proxy podem ser forjados por
 * quem acessa o app diretamente, então só são lidos quando a hospedagem confiável é
 * declarada em TRUSTED_PROXY. Sem isso, nenhum valor enviado pelo cliente é usado.
 */
export type ProxyMode = "vercel" | "cloudflare" | "none";

export const UNKNOWN_IP = "unknown";

export function proxyModeFromEnv(value: string | undefined): ProxyMode {
  const v = value?.trim().toLowerCase();
  return v === "vercel" || v === "cloudflare" ? v : "none";
}

type HeaderReader = { get(name: string): string | null };

function validIp(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v && isIP(v) ? v : null;
}

/** IPv4 como está; IPv6 reduzido ao prefixo /64 (um cliente controla o /64 inteiro). */
export function normalizeIp(ip: string): string {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];
  if (isIP(ip) !== 6) return ip;

  const [head, tail = ""] = ip.toLowerCase().split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = ip.includes("::") && tail ? tail.split(":") : [];
  const missing = ip.includes("::") ? 8 - headGroups.length - tailGroups.length : 0;
  const groups = [...headGroups, ...Array(Math.max(missing, 0)).fill("0"), ...tailGroups];
  return groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ""))
    .join(":")
    .concat("::/64");
}

export function getClientIp(headers: HeaderReader, mode: ProxyMode): string {
  let raw: string | null = null;
  if (mode === "vercel") {
    // A Vercel sobrescreve estes cabeçalhos; valores enviados pelo cliente não chegam ao app.
    raw =
      validIp(headers.get("x-real-ip")) ??
      validIp(headers.get("x-vercel-forwarded-for")) ??
      validIp(headers.get("x-forwarded-for")?.split(",")[0]);
  } else if (mode === "cloudflare") {
    raw = validIp(headers.get("cf-connecting-ip"));
  }
  return raw ? normalizeIp(raw) : UNKNOWN_IP;
}
