import { adminErrorMessage } from "@/lib/admin-errors";
import { ConfirmButton } from "@/components/confirm-button";
import { requireAdmin } from "@/server/admin-auth";
import { deleteCategory, saveCategory } from "../catalog-actions";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string | string[] }>;
}) {
  const { supabase } = await requireAdmin();
  const erro = adminErrorMessage((await searchParams).erro);
  const { data } = await supabase
    .from("categories")
    .select("id, name, sort_order, active")
    .order("sort_order");
  const categories = data ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-extrabold">Categorias</h1>
      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {erro}
        </p>
      )}

      <form
        action={saveCategory}
        className="border-sand flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4"
      >
        <div className="min-w-48 flex-1">
          <label htmlFor="new-name" className="label">
            Nova categoria
          </label>
          <input id="new-name" name="name" required maxLength={60} className="input" />
        </div>
        <div className="w-24">
          <label htmlFor="new-order" className="label">
            Ordem
          </label>
          <input
            id="new-order"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={categories.length + 1}
            className="input"
          />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked
            className="accent-terracotta size-4"
          />{" "}
          Ativa
        </label>
        <button className="btn-primary" type="submit">
          Criar
        </button>
      </form>

      {categories.length === 0 && (
        <p className="border-sand text-muted rounded-xl border border-dashed p-8 text-center">
          Nenhuma categoria cadastrada.
        </p>
      )}
      <ul className="space-y-3">
        {categories.map((c) => (
          <li key={c.id} className="border-sand rounded-xl border bg-white p-4">
            <form action={saveCategory} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={c.id} />
              <div className="min-w-48 flex-1">
                <label htmlFor={`n-${c.id}`} className="label">
                  Nome
                </label>
                <input
                  id={`n-${c.id}`}
                  name="name"
                  defaultValue={c.name}
                  required
                  maxLength={60}
                  className="input"
                />
              </div>
              <div className="w-24">
                <label htmlFor={`o-${c.id}`} className="label">
                  Ordem
                </label>
                <input
                  id={`o-${c.id}`}
                  name="sortOrder"
                  type="number"
                  min={0}
                  defaultValue={c.sort_order}
                  className="input"
                />
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={c.active}
                  className="accent-terracotta size-4"
                />{" "}
                Ativa
              </label>
              <button className="btn-secondary" type="submit">
                Salvar
              </button>
            </form>
            <form action={deleteCategory} className="mt-2">
              <input type="hidden" name="id" value={c.id} />
              <ConfirmButton
                className="btn-danger"
                message={`Excluir a categoria "${c.name}"? Esta ação não pode ser desfeita.`}
              >
                Excluir
              </ConfirmButton>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
