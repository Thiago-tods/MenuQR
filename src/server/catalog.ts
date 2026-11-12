import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toCents } from "@/lib/money";
import type { CatalogProduct } from "@/lib/pricing";
import type { SupabaseClient } from "@supabase/supabase-js";

type GroupRow = {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  complement_options: {
    id: string;
    name: string;
    price_delta: string;
    available: boolean;
    sort_order: number;
  }[];
};

/**
 * `categories!inner` + `.eq("categories.active", true)` nas consultas: produto de categoria
 * desativada não aparece nem pode ser pedido (a chave de serviço ignora RLS, então o filtro
 * precisa estar aqui).
 */
export const PRODUCT_SELECT = `
  id, name, description, price, image_url, available, featured, prep_minutes, category_id,
  categories!inner ( active ),
  product_complement_groups ( sort_order, complement_groups ( id, name, min_select, max_select,
    complement_options ( id, name, price_delta, available, sort_order ) ) )
`;

export type ProductRow = {
  id: string;
  name: string;
  description: string;
  price: string;
  image_url: string | null;
  available: boolean;
  featured: boolean;
  prep_minutes: number | null;
  category_id: string;
  product_complement_groups: { sort_order: number; complement_groups: GroupRow | null }[];
};

export function toCatalogProduct(row: ProductRow): CatalogProduct {
  return {
    id: row.id,
    name: row.name,
    priceCents: toCents(row.price),
    available: row.available,
    groups: row.product_complement_groups
      .filter((p) => p.complement_groups)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => {
        const g = p.complement_groups!;
        return {
          id: g.id,
          name: g.name,
          minSelect: g.min_select,
          maxSelect: g.max_select,
          options: [...g.complement_options]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((o) => ({
              id: o.id,
              name: o.name,
              priceCents: toCents(o.price_delta),
              available: o.available,
            })),
        };
      }),
  };
}

/** Carrega do banco os produtos pedidos. Preço sempre vem daqui, nunca do cliente. */
export async function loadCatalog(
  productIds: string[],
  client?: SupabaseClient,
): Promise<Map<string, CatalogProduct>> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", productIds)
    .eq("archived", false)
    .eq("categories.active", true)
    .returns<ProductRow[]>();
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((r) => [r.id, toCatalogProduct(r)]));
}
