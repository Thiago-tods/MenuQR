import { adminErrorMessage } from "@/lib/admin-errors";
import Link from "next/link";
import { ConfirmButton } from "@/components/confirm-button";
import { formatCents, toCents } from "@/lib/money";
import { requireAdmin } from "@/server/admin-auth";
import { archiveProduct, toggleAvailability } from "../catalog-actions";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string | string[] }>;
}) {
  const { supabase } = await requireAdmin();
  const erro = adminErrorMessage((await searchParams).erro);
  const { data } = await supabase
    .from("products")
    .select("id, name, price, available, featured, categories ( name )")
    .eq("archived", false)
    .order("name");
  const products = (data ?? []) as unknown as {
    id: string;
    name: string;
    price: string;
    available: boolean;
    featured: boolean;
    categories: { name: string } | null;
  }[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Produtos</h1>
        <Link href="/admin/products/new" className="btn-primary">
          Novo produto
        </Link>
      </div>
      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {erro}
        </p>
      )}
      {products.length === 0 ? (
        <p className="border-sand text-muted rounded-xl border border-dashed p-8 text-center">
          Nenhum produto cadastrado.
        </p>
      ) : (
        <div className="border-sand overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-sand text-muted border-b text-xs">
              <tr>
                <th className="p-3">Produto</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Preço</th>
                <th className="p-3">Status</th>
                <th className="p-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-sand border-b last:border-0">
                  <td className="p-3 font-medium">
                    {p.name}
                    {p.featured && (
                      <span className="bg-terracotta/10 text-terracotta-dark ml-2 rounded px-1.5 text-xs">
                        destaque
                      </span>
                    )}
                  </td>
                  <td className="p-3">{p.categories?.name}</td>
                  <td className="p-3">{formatCents(toCents(p.price))}</td>
                  <td className="p-3">{p.available ? "Disponível" : "Indisponível"}</td>
                  <td className="flex flex-wrap gap-2 p-3">
                    <Link href={`/admin/products/${p.id}`} className="btn-secondary">
                      Editar
                    </Link>
                    <form action={toggleAvailability}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="available" value={String(p.available)} />
                      <button className="btn-secondary" type="submit">
                        {p.available ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                    <form action={archiveProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmButton
                        className="btn-danger"
                        message={`Arquivar "${p.name}"? Ele sai do cardápio, mas os pedidos antigos continuam intactos.`}
                      >
                        Arquivar
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
