import { expect, test } from "@playwright/test";

/**
 * Fluxo completo cliente + admin. Exige Supabase configurado, seed aplicado e um
 * usuário admin (variáveis E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD). Sem isso, é ignorado.
 */
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.describe("pedido ponta a ponta", () => {
  test.skip(
    !email || !password,
    "Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD (veja docs/TESTING.md).",
  );

  test("cliente pede, admin atualiza, cliente vê", async ({ page, browser }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Casa Oliva" })).toBeVisible();

    await page
      .getByRole("link", { name: /Burger Oliva/ })
      .first()
      .click();
    await page.getByLabel("Ao ponto").check();
    await page.getByRole("button", { name: /Adicionar/ }).click();

    await page.goto("/checkout");
    await page.getByLabel("Nome").fill("Cliente E2E");
    await page.getByLabel(/Telefone/).fill("11999990000");
    await page.getByRole("button", { name: "Confirmar pedido" }).click();
    await page.waitForURL(/\/pedido\/[a-f0-9]{64}$/);
    const trackingUrl = page.url();
    await expect(page.getByText("Recebido").first()).toBeVisible();

    // Número do pedido deste teste, para o admin abrir exatamente ele.
    const heading = await page.getByRole("heading", { level: 1 }).innerText();
    const orderNumber = heading.replace(/\D/g, "");

    const adminCtx = await browser.newContext();
    const admin = await adminCtx.newPage();
    await admin.goto("/admin/login");
    await admin.getByLabel("E-mail").fill(email!);
    await admin.getByLabel("Senha").fill(password!);
    await admin.getByRole("button", { name: "Entrar" }).click();
    await admin.waitForURL("**/admin");

    await admin.goto(`/admin/orders?q=${orderNumber}`);
    await admin.getByRole("link", { name: `#${orderNumber}`, exact: true }).click();
    await expect(admin.getByText("Status: Recebido")).toBeVisible();

    // Segunda tela aberta no mesmo pedido (antes da mudança).
    const stale = await adminCtx.newPage();
    await stale.goto(admin.url());

    await admin.getByRole("button", { name: /confirmado/i }).click();
    await expect(admin.getByText("Status: Confirmado")).toBeVisible({ timeout: 15_000 });

    // A tela desatualizada tenta confirmar de novo: deve avisar, não quebrar.
    await stale.getByRole("button", { name: /confirmado/i }).click();
    await expect(stale).toHaveURL(/erro=pedido-status-invalido/);
    await expect(
      stale.getByText(
        "Esta ação não está mais disponível para o status atual do pedido.",
      ),
    ).toBeVisible({ timeout: 15_000 });
    await expect(stale.getByText("This page couldn’t load")).toHaveCount(0);

    await page.goto(trackingUrl);
    await expect(page.getByText("Confirmado").first()).toBeVisible();
    await adminCtx.close();
  });

  test("?erro= só exibe mensagens fixas, nunca o texto da URL", async ({ browser }) => {
    const ctx = await browser.newContext();
    const admin = await ctx.newPage();
    await admin.goto("/admin/login");
    await admin.getByLabel("E-mail").fill(email!);
    await admin.getByLabel("Senha").fill(password!);
    await admin.getByRole("button", { name: "Entrar" }).click();
    await admin.waitForURL("**/admin");

    const dialogs: string[] = [];
    admin.on("dialog", (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });

    const attacks = [
      '<img src=x onerror="alert(1)">',
      "<script>alert(1)</script>",
      "Sua conta foi bloqueada. Ligue 0800-000-000",
      "__proto__",
    ];
    for (const attack of attacks) {
      await admin.goto(`/admin/categories?erro=${encodeURIComponent(attack)}`);
      await expect(admin.getByText("Ocorreu um erro. Tente novamente.")).toBeVisible();
      const html = await admin.content();
      expect(html).not.toContain("Sua conta foi bloqueada");
      expect(html).not.toContain("onerror=");
      await expect(admin.locator("main img[src='x']")).toHaveCount(0);
    }

    // Código conhecido mostra o texto fixo correspondente.
    await admin.goto("/admin/categories?erro=categoria-com-produtos");
    await expect(admin.getByText(/A categoria tem produtos/)).toBeVisible();
    expect(dialogs).toEqual([]);
    await ctx.close();
  });
});

test("login mostra o aviso fixo de acesso negado e ignora texto arbitrário", async ({
  page,
}) => {
  await page.goto("/admin/login?erro=acesso-negado");
  await expect(page.getByText("Você não tem permissão para esta ação.")).toBeVisible();
  await page.goto("/admin/login?erro=" + encodeURIComponent("<b>falso</b>"));
  await expect(page.getByText("Ocorreu um erro. Tente novamente.")).toBeVisible();
  await expect(page.locator("b", { hasText: "falso" })).toHaveCount(0);
});

test("rota admin exige login", async ({ page }) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login/);
});
