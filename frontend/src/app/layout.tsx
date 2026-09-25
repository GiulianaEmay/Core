import type { Metadata } from "next";
import { IBM_Plex_Sans, Saira } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./portal.css";
import "./portal-extra.css";

const saira = Saira({
  variable: "--font-saira",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "CORE · Portal del cliente",
  description: "Creación de valor para empresas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${saira.variable} ${plex.variable}`}>
      <body>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
