/**
 * Baixa as fotos de demonstração do Wikimedia Commons (listadas em image-sources.json),
 * confere tipo e licença, envia ao bucket `menu-images` e liga aos produtos e à home.
 *
 * Uso: npm run seed:images   (precisa de .env.local com a chave de serviço)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const UA = { "User-Agent": "MenuQRPortfolio/1.0 (portfolio demo; image seeding)" };
const OK_LICENSE = /^(CC0|Public domain|PD|CC BY(-SA)?)/i;
const MAX_BYTES = 3 * 1024 * 1024;
const sources = JSON.parse(
  readFileSync(new URL("./image-sources.json", import.meta.url), "utf8"),
);

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (!url || !key) {
  console.error(
    "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (.env.local).",
  );
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const result = await fn();
    if (result) return result;
    await sleep(4000 * attempt);
  }
  return null;
}

async function commonsInfo(title) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({
    action: "query",
    format: "json",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "900",
  }).forEach(([k, v]) => api.searchParams.set(k, v));
  return withRetry(async () => {
    const r = await fetch(api, { headers: UA });
    try {
      const page = Object.values((await r.json()).query.pages)[0];
      return page.imageinfo?.[0] ?? null;
    } catch {
      return null;
    }
  });
}

let failures = 0;
for (const [name, title] of Object.entries(sources)) {
  const info = await commonsInfo(title);
  const license = info?.extmetadata?.LicenseShortName?.value ?? "";
  if (!info || info.mime !== "image/jpeg" || !OK_LICENSE.test(license)) {
    console.log(
      `PULADO ${name}: arquivo ou licença inválidos (${license || "sem licença"})`,
    );
    failures++;
    continue;
  }
  const buf = await withRetry(async () => {
    const r = await fetch(info.thumburl, { headers: UA });
    return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
  });
  const jpeg = buf && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (!buf || !jpeg || buf.length > MAX_BYTES) {
    console.log(`PULADO ${name}: download inválido`);
    failures++;
    continue;
  }

  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const path = `seed/${slug}.jpg`;
  const up = await db.storage
    .from("menu-images")
    .upload(path, buf, { contentType: "image/jpeg", upsert: true });
  if (up.error) {
    console.log(`ERRO ${name}: ${up.error.message}`);
    failures++;
    continue;
  }
  const publicUrl = db.storage.from("menu-images").getPublicUrl(path).data.publicUrl;
  const res =
    name === "__hero"
      ? await db.from("restaurant_settings").update({ hero_url: publicUrl }).eq("id", 1)
      : await db.from("products").update({ image_url: publicUrl }).eq("name", name);
  console.log(
    `${res.error ? "ERRO" : "ok  "} ${name} (${Math.round(buf.length / 1024)} KB, ${license})`,
  );
  if (res.error) failures++;
  await sleep(1500);
}
process.exit(failures ? 1 : 0);
