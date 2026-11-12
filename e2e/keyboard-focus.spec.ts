import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

/** Descrição curta do elemento com foco (para decidir onde parar e para mensagens de falha). */
const active = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const label =
      el.getAttribute("aria-label") ||
      (el as HTMLInputElement).labels?.[0]?.textContent ||
      el.textContent ||
      el.getAttribute("name") ||
      "";
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id,
      type: el.getAttribute("type") ?? "",
      text: label.trim().replace(/\s+/g, " ").slice(0, 60),
    };
  });

/** Aperta Tab até o elemento que satisfaz `match`; falha se passar de `max` tentativas. */
async function tabTo(
  page: Page,
  match: (e: NonNullable<Awaited<ReturnType<typeof active>>>) => boolean,
  what: string,
  max = 120,
  key: "Tab" | "Shift+Tab" = "Tab",
) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(key);
    const e = await active(page);
    if (e && match(e)) return e;
  }
  throw new Error(`Não foi possível chegar a "${what}" só com Tab (${max} tentativas).`);
}

/** Percorre todos os elementos focáveis e confere que cada um mostra um indicador de foco. */
async function auditFocus(page: Page) {
  const seen = new Set<string>();
  const failures: string[] = [];
  let stops = 0;
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let i = 0; i < 200; i++) {
    await page.keyboard.press("Tab");
    const res = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
      const shadow = cs.boxShadow !== "none";
      const r = el.getBoundingClientRect();
      return {
        key: `${el.tagName}|${el.id}|${el.getAttribute("name")}|${(el.textContent || "").trim().slice(0, 30)}|${Math.round(r.top)}|${Math.round(r.left)}`,
        visible: outline || shadow,
        desc: `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} "${(el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || "").trim().slice(0, 30)}"`,
      };
    });
    if (!res) break;
    if (seen.has(res.key)) break; // deu a volta
    seen.add(res.key);
    stops++;
    if (!res.visible) failures.push(res.desc);
  }
  return { stops, failures };
}

test.describe("teclado e foco (público)", () => {
  test("pedido completo usando só o teclado", async ({ page }) => {
    await page.goto("/");

    // 1) O primeiro Tab leva ao link "Pular para o conteúdo", e Enter move o foco para o conteúdo.
    await page.keyboard.press("Tab");
    expect((await active(page))?.text).toBe("Pular para o conteúdo");
    await page.keyboard.press("Enter");
    await expect(page.locator("#conteudo")).toBeFocused();

    // 2) Abre o Burger Oliva.
    await tabTo(
      page,
      (e) => e.tag === "a" && /Burger Oliva/.test(e.text),
      "link Burger Oliva",
    );
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/produto\//);

    // 3) Escolhe o ponto da carne (grupo obrigatório) com a barra de espaço e adiciona.
    // Um grupo de radios recebe UM Tab; as setas escolhem dentro dele (comportamento nativo).
    await tabTo(page, (e) => e.type === "radio", "grupo Ponto da carne");
    await page.keyboard.press("ArrowDown"); // Mal passado -> Ao ponto
    await expect(page.getByLabel("Ao ponto")).toBeChecked();
    await tabTo(
      page,
      (e) => e.tag === "button" && /Adicionar/.test(e.text),
      "botão Adicionar",
    );
    await page.keyboard.press("Enter");
    await page.waitForURL((u) => u.pathname === "/");

    // 4) Carrinho -> Continuar. Depois de navegar, o foco começa no conteúdo e o link do carrinho
    // fica no cabeçalho, antes dele: Shift+Tab leva até lá (comportamento padrão de SPA).
    await tabTo(
      page,
      (e) => e.tag === "a" && /Carrinho/.test(e.text),
      "link Carrinho",
      20,
      "Shift+Tab",
    );
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/carrinho/);
    await tabTo(page, (e) => e.tag === "a" && e.text === "Continuar", "link Continuar");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/checkout/);

    // 5) Preenche o formulário digitando e confirma com Enter.
    await tabTo(page, (e) => e.id === "name", "campo Nome");
    await page.keyboard.type("Teste Teclado");
    await tabTo(page, (e) => e.id === "phone", "campo Telefone");
    await page.keyboard.type("11900000000");
    await tabTo(
      page,
      (e) => e.tag === "button" && /Confirmar pedido/.test(e.text),
      "botão Confirmar",
    );
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/pedido\/[a-f0-9]{64}$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("#");
  });

  test("checkout: erros aparecem, ligados aos campos, e o foco vai ao primeiro inválido", async ({
    page,
  }) => {
    // Carrinho mínimo para abrir o checkout.
    await page.goto("/");
    await page.evaluate(() => {
      const id = document
        .querySelector<HTMLAnchorElement>("a[href^='/produto/']")!
        .href.split("/")
        .pop();
      localStorage.setItem(
        "menuqr.cart.v1",
        JSON.stringify([
          {
            key: "k",
            productId: id,
            name: "x",
            imageUrl: null,
            basePriceCents: 100,
            quantity: 1,
            note: "",
            options: [],
          },
        ]),
      );
    });
    await page.goto("/checkout");
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    await expect(page.locator("#name-error")).toHaveText("Informe seu nome.");
    await expect(page.locator("#phone-error")).toHaveText("Informe seu telefone.");
    await expect(page.locator("#name")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#name")).toHaveAttribute("aria-describedby", "name-error");
    await expect(page.locator("#phone")).toHaveAttribute(
      "aria-describedby",
      "phone-error",
    );
    await expect(
      page.locator("#name"),
      "o foco deve ir ao primeiro campo inválido",
    ).toBeFocused();
  });

  test("todo elemento focável mostra indicador de foco", async ({ page }) => {
    const report: string[] = [];
    for (const path of ["/", "/admin/login"]) {
      await page.goto(path);
      const { stops, failures } = await auditFocus(page);
      report.push(`${path}: ${stops} paradas`);
      expect(stops, `${path} sem elementos focáveis`).toBeGreaterThan(2);
      expect(failures, `${path}: foco invisível em ${failures.join(", ")}`).toEqual([]);
    }
    // Produto, carrinho e checkout.
    await page.goto("/");
    await page
      .getByRole("link", { name: /Burger Oliva/ })
      .first()
      .click();
    await page.waitForURL(/\/produto\//);
    const prod = await auditFocus(page);
    expect(prod.failures, `produto: ${prod.failures.join(", ")}`).toEqual([]);
    await page.getByLabel("Ao ponto").check();
    await page.getByRole("button", { name: /Adicionar/ }).click();
    for (const path of ["/carrinho", "/checkout"]) {
      await page.goto(path);
      const r = await auditFocus(page);
      expect(r.stops, path).toBeGreaterThan(2);
      expect(r.failures, `${path}: ${r.failures.join(", ")}`).toEqual([]);
    }
    console.log(report.join(" | "), `| produto: ${prod.stops} paradas`);
  });
});

test.describe("teclado e foco (admin)", () => {
  test.skip(!email || !password, "Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD.");

  test("telas do admin: foco visível em todos os elementos e link de pular", async ({
    page,
  }) => {
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
      // 1) Página inteira desde o topo: link de pular, menu lateral e conteúdo.
      await page.goto(path);
      const { stops, failures } = await auditFocus(page);
      expect(stops, `${path}: o menu deveria ter paradas`).toBeGreaterThan(8);
      expect(failures, `${path}: foco invisível em ${failures.join(", ")}`).toEqual([]);

      // 2) O primeiro Tab é o link de pular, e Enter leva o foco ao conteúdo.
      await page.goto(path);
      await page.keyboard.press("Tab");
      expect((await active(page))?.text, `${path}: primeiro Tab`).toBe(
        "Pular para o conteúdo",
      );
      await page.keyboard.press("Enter");
      await expect(page.locator("#conteudo"), `${path}: pular`).toBeFocused();
    }
  });
});
