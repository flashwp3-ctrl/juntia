"use client";
// T050 (spec 003, PR C) / FR-032; US-8.1; 04·10 A1. En el detalle de un gasto privado propio, con la pareja activa, el botón
// secundario «Mover a Pareja» con su explicación. Un ingreso no lo tiene (§7.3) y sin pareja activa no aparece. Abre el
// diálogo del proveedor (A2–A5), que vive por encima de las rutas para que A4 sobreviva a la navegación.
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/es";
import { useAnnotate } from "./annotate-provider";
import type { SavedTransaction } from "./types";

export function MoveToCouple({ transaction }: { transaction: SavedTransaction }) {
  const { couple, sharedActions, openMove } = useAnnotate();
  if (!couple || !sharedActions?.reclassify || transaction.type !== "expense") return null;
  const partner = couple.members.find((member) => !member.isMe)?.name ?? "";
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] bg-sunken p-3.5">
      <Button variant="secondary" size="lg" icon="users-three" className="w-full" onClick={(event) => openMove(transaction, event.currentTarget)}>
        {copy.move.action}
      </Button>
      <p className="text-[length:var(--body-s-size)] leading-[var(--body-s-line)] text-[var(--comp-field-muted-fg)]">{copy.move.explain(partner)}</p>
    </div>
  );
}
