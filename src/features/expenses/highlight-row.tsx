"use client";
// T081 / FR-033, FR-062; MOTION_SYSTEM.md §2 (E5): Inicio es de servidor; esta fila lee del proveedor de Anotar cuál es
// el movimiento recién guardado y lo resalta con el estado «nueva» de ExpenseRow.
import type { ComponentProps, ReactNode } from "react";
import { ExpenseRow } from "@/components/ui/expense-row";
import { useHighlightId } from "./annotate-provider";

export function HighlightRow(props: Omit<ComponentProps<typeof ExpenseRow>, "isNew">) {
  return <ExpenseRow {...props} isNew={useHighlightId() === props.transaction.id} />;
}

/**
 * F69-6: la fila de tu parte de un compartido en Inicio de Yo (no es un enlace como ExpenseRow). Lleva el id del gasto para que
 * E5 la encuentre y el mismo estado «nueva».
 */
export function HighlightSharedPart({ id, className, children }: { id: string; className: string; children: ReactNode }) {
  const isNew = useHighlightId() === id;
  return (
    <div data-shared-part="" data-transaction-id={id} data-new={isNew ? "" : undefined} className={`${className} data-[new]:motion-safe:animate-[row-new_1.2s_ease-out] data-[new]:motion-reduce:bg-saving-subtle`}>
      {children}
    </div>
  );
}
