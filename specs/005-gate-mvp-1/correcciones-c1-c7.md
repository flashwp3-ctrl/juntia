# Correcciones C-1 a C-7 de MVP-1 — 005, paso 3

**Qué es.** La evidencia nueva que pide el maestro §15.10, decisión 30 (30.1, 30.2 y 30.3), para el PR de código
acotado a los siete defectos de presentación y copy de la [corrida completa](corrida-completa.md) (PR #104). Ese
informe **no se edita**: sus FAIL siguen siendo la evidencia histórica de la corrida original. Este documento dice qué
se cambió en cada C-n, con qué prueba de regresión y con qué capturas antes y después.

**Lo que no es.** Las capturas salen de un arnés de laboratorio contra `juntia-dev` con datos ficticios. Es iteración,
no evidencia de CI (ADR-011 §9.8; `docs/TESTING.md` §2). La evidencia del gate es el CI sobre el commit candidato,
en el paso 4 de [plan.md](plan.md).

## Alcance (decisión 30.2)

- **Solo presentación y copy.** El diff toca seis archivos de producto: el módulo de copy y cinco componentes de
  cliente.
- **No se tocan** migraciones, el modelo de datos, fórmulas, cálculos, consultas, permisos, filtros ni validaciones del
  servidor. No hay cambios en `supabase/`, `src/lib/db/`, `src/domain/`, las Server Actions (`actions.ts`), los
  lectores de servidor (`funding-load.ts`) ni en ningún `page.tsx`.
- **No se activó la regla de parada.** Ninguna corrección exigió cambiar una consulta, un permiso o una validación del
  servidor. La más cercana es C-7: la función `approve_usage_request` rechaza con JT204 **sin** el disponible en
  `detail` (`supabase/migrations/20261107230952_goal_funding.sql`, línea 243). Por eso la tarjeta caía en el texto
  genérico. La corrección no toca esa función: el cliente usa el disponible que ya leía la tarjeta
  (`goal_member_balances`). La función SQL sigue validando igual al aprobar.
- **Sin funcionalidades nuevas ni S-1 a S-8.**

## Tabla C-n → cambio → prueba → captura

Las capturas están en [`evidence/correcciones-c1-c7/`](evidence/correcciones-c1-c7/) y se citan sin la extensión
`.png`. Cada una existe en `antes` y `despues`, a `390` y `1440`. Por ejemplo, `c1-inicio-nosotros-tomas-antes-390`.

| C-n | Criterio (30.3) | Cambio | Prueba de regresión (componentes) | Capturas |
| --- | --- | --- | --- | --- |
| **C-1** | Si la deuda cambia de dirección, el saldo anterior no se tacha bajo la dirección nueva | `src/features/home/balance-line.tsx`: el tachado se decide **durante el render** (estado derivado del saldo anterior, sin efecto) con `strikeFor`, y lleva la `key` del saldo para el que vale: solo se pinta si es la del saldo que se está pintando (F111-3). Se tacha solo bajo la misma dirección (quién → a quién) o junto a «Al día». E5 se conserva | `src/features/home/home-couple.test.tsx`: «C-1: si la deuda cambia de dirección…» y el bloque «C-1 en el primer commit (F111-3)», que lee el DOM de cada commit con `useLayoutEffect` antes de cualquier efecto pasivo: misma dirección → contraria, deuda → «Al día» → deuda, y un cambio de dirección seguido de otro en la misma dirección, más `strikeFor` | `c1-inicio-nosotros-tomas`. A 1440 Inicio usa el módulo de Balance, sin tachado ni antes ni después |
| **C-2** | Inicio en Yo conserva el consumo completo. Actividad en Yo, solo los privados, y su encabezado lo dice | `src/lib/copy/es.ts`, `activity.spentIn`: «Gasto de {mes}» → **«Gastos privados de {mes}»**. Es el nombre de la región del resumen de Actividad en Yo. No cambian filas, totales, consultas ni filtros | `src/features/activity/activity.test.tsx`, «C-2: el encabezado del resumen en Yo dice que son gastos privados…»: el mismo total (412.900) y las mismas 9 filas | `c2-actividad-yo-tomas` |
| **C-3** | El estado mostrado refleja la financiación aplicada, y se conserva el historial autorizado de solicitudes | `funding-context.tsx`: sin uso vivo (`funded = false`), el título pasa de «Pagado con una meta · {meta}» a **«Pagado con dinero del mes»** (004 US8.2). Una solicitud **resuelta** (rechazada o cancelada) sigue debajo como historial. Una **pendiente** sigue viva, con sus acciones, no como historial (F111-6). `usage-request-card.tsx`: sin fondos usados en el gasto, la nota del rechazo es «{nombre} no aprobó.», sin «Solo cuentan los fondos ya usados» | `src/features/expenses/goal-funding/goal-funding.test.tsx`: «C-3: con el uso aplicado…» (sin cambios), «C-3: tras “Quitar el uso”…» (título, sin CON META, «TOMÁS NO APROBÓ» conservado y sin «Quitar el uso») y «C-3: sin uso aplicado y con una solicitud pendiente…» (título; «Cancelar solicitud» y «Quitar el uso» para quien pidió; «Aprobar» y «Rechazar» para a quien se pidió) | `c3-detalle-tras-quitar-uso-sara` y `c3-detalle-tras-quitar-uso-sara-bloque` |
| **C-4** | Corregir el texto | `es.ts`, `goals.reachedHint` por contexto, como «Lo lograste/Lo lograron». En Yo: **«Cuando quieras, puedes darla por lograda.»**. `goal-immersive.tsx` lo lee con `[context]` | `src/features/goals/goals.test.tsx`, «C-4: meta personal superada en Yo, en singular…» (Yo, singular; Nosotros, plural) | `c4-meta-personal-superada-sara` |
| **C-5** | Corregir el texto | `es.ts`, `goals.activity.spent`: «Gasto {mes}» → **«Gasto de {mes}»** (resumen de Actividad en Nosotros con metas) | `src/features/activity/activity-goals.test.tsx`, «C-5: el resumen de Nosotros dice “Gasto de octubre”…» | `c5-actividad-nosotros-tomas` |
| **C-6** | Mostrar inequívocamente que la solicitud se canceló | `confirmation-badge.tsx`: estado nuevo **«SOLICITUD CANCELADA»**, con la misma forma que «{nombre} NO APROBÓ» (sunken, ícono `x` de Phosphor, sin rojo). `usage-request-card.tsx`: la tarjeta cancelada lleva ese badge, «Pediste $X de los aportes de {nombre} en {meta}» y «La solicitud se canceló.», con «Solo cuentan los fondos ya usados» si los hay | `goal-funding.test.tsx`: «C-6: una solicitud cancelada se lee como cancelada…» (quien pidió y a quien se pidió) y «C-6: al cancelar desde la tarjeta…». **Aprobación visual de los fundadores del 26 de noviembre de 2026** (F111-5 cerrado): «Aprobamos visualmente la variante «SOLICITUD CANCELADA» de ConfirmationBadge, conservando la anatomía, el tono neutro y el lenguaje visual del componente existente.» | `c6-detalle-solicitud-cancelada-sara` y `-bloque` |
| **C-7** | No presentar como viable una aprobación sin fondos. Mensaje de 004 US7.9 y validaciones del servidor intactas | `usage-request-card.tsx`, `fundsState`: lo disponible leído de quien aprueba en tres estados (F111-1). **Suficiente:** vista previa «Tu disponible: $antes → $después» y «Aprobar». **Insuficiente:** **«Tus aportes cambiaron: ahora tienes $X en {meta}.»**, sin vista previa ni «Aprobar», con «Revisar». **Indeterminado** (sin fila en `goal_member_balances`, p. ej. tras anular el único aporte): «No pudimos confirmar cuánto tienes disponible en {meta}. Revisa antes de aprobar.», sin cifra inventada ni «Aprobar», con «Revisar». «Rechazar» sigue en los tres. **Tras un rechazo por fondos** (F111-2): la cifra solo si la trae el propio rechazo; si no, «Tus aportes en {meta} cambiaron. Revisa cuánto tienes disponible.», nunca la lectura anterior como cifra actual. La vista previa desaparece y «Revisar» (`router.refresh()`) trae la tarjeta con lo disponible de ahora. Nunca más el texto genérico de FundingLedger | `goal-funding.test.tsx`: «sin disponible suficiente…», «con disponible en cero (I-27)…», «disponible indeterminado (null)…», «suficiente al cargar y cambia antes de aprobar…», «insuficiente al cargar y luego aumenta…» (la aprobación vuelve, explícita y con su versión), «requestRejection solo usa la cifra que trae el rechazo…» y «fundsState en sus tres estados». Se conserva la prueba previa de US-7.9 con el disponible en el rechazo | `c7-solicitud-sin-fondos-tomas` y `-bloque`; solo antes, `c7-aprobar-sin-fondos-error-tomas` y `-bloque` (después no hay «Aprobar»). Solo después: `c7-f111-1-aporte-anulado-tomas` (y `-bloque`); `c7-f111-4-cargada-con-fondos-tomas-bloque`, `c7-f111-4-rechazo-sin-cifra-tomas` (y `-bloque`) y `c7-f111-4-tras-revisar-tomas-bloque` |

**Las regresiones fallan sin la corrección.** Con los seis archivos de producto como en `main` (`3c7c277`) y las
pruebas nuevas, fallan las 11 regresiones y pasa la de C-3 «con el uso aplicado», que protege lo que no debía
cambiar. Con la corrección pasan todas.

## Copy nuevo o cambiado (para revisión de los fundadores)

| Clave | Antes | Después |
| --- | --- | --- |
| `activity.spentIn` (Actividad en Yo) | Gasto de {mes} | Gastos privados de {mes} |
| `goals.activity.spent` (Actividad en Nosotros con metas) | Gasto {mes} | Gasto de {mes} |
| `goals.reachedHint.me` | Cuando quieran, pueden darla por lograda. | Cuando quieras, puedes darla por lograda. |
| `goalExpense.badge.cancelled` | — | SOLICITUD CANCELADA |
| `goalExpense.detail.monthTitle` | — | Pagado con dinero del mes |
| `goalExpense.detail.asked` | — | Pediste {monto} de los aportes de {nombre} en {meta} |
| `goalExpense.detail.cancelledNote` / `cancelledNoteNone` | — | La solicitud se canceló. Solo cuentan los fondos ya usados. / La solicitud se canceló. |
| `goalExpense.detail.rejectedNoteNone` | — | {nombre} no aprobó. |
| `goals.errors.fundsChangedReview` | — | Tus aportes en {meta} cambiaron. Revisa cuánto tienes disponible. |
| `goalExpense.request.fundsUnknown` (ronda 2, F111-1) | — | No pudimos confirmar cuánto tienes disponible en {meta}. Revisa antes de aprobar. |

«Tus aportes cambiaron: ahora tienes $X en {meta}.» ya existía (`goals.errors.fundsChanged`) y es el texto de 004 US7.9.

## Cómo se hicieron las capturas

- **Arnés:** [`tests/evidence/c1-c7.capture.ts`](../../tests/evidence/c1-c7.capture.ts). Corre con
  `C17_PHASE=antes|despues npm run e2e:dev -- tests/evidence/c1-c7.capture.ts`. Sin la variable se salta, así el job
  `evidence` del CI no lo ejecuta.
- **Datos:** cada caso siembra una pareja ficticia nueva (Sara y Tomás, correos `@seed.test`, en juntia-dev).
  - **La pareja** la crea `seedCouple` (`tests/support/seed.ts`) con privilegios de administración: los dos usuarios, por
    la API de administración de Auth, y la pareja activa, por SQL con `runnerSql` (`tests.seed_couple`). F111-7.
  - **Las operaciones financieras** (gastos, metas, aportes, retiros, anulaciones, solicitudes, rechazos, cancelaciones y
    quitar el uso) se hacen con las funciones de `src/lib/db` y la **sesión de cada usuario**, como la app, con RLS y las
    validaciones de las funciones SQL. Nada financiero se hace con la clave de servicio.
  - C-1 anota por la interfaz, porque el tachado aparece al guardar desde Inicio. En F111-4, «Aprobar» y «Revisar» se
    pulsan en la interfaz.
- **Antes:** el mismo arnés, con los seis archivos de producto como en `main` (`3c7c277`). **Después:** la rama de este
  PR. Los escenarios F111-1 y F111-4 corren solo en el «después». Build de producción (`next build`) servido en `http://localhost:3400`, Chromium de Playwright y movimiento reducido.
- **A 390 la barra inferior fija tapa parte de la página completa.** Por eso C-3, C-6 y C-7 llevan además una captura del
  bloque (`-bloque`), donde la barra puede tapar el pie del bloque. A 1440 todo queda a la vista.
- **Recuento:** 56 PNG: 24 de «antes» (de la primera ronda, con el código de `main`) y 32 de «después», recapturados en la ronda 2.
- Ninguna captura contiene contraseñas, tokens, cookies, correos, la referencia del proyecto ni datos reales.

## Ronda 2 · revisión adversarial del PR #111 (F111-1 a F111-7)

La primera ronda (`43e8ba1`) recibió NO-GO por tres hallazgos mayores, en C-1 y C-7. Todo se corrigió en presentación:
no cambian `approve_usage_request`, `funding-load.ts`, las consultas, SQL ni las fórmulas.

| Hallazgo | Cambio | Prueba | Captura |
| --- | --- | --- | --- |
| F111-1 (C-7, disponible `null`) | `fundsState`, estado «indeterminado»: ni «Aprobar» ni cifra, con «Revisar» | «C-7: disponible indeterminado (null)…», «fundsState en sus tres estados» | `c7-f111-1-aporte-anulado-tomas` (+ `-bloque`). **Reproducido en juntia-dev:** al anular su único aporte con la solicitud pendiente, Tomás se queda sin fila en `goal_member_balances` y la tarjeta muestra el estado indeterminado |
| F111-2 (C-7, rechazo sin cifra) | (A) `requestRejection` solo usa la cifra del rechazo. (B) Tras el rechazo no hay vista previa. (C) «Revisar» también en insuficiente e indeterminado | «suficiente al cargar y cambia antes de aprobar…», «insuficiente al cargar y luego aumenta…», «requestRejection solo usa la cifra…» | `c7-f111-4-*` |
| F111-3 (C-1, primer render) | Tachado derivado durante el render y ligado a la `key` del saldo; sin `useEffect` | Bloque «C-1 en el primer commit (F111-3)», 4 pruebas | `c1-inicio-nosotros-tomas` (después, recapturado) |
| F111-4 (arnés) | Escenario «los fondos cambian después de cargar la tarjeta»: cargada con fondos → retiro en otra sesión → «Aprobar» → rechazo sin cifra → «Revisar» → US7.9 con $10.000 | Arnés (no es una spec E2E) | `c7-f111-4-cargada-con-fondos-tomas-bloque`, `c7-f111-4-rechazo-sin-cifra-tomas` (+ `-bloque`), `c7-f111-4-tras-revisar-tomas-bloque` |
| F111-5 (C-6) | **Cerrado.** `docs/design/COMPONENT_SPECIFICATIONS.md`: ConfirmationBadge con seis estados y la aprobación visual de los fundadores del 26 de noviembre de 2026, con su texto | — | `c6-detalle-solicitud-cancelada-sara` |
| F111-6 (C-3, pendiente) | La pendiente sigue viva, no es historial (este documento y el código) | «C-3: sin uso aplicado y con una solicitud pendiente…» | — |
| F111-7 (documento) | Método: administración y `runnerSql` para crear la pareja; sesiones de usuario para lo financiero | — | — |

**Las regresiones nuevas fallan sin la corrección.** Con `balance-line.tsx` y `usage-request-card.tsx` como en la primera
ronda, fallan las 8 que exigen el comportamiento nuevo: las 4 de F111-3 y las 4 de F111-1 y F111-2. La de
`requestRejection` y la de C-3 con solicitud pendiente pasan en las dos versiones: vigilan lo que no debe cambiar.

## Defecto registrado fuera de alcance: «Mover a Pareja»

La vista previa de **«Mover a Pareja»** (`src/features/expenses/reclassify-dialog.tsx`, `movePreview`, l.48–68) tiene el
mismo patrón que C-1: la última fila tacha el saldo anterior bajo la etiqueta de la dirección nueva cuando mover el gasto
invierte la deuda. Si debías $50.000 y el gasto la invierte, se leería «{pareja} te debe ~~$50.000~~ $40.000». Los
fundadores lo dejaron fuera de este PR el 26 de noviembre de 2026 («"Mover a Pareja" permanece fuera del alcance de este
PR. Registra el defecto para una corrección posterior.»). Queda registrado como defecto pendiente, no autorizado, en
`docs/BACKLOG_MVP2.md`, «Pendientes de valoración de la corrida de MVP-1». No se tocó.
