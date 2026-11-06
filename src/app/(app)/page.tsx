// T066 / FR-040–FR-045; US-5. Inicio del mes en curso (America/Bogota) en Yo, con los movimientos reales de la persona
// (vista my_transactions); en Nosotros, «todavía no disponible» (Q5). La carga muestra loading.tsx con la geometría
// final; un fallo de lectura, el estado de error con Reintentar. Sustituye el estado vacío provisional de la 001.
// F44-1: con la cookie de contexto en Nosotros, la página no lee movimientos ni construye la vista privada.
import { loadRows, today } from "@/features/activity/load";
import { ContextView } from "@/features/context/context-view";
import { LoadError } from "@/features/context/load-error";
import { HomeHeader } from "@/features/home/home-header";
import { HomeSkeleton } from "@/features/home/home-skeleton";
import { HomeView } from "@/features/home/home-view";
import { serverContext } from "@/lib/server-context";

export default async function HomePage() {
  const context = await serverContext();
  const now = today();
  const month = now.slice(0, 7);
  const rows = context === "me" ? await loadRows(month, "/") : null;
  return (
    <>
      <HomeHeader />
      <ContextView
        server={context}
        pending={<HomeSkeleton />}
        me={rows ? (rows.ok ? <HomeView rows={rows.value} month={month} today={now} /> : <LoadError />) : null}
      />
    </>
  );
}
