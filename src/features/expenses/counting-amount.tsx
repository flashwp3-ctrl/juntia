"use client";
// T081 / FR-033, FR-062; MOTION_SYSTEM.md §2 (E5, «+0–240 ms: el total cuenta hacia arriba») y Tokens («counter: 240 ms
// con Intl.NumberFormat('es-CO') y tabular-nums»). El importe héroe de Inicio cuenta del valor anterior al nuevo cuando
// cambia en la misma página (guardar, deshacer), y al subir muestra la diferencia («+186.400», 02·5 E5). En la primera
// pintura y con movimiento reducido enseña el valor final sin animar. El valor exacto viaja como texto (FR-008) y el
// último cuadro es siempre el formateo del `bigint`, nunca el del número interpolado. El lector oye solo el valor final.
import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/domain/money";
import { counterMs } from "@/lib/motion/tokens";
import { pesos } from "@/lib/format";

const money = (amountMinor: bigint) => ({ amountMinor, currency: "COP" as const });
const SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const standard = [0.2, 0, 0, 1] as const;

export function CountingAmount({ amountMinor, className = "" }: { amountMinor: string; className?: string }) {
  const reduced = useReducedMotion();
  const value = BigInt(amountMinor);
  const final = formatMoney(money(value));
  const [shown, setShown] = useState(final);
  const [delta, setDelta] = useState<bigint | null>(null);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) return;
    setDelta(value > from ? value - from : null);
    if (reduced || from > SAFE || value > SAFE) { setShown(formatMoney(money(value))); return; }
    // Se interpola en pesos; cada cuadro se redondea a pesos enteros y el último es el valor exacto.
    const controls = animate(Number(from / 100n), Number(value / 100n), {
      duration: counterMs / 1000,
      ease: standard,
      onUpdate: (latest) => setShown(formatMoney(money(BigInt(Math.round(latest)) * 100n))),
      onComplete: () => setShown(formatMoney(money(value))),
    });
    return () => controls.stop();
  }, [value, reduced]);

  return (
    <p className={`flex flex-wrap items-baseline gap-x-2.5 ${className}`}>
      <span aria-hidden="true" data-counting-amount={final} className="tabular-nums">{reduced ? final : shown}</span>
      <span className="sr-only">{final}</span>
      {delta !== null ? (
        <span aria-hidden="true" data-amount-delta="" className="text-[13px] font-semibold tracking-normal text-ink-secondary">+{pesos(money(delta))}</span>
      ) : null}
    </p>
  );
}
