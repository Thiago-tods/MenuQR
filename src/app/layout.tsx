import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: { default: "MenuQR · Casa Oliva", template: "%s · Casa Oliva" },
  description:
    "Cardápio digital e pedidos da Casa Oliva. Projeto demonstrativo de portfólio.",
};

export const viewport: Viewport = { themeColor: "#FAF7F2" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${manrope.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#conteudo"
          className="btn-primary sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Pular para o conteúdo
        </a>
        {children}
        <Toaster position="top-center" closeButton />
      </body>
    </html>
  );
}
