"use client";
// 004 PR C (T045) / FR-035, FR-076; US-4.10; GoalStack [P], aprobado en su forma (decisión 22.2; COMPONENT_SPECIFICATIONS):
// hasta tres capas visibles —la frontal completa, la segunda asoma 60 px con nombre y %, la tercera solo un canto de
// color— y un pie con «N metas» y «Ver todas», siempre visible como alternativa al gesto. 0 metas: nada (la pantalla
// enseña el vacío); 1: solo la tarjeta; 2: frontal + 1; 3 o más: frontal + 2; más de 3, el conteo en el pie.
// Tocar la frontal la abre; tocar la que asoma la trae al frente (spring `card`). Teclado: Tab entre tarjetas y Enter abre.
// Lector de pantalla: una lista de metas, no un carrusel; las que no caben en la pila siguen en la lista (fuera de la
// vista y fuera del orden de tabulación: «Ver todas» es el camino del teclado). Desde lg, la pila se abre en abanico
// horizontal (la segunda girada 4°) con «+» punteado para crear meta (RESPONSIVE).
// La `[V]` de rendimiento del abanico con 6 metas en gama media (T054) es del gestor; si falla, el PR cae a la lista.
// Decisión de los fundadores del 11 de noviembre de 2026 (revisión T056; antes, PR #68 con el gesto vertical): en móvil,
// «deslizar horizontal recorre la pila». La tarjeta frontal se arrastra en horizontal (spring `card` al soltar); a la
// izquierda trae la siguiente y a la derecha la anterior, pasado un umbral de distancia o de velocidad. La capa arrastrable
// lleva `touch-action: pan-y`, así que un desplazamiento vertical empezado sobre la tarjeta mueve la página. Nunca hay gesto
// en el abanico de escritorio. Con movimiento reducido la tarjeta no sigue al dedo y el cambio es inmediato. Las
// alternativas siguen: tocar la que asoma y «Ver todas». En Inicio, «Ver todas» lleva a Metas en el contexto actual
// (`seeAllHref`) y es el único camino a Metas desde el módulo.
import Link from "next/link";
import * as m from "motion/react-m";
import type { PanInfo } from "motion/react";
import { useEffect, useRef, useState, type FocusEvent } from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { AppIcon } from "@/components/ui/app-icon";
import { copy } from "@/lib/copy/es";
import { StableLabel } from "@/components/ui/stable-label";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { GoalCard } from "./goal-card";
import { stackOrder } from "./format";
import type { GoalMemberView, GoalView, PlanningContext } from "./types";

type Props = {
  goals: readonly GoalView[];
  members: Readonly<Record<string, readonly GoalMemberView[]>>;
  today: string;
  context: PlanningContext;
  /** El «+» del abanico. Sin él (Inicio), no hay «+». */
  onCreate?: () => void;
  /** Encabezado accesible de la lista; por defecto «Metas». */
  label?: string;
  /** Abanico desde lg (Metas). En Inicio la pila sigue vertical también desde lg (04·7: la meta, en la columna de 7/12). */
  fan?: boolean;
  /** Con él, «Ver todas» navega (Inicio → `/metas`) en lugar de desplegar la lista aquí. */
  seeAllHref?: string;
};

/** Abanico (Juntia DS v1, «08·7 Abanico · hover y foco»): una tarjeta vuelve al reposo 60 ms después de que el puntero la deja. */
export const FAN_REST_DELAY_MS = 60;

/**
 * Orden de la pila: primero el ámbito (en Yo, las personales delante de las compartidas: Q11) y, dentro de cada uno, la del
 * aporte más reciente (`stackOrder`). En Nosotros todas son compartidas, así que solo cuenta `stackOrder`.
 */
export const stackSort = (a: GoalView, b: GoalView) => (a.scope !== b.scope ? (a.scope === "personal" ? -1 : 1) : stackOrder(a, b));

/** La meta que queda al frente tras deslizar `step` (1 la siguiente, -1 la anterior), por id: la lista se reordena sola. */
export function stepFront(ids: readonly string[], frontId: string | null, step: -1 | 0 | 1): string | null {
  if (ids.length === 0) return null;
  const start = Math.max(0, frontId === null ? 0 : ids.indexOf(frontId));
  return ids[(start + step + ids.length) % ids.length];
}

/** Reloj de los manejadores del gesto (fuera del render). */
const now = () => Date.now();

/** Umbrales del deslizamiento: 64 px de recorrido o 500 px/s de velocidad, en horizontal. */
export const SWIPE = { distancePx: 64, velocityPxPerS: 500 } as const;

/**
 * Qué hace un deslizamiento horizontal sobre la pila: `1` trae la siguiente (a la izquierda), `-1` la anterior (a la
 * derecha) y `0` nada. Un gesto más vertical que horizontal es scroll de la página y no cuenta.
 */
export function swipeStep(offset: { x: number; y: number }, velocity: { x: number; y: number }): -1 | 0 | 1 {
  if (Math.abs(offset.y) >= Math.abs(offset.x)) return 0;
  if (offset.x <= -SWIPE.distancePx || velocity.x <= -SWIPE.velocityPxPerS) return 1;
  if (offset.x >= SWIPE.distancePx || velocity.x >= SWIPE.velocityPxPerS) return -1;
  return 0;
}

const card = { type: "spring", stiffness: 260, damping: 28, mass: 1 } as const;
// Posición de cada capa: en móvil, apiladas hacia arriba (la segunda deja 60 px a la vista y la tercera un canto de 12);
// desde lg, en abanico hacia la derecha, la segunda girada 4°.
const WIDE = "lg:w-[280px]";
function layerClass(visible: number, index: number, fan: boolean) {
  if (!fan) {
    if (index === 0) return `relative z-30 ${visible === 3 ? "mt-[72px]" : visible === 2 ? "mt-[60px]" : ""}`;
    return `absolute inset-x-0 origin-top ${index === 1 ? `${visible === 3 ? "top-[12px]" : "top-0"} z-20 scale-x-[.96]` : "top-0 z-10 scale-x-[.92]"}`;
  }
  if (index === 0) return `relative z-30 ${visible === 3 ? "mt-[72px]" : visible === 2 ? "mt-[60px]" : ""} lg:mt-0 ${visible === 1 ? "" : WIDE}`;
  const mobile = index === 1 ? `${visible === 3 ? "top-[12px]" : "top-0"} z-20 scale-x-[.96]` : "top-0 z-10 scale-x-[.92]";
  const spread = index === 1 ? "lg:left-[224px] lg:rotate-[4deg]" : "lg:left-[448px] lg:rotate-[7deg]";
  return `absolute inset-x-0 origin-top ${mobile} lg:inset-x-auto lg:top-2 lg:origin-bottom-left lg:scale-x-100 ${spread} ${WIDE}`;
}

export function GoalStack({ goals: given, members, today, context, onCreate, label = copy.goals.stack.list, fan = true, seeAllHref }: Props) {
  // Al frente, la del aporte más reciente dentro de su ámbito (stackSort); tocar o deslizar mueve el frente desde ahí. El
  // frente se guarda por id: tras un `router.refresh` la lista puede llegar en otro orden y sigue la misma meta delante.
  const goals = [...given].sort(stackSort);
  const reduced = usePrefersReducedMotion();
  const [frontId, setFrontId] = useState<string | null>(null);
  const [listed, setListed] = useState(false);
  // En el abanico de escritorio no hay gesto: las tarjetas están una al lado de la otra.
  const fanned = useMediaQuery("(min-width: 1024px)") && fan;
  // El clic que el navegador dispara al soltar un arrastre no abre la meta: se descartan los clics desde que empieza el
  // arrastre hasta 350 ms después de terminar (el clic puede llegar antes del aviso de fin de Motion).
  const dragEndedAt = useRef(0);
  // F74-1 (revisión del PR #74): ese clic no navega (onClickCapture de la lista); mientras dura, la lista lo dice con
  // `data-stays-on-page` para que E5 no lo tome por una navegación.
  const listRef = useRef<HTMLUListElement>(null);
  // F74-3: un solo temporizador: cada arrastre cancela el anterior, así que la señal se quita 350 ms después del ÚLTIMO.
  const staysTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (staysTimer.current) clearTimeout(staysTimer.current); }, []);
  // Abanico: la tarjeta con hover o foco de teclado. Reacciona al instante y vuelve al reposo a los 60 ms; si el puntero pasa a
  // otra dentro de ese margen, va directo a la nueva. El efecto visual vive en globals.css, solo con puntero fino y desde lg.
  // 005 · PR B (corrección 4, D3): `data-fan-active` se pone en el DOM, no en el estado de React. Con estado, cada hover volvía a
  // pintar las capas `m.li` con `layout` y Motion medía otra vez el documento en el fotograma de la interacción; el primer hover a
  // 1440 no llegaba a 55 fps con la CPU a 4× (run 44349192421). El efecto es solo CSS.
  const fanRef = useRef<HTMLDivElement>(null);
  // F90-1 (revisión del #90): el DOM guarda el índice de capa, pero el estado del efecto se guarda por META (id). Tras un render
  // que cambie el orden, el número de metas o `fan`, un efecto vuelve a poner el atributo en el índice actual de esa meta, o lo
  // quita si ya no está entre las visibles. Así un router.refresh no activa otra tarjeta mientras el foco sigue en la misma.
  const activeId = useRef<string | null>(null);
  const visibleIds = useRef<readonly string[]>([]);
  const paint = () => {
    const index = activeId.current === null ? -1 : visibleIds.current.indexOf(activeId.current);
    if (index < 0) fanRef.current?.removeAttribute("data-fan-active");
    else fanRef.current?.setAttribute("data-fan-active", String(index));
  };
  const setActive = (id: string | null) => { activeId.current = id; paint(); };
  const rest = useRef<ReturnType<typeof setTimeout> | null>(null);
  // La meta con foco de teclado: al salir el ratón, el efecto vuelve a ella en lugar de apagarse.
  const focused = useRef<string | null>(null);
  useEffect(() => () => { if (rest.current) clearTimeout(rest.current); }, []);
  const enter = (id: string) => { if (rest.current) clearTimeout(rest.current); rest.current = null; setActive(id); };
  const leave = () => { if (rest.current) clearTimeout(rest.current); rest.current = setTimeout(() => { rest.current = null; setActive(focused.current); }, FAN_REST_DELAY_MS); };
  const focusIn = (id: string) => (event: FocusEvent<HTMLElement>) => { if ((event.target as HTMLElement).matches?.(":focus-visible")) { focused.current = id; enter(id); } };
  const focusOut = () => { focused.current = null; leave(); };
  // Las metas visibles del abanico, en orden de capa (las mismas cuentas que abajo, antes de la salida temprana).
  const frontIndex = Math.max(0, frontId === null ? 0 : goals.findIndex((goal) => goal.id === frontId));
  const shownKey = fan ? [...goals.slice(frontIndex), ...goals.slice(0, frontIndex)].slice(0, 3).map((goal) => goal.id).join(",") : "";
  useEffect(() => {
    visibleIds.current = shownKey ? shownKey.split(",") : [];
    paint();
  });
  if (goals.length === 0) return null;
  const start = Math.max(0, frontId === null ? 0 : goals.findIndex((goal) => goal.id === frontId));
  const ordered = [...goals.slice(start), ...goals.slice(0, start)];
  const visible = Math.min(ordered.length, 3);
  const swipe = !fanned && goals.length > 1;
  const onDragEnd = (_event: unknown, info: PanInfo) => {
    dragEndedAt.current = now();
    listRef.current?.setAttribute("data-stays-on-page", "");
    if (staysTimer.current) clearTimeout(staysTimer.current);
    staysTimer.current = setTimeout(() => { staysTimer.current = null; listRef.current?.removeAttribute("data-stays-on-page"); }, 350);
    const step = swipeStep(info.offset, info.velocity);
    if (step !== 0) setFrontId(stepFront(goals.map((goal) => goal.id), goals[start].id, step));
  };
  const seeAllClass = "inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] px-2 text-[length:var(--label-m-size)] font-semibold text-ink underline underline-offset-4 hover:bg-sunken";
  const footer = (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <span className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{copy.goals.stack.count(goals.length)}</span>
      {seeAllHref ? <Link href={seeAllHref} data-goal-see-all="" className={seeAllClass}><StableLabel text={copy.goals.stack.seeAll} /></Link> : (
        <button type="button" data-goal-see-all="" onClick={() => setListed((value) => !value)} aria-expanded={listed} className={seeAllClass}>
          <StableLabel text={listed ? copy.goals.stack.collapse : copy.goals.stack.seeAll} />
        </button>
      )}
    </div>
  );
  if (listed) {
    return (
      <div className="flex flex-col gap-3">
        <ul aria-label={copy.goals.stack.showAll} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => <li key={goal.id}><GoalCard goal={goal} members={members[goal.id] ?? []} today={today} context={context} /></li>)}
        </ul>
        {footer}
      </div>
    );
  }
  // F19 (auditoría de Impeccable): desde lg, el abanico y su pie forman un bloque del ancho del abanico (con el «+»), así «N
  // metas» y «Ver todas» quedan pegados a las tarjetas y no a 1.000 px. Las tarjetas conservan el tamaño y el paso del
  // abanico aprobados (08·7; MOTION_SYSTEM §4.1).
  return (
    <div data-goal-stack="" className={`flex flex-col gap-2 ${fan ? "lg:w-fit lg:max-w-full" : ""}`}>
      <div ref={fanRef} className="lg:flex lg:items-start lg:gap-6" data-fan={fan ? "" : undefined}>
        <ul aria-label={label} ref={listRef}
          // En la lista y no en la tarjeta: al soltar, la pila ya cambió de frontal y la tarjeta arrastrada pasó atrás.
          onClickCapture={swipe ? (event) => { if (now() - dragEndedAt.current < 350) { event.preventDefault(); event.stopPropagation(); } } : undefined}
          className={`relative flow-root ${fan ? `lg:min-h-[244px] lg:flex-none ${visible === 1 ? "lg:w-[360px] lg:max-w-full" : visible === 2 ? "lg:w-[504px]" : "lg:w-[728px]"}` : ""}`}>
          {ordered.map((goal, index) => {
            const shown = index < visible;
            return (
              <m.li
                key={goal.id}
                layout={reduced ? false : "position"}
                transition={card}
                data-stack-layer={shown ? index : undefined}
                data-fan-layer={fan && shown ? index : undefined}
                // El área de hover es el `li`, que no se mueve: el movimiento va en los envoltorios de dentro. Así, con el puntero
                // en el borde de abajo o en una esquina, la tarjeta no se escapa de debajo y no hay bucle de entrar y salir.
                onPointerEnter={fan && shown ? (event: React.PointerEvent) => { if (event.pointerType === "mouse") enter(goal.id); } : undefined}
                onPointerLeave={fan && shown ? (event: React.PointerEvent) => { if (event.pointerType === "mouse") leave(); } : undefined}
                onFocus={fan && shown ? focusIn(goal.id) : undefined}
                onBlur={fan && shown ? focusOut : undefined}
                // 005 · PR B (corrección 4, D3): la capa arrastrable existe antes del primer deslizamiento (antes se creaba y pintaba en el
                // primer fotograma del gesto: 93,5 % y uno de 199,9 ms con CPU 4×, run 44349192421). Solo la frontal, solo en la pila.
                className={`${shown ? layerClass(visible, index, fan) : "sr-only"} ${index === 0 && swipe ? "touch-pan-y will-change-transform" : ""}`}
                // Deslizar horizontal recorre la pila (solo la frontal y fuera del abanico); el vertical es de la página.
                {...(index === 0 && swipe ? {
                  drag: "x" as const, dragConstraints: { left: 0, right: 0 }, dragElastic: reduced ? 0 : 0.5, dragSnapToOrigin: true,
                  dragTransition: { bounceStiffness: card.stiffness, bounceDamping: card.damping },
                  onDragStart: () => { dragEndedAt.current = Number.POSITIVE_INFINITY; },
                  onDragEnd,
                  "data-swipe": "",
                } : {})}
              >
                {/* Abanico: `data-fan-tilt` deshace el giro con el mismo pivote que el `li` y `data-fan-card` sube y escala desde el
                    centro inferior. En reposo no tienen transformación: el abanico queda como el aprobado. */}
                <div data-fan-tilt="">
                  <div data-fan-card="">
                    <GoalCard
                      goal={goal}
                      members={members[goal.id] ?? []}
                      today={today}
                      context={context}
                      peek={index > 0 && shown}
                      fanned={fan}
                      tabIndex={shown ? undefined : -1}
                      // La que asoma se trae al frente con el primer toque; la frontal (o Enter con el teclado) abre.
                      onPeekClick={index > 0 && shown ? (event) => { if (event.detail > 0) { event.preventDefault(); setFrontId(goal.id); } } : undefined}
                    />
                  </div>
                </div>
              </m.li>
            );
          })}
        </ul>
        {onCreate ? (
          <button type="button" onClick={onCreate}
            data-goal-create=""
            className="hidden h-[228px] w-[132px] shrink-0 flex-col items-center justify-center gap-2.5 rounded-[26px] border-2 border-dashed border-ink-secondary text-[length:var(--label-m-size)] font-semibold text-ink lg:flex">
            <span aria-hidden="true" data-goal-create-plus="" className="grid size-11 place-items-center rounded-full bg-raised shadow-raised"><AppIcon name="plus" weight="bold" size={20} /></span>
            {copy.goals.stack.create}
          </button>
        ) : null}
      </div>
      {footer}
    </div>
  );
}
