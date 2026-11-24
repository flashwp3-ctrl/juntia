import { Brygada_1918, Onest, Spline_Sans_Mono } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import { SHELL_END_ID } from "@/components/shell/shell-end";
import { themeScript } from "@/lib/theme-script";
import type { Metadata } from "next";
import "./globals.css";
import { copy } from "@/lib/copy/es";

// Marca 1c (comp 09b, fundadores 23 nov 2026). Los iconos y la imagen para compartir son archivos estáticos de src/app
// (favicon.ico, icon.svg, apple-icon.png, opengraph-image.png y twitter-image.png): Next añade sus etiquetas. La tarjeta es
// la misma para todos los enlaces, también /invitacion: ninguna página define openGraph ni twitter, así que ninguna puede
// llevar datos a la tarjeta. metadataBase sale de SITE_URL, la variable de los enlaces de Auth; sin ella, Next usa la URL de
// producción o de preview de Vercel.
const siteUrl = process.env.SITE_URL?.trim();
export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: { default: copy.shell.brand, template: `%s · ${copy.shell.brand}` },
  description: copy.share.description,
  applicationName: copy.shell.brand,
  openGraph: { type: "website", locale: "es_CO", siteName: copy.shell.brand, title: copy.shell.brand, description: copy.share.description },
  twitter: { card: "summary_large_image", title: copy.shell.brand, description: copy.share.description },
};

// Decisión 14 (maestro §15.10): Brygada 1918 en titulares, Onest en interfaz y cifras, Spline Sans Mono en metadatos.
// D-01 (T077): el respaldo automático de next/font usa un solo size-adjust para todos los pesos. En los textos centrados,
// cualquier diferencia de ancho mueve el inicio de la línea al llegar la fuente (CLS > 0). «Onest Fallback» y
// «Brygada Fallback» (sin «1918»: next/font no entrecomilla el respaldo y un nombre con un token que empieza por cifra
// invalida todo el font-family) se definen en globals.css con un size-adjust por peso. font-display sigue siendo swap.
const serif = Brygada_1918({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: "normal", variable: "--font-brygada", adjustFontFallback: false, fallback: ["Brygada Fallback"] });
// La itálica es la misma familia («Brygada 1918»), en una llamada aparte para no precargarla: ninguna pantalla de la 001 la
// usa y su archivo (24 KB) competiría con el de los titulares en la carga lenta. Se descarga solo si algún texto la pide.
const serifItalic = Brygada_1918({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: "italic", preload: false, variable: "--font-brygada-italic", adjustFontFallback: false, fallback: ["Brygada Fallback"] });
const sans = Onest({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-onest", adjustFontFallback: false, fallback: ["Onest Fallback"] });
const mono = Spline_Sans_Mono({ subsets: ["latin"], weight: "500", variable: "--font-spline-mono" });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO" suppressHydrationWarning className={`${serif.variable} ${serifItalic.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* D21-1 (T077): con la CPU lenta, Chrome pintaba el shell a medio parsear y la barra, el selector y sus íconos se
            desplazaban al llegar el resto del HTML. Esto retiene el primer pintado hasta parsear el final del shell
            (o el final del documento, si la página no lo tiene). Los navegadores sin soporte lo ignoran. */}
        <link rel="expect" href={`#${SHELL_END_ID}`} blocking="render" />
      </head>
      <body className="bg-canvas text-ink font-sans">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
