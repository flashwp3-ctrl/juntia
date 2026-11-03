"use client";
// FR-014, FR-013; COMPONENT_SPECIFICATIONS.md §Input (Monto); data-model.md «AmountValue».
// Entrega pesos enteros (`number | null`); no es Money ni decide si 0 es válido: eso es de domain/money en P0-1.
import { useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { Input, type InputProps } from "./input";

const MAX_DIGITS = 9; // 999.999.999
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
function fromValue(value: number | null | undefined): string {
  return value == null ? "" : normalize(String(Math.trunc(Math.abs(value)))).slice(0, MAX_DIGITS);
}

type AmountInputProps = Omit<InputProps, "value" | "defaultValue" | "onChange" | "type" | "inputMode" | "prefix"> & {
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
};

export function AmountInput({ value, defaultValue = null, onValueChange, fieldClassName = "", inputClassName = "", ...rest }: AmountInputProps) {
  const [ownDigits, setOwnDigits] = useState(() => fromValue(defaultValue));
  const digits = value !== undefined ? fromValue(value) : ownDigits;
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
    if (value === undefined) setOwnDigits(next);
    onValueChange?.(toValue(next));
  };

  const shown = format(digits);
  return (
    <Input
      {...rest}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={shown}
      onChange={handleChange}
      prefix={<span aria-hidden="true" className="shrink-0 text-[length:var(--money-m-size)] font-semibold text-ink-secondary">$</span>}
      // Importes largos: el tamaño baja con clamp hasta 28 px según el ancho disponible, sin cortar.
      fieldClassName={`@container min-h-16 py-2 ${fieldClassName}`}
      inputClassName={`text-[length:clamp(28px,calc(100cqi/(var(--amount-chars)*0.62+0.75)),40px)] leading-none font-semibold tracking-[-0.03em] ${inputClassName}`}
      style={{ "--amount-chars": Math.max(shown.length, 4) } as React.CSSProperties}
    />
  );
}
