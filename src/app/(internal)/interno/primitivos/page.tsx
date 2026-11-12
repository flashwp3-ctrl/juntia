// FR-017, FR-049, FR-050, FR-053; research R4; contracts/routes.md. Superficie interna de revisión de los primitivos.
// Se evalúa por petición (connection) para que un mismo build responda según el destino y el host donde se sirve.
import "server-only";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { copy } from "@/lib/copy/es";
import { isAllowedInternalHost, isInternalSurfaceEnabled } from "@/lib/internal-surface";
import { PrimitivesGallery } from "./primitives-gallery";

// Primera barrera: destino de despliegue. Segunda: en un preview, solo sus URL generadas.
async function isOpen(): Promise<boolean> {
  await connection();
  return isInternalSurfaceEnabled(process.env) && isAllowedInternalHost((await headers()).get("host"), process.env);
}

// El título sale de la misma compuerta: con la superficie cerrada, el 404 no nombra la ruta
// interna ni en el HTML ni en los datos de React Server Components (T072, producción).
export async function generateMetadata(): Promise<Metadata> {
  const robots = { index: false, follow: false };
  return (await isOpen()) ? { title: copy.internal.title, robots } : { robots };
}

export default async function InternalPrimitivesPage() {
  if (!(await isOpen())) notFound();

  return (
    <main id="contenido" className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 md:px-7 xl:px-10 xl:py-14">
      <header className="flex max-w-[760px] flex-col gap-3">
        <span className="font-mono text-[length:var(--meta-mono-size)] tracking-[.06em] text-ink-secondary uppercase">{copy.internal.eyebrow}</span>
        <h1 className="font-serif text-[length:clamp(2rem,6vw,var(--display-l-size))] leading-none font-medium tracking-[var(--display-l-tracking)] text-balance">{copy.internal.title}</h1>
        <p className="text-[length:var(--body-l-size)] leading-[var(--body-l-line)] text-ink-secondary text-pretty">{copy.internal.note}</p>
      </header>
      <div className="grid gap-6 xl:grid-cols-2">
        <PrimitivesGallery theme="light" />
        <PrimitivesGallery theme="dark" />
      </div>
    </main>
  );
}
