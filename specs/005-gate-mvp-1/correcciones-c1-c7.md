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
| **C-1** | Si la deuda cambia de dirección, el saldo anterior no se tacha bajo la dirección nueva | `src/features/home/balance-line.tsx`: el anterior se tacha solo si la dirección (quién → a quién) no cambió, o junto a «Al día». E5 se conserva en la misma dirección | `src/features/home/home-couple.test.tsx`, «C-1: si la deuda cambia de dirección…»: tras el cambio, ningún `<s>` y sin «$429.900». En la misma dirección, el anterior sí se tacha | `c1-inicio-nosotros-tomas`. A 1440 Inicio usa el módulo de Balance, sin tachado ni antes ni después |
| **C-2** | Inicio en Yo conserva el consumo completo. Actividad en Yo, solo los privados, y su encabezado lo dice | `src/lib/copy/es.ts`, `activity.spentIn`: «Gasto de {mes}» → **«Gastos privados de {mes}»**. Es el nombre de la región del resumen de Actividad en Yo. No cambian filas, totales, consultas ni filtros | `src/features/activity/activity.test.tsx`, «C-2: el encabezado del resumen en Yo dice que son gastos privados…»: el mismo total (412.900) y las mismas 9 filas | `c2-actividad-yo-tomas` |
| **C-3** | El estado mostrado refleja la financiación aplicada, y se conserva el historial autorizado de solicitudes | `funding-context.tsx`: sin uso vivo (`funded = false`), el título pasa de «Pagado con una meta · {meta}» a **«Pagado con dinero del mes»** (004 US8.2), y la solicitud sigue debajo como historial. `usage-request-card.tsx`: sin fondos usados en el gasto, la nota del rechazo es «{nombre} no aprobó.», sin «Solo cuentan los fondos ya usados» | `src/features/expenses/goal-funding/goal-funding.test.tsx`: «C-3: con el uso aplicado…» (sin cambios) y «C-3: tras “Quitar el uso”…» (título, sin CON META, «TOMÁS NO APROBÓ» conservado y sin «Quitar el uso») | `c3-detalle-tras-quitar-uso-sara` y `c3-detalle-tras-quitar-uso-sara-bloque` |
| **C-4** | Corregir el texto | `es.ts`, `goals.reachedHint` por contexto, como «Lo lograste/Lo lograron». En Yo: **«Cuando quieras, puedes darla por lograda.»**. `goal-immersive.tsx` lo lee con `[context]` | `src/features/goals/goals.test.tsx`, «C-4: meta personal superada en Yo, en singular…» (Yo, singular; Nosotros, plural) | `c4-meta-personal-superada-sara` |
| **C-5** | Corregir el texto | `es.ts`, `goals.activity.spent`: «Gasto {mes}» → **«Gasto de {mes}»** (resumen de Actividad en Nosotros con metas) | `src/features/activity/activity-goals.test.tsx`, «C-5: el resumen de Nosotros dice “Gasto de octubre”…» | `c5-actividad-nosotros-tomas` |
| **C-6** | Mostrar inequívocamente que la solicitud se canceló | `confirmation-badge.tsx`: estado nuevo **«SOLICITUD CANCELADA»**, con la misma forma que «{nombre} NO APROBÓ» (sunken, ícono `x` de Phosphor, sin rojo). `usage-request-card.tsx`: la tarjeta cancelada lleva ese badge, «Pediste $X de los aportes de {nombre} en {meta}» y «La solicitud se canceló.», con «Solo cuentan los fondos ya usados» si los hay | `goal-funding.test.tsx`: «C-6: una solicitud cancelada se lee como cancelada…» (quien pidió y a quien se pidió) y «C-6: al cancelar desde la tarjeta…» | `c6-detalle-solicitud-cancelada-sara` y `-bloque` |
| **C-7** | No presentar como viable una aprobación sin fondos. Mensaje de 004 US7.9 y validaciones del servidor intactas | `usage-request-card.tsx`: si lo disponible leído no cubre lo pedido, sin «Tu disponible: $X → $0» ni «Aprobar». En su lugar, **«Tus aportes cambiaron: ahora tienes $X en {meta}.»** «Rechazar» sigue disponible. Si el servidor rechaza por fondos sin traer la cifra: la del rechazo, si viene; si no, la leída cuando ya no alcanzaba; si lo leído alcanzaba, «Tus aportes en {meta} cambiaron. Revisa cuánto tienes disponible.», con «Revisar». Nunca más el texto genérico de FundingLedger | `goal-funding.test.tsx`: «C-7: sin disponible suficiente…», «C-7: con disponible en cero (I-27)…», «C-7: si el servidor rechaza por fondos sin traer el disponible…» y «C-7: requestRejection…». Se conserva la prueba previa de US-7.9 con el disponible en el rechazo | `c7-solicitud-sin-fondos-tomas` y `-bloque`; solo antes, `c7-aprobar-sin-fondos-error-tomas` y `-bloque` (después no hay «Aprobar») |

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

«Tus aportes cambiaron: ahora tienes $X en {meta}.» ya existía (`goals.errors.fundsChanged`) y es el texto de 004 US7.9.

## Cómo se hicieron las capturas

- **Arnés:** [`tests/evidence/c1-c7.capture.ts`](../../tests/evidence/c1-c7.capture.ts). Corre con
  `C17_PHASE=antes|despues npm run e2e:dev -- tests/evidence/c1-c7.capture.ts`. Sin la variable se salta, así el job
  `evidence` del CI no lo ejecuta.
- **Datos:** cada caso siembra una pareja ficticia nueva (Sara y Tomás, correos `@seed.test`, en juntia-dev) y prepara el
  estado con las funciones de `src/lib/db` y la sesión de cada uno, como la app. C-1 anota por la interfaz porque el
  tachado aparece al guardar desde Inicio.
- **Antes:** el mismo arnés, con los seis archivos de producto como en `main` (`3c7c277`). **Después:** la rama de este
  PR. Build de producción (`next build`) servido en `http://localhost:3400`, Chromium de Playwright y movimiento reducido.
- **A 390 la barra inferior fija tapa parte de la página completa.** Por eso C-3, C-6 y C-7 llevan además una captura del
  bloque (`-bloque`), donde la barra puede tapar el pie del bloque. A 1440 todo queda a la vista.
- Ninguna captura contiene contraseñas, tokens, cookies, correos, la referencia del proyecto ni datos reales.

## Observación fuera de alcance (no corregida)

La vista previa de **«Mover a Pareja»** (`src/features/expenses/reclassify-dialog.tsx`, `movePreview`) tiene el mismo
patrón que C-1. La última fila tacha el saldo anterior bajo la etiqueta de la dirección nueva cuando mover el gasto
invierte la deuda: si debías $50.000 y el gasto la invierte, se leería «{pareja} te debe ~~$50.000~~ $40.000». La
corrida no lo registró como FAIL, y la decisión 30.2 acota la excepción a C-1–C-7 tal como se observaron. Queda como
pendiente para que los fundadores decidan si entra en el criterio de C-1 o va a MVP-2.
