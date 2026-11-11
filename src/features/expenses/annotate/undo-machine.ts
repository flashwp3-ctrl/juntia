// El deshacer único (F57-4, F57-6, F57-8 y F57-9 de la 003; contracts/server-actions.md §1–§2) como máquina pura. Lo
// comparten el gasto compartido, Mover a Pareja, la liquidación, los aportes y retiros de metas y el gasto con meta (privado o
// compartido). La intención se reserva desde que EMPIEZA («en curso»), no solo al llegar a desconocido: mientras exista, los
// «Deshacer» de los avisos nuevos quedan bloqueados. Su resultado se aplica por la identidad de la intención, no por la
// generación del aviso. ok o rechazo liberan la reserva; desconocido o «sin constar» la dejan en un aviso fijo que no caduca,
// con «Reintentar» y «Comprobar estado». Cerrar ese aviso (confirmado) la libera. Vive en memoria; nunca en el navegador.
import { TIMED_OUT } from "@/features/shared/use-write";
import type { WriteAction, WriteError, WriteOutcome, WriteStatusOutcome } from "@/features/shared/write-result";

export type UndoIntent = {
  action: "void_shared_expense" | "undo_reclassify_to_shared" | "void_settlement" | "void_goal_entry" | "void_transaction";
  /** El id de lo que se deshace: el aviso con «Deshacer» de esa misma operación no se bloquea. */
  id: string;
  idempotencyKey: string;
  send: () => Promise<WriteOutcome<unknown>>;
  done: string;
  rejected: (error: WriteError) => string;
  onOk: () => void;
  /** 004 PR C: «Comprobar estado» propio (las metas existen también sin pareja, sin las escrituras compartidas). */
  check?: (input: { action: WriteAction; idempotencyKey: string }) => Promise<WriteStatusOutcome<unknown>>;
};

export type UndoReservation = { intent: UndoIntent; phase: "running" | "unknown" | "notFound"; checking: boolean };
export type UndoState = UndoReservation | null;

export type UndoOutcome = { kind: "ok" } | { kind: "rejected"; error: WriteError } | { kind: "unknown" } | { kind: "notFound" };

export type UndoEvent =
  /** Un envío o un «Comprobar estado» empieza. Con otra intención reservada no cambia nada (ver `mayRun`). */
  | { type: "start"; intent: UndoIntent }
  | { type: "settle"; intent: UndoIntent; outcome: UndoOutcome }
  /** «¿Cerrar sin confirmar?» confirmado: se suelta la reserva; una respuesta tardía ya no toca nada. */
  | { type: "dismiss" };

export function reduceUndo(state: UndoState, event: UndoEvent): UndoState {
  switch (event.type) {
    case "start":
      if (!state) return { intent: event.intent, phase: "running", checking: false };
      return state.intent === event.intent ? { ...state, checking: true } : state;
    case "settle":
      if (state?.intent !== event.intent) return state;
      if (event.outcome.kind === "ok" || event.outcome.kind === "rejected") return null;
      return { intent: event.intent, phase: event.outcome.kind, checking: false };
    case "dismiss":
      return null;
  }
}

/** Una intención solo corre si no hay reserva o si la reserva es ella misma (reintento o «Comprobar estado» del aviso fijo). */
export const mayRun = (state: UndoState, intent: UndoIntent) => !state || state.intent === intent;

/** El aviso fijo, una vez que el primer intento dejó de estar «en curso». */
export const pendingOf = (state: UndoState) => (state && state.phase !== "running" ? state : null);

/** El «Deshacer» del aviso `undoId` queda bloqueado si hay otra intención reservada (F57-8, F57-9). */
export const blocksUndo = (state: UndoState, undoId: string | undefined) => Boolean(undoId && state && state.intent.id !== undoId);

/** Lo que significa la respuesta de un envío: cada intento espera como mucho 15 s y después es desconocido. */
export function sendOutcome(result: WriteOutcome<unknown> | typeof TIMED_OUT): UndoOutcome {
  if (result === TIMED_OUT || result.status === "unknown") return { kind: "unknown" };
  return result.status === "ok" ? { kind: "ok" } : { kind: "rejected", error: result.error };
}

/** Lo que significa «Comprobar estado» (`write_status`, que no reejecuta nada). */
export function checkOutcome(result: WriteStatusOutcome<unknown> | typeof TIMED_OUT): UndoOutcome {
  if (result === TIMED_OUT || result.state === "error") return { kind: "unknown" };
  return result.state === "completed" ? { kind: "ok" } : { kind: "notFound" };
}
