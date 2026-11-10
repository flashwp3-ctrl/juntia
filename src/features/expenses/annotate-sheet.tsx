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
// PR C de la 003 (T046, T047; FR-018–FR-024, FR-059, FR-062): con la pareja activa, el chip «Solo tú» es el selector
// Yo/Nosotros de la hoja (decisión 6 de los fundadores, 7 nov 2026), que nace con el contexto de la app y no cambia si el
// selector de la app cambia con la hoja abierta (FR-062). En Nosotros, la opción 2a de «07 Nosotros en Anotar gasto»: una
// fila resumen de 60 px bajo la rejilla (Pagó · Reparto · Participan, siempre visible, con lo último que usó la persona)
// que abre la subhoja «Reparto» en la misma hoja; Guardar queda en el mismo sitio y fijo al pie en las dos vistas. Un
// reparto inválido marca el resumen en rojo y deshabilita Guardar. La escritura compartida usa los tres resultados del
// módulo común (`ok`, `rejected`, `unknown` con «Reintentar» y «Comprobar estado»), sin fila optimista. La misma hoja
// edita un gasto compartido (Q12): monto, categoría, fecha, descripción, pagador y reparto, con el aviso de recálculo; el
// contexto se ve y no se cambia. En Yo, una edición con pareja activa ofrece pasar a Nosotros: es Mover a Pareja (FR-032).
// 004 PR D (T060, T061; FR-050–FR-052, FR-085, FR-090; 04·11 B1–B3): al anotar un gasto, «Cómo se pagó: Dinero del mes · Con
// una meta», con «Dinero del mes» como valor inicial (la ruta mínima no cambia). «Con una meta» abre en la misma hoja la
// subhoja de la meta, como la de «Reparto»: B1 (las metas del contexto de la hoja, que se piden al servidor en ese momento:
// en Nosotros solo compartidas, en Yo solo personales; nunca se pide ni se pinta una del otro ámbito), B2 (FundingLedger) y
// B3 (el efecto «ahora» y «si aprueba»). Cambiar el contexto de la hoja olvida la meta elegida. Guardar registra el gasto, el
// uso propio y la solicitud en una sola escritura (create_expense_with_goal) con los tres resultados de la máquina común;
// «NO SE REGISTRÓ» solo con un rechazo confirmado. No se ofrece al editar ni en un ingreso (Q16: una meta, elegida al anotar).
// Forma compacta (UX 2: la hoja de 390 px abre ajustada al contenido y deja ver el saludo): «Cómo se pagó» es una ficha en la
// fila de «Hoy · Solo tú», con el valor elegido, que abre la subhoja; ahí está el selector «Dinero del mes · Con una meta».
import { useCallback, useId, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
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
import { InlineNotice } from "@/components/ui/inline-notice";
import { useWrite } from "@/features/shared/use-write";
import { WriteUnknown } from "@/features/shared/write-unknown";
import type { WriteError } from "@/features/shared/write-result";
import type { ContextChoice } from "@/lib/context-preference";
import { ConfirmDialog } from "./confirm-dialog";
import type { SheetMode } from "./annotate-provider";
import { normalizeDescription, toPayloadPesos } from "./payload";
import { SplitEditor, SplitSummary, splitSubtitle } from "./split-editor";
import { evaluateSplit, initialSplit, splitFromSaved, splitPayload, summaryLines, type SplitDraft } from "./split-state";
import type { CoupleForSheet, SavedShared, SharedActions, SharedCreatePayload, SharedUpdatePayload } from "./shared-types";
import { isAmbiguousError, type ActionResult, type ExpenseActionError, type ExpenseActions, type PendingRow, type SavedTransaction } from "./types";
import { ConfirmationBadge } from "./goal-funding/confirmation-badge";
import { FundingEffect } from "./goal-funding/funding-effect";
import { FundingLedger } from "./goal-funding/funding-ledger";
import { evaluateFunding, proposeFunds, type Funds } from "./goal-funding/funding-state";
import { GoalPicker, type PickerState } from "./goal-funding/goal-picker";
import type { Contributor, FundingGoal, GoalExpensePayload, GoalFundingActions, SavedGoalExpense } from "./goal-funding/types";
import { cop } from "@/features/goals/format";

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
  returnFocusTo: { current: HTMLElement | null };
  /** PR C: la pareja activa (o `null`), sus escrituras y el contexto de la app al abrir la hoja (FR-062). */
  couple?: CoupleForSheet | null;
  sharedActions?: SharedActions;
  initialContext?: ContextChoice;
  onSharedSaved?: (saved: SavedShared, kind: "create" | "editShared") => void;
  /** Editar un privado con pareja activa y elegir Nosotros: Mover a Pareja (FR-032). */
  onMove?: (transaction: SavedTransaction) => void;
  /** 004 PR D: el gasto con meta. Sin estas escrituras, «Cómo se pagó» no se ofrece. */
  goalFunding?: GoalFundingActions;
  onGoalSaved?: (saved: SavedGoalExpense, message: string) => void;
};

type PaidWith = "month" | "goal";

/** Lo que dice la hoja ante un rechazo confirmado del gasto con meta (contracts/errors.md). */
function goalRejection(error: WriteError) {
  switch (error) {
    case "insufficientFunds": case "allocation": return copy.goalExpense.errors.allocation;
    case "usageExceedsExpense": return copy.goalExpense.errors.exceedsExpense;
    case "goalNotOpen": case "goalNotFound": return copy.goalExpense.errors.goalClosed;
    case "invalidSplit": return copy.annotate.split.errors.invalid;
    case "coupleNotActive": return copy.shared.errors.notActive;
    case "sessionExpired": return copy.errors.sessionExpired;
    default: return copy.errors.unexpected;
  }
}

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
  if (mode.kind === "editShared") {
    const { expense } = mode;
    return { type: "expense", amount: pesosOf(expense.amountMinor), categoryId: expense.categoryId, date: expense.transactionDate, description: expense.description ?? "" };
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
  // showPicker() abre el calendario del sistema (con un gesto del usuario). Devuelve si lo abrió: donde no existe o lanza, el campo
  // nativo sigue ahí y su acción por defecto no se toca.
  const openPicker = (input: HTMLInputElement) => {
    if (typeof input.showPicker !== "function") return false;
    try { input.showPicker(); return true; } catch { return false; }
  };
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
        // Con teclado, Enter o Espacio abren el selector; solo si de verdad se abrió se cancela la acción nativa (F51-10).
        onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && openPicker(event.currentTarget)) event.preventDefault(); }}
        className="absolute inset-0 size-full cursor-pointer opacity-0 focus-visible:outline-none"
      />
    </label>
  );
}


/** PR C: lo que dice la hoja ante un rechazo confirmado de una escritura compartida (contracts/errors.md). */
function sharedRejection(error: WriteError, partner: string) {
  switch (error) {
    case "invalidSplit": return copy.annotate.split.errors.invalid;
    case "versionConflict": return copy.shared.errors.versionConflict(partner);
    // 004 PR D (Q17, JT213): el monto quedaría por debajo de lo usado de la meta; reintentar repetiría el rechazo.
    case "belowGoalUsage": return copy.goalExpense.errors.removeUsageFirst;
    case "alreadyDeleted": case "notFound": return copy.shared.errors.alreadyDeleted(partner);
    case "coupleNotActive": return copy.shared.errors.notActive;
    case "sessionExpired": return copy.errors.sessionExpired;
    default: return copy.errors.unexpected;
  }
}

export default function AnnotateSheet({ open, mode, idempotencyKey, today, actions, onClose, onSaved, onTrack, returnFocusTo, couple = null, sharedActions, initialContext = "me", onSharedSaved, onMove, goalFunding, onGoalSaved }: AnnotateSheetProps) {
  const wide = useSyncExternalStore(subscribeWide, readWide, () => false);
  const editing = mode.kind === "edit" || mode.kind === "editShared";
  const editingShared = mode.kind === "editShared";
  const members = useMemo(() => couple?.members ?? [], [couple]);
  const partner = members.find((member) => !member.isMe)?.name ?? "";
  const [initial] = useState(() => initialDraft(mode, today));
  const [draft, setDraft] = useState<Draft>(initial);
  // FR-062: el contexto de esta apertura nace con el de la app y no lo cambia el selector de la app.
  const [sheetContext, setSheetContext] = useState<ContextChoice>(() => (editingShared ? "us" : mode.kind === "edit" || !couple ? "me" : initialContext));
  const [initialSplitDraft] = useState<SplitDraft | null>(() => (!couple ? null : mode.kind === "editShared" ? splitFromSaved(mode.expense, couple.members) : initialSplit(couple.members, couple.last)));
  const [split, setSplit] = useState<SplitDraft | null>(initialSplitDraft);
  const [view, setView] = useState<"main" | "split" | "goal">("main");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [confirming, setConfirming] = useState(false);
  const [confirmingMove, setConfirmingMove] = useState(false);
  // Bloqueo tras un fallo ambiguo: dura lo que dura esta apertura de la hoja.
  const [locked, setLocked] = useState(false);
  const saving = useRef(false);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const payerRef = useRef<HTMLButtonElement | null>(null);
  const amountId = `${useId()}-amount`;
  const dateErrorId = `${useId()}-date-error`;
  const splitStatusId = `${useId()}-split`;
  const fundingStatusId = `${useId()}-funding`;
  const backRef = useRef<HTMLButtonElement | null>(null);
  const goalSummaryRef = useRef<HTMLButtonElement | null>(null);
  // 004 PR D: «Cómo se pagó» y la meta de esta apertura (en memoria; nunca en el navegador, FR-094).
  const [paidWith, setPaidWith] = useState<PaidWith>("month");
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [usage, setUsage] = useState<number | null>(null);
  const [funds, setFunds] = useState<Funds>({});
  const [fundsTouched, setFundsTouched] = useState(false);
  const loadSeq = useRef(0);

  const shared = sheetContext === "us" && couple !== null && split !== null && sharedActions !== undefined;
  const sharedRun = useCallback((payload: SharedCreatePayload | SharedUpdatePayload) => ("transactionId" in payload ? sharedActions!.update(payload) : sharedActions!.create(payload)), [sharedActions]);
  const sharedCheck = useCallback((input: Parameters<SharedActions["check"]>[0]) => sharedActions!.check(input), [sharedActions]);
  const sharedOk = useCallback((saved: SavedShared) => onSharedSaved?.(saved, editingShared ? "editShared" : "create"), [editingShared, onSharedSaved]);
  const sharedWrite = useWrite<SharedCreatePayload | SharedUpdatePayload, SavedShared>({ action: editingShared ? "update_shared_expense" : "create_shared_expense", run: sharedRun, check: sharedCheck, onOk: sharedOk });
  const goalRun = useCallback((payload: GoalExpensePayload) => goalFunding!.create(payload), [goalFunding]);
  const goalCheck = useCallback((input: Parameters<GoalFundingActions["check"]>[0]) => goalFunding!.check(input), [goalFunding]);
  const goalNameRef = useRef("");
  const goalOk = useCallback((saved: SavedGoalExpense, payload: GoalExpensePayload) => {
    const asked = BigInt(payload.requestedPesos) > 0n;
    onGoalSaved?.(saved, asked ? copy.goalExpense.saved.ask(partner) : copy.goalExpense.saved.own(goalNameRef.current));
  }, [onGoalSaved, partner]);
  const goalWrite = useWrite<GoalExpensePayload, SavedGoalExpense>({ action: "create_expense_with_goal", run: goalRun, check: goalCheck, onOk: goalOk });

  const { type, amount, categoryId, date, description } = draft;
  const isSaving = status.kind === "saving" || sharedWrite.pending || goalWrite.pending;
  const isLocked = locked || sharedWrite.locked || goalWrite.locked;
  const isDirty = useCallback((value: Draft) => (Object.keys(initial) as (keyof Draft)[]).some((key) => initial[key] !== value[key]), [initial]);
  // 004 PR D: la meta se ofrece solo al anotar un gasto, con sus escrituras; con meta, el gasto se guarda con ella.
  const offerGoal = !editing && type === "expense" && goalFunding !== undefined;
  const withGoal = offerGoal && paidWith === "goal";
  const goals = picker?.kind === "ready" ? picker.goals : [];
  const goal: FundingGoal | null = goals.find((item) => item.id === goalId) ?? null;
  const contributorsOf = useCallback((target: FundingGoal): Contributor[] => target.members.map((member) => {
    // En Yo la meta es personal: su único aportante es quien anota (DEC-G06).
    const person = sheetContext === "us" ? members.find((item) => item.userId === member.userId) : null;
    return { userId: member.userId, availableMinor: member.availableMinor, name: person?.name ?? "", joinOrder: person?.joinOrder ?? 1, isMe: sheetContext === "me" || Boolean(person?.isMe) };
  }).sort((a, b) => a.joinOrder - b.joinOrder), [members, sheetContext]);
  const contributors: Contributor[] = useMemo(() => (goal ? contributorsOf(goal) : []), [contributorsOf, goal]);
  const fundingStatus = withGoal && goal ? evaluateFunding({ expensePesos: draft.amount, usagePesos: usage, funds, contributors }) : null;
  const splitStatus = split ? evaluateSplit(split, amount, members) : null;
  const payload = split && splitStatus ? splitPayload(split, splitStatus, members) : null;
  const initialPayload = useMemo(() => (initialSplitDraft && mode.kind === "editShared" ? JSON.stringify(splitPayload(initialSplitDraft, evaluateSplit(initialSplitDraft, pesosOf(mode.expense.amountMinor), members), members)) : null), [initialSplitDraft, members, mode]);
  const splitDirty = editingShared && JSON.stringify(payload) !== initialPayload;
  const dirty = isDirty(draft) || splitDirty || paidWith === "goal";
  const amountInvalid = amount === 0;
  const dateInvalid = !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date);
  const descriptionTooLong = [...description.trim()].length > 140;
  const splitInvalid = shared && splitStatus !== null && splitStatus.kind !== "ok" && splitStatus.kind !== "noAmount";
  const canSave = isComplete(draft) && (!editing || dirty) && (!shared || payload !== null) && (!withGoal || fundingStatus?.kind === "ok");
  const lines = shared && split && splitStatus ? summaryLines(split, splitStatus, members) : null;

  const update = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    // Lo escrito después de un error lo deja atrás; el siguiente Guardar es el reintento con la misma clave.
    setStatus((current) => (current.kind === "error" ? { kind: "idle" } : current));
    if (sharedWrite.state.phase === "rejected") sharedWrite.reset();
    if (goalWrite.state.phase === "rejected") goalWrite.reset();
  };
  const changeSplit = (next: SplitDraft) => {
    setSplit(next);
    if (sharedWrite.state.phase === "rejected") sharedWrite.reset();
  };
  const setType = (next: TransactionType) => {
    if (next === type) return;
    update({ type: next, categoryId: next === "income" ? "income" : null });
    if (next === "income") setSheetContext("me");
  };
  const chooseContext = (next: ContextChoice) => {
    if (next === sheetContext) return;
    if (mode.kind === "edit") {
      // FR-032: desde Editar, pasar a Nosotros es Mover a Pareja; con cambios sin guardar se confirma antes.
      if (isDirty(draft)) setConfirmingMove(true);
      else onMove?.(mode.transaction);
      return;
    }
    setSheetContext(next);
    forgetGoal();
  };

  // 004 PR D (T060): B1 pide al servidor las metas del contexto de la hoja. Una respuesta de un contexto anterior se ignora.
  const loadGoals = useCallback(async (context: ContextChoice) => {
    if (!goalFunding) return;
    const mine = ++loadSeq.current;
    setPicker({ kind: "loading" });
    let result: Awaited<ReturnType<GoalFundingActions["loadGoals"]>>;
    try {
      result = await goalFunding.loadGoals({ context });
    } catch {
      result = { ok: false };
    }
    if (mine !== loadSeq.current) return;
    setPicker(result.ok ? { kind: "ready", goals: result.goals } : { kind: "failed" });
  }, [goalFunding]);
  function forgetGoal() {
    loadSeq.current++;
    setPaidWith("month");
    setPicker(null);
    setGoalId(null);
    setUsage(null);
    setFunds({});
    setFundsTouched(false);
    if (goalWrite.state.phase === "rejected") goalWrite.reset();
  }
  const openGoal = () => {
    setView("goal");
    requestAnimationFrame(() => backRef.current?.focus());
  };
  const choosePaidWith = (next: PaidWith) => {
    if (next === paidWith) return;
    if (next === "month") { forgetGoal(); return; }
    setPaidWith("goal");
    if (!picker || picker.kind === "failed") void loadGoals(sheetContext);
  };
  const closeGoal = () => {
    setView("main");
    requestAnimationFrame(() => goalSummaryRef.current?.focus());
  };
  /** Q16, opción (i): el uso empieza en el gasto (o en lo que haya en la meta) y los fondos, en la propuesta proporcional. */
  const selectGoal = (next: FundingGoal) => {
    setGoalId(next.id);
    goalNameRef.current = next.name;
    const total = next.members.reduce((sum, member) => sum + BigInt(member.availableMinor), 0n) / 100n;
    // En bigint: el disponible de la meta puede superar el máximo de un número exacto; el uso nunca pasa del gasto.
    const initialUsage = draft.amount && draft.amount > 0 ? Number(BigInt(draft.amount) < total ? BigInt(draft.amount) : total) : null;
    setUsage(initialUsage);
    setFundsTouched(false);
    setFunds(proposeFunds(contributorsOf(next), initialUsage));
    if (goalWrite.state.phase === "rejected") goalWrite.reset();
  };
  const changeUsage = (value: number | null) => {
    setUsage(value);
    if (!fundsTouched) setFunds(proposeFunds(contributors, value));
    if (goalWrite.state.phase === "rejected") goalWrite.reset();
  };
  const changeFund = (userId: string, value: number | null) => {
    setFunds((current) => ({ ...current, [userId]: value }));
    setFundsTouched(true);
    if (goalWrite.state.phase === "rejected") goalWrite.reset();
  };

  // `patch`: Enter en una categoría guarda con la elección recién hecha, sin esperar a que el estado la refleje.
  const save = useCallback(async (patch: Partial<Draft> = {}) => {
    const value = { ...draft, ...patch };
    if (saving.current || !isComplete(value) || (editing && !isDirty(value) && !splitDirty) || value.amount === null || value.categoryId === null) return;
    const common = { idempotencyKey, amountPesos: toPayloadPesos(value.amount), categoryId: value.categoryId, transactionDate: value.date, description: normalizeDescription(value.description) };
    if (withGoal) {
      // 004 PR D (T061; FR-052, FR-090): solo lo decidido —meta, fondos propios y pedidos—; el servidor recalcula y valida.
      const funding = goal ? evaluateFunding({ expensePesos: value.amount, usagePesos: usage, funds, contributors }) : null;
      if (!goal || funding?.kind !== "ok") return;
      const decided = { goalId: goal.id, ownPesos: String(funding.ownPesos), requestedPesos: String(funding.requestedPesos) };
      if (shared) {
        const splitNow = split ? splitPayload(split, evaluateSplit(split, value.amount, members), members) : null;
        if (!splitNow) return;
        await goalWrite.submit({ ...common, ...splitNow, ...decided, context: "us" });
      } else await goalWrite.submit({ ...common, ...decided, context: "me" });
      return;
    }
    if (shared) {
      const splitNow = split ? splitPayload(split, evaluateSplit(split, value.amount, members), members) : null;
      if (!splitNow) return;
      if (mode.kind === "editShared") await sharedWrite.submit({ ...common, ...splitNow, transactionId: mode.expense.id, expectedVersion: mode.expense.version });
      else await sharedWrite.submit({ ...common, ...splitNow });
      return;
    }
    saving.current = true;
    setStatus({ kind: "saving" });
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
      onSaved(result.value, mode.kind === "edit" ? "edit" : "create");
    } else {
      if (isAmbiguousError(result.error)) setLocked(true);
      setStatus({ kind: "error", error: result.error });
    }
  }, [actions, contributors, draft, editing, funds, goal, goalWrite, idempotencyKey, isDirty, members, mode, onSaved, onTrack, shared, sharedWrite, split, splitDirty, usage, withGoal]);

  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void save(); };

  const openSplit = () => {
    setView("split");
    requestAnimationFrame(() => payerRef.current?.focus());
  };
  const closeSplit = () => {
    setView("main");
    requestAnimationFrame(() => summaryRef.current?.querySelector<HTMLButtonElement>("[data-split-summary]")?.focus());
  };

  // Con cambios sin guardar (o tras un resultado desconocido) se confirma antes de cerrar.
  const closeSheet = () => {
    if (saving.current || (sharedWrite.pending && !sharedWrite.locked) || (goalWrite.pending && !goalWrite.locked)) return;
    if (dirty || isLocked) setConfirming(true);
    else onClose();
  };
  // Escape, el scrim y el arrastre pasan por aquí: en la subhoja, Escape vuelve al resumen (2a).
  const requestClose = (next: boolean) => {
    if (next) return;
    if (view === "split") { closeSplit(); return; }
    if (view === "goal") { closeGoal(); return; }
    closeSheet();
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
      // 004 PR D (Q17, JT213): sin «Reintentar», que repetiría el mismo rechazo; primero se quita el uso o se usa menos.
      case "belowGoalUsage": return <Toast tone="error" message={copy.goalExpense.errors.removeUsageFirst} />;
      case "notFound": return <Toast tone="error" message={copy.transaction.errors.notFound} />;
      case "network": return <Toast tone="error" message={copy.errors.network} action={retry} />;
      case "saveFailed": return <Toast tone="error" message={copy.errors.saveFailed} action={retry} />;
      default: return <Toast tone="error" message={copy.errors.unexpected} action={retry} />;
    }
  })() : null;

  const sharedNotice = sharedWrite.state.phase === "rejected" ? (
    <Toast tone="error" message={sharedRejection(sharedWrite.state.error, partner)}
      action={sharedWrite.state.error === "versionConflict" && mode.kind === "editShared" ? { label: copy.annotate.reload, onAction: () => { onClose(); mode.onReload(); } } : undefined} />
  ) : sharedWrite.state.phase === "unknown" ? (
    <WriteUnknown checking={sharedWrite.state.checking} notFound={sharedWrite.state.notFound} onRetry={() => void sharedWrite.retry()} onCheck={() => void sharedWrite.checkStatus()} />
  ) : null;

  const closeButton = (
    <button
      type="button"
      onClick={closeSheet}
      aria-label={copy.annotate.close}
      className="grid size-11 place-items-center rounded-[13px] bg-raised text-ink shadow-raised hover:bg-sunken"
    >
      <AppIcon name="x" weight="bold" size={16} />
    </button>
  );

  // Contexto: sin pareja activa, «Solo tú» solo informa (P0-1). Con pareja, es el selector de la hoja (decisión 6); al
  // editar un compartido, «Nosotros» se ve y no se cambia (Q12).
  const contextControl = !couple || type === "income" ? (
    <span className={chip}><AppIcon name="lock-simple" size={17} className="text-ink-secondary" />{copy.annotate.onlyYou}</span>
  ) : editingShared ? (
    <span className={chip}><AppIcon name="users-three" size={17} className="text-ink-secondary" />{copy.context.us}</span>
  ) : (
    <Segmented<ContextChoice>
      role="radiogroup"
      label={copy.shared.context}
      value={sheetContext}
      onValueChange={chooseContext}
      options={[{ value: "me", label: copy.annotate.onlyYou }, { value: "us", label: copy.context.us }]}
    />
  );

  // 004 PR D (T061; decisión 22.3): «NO SE REGISTRÓ» solo con un rechazo confirmado; con un resultado desconocido, la
  // intención queda bloqueada con «Reintentar» y «Comprobar estado», sin decir que no se guardó (FR-093).
  const goalNotice = goalWrite.state.phase === "rejected" ? (
    <div role="alert" className="flex flex-col gap-2 rounded-[16px] bg-danger-subtle px-3.5 py-3 text-[13px] leading-[1.45] font-medium text-ink">
      <span className="flex flex-wrap items-center gap-2"><ConfirmationBadge state="failed" />{copy.goalExpense.failed}</span>
      <span>{goalRejection(goalWrite.state.error)}</span>
    </div>
  ) : goalWrite.state.phase === "unknown" ? (
    <WriteUnknown checking={goalWrite.state.checking} notFound={goalWrite.state.notFound} onRetry={() => void goalWrite.retry()} onCheck={() => void goalWrite.checkStatus()} />
  ) : null;
  const asking = contributors.some((contributor) => !contributor.isMe && (funds[contributor.userId] ?? 0) > 0);
  const label = withGoal
    ? asking ? copy.goalExpense.submit.ask(partner) : copy.goalExpense.submit.own(amount && amount > 0 ? formatMoney(moneyFromPesos(BigInt(amount))) : "")
    : saveLabel;

  const footer = (
    // «Guardar sube con el teclado» (comp 1c y 2a): en la hoja móvil el pie va fijo al fondo del área desplazable, en las
    // dos vistas. Desde 768 px (diálogo) el pie no es fijo y el relleno es el del diálogo. El aviso de error sube con él.
    <div className="flex flex-col gap-3.5 max-md:sticky max-md:bottom-0 max-md:z-[1] max-md:-mx-5 max-md:bg-overlay max-md:px-5 max-md:pt-2 max-md:pb-[calc(20px+env(safe-area-inset-bottom))]">
      {errorNotice}
      {sharedNotice}
      {goalNotice}
      <Button type="submit" size="lg" icon="check" loading={isSaving} loadingLabel={withGoal ? copy.goalExpense.submit.saving : copy.annotate.saving} disabled={!canSave} aria-describedby={splitInvalid ? splitStatusId : withGoal && fundingStatus && fundingStatus.kind !== "ok" ? fundingStatusId : undefined} className="w-full">
        {label}
      </Button>
    </div>
  );

  // B1–B3 en la subhoja de la meta: la lista, FundingLedger y el efecto, con la × y «Volver al gasto».
  const fundingNow = fundingStatus?.kind === "ok" ? fundingStatus : null;
  const goalView = offerGoal ? (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
        <button ref={backRef} type="button" onClick={closeGoal} aria-label={copy.goalExpense.back} className="grid size-11 place-items-center rounded-[13px] bg-raised text-ink shadow-raised hover:bg-sunken">
          <AppIcon name="caret-left" weight="bold" size={16} />
        </button>
        <div className="flex min-w-0 flex-col items-center text-center">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <h2 className="font-serif text-[23px] leading-[1.04] font-medium tracking-[-0.015em] text-ink">{copy.goalExpense.paidWith.label}</h2>
          {amount && amount > 0 ? <p className="max-w-full truncate text-[12px] font-medium text-[var(--comp-field-muted-fg)]">{copy.goalExpense.subtitle(formatMoney(moneyFromPesos(BigInt(amount))))}</p> : null}
        </div>
        {closeButton}
      </div>
      <Segmented<PaidWith>
        role="radiogroup"
        label={copy.goalExpense.paidWith.label}
        stretch
        value={paidWith}
        onValueChange={choosePaidWith}
        disabled={isSaving || isLocked}
        options={[{ value: "month", label: copy.goalExpense.paidWith.month }, { value: "goal", label: copy.goalExpense.paidWith.goal }]}
      />
      {withGoal ? <GoalPicker state={picker ?? { kind: "loading" }} context={sheetContext} value={goalId} onSelect={selectGoal} onRetry={() => void loadGoals(sheetContext)} disabled={isSaving || isLocked} /> : null}
      {goal && fundingStatus ? (
        <>
          <FundingLedger contributors={contributors} usagePesos={usage} onUsage={changeUsage} funds={funds} onFund={changeFund} status={fundingStatus}
            split={lines ? { first: lines.first, second: lines.second } : null} statusId={fundingStatusId} disabled={isSaving || isLocked} />
          {fundingNow ? <FundingEffect goalName={goal.name} balanceMinor={goal.balanceMinor} ownPesos={fundingNow.ownPesos} requestedPesos={fundingNow.requestedPesos} partnerName={partner || null} /> : null}
        </>
      ) : null}
    </div>
  ) : null;

  const splitView = shared && split ? (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
        <button type="button" onClick={closeSplit} aria-label={copy.shared.split.back} className="grid size-11 place-items-center rounded-[13px] bg-raised text-ink shadow-raised hover:bg-sunken">
          <AppIcon name="caret-left" weight="bold" size={16} />
        </button>
        <div className="flex min-w-0 flex-col items-center text-center">
          {/* La hoja conserva su nombre («Anotar gasto») en la subhoja; «Reparto» es el encabezado visible. */}
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <h2 className="font-serif text-[23px] leading-[1.04] font-medium tracking-[-0.015em] text-ink">{copy.shared.split.title}</h2>
          <p className="max-w-full truncate text-[12px] font-medium text-[var(--comp-field-muted-fg)]">{splitSubtitle(categoryId ? copy.categories[categoryId] : null, amount)}</p>
        </div>
        {closeButton}
      </div>
      <SplitEditor members={members} draft={split} onChange={changeSplit} amountPesos={amount} statusId={splitStatusId} payerRef={payerRef} disabled={isSaving || isLocked} />
    </div>
  ) : null;

  const body = (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3.5">
      {view === "split" && splitView ? splitView : view === "goal" && goalView ? goalView : (
        <>
          {/* 02·5 con la × a la DERECHA: decisión de los fundadores (UX lote 1) que sustituye a la comp 02·5, que la ponía a la
              izquierda. Título serif al centro; la columna izquierda equilibra el encabezado. */}
          <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
            <span />
            <DialogTitle className="text-center font-serif text-[23px] leading-[1.04] font-medium tracking-[-0.015em] text-balance">{title}</DialogTitle>
            {closeButton}
          </div>
          <fieldset disabled={isSaving || isLocked} data-locked={isLocked ? "" : undefined} className="flex min-w-0 flex-col gap-3.5">
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
            {editingShared ? <InlineNotice icon="info">{copy.shared.edit.notice(partner)}</InlineNotice> : null}
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
            {/* La fecha abre el selector; al lado, el contexto (decisión 6 de los fundadores). */}
            <div className="flex flex-wrap items-center gap-2">
              <DateChip value={date} today={today} invalid={dateInvalid} errorId={dateErrorId} onChange={(next) => update({ date: next })} />
              {contextControl}
              {/* 004 PR D (FR-050): «Cómo se pagó», con «Dinero del mes» como valor inicial; abre la subhoja de B1–B3. */}
              {offerGoal ? (
                <button
                  type="button"
                  ref={goalSummaryRef}
                  data-goal-summary=""
                  onClick={openGoal}
                  aria-label={`${copy.goalExpense.paidWith.label}: ${withGoal ? (goal && usage ? copy.goalExpense.summary.line(goal.name, cop(BigInt(usage) * 100n)) : copy.goalExpense.summary.choose) : copy.goalExpense.paidWith.month}`}
                  className={`${chip} max-w-full min-w-0 hover:bg-raised disabled:cursor-not-allowed ${withGoal && fundingStatus && fundingStatus.kind !== "ok" && fundingStatus.kind !== "noUsage" ? "shadow-[inset_0_0_0_1.5px_var(--color-status-danger)]" : ""}`}
                >
                  <AppIcon name="piggy-bank" size={17} className={withGoal ? "shrink-0 text-saving" : "shrink-0 text-ink-secondary"} />
                  <span className="truncate">{withGoal ? (goal?.name ?? copy.goalExpense.paidWith.goal) : copy.goalExpense.paidWith.month}</span>
                </button>
              ) : null}
            </div>
            {dateInvalid ? <p id={dateErrorId} className="text-[length:var(--label-s-size)] text-danger">{copy.annotate.errors.date}</p> : null}
          </fieldset>
          {/* 2a: la fila resumen de 60 px bajo «Hoy · Nosotros», siempre a la vista. */}
          {lines && split ? (
            <div ref={summaryRef}>
              <SplitSummary payer={members.find((member) => member.userId === split.payerUserId) ?? members[0]} first={lines.first} second={lines.second} invalid={lines.invalid} onOpen={openSplit} disabled={isSaving} />
              {splitInvalid ? <p id={splitStatusId} className="sr-only">{lines.second}</p> : null}
            </div>
          ) : null}
        </>
      )}
      {footer}
      {/* F45-1 (revisión del PR #45): tras un fallo ambiguo el primer intento pudo guardarse, así que cerrar no puede
          decir «no se guardará». Se ofrece reintentar lo mismo con la misma clave (la opción segura, con el foco) o
          cerrar, y se pide revisar Actividad antes de volver a anotarlo. */}
      {isLocked ? (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={copy.annotate.uncertain.title}
          description={copy.annotate.uncertain.description}
          cancel={(ref) => <Button ref={ref} variant="ghost" icon="arrow-clockwise" onClick={() => { setConfirming(false); if (sharedWrite.locked) void sharedWrite.retry(); else void save(); }}>{copy.annotate.uncertain.retry}</Button>}
          confirm={<Button variant="secondary" onClick={() => { setConfirming(false); onClose(); }}>{copy.annotate.uncertain.close}</Button>}
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
      {mode.kind === "edit" ? (
        <ConfirmDialog
          open={confirmingMove}
          onOpenChange={setConfirmingMove}
          title={copy.annotate.discard.edit}
          description={copy.annotate.discard.description}
          cancel={(ref) => <Button ref={ref} variant="ghost" onClick={() => setConfirmingMove(false)}>{copy.annotate.discard.keep}</Button>}
          confirm={<Button variant="danger" onClick={() => { setConfirmingMove(false); onMove?.(mode.transaction); }}>{copy.annotate.discard.confirm}</Button>}
        />
      ) : null}
    </form>
  );

  const props = { open, onOpenChange: requestClose, title, onOpenAutoFocus, onCloseAutoFocus, bare: true };
  return wide ? <Modal {...props}>{body}</Modal> : <BottomSheet {...props} draggable>{body}</BottomSheet>;
}
