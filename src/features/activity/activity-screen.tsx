// T067, T068 / FR-046–FR-049; 04·1 ACTIVIDAD y 04·7. La pantalla de Actividad para /actividad y /actividad/[id]: por
// debajo de 1280, la lista o (con un movimiento elegido) solo su detalle; desde 1280, la tabla con el panel de 400 a la
// derecha (RESPONSIVE_SPECIFICATIONS.md, 2xl). Sin movimiento elegido, el panel invita a elegir uno: así la geometría de
// la tabla no cambia al abrir o cerrar el detalle. F44-1: en Nosotros (`server`), la página no lee nada privado y `data` es null.
// PR C de la 003 (T049; FR-037, FR-046): en Nosotros con la pareja activa, `couple` trae los gastos compartidos y las
// liquidaciones del mes, leídos solo de vistas de grupo; la misma geometría de lista o tabla y panel.
import type { ReactNode } from "react";
import { PageHeader } from "@/components/shell/app-shell";
import { ContextView } from "@/features/context/context-view";
import { LoadError } from "@/features/context/load-error";
import { UsUnavailable } from "@/features/context/us-unavailable";
import { ActivitySkeleton } from "@/features/home/home-skeleton";
import type { CoupleMemberView } from "@/features/home/couple-home-view";
import type { CoupleMonthData } from "@/features/couple/shared-load";
import { copy } from "@/lib/copy/es";
import type { ContextChoice } from "@/lib/context-preference";
import { AppIcon } from "@/components/ui/app-icon";
import { ActivityView } from "./activity-view";
import { CoupleActivityView } from "./couple-activity-view";
import type { MonthData } from "./load";
import type { GoalActivityData, GoalPerson } from "@/features/goals/types";
import { ExpenseFundingProvider } from "@/features/expenses/goal-funding/funding-context";
import { PendingRequests } from "@/features/expenses/goal-funding/usage-request-card";

type ActivityScreenProps = {
  server: ContextChoice | null;
  data: { ok: true; value: MonthData } | { ok: false } | null;
  today: string;
  /** F69-7: el mes de la lista, para que el Skeleton de un contexto en carga cuente como lista de ese mes (ContextView). */
  listMonth?: string;
  selectedId?: string;
  detail?: ReactNode;
  mobileHeader?: ReactNode;
  /** Nosotros: `null` sin pareja activa (o fuera de Nosotros); si no, lo leído de las vistas de grupo. */
  couple?: { data: { ok: true; value: CoupleMonthData } | { ok: false }; members: CoupleMemberView[] } | null;
  /** 004 PR C (T050): asientos de metas del mes y lo apartado, del contexto que pinta el servidor; sin ellos, solo movimientos. */
  goals?: GoalActivityData | null;
  goalPeople?: readonly GoalPerson[];
};

function PickPanel() {
  return (
    <div className="hidden flex-col items-start gap-3 rounded-[var(--radius-xl)] border-[length:var(--border-strong)] border-dashed border-border-emphasis p-6 xl:@min-[59.5rem]/actividad:flex">
      <AppIcon name="receipt" weight="duotone" size={28} className="text-ink-secondary" />
      <p className="font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.detail.pick.title}</p>
      <p className="text-[length:var(--body-m-size)] text-ink-secondary">{copy.detail.pick.description}</p>
    </div>
  );
}

export function ActivityScreen({ server, data, today, selectedId, detail, mobileHeader, couple, goals, goalPeople, listMonth }: ActivityScreenProps) {
  const opened = Boolean(detail);
  // PR #117, defecto A (maestro, decisión 30): tabla + panel de 400 solo con la ventana en `xl` (1280, como siempre) Y con el
  // contenedor de Actividad de al menos 59.5rem (el `main` a 1280 al 100 %). Con la raíz al 200 %, 59.5rem son 1904 px y Actividad
  // va en una columna. Las dos condiciones a la vez en la rejilla, la tabla, la lista por días, la lista con detalle, el `sticky`
  // y `PickPanel` (ronda 3, F117-5: el contenedor solo, entre 1100 y 1279 con la barra lateral estrecha, ya medía más de 59.5rem).
  const layout = (list: ReactNode) => (
    <div className="@container/actividad">
      <div className="xl:@min-[59.5rem]/actividad:grid xl:@min-[59.5rem]/actividad:grid-cols-[minmax(0,1fr)_400px] xl:@min-[59.5rem]/actividad:items-start xl:@min-[59.5rem]/actividad:gap-8">
        <div className={`min-w-0 ${opened ? "max-xl:hidden @max-[59.5rem]/actividad:hidden" : ""}`}>{list}</div>
        <aside aria-label={copy.detail.panel} className="xl:@min-[59.5rem]/actividad:sticky xl:@min-[59.5rem]/actividad:top-10 xl:@min-[59.5rem]/actividad:mt-8">{detail ?? <PickPanel />}</aside>
      </div>
    </div>
  );
  const list = !data ? null : data.ok
    ? <ActivityView rows={data.value.rows} month={data.value.month} today={today} navigation={data.value.navigation} selectedId={selectedId} goalEntries={goals?.entries} goalPeople={goalPeople} setAsideMinor={goals?.setAsideMinor} />
    : <LoadError />;
  // 004 PR D (T062; FR-056, FR-071): en Nosotros, las solicitudes de fondos pendientes van arriba de la lista (B4 y B5).
  const requests = couple && goals?.requests?.length ? <div className="pt-5"><PendingRequests requests={goals.requests} people={couple.members} /></div> : null;
  const us = server !== "us" ? undefined : !couple ? <UsUnavailable /> : layout(couple.data.ok
    ? <>{requests}<CoupleActivityView expenses={couple.data.value.expenses} settlements={couple.data.value.settlements} month={couple.data.value.month} today={today} navigation={couple.data.value.navigation} members={couple.members} summary={couple.data.value.summary} selectedId={selectedId} goalEntries={goals?.entries} setAsideMinor={goals?.setAsideMinor} /></>
    : <LoadError />);
  // 004 PR D (T063, T064): el uso de metas de los gastos del mes, para la fila CON META, el detalle y Mover a Pareja.
  return (
    <ExpenseFundingProvider byTransaction={goals?.funding ?? {}} people={couple?.members ?? goalPeople ?? []}>
      <div className={opened ? "max-xl:hidden" : undefined}><PageHeader title={copy.nav.activity} /></div>
      {mobileHeader}
      <ContextView
        server={server}
        pending={<ActivitySkeleton />}
        listMonth={listMonth}
        me={data ? layout(list) : null}
        us={us}
      />
    </ExpenseFundingProvider>
  );
}
