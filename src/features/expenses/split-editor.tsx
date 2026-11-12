"use client";
// T046, T050 (spec 003, PR C) / FR-019, FR-019a, FR-021, FR-054; US-2.2–2.4f; decisiones 20.4 y 20.3 (Anotar compartido
// y ChangePreview aprobados en su forma). Diseño aprobado por los fundadores el 7 nov 2026: «07 Nosotros en Anotar gasto»,
// opción 2a. Aquí viven las piezas del reparto:
//   - SplitSummary: la fila de 60 px bajo la rejilla, siempre a la vista, que resume Pagó · Reparto · Participan y abre la
//     subhoja «Reparto». Con el reparto inválido se marca en rojo con el mismo texto del aviso.
//   - SplitEditor: la subhoja (y el paso A2 de Mover a Pareja) con Pagó, Reparto (50/50 · Porcentaje · Importe) y
//     Participan, la barra del reparto y el aviso E3 («Faltan $X por asignar», «Sobran $X»; en Porcentaje con «(10 %)»).
// Las personas llevan su color y su patrón por orden de ingreso (persona 1 sólido, persona 2 rayado) y su inicial: no
// dependen solo del color. Objetivos de 44 px; los grupos de radio con flechas y foco itinerante.
import { useRef, type KeyboardEvent, type RefObject } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Avatar, personFill } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/segmented";
import type { SplitMode } from "@/domain/allocations";
import { formatMoney, moneyFromPesos } from "@/domain/money";
import { initialOf } from "@/domain/account";
import { copy } from "@/lib/copy/es";
import { evaluateSplit, setMode, shownAmounts, splitMessage, toggleParticipant, type SplitDraft, type SplitStatus } from "./split-state";
import type { SheetMember } from "./shared-types";

const label = "text-[0.75rem] font-medium text-ink-secondary";
const sorted = (members: readonly SheetMember[]) => [...members].sort((a, b) => a.joinOrder - b.joinOrder);

/** La fila resumen de 2a. `invalid`: el reparto no cuadra; dice el aviso en rojo y Guardar sigue deshabilitado. */
export function SplitSummary({ payer, first, second, invalid, onOpen, disabled }: { payer: SheetMember; first: string; second: string; invalid: boolean; onOpen: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      data-split-summary=""
      data-invalid={invalid ? "" : undefined}
      className={`flex min-h-[60px] w-full items-center gap-3 rounded-[16px] px-3 text-left shadow-[var(--comp-field-inset)] disabled:cursor-not-allowed disabled:opacity-60 ${invalid ? "bg-danger-subtle" : "bg-sunken hover:bg-[var(--comp-segmented-knob-bg)]"}`}
    >
      {/* El nombre es el texto visible precedido de «Reparto:» oculto (WCAG 2.5.3: lo que se ve está en el nombre). */}
      <span className="sr-only">{copy.shared.summary.open}: </span>
      <Avatar person={payer.joinOrder} initial={initialOf(payer.name)} size={36} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[0.9375rem] leading-[1.3] font-semibold text-ink">{first}<span className="sr-only">. </span></span>
        <span className={`truncate text-[0.75rem] leading-[1.35] ${invalid ? "font-semibold text-danger" : "text-[var(--comp-field-muted-fg)]"}`}>
          {invalid ? <AppIcon name="warning-circle" weight="bold" size={12} className="mr-1 inline-block align-[-1px]" /> : null}
          {second}
        </span>
      </span>
      <AppIcon name="caret-right" weight="bold" size={18} className="shrink-0 text-ink-secondary" />
    </button>
  );
}

/** «Pagó»: grupo de radio con las dos personas (avatar, nombre). Flechas ← → cambian y mueven el foco. */
function PayerGroup({ members, value, onChange, firstRef }: { members: readonly SheetMember[]; value: string; onChange: (id: string) => void; firstRef?: RefObject<HTMLButtonElement | null> }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const list = sorted(members);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = list.length - 1;
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, ArrowDown: index === last ? 0 : index + 1, ArrowUp: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onChange(list[next].userId);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={copy.shared.split.payer} className="flex rounded-[var(--radius-md)] bg-sunken p-[3px] shadow-[var(--comp-field-inset)]">
      {list.map((member, index) => {
        const selected = member.userId === value;
        return (
          <button
            key={member.userId}
            ref={(node) => { refs.current[index] = node; if (selected && firstRef) firstRef.current = node; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(member.userId)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[11px] px-2 text-[length:var(--label-m-size)] font-semibold text-ink ${selected ? "bg-[var(--comp-segmented-knob-bg)] shadow-raised" : ""}`}
          >
            <Avatar person={member.joinOrder} initial={initialOf(member.name)} size={24} />
            <span className="truncate">{member.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Pesos con puntos de miles en un campo de texto: lo escrito se guarda solo como dígitos. */
const grouped = (digits: string) => (digits === "" ? "" : new Intl.NumberFormat("es-CO").format(Number(digits)));
const digitsOf = (text: string) => text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9);

function PartField({ name, value, suffix, prefix, onChange, disabled }: { name: string; value: string; suffix?: string; prefix?: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="flex h-11 w-[8.25rem] shrink-0 items-center gap-1 rounded-[12px] bg-sunken px-3 text-[0.9375rem] font-semibold text-ink shadow-[var(--comp-field-inset)] focus-within:outline-[length:var(--border-focus)] focus-within:outline-offset-[var(--focus-offset)] focus-within:outline-focus focus-within:outline-solid has-[:disabled]:opacity-60">
      <span className="sr-only">{name}</span>
      {prefix ? <span aria-hidden="true" className="text-ink-secondary">{prefix}</span> : null}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="done"
        value={prefix ? grouped(value) : value}
        disabled={disabled}
        onChange={(event) => onChange(digitsOf(event.target.value))}
        className="min-w-0 flex-1 bg-transparent text-right tabular-nums focus-visible:outline-none disabled:cursor-not-allowed"
      />
      {suffix ? <span aria-hidden="true" className="text-ink-secondary">{suffix}</span> : null}
    </label>
  );
}

/** La barra del reparto: un tramo por persona con su patrón y, si faltan pesos, el hueco punteado. Decorativa. */
function SplitBar({ members, draft, amountPesos, status }: { members: readonly SheetMember[]; draft: SplitDraft; amountPesos: number | null; status: SplitStatus }) {
  if (!amountPesos) return null;
  const total = BigInt(amountPesos);
  const list = sorted(members).filter((member) => draft.participants.includes(member.userId));
  const parts = status.kind === "ok"
    ? status.allocations.map((part) => ({ userId: part.userId, pesos: part.amount.amountMinor / 100n }))
    : list.map((member) => ({ userId: member.userId, pesos: draft.mode === "percent" ? (total * BigInt(Number(draft.percents[member.userId] ?? 0) || 0)) / 100n : BigInt(draft.amounts[member.userId] || "0") }));
  const sum = parts.reduce((acc, part) => acc + part.pesos, 0n);
  const scale = sum > total ? sum : total;
  const width = (pesos: bigint) => `${scale === 0n ? 0 : Number((pesos * 10000n) / scale) / 100}%`;
  return (
    <div aria-hidden="true" data-split-bar="" className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
      {parts.filter((part) => part.pesos > 0n).map((part) => {
        const member = members.find((m) => m.userId === part.userId)!;
        return <span key={part.userId} style={{ width: width(part.pesos) }} className={`h-full rounded-full ${personFill[member.joinOrder]}`} />;
      })}
      {sum < total ? <span style={{ width: width(total - sum) }} className="h-full rounded-full border-[1.5px] border-dashed border-border-emphasis" /> : null}
    </div>
  );
}

type SplitEditorProps = {
  members: readonly SheetMember[];
  draft: SplitDraft;
  onChange: (draft: SplitDraft) => void;
  amountPesos: number | null;
  statusId: string;
  /** Mover a Pareja (A2): el pagador es fijo, «Se mantiene» (ADR-001 punto 2). */
  payerFixed?: boolean;
  payerRef?: RefObject<HTMLButtonElement | null>;
  disabled?: boolean;
};

export function SplitEditor({ members, draft, onChange, amountPesos, statusId, payerFixed = false, payerRef, disabled = false }: SplitEditorProps) {
  const list = sorted(members);
  const status = evaluateSplit(draft, amountPesos, members);
  const message = splitMessage(status);
  const single = draft.participants.length === 1;
  const amounts = shownAmounts(draft, amountPesos, members);
  const payer = members.find((member) => member.userId === draft.payerUserId) ?? list[0];
  const partOf = (userId: string) => (status.kind === "ok" ? status.allocations.find((part) => part.userId === userId)?.amount : undefined);

  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span aria-hidden="true" className={label}>{copy.shared.split.payer}</span>
        {payerFixed ? (
          <div className="flex min-h-11 items-center gap-2.5 border-b-[length:var(--border-hairline)] border-border">
            <Avatar person={payer.joinOrder} initial={initialOf(payer.name)} size={24} />
            <span className="flex-1 text-[0.9375rem] font-semibold text-ink">{payer.name}</span>
            <span className="text-[0.75rem] font-medium text-[var(--comp-field-muted-fg)]">{copy.move.kept}</span>
          </div>
        ) : (
          <PayerGroup members={members} value={draft.payerUserId} onChange={(id) => onChange({ ...draft, payerUserId: id })} firstRef={payerRef} />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <span aria-hidden="true" className={label}>{copy.shared.split.mode}</span>
        <Segmented<SplitMode>
          role="radiogroup"
          label={copy.shared.split.mode}
          stretch
          disabled={single || disabled}
          value={draft.mode}
          onValueChange={(mode) => onChange(setMode(draft, mode, members))}
          options={[{ value: "equal", label: copy.shared.mode.equal }, { value: "percent", label: copy.shared.mode.percent }, { value: "amount", label: copy.shared.mode.amount }]}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span aria-hidden="true" className={label}>{copy.shared.split.participants}</span>
        <ul className="flex flex-col divide-y-[length:var(--border-hairline)] divide-border">
          {list.map((member) => {
            const included = draft.participants.includes(member.userId);
            const part = partOf(member.userId);
            return (
              <li key={member.userId} className="flex min-h-14 items-center justify-between gap-3 py-1.5">
                <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 has-[:disabled]:cursor-not-allowed">
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={() => onChange(toggleParticipant(draft, member.userId, members))}
                    className="size-5 shrink-0 cursor-pointer accent-[var(--color-text-primary)] disabled:cursor-not-allowed"
                  />
                  <span className="min-w-0 truncate text-[0.9375rem] font-semibold text-ink">
                    {member.name}
                    {member.isMe ? <span className="ml-1.5 text-[0.8125rem] font-medium text-[var(--comp-field-muted-fg)]">{copy.shared.split.you}</span> : null}
                  </span>
                </label>
                {!included ? (
                  <span className="text-[0.8125rem] font-medium text-[var(--comp-field-muted-fg)]">{copy.shared.split.notParticipating}</span>
                ) : single ? (
                  <span className="text-[0.9375rem] font-semibold text-ink tabular-nums">{part ? `${formatMoney(part)} · 100 %` : "100 %"}</span>
                ) : draft.mode === "percent" ? (
                  <PartField name={copy.shared.split.percentOf(member.name)} value={draft.percents[member.userId] ?? ""} suffix="%" onChange={(value) => onChange({ ...draft, percents: { ...draft.percents, [member.userId]: value.slice(0, 3) } })} />
                ) : draft.mode === "amount" ? (
                  <PartField name={copy.shared.split.amountOf(member.name)} value={amounts[member.userId] ?? ""} prefix="$" onChange={(value) => onChange({ ...draft, amountsTouched: true, amounts: { ...amounts, [member.userId]: value } })} />
                ) : (
                  <span className="text-[0.9375rem] font-semibold text-ink tabular-nums">{part ? formatMoney(part) : ""}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <SplitBar members={members} draft={draft} amountPesos={amountPesos} status={status} />
      {/* El aviso: rol status y Guardar lo referencia con aria-describedby (2a, «Teclado y lector»). */}
      <p id={statusId} role="status" className={`flex min-h-5 items-start gap-1.5 text-[0.8125rem] leading-[1.45] font-medium ${message ? "text-danger" : "text-[var(--comp-field-muted-fg)]"}`}>
        {message ? <><AppIcon name="warning-circle" weight="bold" size={16} className="mt-px shrink-0" />{message}</>
          : single ? <><AppIcon name="info" size={16} className="mt-px shrink-0" />{copy.shared.split.singleNote(list.find((m) => draft.participants.includes(m.userId))!.name)}</> : null}
      </p>
    </fieldset>
  );
}

/** El subtítulo de la subhoja: «Mercado · $186.400». */
export const splitSubtitle = (category: string | null, amountPesos: number | null) =>
  copy.shared.split.subtitle(category ?? "", amountPesos ? formatMoney(moneyFromPesos(BigInt(amountPesos))) : "$0");
