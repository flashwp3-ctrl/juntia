"use client";
// 004 PR C (T045, T049) / FR-034, FR-037, FR-077, FR-101; GoalCard, «Cinta» (COMPONENT_SPECIFICATIONS) y MOTION_SYSTEM §4.
// Riel de radio pill con un tramo por persona (color + patrón: la persona 2 lleva rayas, nunca solo color) y la marca de
// ritmo (dónde deberían ir para llegar a la fecha), solo si la meta tiene fecha. Sin tramo punteado de «próximo aporte»:
// no hay aportes programados en P0 (Q9). `role="img"` con las cifras por persona. Los tramos solo cambian cuando el
// servidor confirmó (llegan con la página nueva) y entonces su ancho transiciona; con `grow`, crecen desde 0 en stagger de
// 80 ms al abrir la meta inmersiva. Con movimiento reducido, la cinta aparece ya llena.
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { copy } from "@/lib/copy/es";
import { cop } from "./format";
import type { GoalMemberView } from "./types";

type Props = {
  members: readonly Pick<GoalMemberView, "userId" | "name" | "joinOrder" | "availableMinor">[];
  targetMinor: string;
  /** Porcentaje del tiempo transcurrido hacia la fecha objetivo (Q9); sin fecha, nada. */
  pacePercent?: number | null;
  /** Grosor del riel: 10 px en la tarjeta, 16 px en la inmersiva. */
  size?: "card" | "immersive";
  /** Crecer desde 0 al montar (Goal Journey, 300–700 ms). */
  grow?: boolean;
  /** Sobre el tinte de la meta: el riel lleva un borde interior de 1,5 px en `.edge` (≥ 3:1 contra el tinte y el riel). */
  onTint?: boolean;
};

const fill = { 1: "bg-person-1", 2: "bg-[repeating-linear-gradient(135deg,var(--color-person-2)_0_5px,var(--color-person-2-stripe)_5px_9px)]" } as const;

export function GoalRibbon({ members, targetMinor, pacePercent = null, size = "card", grow = false, onTint = false }: Props) {
  const reduced = usePrefersReducedMotion();
  const target = BigInt(targetMinor);
  const parts = members.filter((member) => BigInt(member.availableMinor) > 0n);
  const label = copy.goals.ribbon.label(parts.map((member) => copy.goals.ribbon.part(member.name, cop(member.availableMinor))).join(", ") || cop(0n), cop(targetMinor));
  // Cada tramo es su fracción del objetivo; juntos nunca pasan del riel (un excedente llena la cinta).
  const widths = parts.reduce<number[]>((list, member) => {
    const used = list.reduce((sum, width) => sum + width, 0);
    const share = target > 0n ? Number((BigInt(member.availableMinor) * 10000n) / target) / 100 : 0;
    return [...list, Math.max(0, Math.min(share, 100 - used))];
  }, []);
  const animate = grow && !reduced;
  return (
    <div role="img" aria-label={label} data-ribbon-on-tint={onTint ? "" : undefined} className={`relative w-full rounded-full bg-track ${size === "card" ? "h-2.5" : "h-4"} ${onTint ? "after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:shadow-[inset_0_0_0_1.5px_var(--goal-tint-edge)] after:content-['']" : ""}`}>
      <div className="absolute inset-0 flex overflow-hidden rounded-full">
        {parts.map((member, index) => {
          const width = widths[index];
          return (
            <span
              key={member.userId}
              data-ribbon-part={member.joinOrder}
              data-ribbon-animated={animate ? "" : undefined}
              style={{ width: `${width}%`, animationDelay: animate ? `${300 + index * 80}ms` : undefined }}
              className={`h-full shrink-0 origin-left ${fill[member.joinOrder]} ${index > 0 ? "shadow-[inset_2px_0_0_var(--color-surface-raised)]" : ""} motion-safe:transition-[width] motion-safe:duration-[420ms] motion-safe:ease-[cubic-bezier(.2,0,0,1)] ${animate ? "animate-[ribbon-grow_420ms_cubic-bezier(.2,.8,.2,1)_both]" : ""}`}
            />
          );
        })}
      </div>
      {pacePercent !== null ? (
        <span aria-hidden="true" style={{ left: `${Math.min(100, Math.max(0, pacePercent))}%` }} className={`absolute top-1/2 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pace ${size === "card" ? "h-[18px]" : "h-[26px]"}`} />
      ) : null}
    </div>
  );
}
