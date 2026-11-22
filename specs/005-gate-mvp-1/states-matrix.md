# Matriz de estados × pantallas (T018)

**Cumple:** FR-041 (la matriz de §6.3 del maestro, cada estado en los dos temas) y FR-045 (modo oscuro en todas las
pantallas y estados). **Alimenta:** T019 (altas del registro de accesibilidad) y T020 (casos `@sweep`).

Cada celda dice quién cubre ese estado en esa pantalla **en claro y en oscuro**. Si los dos temas tienen dueños distintos,
la celda los separa («Claro: …; Oscuro: …»). Solo se citan pruebas y arneses que existen en esta rama; los títulos van
literales. Ninguna celda queda vacía.

## Cómo se lee

**Tipo** (última columna de cada tabla) es el dueño principal de la celda:

| Tipo | Qué significa |
|---|---|
| **prueba** | Una prueba que corre en CI. Si es axe, «axe claro/oscuro»: el estado se audita en los dos temas a 390 px en el nivel ligero (1440 px y el resto de anchos, en `@sweep`). Si es de componentes o de dominio, no depende del tema: afirma lo que se pinta, no el color; el tema de esa pantalla lo cubre la celda «oscuro». Si es E2E, afirma el flujo o el payload |
| **captura** | Un arnés de `tests/evidence/` que deja PNG o una medición rotulada de laboratorio (jobs `evidence` o `release`, no el gate) |
| **no aplica** | El estado no existe en esa pantalla; el motivo va escrito |
| **se añade en T019** | Hoy sin axe en ningún tema; T019 lo añade al registro en el **nivel ligero**. La alta exacta está en «Altas propuestas para T019» |
| **solo @sweep** | Necesita una siembra que el nivel ligero no tiene; T019/T020 lo llevan al barrido o queda como hallazgo del barrido manual (pasos 2 y 4) |
| **hueco (arnés)** | Un arnés de evidencia de este PR cubre un tema y no el otro; la corrección está en «Huecos de arnés» |

**Movimiento reducido en todo axe.** `playwright.config.ts` (`use: { reducedMotion: "reduce" }`), `openWithSession` de
`tests/support/states.ts` y el contexto con sesión de `tests/support/a11y.ts` abren con `reducedMotion: "reduce"`: cada
estado auditado por axe, en los dos temas, se audita con movimiento reducido.

**Capturas del registro.** `tests/evidence/screens.capture.ts` hace PNG a 390 y 1440 en claro y oscuro de **cada** entrada
del registro, salvo `/plan`, `/balance`, `/interno/primitivos` y la 404 (su `SKIP`). Una celda «R «estado»» tiene
también esa captura, salvo en Plan y Balance.

### Abreviaturas

| Abrev. | Archivo y caso |
|---|---|
| **R «estado»** | `tests/a11y/route-registry.ts`, la entrada con ese `state`; la audita `tests/a11y/routes.a11y.ts` con el título `«ruta» · «estado» · light\|dark · 390px` (1440 px con `@sweep`) |
| **G «etiqueta»** | `tests/a11y/goals.a11y.ts`, «Metas · axe ligero de Metas (vacío y con metas, Yo y Nosotros), inmersiva, hojas, historial y error · light\|dark · 390px · con sesión», paso `axe(…, label("etiqueta"))` |
| **GE «etiqueta»** | `tests/a11y/goal-expense.a11y.ts`, «Gasto con meta · axe de B1–B3 en Anotar, B4 y B7 en Actividad, B5 en Inicio, la LimitNote y quitar el uso · light y dark · 390px · con sesión» |
| **P «etiqueta»** | `tests/a11y/plan.a11y.ts`, «Plan · axe de Nosotros con presupuesto, la hoja con el historial, el conflicto, crear, y Yo sin presupuesto · light y dark · 390px · con sesión» |
| **AN «etiqueta»** | `tests/a11y/analysis.a11y.ts`, «Análisis · axe de Nosotros con presupuesto, la PlanningNote y las cifras exactas abiertas y Yo sin presupuesto · light y dark · 390px · con sesión» |
| **B «etiqueta»** | `tests/a11y/balance.a11y.ts`, «Balance · axe de Balance, hoja de liquidación, detalle y confirmación de anular · light\|dark · 390px · con sesión» |
| **CS «etiqueta»** | `tests/a11y/couple-shared.a11y.ts`, «Nosotros · axe de Inicio, Actividad, Anotar, Reparto, edición, eliminar, ChangePreview y A5 · light\|dark · 390px · con sesión» |
| **C** | `tests/a11y/couple.a11y.ts`, «/invitacion · M6 y M7 · axe · light\|dark · 390px · con sesión» |
| **HS «ruta»** | `tests/evidence/home-states.capture.ts`, «@serial inicio\|actividad · cargando, CLS, error, táctiles y 200 % · light\|dark · 390\|1440»: carga con `lock table … access exclusive` real; error con `revoke select` real (42501) |
| **CF «ruta»** | `tests/evidence/cls-frames.capture.ts`, «@release comparador · «ruta»»: 10 cargas en claro y 5 en oscuro, lectura retenida 1,5 s en el servidor |
| **RC «ruta»** | `tests/evidence/release-cls.capture.ts`, «@release CLS de 40 cargas · «ruta»»: CPU 6× y red lenta, 40 cargas en claro y 10 en oscuro |
| **LL «vista»** | `tests/evidence/release-long-lists.capture.ts`, «@release listas largas · 390px\|1440px · light\|dark»: 600 movimientos, 120 aportes, 40 versiones de presupuesto; PNG `release-long-lists--«vista»--«ancho»--«tema».png` |
| **TC «ruta»** | `tests/evidence/theme-cls.capture.ts`, ««ruta» · sistema light\|dark · cookie …»: CPU 6×, 400 ms de latencia, tema antes de `<body>` |

## 1. Sin movimientos

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | R «A6» (cuenta nueva, sin movimientos). A1–A5: sin sesión no hay movimientos | prueba |
| Inicio · Yo | R «Inicio vacío»; componentes `src/features/home/home.test.tsx` «vacío: el estado diseñado con la invitación a Anotar, nunca «$0»» | prueba |
| Inicio · Nosotros | Componentes `src/features/home/home-couple.test.tsx` «sin gastos compartidos en el mes: el estado vacío de 04·6 con «Anotar el primero», sin «Al día $0»»; axe con pareja y sin gastos compartidos: alta 1 | se añade en T019 |
| Actividad | R «Actividad mes vacío»; componentes `src/features/activity/activity.test.tsx` «mes vacío: texto de contexto privado, no el compartido» | prueba |
| Detalle / Edición | No aplica: sin movimientos no hay detalle que abrir; la URL de uno inexistente es «Detalle no encontrado» (ver «Permisos denegados») | no aplica |
| Anotar (incl. con meta) | R «Anotar E1 gasto», «Anotar E2 detalles», «Anotar E4 guardando», «Anotar error de guardado» (cuenta sin movimientos: las recientes salen del catálogo, comentario del registro, PR D) | prueba |
| Balance | Componentes `src/features/balance/shared-balance.test.tsx` «SharedBalance · sin gastos compartidos (US-5.4)» › «estado vacío con explicación; nunca «Al día $0»»; axe con pareja y sin gastos: alta 2 | se añade en T019 |
| Plan | R «Plan» (cuenta sin movimientos ni presupuestos) | prueba |
| Análisis | R «Análisis sin datos» | prueba |
| Metas (lista, pila, abanico) | No aplica: Metas no lista movimientos; su vacío es «sin metas» | no aplica |
| Meta inmersiva + hojas | No aplica: la inmersiva no lista movimientos; sus asientos son aportes y retiros («con metas») | no aplica |
| Mi cuenta | R «D1», «D2 · hoja de exportar» (Exportar de una cuenta sin movimientos). Perfil, Apariencia y Seguridad no muestran movimientos | prueba |
| Mi pareja + Invitación | No aplica: no muestra movimientos | no aplica |

## 2. Sin pareja

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | R «A6» (la primera entrada ofrece «Invitar a mi pareja»). A1–A5: sin sesión no hay grupo | prueba |
| Inicio · Yo | R «Inicio con datos» (cuenta sola); componentes `home-couple.test.tsx` «sin pareja, Inicio en Yo sigue como en P0-1: sin «Tu parte compartida»» | prueba |
| Inicio · Nosotros | R «Nosotros» (cuenta sola: «Todavía no disponible»); componentes `home.test.tsx` «en Nosotros: «todavía no disponible», sin ninguna cifra ni dato privado» | prueba |
| Actividad | R «Actividad con datos», «Actividad Nosotros» (cuenta sola) | prueba |
| Detalle / Edición | R «Detalle», «Edición», «Diálogo de eliminar» (cuenta sola, sin «Mover a Pareja») | prueba |
| Anotar (incl. con meta) | R «Anotar E1 gasto» a «Anotar E5 guardado» (cuenta sola, sin reparto) | prueba |
| Balance | R «Balance» (cuenta sola) | prueba |
| Plan | R «Plan» (cuenta sola) | prueba |
| Análisis | R «Análisis sin datos» (cuenta sola) | prueba |
| Metas (lista, pila, abanico) | R «Metas», «Metas Nosotros» (cuenta sola) | prueba |
| Meta inmersiva + hojas | R «Meta no encontrada» (cuenta sola). La inmersiva personal con datos, sin pareja: alta 5 (meta personal de una cuenta sola) | se añade en T019 |
| Mi cuenta | R «C1», «P1», «T1», «G1», «D1» (cuenta sola) | prueba |
| Mi pareja + Invitación | R «M2 sin pareja», «M3 crear invitación», «M3b enlace listo»; componentes `src/features/couple/couple.test.tsx` «M2: SOLO TÚ, «Juntia también funciona solo» e «Invitar a mi pareja»» | prueba |

## 3. Sin presupuesto

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | No aplica: sin sesión no hay presupuestos | no aplica |
| Inicio · Yo | R «Inicio con datos» (sin presupuestos); componentes `home.test.tsx` «sin ningún presupuesto: ni aviso ni bloqueo que pida crearlo, y Anotar habilitado» (US-13) | prueba |
| Inicio · Nosotros | CS «Inicio en Nosotros» (pareja sin presupuestos: `seedCouple` sin `golden`); componentes `home-couple.test.tsx` «no pinta ningún movimiento privado ni presupuesto (FR-041, FR-049)» | prueba |
| Actividad | No aplica: Actividad no muestra presupuestos (DEC-R01) | no aplica |
| Detalle / Edición | No aplica: el detalle no muestra presupuestos | no aplica |
| Anotar (incl. con meta) | R «Anotar E1 gasto» (cuenta sin presupuestos); componentes `home.test.tsx` «sin ningún presupuesto: … y Anotar habilitado» | prueba |
| Balance | No aplica: Balance no muestra presupuestos | no aplica |
| Plan | P «Plan en Yo sin presupuesto»; R «Plan»; componentes `src/features/plan/plan.test.tsx` «Yo sin presupuesto: el resumen y en qué se fue, «Sin presupuesto · Crear presupuesto (opcional)» con `chart-pie-slice`; sin «$0», 0 %, «excedido» ni «te alcanza»» | prueba |
| Análisis | AN «Análisis en Yo sin presupuesto»; componentes `src/features/analysis/analysis.test.tsx` «sin presupuesto: solo gasto y categorías, ninguna barra fingida, ni límite, ni 0 %, ni «excedido»» | prueba |
| Metas (lista, pila, abanico) | No aplica: las metas no dependen del presupuesto (DEC-R01) | no aplica |
| Meta inmersiva + hojas | No aplica: igual que Metas | no aplica |
| Mi cuenta | No aplica: Mi cuenta no muestra presupuestos | no aplica |
| Mi pareja + Invitación | R «M2 sin pareja» (sin presupuestos); componentes `couple.test.tsx` «sin ningún presupuesto: Invitar y Crear enlace habilitados, y la invitación se crea» (US-13) | prueba |

## 4. Con presupuesto

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | No aplica: sin sesión no hay presupuestos | no aplica |
| Inicio · Yo | No aplica: Inicio no pinta presupuestos (DEC-R01; `home.test.tsx` «no finge presupuesto, límite ni nada compartido») | no aplica |
| Inicio · Nosotros | No aplica: Inicio no pinta presupuestos (`home-couple.test.tsx` «no pinta ningún movimiento privado ni presupuesto (FR-041, FR-049)») | no aplica |
| Actividad | No aplica: Actividad no muestra presupuestos | no aplica |
| Detalle / Edición | No aplica: el detalle no muestra presupuestos | no aplica |
| Anotar (incl. con meta) | No aplica: Anotar no muestra presupuestos | no aplica |
| Balance | No aplica: Balance no muestra presupuestos | no aplica |
| Plan | P «Plan en Nosotros con presupuesto», «hoja de presupuesto con el historial», «conflicto de versión», «hoja de crear presupuesto» | prueba |
| Análisis | AN «Análisis en Nosotros con presupuesto», «Análisis en Nosotros con la PlanningNote y las cifras exactas abiertas» | prueba |
| Metas (lista, pila, abanico) | No aplica: Metas no muestra presupuestos | no aplica |
| Meta inmersiva + hojas | No aplica: igual que Metas | no aplica |
| Mi cuenta | No aplica: Mi cuenta no muestra presupuestos | no aplica |
| Mi pareja + Invitación | No aplica: no muestra presupuestos | no aplica |

## 5. Sin metas

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | No aplica: sin sesión no hay metas | no aplica |
| Inicio · Yo | R «Inicio con datos» (cuenta sin metas); componentes `src/features/home/home-goals.test.tsx` «sin metas ni aportes: invita a crear una, sin cifras (§15.10)» | prueba |
| Inicio · Nosotros | CS «Inicio en Nosotros» (pareja sin metas) | prueba |
| Actividad | R «Actividad con datos» (sin asientos de metas) | prueba |
| Detalle / Edición | R «Detalle» (gasto sin meta) | prueba |
| Anotar (incl. con meta) | R «Anotar E2 detalles» (cuenta sin metas); E2E `tests/e2e/goals.e2e.ts` «gasto con meta en dos sesiones: Sara pide fondos a Tomás, él aprueba uno y rechaza otro; B1 en Nosotros sin metas personales» | prueba |
| Balance | No aplica: Balance no muestra metas | no aplica |
| Plan | No aplica: Plan no muestra metas | no aplica |
| Análisis | R «Análisis sin datos» (sin lo apartado) | prueba |
| Metas (lista, pila, abanico) | G «Metas vacío en Nosotros»; R «Metas», «Metas Nosotros»; componentes `src/features/goals/goals.test.tsx` «vacío: 04·6 con `flag-banner` y «Crear una meta» (plural en Nosotros, singular en Yo)» y «0 metas: no pinta nada (la pantalla enseña el vacío)» | prueba |
| Meta inmersiva + hojas | No aplica: sin metas no hay inmersiva; la URL de una inexistente es R «Meta no encontrada» | no aplica |
| Mi cuenta | No aplica: Mi cuenta no muestra metas | no aplica |
| Mi pareja + Invitación | No aplica: no muestra metas | no aplica |

## 6. Con metas

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | No aplica: sin sesión no hay metas | no aplica |
| Inicio · Yo | Componentes `home-goals.test.tsx` «Yo de Sara: el héroe es el gasto y «Apartaste $500.000 para metas» va aparte, sin destinado neto»; axe: alta 3 | se añade en T019 |
| Inicio · Nosotros | GE «B5 · solicitud en Inicio de quien aprueba» (pareja con Japón); `@sweep` `goals.a11y.ts` «320 px y 200 %: el título y el contenido de las tarjetas de meta de Inicio de Nosotros caben sin cortarse · con sesión» (los dos temas) | prueba |
| Actividad | GE «B4 · tarjeta pendiente en Actividad»; componentes `src/features/activity/activity-goals.test.tsx` | prueba |
| Detalle / Edición | GE «B7 · detalle con la solicitud rechazada», «LimitNote de Mover a Pareja y CON META», «confirmación de quitar el uso» | prueba |
| Anotar (incl. con meta) | GE «B1–B3 · metas de Nosotros, FundingLedger y efecto» | prueba |
| Balance | No aplica: Balance no muestra metas | no aplica |
| Plan | No aplica: Plan no muestra metas | no aplica |
| Análisis | AN «Análisis en Nosotros con la PlanningNote y las cifras exactas abiertas» (capítulo 4 con $900.000 apartados del dataset) | prueba |
| Metas (lista, pila, abanico) | G «Metas en Nosotros con pila», «Metas en Yo con personales y compartidas», «hoja de nueva meta» | prueba |
| Meta inmersiva + hojas | G «meta inmersiva con historial», «hoja de aporte con vista previa», «hoja de editar meta», «meta personal inmersiva» | prueba |
| Mi cuenta | No aplica: Mi cuenta no muestra metas (Exportar las incluye en el archivo, no en pantalla) | no aplica |
| Mi pareja + Invitación | No aplica: no muestra metas | no aplica |

## 7. Meta completada

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | No aplica: sin sesión no hay metas | no aplica |
| Inicio · Yo | Componentes `goals.test.tsx` «meta lograda: `flag-checkered` y LOGRADA, con la cinta llena» (la misma GoalCard); axe: alta 3 | se añade en T019 |
| Inicio · Nosotros | Componentes `goals.test.tsx` «meta lograda: `flag-checkered` y LOGRADA, con la cinta llena» y «1 · una compartida lograda sin fondos de nadie sigue con la cinta llena aunque ahora traiga a los dos en $0»; la tarjeta es la misma que audita la alta 3 en los dos temas | prueba |
| Actividad | No aplica: Actividad lista asientos, no el estado de la meta | no aplica |
| Detalle / Edición | No aplica: el detalle no muestra el estado de la meta | no aplica |
| Anotar (incl. con meta) | No aplica: el selector «Pagado con meta» no tiene variante de meta lograda (la marca LOGRADA vive en GoalCard) | no aplica |
| Balance | No aplica: Balance no muestra metas | no aplica |
| Plan | No aplica: Plan no muestra metas | no aplica |
| Análisis | No aplica: Análisis suma lo apartado, no el estado de cada meta | no aplica |
| Metas (lista, pila, abanico) | Componentes `goals.test.tsx` «meta lograda: `flag-checkered` y LOGRADA, con la cinta llena» y «saldo ≥ objetivo: «Lo lograron» como sugerencia y el excedente neutro; el estado no cambia solo (Q15)»; axe del saldo igual al objetivo: alta 4 | se añade en T019 |
| Meta inmersiva + hojas | Componentes `goals.test.tsx` «meta lograda: no admite aportes (FR-032)»; axe: alta 5 | se añade en T019 |
| Mi cuenta | No aplica: Mi cuenta no muestra metas | no aplica |
| Mi pareja + Invitación | No aplica: no muestra metas | no aplica |

## 8. Retiro rechazado

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | No aplica: el retiro solo existe en la hoja de retiro de una meta | no aplica |
| Inicio · Yo | No aplica: igual | no aplica |
| Inicio · Nosotros | No aplica: igual | no aplica |
| Actividad | No aplica: un retiro rechazado no crea asiento | no aplica |
| Detalle / Edición | No aplica: el rechazo de un **uso** de fondos (B7) es otro estado, en «Con metas» | no aplica |
| Anotar (incl. con meta) | No aplica: Anotar no retira | no aplica |
| Balance | No aplica: el rechazo de una liquidación es «Error» | no aplica |
| Plan | No aplica | no aplica |
| Análisis | No aplica | no aplica |
| Metas (lista, pila, abanico) | No aplica: el retiro se hace desde la inmersiva | no aplica |
| Meta inmersiva + hojas | G «hoja de retiro con el máximo» (alerta con `copy.goals.errors.insufficient`); componentes `goals.test.tsx` «retiro rechazado por saldo (JT204): dice el máximo vigente del servidor, no el de la página», «el máximo es lo disponible propio: por encima no se envía y dice «Puedes retirar hasta $X»» y ««Retirar» sin aportes propios disponibles: deshabilitado, con «No tienes aportes disponibles en esta meta»» | prueba |
| Mi cuenta | No aplica | no aplica |
| Mi pareja + Invitación | No aplica | no aplica |

## 9. Exceso

Exceso = presupuesto sobrepasado (S3) y, en los formularios, un importe por encima de lo permitido.

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | No aplica: no hay importes | no aplica |
| Inicio · Yo | No aplica: Inicio no pinta límites ni alertas de exceso (DEC-R01) | no aplica |
| Inicio · Nosotros | No aplica: igual | no aplica |
| Actividad | No aplica: Actividad no muestra límites | no aplica |
| Detalle / Edición | No aplica: el detalle no muestra límites | no aplica |
| Anotar (incl. con meta) | CS «Reparto con «Faltan»» (el mismo aviso del reparto que «Sobran»); componentes `src/features/expenses/annotate-shared.test.tsx` «E3 en Importe con exceso: «Sobran $X»» | prueba |
| Balance | B «hoja con el máximo» (900.000 sobre un saldo de 329.900: «exceedsPending»); componentes `src/features/balance/settle.test.tsx` ««Otro» por encima del saldo: no se envía y el error dice el máximo (§5.1, US-6.3)» | prueba |
| Plan | P «Plan en Nosotros con presupuesto» (el dataset de octubre lleva Servicios 360.000 sobre 340.000); componentes `plan.test.tsx` «excedido: barra rayada, `warning-circle`, EXCEDIDO y «Se pasaron por 20.000», nunca solo color» y «en Yo el excedido se dice en segunda persona» | prueba |
| Análisis | AN «Análisis en Nosotros con presupuesto» (afirma `copy.plan.over.us("$20.000", 105)` antes de auditar) | prueba |
| Metas (lista, pila, abanico) | Componentes `goals.test.tsx` «saldo ≥ objetivo: «Lo lograron» como sugerencia y el excedente neutro»; axe: alta 4 | se añade en T019 |
| Meta inmersiva + hojas | G «hoja de retiro con el máximo» | prueba |
| Mi cuenta | No aplica: no hay importes | no aplica |
| Mi pareja + Invitación | No aplica: no hay importes | no aplica |

## 10. Datos extremos

Importes en el tope (999.999.999, `MAX_COP_PESOS`) y fechas en los límites del dominio.

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | No aplica: no hay importes | no aplica |
| Inicio · Yo | Dominio `src/domain/money/money.test.ts` (`MAX_COP_PESOS` = 999999999n); axe y geometría: alta 6 | se añade en T019 |
| Inicio · Nosotros | Necesita una pareja sembrada con importes en el tope, que el registro no tiene | solo @sweep |
| Actividad | Dominio `src/domain/transactions/transactions.test.ts` (meses 0001-01 y 9999-12 en la navegación); axe: alta 7 | se añade en T019 |
| Detalle / Edición | Axe: alta 8 | se añade en T019 |
| Anotar (incl. con meta) | R «superficie interna» (`/interno/primitivos`: AmountInput «Tope 999.999.999» e «Importe largo en espacio angosto», dígitos entre 28 y 40 px sin cortar); componentes `src/components/ui/amount-input.test.tsx` «no acepta un décimo dígito: el tope es 999.999.999» y `src/features/expenses/annotate-sheet.test.tsx` «FR-008: el importe sale como texto de dígitos, nunca como number» | prueba |
| Balance | Necesita una pareja con importes en el tope | solo @sweep |
| Plan | Necesita presupuestos y gasto en el tope | solo @sweep |
| Análisis | Componentes `analysis.test.tsx` «la etiqueta corta del Chart redondea: $2.990.000 es «3 M», $2.840.000 «2,8 M» y $640.400 «640 mil»»; la geometría con importes en el tope necesita siembra | solo @sweep |
| Metas (lista, pila, abanico) | Necesita una meta con objetivo en el tope | solo @sweep |
| Meta inmersiva + hojas | Igual que Metas | solo @sweep |
| Mi cuenta | No aplica: no muestra importes | no aplica |
| Mi pareja + Invitación | No aplica: no muestra importes | no aplica |

## 11. Error

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | R «A1d» (error de red real), «A1b», «A1c», «A2 · validación», «aviso de enlace caducado»; componentes `src/features/auth/auth-errors.test.ts` «el error de red es A1d, sin texto técnico» | prueba |
| Inicio · Yo | HS «inicio» (error real con Reintentar, PNG `inicio--error`, claro y oscuro, 390 y 1440); componentes `home.test.tsx` «error: lo explica y Reintentar vuelve a pedir los datos» y `src/app/(app)/error.test.tsx` ««Reintentar» llama a reset» | captura |
| Inicio · Nosotros | La misma pieza `LoadError` (`src/features/context/load-error.tsx`) que captura HS «inicio»; CS «edición compartida en conflicto» | captura |
| Actividad | HS «actividad» (PNG `actividad--error`, claro y oscuro) | captura |
| Detalle / Edición | CS «edición compartida en conflicto», «A5 rechazo confirmado», «A5 resultado desconocido»; componentes `src/features/expenses/edit-sheet.test.tsx` «Q15 / JT011: la segunda edición con versión vieja falla, lo explica y ofrece recargar sin perder lo escrito» | prueba |
| Anotar (incl. con meta) | R «Anotar error de guardado»; R «Anotar E3 monto no válido» (`axe: false`: solo captura de `screens.capture.ts`, claro y oscuro); componentes `annotate-sheet.test.tsx` «US-2.7: un error de guardado deja la hoja abierta con los datos y Reintentar usa la misma clave» | prueba |
| Balance | B «hoja con el máximo»; componentes `shared-balance.test.tsx` «error: lo dice sin cifras y ofrece Reintentar, que vuelve a pedir la página»; el error de lectura es la pieza `LoadError` de HS | prueba |
| Plan | P «conflicto de versión»; componentes `plan.test.tsx` «`unknown`: campos bloqueados, «Reintentar» y «Comprobar estado» con `write_status`; nunca dice que no se guardó»; el error de lectura es la pieza `LoadError` de HS | prueba |
| Análisis | El error de lectura es la pieza `LoadError` que captura HS «inicio» (`src/app/(app)/plan/analisis/page.tsx` la usa) | captura |
| Metas (lista, pila, abanico) | E2E `goals.e2e.ts` «editar una meta con una versión vieja: JT011 sin autor; la ganadora se conserva hasta «Revisar» y guardar otra vez»; el error de lectura es la pieza `LoadError` de HS | captura |
| Meta inmersiva + hojas | G «meta no encontrada», «hoja de retiro con el máximo»; R «Meta no encontrada» | prueba |
| Mi cuenta | R «D5 · error», «sesión caducada»; componentes `src/features/account/profile-form.test.tsx` «P5: si falla, lo dice y conserva lo escrito» y `src/features/account/theme-selector.test.tsx` «si guardar falla, vuelve al último tema confirmado y lo dice» | prueba |
| Mi pareja + Invitación | C (M7); R «M4 vencida»; componentes `src/features/couple/write-result.test.tsx` «unknown: no afirma que no se creó, bloquea el campo y ofrece Reintentar y Comprobar estado» | prueba |

## 12. Carga

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | Sin lectura de datos; su carga se mide en CF «a1», «a2», «a4» (claro y oscuro, sin retención) y TC «/entrar», «/crear-cuenta», «/recuperar» | captura |
| Inicio · Yo | HS «inicio» (Skeleton retenido por el bloqueo real, PNG y CLS, claro y oscuro); CF «inicio-yo»; R «superficie interna» (Skeleton sin animaciones con movimiento reducido) | captura |
| Inicio · Nosotros | CF «inicio-nosotros»; componentes `home-couple.test.tsx` «con el servidor en contexto nulo, Nosotros no pinta datos: Skeleton» y `src/features/context/context-transition.test.tsx` «al tocar Nosotros: el Skeleton de Nosotros hasta el RSC, y en ningún momento cifras de Yo junto a él» | captura |
| Actividad | HS «actividad» (Skeleton retenido, claro y oscuro); CF «actividad» | captura |
| Detalle / Edición | Sin `loading.tsx` propio: hereda el de `src/app/(app)/actividad/`, el que captura HS «actividad» | captura |
| Anotar (incl. con meta) | R «Anotar E4 guardando» (fila «Guardando…» con la Server Action sin respuesta) | prueba |
| Balance | CF «balance»; componentes `shared-balance.test.tsx` «cargando: el esqueleto con la geometría de las filas, aria-busy y el texto oculto» | captura |
| Plan | CF «plan» | captura |
| Análisis | CF «analisis»; componentes `src/features/analysis/analysis-hydration.test.tsx` «una carga completa con movimiento reducido deja los cuatro capítulos en `shown`, sin opacidad 0» | captura |
| Metas (lista, pila, abanico) | CF «metas» | captura |
| Meta inmersiva + hojas | No aplica en laboratorio: la spec fija las rutas de carga que se miden (FR-050, FR-051) y la inmersiva no está entre ellas; añadirla ampliaría el alcance. Su esqueleto y su error en los dos temas los audita G | no aplica |
| Mi cuenta | R «D3 · preparando» (Exportar con la respuesta retenida); TC «/cuenta», «/cuenta/perfil», «/cuenta/apariencia», «/cuenta/seguridad» | prueba |
| Mi pareja + Invitación | Componentes `write-result.test.tsx` «hoja de invitar: con la petición colgada, a los 15 s aparece «no pudimos confirmar», Reintentar y Comprobar estado, y cerrar pide confirmación»; la lectura de `/cuenta/pareja` es la de Mi cuenta (TC) | prueba |

## 13. Latencia

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | TC «/entrar», «/crear-cuenta», «/recuperar» (400 ms, CPU 6×, sistema claro y oscuro) | captura |
| Inicio · Yo | RC «inicio-yo» (40 claro + 10 oscuro); `tests/evidence/release-lcp.capture.ts` «@release LCP de laboratorio · inicio · 390px» (4G emulado) | captura |
| Inicio · Nosotros | RC «inicio-nosotros» | captura |
| Actividad | RC «actividad»; `release-lcp.capture.ts` «@release LCP de laboratorio · actividad · 390px» | captura |
| Detalle / Edición | Componentes `src/features/expenses/shared-edit.test.tsx` «unknown: nunca afirma que no se guardó; Comprobar estado con not_found dice que todavía no consta y con completed cierra» y `src/features/expenses/delete-dialog.test.tsx` «F69-1: una respuesta perdida es un resultado desconocido: «Reintentar» con la misma clave»; tema: CS «A5 resultado desconocido» | prueba |
| Anotar (incl. con meta) | R «Anotar E4 guardando»; E2E `tests/e2e/annotate.e2e.ts` «UX 3: Guardar → la fila aparece antes de la respuesta del servidor → se confirma, una sola vez» y «desconocido: respuesta perdida tras el commit → fila fuera, hoja bloqueada, Reintentar con la misma clave y una sola transacción» | prueba |
| Balance | RC «balance» | captura |
| Plan | RC «plan» | captura |
| Análisis | RC «analisis» | captura |
| Metas (lista, pila, abanico) | RC «metas»; `tests/evidence/release-goalstack.capture.ts` «@release GoalStack con 6 metas · pila · 390px · CPU 4×» y «… · abanico · 1440px · CPU 4×» | captura |
| Meta inmersiva + hojas | Componentes `goals.test.tsx` «resultado desconocido: no anima ni afirma nada, bloquea los campos y ofrece «Comprobar estado» (FR-077, FR-093)»; tema: la hoja de aporte en G «hoja de aporte con vista previa» | prueba |
| Mi cuenta | R «D3 · preparando»; TC «/cuenta/…» | prueba |
| Mi pareja + Invitación | Componentes `write-result.test.tsx` «hoja de invitar: con la petición colgada, a los 15 s aparece «no pudimos confirmar»…»; tema: R «M3 crear invitación» | prueba |

## 14. Movimiento reducido

Todo axe corre con `reducedMotion: "reduce"` (ver «Cómo se lee»). Además:

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | R «A1» a «A6» con movimiento reducido | prueba |
| Inicio · Yo | R «Inicio con datos»: `routes.a11y.ts` afirma en las rutas de producto que la perilla del selector salta y el aviso de Anotar aparece sin desplazarse ni escalar; contraste con movimiento activo en E2E `annotate.e2e.ts` «@serial motion activo: el total cuenta hacia arriba y la fila nueva se desvanece (momentos L2 de E5)» | prueba |
| Inicio · Nosotros | CS «Inicio en Nosotros»; E2E `tests/e2e/couple-settle.e2e.ts` «@serial motion activo: E5 al anotar en Nosotros y S4 al liquidar el total (los dos momentos L2)» | prueba |
| Actividad | R «Actividad con datos» (comprobación de movimiento de las rutas de producto) | prueba |
| Detalle / Edición | R «Detalle», «Edición» | prueba |
| Anotar (incl. con meta) | R «Anotar E5 guardado» (el aviso aparece sin desplazarse); GE «B1–B3 · metas de Nosotros, FundingLedger y efecto» | prueba |
| Balance | B «Balance por saldar»; R «Balance» | prueba |
| Plan | P «Plan en Nosotros con presupuesto»; R «Plan» | prueba |
| Análisis | AN «Análisis en Nosotros con presupuesto» (afirma los cuatro capítulos en `shown`); componentes `analysis.test.tsx` «con movimiento reducido, todo es visible desde el inicio y con el valor final en el DOM» | prueba |
| Metas (lista, pila, abanico) | G «Metas en Nosotros con pila»; componentes `src/features/goals/goal-stack-drag.test.tsx` «con movimiento reducido, la tarjeta no tiene elasticidad (no sigue al dedo) y el cambio es inmediato; sin él, sí» y `goals.test.tsx` «CSS: con movimiento reducido, sin desplazamiento, escala ni contragiro (la segunda conserva sus 4°); solo la sombra» | prueba |
| Meta inmersiva + hojas | G «meta inmersiva con historial»; componentes `goals.test.tsx` «con movimiento reducido: el valor final en el DOM y la cinta llena desde el inicio; foco en el título» | prueba |
| Mi cuenta | R «C1», «T1» (transición de tema en 0 s: `routes.a11y.ts`, «transición de tema») | prueba |
| Mi pareja + Invitación | R «M1 activa», «M3b enlace listo»; C | prueba |

## 15. Oscuro

Cada celda de las secciones anteriores marcada «prueba» con axe ya incluye el oscuro. Aquí, lo propio del tema.

| Pantalla | Cobertura (oscuro y, para comparar, claro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | R «A1» a «A6» en `dark`; `screens.capture.ts` (PNG `--oscuro`); TC «/entrar», «/crear-cuenta», «/recuperar» (tema antes de `<body>`) | prueba |
| Inicio · Yo | R «Inicio con datos», «Inicio vacío» en `dark`; HS «inicio» en `dark` (carga, error y 200 %) | prueba |
| Inicio · Nosotros | CS «Inicio en Nosotros» en `dark`; R «Nosotros» en `dark` | prueba |
| Actividad | R «Actividad con datos», «Actividad búsqueda», «Actividad filtros» en `dark`; HS «actividad» en `dark`. Listas largas en oscuro: ver «Muchos movimientos» | prueba |
| Detalle / Edición | R «Detalle», «Edición», «Diálogo de eliminar» en `dark`; CS «edición compartida con el aviso» | prueba |
| Anotar (incl. con meta) | R «Anotar E1 gasto» a «Anotar E5 guardado» en `dark`; GE «B1–B3 …»; E2E `annotate.e2e.ts` «UX 2: rejilla de 4 × 3 fija, sin superposiciones (… px, dark)» | prueba |
| Balance | B en `dark` («Balance por saldar», «hoja de liquidación», «detalle de liquidación», «confirmación de anular») | prueba |
| Plan | P (`bothThemes`, cada estado en claro y oscuro) | prueba |
| Análisis | AN (`bothThemes`) | prueba |
| Metas (lista, pila, abanico) | G en `dark`; `@sweep` `goals.a11y.ts` «320 px y 200 %: …» en los dos temas | prueba |
| Meta inmersiva + hojas | G en `dark` (inmersiva, aporte, retiro, editar) | prueba |
| Mi cuenta | R «C1», «P1», «T1», «G1», «D1» a «D5» en `dark`; E2E `tests/e2e/access-account.e2e.ts` «Mi cuenta: perfil, apariencia en oscuro y un segundo dispositivo oscuro antes de <body>»; TC «/cuenta/…» | prueba |
| Mi pareja + Invitación | R «M1» a «M4», «M5 sin sesión» en `dark`; C en `dark` | prueba |

## 16. Muchos movimientos

FR-043 lo exige en Actividad, el historial de aportes y el de presupuestos.

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | No aplica: sin sesión no hay movimientos | no aplica |
| Inicio · Yo | No aplica: Inicio pinta 5 recientes (`RECENT = 5` en `src/features/home/home-view.tsx`) y totales de una sola lectura | no aplica |
| Inicio · Nosotros | No aplica: igual (`RECENT = 5` en `src/features/home/couple-home-view.tsx`) | no aplica |
| Actividad | LL «actividad» (600 movimientos, 390 y 1440, claro y oscuro); integración `tests/integration/consistency.test.ts` «cursor: filas persistentes una vez entre inserciones y anulaciones» y `src/lib/db/paginate.test.ts` «con un máximo del servidor menor que la página no salta ni repite filas» | captura |
| Detalle / Edición | No aplica: un solo movimiento | no aplica |
| Anotar (incl. con meta) | No aplica: las recientes de Anotar son del catálogo | no aplica |
| Balance | Componentes `shared-balance.test.tsx` «cada gasto con quién pagó y la parte de cada uno; el total del mes sale del servidor»; FR-043 no lo incluye y la cuenta de listas largas es de una persona sola | prueba |
| Plan | LL «presupuesto» (40 versiones en la hoja de Plan, claro y oscuro); integración `tests/integration/planning-pages.test.ts` «T016: goal_entries, budget_history y usage_requests recorren 1101 filas con empates y escrituras» | captura |
| Análisis | No aplica: agrega por categoría y mes, no lista movimientos | no aplica |
| Metas (lista, pila, abanico) | `release-goalstack.capture.ts` (6 metas, pila y abanico); componentes `goals.test.tsx` «2 metas: frontal y una que asoma; 3 o más: frontal y dos; más de 3: el conteo en el pie» | captura |
| Meta inmersiva + hojas | LL «aportes» (120 aportes, claro y oscuro); integración `planning-pages.test.ts` «T016: …» | captura |
| Mi cuenta | Integración `tests/integration/export.test.ts` «F44-2: por cursor, con escrituras entre páginas, sin duplicados ni saltos de las filas que existieron siempre» (Exportar no pinta las filas) | prueba |
| Mi pareja + Invitación | No aplica: no lista movimientos | no aplica |

## 17. Textos largos

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | Dominio `src/domain/account/account.test.ts` «rechaza el vacío, más de 60 y los saltos de línea» (el nombre que se escribe en A2 tiene tope); el texto al 200 % en A1–A6 es T020 (a) | prueba |
| Inicio · Yo | Componentes `src/components/shell/app-shell.test.tsx` «un título largo junto al selector escala por debajo de 1024 y se trunca, sin cambiar el tamaño de escritorio»; axe y geometría con nombre de 60 y descripción de 140: alta 6 | se añade en T019 |
| Inicio · Nosotros | `@sweep` `goals.a11y.ts` «320 px y 200 %: el título y el contenido de las tarjetas de meta de Inicio de Nosotros caben sin cortarse · con sesión» (los dos temas); nombres largos de la pareja necesitan siembra | solo @sweep |
| Actividad | Axe y geometría con descripción de 140 caracteres: alta 7 | se añade en T019 |
| Detalle / Edición | Axe y geometría con descripción de 140 caracteres: alta 8 | se añade en T019 |
| Anotar (incl. con meta) | Dominio `transactions.test.ts` «valida tipo, pesos enteros, máximo, categoría, fecha y descripción» (tope de 140); R «superficie interna» («Importe largo en espacio angosto») | prueba |
| Balance | Componentes `shared-balance.test.tsx` ««Pagó · reparto»: el nombre se puede partir y solo el modo va unido; sin anchos mínimos en las celdas de texto»; la geometría con nombres largos necesita una pareja sembrada | solo @sweep |
| Plan | No aplica: las categorías son del catálogo; el único texto de la persona es su nombre en «Último cambio», con tope de 60 | no aplica |
| Análisis | No aplica: solo categorías del catálogo y nombres con tope de 60 | no aplica |
| Metas (lista, pila, abanico) | G «hoja de nueva meta» (los siete tipos en dos filas, sin cortar, a 390 y 1440, en los dos temas); componentes `goals.test.tsx` «usa la palabra más larga del nombre»; nombre de meta largo: alta 4 | prueba |
| Meta inmersiva + hojas | Nombre de meta largo en el título de la inmersiva: alta 5 | se añade en T019 |
| Mi cuenta | Componentes `profile-form.test.tsx` «P2: un nombre vacío o con más de 60 no se envía y explica cómo corregirlo» y `app-shell.test.tsx` «un título largo junto al selector …»; tema: R «P1» | prueba |
| Mi pareja + Invitación | R «M3b enlace listo» (el enlace largo en su campo, claro y oscuro) | prueba |

## 18. Permisos denegados

| Pantalla | Cobertura (claro y oscuro) | Tipo |
|---|---|---|
| Acceso (A1–A6) | E2E `access-account.e2e.ts` «ruta protegida sin sesión → /entrar → vuelve a la ruta, sin caché compartida» y «cerrar sesión → S3 y ninguna ruta de producto sin volver a entrar»; tema: R «S3», «A1c» | prueba |
| Inicio · Yo | HS «inicio»: `revoke select` de `my_transactions` es un 42501 real (PNG `inicio--error`, claro y oscuro) | captura |
| Inicio · Nosotros | R «Nosotros» (sin pareja, «Todavía no disponible»); E2E `access-account.e2e.ts` «Nosotros no lleva datos privados ni en el HTML ni en el payload RSC; Yo sí» y `couple-settle.e2e.ts` «Cambiar Yo/Nosotros: ni el HTML, ni el RSC, ni el prefetch de Nosotros llevan privados, con la cookie válida, ausente o no válida» | prueba |
| Actividad | HS «actividad» (42501 real, claro y oscuro) | captura |
| Detalle / Edición | R «Detalle no encontrado»; CS «A5 rechazo confirmado»; GE «LimitNote de Mover a Pareja y CON META» (la acción no se permite y lo dice) | prueba |
| Anotar (incl. con meta) | Componentes `src/features/expenses/private-writes.test.tsx` «rechazo confirmado: lo dice, sin «Reintentar» ni «Comprobar estado», y los campos siguen editables»; tema: R «Anotar error de guardado» | prueba |
| Balance | R «Balance» (cuenta sin pareja: no hay balance que ver) | prueba |
| Plan | E2E `tests/e2e/budgets.e2e.ts` «spec 5 · privacidad: ni el HTML, ni el RSC, ni el prefetch de Plan en Nosotros llevan presupuestos personales de ninguno, con la cookie válida, ausente o no válida»; tema: P «Plan en Nosotros con presupuesto» | prueba |
| Análisis | E2E `budgets.e2e.ts` «spec 5 · privacidad de Análisis: ni el HTML, ni el RSC, ni el prefetch de Análisis en Nosotros llevan gastos, presupuestos ni metas personales»; tema: AN | prueba |
| Metas (lista, pila, abanico) | E2E `goals.e2e.ts` «Metas en Nosotros: ni el HTML, ni el RSC, ni el prefetch llevan metas personales, con la cookie válida, ausente o no válida»; R «Metas Nosotros» | prueba |
| Meta inmersiva + hojas | G «meta no encontrada» («una meta que no existe (o de otro contexto)»); R «Meta no encontrada» | prueba |
| Mi cuenta | R «sesión caducada» (la sesión caduca con la página abierta y lo escrito se conserva) | prueba |
| Mi pareja + Invitación | C (M7, invitación que no vale para esta cuenta); R «M5 sin sesión»; componentes `couple.test.tsx` «M7 de quien tiene su propia invitación pendiente: primero anula la suya (US-1.9)» | prueba |

## Altas propuestas para T019

Ocho entradas de nivel ligero, una por familia de estado; a ~4–5 s cada una, unos 35–40 s más en `a11y-session`
(dentro de los 40–80 s de T019). Dos piezas nuevas en `tests/support/`: el campo `goals` y el dato `extreme`.

1. `{ route: "/", state: "Nosotros sin gastos compartidos", path: "/", session: "user", couple: "active", prepare: "us" }` — sin movimientos en Inicio · Nosotros con pareja (04·6, «Anotar el primero»). Hoy `prepare: "us"` espera «Todavía no disponible»; con `couple` presente, `reach` debe esperar el vacío de 04·6.
2. `{ route: "/balance", state: "Balance sin gastos compartidos", path: "/balance", session: "user", couple: "active", prepare: "us" }` — el vacío de US-5.4 en los dos temas; mismo ajuste de `reach`.
3. `{ route: "/", state: "Inicio con meta lograda", path: "/", session: "user", goals: "achieved" }` — con metas y meta completada en Inicio · Yo. `goals` (nuevo, opcional): una meta personal con un nombre largo dentro del máximo, y un aporte igual al objetivo, con `createGoal` y `contributeToGoal` de `src/lib/db/goals`, como ya hacen `goals.a11y.ts` y `goal-expense.a11y.ts`.
4. `{ route: "/metas", state: "Metas con meta lograda", path: "/metas", session: "user", goals: "achieved" }` — LOGRADA y «Lo lograron» en la lista, el nombre largo en la tarjeta, una cuenta sola.
5. `{ route: "/metas/[id]", state: "Meta lograda", path: "/metas/{goal}", session: "user", goals: "achieved" }` — la inmersiva lograda, sin aportar (FR-032), con el nombre largo en el título. `{goal}` se resuelve como `{id}`.
6. `{ route: "/", state: "Inicio con datos extremos", path: "/", session: "user", data: "extreme" }` — `extreme` (nuevo `Data`): el dataset `current` más un gasto de 999.999.999 con una descripción de 140 caracteres, y la cuenta con un nombre de 60 caracteres (`seedUser` ya acepta `displayName`).
7. `{ route: "/actividad", state: "Actividad con datos extremos", path: "/actividad", session: "user", data: "extreme" }`.
8. `{ route: "/actividad/[id]", state: "Detalle con datos extremos", path: "/actividad/{id}", session: "user", data: "extreme" }` — `{id}` debe apuntar al gasto extremo.

**Solo `@sweep` (T019/T020)**, porque necesitan una pareja o una meta sembradas con importes en el tope o con nombres
largos: datos extremos en Inicio · Nosotros, Balance, Plan, Análisis, Metas y la meta inmersiva; textos largos en
Inicio · Nosotros y Balance. Si T019 no amplía `seedCouple` para eso, quedan como comprobación del barrido manual
(pasos 2 y 4).

## Huecos de arnés

Los dos que encontró el borrador quedan resueltos en este PR:

- **Muchos movimientos en oscuro** (Actividad, historial de aportes, historial de presupuestos):
  `release-long-lists.capture.ts` corre en claro y en oscuro, a 390 y 1440, y nombra el PNG con el tema.
- **Carga de la meta inmersiva:** no se añade al laboratorio. Las rutas de carga medidas las fija la spec (FR-050,
  FR-051) y la inmersiva no está entre ellas; añadirla ampliaría el alcance. La celda es «no aplica».
