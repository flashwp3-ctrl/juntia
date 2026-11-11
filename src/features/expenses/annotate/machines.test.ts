// Las máquinas puras del proveedor de Anotar — capa: componentes (funciones puras, sin DOM). La hoja (una a la vez, clave y
// contexto por apertura, oculta mientras viaja la creación), el deshacer único de la 003 (F57-4, F57-6, F57-8, F57-9) y las
// filas en vuelo (F51-8, F51-12). E5 tiene su propia tabla en `reveal-machine.test.ts`.
import { describe, expect, it } from "vitest";
import { TIMED_OUT } from "@/features/shared/use-write";
import { moneyFromPesos } from "@/domain/money";
import type { PendingRow } from "../types";
import { confirm, drop, launch, ListRegistry, MAX_REFRESHES, NO_FLIGHTS, reconcile, refreshRound } from "./flights";
import { initialSheet, isBusy, reduceSheet, type SheetState } from "./sheet-machine";
import { blocksUndo, checkOutcome, mayRun, pendingOf, reduceUndo, sendOutcome, type UndoIntent, type UndoState } from "./undo-machine";

describe("hoja (sheet-machine)", () => {
  const open = (state: SheetState, key: string, context: "me" | "us" = "me") => reduceSheet(state, { type: "open", mode: { kind: "create" }, key, context });

  it("abrir monta la hoja con su clave y el contexto de la app en ese momento", () => {
    const state = open(initialSheet, "k1", "us");
    expect(state).toMatchObject({ phase: "open", mounted: true, key: "k1", context: "us" });
    expect(isBusy(state)).toBe(true);
  });

  it("una sola hoja a la vez: una segunda apertura, abierta u oculta, no cambia nada (ni la clave)", () => {
    const opened = open(initialSheet, "k1");
    expect(open(opened, "k2")).toBe(opened);
    const hidden = reduceSheet(opened, { type: "hide" });
    expect(open(hidden, "k2")).toBe(hidden);
  });

  it("guardar una creación la oculta y sigue ocupada; si falla, vuelve con la misma clave", () => {
    const hidden = reduceSheet(open(initialSheet, "k1"), { type: "hide" });
    expect(hidden).toMatchObject({ phase: "hidden", key: "k1", mounted: true });
    expect(isBusy(hidden)).toBe(true);
    expect(reduceSheet(hidden, { type: "restore" })).toMatchObject({ phase: "open", key: "k1" });
  });

  it("cerrar la libera y la deja montada; la apertura siguiente nace con otra clave y el contexto de entonces", () => {
    const closed = reduceSheet(open(initialSheet, "k1", "me"), { type: "close" });
    expect(closed).toMatchObject({ phase: "closed", mounted: true });
    expect(isBusy(closed)).toBe(false);
    expect(open(closed, "k2", "us")).toMatchObject({ phase: "open", key: "k2", context: "us" });
  });

  it("sin montar no hay nada que devolver; abierta, ocultar y devolver no cambian nada fuera de su fase", () => {
    expect(reduceSheet(initialSheet, { type: "restore" })).toBe(initialSheet);
    expect(reduceSheet(initialSheet, { type: "close" })).toBe(initialSheet);
    const opened = open(initialSheet, "k1");
    expect(reduceSheet(opened, { type: "restore" })).toBe(opened);
  });
});

describe("deshacer único (undo-machine)", () => {
  const intent = (id: string): UndoIntent => ({ action: "void_shared_expense", id, idempotencyKey: `clave-${id}`, send: async () => ({ status: "ok", value: null }), done: "", rejected: () => "", onOk: () => {} });
  const a = intent("a");
  const b = intent("b");
  const start = (state: UndoState, which: UndoIntent) => reduceUndo(state, { type: "start", intent: which });

  it("la intención se reserva desde que empieza; mientras, otra no corre y los «Deshacer» de otros avisos quedan bloqueados", () => {
    const running = start(null, a);
    expect(running).toEqual({ intent: a, phase: "running", checking: false });
    expect(mayRun(running, b)).toBe(false);
    expect(start(running, b)).toBe(running);
    expect(blocksUndo(running, "b")).toBe(true);
    expect(blocksUndo(running, "a")).toBe(false);
    expect(blocksUndo(null, "b")).toBe(false);
    // «En curso» todavía no es el aviso fijo.
    expect(pendingOf(running)).toBeNull();
  });

  it("ok o rechazo liberan la reserva", () => {
    expect(reduceUndo(start(null, a), { type: "settle", intent: a, outcome: { kind: "ok" } })).toBeNull();
    expect(reduceUndo(start(null, a), { type: "settle", intent: a, outcome: { kind: "rejected", error: "versionConflict" } })).toBeNull();
  });

  it("desconocido o sin constar dejan el aviso fijo; reintentar o comprobar es la misma intención («comprobando»)", () => {
    const unknown = reduceUndo(start(null, a), { type: "settle", intent: a, outcome: { kind: "unknown" } });
    expect(unknown).toEqual({ intent: a, phase: "unknown", checking: false });
    expect(pendingOf(unknown)).toBe(unknown);
    expect(mayRun(unknown, a)).toBe(true);
    expect(start(unknown, a)).toEqual({ intent: a, phase: "unknown", checking: true });
    expect(reduceUndo(unknown, { type: "settle", intent: a, outcome: { kind: "notFound" } })).toEqual({ intent: a, phase: "notFound", checking: false });
  });

  it("una respuesta se aplica por la identidad: tras cerrar el aviso fijo (confirmado), una respuesta tardía no toca nada", () => {
    const unknown = reduceUndo(start(null, a), { type: "settle", intent: a, outcome: { kind: "unknown" } });
    const dismissed = reduceUndo(unknown, { type: "dismiss" });
    expect(dismissed).toBeNull();
    expect(reduceUndo(dismissed, { type: "settle", intent: a, outcome: { kind: "unknown" } })).toBeNull();
    const other = start(null, b);
    expect(reduceUndo(other, { type: "settle", intent: a, outcome: { kind: "ok" } })).toBe(other);
  });

  it("15 s sin respuesta es desconocido; «Comprobar estado» distingue completado, sin constar y error", () => {
    expect(sendOutcome(TIMED_OUT)).toEqual({ kind: "unknown" });
    expect(sendOutcome({ status: "unknown" })).toEqual({ kind: "unknown" });
    expect(sendOutcome({ status: "ok", value: null })).toEqual({ kind: "ok" });
    expect(sendOutcome({ status: "rejected", error: "undoNotAvailable" })).toEqual({ kind: "rejected", error: "undoNotAvailable" });
    expect(checkOutcome(TIMED_OUT)).toEqual({ kind: "unknown" });
    expect(checkOutcome({ state: "error" })).toEqual({ kind: "unknown" });
    expect(checkOutcome({ state: "completed", value: null })).toEqual({ kind: "ok" });
    expect(checkOutcome({ state: "not_found" })).toEqual({ kind: "notFound" });
  });
});

describe("filas en vuelo (flights)", () => {
  const row = (key: string, date = "2026-11-05"): PendingRow => ({
    key, state: "saving",
    transaction: { id: `pending:${key}`, type: "expense", amount: moneyFromPesos(45000n), categoryId: "market", transactionDate: date, description: null, status: "active", version: 1, createdAt: "", updatedAt: "" },
  });

  it("nace «Guardando…» y el reintento con la misma clave no la duplica", () => {
    const once = launch(NO_FLIGHTS, row("k1"));
    const again = launch(confirm(once, "k1", "real"), row("k1"));
    expect(again).toHaveLength(1);
    expect(again[0]).toMatchObject({ state: "saving", savedId: undefined });
  });

  it("confirmada se queda con su id real hasta que una lista lo trae (a); otra clave no se toca", () => {
    const flights = confirm(launch(launch(NO_FLIGHTS, row("k1")), row("k2")), "k1", "real-1");
    expect(flights[0]).toMatchObject({ state: "confirmed", savedId: "real-1" });
    expect(flights[1]).toMatchObject({ state: "saving" });
    expect(reconcile(flights, ["otro"], false, () => true)).toBe(flights);
    expect(reconcile(flights, ["real-1"], false, () => true).map(({ key }) => key)).toEqual(["k2"]);
  });

  it("una revalidación sin el id retira la confirmada solo si ninguna lista montada es de su mes (b)", () => {
    const flights = confirm(launch(NO_FLIGHTS, row("k1", "2026-10-20")), "k1", "real-1");
    expect(reconcile(flights, [], true, (month) => month === "2026-10")).toBe(flights);
    expect(reconcile(flights, [], true, () => false)).toEqual([]);
    // Sin revalidación (la fila acaba de confirmarse), (b) no aplica.
    expect(reconcile(flights, [], false, () => false)).toBe(flights);
  });

  it("rechazo o desconocido la retiran", () => {
    expect(drop(launch(NO_FLIGHTS, row("k1")), ["k1"])).toEqual([]);
    const flights = launch(NO_FLIGHTS, row("k1"));
    expect(drop(flights, ["k9"])).toBe(flights);
  });

  it(`tope de revalidaciones (c): bajo ${MAX_REFRESHES} se pide otra; con ${MAX_REFRESHES} se retira en la ronda siguiente`, () => {
    const flights = confirm(confirm(launch(launch(NO_FLIGHTS, row("k1")), row("k2")), "k1", "r1"), "k2", "r2");
    expect(refreshRound(flights, new Map([["k1", MAX_REFRESHES - 1]]))).toEqual({ exhausted: [], live: ["k1", "k2"] });
    expect(refreshRound(flights, new Map([["k1", MAX_REFRESHES]]))).toEqual({ exhausted: ["k1"], live: ["k2"] });
    // Las que aún viajan no cuentan.
    expect(refreshRound(launch(NO_FLIGHTS, row("k3")), new Map())).toEqual({ exhausted: [], live: [] });
  });

  // Tabla de estados de la fila optimista frente a lo que informa una lista (`reconcile`). La de E5 está en reveal-machine.test.ts.
  const saving = launch(NO_FLIGHTS, row("k1"));
  const confirmed = confirm(saving, "k1", "real-1");
  const otherMonth = confirm(launch(NO_FLIGHTS, row("k1", "2026-10-20")), "k1", "real-1");
  it.each([
    { state: "«Guardando…» y la lista trae otros ids → se queda", flights: saving, ids: ["otro"], revalidated: true, mounted: true, left: ["k1"] },
    { state: "confirmada y la lista trae su id real → se retira (a): nunca las dos", flights: confirmed, ids: ["real-1"], revalidated: false, mounted: true, left: [] },
    { state: "confirmada, revalidación sin su id y una lista de su mes montada → se queda (sin hueco)", flights: confirmed, ids: ["otro"], revalidated: true, mounted: true, left: ["k1"] },
    { state: "confirmada de otro mes, revalidación sin su id y ninguna lista de su mes → se retira (b)", flights: otherMonth, ids: [], revalidated: true, mounted: false, left: [] },
    // #53 (F51-11), límite conocido: mientras la respuesta no llega no se sabe el id real, así que una lista que ya trae la real
    // no puede emparejarla y, durante ese intervalo, se ven las dos. Arreglarlo bien necesita que el cliente conozca el id antes
    // (un UUID generado en el cliente dentro de `create_transaction`): migración y contrato de función con su ADR. Sin heurísticas
    // de cliente (decisión del gestor, 11 nov 2026). Prueba de punta a punta: optimistic-isolation.test.tsx.
    { state: "límite conocido #53: «Guardando…» y la lista ya trae la real (id aún desconocido) → se queda; se ven las dos", flights: saving, ids: ["real-1"], revalidated: true, mounted: true, left: ["k1"] },
  ])("$state", ({ flights, ids, revalidated, mounted, left }) => {
    expect(reconcile(flights, ids, revalidated, () => mounted).map(({ key }) => key)).toEqual(left);
  });

  it("el registro de listas es por lista: su mes, sus contextos y sus ids; salir la borra", () => {
    const registry = new ListRegistry();
    const leaveHome = registry.enter("inicio", "2026-11", ["me", "us"]);
    registry.enter("nosotros", "2026-11", ["us"]);
    registry.report("inicio", "2026-11", ["a"]);
    // Un informe de otro mes (la lista cambió de mes) no pisa los ids.
    registry.report("nosotros", "2026-10", ["b"]);
    expect([...registry.snapshot()].map(({ month, contexts, ids }) => ({ month, contexts, ids: [...ids] }))).toEqual([
      { month: "2026-11", contexts: ["me", "us"], ids: ["a"] },
      { month: "2026-11", contexts: ["us"], ids: [] },
    ]);
    expect(registry.hasMonth("2026-11")).toBe(true);
    leaveHome();
    expect([...registry.snapshot()]).toHaveLength(1);
    expect(registry.hasMonth("2026-10")).toBe(false);
  });
});
