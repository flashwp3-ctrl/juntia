// P0-1, PR B: el aviso en línea de los comps 04·14–04·17 («note»): radio 16, ícono de 20 y texto 13/500 en tinta.
// Informativo sobre `surface.sunken`, éxito sobre `saving.subtle` y error sobre `danger.subtle`. El error se anuncia
// (`role="alert"`); el éxito y la información, como estado (`role="status"`).
import type { ReactNode } from "react";
import { AppIcon, type AppIconName } from "./app-icon";

const tones = {
  info: { box: "bg-sunken", icon: "text-ink-secondary", weight: "fill" },
  success: { box: "bg-saving-subtle", icon: "text-saving", weight: "fill" },
  danger: { box: "bg-danger-subtle", icon: "text-danger", weight: "bold" },
} as const;

type InlineNoticeProps = { tone?: keyof typeof tones; icon: AppIconName; children: ReactNode; className?: string };

export function InlineNotice({ tone = "info", icon, children, className = "" }: InlineNoticeProps) {
  const look = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-[16px] px-3.5 py-3 text-[13px] leading-[1.45] font-medium text-ink ${look.box} ${className}`}>
      <AppIcon name={icon} weight={look.weight} size={20} className={`shrink-0 ${look.icon}`} />
      <span className="min-w-0 text-pretty">{children}</span>
    </div>
  );
}
