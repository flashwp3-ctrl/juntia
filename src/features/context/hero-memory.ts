"use client";
// T064 (spec 003, PR D) / FR-050; US-9.1–9.2; MOTION_SYSTEM.md §1 («el importe héroe cuenta del valor anterior al nuevo» y
// «el contador apunta al nuevo destino sin reiniciar»). Al cambiar de contexto, el número héroe de la vista nueva es otro
// componente: esta memoria, que vive en ContextView y solo en memoria, guarda lo último que pintó el contador y, cuando
// ContextView la arma en un cambio de contexto, el contador que monta después cuenta desde ahí. Una sola lectura por
// contador (por su id, para que el doble montaje de StrictMode lea lo mismo); con movimiento reducido no se arma.
import { createContext, useContext } from "react";

export type HeroMemory = {
  /** Lo último que pintó un contador héroe, en unidades menores. */
  report: (amountMinor: bigint) => void;
  /** Arma la memoria: el próximo contador que monte cuenta desde el último valor pintado. */
  arm: () => void;
  disarm: () => void;
  /** Desde dónde cuenta el contador `id`, o `null` si no hay transición. */
  take: (id: string) => bigint | null;
};

export function createHeroMemory(): HeroMemory {
  let last: bigint | null = null;
  let armed = false;
  let owner: { id: string; from: bigint } | null = null;
  return {
    report: (amountMinor) => { last = amountMinor; },
    arm: () => { armed = last !== null; owner = null; },
    disarm: () => { armed = false; },
    take: (id) => {
      if (owner?.id === id) return owner.from;
      if (!armed || last === null) return null;
      armed = false;
      owner = { id, from: last };
      return last;
    },
  };
}

export const HeroMemoryContext = createContext<HeroMemory | null>(null);
export const useHeroMemory = () => useContext(HeroMemoryContext);
