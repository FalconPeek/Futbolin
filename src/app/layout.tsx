import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-barlow" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-barlow-condensed" });

export const metadata: Metadata = {
  title: "Picado",
  description: "Organizá el fútbol con tus amigos: partidos, cartas, ranking y torneos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" data-theme="dark" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
