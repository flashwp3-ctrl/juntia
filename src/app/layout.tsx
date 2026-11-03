import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { themeScript } from "@/lib/theme-script";
import "./globals.css";
import { copy } from "@/lib/copy/es";
export const metadata = { title: copy.shell.brand };

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument-serif" });
const sans = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], weight: "500", variable: "--font-geist-mono" });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className={`${serif.variable} ${sans.variable} ${mono.variable} bg-canvas text-ink font-sans`}>{children}</body>
    </html>
  );
}

