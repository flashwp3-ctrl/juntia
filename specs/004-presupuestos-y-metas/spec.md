# Feature Specification: 004 · Presupuestos opcionales y metas (P0-3)

**Feature Branch**: `claude/docs-spec-004-specify-b9b08d` (la carpeta de la spec y la rama son independientes, ADR-012 §1.5)

**Created**: 2026-11-07

**Status**: Draft — etapa Specify. **Clarify pendiente:** las 19 preguntas (Q1–Q19) esperan la respuesta de los fundadores. Cada una lleva contexto, opciones y la recomendación del redactor; los requisitos que dependen de una respuesta citan la pregunta y están escritos con la recomendación, marcados «(según Q#)». No avanza a Plan sin las respuestas y el merge de su PR documental (ADR-012 §3.1).

**Input**: User description: "Especificación 004 · P0-3 de Juntia, «Presupuestos opcionales, metas y Spending Story real» (maestro §11): P0-3a presupuesto opt-in y modelo de atribución; P0-3b Spending Story con y sin presupuesto; P0-3c modelo y API de metas privadas y compartidas, ledger y RLS; P0-3d UI de metas y S5 Goal Journey, aportes y retiros; P0-3e usar una meta para financiar un gasto sin doble conteo. Métricas `gasto_consumo`, `aporte_a_metas`, `retiro_de_metas`, `gasto_financiado_con_meta` y `total_destinado_neto`. Conecta el punto de extensión FR-035 de la 003 (`juntia_private.transaction_goal_funded`). Plan y Metas dejan su estado provisional. Exportación de alcance global. Acceso a datos según ADR-013. Sin banca, aportes programados, presupuestos sugeridos ni IA."

> **Qué es este documento.** Dice **qué** construye P0-3 y **por qué**. **No
> decide nada**: cada requisito cita la decisión que aplica. Lo que no estaba
> decidido va a los fundadores como pregunta numerada en «Clarifications», con la
> recomendación del redactor. Jerarquía: maestro (§15 prevalece) > ADR > paquete de
> `docs/design/` y `docs/CONVENTIONS.md` > esta spec (`AGENTS.md` §2). En este
> archivo, `[P]` significa **propuesta** y `[V]` **verificación pendiente**, según
> el maestro §15.9; no significan «paralelizable» (eso solo ocurre dentro de
> `tasks.md`, ADR-012 §3.2).
>
> **Desviación de la plantilla, a propósito.** Como en la 003, la plantilla de Spec
> Kit limita a tres los `[NEEDS CLARIFICATION]`; aquí hay 19 preguntas, porque el
> encargo del gestor pide que todo lo no decidido llegue a los fundadores en lugar
> de resolverse en la spec.

### Fuentes que aplica

| Fuente | Qué aporta a P0-3 |
| --- | --- |
| Maestro §11, «P0-3» y backlog P0-3a a P0-3e | Alcance, orden sugerido de PR («primero esquema/ledger, luego UI/animación, luego enlace compra + regresión») y salida interna: el usuario entiende gasto frente a ahorro destinado |
| Maestro §2.3 (principios 1, 5 y 8), §2.4 (DEC-R17) | Registrar antes de planificar, dimensiones separadas, sin culpa, no presumir liquidez |
| Maestro §5.1, §5.2 | `goal_contribution`, `goal_withdrawal`, `goal_usage`; `budget_remaining` solo con presupuesto activo; aportes fuera de las categorías presupuestales |
| Maestro §5.3 (DEC-R01, ADR-004) | Presupuestos opcionales, tres estados (ausente, activo, archivado), sin `COALESCE` a cero, atribución grupal y personal no aditivas, mensuales por contexto, categoría, moneda y periodo |
| Maestro §5.6 (DEC-G01 a DEC-G06, ADR-010) | Metas privadas XOR compartidas, operaciones, reserva frente a transferencia declarada, métricas sin doble conteo, progreso y cierres, privacidad e integridad |
| Maestro §6.4, S3 y S5 | Spending Story con y sin presupuesto; Goal Journey |
| Maestro §7.3, §7.4 | `budgets`, `savings_goals`, `goal_ledger_entries`, `goal_usage_allocations`, `goal_usage_confirmations`; contrato por tipo; operaciones atómicas; privacidad de metas |
| Maestro §15.3, §15.4, §15.5, §15.6, §15.7 | Navegación, fórmula de DEC-G04 y su presentación, presupuestos sin segunda aprobación con ediciones concurrentes protegidas, gasto con meta, verificaciones 3 a 7 de §15.6.3, dependencias técnicas de §15.6.2 y umbrales |
| Maestro §15.9 | Inventario de `[P]`: GoalStack, FundingLedger, ConfirmationBadge, PlanningNote, ChangePreview |
| Maestro §15.10, decisiones 16.12, 18, 19, 20 y 21, y «Dataset dorado» | Exportación, iteración contra `juntia-dev`, verificaciones aplazadas, alcance de P0-2, accesibilidad en dos niveles y la parte del dataset dorado de P0-3 |
| Maestro US-01, US-04, US-08, US-09, US-13, US-17, US-18 a US-23 | Historias que P0-3 hace verificables |
| ADR-001 punto 7 | Mover a Pareja bloqueado si el gasto privado está financiado con una meta personal |
| ADR-002, ADR-007 | Unidades menores, pesos enteros, anulaciones auditadas |
| ADR-011 y `docs/TESTING.md` | Capas, specs E2E 4 y 5, caso «Financiación ajena → aprobar/rechazar» con dos contextos, presupuestos de tiempo, iteración contra `juntia-dev` |
| ADR-012 | Formato, gates por PR documental, `[P]` y `[V]` |
| ADR-013 | Las cinco tablas de P0-3 ya figuran como **tablas controladas** (§2); `juntia_writer`, bloqueo de la raíz, importes como texto, versión en presupuestos (§3.5) |
| `docs/design/HANDOFF_CLAUDE_CODE.md` | DEC-G04 y su tabla de siete filas, gasto con meta, reglas de UI, criterios de aceptación de P0 |
| `docs/design/COMPONENT_SPECIFICATIONS.md` | Datos de octubre (ahorro y meta Japón), GoalCard, GoalStack, BudgetIndicator, FundingLedger, ConfirmationBadge, PlanningNote, Chart, flujo Gasto con meta |
| `docs/design/MOTION_SYSTEM.md` §4, §5 y «Cuenta» | Goal Journey, Spending Story, uso de meta aprobado |
| `docs/design/RESPONSIVE_SPECIFICATIONS.md` | Pila y abanico de metas, meta inmersiva como ruta, Inicio desde md |
| Claude Design, «Juntia: Responsive design y design system»: `04 Pantallas` (04·2 Plan y Análisis mensual; 04·3 Metas, Registrar aporte e Historial; 04·4 Validación fotográfica; 04·6 Sin metas; 04·7 y 04·8 escritorio; 04·11 Gasto con meta B1–B7; 04·12 y 04·13 Mover y financiar), `05 Calidad y Handoff` (05·7 DEC-G04 y criterios, 05·8 aceptación de Gasto con meta), `I2 - Bosque Arena` (I2·4, meta inmersiva) | Pantallas y estados que P0-3 construye |
| `docs/CONVENTIONS.md` A.4 y `docs/GLOSSARY.md` §4–§6, §8, §9 | Las cinco métricas en español, pares asiento ↔ métrica, palabras prohibidas |
| Spec 003 (`spec.md`, `contracts/server-actions.md`, `evidence.md`) | Forma y nivel de detalle; lecciones F44, F47, F55 y F57 que aquí pasan a requisitos (FR-090 a FR-099) |

## Clarifications

### Lo que ya estaba decidido antes de la etapa Specify

Para que la revisión no lo reabra:

- **Presupuesto opcional; ausencia ≠ cero:** tres estados (no existe, activo, archivado); el frontend recibe `budget: null` o un estado tipado; un límite de cero no se admite como activo (§5.3, DEC-R01).
- **Atribución no aditiva:** el presupuesto de Nosotros consume el importe completo de los gastos del grupo; el de Yo consume los privados más la parte asignada. Nunca se suman entre sí (§5.3, ADR-004).
- **Quién edita un presupuesto compartido:** cualquiera de los dos, sin segunda aprobación ni activación automática, con autor, fecha e historial; las ediciones concurrentes no se sobrescriben en silencio (§15.5, §15.6.3 punto 7, ADR-013 §3.5).
- **Ingresos y liquidaciones no consumen presupuesto;** los aportes tampoco (§5.2, §5.3, DEC-G06).
- **Metas:** privada XOR compartida; COP; fecha objetivo opcional; estados `active | completed | archived`; sin obligación de reparto del ahorro; funcionan con y sin presupuesto (DEC-G01).
- **Aportes:** los registra quien aporta; **el cliente no aporta a nombre de otro** (DEC-G06; 05·7 «Aportes»). Llevan `funding_mode` `reserved` o `transferred_declared` (DEC-G03).
- **Retiros:** solo de aportes **propios no consumidos**, con motivo; nunca se presentan como ingreso (DEC-G02; glosario §9).
- **Uso de fondos ajenos:** exige la confirmación explícita del otro; sin ella no se aplica (DEC-G02, DEC-G06).
- **Gasto con meta:** el gasto real y el uso de fondos propios se registran de inmediato en una operación atómica; los fondos del otro se piden por una cantidad exacta, mientras están pendientes no se descuentan ni cuentan, **no vencen** y no son una transferencia; si se rechaza o cancela, el gasto permanece (§15.5, §15.6.3 puntos 5 y 6).
- **Saldo de la meta:** `goal_balance = Σ aportes − Σ retiros − Σ usos`, siempre ≥ 0, y también ≥ 0 por aportante (DEC-G04, DEC-G05, DEC-G06).
- **Las metas no tocan** `net_owed`, `group_total` ni el consumo de presupuestos (DEC-G06).
- **`total_destinado_neto`:** fórmula de §15.4; métrica de planificación; nunca «Total gastado», nunca número héroe, puede ser negativa y se explica; solo como nota secundaria en Análisis (§15.4).
- **Sin tiempo real:** los datos se actualizan al navegar, al volver a la pestaña y tras cada escritura propia (decisión 20.16). Lo mismo vale para las solicitudes de fondos.
- **Fuera de P0:** aportes programados, presupuestos sugeridos (DEC-R01-S), metas con rendimiento, banca, multimoneda, categorías propias, grupos N (§3, §5.6).

### Preguntas abiertas para los fundadores

Cada pregunta: **contexto**, **opciones** y **recomendación**. Los requisitos citan
el número. Las marcadas «ADR» necesitan, si se aprueban, una nota o un archivo de
ADR en el mismo PR de Clarify, como hizo la 003 con ADR-002 y ADR-007.

#### Q1 · Forma de la especificación y reparto en PR

- **Contexto:** el maestro §11 pide PR cortos («primero esquema/ledger, luego UI/animación, luego enlace compra + regresión») y su backlog tiene cinco tickets (P0-3a a P0-3e). La 003 usó cuatro PR (decisión 20.1).
- **Opciones:** (a) cinco PR: A base de datos, seguridad y dominio; B Plan y presupuestos; C Metas, aportes, retiros y S5; D Gasto con meta y confirmaciones; E Análisis (S3), PlanningNote, exportación y cierre. (b) Cuatro PR, juntando B y E (Plan + Análisis) después de D. (c) Dos specs separadas (presupuestos y metas).
- **Recomendación: (a).** Ver «Propuesta de reparto en PR» al final. La spec E2E 5 nace en B y la 4 en C; D amplía la 4 con el caso de dos sesiones; E amplía la 5 con la Spending Story. Una sola spec, porque Análisis y Mover a Pareja cruzan presupuestos y metas.

#### Q2 · GoalStack `[P]`: pila tipo Wallet o lista

- **Contexto:** §15.9 lo marca «Sí afecta al alcance — pila vs. lista es una elección de producto». Depende además del rendimiento en gama media (§15.6.2 punto 4). 04·3 y 04·7 muestran la pila (abanico en escritorio) con «Ver todas» siempre visible.
- **Opciones:** (a) pila en móvil y abanico desde lg, como el comp, con «Ver todas» como alternativa al gesto; (b) lista editorial de GoalCard; (c) pila solo cuando hay 2 o más metas y lista en «Ver todas».
- **Recomendación: (a)**, que ya incluye (c) por diseño (1 meta = tarjeta sola, 0 = vacío). Condición: la `[V]` de rendimiento del abanico con 6 metas (RESPONSIVE «Pendiente») se ejecuta en el PR C; si falla en gama media emulada, el PR cae a (b) y lo trae a los fundadores. La aprobación final en pantalla es la revisión del PR C.

#### Q3 · Gasto con meta: FundingLedger `[P]`, ConfirmationBadge `[P]` y el efecto B3

- **Contexto:** §15.9 marca los dos componentes «Sí afectan al alcance». La regla de fondo está aprobada (§15.5); su forma no. B3 («Efecto · ahora y si aprueba») es una ChangePreview, aprobada solo para Mover a Pareja (decisión 20.3).
- **Opciones:** (a) aprobar en su forma FundingLedger (dos bloques: «Reparto del gasto · quién lo asume» y «Fondos de la meta · de quién son»), los cinco estados de ConfirmationBadge (PENDIENTE DE {nombre}, APROBADO, {nombre} NO APROBÓ, NO SE REGISTRÓ, CON META) y la ChangePreview de B3 con «ahora» y «si aprueba»; (b) aprobar solo FundingLedger y simplificar B3 a una frase; (c) rediseñar.
- **Recomendación: (a).** Es la forma que hace visible la regla «reparto ≠ fondos» (DEC-G04), y la ChangePreview ya existe en código desde la 003. Aprobación final en pantalla en el PR D. «NO SE REGISTRÓ» se usa **solo** con un rechazo confirmado del servidor, nunca con un resultado desconocido (lección F47-4).

#### Q4 · PlanningNote `[P]`: forma de presentar `total_destinado_neto`

- **Contexto:** §15.9: «DEC-G04 es sensible (§15.4)». La fórmula es `[A]`; su presentación, propuesta. 04·2 la pone en el capítulo 4 de Análisis, bajo «Lo que apartaron».
- **Opciones:** (a) PlanningNote tal como está especificada: `surface.sunken`, overline «Destinado neto · para planificar», valor 17/600, frase fija «No es lo gastado ni un saldo bancario», texto del signo negativo y «Cómo se calcula» con `<dl>` accesible; solo en Análisis; (b) solo el desglose, sin cifra resumen; (c) no mostrarla en P0 (conservarla solo en el dominio).
- **Recomendación: (a).** §15.4 ya dice «solo como nota secundaria explicada, dentro de Análisis»; (c) es más prudente pero deja sin uso una métrica que el maestro quiere visible para planificar. Aprobación final en pantalla en el PR E.

#### Q5 · Dónde vive Análisis (S3 Spending Story)

- **Contexto:** el handoff ordena «… → Plan → Análisis» y 04·2 dibuja «Análisis mensual» con la barra de Plan; la navegación (§15.3) no tiene destino «Análisis». S3 debe existir con y sin presupuesto (§6.4).
- **Opciones:** (a) Análisis es una ruta hija de Plan (`/plan/analisis`), con acceso desde Plan («Ver el análisis de {mes}») y desde «En qué se fue» de Inicio; Plan muestra arriba el resumen del mes y debajo los presupuestos; (b) Análisis es la propia pantalla Plan, con los presupuestos como capítulo; (c) Análisis vive en Actividad.
- **Recomendación: (a).** Mantiene Plan como «planificar» (presupuestos opcionales) sin que quien no planifica pierda su historia del mes, y no añade destino de navegación. En escritorio, Análisis se abre en el área de contenido de Plan, sin nuevo destino del sidebar.

#### Q6 · Fotos de las metas · ADR

- **Contexto:** GoalCard, GoalStack y la meta inmersiva (S5) se apoyan en una foto con punto focal (04·4). El maestro §7.1 deja **Supabase Storage privado para P1**, y una foto de una meta compartida es un archivo nuevo que cruza privacidad, tamaño, EXIF y exportación. GoalCard tiene un **fallback sin foto aprobado** (`[A]`: fondo de ahorro, inicial en serif e ícono Duotone del tipo de meta).
- **Opciones:** (a) P0-3 sin subida de fotos: siempre el fallback; la subida, con un ADR propio (ADR-014, Storage privado de fotos de metas) antes de P0-4; (b) subida a Storage privado en P0-3, con ADR antes del plan, punto focal, eliminación de EXIF, límite de tamaño, RLS por dueño o pareja y la `[V]` de luminancia del scrim; (c) un set cerrado de fotos ilustrativas por tipo de meta, empaquetado en la app, sin subida.
- **Recomendación: (a).** Las fotos son la parte más cara y más arriesgada de S5 y no son dinero; el fallback es `[A]` y S5 sigue siendo S5 (cinta, aportes por persona, Goal Journey) sin ellas. Si los fundadores eligen (b), es una decisión nueva y difícil de revertir: **ADR antes del plan** (`AGENTS.md` 17) y el PR C crece.

#### Q7 · ¿Un presupuesto mensual se repite cada mes? · ADR-004 (nota)

- **Contexto:** §5.3 dice «mensuales, por contexto/categoría/moneda/periodo; crear, editar, archivar y consultar histórico» y §7.3 «una configuración activa por clave». No dice si el límite de octubre sigue en noviembre.
- **Opciones:** (a) **un presupuesto vigente se aplica a cada mes hasta que se edita o se desactiva**; una edición rige desde el mes en que se hace (incluido) en adelante, y los meses anteriores conservan el límite que tenían (historial con vigencia por mes); (b) un presupuesto por mes, que hay que crear de nuevo cada mes (o copiar con «Usar el de octubre»); (c) (a), pero la edición permite elegir «desde este mes» o «solo este mes».
- **Recomendación: (a).** Es lo que alguien espera de «Mercado: 900.000 al mes», no fabrica ningún límite (lo creó una persona) y no pide trabajo mensual (principio «registrar antes de planificar»). Desactivar rige desde el mes en curso; los meses anteriores conservan su límite y su historia. Se escribe como **nota de implementación de ADR-004** en un archivo propio, `docs/adr/ADR-004-presupuestos.md`.

#### Q8 · Alcance de un presupuesto: solo por categoría

- **Contexto:** §5.3 habla de presupuestos «por categoría»; 04·2 solo los muestra por categoría. Un límite total del mes no aparece en ningún documento.
- **Opciones:** (a) solo por categoría, las nueve categorías de gasto del catálogo (incluida «Otra»), nunca «Ingresos»; (b) por categoría y además un total del mes por contexto; (c) solo total del mes.
- **Recomendación: (a).** Es lo diseñado y lo único que el maestro nombra. Un total mensual sería un alcance nuevo, con su propia pregunta de no aditividad.

#### Q9 · Ritmo, sugerencias y proyecciones

- **Contexto:** S3 con presupuesto muestra «límite, consumido, desviación y ritmo» (§6.4) y «sin predicción inventada» (§11). Las metas muestran «Sugerido para ir al ritmo: $1.110.000 al mes», «Ritmo para abril: 67 %» y un tramo punteado de próximo aporte (GoalCard). El handoff exige marcar toda proyección como estimación con patrón punteado; el glosario prohíbe «Llegarán en abril».
- **Opciones:** (a) **solo aritmética descriptiva, sin extrapolar:** presupuesto: «Quedan {n} días de {mes}» y la marca de «mes transcurrido» en la barra (días transcurridos / días del mes), sin cifra de cierre proyectada; meta con fecha: «Faltan $X en {n} meses · $Y al mes» (= lo que falta / meses enteros hasta el mes objetivo, incluido, sin contar el actual, redondeado hacia arriba al peso) y la marca de ritmo = fracción de tiempo transcurrido entre la creación de la meta y el fin del mes objetivo; sin «próximo aporte planeado» porque no hay aportes programados en P0; (b) (a) más una proyección de cierre del mes basada en el ritmo de gasto, marcada como estimación; (c) nada de ritmo en P0.
- **Recomendación: (a).** Reproduce el «1.110.000/mes en 6 meses» del dataset sin inventar comportamiento futuro, y el tramo punteado de «próximo aporte» no tiene datos en P0 (los aportes programados son P1). El «67 %» del comp no se reproduce (depende de una fecha de creación que el diseño no da); se acepta viendo la pantalla.

#### Q10 · Comparación con el mes anterior en Análisis

- **Contexto:** el capítulo 1 de 04·2 dice «$115.000 más que en septiembre (+4 %), por la cena y los servicios» y el capítulo 3 compara seis meses. El handoff marca ese «+4 %» como **«Atención»** en la auditoría anti-slop: «solo aparece con su explicación».
- **Opciones:** (a) diferencia en pesos y porcentaje entero frente al mes anterior **solo si el mes anterior tiene al menos un gasto en ese contexto**, y la explicación nombra **las categorías** (hasta dos) con mayor aumento en pesos, calculadas de forma determinista; nunca un gasto concreto («la cena») ni una causa; el capítulo 3 muestra los meses con datos, hasta seis, nunca barras de meses sin datos; (b) solo la diferencia, sin explicación; (c) sin comparación en P0.
- **Recomendación: (a).** Es descriptiva, verificable y sin culpa; nombrar un gasto concreto sería elegir una «causa», que es interpretación.

#### Q11 · Qué ve cada persona de las metas en Yo y en Nosotros

- **Contexto:** `aporte_a_metas` en Yo incluye los aportes propios a metas compartidas (Sara, octubre: 500.000 a Japón). 04·3 solo dibuja Metas en Nosotros.
- **Opciones:** (a) **Nosotros:** solo metas compartidas, con el total apartado y los aportes de los dos. **Yo:** las metas personales y, en una sección aparte, las compartidas con «Tus aportes $X» (nunca se suman a las personales en un total); (b) Yo solo con las personales; (c) Yo con todo mezclado.
- **Recomendación: (a).** Es el mismo patrón que los gastos («Compartido · tu parte») y hace coherente el `aporte_a_metas` de Yo. Las metas personales nunca aparecen en Nosotros ni en ningún dato que reciba la pareja (DEC-G06).

#### Q12 · Fecha y modo de un aporte o un retiro

- **Contexto:** `aporte_a_metas` y `retiro_de_metas` son métricas **del periodo**: hace falta una fecha. DEC-G03 exige `funding_mode` por aporte; Registrar aporte (04·3) no dibuja ni fecha ni modo.
- **Opciones:** (a) fecha elegible, por defecto hoy, **hoy o pasada, nunca futura** (como las liquidaciones, decisión 20.10); modo «Apartado en Juntia» por defecto y una opción «Lo transferí a otra cuenta mía (declarado)»; (b) la fecha es la del registro, sin elegir; (c) se permite fecha futura, como los gastos (16.13).
- **Recomendación: (a).** Permite anotar el aporte de ayer sin falsear el mes, y un aporte futuro sería un aporte programado (P1). Los textos se aprueban viendo la pantalla del PR C.

#### Q13 · Corregir un aporte mal registrado · ADR-010 (nota)

- **Contexto:** US-23 habla de «retiro o anulación de aporte». Un retiro es una reasignación real y cuenta en `retiro_de_metas` del mes del retiro; un aporte registrado por error (otro importe, otra meta, duplicado) no debería contar ni como aporte ni como retiro.
- **Opciones:** (a) dos operaciones distintas: **«Deshacer» de 6 s** justo después de registrar y **«Anular aporte»** desde el historial, que la persona aportante puede usar mientras esos fondos sigan disponibles (no usados); el aporte anulado sale de `aporte_a_metas` de su mes, sigue en el historial marcado como anulado y nunca se edita ni se borra (como las liquidaciones, decisión 20.11); el **retiro** queda para reasignaciones reales; (b) solo retiros: un error se corrige retirando; (c) aportes editables con versión.
- **Recomendación: (a).** Es la regla de ADR-007 aplicada a metas y evita que un error aparezca como «liberaron dinero». Se registra como nota de **ADR-010** en un archivo propio, `docs/adr/ADR-010-metas.md`.

#### Q14 · Retirar aportes del otro integrante

- **Contexto:** DEC-G02 permite retirar recursos de terceros solo con confirmación explícita, y «si no está implementada, la operación queda bloqueada». El diseño no tiene flujo para pedir un retiro ajeno; solo para el **uso** ajeno en un gasto (B1–B7).
- **Opciones:** (a) en P0, **solo se retiran aportes propios**; el retiro ajeno no se ofrece y la función lo rechaza; (b) retiro ajeno con solicitud y confirmación, reutilizando `goal_usage_confirmations`.
- **Recomendación: (a).** Lo permite DEC-G02 tal cual y no hay diseño para (b). Cada integrante libera su propio dinero; para usar el del otro existe el gasto con meta.

#### Q15 · Editar, dar por lograda y archivar una meta

- **Contexto:** DEC-G01 da los estados; DEC-G05 dice «estado de meta completada configurable» y que alcanzar el objetivo no implica compra; DEC-G02 permite «archivar cuando el balance esté reconciliado».
- **Opciones:** (a) **editar** (nombre, ícono, objetivo, fecha) lo puede cualquiera de los dos en una meta compartida, con versión esperada y auditoría; el objetivo puede quedar por debajo del saldo (se muestra el excedente de forma neutra). **Lograda** (`completed`) la marca una persona con «Dar por lograda» cuando quiera; al llegar al 100 % la app lo **sugiere** («Lo lograron») pero no cambia el estado sola; una meta lograda sigue admitiendo usos y retiros, no aportes nuevos. **Archivar** solo con saldo 0 y sin solicitudes pendientes; una meta archivada es de solo lectura y sale del listado principal («Archivadas»). Nunca se borra una meta con historia; (b) `completed` automático al llegar al objetivo; (c) archivar con saldo, congelando los fondos.
- **Recomendación: (a).** «Saldo 0» es la lectura literal de «balance reconciliado» y evita fondos huérfanos en una meta invisible. Que lograda no sea automático evita una meta que se «completa» y «descompleta» con cada uso.

#### Q16 · Alcance del gasto con meta y propuesta de fondos

- **Contexto:** 04·11 B1 elige **una** meta del mismo contexto desde Anotar («Cómo se pagó: Dinero del mes · Con una meta»), y B2 permite usar solo una parte del gasto. El ejemplo del dataset reparte 1.620.000 / 1.380.000, cercano a la proporción de los aportes (6,12 M / 5,22 M), pero no exacto.
- **Opciones de alcance:** (a) **una meta por gasto, elegida al anotar**; importe usado ≤ importe del gasto; metas personales solo en Yo y compartidas solo en Nosotros; (b) además, «Pagar con una meta» desde el detalle de un gasto ya registrado; (c) varias metas por gasto.
- **Opciones de propuesta en FundingLedger:** (i) proporcional a lo disponible de cada aportante, en pesos enteros con mayor residuo (ADR-002), editable; (ii) primero los fondos propios; (iii) campos vacíos.
- **Recomendación: (a) + (i).** (a) es lo diseñado y mantiene el registro rápido; para un gasto ya anotado, se anula y se vuelve a anotar. (i) es neutral entre los dos y nunca pide más de lo disponible; las pruebas usan los importes **escritos** del dataset (1.620.000 / 1.380.000), no la propuesta. La ruta mínima de Anotar no cambia: «Dinero del mes» es el valor inicial (US-12).

#### Q17 · Editar o anular un gasto con meta, y revertir el uso · ADR-010 (nota)

- **Contexto:** ADR-001 punto 7 exige, para mover un gasto financiado, «una reversión autorizada y auditada» del uso, que todavía no existe. Nada dice qué pasa al anular o editar un gasto con meta, ni con una solicitud pendiente.
- **Opciones:** (a) **«Quitar el uso de la meta»** desde el detalle del gasto: una operación atómica e idempotente que anula los usos aplicados (los fondos vuelven a cada aportante) y cancela la solicitud pendiente, con auditoría; la puede hacer cualquier integrante del contexto, porque solo devuelve dinero a sus dueños. **Anular el gasto** hace lo mismo en la misma transacción, y la confirmación lo dice. **Editar el monto** por debajo de lo ya usado se rechaza con un mensaje que manda primero a quitar el uso; las demás ediciones no tocan el uso. Una solicitud pendiente se revalida al aprobar y falla si ya no cabe; (b) bloquear editar y anular mientras haya uso; (c) anular el gasto deja el uso en pie.
- **Recomendación: (a).** Ningún vínculo se borra en silencio (ADR-001 punto 7): la reversión es explícita, se audita y se ve. (c) dejaría dinero «gastado» en una compra que no existe. Con (a) se desbloquea Mover a Pareja de un gasto privado financiado: primero se quita el uso. Nota de **ADR-010**.

#### Q18 · Mes al que cuenta `gasto_financiado_con_meta`

- **Contexto:** si Tomás aprueba en diciembre una solicitud de un gasto del 3 de noviembre, el uso aprobado puede contar en noviembre (mes del gasto) o en diciembre (mes de la aprobación).
- **Opciones:** (a) **el mes del gasto** (`transaction_date`), en todas las vistas, también para la parte aprobada después; (b) el mes de la aprobación.
- **Recomendación: (a).** `total_destinado_neto` existe para no contar dos veces el mismo dinero en el periodo del consumo; si el financiamiento cayera en otro mes, noviembre mostraría el gasto como dinero nuevo y diciembre un negativo sin compra. El precio: la cifra de un mes pasado cambia al aprobar, como cambia hoy al editar un gasto pasado. Los aportes y retiros cuentan en su propia fecha (Q12).

#### Q19 · Filas del dataset dorado que define esta spec

- **Contexto:** la regla 2 del «Dataset dorado» (§15.10) permite que la spec defina filas cuando el diseño solo da un total. El diseño da el saldo de Japón (Sara 6.120.000 en 11 aportes, Tomás 5.220.000 en 10) y solo detalla agosto a octubre; da los límites de presupuesto de octubre y solo un cambio («Sara subió Mercado a $900.000 · 3 oct»); y da el retiro de Bicicleta (1.050.000 → 850.000) sin su historia.
- **Opciones:** (a) aprobar las filas de «Dataset dorado de P0-3» de esta spec (aportes de Japón anteriores a agosto, autores y fechas de los presupuestos, Bicicleta), con los casos de noviembre como **escenarios hipotéticos** que se prueban por diferencias, como la decisión 20.18; (b) otras filas.
- **Recomendación: (a).** Las filas suman exactamente los totales del diseño y no tocan las partes de P0-1 y P0-2.

## User Scenarios & Testing *(mandatory)*

Los actores son las dos personas fundadoras, que ya usan Juntia con su pareja
(P0-2) y ahora planifican: presupuestos si quieren, y metas con aportes. Sara
(propietaria) y Tomás (integrante) son los nombres del dataset dorado.

### User Story 1 - Ver el mes sin presupuesto, sin castigo (Priority: P1)

Tomás nunca creó un presupuesto. Abre Plan y Análisis: ve cuánto gastaron, en qué,
cómo se compara con el mes anterior y lo que apartaron para metas. No ve barras
vacías, «$0», «excedido» ni un aviso para crear presupuestos.

**Why this priority**: DEC-R01, US-01, US-13 y el principio «registrar antes de
planificar». El modo sin presupuesto se diseña y prueba tan cuidadosamente como el
modo con presupuesto (§5.3).

**Independent Test**: con el dataset dorado sin presupuestos en Yo, Plan y Análisis
de Sara en Yo no contienen ninguna cifra de límite, «restante» ni «excedido»;
dominio puro para `budget: null`; componentes para la presentación.

**Acceptance Scenarios**:

1. **Given** Sara en Yo sin presupuestos, **When** abre Plan, **Then** ve el resumen de octubre (gasto $1.912.900, en qué se fue) y «Sin presupuesto · Crear presupuesto (opcional)» como acción secundaria, nunca «Presupuesto $0» (glosario §9; DEC-R01).
2. **Given** Nosotros con presupuestos en Mercado, Restaurantes y Servicios, **When** se ve Hogar, **Then** dice «$1.600.000 · sin presupuesto» con «Crear», sin barra (04·2).
3. **Given** cualquier pantalla de P0-3, **When** no hay presupuesto, **Then** no aparece `budget_remaining`, alerta de exceso ni límite cero (§10.3; US-01).
4. **Given** el registro, Anotar, Inicio, Mi pareja o la invitación, **When** se usan sin presupuesto, **Then** nada obliga ni empuja a crearlo (US-13).
5. **Given** cualquier texto de Plan o Análisis, **When** se lee, **Then** nunca dice «te alcanza», «puedes pagarlo» ni equivalentes, con o sin presupuesto (DEC-R17; US-09).

---

### User Story 2 - Crear, editar y desactivar un presupuesto (Priority: P1)

Sara crea un presupuesto de Restaurantes de $260.000 para Nosotros. Tomás lo ve sin
aprobar nada. Días después Sara sube Mercado a $900.000; el historial lo dice. Cuando
dejan de necesitar el de Servicios, lo desactivan y sus gastos siguen ahí.

**Why this priority**: US-04 y P0-3a. Aplica Q7 y Q8.

**Independent Test**: la spec E2E 5 (nace en el PR B) crea, edita y desactiva un
presupuesto y comprueba el estado sin presupuesto; la atribución y los porcentajes
en dominio puro; versión y concurrencia en integración.

**Acceptance Scenarios**:

1. **Given** Plan en Nosotros, **When** Sara crea Restaurantes $260.000, **Then** queda activo para el mes en curso y los siguientes (según Q7), visible para los dos sin aprobación, con «Creado por Sara · fecha» (§15.5).
2. **Given** un límite de 0, negativo, no entero en pesos o mayor que $999.999.999, **When** se intenta guardar, **Then** no se guarda y el mensaje dice cómo corregirlo (DEC-R01; COMPONENT_SPECIFICATIONS, Input).
3. **Given** ya existe un presupuesto activo para Nosotros · Restaurantes, **When** se intenta crear otro, **Then** no se crea un segundo; se ofrece editar el existente (§7.3, «una configuración activa por clave»).
4. **Given** el dataset de octubre, **When** se ve Plan en Nosotros, **Then** Mercado «640.000 de 900.000 · Quedan 260.000»; Restaurantes «240.000 de 260.000 · Quedan 20.000 · 92 %» con CERCA DEL LÍMITE; Servicios «360.000 de 340.000 · Se pasaron por 20.000» con EXCEDIDO, barra rayada coral, ícono y texto (04·2; BudgetIndicator).
5. **Given** US-04 (Restaurantes de 1.000.000 y gasto de 1.180.000), **When** se muestra, **Then** 118 % y «Se pasaron por 180.000»; **When** se desactiva, **Then** los gastos y el historial siguen y no aparece ninguna cifra de límite cero (US-04).
6. **Given** Sara sube Mercado a $900.000, **When** cualquiera abre el presupuesto, **Then** ve el historial con autor, fecha, valor anterior y nuevo, y la línea «Último cambio: Sara subió Mercado a $900.000 · 3 oct» (04·2; §15.5).
7. **Given** Tomás abrió Mercado antes del cambio de Sara, **When** guarda su edición con la versión anterior, **Then** no se sobrescribe: ve «Sara cambió este presupuesto», el valor vigente y la opción de revisar (BudgetIndicator, «Conflicto»; §15.6.3 punto 7).
8. **Given** un presupuesto personal de Sara en Yo, **When** Tomás consulta cualquier vista o función, **Then** no lo ve (DEC-R01; §7.4).
9. **Given** Sara en Yo con presupuesto de Mercado, **When** se calcula, **Then** consume sus privados de Mercado más su parte de los gastos compartidos de Mercado, nunca el total de Nosotros; los tres presupuestos (Nosotros, Yo de Sara, Yo de Tomás) nunca se suman (§5.3; US-08).
10. **Given** una persona sin pareja activa, **When** usa Plan en Yo, **Then** crea y usa presupuestos personales igual; en Nosotros ve el estado «todavía no disponible» de P0-1.

---

### User Story 3 - Leer el mes como una historia (S3 Spending Story) (Priority: P2)

Al final de octubre abren Análisis: cuánto gastaron, en qué, cómo se compara y lo que
apartaron, en cuatro capítulos. Con presupuesto, cada categoría muestra su límite;
sin él, la misma historia sin ninguna barra fingida.

**Why this priority**: S3 es experiencia insignia de P0 (§6.4) y P0-3b. Aplica Q5,
Q9 y Q10.

**Independent Test**: componentes de Análisis con y sin presupuesto; los capítulos
contra el dataset dorado; el recorrido, caso de la spec E2E 5 en el PR E.

**Acceptance Scenarios**:

1. **Given** el dataset de octubre en Nosotros, **When** se abre Análisis, **Then** capítulo 1 «Gastaron juntos $2.840.000»; capítulo 2 Hogar 1.600.000 · Mercado 640.000 · Servicios 360.000 · Restaurantes 240.000; capítulo 4 «$900.000 · Sara $500.000 · Tomás $400.000. Va aparte: no es gasto» y la PlanningNote con $3.740.000 (04·2; DEC-G04).
2. **Given** presupuesto activo en una categoría, **When** se muestra el capítulo 2, **Then** esa categoría añade límite, consumido, desviación y la marca de mes transcurrido (según Q9); **Given** ninguno, **Then** solo gasto, categorías y comparación (§6.4 S3).
3. **Given** el mes anterior sin gastos en ese contexto, **When** se abre Análisis, **Then** no hay comparación ni «+X %»; **Given** con gastos, **Then** la diferencia y hasta dos categorías con mayor aumento (según Q10).
4. **Given** el selector de mes, **When** se cambia, **Then** los counters y barras interpolan (240 ms) sin re-entrada; con movimiento reducido, cambio inmediato (MOTION_SYSTEM §5).
5. **Given** un lector de pantalla, **When** recorre Análisis, **Then** cada capítulo es una región con encabezado y cada gráfico tiene su tabla equivalente (Chart; handoff §Accesibilidad).
6. **Given** el capítulo 3, **When** se dibuja, **Then** ahorro y gasto nunca se apilan en una misma barra (Chart).

---

### User Story 4 - Crear una meta y verla avanzar (S5 Goal Journey) (Priority: P1)

Sara crea su meta privada «Bicicleta de ruta» y, con Tomás, la compartida «Japón»
con objetivo de $18.000.000 para abril de 2027. En Metas ven la pila, abren Japón y
la tarjeta crece hasta la vista inmersiva con la cinta de cada uno.

**Why this priority**: US-18, US-19, DEC-G01 y S5. Aplica Q2, Q6, Q9, Q11 y Q15.

**Independent Test**: la spec E2E 4 (nace en el PR C) crea una meta y registra un
aporte; RLS de metas en pgTAP; progreso en dominio puro.

**Acceptance Scenarios**:

1. **Given** Metas sin metas, **When** se abre, **Then** 04·6 «Todavía no tienen metas · Una meta les ayuda a apartar dinero juntos…» con «Crear una meta» (en Yo, el texto en singular).
2. **Given** «Nueva meta», **When** se crea con nombre, tipo (ícono), objetivo positivo y fecha opcional, **Then** queda activa en el contexto en que se creó (Yo = personal, Nosotros = compartida), en COP (DEC-G01).
3. **Given** el dataset, **When** se abre Metas en Nosotros, **Then** «Apartado en metas compartidas» suma las metas compartidas activas, con «Es dinero apartado, no gastado. Sigue donde lo tengan.», y Japón muestra 63 %, «$11.340.000 de $18.000.000» y la cinta con un tramo por persona (color + patrón) (04·3; GoalCard).
4. **Given** Japón con fecha, **When** se ve, **Then** «Faltan $6.660.000 en 6 meses · $1.110.000 al mes», marcado como estimación, nunca «Llegarán en abril» (según Q9; glosario §9).
5. **Given** la tarjeta frontal, **When** se toca, **Then** Goal Journey: la tarjeta se eleva y se expande a la meta inmersiva (ruta propia), con foco en el título; Escape o × cierra y el foco vuelve a la tarjeta; con movimiento reducido, crossfade de 200 ms y cinta llena (MOTION_SYSTEM §4).
6. **Given** sin foto (según Q6), **When** se muestra cualquier GoalCard, **Then** el fallback aprobado: fondo de ahorro, inicial en serif al 30 % e ícono Duotone del tipo de meta, texto en tinta (GoalCard, «Fallback sin foto»).
7. **Given** la meta privada de Sara, **When** Tomás consulta cualquier vista, función, agregado o exportación, **Then** no obtiene nada de ella ni de sus aportes (US-22; DEC-G06).
8. **Given** Yo de Sara, **When** abre Metas, **Then** ve sus metas personales y, aparte, las compartidas con «Tus aportes $X» (según Q11).
9. **Given** el saldo de Japón ≥ objetivo, **When** se muestra, **Then** «Lo lograron» como sugerencia y el excedente de forma neutra; el estado cambia solo con «Dar por lograda» (según Q15; DEC-G05).
10. **Given** 0, 1, 2, 3 y más de 3 metas, **When** se muestra la pila, **Then** sigue las cantidades de GoalStack y «Ver todas» está siempre visible; en lg, abanico con «+» para crear (según Q2; RESPONSIVE).

---

### User Story 5 - Registrar aportes y ver de quién son (Priority: P1)

Sara registra un aporte de $500.000 a Japón el 22 de octubre; Tomás, $400.000 el 15.
El progreso sube, el gasto del mes no cambia y el historial dice quién aportó qué.

**Why this priority**: US-18, US-19, US-21 y DEC-G02 a DEC-G04. Aplica Q12 y Q13.

**Independent Test**: aporte en pgTAP (éxito, tercera cuenta, idempotencia, a nombre
de otro); métricas en dominio puro con el dataset; el recorrido en la spec E2E 4.

**Acceptance Scenarios**:

1. **Given** Registrar aporte (04·3), **When** Sara escribe $500.000, **Then** ve «Con este aporte $11.840.000 · 66 %» y el texto «Un aporte aparta dinero para la meta. No es un gasto ni una transferencia: el dinero sigue donde lo tengan.»; **no** hay selector «¿Quién aporta?»: aporta quien registra (DEC-G06).
2. **Given** el aporte guardado, **When** el servidor confirma, **Then** el progreso sube con la cinta (spring `gentle`), Actividad muestra «Aporte a Japón · Sara · ahorro, no es consumo · +$500.000» con la ficha redonda de ahorro, y `gasto_consumo` no cambia (US-18; ExpenseRow, variante aporte).
3. **Given** un aporte, **When** se elige el modo, **Then** «Apartado en Juntia» o «Transferencia declarada», nunca «Depositado» ni «verificada» (según Q12; DEC-G03; US-21).
4. **Given** una fecha futura, **When** se intenta registrar, **Then** no se puede; hoy y fechas pasadas sí (según Q12).
5. **Given** cualquier JWT, **When** intenta registrar un aporte con otro aportante, **Then** la función lo rechaza (US-22; DEC-G06).
6. **Given** el historial de Japón, **When** se abre, **Then** «Sara $6.120.000 · 11 aportes», «Tomás $5.220.000 · 10 aportes», filtros Todos/Sara/Tomás y los aportes por mes (octubre $900.000, septiembre $1.000.000, agosto $1.050.000) (04·3).
7. **Given** un aporte recién registrado, **When** se pulsa «Deshacer» en 6 s, **Then** queda anulado con auditoría y sale de `aporte_a_metas`; **Given** más tarde, **When** la aportante usa «Anular aporte» y esos fondos siguen disponibles, **Then** lo mismo; si ya se usaron, se rechaza y lo explica (según Q13).
8. **Given** aportes de los dos, **When** se ve Balance, **Then** el saldo entre ellos no cambia: las metas no crean deuda (US-19; DEC-G06).

---

### User Story 6 - Retirar dinero propio de una meta (Priority: P2)

Sara decide que la bicicleta puede esperar y libera $200.000 de «Bicicleta de ruta»
(1.050.000 → 850.000). Se ve como reasignación, nunca como ingreso.

**Why this priority**: DEC-G02, US-23 y la fila 4 de la tabla de DEC-G04. Aplica Q14.

**Independent Test**: dominio (fila de retiro, −200.000); pgTAP (propio, ajeno,
mayor que lo disponible); componentes (la fila no se pinta como ingreso).

**Acceptance Scenarios**:

1. **Given** Bicicleta con 1.050.000 de Sara, **When** retira 200.000 con un motivo, **Then** el saldo queda en 850.000 y Actividad muestra «Retiro de meta · reasignación», con el ícono `arrow-u-up-left`, sin «+», sin ficha ni color de ingreso (glosario §9; ADR-011 fila 5).
2. **Given** un retiro mayor que lo disponible **del aportante**, **When** se intenta, **Then** se rechaza: «Puedes retirar hasta $X» (DEC-G05, DEC-G06; 04·6 «retiro rechazado», §6.3).
3. **Given** una meta compartida, **When** Sara intenta retirar fondos de Tomás, **Then** no se ofrece y la función lo rechaza (según Q14; ADR-011 fila 8).
4. **Given** el retiro de noviembre, **When** se calcula Yo de Sara, **Then** `retiro_de_metas` 200.000 y, en el escenario aislado, `total_destinado_neto` −200.000 con «Negativo: liberaron de metas más de lo que destinaron» (tabla DEC-G04, fila 4; PlanningNote).

---

### User Story 7 - Pagar un gasto con una meta (Priority: P1)

Tomás paga los tiquetes a Tokio, $3.000.000 al 50/50. Sara los anota «Con una meta»:
Japón. Usa $1.620.000 de sus aportes y pide $1.380.000 de los de Tomás. El gasto queda
registrado ya; el uso de los fondos de Tomás espera su aprobación, que no vence.

**Why this priority**: US-20, §15.5 y §15.6.3 puntos 5 y 6, que bloquean la
aceptación del slice. Aplica Q3, Q16 y Q18.

**Independent Test**: integración de servidor (atomicidad, idempotencia,
concurrencia, meta ≥ 0); dominio (filas 5 a 7 de DEC-G04); el caso de dos sesiones
«Financiación ajena → aprobar/rechazar» en la spec E2E 4 (PR D).

**Acceptance Scenarios**:

1. **Given** Anotar en Nosotros, **When** se elige «Con una meta», **Then** B1 lista las metas compartidas activas con su saldo; las personales aparecen deshabilitadas con «Personal: solo para gastos de Yo»; «Dinero del mes» es el valor inicial y la ruta mínima no cambia (04·11 B1; según Q16).
2. **Given** B2, **When** se reparte el uso, **Then** FundingLedger muestra el reparto del gasto (50/50, «Define el balance entre ustedes. No cambia con la meta.») separado de los fondos por aportante, cada campo con tope en lo disponible, «Suman $X de $Y» y Guardar bloqueado si no suman o si el uso supera el gasto (FundingLedger; según Q3 y Q16).
3. **Given** B3, **When** se revisa, **Then** «Japón ahora 11.340.000 → 9.720.000» y «si Tomás aprueba 9.720.000 → 8.340.000», el gasto +3.000.000 como compra real y «Juntia no mueve dinero» (04·11 B3; según Q3).
4. **Given** «Registrar y pedir a Tomás», **When** el servidor confirma, **Then** en **una sola operación atómica e idempotente**: el gasto existe una vez con su reparto, el uso de Sara (1.620.000) está aplicado y la solicitud de 1.380.000 queda pendiente; Japón queda en 9.720.000; Sara 4.500.000 disponibles; Tomás sigue en 5.220.000 (§15.6.3 punto 5).
5. **Given** B4, **When** Sara mira Actividad, **Then** la tarjeta PENDIENTE DE TOMÁS dice que el gasto ya está registrado, que falta solo el uso de los fondos de Tomás, «No vence» y «Cancelar solicitud»; la fila del gasto lleva CON META y debajo «Uso de Japón · Aportes de Sara · no es un gasto nuevo · −$1.620.000» (04·11 B4; ConfirmationBadge).
6. **Given** Tomás en su sesión, **When** navega o vuelve a la app, **Then** ve la solicitud en Inicio y en la meta (B5) con el gasto, el reparto, lo que ya usó Sara y «Tus aportes en Japón $5.220.000 → $3.840.000»; «Si rechazas, el gasto sigue registrado y tus aportes no cambian» (04·11 B5; decisión 20.16).
7. **Given** Tomás aprueba, **When** el servidor confirma, **Then** en **otra** operación atómica e idempotente se revalidan permisos, saldo por aportante, estado de la meta y que el uso total no supere el gasto, y se aplica el uso: Japón 8.340.000 (46 %); Tomás 3.840.000; la cinta baja con `spring gentle` y el badge pasa a APROBADO (§15.6.3 punto 6; MOTION_SYSTEM «Uso de meta aprobado»).
8. **Given** Tomás rechaza, o Sara cancela, **When** el servidor confirma, **Then** el gasto sigue, solo cuentan los 1.620.000 de Sara y Japón sigue en 9.720.000 (04·11 B7; §15.5).
9. **Given** Tomás retiró parte de sus aportes mientras la solicitud estaba pendiente y ya no le alcanza, **When** aprueba, **Then** falla con «Tus aportes cambiaron: ahora tienes $X en Japón» y nada cambia; la meta nunca queda negativa (05·8; DEC-G06).
10. **Given** cualquier estado, **When** se calcula el balance de la pareja, **Then** Sara le debe 1.500.000 más a Tomás por este gasto, igual con la solicitud aprobada, rechazada o pendiente: los fondos de la meta no tocan el reparto (DEC-G04; DEC-G06).
11. **Given** un doble toque en «Registrar y pedir», en «Aprobar» o un reintento por red, **When** llegan dos peticiones con la misma intención, **Then** un solo gasto, un solo uso y una sola aprobación (§15.6.3 punto 2).
12. **Given** una meta personal y un gasto en Yo, **When** se paga con la meta, **Then** todo el uso es propio y se aplica al registrar; no existe solicitud (DEC-G06).

---

### User Story 8 - Quitar el uso de una meta o corregir el gasto (Priority: P2)

Sara anotó con su meta personal un gasto que en realidad era de los dos. Quita el uso
de la meta (los fondos vuelven) y entonces puede moverlo a la pareja.

**Why this priority**: ADR-001 punto 7 y FR-035 de la 003, hoy un punto de extensión
que devuelve `false`. Aplica Q17.

**Independent Test**: pgTAP de `transaction_goal_funded` con datos; integración de
quitar el uso, anular un gasto financiado y editar su monto; caso «Mover a Pareja»
de la spec 3 sin cambios.

**Acceptance Scenarios**:

1. **Given** un gasto privado financiado con una meta personal, **When** se abre su detalle, **Then** en lugar de «Mover a Pareja» aparece la LimitNote «No se puede mover este gasto», que explica que primero hay que quitar el uso de la meta (ADR-001 punto 7; FR-035 de la 003).
2. **Given** «Quitar el uso de la meta» confirmado, **When** el servidor responde, **Then** los usos aplicados quedan anulados con auditoría, los fondos vuelven a cada aportante, la solicitud pendiente (si la hay) se cancela, el gasto queda como «Dinero del mes» y Mover a Pareja vuelve a estar disponible (según Q17).
3. **Given** «Eliminar gasto» sobre un gasto con meta, **When** se confirma, **Then** la confirmación avisa que el uso de la meta también se quita, y las dos cosas ocurren en una sola operación (según Q17).
4. **Given** editar el monto de un gasto con meta por debajo de lo ya usado, **When** se guarda, **Then** se rechaza con «Primero quita el uso de la meta o usa menos»; cambiar categoría, descripción, fecha, pagador o reparto no toca el uso (según Q17).
5. **Given** el uso quitado, **When** se recalculan las métricas, **Then** `gasto_financiado_con_meta` del mes del gasto baja en esa cantidad (según Q18).

---

### User Story 9 - Ver gasto y ahorro separados en Inicio (Priority: P1)

En Inicio de Nosotros: «En octubre gastaron juntos $2.840.000. Además apartaron
$900.000 para metas. Es ahorro: no se suma al gasto.» y la meta principal con su cinta.

**Why this priority**: DEC-G04 en la pantalla principal; P0-2 dejó fuera esos
bloques (FR-044 de la 003).

**Independent Test**: componentes contra el dataset; la spec E2E 4 comprueba que un
aporte no cambia el número héroe.

**Acceptance Scenarios**:

1. **Given** el dataset en Nosotros, **When** se abre Inicio, **Then** el número héroe sigue siendo $2.840.000 y aparece «Apartado para metas $900.000 · Son cosas distintas: no se suman.» (04·7; DESIGN_SYSTEM [A] DEC-G04).
2. **Given** Yo de Sara, **When** se abre Inicio, **Then** el héroe es $1.912.900 y «Apartaste $500.000 para metas» aparte (DEC-G04, tabla, fila 2).
3. **Given** cualquier Inicio, **When** se muestra, **Then** `total_destinado_neto` no aparece (§15.4: solo en Análisis).
4. **Given** el módulo de meta en Inicio, **When** hay metas del contexto, **Then** la GoalStack (o la tarjeta sola) con la cinta y el ritmo; sin metas, el bloque no se muestra o invita a crear una, sin cifras (§15.10, «Ninguna afirmación financiera sin datos»).

---

### User Story 10 - Nadie fuera de su ámbito ve ni cambia metas ni presupuestos (Priority: P1)

Una tercera cuenta llama a la API directamente: no ve metas, aportes, solicitudes ni
presupuestos de la pareja. Tomás no ve las metas ni los presupuestos personales de
Sara. Nadie escribe en las tablas saltándose las funciones.

**Why this priority**: US-22, §10.1 «Base de datos/seguridad» = bloqueante, §15.6.3
puntos 3 y 4.

**Independent Test**: pgTAP con tres cuentas y peticiones reales a la API con cada JWT.

**Acceptance Scenarios**:

1. **Given** una tercera cuenta, **When** consulta las vistas de `public` o llama a cualquier función con su JWT, **Then** no obtiene ningún dato de metas, aportes, usos, solicitudes ni presupuestos de la pareja (US-22).
2. **Given** el JWT de Tomás, **When** consulta cualquier vista, **Then** no obtiene metas, aportes, retiros, usos ni presupuestos personales de Sara, tampoco anulados ni por agregados (DEC-G06).
3. **Given** cualquier JWT, **When** intenta `insert`, `update` o `delete` directos sobre `budgets`, `savings_goals`, `goal_ledger_entries`, `goal_usage_allocations` o `goal_usage_confirmations`, **Then** falla (ADR-013 §2).
4. **Given** Sara, **When** intenta aprobar su propia solicitud o aplicar fondos de Tomás sin solicitud aprobada, **Then** se rechaza (§15.6.3 punto 3; ADR-011 fila 8).
5. **Given** un uso de meta, **When** el gasto es de otro contexto, otra moneda, o el aportante no es integrante activo, **Then** se rechaza en la función y en la restricción (DEC-G06).

### Edge Cases

- **Meta personal en un gasto de Nosotros o compartida en Yo:** no se ofrece y la función lo rechaza (DEC-G06).
- **Uso mayor que el gasto o mayor que lo disponible de un aportante:** Guardar bloqueado y la función lo rechaza.
- **Dos usos concurrentes de la misma meta** (Sara anota un gasto con Japón mientras Tomás retira): se serializan sobre la meta; el segundo se valida contra el saldo vigente y, si no cabe, falla sin cambiar nada (ADR-013 §3).
- **Aprobar mientras la solicitante cancela:** gana una de forma atómica; la otra falla con su texto («La solicitud ya se canceló» / «Ya se aprobó») y no cambia nada.
- **Aprobar dos veces** (dos pestañas): un solo uso (idempotencia y estado de la solicitud).
- **Solicitud pendiente y el gasto se anula:** la solicitud se cancela en la misma operación (según Q17).
- **Solicitud pendiente y la meta se archiva:** no se puede archivar con solicitudes pendientes (según Q15).
- **Meta compartida cuyo objetivo se edita por debajo del saldo:** se acepta y se muestra el excedente de forma neutra (según Q15; DEC-G05).
- **Meta con saldo ≥ objetivo y luego un uso que la baja:** el historial conserva el hito («Llegaron a $18.000.000 el …») y el uso explica qué se compró; sin animación de «pérdida» (§6.4 S5; DEC-G05).
- **Aporte en una fecha anterior a la creación de la meta:** se rechaza.
- **Aporte con importe máximo $999.999.999** y saldo de meta grande: sin pérdida de precisión (importes como texto, ADR-013 §4).
- **Presupuesto creado a la vez por los dos para la misma categoría:** uno se crea; el otro falla con «Tomás ya creó este presupuesto» y la opción de revisarlo.
- **Editar contra desactivar el mismo presupuesto, en cualquier orden:** la segunda operación falla por versión y no cambia nada.
- **Presupuesto creado a mitad de mes:** rige para el mes completo en curso (los gastos anteriores del mes cuentan) y los siguientes (según Q7).
- **Gasto de un mes con presupuesto desactivado después:** ese mes conserva su límite en el historial; el mes en curso queda sin presupuesto (según Q7).
- **Gasto con fecha futura (16.13) en una categoría con presupuesto:** cuenta en su mes, no en el actual.
- **Gasto compartido de un solo participante en Yo con presupuesto:** consume solo la parte de quien participa (FR-019a de la 003).
- **Consumo exactamente igual al límite:** «Quedan $0», sin EXCEDIDO; el porcentaje mostrado nunca dice 100 % antes de llegar ni 85 % antes de llegar al 85 % (comparación exacta en unidades menores).
- **Meta sin fecha:** sin ritmo ni «al mes» (según Q9).
- **Meta cuya fecha ya pasó:** sin ritmo; texto neutro, sin culpa («La fecha era {mes}»).
- **Mover a Pareja de un gasto con el uso ya quitado:** permitido; la función de extensión devuelve `false` (FR-035 de la 003).
- **Persona sin pareja:** metas y presupuestos personales funcionan; Nosotros, «todavía no disponible».
- **Fallo ambiguo en cualquier escritura de P0-3:** rechazo confirmado frente a resultado desconocido, 15 s, «Comprobar estado» con `write_status` (FR-093).
- **Listas largas:** cientos de aportes en el historial se leen por cursor; los totales de la meta salen de una lectura consistente, no de las páginas (FR-096).

## Requirements *(mandatory)*

### Functional Requirements

#### Base de datos, seguridad y acceso a datos (ADR-013)

- **FR-001**: Las tablas de P0-3 (`budgets`, `savings_goals`, `goal_ledger_entries`, `goal_usage_allocations`, `goal_usage_confirmations` y las auxiliares que el plan necesite, como el historial de presupuestos) viven en `juntia_data`, con RLS en todas, y son **tablas controladas**: solo las escriben funciones `security definer` de `juntia_private` propiedad de `juntia_writer` (ADR-013 §1, §2). Una tabla nueva que guarde importes no queda fuera de esa lista.
- **FR-002**: `goal_ledger_entries` es de **solo inserción**: un trigger rechaza `update` y `delete` incluso para `juntia_writer`; una anulación (aporte anulado, uso quitado) es un asiento o un estado nuevo, nunca una reescritura de importe (ADR-013 §2.4; §7.3). El plan decide la forma exacta antes de migrar.
- **FR-003**: Restricciones e índices protegen por cualquier camino: meta privada XOR compartida; objetivo positivo; moneda de la meta igual a la del grupo (COP); importes positivos; `funding_mode` obligatorio en aportes y solo en aportes; asientos solo de integrantes activos en metas compartidas; un uso solo enlaza un gasto activo del **mismo contexto y moneda**; suma de `goal_usage_allocations` = importe del uso (trigger diferido); **saldo ≥ 0 por meta y por aportante**; un presupuesto activo por (contexto, categoría, moneda); límite > 0 (DEC-R01; DEC-G01; DEC-G06; ADR-013 §2.4).
- **FR-004**: Toda operación que cambia el saldo de una meta bloquea la **meta** como raíz antes de leer saldos; la que cambia un presupuesto bloquea el **presupuesto**; el gasto con meta bloquea el gasto y la meta, y la aprobación bloquea la solicitud y la meta, en el orden determinista que fije el plan (ADR-013 §3.2 y §3.3).
- **FR-005**: Los importes cruzan la frontera como texto (límites, consumidos, aportes, saldos, usos, métricas), con la prueba de ida y vuelta de `9007199254740993` en las vistas y funciones nuevas (ADR-013 §4).
- **FR-006**: Ningún camino que atiende a una persona usa `service_role` (ADR-013 §5.8). Las funciones nuevas añaden sus códigos de error a la tabla existente y su copy a `src/lib/copy/es.ts` (ADR-013 §6.3).
- **FR-007**: `juntia_private.transaction_goal_funded(uuid)` deja de devolver `false`: su cuerpo consulta si el movimiento tiene **algún uso de meta aplicado y no anulado**. Conserva su firma, `stable`, `search_path = ''` y `execute` solo para `juntia_writer`, de modo que Mover a Pareja (`JT116`, `moveFundedByGoal`) queda conectado sin tocar su función (FR-035 de la 003; ADR-001 punto 7).

#### Presupuestos (DEC-R01, ADR-004; 04·2, BudgetIndicator)

- **FR-010**: Un presupuesto tiene contexto (personal XOR pareja), categoría de gasto (nunca «Ingresos»), moneda (COP), límite mensual en pesos enteros, estado (activo o desactivado), vigencia por mes, autor, fechas y versión (§5.3; §7.3; según Q7 y Q8).
- **FR-011**: Crear, editar y desactivar son operaciones atómicas e idempotentes con auditoría (actor, instante, valor anterior y nuevo). Editar y desactivar llevan la **versión esperada**; con una versión vieja fallan, no cambian nada y la interfaz muestra «{nombre} cambió este presupuesto» con el valor vigente (§15.5; §15.6.3 punto 7; ADR-013 §3.5).
- **FR-012**: Un presupuesto de Nosotros lo crean, editan y desactivan los dos integrantes activos, sin segunda aprobación; uno personal, solo su dueño, y es invisible para la otra persona (§15.5; §7.4).
- **FR-013**: Un presupuesto vigente se aplica a cada mes hasta que se edita o se desactiva; una edición rige desde el mes en que se hace; los meses anteriores conservan el límite que tenían (según Q7).
- **FR-014**: El consumo de un presupuesto de Nosotros es la suma de los gastos activos del grupo en esa categoría y mes (por `transaction_date` en `America/Bogota`); el de Yo, los gastos privados activos más las partes asignadas a la persona en gastos del grupo de esa categoría y mes. Ingresos, liquidaciones, aportes, retiros y usos de meta no consumen; un gasto con meta **sí** consume, una sola vez (§5.1; §5.3; DEC-G06).
- **FR-015**: Las lecturas devuelven `budget: null` (o un estado tipado) cuando no hay presupuesto; ninguna vista fabrica `limit = 0` con `COALESCE` (DEC-R01). `budget_remaining` existe solo con presupuesto activo y puede ser negativo (§5.2).
- **FR-016**: El dominio tiene funciones puras para el consumo y el estado de un presupuesto (dentro, cerca ≥ 85 %, excedido), con comparación exacta en unidades menores, y para el porcentaje mostrado, que se trunca hacia abajo (BudgetIndicator).
- **FR-017**: BudgetIndicator con sus estados: barra de 8 px con el color del pictograma y «Quedan X»; cerca, texto ámbar con `warning`; excedido, barra rayada coral, «Se pasaron por X» y `warning-circle`; sin presupuesto, fila punteada y «Crear presupuesto», nunca 0 % (COMPONENT_SPECIFICATIONS). El estado nunca se comunica solo con color.
- **FR-018**: El historial de un presupuesto muestra cada cambio con autor, fecha, valor anterior y nuevo, y Plan muestra el último cambio (04·2; §15.5).

#### Plan, Análisis y S3 Spending Story (§6.4; 04·2; MOTION_SYSTEM §5)

- **FR-020**: Plan deja su estado provisional (FR-048 de la 003): en Yo y en Nosotros muestra el resumen del mes, los presupuestos activos con BudgetIndicator, las categorías con gasto y sin presupuesto («$X · sin presupuesto · Crear») y la línea «Los presupuestos son opcionales: pónganlos solo donde les sirvan.» (04·2; DEC-R01).
- **FR-021**: Análisis es una ruta hija de Plan con acceso desde Plan y desde «En qué se fue» de Inicio (según Q5), con selector de mes y los cuatro capítulos: cuánto, en qué, comparado, lo apartado (04·2; MOTION_SYSTEM §5).
- **FR-022**: Sin presupuesto, S3 usa transacciones, categorías y comparación cuando hay datos; con presupuesto, añade límite, consumido, desviación y la marca de mes transcurrido. Nunca alerta de exceso, cero ficticio ni proyección sin base (§6.4 S3; según Q9).
- **FR-023**: La comparación con el mes anterior sigue Q10: solo si el mes anterior tiene gastos en ese contexto; diferencia en pesos y porcentaje entero, y hasta dos categorías con mayor aumento, calculadas en el dominio; nunca un gasto concreto ni una causa.
- **FR-024**: El capítulo 4 muestra `aporte_a_metas` del mes con su desglose por persona en Nosotros («Sara $500.000 · Tomás $400.000. Va aparte: no es gasto.») y la PlanningNote con `total_destinado_neto` (según Q4).
- **FR-025**: S3 con su coreografía (capítulos que entran una vez al 30 % de vista, barras desde la base, cambio de mes con counters de 240 ms), sin scroll-jacking y con movimiento reducido: todo visible desde el inicio y cambios inmediatos (MOTION_SYSTEM §5).

#### Metas: crear, editar, lograr y archivar (DEC-G01, DEC-G05; 04·3, 04·6)

- **FR-030**: Una meta tiene propietario privado XOR pareja, nombre, tipo (ícono del mapa semántico), objetivo positivo en pesos enteros, moneda COP, fecha objetivo opcional (mes y año), estado `active | completed | archived`, autor, fechas y versión (DEC-G01).
- **FR-031**: Crear es atómico e idempotente; en Nosotros exige pareja activa. Editar (nombre, tipo, objetivo, fecha) lleva la versión esperada y auditoría; en una meta compartida puede editarla cualquiera de los dos (según Q15).
- **FR-032**: «Dar por lograda» es una acción explícita; al llegar al objetivo la app lo sugiere sin cambiar el estado. Una meta lograda admite usos y retiros, no aportes nuevos (según Q15; DEC-G05).
- **FR-033**: Archivar exige saldo 0 y ninguna solicitud pendiente; una meta archivada es de solo lectura y aparece en «Archivadas». Ninguna meta con historia se borra (según Q15; DEC-G02).
- **FR-034**: `goal_balance` y el disponible por aportante se derivan del ledger (`Σ aportes − Σ retiros − Σ usos aplicados`, sin anulados) en funciones puras del dominio y se recalculan en SQL; `progress = goal_balance / target`, mostrado como entero truncado; con saldo > objetivo se muestra el excedente de forma neutra (DEC-G05).
- **FR-035**: Metas en Nosotros muestra solo metas compartidas, con «Apartado en metas compartidas» (suma de los saldos de las compartidas activas) y «Es dinero apartado, no gastado. Sigue donde lo tengan.»; en Yo, las personales y, aparte, las compartidas con «Tus aportes $X», sin un total que sume las dos (04·3; según Q11).
- **FR-036**: Sin fotos subidas en P0-3: toda GoalCard usa el fallback aprobado (según Q6). Si Q6 cambia, este requisito se reescribe con su ADR.
- **FR-037**: El ritmo de una meta con fecha sigue Q9: «Faltan $X en {n} meses · $Y al mes», marcado como estimación con el patrón punteado, y la marca de ritmo; sin «próximo aporte planeado».

#### Aportes, retiros y anulaciones (DEC-G02, DEC-G03; 04·3)

- **FR-040**: Registrar un aporte es atómico e idempotente; **el aportante es siempre quien llama** (la función no acepta otro); valida meta activa (no lograda ni archivada), integrante activo si es compartida, importe positivo, fecha hoy o pasada y no anterior a la creación de la meta, y `funding_mode` (DEC-G02, DEC-G03, DEC-G06; según Q12).
- **FR-041**: Retirar es atómico e idempotente; solo aportes **propios no consumidos**; exige motivo; el importe ≤ disponible del aportante; fecha hoy o pasada (DEC-G02; según Q12 y Q14).
- **FR-042**: «Deshacer» de 6 s tras un aporte o un retiro, y «Anular aporte» desde el historial, anulan con auditoría: el asiento anulado sale del saldo y de las métricas, sigue en el historial marcado como anulado y nunca se edita ni se borra. Anular un aporte se rechaza si esos fondos ya se usaron (según Q13).
- **FR-043**: El historial de una meta lista aportes, retiros y usos por mes, con autor, modo y estado, y en las compartidas el total y el número de aportes por persona, con filtros por persona (04·3).
- **FR-044**: Los aportes, retiros y usos aparecen en Actividad del contexto con su ficha (redonda de ahorro para aportes; `arrow-u-up-left` para retiros; «Uso de {meta} · no es un gasto nuevo» para usos), su signo y su etiqueta, sin contar en el gasto del mes; Actividad muestra «Gasto {mes} $X · Apartado $Y» por separado (04·7; ExpenseRow).

#### Gasto con meta y confirmaciones (§15.5, §15.6.3 puntos 3, 5 y 6; 04·11)

- **FR-050**: Anotar ofrece «Cómo se pagó: Dinero del mes · Con una meta», con «Dinero del mes» como valor inicial; con una meta, una sola meta activa del mismo contexto, un importe usado ≤ importe del gasto y FundingLedger para los fondos por aportante (según Q16; 04·11 B1–B2).
- **FR-051**: FundingLedger propone un reparto proporcional a lo disponible de cada aportante, en pesos enteros con mayor residuo, editable, con tope por aportante; la suma debe ser exactamente el importe usado (según Q16).
- **FR-052**: **Registro inicial:** el gasto, su reparto, el uso de **fondos propios** y sus asignaciones, y la solicitud por los fondos del otro (si los hay), en **una sola operación atómica e idempotente**, que no espera ninguna aprobación. La solicitud registra la cantidad exacta por aportante (§15.6.3 punto 5).
- **FR-053**: Mientras una solicitud está pendiente, sus fondos **no se descuentan ni cuentan** en `goal_balance`, en el disponible ni en `gasto_financiado_con_meta`; no vence; no es una transferencia (§15.5).
- **FR-054**: **Aprobar** es una operación separada, atómica e idempotente, que solo puede hacer el aportante cuyos fondos se piden; revalida membresía, estado de la meta y de la solicitud, disponible de ese aportante y que el uso total no supere el gasto, y aplica el uso vinculado al gasto existente. Si algo ya no cabe, falla sin cambiar nada y lo explica (§15.6.3 punto 6; 05·8).
- **FR-055**: **Rechazar** (quien recibe) y **cancelar** (quien pide) son atómicas e idempotentes; el gasto permanece y solo cuentan los fondos ya aplicados. Ninguna de las tres acciones admite una segunda resolución (§15.5).
- **FR-056**: La solicitud se ve en la sesión del otro al navegar o volver a la app (sin tiempo real): en Inicio del contexto, en la meta y en la fila del gasto, con ConfirmationBadge (según Q3; decisión 20.16).
- **FR-057**: «Quitar el uso de la meta», anular un gasto con meta y editar su monto siguen Q17, siempre en una operación atómica e idempotente con auditoría; ningún vínculo se borra en silencio (ADR-001 punto 7).
- **FR-058**: El uso de una meta compartida se atribuye a los aportantes cuyos fondos se consumen (`goal_usage_allocations`), independiente del reparto del gasto; el reparto y el balance no cambian por la meta (DEC-G04; DEC-G06).
- **FR-059**: El «Deshacer» de 6 s tras registrar un gasto con meta anula en una operación el gasto, sus usos aplicados y la solicitud pendiente (FR-024 de la 003; según Q17).

#### Métricas DEC-G04 (§15.4; tabla del handoff)

- **FR-060**: El dominio tiene funciones puras para `gasto_consumo`, `aporte_a_metas`, `retiro_de_metas`, `gasto_financiado_con_meta` y `total_destinado_neto`, con esos nombres (CONVENTIONS A.4), por vista (Yo de una persona, Nosotros) y mes, que reproducen **fila por fila** la tabla de siete casos del handoff, incluidos los negativos y «No disponible», que no es cero (§15.4; TESTING §6).
- **FR-061**: Reglas por vista: Nosotros = gastos del grupo, aportes, retiros y usos de **metas compartidas**; Yo = privados más partes, y aportes, retiros y asignaciones de uso **propios** de metas personales y compartidas. Las vistas nunca se suman (DEC-G04).
- **FR-062**: `gasto_financiado_con_meta` solo suma usos **aplicados** y cuenta en el mes del gasto (según Q18); `aporte_a_metas` y `retiro_de_metas`, en la fecha de cada asiento (según Q12); los anulados no cuentan.
- **FR-063**: El servidor calcula las métricas sobre el conjunto completo, en una sola lectura consistente, y el cliente las muestra sin recalcularlas (FR-043 de la 003). `total_destinado_neto` se muestra solo en la PlanningNote de Análisis, nunca como número héroe, nunca rotulado «Total gastado», y con su texto si es negativo (§15.4).

#### Inicio, Actividad y Mover a Pareja

- **FR-070**: Inicio añade, en los dos contextos, «Apartado para metas» del mes separado del gasto y el módulo de metas (GoalStack o tarjeta), con las cifras del contexto (04·7; DESIGN_SYSTEM [A] DEC-G04). El número héroe sigue siendo `gasto_consumo`.
- **FR-071**: Actividad muestra los asientos de metas (FR-044), los gastos con meta con CON META y sus usos, y las solicitudes pendientes; los filtros permiten «Aportes» (04·7).
- **FR-072**: En el detalle de un gasto privado financiado con una meta personal, «Mover a Pareja» se sustituye por la LimitNote «No se puede mover este gasto», con el camino «Quitar el uso de la meta» (ADR-001 punto 7; según Q17).

#### S5 Goal Journey (MOTION_SYSTEM §4)

- **FR-075**: La meta inmersiva es una **ruta** (nunca un diálogo), con foto o fallback a pantalla completa y la hoja en móvil, y foto de 820 px más panel desde lg (RESPONSIVE).
- **FR-076**: Goal Journey con View Transitions (`goal-photo`, `goal-title`, `goal-ribbon` por meta) y `layoutId` de Motion como respaldo; interrupción reversible; gestos con alternativa (× y «Ver todas»); teclado (Enter abre, Escape cierra, foco al título y de vuelta a la tarjeta); movimiento reducido con crossfade de 200 ms (MOTION_SYSTEM §4). La `[V]` de View Transitions con App Router y el back-swipe de iOS se resuelve en el PR C (§15.6.2 punto 1).
- **FR-077**: Registrar un aporte o aprobar un uso anima la cinta solo después de la confirmación del servidor; con error no anima nada; una disminución por uso explica qué se compró, sin animación de «pérdida» (§6.4 S5; MOTION_SYSTEM).

#### Exportación (§15.5; decisión 16.12)

- **FR-080**: Exportar (JSON y CSV) amplía su alcance a todo lo autorizado de quien exporta: privados propios, gastos compartidos con su reparto, liquidaciones, metas personales y compartidas con sus asientos (los aportes del otro en las compartidas incluidos), solicitudes y presupuestos propios y de la pareja. Nunca privados, metas personales ni presupuestos personales del otro, ni tokens o datos internos. No es restauración (§15.5; 05·9).
- **FR-081**: Cada registro exportado lleva su contexto, y ningún gasto compartido sale dos veces (una vez, con la parte de cada uno) (ADR-011 fila 2).

#### Privacidad de lectura (lecciones F44-1 y F47-6)

- **FR-085**: En Nosotros el servidor **no consulta** metas, asientos ni presupuestos personales; ni el HTML, ni el payload RSC, ni ningún prefetch de una ruta de Nosotros (Metas, Plan, Análisis, Inicio, Actividad, meta inmersiva) contienen nombres, importes o identificadores de metas o presupuestos personales de ninguno de los dos, con la cookie de contexto válida, ausente o no válida (FR-037 a FR-039 de la 003).
- **FR-086**: El otro integrante nunca recibe un dato de una meta o presupuesto personal por ninguna vía: vistas, funciones, errores, auditoría visible, exportación o el detalle de un gasto compartido (DEC-G06).
- **FR-087**: Cambiar de contexto nunca muestra, ni un fotograma, metas o presupuestos del contexto anterior bajo títulos del nuevo; la caché del cliente de un contexto no se reutiliza en el otro (US-14; FR-040 de la 003).

#### Integridad de las escrituras (lecciones de P0-1 y P0-2)

- **FR-090**: **El servidor recalcula toda cifra de dinero.** El cliente envía solo lo que la persona decide (importes escritos, meta, categoría, fecha, modo, reparto del uso); el servidor recalcula y valida partes, saldos, disponibles, consumos y métricas, y la función SQL vuelve a comprobar las invariantes. Ninguna cifra derivada que llegue del cliente se guarda ni se usa para decidir (ADR-013 §6.2; §7.3, «Operaciones críticas»).
- **FR-091**: **Toda** escritura de P0-3 —crear, editar y desactivar presupuesto; crear, editar, lograr y archivar meta; aportar, retirar, anular y deshacer; registrar gasto con meta, aprobar, rechazar y cancelar solicitud; quitar el uso— lleva clave de idempotencia con huella; misma clave y otra huella falla con su error (ADR-013 §3.1).
- **FR-092**: Toda mutación de un registro que ya existe lleva su **versión esperada** (`expectedVersion`): presupuesto, meta, solicitud, gasto con meta. Con una versión vieja, o un registro ya anulado o resuelto, falla con un conflicto, no cambia nada y la interfaz lo explica (16.15; ADR-013 §3.5; FR-057 de la 003).
- **FR-093**: En el cliente, la clave nace al abrir cada hoja o diálogo y se reutiliza en cada reintento. Cada escritura termina en **ok**, **rechazo confirmado** o **resultado desconocido**. Una escritura o un «Comprobar estado» que no responde en **15 s** pasa a desconocido con la misma clave y la misma carga, y una respuesta tardía se ignora. En desconocido nunca se afirma que no se guardó: los campos se bloquean, solo se reintenta lo mismo con la misma clave y «Comprobar estado» consulta `public.write_status(acción, clave)`, que solo lee el resultado guardado del propio actor sin repetir nada; cerrar pregunta «¿Cerrar sin confirmar?» (FR-059 de la 003; `contracts/server-actions.md` §2 de la 003).
- **FR-094**: **Ninguna intención de escritura se guarda en `localStorage`, `sessionStorage` ni otro almacenamiento del navegador**; vive solo en memoria. Tras recargar, la pantalla muestra el estado del servidor (decisión de los fundadores del 7 de noviembre de 2026; F55-5 y F55-6).
- **FR-095**: **Un solo «Deshacer» pendiente a la vez** en toda la app: mientras un deshacer está en curso o sin resolver, los «Deshacer» de avisos nuevos quedan bloqueados (también desde el teclado); su resultado se aplica por la identidad de la intención, y un aviso posterior nunca pisa la recuperación de uno anterior (F57-8 y F57-9 de la 003). Vale para aportes, retiros, gasto con meta y lo existente.
- **FR-096**: Las **listas** (historial de aportes, Actividad con asientos, historial de presupuestos) se leen por cursor con orden total estable y la garantía de FR-042 de la 003. Los **totales** (consumo de cada presupuesto, saldo de cada meta y por aportante, «Apartado en metas», las cinco métricas, Análisis) salen de **una sola lectura consistente** en el servidor, de vistas de una sola sentencia; nunca se suman páginas ni se calculan sobre la primera página (FR-043 de la 003).
- **FR-097**: Los errores `40P01` y `40001` se reintentan en servidor con la misma clave un número acotado de veces (ADR-013 §3.4).
- **FR-098**: Los avisos con «Deshacer» y el resaltado de la fila nueva sobreviven a una navegación dentro de la app; si el registro no está visible, se lleva a la pantalla donde está (Actividad en su mes o la meta) con el aviso (FR-060 y FR-061 de la 003).
- **FR-099**: Cambiar de contexto con una hoja abierta no cambia el contexto de la hoja (FR-062 de la 003).

#### Copy, accesibilidad y responsive

- **FR-100**: Todo el copy nuevo vive en `src/lib/copy/es.ts` y respeta el glosario §9: «Registrar aporte» (nunca «Depositar» ni «Invertir»), «Apartado en Juntia», «Transferencia declarada», «Retiro de meta · reasignación» (nunca «Ingreso»), «Destinado neto (para planificar)» (nunca «Total gastado»), «Sin presupuesto. Crear presupuesto (opcional)», «Si siguen como…» (nunca «Llegarán»), sin culpa ni alarmas (`docs/CONVENTIONS.md` B.1; DEC-R17).
- **FR-101**: Sin scroll horizontal en 360, 390, 430, 768, 1024, 1280 y 1440 px; texto al 200 %; objetivos de 44 px; teclado completo; `aria-live` para aportes, retiros, aprobaciones y conflictos; barras y cintas con `role="img"` y `aria-label` con cifras; gráficos con tabla equivalente; personas con color + patrón + inicial (§15.7; handoff §Accesibilidad).
- **FR-102**: Los dos temas en todas las pantallas nuevas; las capturas de 390 y 1440 en los dos temas van en cada PR de implementación (04·5, 04·8, 04·13).
- **FR-103**: Iconos del mapa semántico: Metas `flag-banner`, Plan `chart-pie-slice`, Aportar `piggy-bank`, Retirar `arrow-u-up-left`, Meta completada `flag-checkered`, `warning` y `warning-circle` para presupuestos (DESIGN_SYSTEM §3; §15.2).

#### Pruebas y CI (ADR-011, `docs/TESTING.md`)

- **FR-110**: Dominio puro: las siete filas de DEC-G04 con `test.each`, saldo por meta y por aportante, consumo y estado de presupuestos, reparto proporcional de FundingLedger, ritmo (Q9) y comparación (Q10), contra el dataset dorado de P0-3 y con pruebas de propiedad (saldo ≥ 0; asignaciones de uso que suman el uso; vistas que no se suman: Sara −120.000 + Tomás +120.000 = Nosotros 0) (ADR-011 filas 1, 3 y 7).
- **FR-111**: pgTAP para cada función nueva: éxito, rechazo con una tercera cuenta, repetición idempotente, misma clave con otra huella, cada validación, aporte a nombre de otro, uso sin confirmación, aprobar la propia solicitud, y `transaction_goal_funded` con datos (ADR-011 fila 8; §15.6.3 puntos 3 y 4).
- **FR-112**: Integración de servidor: gasto con meta atómico (un gasto, usos que suman, meta ≥ 0); aprobación separada con revalidación; aprobar contra cancelar; aprobar contra retirar; dos usos concurrentes de una meta; dos aprobaciones; ediciones concurrentes de presupuesto en los dos órdenes (editar/desactivar); creación concurrente de la misma clave de presupuesto; quitar el uso y anular un gasto con meta; exportación sin privados ni duplicados (ADR-011 filas 2, 12 y 13; §15.6.3 puntos 5 a 7).
- **FR-113**: Componentes (RTL selectivo): un retiro nunca se presenta como ingreso (signo, ficha y etiqueta); BudgetIndicator sin presupuesto nunca muestra 0 %; PlanningNote con valor negativo y su texto; FundingLedger bloquea Guardar si no suma (ADR-011 fila 5).
- **FR-114**: **Spec E2E 5** «Presupuesto activado/desactivado» **nace en el PR B** (crear, editar con conflicto, desactivar y volver al estado sin presupuesto) y el PR E la amplía con Análisis con y sin presupuesto. **Spec E2E 4** «Meta con aportes y uso» **nace en el PR C** (crear meta, aportar, ver que el héroe no cambia, retirar) y el PR D la amplía con el caso de la matriz «Financiación ajena → aprobar/rechazar» con **dos contextos autenticados** (Sara y Tomás, `storageState` por worker y por rol). Ningún PR fusiona una funcionalidad sin su E2E obligatoria (`docs/TESTING.md`, «Tope», «Matriz», «Mientras las specs todavía no existen»).
- **FR-115**: axe en su **nivel ligero** en cada PR (cada pantalla y estado nuevo, una vez, a 390 px, en los dos temas, con sesión en el job `e2e`), y el **barrido completo** a mano al cierre de P0-3 y en los PR que añaden pantallas (decisión 21). Pantallas nuevas: Plan, Análisis, Metas, meta inmersiva, Registrar aporte, Historial, Retirar, gasto con meta B1–B7, solicitud pendiente y sus estados vacíos y de error.
- **FR-116**: El job `e2e` sigue por debajo de 480 s con las specs 4 y 5 (decisión 19.5, bloqueante desde el PR D de la 003). Si la medición lo supera, el hallazgo es la suite, no el techo (cláusula anticliquet, `docs/TESTING.md` §9).
- **FR-117**: La siembra crea por worker una pareja aislada con metas, aportes y presupuestos del dataset; las capas de base de datos se iteran contra `juntia-dev` con sus guardias (decisión 18); el gate es CI.

#### Fuera de alcance (explícito)

- Fotos subidas de metas (según Q6), aportes programados, reglas automáticas de aporte, simulaciones, metas con rendimiento o inversiones, multimoneda (§5.6; §11).
- Presupuestos sugeridos (DEC-R01-S), presupuesto total del mes (según Q8), categorías propias (P1).
- Retiro de fondos ajenos (según Q14); varias metas por gasto y «Pagar con una meta» desde un gasto ya registrado (según Q16).
- Notificaciones, correos y tiempo real (decisión 20.16).
- Salir de la pareja, grupos N, eliminar cuenta (ADR-003; §15.6.1).

### Key Entities

- **Presupuesto**: contexto (persona XOR pareja), categoría, moneda, límite mensual, estado, vigencia por mes, autor, fechas, versión; su **historial** (autor, instante, valor anterior y nuevo, mes desde el que rige).
- **Meta**: contexto (persona XOR pareja), nombre, tipo, objetivo, moneda, fecha objetivo opcional, estado, autor, fechas, versión.
- **Asiento de meta** (`goal_ledger_entries`): meta, tipo (aporte, retiro, uso), aportante o actor, importe, fecha, `funding_mode` (aportes), motivo (retiros), gasto vinculado (usos), estado (activo o anulado) y la auditoría de su anulación.
- **Asignación de uso** (`goal_usage_allocations`): uso, aportante e importe; suman el uso.
- **Solicitud de fondos** (`goal_usage_confirmations`): gasto, meta, quien pide, aportante a quien se pide, cantidad exacta, estado (pendiente, aprobada, rechazada, cancelada), instantes y versión.
- **Saldo de meta, disponible por aportante y métricas DEC-G04**: no se guardan; se derivan del ledger y de los movimientos.
- **Registro de auditoría** e **idempotencia**: los de la 002 y la 003, ampliados a las operaciones nuevas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A 360, 390, 430, 768, 1024, 1280 y 1440 px, en los dos temas, cada pantalla nueva se ve sin scroll horizontal ni solapamientos; las capturas de 390 y 1440 en los dos temas van en cada PR de implementación y los dos fundadores las aprueban, incluidos los `[P]` de la tabla de abajo (§15.7; §15.9).
- **SC-002**: Cero violaciones serias o críticas de axe en las pantallas y estados nuevos, en los dos temas, incluida Meta (handoff, criterios); el barrido completo al cierre de P0-3 sin fallos (decisión 21.2).
- **SC-003**: Las cinco métricas reproducen **las siete filas** de la tabla de DEC-G04, sin redondeo y con «No disponible» distinto de cero (§15.4).
- **SC-004**: Con el dataset dorado de P0-3: Japón 11.340.000 (Sara 6.120.000 · Tomás 5.220.000), 63 %, «$1.110.000 al mes»; Nosotros octubre `aporte_a_metas` 900.000 y `gasto_consumo` 2.840.000 sin cambios; Yo de Sara 500.000; presupuestos de octubre como en US-2 escenario 4.
- **SC-005**: En el escenario de los tiquetes, Japón pasa por 11.340.000 → 9.720.000 → 8.340.000 (aprobada) o queda en 9.720.000 (rechazada o cancelada), con un único gasto real, y el balance de la pareja es el mismo en los tres casos.
- **SC-006**: En las pruebas de propiedad, el 100 % de los casos generados deja cada meta y cada aportante con saldo ≥ 0, asignaciones de uso que suman el uso y vistas Yo y Nosotros que concilian sin sumarse.
- **SC-007**: Cero datos de metas o presupuestos personales en el HTML, el payload RSC, el prefetch, las vistas, las funciones y la exportación accesibles para la otra persona o desde Nosotros (FR-085, FR-086).
- **SC-008**: Cero registros duplicados en las pruebas de doble envío y reintento de cada escritura de FR-091; cero actualizaciones perdidas en las pruebas concurrentes de FR-112.
- **SC-009**: Cero usos de fondos ajenos aplicados sin una aprobación del aportante, también llamando a las funciones directamente (§15.6.3 punto 3).
- **SC-010**: CLS = 0 en las cargas con Skeleton de Plan, Análisis y Metas; INP < 200 ms al abrir Anotar y al guardar un gasto con meta. Medidos en laboratorio y reportados como tal (§15.7).
- **SC-011**: S3 y S5 completamente usables con movimiento reducido, con el valor final en el DOM (US-17).
- **SC-012**: Los dos fundadores aprueban la salida interna: crean una meta individual y otra compartida, aportan cada uno, registran un gasto con meta (con una aprobación), crean un presupuesto, lo desactivan, verifican que gastos y metas siguen y explican sin ayuda la diferencia entre gasto y ahorro destinado (maestro §4, escenario de pareja; §11).
- **SC-013**: Las `[V]` de la tabla «Inventario de `[V]`» tienen salida real en la evidencia del slice.

## Assumptions

- **El catálogo de categorías** es el de producción (nueve de gasto e «Ingresos»); P0-3 no añade categorías.
- **Personas sin pareja** usan metas y presupuestos personales; Nosotros sigue «todavía no disponible».
- **Las pantallas no diseñadas** (historial de presupuesto, «Archivadas», retirar, anular aporte, conflicto de presupuesto, LimitNote de gasto financiado, quitar el uso, errores de aprobación, Análisis en Yo) se componen con primitivos y patrones aprobados y se aprueban viendo la pantalla en su PR (§15.9).
- **La revisión visual humana** es el gate de «Visual y motion», fuera de CI (ADR-011 §7), con la pasada de Impeccable de cada PR de implementación.
- **Las verificaciones de dispositivo** aplazadas por la decisión 19 siguen aplazadas hasta MVP-1.
- **El despliegue** sigue la decisión 13; las migraciones a producción las aplica el gestor con el «sí» de un fundador antes de cada paso de escritura.
- **La primera copia real** y su restauración siguen la decisión 19.3: antes del primer movimiento real en producción, también si llega durante P0-3.

---

## Dataset dorado de P0-3

Completa el módulo `src/domain/golden/` (hoy `october-2026.ts`, con las partes de
P0-1 y P0-2) y **no cambia** ninguna fila existente (§15.10, «Dataset dorado»,
reglas 1, 2 y 4). Los valores en **negrita** se copian del diseño; el resto los
define esta spec (regla 2; según Q19) y suman exactamente lo que el diseño da.

### Parte A · Meta compartida Japón

Copiado de `COMPONENT_SPECIFICATIONS.md` («Datos de referencia») y 04·3: objetivo
**18.000.000**, fecha **abril de 2027**, compartida; saldo al 31 de octubre
**11.340.000** (**Sara 6.120.000 en 11 aportes · Tomás 5.220.000 en 10 aportes**);
**63 %**; faltan **6.660.000 en 6 meses → 1.110.000 al mes**. Creada por Sara el 1
de diciembre de 2025 (definido aquí). Todos los aportes, `reserved`.

| Fecha | Aportante | Importe | Origen |
| --- | --- | ---: | --- |
| 2025-12-27 | Sara | 580.000 | Definido aquí |
| 2026-01-12 | Tomás | 520.000 | Definido aquí |
| 2026-01-27 … 2026-07-27 (día 27 de cada mes, 7 aportes) | Sara | 570.000 c/u | Definido aquí |
| 2026-02-12 … 2026-07-12 (día 12 de cada mes, 6 aportes) | Tomás | 550.000 c/u | Definido aquí |
| 2026-08-12 | Tomás | **500.000** | 04·3 |
| 2026-08-27 | Sara | **550.000** | 04·3 |
| 2026-09-14 | Tomás | **500.000** | 04·3 |
| 2026-09-28 | Sara | **500.000** | 04·3 |
| 2026-10-15 | Tomás | **400.000** | Datos de referencia; 04·3 |
| 2026-10-22 | Sara | **500.000** | Datos de referencia; 04·3 |

Comprobación: Sara 580.000 + 7 × 570.000 + 550.000 + 500.000 + 500.000 = **6.120.000**
(11 aportes); Tomás 520.000 + 6 × 550.000 + 500.000 + 500.000 + 400.000 = **5.220.000**
(10 aportes). Por mes: agosto **1.050.000**, septiembre **1.000.000**, octubre
**900.000** (04·3).

### Parte B · Presupuestos de Nosotros, octubre

Límites y consumos copiados de 04·2; el consumo sale de los seis gastos de P0-2.

| Categoría | Límite | Consumo | Resultado esperado | Historia (definida aquí salvo lo copiado) |
| --- | ---: | ---: | --- | --- |
| Mercado | **900.000** | **640.000** | Quedan 260.000 · 71 % | Tomás lo crea con 800.000 el 1 oct; **Sara lo sube a 900.000 el 3 oct** (04·2) |
| Restaurantes | **260.000** | **240.000** | Quedan 20.000 · 92 % · CERCA DEL LÍMITE | Sara lo crea el 1 oct |
| Servicios | **340.000** | **360.000** | Se pasaron por 20.000 · EXCEDIDO | Tomás lo crea el 1 oct |
| Hogar | — | **1.600.000** | «sin presupuesto» (`budget: null`) | — |

Sara y Tomás no tienen presupuestos personales en el dataset: su Yo cubre el modo
sin presupuesto.

### Parte C · Las siete filas de DEC-G04

Copiadas de `HANDOFF_CLAUDE_CODE.md` y 05·7; son la tabla de `test.each` de FR-060.
Las tres de octubre salen de las partes A, P0-1 y P0-2; las cuatro de noviembre, de
los escenarios de la parte D.

| Caso · vista | consumo | aportes | retiros | financiado | destinado neto |
| --- | ---: | ---: | ---: | ---: | ---: |
| Octubre · Nosotros | 2.840.000 | 900.000 | 0 | 0 | 3.740.000 |
| Octubre · Yo, Sara | 1.912.900 | 500.000 | 0 | 0 | 2.412.900 |
| Octubre · Yo, Tomás | No disponible | 400.000 | 0 | 0 | No disponible |
| Retiro · Yo, Sara | 0 | 0 | 200.000 | 0 | −200.000 |
| Tiquetes · Nosotros | 3.000.000 | 0 | 0 | 3.000.000 | 0 |
| Tiquetes · Yo, Sara | 1.500.000 | 0 | 0 | 1.620.000 | −120.000 |
| Tiquetes · Yo, Tomás | 1.500.000 | 0 | 0 | 1.380.000 | +120.000 |

### Parte D · Escenarios hipotéticos de noviembre (se prueban por diferencias)

No modifican octubre (como la decisión 20.18). Cada prueba parte del dataset y añade
solo su escenario.

- **Retiro de Bicicleta.** Meta **personal** de Sara «Bicicleta de ruta», objetivo 3.000.000 y sin fecha (definido aquí), con aportes de Sara de 600.000 el 5 de agosto y 450.000 el 5 de septiembre (definido aquí): saldo **1.050.000**. Sara retira **200.000** en noviembre → **850.000** (05·7). Tomás nunca ve esta meta.
- **Tiquetes a Tokio.** 3 de noviembre, **3.000.000**, Transporte, **pagó Tomás, 50/50**, anotado por Sara con Japón: usa **1.620.000** de Sara (aplicado al registrar) y pide **1.380.000** a Tomás. Estados con nombre:
  - `ticketsPending`: Japón **9.720.000** (54 %); Sara disponible **4.500.000**; Tomás **5.220.000**; Nosotros `gasto_financiado_con_meta` 1.620.000;
  - `ticketsApproved`: Japón **8.340.000** (46 %); Tomás **3.840.000**; Nosotros financiado 3.000.000 (fila 5);
  - `ticketsRejected`: como `ticketsPending`, con la solicitud rechazada.
  En los tres, el balance de la pareja cambia lo mismo: Sara le debe 1.500.000 más a Tomás (04·11 B3).
- **US-04.** Restaurantes de Nosotros con 1.000.000 y gastos por 1.180.000: **118 %**, «Se pasaron por **180.000**»; desactivado, sin cifras de límite.
- **US-18.** Meta personal de 2.000.000 y aporte de 250.000: progreso 250.000, `gasto_consumo` igual, `aporte_a_metas` +250.000.
- **US-19.** Meta compartida con aportes de 300.000 (Sara) y 200.000 (Tomás): progreso 500.000, sin deuda ni cambio en gastos.

**No forman parte del dataset:** Boda (8.200.000 de 20.000.000) y Cuota inicial
(13.200.000 de 60.000.000), que decoran 04·3 y 04·7, ni el «$32.740.000» que suman
con Japón; la serie de seis meses del capítulo 3 de Análisis; el «+4 %» de
septiembre; el «Ritmo para abril: 67 %» (según Q9).

La parte queda **completada por P0-3** cuando el módulo contenga las partes A a D
con las pruebas que las consumen (regla 4).

## Inventario de `[P]` que toca P0-3

Clasificación en los dos ejes del maestro §15.9. **Los cuatro que afectan al alcance
se resuelven antes del plan** (Q2, Q3, Q4); ninguno se cierra dentro de un PR de
código.

| Elemento `[P]` | ¿Afecta al alcance? | ¿Requiere aprobación antes de implementar? | Situación en P0-3 |
| --- | --- | --- | --- |
| GoalStack · pila tipo Wallet | **Sí** — P0-3 | **Sí** | **Abierto: Q2.** Aprobación final en pantalla en el PR C |
| FundingLedger (reparto ≠ fondos) | **Sí** — P0-3 | **Sí** | **Abierto: Q3.** Aprobación final en pantalla en el PR D |
| ConfirmationBadge y solicitud pendiente | **Sí** — P0-3 | **Sí** | **Abierto: Q3.** Aprobación final en pantalla en el PR D |
| ChangePreview (efecto B3 «ahora y si aprueba») | **Sí** — P0-2 / P0-3 | **Sí** | Aprobado solo en Mover a Pareja (decisión 20.3). **Abierto para B3: Q3** |
| PlanningNote (destinado neto) | **Sí** — P0-3 | **Sí** | **Abierto: Q4.** Aprobación final en pantalla en el PR E |
| Personas, escalables a N (+ patrón) | No | **Sí** — viendo la pantalla | `person.1–2` en cintas y desgloses de aportes; se aprueba en los PR C y D |
| Gasto, ingreso y liquidación en tinta | No | **Sí** — viendo la pantalla | Primera vez junto a aportes, retiros y usos (verde de ahorro): se aprueba en el PR C |
| Texto ampliado hasta 200 % | No | **No** — requisito obligatorio | Se aplica y se prueba (FR-101) |

No tocados por P0-3: SharedBalance, Anotar E1–E5 (cerrados), sección Cuenta,
persistencia del tema, teclado del monto y Spline Sans Mono. El flujo «Gasto con
meta» del paquete es `[A]`; sus componentes `[P]` están arriba.

## Inventario de `[V]` que toca P0-3

Cada `[V]` tiene **responsable** y **momento de cierre**. «Implementador» es el agente
que escribe el plan o el PR. «CI» es el job en verde sobre el commit que se fusiona,
con la salida pegada en la evidencia (ADR-011 §9.8; `juntia-dev` sirve para iterar,
no para cerrar). Una `[V]` sin salida a su hora bloquea ese momento.

**Deciden cómo se construye — se ejecutan antes de cerrar el plan:**

| `[V]` | Fuente | Qué hay que ejecutar | Responsable | Cierre |
| --- | --- | --- | --- | --- |
| Ledger de solo inserción con anulaciones | FR-002; ADR-013 §2.4 | Prototipo en `juntia-dev`: trigger que rechaza `update`/`delete` para `juntia_writer` y forma de la anulación | Implementador del plan | Antes de cerrar el plan |
| Saldo ≥ 0 por aportante bajo concurrencia | DEC-G06; ADR-013 §3 | Que dos usos o un uso y un retiro concurrentes se serializan con el bloqueo de la meta y el segundo falla sin cambiar nada | Implementador del plan | Antes de cerrar el plan |
| Orden de bloqueo del gasto con meta | FR-004 | Gasto + meta al registrar; solicitud + meta al aprobar; sin interbloqueo con quitar el uso | Implementador del plan | Antes de cerrar el plan |
| Vigencia mensual del presupuesto | FR-013; Q7 | Modelo (fila por cambio con mes de inicio, o equivalente) que responda «¿qué límite regía en {mes}?» en una vista de una sola sentencia | Implementador del plan | Antes de cerrar el plan |
| Lectura consistente de métricas y saldos | FR-096 | Que las cinco métricas, saldos y consumos salen de una sola lectura con vistas `security_invoker` | Implementador del plan | Antes de cerrar el plan |

**Comprueban lo construido — se ejecutan durante la implementación:**

| `[V]` | Fuente | Qué se comprueba | Responsable | Cierre |
| --- | --- | --- | --- | --- |
| ADR-013 [V] 1, 2 y 7 sobre las tablas nuevas | ADR-013 | `juntia_writer`, escritura directa imposible, privilegios efectivos | CI (pgTAP) | Antes del merge del PR A |
| ADR-013 [V] 3, 4, 5 y 6 sobre las funciones nuevas | ADR-013 | Atomicidad, concurrencia, idempotencia, importes de ida y vuelta | CI (pgTAP e integración) | Antes del merge del PR A |
| `goal_usage_confirmations`: bloqueo sin consentimiento y revalidación | §15.6.3 punto 3; handoff, Pendiente | FR-054, FR-111, FR-112 | CI (pgTAP e integración) | Antes del merge del PR A; el recorrido de dos sesiones, antes del merge del PR D |
| RLS de metas privadas y compartidas | §15.6.3 punto 4 | US-10 completa | CI (pgTAP) | Antes del merge del PR A |
| Registro inicial del gasto con meta | §15.6.3 punto 5 | FR-052: una operación, sin esperar aprobación | CI (integración) | Antes del merge del PR A |
| Autorización posterior de fondos ajenos | §15.6.3 punto 6 | FR-054, FR-055: operación separada, revalidación, meta ≥ 0, el gasto permanece | CI (integración) | Antes del merge del PR A |
| Ediciones concurrentes de presupuesto | §15.6.3 punto 7; BudgetIndicator «Conflicto» | FR-011 en los dos órdenes | CI (integración) | Antes del merge del PR A; el aviso en pantalla, antes del merge del PR B |
| Idempotencia de las escrituras que mueven dinero | §15.6.3 punto 2 | FR-091 | CI | Antes del merge de cada PR que añade la escritura |
| Las siete filas de DEC-G04 | Handoff; 05·7 «Función pura» | FR-060 | CI (dominio) | Antes del merge del PR A |
| `transaction_goal_funded` conectado | FR-035 de la 003 | FR-007 con datos, más la LimitNote | CI (pgTAP; componentes) | PR A (función); PR D (pantalla) |
| View Transitions con App Router y back-swipe de iOS | §15.6.2 punto 1; MOTION_SYSTEM | Goal Journey con respaldo `layoutId` | Implementador | Antes del merge del PR C; el back-swipe en iPhone, fundadores, antes de MVP-1 (decisión 19.1) |
| Rendimiento de GoalStack y del abanico | §15.6.2 punto 4; RESPONSIVE | Abanico con 6 metas en gama media emulada | Gestor (laboratorio) | Antes del merge del PR C (según Q2) |
| Luminancia del scrim de fotos | §15.6.2 punto 2; 04·4 | Solo si Q6 elige subir fotos | Implementador | Con el PR que traiga fotos |
| Privacidad por ámbito | FR-085 a FR-087 | HTML, RSC y prefetch de Nosotros; nada personal para el otro | CI (componentes y specs 4 y 5) | Antes del merge de los PR B a E |
| Umbrales de §15.7 | Maestro §15.7 | SC-010 y FR-101 | Gestor (laboratorio) | Antes del merge de los PR B, C y E |
| Presupuesto del job `e2e` | Decisión 19.5; FR-116 | < 480 s con las specs 4 y 5 | CI | Antes del merge de los PR B a E |
| Barrido completo de accesibilidad | Decisión 21.2 | Siete anchos, 200 %, teclado, 44 px | Gestor | Al cerrar P0-3 |
| Revisión visual de los `[P]` | Inventario de `[P]` | Aprobación en pantalla | Fundadores | Antes del merge de los PR B a E |
| Salida interna | SC-012 | Metas, aportes, gasto con meta y presupuesto con datos reales | Fundadores | Antes de aceptar P0-3 |

## Verificaciones de §15.6.3 que aplican a P0-3

| Punto de §15.6.3 | ¿Aplica? |
| --- | --- |
| 1. Atomicidad de Mover a Pareja | Ya cerrada en P0-2; P0-3 **conecta** su bloqueo por meta (FR-007) y repite la prueba con datos |
| 2. Idempotencia de las escrituras que mueven dinero | **Sí** (FR-091; SC-008) |
| 3. `goal_usage_confirmations` | **Sí** (FR-054; SC-009) |
| 4. RLS de metas | **Sí** (US-10; SC-007) |
| 5. Registro inicial del gasto con meta | **Sí** (FR-052) |
| 6. Autorización posterior de fondos ajenos | **Sí** (FR-054, FR-055; SC-005) |
| 7. Ediciones concurrentes de presupuesto | **Sí** (FR-011) |

## ADR, erratas y conflictos

- **ADR que aplican:** ADR-001 (punto 7), ADR-002, ADR-007, ADR-011, ADR-012 y ADR-013 (archivo); ADR-004 y ADR-010 (maestro §12.2, sin archivo hoy).
- **ADR nuevo:** ninguno con las recomendaciones. **Si Q6 elige subir fotos**, hace falta **ADR-014 (Storage privado de fotos de metas)** antes del plan. Las respuestas a Q7 (ADR-004) y a Q13 y Q17 (ADR-010) se escriben como notas fechadas en archivos propios, `docs/adr/ADR-004-presupuestos.md` y `docs/adr/ADR-010-metas.md`, en el PR de Clarify, como hizo la 003 con ADR-002 y ADR-007.
- **Erratas pendientes del paquete:** ninguna en `docs/design/README.md`.
- **Lecturas registradas para la revisión** (donde hay conflicto, manda el documento superior o lo resuelve una pregunta):
  1. **04·3 «¿Quién aporta? Sara · Tomás»** en Registrar aporte contradice DEC-G06 («el cliente no puede crear aportes a nombre de terceros») y 05·7. Manda el maestro: el selector no se construye y aporta quien registra (FR-040).
  2. **04·7 «Aporte a Boda · Tomás · 15 oct»** contradice `COMPONENT_SPECIFICATIONS.md` (Tomás 400.000 el 15 de octubre a Japón), el historial de Japón de 04·3 y §15.10 («meta Japón»). Manda el dataset: el aporte es a Japón.
  3. **04·3 «el dinero sigue en la cuenta de Sara»** afirma dónde está el dinero; el handoff dice «el dinero sigue donde lo tengan» y DEC-G03 prohíbe inferir saldos. Se usa el texto del handoff (FR-100).
  4. **Fotos de metas** (04·4, I2·4) frente a Storage P1 (§7.1): Q6.
  5. **«$115.000 más que en septiembre (+4 %), por la cena y los servicios»** frente a la auditoría anti-slop del handoff («Atención»): Q10.
  6. **«Sugerido para ir al ritmo», «Ritmo para abril: 67 %» y el tramo de próximo aporte** frente a «sin predicción inventada» (§11) y la ausencia de aportes programados en P0: Q9.
  7. **«Archivar cuando el balance esté reconciliado» (DEC-G02)** sin definir «reconciliado»: Q15.
  8. **ADR-001 punto 7 pide una «reversión autorizada y auditada»** que ningún diseño dibuja: Q17.
  9. **«Desactivar» (US-04, §15.5, handoff) y «archivar» (§5.3)** nombran la misma operación sobre un presupuesto; la interfaz dice «Desactivar» y el estado es el (c) de DEC-R01.
  10. **El aviso de conflicto de presupuesto «al otro integrante»** (handoff, Pendiente) sin tiempo real: lo ve quien guarda segundo, al guardar (decisión 20.16; FR-011).
  11. **FR-048 de la 003** («Metas y Plan siguen con su estado provisional hasta P0-3») queda sustituido por FR-020 y FR-035.

## Specs E2E que añade P0-3

**Dos**, el máximo por especificación (ADR-011 §3), y son exactamente las dos
reservadas para P0-3.

| | Antes de P0-3 | P0-3 añade | Después |
| --- | ---: | ---: | ---: |
| Specs E2E existentes | 3 (1 «Acceso y Mi cuenta», 2 «Anotar gasto, cronometrado», 3 «Pareja 50/50 y liquidación») | 2 (4 «Meta con aportes y uso», 5 «Presupuesto activado/desactivado») | 5 |

| PR (Q1) | Spec E2E |
| --- | --- |
| A · Base de datos, seguridad y dominio | Ninguna; crece la siembra (metas, aportes y presupuestos por worker) |
| B · Plan y presupuestos | **Nace la spec 5**: crear, editar con conflicto, desactivar, volver a «sin presupuesto» |
| C · Metas, aportes, retiros y S5 | **Nace la spec 4**: crear meta, aportar, el héroe no cambia, retirar |
| D · Gasto con meta y confirmaciones | **Se amplía la spec 4** con «Financiación ajena → aprobar/rechazar», dos contextos (Sara y Tomás) |
| E · Análisis, PlanningNote, exportación y cierre | **Se amplía la spec 5** con Análisis con y sin presupuesto; la descarga de la exportación sigue en la spec 1 |

Queda **la sexta plaza libre** del tope de 4–6. Los PR de metas corren las specs 1,
2, 3 y 4; los de presupuestos, 1, 2, 3 y 5; el PR E toca las dos áreas y corre las
cinco (`docs/TESTING.md`, «Qué specs corre tu PR»).

## Criterios de aceptación aplicables

### Del handoff («Criterios de aceptación (solo P0)»)

| Criterio | ¿Aplica a P0-3? |
| --- | --- |
| Mi cuenta: los criterios de 05·9 | Solo Exportar (FR-080) |
| DEC-G04: `total_destinado_neto` reproduce cada fila y nunca se rotula «Total gastado» ni ocupa el número héroe | **Sí** (FR-060, FR-063; SC-003) |
| Un gasto compartido existe una vez; ninguna pantalla, export ni agregado suma Yo + Nosotros | **Sí**, también con metas y en la exportación (FR-061, FR-081) |
| Los aportes no cambian `gasto_consumo` ni lo consumido de presupuestos; se atribuyen al aportante real | **Sí** (US-5; FR-014, FR-040) |
| Una liquidación parcial … 229.900 | Ya cerrada en P0-2; P0-3 no la cambia (las metas no tocan el saldo) |
| Un gasto con meta crea un único gasto real; asignaciones por aportante; la meta nunca queda negativa | **Sí** (US-7; FR-052 a FR-058; SC-005) |
| Usar o retirar aportes ajenos sin confirmación queda bloqueado | **Sí** (FR-041, FR-054; SC-009) |
| Un retiro nunca se presenta como ingreso | **Sí** (US-6; FR-113) |
| Anotar registra privado o compartido desde un solo flujo… | Ya cerrada en P0-2; P0-3 añade «Cómo se pagó» sin cambiar la ruta mínima (FR-050) |
| No se puede crear un espacio compartido con más de 2 integrantes | Ya cerrada en P0-2 |
| El saldo de la pareja reproduce el caso de octubre | Ya cerrada en P0-2; SC-005 comprueba que la meta no lo cambia |
| Ambos integrantes pueden crear, editar y desactivar un presupuesto; historial; edición concurrente no se pierde [V] | **Sí** (US-2; FR-011 a FR-018) |
| Los dos temas pasan axe … en Inicio, Actividad, Anotar, Balance y Meta | **Sí**, Meta incluida (SC-002) |
| Todos los momentos de motion respetan `prefers-reduced-motion` | **Sí** (SC-011) |
| Los datos del caso de octubre reproducen exactamente los totales del diseño | **Sí**, la parte de P0-3 (SC-004) |

### Del maestro §15.7 (umbrales que bloquean la aceptación)

| Umbral | ¿Aplica a P0-3? |
| --- | --- |
| CLS = 0 en las cargas con skeleton de las rutas clave | **Sí** (SC-010) |
| INP < 200 ms al abrir Anotar y al guardar | **Sí**, también con meta (SC-010) |
| Mediana < 10 s para un gasto habitual (US-12) | Aplazada por la decisión 19.1; P0-3 mantiene la ruta mínima (FR-050) |
| Sin scroll horizontal en 360, 390, 430, 1024 y 1440 | **Sí** (SC-001) |
| Objetivos táctiles ≥ 44 px | **Sí** (FR-101) |

### Del maestro §4, §10.3, §11 y CLAUDE.md 11

P0-3 se acepta con la RLS de metas y presupuestos, las invariantes del ledger y la
atomicidad del gasto con meta con salida registrada (SC-003 a SC-009, SC-013) y con la
salida interna aprobada por los dos (SC-012). Con P0-3 quedan cubiertas en código las
historias US-18 a US-23 y US-04; el release gate de MVP-1 (§10.4) sigue siendo de
P0-4.

## Propuesta de reparto en PR (recomendación, Q1)

Solo una recomendación: la decide Q1 y la concreta `tasks.md`.

| PR | Contenido | Spec E2E | Depende de |
| --- | --- | --- | --- |
| **A · Base de datos, seguridad y dominio** | Migraciones de las cinco tablas y el historial de presupuestos; funciones de entrada y de escritura (presupuesto, meta, aporte, retiro, anulación, gasto con meta, aprobar, rechazar, cancelar, quitar el uso); `transaction_goal_funded` conectado; vistas de una sentencia para saldos, consumos y métricas; dominio puro (DEC-G04, saldos, presupuestos, FundingLedger, ritmo, comparación); dataset dorado de P0-3; pgTAP e integración; siembra | Ninguna | — |
| **B · Plan y presupuestos** | Plan en Yo y Nosotros, crear/editar/desactivar, historial, conflicto de versión, BudgetIndicator, estados sin presupuesto | Nace la 5 | A |
| **C · Metas, aportes, retiros y S5** | Metas en Yo y Nosotros, GoalStack (Q2), GoalCard con fallback, meta inmersiva y Goal Journey, crear/editar/lograr/archivar, registrar aporte, historial, retirar, anular y deshacer, bloques de metas en Inicio y asientos en Actividad | Nace la 4 | A |
| **D · Gasto con meta y confirmaciones** | «Cómo se pagó» en Anotar, FundingLedger, efecto B3, B4–B7, solicitud en la sesión del otro, quitar el uso, anular y editar un gasto con meta, LimitNote de Mover a Pareja | Amplía la 4 (dos sesiones) | A, C |
| **E · Análisis, PlanningNote, exportación y cierre** | Análisis (S3) con y sin presupuesto, capítulos y comparación, PlanningNote, exportación de alcance global, barrido completo de accesibilidad y salida interna | Amplía la 5 | B, C, D |

B y C pueden ir en paralelo después de A, en worktrees distintos (`AGENTS.md` 14b),
porque no comparten pantallas; solo uno usa `juntia-dev` a la vez (decisión 18). Si el
PR A resulta demasiado grande para una revisión, se parte en A1 (presupuestos) y A2
(metas y gasto con meta), sin cambiar el resto.
