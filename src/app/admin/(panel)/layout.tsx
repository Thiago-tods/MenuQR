import Link from "next/link";
import { requireAdmin } from "@/server/admin-auth";
import { signOut } from "../login/actions";

const NAV = [
  ["/admin", "Dashboard"],
  ["/admin/orders", "Pedidos"],
  ["/admin/products", "Produtos"],
  ["/admin/categories", "Categorias"],
  ["/admin/complements", "Complementos"],
  ["/admin/qr-code", "QR Code"],
  ["/admin/settings", "Configurações"],
] as const;

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, name } = await requireAdmin();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-sand border-b bg-white md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-3 md:block">
          <p className="font-display text-lg font-extrabold">MenuQR</p>
          <p className="text-muted hidden text-xs md:block">{name ?? user.email}</p>
        </div>
        <nav
          aria-label="Administração"
          className="flex gap-1 overflow-x-auto px-2 pb-2 md:block md:space-y-1"
        >
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="btn hover:bg-sand/60 shrink-0 justify-start md:w-full"
            >
              {label}
            </Link>
          ))}
          <form action={signOut}>
            <button
              type="submit"
              className="btn text-muted hover:bg-sand/60 shrink-0 justify-start md:w-full"
            >
              Sair
            </button>
          </form>
        </nav>
      </aside>
      <main id="conteudo" tabIndex={-1} className="min-w-0 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
