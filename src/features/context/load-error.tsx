"use client";
// T066, T067 / FR-042, FR-049; US-5.6; 04·6 «ERROR DE RED». La lectura falló (red, servidor o sesión que no se pudo
// validar): se dice sin el mensaje técnico, se recuerda que lo guardado sigue a salvo y Reintentar vuelve a pedir los
// datos al servidor (router.refresh). Sin red no se guarda nada y la interfaz lo dice (handoff, «Reglas de negocio»).
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ExitState } from "@/components/shell/provisional-state";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/es";

export function LoadError() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <ExitState
      danger
      icon="wifi-slash"
      title={copy.load.error.title}
      description={copy.load.error.description}
      actions={
        <Button variant="secondary" icon="arrow-clockwise" loading={pending} loadingLabel={copy.primitives.loading} onClick={() => start(() => router.refresh())}>
          {copy.states.retry}
        </Button>
      }
    />
  );
}
