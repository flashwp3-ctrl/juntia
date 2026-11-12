// T047 / FR-050, FR-051; COMPONENT_SPECIFICATIONS.md §ProfileHeader, §AccountMenuItem; 04·14 y 04·18.
// La ficha de cada fila reutiliza el fondo de una categoría («Cuenta reutiliza los fondos de categoría», propuesta §15.9
// que se aprueba viendo la pantalla en este PR): Mi perfil hogar, Mi pareja restaurantes, Apariencia entretenimiento,
// Privacidad salud, Seguridad transporte, Exportar servicios.
import Link from "next/link";
import type { ReactNode } from "react";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { Avatar } from "@/components/ui/avatar";
import { InlineNotice } from "@/components/ui/inline-notice";
import { initialOf } from "@/domain/account";
import { copy } from "@/lib/copy/es";

export const tileTones = {
  home: "bg-category-home-bg text-category-home-fg",
  restaurants: "bg-category-restaurants-bg text-category-restaurants-fg",
  entertainment: "bg-category-entertainment-bg text-category-entertainment-fg",
  health: "bg-category-health-bg text-category-health-fg",
  transport: "bg-category-transport-bg text-category-transport-fg",
  services: "bg-category-services-bg text-category-services-fg",
  neutral: "bg-sunken text-ink",
} as const;
export type TileTone = keyof typeof tileTones;

export function Tile({ icon, tone, size = 40 }: { icon: AppIconName; tone: TileTone; size?: 32 | 34 | 40 }) {
  const box = { 32: "size-8 rounded-[10px]", 34: "size-[34px] rounded-[11px]", 40: "size-10 rounded-[13px]" }[size];
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center ${box} ${tileTones[tone]}`}>
      <AppIcon name={icon} weight="duotone" size={size / 2} />
    </span>
  );
}

/** Encabezado de una sección de Mi cuenta: «Volver» de 44 y título serif en la pila móvil; en escritorio, el título de la columna abierta. */
export function AccountPageTitle({ title, backHref = "/cuenta" }: { title: string; backHref?: string }) {
  return (
    <header className="flex min-h-11 items-center gap-2.5 pt-4 lg:pt-0 xl:pb-1.5">
      <Link href={backHref} className="relative -ml-2 grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] text-ink after:absolute after:inset-0 after:content-[''] hover:bg-sunken xl:hidden">
        <AppIcon name="caret-left" weight="bold" size={22} />
        <span className="sr-only">{copy.account.back}</span>
      </Link>
      <h1 className="font-serif text-[clamp(26px,7.4vw,30px)] leading-none font-medium tracking-[var(--display-xl-tracking)] text-ink md:text-[34px] xl:text-[40px]">{title}</h1>
    </header>
  );
}

/** PR B de la 003 (T035, FR-017): `person` es el color por orden de ingreso a la pareja (1 sin pareja activa). */
export function ProfileHeader({ displayName, email, framed = false, person = 1 }: { displayName: string; email: string; framed?: boolean; person?: 1 | 2 }) {
  return (
    <div className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-4 ${framed ? "rounded-[24px] bg-raised p-5 shadow-raised" : ""}`}>
      <Avatar person={person} initial={initialOf(displayName)} size={72} />
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="font-serif text-[clamp(30px,9vw,40px)] leading-none font-medium tracking-[-0.01em] break-words text-ink">{displayName}</span>
        <span className="text-[14px] [overflow-wrap:anywhere] text-ink-secondary">{email}</span>
      </span>
      <Link href="/cuenta/perfil" className="relative col-span-full inline-flex h-11 items-center gap-2 justify-self-start rounded-[var(--radius-md)] bg-raised px-4 text-[length:var(--label-m-size)] font-semibold text-ink shadow-raised">
        <AppIcon name="pencil-simple" weight="bold" size={17} />
        {copy.account.editProfile}
      </Link>
    </div>
  );
}

type MenuItemProps = { href: string; icon: AppIconName; tone: TileTone; title: string; hint?: string; value?: string; last?: boolean };

export function AccountMenuItem({ href, icon, tone, title, hint, value, last = false }: MenuItemProps) {
  return (
    <Link href={href} className={`grid min-h-16 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 ${last ? "" : "border-b-[length:var(--border-hairline)] border-border"}`}>
      <Tile icon={icon} tone={tone} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-ink">{title}</span>
        {hint ? <span className="text-[13px] leading-[1.4] text-pretty text-ink-secondary">{hint}</span> : null}
      </span>
      <span className="flex items-center gap-2 text-[14px] font-medium text-ink-secondary">
        {value}
        <AppIcon name="caret-right" size={18} />
      </span>
    </Link>
  );
}

export function MenuGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-[26px] flex flex-col">
      <h2 className="pb-0.5 font-serif text-[24px] leading-tight font-normal text-ink">{title}</h2>
      {children}
    </section>
  );
}

/**
 * F10 (auditoría Impeccable, nov 2026): el aviso de sesión caducada de Mi cuenta. «Entrar de nuevo» es su única salida, así
 * que no va como enlace en línea (98 × 17 px) sino con la forma del botón secundario `sm` (36 de alto, área de 44 con
 * `::after`; COMPONENT_SPECIFICATIONS §Button). Sigue siendo un enlace: navega a /entrar y vuelve a `back`.
 */
export function SessionExpiredNotice({ back }: { back: string }) {
  return (
    <InlineNotice tone="danger" icon="warning-circle">
      {copy.errors.sessionExpired}
      <span className="mt-2.5 flex">
        <Link
          href={`/entrar?volver=${encodeURIComponent(back)}`}
          className="relative inline-flex h-9 shrink-0 items-center gap-2 rounded-[12px] bg-raised px-3 text-[length:var(--label-m-size)] leading-none font-semibold whitespace-nowrap text-ink shadow-raised after:absolute after:-inset-y-1 after:-inset-x-0 after:content-[''] hover:bg-sunken motion-safe:transition-colors motion-safe:duration-[var(--duration-instant)]"
        >
          <AppIcon name="sign-in" weight="bold" size={17} />
          {copy.account.signInAgain}
        </Link>
      </span>
    </InlineNotice>
  );
}
