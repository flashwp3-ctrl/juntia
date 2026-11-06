// T068 / FR-037 (lectura); US-4.1. Detalle de solo lectura de un movimiento propio, al que se llega desde la fila de
// Actividad y de Inicio. En móvil, solo el detalle con «Volver»; desde 1280, el panel de 04·7 junto a la tabla del mes
// del movimiento. Ajeno, anulado o inexistente: el estado de JT010 («No encontramos este movimiento»). Editar y
// Eliminar llegan con el PR D (T082).
import Link from "next/link";
import { exitLinkClass } from "@/components/shell/exit-link";
import { ExitState } from "@/components/shell/provisional-state";
import { ActivityScreen } from "@/features/activity/activity-screen";
import { loadMonth, loadTransaction, monthParam, today } from "@/features/activity/load";
import { DetailHeader, TransactionDetail } from "@/features/activity/transaction-detail";
import { LoadError } from "@/features/context/load-error";
import { copy } from "@/lib/copy/es";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function TransactionPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const now = today();
  const loaded = await loadTransaction(id, `/actividad/${id}`);
  const transaction = loaded.ok ? loaded.value : null;
  const month = typeof query.mes === "string" ? monthParam(query.mes, now) : (transaction?.transactionDate.slice(0, 7) ?? now.slice(0, 7));
  const back = `/actividad?mes=${month}`;
  const data = await loadMonth(month, now, back);
  const title = transaction?.type === "income" ? copy.detail.income : copy.detail.expense;
  const detail = !loaded.ok ? <LoadError /> : transaction ? <TransactionDetail transaction={transaction} closeHref={back} /> : (
    <ExitState
      icon="receipt"
      title={copy.detail.notFound.title}
      description={copy.detail.notFound.description}
      actions={<Link href={back} className={exitLinkClass}>{copy.detail.back}</Link>}
    />
  );
  return <ActivityScreen data={data} month={month} today={now} selectedId={transaction?.id} detail={detail} mobileHeader={<DetailHeader title={title} backHref={back} />} />;
}
