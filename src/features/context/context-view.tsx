"use client";
// T066 / FR-043; US-5.3 (Q5). Nosotros, en todos los destinos, enseña «todavía no disponible» sin ninguna cifra ni dato
// privado; Yo enseña la pantalla real. F44-1 (revisión del PR #44, dos rondas): el servidor pinta según la cookie
// `juntia_context` (`server`) y solo construye la vista privada (`me`) cuando la cookie dice Yo.
// - `server` es `null` sin cookie o con una no válida: antes de hidratar se pinta `pending` (el Skeleton con la
//   geometría final) y, al lado, el estado de Nosotros; CSS enseña uno según el contexto recordado (<html data-context>,
//   globals.css). Al hidratar, el cliente resuelve la preferencia, escribe la cookie y pide la página otra vez.
// - Si la elección del dispositivo no coincide con lo que pintó el servidor (cookie de otra pestaña, enlace precargado
//   en el otro contexto), se reescribe la cookie y se pide la página otra vez; mientras tanto, Yo enseña `pending`.
//   Nosotros nunca enseña lo que trajo una respuesta de Yo.
// PR C de la 003 (T048; FR-037–FR-040): con la pareja activa, Nosotros tiene datos. `us` es lo que el servidor construyó
// para Nosotros y solo se enseña si el servidor pintó Nosotros (cookie `us` y membresía activa comprobada); si no (cookie
// ausente, no válida o de Yo), Nosotros enseña su Skeleton hasta que llega el RSC nuevo, nunca cifras del otro contexto.
// Sin pareja activa, Nosotros sigue «todavía no disponible», que no tiene datos.
// PR D de la 003 (T064; FR-040, FR-050; US-9; MOTION_SYSTEM §1): S1 Context Transition. La perilla ya se desliza (Segmented,
// spring snappy). Lo exclusivo del contexto anterior sale en el acto (FR-040: ni un cuadro de sus cifras bajo el contexto
// nuevo); el Skeleton del nuevo no anima; cuando llegan sus datos (el RSC nuevo), sus bloques entran con y 8 → 0 y opacidad
// en stagger (`data-s1="entering"`, globals.css) y el número héroe cuenta desde el anterior (HeroMemory). Volver a tocar a
// mitad devuelve la vista anterior en el acto si sus datos siguen siendo los del servidor, y el contador sigue desde donde
// iba. Con movimiento reducido, cambio inmediato con el valor final; el anuncio «Ahora ves: …» es del ContextProvider.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { createHeroMemory, HeroMemoryContext } from "./hero-memory";
import { useContextChoice } from "@/components/shell/context-selector";
import { UsUnavailable } from "./us-unavailable";
import { useAccount } from "@/features/account/account-context";
import { writeContextCookie, type ContextChoice } from "@/lib/context-preference";

type ContextViewProps = { me: ReactNode; server: ContextChoice | null; pending?: ReactNode; us?: ReactNode; usPending?: ReactNode };

export function ContextView({ me, server, pending = null, us, usPending }: ContextViewProps) {
  const { value, hydrated } = useContextChoice();
  const router = useRouter();
  const asked = useRef<ContextChoice | null>(null);
  useEffect(() => {
    if (!hydrated || value === server || asked.current === value) return;
    asked.current = value;
    writeContextCookie(value);
    router.refresh();
  }, [hydrated, value, server, router]);
  const active = useAccount()?.couple === "active";
  // S1: un cambio de contexto hecho en esta página (no el de la hidratación) arma la memoria del contador y marca la vista
  // que entra cuando ya tiene sus datos. La marca se retira pasada la coreografía (420 ms).
  const reduced = usePrefersReducedMotion();
  const [memory] = useState(createHeroMemory);
  const [seen, setSeen] = useState({ value, hydrated });
  const [entering, setEntering] = useState<ContextChoice | null>(null);
  if (seen.value !== value || seen.hydrated !== hydrated) {
    setSeen({ value, hydrated });
    if (seen.hydrated && hydrated && seen.value !== value) setEntering(reduced ? null : value);
  }
  // Armar la memoria es un efecto: antes de que monte el contador de la vista nueva, que llega con su RSC.
  useEffect(() => { if (entering) memory.arm(); else memory.disarm(); }, [entering, memory]);
  const arrived = entering !== null && entering === value && server === value;
  useEffect(() => {
    if (!arrived) return;
    const done = window.setTimeout(() => { setEntering(null); memory.disarm(); }, 600);
    return () => window.clearTimeout(done);
  }, [arrived, memory]);
  const s1 = arrived ? "entering" : undefined;
  // Lo que el servidor construyó para Nosotros solo vale si el servidor pintó Nosotros; si no, el Skeleton (o, sin pareja,
  // el estado sin datos).
  const unavailable = server === "us" ? (us ?? <UsUnavailable />) : active ? (usPending ?? pending) : <UsUnavailable />;
  let view: ReactNode;
  if (!hydrated) {
    view = server === "us" ? <div key="us">{unavailable}</div> : (
      <>
        <div key="me" data-context-view="me">{server === "me" ? me : pending}</div>
        <div key="us-css" data-context-view="us">{unavailable}</div>
      </>
    );
  } else if (value === "us") view = <div key="us" data-s1={server === "us" ? s1 : undefined}>{unavailable}</div>;
  else view = <div key="me" data-context-view="me" data-s1={server === "me" ? s1 : undefined}>{server === "me" ? me : pending}</div>;
  return <HeroMemoryContext.Provider value={memory}>{view}</HeroMemoryContext.Provider>;
}
