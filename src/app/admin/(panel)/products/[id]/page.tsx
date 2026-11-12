import { adminErrorMessage } from "@/lib/admin-errors";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/admin-auth";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string | string[] }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const erro = adminErrorMessage((await searchParams).erro);
  const [product, cats, groups] = await Promise.all([
    supabase
      .from("products")
      .select("*, product_complement_groups ( group_id )")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("complement_groups").select("id, name").order("name"),
  ]);
  if (!product.data) notFound();
  const p = product.data as typeof product.data & {
    product_complement_groups: { group_id: string }[];
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Editar produto</h1>
      <ProductForm
        categories={cats.data ?? []}
        groups={groups.data ?? []}
        error={erro ?? undefined}
        product={{
          ...p,
          groupIds: p.product_complement_groups.map(
            (g: { group_id: string }) => g.group_id,
          ),
        }}
      />
    </div>
  );
}
