import type { Metadata } from "next";
import { Bebas_Neue, Manrope } from "next/font/google";
import { SiteAtmosphere } from "@/components/SiteAtmosphere";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "ForTheCulture · N£₩ St@r ₽uN€h",
  description:
    "Compétition rap New Star Punch. Parcours d'épisodes, jury et votes public via Orange Money et MTN Money.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased site-body">
        <SiteAtmosphere />
        <div className="site-content">
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
