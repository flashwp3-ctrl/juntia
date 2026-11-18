---

description: "Lista de tareas de la especificación 005 · Gate privado conjunto «funcional + espectacular» (P0-4)"
---

# Tasks: 005 · Gate privado conjunto «funcional + espectacular» (P0-4)

> En este archivo, `[P]` significa **paralelizable** (archivos distintos, sin
> dependencias). **No** es la marca de propuesta del paquete de diseño. Una
> tarea que implementa algo propuesto lo dice en palabras —«propuesta
> §15.9»— y nunca con la etiqueta suelta.

**Input**: `specs/005-gate-mvp-1/` — [spec.md](spec.md) (PR #84, `94675ca`, con Q1–Q12 del 17 nov 2026), [plan.md](plan.md), [research.md](research.md), [release-checklist.md](release-checklist.md) y [contracts/](contracts/) (PR #85, `f2a390b`, con D1–D4 del 18 nov 2026 y las correcciones F85-1 a F85-12).

**Status**: Draft — fase Tasks. No avanza a Implement sin el merge de su PR documental (ADR-012 §3.1).

**Cómo se escribió.** A partir de `.specify/templates/tasks-template.md` y de su override `.specify/templates/overrides/tasks-template.md`, a mano y con el mismo procedimiento que la 003 y la 004 (la skill `speckit-tasks` está marcada `disable-model-invocation`). La organización no sigue las historias de usuario sino **los diez pasos del orden de ejecución del plan** (0, 0b, 1 = PR A, 2, 3 = PR B, 4–9), porque P0-4 no construye historias: las verifica. Las historias se citan con `[USn]` en cada tarea. La pasada de consistencia que haría `speckit-analyze` está en el [Anexo B](#anexo-b--trazabilidad-y-consistencia).

**Quién lo ejecuta**: cada tarea nombra a su responsable:

- **Agente**: la sesión que implementa el PR (A, B o C), a partir de este archivo mergeado.
- **Gestor**: la sesión que coordina. Lanza los runs a mano, ejecuta las sondas y los ensayos, calcula y registra. No sustituye a una persona en lo que la spec pide a una persona.
- **Fundadores**: «los dos», «cada fundador», «un fundador» o «la dueña» (la fundadora dueña del repositorio, de Vercel y de Supabase), según la tarea.

**Las tareas no deciden y no amplían el alcance.** Si una no se puede cumplir sin decidir algo que no está en la spec, el plan o sus contratos, la implementación se detiene y lo reporta (`AGENTS.md` 17). Lo que obligó a decidir al desglosar está en [Decisiones abiertas](#decisiones-abiertas), marcado `[NECESITA DECISIÓN]`, sin cerrar.

**Tests**: se rigen por `docs/TESTING.md` y ADR-011, que prevalecen sobre
cualquier heurística genérica de generación de tests. Cada criterio va en **la
capa más baja que puede detectar su fallo** (`docs/TESTING.md` §4); cada tarea de
test nombra su capa, su archivo y el criterio que cubre. **No** se genera un
contract test por endpoint ni por interfaz (ADR-012 §4). La auditoría está en el
[Anexo A](#anexo-a--auditoría-de-las-tareas-de-test-adr-012-4).

**Specs E2E que añade este slice (obligatorio)**: **0** (FR-090; Q3, opción a). El total sigue en **5** de un tope de 4–6; la sexta plaza queda libre. Las cinco specs existentes corren completas sobre el commit candidato en Chromium (gate) y **una vez en WebKit** (job `release`, tramos `webkit-e2e-1` y `-2`). El único cambio en `tests/e2e/` es un `skip` fuera de Chromium (T021).

**Organization**: una fase por paso del plan. Dentro de cada fase, grupos en orden; dentro de un grupo, las `[P]` pueden ir a la vez.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable con las demás `[P]` **de su grupo**: archivos distintos, sin dependencias entre ellas y **sin competir por `juntia-dev`, por el mismo checkout, servidor o puerto, ni por un run de CI**. Una tarea que usa `juntia-dev`, compila, sirve la app o lanza CI no lleva `[P]`. En las tareas humanas, `[P]` significa que pueden hacerse el mismo día, en cualquier orden.
- **[Story]**: historia de la spec (US1…US7). Configuración, CI, evidencia y entrada al gate no llevan etiqueta.
- **Humana**: la ejecuta la persona que nombra; el agente la prepara y pega su salida, nunca la hace por su cuenta.
- Debajo de cada tarea:
  - **Cumple**: FR, SC y la decisión que aplica;
  - **Quién**;
  - **Depende de**;
  - **Evidencia**: **CI** (job en verde sobre el commit, con su run), **laboratorio** (medición rotulada, con método, emulación, navegador y versión), **dispositivo** (teléfono real, con fecha, modelo y versión del sistema) o **revisión** (valoración escrita de los fundadores o del gestor). Son los cuatro tipos de la spec, «Functional Requirements»;
  - **Terminado cuando**.

**Numeración.** Las tareas de la spec 004 que este gate cita se escriben **siempre con su prefijo**: **004-T084** (salida interna de P0-3) y **004-T085** (PR documental de cierre de P0-3). Sin prefijo, un número es de este archivo.

## Reglas que aplican a todas las tareas

Se enuncian una vez. Una tarea que las incumpla no está terminada.

1. **Capa más baja** (`docs/TESTING.md` §4 y §6). Cada test copia como comentario el criterio literal que cubre, con su referencia (FR, US o contrato). El código nuevo (comparador, guardia de entradas, borrado) se escribe con **su prueba primero y en rojo**. Las pruebas que cubren un comportamiento **que ya existe** (US-08, US-21, US-13, interpretación I8) pasan desde el principio; su capacidad de detectar el fallo se demuestra rompiendo el código a propósito en local, sin commitearlo, y se dice en la descripción del PR.
2. **Iterar contra `juntia-dev`, nunca contra el CI** (decisión 18; FR-091): `npm run db:dev:reset`, `test:db:dev`, `test:integration:dev` y `e2e:dev`, con su guardia y su lock; **un solo agente a la vez**. Mientras se itera, **solo las pruebas afectadas** (`npm run e2e:dev -- tests/a11y/routes.a11y.ts -g <caso>`, `--only-changed`); **`npm run e2e:dev` completo una vez**, justo antes del push final de cada PR de código, cuando el gestor lo pida. Su salida no es evidencia.
3. **Los agentes no lanzan CI** (`AGENTS.md` 15a; regla del gestor). Cada PR de código tiene **una** pasada del gate, la de marcarlo listo (`ready_for_review`), que hace el gestor tras la revisión con el PR en borrador. Las únicas pasadas a mano son las que este archivo nombra: el punto de control del PR A (T045), las de los pasos 2 y 4 y los parciales de `release` de un PR B (T069). Las correcciones de una revisión se juntan en **un solo push**. Ninguna se relanza «para ver si pasa» (FR-092): un fallo se diagnostica con el log del run.
4. **Dos `workflow_dispatch` sobre la misma rama se cancelan** (grupo `ci-<ref>`). Los runs a mano van **en serie**, nunca a la vez.
5. **Presupuestos que no se mueven** (FR-095; cláusula anticliquet). `e2e` y `a11y-session` < 660 s (bloquean); **ninguna prueba nueva lleva un job por encima de ~600 s**: lo que no cabe va a `@sweep` o al job `release`. Un tramo de `release` que mida más de 600 s se **parte** en dos, nunca se acorta quitando cargas ([contracts/ci.md](contracts/ci.md), F85-7).
6. **El PR A no modifica código de producto de `src/`**: solo puede añadir o modificar los `*.test.ts` y `*.test.tsx` que especifican T013, T015 y T016 (F86-4). Ningún PR de este slice añade dependencias, migraciones, pantallas ni specs E2E. El PR C solo toca `.md`, `.png` y `.txt` bajo `specs/` y no lanza CI.
7. **Evidencia** (`AGENTS.md` 12 y 18; ADR-011 §9.8). Lo automatizado se acredita con CI sobre el commit que se fusiona (o sobre el candidato), con el número de run; lo de laboratorio y lo humano, con una salida reproducible en `evidence.md`. Nada se marca «verificado» sin salida. Un fallo se registra tal cual y va al PR B o a los fundadores; el umbral no se mueve.
8. **Privacidad de la evidencia: la regla única del plan** («PR C · Evidencia y cierre», F85-6), que sustituye a cualquier otra:
   - al repositorio, solo capturas con datos de prueba (runner o `juntia-dev`) o de producción **anonimizadas** de forma opaca por quien las hizo, más recuentos, tiempos, huellas cortas e identificadores de run o de despliegue;
   - con los fundadores, fuera del repositorio, las imágenes y clips originales, los nombres identificables y las firmas;
   - una captura de producción solo entra si el hallazgo no se reproduce con el dataset;
   - **nunca** clips `.mov` ni `.mp4` (lanzarían CI): fotogramas PNG y tablas de tiempos;
   - **nunca** contraseñas, tokens, correos ni los textos de las aprobaciones.
9. **Producción.** Ningún agente ve la contraseña de producción ni escribe en producción (decisión 19.3). Solo se escriben datos reales legítimos: nada de gastos de prueba en producción. Una escritura del gestor en producción lleva el «sí» de un fundador antes de cada paso.
10. **Copy**: toda cadena visible sale de `src/lib/copy/es.ts`, con las palabras prohibidas del glosario; la redacción la aprueban los fundadores en el PR que la cambia.
11. **Los defectos se corrigen; las funcionalidades no entran** (spec, «Edge Cases»). Un hallazgo que pide una funcionalidad nueva va a la lista de MVP-2 (FR-083).
12. **Git**: autoría honesta, mensajes de commit en inglés (`docs/CONVENTIONS.md` B.4), nunca `--no-verify`. Cada PR lleva la descripción de `AGENTS.md` 15.

## Interpretaciones de ejecución

No son decisiones: son lecturas necesarias para ejecutar donde el plan no fija el detalle, o donde dos de sus documentos difieren en algo que otro documento ya resuelve. Si el revisor objeta una, se cambia sin tocar el alcance.

| # | Dónde | Lectura | Por qué |
| --- | --- | --- | --- |
| I1 | T039 | La prueba del borrado tiene **once casos**, los de [contracts/account-deletion.md](contracts/account-deletion.md) §6. El plan dice «siete pruebas» en la tabla del PR A: es el recuento anterior a F85-10 y F85-12, que añadieron los casos 8 a 11 en el contrato | El contrato es el detalle que el plan cita y es posterior |
| I2 | T029 | `tests/cls-frames.test.ts` corre en el proyecto `components` de Vitest, que ya incluye `tests/**/*.test.ts` (`vitest.config.ts`), y por tanto en el job `app`. El plan dice «proyecto `domain` o el de `scripts/`»: no hace falta un proyecto nuevo | Configuración existente |
| I3 | T020, T051 | El caso `@sweep` «raíz al 200 % a 1440 en Inicio · Yo y Metas» **falla en `main` hasta el PR B** (1.447 px). Se escribe sin `test.fail()` ni `fixme`, que lo esconderían; el barrido del paso 2 lo registra como hallazgo conocido y el PR B lo pone en verde | El plan lo dice («hoy falla, se corrige en B»); `@sweep` no corre en el gate de PR |
| I4 | T076 | La etiqueta del candidato es **`mvp-1-YYYY-MM-DD`**, como fijan research R13 y la [checklist](release-checklist.md). La celda del paso 5 del plan («`db-prod-*` o `release-mvp-1-*`») es un desliz: P0-4 no tiene migraciones y `backup.sh` sigue tomando la última `db-prod-*` | R13 es la decisión del plan sobre la etiqueta |
| I5 | T017, T103 | La tabla «Cobertura de dinero y privacidad» que FR-011 pide mantener al día vive en `evidence.md` (sección «Cobertura»), no en `spec.md`, que queda tal como se mergeó | La spec no se reescribe en PR de código |
| I6 | T052 | En el paso 2, si el último commit del PR A no es el del punto de control, `release` se lanza **solo con los tramos cuyo contenido cambió** después del punto de control (`release_legs`), con cargo a la partida de parciales del plan. Si es el mismo commit, no se lanza | Plan, paso 2 («`release` si A no lo cubrió») y «Minutos de Actions» |
| I7 | T010, T103 | El inventario de FR-002 y FR-003 se **clasifica pronto** (paso 0b), para que las tareas heredadas sin salida tengan dueño y paso antes del candidato; la tabla final la cierra el PR C, como dice el plan | Una tarea heredada descubierta en el PR C obligaría a otro run |
| I8 | T013–T016 | US-08, US-21 y US-13 ya se cumplen en el código; sus pruebas cubren un hueco de **cobertura**, no un comportamiento nuevo, y pasan desde el principio (regla 1) | FR-012 cierra huecos de la tabla de cobertura |
| I9 | T011, T055 | Las salidas del paso 0b entran en `evidence.md` en el siguiente PR del slice que la toque (A o B) y, como muy tarde, en el C | `evidence.md` la crea el PR A |
| I10 | T069 | Solo para verificar un PR B, nunca para un candidato (T071–T073 van siempre completos, F86-2). «Un run de `release` del tramo afectado» (plan, salida del PR B): para el residuo de F13, `lab-interaction`, `cls-inicio-yo` y `cls-metas`; para F02, `cls-inicio-yo`, `cls-inicio-nosotros` y `cls-metas`; para otra corrección, los tramos de las rutas que toque | La geometría del abanico afecta al rendimiento y al CLS de las rutas que lo pintan |

---

## Phase 0: Entrada al gate (paso 0)

**Purpose**: FR-001 — P0-4 empieza con P0-3 aceptada. **D1, opción (a):** el borrador del PR A y el paso 0b pueden empezar antes; el PR A **no se marca listo ni se mergea** hasta que T002 y T003 estén cerrados.

- [ ] T001 **Humana (gestor)**: prerrequisitos técnicos, que permiten empezar el borrador del PR A (D1): `main` contiene el plan (`f2a390b`), la partición del CI del PR #83 y este archivo mergeados; el `.env.test` del clon principal apunta a `juntia-dev` sin ninguna clave de producción; `psql` 17 disponible; `juntia-dev` libre (`npm run dev:unlock` no enseña dueño)
  - Cumple: decisión 18; reglas 2 y 3.
  - Quién: gestor. Depende de: el merge de este archivo.
  - Evidencia: revisión.
  - Terminado cuando: `npm run db:dev:reset` funciona contra `juntia-dev`; la salida, sin claves, va a la descripción del PR A.

- [ ] T002 **Humana (fundadores)**: **salida interna real de P0-3 (004-T084)**, con sus cuentas reales y no la simulación de `docs/audits/2026-11-t084/`: meta individual y compartida, aportes de los dos, un gasto con meta con una aprobación, un presupuesto creado y desactivado, y explicar sin ayuda la diferencia entre gasto y ahorro destinado
  - Cumple: FR-001.
  - Quién: los dos. Depende de: —.
  - Evidencia: revisión, con su salida en `specs/004-presupuestos-y-metas/evidence.md`.
  - Terminado cuando: los dos la dan por aprobada por escrito.

- [ ] T003 **Humana (gestor)**: **PR documental de cierre de P0-3 (004-T085)**, mergeado. Incluye las filas 1–18 de «Contradicciones para el PR documental T085» de la spec y las filas 19–22 del plan:
  - 19 · nota a ADR-007 y ADR-013 sobre la suspensión por nombre de los triggers de solo inserción en el borrado manual (D2), **con la lista de triggers que salga de la decisión abierta N1**;
  - 20 · criterio de la decisión 22.2 (D3);
  - 21 · periodo de uso con despliegues congelados (D4);
  - 22 · la única excepción a «los aportes no se borran» de ADR-010 (F85-8).
  - Cumple: FR-001.
  - Quién: gestor; lo aprueban los fundadores. Depende de: T002; N1 resuelta.
  - Evidencia: revisión (el merge del PR).
  - Terminado cuando: el PR está en `main` y `specs/004-presupuestos-y-metas/evidence.md` registra 004-T084 y 004-T085.

**Checkpoint**: con T001, el agente del PR A puede empezar en borrador. Con T002 y T003, el PR A puede marcarse listo (T050).

---

## Phase 0b: Mediciones en producción que alimentan el PR B (paso 0b)

**Purpose**: medir sobre lo que ya está en producción (P0-3) lo que decide qué corrige el PR B: F02 (Q4), la primera pasada de S1–S5 y las verificaciones de dispositivo. Puede adelantarse (D1). Protocolos completos en [contracts/human-verifications.md](contracts/human-verifications.md). Con el candidato se repiten como confirmación (paso 6).

- [ ] T004 [P] [US3] **Humana (cada fundador)**: **V1 · F02 en iPhone**. Grabación de pantalla de iOS: **S1**, 10 cambios Yo ↔ Nosotros alternos en Inicio; **S5**, 10 aperturas de meta desde Metas, alternando dos metas. Medida: del fotograma del toque al primer fotograma sin ningún bloque de esqueleto, contado en Fotos
  - Cumple: FR-032; Q4, opción a; research R10.
  - Quién: cada fundador, su iPhone. Depende de: —.
  - Evidencia: dispositivo. Tabla de 20 tiempos por persona; un fotograma PNG del toque y otro del contenido por experiencia, anonimizados. Fila de dispositivo con modelo, iOS y commit desplegado.
  - Terminado cuando: el gestor tiene las dos tablas.

- [ ] T005 [US3] **Humana (gestor)**: calcular la **mediana por fundador y experiencia** y aplicar la regla de Q4: corrección de F02 en el PR B si alguna mediana supera **1 s** o si un fundador lo juzga un defecto en T006
  - Cumple: FR-032.
  - Quién: gestor. Depende de: T004, T006.
  - Evidencia: revisión (la tabla de medianas y el resultado «corregir S1: sí/no; corregir S5: sí/no»).
  - Terminado cuando: el resultado está en la lista de hallazgos (T011). Activa o descarta T058, T062 y T063.

- [ ] T006 [P] [US3] **Humana (los dos, por separado)**: **V2 · primera pasada de S1–S5**. Matriz S1–S5 × {iPhone, 1440} × {con movimiento, con «Reducir movimiento»} = 20 filas por persona; en cada fila, los pasos del gate de §6.4 (datos persistidos reales, un estado negativo, un error de red con modo avión y Reintentar, números largos, carga lenta, refresco). Anotar si aparece la **doble fila del #53** y si se juzga un defecto de uso diario (Q2: entonces vuelve a los fundadores con la opción b)
  - Cumple: FR-030, FR-031 (primera pasada); Q2.
  - Quién: los dos. Depende de: —.
  - Evidencia: revisión. Notas por persona y fila; capturas PNG anonimizadas de lo que falle.
  - Terminado cuando: las 40 filas tienen nota.

- [ ] T007 [P] [US4] **Humana (cada fundador)**: **V4 · teclado nativo y safe areas**: Anotar con el teclado nativo (campo activo y Guardar visibles); la barra inferior y la hoja respetan el indicador de inicio; en horizontal, nada detrás de la muesca; **girar el teléfono con un monto escrito en Anotar: el monto sigue** (research R8)
  - Cumple: FR-044 (primera pasada); Q11 (768 px en dispositivo).
  - Quién: cada fundador. Depende de: —.
  - Evidencia: dispositivo. Capturas PNG en vertical y horizontal; fila de dispositivo.
  - Terminado cuando: las dos filas están completas.

- [ ] T008 [P] [US3] **Humana (fundadores)**: **V5 · VoiceOver y contraste**. VoiceOver (un fundador): Anotar completo, Inicio, Balance y una meta; cada control con nombre y estado, orden de pantalla. Contraste (los dos): las mismas pantallas en los dos temas, al sol y a la sombra
  - Cumple: FR-070 (primera pasada).
  - Quién: un fundador con VoiceOver; los dos con contraste. Depende de: —.
  - Evidencia: dispositivo. Notas por pantalla; capturas de lo que falle.
  - Terminado cuando: las notas existen para las cuatro pantallas.

- [ ] T009 [P] [US6] **Humana (gestor)**: **comprobar 002-T097**: si existe una copia real anterior al primer movimiento real en producción (fecha del manifiesto frente a la fecha del primer movimiento, consultada como recuento por fecha, sin datos). Si no existe, se registra tal cual, el fundador con gpg hace la copia de inmediato y se informa a los fundadores, sin reescribir nada
  - Cumple: FR-004; decisión 19.3; research R12.
  - Quién: gestor, en solo lectura; el fundador con gpg si hace falta la copia. Depende de: —.
  - Evidencia: revisión, más la salida de la copia si se hace.
  - Terminado cuando: la casilla de 002-T097 de la [checklist](release-checklist.md) §5 tiene su respuesta.

- [ ] T010 [P] **Gestor (lo puede preparar un agente, solo lectura)**: **clasificar el inventario heredado** (FR-002, FR-003; interpretación I7). Para cada fila de «Inventario de verificaciones heredadas» de la spec y cada tarea sin casilla de las specs 001–004 (las 89 de la 004 y 003-T072/T073/T074, entre otras): «salida real» con su enlace, «necesita ejecución» con dueño y paso de este archivo, «EXCEPCIÓN APROBADA» o «no aplica: motivo». Las de «necesita ejecución» que no tengan tarea aquí se añaden a la lista de hallazgos (T011)
  - Cumple: FR-002, FR-003; SC-003.
  - Quién: gestor. Depende de: —.
  - Evidencia: revisión (la tabla borrador).
  - Terminado cuando: ninguna fila queda sin estado ni dueño; la tabla entra en `evidence.md` con T017.

- [ ] T011 **Humana (gestor)**: **primera lista de hallazgos para el PR B**, con lo que salga de T005–T010: cada uno clasificado como defecto (va a B, con su capa de prueba), funcionalidad nueva (MVP-2) o fallo crítico (dinero, privacidad, pérdida de datos o accesibilidad básica)
  - Cumple: FR-030–FR-032, FR-044, FR-070, FR-083; interpretación I9.
  - Quién: gestor. Depende de: T005–T010.
  - Evidencia: revisión.
  - Terminado cuando: la lista existe fuera del repositorio y sus salidas, anonimizadas, esperan en `evidence.md` (I9).

---

## Phase 1: PR A · Pruebas y arneses (paso 1)

**Purpose**: los huecos de FR-012, la matriz de estados (FR-041), los casos `@sweep` que faltan (FR-042, FR-046, Q11), los cinco arneses de laboratorio (FR-050–FR-054, FR-043), el comparador de CLS por fotogramas (FR-051), el proyecto WebKit de las cinco specs (FR-020), la siembra de listas largas, el job `release` con su guardia de entradas, y el procedimiento de borrado en fases (D2, opción a). **Ningún cambio de código de producto en `src/`**; solo las pruebas de T013, T015 y T016 (regla 6).

**FR**: FR-011, FR-012, FR-020 (proyecto), FR-041, FR-042, FR-043, FR-046, FR-050–FR-054, FR-067, FR-090, FR-093, FR-095.

**Orden**: 1A–1F pueden avanzar en paralelo entre grupos (archivos distintos), con `juntia-dev` como única restricción; 1G al final. Dentro de 1D, 1E y 1F, la prueba primero.

### Grupo 1A — pruebas de dinero y privacidad (T012, T013, T015 y T016 `[P]`; T014 usa `juntia-dev`; T017 al final)

- [ ] T012 [P] Crear `specs/005-gate-mvp-1/evidence.md` con sus secciones vacías y sus tablas con cabecera: Entrada al gate (FR-001); Paso 0b; Cobertura (FR-011, I5); Inventario heredado (FR-002, FR-003); PR A (salidas de los arneses y del punto de control); Barrido; Laboratorio por arnés (CLS Chromium, comparador por motor y control, INP, LCP, GoalStack, listas largas); Tabla de CWV (FR-056) con las columnas «métrica · qué · dónde · método · rótulo» y la regla «nunca p75»; S1–S5 (FR-030); Criterios del handoff (FR-034); Dispositivo; Periodo de uso (D4); Valoraciones (FR-081); Lista de MVP-2 (FR-083); SC-001 a SC-012. Encabezado con la regla de privacidad (regla 8)
  - Cumple: plan, «Project Structure» («`evidence.md`: la crea el PR A; la cierra el PR C»).
  - Quién: agente del PR A. Depende de: T001.
  - Evidencia: revisión.
  - Terminado cuando: el archivo existe y cada sección dice qué tarea la llena.

- [ ] T013 [P] [US1] Test de **dominio** en `src/domain/allocations/allocations.test.ts` (el módulo que calcula el 50/50): **US-08 literal**, «gasto grupal 400.000 al 50/50 → 400.000 del grupo, 200.000 a cada persona, nunca 800.000». Afirma el total del grupo, la parte de cada persona y que la suma de las partes es el total
  - Cumple: FR-012 (US-08); SC-001; interpretación I8.
  - Quién: agente. Depende de: T001.
  - Evidencia: CI (job `app`).
  - Terminado cuando: pasa, y falla si se rompe el reparto a propósito en local (regla 1).

- [ ] T014 [US1] Test de **integración** en `tests/integration/money-us08.test.ts`: el mismo caso sembrado en el Supabase del runner y leído de **la vista en una sola sentencia**: el total del grupo (400.000) y el de cada persona (200.000). La vista es la que ya lee Inicio · Nosotros; el agente la nombra al leer `src/lib/db/`. Itera con `npm run test:integration:dev -- money-us08`
  - Cumple: FR-012 (US-08); SC-001.
  - Quién: agente, con el lock de `juntia-dev`. Depende de: T001.
  - Evidencia: CI (job `db`, +1–3 s).
  - Terminado cuando: pasa en `juntia-dev`; la evidencia es el gate.

- [ ] T015 [P] [US1] Test de **componentes** en `src/features/goals/goals.test.tsx` (o el archivo de pruebas del componente que pinta el modo del aporte): **US-21**, «Apartado en Juntia» y «Transferencia declarada» se pintan tal cual salen de `es.ts` (`modes.reserved`, `modes.transferred_declared`) y ningún texto de la fila, la hoja ni la ayuda presenta el dinero como verificado por un banco (las palabras prohibidas del glosario)
  - Cumple: FR-012 (US-21).
  - Quién: agente. Depende de: T001.
  - Evidencia: CI (job `app`).
  - Terminado cuando: pasa y falla si se cambia la etiqueta a propósito en local.

- [ ] T016 [P] [US1] Tests de **componentes** en `src/features/{auth,expenses,home,couple}/*.test.tsx` (en los archivos existentes de cada pantalla): **US-13**, ni el registro, ni Anotar, ni Inicio, ni la invitación a la pareja exigen crear un presupuesto. Cada pantalla se renderiza **sin ningún presupuesto**; el flujo principal se completa (o su control principal está habilitado) y no aparece ningún aviso ni bloqueo que pida crearlo. **Sin E2E nueva**. US-11 no recibe prueba: la cubre la lista exacta de funciones de `supabase/tests/01_privileges` y la tabla de cobertura lo cita (T017)
  - Cumple: FR-012 (US-13, US-11).
  - Quién: agente. Depende de: T001.
  - Evidencia: CI (job `app`).
  - Terminado cuando: las cuatro pantallas tienen su caso y cada uno falla si se exige un presupuesto a propósito en local.

- [ ] T017 [US1] Actualizar en `evidence.md` la **tabla de cobertura de dinero y privacidad** (FR-011, I5): las filas US-08, US-13 y US-21 con sus pruebas nuevas; US-11 con la cita de `01_privileges`; US-07 «no aplica»; ninguna prueba duplicada en otra capa. Pegar la tabla borrador del inventario heredado de T010
  - Cumple: FR-011; FR-002, FR-003 (borrador).
  - Quién: agente; la revisa el gestor. Depende de: T010, T012–T016.
  - Evidencia: revisión.
  - Terminado cuando: cada historia US-01 a US-23 y cada punto de §15.6.3 nombra sus pruebas.

### Grupo 1B — matriz de estados y accesibilidad (T018 y T021 `[P]`; T019 → T020 en serie)

- [ ] T018 [P] [US4] Crear `specs/005-gate-mvp-1/states-matrix.md`: la matriz **estados × pantallas** de FR-041. Estados: sin movimientos, sin pareja, sin presupuesto, con presupuesto, sin metas, con metas, meta completada, retiro rechazado, exceso, datos extremos, error, carga, latencia, movimiento reducido, oscuro, muchos movimientos, textos largos y permisos denegados. En cada celda y para los dos temas: la prueba que lo cubre (archivo y caso), la captura, «no aplica: motivo», o «se añade en T019». Ninguna celda sin dueño
  - Cumple: FR-041, FR-045.
  - Quién: agente. Depende de: T001.
  - Evidencia: revisión (más CI de las pruebas citadas).
  - Terminado cuando: no queda ninguna celda vacía.

- [ ] T019 [US4] Añadir a `tests/a11y/route-registry.ts` los estados que la matriz marca «se añade»: **nivel ligero** (cada estado una vez, 390 px, los dos temas en el mismo contexto) mientras `a11y-session` quede por debajo de **560 s estimados** (~4–5 s por estado nuevo, research R2); los que no quepan, **solo `@sweep`**. Actualizar `tests/a11y/route-registry.test.ts` si lo exige. Sin archivo `*.a11y.ts` nuevo (si hiciera falta uno, entra en el mapa de `a11y-select` en este PR, [contracts/ci.md](contracts/ci.md))
  - Cumple: FR-041; FR-095; regla 5.
  - Quién: agente, con el lock de `juntia-dev` para iterar. Depende de: T018.
  - Evidencia: CI (job `a11y-session`, +40–80 s estimados).
  - Terminado cuando: los estados nuevos pasan en `juntia-dev` con `-g`; la matriz enlaza cada uno.

- [ ] T020 [US4] Casos **`@sweep`** nuevos en `tests/a11y/routes.a11y.ts`:
  - (a) **texto al 200 %** en hojas, diálogos, acceso A1–A6 e invitación (FR-042);
  - (b) **raíz al 200 % a 1440** en Inicio · Yo y en Metas: sin scroll horizontal. **Falla en `main` hasta el PR B** (interpretación I3);
  - (c) **Anotar con un monto escrito, de 390 a 1024 px y vuelta**: el monto sigue en el campo (research R8; Q11);
  - (d) **foco al disparador al llegar por URL** y cerrar con Escape (FR-046; lección 004-T084 punto 3).
  - Cumple: FR-040, FR-042, FR-046; Q11.
  - Quién: agente, con el lock de `juntia-dev`. Depende de: T019 (mismo dominio de iteración).
  - Evidencia: CI lanzado a mano (barrido, pasos 2 y 4).
  - Terminado cuando: (a), (c) y (d) pasan en local contra `juntia-dev` con `-g`; (b) falla con la medida de 1.447 px, que es lo esperado. La salida local no es evidencia.

- [ ] T021 [P] [US2] En `tests/e2e/goals.e2e.ts`, el caso del gesto que usa `Input.dispatchTouchEvent` (CDP) se salta fuera de Chromium con `test.skip(browserName !== "chromium", …)` y un motivo que nombra la verificación que lo cubre: el gesto en el iPhone de los fundadores (FR-070). No se reescribe con otro mecanismo
  - Cumple: FR-020, FR-090; research R3.
  - Quién: agente. Depende de: T001.
  - Evidencia: CI (sin coste: el gate es Chromium).
  - Terminado cuando: en Chromium el caso sigue corriendo igual.

### Grupo 1C — Playwright y arneses de laboratorio (T022 primero; T024–T028 `[P]` entre sí; T023 después de T031)

- [ ] T022 `playwright.config.ts`: tres proyectos nuevos, **ninguno** en `test:e2e:smoke` ni en `test:a11y`:
  - `e2e-webkit`: `devices["Desktop Safari"]`, `testDir` de `e2e`, `reducedMotion: "reduce"`;
  - `evidence-webkit` y `evidence-firefox`: solo `tests/evidence/cls-frames.capture.ts`.
  - Una prueba nueva en `tests/playwright-projects.test.ts` (no en `tests/ci-command.test.ts`, que es de T037; F86-3) afirma que los comandos del gate siguen fijando sus proyectos de Chromium y que ningún proyecto nuevo entra en `test:e2e:smoke` ni en `test:a11y`.
  - Cumple: FR-020, FR-051, FR-093; research R3.
  - Quién: agente. Depende de: T001.
  - Evidencia: CI (job `app`, la prueba de config).
  - Terminado cuando: `npm run verify` pasa y `test:e2e:smoke` no lista ningún proyecto nuevo.

- [ ] T023 [US5] `tests/evidence/release-cls.capture.ts`: **CLS de 40 cargas en Chromium** (FR-050), generalizando el observador de `theme-cls.capture.ts` y `home-states.capture.ts`:
  - **una ruta por tramo**, elegida por variable de entorno (Inicio en Yo, Inicio en Nosotros, Actividad, Balance, Plan, Análisis, Metas);
  - **40 cargas en claro y 10 en oscuro**, alternando 390 y 1440;
  - CPU 6× y red lenta por CDP (R6);
  - CLS **sin redondear** por carga, con las fuentes de cada desplazamiento;
  - **el grabador del comparador corre a la vez** (control 7, concordancia con la API; [contracts/cls-comparator.md](contracts/cls-comparator.md) §5);
  - una línea JSON por carga en `test-results/evidence/release-cls.jsonl`, y las del grabador en `cls-frames.jsonl`.
  - Cumple: FR-050; SC-005; consolida 003-T054, 003-T068, 004-T040, 004-T054 (CLS de Metas) y 004-T079.
  - Quién: agente. Depende de: T022, T031.
  - Evidencia: laboratorio (tramos `cls-*` del job `release`).
  - Terminado cuando: corre en local con una ruta y pocas cargas y escribe sus dos `.jsonl`; la medición vale solo en `release`.

- [ ] T024 [P] [US5] `tests/evidence/release-lcp.capture.ts`: **LCP de laboratorio** con `PerformanceObserver` (`largest-contentful-paint`) en Inicio y Actividad: a **390** con 4G emulado (150 ms de latencia, 1,6 Mbps de bajada, 750 kbps de subida) y CPU 4×; a **1440** sin emulación de red; **10 cargas** por ruta y ancho. Escribe **mediana y máximo** con el rótulo «laboratorio» y **nunca «p75»**; una mediana > 2,5 s se marca «hallazgo para los fundadores», no fallo
  - Cumple: FR-054; SC-012; Q5, opción c; research R7.
  - Quién: agente. Depende de: T022.
  - Evidencia: laboratorio (tramo `lab-interaction`).
  - Terminado cuando: corre en local y su salida no contiene la cadena «p75».

- [ ] T025 [P] [US5] Ampliar `tests/evidence/inp.capture.ts`: **INP al abrir Anotar y al guardar**, en las tres variantes (**privado, compartido y con meta**), **10 interacciones por variante**, CPU 4×, a 390 y 1440, con el umbral < 200 ms escrito en la salida
  - Cumple: FR-052; SC-006; consolida 003-T054 y 004-T067.
  - Quién: agente. Depende de: T022.
  - Evidencia: laboratorio (tramo `lab-interaction`, `--workers 1`).
  - Terminado cuando: las tres variantes corren en local.

- [ ] T026 [P] [US5] `tests/evidence/release-goalstack.capture.ts`: **abanico de GoalStack con 6 metas** sembradas en el runner. A **1440**, hover y foco de cada carta del abanico; a **390**, deslizamiento de la pila por teclado y por puntero; CPU 4×. Mide los intervalos entre `requestAnimationFrame` durante cada animación y las tareas largas (`longtask`). Por animación escribe: el % de fotogramas en ≤ 18,2 ms, el fotograma más largo y si **pasa: ≥ 95 % en ≤ 18,2 ms y ninguno > 50 ms** (D3, opción a). Declara CPU, red y versión del navegador
  - Cumple: FR-053; D3; consolida 004-T054.
  - Quién: agente. Depende de: T022.
  - Evidencia: laboratorio (tramo `lab-interaction`).
  - Terminado cuando: corre en local y su salida tiene una fila por animación.

- [ ] T027 [P] [US4] `tests/evidence/release-long-lists.capture.ts`: siembra en el runner una cuenta con **600 movimientos en un mes, 120 aportes y 40 versiones de presupuesto**, y comprueba a 390 y 1440, en Actividad, el historial de aportes y el de presupuestos: «cargar más» no cambia el total; las cajas de las filas son disjuntas (nada se solapa); no hay scroll horizontal. Capturas PNG con los datos sembrados. No duplica la integración de más de 500 filas del paginador (004, F64-4)
  - Cumple: FR-043; research R7.
  - Quién: agente. Depende de: T022.
  - Evidencia: laboratorio (tramo `lab-interaction`) más capturas.
  - Terminado cuando: corre en local y deja sus capturas en `test-results/`.

- [ ] T028 [P] [US4] `scripts/dev-target/seed-long-lists.mjs`: la misma cuenta de T027 en `juntia-dev`, **con el guardia de destino** (`scripts/dev-target/guard.mjs`), una cuenta propia, idempotente (si existe, no duplica). Prueba en `tests/dev-target-tools.test.ts`: con otro destino, se niega antes de escribir
  - Cumple: FR-043; decisión 18.
  - Quién: agente (escribe la herramienta; la ejecuta el gestor en T054). Depende de: T001.
  - Evidencia: CI (job `app`, la prueba del guardia).
  - Terminado cuando: la prueba pasa y la herramienta no se ejecuta en este PR contra `juntia-dev` sin el lock.

### Grupo 1D — comparador de CLS por fotogramas (T029 y T031 `[P]`; T030 tras T029; T032–T034 tras T030 y T031)

El contrato completo es [contracts/cls-comparator.md](contracts/cls-comparator.md); estas tareas no lo reinterpretan.

- [ ] T029 [P] [US5] Test **primero y en rojo** en `tests/cls-frames.test.ts` (proyecto `components`, interpretación I2), con fotogramas sintéticos en el formato de §3.4:
  - un bloque normal que se mueve **1 px** entre dos fotogramas se detecta (§4);
  - uno que **aparece o desaparece** no cuenta;
  - uno que **solo cambia de tamaño** con la esquina superior izquierda fija no cuenta, y los bloques que empuja sí;
  - el **desplazamiento por scroll** de un bloque normal no cuenta, porque su coordenada es la del documento;
  - un bloque **`fixed`** se compara en coordenadas del viewport;
  - un bloque **`sticky`** solo se compara entre fotogramas con el mismo scroll (documento y contenedores);
  - solo cuentan los pares entre el **primer fotograma con esqueleto** y el **primer fotograma final**, ambos incluidos;
  - el resultado por carga tiene la forma de §4 y el resultado por ruta y motor es «CLS = 0 por fotogramas» si y solo si ninguna carga tiene desplazamientos.
  - Cumple: FR-051; F85-5.
  - Quién: agente. Depende de: T001.
  - Evidencia: CI (job `app`).
  - Terminado cuando: los casos fallan sin `compare.mjs`.

- [ ] T030 [US5] `scripts/cls-frames/compare.mjs`: el comparador **puro y sin E/S** de §4. Entrada: la salida del grabador de una carga; salida: el resultado por carga, con la ruta del nodo como `etiqueta.clase` de sus antepasados, sin texto. Una función de resumen por ruta y motor
  - Cumple: FR-051.
  - Quién: agente. Depende de: T029.
  - Evidencia: CI (T029 en verde).
  - Terminado cuando: T029 pasa.

- [ ] T031 [P] [US5] `scripts/cls-frames/recorder.js`: el grabador de §3, **un script autónomo sin imports** (para que sirva como `addInitScript` y como «Inspector Bootstrap Script» de Safari, R11):
  - en cada `requestAnimationFrame` desde el primer fotograma;
  - identidad por nodo con un `WeakMap` (§3.1); `HTMLElement` visibles en el viewport con caja no vacía, hasta 12 niveles bajo `body`; excluye `script`, `style`, `display: contents`, SVG y los `aria-hidden` dentro de un esqueleto;
  - **posición de layout por la suma de `offsetLeft` y `offsetTop` por la cadena de `offsetParent`, más `clientLeft` y `clientTop` de cada antepasado** (§3.2; F85-11). No escribe nada en la página;
  - clase **normal, fixed o sticky** (§3.3), calculada una vez por nodo y recalculada si cambia su `position`; para `fixed` dentro de un antepasado transformado, la suma sigue hasta ese antepasado;
  - fotograma `{ t, scroll: [documento, contenedores…], skeleton, boxes: [[id, clase, x, y, w, h], …] }` en px CSS enteros (§3.4);
  - `skeleton = true` mientras exista un elemento con el atributo del esqueleto: `data-skeleton` de `src/components/ui/skeleton.tsx`, confirmado al leer los `loading.tsx` (§3.5); primer fotograma final = sin esqueleto, con el `main` de la ruta y dos fotogramas seguidos sin cambios de caja;
  - **sin texto**: ni `textContent`, ni valores, ni atributos salvo la marca del esqueleto (§3.6);
  - salida en `window.__clsFrames`, un objeto por carga (§3.7).
  - Cumple: FR-051, FR-071 (el mismo grabador en el iPhone); F85-5, F85-11.
  - Quién: agente. Depende de: T001.
  - Evidencia: laboratorio (controles de T033).
  - Terminado cuando: corre pegado en la consola de un navegador sin errores y llena `window.__clsFrames`.

- [ ] T032 [US5] `tests/evidence/cls-frames.capture.ts`: el arnés del comparador, en los proyectos `evidence` (Chromium), `evidence-webkit` y `evidence-firefox`:
  - **rutas con sesión** de FR-050 con el dataset sembrado en el runner; el esqueleto se fuerza **reteniendo la lectura en el servidor 1,5 s** con `lock table … in access exclusive mode` desde una sesión de `psql`, como `home-states.capture.ts` (R5). **Cada ruta nombra su tabla**, fijada leyendo qué vista consulta cada `page.tsx` (orientativo: Inicio y Actividad, `transactions`; Balance, liquidaciones; Plan y Análisis, `budget_versions`; Metas, `goal_ledger_entries`);
  - **rutas sin sesión**: entrar (A1), crear cuenta (A2) y recuperar (A4), sin retención;
  - fuera de Chromium, **10 cargas en claro y 5 en oscuro** por ruta y motor, alternando 390 y 1440, sin emulación de CPU ni de red (§6);
  - `--workers 1`; selección del tramo por variable (`webkit-cls-2`: A1, A2, A4, Inicio en Yo y en Nosotros; `-3`: Actividad, Balance, Plan, Análisis y Metas; igual en Firefox);
  - `test-results/evidence/cls-frames.jsonl`, una línea por carga; vídeo de Playwright **solo** de las cargas con desplazamiento, que no entra al repositorio (§7).
  - Cumple: FR-051; SC-005; research R5.
  - Quién: agente. Depende de: T022, T030, T031.
  - Evidencia: laboratorio (tramos `webkit-cls-*` y `firefox-cls-*`).
  - Terminado cuando: corre en local en Chromium con una ruta y pocas cargas. **WebKit en Windows no es evidencia** (el port de Playwright se cae; research R3).

- [ ] T033 [US5] Los **controles 1 a 6** del contrato §5 en el arnés, cada uno con su propio `addInitScript`, **solo en el arnés y nunca en la app**, con 10 cargas por control y motor, más el **resumen de fiabilidad por motor**:
  - **1 · positivo:** 300 ms después del primer fotograma con esqueleto, inserta un bloque de 40 px encima de `main` → desplazamiento de `main` y de lo de debajo con `dy` de 40 ± 1, **10 de 10**;
  - **2 · resolución:** mueve `main` 1 px con `margin-top` → detectado **10 de 10**; y otras 10 cargas con 0,5 px, en las que **solo se registra** cuántas veces se vio;
  - **3 · ruta quieta:** A1 sin esqueleto ni cambios → cero, 10 de 10;
  - **4 · animación con transformación:** `translateY(24px)` → `0` en 300 ms, una vez con Web Animations y otra con estilo en línea cambiado por fotograma → cero, 10 de 10; **en Chromium, la API da CLS = 0 en las mismas cargas**;
  - **5 · transición CSS en curso (F85-11):** bloque con `transition: transform 400ms` al que se cambia `transform: translateY(32px)` justo después del primer fotograma con esqueleto → cero, 10 de 10, y **la posición medida del bloque no cambia en ningún fotograma de la transición**;
  - **6 · scroll con sticky y fixed:** cabecera `sticky`, un bloque `fixed` y otro `fixed` dentro de un antepasado transformado; tras la carga, scroll de 200 px en 10 pasos → cero, 10 de 10;
  - **7 · concordancia** (se mide en T023): una carga tiene desplazamientos por fotogramas **si y solo si** la API da CLS > 0, salvo los avisos de más por resolución, listados aparte con su vídeo; dos o más discrepancias sin explicar → no fiable en Chromium.
  - El resumen escribe, por motor: cada control con «x de 10», y «fiable» solo si cumple las siete condiciones. **Se calibra motor a motor** (F85-11).
  - Cumple: FR-051; F85-5, F85-11; contrato §5.
  - Quién: agente. Depende de: T032.
  - Evidencia: laboratorio (tramos `cls-controls-chromium`, `webkit-cls-1` y `firefox-cls-1`).
  - Terminado cuando: los seis controles corren en local en Chromium y el resumen sale; la calibración vale solo en `release` (T045).

- [ ] T034 [US5] **Sin texto, sobre una salida real** (contrato §3.6): guardar como fixture una salida del grabador de una carga con el dataset de prueba (en `tests/fixtures/cls-frames/`) y añadir a `tests/cls-frames.test.ts` la afirmación de que **ningún valor tiene letras**, salvo los nombres de las claves y de las clases de bloque
  - Cumple: FR-051, FR-071; research R11 («nada personal sale del teléfono»).
  - Quién: agente. Depende de: T031, T032.
  - Evidencia: CI (job `app`).
  - Terminado cuando: la prueba pasa sobre la fixture real y falla si se le inyecta un texto.

### Grupo 1E — CI: guardia de entradas, job `release` y documentación (T035 → T036 → T037; T038 `[P]`)

El contrato completo es [contracts/ci.md](contracts/ci.md).

- [ ] T035 Test **primero y en rojo** en `tests/ci-workflow.test.ts` (F85-4, F85-9). **No se conforma con buscar textos en el YAML**:
  - **evaluador mínimo** de las expresiones `if` que usa el workflow: `&&`, `||`, `!`, `==`, `inputs.*`, `github.event_name` y `github.event.pull_request.draft`. **Una expresión que no conoce hace fallar la prueba**, no se adivina;
  - **simulación de `needs`** con las reglas de GitHub: un job cuyo `if` es falso se omite; un `if` sin función de estado añade `success()`, así que el job se omite si una dependencia no terminó bien; un paso que falla hace fallar su job (el paso de validación de `inputs-guard` se simula con su condición);
  - **casos**: las **16 combinaciones** de `release_lab`, `capture_evidence`, `a11y_sweep` y `measure_workers` en `workflow_dispatch`, más `pull_request` en borrador y no en borrador. El resultado es **exactamente** la tabla de «Entradas a mano» del contrato;
  - en un PR **no borrador**: `inputs-guard` termina bien y `app`, `db`, `e2e` y `a11y-session` **se ejecutan** (no basta con que no fallen);
  - con una **combinación inválida** (`release_lab` con otra entrada): el guardia falla y **nada más corre**;
  - `release` **nunca** corre en `pull_request`;
  - las afirmaciones que el archivo ya tiene se conservan.
  - Cumple: FR-092, FR-093, FR-095; F85-4, F85-9.
  - Quién: agente. Depende de: T001.
  - Evidencia: CI (job `app`).
  - Terminado cuando: los casos nuevos fallan contra el `ci.yml` de `main`.

- [ ] T036 `.github/workflows/ci.yml`:
  - **entradas nuevas** de `workflow_dispatch`: `release_lab` (booleano) y `release_legs` (texto; vacío = todos; nombres o prefijos separados por comas);
  - **job `inputs-guard`** con la condición `github.event_name == 'workflow_dispatch' || (github.event_name == 'pull_request' && github.event.pull_request.draft == false)`; su paso de validación lleva `if: github.event_name == 'workflow_dispatch'` y falla con `::error` («`release_lab` no se combina con otras entradas»); en `pull_request` termina bien sin validar;
  - **`app`, `db`, `e2e`, `a11y-session` y `evidence`** ganan `needs: inputs-guard` y `&& !inputs.release_lab`;
  - **job `release`**: `needs: inputs-guard`; `if: github.event_name == 'workflow_dispatch' && inputs.release_lab && !inputs.capture_evidence && !inputs.a11y_sweep && !inputs.measure_workers`; `ubuntu-24.04`; `timeout-minutes: 20`; `fail-fast: false`; matriz de los **17 tramos** (`cls-inicio-yo`, `cls-inicio-nosotros`, `cls-actividad`, `cls-balance`, `cls-plan`, `cls-analisis`, `cls-metas`, `cls-controls-chromium`, `lab-interaction`, `webkit-e2e-1`, `webkit-e2e-2`, `webkit-cls-1`…`-3`, `firefox-cls-1`…`-3`);
  - **cada tramo**: reloj del job; Supabase con Auth y Mailpit; caché de `.next/cache` con la clave del job `e2e`; `npm ci` y build; el navegador del tramo con el patrón de Chromium (tope propio, un reintento, matar el `apt-get` colgado); Arial y Georgia como en `evidence`; el comando del tramo; artefacto `release-<tramo>` con `test-results/` y los `.jsonl`; resumen con tiempos;
  - **`webkit-e2e-N`**: `--project e2e-webkit --shard=N/2`, primero sin `@serial` y después `@serial` con un worker, como el gate;
  - **`lab-interaction`**: T024, T025, T026 y T027 con `--workers 1`;
  - **`release_legs`**: un tramo no pedido termina en segundos con «no pedido» en el resumen, nunca como aprobado;
  - **sin cambios** en los selectores (`tests/evidence/**` ya es neutro para `a11y-select`; `scripts/cls-frames/` y `scripts/account-deletion/` caen en la regla de `scripts/`) ni disparadores `schedule` o `push`.
  - Cumple: FR-020, FR-050–FR-054, FR-092, FR-093; F85-4, F85-7, F85-9.
  - Quién: agente. Depende de: T035.
  - Evidencia: CI (T035 en verde en el gate; el job se ejerce en T045).
  - Terminado cuando: T035 pasa y `actionlint` (o la validación que use el repositorio) no da errores.

- [ ] T037 `scripts/ci.mjs`: `jobBudget` devuelve **600 s sin bloquear** para `release` (avisa si un tramo pasa de 600 s; el tope duro es `timeout-minutes`). Prueba en `tests/ci-command.test.ts`; los presupuestos de los demás jobs no cambian
  - Cumple: FR-095; contrato, «Presupuesto».
  - Quién: agente. Depende de: T036.
  - Evidencia: CI (job `app`).
  - Terminado cuando: la prueba nueva pasa y las existentes siguen igual.

- [ ] T038 [P] `docs/TESTING.md` §3 y §9: el job `release` (solo a mano, nunca en un PR, no es del gate), sus entradas `release_lab` y `release_legs`, la exclusión mutua con las demás entradas, sus 17 tramos, su tope de 20 min y el aviso a 600 s. **No toca el texto del «Nivel 2»**, que enmienda 004-T085 (fila 17 de la spec)
  - Cumple: FR-093; plan, «Conflictos entre documentos superiores».
  - Quién: agente. Depende de: T001.
  - Evidencia: revisión.
  - Terminado cuando: la sección no presenta `release` como nivel 2.

### Grupo 1F — borrado manual de cuenta en fases (T039 primero; T040 y T041 después; T042 condicional)

El contrato completo es [contracts/account-deletion.md](contracts/account-deletion.md) (D2, opción a). **Nada de este grupo se ejecuta contra producción.**

- [ ] T039 [US6] Test de **integración primero y en rojo** en `tests/integration/account-deletion.test.ts`, con **los once casos** del contrato §6 (interpretación I1). `run.mjs` recibe por inyección un **cliente de Auth del runner que se puede hacer fallar** y un **reloj**:
  1. **Ciclo real (F85-1):** pareja sembrada con el dataset dorado de P0-1 a P0-3, con un gasto con meta cuya solicitud fue aprobada (`confirmation_id` y `usage_entry_id` apuntándose de verdad), un `void` de aporte y un gasto movido a la pareja; más una tercera persona sin pareja. Se borra la pareja: no queda nada de las dos; la tercera, intacta recuento a recuento; los triggers suspendidos vuelven a estar activos (un `delete` directo sobre `audit_events` vuelve a fallar); las invariantes pasan;
  2. **persona sola:** se borra la tercera; la pareja, resembrada, intacta;
  3. **fallo dentro de la fase 1** después de los `delete`: todo como antes (recuentos, `confirmation_id`, triggers activos) y estado en `locked`;
  4. **fallo de Auth en el primer usuario (F85-2):** estado `data_deleted` sin usuarios borrados; las dos cuentas bloqueadas y sin datos; `--resume` termina en `verified`;
  5. **fallo de Auth en el segundo:** estado `data_deleted` con el primero borrado; `--resume` borra solo el segundo y termina en `verified`;
  6. **manifiesto incompleto (F85-3):** falta la segunda aprobación; falta la segunda exportación; las dos aprobaciones son de la misma persona; los UUID no son los miembros del grupo; una sola persona con pareja activa → se detiene antes de la fase 0 sin escribir;
  7. **cierre:** una fila fuera del alcance que apunta a una de dentro detiene el script antes de la fase 0, nombrándola por tabla e id;
  8. **sin confirmaciones propias (F85-12):** aprobaciones y exportaciones coherentes pero sin `confirmations[]`, con una sola, con las dos del mismo canal, o con una que repite otro `request_id` u otro alcance → rechazo antes de la fase 0;
  9. **bloqueo parcial (F85-10):** falla el bloqueo de la segunda persona; el estado registra a la primera `applied` y a la segunda `pending`; `--abort` levanta solo la primera y termina en `aborted` sin datos borrados; en otra corrida igual, `--resume` bloquea a la segunda y sigue;
  10. **interrupción larga (F85-10):** con el reloj inyectado, parado en `locked` y reanudado con menos de 7 días de bloqueo (renueva 720 h) y con el bloqueo caducado (lo vuelve a poner y cierra sesiones antes de la fase 1, comprobando que no hay datos nuevos); los dos terminan en `verified`;
  11. **`--abort` tardío:** desde `data_deleted` se rechaza y el estado no cambia.
  - Cumple: FR-067; D2; F85-1, F85-2, F85-3, F85-10, F85-12.
  - Quién: agente, con el lock de `juntia-dev` para iterar. Depende de: T001.
  - Evidencia: CI (job `db`, +8–18 s). Si `db` se acerca a 600 s, la prueba pasa al tramo `lab-interaction` (contrato §6).
  - Terminado cuando: los once casos fallan sin el procedimiento.

- [ ] T040 [US6] `scripts/account-deletion/delete-account.sql`: la fase 1 del contrato §4, en **una transacción** (`psql -1`, `ON_ERROR_STOP`) como dueño de las tablas:
  1. recuento previo por tabla;
  2. suspende **por nombre** `audit_events_append_only`, `budget_versions_append_only`, `goal_ledger_append_only`, `goal_allocations_append_only` y `settlements_guard` (no los `*_no_truncate`; no usa `truncate`), más `allocations_check_sum` **solo si** T039 demuestra que rechaza el borrado completo (T042);
  3. `update goal_ledger_entries set confirmation_id = null` en las metas del alcance (rompe el ciclo, F85-1; el otro lado no admite `NULL` en una solicitud aprobada);
  4. borra en orden: `goal_usage_confirmations`; `goal_usage_allocations`; ledger (`void` primero, el resto después); metas; versiones y presupuestos; asignaciones y movimientos; liquidaciones; invitaciones, miembros y grupo; idempotencia; auditoría; categorías propias; perfiles; filas de `signup_allowlist`;
  5. reactiva los triggers con `enable trigger`;
  6. `set constraints all immediate`;
  7. comprueba que no queda ninguna fila que nombre a los UUID;
  8. `supabase/restore/check-invariants.sql` sobre lo que queda.
  - Cumple: FR-067; D2; F85-1.
  - Quién: agente. Depende de: T039.
  - Evidencia: CI (T039).
  - Terminado cuando: los casos 1–3 de T039 pasan.

- [ ] T041 [US6] `scripts/account-deletion/run.mjs`: el orquestador en fases (programa de Node, no `bash`, para poder inyectar el cliente de Auth y el reloj):
  - **manifiesto** `deletion-<id>.json` fuera del repositorio, validado entero antes de tocar nada (§3): `request_id`, `target` (coincide con el guardia de `juntia-dev` o con el proyecto enlazado), `users` (existen en `auth.users` y `profiles`), `group_id` (con dos UUID, exactamente los dos miembros activos; con uno, sin pareja activa), `approvals[]`, `exports[]`, **`confirmations[]`** (canales distintos, `request_id`, alcance y huella de la aprobación iguales a los del manifiesto, F85-12) y `backup` (en producción, la copia del día; en `juntia-dev`, `null`). Un campo que falta → se detiene sin escribir;
  - **cierre del alcance**: si una fila de fuera apunta a una de dentro, se detiene y la nombra por tabla e id, sin datos;
  - **estado** `deletion-<id>.state.json`, escrito de forma atómica (temporal y renombrado) **después de cada paso que cambia algo fuera del archivo**: cada bloqueo, cada cierre de sesiones, cada renovación, el `commit` de la fase 1 y cada borrado de Auth (F85-10). Fases `planned → locked → data_deleted → auth_deleted → verified` (y `aborted`);
  - **fase 0**: por persona y en orden, bloqueo en Auth con `ban_duration` de **720 h** y estado; cierre de sesiones y estado; registro `{ uuid, ban, banned_until, sessions_revoked, ban_checked_at }`; espera de la vida de los tokens de acceso (valor copiado del panel al manifiesto), salvo que el estado muestre que ya pasó;
  - **renovación** al empezar cada fase y cada `--resume`: con menos de 7 días, renueva 720 h; caducado, vuelve a bloquear y a cerrar sesiones antes de seguir y, si es antes de la fase 1, comprueba que no hay datos nuevos (recuentos iguales a los del manifiesto) o se detiene;
  - **fase 1**: ejecuta T040; **fase 2**: por UUID, borra si existe y da por borrado si no existe, con estado tras cada usuario; **fase 3**: la API no lo encuentra, ninguna tabla lo nombra, no está en `signup_allowlist` y, con pareja, el grupo no existe;
  - **`--resume <id>`** idempotente desde el primer paso no terminado; **`--abort <id>`** solo desde `planned` o `locked`, idempotente, levanta los bloqueos registrados (`ban_duration: "none"`) persona a persona y termina en `aborted`; desde `data_deleted` se rechaza;
  - **salida para la evidencia**: el `request_id`, los ocho primeros caracteres de la SHA-256 de cada UUID, las fechas de las aprobaciones y exportaciones, la secuencia de estados y los recuentos por tabla antes y después. **Nunca** correos, nombres, importes ni textos de aprobaciones.
  - Cumple: FR-067; D2; F85-2, F85-3, F85-10, F85-12.
  - Quién: agente. Depende de: T039, T040.
  - Evidencia: CI (T039).
  - Terminado cuando: los once casos de T039 pasan en `juntia-dev` y en el gate.

- [ ] T042 [US6] **Condicional, ver N1**: si el caso 1 de T039 demuestra que `allocations_check_sum` rechaza un borrado completo en el que el gasto también desaparece, se añade **por nombre** a la lista de triggers suspendidos de T040, y la lista llega a la nota de ADR-007 y ADR-013 por la vía que decidan los fundadores en N1
  - Cumple: FR-067; contrato §1 («Triggers de restricción diferidos»).
  - Quién: agente; la nota, según N1. Depende de: T039.
  - Evidencia: CI (T039).
  - Terminado cuando: el resultado (hace falta o no) está escrito en la descripción del PR A y comunicado al gestor **antes** de redactar 004-T085.

### Grupo 1G — evidencia, punto de control y salida del PR A (en serie)

- [ ] T043 `evidence.md`, sección «PR A»: qué añade el PR, los comandos locales y su resultado (no son evidencia, regla 2), y la preparación del punto de control (qué tramo corre qué)
  - Cumple: regla 7.
  - Quién: agente. Depende de: T012–T042.
  - Evidencia: revisión.
  - Terminado cuando: la sección existe.

- [ ] T044 `npm run verify` y, cuando el gestor lo pida, `npm run e2e:dev` **completo una vez**, justo antes del push final; PR en **borrador** sobre `main` con la descripción de `AGENTS.md` 15 (objetivo, archivos, decisiones, comandos y resultados, riesgos, pendientes) y revisión con el PR en borrador
  - Cumple: reglas 2 y 3.
  - Quién: agente. Depende de: T043.
  - Evidencia: revisión (salidas en el PR).
  - Terminado cuando: la revisión da el visto bueno, en un solo push por ronda.

- [ ] T045 **Humana (gestor)**: **punto de control del PR A**: un run completo de `release` (`gh workflow run ci.yml --ref <rama del PR A> -f release_lab=true`, sola) sobre el último commit del PR, antes de marcarlo listo. Mide la duración real de cada tramo, **calibra el comparador motor a motor** (§5 del contrato) y deja la primera salida de cada arnés
  - Cumple: FR-020 (primera vez en WebKit), FR-050–FR-054; plan, «Punto de control».
  - Quién: gestor. Depende de: T044.
  - Evidencia: CI + laboratorio (número de run; artefactos `release-<tramo>`).
  - Terminado cuando: los 17 tramos terminaron. **Un arnés que registra un fallo de producto no es un fallo del PR**: es un hallazgo para el PR B (T055).

- [ ] T046 **Condicional**: si un tramo midió **más de 600 s**, partirlo en dos en el mismo PR (por ejemplo, `webkit-cls-3` en `-3a` y `-3b`), sin quitar cargas, y actualizar la matriz de T036 y la tabla de T035. Los tramos nuevos se miden en el paso 2 (T052, I6)
  - Cumple: regla 5; F85-7.
  - Quién: agente. Depende de: T045.
  - Evidencia: CI (T035 en el gate).
  - Terminado cuando: ningún tramo tiene más trabajo que el que cabía en ~600 s según su medida.

- [ ] T047 **Condicional**: si el comparador **no cumple** las siete condiciones en un motor (porque `offsetTop` no es coherente con su layout en los controles 4 a 6), probar en ese motor la **alternativa documentada** del contrato §3.2: pausar las animaciones con `document.getAnimations()` durante la medida, leer `getBoundingClientRect()` sin transformaciones y fraccionario, y reanudarlas. Su elección por motor se registra en la evidencia
  - Cumple: FR-051; contrato §3.2 y §5.
  - Quién: agente; el gestor relanza **solo los tramos de ese motor** con `release_legs`. Depende de: T045.
  - Evidencia: laboratorio.
  - Terminado cuando: el motor cumple las siete condiciones con la alternativa, o queda escrito que tampoco.

- [ ] T048 **Humana (fundadores), condicional**: si el comparador **tampoco** es fiable con la alternativa en algún motor, la decisión **vuelve a los fundadores** con la opción (c) de Q7 («solo WebKit», que exige enmendar la 19.4) o la que corresponda al motor que falle. **Nada se marca como medido** en ese motor. El resto del PR A sigue
  - Cumple: FR-051; Q7.
  - Quién: los dos; el gestor presenta las salidas. Depende de: T047.
  - Evidencia: revisión (la decisión escrita).
  - Terminado cuando: hay decisión escrita; si exige enmienda, va a un PR documental, no a este.

- [ ] T049 `evidence.md`: resultados del punto de control: duración por tramo, calibración por motor y control («x de 10»), el método que usó cada motor (§3.2), la concordancia del control 7 con los avisos de más listados, y la primera salida de cada arnés (CLS, LCP, INP, GoalStack, listas largas) rotulada «laboratorio»
  - Cumple: FR-050–FR-054 (primera salida); contrato §7.
  - Quién: agente, con el run que da el gestor. Depende de: T045–T048.
  - Evidencia: laboratorio.
  - Terminado cuando: cada tramo tiene su fila con el número de run.

- [ ] T050 **Humana (gestor)**: con **T002 y T003 cerrados** (FR-001; D1), marcar el PR A como listo (la única pasada del gate) y comprobar en el último commit: los cuatro jobs en verde; `a11y-session` **< 600 s**; `db` lejos de 600 s (si se acerca, la prueba de T039 pasa a `lab-interaction` antes del merge); `ci-workflow` y el comparador en verde; `states-matrix.md` sin celdas sin dueño. Pedir el merge a la dueña
  - Cumple: FR-001, FR-095; criterios de salida del PR A.
  - Quién: gestor; merge, la dueña. Depende de: T002, T003, T049.
  - Evidencia: CI (run del gate).
  - Terminado cuando: el PR A está en `main`.

**Checkpoint**: PR A mergeado; el comparador es fiable en cada motor o su decisión está en manos de los fundadores (T048).

---

## Phase 2: Barrido y laboratorio sobre `main` con el PR A (paso 2)

**Purpose**: los hallazgos que alimentan el PR B. Los runs, en serie (regla 4).

- [ ] T051 [US4] **Humana (gestor)**: **barrido `@sweep`** sobre `main` (`gh workflow run ci.yml --ref main -f a11y_sweep=true`). Medir su duración. El caso de la raíz al 200 % a 1440 falla, como se espera (I3)
  - Cumple: FR-040, FR-042, FR-046 (primera pasada).
  - Quién: gestor. Depende de: T050.
  - Evidencia: CI (run a mano).
  - Terminado cuando: el run terminó y sus fallos están en la lista de hallazgos. Si el barrido mide **más de 600 s**, se activa T066.

- [ ] T052 **Humana (gestor)**: **`release` sobre `main`**, solo si el commit mergeado no es el del punto de control, y **solo con los tramos que cambiaron** después (`release_legs`, I6)
  - Cumple: FR-050–FR-054; plan, paso 2.
  - Quién: gestor. Depende de: T050, T051 (en serie).
  - Evidencia: CI + laboratorio.
  - Terminado cuando: se lanzó y terminó, o consta por qué no hacía falta.

- [ ] T053 [US6] **Humana (gestor)**: **V15 · ensayo del borrado en `juntia-dev`** (contrato §7), con el guardia de destino, un solo agente y la clave de administración de `juntia-dev`. Siembra con `db:dev:reset` una pareja (con una solicitud aprobada) y una persona sola, escribe los dos manifiestos con aprobaciones, exportaciones y confirmaciones de prueba, y ejecuta **tres corridas**:
  - los dos casos completos, hasta `verified`;
  - un manifiesto con huellas válidas **sin confirmaciones**, que tiene que ser rechazado (F85-12);
  - un `--abort` desde `locked`, que deja las cuentas desbloqueadas.
  - Cumple: FR-067; SC-008 (procedimiento); D2.
  - Quién: gestor. Depende de: T050. Puede hacerse en cualquier momento después del PR A.
  - Evidencia: revisión. El `request_id` y las huellas cortas de los UUID; recuentos por tabla antes y después; la secuencia de estados; la salida de `check-invariants.sql`; la comprobación de Auth.
  - Terminado cuando: la casilla del ensayo de la [checklist](release-checklist.md) §7 tiene su evidencia.

- [ ] T054 [US4] **Humana (gestor)**: ejecutar `scripts/dev-target/seed-long-lists.mjs` en `juntia-dev` con el lock (la cuenta no se borra al resetear sin avisar), y hacer las **capturas PNG a 390 y 1440** de Actividad, el historial de aportes y el de presupuestos con la app local contra `juntia-dev`. Cómo la recorren los fundadores: **N2**
  - Cumple: FR-043.
  - Quién: gestor. Depende de: T050; N2 resuelta.
  - Evidencia: capturas (datos de prueba) más la integración de más de 500 filas existente y T027.
  - Terminado cuando: las capturas están en `specs/005-gate-mvp-1/evidence/`.

- [ ] T055 **Humana (gestor)**: **lista final de hallazgos para el PR B**: T011 más el PR A (T045, T049), T051–T054 y las revisiones. Cada uno: defecto (con su capa de prueba), funcionalidad nueva (MVP-2, FR-083) o fallo crítico. Si el abanico **falla D3** en T045 o T052, la pantalla cae a la lista y **vuelve a los fundadores** (decisión 22.2) antes de entrar en B. Las salidas pendientes del paso 0b entran en `evidence.md` (I9)
  - Cumple: FR-053, FR-083, FR-094; spec, «Edge Cases».
  - Quién: gestor; los fundadores, si hay decisión. Depende de: T051–T054.
  - Evidencia: revisión.
  - Terminado cuando: cada hallazgo tiene destino y el brief del PR B los recoge.

---

## Phase 3: PR B · Correcciones (paso 3)

**Purpose**: defectos, nunca funcionalidades. Cada corrección con su prueba en la capa más baja (FR-094; `docs/TESTING.md` §6). **Puede partirse en dos PR** si las correcciones tocan áreas que el selector clasifica distinto (Q1). Dos de los tres puntos de Q11 ya están corregidos en `main` (`829c420`, PR #74): aquí solo se confirman (research R8).

**FR**: FR-032, FR-042, FR-053 (si falla), FR-067 (copy), FR-094 y los de cada hallazgo.

### Grupo 3A — pruebas primero (T056–T058 `[P]` al escribirlas; T059 sin `[P]` hasta conocer sus archivos, F86-3)

- [ ] T056 [P] [US4] **Residuo de F13**: la prueba es el caso `@sweep` (b) de T020, que hoy falla. Si la corrección cambia la lógica de presentación del abanico (cuándo se presenta abanico o pila), un test de **componentes** en `src/features/goals/` que lo afirme. jsdom no calcula diseño: la geometría solo la ve el barrido (research R9)
  - Cumple: FR-042; Q11.
  - Quién: agente del PR B. Depende de: T050.
  - Evidencia: CI (barrido del candidato, T072).
  - Terminado cuando: la prueba existe y falla antes de T060.

- [ ] T057 [P] [US6] Test de **componentes** de la pantalla Mi cuenta → Privacidad: además de «no disponible», dice **cómo pedir la eliminación** (a quién se pide y que la ejecuta el gestor tras confirmar), con el texto de `es.ts`
  - Cumple: FR-067; contrato §8.
  - Quién: agente. Depende de: T050.
  - Evidencia: CI (job `app`).
  - Terminado cuando: falla antes de T061.

- [ ] T058 [P] [US3] **Condicional (T005 dice corregir)**: tests de **componentes** de la transición de contexto y de la apertura de meta: **ningún número del contexto anterior aparece con el título nuevo**; con movimiento reducido no hay animación; la meta del frente se precarga del **mismo contexto**. Las comprobaciones de HTML, RSC y prefetch de las specs 1, 3, 4 y 5 siguen como están y tienen que seguir verdes
  - Cumple: FR-032; US-14; FR-085 de la 004; FR-037–FR-039 de la 003; research R10.
  - Quién: agente. Depende de: T005.
  - Evidencia: CI.
  - Terminado cuando: los casos fallan antes de T062 y T063.

- [ ] T059 Una prueba por **cada hallazgo** de T055 que sea defecto, en la capa más baja que detecta su fallo, con el criterio literal copiado
  - Cumple: FR-094.
  - Quién: agente. Depende de: T055. Sin `[P]` (F86-3): sus archivos destino solo se conocen con los hallazgos; puede ir a la vez que T056–T058 solo si no comparte ninguno.
  - Evidencia: CI.
  - Terminado cuando: cada prueba falla antes de su corrección.

### Grupo 3B — correcciones (en serie: comparten `es.ts` y componentes)

- [ ] T060 [US4] **Corregir el residuo de F13** en `src/features/goals/` (GoalStack): el abanico se activa con una **consulta de contenedor en `rem`** sobre el bloque de metas (el ancho mínimo que necesita, en `rem`) y su geometría pasa a `rem`. A la escala normal no cambia nada (mismo umbral en px); con la raíz al 200 %, el contenedor no llega y se presenta la pila
  - Cumple: FR-042; Q11; research R9.
  - Quién: agente. Depende de: T056.
  - Evidencia: CI (barrido del candidato) más capturas.
  - Terminado cuando: el caso (b) de T020 pasa en local contra `juntia-dev` con `-g` y nada cambia a 1440 al 100 %.

- [ ] T061 [US6] Añadir a `src/lib/copy/es.ts` (junto a `deleteDescription`) la frase que explica **cómo pedir la eliminación**; el texto exacto lo aprueban los fundadores en T067
  - Cumple: FR-067; contrato §8.
  - Quién: agente. Depende de: T057.
  - Evidencia: CI (T057).
  - Terminado cuando: T057 pasa.

- [ ] T062 [US3] **Condicional (S5)**: precargar la meta del frente y la siguiente **del mismo contexto** (`<Link prefetch>` en las cartas visibles). No cruza ámbitos
  - Cumple: FR-032; research R10.
  - Quién: agente. Depende de: T058.
  - Evidencia: CI y nueva medición en iPhone (T070).
  - Terminado cuando: T058 pasa y las comprobaciones de privacidad de las specs 1, 3, 4 y 5 siguen verdes en el gate.

- [ ] T063 [US3] **Condicional (S1)**: **no se precarga el otro contexto**. La coreografía arranca con lo que no es dato (título, color de contexto, forma de los bloques) en cuanto se toca el selector; los números esperan en su sitio, en esqueleto, hasta que llegan los del contexto correcto. Si S1 sigue por encima de 1 s, se mide qué consulta tarda y se trae a los fundadores antes de cambiar cómo se cargan los datos
  - Cumple: FR-032; US-14; MOTION_SYSTEM §1; research R10.
  - Quién: agente. Depende de: T058.
  - Evidencia: CI y T070.
  - Terminado cuando: T058 pasa y ningún fotograma muestra números del contexto anterior con el título nuevo.

- [ ] T064 [US4] **Condicional**: monto perdido al cruzar 768 px y marco de foco del monto: **sin código**, salvo que el caso `@sweep` (c) de T020, T007 o T006 lo reproduzcan. Si se reproduce, la corrección y su prueba de componentes junto a `src/features/expenses/annotate-presentation.test.tsx`
  - Cumple: Q11; research R8.
  - Quién: agente. Depende de: T051, T055.
  - Evidencia: CI.
  - Terminado cuando: consta en la descripción del PR B que no se reprodujo (con sus salidas), o la corrección pasa.

- [ ] T065 Corregir **cada hallazgo** de T055 que sea defecto, incluida la caída a la lista del abanico si los fundadores la confirmaron (T055)
  - Cumple: FR-094; los FR de cada hallazgo.
  - Quién: agente. Depende de: T059.
  - Evidencia: CI.
  - Terminado cuando: cada prueba de T059 pasa.

- [ ] T066 **Condicional (T051 midió más de 600 s)**: en `.github/workflows/ci.yml`, `a11y-session` en modo barrido corre como matriz de **dos tramos con `--shard`**, **solo cuando `a11y_sweep` es verdadero**; el nivel ligero del gate no cambia. Actualizar `tests/ci-workflow.test.ts` (el evaluador cubre la matriz y la tabla sigue cumpliéndose)
  - Cumple: regla 5; [contracts/ci.md](contracts/ci.md), «Barrido `@sweep`» (decisión del plan condicionada a la medición).
  - Quién: agente. Depende de: T051.
  - Evidencia: CI.
  - Terminado cuando: la prueba del workflow pasa con los dos tramos.

### Grupo 3C — salida del PR B

- [ ] T067 **Humana (fundadores)**: **aprobación visual** de lo que cambió, con **capturas a 390 y 1440 en los dos temas** hechas con el dataset de prueba, y del **texto de cómo pedir la eliminación** (T061)
  - Cumple: FR-067; criterios de salida del PR B; reglas 8 y 10.
  - Quién: los dos; capturas, el agente. Depende de: T060–T065.
  - Evidencia: revisión (más las capturas PNG en `specs/005-gate-mvp-1/evidence/`).
  - Terminado cuando: aprobado por escrito.

- [ ] T068 `npm run verify` y `npm run e2e:dev` completo una vez antes del push final; PR en borrador con la descripción de `AGENTS.md` 15; revisión en borrador
  - Cumple: reglas 2 y 3.
  - Quién: agente. Depende de: T067.
  - Evidencia: revisión.
  - Terminado cuando: visto bueno de la revisión.

- [ ] T069 **Humana (gestor)**: marcar el PR B (o cada uno, si se partió) como listo: gate verde. Si tocó rendimiento o esqueletos, **un run parcial de `release`** con los tramos afectados (`release_legs`, I10). Pedir el merge a la dueña
  - Cumple: FR-094, FR-095; criterios de salida del PR B.
  - Quién: gestor; merge, la dueña. Depende de: T068.
  - Evidencia: CI.
  - Terminado cuando: mergeado y, si aplicaba, el parcial de `release` registrado en `evidence.md`.

- [ ] T070 [US3] **Humana (cada fundador), condicional (F02 corregido)**: repetir **V1** (T004) en producción con el PR B desplegado
  - Cumple: FR-032; Q4.
  - Quién: cada fundador; el gestor calcula las medianas. Depende de: T069.
  - Evidencia: dispositivo.
  - Terminado cuando: las nuevas medianas están en `evidence.md`; si siguen por encima de 1 s, vuelve al gestor según T063.

---

## Phase 4: Commit candidato (paso 4)

**Purpose**: el candidato es `main` tras el último PR de código. Sobre él, **en serie** (regla 4), los tres runs a mano. Los lanza el gestor. Un fallo por la infraestructura del runner se relanza solo en su job o tramo; un fallo del código va a un PR B y el candidato cambia.

- [ ] T071 [US1] **Humana (gestor)**: **(a) run completo** sobre el candidato (`gh workflow run ci.yml --ref main`, sin entradas): `app`; `db` con el ensayo de restauración y N1–N11 y las 21 pruebas pgTAP; `e2e` con **las cinco specs** (el selector cae en la regla 6, sin PR); `a11y-session` con el registro completo
  - Cumple: FR-010, FR-020 (Chromium), FR-031 (lo objetivo); SC-001.
  - Quién: gestor. Depende de: T069 (o T050 si no hubo PR B).
  - Evidencia: CI.
  - Terminado cuando: todo verde; run en la [checklist](release-checklist.md) §1 y en `evidence.md`.

- [ ] T072 [US4] **Humana (gestor)**: **(b) barrido** sobre el candidato (`-f a11y_sweep=true`), **una vez**
  - Cumple: FR-040, FR-042, FR-045, FR-046, FR-092; SC-004.
  - Quién: gestor. Depende de: T071.
  - Evidencia: CI.
  - Terminado cuando: cero violaciones serias o críticas, cero scroll horizontal, cero fallos de geometría, en siete anchos, dos temas, 200 %, teclado y 44 px.

- [ ] T073 [US2] [US5] **Humana (gestor)**: **(c) `release` completo** sobre el candidato (`-f release_lab=true`, sola), con WebKit
  - Cumple: FR-020 (WebKit), FR-043, FR-050–FR-054, FR-092; SC-002, SC-005, SC-006.
  - Quién: gestor. Depende de: T072.
  - Evidencia: CI + laboratorio.
  - Terminado cuando: `webkit-e2e-1` y `-2` verdes (un fallo solo de WebKit es un defecto del gate; si es del arnés, se documenta con su salida y lo decide la revisión de B, nunca «superado»); CLS = 0 sin redondear en las siete rutas de Chromium y por fotogramas en WebKit y Firefox; INP < 200 ms en las tres variantes; GoalStack pasa D3; LCP y listas largas registrados.

- [ ] T074 **Humana (gestor)**: registrar los tres runs en la checklist §1 y en `evidence.md`. Si algo falló: el defecto va a un PR B (Phase 3) y **cada commit candidato nuevo pasa T071, T072 y T073 completos**, con las cinco specs en WebKit (FR-020, FR-092; F86-2); los parciales de `release` solo valen como verificación del PR B (T069, I10). Nada se marca superado. Si el abanico falla D3, T055
  - Cumple: regla 7; spec, «Edge Cases».
  - Quién: gestor. Depende de: T071–T073.
  - Evidencia: revisión.
  - Terminado cuando: los tres runs en verde sobre el mismo candidato.

- [ ] T075 **Humana (gestor)**: **pedir el Mac prestado** para el paso 6 con **una semana de margen** (FR-071)
  - Cumple: FR-071; plan, «Riesgos».
  - Quién: gestor, a los fundadores. Depende de: — (se puede pedir desde el paso 3).
  - Evidencia: revisión (fecha acordada).
  - Terminado cuando: hay fecha.

---

## Phase 5: Despliegue, etiqueta y sondas (paso 5)

- [ ] T076 [US2] **Humana (la dueña, o el gestor con su «sí»)**: **etiqueta anotada `mvp-1-YYYY-MM-DD`** en el commit candidato (I4); comprobar que producción sirve ese commit y que Vercel muestra a la dueña como autora del HEAD de `main` (decisión 13, regla 2)
  - Cumple: FR-022.
  - Quién: la dueña o el gestor con su «sí». Depende de: T074.
  - Evidencia: revisión (etiqueta e identificador del despliegue).
  - Terminado cuando: la cabecera y la casilla de la [checklist](release-checklist.md) §2 están llenas.

- [ ] T077 [P] [US1] **Humana (gestor)**: **sonda de la superficie interna** en producción: `curl` de solo lectura a `/interno/primitivos` con el host propio y con un host no autorizado → 404, sin el título interno en el HTML ni en el RSC
  - Cumple: FR-014 (001-T072, partes 1 y 2); decisión 12 (sin excepción).
  - Quién: gestor. Depende de: T076.
  - Evidencia: revisión (código, longitud y si aparece el título).
  - Terminado cuando: la casilla de la checklist §2 tiene su salida.

- [ ] T078 [P] [US1] **Humana (la dueña, o el gestor con el conector de Vercel en solo lectura y su «sí»)**: lista de **nombres** de las variables de producción, sin valores: ninguna clave secreta de Supabase con prefijo `NEXT_PUBLIC_`
  - Cumple: FR-015 (primera mitad).
  - Quién: la dueña o el gestor. Depende de: T076.
  - Evidencia: revisión (solo nombres).
  - Terminado cuando: la casilla de la checklist §2 tiene su salida.

- [ ] T079 [US6] **Humana (el fundador con gpg, con el gestor sin ver la contraseña)**: `scripts/backup.sh` en modo producción (quickstart de la 002 §4.1): la comprobación bloqueante de que las **migraciones de producción coinciden con la última `db-prod-*`** pasa. Sirve además de copia previa al periodo de uso
  - Cumple: FR-015 (segunda mitad); FR-062; research R12.
  - Quién: el fundador con gpg y el gestor. Depende de: T076.
  - Evidencia: revisión (manifiesto sin datos).
  - Terminado cuando: la casilla de migraciones de la checklist §2 está marcada.

- [ ] T080 [P] [US1] **Gestor**: revisión de código de que **no hay SDK de analítica** (`package.json`) y de que las respuestas de error no llevan importes ni notas (los contratos de errores de las specs 002–004 lo cubren; se citan)
  - Cumple: FR-013 (dos de sus tres partes); SC-008.
  - Quién: gestor. Depende de: T076.
  - Evidencia: revisión.
  - Terminado cuando: la conclusión y lo citado están en `evidence.md`.

---

## Phase 6: Verificaciones en producción con el candidato (paso 6)

**Purpose**: las verificaciones humanas de [contracts/human-verifications.md](contracts/human-verifications.md) con el candidato desplegado. Cada fila de dispositivo: fecha, rol, modelo, iOS, navegador y versión, commit desplegado, resultado y evidencia.

- [ ] T081 [P] [US2] **Humana (cada fundador)**: **V3 · humo de release**: entrar; anotar un gasto privado real; ver Inicio y Actividad con el gasto en la lista y en el total; abrir el balance (desde Inicio en el móvil); abrir una meta; exportar JSON y CSV; salir y volver a entrar. **Red**: con la pestaña de red del inspector (o Safari de escritorio sin Mac), ninguna petición a terceros (solo la app, Supabase y Vercel)
  - Cumple: FR-021, FR-013 (red); SC-008.
  - Quién: cada fundador, su cuenta y su teléfono. Depende de: T076.
  - Evidencia: dispositivo + revisión.
  - Terminado cuando: las dos casillas de humo de la checklist §3 están marcadas.

- [ ] T082 [US3] **Humana (los dos, por separado)**: **V2 · revisión final de S1–S5** (20 filas por persona, como T006), más:
  - la **aprobación separada** de cada elemento propuesto (§15.9) pendiente en pantalla: «Tu disponible · aportaste», la paleta propuesta, «Gasto, ingreso y liquidación en tinta», las personas con patrón en `person.1–2` y «Cuenta reutiliza los fondos de categoría», cada uno «apruebo», «no apruebo» o comentario;
  - los **criterios del handoff** («Criterios de aceptación aplicables» de la spec), uno por uno con datos reales;
  - el **marco de foco del monto** en S2 (Q11, R8);
  - **teclado físico a 1440**: todo operable, N abre Anotar, Escape cierra, el foco vuelve al disparador;
  - **modo oscuro** en las capturas.
  - Cumple: FR-030, FR-031, FR-033, FR-034, FR-045, FR-046; SC-010.
  - Quién: los dos. Depende de: T076.
  - Evidencia: revisión + capturas PNG anonimizadas por experiencia y ancho.
  - Terminado cuando: la tabla S1–S5 y la de criterios del handoff están completas y aprobadas por los dos.

- [ ] T083 [P] [US4] **Humana (cada fundador)**: repetir **V4** (T007) con el candidato
  - Cumple: FR-044 (cierra la parte iPhone de 002-T086 y la `[V]` de `visualViewport`).
  - Quién: cada fundador. Depende de: T076.
  - Evidencia: dispositivo.
  - Terminado cuando: las dos filas de dispositivo están completas.

- [ ] T084 [P] [US3] **Humana (fundadores)**: repetir **V5** (T008) con el candidato
  - Cumple: FR-070 (002-T091, 002-T089; 001-T073, 001-T075).
  - Quién: un fundador con VoiceOver; los dos con contraste. Depende de: T076.
  - Evidencia: dispositivo.
  - Terminado cuando: las notas por pantalla están en `evidence.md`.

- [ ] T085 [P] [US3] **Humana (los dos)**: **V6 · back-swipe de iOS frente al cierre de la meta inmersiva**: abrir una meta y cerrarla con el gesto de volver, 5 veces: se cierra una vez, sin doble animación ni pantalla en blanco, y el foco vuelve a la carta
  - Cumple: FR-070 (MOTION_SYSTEM `[V]`; cubre el caso de T021 en dispositivo).
  - Quién: los dos. Depende de: T076.
  - Evidencia: dispositivo; dos fotogramas PNG anonimizados.
  - Terminado cuando: la nota y los fotogramas están en `evidence.md`.

- [ ] T086 [P] [US3] **Humana (un fundador)**: **V8 · tema entre dispositivos**: tema oscuro en el iPhone; entrar en el escritorio con la misma cuenta → oscuro desde el primer fotograma, sin parpadeo; y al revés
  - Cumple: FR-072.
  - Quién: un fundador. Depende de: T076.
  - Evidencia: dispositivo.
  - Terminado cuando: la nota con los dos dispositivos está en `evidence.md`.

- [ ] T087 [US5] **Humana (gestor, con el fundador que tiene el Mac)**: **comprobación previa del grabador** (research R11): `scripts/cls-frames/recorder.js` como «Inspector Bootstrap Script» en Safari de escritorio contra `juntia-dev` (en el equipo de un fundador con acceso a un Mac, o en el Mac prestado el mismo día, antes de producción): llena `window.__clsFrames` y el comparador lo lee
  - Cumple: FR-071 (preparación).
  - Quién: gestor y un fundador. Depende de: T075, T050.
  - Evidencia: revisión.
  - Terminado cuando: una salida de prueba pasa por `compare.mjs`.

- [ ] T088 [US5] **Humana (un fundador con el Mac; el gestor ejecuta el comparador)**: **V9 · CLS en iPhone**: iPhone conectado; Safari del Mac → Desarrollo → el iPhone → Juntia; el grabador como «Inspector Bootstrap Script»; **10 cargas por ruta de FR-050**; tras cada una, `copy(JSON.stringify(window.__clsFrames))` y pegar en un archivo del Mac; una grabación de Timelines («Layout & Rendering») de una carga de Inicio
  - Cumple: FR-071 (002-T094; Q6, opción a); SC-005.
  - Quién: un fundador; el gestor. Depende de: T087.
  - Evidencia: dispositivo. La salida del comparador por ruta (`.txt`, solo cajas) en `specs/005-gate-mvp-1/evidence/`, la captura de Timelines y la fila de dispositivo con la versión de Safari del Mac.
  - Terminado cuando: CLS = 0 por fotogramas en cada ruta, o el defecto va a un PR B y hará falta otra sesión con el Mac.

- [ ] T089 [P] [US6] **Humana (cada fundador)**: **V10 · exportación con datos reales**: JSON y CSV desde Mi cuenta → Privacidad; abrir los dos; están sus movimientos, metas, aportes, solicitudes y presupuestos, y nada privado del otro
  - Cumple: FR-060; SC-008.
  - Quién: cada fundador. Depende de: T076.
  - Evidencia: revisión (recuentos por tipo y «nada del otro: sí/no», sin contenido).
  - Terminado cuando: las dos casillas de la checklist §3 están marcadas.

- [ ] T090 [P] [US6] **Humana (cada fundador; la dueña copia el límite)**: **V11 · recuperación de acceso** en producción con el correo de Supabase. La dueña copia del panel el límite de envío de correos de Auth vigente
  - Cumple: FR-063.
  - Quién: cada fundador; la dueña. Depende de: T076.
  - Evidencia: revisión (fecha y resultado por persona; el límite).
  - Terminado cuando: las tres casillas de recuperación de la checklist §3 están marcadas.

- [ ] T091 [US6] **Humana (la dueña, con el gestor)**: **V12 · vuelta atrás**: a una hora sin uso, «Instant Rollback» de Vercel al despliegue de producción anterior (sin migraciones entre los dos); comprobar que sirve; volver a promover el candidato; comprobar que sirve
  - Cumple: FR-064; research R13.
  - Quién: la dueña y el gestor. Depende de: T076.
  - Evidencia: revisión (identificadores de los tres despliegues y la hora de cada paso).
  - Terminado cuando: las dos casillas de la checklist §4 están marcadas.

- [ ] T092 [US7] **Humana (los dos)**: **sesión guiada del escenario de pareja de §4**, en móvil y en escritorio, con cuentas y dispositivos distintos: una meta individual y una compartida, aportes independientes, un gasto con meta sin doble conteo y un presupuesto creado y desactivado
  - Cumple: FR-080; V13 «Antes del periodo».
  - Quién: los dos. Depende de: T081–T091.
  - Evidencia: revisión.
  - Terminado cuando: los dos completan cada tarea sin ayuda, por escrito.

- [ ] T093 [US5] **Humana (cada fundador)**: **V7 · US-12, mediana < 10 s**: grabación de pantalla durante al menos 10 gastos habituales reales; tiempo del toque en Anotar al aviso «Guardado». Puede hacerse durante el paso 7
  - Cumple: FR-055 (002-T087); SC-007.
  - Quién: cada fundador. Depende de: T076.
  - Evidencia: dispositivo (tabla de tiempos, mediana por persona y el método escrito).
  - Terminado cuando: las dos medianas están en `evidence.md`.

---

## Phase 7: Siete días de uso diario (paso 7)

**Purpose**: Q10 (opción a) con D4 (opción a): **despliegues de producción congelados** durante el periodo.

- [ ] T094 **Humana (gestor)**: abrir el periodo: registrar en `evidence.md` la **fecha de inicio**, el commit desplegado y la congelación de despliegues. Si el periodo se reinicia, registrar la fecha nueva y el motivo
  - Cumple: FR-080, FR-081; D4.
  - Quién: gestor. Depende de: T092.
  - Evidencia: revisión.
  - Terminado cuando: la fila del periodo existe.

- [ ] T095 [US7] **Humana (los dos)**: **7 días consecutivos de uso diario real** en producción, con al menos un fin de semana y una liquidación
  - Cumple: FR-080; Q10.
  - Quién: los dos. Depende de: T094.
  - Evidencia: revisión.
  - Terminado cuando: pasan los 7 días sin fallo crítico.

- [ ] T096 **Condicional (fallo durante el periodo; se activa en cualquier día del periodo, F86-1)**: un **fallo crítico** (dinero, privacidad, pérdida de datos o accesibilidad básica) **para el periodo** en cuanto aparece: se corrige en un PR B (Phase 3), el candidato nuevo pasa T071–T074 completos y los pasos 5 y 6 que su cambio afecte, y después **se repiten T094 y T095**: los 7 días vuelven a empezar. Un fallo **no crítico** va a la lista de MVP-2 (T101), sin despliegue
  - Cumple: D4; FR-082, FR-083.
  - Quién: gestor; los fundadores clasifican. Depende de: T094 (inicio del periodo), no de T095 (F86-1).
  - Evidencia: revisión.
  - Terminado cuando: cada fallo tiene destino escrito.

- [ ] T097 [US6] **Humana (el fundador con gpg, con el gestor sin ver la contraseña)**: **V14 · copia y restauración real** al final del periodo: `scripts/backup.sh` en modo producción; `scripts/restore-plain.sh` en un PostgreSQL 17 limpio de su equipo (Git Bash con el PostgreSQL 17 de PGDG o EDB si usa Windows; se instala ese día, antes de descifrar nada); `check-invariants.sql`; el manifiesto de recuentos y huellas, **incluidas las seis tablas de P0-3**. Y escribir en la checklist la **cadencia**: copia semanal (día fijo que eligen los fundadores) y una antes de cada migración de producción; **pérdida máxima aceptada, 7 días**; dueño; recordatorio semanal en su calendario
  - Cumple: FR-061, FR-062, FR-065 (regla escrita); SC-009; Q9.
  - Quién: el fundador con gpg y el gestor. Depende de: T095.
  - Evidencia: revisión (manifiesto y log de la restauración, sin datos).
  - Terminado cuando: las casillas de la checklist §5 están marcadas.

- [ ] T098 [P] [US1] **Humana (la dueña, o el gestor con su «sí» y en solo lectura)**: **registros de ejecución de Vercel de la semana**: búsquedas de importes (`\$\s?\d`, `amount`, `_minor`), notas, correos y tokens (`eyJ`, `sb_secret`, `Bearer`). Se registran **las búsquedas y su número de coincidencias, nunca las líneas**. Una coincidencia es un defecto de privacidad (PR B)
  - Cumple: FR-013 (tercera parte); SC-008; research R14.
  - Quién: la dueña o el gestor. Depende de: T095.
  - Evidencia: revisión.
  - Terminado cuando: la casilla de la checklist §8 está marcada.

- [ ] T099 [P] [US6] **Humana (gestor)**: **tabla de idempotencia**: `select count(*)` y `pg_total_relation_size` de solo lectura en producción, con el procedimiento de migraciones (lectura: sin confirmación por paso)
  - Cumple: FR-068; Q12.
  - Quién: gestor. Depende de: T095.
  - Evidencia: revisión (recuento y tamaño).
  - Terminado cuando: la casilla de la checklist §8 está llena y su revisión, en la lista de MVP-2.

- [ ] T100 [US7] **Humana (cada fundador, por separado y sin leer la del otro)**: **V13 · valoración**: una nota en cada eje (uso diario, legibilidad, rapidez y carácter visual), las tres preguntas de §6.7 (qué es claro, qué impresiona, qué estorba) y la decisión «apruebo» o «no apruebo»
  - Cumple: FR-081; SC-011.
  - Quién: cada fundador. Depende de: T095.
  - Evidencia: revisión (las dos valoraciones en `evidence.md`, por rol).
  - Terminado cuando: las dos existen.

- [ ] T101 [US7] **Humana (gestor; los fundadores aceptan)**: **lista de MVP-2** con dueño: los fallos no críticos del uso diario, la revisión de la tabla de idempotencia, el #53, «Descartar», el cierre con View Transition, RUM y el nivel 2. Los dos la aceptan por escrito
  - Cumple: FR-083; Q2, Q5, Q11, Q12.
  - Quién: gestor; los dos. Depende de: T099, T100 y, si se activó, T096.
  - Evidencia: revisión.
  - Terminado cuando: cada fila tiene dueño y la aceptación de los dos consta por rol y fecha.

- [ ] T102 **Humana (los dos; el gestor redacta)**: registrar la **excepción formal de Android prorrogada más allá de MVP-1** con los cinco datos de la decisión 12: 002-T086 (parte Android), T090, T092, T095 y **los springs a ≥ 55 fps en Android de gama media** (que se añaden), con la revalidación como condición de abrir la app a un tercero y la mitigación (emulación de Chrome y axe). Estado «EXCEPCIÓN APROBADA», nunca «verificado»
  - Cumple: FR-071 (Q6, opción c); SC-003.
  - Quién: los dos aprueban; el gestor redacta. Depende de: T003 (la enmienda de la 19.2 va en 004-T085).
  - Evidencia: revisión.
  - Terminado cuando: la fila está en el inventario heredado de `evidence.md` con la aprobación de los dos.

---

## Phase 8: PR C · Evidencia y cierre (paso 8)

**Purpose**: solo documentos (`.md`, `.png` y `.txt` bajo `specs/`). **No lanza CI.** Si una salida exige un cambio de código, ese cambio va en un PR B adicional, no en el C.

- [ ] T103 Completar `specs/005-gate-mvp-1/evidence.md`:
  - **FR-002**, el inventario heredado sin filas «abiertas» (salida real, EXCEPCIÓN APROBADA o no aplica con motivo), incluidos el cierre de Q11 con las salidas de R8 y la excepción de T102;
  - **FR-003**, las salidas de las tareas antiguas sin casilla;
  - **FR-011**, la tabla de cobertura final;
  - **FR-030**, la tabla S1–S5; **FR-034**, los criterios del handoff;
  - **FR-056**, la tabla de CWV: cada métrica (LCP, INP, CLS) con qué se midió, dónde y con qué método; las filas del comparador rotuladas **«laboratorio · por fotogramas»** con el motor y su versión; LCP con mediana y máximo; lo no medible con «no medible en p75 real: motivo» (dos usuarios, sin medición de campo; RUM en MVP-2). **Ninguna cifra rotulada «p75»**;
  - las fechas del periodo de uso (D4), las dos valoraciones (FR-081) y la lista de MVP-2 (FR-083);
  - la tabla **SC-001 a SC-012**, cada uno con su run o su salida.
  - Cumple: FR-002, FR-003, FR-011, FR-030, FR-034, FR-056, FR-081, FR-083; SC-003, SC-012 y todos los SC.
  - Quién: agente del PR C, con las salidas que da el gestor. Depende de: T101, T102.
  - Evidencia: revisión.
  - Terminado cuando: ninguna fila queda abierta ni sin salida.

- [ ] T104 [P] `states-matrix.md` **final**: cada celda con su prueba en verde en el candidato (T071, T072) o su captura, y los «no aplica» con motivo
  - Cumple: FR-041.
  - Quién: agente. Depende de: T074.
  - Evidencia: revisión.
  - Terminado cuando: cero celdas sin cobertura.

- [ ] T105 [P] [release-checklist.md](release-checklist.md) con **todas las casillas marcadas** y su evidencia (enlace a `evidence.md`, a `evidence/` o la salida resumida), la cabecera llena (commit, etiqueta, despliegue) y la tabla de firmas con rol y fecha. Las firmas se quedan con los fundadores
  - Cumple: FR-062, FR-065, FR-066, FR-067, FR-069.
  - Quién: agente; firman el gestor y un fundador. Depende de: T097–T099.
  - Evidencia: revisión.
  - Terminado cuando: no queda ninguna casilla vacía.

- [ ] T106 **Comprobación de privacidad y formato** (regla 8): `git diff --name-only main` del PR solo lista `.md`, `.png` y `.txt` bajo `specs/005-gate-mvp-1/`; ninguna captura de producción sin anonimizar; ningún `.mov`, `.mp4`, nombre identificable, correo, token ni texto de aprobación
  - Cumple: regla 8 (F85-6); `AGENTS.md` 15a.
  - Quién: agente; lo confirma el gestor. Depende de: T103–T105.
  - Evidencia: revisión.
  - Terminado cuando: la comprobación está en la descripción del PR.

- [ ] T107 [P] Marcar las casillas de **este** `tasks.md` que estén hechas, con su salida en `evidence.md` (la lección de la 004: 0 de 89 marcadas, fila 13 de la spec)
  - Cumple: FR-003.
  - Quién: agente. Depende de: T103.
  - Evidencia: revisión.
  - Terminado cuando: las casillas coinciden con la evidencia.

- [ ] T108 **Humana (fundadores)**: aprobar el PR C; el gestor pide el merge a la dueña. No lanza CI
  - Cumple: FR-069, FR-081.
  - Quién: los dos; el gestor. Depende de: T103–T107.
  - Evidencia: revisión (el merge).
  - Terminado cuando: el PR C está en `main`.

---

## Phase 9: Declaración de MVP-1 (paso 9, fuera de esta spec)

- [ ] T109 **Humana (gestor; los fundadores aprueban)**: el **PR documental de declaración** actualiza el estado del maestro, de `AGENTS.md` y de `CLAUDE.md` («MVP-1 declarado»), **solo si** los dos aprueban, no queda ningún fallo crítico abierto y la tabla de FR-002 no tiene filas abiertas. Toca `AGENTS.md` y `CLAUDE.md`, así que **lanza CI a propósito** (`AGENTS.md` 15a)
  - Cumple: FR-082.
  - Quién: gestor; los dos. Depende de: T108.
  - Evidencia: revisión (el merge de ese PR).
  - Terminado cuando: el PR está en `main`.

---

## Decisiones abiertas

Dos puntos del desglose obligan a decidir algo que la spec, el plan y sus contratos no deciden. **No se cierran aquí.**

### N1 · `[NECESITA DECISIÓN]` ¿Cómo llega `allocations_check_sum` a la nota de ADR-007 y ADR-013 si hace falta suspenderlo?

- **Contexto:** el contrato del borrado (§1) dice que, si el trigger diferido `allocations_check_sum` rechaza un borrado completo, se añade por nombre a la lista de triggers suspendidos «y a la nota de T085, en el mismo PR A». Pero con D1 el PR A **no se mergea hasta que 004-T085 esté mergeado**: cuando el PR A lo descubra, la nota de 004-T085 ya puede estar en `main` sin ese trigger. Además, `allocations_check_sum` no es un trigger de solo inserción, que es lo que D2 decidió suspender: es una comprobación diferida de que las asignaciones suman el gasto. Y una nota de ADR no se cambia dentro de un PR de código (`AGENTS.md` 17).
- **Opciones:**
  - (a) **Averiguarlo antes de redactar 004-T085.** El agente del PR A corre pronto el caso 1 de T039 contra `juntia-dev` (D1 permite el borrador) y comunica el resultado (T042); el gestor escribe en la fila 19 de 004-T085 la lista con o sin `allocations_check_sum`.
  - (b) **Un PR documental corto** que añade el nombre a la nota después de 004-T085 y antes de marcar listo el PR A.
  - (c) **El PR A edita la nota** (un `.md` de `docs/adr/`) con la aprobación expresa de los fundadores en su revisión.
- **Recomendación: (a), con (b) como respaldo** si 004-T085 se mergea antes de tener el resultado. Mantiene la nota completa en una sola reconciliación y el PR de código sin cambios de ADR. (c) mezcla una nota de ADR con código.

### N2 · `[NECESITA DECISIÓN]` ¿Cómo recorren los fundadores la cuenta de listas largas de `juntia-dev`?

- **Contexto:** research R7 dice que `seed-long-lists.mjs` crea la cuenta en `juntia-dev` «para que los fundadores la recorran con su teléfono». Pero `juntia-dev` no tiene un despliegue propio: la app se usa contra él solo en desarrollo, en local (decisión 17). FR-043 pide como evidencia «capturas más la integración existente de más de 500 filas», no un recorrido en el teléfono.
- **Opciones:**
  - (a) **Capturas, sin teléfono.** El gestor hace las capturas a 390 y 1440 con la app local contra `juntia-dev` (T054) y el arnés del runner deja las suyas (T027); los fundadores las revisan.
  - (b) **Teléfono en la red local.** Un fundador sirve la app local contra `juntia-dev` en su red (`next dev` escuchando en la red) y los dos la abren en su iPhone.
  - (c) **Un despliegue de preview de Vercel contra `juntia-dev`.** Es configuración nueva en Vercel (variables de un entorno de preview), que hace la dueña.
- **Recomendación: (a).** Cumple FR-043 tal como está escrito, no toca Vercel ni la red de nadie, y las listas largas en el teléfono real ya las ve cada fundador con su uso diario a escala real. (b) es razonable si los fundadores quieren el recorrido táctil.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0**: T001 abre el borrador del PR A; T002 → T003 abren la marca de listo del PR A (T050).
- **Phase 0b**: independiente del PR A; puede ir antes o a la vez (D1). Alimenta el PR B.
- **Phase 1 (PR A)**: después de T001. Se mergea solo tras T002 y T003.
- **Phase 2**: después del merge del PR A. T053 puede hacerse en cualquier momento después.
- **Phase 3 (PR B)**: después de las fases 0b y 2.
- **Phase 4**: después del último PR de código. Sus tres runs, en serie.
- **Phase 5 → 6 → 7 → 8 → 9**, en orden. Un fallo crítico en cualquier día de 7 activa T096 (que depende de T094), vuelve a 3 y a 4 completo, y repite T094 y T095 (D4; F86-1).

### User Story Dependencies

- **US1** (dinero y privacidad): PR A (T013–T017), paso 4 (T071), sondas (T077, T078, T080), registros (T098).
- **US2** (humo de release): PR A (T021, T022, T036), paso 4 (T073), paso 6 (T081), etiqueta (T076).
- **US3** (S1–S5): paso 0b (T004–T006, T008), PR B (T058, T062, T063), paso 6 (T082, T084–T086).
- **US4** (anchos, estados, listas): PR A (T018–T020, T027, T028), pasos 2 y 4 (T051, T054, T072), PR B (T056, T060, T064).
- **US5** (rendimiento): PR A (T023–T026, T029–T034), punto de control (T045–T049), paso 4 (T073), Mac (T087, T088), US-12 (T093).
- **US6** (recuperación): PR A (T039–T041), ensayo (T053), PR B (T057, T061), pasos 5–7 (T079, T089–T091, T097, T099).
- **US7** (aprobación): pasos 6–9 (T092, T095, T100, T101, T109).

### Dentro del PR A

Grupos 1A–1F en paralelo entre sí (archivos distintos; `juntia-dev` por turnos) → 1G en serie. Dentro de 1D, 1E y 1F: la prueba primero y en rojo (T029, T035, T039).

### Parallel Opportunities

- **Paso 0b:** T004, T006, T007, T008, T009 y T010, el mismo día y en cualquier orden.
- **PR A:** T012, T013, T015, T016, T018, T021, T022, T029, T031, T035 y T038 desde el primer día; después, T024–T028.
- **PR B:** las pruebas T056–T058 (T059, solo si sus archivos no coinciden con los de esas).
- **Paso 5:** T077, T078 y T080. **Paso 6:** T081, T083–T086, T089 y T090. **Paso 7:** T098 y T099.
- **PR C:** T104, T105 y T107; T106 después de T103–T105.

## Parallel Example: arranque del PR A

```bash
Task: "T013 Test de dominio US-08 en src/domain/allocations/allocations.test.ts"
Task: "T015 Test de componentes US-21 en src/features/goals/goals.test.tsx"
Task: "T016 Tests de componentes US-13 en src/features/{auth,expenses,home,couple}/"
Task: "T029 Test del comparador en tests/cls-frames.test.ts"
Task: "T031 Grabador en scripts/cls-frames/recorder.js"
Task: "T035 Test del workflow en tests/ci-workflow.test.ts"
```

## Implementation Strategy

### Tres PR (Q1, opción a) y los pasos humanos

| Paso | Fase | Tareas | Número de tareas | Quién, sobre todo |
| --- | --- | --- | --- | --- |
| 0 · Entrada al gate | Phase 0 | T001–T003 | 3 | Fundadores; gestor |
| 0b · Mediciones en producción | Phase 0b | T004–T011 | 8 | Fundadores; gestor |
| 1 · PR A | Phase 1 | T012–T050 | 39 | Agente; gestor (T045, T050); fundadores si T048 |
| 2 · Barrido y laboratorio | Phase 2 | T051–T055 | 5 | Gestor |
| 3 · PR B | Phase 3 | T056–T070 | 15 | Agente; fundadores (T067, T070); gestor (T069) |
| 4 · Candidato | Phase 4 | T071–T075 | 5 | Gestor |
| 5 · Despliegue y sondas | Phase 5 | T076–T080 | 5 | La dueña; gestor; fundador con gpg |
| 6 · Verificaciones en producción | Phase 6 | T081–T093 | 13 | Fundadores; gestor |
| 7 · Siete días de uso | Phase 7 | T094–T102 | 9 | Fundadores; gestor |
| 8 · PR C | Phase 8 | T103–T108 | 6 | Agente; fundadores |
| 9 · Declaración | Phase 9 | T109 | 1 | Gestor; fundadores |
| **Total** | | **T001–T109** | **109** | |

De las 109, son **condicionales** T042, T046–T048, T058, T062–T064, T066, T070 y T096: solo se ejecutan si se cumple su condición.

### Costo de CI esperado por paso

Estimaciones del plan («Presupuesto de CI por PR» y «Minutos de Actions de P0-4») y de [contracts/ci.md](contracts/ci.md) («Coste por lanzamiento completo»), repartidas por paso. Las mide cada run; un tramo de más de 600 s se parte (regla 5).

| Paso | Qué gasta | Minutos facturados (estimación) |
| --- | --- | --- |
| 0 | 004-T085 es solo `.md` | 0 |
| 0b | Nada | 0 |
| 1 · PR A | Gate del PR A (≈ 30) + `release` completo del punto de control, que calibra el comparador (≈ 145–155) + `inputs-guard` (1) + parciales de T047 si un motor falla (dentro de la partida de parciales) | **≈ 176–186** |
| 2 | Barrido (≈ 10) + `release` parcial solo si el commit mergeado no es el del punto de control (I6, partida de parciales) | **≈ 10** (+ parcial si aplica) |
| 3 · PR B | Uno o dos gates (≈ 30–60) + `release` parcial de los tramos afectados (≈ 20–60) | **≈ 50–120** |
| 4 · Candidato | Run completo (≈ 30) + barrido (≈ 10) + `release` completo (≈ 145–155) + `inputs-guard` (≈ 3) | **≈ 188–198** |
| 5–7 | Nada (salvo un fallo crítico, que repite los pasos 3 y 4: ≈ 240–320 más) | 0 |
| 8 · PR C | Solo `.md`, `.png` y `.txt` bajo `specs/` | 0 |
| 9 · Declaración | Un gate (toca `AGENTS.md` y `CLAUDE.md`); fuera de esta spec | ≈ 30 |
| **Total de P0-4 (pasos 0–8)** | | **≈ 425–520**, unos 21–26 % de los 2.000 minutos del mes, como el plan |

Este PR, como el del plan, no gasta minutos.

### Qué no se hace en ningún punto

- No se añaden specs E2E, migraciones, dependencias ni pantallas.
- No se sube ningún presupuesto de job por una medición; no se quitan cargas para que un tramo quepa.
- No se lanzan dos `workflow_dispatch` a la vez sobre la misma rama.
- No se añaden disparadores `schedule` ni `push` al workflow.
- No se ejecuta el borrado contra producción.
- No se suben clips de vídeo ni capturas de producción sin anonimizar.
- No se precarga un contexto desde el otro.

## Notes

- Las tareas citan la spec por FR, SC y US; el plan por paso y sección; los contratos por sección; las correcciones de la revisión por su número F85-n.
- Un commit por tarea o por grupo lógico; mensajes en inglés.

---

## Anexo A — Auditoría de las tareas de test (ADR-012 §4)

| Tareas | Archivo | Capa | Qué cubre | Por qué esa capa |
| --- | --- | --- | --- | --- |
| T013 | `src/domain/allocations/allocations.test.ts` | Dominio | US-08 literal | Aritmética pura (ADR-011 fila 1) |
| T014 | `tests/integration/money-us08.test.ts` | Integración | US-08 leído de la vista en una sentencia | La vista agrega en la base: el dominio puede acertar y la vista contar doble |
| T015, T016, T057, T058 | `src/features/**.test.tsx` | Componentes | Etiquetas de US-21, «nunca se exige presupuesto» (US-13), copy de eliminación, transición de contexto | «Se presenta»: lo ve el render, no hace falta navegador (fila 5) |
| T019 | `tests/a11y/route-registry.ts` | Accesibilidad, nivel ligero | Estados de FR-041 | Fila 16 de ADR-011; decisión 21 |
| T020, T056 | `tests/a11y/routes.a11y.ts` (`@sweep`) | Barrido | 200 %, raíz a 1440, 768 px con monto, foco por URL | Geometría real: jsdom no calcula diseño |
| T021 | `tests/e2e/goals.e2e.ts` | E2E (existente) | `skip` fuera de Chromium | Sin coste; el gesto real va al iPhone (FR-070) |
| T022 | `tests/playwright-projects.test.ts` | Unidad | Proyectos del gate fuera de WebKit y Firefox | Configuración, sin red |
| T037 | `tests/ci-command.test.ts` | Unidad | Presupuesto de `release` | Configuración, sin red |
| T028 | `tests/dev-target-tools.test.ts` | Unidad | Guardia de la siembra de `juntia-dev` | Infraestructura de pruebas |
| T029, T034 | `tests/cls-frames.test.ts` | Unidad (proyecto `components`) | Regla del comparador y «sin texto» | Función pura con fotogramas sintéticos y una fixture real |
| T035 | `tests/ci-workflow.test.ts` | Unidad | `if` y `needs` del workflow en 18 casos | Evaluación del YAML sin lanzar CI |
| T039 | `tests/integration/account-deletion.test.ts` | Integración | Borrado en fases, fallos de Auth, manifiesto, cierre, bloqueo | Necesita la base real, sus triggers, sus FK y un Auth que falle |
| T023–T027, T032, T033 | `tests/evidence/*.capture.ts` | Laboratorio (job `release`) | CLS, LCP, INP, GoalStack, listas largas, comparador | Necesitan CPU emulada, muchas cargas u otro motor (research R2, regla 3); no son del gate (FR-093) |

**No hay tests redundantes.** US-08 está en dos capas porque cada una detecta un fallo distinto (la aritmética y la agregación de la vista), como pide FR-012. US-11 no recibe prueba: la cubre `01_privileges`. El paginador de más de 500 filas no se duplica (T027).

---

## Anexo B — Trazabilidad y consistencia

Pasada hecha a mano en lugar de `speckit-analyze`: todo requisito y criterio tiene al menos una tarea, ninguna tarea carece de respaldo y la terminología coincide.

### B.1 Requisitos funcionales

| FR | Tareas |
| --- | --- |
| FR-001 | T001, T002, T003, T050 |
| FR-002 | T010, T017, T102, T103 |
| FR-003 | T010, T017, T103, T107 |
| FR-004 | T009 |
| FR-010 | T071 |
| FR-011 | T017, T103 |
| FR-012 | T013, T014, T015, T016 |
| FR-013 | T080, T081, T098 |
| FR-014 | T077 |
| FR-015 | T078, T079 |
| FR-020 | T021, T022, T036, T045, T071, T073 |
| FR-021 | T081 |
| FR-022 | T076 |
| FR-030 | T006, T082, T103 |
| FR-031 | T006, T071, T082 |
| FR-032 | T004, T005, T058, T062, T063, T070 |
| FR-033 | T082 |
| FR-034 | T082, T103 |
| FR-040 | T020, T051, T072 |
| FR-041 | T018, T019, T104 |
| FR-042 | T020, T051, T056, T060, T072 |
| FR-043 | T027, T028, T036, T054, T073 |
| FR-044 | T007, T083 |
| FR-045 | T018, T072, T082 |
| FR-046 | T020, T051, T072, T082 |
| FR-050 | T023, T036, T045, T049, T073 |
| FR-051 | T029–T034, T045–T049, T073 |
| FR-052 | T025, T036, T045, T073 |
| FR-053 | T026, T036, T045, T055, T065, T073 |
| FR-054 | T024, T036, T045, T073 |
| FR-055 | T093 |
| FR-056 | T012, T103 |
| FR-060 | T089 |
| FR-061 | T097 |
| FR-062 | T079, T097, T105 |
| FR-063 | T090 |
| FR-064 | T091 |
| FR-065 | T097, T105; regla 9 |
| FR-066 | T105 |
| FR-067 | T039, T040, T041, T042, T053, T057, T061, T067, T105 |
| FR-068 | T099 |
| FR-069 | T105, T108 |
| FR-070 | T008, T084, T085, T093 |
| FR-071 | T031, T034, T075, T087, T088, T102 |
| FR-072 | T086 |
| FR-080 | T092, T094, T095 |
| FR-081 | T094, T100, T103 |
| FR-082 | T096, T109 |
| FR-083 | T011, T055, T096, T101, T103 |
| FR-090 | T021; regla 6 |
| FR-091 | T014, T019, T039; regla 2 |
| FR-092 | T035, T036, T072, T073; regla 3 |
| FR-093 | T022, T032, T035, T036, T038 |
| FR-094 | T056–T059, T065, T069 |
| FR-095 | T019, T037, T050, T069; regla 5 |

**Todos los FR tienen al menos una tarea.**

### B.2 Criterios de éxito

| SC | Tareas |
| --- | --- |
| SC-001 | T013, T014, T071 |
| SC-002 | T073 |
| SC-003 | T010, T102, T103 |
| SC-004 | T072 |
| SC-005 | T023, T029–T034, T073, T088 |
| SC-006 | T025, T073 |
| SC-007 | T093 |
| SC-008 | T053, T080, T081, T089, T098 |
| SC-009 | T097 |
| SC-010 | T006, T082 |
| SC-011 | T100 |
| SC-012 | T024, T103 |

**Todos los SC tienen al menos una tarea.**

### B.3 Tareas sin respaldo

Ninguna. Las que no citan un FR tienen su origen:

- T001: prerrequisito de la decisión 18.
- T011, T055: triage del plan (pasos 0b y 2).
- T012, T043, T049: `evidence.md`, que el plan asigna al PR A.
- T044, T068: reglas 2 y 3 (`AGENTS.md` 15 y 15a).
- T046: F85-7. T066: decisión del plan condicionada a la medición del barrido.
- T075: riesgo del Mac prestado (plan, «Riesgos»).
- T094, T096: D4.

### B.4 Terminología

Coinciden en spec, plan, research, contratos y tasks: `release`, `release_lab`, `release_legs`, `inputs-guard`, los 17 tramos por su nombre, `@sweep`, `e2e-webkit`, `evidence-webkit`, `evidence-firefox`, «laboratorio · por fotogramas», `window.__clsFrames`, las fases `planned → locked → data_deleted → auth_deleted → verified` (y `aborted`), `deletion-<id>.json` y `.state.json`, `confirmations[]`, `mvp-1-YYYY-MM-DD`, V1–V15, F02, F13, D1–D4 y Q1–Q12.

### B.5 Hallazgos

Ninguno exige cambiar la spec ni el plan. Tres diferencias entre documentos, resueltas con las interpretaciones:

1. **Número de pruebas del borrado:** «siete» en la tabla del PR A del plan, once en el contrato §6 → I1 (once).
2. **Nombre de la etiqueta:** la celda del paso 5 del plan dice «`db-prod-*` o `release-mvp-1-*`»; R13 y la checklist dicen `mvp-1-YYYY-MM-DD` → I4.
3. **Proyecto de Vitest del comparador:** el plan dice «`domain` o el de `scripts/`»; la configuración ya lo recoge en `components` → I2.

Y dos puntos que sí obligan a decidir: N1 y N2, en [Decisiones abiertas](#decisiones-abiertas).
