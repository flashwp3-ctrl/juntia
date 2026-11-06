// T066 / FR-040–FR-045; US-5. Inicio del mes en curso (America/Bogota) en Yo, con los movimientos reales de la persona
// (vista my_transactions); en Nosotros, «todavía no disponible» (Q5). La carga muestra loading.tsx con la geometría
// final; un fallo de lectura, el estado de error con Reintentar. Sustituye el estado vacío provisional de la 001.
import { loadRows, today } from "@/features/activity/load";
import { ContextView } from "@/features/context/context-view";
import { LoadError } from "@/features/context/load-error";
import { HomeHeader } from "@/features/home/home-header";
import { HomeView } from "@/features/home/home-view";

export default async function HomePage() {
  const now = today();
  const month = now.slice(0, 7);
  const rows = await loadRows(month, "/");
  return (
    <>
      <HomeHeader />
      <ContextView me={rows.ok ? <HomeView rows={rows.value} month={month} today={now} /> : <LoadError />} />
    </>
  );
}
