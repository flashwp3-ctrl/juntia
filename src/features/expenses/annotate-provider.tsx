"use client";
// T081, T082 / FR-030–FR-036; US-2, US-3, US-4.1; MOTION_SYSTEM.md §2. Sustituye el aviso de Anotar de la 001: el mismo
// disparador (barra, rail, sidebar, Inicio y `N` fuera de un campo de texto) abre ahora la hoja real. El proveedor vive en
// el layout de producto, así que lo que tiene que sobrevivir a una navegación vive aquí y no en la página: el Toast con
// «Deshacer», la fila resaltada de E5 y la hoja abierta. Cada apertura es una sesión de la hoja con su propia clave de
// idempotencia, que nace al abrir y se reusa en cada reintento (FR-036); al cerrar, la siguiente apertura nace vacía.
import { AnimatePresence } from "motion/react";
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Toast, type ToastAction, type ToastTone } from "@/components/ui/toast";
import { todayInBogota, type CategoryId } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import type { ExpenseActions, SavedTransaction } from "./types";
import { newIdempotencyKey } from "./idempotency";

// Rendimiento (auditoría de Impeccable de la 001): la hoja, Radix y su animación no viajan con cada ruta. Se precargan
// cuando el navegador queda libre y se montan con la primera apertura; desde ahí siguen montados para conservar la
// animación de salida y el retorno del foco.
const loadSheet = () => import("./annotate-sheet");
const AnnotateSheet = lazy(loadSheet);

// `N` escribe la letra en cualquier campo editable; solo fuera de ellos abre la hoja.
function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest("[contenteditable]:not([contenteditable='false'])")) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export type SheetMode = { kind: "create" } | { kind: "edit"; transaction: SavedTransaction; onReload: () => void };
type ToastState = { id: number; tone: ToastTone; message: string; action?: ToastAction };
type Notice = Omit<ToastState, "id">;

type AnnotateState = {
  open: boolean;
  openFrom: (trigger: HTMLElement | null) => void;
  openEdit: (transaction: SavedTransaction, trigger: HTMLElement | null, onReload: () => void) => void;
  /** Movimiento recién anotado: su fila queda resaltada en Inicio y Actividad (E5). */
  highlightId: string | null;
  notify: (notice: Notice) => void;
  actions: ExpenseActions;
};

const AnnotateContext = createContext<AnnotateState | null>(null);

type AnnotateProviderProps = {
  children: ReactNode;
  actions: ExpenseActions;
  /** Categorías recientes de `my_recent_categories`; se completan con el catálogo (`fillRecentCategories`). */
  recentCategories?: readonly CategoryId[];
  /** Hoy en Bogotá, que calcula el servidor; por defecto, el del dispositivo llevado a Bogotá. */
  today?: string;
};

export function AnnotateProvider({ children, actions, recentCategories = [], today }: AnnotateProviderProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<SheetMode>({ kind: "create" });
  const [sessionKey, setSessionKey] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const openRef = useRef(false);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  // Cada aviso nuevo invalida las respuestas tardías del anterior (orden de respuestas).
  const toastGeneration = useRef(0);
  const undoing = useRef(new Set<string>());
  const actionsRef = useRef(actions);
  useEffect(() => { actionsRef.current = actions; });

  const notify = useCallback((notice: Notice) => {
    toastGeneration.current += 1;
    setToast({ ...notice, id: toastGeneration.current });
  }, []);

  const begin = useCallback((next: SheetMode, trigger: HTMLElement | null) => {
    if (openRef.current) return; // una sola hoja a la vez
    returnFocusTo.current = trigger;
    openRef.current = true;
    setMode(next);
    setSessionKey(newIdempotencyKey());
    setMounted(true);
    setOpen(true);
  }, []);
  const openFrom = useCallback((trigger: HTMLElement | null) => begin({ kind: "create" }, trigger), [begin]);
  const openEdit = useCallback((transaction: SavedTransaction, trigger: HTMLElement | null, onReload: () => void) => begin({ kind: "edit", transaction, onReload }, trigger), [begin]);

  const close = useCallback(() => {
    openRef.current = false;
    setOpen(false);
  }, []);

  // «Deshacer» (US-2.5; FR-034): anula con `undo` y la versión que devolvió la creación. La clave es una por aviso, así
  // que dos toques o un reintento son la misma intención. Si otro aviso ya ocupó su lugar, la respuesta no lo pisa.
  // El reintento de un Deshacer fallido vuelve a llamar a `undo` desde su propio aviso: la referencia estable lo permite.
  const undoRef = useRef<(transaction: SavedTransaction, idempotencyKey: string) => Promise<void>>(async () => {});
  const undo = useCallback((transaction: SavedTransaction, idempotencyKey: string) => undoRef.current(transaction, idempotencyKey), []);
  useEffect(() => { undoRef.current = async (transaction: SavedTransaction, idempotencyKey: string) => {
    if (undoing.current.has(transaction.id)) return;
    undoing.current.add(transaction.id);
    const generation = toastGeneration.current;
    setToast((current) => (current && current.id === generation && current.action ? { ...current, action: { ...current.action, busy: true } } : current));
    let result;
    try {
      result = await actionsRef.current.voidTransaction({ idempotencyKey, transactionId: transaction.id, expectedVersion: transaction.version, reason: "undo" });
    } catch {
      result = { ok: false as const, error: "network" as const };
    }
    undoing.current.delete(transaction.id);
    if (generation !== toastGeneration.current) return;
    if (result.ok) {
      setHighlightId((current) => (current === transaction.id ? null : current));
      notify({ tone: "success", message: copy.annotate.undone[transaction.type] });
    } else if (result.error === "versionConflict") {
      notify({ tone: "error", message: copy.annotate.undoChanged });
    } else if (result.error === "alreadyDeleted" || result.error === "notFound") {
      setHighlightId((current) => (current === transaction.id ? null : current));
      notify({ tone: "error", message: copy.transaction.errors.alreadyDeleted });
    } else if (result.error === "sessionExpired") {
      notify({ tone: "error", message: copy.errors.sessionExpired });
    } else {
      notify({ tone: "error", message: copy.annotate.undoFailed, action: { label: copy.annotate.retry, onAction: () => void undo(transaction, idempotencyKey) } });
    }
  }; }, [notify, undo]);

  const onSaved = useCallback((saved: SavedTransaction, kind: SheetMode["kind"]) => {
    close();
    if (kind === "edit") {
      notify({ tone: "success", message: copy.annotate.saved.edit });
      return;
    }
    setHighlightId(saved.id);
    const key = newIdempotencyKey();
    notify({ tone: "success", message: copy.annotate.saved[saved.type], action: { label: copy.annotate.undo, onAction: () => void undo(saved, key) } });
  }, [close, notify, undo]);

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 1));
    idle(() => void loadSheet());
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "n" && event.key !== "N") return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.defaultPrevented) return;
      if (openRef.current || isEditable(event.target)) return;
      event.preventDefault();
      openFrom(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openFrom]);

  const dismissToast = useCallback((id: number) => setToast((current) => (current?.id === id ? null : current)), []);
  const state = useMemo(() => ({ open, openFrom, openEdit, highlightId, notify, actions }), [open, openFrom, openEdit, highlightId, notify, actions]);
  return (
    <AnnotateContext.Provider value={state}>
      {children}
      {mounted ? (
        <Suspense fallback={null}>
          <AnnotateSheet
            key={sessionKey}
            open={open}
            mode={mode}
            idempotencyKey={sessionKey}
            recent={recentCategories}
            today={today ?? todayInBogota()}
            actions={actions}
            onClose={close}
            onSaved={onSaved}
            returnFocusTo={returnFocusTo}
          />
        </Suspense>
      ) : null}
      {/* Por encima de la barra inferior en móvil; en escritorio, centrado en el contenido, a la derecha del rail o del
          sidebar. Un solo aviso a la vez: el nuevo reemplaza al anterior. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[var(--z-toast)] flex justify-center px-3.5 lg:bottom-6 lg:pl-[calc(76px+28px)] xl:pl-[calc(248px+40px)]">
        <div className="w-full max-w-[440px]">
          <AnimatePresence>
            {toast ? <Toast key={toast.id} tone={toast.tone} message={toast.message} action={toast.action} onTimeout={() => dismissToast(toast.id)} /> : null}
          </AnimatePresence>
        </div>
      </div>
    </AnnotateContext.Provider>
  );
}

/** La fila resaltada de E5, o `null` fuera del proveedor (una vista que se pinta también sin Anotar). */
export function useHighlightId() {
  return useContext(AnnotateContext)?.highlightId ?? null;
}

export function useAnnotate() {
  const state = useContext(AnnotateContext);
  if (!state) throw new Error("Anotar necesita AnnotateProvider");
  return state;
}
