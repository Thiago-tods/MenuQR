/**
 * Auditoria de acessibilidade com axe-core (WCAG 2.0/2.1 A e AA + boas práticas) nas telas
 * públicas e do admin. Cria um pedido de demonstração para auditar acompanhamento e detalhe.
 *
 * Uso: $env:E2E_BASE_URL="http://localhost:3000"; $env:E2E_ADMIN_EMAIL="..."; $env:E2E_ADMIN_PASSWORD="..."
 *      npm run a11y
 */
import { chromium, devices } from "@playwright/test";
import { createRequire } from "node:module";
import { forceOpen } from "./lib/open-hours.mjs";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const { E2E_ADMIN_EMAIL: email, E2E_ADMIN_PASSWORD: password } = process.env;
if (!email || !password) {
  console.error("Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD (admin de teste).");
  process.exit(1);
}

// O checkout recusa pedidos fora do horário; abre 24 h e restaura no final.
const restoreHours = await forceOpen();
let violations = 0;
let screens = 0;
try {
  const browser = await chromium.launch();

  async function audit(page, name) {
    await page.waitForLoadState("load");
    await page.waitForTimeout(600);
    await page.addScriptTag({ path: axePath });
    const res = await page.evaluate(() =>
      axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
        },
      }),
    );
    screens++;
    if (res.violations.length === 0) console.log("OK    ", name);
    for (const v of res.violations) {
      violations += v.nodes.length;
      console.log(
        `FALHA  ${name} | ${v.id} (${v.impact}) x${v.nodes.length} | ${v.help}`,
      );
      for (const n of v.nodes.slice(0, 2)) {
        console.log(
          "         ",
          n.target.join(" "),
          "|",
          (n.failureSummary || "").split("\n")[1]?.trim().slice(0, 110),
        );
      }
    }
  }

  // ---- público (celular) ----
  const phone = await browser.newContext({ ...devices["Pixel 7"], baseURL: base });
  const p = await phone.newPage();
  await p.goto("/");
  await audit(p, "home");
  await p
    .getByRole("link", { name: /Burger Oliva/ })
    .first()
    .click();
  await p.waitForURL(/produto/);
  await audit(p, "produto");
  await p.getByLabel("Ao ponto").check();
  await p.getByRole("button", { name: /Adicionar/ }).click();
  await p.waitForURL(base + "/");
  await p.goto("/carrinho");
  await audit(p, "carrinho");
  await p.goto("/checkout");
  await audit(p, "checkout");
  await p.getByLabel("Nome").fill("Auditoria A11y");
  await p.getByLabel(/Telefone/).fill("11900000000");
  await p.getByRole("button", { name: "Confirmar pedido" }).click();
  await p.waitForURL(/\/pedido\/[a-f0-9]{64}$/);
  await audit(p, "acompanhamento");
  const orderNumber = (await p.getByRole("heading", { level: 1 }).innerText()).replace(
    /\D/g,
    "",
  );

  // ---- admin (desktop) ----
  const desk = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    baseURL: base,
  });
  const a = await desk.newPage();
  await a.goto("/admin/login");
  await audit(a, "admin/login");
  await a.goto("/admin/login?erro=acesso-negado");
  await audit(a, "admin/login (com aviso de erro)");
  await a.getByLabel("E-mail").fill(email);
  await a.getByLabel("Senha").fill(password);
  await a.getByRole("button", { name: "Entrar" }).click();
  await a.waitForURL("**/admin");
  for (const path of [
    "/admin",
    "/admin/orders",
    "/admin/products",
    "/admin/products/new",
    "/admin/categories",
    "/admin/complements",
    "/admin/qr-code",
    "/admin/settings",
  ]) {
    await a.goto(path);
    await audit(a, path);
  }
  await a.goto(`/admin/orders?q=${orderNumber}`);
  await a.getByRole("link", { name: `#${orderNumber}`, exact: true }).click();
  await a.waitForURL(/\/admin\/orders\/[0-9a-f-]{36}$/);
  await audit(a, "/admin/orders/[id]");
  await a.goto(`${a.url()}?erro=pedido-mudou`);
  await audit(a, "/admin/orders/[id] (com aviso de erro)");

  await browser.close();
} finally {
  await restoreHours();
}
console.log(`\n${screens} telas auditadas, ${violations} violação(ões).`);
process.exit(violations ? 1 : 0);
