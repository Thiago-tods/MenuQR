/**
 * Gera as capturas de tela de docs/screenshots percorrendo o app de verdade:
 * faz um pedido como cliente e navega no admin. Grava um pedido de demonstração no banco.
 *
 * Uso (com o app rodando e o Chromium instalado):
 *   $env:E2E_BASE_URL="http://localhost:3000"; $env:E2E_ADMIN_EMAIL="..."; $env:E2E_ADMIN_PASSWORD="..."
 *   npm run screenshots
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { forceOpen } from "./lib/open-hours.mjs";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const { E2E_ADMIN_EMAIL: email, E2E_ADMIN_PASSWORD: password } = process.env;
if (!email || !password) {
  console.error("Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD (admin de teste).");
  process.exit(1);
}
const out = new URL("../docs/screenshots/", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1",
);
mkdirSync(out, { recursive: true });

// O checkout recusa pedidos fora do horário; abre 24 h e restaura no final.
const restoreHours = await forceOpen();
try {
  const browser = await chromium.launch();
  const settle = async (page) => {
    await page.waitForLoadState("load").catch(() => {});
    // Espera só as imagens visíveis na tela (as de baixo são preguiçosas) e no máximo 8 s.
    await page
      .evaluate(() => {
        const visible = [...document.images].filter((i) => {
          const r = i.getBoundingClientRect();
          return r.bottom > 0 && r.top < window.innerHeight;
        });
        const wait = Promise.all(
          visible.map((i) =>
            i.complete
              ? 0
              : new Promise((r) => {
                  i.onload = i.onerror = r;
                }),
          ),
        );
        return Promise.race([wait, new Promise((r) => setTimeout(r, 8000))]);
      })
      .catch(() => {});
    await page.waitForTimeout(500);
  };
  const shot = async (page, name, opts = {}) => {
    await settle(page);
    await page.screenshot({ path: `${out}${name}.png`, ...opts });
    console.log("ok", name);
  };

  // ---------- cliente (celular) ----------
  const phone = await browser.newContext({
    ...devices["Pixel 7"],
    baseURL: base,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  const m = await phone.newPage();
  await m.goto("/");
  await shot(m, "01-home-mobile");

  await m
    .getByRole("link", { name: /Burger Oliva/ })
    .first()
    .click();
  await m.getByLabel("Ao ponto").check();
  await m.getByLabel("Bacon").check();
  await m.evaluate(() => window.scrollTo(0, 0));
  await shot(m, "02-produto-mobile");
  await m.getByText("Ponto da carne").scrollIntoViewIfNeeded();
  await m.evaluate(() => window.scrollBy(0, -90));
  await shot(m, "02b-produto-complementos-mobile");
  await m.getByRole("button", { name: /Adicionar/ }).click();
  await m.waitForURL(base + "/");

  await m.goto("/carrinho");
  await shot(m, "03-carrinho-mobile");

  await m.goto("/checkout");
  await m.getByLabel("Nome").fill("Cliente Demo");
  await m.getByLabel(/Telefone/).fill("11900000000");
  await shot(m, "04-checkout-mobile");
  await m.getByRole("button", { name: "Confirmar pedido" }).click();
  await m.waitForURL(/\/pedido\/[a-f0-9]{64}$/);
  await shot(m, "05-acompanhamento-mobile");
  const trackingUrl = m.url();
  const orderNumber = (await m.getByRole("heading", { level: 1 }).innerText()).replace(
    /\D/g,
    "",
  );

  // ---------- home em desktop ----------
  const desk = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    baseURL: base,
    locale: "pt-BR",
  });
  const d = await desk.newPage();
  await d.goto("/");
  await shot(d, "06-home-desktop");

  // ---------- admin (desktop) ----------
  await d.goto("/admin/login");
  await shot(d, "10-admin-login");
  await d.getByLabel("E-mail").fill(email);
  await d.getByLabel("Senha").fill(password);
  await d.getByRole("button", { name: "Entrar" }).click();
  await d.waitForURL("**/admin");
  await shot(d, "11-admin-dashboard");

  await d.goto("/admin/orders");
  await shot(d, "12-admin-pedidos");
  await d.getByRole("link", { name: `#${orderNumber}`, exact: true }).click();
  await d.getByRole("button", { name: /confirmado/i }).click();
  await d.getByText("Status: Confirmado").waitFor({ timeout: 20_000 });
  await shot(d, "13-admin-pedido", { fullPage: true });

  await m.goto(trackingUrl);
  await shot(m, "05-acompanhamento-mobile"); // agora com "Confirmado"

  for (const [path, name] of [
    ["/admin/products", "14-admin-produtos"],
    ["/admin/complements", "15-admin-complementos"],
    ["/admin/qr-code", "16-admin-qr-code"],
    ["/admin/settings", "17-admin-configuracoes"],
  ]) {
    await d.goto(path);
    await shot(
      d,
      name,
      name.includes("complementos") || name.includes("configuracoes") ? {} : {},
    );
  }

  // ---------- admin (tablet) ----------
  const tab = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    baseURL: base,
    locale: "pt-BR",
  });
  const t = await tab.newPage();
  await t.goto("/admin/login");
  await t.getByLabel("E-mail").fill(email);
  await t.getByLabel("Senha").fill(password);
  await t.getByRole("button", { name: "Entrar" }).click();
  await t.waitForURL("**/admin");
  await shot(t, "18-admin-dashboard-tablet");

  await browser.close();
} finally {
  await restoreHours();
}
