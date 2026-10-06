import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import { Analytics } from "@vercel/analytics/next";
import Faixa from "@/components/Faixa";
import Nav from "@/components/Nav";
import Rodape from "@/components/Rodape";
import { AutoProvider } from "@/lib/auto";
import "./globals.css";

const descricao =
  "Apuração ao vivo da eleição para Presidente 2026: mapa por estado, peso de cada região, saldo de votos, projeção e evolução, com dados oficiais do TSE.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"
  ),
  title: "Apuração Presidente 2026 · ao vivo",
  description: descricao,
  openGraph: {
    title: "Apuração Presidente 2026 · ao vivo",
    description: descricao,
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Apuração Presidente 2026 · ao vivo", description: descricao },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f1012",
};

// aplica o tema salvo antes de pintar, pra não piscar
const scriptTema = `try{var t=localStorage.getItem('tema');if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>
        <AutoProvider>
          <Faixa />
          <Nav />
          {children}
          <Rodape />
        </AutoProvider>
        <Analytics />
      </body>
    </html>
  );
}
