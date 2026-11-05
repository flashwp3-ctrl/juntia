"use client";
// T045 / FR-022; 04·17: piezas comunes de las pantallas de acceso. Marca o «Volver» de 44 arriba, campo de contraseña
// con mostrar/ocultar y botón de envío con su estado de carga.
import Link from "next/link";
import { useState, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/es";

export function BackToSignIn({ href = "/entrar" }: { href?: string }) {
  return (
    <Link href={href} className="relative grid size-11 place-items-center rounded-[14px] bg-raised text-ink shadow-raised after:absolute after:inset-0 after:content-['']">
      <AppIcon name="caret-left" weight="bold" size={17} />
      <span className="sr-only">{copy.auth.back}</span>
    </Link>
  );
}

export function PasswordInput(props: Omit<ComponentProps<typeof Input>, "type" | "end">) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      end={
        <button
          type="button"
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
          className="relative -mr-2.5 grid size-11 shrink-0 place-items-center rounded-[12px] text-ink-secondary hover:text-ink"
        >
          <AppIcon name={visible ? "eye-slash" : "eye"} size={20} />
          <span className="sr-only">{visible ? copy.auth.fields.hidePassword : copy.auth.fields.showPassword}</span>
        </button>
      }
    />
  );
}

/** Envío con «Entrando…»/«Guardando…» mientras la acción corre; conserva el ancho (Button). */
export function SubmitButton({ children, pendingLabel, icon, variant = "primary" }: { children: string; pendingLabel: string; icon?: ComponentProps<typeof Button>["icon"]; variant?: "primary" | "secondary" | "ghost" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" variant={variant} icon={icon} loading={pending} loadingLabel={pendingLabel} className="w-full">
      {children}
    </Button>
  );
}

export const authLink = "font-semibold text-saving underline-offset-2 hover:underline";
