"use client";
// 004 PR B (T034) / FR-011–FR-013, FR-018, FR-093–FR-095, FR-099; US-2 escenarios 1, 2, 3, 6 y 7; contracts/server-actions.md
// §1–§2; COMPONENT_SPECIFICATIONS «BudgetIndicator», «Conflicto [V]». Hoja por debajo de 768 y diálogo desde 768
// (RESPONSIVE_SPECIFICATIONS, «Sheets y diálogos»), con la × a la derecha, en el mismo árbol (BottomSheet `adaptive`): cruzar
// 768 px con la hoja abierta no pierde lo escrito, el foco ni el cursor. Crear, editar y desactivar con la máquina de
// escritura de la 003 (useWrite):
// - La clave la trae quien abre la hoja (nace al abrirla) y se reusa en cada reintento; el contexto queda fijo al abrirla
//   (FR-099). Solo viajan la categoría, el límite en pesos enteros o `null` para desactivar, y la versión leída (FR-090).
// - `unknown` (red, 15 s, respuesta perdida): campos bloqueados, «Reintentar» (misma clave y carga) y «Comprobar estado»
//   (`write_status`); nunca dice que no se guardó, y cerrar pregunta antes. Nada se guarda en el navegador (FR-094).
// - Conflicto de versión (JT011) o un presupuesto que el otro creó antes (JT219): no se sobrescribe nada. Se pide la página
//   otra vez y, cuando llega, la hoja dice quién lo cambió y el valor vigente; «Revisar» edita sobre esa versión con una
//   clave nueva, porque es otra intención. Decisión de los fundadores del 12 de noviembre de 2026 (T084, 7): cuando llega lo
//   vigente, el campo pasa a ese valor y lo que escribió la persona queda debajo como «Tu cambio: $Y» (también después de
//   «Revisar», como referencia), para decidir sin sobrescribir a ciegas. «Revisar» y el contrato de versión no cambian.
// - Una categoría con un presupuesto desactivado se vuelve a activar editándolo (la clave única es por categoría).
// - Desactivar envía `null`; los gastos y el historial quedan (Q7). Este PR no añade ningún «Deshacer» (FR-095).
import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState, type KeyboardEvent } from "react";
import { AmountInput } from "@/components/ui/amount-input";
import { AppIcon } from "@/components/ui/app-icon";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { categories, CategoryIcon } from "@/components/ui/category-icon";
import { SheetTitle } from "@/components/ui/modal";
import { formatMoney } from "@/domain/money";
import { CATEGORY_CATALOG, type CategoryId } from "@/domain/transactions";
import { ConfirmDialog } from "@/features/expenses/confirm-dialog";
import { useWrite } from "@/features/shared/use-write";
import type { WriteError } from "@/features/shared/write-result";
import { WriteUnknown } from "@/features/shared/write-unknown";
import { copy } from "@/lib/copy/es";
import { monthName, shortDate } from "@/lib/format";
import type { BudgetChange, BudgetWriteAction, PlanActions, PlanContext, PlanRow, SavedBudget } from "./types";

const MAX_PESOS = 999_999_999;
const EXPENSE: readonly CategoryId[] = CATEGORY_CATALOG.filter((category) => category.kind === "expense").map((category) => category.id);
const money = (minor: string) => formatMoney({ amountMinor: BigInt(minor), currency: "COP" });
const pesosOf = (minor: string | null) => (minor === null ? null : Number(BigInt(minor) / 100n));

export type BudgetDone = "created" | "updated" | "deactivated";
type Target = { kind: "create"; categoryId: CategoryId | null } | { kind: "edit"; budgetId: string };
type Payload =
  | { op: "create"; idempotencyKey: string; context: PlanContext; categoryId: CategoryId; limitPesos: string }
  | { op: "update"; idempotencyKey: string; budgetId: string; expectedVersion: number; limitPesos: string | null; reactivate: boolean };
/** `attempted`: el límite en pesos que no se guardó (`null` si era desactivar), para decirlo junto al vigente. */
type Conflict = { kind: "version"; budgetId: string; expected: number; attempted: string | null } | { kind: "exists"; categoryId: CategoryId; attempted: string };

type Props = {
  open: boolean;
  /** `unconfirmed`: se cerró con una escritura sin confirmar (pudo haberse guardado). */
  onClose: (options?: { unconfirmed: boolean }) => void;
  /** El contexto de la pantalla al abrir la hoja; la hoja no lo cambia aunque cambie el selector (FR-099). */
  context: PlanContext;
  /** La fila desde la que se abrió (editar o crear su categoría); `null` para elegir la categoría. */
  row: PlanRow | null;
  /** Las filas vigentes del mes en este contexto: tras un rechazo llegan las nuevas y la hoja las lee. */
  rows: readonly PlanRow[];
  /** `AAAA-MM`, el mes en curso. */
  month: string;
  idempotencyKey: string;
  actions: PlanActions;
  onDone: (done: BudgetDone) => void;
};

function initialTarget(row: PlanRow | null): Target {
  if (row?.budgetId && row.limitMinor !== null) return { kind: "edit", budgetId: row.budgetId };
  return { kind: "create", categoryId: row?.categoryId ?? null };
}

function rejectedMessage(error: WriteError) {
  switch (error) {
    case "invalid": return copy.plan.form.errors.limit;
    case "notFound": return copy.plan.errors.notFound;
    case "coupleNotActive": return copy.couple.errors.notActive;
    case "sessionExpired": return copy.errors.sessionExpired;
    default: return `${copy.plan.sheet.rejected} ${copy.errors.unexpected}`;
  }
}

function historyValue(change: BudgetChange) {
  const values = copy.plan.sheet.historyValue;
  switch (change.kind) {
    case "create": return values.create(money(change.limitMinor!));
    case "reactivate": return values.reactivate(money(change.limitMinor!));
    case "deactivate": return values.deactivate(money(change.previousLimitMinor!));
    default: return values.change(money(change.previousLimitMinor!), money(change.limitMinor!));
  }
}

const COLUMNS = 3;
/** Las categorías que se pueden elegir al crear: grupo de radio con las flechas, como la rejilla de Anotar (comp 06, 1c). */
function CategoryChoice({ ids, value, disabled, onSelect }: { ids: readonly CategoryId[]; value: CategoryId | null; disabled: boolean; onSelect: (id: CategoryId) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const stop = Math.max(0, ids.findIndex((id) => id === value));
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = ids.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowRight": next = index === last ? 0 : index + 1; break;
      case "ArrowLeft": next = index === 0 ? last : index - 1; break;
      case "ArrowDown": next = index + COLUMNS <= last ? index + COLUMNS : index; break;
      case "ArrowUp": next = index - COLUMNS >= 0 ? index - COLUMNS : index; break;
      case "Home": next = 0; break;
      case "End": next = last; break;
      default: return;
    }
    event.preventDefault();
    onSelect(ids[next]);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={copy.plan.sheet.category} className="grid auto-rows-[64px] grid-cols-3 gap-2">
      {ids.map((id, index) => {
        const [bg, fg] = categories[id].tone.split(" ");
        return (
          <button
            key={id}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            role="radio"
            aria-checked={value === id}
            tabIndex={index === stop ? 0 : -1}
            disabled={disabled}
            data-category-choice=""
            onClick={() => onSelect(id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] px-1 py-1.5 text-center text-[0.75rem] leading-[1.15] font-semibold text-ink [hyphens:auto] [overflow-wrap:anywhere] disabled:cursor-not-allowed disabled:opacity-60 ${bg} ${value === id ? "shadow-[0_0_0_2px_var(--color-text-primary)]" : ""}`}
          >
            <AppIcon name={categories[id].icon} weight="duotone" size={22} className={fg} />
            <span>{copy.categories[id]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function BudgetSheet({ open, onClose, context, row, rows, month, idempotencyKey, actions, onDone }: Props) {
  const router = useRouter();
  const [target, setTarget] = useState<Target>(() => initialTarget(row));
  const editing = target.kind === "edit" ? rows.find((item) => item.budgetId === target.budgetId) ?? (row?.budgetId === target.budgetId ? row : null) : null;
  const [base, setBase] = useState<number | null>(() => (target.kind === "edit" ? editing?.version ?? null : null));
  const [limit, setLimit] = useState<number | null>(() => (target.kind === "edit" ? pesosOf(editing?.limitMinor ?? null) : null));
  const [key, setKey] = useState(idempotencyKey);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  /** T084 (7): el límite en pesos que la persona intentó guardar y perdió por un conflicto. */
  const [yours, setYours] = useState<string | null>(null);
  const [shownFresh, setShownFresh] = useState<string | null>(null);
  const errorId = `${useId()}-error`;
  const op = useRef<BudgetWriteAction>("create_budget");

  const chosen = target.kind === "create" ? target.categoryId : editing?.categoryId ?? null;
  const chosenRow = chosen ? rows.find((item) => item.categoryId === chosen) ?? null : null;
  // Al crear se ofrecen las categorías de gasto sin presupuesto vigente (Q8: nunca Ingresos; §7.3: uno por clave).
  const available = EXPENSE.filter((id) => !rows.some((item) => item.categoryId === id && item.limitMinor !== null));

  const run = useCallback((payload: Payload) => {
    op.current = payload.op === "create" ? "create_budget" : "update_budget";
    return payload.op === "create"
      ? actions.create({ idempotencyKey: payload.idempotencyKey, context: payload.context, categoryId: payload.categoryId, limitPesos: payload.limitPesos })
      : actions.update({ idempotencyKey: payload.idempotencyKey, budgetId: payload.budgetId, expectedVersion: payload.expectedVersion, limitPesos: payload.limitPesos });
  }, [actions]);
  // «Comprobar estado» pregunta por la acción de la última intención (crear o editar), con su clave.
  const check = useCallback((input: { idempotencyKey: string }) => actions.check({ action: op.current, idempotencyKey: input.idempotencyKey }), [actions]);
  const onOk = useCallback((_saved: SavedBudget, payload: Payload) => {
    onDone(payload.op === "create" || payload.reactivate ? "created" : payload.limitPesos === null ? "deactivated" : "updated");
  }, [onDone]);
  const onRejected = useCallback((error: WriteError, payload: Payload) => {
    if (error === "versionConflict" && payload.op === "update") { setConflict({ kind: "version", budgetId: payload.budgetId, expected: payload.expectedVersion, attempted: payload.limitPesos }); setYours(payload.limitPesos); router.refresh(); }
    else if (error === "budgetExists" && payload.op === "create") { setConflict({ kind: "exists", categoryId: payload.categoryId, attempted: payload.limitPesos }); setYours(payload.limitPesos); router.refresh(); }
    else if (error === "notFound") router.refresh();
  }, [router]);
  const write = useWrite<Payload, SavedBudget>({ action: "create_budget", run, check, onOk, onRejected });
  const locked = write.locked || write.pending;

  // Un presupuesto desactivado de esta categoría (al crear desde su fila o al elegirla) se reactiva editándolo.
  const reactivating = target.kind === "create" && chosenRow?.budgetId && chosenRow.limitMinor === null ? chosenRow : null;

  const submit = (deactivate = false) => {
    // Con un conflicto a la vista solo se sigue por «Revisar»: nunca otra escritura sobre la versión vieja.
    if (conflict) return;
    if (deactivate && target.kind === "edit" && editing?.budgetId && base !== null) {
      setInvalid(null);
      void write.submit({ op: "update", idempotencyKey: key, budgetId: editing.budgetId, expectedVersion: base, limitPesos: null, reactivate: false });
      return;
    }
    if (!chosen || limit === null || limit <= 0 || limit > MAX_PESOS) { setInvalid(copy.plan.form.errors.limit); return; }
    setInvalid(null);
    const limitPesos = String(limit);
    if (target.kind === "edit") {
      if (!editing?.budgetId || base === null) return;
      if (editing.limitMinor !== null && pesosOf(editing.limitMinor) === limit && editing.version === base) { onClose(); return; }
      void write.submit({ op: "update", idempotencyKey: key, budgetId: editing.budgetId, expectedVersion: base, limitPesos, reactivate: editing.limitMinor === null });
    } else if (reactivating?.budgetId && reactivating.version !== null) {
      void write.submit({ op: "update", idempotencyKey: key, budgetId: reactivating.budgetId, expectedVersion: reactivating.version, limitPesos, reactivate: true });
    } else {
      void write.submit({ op: "create", idempotencyKey: key, context, categoryId: chosen, limitPesos });
    }
  };

  // «Revisar»: otra intención sobre lo vigente, con una clave nueva y la versión que acaba de llegar.
  const review = (fresh: PlanRow) => {
    setTarget({ kind: "edit", budgetId: fresh.budgetId! });
    setBase(fresh.version);
    setLimit(pesosOf(fresh.limitMinor));
    setKey(crypto.randomUUID());
    setConflict(null);
    setInvalid(null);
    write.reset();
  };

  // Lo que el servidor devolvió tras el rechazo; mientras no llegue, no se inventa quién ni cuánto. Un presupuesto que el
  // otro creó y ya desactivó también cuenta: se dice que ahora no tiene presupuesto (revisión del gestor del PR #67, 2).
  const fresh = conflict?.kind === "version"
    ? rows.find((item) => item.budgetId === conflict.budgetId && item.version !== null && item.version !== conflict.expected) ?? null
    : conflict?.kind === "exists" ? rows.find((item) => item.categoryId === conflict.categoryId && item.budgetId) ?? null : null;
  // T084 (7): en cuanto llega lo vigente, el campo lo muestra (una vez por versión vigente; ajuste durante el render, sin efecto).
  const freshKey = fresh ? `${fresh.budgetId}:${fresh.version}:${fresh.limitMinor}` : null;
  if (freshKey !== shownFresh) {
    setShownFresh(freshKey);
    if (fresh) setLimit(pesosOf(fresh.limitMinor));
  }
  const author = fresh ? (conflict?.kind === "exists" ? fresh.history.at(-1) : fresh.history[0]) : undefined;
  // Si el cambio que ganó es de quien mira (otra pestaña u otro dispositivo), se dice en primera persona (PR #67, 3).
  const conflictTitle = !conflict ? "" : author?.byMe
    ? (conflict.kind === "version" ? copy.plan.errors.versionConflictMe : copy.plan.errors.alreadyExistsMe)
    : conflict.kind === "version" ? copy.plan.errors.versionConflict(author?.byName ?? "") : copy.plan.errors.alreadyExists(author?.byName ?? "");

  const requestClose = (next: boolean) => {
    if (next || write.state.phase === "pending") return;
    if (write.locked) { setConfirmingClose(true); return; }
    onClose();
  };


  const message = invalid ?? (write.state.phase === "rejected" && !conflict ? rejectedMessage(write.state.error) : null);
  const title = target.kind === "edit" ? copy.plan.sheet.editTitle : copy.plan.sheet.createTitle;
  const consumed = chosenRow && BigInt(chosenRow.consumedMinor) > 0n ? chosenRow.consumedMinor : null;
  const body = (
    <form noValidate onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex flex-col gap-4">
      <div className="@container/sheethead grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 [&>:last-child]:col-start-3">
        <span />
        <SheetTitle>{title}</SheetTitle>
        <button type="button" onClick={() => requestClose(false)} aria-label={copy.annotate.close} className="grid size-11 place-items-center rounded-[13px] bg-raised text-ink shadow-raised hover:bg-sunken">
          <AppIcon name="x" weight="bold" size={16} />
        </button>
      </div>
      <p className="-mt-2 flex items-center justify-center gap-1.5 text-center text-[0.75rem] font-medium text-ink-secondary">
        <AppIcon name={context === "us" ? "users-three" : "lock-simple"} weight="bold" size={13} />
        {copy.plan.sheet.context[context]}
      </p>
      {target.kind === "create" && !row ? (
        <CategoryChoice ids={available} value={target.categoryId} disabled={locked || conflict !== null} onSelect={(id) => { if (conflict) return; setTarget({ kind: "create", categoryId: id }); setInvalid(null); }} />
      ) : chosen ? (
        <p className="flex items-center gap-2.5 text-[length:var(--body-l-size)] font-semibold text-ink">
          <CategoryIcon kind="category" category={chosen} size="md" />
          {copy.categories[chosen]}
        </p>
      ) : null}
      <AmountInput
        label={copy.plan.sheet.limit}
        value={limit}
        onValueChange={(next) => { setLimit(next); setInvalid(null); }}
        disabled={locked || conflict !== null}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={message ? errorId : undefined}
        // T084 (7): la ayuda del campo, enlazada por el primitivo. Mientras se revisa lo vigente («Revisando…») no se dice nada:
        // el campo todavía tiene lo que escribió la persona.
        help={yours !== null && (fresh || !conflict) ? copy.plan.sheet.yourChange(formatMoney({ amountMinor: BigInt(yours) * 100n, currency: "COP" })) : undefined}
        className="w-full"
        fieldClassName="w-full"
      />
      <div className="flex flex-col gap-1 text-[0.75rem] leading-[1.5] text-pretty text-ink-secondary">
        {consumed ? <p>{copy.plan.sheet.thisMonth(money(consumed), monthName(month))}</p> : null}
        <p>{copy.plan.sheet.rule(monthName(month))}</p>
      </div>
      {conflict ? (
        <div role="alert" className="flex flex-col gap-2.5 rounded-[16px] bg-warning-subtle px-3.5 py-3 text-[0.8125rem] leading-[1.45] font-medium text-ink">
          {fresh ? (
            <>
              <span className="flex items-start gap-2.5">
                <AppIcon name="warning" weight="bold" size={18} className="mt-px shrink-0 text-warning" />
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold">{conflictTitle}</span>
                  {/* Un cambio de límite se ve junto al campo («Tu cambio: $Y»); una desactivación no tiene cifra y se dice aquí. */}
                  {conflict.attempted === null ? <span>{copy.plan.sheet.notSavedOff}</span> : null}
                  <span>{fresh.limitMinor === null ? copy.plan.sheet.currentOff : copy.plan.sheet.current(money(fresh.limitMinor))}</span>
                </span>
              </span>
              <Button variant="secondary" icon="arrow-clockwise" className="self-start" onClick={() => review(fresh)}>{copy.plan.sheet.review}</Button>
            </>
          ) : (
            <>
              <span aria-busy="true" className="flex items-center gap-2.5">
                <AppIcon name="circle-notch" weight="bold" size={18} className="shrink-0 motion-safe:animate-spin" />
                {copy.plan.sheet.checkingLatest}
              </span>
              {/* Si el refresco no trae nada (falló la red o la respuesta), siempre hay salida: pedir lo vigente otra vez. */}
              <Button variant="secondary" icon="arrow-clockwise" className="self-start" onClick={() => router.refresh()}>{copy.plan.sheet.reload}</Button>
            </>
          )}
        </div>
      ) : null}
      {message ? (
        <p id={errorId} role="alert" className="flex items-start gap-2 rounded-[14px] bg-danger-subtle px-3 py-2.5 text-[0.8125rem] font-medium text-ink">
          <AppIcon name="warning-circle" weight="bold" size={18} className="mt-px shrink-0 text-danger" />
          {message}
        </p>
      ) : null}
      {write.state.phase === "unknown" ? (
        <WriteUnknown checking={write.state.checking} notFound={write.state.notFound} onRetry={() => void write.retry()} onCheck={() => void write.checkStatus()} />
      ) : conflict ? null : (
        <div className="flex flex-col gap-2.5">
          <Button type="submit" size="lg" icon="check" className="w-full" loading={write.pending} loadingLabel={copy.plan.sheet.saving}>
            {target.kind === "edit" ? copy.plan.sheet.saveChanges : copy.plan.sheet.save}
          </Button>
          {target.kind === "edit" && editing?.limitMinor !== null ? (
            <>
              <Button variant="ghost" className="w-full" disabled={locked} onClick={() => submit(true)}>{copy.plan.sheet.deactivate}</Button>
              <p className="text-center text-[0.75rem] leading-[1.5] text-pretty text-ink-secondary">{copy.plan.sheet.deactivateNote}</p>
            </>
          ) : null}
        </div>
      )}
      {target.kind === "edit" && editing && editing.history.length > 0 ? (
        <section className="flex flex-col gap-2 border-t-[length:var(--border-hairline)] border-border pt-4">
          <h3 id={`${errorId}-history`} className="text-[0.75rem] font-semibold tracking-[var(--overline-tracking)] text-ink-secondary uppercase">{copy.plan.sheet.history}</h3>
          <ul aria-labelledby={`${errorId}-history`} className="flex flex-col">
            {editing.history.map((change) => (
              <li key={change.id} className="flex items-baseline justify-between gap-3 py-1.5 text-[0.8125rem] leading-[1.4]">
                <span className="font-medium text-ink">{historyValue(change)}</span>
                <span className="shrink-0 text-ink-secondary">{context === "me" ? copy.plan.sheet.historyByMe(shortDate(change.date)) : copy.plan.sheet.historyBy(change.byName, shortDate(change.date))}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <ConfirmDialog
        open={confirmingClose}
        onOpenChange={setConfirmingClose}
        title={copy.writes.close.title}
        description={copy.plan.sheet.closeUnconfirmed}
        cancel={(ref) => <Button ref={ref} variant="ghost" icon="arrow-clockwise" onClick={() => { setConfirmingClose(false); void write.retry(); }}>{copy.writes.retry}</Button>}
        confirm={<Button variant="secondary" onClick={() => { setConfirmingClose(false); onClose({ unconfirmed: true }); }}>{copy.writes.close.confirm}</Button>}
      />
    </form>
  );
  // Foco inicial: el límite si la categoría ya está; si hay que elegirla, la rejilla. Por el DOM del diálogo: AmountInput
  // usa su propia ref para el cursor.
  const focusFirst = (event: Event) => {
    event.preventDefault();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    (target.kind === "create" && !row ? dialog?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]') : dialog?.querySelector<HTMLElement>('input[inputmode="numeric"]'))?.focus();
  };
  return <BottomSheet open={open} onOpenChange={requestClose} title={title} onOpenAutoFocus={focusFirst} bare adaptive>{body}</BottomSheet>;
}
