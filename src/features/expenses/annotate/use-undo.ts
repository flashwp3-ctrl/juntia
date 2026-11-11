"use client";
// Los avisos de Anotar y sus «Deshacer». Un solo aviso a la vez: el nuevo reemplaza al anterior, y cada aviso nuevo invalida
// las respuestas tardías del anterior (la generación). Todo «Deshacer» pasa por el deshacer único (`undo-machine.ts`), con la
// reserva, el tope de 15 s, el aviso fijo y «Comprobar estado»; también el de la creación privada desde la revisión del PR #74.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastAction, ToastTone } from "@/components/ui/toast";
import { withTimeout } from "@/features/shared/use-write";
import type { WriteAction, WriteStatusOutcome } from "@/features/shared/write-result";
import { useMachine } from "./use-machine";
import { checkOutcome, mayRun, reduceUndo, sendOutcome, type UndoIntent, type UndoOutcome } from "./undo-machine";

/** `undo`: el id de lo que deshace el «Deshacer» del aviso (F57-8/F57-9: queda bloqueado si otra intención está reservada). */
export type ToastState = { id: number; tone: ToastTone; message: string; action?: ToastAction; undo?: string };
export type Notice = Omit<ToastState, "id">;
export type RecoveryNote = { id: number; tone: ToastTone; message: string };

export function useNotices() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const generation = useRef(0);
  const notify = useCallback((notice: Notice) => {
    generation.current += 1;
    setToast({ ...notice, id: generation.current });
  }, []);
  /** El «Deshacer» del aviso `id` se está enviando (si ese aviso sigue a la vista). */
  const markBusy = useCallback((id: number) => setToast((current) => (current && current.id === id && current.action ? { ...current, action: { ...current.action, busy: true } } : current)), []);
  const dismiss = useCallback((id: number) => setToast((current) => (current?.id === id ? null : current)), []);
  // Quinta ronda F57-9: el resultado de una recuperación (aviso fijo) nunca usa el aviso ordinario, que puede ser el de otra
  // operación esperando con su «Deshacer»: se muestra un momento en el sitio del aviso fijo y se retira.
  const [recovery, setRecovery] = useState<RecoveryNote | null>(null);
  const recoveryId = useRef(0);
  const showRecovery = useCallback((note: Omit<RecoveryNote, "id">) => { recoveryId.current += 1; setRecovery({ id: recoveryId.current, ...note }); }, []);
  const dismissRecovery = useCallback((id: number) => setRecovery((current) => (current?.id === id ? null : current)), []);
  return { toast, notify, generation, markBusy, dismiss, recovery, showRecovery, dismissRecovery };
}

type Notices = ReturnType<typeof useNotices>;

/**
 * El deshacer único. `run` envía la intención (o comprueba su estado) si no hay otra reservada; `source` dice desde dónde: el
 * aviso con «Deshacer» o el aviso fijo de la reserva. `inFlight`: los ids con una petición de deshacer en curso (dos toques o
 * un reintento son la misma intención).
 */
export function useSingleUndo(notices: Notices, inFlight: Set<string>, fallbackCheck: () => ((input: { action: WriteAction; idempotencyKey: string }) => Promise<WriteStatusOutcome<unknown>>) | undefined) {
  const [state, send, ref] = useMachine(reduceUndo, null);
  const { notify, generation, markBusy, showRecovery, dismiss: dismissToast } = notices;
  const fallback = useRef(fallbackCheck);
  useEffect(() => { fallback.current = fallbackCheck; });
  const run = useCallback(async (intent: UndoIntent, mode: "send" | "check", source: "toast" | "pending" = "toast") => {
    const check = intent.check ?? fallback.current();
    if (!mayRun(ref.current, intent) || !check || inFlight.has(intent.id)) return;
    inFlight.add(intent.id);
    const asked = generation.current;
    send({ type: "start", intent });
    if (source === "toast") markBusy(asked);
    let outcome: UndoOutcome;
    try {
      outcome = mode === "send" ? sendOutcome(await withTimeout(intent.send())) : checkOutcome(await withTimeout(check({ action: intent.action, idempotencyKey: intent.idempotencyKey })));
    } catch {
      outcome = { kind: "unknown" };
    }
    inFlight.delete(intent.id);
    // Se aplica por la identidad: si la reserva ya no es esta intención (se cerró confirmándolo), la respuesta no toca nada.
    if (ref.current?.intent !== intent) return;
    send({ type: "settle", intent, outcome });
    if (outcome.kind === "ok" || outcome.kind === "rejected") {
      if (outcome.kind === "ok") intent.onOk();
      const result = outcome.kind === "ok" ? { tone: "success" as const, message: intent.done } : { tone: "error" as const, message: intent.rejected(outcome.error) };
      // Desde el aviso con «Deshacer», solo si nadie ocupó su lugar (una respuesta vieja no pisa un mensaje más nuevo).
      if (source === "pending") showRecovery(result);
      else if (asked === generation.current) notify(result);
    } else if (source === "toast" && asked === generation.current) {
      // Desconocido o sin constar: queda el aviso fijo, que no caduca; el aviso con «Deshacer» de esta intención se retira.
      dismissToast(asked);
    }
  }, [dismissToast, generation, inFlight, markBusy, notify, ref, send, showRecovery]);
  const dismiss = useCallback(() => send({ type: "dismiss" }), [send]);
  return { state, run, dismiss };
}
