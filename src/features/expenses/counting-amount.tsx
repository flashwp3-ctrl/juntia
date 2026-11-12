"use client";
// T081 / FR-033, FR-062; MOTION_SYSTEM.md §2 (E5, «+0–240 ms: el total cuenta hacia arriba») y Tokens («counter: 240 ms
// con Intl.NumberFormat('es-CO') y tabular-nums»). El importe héroe de Inicio cuenta del valor anterior al nuevo cuando
// cambia en la misma página (guardar, deshacer), y al subir muestra la diferencia («+186.400», 02·5 E5). En la primera
// pintura y con movimiento reducido enseña el valor final sin animar. El valor exacto viaja como texto (FR-008) y el
// último cuadro es siempre el formateo del `bigint`, nunca el del número interpolado. El lector oye solo el valor final.
// PR D de la 003 (T064; FR-050; MOTION_SYSTEM §1): en un cambio de contexto (S1), el contador que monta con la vista nueva
// cuenta desde lo último que pintó el de la vista anterior (HeroMemory), sin la diferencia «+X», que es de E5. Si se vuelve
// a tocar a mitad, el siguiente cuenta desde donde iba, sin reiniciar.
import { animate } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { formatMoney } from "@/domain/money";
import { useHeroMemory } from "@/features/context/hero-memory";
import { counterMs } from "@/lib/motion/tokens";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { pesos } from "@/lib/format";

const money = (amountMinor: bigint) => ({ amountMinor, currency: "COP" as const });
const SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const standard = [0.2, 0, 0, 1] as const;

export function CountingAmount({ amountMinor, className = "" }: { amountMinor: string; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const memory = useHeroMemory();
  const id = useId();
  const value = BigInt(amountMinor);
  const final = formatMoney(money(value));
  const [shown, setShown] = useState(final);
  const [delta, setDelta] = useState<bigint | null>(null);
  const previous = useRef<bigint | null>(null);

  useEffect(() => {
    const transition = previous.current === null && !reduced ? (memory?.take(id) ?? null) : null;
    const from = previous.current ?? transition ?? value;
    previous.current = value;
    if (from === value) { setShown(formatMoney(money(value))); memory?.report(value); return; }
    setDelta(transition === null && value > from ? value - from : null);
    if (reduced || from > SAFE || value > SAFE) { setShown(formatMoney(money(value))); memory?.report(value); return; }
    // Se interpola en pesos; cada cuadro se redondea a pesos enteros y el último es el valor exacto.
    let completed = false;
    const controls = animate(Number(from / 100n), Number(value / 100n), {
      duration: counterMs / 1000,
      ease: standard,
      onUpdate: (latest) => {
        const minor = BigInt(Math.round(latest)) * 100n;
        memory?.report(minor);
        setShown(formatMoney(money(minor)));
      },
      onComplete: () => { completed = true; memory?.report(value); setShown(formatMoney(money(value))); },
    });
    return () => {
      controls.stop();
      // El doble montaje de StrictMode (desarrollo) no se come la cuenta de S1: el segundo efecto vuelve a leer su origen.
      if (transition !== null && !completed) previous.current = null;
    };
  }, [value, reduced, memory, id]);

  return (
    <p className={`flex flex-wrap items-baseline gap-x-2.5 ${className}`}>
      <span aria-hidden="true" data-counting-amount={final} className="tabular-nums">{reduced ? final : shown}</span>
      <span className="sr-only">{final}</span>
      {delta !== null ? (
        <span aria-hidden="true" data-amount-delta="" className="text-[0.8125rem] font-semibold tracking-normal text-ink-secondary">+{pesos(money(delta))}</span>
      ) : null}
    </p>
  );
}
