import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_SELECT, toCatalogProduct, type ProductRow } from "@/server/catalog";
import { toCents } from "@/lib/money";
import type { OpeningHours } from "@/lib/hours";

export type Settings = {
  name: string;
  description: string;
  logoUrl: string | null;
  heroUrl: string | null;
  address: string;
  phone: string;
  openingHours: OpeningHours;
  estimatedMinutes: number;
  acceptingOrders: boolean;
  closedMessage: string;
};

export type MenuProduct = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  available: boolean;
  featured: boolean;
  prepMinutes: number | null;
  categoryId: string;
};

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

export const getSettings = cache(async (): Promise<Settings | null> => {
  const db = await createClient();
  const { data } = await db
    .from("restaurant_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (!data) return null;
  return {
    name: data.name,
    description: data.description,
    logoUrl: data.logo_url,
    heroUrl: data.hero_url,
    address: data.address,
    phone: data.phone,
    openingHours: data.opening_hours as OpeningHours,
    estimatedMinutes: data.estimated_minutes,
    acceptingOrders: data.accepting_orders,
    closedMessage: data.closed_message,
  };
});

const toProduct = (r: ProductRow): MenuProduct => ({
  id: r.id,
  name: r.name,
  description: r.description,
  priceCents: toCents(r.price),
  imageUrl: r.image_url,
  available: r.available,
  featured: r.featured,
  prepMinutes: r.prep_minutes,
  categoryId: r.category_id,
});

/** Produtos visíveis ao público (RLS já exclui arquivados e categorias inativas via join). */
export const getMenu = cache(async () => {
  const db = await createClient();
  const [cats, prods] = await Promise.all([
    db.from("categories").select("id, name, slug").eq("active", true).order("sort_order"),
    db
      .from("products")
      .select(
        "id, name, description, price, image_url, available, featured, prep_minutes, category_id",
      )
      .eq("archived", false)
      .order("sort_order")
      .returns<Omit<ProductRow, "product_complement_groups">[]>(),
  ]);
  const products = (prods.data ?? []).map((r) =>
    toProduct({ ...r, product_complement_groups: [] }),
  );
  const categories: MenuCategory[] = (cats.data ?? [])
    .map((c) => ({
      ...c,
      productCount: products.filter((p) => p.categoryId === c.id && p.available).length,
    }))
    .filter((c) => c.productCount > 0);
  const visible = new Set(categories.map((c) => c.id));
  return { categories, products: products.filter((p) => visible.has(p.categoryId)) };
});

export type ProductDetail = MenuProduct & {
  groups: {
    id: string;
    name: string;
    minSelect: number;
    maxSelect: number;
    options: { id: string; name: string; priceCents: number; available: boolean }[];
  }[];
};

export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  const db = await createClient();
  const { data } = await db
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .eq("archived", false)
    .eq("categories.active", true)
    .maybeSingle<ProductRow>();
  if (!data) return null;
  const catalog = toCatalogProduct(data);
  return { ...toProduct(data), groups: catalog.groups };
}
