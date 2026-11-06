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
import { useCallback, useId, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import { AmountInput } from "@/components/ui/amount-input";
import { AppIcon } from "@/components/ui/app-icon";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { categories } from "@/components/ui/category-icon";
import { DialogTitle, Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { Toast } from "@/components/ui/toast";
import { formatMoney, moneyFromPesos } from "@/domain/money";
import { CATEGORY_CATALOG, validateDraft, type CategoryId, type TransactionType } from "@/domain/transactions";
import { copy } from "@/lib/copy/es";
import { dayLabel } from "@/lib/format";
import { ConfirmDialog } from "./confirm-dialog";
import type { SheetMode } from "./annotate-provider";
import { normalizeDescription, toPayloadPesos } from "./payload";
import { isAmbiguousError, type ActionResult, type ExpenseActionError, type ExpenseActions, type PendingRow, type SavedTransaction } from "./types";
import { rowFromPayload } from "./unconfirmed";

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

type Draft = { type: TransactionType; amount: number | null; categoryId: CategoryId | null; date: string; description: string };
type Status = { kind: "idle" } | { kind: "saving" } | { kind: "error"; error: ExpenseActionError };

type AnnotateSheetProps = {
  open: boolean;
  mode: SheetMode;
  idempotencyKey: string;
  today: string;
  actions: Pick<ExpenseActions, "create" | "update">;
  onClose: () => void;
  onSaved: (saved: SavedTransaction, kind: SheetMode["kind"]) => void;
  /** UX lote 1, cambio 3: la creación viaja por el proveedor, que oculta la hoja y enseña la fila al instante. */
  onTrack: (row: PendingRow, run: () => Promise<ActionResult<SavedTransaction>>) => Promise<ActionResult<SavedTransaction>>;
  /** Cerrar la confirmación incierta no suelta la intención: el proveedor sigue reconciliándola con la misma clave (F51-1). */
  onRelease: (key: string) => void;
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

// Comp 06 «Categoría en Anotar gasto», opción 1c «Rejilla fija de 3 × 3» (aprobada el 6 nov 2026): las 9 categorías siempre a
// la vista, en la misma casilla en todos los anchos, 3 × 64 + 2 × 8 = 208 px. Cada celda: icono encima, nombre debajo, con el
// color de su categoría; la elegida, anillo de 2 px en tinta. Es un grupo de radio: Tab entra en la elegida (o en la primera) y
// las flechas la cambian y mueven el foco (← → de a una, con vuelta; ↑ ↓ de a fila; Inicio y Fin a los extremos).
const COLUMNS = 3;
function CategoryGrid({ ids, value, onSelect, onEnter }: { ids: readonly CategoryId[]; value: CategoryId | null; onSelect: (id: CategoryId) => void; onEnter: (id: CategoryId) => void }) {
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
      // FR-035: Enter guarda también con el foco en una categoría (la elige y guarda); Espacio solo la elige.
      case "Enter": event.preventDefault(); onEnter(ids[index]); return;
      default: return;
    }
    event.preventDefault();
    onSelect(ids[next]);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={copy.annotate.category} className="grid auto-rows-[64px] grid-cols-3 gap-2">
      {ids.map((id, index) => {
        const [bg, fg] = categories[id].tone.split(" ");
        const selected = value === id;
        return (
          <button
            key={id}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            lang="es"
            role="radio"
            aria-checked={selected}
            tabIndex={index === stop ? 0 : -1}
            onClick={() => onSelect(id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] px-1 py-1.5 text-center text-[12px] leading-[1.15] font-semibold text-ink [hyphens:auto] [overflow-wrap:anywhere] disabled:cursor-not-allowed disabled:opacity-60 ${bg} ${selected ? "shadow-[0_0_0_2px_var(--color-text-primary)]" : ""}`}
          >
            <AppIcon name={categories[id].icon} weight="duotone" size={22} className={fg} />
            <span>{copy.categories[id]}</span>
          </button>
        );
      })}
    </div>
  );
}

const chip = "flex h-11 items-center gap-2 rounded-[14px] bg-sunken px-3 text-[14px] font-medium text-ink shadow-[var(--comp-field-inset)]";

/** El chip de fecha es un selector nativo: un `input type="date"` transparente cubre el chip, así que el toque (o Enter) abre el selector del sistema. */
function DateChip({ value, today, invalid, errorId, onChange }: { value: string; today: string; invalid: boolean; errorId: string; onChange: (value: string) => void }) {
  // showPicker() abre el calendario del sistema (con un gesto del usuario); donde no existe o falla, el campo nativo sigue ahí.
  const openPicker = (input: HTMLInputElement) => { try { input.showPicker?.(); } catch { /* sin gesto del usuario */ } };
  return (
    <label className={`${chip} relative cursor-pointer focus-within:outline-[length:var(--border-focus)] focus-within:outline-offset-[var(--focus-offset)] focus-within:outline-focus focus-within:outline-solid has-[:disabled]:cursor-not-allowed`}>
      <AppIcon name="calendar-blank" size={17} className="text-ink-secondary" />
      {invalid ? copy.annotate.date : dayLabel(value, today)}
      <input
        type="date"
        aria-label={copy.annotate.date}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => openPicker(event.currentTarget)}
        // Con teclado, Enter o Espacio abren el selector (Enter, además, no envía el formulario desde este campo).
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPicker(event.currentTarget); } }}
        className="absolute inset-0 size-full cursor-pointer opacity-0 focus-visible:outline-none"
      />
    </label>
  );
}

export default function AnnotateSheet({ open, mode, idempotencyKey, today, actions, onClose, onSaved, onTrack, onRelease, returnFocusTo }: AnnotateSheetProps) {
  const wide = useSyncExternalStore(subscribeWide, readWide, () => false);
  const editing = mode.kind === "edit";
  const [initial] = useState(() => initialDraft(mode, today));
  const [draft, setDraft] = useState<Draft>(initial);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [confirming, setConfirming] = useState(false);
  // Bloqueo tras un fallo ambiguo: dura lo que dura esta apertura de la hoja.
  const [locked, setLocked] = useState(false);
  const saving = useRef(false);
  const amountId = `${useId()}-amount`;
  const dateErrorId = `${useId()}-date-error`;

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
        // Se guarda por el proveedor: oculta la hoja y la fila aparece ya; si falla, la hoja vuelve con esto mismo. El proveedor
        // guarda la intención (clave y payload) y, si el resultado queda en duda, la reenvía con la misma clave (F51-1).
        const payload = { ...common, type: value.type };
        result = await onTrack(rowFromPayload(payload, "saving"), () => actions.create(payload));
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
  // Gasto: las 9 en orden fijo. Ingreso: solo «Ingresos», que es su única categoría.
  const choices: readonly CategoryId[] = type === "income" ? ["income"] : expenseCategories;
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
        <div className="flex flex-col gap-2">
          <span aria-hidden="true" className="text-[12px] font-medium text-ink-secondary">{copy.annotate.category}</span>
          <CategoryGrid ids={choices} value={categoryId} onSelect={(next) => update({ categoryId: next })} onEnter={(next) => { update({ categoryId: next }); void save({ categoryId: next }); }} />
        </div>
        {/* Siempre a la vista: la descripción de una línea (opcional). */}
        <div className="flex flex-col gap-1.5">
          <label className="flex min-h-12 items-center gap-2.5 rounded-[14px] bg-sunken px-3.5 text-[15px] font-medium text-ink shadow-[var(--comp-field-inset)] focus-within:outline-[length:var(--border-focus)] focus-within:outline-offset-[var(--focus-offset)] focus-within:outline-focus focus-within:outline-solid">
            <AppIcon name="note-pencil" size={18} className="shrink-0 text-ink-secondary" />
            <span className="sr-only">{copy.annotate.description}</span>
            <input
              type="text"
              value={description}
              placeholder={copy.annotate.descriptionPlaceholder}
              maxLength={200}
              autoComplete="off"
              enterKeyHint="done"
              aria-invalid={descriptionTooLong || undefined}
              onChange={(event) => update({ description: event.target.value })}
              className="min-w-0 flex-1 bg-transparent placeholder:text-[var(--comp-field-muted-fg)] focus-visible:outline-none disabled:cursor-not-allowed"
            />
          </label>
          {descriptionTooLong ? <p className="text-[length:var(--label-s-size)] text-danger">{copy.annotate.errors.descriptionTooLong}</p> : null}
        </div>
        {/* La fecha abre el selector; «Solo tú» (P0-1: el contexto es siempre Yo) solo informa, con su candado y sin flechas. */}
        <div className="flex flex-wrap items-center gap-2">
          <DateChip value={date} today={today} invalid={dateInvalid} errorId={dateErrorId} onChange={(next) => update({ date: next })} />
          <span className={chip}>
            <AppIcon name="lock-simple" size={17} className="text-ink-secondary" />
            {copy.annotate.onlyYou}
          </span>
        </div>
        {dateInvalid ? <p id={dateErrorId} className="text-[length:var(--label-s-size)] text-danger">{copy.annotate.errors.date}</p> : null}
      </fieldset>
      {/* «Guardar sube con el teclado» (comp 1c): en la hoja móvil el pie va fijo al fondo del área desplazable, con el fondo de
          la hoja y el safe area: la hoja «bare» no pone relleno inferior, lo trae este pie. Desde 768 px (diálogo) el pie no es
          fijo y el relleno es el del diálogo. El aviso de error sube con él. */}
      <div className="flex flex-col gap-3.5 max-md:sticky max-md:bottom-0 max-md:z-[1] max-md:-mx-5 max-md:bg-overlay max-md:px-5 max-md:pt-2 max-md:pb-[calc(20px+env(safe-area-inset-bottom))]">
        {errorNotice}
        <Button type="submit" size="lg" icon="check" loading={isSaving} loadingLabel={copy.annotate.saving} disabled={!canSave} className="w-full">
          {saveLabel}
        </Button>
      </div>
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
          confirm={<Button variant="secondary" onClick={() => { setConfirming(false); onRelease(idempotencyKey); onClose(); }}>{copy.annotate.uncertain.close}</Button>}
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
  return wide ? <Modal {...props}>{body}</Modal> : <BottomSheet {...props} draggable>{body}</BottomSheet>;
}
