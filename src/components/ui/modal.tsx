"use client";
// FR-031, FR-031a; COMPONENT_SPECIFICATIONS.md §Modal y §BottomSheet («desde md, diálogo centrado de 520 px»);
// RESPONSIVE_SPECIFICATIONS.md, Sheets y diálogos. `role="dialog"` por defecto; P0-1, PR D (T081, T082): `alertdialog`
// para lo destructivo (§Modal: «role="alertdialog" para las destructivas. El foco inicial va en Cancelar»), y `bare`
// para la hoja de Anotar, que dibuja su propio encabezado (02·5) con el título del diálogo.
import * as Dialog from "@radix-ui/react-dialog";
import * as m from "motion/react-m";
import { AnimatePresence, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { copy } from "@/lib/copy/es";
import { dialog } from "@/lib/motion/tokens";
import { Button } from "./button";

type ModalProps = {
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
  /** Para llevar el foco inicial a un control propio (el monto de Anotar, Cancelar de una confirmación). */
  onOpenAutoFocus?: (event: Event) => void;
  role?: "dialog" | "alertdialog";
  /** Acciones propias en lugar del botón de cerrar (la destructiva al final). */
  actions?: ReactNode;
  /** Sin título ni pie propios: el contenido trae `DialogTitle` y sus controles (hoja de Anotar, 02·5). */
  bare?: boolean;
  /** Ancho máximo: 520 (hoja como diálogo) por defecto; 440 para una confirmación (§Modal, 400–480). */
  size?: "sheet" | "confirm";
};

const standard = [0.2, 0, 0, 1] as const; // ease.standard
const titleClass = "font-serif text-[length:var(--title-l-size)] leading-[var(--title-l-line)] font-medium tracking-[var(--title-l-tracking)]";

export const DialogTitle = Dialog.Title;
export const DialogDescription = Dialog.Description;

export function Modal({ open, onOpenChange, title, description, trigger, children, closeLabel = copy.primitives.close, onCloseAutoFocus, onOpenAutoFocus, role = "dialog", actions, bare = false, size = "sheet" }: ModalProps) {
  const reduced = useReducedMotion();
  const seconds = dialog.durationMs / 1000;
  // Escala .98 → 1 con opacidad (MOTION_SYSTEM.md, Cuenta); con movimiento reducido, solo opacidad.
  const motionProps = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : { initial: { opacity: 0, scale: dialog.initialScale }, animate: { opacity: 1, scale: dialog.finalScale }, exit: { opacity: 0, scale: dialog.initialScale }, transition: { duration: seconds, ease: standard } };
  const confirm = size === "confirm";
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <m.div
                className={`fixed inset-0 bg-[var(--comp-scrim)] ${confirm ? "z-[var(--z-toast)]" : "z-[var(--z-modal)]"}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.12 : seconds }}
              />
            </Dialog.Overlay>
            {/* El centrado vive en un contenedor fijo para que la escala no se mezcle con el transform de posición. Una
                confirmación sube sobre la hoja que la abrió (descartar cambios) y sobre los avisos. */}
            <div className={`pointer-events-none fixed inset-0 grid place-items-center p-4 ${confirm ? "z-[var(--z-toast)]" : "z-[var(--z-modal)]"}`}>
              <Dialog.Content
                asChild
                forceMount
                role={role}
                onCloseAutoFocus={onCloseAutoFocus}
                onOpenAutoFocus={onOpenAutoFocus}
                {...(description || bare ? {} : { "aria-describedby": undefined })}
              >
                <m.div
                  {...motionProps}
                  data-modal=""
                  className={`pointer-events-auto flex max-h-[calc(100dvh-32px)] w-full flex-col overflow-y-auto rounded-[var(--radius-2xl)] bg-overlay text-ink shadow-overlay focus-visible:outline-none ${confirm ? "max-w-[440px] gap-3 p-[22px]" : bare ? "max-w-[520px] gap-3.5 px-[22px] pt-5 pb-[22px]" : "max-w-[520px] gap-3 p-[22px]"}`}
                >
                  {bare ? children : (
                    <>
                      <Dialog.Title className={confirm ? "font-serif text-[25px] leading-[1.04] font-medium tracking-[-0.015em]" : titleClass}>{title}</Dialog.Title>
                      {description ? <Dialog.Description className={confirm ? "text-[14px] leading-[1.5] text-pretty text-ink-secondary" : "text-[length:var(--body-m-size)] leading-[var(--body-m-line)] text-ink-secondary"}>{description}</Dialog.Description> : null}
                      {children}
                      <div className="flex flex-wrap justify-end gap-2 pt-1">
                        {actions ?? (
                          <Dialog.Close asChild>
                            <Button variant="ghost">{closeLabel}</Button>
                          </Dialog.Close>
                        )}
                      </div>
                    </>
                  )}
                </m.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
