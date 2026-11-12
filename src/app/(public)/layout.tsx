import { CartProvider } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";
import { getSettings } from "@/server/menu";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <CartProvider>
      <SiteHeader name={settings?.name ?? "MenuQR"} />
      <main id="conteudo" tabIndex={-1} className="mx-auto max-w-5xl px-4 pt-4 pb-24">
        {children}
      </main>
    </CartProvider>
  );
}
