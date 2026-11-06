// T068 / FR-037 (lectura); US-4.1. Detalle de solo lectura de un movimiento propio, al que se llega desde la fila de
// Actividad y de Inicio. En móvil, solo el detalle con «Volver»; desde 1280, el panel de 04·7 junto a la tabla del mes
// del movimiento. Ajeno, anulado o inexistente: el estado de JT010 («No encontramos este movimiento»). Editar y
// Eliminar llegan con el PR D (T082), dentro de TransactionDetail. F44-1: solo con la cookie de contexto en Yo se lee el movimiento y el mes. F44-4: el mes se valida y
// se lleva al intervalo navegable.
import Link from "next/link";
import { redirect } from "next/navigation";
import { exitLinkClass } from "@/components/shell/exit-link";
import { ExitState } from "@/components/shell/provisional-state";
import { ActivityScreen } from "@/features/activity/activity-screen";
import { loadMonth, loadTransaction, monthParam, today } from "@/features/activity/load";
import { DetailHeader, TransactionDetail } from "@/features/activity/transaction-detail";
import { LoadError } from "@/features/context/load-error";
import { copy } from "@/lib/copy/es";
import { serverContext } from "@/lib/server-context";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function TransactionPage({ params, searchParams }: Props) {
  const [{ id }, query, context] = await Promise.all([params, searchParams, serverContext()]);
  const now = today();
  // F44-1: sin cookie, con una no válida o en Nosotros, ni el movimiento ni el mes se leen.
  if (context !== "me") return <ActivityScreen server={context} data={null} today={now} />;
  const loaded = await loadTransaction(id, `/actividad/${id}`);
  const transaction = loaded.ok ? loaded.value : null;
  const requested = typeof query.mes === "string" ? monthParam(query.mes, now) : (transaction?.transactionDate.slice(0, 7) ?? now.slice(0, 7));
  const data = await loadMonth(requested, now, `/actividad?mes=${requested}`);
  if (data.ok && typeof query.mes === "string" && data.value.month !== query.mes) redirect(`/actividad/${encodeURIComponent(id)}?mes=${data.value.month}`);
  const month = data.ok ? data.value.month : requested;
  const back = `/actividad?mes=${month}`;
  const title = transaction?.type === "income" ? copy.detail.income : copy.detail.expense;
  const detail = !loaded.ok ? <LoadError /> : transaction ? <TransactionDetail transaction={transaction} closeHref={back} /> : (
    <ExitState
      icon="receipt"
      title={copy.detail.notFound.title}
      description={copy.detail.notFound.description}
      actions={<Link href={back} className={exitLinkClass}>{copy.detail.back}</Link>}
    />
  );
  return <ActivityScreen server="me" data={data} today={now} selectedId={transaction?.id} detail={detail} mobileHeader={<DetailHeader title={title} backHref={back} />} />;
}
