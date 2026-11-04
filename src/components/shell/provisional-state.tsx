// T052 / FR-030, FR-032, FR-033. Estados provisionales de la 001: «lo que todavía no existe dice que no existe»
// (maestro §15.10). Anatomía del comp 04·6 «Estados de pantalla»: ficha de 88 con radio 28 (32 % del lado, la geometría
// de CategoryIcon), ícono Duotone de 42, título serif y texto útil. Sin ilustraciones de stock (handoff §Auditoría
// anti-slop) y sin botones que aparenten funcionar: el comp dibuja «Anotar el primero» o «Crear una meta», que la 001
// no tiene (FR-030).
import type { ReactNode } from "react";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";

type StateBlockProps = {
  icon: AppIconName;
  title: string;
  description: string;
  /** `h1` cuando la pantalla no tiene otro encabezado (no encontrado, error). */
  headingLevel?: 1 | 2;
  /** Salidas que sí funcionan (Ir a Inicio, Reintentar). Nunca en los estados vacíos. */
  actions?: ReactNode;
  tone: "empty" | "unavailable" | "danger";
};

const chips = {
  // Vacío: ficha hundida, como el comp.
  empty: "bg-sunken text-ink-secondary",
  // Todavía no disponible: contorno punteado, el lenguaje de lo pendiente (DESIGN_SYSTEM.md §1.5, border.pending).
  unavailable: "border-[length:var(--border-strong)] border-dashed border-border-emphasis bg-transparent text-ink-secondary",
  // Error: ficha de error con el ícono en status.danger (≥ 3:1 para un ícono, F17-R1).
  danger: "bg-danger-subtle text-danger",
} as const;

function StateBlock({ icon, title, description, headingLevel = 2, actions, tone }: StateBlockProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section
      data-provisional-state={tone}
      className="mx-auto mt-14 flex max-w-[22rem] flex-col items-center gap-3.5 text-center lg:mx-0 lg:mt-12 lg:max-w-[34rem] lg:items-start lg:gap-4 lg:text-left"
    >
      <span aria-hidden="true" className={`grid size-[88px] shrink-0 place-items-center rounded-[28px] ${chips[tone]} lg:mb-2`}>
        <AppIcon name={icon} weight="duotone" size={42} />
      </span>
      <Heading className="font-serif text-[length:var(--state-title-size)] leading-[1.05] text-ink text-balance [--state-title-size:32px] lg:[--state-title-size:40px]">
        {title}
      </Heading>
      <p className="text-[length:var(--body-m-size)] leading-[1.5] text-pretty text-[var(--comp-shell-muted-fg)] lg:text-[length:var(--body-l-size)]">
        {description}
      </p>
      {actions ? <div className="mt-3 flex flex-wrap justify-center gap-3 lg:justify-start">{actions}</div> : null}
    </section>
  );
}

type Props = Omit<StateBlockProps, "tone">;

export function EmptyState(props: Omit<Props, "actions">) {
  return <StateBlock {...props} tone="empty" />;
}

export function UnavailableState(props: Omit<Props, "actions">) {
  return <StateBlock {...props} tone="unavailable" />;
}

/** No encontrado y error: los únicos estados de la 001 con salidas, porque las dos funcionan. */
export function ExitState({ danger = false, ...props }: Props & { danger?: boolean }) {
  return <StateBlock {...props} tone={danger ? "danger" : "empty"} />;
}
