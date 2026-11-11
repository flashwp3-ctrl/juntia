"use client";
// T081, T082 / FR-030–FR-036; US-2, US-3, US-4.1; MOTION_SYSTEM.md §2. El proveedor de Anotar vive en el layout de producto,
// así que lo que tiene que sobrevivir a una navegación vive aquí y no en la página: la hoja (abierta u oculta mientras viaja la
// creación), los avisos con «Deshacer», la fila resaltada de E5 y las filas en vuelo. El mismo disparador (barra, rail,
// sidebar, Inicio y `N` fuera de un campo de texto) abre la hoja.
// Es una composición de piezas pequeñas, cada una con su máquina explícita y sus pruebas (`annotate/`):
//   sheet-machine   la hoja: una a la vez, modo, clave de idempotencia por apertura y contexto elegido al abrir (FR-062);
//   undo-machine    el deshacer único de la 003 (reserva, aviso fijo, «Comprobar estado»), con `use-undo` y los avisos;
//   flights         las filas «Guardando…» y las listas montadas (F51-8, F51-12; F69-5, F69-6, F69-7);
//   reveal-machine  E5, decidido por los ids que el servidor entrega a las listas, con su tabla de estados.
// PR C de la 003 (T045; FR-059–FR-062): además, la pareja activa para la hoja (con lo último que usó la persona en Nosotros, en
// memoria), las escrituras compartidas, la edición de un compartido y el diálogo de Mover a Pareja. Al volver a la pestaña se
// pide la página otra vez para traer lo que anotó la otra persona (Q16).
import { useRouter } from "next/navigation";
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { todayInBogota } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import type { ActionResult, ExpenseActions, PendingRow, SavedTransaction } from "./types";
import type { CoupleForSheet, LastSplit, MoveResult, SavedShared, SharedActions } from "./shared-types";
import type { SavedSettlement } from "@/features/balance/types";
import type { ContextChoice } from "@/lib/context-preference";
import { useOptionalContextChoice } from "@/components/shell/context-selector";
import { newIdempotencyKey } from "./idempotency";
import { lastFromSaved } from "./split-state";
import type { GoalActions, SavedEntry } from "@/features/goals/types";
import type { GoalFundingActions, SavedGoalExpense } from "./goal-funding/types";
import { AnnotateNotices } from "./annotate/annotate-notices";
import { NO_FLIGHTS } from "./annotate/flights";
import { initialSheet, isBusy, reduceSheet, type SheetMode } from "./annotate/sheet-machine";
import { useFlights, type ListScope } from "./annotate/use-flights";
import { useMachine } from "./annotate/use-machine";
import { currentRoute, useReveal } from "./annotate/use-reveal";
import { useNotices, useSingleUndo, type Notice } from "./annotate/use-undo";

export type { SheetMode } from "./annotate/sheet-machine";

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

type AnnotateState = {
  open: boolean;
  openFrom: (trigger: HTMLElement | null) => void;
  openEdit: (transaction: SavedTransaction, trigger: HTMLElement | null, onReload: () => void) => void;
  /** Movimiento recién anotado: su fila queda resaltada en Inicio y Actividad (E5). */
  highlightId: string | null;
  notify: (notice: Notice) => void;
  actions: ExpenseActions;
  /** UX lote 1, cambio 3: oculta la hoja, enseña la fila al instante y envía; si falla, la hoja vuelve. */
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
  /** 004 PR C (T047; FR-042, FR-095): el aviso de un aporte o un retiro con «Deshacer» de 6 s, con la misma regla de un deshacer a la vez. */
  offerGoalUndo: (offer: { kind: "contribution" | "withdrawal"; saved: SavedEntry; message: string }) => void;
  /** 004 PR D (T060–T063): las escrituras del gasto con meta (B1–B7, quitar el uso), o `null` sin ellas. */
  goalFunding: GoalFundingActions | null;
};

const AnnotateContext = createContext<AnnotateState | null>(null);
/** Las filas en vuelo, aparte del estado de la hoja: Inicio y Actividad las leen sin re-pintarse con cada cambio de la hoja. */
const PendingContext = createContext<{ rows: readonly PendingRow[]; scope: ListScope }>({ rows: NO_FLIGHTS, scope: { enter: () => () => {}, report: () => {}, filter: () => {} } });

type AnnotateProviderProps = {
  children: ReactNode;
  actions: ExpenseActions;
  /** Hoy en Bogotá, que calcula el servidor; por defecto, el del dispositivo llevado a Bogotá. */
  today?: string;
  /** PR C (T046): la pareja activa para la hoja (con lo último que usó la persona en Nosotros) y sus escrituras. */
  couple?: CoupleForSheet | null;
  sharedActions?: SharedActions;
  /** 004 PR C (T047): las escrituras de metas, para el «Deshacer» de aportes y retiros. */
  goalActions?: GoalActions;
  /** 004 PR D: el gasto con meta; por defecto, el que viaja con las de metas (`goalActions.funding`). */
  goalFunding?: GoalFundingActions;
  /** El contexto de la app; por defecto, el del selector (ContextProvider). Las pruebas lo fijan aquí. */
  context?: ContextChoice;
};

/** Hace que una función cambiante sea estable para los efectos y los avisos ya creados: siempre llama a la última. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; });
  return ref;
}

export function AnnotateProvider({ children, actions, today, couple = null, sharedActions, goalActions, goalFunding, context }: AnnotateProviderProps) {
  const funding = goalFunding ?? goalActions?.funding ?? null;
  const appContext = useOptionalContextChoice();
  const currentContext: ContextChoice = context ?? appContext?.value ?? "me";
  const pageContext = useLatest(currentContext);
  const router = useRouter();
  const actionsRef = useLatest(actions);
  const sharedRef = useLatest(sharedActions);
  const goalRef = useLatest(goalActions);
  const fundingRef = useLatest(funding);

  // Q5, decisión 1: lo último que usó esta persona en Nosotros. Nace de lo que leyó el layout y se actualiza en memoria al
  // guardar; nunca va al almacenamiento del navegador.
  const [lastSplit, setLastSplit] = useState<LastSplit | null>(couple?.last ?? null);
  const coupleForSheet = useMemo(() => (couple ? { members: couple.members, last: lastSplit } : null), [couple, lastSplit]);

  // La hoja (sheet-machine). La referencia la leen `N` y el segundo toque en el mismo cuadro.
  const [sheet, sendSheet, sheetRef] = useMachine(reduceSheet, initialSheet);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  // Cómo llegó la última interacción: `pointerdown` es puntero; `keydown` (el atajo `N`, Enter o Espacio en un disparador, que
  // producen un clic con `detail === 0`) es teclado. Se lee al abrir: los disparadores no tienen que pasarlo (WCAG 2.4.7).
  const modality = useRef<"pointer" | "keyboard">("keyboard");
  useEffect(() => {
    const pointer = () => { modality.current = "pointer"; };
    const keyboard = () => { modality.current = "keyboard"; };
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", keyboard, true);
    return () => { document.removeEventListener("pointerdown", pointer, true); document.removeEventListener("keydown", keyboard, true); };
  }, []);
  const begin =useCallback((mode: SheetMode, trigger: HTMLElement | null) => {
    if (isBusy(sheetRef.current)) return; // una sola hoja a la vez
    returnFocusTo.current = trigger;
    sendSheet({ type: "open", mode, key: newIdempotencyKey(), context: pageContext.current, via: modality.current });
  }, [pageContext, sendSheet, sheetRef]);
  const openFrom = useCallback((trigger: HTMLElement | null) => begin({ kind: "create" }, trigger), [begin]);
  const openEdit = useCallback((transaction: SavedTransaction, trigger: HTMLElement | null, onReload: () => void) => begin({ kind: "edit", transaction, onReload }, trigger), [begin]);
  const openEditShared = useCallback((expense: SavedShared, trigger: HTMLElement | null, onReload: () => void) => begin({ kind: "editShared", expense, onReload }, trigger), [begin]);
  const close = useCallback(() => sendSheet({ type: "close" }), [sendSheet]);

  // El resaltado de E5 guarda su contexto y no se ve en el otro (FR-040).
  const [highlight, setHighlight] = useState<{ id: string; context: ContextChoice } | null>(null);
  const highlightId = highlight && highlight.context === currentContext ? highlight.id : null;
  const highlightIn = useCallback((id: string, where: ContextChoice) => setHighlight({ id, context: where }), []);
  const unhighlight = useCallback((id: string) => setHighlight((current) => (current?.id === id ? null : current)), []);

  // Las creaciones en vuelo y las listas montadas. La ruta del envío es la de E5: la hoja se oculta y la persona puede navegar
  // antes de que responda el servidor.
  const submittedFrom = useRef<string | null>(null);
  const flights = useFlights({
    refresh: () => router.refresh(),
    onLaunch: () => { submittedFrom.current = currentRoute(); sendSheet({ type: "hide" }); },
    onReturn: () => sendSheet({ type: "restore" }),
  });
  const { askRefresh, registry, track } = flights;

  // E5 (reveal-machine). Terminar en la pantalla es ir a Actividad del mes, tras pedir otra revalidación.
  const reveal = useReveal({
    registry,
    page: () => pageContext.current,
    onHighlight: highlightIn,
    onActivity: (month) => { askRefresh(); router.push(`/actividad?mes=${month}`); },
  });

  // Los avisos y sus «Deshacer».
  const notices = useNotices();
  const { notify } = notices;
  const [inFlight] = useState(() => new Set<string>());
  const singleUndo = useSingleUndo(notices, inFlight, () => sharedRef.current?.check);
  const runUndo = singleUndo.run;

  // «Deshacer» de una creación privada (US-2.5; FR-034): anula con `undo` y la versión que devolvió la creación. Revisión del
  // PR #74 (decisión del gestor, 11 nov 2026): se alinea con el contrato de la 003/004, como las demás intenciones. Entra en la
  // reserva única, con el tope de 15 s. Un desconocido pasa al aviso fijo con «Reintentar» (la misma clave) y «Comprobar estado»
  // (`write_status` con `void_transaction`); antes era un aviso ordinario que caducaba. Un rechazo confirmado no ofrece reintento.
  const undoPrivate = useCallback((saved: SavedTransaction, idempotencyKey: string) => runUndo({
    action: "void_transaction", id: saved.id, idempotencyKey, done: copy.annotate.undone[saved.type],
    send: () => actionsRef.current.voidTransaction({ idempotencyKey, transactionId: saved.id, expectedVersion: saved.version, reason: "undo" }),
    check: (input) => (actionsRef.current.check ? actionsRef.current.check(input) : Promise.resolve({ state: "error" as const })),
    onOk: () => unhighlight(saved.id),
    rejected: (error) => {
      if (error === "alreadyDeleted" || error === "notFound") unhighlight(saved.id);
      return error === "versionConflict" ? copy.annotate.undoChanged : error === "alreadyDeleted" || error === "notFound" ? copy.transaction.errors.alreadyDeleted
        : error === "sessionExpired" ? copy.errors.sessionExpired : copy.errors.unexpected;
    },
  }, "send"), [actionsRef, runUndo, unhighlight]);

  // F57-4: «Deshacer» de un gasto compartido (FR-024) y de Mover a Pareja (FR-034), con el contrato común.
  const undoShared = useCallback((saved: SavedShared, idempotencyKey: string) => runUndo({
    action: "void_shared_expense", id: saved.id, idempotencyKey, done: copy.annotate.undone.expense,
    send: () => sharedRef.current!.voidShared({ idempotencyKey, transactionId: saved.id, expectedVersion: saved.version, reason: "undo" }),
    onOk: () => unhighlight(saved.id),
    rejected: (error) => {
      if (error === "alreadyDeleted" || error === "notFound") unhighlight(saved.id);
      return error === "versionConflict" ? copy.annotate.undoChanged : error === "alreadyDeleted" || error === "notFound" ? copy.transaction.errors.alreadyDeleted
        : error === "sessionExpired" ? copy.errors.sessionExpired : copy.errors.unexpected;
    },
  }, "send"), [runUndo, sharedRef, unhighlight]);

  const undoMove = useCallback((result: MoveResult, idempotencyKey: string) => runUndo({
    action: "undo_reclassify_to_shared", id: result.shared.id, idempotencyKey, done: copy.move.undone,
    send: () => sharedRef.current!.undoReclassify!({ idempotencyKey, sharedTransactionId: result.shared.id, expectedVersion: result.shared.version }),
    onOk: () => unhighlight(result.shared.id),
    rejected: (error) => (error === "undoNotAvailable" || error === "versionConflict" ? copy.move.errors.undoNotAvailable : error === "sessionExpired" ? copy.errors.sessionExpired : copy.errors.unexpected),
  }, "send"), [runUndo, sharedRef, unhighlight]);

  // PR D (T062; Q11): «Deshacer» de una liquidación recién registrada. La función exige además que tenga menos de 60 s.
  const undoSettlement = useCallback((saved: SavedSettlement, idempotencyKey: string) => runUndo({
    action: "void_settlement", id: saved.id, idempotencyKey, done: copy.balance.settle.undone,
    send: () => sharedRef.current!.voidSettlement!({ idempotencyKey, settlementId: saved.id, expectedVersion: saved.version, reason: "undo" }),
    onOk: () => {},
    rejected: (error) => (error === "undoNotAvailable" || error === "versionConflict" ? copy.move.errors.undoNotAvailable : error === "alreadyVoided" ? copy.balance.settlement.errors.alreadyVoided
      : error === "sessionExpired" ? copy.errors.sessionExpired : copy.errors.unexpected),
  }, "send"), [runUndo, sharedRef]);
  const offerSettlementUndo = useCallback((saved: SavedSettlement) => {
    const key = newIdempotencyKey();
    notify({ tone: "success", message: copy.balance.settle.done, undo: saved.id, action: { label: copy.annotate.undo, onAction: () => void undoSettlement(saved, key) } });
  }, [notify, undoSettlement]);

  // 004 PR C (T047; Q13, FR-042, FR-095): «Deshacer» de un aporte o un retiro. La función acepta el deshacer durante 60 s
  // (research R8) y fuera de esa ventana responde JT225, que se dice.
  const undoGoalEntry = useCallback((kind: "contribution" | "withdrawal", saved: SavedEntry, idempotencyKey: string) => runUndo({
    action: "void_goal_entry", id: saved.id, idempotencyKey, done: kind === "contribution" ? copy.goals.contribute.undone : copy.goals.withdrawSheet.undone,
    send: () => goalRef.current ? goalRef.current.voidEntry({ idempotencyKey, entryId: saved.id, reason: "undo" }) : Promise.resolve({ status: "unknown" as const }),
    check: (input) => goalRef.current ? goalRef.current.check(input) : Promise.resolve({ state: "error" as const }),
    onOk: () => router.refresh(),
    rejected: (error) => (error === "goalUndoNotAvailable" ? copy.goals.errors.undoNotAvailable : error === "entryAlreadyVoided" ? copy.goals.errors.alreadyVoided
      : error === "insufficientFunds" ? copy.goals.errors.fundsUsed : error === "sessionExpired" ? copy.errors.sessionExpired : copy.errors.unexpected),
  }, "send"), [goalRef, router, runUndo]);
  const offerGoalUndo = useCallback(({ kind, saved, message }: { kind: "contribution" | "withdrawal"; saved: SavedEntry; message: string }) => {
    const key = newIdempotencyKey();
    notify({ tone: "success", message, undo: saved.id, action: { label: copy.annotate.undo, onAction: () => void undoGoalEntry(kind, saved, key) } });
  }, [notify, undoGoalEntry]);

  // 004 PR D (T061, T063; FR-059, FR-095): el «Deshacer» de un gasto con meta anula en una operación el gasto, sus usos y la
  // solicitud pendiente, con la versión que devolvió el registro.
  const undoGoalExpense = useCallback((saved: SavedGoalExpense, idempotencyKey: string) => runUndo({
    action: saved.context === "us" ? "void_shared_expense" : "void_transaction", id: saved.transaction.id, idempotencyKey, done: copy.annotate.undone.expense,
    send: () => fundingRef.current ? fundingRef.current.undoExpense({ idempotencyKey, context: saved.context, transactionId: saved.transaction.id, expectedVersion: saved.transaction.version }) : Promise.resolve({ status: "unknown" as const }),
    check: (input) => fundingRef.current ? fundingRef.current.check(input) : Promise.resolve({ state: "error" as const }),
    onOk: () => { unhighlight(saved.transaction.id); router.refresh(); },
    rejected: (error) => (error === "goalUndoNotAvailable" ? copy.goals.errors.undoNotAvailable : error === "undoNotAvailable" ? copy.move.errors.undoNotAvailable : error === "versionConflict" ? copy.annotate.undoChanged
      : error === "alreadyDeleted" || error === "notFound" ? copy.transaction.errors.alreadyDeleted : error === "sessionExpired" ? copy.errors.sessionExpired : copy.errors.unexpected),
  }, "send"), [fundingRef, router, runUndo, unhighlight]);

  // E5 de una creación: la hoja se cierra, la fila nueva queda resaltada en el contexto de la escritura y E5 la busca en la
  // pantalla; el aviso ofrece «Deshacer» 6 s.
  const onGoalExpenseSaved = useCallback((saved: SavedGoalExpense, message: string) => {
    close();
    highlightIn(saved.transaction.id, saved.context);
    reveal({ id: saved.transaction.id, transactionDate: saved.transaction.transactionDate, context: saved.context });
    const key = newIdempotencyKey();
    notify({ tone: "success", message, undo: saved.transaction.id, action: { label: copy.annotate.undo, onAction: () => void undoGoalExpense(saved, key) } });
  }, [close, highlightIn, notify, reveal, undoGoalExpense]);

  const onSaved = useCallback((saved: SavedTransaction, kind: SheetMode["kind"]) => {
    close();
    if (kind === "edit") {
      notify({ tone: "success", message: copy.annotate.saved.edit });
      return;
    }
    highlightIn(saved.id, "me");
    reveal({ id: saved.id, transactionDate: saved.transactionDate, context: "me" }, submittedFrom.current ?? currentRoute());
    const key = newIdempotencyKey();
    notify({ tone: "success", message: copy.annotate.saved[saved.type], undo: saved.id, action: { label: copy.annotate.undo, onAction: () => void undoPrivate(saved, key) } });
  }, [close, highlightIn, notify, reveal, undoPrivate]);

  // E5 de un gasto compartido (02·5). La siguiente apertura recuerda lo que se usó (Q5).
  const onSharedSaved = useCallback((saved: SavedShared, kind: "create" | "editShared") => {
    close();
    if (couple) setLastSplit(lastFromSaved(saved, couple.members));
    if (kind === "editShared") {
      notify({ tone: "success", message: copy.annotate.saved.edit });
      return;
    }
    highlightIn(saved.id, "us");
    reveal({ id: saved.id, transactionDate: saved.transactionDate, context: "us" });
    const key = newIdempotencyKey();
    notify({ tone: "success", message: copy.annotate.saved.expense, undo: saved.id, action: { label: copy.annotate.undo, onAction: () => void undoShared(saved, key) } });
  }, [close, couple, highlightIn, notify, reveal, undoShared]);

  // Mover a Pareja (T050). El diálogo vive aquí para que A4 (el aviso con «Deshacer» y el resaltado) sobreviva a la
  // navegación; al confirmarse se pasa a Nosotros y se lleva a Actividad del mes del gasto, con la fila «movido desde Yo».
  const [moveTarget, setMoveTarget] = useState<{ transaction: SavedTransaction; key: string } | null>(null);
  const moveTrigger = useRef<HTMLElement | null>(null);
  const openMove = useCallback((transaction: SavedTransaction, trigger: HTMLElement | null) => {
    if (!couple || transaction.type !== "expense") return;
    moveTrigger.current = trigger;
    close();
    setMoveTarget({ transaction, key: newIdempotencyKey() });
  }, [close, couple]);
  const onMoved = useCallback((result: MoveResult, message: string) => {
    setMoveTarget(null);
    appContext?.choose("us");
    highlightIn(result.shared.id, "us");
    const key = newIdempotencyKey();
    notify({ tone: "success", message, undo: result.shared.id, action: { label: copy.annotate.undo, onAction: () => void undoMove(result, key) } });
    router.push(`/actividad?mes=${result.shared.transactionDate.slice(0, 7)}`);
  }, [appContext, highlightIn, notify, router, undoMove]);

  // Q16: sin tiempo real; al volver a la pestaña se pide la página otra vez para traer lo que anotó la otra persona.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 1));
    idle(() => void loadSheet());
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "n" && event.key !== "N") return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.defaultPrevented) return;
      if (isBusy(sheetRef.current) || isEditable(event.target)) return;
      event.preventDefault();
      openFrom(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openFrom, sheetRef]);

  const open = sheet.phase === "open";
  const state = useMemo(() => ({ open, openFrom, openEdit, openEditShared, openMove, couple: coupleForSheet, sharedActions: sharedActions ?? null, highlightId, notify, actions, track, offerSettlementUndo, offerGoalUndo, goalFunding: funding }),
    [open, openFrom, openEdit, openEditShared, openMove, coupleForSheet, sharedActions, highlightId, notify, actions, track, offerSettlementUndo, offerGoalUndo, funding]);
  const pendingContext = useMemo(() => ({ rows: flights.rows, scope: flights.scope }), [flights.rows, flights.scope]);
  const pending = singleUndo.state;
  return (
    <AnnotateContext.Provider value={state}>
     <PendingContext.Provider value={pendingContext}>
      {children}
      {sheet.mounted ? (
        <Suspense fallback={null}>
          <AnnotateSheet
            key={sheet.key}
            open={open}
            mode={sheet.mode}
            idempotencyKey={sheet.key}
            today={today ?? todayInBogota()}
            actions={actions}
            onClose={close}
            onSaved={onSaved}
            onTrack={track}
            returnFocusTo={returnFocusTo}
            couple={coupleForSheet}
            sharedActions={sharedActions}
            initialContext={sheet.context}
            openedWith={sheet.via}
            onSharedSaved={onSharedSaved}
            goalFunding={funding ?? undefined}
            onGoalSaved={onGoalExpenseSaved}
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
      <AnnotateNotices
        toast={notices.toast}
        onToastTimeout={notices.dismiss}
        recovery={notices.recovery}
        onRecoveryTimeout={notices.dismissRecovery}
        undo={pending}
        onRetryUndo={() => { if (pending) void runUndo(pending.intent, "send", "pending"); }}
        onCheckUndo={() => { if (pending) void runUndo(pending.intent, "check", "pending"); }}
        onDismissUndo={singleUndo.dismiss}
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

/**
 * Las listas montan su mes y avisan de los ids reales que traen, para retirar la fila temporal que ya no hace falta (F51-12) y
 * para que E5 sepa si la pantalla puede enseñar el gasto nuevo. F69-6: `contexts`, de qué contextos pinta movimientos la
 * lista (Actividad e Inicio de Yo: `["me"]`; Inicio de Yo con pareja, que pinta tu parte de lo compartido: `["me", "us"]`;
 * Nosotros: `["us"]`). #54: `filters`, en una lista con filtros (Actividad), los ids que trae y sus filtros dejan fuera, y cómo
 * quitar solo los filtros que excluyen uno.
 */
export function useListScope(month: string, ids: readonly string[], contexts: readonly ContextChoice[], filters?: { hidden: readonly string[]; unhide: (id: string) => void }) {
  const { scope, rows } = useContext(PendingContext);
  const key = useId();
  const contextKey = contexts.join(",");
  useEffect(() => scope.enter(key, month, contextKey.split(",") as ContextChoice[]), [scope, key, month, contextKey]);
  // Lo que la lista trae cambió (llegó una revalidación): (a) y (b).
  useEffect(() => scope.report(key, month, ids, true), [scope, key, month, ids, contextKey]);
  // Una fila acaba de confirmarse y la lista ya la trae (la real llegó antes que la respuesta): solo (a).
  const confirmed = rows.filter((row) => row.state === "confirmed").map((row) => row.savedId).join(",");
  useEffect(() => scope.report(key, month, ids, false), [scope, key, month, ids, confirmed]);
  const unhide = useRef(filters?.unhide);
  useEffect(() => { unhide.current = filters?.unhide; });
  const hiddenKey = filters?.hidden.join(",") ?? "";
  useEffect(() => { scope.filter(key, hiddenKey ? hiddenKey.split(",") : [], (id) => unhide.current?.(id)); }, [scope, key, month, contextKey, hiddenKey]);
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
