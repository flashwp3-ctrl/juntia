import { Brygada_1918, Onest, Spline_Sans_Mono } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import { SHELL_END_ID } from "@/components/shell/shell-end";
import { themeScript } from "@/lib/theme-script";
import "./globals.css";
import { copy } from "@/lib/copy/es";
export const metadata = { title: copy.shell.brand };

// Decisión 14 (maestro §15.10): Brygada 1918 en titulares, Onest en interfaz y cifras, Spline Sans Mono en metadatos.
// D-01 (T077): el respaldo automático de next/font usa un solo size-adjust para todos los pesos. En los textos centrados,
// cualquier diferencia de ancho mueve el inicio de la línea al llegar la fuente (CLS > 0). «Onest Fallback» y
// «Brygada Fallback» (sin «1918»: next/font no entrecomilla el respaldo y un nombre con un token que empieza por cifra
// invalida todo el font-family) se definen en globals.css con un size-adjust por peso. font-display sigue siendo swap.
const serif = Brygada_1918({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: "normal", variable: "--font-brygada", adjustFontFallback: false, fallback: ["Brygada Fallback", "Brygada Fallback Times"] });
// La itálica es la misma familia («Brygada 1918»), en una llamada aparte para no precargarla: ninguna pantalla de la 001 la
// usa y su archivo (24 KB) competiría con el de los titulares en la carga lenta. Se descarga solo si algún texto la pide.
const serifItalic = Brygada_1918({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: "italic", preload: false, variable: "--font-brygada-italic", adjustFontFallback: false, fallback: ["Brygada Fallback", "Brygada Fallback Times"] });
const sans = Onest({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-onest", adjustFontFallback: false, fallback: ["Onest Fallback"] });
// Respaldo monoespaciado propio (globals.css, PR B de P0-4): el de next/font era Arial, proporcional y sin nombre de Linux.
const mono = Spline_Sans_Mono({ subsets: ["latin"], weight: "500", variable: "--font-spline-mono", adjustFontFallback: false, fallback: ["Spline Mono Fallback"] });

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
