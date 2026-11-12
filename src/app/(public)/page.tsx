import { MapPin, Phone, Clock } from "lucide-react";
import { FoodImage } from "@/components/food-image";
import { MenuBrowser } from "@/components/menu-browser";
import { TableBinding } from "@/components/table-binding";
import { DAY_LABEL, DAY_ORDER, isOpenNow } from "@/lib/hours";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMenu, getSettings } from "@/server/menu";

export const dynamic = "force-dynamic";

async function resolveTable(code: string | undefined) {
  if (!code || !/^[a-f0-9]{64}$/.test(code)) return null;
  const { data } = await createAdminClient()
    .from("tables")
    .select("name")
    .eq("public_code", code)
    .eq("active", true)
    .maybeSingle();
  return data ? { code, name: data.name } : null;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ mesa?: string }>;
}) {
  const [settings, menu, sp] = await Promise.all([
    getSettings(),
    getMenu(),
    searchParams,
  ]);
  if (!settings) {
    return (
      <p className="border-sand rounded-xl border border-dashed p-8 text-center">
        Restaurante ainda não configurado. Execute as migrations e o seed (veja o README).
      </p>
    );
  }
  const table = await resolveTable(sp.mesa);
  const open = settings.acceptingOrders && isOpenNow(settings.openingHours);

  return (
    <div className="space-y-6">
      <section className="bg-charcoal text-cream overflow-hidden rounded-2xl">
        <FoodImage
          src={settings.heroUrl}
          alt={settings.name}
          className="h-40 w-full opacity-70 sm:h-56"
          priority
          sizes="100vw"
        />
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-extrabold">{settings.name}</h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                open ? "bg-olive text-white" : "bg-sand text-charcoal"
              }`}
            >
              {open ? "Aberto agora" : "Fechado"}
            </span>
          </div>
          <p className="text-cream/85 max-w-prose text-sm">{settings.description}</p>
          {!open && (
            <p className="text-sand text-sm font-medium">{settings.closedMessage}</p>
          )}
          <ul className="text-cream/80 space-y-1 text-sm">
            <li className="flex items-center gap-2">
              <MapPin aria-hidden className="size-4" />
              {settings.address}
            </li>
            <li className="flex items-center gap-2">
              <Phone aria-hidden className="size-4" />
              {settings.phone}
            </li>
            <li className="flex items-center gap-2">
              <Clock aria-hidden className="size-4" />
              Preparo médio: {settings.estimatedMinutes} min
            </li>
          </ul>
          <details className="text-cream/80 text-sm">
            <summary className="min-h-11 cursor-pointer py-3 font-medium">
              Horário de funcionamento
            </summary>
            <ul className="mt-2 space-y-0.5">
              {DAY_ORDER.map((d) => {
                const h = settings.openingHours[d];
                return (
                  <li key={d}>
                    {DAY_LABEL[d]}: {h ? `${h.open} às ${h.close}` : "Fechado"}
                  </li>
                );
              })}
            </ul>
          </details>
        </div>
      </section>

      <TableBinding table={table} />
      <MenuBrowser categories={menu.categories} products={menu.products} />
    </div>
  );
}
