"use client";
// FR-031a, FR-041; COMPONENT_SPECIFICATIONS.md §BottomSheet. La base accesible de la 001 (foco atrapado, Escape, control
// de cierre, retorno del foco y safe area) y, desde el PR D de la 002 (T081; FR-030, FR-031a de la 001), lo que añade el
// Expense Flow: dos paradas (la del contenido y `full` = viewport − 96), arrastre desde el asa (más de 120 px o más de
// 800 px/s hacia abajo pide cerrar; MOTION_SYSTEM.md §2) y el alto del teclado nativo con `visualViewport`. La
// confirmación de cambios sin guardar la decide quien abre la hoja: el arrastre y Escape pasan por `onOpenChange`.
// `adaptive` (refactorización del proveedor de Anotar, 10 nov 2026): por debajo de 768 px es esta hoja y desde 768 el diálogo
// de 520 px de §Modal (RESPONSIVE_SPECIFICATIONS.md, Sheets y diálogos), anclado arriba desde la decisión de los fundadores
// del 12 nov 2026 (antes, centrado), en el MISMO árbol: cruzar 768 px con la hoja abierta cambia solo la presentación, sin
// volver a montar el contenido (lo escrito, el foco, el cursor y el desplazamiento).
import * as Dialog from "@radix-ui/react-dialog";
import * as m from "motion/react-m";
import { AnimatePresence, animate, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { copy } from "@/lib/copy/es";
import { dialog, sheet, sheetDismiss } from "@/lib/motion/tokens";
import { Button } from "./button";
import { DIALOG_FRAME_ANCHORED, DIALOG_PANEL_HEIGHT } from "./modal";
type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** Disparador opcional; al cerrar, el foco vuelve al elemento que tenía el foco al abrir. */
  trigger?: ReactNode;
  children?: ReactNode;
  closeLabel?: string;
  /** Para devolver el foco a un elemento propio al cerrar (Anotar abierto con N o tras cambiar de contenedor). */
  onCloseAutoFocus?: (event: Event) => void;
  /** Para llevar el foco inicial a un control propio (el monto de Anotar). */
  onOpenAutoFocus?: (event: Event) => void;
  /** Sin título ni pie propios: el contenido trae `DialogTitle` y sus controles (hoja de Anotar, 02·5), y también su relleno inferior y el safe area (para fijar su pie al fondo). */
  bare?: boolean;
  /** Paradas y arrastre desde el asa (Expense Flow). */
  draggable?: boolean;
  /** Parada `full` pedida desde fuera (por ejemplo, al abrir los detalles de E2). */
  expanded?: boolean;
  /** Con `bare`: desde 768 px, el diálogo de 520 px de §Modal, anclado arriba, sin volver a montar el contenido al cruzar 768 (hoja de Anotar). */
  adaptive?: boolean;
  /** Como hoja, en la parada del contenido: mientras esta clave no cambie, la hoja no se acorta (crece si hace falta). Así lo
   *  que está arriba no se mueve cuando el contenido pierde alto (Gasto → Ingreso en Anotar; decisión del 12 nov 2026). */
  holdKey?: string;
};

const WIDE = "(min-width: 768px)";
function subscribeWide(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(WIDE);
  query.addEventListener?.("change", onChange);
  return () => query.removeEventListener?.("change", onChange);
}
const readWide = () => typeof window.matchMedia === "function" && window.matchMedia(WIDE).matches;
/** 768 px o más (md). En el servidor, la hoja. */
export function useWide() {
  return useSyncExternalStore(subscribeWide, readWide, () => false);
}

const standard = [0.2, 0, 0, 1] as const; // ease.standard, como §Modal
// La presentación de diálogo es la de `Modal` con `bare` (modal.tsx): las mismas clases y el mismo movimiento. Desde 768 px,
// anclado arriba (decisión de los fundadores del 12 nov 2026; ver `DIALOG_FRAME_ANCHORED`).
const DIALOG_FRAME = `${DIALOG_FRAME_ANCHORED} z-[var(--z-modal)]`;
const DIALOG_PANEL = `pointer-events-auto flex ${DIALOG_PANEL_HEIGHT} w-full flex-col overflow-y-auto rounded-[var(--radius-2xl)] bg-overlay text-ink shadow-overlay focus-visible:outline-none max-w-[520px] gap-3.5 px-[22px] pt-5 pb-[22px]`;

/** Lo que tapa el teclado nativo por debajo del viewport visual (0 sin teclado o sin `visualViewport`). */
function useKeyboardInset(active: boolean) {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !viewport) return;
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop)));
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => { viewport.removeEventListener("resize", update); viewport.removeEventListener("scroll", update); };
  }, [active]);
  return inset;
}

export function BottomSheet({ open, onOpenChange, title, description, trigger, children, closeLabel = copy.primitives.close, onCloseAutoFocus, onOpenAutoFocus, bare = false, draggable = false, expanded: expandedProp = false, adaptive = false, holdKey }: BottomSheetProps) {
  const reduced = useReducedMotion();
  const wide = useWide();
  const asDialog = adaptive && wide;
  const [dragExpanded, setDragExpanded] = useState<boolean | null>(null);
  const expanded = dragExpanded ?? expandedProp;
  const drag = useMotionValue(0);
  const gesture = useRef<{ id: number; startY: number; lastY: number; lastT: number; velocity: number } | null>(null);
  const inset = useKeyboardInset(open);
  // Una nueva petición de parada desde fuera (o una nueva apertura) manda sobre la que dejó el arrastre.
  const request = `${expandedProp}-${open}`;
  const [lastRequest, setLastRequest] = useState(request);
  if (lastRequest !== request) { setLastRequest(request); setDragExpanded(null); }

  // Spring sheet desde el borde inferior; con movimiento reducido, solo opacidad (MOTION_SYSTEM.md §2).
  // Como diálogo, escala .98 → 1 con opacidad (§Modal).
  const motionProps = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : asDialog
      ? { initial: { opacity: 0, scale: dialog.initialScale }, animate: { opacity: 1, scale: dialog.finalScale }, exit: { opacity: 0, scale: dialog.initialScale }, transition: { duration: dialog.durationMs / 1000, ease: standard } }
      : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" }, transition: sheet };
  const settle = () => (reduced ? drag.set(0) : void animate(drag, 0, sheet));

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { id: event.pointerId, startY: event.clientY, lastY: event.clientY, lastT: event.timeStamp, velocity: 0 };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = gesture.current;
    if (!state || state.id !== event.pointerId) return;
    const dt = event.timeStamp - state.lastT;
    if (dt > 0) state.velocity = ((event.clientY - state.lastY) / dt) * 1000;
    state.lastY = event.clientY; state.lastT = event.timeStamp;
    const dy = event.clientY - state.startY;
    // Hacia arriba ofrece resistencia; hacia abajo sigue al dedo.
    drag.set(dy < 0 ? dy * 0.25 : dy);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = gesture.current;
    if (!state || state.id !== event.pointerId) return;
    gesture.current = null;
    const dy = event.clientY - state.startY;
    if (dy > sheetDismiss.distancePx || state.velocity > sheetDismiss.velocityPxPerS) onOpenChange(false);
    else if (dy < -48) setDragExpanded(true);
    else if (dy > 48 && expanded) setDragExpanded(false);
    settle();
  };

  const max = `calc(100dvh - ${96 + inset}px)`;
  // `holdKey`: el alto más grande que tuvo el área de la hoja desde que se abrió con esta clave y esta parada, como alto mínimo
  // (nunca por encima del máximo de la parada, que ya descuenta el teclado). Se mide antes de pintar, así que no hay un
  // fotograma con la hoja corta. Como diálogo no hace falta: anclado arriba, el diálogo se acorta por abajo.
  const body = useRef<HTMLDivElement | null>(null);
  const held = useRef({ key: "", height: 0 });
  const holding = holdKey !== undefined && open && !asDialog && !(draggable && expanded);
  const holdId = `${holdKey}|${max}`;
  useLayoutEffect(() => {
    const node = body.current;
    if (!node) return;
    if (!holding) { held.current = { key: "", height: 0 }; node.style.minHeight = ""; return; }
    if (held.current.key !== holdId) { held.current = { key: holdId, height: 0 }; node.style.minHeight = ""; }
    held.current.height = Math.max(held.current.height, node.offsetHeight);
    node.style.minHeight = `min(${held.current.height}px, ${max})`;
  });
  // Adaptable: el contenido de la hoja va siempre dentro del mismo marco (como diálogo, el de §Modal; como hoja, uno que no
  // pinta nada), así que el árbol de React es el mismo a los dos lados de 768 px.
  const framed = (node: ReactNode) => (adaptive ? <div className={asDialog ? DIALOG_FRAME : "contents"}>{node}</div> : node);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <m.div
                className={`fixed inset-0 bg-[var(--comp-scrim)] ${asDialog ? "z-[var(--z-modal)]" : "z-[var(--z-sheet)]"}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.12 : asDialog ? dialog.durationMs / 1000 : 0.18 }}
              />
            </Dialog.Overlay>
            {framed(
              <Dialog.Content asChild forceMount onCloseAutoFocus={onCloseAutoFocus} onOpenAutoFocus={onOpenAutoFocus} {...(description || bare ? {} : { "aria-describedby": undefined })}>
                <m.div
                  {...motionProps}
                  data-bottom-sheet={asDialog ? undefined : ""}
                  data-modal={asDialog ? "" : undefined}
                  data-stop={draggable && !asDialog ? (expanded ? "full" : "content") : undefined}
                  style={asDialog ? undefined : { bottom: inset }}
                  className={asDialog ? DIALOG_PANEL : "fixed inset-x-0 bottom-0 z-[var(--z-sheet)] text-ink focus-visible:outline-none"}
                >
                  {/* La entrada y la salida mueven el contenedor; el arrastre mueve la hoja dentro de él (dos valores de
                      movimiento distintos, sin mezclar porcentajes con píxeles). Como diálogo, estas dos capas no pintan nada. */}
                  <m.div style={asDialog ? undefined : { y: drag }} className={asDialog ? "contents" : "flex flex-col rounded-t-[30px] bg-overlay shadow-sheet"}>
                  {/* El asa es solo un gesto de puntero (decorativa para el lector): Escape y el botón de cerrar son la vía
                      de teclado. La franja entera de 28 px responde al arrastre. El diálogo no tiene asa. */}
                  {asDialog ? null : (
                    <div
                      aria-hidden="true"
                      data-sheet-handle=""
                      onPointerDown={draggable ? onPointerDown : undefined}
                      onPointerMove={draggable ? onPointerMove : undefined}
                      onPointerUp={draggable ? onPointerUp : undefined}
                      onPointerCancel={draggable ? () => { gesture.current = null; settle(); } : undefined}
                      className={`flex h-7 shrink-0 items-center justify-center rounded-t-[30px] ${draggable ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
                    >
                      <span className="h-[5px] w-9 rounded-full bg-border-emphasis" />
                    </div>
                  )}
                  <div
                    ref={body}
                    style={asDialog ? undefined : { maxHeight: max, height: draggable && expanded ? max : undefined }}
                    className={asDialog ? "contents" : `flex min-h-0 flex-col overflow-y-auto overscroll-contain px-5 ${bare ? "gap-3.5 pt-0" : "gap-4 pt-0 pb-[calc(20px+env(safe-area-inset-bottom))]"}`}
                  >
                    {bare ? children : (
                      <>
                        <Dialog.Title className="font-serif text-[length:var(--title-l-size)] leading-[var(--title-l-line)] font-medium tracking-[var(--title-l-tracking)]">{title}</Dialog.Title>
                        {description ? <Dialog.Description className="text-[length:var(--body-m-size)] leading-[var(--body-m-line)] text-ink-secondary">{description}</Dialog.Description> : null}
                        {children}
                        <div className="flex justify-end">
                          <Dialog.Close asChild>
                            <Button variant="ghost">{closeLabel}</Button>
                          </Dialog.Close>
                        </div>
                      </>
                    )}
                  </div>
                  </m.div>
                </m.div>
              </Dialog.Content>,
            )}
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
