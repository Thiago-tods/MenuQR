import { adminErrorMessage } from "@/lib/admin-errors";
import { ConfirmButton } from "@/components/confirm-button";
import { fromCents, toCents } from "@/lib/money";
import { requireAdmin } from "@/server/admin-auth";
import { deleteGroup, saveGroup } from "../catalog-actions";

export const dynamic = "force-dynamic";

type Option = { id?: string; name: string; price: string; available: boolean };
type Group = { id?: string; name: string; min: number; max: number; options: Option[] };

function GroupForm({ group, blankRows }: { group: Group; blankRows: number }) {
  const rows: Option[] = [
    ...group.options,
    ...Array.from({ length: blankRows }, () => ({
      name: "",
      price: "0.00",
      available: true,
    })),
  ];
  const key = group.id ?? "new";
  return (
    <form
      action={saveGroup}
      className="border-sand space-y-3 rounded-xl border bg-white p-4"
    >
      {group.id && <input type="hidden" name="id" value={group.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_6rem_6rem]">
        <div>
          <label htmlFor={`gn-${key}`} className="label">
            Grupo
          </label>
          <input
            id={`gn-${key}`}
            name="name"
            required
            maxLength={60}
            defaultValue={group.name}
            className="input"
            placeholder="Ex.: Ponto da carne"
          />
        </div>
        <div>
          <label htmlFor={`gmin-${key}`} className="label">
            Mínimo
          </label>
          <input
            id={`gmin-${key}`}
            name="minSelect"
            type="number"
            min={0}
            max={20}
            defaultValue={group.min}
            className="input"
          />
        </div>
        <div>
          <label htmlFor={`gmax-${key}`} className="label">
            Máximo
          </label>
          <input
            id={`gmax-${key}`}
            name="maxSelect"
            type="number"
            min={1}
            max={20}
            defaultValue={group.max}
            className="input"
          />
        </div>
      </div>
      <p className="text-muted text-xs">
        Mínimo 1 ou mais torna a escolha obrigatória. Deixe o nome da opção em branco para
        remover a linha.
      </p>
      <fieldset className="space-y-2">
        <legend className="label">Opções</legend>
        {rows.map((o, i) => (
          <div key={i} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
            <input type="hidden" name="optId" value={o.id ?? ""} />
            <input
              name="optName"
              defaultValue={o.name}
              maxLength={60}
              aria-label={`Nome da opção ${i + 1}`}
              className="input"
            />
            <input
              name="optPrice"
              defaultValue={o.price}
              inputMode="decimal"
              aria-label={`Acréscimo da opção ${i + 1} (R$)`}
              className="input"
            />
            <label className="flex min-h-11 items-center gap-1 text-xs">
              <input
                type="checkbox"
                name="optAvailable"
                value={i}
                defaultChecked={o.available}
                className="accent-terracotta size-4"
              />{" "}
              Disp.
            </label>
          </div>
        ))}
      </fieldset>
      <button className="btn-primary" type="submit">
        {group.id ? "Salvar grupo" : "Criar grupo"}
      </button>
    </form>
  );
}

export default async function ComplementsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string | string[] }>;
}) {
  const { supabase } = await requireAdmin();
  const erro = adminErrorMessage((await searchParams).erro);
  const { data } = await supabase
    .from("complement_groups")
    .select(
      "id, name, min_select, max_select, complement_options ( id, name, price_delta, available, sort_order )",
    )
    .order("name");
  const groups = (data ?? []) as unknown as {
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
  }[];

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-extrabold">Complementos</h1>
      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {erro}
        </p>
      )}
      <section aria-labelledby="novo">
        <h2 id="novo" className="mb-2 font-bold">
          Novo grupo
        </h2>
        <GroupForm group={{ name: "", min: 0, max: 1, options: [] }} blankRows={4} />
      </section>
      {groups.length === 0 && (
        <p className="border-sand text-muted rounded-xl border border-dashed p-8 text-center">
          Nenhum grupo de complementos.
        </p>
      )}
      {groups.map((g) => (
        <section key={g.id} aria-label={g.name} className="space-y-2">
          <GroupForm
            blankRows={2}
            group={{
              id: g.id,
              name: g.name,
              min: g.min_select,
              max: g.max_select,
              options: [...g.complement_options]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((o) => ({
                  id: o.id,
                  name: o.name,
                  price: fromCents(toCents(o.price_delta)),
                  available: o.available,
                })),
            }}
          />
          <form action={deleteGroup}>
            <input type="hidden" name="id" value={g.id} />
            <ConfirmButton
              className="btn-danger"
              message={`Excluir o grupo "${g.name}" e todas as suas opções? Ele será removido dos produtos.`}
            >
              Excluir grupo “{g.name}”
            </ConfirmButton>
          </form>
        </section>
      ))}
    </div>
  );
}
