"use client";
import { useCallback, useRef, useState } from "react";

/**
 * Un reductor puro con su estado también en una referencia. La referencia cambia en el acto: un segundo toque o una tecla en
 * el mismo cuadro ya ven el estado aplicado (una sola hoja a la vez, un deshacer a la vez); el estado pinta el mismo valor.
 * `reduce` es una función de módulo (estable).
 */
export function useMachine<S, E>(reduce: (state: S, event: E) => S, initial: S) {
  const [state, setState] = useState(initial);
  const ref = useRef(initial);
  const send = useCallback((event: E) => {
    const next = reduce(ref.current, event);
    if (next !== ref.current) {
      ref.current = next;
      setState(next);
    }
    return next;
  }, [reduce]);
  return [state, send, ref] as const;
}
