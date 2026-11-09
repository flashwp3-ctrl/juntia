// T066 / FR-040–FR-045; US-5. Inicio del mes en curso (America/Bogota) en Yo, con los movimientos reales de la persona
// (vista my_transactions). La carga muestra loading.tsx con la geometría final; un fallo de lectura, el estado de error con
// Reintentar. Sustituye el estado vacío provisional de la 001.
// F44-1: con la cookie de contexto en Nosotros, la página no lee movimientos ni construye la vista privada.
// PR C de la 003 (T048; FR-037–FR-045; I3): en Nosotros, el servidor comprueba además la membresía activa y solo entonces
// lee las vistas de grupo (gasto del mes, saldo y recientes); sin pareja activa, «todavía no disponible» sin leer nada. En
// Yo con la pareja activa, `gasto_consumo` (privados + parte compartida) y las filas «Compartido · tu parte».
// 004 PR C (T050; FR-070): lo apartado del mes (`metric_months`) y las metas del contexto, aparte del héroe. En Nosotros,
// solo metas compartidas (FR-085); un fallo de esa lectura no tumba Inicio: el bloque de metas no se pinta.
import { loadRows, today } from "@/features/activity/load";
import { activeCouple, loadCoupleHome, loadMeShared } from "@/features/couple/shared-load";
import { ContextView } from "@/features/context/context-view";
import { LoadError } from "@/features/context/load-error";
import { UsUnavailable } from "@/features/context/us-unavailable";
import { CoupleHomeView } from "@/features/home/couple-home-view";
import { HomeHeader } from "@/features/home/home-header";
import { HomeSkeleton } from "@/features/home/home-skeleton";
import { HomeView } from "@/features/home/home-view";
import { serverContext } from "@/lib/server-context";
import { goalPeople, loadHomeGoals } from "@/features/goals/load";

export default async function HomePage() {
  const context = await serverContext();
  const now = today();
  const month = now.slice(0, 7);
  const members = context === null ? null : await activeCouple();
  const goalsContext = context === "me" || (context === "us" && members) ? context : null;
  const [rows, shared, couple, homeGoals] = await Promise.all([
    context === "me" ? loadRows(month, "/") : null,
    context === "me" && members ? loadMeShared(month, "/") : null,
    context === "us" && members ? loadCoupleHome(month, "/") : null,
    // Quién aparece en las metas y las metas del contexto, en paralelo con el resto de Inicio.
    goalsContext ? goalPeople().then((people) => loadHomeGoals(goalsContext, month, people, "/")) : null,
  ]);
  const goals = homeGoals?.ok ? homeGoals.value : undefined;
  const me = rows ? (rows.ok && (!shared || shared.ok) ? <HomeView rows={rows.value} month={month} today={now} shared={shared?.ok ? shared.value : undefined} goals={goals} /> : <LoadError />) : null;
  const us = context !== "us" ? undefined : !members || !couple ? <UsUnavailable />
    : couple.ok ? <CoupleHomeView month={month} today={now} summary={couple.value.summary} balance={couple.value.balance} rows={couple.value.rows} members={members} goals={goals} /> : <LoadError />;
  return (
    <>
      <HomeHeader />
      <ContextView server={context} pending={<HomeSkeleton />} me={me} us={us} />
    </>
  );
}
