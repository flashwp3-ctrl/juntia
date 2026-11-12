// FR-009; DESIGN_SYSTEM.md §1.2: inicial y color de persona. Solo person.1 y person.2 (maestro §15.9, fila «Personas»).
// 36 (sidebar y rail), 72 (ProfileHeader) y 88 (Mi perfil) llegan con Mi cuenta (COMPONENT_SPECIFICATIONS.md §Cuenta):
// desde 72 la inicial va en Brygada 1918 a la mitad del lado.
// PR B de la 003 (T035; FR-017): el color sale del orden de ingreso a la pareja (1 propietaria, 2 integrante) y cada
// persona lleva su patrón de tramo para no depender del color: persona 1 sólido, persona 2 rayado a 135° (4/3 px),
// como `pfill` del comp 02·9. La paleta de personas se aprueba viendo las capturas del PR B (propuesta §15.9).
const sizes = { 16: "size-4 text-[0.5625rem]", 24: "size-6 text-[0.6875rem]", 32: "size-8 text-[0.8125rem]", 36: "size-9 text-[0.875rem]", 40: "size-10 text-[0.9375rem]", 52: "size-[3.25rem] font-serif text-[1.625rem] !font-normal", 64: "size-16 font-serif text-[2rem] !font-normal", 72: "size-[4.5rem] font-serif text-[2.25rem] !font-normal", 88: "size-[5.5rem] font-serif text-[2.75rem] !font-normal" } as const;

export type Person = 1 | 2;
/** Relleno de una persona con su patrón de tramo. Lo comparten Avatar, AccountButton y el perfil del sidebar. */
export const personFill: Record<Person, string> = {
  1: "bg-person-1",
  2: "bg-[repeating-linear-gradient(135deg,var(--color-person-2)_0_4px,var(--color-person-2-stripe)_4px_7px)]",
};
const patterns: Record<Person, string> = { 1: "solid", 2: "striped" };

type AvatarProps = {
  person: Person;
  initial: string;
  size?: keyof typeof sizes;
  /** Nombre accesible cuando el avatar no va acompañado del nombre en texto. */
  label?: string;
  className?: string;
};

export function Avatar({ person, initial, size = 32, label, className = "" }: AvatarProps) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <span
      {...a11y}
      data-person={person}
      data-pattern={patterns[person]}
      className={`${sizes[size]} ${personFill[person]} inline-grid shrink-0 place-items-center rounded-[32%] font-semibold leading-none text-[var(--comp-avatar-fg)] select-none ${className}`}
    >
      {initial}
    </span>
  );
}
