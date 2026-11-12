"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { errorUrl, type AdminErrorCode } from "@/lib/admin-errors";
import { fromCents } from "@/lib/money";
import { categorySchema, groupSchema, productSchema } from "@/lib/schemas";
import { assertAdmin } from "@/server/admin-auth";

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Volta para a tela com um código de erro conhecido (o texto vem de lib/admin-errors). */
function back(path: string, error?: AdminErrorCode): never {
  revalidatePath("/", "layout");
  redirect(errorUrl(path, error));
}

const idSchema = z.string().uuid();
const flag = (v: FormDataEntryValue | null) => v === "on" || v === "true";

// ---------- categorias ----------
export async function saveCategory(formData: FormData) {
  const { supabase } = await assertAdmin();
  const id = formData.get("id") ? idSchema.parse(formData.get("id")) : null;
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") ?? 0,
    active: flag(formData.get("active")),
  });
  if (!parsed.success) back("/admin/categories", "categoria-invalida");
  const row = {
    name: parsed.data.name,
    sort_order: parsed.data.sortOrder,
    active: parsed.data.active,
  };
  const { error } = id
    ? await supabase.from("categories").update(row).eq("id", id)
    : await supabase
        .from("categories")
        .insert({ ...row, slug: `${slugify(row.name)}-${randomUUID().slice(0, 4)}` });
  back("/admin/categories", error ? "operacao-falhou" : undefined);
}

export async function deleteCategory(formData: FormData) {
  const { supabase } = await assertAdmin();
  const id = idSchema.parse(formData.get("id"));
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (count) back("/admin/categories", "categoria-com-produtos");
  const { error } = await supabase.from("categories").delete().eq("id", id);
  back("/admin/categories", error ? "operacao-falhou" : undefined);
}

// ---------- produtos ----------
const MAX_IMAGE = 3 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function saveProduct(formData: FormData) {
  const { supabase } = await assertAdmin();
  const id = formData.get("id") ? idSchema.parse(formData.get("id")) : null;
  const back_ = (e?: AdminErrorCode) =>
    back(id ? `/admin/products/${id}` : "/admin/products/new", e);

  let imageUrl = (formData.get("currentImage") as string) || null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const ext = IMAGE_TYPES[file.type];
    if (!ext || file.size > MAX_IMAGE) back_("imagem-invalida");
    const path = `products/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("menu-images")
      .upload(path, file, { contentType: file.type });
    if (error) back_("upload-falhou");
    imageUrl = supabase.storage.from("menu-images").getPublicUrl(path).data.publicUrl;
  }

  const priceRaw = String(formData.get("price") ?? "").replace(",", ".");
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    categoryId: formData.get("categoryId"),
    priceCents: Math.round(Number(priceRaw) * 100),
    prepMinutes: formData.get("prepMinutes") ? Number(formData.get("prepMinutes")) : null,
    available: flag(formData.get("available")),
    featured: flag(formData.get("featured")),
    imageUrl,
    groupIds: formData.getAll("groupIds"),
  });
  if (!parsed.success || Number.isNaN(Number(priceRaw))) back_("produto-invalido");
  const d = parsed.data!;

  const row = {
    name: d.name,
    description: d.description,
    category_id: d.categoryId,
    price: fromCents(d.priceCents),
    prep_minutes: d.prepMinutes,
    available: d.available,
    featured: d.featured,
    image_url: d.imageUrl,
  };
  let productId = id;
  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) back_("operacao-falhou");
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert(row)
      .select("id")
      .single();
    if (error || !data) back_("operacao-falhou");
    productId = data!.id;
  }

  await supabase.from("product_complement_groups").delete().eq("product_id", productId!);
  if (d.groupIds.length > 0) {
    await supabase.from("product_complement_groups").insert(
      d.groupIds.map((group_id, i) => ({
        product_id: productId!,
        group_id,
        sort_order: i,
      })),
    );
  }
  back("/admin/products");
}

/** Arquiva em vez de apagar: pedidos antigos mantêm o snapshot e a referência. */
export async function archiveProduct(formData: FormData) {
  const { supabase } = await assertAdmin();
  const id = idSchema.parse(formData.get("id"));
  const { error } = await supabase
    .from("products")
    .update({ archived: true, available: false, featured: false })
    .eq("id", id);
  back("/admin/products", error ? "operacao-falhou" : undefined);
}

export async function toggleAvailability(formData: FormData) {
  const { supabase } = await assertAdmin();
  const id = idSchema.parse(formData.get("id"));
  const available = formData.get("available") === "true";
  await supabase.from("products").update({ available: !available }).eq("id", id);
  back("/admin/products");
}

// ---------- complementos ----------
export async function saveGroup(formData: FormData) {
  const { supabase } = await assertAdmin();
  const id = formData.get("id") ? idSchema.parse(formData.get("id")) : null;
  const names = formData.getAll("optName").map(String);
  const prices = formData
    .getAll("optPrice")
    .map((p) => Math.round(Number(String(p).replace(",", ".")) * 100));
  const optIds = formData.getAll("optId").map(String);
  const avail = new Set(formData.getAll("optAvailable").map(String));

  const options = names
    .map((name, i) => ({
      id: optIds[i] || undefined,
      name,
      priceCents: Number.isFinite(prices[i]) ? prices[i] : 0,
      available: avail.has(String(i)),
    }))
    .filter((o) => o.name.trim());

  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    minSelect: formData.get("minSelect"),
    maxSelect: formData.get("maxSelect"),
    options,
  });
  if (!parsed.success) {
    const minAboveMax = parsed.error.issues.some((i) => i.path[0] === "minSelect");
    back(
      "/admin/complements",
      minAboveMax ? "grupo-minimo-maior-maximo" : "grupo-invalido",
    );
  }
  const d = parsed.data!;
  if (d.minSelect > d.options.length)
    back("/admin/complements", "grupo-minimo-excede-opcoes");

  let groupId = id;
  if (id) {
    const { error } = await supabase
      .from("complement_groups")
      .update({ name: d.name, min_select: d.minSelect, max_select: d.maxSelect })
      .eq("id", id);
    if (error) back("/admin/complements", "operacao-falhou");
  } else {
    const { data, error } = await supabase
      .from("complement_groups")
      .insert({ name: d.name, min_select: d.minSelect, max_select: d.maxSelect })
      .select("id")
      .single();
    if (error || !data) back("/admin/complements", "operacao-falhou");
    groupId = data!.id;
  }

  // Upsert das opções existentes; remove só as que saíram do formulário.
  const keep = d.options.filter((o) => o.id).map((o) => o.id!);
  const { data: existing } = await supabase
    .from("complement_options")
    .select("id")
    .eq("group_id", groupId!);
  const toRemove = (existing ?? []).map((e) => e.id).filter((x) => !keep.includes(x));
  if (toRemove.length)
    await supabase.from("complement_options").delete().in("id", toRemove);
  for (const [i, o] of d.options.entries()) {
    const row = {
      group_id: groupId!,
      name: o.name,
      price_delta: fromCents(o.priceCents),
      available: o.available,
      sort_order: i,
    };
    if (o.id) await supabase.from("complement_options").update(row).eq("id", o.id);
    else await supabase.from("complement_options").insert(row);
  }
  back("/admin/complements");
}

export async function deleteGroup(formData: FormData) {
  const { supabase } = await assertAdmin();
  const id = idSchema.parse(formData.get("id"));
  const { error } = await supabase.from("complement_groups").delete().eq("id", id);
  back("/admin/complements", error ? "operacao-falhou" : undefined);
}

// ---------- configurações ----------
const settingsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500),
  address: z.string().trim().max(200),
  phone: z.string().trim().max(30),
  estimatedMinutes: z.coerce.number().int().min(0).max(240),
  closedMessage: z.string().trim().max(200),
});
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function saveSettings(formData: FormData) {
  const { supabase } = await assertAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back("/admin/settings", "dados-invalidos");

  const hours: Record<string, { open: string; close: string } | null> = {};
  for (const d of DAYS) {
    const open = String(formData.get(`${d}_open`) ?? "");
    const close = String(formData.get(`${d}_close`) ?? "");
    if (!open && !close) hours[d] = null;
    else if (hhmm.test(open) && hhmm.test(close)) hours[d] = { open, close };
    else back("/admin/settings", "horario-invalido");
  }

  const d = parsed.data!;
  const update: Record<string, unknown> = {
    name: d.name,
    description: d.description,
    address: d.address,
    phone: d.phone,
    estimated_minutes: d.estimatedMinutes,
    closed_message: d.closedMessage,
    accepting_orders: flag(formData.get("acceptingOrders")),
    opening_hours: hours,
  };
  for (const [field, column] of [
    ["logo", "logo_url"],
    ["hero", "hero_url"],
  ] as const) {
    const file = formData.get(field);
    if (file instanceof File && file.size > 0) {
      const ext = IMAGE_TYPES[file.type];
      if (!ext || file.size > MAX_IMAGE) back("/admin/settings", "imagem-invalida");
      const path = `settings/${randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("menu-images")
        .upload(path, file, { contentType: file.type });
      if (error) back("/admin/settings", "upload-falhou");
      update[column] = supabase.storage
        .from("menu-images")
        .getPublicUrl(path).data.publicUrl;
    }
  }
  const { error } = await supabase.from("restaurant_settings").update(update).eq("id", 1);
  back("/admin/settings", error ? "operacao-falhou" : undefined);
}

// ---------- mesas ----------
export async function saveTable(formData: FormData) {
  const { supabase } = await assertAdmin();
  const name = z.string().trim().min(1).max(30).safeParse(formData.get("name"));
  if (!name.success) back("/admin/qr-code", "mesa-nome-invalido");
  const { error } = await supabase.from("tables").insert({ name: name.data! });
  back("/admin/qr-code", error ? "mesa-duplicada" : undefined);
}

export async function toggleTable(formData: FormData) {
  const { supabase } = await assertAdmin();
  const id = idSchema.parse(formData.get("id"));
  await supabase
    .from("tables")
    .update({ active: formData.get("active") !== "true" })
    .eq("id", id);
  back("/admin/qr-code");
}
