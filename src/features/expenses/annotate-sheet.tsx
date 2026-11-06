"use client";
// T081, T082 / FR-030–FR-036, FR-038; US-2.1–2.7, US-3.1, US-4.1, US-4.2, US-4.5; 02·5 y 02·6 (Anotar gasto · Flujo) en
// su versión privada (Q2): sin «Pagó», «Participan» ni «Reparto», con el contexto fijo en Yo. Arriba, el selector
// «Gasto · Ingreso» (Q3, propuesta §15.9 que se aprueba viendo la pantalla). La misma hoja edita un movimiento con la
// `version` leída y sin poder cambiar su tipo (Q14, T082).
//   E1  monto + categoría reciente; Guardar se habilita con los dos (2 toques más el monto).
//   E2  detalles: descripción, fecha y todas las categorías; el contexto se muestra y no se cambia.
//   E3  validación de P0-1: monto entre $1 y $999.999.999, fecha válida, descripción de hasta 140.
//   E4  «Guardando…» con los campos bloqueados, sin promesa offline.
//   E5  lo hace el proveedor al recibir `onSaved`: cierra, resalta la fila y muestra el Toast con «Deshacer».
// Un fallo deja la hoja abierta con lo escrito y un aviso con su propio botón «Reintentar», que reusa la clave de esta
// apertura (FR-036). Decisión del fundador (5 nov 2026, revisión del PR D): tras un fallo ambiguo (red, guardado fallido
// o inesperado) el primer intento pudo llegar al servidor, así que los campos quedan bloqueados para esa apertura: solo
// se reintenta lo mismo con la misma clave, o se cierra. Nunca viaja otra intención con esa clave (JT008). Hoja por debajo de 768 px y diálogo de 520 desde 768 (RESPONSIVE_SPECIFICATIONS.md).
import { useCallback, useId, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { AmountInput } from "@/components/ui/amount-input";
import { AppIcon } from "@/components/ui/app-icon";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { categories } from "@/components/ui/category-icon";
import { Input } from "@/components/ui/input";
import { DialogTitle, Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { Toast } from "@/components/ui/toast";
import { formatMoney, moneyFromPesos } from "@/domain/money";
import { CATEGORY_CATALOG, fillRecentCategories, validateDraft, type CategoryId, type TransactionType } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import { dayLabel } from "@/lib/format";
import { ConfirmDialog } from "./confirm-dialog";
import type { SheetMode } from "./annotate-provider";
import { normalizeDescription, toPayloadPesos } from "./payload";
import { isAmbiguousError, type ActionResult, type ExpenseActionError, type ExpenseActions, type PendingRow, type SavedTransaction } from "./types";

const WIDE = "(min-width: 768px)";
function subscribeWide(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(WIDE);
  query.addEventListener?.("change", onChange);
  return () => query.removeEventListener?.("change", onChange);
}
const readWide = () => typeof window.matchMedia === "function" && window.matchMedia(WIDE).matches;

const MAX_PESOS = 999_999_999;
const pesosOf = (amountMinor: string) => Number(BigInt(amountMinor) / 100n);
const expenseCategories = CATEGORY_CATALOG.filter(({ kind }) => kind === "expense").map(({ id }) => id);
// Área táctil de 44 sin cambiar la geometría visible (F17-2): el ::after cubre la caja completa.
const hit = "relative after:absolute after:-inset-[2px] after:content-['']";

type Draft = { type: TransactionType; amount: number | null; categoryId: CategoryId | null; date: string; description: string };
type Status = { kind: "idle" } | { kind: "saving" } | { kind: "error"; error: ExpenseActionError };

type AnnotateSheetProps = {
  open: boolean;
  mode: SheetMode;
  idempotencyKey: string;
  recent: readonly CategoryId[];
  today: string;
  actions: Pick<ExpenseActions, "create" | "update">;
  onClose: () => void;
  onSaved: (saved: SavedTransaction, kind: SheetMode["kind"]) => void;
  /** UX lote 1, cambio 3: la creación viaja por el proveedor, que oculta la hoja y enseña la fila al instante. */
  onTrack: (row: PendingRow, run: () => Promise<ActionResult<SavedTransaction>>) => Promise<ActionResult<SavedTransaction>>;
  onAbandon: (key: string) => void;
  returnFocusTo: { current: HTMLElement | null };
};

/** Monto entre $1 y $999.999.999, categoría elegida y lo demás válido para el dominio (E1, E3). */
function isComplete({ type, amount, categoryId, date, description }: Draft) {
  return amount !== null && amount > 0 && amount <= MAX_PESOS && categoryId !== null
    && validateDraft({ type, amount: moneyFromPesos(BigInt(amount)), categoryId, transactionDate: date, description: normalizeDescription(description) }).length === 0;
}

function initialDraft(mode: SheetMode, today: string): Draft {
  if (mode.kind === "edit") {
    const { transaction } = mode;
    return { type: transaction.type, amount: pesosOf(transaction.amountMinor), categoryId: transaction.categoryId, date: transaction.transactionDate, description: transaction.description ?? "" };
  }
  return { type: "expense", amount: null, categoryId: null, date: today, description: "" };
}

function CategoryChip({ id, selected, onSelect, onEnter }: { id: CategoryId; selected: boolean; onSelect: (id: CategoryId) => void; onEnter: (id: CategoryId) => void }) {
  const [bg, fg] = categories[id].tone.split(" ");
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      // FR-035: Enter guarda también con el foco en una categoría (la elige y guarda); Espacio solo la elige.
      onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => { if (event.key === "Enter") { event.preventDefault(); onEnter(id); } }}
      // 02·5: ficha de 40 con radio 14, el fondo de su categoría y el pictograma en una placa clara; elegida, anillo de
      // 2 px en tinta. Deshabilitada (E4) baja su opacidad.
      className={`${hit} flex h-10 shrink-0 items-center gap-[7px] rounded-[14px] pr-3 pl-[5px] text-[13px] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60 ${bg} ${selected ? "shadow-[0_0_0_2px_var(--color-text-primary)]" : ""}`}
    >
      <span aria-hidden="true" className="grid size-[30px] place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--color-surface-overlay)_55%,transparent)]">
        <AppIcon name={categories[id].icon} weight="duotone" size={17} className={fg} />
      </span>
      {copy.categories[id]}
    </button>
  );
}

/** UX lote 1, cambio 2: el último chip de la fila rápida abre los detalles con todas las categorías y la nota. En móvil la
 *  fila se desplaza; el chip queda fijo al borde derecho (sticky) para que «Más…» siempre se vea (hallazgo de las capturas). */
function MoreChip({ onClick }: { onClick: () => void }) {
  return (
    <span className="sticky right-0 z-[1] flex shrink-0 bg-overlay pl-2 md:static md:pl-0">
      <button
        type="button"
        aria-expanded={false}
        aria-label={copy.annotate.moreLabel}
        onClick={onClick}
        className={`${hit} flex h-10 shrink-0 items-center rounded-[14px] bg-sunken px-3.5 text-[13px] font-semibold text-ink shadow-[0_0_0_1.5px_var(--color-border-subtle)] disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span aria-hidden="true">{copy.annotate.more}</span>
      </button>
    </span>
  );
}

function SummaryChip({ icon, children, onClick }: { icon: "calendar-blank" | "lock-simple"; children: ReactNode; onClick?: () => void }) {
  const look = "flex h-[34px] items-center gap-1.5 rounded-[11px] bg-sunken px-[11px] text-[13px] font-semibold text-ink";
  const content = <><AppIcon name={icon} size={15} className="text-ink-secondary" />{children}</>;
  return onClick ? <button type="button" onClick={onClick} className={`${hit} ${look} disabled:cursor-not-allowed`}>{content}</button> : <span className={look}>{content}</span>;
}

export default function AnnotateSheet({ open, mode, idempotencyKey, recent, today, actions, onClose, onSaved, onTrack, onAbandon, returnFocusTo }: AnnotateSheetProps) {
  const wide = useSyncExternalStore(subscribeWide, readWide, () => false);
  const editing = mode.kind === "edit";
  const [initial] = useState(() => initialDraft(mode, today));
  const [draft, setDraft] = useState<Draft>(initial);
  const [details, setDetails] = useState(editing);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [confirming, setConfirming] = useState(false);
  // Bloqueo tras un fallo ambiguo: dura lo que dura esta apertura de la hoja.
  const [locked, setLocked] = useState(false);
  const saving = useRef(false);
  const amountId = `${useId()}-amount`;
  const dateId = `${useId()}-date`;

  const { type, amount, categoryId, date, description } = draft;
  const isSaving = status.kind === "saving";
  const isDirty = useCallback((value: Draft) => (Object.keys(initial) as (keyof Draft)[]).some((key) => initial[key] !== value[key]), [initial]);
  const dirty = isDirty(draft);
  const amountInvalid = amount === 0;
  const dateInvalid = !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date);
  const descriptionTooLong = [...description.trim()].length > 140;
  const canSave = isComplete(draft) && (!editing || dirty);

  const update = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    // Lo escrito después de un error lo deja atrás; el siguiente Guardar es el reintento con la misma clave.
    setStatus((current) => (current.kind === "error" ? { kind: "idle" } : current));
  };
  const setType = (next: TransactionType) => {
    if (next === type) return;
    update({ type: next, categoryId: next === "income" ? "income" : null });
  };

  // `patch`: Enter en una categoría guarda con la elección recién hecha, sin esperar a que el estado la refleje.
  const save = useCallback(async (patch: Partial<Draft> = {}) => {
    const value = { ...draft, ...patch };
    if (saving.current || !isComplete(value) || (editing && !isDirty(value)) || value.amount === null || value.categoryId === null) return;
    saving.current = true;
    setStatus({ kind: "saving" });
    const common = { idempotencyKey, amountPesos: toPayloadPesos(value.amount), categoryId: value.categoryId, transactionDate: value.date, description: normalizeDescription(value.description) };
    let result;
    try {
      if (mode.kind === "edit") result = await actions.update({ ...common, transactionId: mode.transaction.id, expectedVersion: mode.transaction.version });
      else {
        // Se guarda por el proveedor: oculta la hoja y la fila aparece ya; si falla, la hoja vuelve con esto mismo.
        const now = new Date().toISOString();
        const row: PendingRow = {
          key: idempotencyKey,
          state: "saving",
          transaction: {
            id: `pending:${idempotencyKey}`, type: value.type, amount: moneyFromPesos(BigInt(value.amount)), categoryId: value.categoryId,
            transactionDate: value.date, description: common.description, status: "active", version: 1, createdAt: now, updatedAt: now,
          },
        };
        result = await onTrack(row, () => actions.create({ ...common, type: value.type }));
      }
    } catch {
      // La Server Action no llegó al servidor o su respuesta no volvió: se ofrece reintentar con la misma clave.
      result = { ok: false as const, error: "network" as const };
    }
    saving.current = false;
    if (result.ok) {
      setStatus({ kind: "idle" });
      onSaved(result.value, mode.kind);
    } else {
      if (isAmbiguousError(result.error)) setLocked(true);
      setStatus({ kind: "error", error: result.error });
    }
  }, [actions, draft, editing, idempotencyKey, isDirty, mode, onSaved, onTrack]);

  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void save(); };

  // Escape, la ×, el scrim y el arrastre pasan por aquí: con cambios sin guardar se confirma antes de descartar.
  const requestClose = (next: boolean) => {
    if (next || saving.current) return;
    if (dirty || locked) setConfirming(true);
    else onClose();
  };

  const onOpenAutoFocus = (event: Event) => {
    event.preventDefault();
    document.getElementById(amountId)?.focus();
  };
  const onCloseAutoFocus = (event: Event) => {
    const target = returnFocusTo.current;
    if (target && target.isConnected && target !== document.body) {
      event.preventDefault();
      target.focus();
    }
  };

  const title = editing ? copy.annotate.editTitle[type] : copy.annotate.title[type];
  const choices = type === "income"
    ? (["income"] as CategoryId[])
    : details ? expenseCategories : (() => {
      const list = fillRecentCategories(recent);
      return categoryId && !list.includes(categoryId) ? [categoryId, ...list.slice(0, 4)] : list;
    })();
  const saveLabel = editing ? copy.annotate.saveChanges
    : amount && amount > 0 ? copy.annotate.saveWithAmount(copy.annotate.save[type], formatMoney(moneyFromPesos(BigInt(amount)))) : copy.annotate.save[type];

  const errorNotice = status.kind === "error" ? (() => {
    const retry = { label: copy.annotate.retry, onAction: () => void save() };
    switch (status.error) {
      case "sessionExpired":
        return (
          <Toast tone="error" message={<>
            {copy.errors.sessionExpired}{" "}
            {/* En otra pestaña: entrar de nuevo no se lleva lo escrito en esta hoja (spec, caso límite). */}
            <a href={`/entrar?volver=${encodeURIComponent(typeof window === "undefined" ? "/" : window.location.pathname)}`} target="_blank" rel="noopener" className="font-semibold underline underline-offset-2">{copy.account.signInAgain}</a>
          </>} />
        );
      case "versionConflict":
        return mode.kind === "edit"
          ? <Toast tone="error" message={copy.transaction.errors.versionConflict} action={{ label: copy.annotate.reload, onAction: () => { onClose(); mode.onReload(); } }} />
          : <Toast tone="error" message={copy.errors.unexpected} action={retry} />;
      case "alreadyDeleted": return <Toast tone="error" message={copy.transaction.errors.alreadyDeleted} />;
      case "notFound": return <Toast tone="error" message={copy.transaction.errors.notFound} />;
      case "network": return <Toast tone="error" message={copy.errors.network} action={retry} />;
      case "saveFailed": return <Toast tone="error" message={copy.errors.saveFailed} action={retry} />;
      default: return <Toast tone="error" message={copy.errors.unexpected} action={retry} />;
    }
  })() : null;

  const body = (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3.5">
      {/* 02·5 con la × a la DERECHA: decisión de los fundadores (UX lote 1) que sustituye a la comp 02·5, que la ponía a la
          izquierda. Título serif al centro; la columna izquierda equilibra el encabezado. */}
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
        <span />
        <DialogTitle className="text-center font-serif text-[23px] leading-[1.04] font-medium tracking-[-0.015em] text-balance">{title}</DialogTitle>
        <button
          type="button"
          onClick={() => requestClose(false)}
          aria-label={copy.annotate.close}
          className="grid size-11 place-items-center rounded-[13px] bg-raised text-ink shadow-raised hover:bg-sunken"
        >
          <AppIcon name="x" weight="bold" size={16} />
        </button>
      </div>
      <fieldset disabled={isSaving || locked} data-locked={locked ? "" : undefined} className="flex min-w-0 flex-col gap-3.5">
        {editing ? null : (
          <Segmented<TransactionType>
            role="radiogroup"
            label={copy.annotate.type}
            stretch
            value={type}
            onValueChange={setType}
            options={[{ value: "expense", label: copy.annotate.expense }, { value: "income", label: copy.annotate.income }]}
          />
        )}
        <AmountInput
          id={amountId}
          label={copy.annotate.amount}
          value={amount}
          onValueChange={(value) => update({ amount: value })}
          error={amountInvalid ? copy.annotate.errors.amountOutOfRange : undefined}
          enterKeyHint="done"
          // 02·5: «$» y la cifra centrados juntos, en grande, sin el marco hundido. El marco sigue a todo el ancho (el
          // clamp del tamaño mide su contenedor) y el <input> toma el ancho de lo escrito (field-sizing). Hallazgo de la
          // primera corrida de evidencia: centrar los hijos del <label> encogía el marco y el monto no se veía.
          className="text-center"
          fieldClassName="!bg-transparent !shadow-none justify-center"
          inputClassName="flex-none max-w-full min-w-[3ch] [field-sizing:content] text-center !text-[length:clamp(30px,calc(100cqi/(var(--amount-chars)*0.68+0.75)),48px)] tracking-[-0.04em]"
        />
        <div role="group" aria-label={details || type === "income" ? copy.annotate.category : copy.annotate.recent} className={details ? "flex flex-wrap gap-2" : `-mx-5 flex gap-2 px-5 py-0.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 ${isSaving || locked ? "overflow-hidden" : "overflow-x-auto"}`}>
          {/* Bloqueada (E4 o tras un fallo ambiguo), la fila deja de desplazarse: sin fichas enfocables, una región con
              scroll quedaría fuera del teclado (axe, scrollable-region-focusable). */}
          {choices.map((id) => <CategoryChip key={id} id={id} selected={categoryId === id} onSelect={(next) => update({ categoryId: next })} onEnter={(next) => { update({ categoryId: next }); void save({ categoryId: next }); }} />)}
          {details || type === "income" ? null : <MoreChip onClick={() => setDetails(true)} />}
        </div>
        {details ? (
          <div className="flex flex-col gap-3.5">
            <Input
              label={copy.annotate.description}
              placeholder={copy.annotate.descriptionPlaceholder}
              value={description}
              maxLength={200}
              autoComplete="off"
              enterKeyHint="done"
              onChange={(event) => update({ description: event.target.value })}
              error={descriptionTooLong ? copy.annotate.errors.descriptionTooLong : undefined}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <Input
                id={dateId}
                type="date"
                label={copy.annotate.date}
                value={date}
                required
                onChange={(event) => update({ date: event.target.value })}
                error={dateInvalid ? copy.annotate.errors.date : undefined}
              />
              {/* Q2: en P0-1 el contexto es siempre Yo. Se dice, no se elige. */}
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[length:var(--label-s-size)] leading-[var(--label-s-line)] font-medium text-ink-secondary">{copy.annotate.context}</span>
                <span className="flex min-h-12 items-center gap-2 rounded-[var(--radius-md)] border-[1.5px] border-dashed border-border px-[14px] text-[length:var(--body-m-size)] font-medium text-ink">
                  <AppIcon name="lock-simple" size={16} className="shrink-0 text-ink-secondary" />
                  <span className="min-w-0 truncate">{copy.annotate.contextValue}</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          // E1: el resumen editable (02·5) sin pagador ni reparto. La fecha abre los detalles.
          <div className="flex flex-wrap items-center gap-1.5">
            <SummaryChip icon="calendar-blank" onClick={() => { setDetails(true); requestAnimationFrame(() => document.getElementById(dateId)?.focus()); }}>{dayLabel(date, today)}</SummaryChip>
            <SummaryChip icon="lock-simple">{copy.annotate.onlyYou}</SummaryChip>
            <button type="button" aria-expanded={false} onClick={() => setDetails(true)} className="flex min-h-11 items-center px-1.5 text-[13px] font-semibold text-ink underline underline-offset-4">
              {copy.annotate.details}
            </button>
          </div>
        )}
      </fieldset>
      {errorNotice}
      <Button type="submit" size="lg" icon="check" loading={isSaving} loadingLabel={copy.annotate.saving} disabled={!canSave} className="w-full">
        {saveLabel}
      </Button>
      {/* F45-1 (revisión del PR #45): tras un fallo ambiguo el primer intento pudo guardarse, así que cerrar no puede
          decir «no se guardará». Se ofrece reintentar lo mismo con la misma clave (la opción segura, con el foco) o
          cerrar, y se pide revisar Actividad antes de volver a anotarlo. */}
      {locked ? (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={copy.annotate.uncertain.title}
          description={copy.annotate.uncertain.description}
          cancel={(ref) => <Button ref={ref} variant="ghost" icon="arrow-clockwise" onClick={() => { setConfirming(false); void save(); }}>{copy.annotate.uncertain.retry}</Button>}
          confirm={<Button variant="secondary" onClick={() => { setConfirming(false); onAbandon(idempotencyKey); onClose(); }}>{copy.annotate.uncertain.close}</Button>}
        />
      ) : (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={editing ? copy.annotate.discard.edit : copy.annotate.discard[type]}
          description={copy.annotate.discard.description}
          cancel={(ref) => <Button ref={ref} variant="ghost" onClick={() => setConfirming(false)}>{copy.annotate.discard.keep}</Button>}
          confirm={<Button variant="danger" onClick={() => { setConfirming(false); onClose(); }}>{copy.annotate.discard.confirm}</Button>}
        />
      )}
    </form>
  );

  const props = { open, onOpenChange: requestClose, title, onOpenAutoFocus, onCloseAutoFocus, bare: true };
  return wide ? <Modal {...props}>{body}</Modal> : <BottomSheet {...props} draggable expanded={details}>{body}</BottomSheet>;
}
