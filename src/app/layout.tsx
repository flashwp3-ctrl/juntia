import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { themeScript } from "@/lib/theme-script";
import "./globals.css";
import { copy } from "@/lib/copy/es";
export const metadata = { title: copy.shell.brand };

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument-serif" });
// D-01 (T077): el respaldo automático de next/font es Arial al 104,76 % para todos los pesos, ~3 % más ancho que Geist
// en el copy de la 001. En los textos centrados, ese ancho movía el inicio de la línea más de 3 px al llegar Geist
// (CLS > 0). «Geist Fallback» se define en globals.css con un size-adjust por peso. font-display sigue siendo swap.
const sans = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist", adjustFontFallback: false, fallback: ["Geist Fallback"] });
const mono = Geist_Mono({ subsets: ["latin"], weight: "500", variable: "--font-geist-mono" });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO" suppressHydrationWarning className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="bg-canvas text-ink font-sans">{children}</body>
    </html>
  );
}

