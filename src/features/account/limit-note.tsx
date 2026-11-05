// T047 / FR-055; COMPONENT_SPECIFICATIONS.md §LimitNote: nota informativa en `surface.sunken`, radio 16, ícono info,
// título 14/600 y texto 13. No es un control: sin caret, botón ni badge técnico.
import { AppIcon } from "@/components/ui/app-icon";

export function LimitNote({ title, description }: { title: string; description: string }) {
  return (
    <div role="note" className="flex items-start gap-3 rounded-[16px] bg-sunken px-4 py-3.5">
      <AppIcon name="info" size={20} className="mt-px shrink-0 text-ink-secondary" />
      <span className="flex min-w-0 flex-col gap-[3px]">
        <span className="text-[14px] leading-snug font-semibold text-ink">{title}</span>
        <span className="text-[13px] leading-[1.45] text-pretty text-ink-secondary">{description}</span>
      </span>
    </div>
  );
}
