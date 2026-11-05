"use client";
// T045 / FR-022; US-1.7; 04·17 A6. El comp ofrece dos tarjetas en un radiogroup; P0-1 solo tiene «Empezar por mi cuenta»
// (Q6), así que se muestra como la tarjeta elegida, sin un grupo de una sola opción, y sin «Invitar a mi pareja».
import { useActionState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { InlineNotice } from "@/components/ui/inline-notice";
import { copy } from "@/lib/copy/es";
import { completeFirstEntryAction, type FormState } from "./actions";
import { SubmitButton } from "./auth-ui";

export function FirstEntry({ name, volver }: { name: string; volver: string }) {
  const [state, action] = useActionState<FormState, FormData>(completeFirstEntryAction, {});
  return (
    <>
      <p aria-hidden="true" className="flex items-center gap-2 font-serif text-[26px] leading-none font-medium tracking-[-0.015em] text-ink lg:hidden">
        <span className="size-[9px] rounded-[3px] bg-primary" />
        {copy.shell.brand}
      </p>
      <h1 className="mt-6 font-serif text-[clamp(40px,12vw,48px)] leading-none font-medium tracking-[-0.01em] break-words text-ink lg:mt-2">{copy.auth.firstEntry.greeting(name)}</h1>
      <p className="text-[15px] leading-[1.5] text-ink-secondary">{copy.auth.firstEntry.description}</p>
      <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3 rounded-[20px] bg-raised p-4 shadow-[inset_0_0_0_2px_var(--color-text-primary),var(--elevation-raised)] lg:bg-overlay">
        <span aria-hidden="true" className="grid size-11 place-items-center rounded-[14px] bg-category-home-bg text-category-home-fg">
          <AppIcon name="user" weight="duotone" size={22} />
        </span>
        <span className="flex flex-col gap-[3px]">
          <span className="text-[16px] font-semibold text-ink">{copy.auth.firstEntry.startTitle}</span>
          <span className="text-[13px] leading-[1.4] text-ink-secondary">{copy.auth.firstEntry.startDescription}</span>
        </span>
      </div>
      <p className="text-[13px] leading-[1.45] text-ink-secondary">{copy.auth.firstEntry.noBudget}</p>
      {state.error ? <InlineNotice tone="danger" icon="wifi-slash">{state.error}</InlineNotice> : null}
      <form action={action}>
        <input type="hidden" name="volver" value={volver} />
        <SubmitButton icon="arrow-right" pendingLabel={copy.auth.firstEntry.continuing}>{copy.auth.firstEntry.continue}</SubmitButton>
      </form>
    </>
  );
}
