"use client";
// T081, T082 / FR-030–FR-036; US-2, US-3, US-4.1; MOTION_SYSTEM.md §2. Sustituye el aviso de Anotar de la 001: el mismo
// disparador (barra, rail, sidebar, Inicio y `N` fuera de un campo de texto) abre ahora la hoja real. El proveedor vive en
// el layout de producto, así que lo que tiene que sobrevivir a una navegación vive aquí y no en la página: el Toast con
// «Deshacer», la fila resaltada de E5 y la hoja abierta. Cada apertura es una sesión de la hoja con su propia clave de
// idempotencia, que nace al abrir y se reusa en cada reintento (FR-036); al cerrar, la siguiente apertura nace vacía.
// PR C de la 003 (T045; FR-059–FR-062; contracts/server-actions.md §6): el proveedor lleva además la pareja activa para la
// hoja (con lo último que usó la persona en Nosotros, en memoria), las escrituras compartidas, la edición de un compartido y
// el diálogo de Mover a Pareja. Los avisos con «Deshacer» de gasto compartido y de Mover a Pareja viven aquí, uno por
// operación: una respuesta tardía solo toca el suyo. El resaltado guarda su contexto y no se ve en el otro (FR-040). Al
// volver a la pestaña se pide la página otra vez para traer lo que anotó la otra persona (Q16).
import { AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Toast, type ToastAction, type ToastTone } from "@/components/ui/toast";
import { todayInBogota } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import type { ActionResult, ExpenseActions, PendingRow, SavedTransaction } from "./types";
import type { CoupleForSheet, LastSplit, MoveResult, SavedShared, SharedActions } from "./shared-types";
import type { SavedSettlement } from "@/features/balance/types";
import type { ContextChoice } from "@/lib/context-preference";
import { useOptionalContextChoice } from "@/components/shell/context-selector";
import { newIdempotencyKey } from "./idempotency";
import { ConfirmDialog } from "./confirm-dialog";
import { Button } from "@/components/ui/button";
import { WriteUnknown } from "@/features/shared/write-unknown";
import { lastFromSaved } from "./split-state";
import { TIMED_OUT, withTimeout } from "@/features/shared/use-write";
import type { WriteError, WriteOutcome } from "@/features/shared/write-result";

// Rendimiento (auditoría de Impeccable de la 001): la hoja, Radix y su animación no viajan con cada ruta. Se precargan
// cuando el navegador queda libre y se montan con la primera apertura; desde ahí siguen montados para conservar la
// animación de salida y el retorno del foco.
const loadSheet = () => import("./annotate-sheet");
const AnnotateSheet = lazy(loadSheet);
const loadMove = () => import("./reclassify-dialog");
const MoveDialog = lazy(loadMove);

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

export type SheetMode = { kind: "create" } | { kind: "edit"; transaction: SavedTransaction; onReload: () => void }
  | { kind: "editShared"; expense: SavedShared; onReload: () => void };
/** Lo que E5 enseña resaltado: el id, su fecha (para llevar a Actividad del mes) y el contexto donde vive (FR-040). */
type Reveal = { id: string; transactionDate: string };
/** `undo`: el id del gasto cuyo «Deshacer» ofrece el aviso (compartido o Mover a Pareja; F57-8/F57-9: uno a la vez). */
type ToastState = { id: number; tone: ToastTone; message: string; action?: ToastAction; undo?: string };
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
  /** PR C (T047): editar un gasto compartido con la versión leída. */
  openEditShared: (expense: SavedShared, trigger: HTMLElement | null, onReload: () => void) => void;
  /** PR C (T050): Mover a Pareja de un privado propio (A1, o Editar → Nosotros). */
  openMove: (transaction: SavedTransaction, trigger: HTMLElement | null) => void;
  /** La pareja activa, o `null`: decide si hay Nosotros en la hoja y si hay «Mover a Pareja». */
  couple: CoupleForSheet | null;
  sharedActions: SharedActions | null;
  /** PR D (T062; FR-028, FR-060): el aviso «Liquidación registrada» con «Deshacer» de 6 s, que sobrevive a la navegación. */
  offerSettlementUndo: (saved: SavedSettlement) => void;
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
  /** PR C (T046): la pareja activa para la hoja (con lo último que usó la persona en Nosotros) y sus escrituras. */
  couple?: CoupleForSheet | null;
  sharedActions?: SharedActions;
  /** El contexto de la app; por defecto, el del selector (ContextProvider). Las pruebas lo fijan aquí. */
  context?: ContextChoice;
};

export function AnnotateProvider({ children, actions, today, couple = null, sharedActions, context }: AnnotateProviderProps) {
  const appContext = useOptionalContextChoice();
  const currentContext: ContextChoice = context ?? appContext?.value ?? "me";
  // Q5, decisión 1: lo último que usó esta persona en Nosotros. Nace de lo que leyó el layout y se actualiza en memoria al
  // guardar; nunca va al almacenamiento del navegador.
  const [lastSplit, setLastSplit] = useState<LastSplit | null>(couple?.last ?? null);
  const coupleForSheet = useMemo(() => (couple ? { members: couple.members, last: lastSplit } : null), [couple, lastSplit]);
  const [moveTarget, setMoveTarget] = useState<{ transaction: SavedTransaction; key: string } | null>(null);
  const moveTrigger = useRef<HTMLElement | null>(null);
  const [highlight, setHighlight] = useState<{ id: string; context: ContextChoice } | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<SheetMode>({ kind: "create" });
  const [sessionKey, setSessionKey] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const highlightId = highlight && highlight.context === currentContext ? highlight.id : null;
  const setHighlightId = useCallback((next: string | null | ((current: string | null) => string | null), where: ContextChoice = "me") => {
    setHighlight((current) => {
      const value = typeof next === "function" ? next(current?.id ?? null) : next;
      return value === null ? null : { id: value, context: typeof next === "function" ? (current?.context ?? where) : where };
    });
  }, []);
  const openRef = useRef(false);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  // Cada aviso nuevo invalida las respuestas tardías del anterior (orden de respuestas).
  const toastGeneration = useRef(0);
  const undoing = useRef(new Set<string>());
  const router = useRouter();
  // F45-2 (revisión del PR #45): el movimiento recién anotado que hay que enseñar resaltado.
  const [reveal, setReveal] = useState<Reveal | null>(null);
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
  const openEditShared = useCallback((expense: SavedShared, trigger: HTMLElement | null, onReload: () => void) => begin({ kind: "editShared", expense, onReload }, trigger), [begin]);

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
  }; }, [notify, undo, setHighlightId]);

  // F57-4 (revisión del PR #57). «Deshacer» de un gasto compartido (FR-024) y de Mover a Pareja (FR-034) con la máquina del
  // PR B (contracts/server-actions.md §1–§2): cada intento espera como mucho 15 s y después es desconocido; con resultado
  // desconocido nunca se dice que no se deshizo: el aviso ofrece «Comprobar estado» (`write_status`, que no reejecuta
  // nada) y, si todavía no consta, «Reintentar» repite lo mismo con la misma clave. La clave es una por aviso. Si otro
  // aviso ya ocupó su lugar, la respuesta no lo pisa.
  const sharedRef = useRef(sharedActions);
  useEffect(() => { sharedRef.current = sharedActions; });
  type UndoIntent = {
    action: "void_shared_expense" | "undo_reclassify_to_shared" | "void_settlement"; id: string; idempotencyKey: string;
    send: () => Promise<WriteOutcome<unknown>>; done: string; rejected: (error: WriteError) => string; onOk: () => void;
  };
  // F57-6 (revisión del PR #57): mientras un deshacer sigue desconocido o sin constar, su aviso no caduca. Vive aquí, en
  // memoria (nunca en el navegador), con «Reintentar» y «Comprobar estado» sobre la intención original; cerrarlo se confirma.
  // F57-8 y F57-9 (decisión del gestor): un deshacer a la vez. La intención se reserva desde que EMPIEZA (fase «en curso»),
  // no solo al llegar a desconocido; mientras exista, los «Deshacer» de los avisos nuevos quedan bloqueados. Su resultado se
  // aplica por la identidad de la intención, no por la generación del aviso: si su aviso ya se sustituyó, un desconocido pasa
  // igual al aviso fijo. ok o rechazo liberan la reserva. La generación solo evita pisar avisos ordinarios con respuestas viejas.
  type ActiveUndo = { intent: UndoIntent; phase: "running" | "unknown" | "notFound"; checking: boolean };
  const [activeUndo, setActiveUndoState] = useState<ActiveUndo | null>(null);
  const [confirmingDismiss, setConfirmingDismiss] = useState(false);
  const [recoveryNote, setRecoveryNote] = useState<{ id: number; tone: ToastTone; message: string } | null>(null);
  const recoveryNoteId = useRef(0);
  const activeRef = useRef<ActiveUndo | null>(null);
  // La referencia cambia en el acto (un segundo toque en el mismo cuadro ya ve la reserva); el estado pinta.
  const setActiveUndo = useCallback((next: ActiveUndo | null) => { activeRef.current = next; setActiveUndoState(next); }, []);
  const pendingUndo = activeUndo && activeUndo.phase !== "running" ? activeUndo : null;
  const runUndoRef = useRef<(intent: UndoIntent, mode: "send" | "check", source: "toast" | "pending") => Promise<void>>(async () => {});
  const runUndo = useCallback((intent: UndoIntent, mode: "send" | "check", source: "toast" | "pending" = "toast") => runUndoRef.current(intent, mode, source), []);
  useEffect(() => { runUndoRef.current = async (intent: UndoIntent, mode: "send" | "check", source: "toast" | "pending") => {
    const writes = sharedRef.current;
    const reserved = activeRef.current;
    if (reserved && reserved.intent !== intent) return;
    if (!writes || undoing.current.has(intent.id)) return;
    undoing.current.add(intent.id);
    const generation = toastGeneration.current;
    setActiveUndo(reserved ? { ...reserved, checking: true } : { intent, phase: "running", checking: false });
    if (source === "toast") setToast((current) => (current && current.id === generation && current.action ? { ...current, action: { ...current.action, busy: true } } : current));
    let outcome: { kind: "ok" } | { kind: "rejected"; error: WriteError } | { kind: "unknown" } | { kind: "notFound" };
    try {
      if (mode === "send") {
        const result = await withTimeout(intent.send());
        outcome = result === TIMED_OUT || result.status === "unknown" ? { kind: "unknown" } : result.status === "ok" ? { kind: "ok" } : { kind: "rejected", error: result.error };
      } else {
        const result = await withTimeout(writes.check({ action: intent.action, idempotencyKey: intent.idempotencyKey }));
        outcome = result === TIMED_OUT || result.state === "error" ? { kind: "unknown" } : result.state === "completed" ? { kind: "ok" } : { kind: "notFound" };
      }
    } catch {
      outcome = { kind: "unknown" };
    }
    undoing.current.delete(intent.id);
    // Se aplica por la identidad: si la reserva ya no es esta intención (se cerró confirmándolo), la respuesta no toca nada.
    if (activeRef.current?.intent !== intent) return;
    if (outcome.kind === "ok" || outcome.kind === "rejected") {
      setActiveUndo(null);
      if (outcome.kind === "ok") intent.onOk();
      const result = outcome.kind === "ok" ? { tone: "success" as const, message: intent.done } : { tone: "error" as const, message: intent.rejected(outcome.error) };
      // Quinta ronda F57-9: el resultado de una recuperación (aviso fijo) nunca usa el aviso ordinario, que puede ser el de B
      // esperando con su «Deshacer»: se muestra un momento en el sitio del aviso fijo y se retira. Desde el aviso con
      // «Deshacer», solo si nadie ocupó su lugar (una respuesta vieja no pisa un mensaje más nuevo).
      if (source === "pending") { recoveryNoteId.current += 1; setRecoveryNote({ id: recoveryNoteId.current, ...result }); }
      else if (generation === toastGeneration.current) notify(result);
    } else {
      // Desconocido o sin constar: queda el aviso fijo, que no caduca; el aviso con «Deshacer» de esta intención se retira.
      if (source === "toast" && generation === toastGeneration.current) setToast(null);
      setActiveUndo({ intent, phase: outcome.kind === "notFound" ? "notFound" : "unknown", checking: false });
    }
  }; }, [notify, runUndo, setActiveUndo]);

  const undoShared = useCallback((saved: SavedShared, idempotencyKey: string) => runUndo({
    action: "void_shared_expense", id: saved.id, idempotencyKey, done: copy.annotate.undone.expense,
    send: () => sharedRef.current!.voidShared({ idempotencyKey, transactionId: saved.id, expectedVersion: saved.version, reason: "undo" }),
    onOk: () => setHighlightId((current) => (current === saved.id ? null : current)),
    rejected: (error) => {
      if (error === "alreadyDeleted" || error === "notFound") setHighlightId((current) => (current === saved.id ? null : current));
      return error === "versionConflict" ? copy.annotate.undoChanged : error === "alreadyDeleted" || error === "notFound" ? copy.transaction.errors.alreadyDeleted
        : error === "sessionExpired" ? copy.errors.sessionExpired : copy.errors.unexpected;
    },
  }, "send"), [runUndo, setHighlightId]);

  const undoMove = useCallback((result: MoveResult, idempotencyKey: string) => runUndo({
    action: "undo_reclassify_to_shared", id: result.shared.id, idempotencyKey, done: copy.move.undone,
    send: () => sharedRef.current!.undoReclassify!({ idempotencyKey, sharedTransactionId: result.shared.id, expectedVersion: result.shared.version }),
    onOk: () => setHighlightId((current) => (current === result.shared.id ? null : current)),
    rejected: (error) => (error === "undoNotAvailable" || error === "versionConflict" ? copy.move.errors.undoNotAvailable : error === "sessionExpired" ? copy.errors.sessionExpired : copy.errors.unexpected),
  }, "send"), [runUndo, setHighlightId]);

  // PR D (T062; Q11): «Deshacer» de una liquidación recién registrada, con la misma máquina y la misma regla de un deshacer a
  // la vez. Anula con `undo` y la versión que devolvió el registro; la función exige además que tenga menos de 60 s.
  const undoSettlement = useCallback((saved: SavedSettlement, idempotencyKey: string) => runUndo({
    action: "void_settlement", id: saved.id, idempotencyKey, done: copy.balance.settle.undone,
    send: () => sharedRef.current!.voidSettlement!({ idempotencyKey, settlementId: saved.id, expectedVersion: saved.version, reason: "undo" }),
    onOk: () => {},
    rejected: (error) => (error === "undoNotAvailable" || error === "versionConflict" ? copy.move.errors.undoNotAvailable : error === "alreadyVoided" ? copy.balance.settlement.errors.alreadyVoided
      : error === "sessionExpired" ? copy.errors.sessionExpired : copy.errors.unexpected),
  }, "send"), [runUndo]);
  const offerSettlementUndo = useCallback((saved: SavedSettlement) => {
    const key = newIdempotencyKey();
    notify({ tone: "success", message: copy.balance.settle.done, undo: saved.id, action: { label: copy.annotate.undo, onAction: () => void undoSettlement(saved, key) } });
  }, [notify, undoSettlement]);

  const onSaved = useCallback((saved: SavedTransaction, kind: SheetMode["kind"]) => {
    close();
    if (kind === "edit") {
      notify({ tone: "success", message: copy.annotate.saved.edit });
      return;
    }
    setHighlightId(saved.id, "me");
    setReveal({ id: saved.id, transactionDate: saved.transactionDate });
    const key = newIdempotencyKey();
    notify({ tone: "success", message: copy.annotate.saved[saved.type], action: { label: copy.annotate.undo, onAction: () => void undo(saved, key) } });
  }, [close, notify, undo, setHighlightId]);

  // E5 de un gasto compartido (02·5): la hoja se cierra, la fila nueva queda resaltada en Nosotros y el aviso ofrece
  // «Deshacer» 6 s. La siguiente apertura recuerda lo que se usó (Q5).
  const onSharedSaved = useCallback((saved: SavedShared, kind: "create" | "editShared") => {
    close();
    if (couple) setLastSplit(lastFromSaved(saved, couple.members));
    if (kind === "editShared") {
      notify({ tone: "success", message: copy.annotate.saved.edit });
      return;
    }
    setHighlightId(saved.id, "us");
    setReveal({ id: saved.id, transactionDate: saved.transactionDate });
    const key = newIdempotencyKey();
    notify({ tone: "success", message: copy.annotate.saved.expense, undo: saved.id, action: { label: copy.annotate.undo, onAction: () => void undoShared(saved, key) } });
  }, [close, couple, notify, undoShared, setHighlightId]);

  // Mover a Pareja (T050). El diálogo vive aquí para que A4 (el aviso con «Deshacer» y el resaltado) sobreviva a la
  // navegación; al confirmarse se pasa a Nosotros y se lleva a Actividad del mes del gasto, con la fila «movido desde Yo».
  const openMove = useCallback((transaction: SavedTransaction, trigger: HTMLElement | null) => {
    if (!couple || transaction.type !== "expense") return;
    moveTrigger.current = trigger;
    close();
    setMoveTarget({ transaction, key: newIdempotencyKey() });
  }, [close, couple]);
  const onMoved = useCallback((result: MoveResult, message: string) => {
    setMoveTarget(null);
    appContext?.choose("us");
    setHighlightId(result.shared.id, "us");
    const key = newIdempotencyKey();
    notify({ tone: "success", message, undo: result.shared.id, action: { label: copy.annotate.undo, onAction: () => void undoMove(result, key) } });
    router.push(`/actividad?mes=${result.shared.transactionDate.slice(0, 7)}`);
  }, [appContext, notify, router, undoMove, setHighlightId]);

  // Q16: sin tiempo real; al volver a la pestaña se pide la página otra vez para traer lo que anotó la otra persona.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

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
  const state = useMemo(() => ({ open, openFrom, openEdit, openEditShared, openMove, couple: coupleForSheet, sharedActions: sharedActions ?? null, highlightId, notify, actions, track, offerSettlementUndo }),
    [open, openFrom, openEdit, openEditShared, openMove, coupleForSheet, sharedActions, highlightId, notify, actions, track, offerSettlementUndo]);
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
            couple={coupleForSheet}
            sharedActions={sharedActions}
            initialContext={currentContext}
            onSharedSaved={onSharedSaved}
            onMove={(transaction) => openMove(transaction, returnFocusTo.current)}
          />
        </Suspense>
      ) : null}
      {moveTarget && coupleForSheet && sharedActions ? (
        <Suspense fallback={null}>
          <MoveDialog
            key={moveTarget.key}
            transaction={moveTarget.transaction}
            idempotencyKey={moveTarget.key}
            members={coupleForSheet.members}
            actions={sharedActions}
            onClose={() => { setMoveTarget(null); moveTrigger.current?.focus?.(); }}
            onDone={onMoved}
          />
        </Suspense>
      ) : null}
      {/* Por encima de la barra inferior en móvil; en escritorio, centrado en el contenido, a la derecha del rail o del
          sidebar. Un solo aviso a la vez: el nuevo reemplaza al anterior. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[var(--z-toast)] flex justify-center px-3.5 lg:bottom-6 lg:pl-[calc(76px+28px)] xl:pl-[calc(248px+40px)]">
        <div className="flex w-full max-w-[440px] flex-col gap-2">
          {recoveryNote ? <Toast key={`recuperacion-${recoveryNote.id}`} tone={recoveryNote.tone} message={recoveryNote.message} onTimeout={() => setRecoveryNote((current) => (current?.id === recoveryNote.id ? null : current))} /> : null}
          {pendingUndo ? (
            <div className="pointer-events-auto shadow-raised rounded-[16px]">
              <WriteUnknown
                message={copy.writes.undoUnknown}
                checking={pendingUndo.checking}
                notFound={pendingUndo.phase === "notFound"}
                onRetry={() => void runUndo(pendingUndo.intent, "send", "pending")}
                onCheck={() => void runUndo(pendingUndo.intent, "check", "pending")}
                onDismiss={() => setConfirmingDismiss(true)}
              />
            </div>
          ) : null}
          <AnimatePresence>
            {toast ? <Toast key={toast.id} tone={toast.tone} message={toast.message} action={toast.undo && toast.action && activeUndo && activeUndo.intent.id !== toast.undo ? { ...toast.action, blocked: copy.writes.undoBlocked } : toast.action} onTimeout={() => dismissToast(toast.id)} /> : null}
          </AnimatePresence>
        </div>
      </div>
      <ConfirmDialog
        open={confirmingDismiss}
        onOpenChange={setConfirmingDismiss}
        title={copy.writes.close.title}
        description={copy.writes.undoCloseDescription}
        cancel={(ref) => <Button ref={ref} variant="ghost" onClick={() => setConfirmingDismiss(false)}>{copy.writes.close.keep}</Button>}
        confirm={<Button variant="secondary" onClick={() => { setConfirmingDismiss(false); setActiveUndo(null); }}>{copy.writes.close.confirm}</Button>}
      />
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

/** PR D: el proveedor, o `null` fuera de él (el detalle de liquidación se pinta también en pruebas sin Anotar). */
export function useOptionalAnnotate() {
  return useContext(AnnotateContext);
}

export function useAnnotate() {
  const state = useContext(AnnotateContext);
  if (!state) throw new Error("Anotar necesita AnnotateProvider");
  return state;
}
