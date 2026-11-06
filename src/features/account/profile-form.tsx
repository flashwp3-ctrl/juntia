"use client";
// T047 / FR-051; 04·14 P1–P5. P1 editando, P2 validación, P3 guardando, P4 guardado (Toast «Perfil actualizado.»), P5
// error que conserva lo escrito. T048: la sesión caducada usa el mismo patrón de error y tampoco pierde lo escrito.
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { AppIcon } from "@/components/ui/app-icon";
import { displayNameError, initialOf, normalizeDisplayName } from "@/domain/account";
import { copy } from "@/lib/copy/es";
import type { SaveNameResult } from "./types";

type Status = "editing" | "saved" | "failed" | "sessionExpired";
type ProfileFormProps = { initialName: string; email: string; save: (displayName: string) => Promise<SaveNameResult> };

export function ProfileForm({ initialName, email, save }: ProfileFormProps) {
  const [saved, setSaved] = useState(initialName);
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>("editing");
  const [pending, startTransition] = useTransition();
  const invalid = displayNameError(name) !== null;
  const showError = touched && invalid;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (invalid || pending) return;
    const value = normalizeDisplayName(name);
    setStatus("editing");
    startTransition(async () => {
      const result = await save(value);
      if (result.ok) {
        setSaved(result.displayName);
        setName(result.displayName);
        setTouched(false);
        setStatus("saved");
      } else if (result.error === "sessionExpired") setStatus("sessionExpired");
      else if (result.error === "invalid") setTouched(true);
      else setStatus("failed");
    });
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-[18px]">
      {status === "failed" ? <InlineNotice tone="danger" icon="warning-circle">{copy.account.profile.saveFailed}</InlineNotice> : null}
      {status === "sessionExpired" ? (
        <InlineNotice tone="danger" icon="warning-circle">
          {copy.errors.sessionExpired}{" "}
          <Link href={`/entrar?volver=${encodeURIComponent("/cuenta/perfil")}`} className="font-semibold underline underline-offset-2">{copy.account.signInAgain}</Link>
        </InlineNotice>
      ) : null}
      <div className="flex items-center gap-4">
        <Avatar person={1} initial={invalid ? "?" : initialOf(name)} size={88} />
        <p className="text-[13px] leading-[1.45] text-pretty text-ink-secondary">{copy.account.profile.avatarNote}</p>
      </div>
      <Input
        label={copy.account.profile.nameLabel}
        name="displayName"
        autoComplete="nickname"
        maxLength={120}
        placeholder={copy.account.profile.namePlaceholder}
        help={copy.account.profile.nameHelp}
        value={name}
        onChange={(event) => { setName(event.target.value); if (status !== "editing") setStatus("editing"); }}
        onBlur={() => setTouched(true)}
        error={showError ? copy.account.profile.errors.displayName : undefined}
      />
      <Input label={copy.account.profile.emailLabel} value={email} readOnly endIcon="lock-simple" help={copy.account.profile.emailHelp} fieldClassName="!bg-canvas border-[1.5px] border-dashed border-border !shadow-none" inputClassName="text-ink-secondary" />
      <InlineNotice icon="info">{copy.account.profile.authorshipNote}</InlineNotice>
      {/* Dos columnas iguales desde md: el ancho de los botones no depende del ancho del texto (ni de la fuente que llegue). */}
      <div className="mt-1 grid gap-2 md:grid-cols-2">
        <Button type="submit" size="lg" icon="check" loading={pending} loadingLabel={copy.primitives.saving} disabled={showError} className="md:order-2">{copy.account.profile.save}</Button>
        <Button variant="ghost" size="lg" disabled={pending || name === saved} onClick={() => { setName(saved); setTouched(false); setStatus("editing"); }}>{copy.account.profile.cancel}</Button>
      </div>
      {status === "saved" ? (
        <div role="status" className="flex items-center gap-2.5 rounded-[16px] bg-inverse px-4 py-3.5 text-[14px] font-medium text-[var(--color-surface-canvas)] shadow-overlay">
          <AppIcon name="check-circle" weight="fill" size={20} />
          {copy.account.profile.saved}
        </div>
      ) : null}
    </form>
  );
}
