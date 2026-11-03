// FR-008; DESIGN_SYSTEM.md §3; maestro §15.2: Phosphor con wrapper tipado e imports individuales (SSR).
import { ArrowDownLeft } from "@phosphor-icons/react/dist/ssr/ArrowDownLeft";
import { ArrowsLeftRight } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CarProfile } from "@phosphor-icons/react/dist/ssr/CarProfile";
import { ChartPieSlice } from "@phosphor-icons/react/dist/ssr/ChartPieSlice";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { CircleNotch } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { Clock } from "@phosphor-icons/react/dist/ssr/Clock";
import { DotsThreeOutline } from "@phosphor-icons/react/dist/ssr/DotsThreeOutline";
import { FilmSlate } from "@phosphor-icons/react/dist/ssr/FilmSlate";
import { FirstAidKit } from "@phosphor-icons/react/dist/ssr/FirstAidKit";
import { FlagBanner } from "@phosphor-icons/react/dist/ssr/FlagBanner";
import { ForkKnife } from "@phosphor-icons/react/dist/ssr/ForkKnife";
import { HouseLine } from "@phosphor-icons/react/dist/ssr/HouseLine";
import { HouseSimple } from "@phosphor-icons/react/dist/ssr/HouseSimple";
import { LockSimple } from "@phosphor-icons/react/dist/ssr/LockSimple";
import { PiggyBank } from "@phosphor-icons/react/dist/ssr/PiggyBank";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { Receipt } from "@phosphor-icons/react/dist/ssr/Receipt";
import { Scales } from "@phosphor-icons/react/dist/ssr/Scales";
import { ShoppingBag } from "@phosphor-icons/react/dist/ssr/ShoppingBag";
import { ShoppingCartSimple } from "@phosphor-icons/react/dist/ssr/ShoppingCartSimple";
import { Tray } from "@phosphor-icons/react/dist/ssr/Tray";
import { UserCircle } from "@phosphor-icons/react/dist/ssr/UserCircle";
import { Warning } from "@phosphor-icons/react/dist/ssr/Warning";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { WifiHigh } from "@phosphor-icons/react/dist/ssr/WifiHigh";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";

// Mapa semántico de DESIGN_SYSTEM.md §3 que usa la 001, circle-notch (§Button, carga), los diez íconos de
// categoría (§1.3) y los dos de las fichas redondas (§3, «Forma = tipo de fila»: aporte y liquidación).
const icons = {
  "house-simple": HouseSimple,
  receipt: Receipt,
  "flag-banner": FlagBanner,
  "chart-pie-slice": ChartPieSlice,
  scales: Scales,
  "user-circle": UserCircle,
  plus: Plus,
  "caret-left": CaretLeft,
  warning: Warning,
  "warning-circle": WarningCircle,
  "check-circle": CheckCircle,
  clock: Clock,
  "lock-simple": LockSimple,
  tray: Tray,
  "circle-notch": CircleNotch,
  "shopping-cart-simple": ShoppingCartSimple,
  "fork-knife": ForkKnife,
  "house-line": HouseLine,
  "car-profile": CarProfile,
  "first-aid-kit": FirstAidKit,
  "film-slate": FilmSlate,
  "shopping-bag": ShoppingBag,
  "wifi-high": WifiHigh,
  "arrow-down-left": ArrowDownLeft,
  "dots-three-outline": DotsThreeOutline,
  "piggy-bank": PiggyBank,
  "arrows-left-right": ArrowsLeftRight,
} as const satisfies Record<string, Icon>;

export type AppIconName = keyof typeof icons;
export type AppIconWeight = "regular" | "fill" | "bold" | "duotone";

type AppIconProps = {
  name: AppIconName;
  weight?: AppIconWeight;
  size?: number;
  /** Con etiqueta, el ícono tiene nombre accesible; sin ella es decorativo. */
  label?: string;
  className?: string;
};

export function AppIcon({ name, weight = "regular", size = 20, label, className }: AppIconProps) {
  const Glyph = icons[name];
  const a11y = label ? { role: "img", "aria-label": label } : ({ "aria-hidden": true, focusable: "false" } as const);
  return <Glyph weight={weight} size={size} className={className} {...a11y} />;
}
