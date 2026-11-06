"use client";
// T045 / FR-022; US-1.7; 04·17 A6. PR B de la 003 (T034, FR-016): A6 recupera «Invitar a mi pareja» del comp, que la
// spec 002 quitó solo porque en P0-1 no había pareja (Q6). Dos tarjetas en un radiogroup (radios nativos: flechas y
// espacio del navegador), «Empezar por mi cuenta» elegida por defecto. «Continuar» completa la primera entrada y, con
// «Invitar a mi pareja», abre M3 en Mi pareja.
import { useActionState, useState } from "react";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { InlineNotice } from "@/components/ui/inline-notice";
import { copy } from "@/lib/copy/es";
import { completeFirstEntryAction, type FormState } from "./actions";
import { SubmitButton } from "./auth-ui";

const INVITE_PATH = "/cuenta/pareja?invitar=1";

function Choice({ value, checked, onChange, icon, tone, title, description }: { value: string; checked: boolean; onChange: () => void; icon: AppIconName; tone: string; title: string; description: string }) {
  return (
    <label className={`grid cursor-pointer grid-cols-[44px_minmax(0,1fr)] items-center gap-3 rounded-[20px] p-4 has-[:focus-visible]:outline-[length:var(--border-focus)] has-[:focus-visible]:outline-offset-[var(--focus-offset)] has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-solid ${checked ? "bg-raised shadow-[inset_0_0_0_2px_var(--color-text-primary),var(--elevation-raised)] lg:bg-overlay" : "shadow-[0_0_0_1.5px_var(--color-border)]"}`}>
      <input type="radio" name="start" value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span aria-hidden="true" className={`grid size-11 place-items-center rounded-[14px] ${tone}`}>
        <AppIcon name={icon} weight="duotone" size={22} />
      </span>
      <span className="flex flex-col gap-[3px]">
        <span className="text-[16px] font-semibold text-ink">{title}</span>
        <span className="text-[13px] leading-[1.4] text-ink-secondary">{description}</span>
      </span>
    </label>
  );
}

export function FirstEntry({ name, volver }: { name: string; volver: string }) {
  const [state, action] = useActionState<FormState, FormData>(completeFirstEntryAction, {});
  const [choice, setChoice] = useState<"start" | "invite">("start");
  return (
    <>
      <p aria-hidden="true" className="flex items-center gap-2 font-serif text-[26px] leading-none font-medium tracking-[-0.015em] text-ink lg:hidden">
        <span className="size-[9px] rounded-[3px] bg-primary" />
        {copy.shell.brand}
      </p>
      <h1 className="mt-6 font-serif text-[clamp(40px,12vw,48px)] leading-none font-medium tracking-[-0.01em] break-words text-ink lg:mt-2">{copy.auth.firstEntry.greeting(name)}</h1>
      <p className="text-[15px] leading-[1.5] text-ink-secondary">{copy.auth.firstEntry.description}</p>
      <div role="radiogroup" aria-label={copy.auth.firstEntry.howToStart} className="flex flex-col gap-2.5">
        <Choice value="start" checked={choice === "start"} onChange={() => setChoice("start")} icon="user" tone="bg-category-home-bg text-category-home-fg" title={copy.auth.firstEntry.startTitle} description={copy.auth.firstEntry.startDescription} />
        <Choice value="invite" checked={choice === "invite"} onChange={() => setChoice("invite")} icon="users-three" tone="bg-category-restaurants-bg text-category-restaurants-fg" title={copy.auth.firstEntry.inviteTitle} description={copy.auth.firstEntry.inviteDescription} />
      </div>
      <p className="text-[13px] leading-[1.45] text-ink-secondary">{copy.auth.firstEntry.noBudget}</p>
      {state.error ? <InlineNotice tone="danger" icon="wifi-slash">{state.error}</InlineNotice> : null}
      <form action={action}>
        <input type="hidden" name="volver" value={choice === "invite" ? INVITE_PATH : volver} />
        <SubmitButton icon="arrow-right" pendingLabel={copy.auth.firstEntry.continuing}>{copy.auth.firstEntry.continue}</SubmitButton>
      </form>
    </>
  );
}
