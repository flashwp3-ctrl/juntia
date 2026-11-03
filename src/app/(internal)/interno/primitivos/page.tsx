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

export const metadata: Metadata = {
  title: copy.internal.title,
  robots: { index: false, follow: false },
};

export default async function InternalPrimitivesPage() {
  await connection();
  // Primera barrera: destino de despliegue. Segunda: en un preview, solo sus URL generadas.
  if (!isInternalSurfaceEnabled(process.env)) notFound();
  if (!isAllowedInternalHost((await headers()).get("host"), process.env)) notFound();

  return (
    <main id="contenido" className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 md:px-7 xl:px-10 xl:py-14">
      <header className="flex max-w-[760px] flex-col gap-3">
        <span className="font-mono text-[length:var(--meta-mono-size)] tracking-[.06em] text-ink-secondary uppercase">{copy.internal.eyebrow}</span>
        <h1 className="font-serif text-[length:clamp(36px,6vw,var(--display-l-size))] leading-none tracking-[var(--display-l-tracking)] text-balance">{copy.internal.title}</h1>
        <p className="text-[length:var(--body-l-size)] leading-[var(--body-l-line)] text-ink-secondary text-pretty">{copy.internal.note}</p>
      </header>
      <div className="grid gap-6 xl:grid-cols-2">
        <PrimitivesGallery theme="light" />
        <PrimitivesGallery theme="dark" />
      </div>
    </main>
  );
}
