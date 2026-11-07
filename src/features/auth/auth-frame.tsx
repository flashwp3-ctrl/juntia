// T045 / FR-022; 04·17 y RESPONSIVE_SPECIFICATIONS.md. Pantallas de acceso sin shell. En móvil, la columna de los comps
// (24 px de margen, 20 entre bloques). Desde 1024, la misma columna de 440 px sobre una tarjeta elevada, centrada en un
// lienzo con la marca arriba a la izquierda: el formulario no se estira (AGENTS.md 10). Composición de escritorio nueva,
// para aprobar viendo la pantalla. PR B de la 003: la comparte /invitacion (M5–M7, 04·15), que no es una ruta de acceso.
import type { ReactNode } from "react";
import { copy } from "@/lib/copy/es";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-rows-[auto_1fr] lg:px-10 lg:pt-8 lg:pb-16">
      <p aria-hidden="true" className="hidden items-center gap-2 font-serif text-[28px] leading-none font-medium tracking-[-0.015em] text-ink lg:flex">
        <span className="size-3 rounded-[4px] bg-primary" />
        {copy.shell.brand}
      </p>
      <main id="contenido" className="mx-auto w-full max-w-[440px] px-6 pt-6 pb-12 md:pt-14 lg:mt-[min(9vh,96px)] lg:self-start lg:rounded-[28px] lg:bg-raised lg:px-10 lg:pt-10 lg:pb-10 lg:shadow-raised">
        <div className="flex flex-col gap-5">{children}</div>
      </main>
    </div>
  );
}
