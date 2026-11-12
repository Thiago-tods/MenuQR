import { expect, test, type Page } from "@playwright/test";

const jsqrPath = require.resolve("jsqr/dist/jsQR.js");

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

/** Alvos de toque menores que 24x24 px (mínimo do WCAG 2.5.8, nível AA). */
const tinyTargets = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(
      "a[href], button, input, select, textarea, summary",
    )) {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (el.matches("input[type=hidden]") || el.closest("[hidden]")) continue;
      // Link de pular: invisível até receber foco (sr-only), não é alvo de toque.
      if (el.classList.contains("sr-only")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Radio e checkbox pequenos estão dentro de um <label> de 44 px: vale a área do label.
      const target = el.matches("input[type=radio], input[type=checkbox]")
        ? (el.closest("label") ?? el)
        : el;
      const t = target.getBoundingClientRect();
      if (t.width < 24 || t.height < 24)
        out.push(
          `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 25)}" ${Math.round(t.width)}x${Math.round(t.height)}`,
        );
    }
    return out;
  });

const viewports = [
  { name: "celular 375", width: 375, height: 812 },
  { name: "tablet 768", width: 768, height: 1024 },
  { name: "tablet 1024", width: 1024, height: 768 },
  { name: "desktop 1280", width: 1280, height: 800 },
];

test.describe("responsividade (emulação de viewport, não dispositivos reais)", () => {
  for (const vp of viewports) {
    test(`páginas públicas em ${vp.name}: sem rolagem horizontal e alvos de toque ok`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await page
        .getByRole("link", { name: /Burger Oliva/ })
        .first()
        .click();
      await page.waitForURL(/\/produto\//);
      const productUrl = page.url();
      await page.getByLabel("Ao ponto").check();
      await page.getByRole("button", { name: /Adicionar/ }).click();

      for (const path of ["/", productUrl, "/carrinho", "/checkout"]) {
        await page.goto(path);
        await page.waitForLoadState("load");
        const w = await noHorizontalScroll(page);
        expect(
          w.scrollWidth,
          `${path} em ${vp.name}: rolagem horizontal`,
        ).toBeLessThanOrEqual(w.innerWidth + 1);
        const tiny = await tinyTargets(page);
        expect(tiny, `${path} em ${vp.name}: alvos < 24px`).toEqual([]);
      }
    });
  }

  test.describe("admin", () => {
    test.skip(!email || !password, "Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD.");

    for (const vp of viewports.filter((v) => v.width >= 768)) {
      test(`painel em ${vp.name}: sem rolagem horizontal na página e menu visível`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto("/admin/login");
        await page.getByLabel("E-mail").fill(email!);
        await page.getByLabel("Senha").fill(password!);
        await page.getByRole("button", { name: "Entrar" }).click();
        await page.waitForURL("**/admin");

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
          await page.goto(path);
          await page.waitForLoadState("load");
          const w = await noHorizontalScroll(page);
          expect(
            w.scrollWidth,
            `${path} em ${vp.name}: rolagem horizontal da página`,
          ).toBeLessThanOrEqual(w.innerWidth + 1);
          await expect(
            page.getByRole("navigation", { name: "Administração" }),
            path,
          ).toBeVisible();
          const tiny = await tinyTargets(page);
          expect(tiny, `${path} em ${vp.name}: alvos < 24px`).toEqual([]);
        }
      });
    }
  });
});

test.describe("QR Code", () => {
  test.skip(!email || !password, "Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD.");

  test("os QR Codes gerados decodificam para a URL exibida e abrem a rota certa", async ({
    page,
    baseURL,
  }) => {
    await page.goto("/admin/login");
    await page.getByLabel("E-mail").fill(email!);
    await page.getByLabel("Senha").fill(password!);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL("**/admin");
    await page.goto("/admin/qr-code");
    await expect(page.locator("figure img").first()).toBeVisible();
    await page.addScriptTag({ path: jsqrPath });

    const decoded = await page.evaluate(async () => {
      type JsQR = (d: Uint8ClampedArray, w: number, h: number) => { data: string } | null;
      const jsQR = (window as unknown as { jsQR: JsQR }).jsQR;
      const out: { shown: string; decoded: string | null; title: string }[] = [];
      for (const fig of document.querySelectorAll("figure")) {
        const img = fig.querySelector("img")!;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, c.width, c.height);
        const res = jsQR(px.data, c.width, c.height);
        out.push({
          shown: fig.querySelector("p")?.textContent ?? "",
          decoded: res?.data ?? null,
          title: fig.querySelector("figcaption")?.textContent ?? "",
        });
      }
      return out;
    });

    expect(decoded.length).toBeGreaterThanOrEqual(2); // cardápio + ao menos uma mesa
    for (const q of decoded) {
      expect(q.decoded, `QR "${q.title}" não foi lido`).not.toBeNull();
      expect(q.decoded, `QR "${q.title}" difere da URL exibida`).toBe(q.shown);
    }

    // O QR de uma mesa leva ao cardápio já identificado (usando o servidor de teste no lugar do domínio).
    const table = decoded.find((q) => q.decoded?.includes("?mesa="))!;
    const code = new URL(table.decoded!).searchParams.get("mesa")!;
    expect(code).toMatch(/^[a-f0-9]{64}$/);
    await page.goto(`${baseURL}/?mesa=${code}`);
    await expect(page.getByText(new RegExp(`Você está na ${table.title}`))).toBeVisible();

    // O QR do cardápio não leva parâmetros nem um domínio fictício.
    const menu = decoded.find((q) => !q.decoded!.includes("?"))!;
    expect(new URL(menu.decoded!).pathname).toBe("/");
    expect(menu.decoded).not.toMatch(/example\.|seusite|seudominio|restaurante\.com/i);
  });
});
