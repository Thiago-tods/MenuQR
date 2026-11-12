import { adminErrorMessage } from "@/lib/admin-errors";
import { requireAdmin } from "@/server/admin-auth";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string | string[] }>;
}) {
  const { supabase } = await requireAdmin();
  const erro = adminErrorMessage((await searchParams).erro);
  const [cats, groups] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("complement_groups").select("id, name").order("name"),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Novo produto</h1>
      <ProductForm
        categories={cats.data ?? []}
        groups={groups.data ?? []}
        error={erro ?? undefined}
      />
    </div>
  );
}
