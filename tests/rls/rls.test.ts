import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  anonClient,
  createUser,
  env,
  expectBlocked,
  isDenied,
  P,
  svc,
  type TestUser,
} from "./helpers";

/**
 * Testes de RLS contra um Supabase REAL, com usuários reais (JWT por login com senha).
 * Rodar só em um projeto de TESTE: cria e apaga dados com o prefixo `rls-<id>`.
 *   RLS_TEST_ALLOW=yes npm run test:rls
 */
const suite = env.allowed ? describe : describe.skip;

type Fx = {
  catA: string;
  catB: string;
  pVis: string;
  pArch: string;
  pInInactiveCat: string;
  group: string;
  option: string;
  table: string;
  tableCode: string;
  orderA: { id: string; token: string; item: string; complement: string };
  orderB: { id: string; token: string };
};

suite("RLS (Supabase real, usuários reais)", () => {
  const admin = svc(); // só setup, verificação de estado e limpeza
  let fx: Fx;
  let adminUser: TestUser;
  let staffUser: TestUser;
  let outsider: TestUser;
  const anon = anonClient();
  const fixtureImagePath = `rls-tests/${P}-fixture.png`;
  const createdPaths: string[] = [fixtureImagePath];

  // PNG 1x1 válido.
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );

  type Row = Record<string, string>;
  const must = async (
    p: PromiseLike<{ data: unknown; error: unknown }>,
    what: string,
  ): Promise<Row> => {
    const { data, error } = await p;
    if (error || !data) throw new Error(`setup ${what}: ${JSON.stringify(error)}`);
    return data as Row;
  };

  beforeAll(async () => {
    if (!env.url || !env.anonKey || !env.serviceKey) {
      throw new Error(
        "Defina NEXT_PUBLIC_SUPABASE_URL, ..._ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    adminUser = await createUser(admin, "admin", "admin");
    staffUser = await createUser(admin, "staff", "staff");
    outsider = await createUser(admin, "outsider", null); // autenticado, sem perfil

    const catA = await must(
      admin
        .from("categories")
        .insert({ name: `${P} ativa`, slug: `${P}-ativa`, active: true })
        .select("id")
        .single(),
      "catA",
    );
    const catB = await must(
      admin
        .from("categories")
        .insert({ name: `${P} inativa`, slug: `${P}-inativa`, active: false })
        .select("id")
        .single(),
      "catB",
    );
    const prod = (name: string, category_id: string, archived = false) =>
      must(
        admin
          .from("products")
          .insert({ name: `${P} ${name}`, category_id, price: "10.00", archived })
          .select("id")
          .single(),
        name,
      );
    const pVis = await prod("visivel", catA.id);
    const pArch = await prod("arquivado", catA.id, true);
    const pInInactiveCat = await prod("em-categoria-inativa", catB.id);
    const group = await must(
      admin
        .from("complement_groups")
        .insert({ name: `${P} grupo`, min_select: 0, max_select: 2 })
        .select("id")
        .single(),
      "group",
    );
    const option = await must(
      admin
        .from("complement_options")
        .insert({ group_id: group.id, name: `${P} opcao`, price_delta: "1.00" })
        .select("id")
        .single(),
      "option",
    );
    await must(
      admin
        .from("product_complement_groups")
        .insert({ product_id: pVis.id, group_id: group.id })
        .select("product_id")
        .single(),
      "pcg",
    );
    const table = await must(
      admin
        .from("tables")
        .insert({ name: `${P} mesa` })
        .select("id, public_code")
        .single(),
      "table",
    );

    const order = async (who: string) => {
      const o = await must(
        admin
          .from("orders")
          .insert({
            customer_name: `${P} cliente ${who}`,
            customer_phone: "11999990000",
            mode: "PICKUP",
            subtotal: "11.00",
            total: "11.00",
          })
          .select("id, tracking_token")
          .single(),
        `order ${who}`,
      );
      return o;
    };
    const oA = await order("A");
    const oB = await order("B");
    const item = await must(
      admin
        .from("order_items")
        .insert({
          order_id: oA.id,
          product_id: pVis.id,
          product_name: "Item A",
          unit_price: "10.00",
          quantity: 1,
        })
        .select("id")
        .single(),
      "item",
    );
    const complement = await must(
      admin
        .from("order_item_complements")
        .insert({
          order_item_id: item.id,
          option_id: option.id,
          group_name: "G",
          name: "O",
          price: "1.00",
        })
        .select("id")
        .single(),
      "complement",
    );
    await must(
      admin
        .from("order_items")
        .insert({
          order_id: oB.id,
          product_name: "Item B",
          unit_price: "5.00",
          quantity: 1,
        })
        .select("id")
        .single(),
      "item B",
    );

    const up = await admin.storage
      .from("menu-images")
      .upload(fixtureImagePath, PNG, { contentType: "image/png" });
    if (up.error) throw new Error(`setup storage: ${up.error.message}`);

    fx = {
      catA: catA.id,
      catB: catB.id,
      pVis: pVis.id,
      pArch: pArch.id,
      pInInactiveCat: pInInactiveCat.id,
      group: group.id,
      option: option.id,
      table: table.id,
      tableCode: table.public_code,
      orderA: {
        id: oA.id,
        token: oA.tracking_token,
        item: item.id,
        complement: complement.id,
      },
      orderB: { id: oB.id, token: oB.tracking_token },
    };
  });

  afterAll(async () => {
    await admin.from("orders").delete().like("customer_name", `${P}%`);
    await admin.from("products").delete().like("name", `${P}%`);
    await admin.from("complement_groups").delete().like("name", `${P}%`);
    await admin.from("categories").delete().like("slug", `${P}%`);
    await admin.from("tables").delete().like("name", `${P}%`);
    await admin.storage.from("menu-images").remove(createdPaths);
    for (const u of [adminUser, staffUser, outsider]) {
      if (!u) continue;
      await admin.from("profiles").delete().eq("id", u.id);
      await admin.auth.admin.deleteUser(u.id);
    }
  });

  /** Estado das fixtures lido com service_role, para provar que tentativas de escrita não surtiram efeito. */
  const snapshot = async () => {
    const q = async (p: PromiseLike<{ data: unknown }>) => JSON.stringify((await p).data);
    return [
      await q(
        admin
          .from("categories")
          .select("id,name,active,sort_order")
          .like("slug", `${P}%`)
          .order("id"),
      ),
      await q(
        admin
          .from("products")
          .select("id,name,price,archived,available,featured")
          .like("name", `${P}%`)
          .order("id"),
      ),
      await q(
        admin
          .from("complement_groups")
          .select("id,name,min_select,max_select")
          .like("name", `${P}%`)
          .order("id"),
      ),
      await q(
        admin
          .from("complement_options")
          .select("id,name,price_delta,available")
          .eq("group_id", fx.group)
          .order("id"),
      ),
      await q(
        admin
          .from("product_complement_groups")
          .select("product_id,group_id")
          .eq("group_id", fx.group)
          .order("product_id"),
      ),
      await q(
        admin
          .from("tables")
          .select("id,name,active,public_code")
          .like("name", `${P}%`)
          .order("id"),
      ),
      await q(
        admin
          .from("orders")
          .select("id,status,total,subtotal,customer_name,tracking_token,table_id,notes")
          .like("customer_name", `${P}%`)
          .order("id"),
      ),
      await q(
        admin
          .from("order_items")
          .select("id,product_name,unit_price,quantity")
          .in("order_id", [fx.orderA.id, fx.orderB.id])
          .order("id"),
      ),
      await q(
        admin
          .from("order_item_complements")
          .select("id,name,price")
          .eq("order_item_id", fx.orderA.item)
          .order("id"),
      ),
      await q(
        admin
          .from("order_status_history")
          .select("id,from_status,to_status,changed_by")
          .in("order_id", [fx.orderA.id, fx.orderB.id])
          .order("id"),
      ),
      await q(
        admin.from("profiles").select("id,role").like("full_name", `${P}%`).order("id"),
      ),
      await q(
        admin
          .from("restaurant_settings")
          .select("name,description,estimated_minutes,accepting_orders,closed_message"),
      ),
    ];
  };

  const objectExists = async (path: string) => {
    const dir = path.split("/").slice(0, -1).join("/");
    const { data } = await admin.storage.from("menu-images").list(dir, { limit: 1000 });
    return (data ?? []).some((o) => o.name === path.split("/").at(-1));
  };

  const countByName = async (table: string, column: string, like: string) => {
    const { count } = await admin
      .from(table)
      .select("*", { count: "exact", head: true })
      .like(column, like);
    return count ?? 0;
  };

  // ---------------------------------------------------------------------------------------
  // Papéis sem privilégio: anon (sem login), outsider (logado sem perfil), staff (perfil não admin)
  // ---------------------------------------------------------------------------------------
  const roles = (): [string, SupabaseClient][] => [
    ["anon (sem login)", anon],
    ["usuário logado sem perfil", outsider.client],
    ["staff (não admin)", staffUser.client],
  ];

  describe.each([0, 1, 2])("papel sem privilégio #%i", (idx) => {
    const role = () => roles()[idx];

    it("lê só o que o cardápio público precisa", async () => {
      const [, c] = role();
      const settings = await c.from("restaurant_settings").select("name");
      expect(settings.error).toBeNull();
      expect(settings.data).toHaveLength(1);

      const cats = await c.from("categories").select("id").like("slug", `${P}%`);
      const catIds = (cats.data ?? []).map((r) => r.id);
      expect(catIds).toContain(fx.catA);
      expect(catIds, "categoria inativa não deve aparecer").not.toContain(fx.catB);

      const prods = await c.from("products").select("id").like("name", `${P}%`);
      const prodIds = (prods.data ?? []).map((r) => r.id);
      expect(prodIds).toContain(fx.pVis);
      expect(prodIds, "produto arquivado não deve aparecer").not.toContain(fx.pArch);

      for (const [table, col, val] of [
        ["complement_groups", "id", fx.group],
        ["complement_options", "id", fx.option],
        ["product_complement_groups", "group_id", fx.group],
      ] as const) {
        const r = await c.from(table).select("*").eq(col, val);
        expect(r.error, table).toBeNull();
        expect(r.data?.length, table).toBeGreaterThan(0);
      }
    });

    it("produtos de categoria inativa não vazam pela API", async () => {
      const [, c] = role();
      const r = await c.from("products").select("id").eq("id", fx.pInInactiveCat);
      expect(
        r.data ?? [],
        "produto de categoria desativada visível pela API",
      ).toHaveLength(0);
    });

    it("não lê tabelas sensíveis (mesas, pedidos, itens, histórico, perfis alheios)", async () => {
      const [, c] = role();
      for (const t of [
        "tables",
        "orders",
        "order_items",
        "order_item_complements",
        "order_status_history",
      ]) {
        const r = await c.from(t).select("*");
        expect(r.data ?? [], `${t} legível`).toHaveLength(0);
      }
      const profiles = await c.from("profiles").select("id").like("full_name", `${P}%`);
      const ids = (profiles.data ?? []).map((p) => p.id);
      expect(ids).not.toContain(adminUser.id);
      if (idx === 2)
        expect(ids).toEqual([staffUser.id]); // staff só vê o próprio perfil
      else expect(ids).toHaveLength(0);
    });

    it("conhecer um token ou id de pedido não dá acesso (isolamento entre clientes)", async () => {
      const [, c] = role();
      const byToken = await c
        .from("orders")
        .select("*")
        .eq("tracking_token", fx.orderA.token);
      expect(byToken.data ?? []).toHaveLength(0);
      const byId = await c.from("orders").select("*").eq("id", fx.orderB.id);
      expect(byId.data ?? []).toHaveLength(0);
      const items = await c.from("order_items").select("*").eq("order_id", fx.orderA.id);
      expect(items.data ?? []).toHaveLength(0);
      const complements = await c
        .from("order_item_complements")
        .select("*")
        .eq("order_item_id", fx.orderA.item);
      expect(complements.data ?? []).toHaveLength(0);
      const history = await c
        .from("order_status_history")
        .select("*")
        .eq("order_id", fx.orderA.id);
      expect(history.data ?? []).toHaveLength(0);
    });

    it("não consegue INSERIR em nenhuma tabela", async () => {
      const [, c] = role();
      const n = `${P}-intruso`;
      const attempts: [
        string,
        PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>,
      ][] = [
        ["categories", c.from("categories").insert({ name: n, slug: n }).select()],
        [
          "products",
          c
            .from("products")
            .insert({ name: n, category_id: fx.catA, price: "1.00" })
            .select(),
        ],
        [
          "complement_groups",
          c
            .from("complement_groups")
            .insert({ name: n, min_select: 0, max_select: 1 })
            .select(),
        ],
        [
          "complement_options",
          c.from("complement_options").insert({ group_id: fx.group, name: n }).select(),
        ],
        [
          "product_complement_groups",
          c
            .from("product_complement_groups")
            .insert({ product_id: fx.pArch, group_id: fx.group })
            .select(),
        ],
        ["tables", c.from("tables").insert({ name: n }).select()],
        [
          "orders",
          c
            .from("orders")
            .insert({
              customer_name: n,
              customer_phone: "11999990000",
              mode: "PICKUP",
              subtotal: "0",
              total: "0",
            })
            .select(),
        ],
        [
          "order_items",
          c
            .from("order_items")
            .insert({
              order_id: fx.orderA.id,
              product_name: n,
              unit_price: "0",
              quantity: 1,
            })
            .select(),
        ],
        [
          "order_item_complements",
          c
            .from("order_item_complements")
            .insert({ order_item_id: fx.orderA.item, group_name: n, name: n, price: "0" })
            .select(),
        ],
        [
          "order_status_history",
          c
            .from("order_status_history")
            .insert({ order_id: fx.orderA.id, to_status: "COMPLETED" })
            .select(),
        ],
      ];
      for (const [table, p] of attempts) expectBlocked(await p, `INSERT ${table}`);

      expect(await countByName("categories", "name", n)).toBe(0);
      expect(await countByName("products", "name", n)).toBe(0);
      expect(await countByName("complement_groups", "name", n)).toBe(0);
      expect(await countByName("complement_options", "name", n)).toBe(0);
      expect(await countByName("tables", "name", n)).toBe(0);
      expect(await countByName("orders", "customer_name", n)).toBe(0);
      expect(await countByName("order_items", "product_name", n)).toBe(0);
      expect(await countByName("order_item_complements", "name", n)).toBe(0);
    });

    it("não consegue ATUALIZAR nem EXCLUIR nada, e o banco permanece intacto", async () => {
      const [, c] = role();
      const before = await snapshot();

      const ops: [string, PromiseLike<{ data: unknown; error: unknown }>][] = [
        [
          "UPDATE categories",
          c
            .from("categories")
            .update({ name: "HACK", active: false })
            .eq("id", fx.catA)
            .select(),
        ],
        [
          "UPDATE products.price",
          c.from("products").update({ price: "0.01" }).eq("id", fx.pVis).select(),
        ],
        [
          "UPDATE products.archived",
          c.from("products").update({ archived: false }).eq("id", fx.pArch).select(),
        ],
        [
          "UPDATE complement_groups",
          c
            .from("complement_groups")
            .update({ name: "HACK" })
            .eq("id", fx.group)
            .select(),
        ],
        [
          "UPDATE complement_options",
          c
            .from("complement_options")
            .update({ price_delta: "0" })
            .eq("id", fx.option)
            .select(),
        ],
        [
          "UPDATE tables",
          c.from("tables").update({ active: false }).eq("id", fx.table).select(),
        ],
        [
          "UPDATE settings",
          c.from("restaurant_settings").update({ name: "HACK" }).eq("id", 1).select(),
        ],
        [
          "UPDATE orders.status",
          c
            .from("orders")
            .update({ status: "COMPLETED" })
            .eq("id", fx.orderA.id)
            .select(),
        ],
        [
          "UPDATE orders.total",
          c.from("orders").update({ total: "0.01" }).eq("id", fx.orderA.id).select(),
        ],
        [
          "UPDATE order_items",
          c
            .from("order_items")
            .update({ unit_price: "0" })
            .eq("id", fx.orderA.item)
            .select(),
        ],
        [
          "UPDATE order_item_complements",
          c
            .from("order_item_complements")
            .update({ price: "0" })
            .eq("id", fx.orderA.complement)
            .select(),
        ],
        [
          "UPDATE history",
          c
            .from("order_status_history")
            .update({ to_status: "COMPLETED" })
            .eq("order_id", fx.orderA.id)
            .select(),
        ],
        ["DELETE categories", c.from("categories").delete().eq("id", fx.catA).select()],
        ["DELETE products", c.from("products").delete().eq("id", fx.pVis).select()],
        [
          "DELETE complement_groups",
          c.from("complement_groups").delete().eq("id", fx.group).select(),
        ],
        [
          "DELETE complement_options",
          c.from("complement_options").delete().eq("id", fx.option).select(),
        ],
        [
          "DELETE product_complement_groups",
          c.from("product_complement_groups").delete().eq("group_id", fx.group).select(),
        ],
        ["DELETE tables", c.from("tables").delete().eq("id", fx.table).select()],
        ["DELETE orders", c.from("orders").delete().eq("id", fx.orderA.id).select()],
        [
          "DELETE order_items",
          c.from("order_items").delete().eq("id", fx.orderA.item).select(),
        ],
        [
          "DELETE order_item_complements",
          c
            .from("order_item_complements")
            .delete()
            .eq("id", fx.orderA.complement)
            .select(),
        ],
        [
          "DELETE history",
          c.from("order_status_history").delete().eq("order_id", fx.orderA.id).select(),
        ],
      ];
      for (const [name, p] of ops) expectBlocked(await p, name);

      expect(await snapshot(), "o banco mudou depois das tentativas").toEqual(before);
    });

    it("não escala privilégio pela tabela profiles", async () => {
      const [label, c] = role();
      const before = await snapshot();

      if (idx === 2) {
        const r = await c
          .from("profiles")
          .update({ role: "admin" })
          .eq("id", staffUser.id)
          .select();
        expectBlocked(r, `${label} promovendo a si mesmo`);
      }
      if (idx === 1) {
        const r = await c
          .from("profiles")
          .insert({ id: outsider.id, full_name: `${P} golpe`, role: "admin" })
          .select();
        expectBlocked(r, `${label} criando perfil admin`);
        const { data } = await admin.from("profiles").select("id").eq("id", outsider.id);
        expect(data, "perfil admin criado por usuário comum").toHaveLength(0);
      }
      if (idx === 0) {
        const r = await c
          .from("profiles")
          .insert({ id: outsider.id, full_name: `${P} golpe`, role: "admin" })
          .select();
        expectBlocked(r, `${label} criando perfil admin`);
      }
      // Tentativa de mudar o papel de outra pessoa (o admin).
      const other = await c
        .from("profiles")
        .update({ role: "staff" })
        .eq("id", adminUser.id)
        .select();
      expectBlocked(other, `${label} rebaixando o admin`);
      expect(await snapshot()).toEqual(before);

      // is_admin() reflete o papel real.
      const rpc = await c.rpc("is_admin");
      expect(rpc.error).toBeNull();
      expect(rpc.data).toBe(false);
    });

    it("funções internas (gatilhos) não são chamáveis pela API", async () => {
      const [, c] = role();
      for (const fn of [
        "orders_status_guard",
        "orders_initial_history",
        "touch_updated_at",
      ]) {
        const r = await c.rpc(fn);
        expect(r.error, `${fn} executou`).not.toBeNull();
      }
    });

    it("Storage: lê imagens públicas, mas não envia nem apaga", async () => {
      const [, c] = role();
      const { data } = c.storage.from("menu-images").getPublicUrl(fixtureImagePath);
      const res = await fetch(data.publicUrl);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("image/png");

      const path = `rls-tests/${P}-intruso-${idx}.png`;
      createdPaths.push(path);
      const up = await c.storage
        .from("menu-images")
        .upload(path, PNG, { contentType: "image/png" });
      expect(up.error, "upload permitido").not.toBeNull();
      const { data: listed } = await admin.storage.from("menu-images").list("rls-tests");
      expect((listed ?? []).map((o) => o.name)).not.toContain(`${P}-intruso-${idx}.png`);

      // A prova é a listagem do Storage (a URL pública fica em cache no CDN e não serve de prova).
      await c.storage.from("menu-images").remove([fixtureImagePath]);
      expect(
        await objectExists(fixtureImagePath),
        "imagem apagada por usuário comum",
      ).toBe(true);

      // Sobrescrever (update) o arquivo existente também deve falhar.
      const over = await c.storage
        .from("menu-images")
        .upload(fixtureImagePath, Buffer.from("x"), {
          upsert: true,
          contentType: "image/png",
        });
      expect(over.error).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------------------
  // Administrador: operações legítimas permitidas e limites que valem até para ele
  // ---------------------------------------------------------------------------------------
  describe("administrador", () => {
    it("is_admin() é verdadeiro e o perfil é lido", async () => {
      const rpc = await adminUser.client.rpc("is_admin");
      expect(rpc.data).toBe(true);
    });

    it("lê dados que o público não vê", async () => {
      const c = adminUser.client;
      const cats = await c.from("categories").select("id").like("slug", `${P}%`);
      expect((cats.data ?? []).map((r) => r.id)).toContain(fx.catB); // inativa
      const prods = await c.from("products").select("id").like("name", `${P}%`);
      expect((prods.data ?? []).map((r) => r.id)).toContain(fx.pArch); // arquivado
      for (const t of [
        "tables",
        "order_items",
        "order_item_complements",
        "order_status_history",
      ]) {
        const r = await c.from(t).select("*");
        expect(r.error, t).toBeNull();
        expect(r.data?.length, t).toBeGreaterThan(0);
      }
      const orders = await c.from("orders").select("id").like("customer_name", `${P}%`);
      expect((orders.data ?? []).map((o) => o.id)).toEqual(
        expect.arrayContaining([fx.orderA.id, fx.orderB.id]),
      );
      const profiles = await c.from("profiles").select("id").like("full_name", `${P}%`);
      expect((profiles.data ?? []).map((p) => p.id)).toEqual(
        expect.arrayContaining([adminUser.id, staffUser.id]),
      );
    });

    it("gerencia o catálogo: inserir, atualizar e excluir", async () => {
      const c = adminUser.client;
      const n = `${P}-adm`;

      const cat = await c
        .from("categories")
        .insert({ name: n, slug: n })
        .select("id")
        .single();
      expect(cat.error).toBeNull();
      const upd = await c
        .from("categories")
        .update({ name: `${n}-2` })
        .eq("id", cat.data!.id)
        .select();
      expect(upd.data).toHaveLength(1);

      const prod = await c
        .from("products")
        .insert({ name: n, category_id: cat.data!.id, price: "12.34" })
        .select("id")
        .single();
      expect(prod.error).toBeNull();
      const price = await c
        .from("products")
        .update({ price: "13.00" })
        .eq("id", prod.data!.id)
        .select("price");
      expect(Number(price.data?.[0]?.price)).toBe(13);

      const grp = await c
        .from("complement_groups")
        .insert({ name: n, min_select: 0, max_select: 1 })
        .select("id")
        .single();
      expect(grp.error).toBeNull();
      const opt = await c
        .from("complement_options")
        .insert({ group_id: grp.data!.id, name: n })
        .select("id")
        .single();
      expect(opt.error).toBeNull();
      const link = await c
        .from("product_complement_groups")
        .insert({ product_id: prod.data!.id, group_id: grp.data!.id })
        .select();
      expect(link.error).toBeNull();

      const tbl = await c.from("tables").insert({ name: n }).select("id").single();
      expect(tbl.error).toBeNull();
      expect(
        (await c.from("tables").update({ active: false }).eq("id", tbl.data!.id).select())
          .data,
      ).toHaveLength(1);

      // Exclusões na ordem das dependências.
      expect(
        (
          await c
            .from("product_complement_groups")
            .delete()
            .eq("product_id", prod.data!.id)
            .select()
        ).data,
      ).toHaveLength(1);
      expect(
        (await c.from("complement_options").delete().eq("id", opt.data!.id).select())
          .data,
      ).toHaveLength(1);
      expect(
        (await c.from("complement_groups").delete().eq("id", grp.data!.id).select()).data,
      ).toHaveLength(1);
      expect(
        (await c.from("products").delete().eq("id", prod.data!.id).select()).data,
      ).toHaveLength(1);
      expect(
        (await c.from("categories").delete().eq("id", cat.data!.id).select()).data,
      ).toHaveLength(1);
      expect(
        (await c.from("tables").delete().eq("id", tbl.data!.id).select()).data,
      ).toHaveLength(1);
    });

    it("edita as configurações e restaura", async () => {
      const c = adminUser.client;
      const { data: before } = await c
        .from("restaurant_settings")
        .select("estimated_minutes")
        .eq("id", 1)
        .single();
      const r = await c
        .from("restaurant_settings")
        .update({ estimated_minutes: 77 })
        .eq("id", 1)
        .select("estimated_minutes");
      expect(r.data?.[0]?.estimated_minutes).toBe(77);
      await c
        .from("restaurant_settings")
        .update({ estimated_minutes: before!.estimated_minutes })
        .eq("id", 1);
      const { data: after } = await admin
        .from("restaurant_settings")
        .select("estimated_minutes")
        .eq("id", 1)
        .single();
      expect(after?.estimated_minutes).toBe(before!.estimated_minutes);
    });

    it("envia e apaga imagens no Storage", async () => {
      const c = adminUser.client;
      const path = `rls-tests/${P}-admin.png`;
      createdPaths.push(path);
      const up = await c.storage
        .from("menu-images")
        .upload(path, PNG, { contentType: "image/png" });
      expect(up.error).toBeNull();
      const url = c.storage.from("menu-images").getPublicUrl(path).data.publicUrl;
      expect((await fetch(url)).status).toBe(200);
      expect(await objectExists(path)).toBe(true);
      const rm = await c.storage.from("menu-images").remove([path]);
      expect(rm.error).toBeNull();
      // Conferido pela listagem: o CDN pode continuar servindo a URL pública por um tempo.
      expect(await objectExists(path), "admin não conseguiu apagar").toBe(false);
    });

    it("pedidos: só muda o status, respeitando a máquina de estados e gravando o histórico", async () => {
      const c = adminUser.client;
      const id = fx.orderA.id;

      // Transição inválida é rejeitada pelo gatilho.
      const skip = await c
        .from("orders")
        .update({ status: "COMPLETED" })
        .eq("id", id)
        .select();
      expect(skip.error?.message).toMatch(/Transição de status inválida/);

      // Transição válida passa e grava histórico com o autor.
      const ok = await c
        .from("orders")
        .update({ status: "CONFIRMED" })
        .eq("id", id)
        .select("status");
      expect(ok.data?.[0]?.status).toBe("CONFIRMED");
      const { data: hist } = await admin
        .from("order_status_history")
        .select("from_status,to_status,changed_by")
        .eq("order_id", id)
        .order("created_at");
      expect(hist?.at(-1)).toEqual({
        from_status: "RECEIVED",
        to_status: "CONFIRMED",
        changed_by: adminUser.id,
      });

      // Voltar atrás não é permitido.
      const back = await c
        .from("orders")
        .update({ status: "RECEIVED" })
        .eq("id", id)
        .select();
      expect(back.error?.message).toMatch(/Transição de status inválida/);
    });

    it("pedidos: nem o admin altera valores, token, cliente, nem insere ou exclui", async () => {
      const c = adminUser.client;
      const id = fx.orderB.id;
      const before = await snapshot();

      for (const patch of [
        { total: "0.01" },
        { subtotal: "0.01" },
        { customer_name: "HACK" },
        { tracking_token: "a".repeat(64) },
        { notes: "HACK" },
        { payment_status: "PENDING" },
      ]) {
        const r = await c.from("orders").update(patch).eq("id", id).select();
        expect(
          isDenied(r) || (r.data ?? []).length === 0,
          `admin alterou ${Object.keys(patch)[0]}`,
        ).toBe(true);
      }
      expectBlocked(
        await c
          .from("orders")
          .insert({
            customer_name: `${P}-adm-ped`,
            customer_phone: "11999990000",
            mode: "PICKUP",
            subtotal: "0",
            total: "0",
          })
          .select(),
        "admin INSERT orders",
      );
      expectBlocked(
        await c.from("orders").delete().eq("id", id).select(),
        "admin DELETE orders",
      );
      expectBlocked(
        await c
          .from("order_items")
          .update({ unit_price: "0" })
          .eq("order_id", id)
          .select(),
        "admin UPDATE order_items",
      );
      expectBlocked(
        await c.from("order_items").delete().eq("order_id", id).select(),
        "admin DELETE order_items",
      );
      expectBlocked(
        await c
          .from("order_item_complements")
          .insert({
            order_item_id: fx.orderA.item,
            group_name: "x",
            name: "x",
            price: "0",
          })
          .select(),
        "admin INSERT complements",
      );
      expectBlocked(
        await c
          .from("order_status_history")
          .insert({ order_id: id, to_status: "CONFIRMED" })
          .select(),
        "admin INSERT history",
      );
      expectBlocked(
        await c
          .from("order_status_history")
          .update({ to_status: "COMPLETED" })
          .eq("order_id", id)
          .select(),
        "admin UPDATE history",
      );
      expectBlocked(
        await c.from("order_status_history").delete().eq("order_id", id).select(),
        "admin DELETE history",
      );

      expect(await snapshot(), "o banco mudou").toEqual(before);
    });

    it("perfis: nem o admin altera papéis pela API (promoção só por SQL)", async () => {
      const c = adminUser.client;
      const before = await snapshot();
      expectBlocked(
        await c
          .from("profiles")
          .update({ role: "admin" })
          .eq("id", staffUser.id)
          .select(),
        "admin promovendo staff",
      );
      expectBlocked(
        await c
          .from("profiles")
          .insert({ id: outsider.id, full_name: `${P} x`, role: "admin" })
          .select(),
        "admin criando perfil",
      );
      expectBlocked(
        await c.from("profiles").delete().eq("id", staffUser.id).select(),
        "admin excluindo perfil",
      );
      expect(await snapshot()).toEqual(before);
    });
  });

  // ---------------------------------------------------------------------------------------
  it("sanidade: as fixtures de pedidos existem para os testes de bloqueio serem significativos", async () => {
    const { count } = await admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .like("customer_name", `${P}%`);
    expect(count).toBe(2);
  });
});
