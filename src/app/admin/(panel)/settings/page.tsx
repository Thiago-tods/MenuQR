import { adminErrorMessage } from "@/lib/admin-errors";
import { DAY_LABEL, DAY_ORDER, type OpeningHours } from "@/lib/hours";
import { requireAdmin } from "@/server/admin-auth";
import { saveSettings } from "../catalog-actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string | string[] }>;
}) {
  const { supabase } = await requireAdmin();
  const erro = adminErrorMessage((await searchParams).erro);
  const { data: s } = await supabase
    .from("restaurant_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (!s) return <p>Configurações não encontradas. Execute o seed.</p>;
  const hours = s.opening_hours as OpeningHours;

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-extrabold">Configurações</h1>
      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {erro}
        </p>
      )}
      <form action={saveSettings} encType="multipart/form-data" className="space-y-4">
        <div>
          <label htmlFor="name" className="label">
            Nome do restaurante
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={80}
            defaultValue={s.name}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="description" className="label">
            Descrição
          </label>
          <textarea
            id="description"
            name="description"
            maxLength={500}
            defaultValue={s.description}
            className="input min-h-24 py-2"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="address" className="label">
              Endereço
            </label>
            <input
              id="address"
              name="address"
              maxLength={200}
              defaultValue={s.address}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="phone" className="label">
              Telefone
            </label>
            <input
              id="phone"
              name="phone"
              maxLength={30}
              defaultValue={s.phone}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="logo" className="label">
              Logo
            </label>
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="input py-2"
            />
          </div>
          <div>
            <label htmlFor="hero" className="label">
              Imagem de destaque
            </label>
            <input
              id="hero"
              name="hero"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="input py-2"
            />
          </div>
          <div>
            <label htmlFor="estimatedMinutes" className="label">
              Tempo estimado (min)
            </label>
            <input
              id="estimatedMinutes"
              name="estimatedMinutes"
              type="number"
              min={0}
              max={240}
              defaultValue={s.estimated_minutes}
              className="input"
            />
          </div>
        </div>
        <div>
          <label htmlFor="closedMessage" className="label">
            Mensagem quando fechado
          </label>
          <input
            id="closedMessage"
            name="closedMessage"
            maxLength={200}
            defaultValue={s.closed_message}
            className="input"
          />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="acceptingOrders"
            defaultChecked={s.accepting_orders}
            className="accent-terracotta size-4"
          />{" "}
          Receber pedidos (desmarque para pausar)
        </label>

        <fieldset className="space-y-2">
          <legend className="label">
            Horário de funcionamento (deixe em branco para fechado)
          </legend>
          {DAY_ORDER.map((d) => (
            <div
              key={d}
              className="grid grid-cols-[6rem_1fr_1fr] items-center gap-2 text-sm"
            >
              <span>{DAY_LABEL[d]}</span>
              <input
                name={`${d}_open`}
                type="time"
                aria-label={`${DAY_LABEL[d]} abre`}
                defaultValue={hours[d]?.open ?? ""}
                className="input"
              />
              <input
                name={`${d}_close`}
                type="time"
                aria-label={`${DAY_LABEL[d]} fecha`}
                defaultValue={hours[d]?.close ?? ""}
                className="input"
              />
            </div>
          ))}
        </fieldset>
        <button className="btn-primary" type="submit">
          Salvar configurações
        </button>
      </form>
    </div>
  );
}
