"use client";
// T031b / FR-059; contracts/server-actions.md §1: lo que la interfaz dice con un resultado desconocido. Nunca afirma que
// no se escribió; ofrece «Reintentar» (la misma carga con la misma clave) y «Comprobar estado» (`write_status`). Se
// anuncia como alerta. Lo usan las escrituras de invitación (PR B) y las de dinero compartido (PR C y D).
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/es";

/** PR C (F57-6): `message` para el texto propio de un deshacer; `onDismiss` cuando el aviso es fijo y se cierra a mano. */
type WriteUnknownProps = { checking: boolean; notFound: boolean; onRetry: () => void; onCheck: () => void; message?: string; onDismiss?: () => void };

export function WriteUnknown({ checking, notFound, onRetry, onCheck, message = copy.writes.unknown, onDismiss }: WriteUnknownProps) {
  return (
    <div role="alert" data-write-unknown="" className="flex flex-col gap-3 rounded-[16px] bg-warning-subtle px-3.5 py-3 text-[0.8125rem] leading-[1.45] font-medium text-ink">
      <span className="flex items-start gap-2.5">
        <AppIcon name="warning" weight="bold" size={20} className="shrink-0 text-warning" />
        <span className="flex min-w-0 flex-col gap-1 text-pretty">
          <span>{message}</span>
          {notFound ? <span className="font-semibold">{copy.writes.notFound}</span> : null}
        </span>
      </span>
      <span className="flex flex-wrap gap-2">
        <Button variant="secondary" icon="arrow-clockwise" onClick={onRetry} disabled={checking}>{copy.writes.retry}</Button>
        <Button variant="ghost" onClick={onCheck} loading={checking} loadingLabel={copy.writes.checking}>{copy.writes.check}</Button>
        {onDismiss ? <Button variant="ghost" icon="x" onClick={onDismiss} disabled={checking}>{copy.writes.dismiss}</Button> : null}
      </span>
    </div>
  );
}
