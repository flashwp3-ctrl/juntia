"use client";
// FR-014, FR-013; COMPONENT_SPECIFICATIONS.md §Input (Monto); data-model.md «AmountValue».
// Entrega pesos enteros (`number | null`); no es Money ni decide si 0 es válido: eso es de domain/money, con el slice que trae el dominio de dinero.
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { copy } from "@/lib/copy/es";
import { Input, type InputProps } from "./input";

const MAX_DIGITS = 9;
const MAX_VALUE = 999_999_999;
const formatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

// Cadena de 0 a 9 dígitos, sin ceros a la izquierda salvo el propio 0.
function normalize(digits: string): string {
  return digits.replace(/^0+(?=\d)/, "");
}
function format(digits: string): string {
  return digits === "" ? "" : formatter.format(Number(digits));
}
function toValue(digits: string): number | null {
  return digits === "" ? null : Number(digits); // entero exacto: nunca supera 2^53
}
// F17-4: solo un entero entre 0 y 999.999.999 es un importe que el campo puede mostrar.
function isAmount(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_VALUE;
}
// Un valor externo fuera de rango nunca se reformatea como otro importe: el campo queda vacío.
function fromValue(value: number | null | undefined): string {
  return value == null || !isAmount(value) ? "" : String(value);
}
function outOfRange(value: number | null | undefined): boolean {
  return value != null && !isAmount(value);
}

type AmountInputProps = Omit<InputProps, "value" | "defaultValue" | "onChange" | "type" | "inputMode" | "prefix"> & {
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
};

export function AmountInput({ value, defaultValue = null, onValueChange, error, fieldClassName = "", inputClassName = "", ...rest }: AmountInputProps) {
  const [ownDigits, setOwnDigits] = useState(() => fromValue(defaultValue));
  // Sin control externo, el aviso de un defaultValue fuera de rango dura hasta que la persona escribe.
  const [defaultInvalid, setDefaultInvalid] = useState(() => outOfRange(defaultValue));
  const controlled = value !== undefined;
  const digits = controlled ? fromValue(value) : ownDigits;
  const invalidExternal = controlled ? outOfRange(value) : defaultInvalid;
  const rejected = controlled ? value : defaultValue;
  useEffect(() => {
    if (invalidExternal && process.env.NODE_ENV !== "production") {
      console.warn(`AmountInput: ${String(rejected)} no es un entero entre 0 y ${MAX_VALUE}; el campo se muestra vacío e inválido.`);
    }
  }, [invalidExternal, rejected]);
  const ref = useRef<HTMLInputElement>(null);
  // Dígitos a la derecha del cursor, para conservar su lugar cuando la máscara añade o quita puntos.
  const caretFromEnd = useRef<number | null>(null);

  useLayoutEffect(() => {
    const input = ref.current;
    if (!input || caretFromEnd.current === null || document.activeElement !== input) return;
    const text = input.value;
    let remaining = caretFromEnd.current;
    let position = text.length;
    while (position > 0 && remaining > 0) {
      position -= 1;
      if (/\d/.test(text[position])) remaining -= 1;
    }
    input.setSelectionRange(position, position);
    caretFromEnd.current = null;
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const next = normalize(raw.replace(/\D/g, ""));
    // Sin dígitos nuevos (letras, símbolos o un pegado sin números) el valor no cambia; vacío sí es un cambio.
    if (next === digits || (next === "" && raw !== "")) { event.target.value = format(digits); return; }
    if (next.length > MAX_DIGITS) { event.target.value = format(digits); return; }
    const caret = event.target.selectionEnd ?? raw.length;
    caretFromEnd.current = raw.slice(caret).replace(/\D/g, "").length;
    if (!controlled) { setOwnDigits(next); setDefaultInvalid(false); }
    onValueChange?.(toValue(next));
  };

  const shown = format(digits);
  return (
    <Input
      {...rest}
      // Un valor externo fuera de rango prevalece sobre un error vacío (F17-R3): se usa el error recibido si trae
      // texto y, si no, el mensaje del catálogo.
      error={error || (invalidExternal ? copy.primitives.amountError : undefined)}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={shown}
      onChange={handleChange}
      prefix={<span aria-hidden="true" className="shrink-0 text-[length:var(--money-m-size)] font-semibold text-[var(--comp-field-muted-fg)]">$</span>}
      // Importes largos: el tamaño baja con clamp hasta 28 px según el ancho disponible, sin cortar.
      // D-05 (T077): a 40 px Chrome da al <input> un alto de línea `normal` aunque pida leading-none. Con Onest es 1,275
      // (51 px); con py-1.5 el marco se queda en el mínimo de 64 px (12 + 51) y no crece.
      // Decisión 14: 0,68 em por carácter. Onest 600 con tnum y -0,03 em mide hasta 0,590 em por carácter en importes
      // formateados, frente a 0,537 de Geist; el coeficiente sube en la misma proporción (0,62 × 1,099).
      fieldClassName={`@container min-h-16 py-1.5 ${fieldClassName}`}
      inputClassName={`text-[length:clamp(28px,calc(100cqi/(var(--amount-chars)*0.68+0.75)),2.5rem)] leading-none font-semibold tracking-[-0.03em] ${inputClassName}`}
      style={{ "--amount-chars": Math.max(shown.length, 4) } as React.CSSProperties}
    />
  );
}
