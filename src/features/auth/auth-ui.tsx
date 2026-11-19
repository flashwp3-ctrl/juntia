"use client";
// T045 / FR-022; 04·17: piezas comunes de las pantallas de acceso. Marca o «Volver» de 44 arriba, campo de contraseña
// con mostrar/ocultar y botón de envío con su estado de carga.
import Link from "next/link";
import { useState, type ComponentProps, type CSSProperties } from "react";
import { useFormStatus } from "react-dom";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/es";
import { longestWordEm } from "@/lib/text-fit";

/**
 * 005 · PR B (corrección 5, FR-042): título de las pantallas de acceso. Con el texto al 200 %, 2,5rem son 80 px y «Recuperar» o
 * «contraseña» no cabían a 390 (A4 397 px, A5 459 px). Como el título de las tarjetas de meta (F79-2), no pasa del tamaño en que
 * cabe entera su palabra más larga en el ancho del bloque: nunca se parte ni se recorta. A la escala normal ese tope no se
 * alcanza en ningún ancho de teléfono, así que mide 40 px como antes.
 */
export function AuthTitle({ children }: { children: string }) {
  return (
    <div className="@container">
      <h1 className="font-serif text-[min(2.5rem,calc(100cqi/var(--title-em)))] leading-none font-medium tracking-[-0.01em] text-ink" style={{ "--title-em": longestWordEm(children) } as CSSProperties}>{children}</h1>
    </div>
  );
}

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
    // 005 · PR B (CLS, FR-051): el contenido va centrado en un botón de todo el ancho; en Firefox el primer fotograma se pinta antes
    // que Onest y que su respaldo local, y «Entrar» se movía 9 px (parcial 44447680371). Texto en caja del ancho que mide en Onest.
    <Button type="submit" size="lg" variant={variant} icon={icon} loading={pending} loadingLabel={pendingLabel} className="w-full" stableWidth>
      {children}
    </Button>
  );
}

// F09 (auditoría Impeccable, nov 2026): los enlaces de acceso van en tinta subrayada. El verde de texto es solo ahorro
// destinado (DESIGN_SYSTEM §2.1, regla 2), así que la primera pantalla no lo usa con otro significado.
export const authLink = "font-semibold text-ink underline decoration-[1.5px] underline-offset-[3px] hover:decoration-2";
