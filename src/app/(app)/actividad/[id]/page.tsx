// T068 / FR-037 (lectura); US-4.1. Detalle de solo lectura de un movimiento propio, al que se llega desde la fila de
// Actividad y de Inicio. En móvil, solo el detalle con «Volver»; desde 1280, el panel de 04·7 junto a la tabla del mes
// del movimiento. Ajeno, anulado o inexistente: el estado de JT010 («No encontramos este movimiento»). F44-1: solo con la
// cookie de contexto en Yo se lee el movimiento privado y el mes. F44-4: el mes se valida y se lleva al intervalo navegable.
// PR C de la 003 (T047, T049, T050): en Nosotros con la pareja activa, el detalle de un gasto compartido (`couple_expenses`)
// junto a la tabla del mes compartido; un id privado ahí no existe (nada privado se lee). En Yo, el detalle privado ofrece
// «Mover a Pareja» con la pareja activa.
import Link from "next/link";
import { redirect } from "next/navigation";
import { exitLinkClass } from "@/components/shell/exit-link";
import { StableLabel } from "@/components/ui/stable-label";
import { ExitState } from "@/components/shell/provisional-state";
import { ActivityScreen } from "@/features/activity/activity-screen";
import { loadMonth, loadTransaction, monthParam, today } from "@/features/activity/load";
import { SharedDetail } from "@/features/activity/shared-detail";
import { DetailHeader, TransactionDetail } from "@/features/activity/transaction-detail";
import { activeCouple, loadCoupleMonth, loadSettlement, loadSharedExpense } from "@/features/couple/shared-load";
import { SettlementDetail } from "@/features/balance/settlement-detail";
import { LoadError } from "@/features/context/load-error";
import { copy } from "@/lib/copy/es";
import { serverContext } from "@/lib/server-context";
import { goalPeople, loadGoalActivity } from "@/features/goals/load";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function NotFound({ back }: { back: string }) {
  return (
    <ExitState
      icon="receipt"
      title={copy.detail.notFound.title}
      description={copy.detail.notFound.description}
      actions={<Link href={back} className={exitLinkClass}><StableLabel text={copy.detail.back} /></Link>}
    />
  );
}

export default async function TransactionPage({ params, searchParams }: Props) {
  const [{ id }, query, context] = await Promise.all([params, searchParams, serverContext()]);
  const now = today();
  if (context === "us") {
    const members = await activeCouple();
    if (!members) return <ActivityScreen server="us" data={null} today={now} couple={null} />;
    const loaded = await loadSharedExpense(id, `/actividad/${id}`);
    const expense = loaded.ok ? loaded.value : null;
    // PR D (T062): una liquidación tiene el mismo lugar que un gasto compartido, con «Anular».
    const settled = loaded.ok && !expense ? await loadSettlement(id, `/actividad/${id}`) : null;
    const settlement = settled?.ok ? settled.value : null;
    const requested = typeof query.mes === "string" ? monthParam(query.mes, now) : (expense?.transactionDate.slice(0, 7) ?? settlement?.settlementDate.slice(0, 7) ?? now.slice(0, 7));
    const data = await loadCoupleMonth(requested, now, `/actividad?mes=${requested}`);
    if (data.ok && typeof query.mes === "string" && data.value.month !== query.mes) redirect(`/actividad/${encodeURIComponent(id)}?mes=${data.value.month}`);
    const back = `/actividad?mes=${data.ok ? data.value.month : requested}`;
    const detail = !loaded.ok || (settled && !settled.ok) ? <LoadError /> : expense ? <SharedDetail expense={expense} members={members} closeHref={back} />
      : settlement ? <SettlementDetail settlement={settlement} members={members} closeHref={back} /> : <NotFound back={back} />;
    const title = settlement ? copy.balance.settlement.title : copy.detail.expense;
    // 004 PR C (T050): la lista de al lado conserva los asientos de metas compartidas del mes.
    const goals = data.ok ? await loadGoalActivity("us", data.value.month, back) : null;
    return <ActivityScreen server="us" data={null} today={now} couple={{ data, members }} selectedId={expense?.id ?? settlement?.id} detail={detail} mobileHeader={<DetailHeader title={title} backHref={back} />} goals={goals?.ok ? goals.value : null} />;
  }
  // F44-1: sin cookie o con una no válida, ni el movimiento ni el mes se leen.
  if (context !== "me") return <ActivityScreen server={context} data={null} today={now} />;
  const loaded = await loadTransaction(id, `/actividad/${id}`);
  const transaction = loaded.ok ? loaded.value : null;
  const requested = typeof query.mes === "string" ? monthParam(query.mes, now) : (transaction?.transactionDate.slice(0, 7) ?? now.slice(0, 7));
  const data = await loadMonth(requested, now, `/actividad?mes=${requested}`);
  if (data.ok && typeof query.mes === "string" && data.value.month !== query.mes) redirect(`/actividad/${encodeURIComponent(id)}?mes=${data.value.month}`);
  const month = data.ok ? data.value.month : requested;
  const back = `/actividad?mes=${month}`;
  const title = transaction?.type === "income" ? copy.detail.income : copy.detail.expense;
  const detail = !loaded.ok ? <LoadError /> : transaction ? <TransactionDetail transaction={transaction} closeHref={back} /> : <NotFound back={back} />;
  const [goals, people] = data.ok ? await Promise.all([loadGoalActivity("me", month, back), goalPeople()]) : [null, []];
  return <ActivityScreen server="me" data={data} today={now} selectedId={transaction?.id} detail={detail} mobileHeader={<DetailHeader title={title} backHref={back} />} goals={goals?.ok ? goals.value : null} goalPeople={people} />;
}
