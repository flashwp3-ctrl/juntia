"use client";
// T081 / FR-033, FR-062; MOTION_SYSTEM.md §2 (E5): Inicio es de servidor; esta fila lee del proveedor de Anotar cuál es
// el movimiento recién guardado y lo resalta con el estado «nueva» de ExpenseRow.
import type { ComponentProps } from "react";
import { ExpenseRow } from "@/components/ui/expense-row";
import { useHighlightId } from "./annotate-provider";

export function HighlightRow(props: Omit<ComponentProps<typeof ExpenseRow>, "isNew">) {
  return <ExpenseRow {...props} isNew={useHighlightId() === props.transaction.id} />;
}
