"use client";
// T047, T057, T058 / FR-018 a FR-025, FR-028, FR-033, FR-037 a FR-041. Un solo componente con tres composiciones por
// CSS, no tres árboles (plan, «AppShell y navegación»):
//   < 1024   barra inferior flotante (comp 04·1 y 04·5), centrada y de 560 como máximo desde 768 (04·9).
//   1024–1279 rail de 76 px (04·9, «1024 · LG · RAIL DE 76 PX»).
//   ≥ 1280   sidebar de 248 px (04·7 y 04·8) con la marca, el selector, los destinos, Anotar y Mi cuenta.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { AccountButton, SidebarAccount } from "@/features/account/account-button";
import { copy } from "@/lib/copy/es";
import { useAnnotate } from "./annotate-notice";
import { ContextSelector } from "./context-selector";
import { ACCOUNT_HREF, isCurrent, navDestinations } from "./nav-destinations";
import { SHELL_END_ID } from "./shell-end";

const annotateName = copy.nav.annotateBlock;

// FR-037 (lección de B, F17-2): cuenta el área clicable real. Chrome respeta el radio al decidir qué se toca, así que una
// ficha de 44–54 px con radio 14–18 deja fuera las esquinas de su cuadrado de 44. Un ::after cuadrado y sin radio cubre la
// caja completa y devuelve esas esquinas al control.
const hitSquare = "relative after:absolute after:inset-0 after:content-['']";

function AnnotateTrigger({ variant }: { variant: "bar" | "side" }) {
  const { openFrom } = useAnnotate();
  const common = {
    type: "button" as const,
    "aria-keyshortcuts": copy.nav.shortcut,
    onClick: (event: MouseEvent<HTMLButtonElement>) => openFrom(event.currentTarget),
  };
  if (variant === "bar") {
    // 04·1: integrado al centro, a ras de la barra, 54 × 54, radio 18, bosque con canto de 3 px, sin elevación.
    return (
      <button
        {...common}
        aria-label={annotateName}
        data-annotate-trigger="bar"
        className={`${hitSquare} mx-auto grid size-[54px] place-items-center rounded-[var(--radius-lg)] bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-[var(--comp-button-primary-highlight),var(--comp-button-primary-edge)] hover:bg-primary-hover active:bg-primary-pressed motion-safe:transition-[background-color,scale] motion-safe:duration-[var(--duration-instant)] motion-safe:active:scale-[.96]`}
      >
        <AppIcon name="plus" weight="bold" size={24} />
      </button>
    );
  }
  // 04·9 (rail): botón de 48 al final de los destinos. 04·7 (sidebar): bloque bosque con el atajo N visible.
  return (
    <button
      {...common}
      data-annotate-trigger="side"
      className={`${hitSquare} group mt-3 grid size-12 place-items-center self-center rounded-[15px] bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:bg-primary-hover active:bg-primary-pressed xl:mt-5 xl:size-auto xl:place-items-start xl:gap-3.5 xl:self-stretch xl:rounded-[var(--radius-xl)] xl:p-4 xl:text-left xl:shadow-[var(--comp-button-primary-highlight),var(--comp-button-primary-edge)] motion-safe:transition-colors motion-safe:duration-[var(--duration-instant)]`}
    >
      <span aria-hidden="true" className="grid place-items-center xl:size-11 xl:rounded-[var(--radius-md)] xl:bg-[color-mix(in_srgb,var(--color-text-onAction)_14%,transparent)]">
        <AppIcon name="plus" weight="bold" size={22} />
      </span>
      <span className="sr-only font-serif text-[length:var(--title-l-size)] leading-none font-medium tracking-[var(--title-l-tracking)] xl:not-sr-only">{annotateName}</span>
      <span aria-hidden="true" className="hidden text-[length:var(--label-s-size)] font-medium xl:block">
        {copy.nav.shortcutLabel} {copy.nav.shortcut}
      </span>
    </button>
  );
}

const sideItem =
  `${hitSquare} flex h-12 w-12 items-center justify-center gap-3 self-center rounded-[15px] xl:h-[46px] xl:w-auto xl:justify-start xl:self-stretch xl:px-3.5 text-[length:var(--body-m-size)] motion-safe:transition-colors motion-safe:duration-[var(--duration-instant)]`;
const sideActive = "bg-[var(--comp-nav-active-bg)] text-ink font-semibold shadow-raised";
const sideIdle = "text-ink-secondary xl:text-[var(--comp-nav-muted-fg)] font-medium hover:bg-[var(--comp-nav-active-bg)]";

function SideNav({ pathname }: { pathname: string | null }) {
  const onAccount = isCurrent(ACCOUNT_HREF, pathname);
  return (
    <aside className="fixed inset-y-0 left-0 z-[var(--z-nav)] hidden w-[76px] flex-col overflow-y-auto border-r-[length:var(--border-hairline)] border-border bg-[var(--comp-sidebar-bg)] px-3 py-6 lg:flex xl:w-[248px] xl:px-[18px] xl:py-7">
      {/* Marca: «J» en el rail, «Juntia» con su punto bosque en el sidebar. */}
      <p className="flex items-center justify-center gap-2 pb-[18px] font-serif text-[26px] leading-none font-medium tracking-[-0.015em] text-ink xl:justify-start xl:px-2.5 xl:pb-[22px] xl:text-[28px]">
        <span aria-hidden="true" className="hidden size-3 rounded-[4px] bg-primary xl:block" />
        <span aria-hidden="true" className="xl:hidden">{copy.shell.brand.charAt(0)}</span>
        <span className="sr-only xl:not-sr-only">{copy.shell.brand}</span>
      </p>
      {/* Desde 1280 el selector vive aquí, bajo la marca (§15.3); por debajo, arriba a la derecha del contenido. */}
      <ContextSelector stretch className="mb-3.5 hidden xl:block" />
      <nav aria-label={copy.shell.navigation} className="flex flex-col gap-1.5">
        {navDestinations.map((destination) => {
          const current = isCurrent(destination.href, pathname);
          return (
            <Link key={destination.id} href={destination.href} aria-current={current ? "page" : undefined} className={`${sideItem} ${current ? sideActive : sideIdle}`}>
              <AppIcon name={destination.icon} weight={current ? "fill" : "regular"} size={22} className="xl:size-5" />
              <span className="sr-only xl:not-sr-only">{copy.nav[destination.label]}</span>
            </Link>
          );
        })}
        <AnnotateTrigger variant="side" />
      </nav>
      {/* T047 / FR-050: perfil al pie del sidebar (COMPONENT_SPECIFICATIONS.md §AccountButton, «Sidebar»), aprobado con la
          sección Cuenta (decisión 16.6). Sin estado de pareja en P0-1. */}
      <SidebarAccount current={onAccount} />
    </aside>
  );
}

function BottomBar({ pathname, stacked }: { pathname: string | null; stacked: boolean }) {
  const mobile = navDestinations.filter((destination) => !destination.desktopOnly);
  const tab = (index: number) => {
    const destination = mobile[index];
    const current = isCurrent(destination.href, pathname);
    return (
      <Link
        key={destination.id}
        href={destination.href}
        aria-current={current ? "page" : undefined}
        className={`${hitSquare} flex h-[54px] min-w-0 flex-col items-center justify-center gap-[3px] rounded-[var(--radius-lg)] ${current ? "bg-[var(--comp-nav-active-bg)] font-semibold text-ink shadow-raised" : "font-medium text-ink-secondary"}`}
      >
        <AppIcon name={destination.icon} weight={current ? "fill" : "regular"} size={22} />
        {/* Con texto al 200 % la barra oculta las etiquetas y conserva el nombre (RESPONSIVE_SPECIFICATIONS.md). */}
        <span className="max-w-full truncate text-[0.6875rem] leading-tight @max-[17rem]:sr-only">{copy.nav[destination.label]}</span>
      </Link>
    );
  };
  return (
    <nav
      aria-label={copy.shell.navigation}
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-nav)] px-2 pb-[calc(8px+env(safe-area-inset-bottom))] lg:hidden ${stacked ? "max-md:hidden" : ""}`}
    >
      <div className="@container pointer-events-auto mx-auto grid max-w-[560px] grid-cols-[1fr_1fr_64px_1fr_1fr] items-center gap-1 rounded-[24px] bg-raised px-1.5 py-1.5 shadow-[var(--comp-tabbar-shadow)]">
        {tab(0)}
        {tab(1)}
        <AnnotateTrigger variant="bar" />
        {tab(2)}
        {tab(3)}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // /cuenta por debajo de 768: pantalla apilada sin barra inferior, con «Volver» (FR-033; RESPONSIVE_SPECIFICATIONS.md
  // §Cuenta, 390). Desde 768 conserva la barra de tablet, para que Anotar siga a un toque (FR-020; F19-1).
  const stacked = isCurrent(ACCOUNT_HREF, pathname);
  return (
    <div className="min-h-dvh">
      <a
        href="#contenido"
        className="sr-only z-[var(--z-tooltip)] rounded-[var(--radius-md)] bg-overlay px-4 py-3 text-[length:var(--label-m-size)] font-semibold text-ink shadow-overlay focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {copy.shell.skip}
      </a>
      <SideNav pathname={pathname} />
      <div className="lg:pl-[76px] xl:pl-[248px]">
        <div
          className={`mx-auto w-full max-w-[1192px] px-5 pt-3 md:px-7 lg:pt-9 lg:pb-16 xl:px-10 xl:pt-10 ${stacked ? "pb-12 md:pb-[calc(112px+env(safe-area-inset-bottom))]" : "pb-[calc(112px+env(safe-area-inset-bottom))]"}`}
        >
          {/* P0-1, PR C (T066, FR-044): sin el aviso de versión base de la 001; el servidor ya guarda los datos. */}
          <div className="min-w-0">{children}</div>
        </div>
      </div>
      <BottomBar pathname={pathname} stacked={stacked} />
      {/* D21-1 (T077): fin del shell. El <link rel="expect" blocking="render"> del root layout retiene el primer pintado
          hasta que el parser llega aquí, para que el shell nunca se pinte a medio construir (CLS = 0, maestro §15.7). */}
      <div id={SHELL_END_ID} hidden />
    </div>
  );
}

type PageHeaderProps = {
  /** Sin título visible en el encabezado: el estado de la pantalla lleva el `h1` (no encontrado, error). */
  title?: string;
  variant?: "destination" | "account";
  /** Destino de «Volver» en la pantalla apilada de Mi cuenta: Inicio desde /cuenta, /cuenta desde sus secciones. */
  backHref?: string;
};

// Encabezado del contenido. Por debajo de 1024: Mi cuenta a la izquierda, título y selector a la derecha (04·1, 04·6).
// De 1024 a 1279: titular editorial y selector arriba a la derecha (decisión 5). Desde 1280 el selector está en el sidebar.
// Si no caben en una línea (texto al 200 %), el selector baja de línea y sigue a la derecha: nunca se monta sobre el título.
export function PageHeader({ title, variant = "destination", backHref = "/" }: PageHeaderProps) {
  const account = variant === "account";
  return (
    <header className={`flex min-h-11 flex-wrap items-center gap-x-2.5 gap-y-3 pt-4 lg:gap-x-6 lg:pt-0 ${title ? "lg:border-b-[length:var(--border-hairline)] lg:border-border lg:pb-7" : ""}`}>
      {account ? (
        <Link href={backHref} className={`${hitSquare} -ml-2 grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] text-ink hover:bg-sunken md:hidden`}>
          <AppIcon name="caret-left" weight="bold" size={22} />
          <span className="sr-only">{copy.account.back}</span>
        </Link>
      ) : (
        // T047 / FR-050: AccountButton a la izquierda del encabezado de Inicio, Actividad, Metas y Plan (por debajo de 1024).
        <AccountButton className="-ml-0.5 lg:hidden" />
      )}
      {title ? (
        <h1 className="max-w-full font-serif text-[clamp(25px,7.4vw,30px)] leading-none font-medium tracking-[var(--display-xl-tracking)] text-ink lg:text-[clamp(39px,3.7vw,var(--display-xl-size))] lg:leading-[var(--display-xl-line)]">
          {title}
        </h1>
      ) : null}
      {account ? null : <ContextSelector className="ml-auto shrink-0 xl:hidden" />}
    </header>
  );
}
