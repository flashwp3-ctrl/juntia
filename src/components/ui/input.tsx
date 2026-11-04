// FR-013; COMPONENT_SPECIFICATIONS.md §Input: label, ayuda, error anunciado y enlazado, disabled.
import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { AppIcon, type AppIconName } from "./app-icon";

export type InputProps = Omit<ComponentPropsWithRef<"input">, "size" | "prefix"> & {
  label: string;
  help?: string;
  /** Mensaje que dice cómo corregir; con él, el campo queda inválido y se anuncia. */
  error?: string;
  endIcon?: AppIconName;
  /** Adorno visual al inicio del campo (por ejemplo, el signo de pesos de AmountInput). */
  prefix?: ReactNode;
  fieldClassName?: string;
  inputClassName?: string;
};

export function Input({ label, help, error, endIcon, prefix, disabled, id, fieldClassName = "", inputClassName = "", className = "", ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const labelId = `${autoId}-label`;
  const helpId = `${autoId}-help`;
  const errorId = `${autoId}-error`;
  const invalid = Boolean(error);
  const showHelp = Boolean(help) && !invalid;

  // Campo de 48 px, radio 14, superficie hundida con sombra interior. El foco es un anillo de 2 px que no cambia el tamaño.
  const field = disabled
    ? "bg-canvas border border-dashed border-border text-ink-secondary"
    : invalid
      ? "bg-sunken shadow-[0_0_0_var(--border-strong)_var(--color-status-danger)] text-ink"
      : "bg-sunken shadow-[var(--comp-field-inset)] text-ink";

  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      {/* D-02 (T077): el <label> envuelve el rótulo y el marco, así que un clic en cualquier punto del marco (relleno,
          prefijo, ícono) enfoca el <input> por la activación nativa del label, también antes de hidratar. El nombre
          accesible sale solo del rótulo por aria-labelledby, sin el «$» ni el valor. */}
      <label className="flex min-w-0 flex-col gap-1.5">
        <span id={labelId} className="text-[length:var(--label-s-size)] leading-[var(--label-s-line)] font-medium text-ink-secondary">
          {label}
        </span>
        {/* D-05 (T077): body.m va en el marco y el <input> lo hereda (preflight le da `font: inherit`). Así una clase de
            tamaño en inputClassName, como el clamp de AmountInput, no compite con la de Input por orden de CSS. */}
        <span className={`flex min-h-12 items-center gap-2 rounded-[var(--radius-md)] px-[14px] text-[length:var(--body-m-size)] focus-within:outline-[length:var(--border-focus)] focus-within:outline-offset-[var(--focus-offset)] focus-within:outline-focus focus-within:outline-solid ${disabled ? "" : "cursor-text"} ${field} ${fieldClassName}`}>
          {prefix}
          <input
            {...rest}
            id={inputId}
            disabled={disabled}
            aria-labelledby={labelId}
            aria-invalid={invalid || undefined}
            aria-errormessage={invalid ? errorId : undefined}
            aria-describedby={[showHelp ? helpId : null, invalid ? errorId : null].filter(Boolean).join(" ") || undefined}
            className={`min-w-0 flex-1 bg-transparent font-medium placeholder:text-[var(--comp-field-muted-fg)] focus-visible:outline-none disabled:cursor-not-allowed ${inputClassName}`}
          />
          {endIcon ? <AppIcon name={endIcon} size={20} className="shrink-0 text-ink-secondary" /> : null}
        </span>
      </label>
      {showHelp ? (
        <p id={helpId} className="text-[length:var(--label-s-size)] leading-[var(--label-s-line)] text-ink-secondary">
          {help}
        </p>
      ) : null}
      {/* La región existe siempre para que el lector anuncie el error cuando aparece. */}
      <div aria-live="polite" className="empty:hidden">
        {invalid ? (
          <p id={errorId} className="flex items-center gap-[5px] text-[length:var(--label-s-size)] leading-[var(--label-s-line)] font-medium text-[var(--comp-danger-text-fg)]">
            <AppIcon name="warning-circle" weight="bold" size={14} className="shrink-0 text-danger" />
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
