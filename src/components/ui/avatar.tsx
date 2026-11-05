// FR-009; DESIGN_SYSTEM.md §1.2: inicial y color de persona. Solo person.1 y person.2 (maestro §15.9, fila «Personas»).
// Sin patrón de tramo: es propuesta sin aprobar y P0 no lo usa.
// 36 (sidebar y rail), 72 (ProfileHeader) y 88 (Mi perfil) llegan con Mi cuenta (COMPONENT_SPECIFICATIONS.md §Cuenta):
// desde 72 la inicial va en Brygada 1918 a la mitad del lado.
const sizes = { 16: "size-4 text-[9px]", 24: "size-6 text-[11px]", 32: "size-8 text-[13px]", 36: "size-9 text-[14px]", 40: "size-10 text-[15px]", 72: "size-[72px] font-serif text-[36px] !font-normal", 88: "size-[88px] font-serif text-[44px] !font-normal" } as const;
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
