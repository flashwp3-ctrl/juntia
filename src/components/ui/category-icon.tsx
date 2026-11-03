// FR-010; COMPONENT_SPECIFICATIONS.md §CategoryIcon; DESIGN_SYSTEM.md §1.3 y §3 («Forma = tipo de fila»).
import { AppIcon, type AppIconName } from "./app-icon";

// Las diez categorías de DESIGN_SYSTEM.md §1.3 con su pictograma y sus tokens de fondo y tinta.
export const categories = {
  market: { icon: "shopping-cart-simple", tone: "bg-category-market-bg text-category-market-fg" },
  restaurants: { icon: "fork-knife", tone: "bg-category-restaurants-bg text-category-restaurants-fg" },
  home: { icon: "house-line", tone: "bg-category-home-bg text-category-home-fg" },
  transport: { icon: "car-profile", tone: "bg-category-transport-bg text-category-transport-fg" },
  health: { icon: "first-aid-kit", tone: "bg-category-health-bg text-category-health-fg" },
  entertainment: { icon: "film-slate", tone: "bg-category-entertainment-bg text-category-entertainment-fg" },
  shopping: { icon: "shopping-bag", tone: "bg-category-shopping-bg text-category-shopping-fg" },
  services: { icon: "wifi-high", tone: "bg-category-services-bg text-category-services-fg" },
  income: { icon: "arrow-down-left", tone: "bg-category-income-bg text-category-income-fg" },
  other: { icon: "dots-three-outline", tone: "bg-category-other-bg text-category-other-fg" },
} as const satisfies Record<string, { icon: AppIconName; tone: string }>;

export type Category = keyof typeof categories;

// Lado / pictograma: sm 32/17 · md 40/20 · lg 48/24 · xl 64/30. Radio = 32 % del lado.
const sizes = { sm: { box: "size-8", icon: 17 }, md: { box: "size-10", icon: 20 }, lg: { box: "size-12", icon: 24 }, xl: { box: "size-16", icon: 30 } } as const;

type CategoryIconProps = {
  size?: keyof typeof sizes;
  selected?: boolean;
} & (
  | { kind: "category"; category: Category } // ficha cuadrada: gasto o ingreso
  | { kind: "saving" } // círculo de ahorro: aporte
  | { kind: "settlement" } // círculo de contorno: liquidación
);

export function CategoryIcon(props: CategoryIconProps) {
  const { size = "md", selected = false } = props;
  const { box, icon } = sizes[size];
  const look =
    props.kind === "category"
      ? { name: categories[props.category].icon, shape: `rounded-[32%] ${categories[props.category].tone}` }
      : props.kind === "saving"
        ? { name: "piggy-bank" as const, shape: "rounded-full bg-saving-subtle text-saving" }
        : { name: "arrows-left-right" as const, shape: "rounded-full border-[length:var(--border-strong)] border-border-emphasis text-settlement" };
  // Seleccionado: anillo de 2 px en tinta, sin cambiar el fondo.
  const ring = selected ? "outline-2 outline-offset-2 outline-ink" : "";
  return (
    <span aria-hidden="true" className={`${box} ${look.shape} ${ring} inline-grid shrink-0 place-items-center`}>
      <AppIcon name={look.name} weight="duotone" size={icon} />
    </span>
  );
}
