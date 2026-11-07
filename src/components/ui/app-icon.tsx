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
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CaretRight } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { Check } from "@phosphor-icons/react/dist/ssr/Check";
import { CircleHalf } from "@phosphor-icons/react/dist/ssr/CircleHalf";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { Eye } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlash } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { GearSix } from "@phosphor-icons/react/dist/ssr/GearSix";
import { Info } from "@phosphor-icons/react/dist/ssr/Info";
import { Key } from "@phosphor-icons/react/dist/ssr/Key";
import { Moon } from "@phosphor-icons/react/dist/ssr/Moon";
import { NotePencil } from "@phosphor-icons/react/dist/ssr/NotePencil";
import { PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { PencilSimple } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { SignIn } from "@phosphor-icons/react/dist/ssr/SignIn";
import { SignOut } from "@phosphor-icons/react/dist/ssr/SignOut";
import { Sun } from "@phosphor-icons/react/dist/ssr/Sun";
import { User } from "@phosphor-icons/react/dist/ssr/User";
import { UsersThree } from "@phosphor-icons/react/dist/ssr/UsersThree";
import { WifiSlash } from "@phosphor-icons/react/dist/ssr/WifiSlash";
import { X } from "@phosphor-icons/react/dist/ssr/X";
import { ArrowClockwise } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { FileText } from "@phosphor-icons/react/dist/ssr/FileText";
import { FunnelSimple } from "@phosphor-icons/react/dist/ssr/FunnelSimple";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { Tag } from "@phosphor-icons/react/dist/ssr/Tag";
import { Trash } from "@phosphor-icons/react/dist/ssr/Trash";
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
  "note-pencil": NotePencil,
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
  // P0-1, PR B: acceso y Mi cuenta (04·14–04·19), con los nombres de los comps.
  "arrow-right": ArrowRight,
  "caret-right": CaretRight,
  check: Check,
  "circle-half": CircleHalf,
  "download-simple": DownloadSimple,
  "envelope-simple": EnvelopeSimple,
  eye: Eye,
  "eye-slash": EyeSlash,
  "gear-six": GearSix,
  info: Info,
  key: Key,
  moon: Moon,
  "paper-plane-tilt": PaperPlaneTilt,
  "pencil-simple": PencilSimple,
  "shield-check": ShieldCheck,
  "sign-in": SignIn,
  "sign-out": SignOut,
  sun: Sun,
  user: User,
  "users-three": UsersThree,
  "wifi-slash": WifiSlash,
  x: X,
  // P0-1, PR C: Inicio, Actividad, detalle y Exportar (04·1, 04·6, 04·7, 04·16), con los nombres de los comps.
  "arrow-clockwise": ArrowClockwise,
  "calendar-blank": CalendarBlank,
  "file-text": FileText,
  "funnel-simple": FunnelSimple,
  "magnifying-glass": MagnifyingGlass,
  tag: Tag,
  // P0-1, PR D: eliminar (02·1, diálogo «¿Eliminar este gasto?»).
  trash: Trash,
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
  return <Glyph weight={weight} size={size} className={className} data-icon={name} {...a11y} />;
}
