// T043 / FR-019, FR-021; data-model.md «NavDestination»; DESIGN_SYSTEM.md §3 (mapa semántico).
// Mi cuenta y Anotar no son destinos de este arreglo: tienen su propio lugar en cada composición.
import type { AppIconName } from "@/components/ui/app-icon";
import type { copy } from "@/lib/copy/es";

export type NavDestinationId = "home" | "activity" | "goals" | "plan" | "balance";

export type NavDestination = {
  id: NavDestinationId;
  href: string;
  icon: AppIconName;
  label: keyof typeof copy.nav;
  /** Solo en el rail y el sidebar (maestro §15.3, decisión 4). */
  desktopOnly: boolean;
};

export const navDestinations: readonly NavDestination[] = [
  { id: "home", href: "/", icon: "house-simple", label: "home", desktopOnly: false },
  { id: "activity", href: "/actividad", icon: "receipt", label: "activity", desktopOnly: false },
  { id: "goals", href: "/metas", icon: "flag-banner", label: "goals", desktopOnly: false },
  { id: "plan", href: "/plan", icon: "chart-pie-slice", label: "plan", desktopOnly: false },
  { id: "balance", href: "/balance", icon: "scales", label: "balance", desktopOnly: true },
];

export const ACCOUNT_HREF = "/cuenta";

/** Coincidencia exacta para `/`; por prefijo de segmento para las demás. */
export function isCurrent(href: string, pathname: string | null) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function currentDestination(pathname: string | null) {
  return navDestinations.find((destination) => isCurrent(destination.href, pathname)) ?? null;
}
