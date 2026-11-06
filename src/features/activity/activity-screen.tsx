// T067, T068 / FR-046–FR-049; 04·1 ACTIVIDAD y 04·7. La pantalla de Actividad para /actividad y /actividad/[id]: por
// debajo de 1280, la lista o (con un movimiento elegido) solo su detalle; desde 1280, la tabla con el panel de 400 a la
// derecha (RESPONSIVE_SPECIFICATIONS.md, 2xl). Sin movimiento elegido, el panel invita a elegir uno: así la geometría de
// la tabla no cambia al abrir o cerrar el detalle. F44-1: en Nosotros (`server`), la página no lee nada y `data` es null.
import type { ReactNode } from "react";
import { PageHeader } from "@/components/shell/app-shell";
import { ContextView } from "@/features/context/context-view";
import { LoadError } from "@/features/context/load-error";
import { ActivitySkeleton } from "@/features/home/home-skeleton";
import { copy } from "@/lib/copy/es";
import type { ContextChoice } from "@/lib/context-preference";
import { AppIcon } from "@/components/ui/app-icon";
import { ActivityView } from "./activity-view";
import type { MonthData } from "./load";

type ActivityScreenProps = {
  server: ContextChoice;
  data: { ok: true; value: MonthData } | { ok: false } | null;
  today: string;
  selectedId?: string;
  detail?: ReactNode;
  mobileHeader?: ReactNode;
};

function PickPanel() {
  return (
    <div className="hidden flex-col items-start gap-3 rounded-[var(--radius-xl)] border-[length:var(--border-strong)] border-dashed border-border-emphasis p-6 xl:flex">
      <AppIcon name="receipt" weight="duotone" size={28} className="text-ink-secondary" />
      <p className="font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.detail.pick.title}</p>
      <p className="text-[length:var(--body-m-size)] text-ink-secondary">{copy.detail.pick.description}</p>
    </div>
  );
}

export function ActivityScreen({ server, data, today, selectedId, detail, mobileHeader }: ActivityScreenProps) {
  const opened = Boolean(detail);
  const list = !data ? null : data.ok
    ? <ActivityView rows={data.value.rows} month={data.value.month} today={today} navigation={data.value.navigation} selectedId={selectedId} />
    : <LoadError />;
  return (
    <>
      <div className={opened ? "max-xl:hidden" : undefined}><PageHeader title={copy.nav.activity} /></div>
      {mobileHeader}
      <ContextView
        server={server}
        pending={<ActivitySkeleton />}
        me={data ? (
          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start xl:gap-8">
            <div className={`min-w-0 ${opened ? "max-xl:hidden" : ""}`}>{list}</div>
            <aside aria-label={copy.detail.panel} className="xl:sticky xl:top-10 xl:mt-8">{detail ?? <PickPanel />}</aside>
          </div>
        ) : null}
      />
    </>
  );
}
