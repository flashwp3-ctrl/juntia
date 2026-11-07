"use client";
// T081, T082 / FR-030–FR-036; US-2, US-3, US-4.1; MOTION_SYSTEM.md §2. Sustituye el aviso de Anotar de la 001: el mismo
// disparador (barra, rail, sidebar, Inicio y `N` fuera de un campo de texto) abre ahora la hoja real. El proveedor vive en
// el layout de producto, así que lo que tiene que sobrevivir a una navegación vive aquí y no en la página: el Toast con
// «Deshacer», la fila resaltada de E5 y la hoja abierta. Cada apertura es una sesión de la hoja con su propia clave de
// idempotencia, que nace al abrir y se reusa en cada reintento (FR-036); al cerrar, la siguiente apertura nace vacía.
import { AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Toast, type ToastAction, type ToastTone } from "@/components/ui/toast";
import { todayInBogota } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import type { ActionResult, ExpenseActions, PendingRow, SavedTransaction } from "./types";
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

/** Cuadros que se espera a que la fila nueva aparezca antes de llevar a Actividad (~1 s a 60 Hz). */
const REVEAL_FRAMES = 60;
/** Visible para la persona: ni ella ni ningún antepasado con `display: none` (copias ocultas de rutas, `xl:hidden`). */
function isShown(node: HTMLElement) {
  for (let current: HTMLElement | null = node; current; current = current.parentElement) {
    if (current.hidden || getComputedStyle(current).display === "none") return false;
  }
  return true;
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
  /** UX lote 1, cambio 3: oculta la hoja, enseña la fila al instante y envía; si falla, la hoja vuelve (ver `track`). */
  track: (row: PendingRow, run: () => Promise<ActionResult<SavedTransaction>>) => Promise<ActionResult<SavedTransaction>>;

};

const AnnotateContext = createContext<AnnotateState | null>(null);
const NO_ROWS: readonly PendingRow[] = [];
/** Las filas en vuelo, aparte del estado de la hoja: Inicio y Actividad las leen sin re-pintarse con cada cambio de la hoja. */
type ListScope = {
  /** Una lista monta (o deja de montar) el mes que muestra: sirve para saber si una fila confirmada aún le corresponde a alguien. */
  enter: (month: string) => () => void;
  /** Una lista informa de los ids reales que trae; `revalidated`: llegó por una revalidación (filas nuevas del servidor). */
  report: (month: string, ids: readonly string[], revalidated: boolean) => void;
};
const PendingContext = createContext<{ rows: readonly PendingRow[]; scope: ListScope }>({ rows: NO_ROWS, scope: { enter: () => () => {}, report: () => {} } });
/** Plazo entre peticiones de revalidación mientras una fila confirmada espera a la real (F51-12). */
const REFRESH_EVERY_MS = 8000;
/** Tope de revalidaciones por fila confirmada: pasado, se retira la temporal (el servidor ya confirmó; la real saldrá en la próxima carga). */
const MAX_REFRESHES = 3;

type AnnotateProviderProps = {
  children: ReactNode;
  actions: ExpenseActions;
  /** Hoy en Bogotá, que calcula el servidor; por defecto, el del dispositivo llevado a Bogotá. */
  today?: string;
};

export function AnnotateProvider({ children, actions, today }: AnnotateProviderProps) {
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
  const router = useRouter();
  // F45-2 (revisión del PR #45): el movimiento recién anotado que hay que enseñar resaltado.
  const [reveal, setReveal] = useState<SavedTransaction | null>(null);
  // UX lote 1, cambio 3, simplificado por decisión de los fundadores (7 nov 2026). Cada creación en vuelo es una fila temporal
  // con estado propio, por su clave: una petición colgada no retrasa la retirada de otra (F51-8). Nada de esto se guarda en el
  // navegador: si se recarga la página, no queda rastro (el resultado desconocido se resuelve en la hoja, con «Reintentar»).
  const [flights, setFlights] = useState<readonly PendingRow[]>(NO_ROWS);
  const pendingRows = flights;
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

  // UX lote 1, cambio 3: la creación no espera al servidor con la hoja a la vista. La hoja se oculta (sigue montada, con lo
  // escrito, su clave y su estado), la fila nace «Guardando…» y se envía. Rechazo confirmado (sin sesión, inválido): la fila
  // se va y la hoja vuelve con lo escrito y el aviso de siempre. Resultado desconocido (red, guardado fallido o inesperado): la
  // fila se va y la hoja vuelve BLOQUEADA, con la misma clave para «Reintentar», como la E4 desconocida de la 002 (FR-036). Si se
  // confirma, la hoja ya no vuelve, `onSaved` hace E5 y la fila temporal se queda (con su id real) hasta que la lista trae la
  // real: sin hueco y sin duplicado. La hoja sigue ocupada (`openRef`) hasta entonces: una sola a la vez.
  const track = useCallback((row: PendingRow, run: () => Promise<ActionResult<SavedTransaction>>) => new Promise<ActionResult<SavedTransaction>>((resolve) => {
    setOpen(false);
    setFlights((current) => [...current.filter(({ key }) => key !== row.key), { ...row, state: "saving", savedId: undefined }]);
    void (async () => {
      let result: ActionResult<SavedTransaction>;
      try {
        result = await run();
      } catch {
        result = { ok: false, error: "network" };
      }
      if (result.ok) {
        // Confirmada: la fila se queda, con su id real, hasta que la LISTA trae esa fila (`confirmListed`). Nunca se retira por
        // tiempo: si la revalidación tarda, se pide otra (efecto de abajo) y se sigue esperando, sin hueco (F51-12).
        const savedId = result.value.id;
        setFlights((current) => current.map((flight) => (flight.key === row.key ? { ...flight, state: "confirmed", savedId } : flight)));
      } else {
        setFlights((current) => current.filter(({ key }) => key !== row.key));
        setOpen(true);
      }
      resolve(result);
    })();
  }), []);
  // F51-12. La espera de una fila confirmada termina con lo primero de: (a) una lista montada trae el UUID real; (b) llega una
  // revalidación que no lo trae y la fila ya no le corresponde a ninguna lista montada (otro mes): se retira, sin hueco visible,
  // porque ninguna la mostraba; (c) tope de 3 revalidaciones pedidas: se retira la temporal, el servidor ya confirmó. Nunca hay
  // revalidaciones periódicas sin límite.
  const mountedMonths = useRef(new Map<string, number>());
  const scope = useMemo<ListScope>(() => ({
    enter: (month) => {
      mountedMonths.current.set(month, (mountedMonths.current.get(month) ?? 0) + 1);
      return () => {
        const left = (mountedMonths.current.get(month) ?? 1) - 1;
        if (left <= 0) mountedMonths.current.delete(month);
        else mountedMonths.current.set(month, left);
      };
    },
    report: (_month, ids, revalidated) => setFlights((current) => {
      const next = current.filter((flight) => {
        if (flight.state !== "confirmed" || !flight.savedId) return true;
        if (ids.includes(flight.savedId)) return false; // (a)
        if (!revalidated) return true;
        return mountedMonths.current.has(flight.transaction.transactionDate.slice(0, 7)); // (b): fuera del alcance de las listas montadas
      });
      return next.length === current.length ? current : next;
    }),
  }), []);
  const pendingContext = useMemo(() => ({ rows: pendingRows, scope }), [pendingRows, scope]);
  const flightsRef = useRef(flights);
  useEffect(() => { flightsRef.current = flights; }, [flights]);
  // Cuántas revalidaciones se han pedido por fila: en una referencia, no en el estado, para que dos peticiones seguidas (antes de
  // que React pinte) cuenten las dos y el tope de 3 sea de verdad un tope. Las cuentas no se borran al retirar la fila: una clave
  // confirmada no vuelve a usarse, y borrarla dejaría que una petición aún en cola la contara de nuevo desde cero.
  const refreshCounts = useRef(new Map<string, number>());
  /**
   * Pide una revalidación si alguna fila confirmada aún está bajo el tope, y retira las que ya lo alcanzaron (c). Tras el tercer
   * refresco la fila NO provoca una cuarta petición: se retira en el siguiente ciclo (8 s después), dándole tiempo a la tercera.
   */
  const askRefresh = useCallback(() => {
    const waiting = flightsRef.current.filter((flight) => flight.state === "confirmed");
    const exhausted = waiting.filter((flight) => (refreshCounts.current.get(flight.key) ?? 0) >= MAX_REFRESHES).map((flight) => flight.key);
    const live = waiting.filter((flight) => (refreshCounts.current.get(flight.key) ?? 0) < MAX_REFRESHES).map((flight) => flight.key);
    if (exhausted.length > 0) {
      setFlights((current) => current.filter((flight) => !exhausted.includes(flight.key)));
    }
    if (live.length > 0) {
      for (const key of live) refreshCounts.current.set(key, (refreshCounts.current.get(key) ?? 0) + 1);
      router.refresh();
    }
  }, [router]);
  const askRefreshRef = useRef(askRefresh);
  useEffect(() => { askRefreshRef.current = askRefresh; }, [askRefresh]);
  const waitingForReal = flights.some((flight) => flight.state === "confirmed");
  useEffect(() => {
    if (!waitingForReal) return;
    const handle = setInterval(() => askRefreshRef.current(), REFRESH_EVERY_MS);
    return () => clearInterval(handle);
  }, [waitingForReal]);

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
    setReveal(saved);
    const key = newIdempotencyKey();
    notify({ tone: "success", message: copy.annotate.saved[saved.type], action: { label: copy.annotate.undo, onAction: () => void undo(saved, key) } });
  }, [close, notify, undo]);

  // F45-2: E5 resalta la fila nueva «en la misma pantalla» (MOTION_SYSTEM.md §2). Si la pantalla no la enseña (otro
  // mes, fuera de los 5 recientes de Inicio, o una ruta sin lista), se lleva a la persona a Actividad del mes del
  // movimiento; el aviso y el resaltado viven en el proveedor y siguen allí. Si ya la enseña, no se navega. Se mira
  // durante unos cuadros: la respuesta de la Server Action trae Inicio y Actividad revalidados, y React los aplica en
  // una transición. No cambia el total del mes en curso ni los 5 recientes.
  useEffect(() => {
    if (!reveal) return;
    let frames = 0;
    let handle = 0;
    const check = () => {
      const row = [...document.querySelectorAll<HTMLElement>(`[data-transaction-id="${reveal.id}"]:not([data-temp])`)].find(isShown);
      if (row) { row.scrollIntoView?.({ block: "nearest" }); setReveal(null); return; }
      if (++frames < REVEAL_FRAMES) { handle = requestAnimationFrame(check); return; }
      setReveal(null);
      // F51-12: la fila temporal NO se retira por haberse agotado el plazo: se pide una revalidación (cuenta para el tope) y se
      // sigue esperando.
      askRefreshRef.current();
      router.push(`/actividad?mes=${reveal.transactionDate.slice(0, 7)}`);
    };
    handle = requestAnimationFrame(check);
    return () => cancelAnimationFrame(handle);
  }, [reveal, router]);

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
  const state = useMemo(() => ({ open, openFrom, openEdit, highlightId, notify, actions, track }), [open, openFrom, openEdit, highlightId, notify, actions, track]);
  return (
    <AnnotateContext.Provider value={state}>
     <PendingContext.Provider value={pendingContext}>
      {children}
      {mounted ? (
        <Suspense fallback={null}>
          <AnnotateSheet
            key={sessionKey}
            open={open}
            mode={mode}
            idempotencyKey={sessionKey}
            today={today ?? todayInBogota()}
            actions={actions}
            onClose={close}
            onSaved={onSaved}
            onTrack={track}
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
     </PendingContext.Provider>
    </AnnotateContext.Provider>
  );
}

/** La fila resaltada de E5, o `null` fuera del proveedor (una vista que se pinta también sin Anotar). */
export function useHighlightId() {
  return useContext(AnnotateContext)?.highlightId ?? null;
}

/** Las creaciones en vuelo (UX lote 1, cambio 3), o ninguna fuera del proveedor. */
export function usePendingRows(): readonly PendingRow[] {
  return useContext(PendingContext).rows;
}

/** Las listas montan su mes y avisan de los ids reales que traen, para retirar la fila temporal que ya no hace falta (F51-12). */
export function useListScope(month: string, ids: readonly string[]) {
  const { scope, rows } = useContext(PendingContext);
  useEffect(() => scope.enter(month), [scope, month]);
  // Lo que la lista trae cambió (llegó una revalidación): (a) y (b).
  useEffect(() => scope.report(month, ids, true), [scope, month, ids]);
  // Una fila acaba de confirmarse y la lista ya la trae (la real llegó antes que la respuesta): solo (a).
  const confirmed = rows.filter((row) => row.state === "confirmed").map((row) => row.savedId).join(",");
  useEffect(() => scope.report(month, ids, false), [scope, month, ids, confirmed]);
}

export function useAnnotate() {
  const state = useContext(AnnotateContext);
  if (!state) throw new Error("Anotar necesita AnnotateProvider");
  return state;
}
