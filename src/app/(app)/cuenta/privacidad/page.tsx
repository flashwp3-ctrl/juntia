// T047 / FR-055, FR-057; 04·16 D1. Qué es solo tuyo, Exportar (hoja D2; la descarga llega con el PR C) y «Eliminar tu
// cuenta» como LimitNote de no disponible (§15.6.1), no como control. Sin bloques de pareja: no existe en P0-1. Sin
// «Documentos»: P0-1 no tiene texto legal (Q9).
import { AppIcon } from "@/components/ui/app-icon";
import { ExportEntry } from "@/features/account/account-controls";
import { AccountPageTitle, MenuGroup, Tile } from "@/features/account/account-ui";
import { LimitNote } from "@/features/account/limit-note";
import { copy } from "@/lib/copy/es";

export const metadata = { title: copy.account.privacy.title };

export default function PrivacyPage() {
  return (
    <>
      <AccountPageTitle title={copy.account.privacy.title} />
      <MenuGroup title={copy.account.privacy.whoSees}>
        <div className="flex flex-col gap-2.5 pt-2">
          <div className="flex flex-col gap-2 rounded-[18px] px-4 py-3.5 shadow-[0_0_0_1.5px_var(--color-border-subtle)]">
            <span className="flex items-center gap-2.5"><Tile icon="lock-simple" tone="home" size={32} /><span className="text-[0.9375rem] font-semibold text-ink">{copy.account.privacy.onlyYou}</span></span>
            <ul className="flex list-disc flex-col gap-[3px] pl-[18px] text-[0.8125rem] leading-[1.45] text-ink-secondary">
              {copy.account.privacy.onlyYouItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <p className="flex items-start gap-2.5 py-1 text-[0.875rem] leading-[1.45] text-ink-secondary">
            <AppIcon name="users-three" size={18} className="mt-px shrink-0 text-ink" />
            {copy.account.privacy.partnerLater}
          </p>
        </div>
      </MenuGroup>
      <MenuGroup title={copy.account.privacy.yourData}>
        <ExportEntry />
        <div className="pt-2.5"><LimitNote title={copy.account.privacy.deleteTitle} description={copy.account.privacy.deleteDescription} detail={copy.account.privacy.deleteHowTo} /></div>
      </MenuGroup>
    </>
  );
}
