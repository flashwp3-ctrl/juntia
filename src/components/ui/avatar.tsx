// FR-009; DESIGN_SYSTEM.md §1.2: inicial y color de persona. Solo person.1 y person.2 (maestro §15.9, fila «Personas»).
// Sin patrón de tramo: es propuesta sin aprobar y P0 no lo usa.
const sizes = { 16: "size-4 text-[9px]", 24: "size-6 text-[11px]", 32: "size-8 text-[13px]", 40: "size-10 text-[15px]" } as const;
const persons = { 1: "bg-person-1", 2: "bg-person-2" } as const;

type AvatarProps = {
  person: 1 | 2;
  initial: string;
  size?: keyof typeof sizes;
  /** Nombre accesible cuando el avatar no va acompañado del nombre en texto. */
  label?: string;
};

export function Avatar({ person, initial, size = 32, label }: AvatarProps) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <span
      {...a11y}
      className={`${sizes[size]} ${persons[person]} inline-grid shrink-0 place-items-center rounded-[32%] font-semibold leading-none text-[var(--comp-avatar-fg)] select-none`}
    >
      {initial}
    </span>
  );
}
