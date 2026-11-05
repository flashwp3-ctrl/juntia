"use client";
// T047 / FR-028, FR-053; 04·14 (Cerrar sesión, separado por `border.strong`, en tinta y no en rojo), 04·16 S1–S3 y G1–G2;
// 04·18 (navegación de secciones en la columna de 360). Controles con estado de cliente de Mi cuenta.
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { AppIcon } from "@/components/ui/app-icon";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Modal } from "@/components/ui/modal";
import { signOut, type FormState } from "@/features/auth/actions";
import { copy } from "@/lib/copy/es";
import { useMediaQuery } from "@/lib/use-media-query";
import { requestPasswordChange } from "./actions";
import { Tile, type TileTone } from "./account-ui";
import type { AppIconName } from "@/components/ui/app-icon";

function SignOutRowButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" aria-busy={pending || undefined} disabled={pending} className="grid min-h-16 w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 text-left">
      <Tile icon="sign-out" tone="neutral" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-ink">{pending ? copy.account.signOut.loading : copy.account.signOut.label}</span>
        {pending ? null : <span className="text-[13px] leading-[1.4] text-ink-secondary">{copy.account.signOut.hint}</span>}
      </span>
      {pending ? <AppIcon name="circle-notch" weight="bold" size={18} className="text-ink motion-safe:animate-[button-spin_0.8s_linear_infinite]" /> : <span />}
    </button>
  );
}

/** C1 y la columna de escritorio: fila «Cerrar sesión». S1 cargando, S2 error en línea, S3 en Entrar. */
export function SignOutRow() {
  const [state, action] = useActionState<FormState, FormData>(signOut, {});
  return (
    <div className="mt-[30px] border-t-[length:var(--border-strong)] border-border-emphasis pt-1.5 xl:mt-2">
      <form action={action}><SignOutRowButton /></form>
      {state.error ? <InlineNotice tone="danger" icon="warning-circle">{state.error}</InlineNotice> : null}
    </div>
  );
}

function SignOutGhostButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="ghost" icon="sign-out" loading={pending} loadingLabel={copy.account.signOut.loading}>{copy.account.signOut.label}</Button>;
}

/** G1 «Esta sesión»: Cerrar sesión ghost. */
export function SignOutGhost() {
  const [state, action] = useActionState<FormState, FormData>(signOut, {});
  return (
    <div className="flex flex-col items-start gap-3 pt-3">
      <form action={action}><SignOutGhostButton /></form>
      {state.error ? <InlineNotice tone="danger" icon="warning-circle" className="self-stretch">{state.error}</InlineNotice> : null}
    </div>
  );
}

/** G1 → G2: «Cambiar contraseña» envía el enlace seguro al correo de la sesión. */
export function PasswordChange({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "sent" | "failed" | "sessionExpired">("idle");
  const [pending, start] = useTransition();
  const sent = status === "sent";
  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        disabled={pending || sent}
        aria-busy={pending || undefined}
        onClick={() => start(async () => {
          const result = await requestPasswordChange();
          setStatus(result.ok ? "sent" : result.error === "sessionExpired" ? "sessionExpired" : "failed");
        })}
        className="grid min-h-16 w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 text-left"
      >
        <Tile icon="key" tone="transport" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-semibold text-ink">{pending ? copy.account.security.changing : copy.account.security.change}</span>
          <span className="text-[13px] leading-[1.4] text-ink-secondary">{sent ? copy.account.security.sentHint : copy.account.security.changeHint}</span>
        </span>
        {pending ? <AppIcon name="circle-notch" weight="bold" size={18} className="text-ink motion-safe:animate-[button-spin_0.8s_linear_infinite]" /> : sent ? <span /> : <AppIcon name="caret-right" size={18} className="text-ink-secondary" />}
      </button>
      {sent ? <InlineNotice tone="success" icon="check-circle">{copy.account.security.sent(email)}</InlineNotice> : null}
      {status === "failed" ? <InlineNotice tone="danger" icon="wifi-slash">{copy.errors.network}</InlineNotice> : null}
      {status === "sessionExpired" ? (
        <InlineNotice tone="danger" icon="warning-circle">
          {copy.errors.sessionExpired}{" "}
          <Link href={`/entrar?volver=${encodeURIComponent("/cuenta/seguridad")}`} className="font-semibold underline underline-offset-2">{copy.account.signInAgain}</Link>
        </InlineNotice>
      ) : null}
    </div>
  );
}

const sections: readonly { href: string; icon: AppIconName; tone: TileTone; label: string; also?: string }[] = [
  { href: "/cuenta/perfil", icon: "user-circle", tone: "home", label: copy.account.menu.profile, also: "/cuenta" },
  { href: "/cuenta/pareja", icon: "users-three", tone: "restaurants", label: copy.account.menu.partner },
  { href: "/cuenta/apariencia", icon: "circle-half", tone: "entertainment", label: copy.account.menu.appearance },
  { href: "/cuenta/privacidad", icon: "shield-check", tone: "health", label: copy.account.menu.privacy },
  { href: "/cuenta/seguridad", icon: "key", tone: "transport", label: copy.account.menu.security },
];

/** 04·18: secciones de Mi cuenta en la columna de 360 (≥ 1280). La abierta lleva `aria-current` y la elevación. */
export function AccountSectionsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label={copy.account.sections} className="flex flex-col gap-0.5">
      {sections.map((section) => {
        const current = pathname === section.href || pathname === section.also;
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={current ? "page" : undefined}
            className={`flex min-h-[52px] items-center gap-3 rounded-[16px] px-2.5 py-1.5 text-[15px] motion-safe:transition-colors motion-safe:duration-[var(--duration-instant)] ${current ? "bg-overlay font-semibold text-ink shadow-raised" : "font-medium text-ink hover:bg-sunken"}`}
          >
            <Tile icon={section.icon} tone={section.tone} size={34} />
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** D1 «Exportar mis datos» → hoja D2 (diálogo de 520 desde 768). La descarga real (D3–D5) llega con el PR C. */
export function ExportEntry() {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"json" | "csv">("json");
  const wide = useMediaQuery("(min-width: 768px)");
  const Container = wide ? Modal : BottomSheet;
  const formats = [
    { value: "json" as const, label: copy.account.export.json, hint: copy.account.export.jsonHint },
    { value: "csv" as const, label: copy.account.export.csv, hint: copy.account.export.csvHint },
  ];
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="grid min-h-16 w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 text-left">
        <Tile icon="download-simple" tone="services" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-semibold text-ink">{copy.account.privacy.export}</span>
          <span className="text-[13px] leading-[1.4] text-ink-secondary">{copy.account.privacy.exportHint}</span>
        </span>
        <AppIcon name="caret-right" size={18} className="text-ink-secondary" />
      </button>
      <Container open={open} onOpenChange={setOpen} title={copy.account.export.title} closeLabel={copy.account.export.close}>
        <div role="radiogroup" aria-label={copy.account.export.format} className="flex flex-col gap-2">
          {formats.map((option) => {
            const selected = option.value === format;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setFormat(option.value)}
                onKeyDown={(event) => {
                  if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
                  event.preventDefault();
                  const next = option.value === "json" ? "csv" : "json";
                  setFormat(next);
                  (event.currentTarget.parentElement?.querySelector(`[data-format="${next}"]`) as HTMLElement | null)?.focus();
                }}
                data-format={option.value}
                className={`grid grid-cols-[minmax(0,1fr)_24px] items-center gap-3 rounded-[16px] px-3.5 py-3 text-left ${selected ? "bg-sunken shadow-[inset_0_0_0_2px_var(--color-text-primary)]" : "shadow-[0_0_0_1.5px_var(--color-border-subtle)]"}`}
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold text-ink">{option.label}</span>
                  <span className="text-[12px] leading-[1.4] text-[var(--comp-field-muted-fg)]">{option.hint}</span>
                </span>
                <span aria-hidden="true" className={`grid size-[22px] place-items-center rounded-full border-2 ${selected ? "border-ink" : "border-border-emphasis"}`}>
                  {selected ? <span className="size-2.5 rounded-full bg-ink" /> : null}
                </span>
              </button>
            );
          })}
        </div>
        <ul className="flex flex-col text-[14px] leading-[1.45] text-ink-secondary">
          {[["check", copy.account.export.includes], ["lock-simple", copy.account.export.excludes], ["info", copy.account.export.notRestore]].map(([icon, text]) => (
            <li key={text} className="flex items-start gap-2.5 py-[7px]"><AppIcon name={icon as AppIconName} size={18} className="mt-px shrink-0 text-ink" />{text}</li>
          ))}
        </ul>
        <InlineNotice icon="clock">{copy.account.export.comingSoon}</InlineNotice>
      </Container>
    </>
  );
}
