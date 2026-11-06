# Feature Specification: 003 · Pareja y balances (P0-2)

**Feature Branch**: `docs/spec-003-specify` (la carpeta de la spec y la rama son independientes, ADR-012 §1.5)

**Created**: 2026-11-06

**Status**: Draft — etapa **Specify**. Tiene **18 preguntas abiertas** (sección «Preguntas abiertas para los fundadores») que pasan a «Clarifications» cuando los fundadores las respondan. No avanza a Plan sin sus respuestas y sin el merge de su PR documental (ADR-012 §3.1).

**Input**: User description: "Especificación 003 · P0-2 de Juntia, «Pareja y balances con visualización final» (maestro §11): P0-2a grupo de pareja e invitación; P0-2b repartos, liquidaciones y Shared Balance; P0-2c Context Transition con aislamiento de datos. Pareja de exactamente dos, invitación segura, rol y membresía; repartos 50/50, porcentaje e importe; saldos y liquidaciones parciales con auditoría y correcciones; Mover a Pareja (ADR-001); S1 y S4 con datos reales en móvil y escritorio. Acceso a datos según ADR-013. Sin presupuestos, metas ni salida de la pareja."

> **Qué es este documento.** Dice **qué** construye P0-2 y **por qué**. **No
> decide nada**: cada requisito cita la decisión que aplica, y lo que no está
> decidido va como **pregunta abierta numerada** con la recomendación del autor y
> sus consecuencias. Jerarquía: maestro (§15 prevalece) > ADR > paquete de
> `docs/design/` y `docs/CONVENTIONS.md` > esta spec (`AGENTS.md` §2). En este
> archivo, `[P]` significa **propuesta** y `[V]` **verificación pendiente**, según
> el maestro §15.9; no significan «paralelizable» (eso solo ocurre dentro de
> `tasks.md`, ADR-012 §3.2).
>
> **Desviación de la plantilla, a propósito.** La plantilla de Spec Kit limita a
> tres los `[NEEDS CLARIFICATION]`. Aquí hay 18 preguntas, porque el encargo del
> gestor pide que todo lo no decidido llegue a los fundadores y no se resuelva en
> la spec. Los requisitos que dependen de una pregunta la citan («según Q9») y
> describen lo que no cambia sea cual sea la respuesta.

### Fuentes que aplica

| Fuente | Qué aporta a P0-2 |
| --- | --- |
| Maestro §11, «P0-2» y backlog P0-2a/P0-2b/P0-2c | Alcance y salida interna: los dos pueden compartir, comprender y saldar sin usar otra app |
| Maestro §5.1, §5.2, §5.4, §5.5 | Dimensiones financieras, fórmula de `net_owed`, liquidaciones parciales y su límite, precisión, edición y anulación, participantes, invitaciones y salida |
| Maestro §6.4, S1 y S4 | Context Transition y Shared Balance con datos reales |
| Maestro §7.3 y §7.4 | Modelo relacional (`groups`, `group_members`, `group_invitations`, `transaction_allocations`), contrato por tipo, operaciones atómicas y privacidad |
| Maestro §15.3, §15.5, §15.6.3, §15.7 | Navegación (Balance solo en escritorio), alcance P0 cerrado (grupos, repartos, liquidaciones, invitaciones, Mover a Pareja), verificaciones que bloquean el slice y umbrales |
| Maestro §15.9 | Inventario de `[P]`: SharedBalance, ChangePreview, Anotar E1–E5, sección Cuenta, personas y paleta |
| Maestro §15.10, decisiones 10, 12, 13, 16, 18 y 19, y «Dataset dorado» | Selector sin animación hasta P0-2, verificaciones heredadas ya cerradas o aplazadas, despliegue, alcance de P0-1, iteración contra `juntia-dev` y la parte del dataset dorado de P0-2 |
| Maestro US-02, US-03, US-05, US-06, US-08, US-10, US-11, US-14, US-15, US-16, US-17 | Historias que P0-2 hace verificables |
| ADR-001 | Mover a Pareja: atómica, idempotente, auditada, pagador fijo, deshacer condicionado, sin «mover a Yo» |
| ADR-002 (maestro §12.2) | Unidades menores, mayor residuo con desempate estable, moneda única por grupo |
| ADR-003 | Sin salir, expulsar ni transferir en P0; LimitNote; una pareja activa de dos, sin carreras |
| ADR-007 (maestro §12.2) | Correcciones auditadas que recalculan balances; liquidaciones inmutables |
| ADR-013 | Tablas controladas (`groups`, `group_members`, `group_invitations` incluidas), `juntia_writer`, concurrencia, importes como texto, auxiliares de membresía sin recursión |
| ADR-011 y `docs/TESTING.md` (incluida la §9.9 de ADR-011, decisión 18) | Capas, spec E2E 3 y el caso de invitación de la spec 1, siembra de parejas aisladas, `storageState` por rol, presupuestos e iteración contra `juntia-dev` |
| ADR-012 | Formato, gates por PR documental, `[P]` y `[V]` |
| `docs/design/HANDOFF_CLAUDE_CODE.md` | Pareja e invitaciones, Mover a Pareja, reglas de UI, criterios de aceptación de P0 |
| `docs/design/COMPONENT_SPECIFICATIONS.md` | Datos de referencia de octubre, SharedBalance, ChangePreview, CoupleStatus, SensitiveActionConfirmation, LimitNote, ExpenseRow (variantes compartida y liquidación), Badge, flujo Mover a Pareja, Anotar E1–E5 |
| `docs/design/MOTION_SYSTEM.md` §1 y §3 | Coreografía, interrupción y fallback de S1 y S4 |
| `docs/design/RESPONSIVE_SPECIFICATIONS.md` | Shared Balance en móvil (pantalla) y desde lg (módulo de Inicio), selector de contexto, Mi pareja |
| Claude Design, proyecto «Juntia: Responsive design y design system»: `02 Componentes` (02·3 Shared Balance, 02·5 y 02·6 Anotar) y `04 Pantallas` (04·1 Inicio Yo y Nosotros, Actividad, detalle y edición; 04·2 Balance y Registrar liquidación; 04·5 oscuro; 04·6 estados; 04·7 y 04·8 escritorio; 04·9 responsive; 04·10, 04·12 y 04·13 Mover a Pareja; 04·15 Mi pareja e invitaciones) | Pantallas y estados que P0-2 construye |
| `docs/CONVENTIONS.md` y `docs/GLOSSARY.md` | Idioma por capa, módulo de copy, nombres (§1–§3 del glosario) y palabras prohibidas (§9) |
| Spec 002 (`spec.md`, `plan.md`, `tasks.md`, `evidence.md`) | Forma y nivel de detalle; lecciones de las revisiones F43, F44 y F45 que aquí pasan a requisitos (FR-060 a FR-068) |

## Preguntas abiertas para los fundadores

Ninguna está resuelta en esta spec. Cada una lleva la **recomendación del autor**
y sus **consecuencias**; los fundadores eligen. Cuatro de ellas (Q2, Q3, Q4 y
Q18) tocan `[P]` o datos dorados que **afectan al alcance** y, según el maestro
§15.9, deben resolverse **antes** del plan.

| # | Pregunta | Recomendación | Consecuencias |
| --- | --- | --- | --- |
| **Q1** | **Forma de la especificación.** ¿Una spec con cuatro PR de implementación seguidos, como la 002? | **Sí.** A · base de datos, seguridad y dinero (grupos, membresías, invitaciones, repartos, liquidaciones, Mover a Pareja en SQL, RLS y pgTAP); B · Mi pareja e invitaciones (con el caso de invitación de la spec E2E 1); C · gastos compartidos: Anotar con reparto, Nosotros en Inicio y Actividad, editar y eliminar, Mover a Pareja; D · Balance, liquidaciones, S4 Shared Balance y S1 Context Transition (nace la spec E2E 3). Así P0-2a = A+B, P0-2b = C+D y P0-2c cierra en D | Cuatro PR revisables por separado; la spec E2E 3 nace con D porque es el primer PR con el recorrido completo de pareja, reparto y liquidación (`docs/TESTING.md`, «la spec nace con la funcionalidad que prueba»). Alternativa: tres PR (juntar C y D): menos revisiones, pero un PR muy grande con dinero, motion y UI a la vez |
| **Q2** | **SharedBalance `[P]`** (maestro §15.9, alcance **Sí**). ¿Se aprueba la codificación de la barra (tramo pagado, marca de lo que corresponde, exceso con contorno, hueco punteado, tramo rayado de liquidado, contorno punteado de recibido) para construirla? | **Sí, tal como está en 02·3 y 04·2**, con la aprobación visual final viendo las capturas del PR D | Se construye la barra con la tabla de desglose como alternativa accesible. Alternativa: solo filas de texto («pagó · le corresponde · saldo») sin barra; más simple, pero S4 pierde su visualización y el maestro §6.4 pide una «animación elegante de quién pagó y a quién corresponde» |
| **Q3** | **ChangePreview `[P]`** (alcance **Sí**). ¿Existe la vista previa «antes → después» en Mover a Pareja (04·10 A3)? | **Sí.** ADR-001 (Aceptado) ya dice en Consecuencias que «la interfaz muestra una vista previa de los balances antes de confirmar (`ChangePreview`)»; el `[P]` del paquete no puede contradecir un ADR aceptado. Se aprueba que exista y se usa **solo** en Mover a Pareja en P0-2 | Mover a Pareja tiene cuatro pasos (A1–A4) y la vista previa solo muestra cifras visibles para quien mira. Si se rechaza, ADR-001 necesita enmienda antes del plan |
| **Q4** | **Anotar compartido (E1–E5) `[P]`.** La decisión 16.2 aprobó Anotar solo en su versión privada. ¿Se aprueba la versión compartida de 02·5: campo Contexto (Yo · Nosotros), Pagó, Participan, Reparto (50/50 · Porcentaje · Importe), el error E3 «Faltan $X por asignar» y el saldo que se tacha en E5? | **Sí, tal como está en 02·5 y 02·6**, con el texto de los estados nuevos aprobado viendo la pantalla en el PR C | Es el flujo central de P0-2 (maestro §15.5, «Repartos»; handoff, «Anotar registra privado o compartido desde un solo flujo»). Sin esta aprobación no hay forma de crear un gasto compartido salvo Mover a Pareja |
| **Q5** | **Reparto inicial al abrir Anotar en Nosotros.** El comp dice «pagador, reparto y fecha vienen de lo último usado en ese contexto»; el maestro §15.5 dice «nunca se asume 50/50» y que no hay «reparto por defecto» configurable. ¿Qué aparece preseleccionado? | **Lo último que usó esa persona en Nosotros (pagador y reparto), siempre visible en el resumen de E1; la primera vez, «Pagó: yo» y 50/50 visibles en el resumen.** No es una preferencia configurable, es memoria del último uso, y nunca está oculto | Cumple la ruta de 2 toques (US-12) sin esconder el reparto. Alternativa estricta: sin preselección, obligando a elegir reparto en cada gasto compartido; más explícito, pero rompe la mediana de < 10 s |
| **Q6** | **Pagador.** ¿Puede una persona anotar un gasto que **pagó la otra** («Pagó Tomás» anotado por Sara, como en 02·5 E1)? | **Sí**, con el pagador limitado a los integrantes activos y la autoría visible («Anotado por Sara · pagó Tomás») | El saldo de Tomás cambia por una acción de Sara, sin confirmación (como en Tricount). Alternativa: solo puede figurar como pagador quien anota; más simple de auditar, pero Tomás tendría que anotar cada cosa que pagó él |
| **Q7** | **Participantes y partes de cero.** ¿Se permite un gasto compartido en el que participa **solo uno** (100/0, por ejemplo algo que Sara pagó y es solo de Tomás), o una parte de 0 en Importe? | **Sí**, con al menos un participante y el pagador no obligado a participar; una parte de 0 equivale a «no participa» | Permite registrar «te lo compré a ti» sin inventar otra operación. El gasto cuenta completo en el gasto de Nosotros y solo en el consumo de quien participa. Alternativa: exigir a los dos con parte > 0; más simple, pero no cubre ese caso |
| **Q8** | **Granularidad y desempate del reparto.** COP se anota en pesos enteros, pero se guarda en unidades menores (maestro §5.2). Un 50/50 de $186.401 daría $93.200,50 a cada uno, que la interfaz no muestra. ¿Las partes se calculan en **pesos enteros** o en centavos? ¿Y a quién va el peso sobrante? | **Pesos enteros** (múltiplos de 100 unidades menores), con el mayor residuo de ADR-002 y el desempate estable **por orden de ingreso a la pareja** (la propietaria primero). Porcentajes enteros de 0 a 100 | Toda parte se ve exacta y las partes visibles suman el total visible. Es una lectura de ADR-002 («unidades menores») que conviene dejar escrita: el plan la registra como nota de implementación de ADR-002 si los fundadores la aprueban. Alternativa: centavos; exacto en la base pero la interfaz mostraría partes que no suman a simple vista |
| **Q9** | **Periodo del saldo.** El comp de Balance dice «Octubre · 6 gastos compartidos» y «quedan al día en octubre»; el maestro §5.1 define `net_owed` del grupo, sin periodo. ¿El saldo es **acumulado** desde que existe la pareja o **por mes**? | **Acumulado** (una sola cifra viva, «Tomás le debe a Sara»), con el desglose filtrable por mes. El rótulo «Octubre» del comp pasa a describir el desglose, no el saldo | Una deuda de septiembre no desaparece al cambiar de mes. El dataset dorado de octubre no cambia, porque no hay historia anterior. Alternativa: saldo mensual; obliga a decidir qué pasa con la deuda que queda al cerrar el mes, algo que ningún documento define |
| **Q10** | **Liquidación: quién la registra y con qué reglas.** ¿Cualquiera de los dos, sin confirmación del otro? ¿Puede tener fecha futura? | **Cualquiera de los dos, declarativa y sin segunda confirmación** (como los presupuestos, §15.5), siempre deudor → acreedor por un importe ≤ saldo pendiente (§5.1), con fecha **hoy o pasada**, nunca futura | Coherente con «Juntia solo registra la liquidación declarada». El otro la ve con su autoría. Alternativa: que el acreedor confirme; añade un estado pendiente que no está diseñado |
| **Q11** | **Liquidación registrada por error.** ADR-007 dice «liquidaciones inmutables». ¿Se puede **anular** (no editar) una liquidación? | **Sí: anular con auditoría, sin editar**, por cualquiera de los dos, más el «Deshacer» de 6 s justo después de registrarla. La liquidación anulada sale del saldo y sigue visible en el historial como anulada | Sin esta vía, un error solo se compensa con una liquidación en sentido contrario, que el maestro §5.1 prohíbe porque aumenta el sobrepago. Anular no reescribe la liquidación, pero toca la letra de ADR-007: **necesita la aprobación explícita de los fundadores**, y el plan la registra como nota de ADR-007 o propone un ADR corto si la consideran una decisión nueva |
| **Q12** | **Editar y eliminar un gasto compartido.** ¿Quién puede, qué campos y qué ve el otro? | **Cualquiera de los dos**, con control de versión (como 16.15), monto, categoría, fecha, descripción, pagador y reparto editables y el contexto fijo (no hay «mover a Yo», ADR-001). El otro ve «Editado por Sara · fecha» en el detalle, no los valores anteriores (que quedan en la auditoría) | El comp de edición ya lo anuncia: «Tomás verá que lo editaste». Alternativa: solo quien lo anotó; protege la autoría pero obliga a pedirle al otro cada corrección |
| **Q13** | **Cuándo nace la pareja y qué pasa con invitaciones cruzadas.** ¿La pareja se crea al **crear la invitación** (la propietaria sola, M4 «PENDIENTE») o al **aceptarla**? Y si Sara y Tomás se invitan a la vez, ¿qué pasa? | **Al crear la invitación**, con la propietaria como único integrante activo (encaja con «una invitación activa por pareja» y con CoupleStatus PENDIENTE). Una persona que es propietaria de una pareja **de un solo integrante** no puede aceptar otra invitación hasta anular la suya: la aceptación se rechaza con el estado M7 y un texto que lo explica | Nadie queda en dos parejas y no hace falta «cerrar» grupos, que ADR-003 deja fuera de P0. Alternativa: que aceptar anule la invitación propia y cierre la pareja vacía en la misma transacción; más cómodo, pero introduce un cierre de grupo que hoy no existe |
| **Q14** | **Invitación y lista permitida.** Hasta MVP-1 solo pueden registrarse los correos de la lista (16.9). ¿Se valida el correo invitado contra la lista al **crear** la invitación? | **No.** Crear la invitación no consulta la lista (no se enumera); quien no está en la lista no puede crear la cuenta, como hoy. La lista cambia solo por la operación documentada de la 002 | Cero cambios en el registro. Los dos fundadores ya están en la lista, así que no afecta su uso real |
| **Q15** | **Deshacer de Mover a Pareja.** ADR-001 lo permite «solo inmediatamente después y solo si el servidor confirma que no hay operaciones dependientes». ¿Qué ventana y qué cuenta como dependiente? ¿El importe se puede cambiar al mover? | **Ventana: el toast de 6 s, como Anotar.** Dependiente: cualquier edición o anulación del compartido, o cualquier liquidación registrada después del movimiento. **El importe no se cambia al mover** (A2 lo muestra fijo): se mueve tal cual y, si hace falta, se edita después | Deshacer es una operación propia, atómica e idempotente: anula el compartido y restaura el privado como **un registro nuevo** que referencia al anulado, nunca reactivando uno anulado. Alternativa: importe editable en A2; mezcla dos operaciones en una y complica la auditoría |
| **Q16** | **Tiempo real.** Cuando Sara anota, ¿Tomás lo ve sin recargar? | **No en P0-2.** Los datos se actualizan al navegar, al volver a la pestaña y tras cada escritura propia. Ningún documento pide tiempo real y §15.5 excluye notificaciones | Sin suscripciones en vivo ni su RLS adicional. Alternativa: Supabase Realtime; más inmediato, pero añade un canal con su propia superficie de privacidad que habría que probar |
| **Q17** | **Hito de los presupuestos de tiempo de CI.** `docs/TESTING.md` dice que bloquean «cuando existan tres de las cinco specs E2E y el dominio cubra DEC-G04 y balances. Coincide con el cierre de P0-2». Pero DEC-G04 completo (aportes, retiros, financiado con meta) llega con P0-3 | **Que bloqueen al cierre de P0-2**, con tres specs E2E, balances y `gasto_consumo` de Yo y Nosotros, como dice la frase final; el resto de DEC-G04 entra con P0-3 sin mover el hito | Lo resuelven los fundadores; esta spec no toca `docs/TESTING.md` (otra sesión trabaja en él, decisión 18). Alternativa: aplazar el hito al cierre de P0-3 |
| **Q18** | **El ejemplo de Mover a Pareja no cabe en el dataset dorado.** El handoff y 04·10 mueven «Farmacia Pasteur 64.000» y dicen «privados 412.900 → 348.900», pero los ocho privados de octubre que la spec 002 fijó (y que ya están completados) no tienen ningún gasto de 64.000 | **Tratarlo como escenario hipotético aparte**, como dice el propio comp («simulación sobre octubre: no altera el fixture aprobado»): las pruebas de Mover a Pareja comprueban las **diferencias** (−64.000 en privados, +32.000 en la parte de Sara, +64.000 en Nosotros, +32.000 en lo que Tomás le debe) sobre el dataset dorado más un gasto privado de 64.000 añadido solo en esa prueba | El dataset dorado de P0-1 no cambia (regla 1 del maestro). Las cifras absolutas de 04·10 (348.900 / 1.532.000 / 2.904.000 / 461.900) no se reproducen tal cual; sí sus diferencias. Alternativa: corregir el comp; no se puede sin cambiar el dataset de P0-1 ya aceptado |

### Lo que ya está decidido y no se pregunta

Para que la revisión no lo reabra:

- **Moneda:** COP fija, moneda única por grupo; una operación con otra moneda se rechaza (§5.2, §15.5, ADR-002).
- **Ingresos compartidos:** no existen en P0; `income` es siempre privado (§7.3, «Contrato por tipo»; spec 002, `transactions_income_private`).
- **Salir de la pareja, expulsar o transferir:** no se implementa; se explica con LimitNote (ADR-003; US-11). La propietaria sí puede anular una invitación pendiente.
- **Mover a Yo:** no existe en P0 (ADR-001 punto 8).
- **Cómo se invita:** enlace que la propietaria comparte a mano, asociado a un correo, 7 días, un uso, token guardado como hash, una invitación activa por pareja y aceptación solo con una cuenta verificada con ese correo; sin correos ni notificaciones propias (§15.5; handoff, «Pareja e invitaciones»).
- **Quién invita:** solo la propietaria (§5.5, §15.5).
- **Tamaño:** exactamente dos integrantes; grupos N son P1 (§15.5).
- **Repartos:** 50/50, porcentaje e importe; «Porcentaje 55/45» es configurable, no proporcional a ingresos (§15.5; glosario §3).
- **Liquidación:** nunca crea una transferencia; sugerencia determinista deudor → acreedor; parciales permitidas; no se registra una que aumente el sobrepago (§5.1, §15.5).
- **Exportar** gastos compartidos: llega con P0-3 (decisión 16.12, Q12 de la 002).
- **Visibilidad del otro:** CoupleStatus nunca muestra saldos ni el correo del otro (anatomía aprobada por la decisión 16.6).

## Clarifications

*Vacía hasta que los fundadores respondan las preguntas abiertas. Sus respuestas
se registran aquí como sesión fechada y, si lo requieren, como decisión del
maestro §15.10, como se hizo con la decisión 16 en la 002.*

## User Scenarios & Testing *(mandatory)*

Los actores son las dos personas fundadoras, que ya usan Juntia en privado (P0-1)
y ahora forman su pareja con sus datos reales, en el teléfono y en el escritorio.
Sara (propietaria) y Tomás (integrante) son los nombres del dataset dorado y de
las pruebas.

### User Story 1 - Invitar a mi pareja y aceptar la invitación (Priority: P1)

Sara abre Mi pareja, escribe el correo de Tomás y crea una invitación. Comparte
el enlace por WhatsApp. Tomás lo abre, entra con su cuenta (o la crea y la
verifica), vuelve a la invitación, ve quién lo invita y qué significa, y acepta.
Desde ese momento los dos tienen Nosotros.

**Why this priority**: sin pareja no hay nada compartido. Es P0-2a (maestro §11)
y la puerta de todo el slice.

**Independent Test**: con dos cuentas sembradas, crear la invitación por la
interfaz, abrir el enlace sin sesión, entrar como Tomás, volver y aceptar; es el
caso «Invitación → login → volver → aceptar» de la spec E2E 1 (`docs/TESTING.md`,
matriz de recorridos). Las reglas del token, en pgTAP e integración.

**Acceptance Scenarios**:

1. **Given** Sara sin pareja, **When** abre Mi pareja, **Then** ve M2 «Sin pareja» con «Invitar a mi pareja» y el texto de que su espacio personal está completo (04·15).
2. **Given** M3, **When** escribe un correo válido y pulsa «Crear invitación», **Then** ve M3b con el enlace, «un solo uso · vence el {fecha}», «Compartir enlace» y «Copiar enlace»; el servidor guarda solo el hash del token (§5.5, §15.5).
3. **Given** una invitación activa, **When** Sara vuelve a Mi pareja, **Then** ve M4 «PENDIENTE» con el correo, la caducidad, «Copiar enlace» y «Anular»; no puede crear otra mientras esta esté activa (§15.5).
4. **Given** M4, **When** Sara pulsa «Anular» y confirma en SensitiveActionConfirmation, **Then** la invitación deja de servir y Mi pareja vuelve a M2 (ADR-003).
5. **Given** el enlace abierto sin sesión, **When** se muestra, **Then** ve M5 sin ningún dato de la pareja ni de quien invita, con «Entrar» y «Crear cuenta»; tras entrar (o crear y verificar la cuenta) vuelve a la invitación (handoff, «Sin sesión: guardar la intención, autenticar, volver y revalidar»).
6. **Given** Tomás con sesión verificada con el correo invitado, **When** abre el enlace, **Then** ve M6 («Sara te invitó a ser su pareja en Juntia», qué verán juntos y que Yo sigue siendo solo suyo) y al pulsar «Aceptar invitación» queda como integrante; los dos ven M1 «ACTIVA» (04·15).
7. **Given** un enlace vencido, usado, anulado o para otro correo, o una persona que ya tiene pareja, **When** se abre con sesión, **Then** ve M7 «Esta invitación ya no sirve», con el mismo texto para todos los motivos (§15.5; 04·15).
8. **Given** M1, **When** se muestra, **Then** «Salir de la pareja» aparece como LimitNote, sin control (ADR-003).

---

### User Story 2 - Anotar un gasto compartido con su reparto (Priority: P1)

Tomás paga el mercado en Carulla. Abre Anotar, escribe $186.400, elige Mercado y
guarda: el resumen ya dice «Pagó Tomás · 50/50 · Sara y Tomás». Otro día Sara anota
el arriendo con «Porcentaje 55/45». El total de Nosotros sube y el saldo se tacha y
se actualiza.

**Why this priority**: es US-02 y US-03 y el núcleo de P0-2b. Depende de Q4.

**Independent Test**: la spec E2E 3 anota un gasto compartido 50/50 y comprueba
el total y el saldo; los repartos exactos, en dominio puro y en pgTAP.

**Acceptance Scenarios**:

1. **Given** una pareja activa y el contexto Nosotros, **When** Sara abre Anotar, **Then** E1 muestra monto, categorías y un resumen con fecha, pagador y reparto visibles, con el valor inicial de Q5 (02·5).
2. **Given** E2, **When** abre los detalles, **Then** puede cambiar contexto (Yo · Nosotros), pagador (según Q6), participantes (según Q7) y reparto (50/50 · Porcentaje · Importe) (02·5; §15.5).
3. **Given** Importe o Porcentaje, **When** las partes no suman el total, **Then** Guardar queda deshabilitado y aparece «Faltan $X por asignar» (o «Sobran $X»), con la cifra exacta (02·5 E3).
4. **Given** $150.000 al 70/30, **When** se guarda, **Then** las partes son exactamente 105.000 y 45.000 y suman el total (US-03).
5. **Given** un gasto compartido guardado, **When** el servidor responde, **Then** E5: la hoja se cierra, el total de Nosotros cuenta hacia arriba, la fila nueva queda resaltada, el saldo se tacha y se actualiza, y aparece «Gasto guardado · Deshacer» durante 6 s (02·5).
6. **Given** un doble toque en Guardar o un reintento por red, **When** llegan dos peticiones con la misma intención, **Then** se registra un solo gasto con un solo reparto (§5.4; ADR-013 §3).
7. **Given** la ruta mínima, **When** Sara anota un gasto compartido habitual, **Then** necesita los mismos 2 toques más el monto que en privado (02·5, «Ruta mínima»; US-12).
8. **Given** Anotar en Yo, **When** se guarda, **Then** el gasto es privado y no muestra Pagó, Participan ni Reparto, como en P0-1 (decisión 16.2).

---

### User Story 3 - Ver Nosotros sin ver nada privado (Priority: P1)

Sara cambia a Nosotros y ve «En octubre gastaron juntos $2.840.000», en qué se fue,
los recientes y el saldo. Nada de lo que anotó en Yo aparece, ni en totales ni en
búsquedas, ni viaja en la página. Tomás, en su teléfono, ve lo mismo y nunca ve los
privados de Sara.

**Why this priority**: es la regla de privacidad del producto (§2.3 principio 6,
§5.5, US-05) y la lección F44-1 de la 002. Un fallo aquí es un defecto bloqueante.

**Independent Test**: con el dataset dorado sembrado, Inicio y Actividad en
Nosotros muestran exactamente las cifras de octubre; el HTML y el payload RSC de las
rutas de Nosotros no contienen ninguna descripción ni importe privado de ninguno de
los dos.

**Acceptance Scenarios**:

1. **Given** el dataset dorado de P0-2, **When** cualquiera de los dos abre Inicio en Nosotros, **Then** el número héroe es **$2.840.000**, el desglose es Hogar 1.600.000 · Mercado 640.000 · Servicios 360.000 · Restaurantes 240.000 y el saldo dice «Tomás le debe a Sara $429.900» (04·1; dataset dorado).
2. **Given** Nosotros, **When** se muestran Inicio, Actividad, el detalle, el buscador o los filtros, **Then** no aparece ningún movimiento privado de ninguno de los dos (handoff, «Los movimientos privados nunca se renderizan en el contexto Nosotros, ni en los totales ni en las búsquedas»).
3. **Given** la respuesta del servidor a cualquier ruta en Nosotros (HTML y RSC), **When** se inspecciona, **Then** no contiene ninguna descripción, importe ni identificador de un movimiento privado (lección F44-1 de la 002).
4. **Given** Actividad en Nosotros, **When** se muestra, **Then** los gastos compartidos y las liquidaciones del mes están agrupados por día, cada gasto con «Pagó X · reparto» y cada liquidación con su ficha de contorno y «no es un gasto» (04·1; ExpenseRow, variante liquidación).
5. **Given** 1440 px, **When** abre Actividad en Nosotros, **Then** ve la tabla con la columna «Pagó · Reparto» y el panel de detalle con «A quién le corresponde» (04·7).
6. **Given** Nosotros sin gastos compartidos en el mes, **When** abre Actividad, **Then** ve 04·6 «Aún no hay gastos este mes · Cuando alguno de los dos anote un gasto compartido…» con «Anotar el primero».
7. **Given** una persona sin pareja activa, **When** está en Nosotros, **Then** sigue viendo el estado «todavía no disponible» de P0-1, ahora con el acceso a «Invitar a mi pareja» (spec 002, FR-043).

---

### User Story 4 - Ver mi parte compartida en Yo (Priority: P2)

En Yo, Sara ve «En octubre gastaste $1.912.900»: sus privados ($412.900) más su
parte de lo compartido ($1.500.000). Los gastos compartidos aparecen en su lista
con «Compartido · tu parte».

**Why this priority**: es `gasto_consumo` en la vista Yo (DEC-G04; maestro §5.1,
`personal_consumption`) y el «gasto existe una vez» del handoff.

**Independent Test**: con el dataset dorado, Inicio en Yo de Sara muestra
1.912.900 = 412.900 + 1.500.000; ninguna pantalla suma Yo + Nosotros.

**Acceptance Scenarios**:

1. **Given** el dataset dorado, **When** Sara abre Inicio en Yo, **Then** ve $1.912.900, con «Solo tuyos $412.900» y «Tu parte compartida $1.500.000» (04·1 INICIO · YO).
2. **Given** un gasto compartido, **When** aparece en Yo, **Then** su fila dice «Compartido · tu parte $X» y el importe completo, y cuenta en el total de Yo solo por la parte (04·1).
3. **Given** cualquier pantalla, exportación o agregado, **When** se calcula, **Then** nunca se suma Yo + Nosotros (handoff, criterios; US-08).
4. **Given** Tomás en Yo, **When** abre Inicio, **Then** ve sus privados más su parte (1.340.000 en el dataset), nunca los privados de Sara (handoff, tabla DEC-G04, fila de Tomás).

---

### User Story 5 - Entender el balance (S4 Shared Balance) (Priority: P1)

Sara abre el balance (en móvil desde Inicio, en escritorio desde Balance) y
entiende sin ayuda: Sara pagó 1.929.900 y le corresponden 1.500.000; Tomás pagó
910.100 y le corresponden 1.340.000; Tomás le debe a Sara 429.900. Nada parece una
competencia.

**Why this priority**: es US-16 y la S4 que el maestro §11 pone en P0-2. Depende
de Q2 y Q9.

**Independent Test**: `computeBalance` contra el dataset dorado en dominio puro; la
pantalla, en componentes y en la spec E2E 3.

**Acceptance Scenarios**:

1. **Given** el dataset dorado, **When** abre Balance, **Then** ve POR SALDAR, «Tomás le debe a Sara $429.900», una fila por persona con «Pagó X · le corresponden Y» y su estado («Le deben» / «Debe»), y la leyenda (04·2; 02·3).
2. **Given** la barra de cada persona, **When** se lee con lector de pantalla, **Then** tiene `role="img"` y un `aria-label` con las cifras completas, y la tabla de desglose está disponible (COMPONENT_SPECIFICATIONS, SharedBalance, A11y).
3. **Given** saldos en cero, **When** se muestra, **Then** dice «Al día», con LIQUIDADO, sin cifras de deuda (02·3).
4. **Given** una pareja sin gastos compartidos, **When** abre Balance, **Then** ve el estado vacío con explicación, nunca «Al día $0» (SharedBalance, «Estados»; §15.10, «Ninguna afirmación financiera sin datos»).
5. **Given** móvil, **When** se abre desde Inicio en Nosotros, **Then** es una pantalla propia con barras de 28 px; **Given** 1024 px o más, **Then** Balance es un destino del rail y del sidebar y además un módulo de Inicio con barras de 16 px (§15.3; RESPONSIVE).
6. **Given** el desglose, **When** se abre, **Then** cada gasto compartido muestra quién pagó y cuánto le corresponde a cada uno, y las liquidaciones se listan aparte con «Las liquidaciones no son gastos» (04·2).
7. **Given** cualquier texto del balance, **When** se lee, **Then** dice «Tomás le debe a Sara», nunca «Tomás está en deuda», y no hay rankings ni colores de ganador (glosario §9; US-16).

---

### User Story 6 - Registrar una liquidación (Priority: P1)

Tomás le transfiere a Sara $200.000 por fuera. Uno de los dos registra la
liquidación: «Tomás le pagó a Sara», elige «Otro» y escribe 200.000. El saldo baja
a 229.900, el gasto del mes sigue en 2.840.000 y la liquidación aparece en Actividad
como «no es un gasto». Al final del mes registran el resto y quedan al día.

**Why this priority**: es US-02, el criterio del handoff «Una liquidación parcial
Tomás → Sara 200.000 deja el consumo en 2.840.000 y el saldo en 229.900» y la mitad
de la salida interna. Depende de Q10 y Q11.

**Independent Test**: en dominio puro los dos números; la atomicidad, el límite y
la concurrencia en pgTAP e integración; el recorrido, en la spec E2E 3.

**Acceptance Scenarios**:

1. **Given** POR SALDAR, **When** se pulsa «Registrar liquidación», **Then** ve la hoja de 04·2 con la dirección fija deudor → acreedor, «Saldo pendiente: $X · puedes registrar un pago parcial», las opciones «Todo» y «Otro», la fecha, la nota opcional y el texto «Juntia no mueve dinero y la liquidación no cuenta como gasto».
2. **Given** «Otro» con 200.000, **When** se registra, **Then** el saldo pasa a 229.900, el gasto de Nosotros sigue en 2.840.000 y Actividad muestra la liquidación con «Liquidado», nunca «Pagado» (handoff, criterios; glosario §9).
3. **Given** un importe mayor que el saldo pendiente, **When** se intenta registrar, **Then** no se puede, con un mensaje que dice el máximo (§5.1).
4. **Given** la liquidación del total, **When** el servidor confirma, **Then** S4 anima el hueco que se llena, el contador baja a 0, aparece «Al día» y el badge pasa a LIQUIDADO; con movimiento reducido, el resultado final sin desplazamientos (MOTION_SYSTEM §3).
5. **Given** un fallo de red, **When** se registra, **Then** no se anima nada, aparece el toast con Reintentar y reintentar usa la misma clave (MOTION_SYSTEM §3, «Interrupción»; ADR-013 §3).
6. **Given** dos liquidaciones del total registradas a la vez por los dos, **When** llegan al servidor, **Then** una se registra y la otra se rechaza porque ya no hay saldo pendiente (§5.1; ADR-013 §3).
7. **Given** una liquidación registrada, **When** después se edita un gasto y el saldo se invierte, **Then** la liquidación no cambia y el balance muestra el saldo invertido con la sugerencia en la nueva dirección (US-10; ADR-007).

---

### User Story 7 - Corregir un gasto compartido (Priority: P2)

Sara anotó la cena con 50/50 pero era 60/40. La abre, cambia el reparto y guarda;
el saldo se recalcula y Tomás ve que la editó. Otro gasto quedó repetido: lo elimina.

**Why this priority**: US-06 y la parte «auditoría y correcciones» de P0-2 (§11).
Depende de Q12.

**Independent Test**: editar y eliminar con sesión sembrada; auditoría en SQL;
conflicto de versión entre las dos sesiones en integración.

**Acceptance Scenarios**:

1. **Given** el detalle de un gasto compartido (04·1 DETALLE, panel de 04·7), **When** se elige Editar, **Then** se ve la edición de 04·1 con el aviso «Si cambias el monto o el reparto, el balance del mes se recalcula y {otro} verá que lo editaste» y los campos de Q12.
2. **Given** una edición guardada, **When** el servidor la confirma, **Then** las partes y el saldo se recalculan en la misma operación y la auditoría guarda actor, instante, valor anterior y nuevo (§5.4).
3. **Given** dos ediciones casi simultáneas del mismo gasto, una de cada integrante, **When** llegan, **Then** la segunda con versión antigua falla y lo explica; nada se pierde en silencio (16.15 aplicada a compartidos; ADR-013 §3).
4. **Given** «Eliminar gasto» confirmado, **When** el servidor responde, **Then** el gasto queda anulado y auditado, sale de totales, listas y saldo, y las liquidaciones previas no cambian (§5.4).
5. **Given** un gasto ya liquidado, **When** se corrige, **Then** se muestra el saldo revisado (a favor o en contra) y nunca se «revierte» una liquidación (§5.4; US-10).

---

### User Story 8 - Mover un gasto privado a la pareja (Priority: P2)

Sara anotó la farmacia en Yo y luego se dio cuenta de que era de los dos. Abre el
detalle, pulsa «Mover a Pareja», elige 50/50, revisa cómo cambian los números y
confirma. Queda un solo gasto, ahora en Nosotros, pagado por Sara.

**Why this priority**: es el flujo de ADR-001 y el punto 1 de §15.6.3, que bloquea
la aceptación del slice. Depende de Q3, Q15 y Q18.

**Independent Test**: atomicidad, idempotencia, concurrencia y RLS del registro
anulado en pgTAP e integración; el recorrido, caso «Mover a Pareja» de la spec E2E 3.

**Acceptance Scenarios**:

1. **Given** el detalle de un gasto privado propio con pareja activa, **When** se muestra, **Then** tiene el botón secundario «Mover a Pareja» con la explicación de 04·10 A1; un ingreso no lo tiene (§7.3).
2. **Given** A2, **When** se muestra, **Then** el importe y el pagador son fijos («Se mantiene») y se eligen participantes y reparto (ADR-001 punto 2; Q15).
3. **Given** A3, **When** se revisa, **Then** ChangePreview muestra, solo con cifras visibles para Sara, sus privados, su parte, el gasto de Nosotros y el saldo, antes y después, más «{otro} verá {descripción} en Nosotros» (Q3; 04·10).
4. **Given** la confirmación, **When** el servidor responde, **Then** en una sola transacción el privado queda anulado y el compartido creado con referencia al anulado; nunca hay un instante con dos gastos activos (ADR-001 puntos 1 y 3).
5. **Given** un reintento con la misma clave, **When** llega, **Then** devuelve el mismo resultado y no crea otro gasto (ADR-001 punto 4).
6. **Given** el resultado A4, **When** Sara pulsa «Deshacer» dentro de la ventana de Q15 y el servidor confirma que no hay dependencias, **Then** el compartido queda anulado y el gasto vuelve a Yo; si hay dependencias, el servidor lo rechaza y lo explica (ADR-001 punto 6).
7. **Given** el registro privado anulado, **When** Tomás consulta cualquier vista o función, **Then** no lo ve; Sara lo ve solo en su historial (ADR-001, Consecuencias; 04·10 «queda solo en tu historial»).
8. **Given** un error sin conexión, **When** falla, **Then** A5 dice que no se movió, que el gasto sigue en Yo y que no se creó nada en Nosotros, con Reintentar (misma clave) y Cerrar (04·10 A5).
9. **Given** un gasto privado financiado con una meta, **When** se abre el detalle, **Then** en lugar del botón aparece la LimitNote «No se puede mover este gasto» (ADR-001 punto 7). En P0-2 no hay metas: el requisito queda preparado y su prueba llega con P0-3.

---

### User Story 9 - Cambiar de Yo a Nosotros (S1 Context Transition) (Priority: P2)

Sara toca Nosotros: la perilla se desliza, lo exclusivo de Yo sale, el número héroe
cuenta de 1.912.900 a 2.840.000 y entran el balance y el resto. Si toca otra vez a
mitad, la animación se invierte. Nunca ve un instante con datos del otro contexto.

**Why this priority**: es S1 y US-14. La decisión 10 dejó la animación para P0-2.

**Independent Test**: caso «Cambiar Yo/Nosotros» de la spec E2E 3 (sin datos
privados tras cambiar, también con prefetch y caché del cliente); el motion, en la
revisión humana con movimiento normal y reducido.

**Acceptance Scenarios**:

1. **Given** Inicio en Yo con datos, **When** se cambia a Nosotros, **Then** la coreografía de MOTION_SYSTEM §1 se ejecuta **solo después** de tener los datos de Nosotros; mientras tanto se ve el Skeleton de Nosotros, nunca cifras de Yo con títulos de Nosotros (§6.4 S1; US-14).
2. **Given** la transición en curso, **When** se vuelve a tocar el selector, **Then** se invierte desde el estado actual y el contador apunta al destino nuevo sin reiniciar (MOTION_SYSTEM §1, «Interrupción»).
3. **Given** `prefers-reduced-motion`, **When** se cambia, **Then** el cambio es inmediato, con el valor final del contador y el anuncio `aria-live` del contexto nuevo (US-17; handoff §Accesibilidad).
4. **Given** el cambio, **When** termina, **Then** el título, el número héroe, el color de contexto y la estructura corresponden al contexto nuevo en las cinco rutas (US-14).

---

### User Story 10 - Nadie fuera de la pareja ve ni cambia nada, y no cabe un tercero (Priority: P1)

Una tercera cuenta, con su sesión, llama a la API directamente: no ve la pareja, sus
gastos, partes, liquidaciones ni invitaciones. Nadie puede añadir un tercer
integrante, ni con dos aceptaciones a la vez. Ni Sara ni Tomás pueden escribir partes
o liquidaciones saltándose las operaciones de Juntia.

**Why this priority**: US-05, §5.5 y §10.1 «Base de datos/seguridad: RLS,
invitaciones, idempotencia, escritura atómica, roles» = **bloqueante**.

**Independent Test**: pgTAP con tres cuentas y peticiones reales a la API con cada
JWT; concurrencia de aceptación en integración.

**Acceptance Scenarios**:

1. **Given** una tercera cuenta, **When** consulta las vistas de `public` o llama a cualquier función con su JWT, **Then** no obtiene ningún dato de la pareja (US-05; §7.4).
2. **Given** el JWT de Tomás, **When** consulta cualquier vista, **Then** no obtiene ningún movimiento privado de Sara, ni anulado, ni por agregados (§5.5; ADR-001, Consecuencias).
3. **Given** cualquier JWT, **When** intenta `insert`, `update` o `delete` directos sobre `groups`, `group_members`, `group_invitations`, `transaction_allocations` o liquidaciones, **Then** falla (ADR-013 §2).
4. **Given** una pareja con dos integrantes, **When** una tercera cuenta acepta cualquier invitación, **Then** se rechaza (§5.5; ADR-003).
5. **Given** dos aceptaciones concurrentes de invitaciones distintas o de la misma, **When** llegan, **Then** la pareja nunca tiene más de dos integrantes activos y ninguna persona queda en dos parejas (ADR-003, «sin condiciones de carrera»).
6. **Given** un gasto compartido, **When** se intenta asignar una parte o el pago a alguien que no es integrante activo, **Then** se rechaza en la función y en la restricción (§7.3, «El cliente no puede suministrar una lista de participantes que no pertenezcan al grupo»).

### Edge Cases

- **Invitación a un correo con mayúsculas o espacios:** se compara normalizado; el enlace sigue sin revelar nada antes de entrar.
- **Invitación a mi propio correo:** no se puede crear.
- **Enlace abierto con la cuenta equivocada:** M7, sin decir para qué correo era más allá de lo que ya muestra M6 a la persona correcta.
- **Cuenta sin verificar con el correo correcto:** no puede aceptar; se le pide verificar y volver (§15.5).
- **Verificación de correo desde otro dispositivo durante el rodeo:** la intención no se pierde: al volver a abrir el enlace con sesión, se revalida todo (token, correo, caducidad, membresía y disponibilidad).
- **Invitación que vence mientras M6 está abierto:** aceptar falla con M7; la caducidad se calcula en el servidor.
- **La propietaria anula mientras Tomás acepta:** las dos operaciones se serializan sobre la pareja; gana la primera y la otra ve su resultado (M7 o «ya no se puede anular»).
- **Doble clic en «Aceptar invitación» o dos pestañas:** una sola membresía (idempotencia y unicidad).
- **El token en la URL:** no aparece en registros de la app, en analítica ni en el `Referer` de recursos externos, y no viaja en el payload RSC de otras rutas; solo su hash se guarda (§5.5; §7.4, telemetría).
- **Los dos anotan a la vez:** se guardan los dos y el saldo es la suma de ambos; la suma de saldos sigue siendo cero.
- **Una persona edita y la otra elimina el mismo gasto:** la segunda operación falla con un error que lo explica.
- **Liquidación con saldo cero:** no hay botón «Registrar liquidación»; se ve «Al día».
- **Liquidación mientras la otra persona edita un gasto que cambia el saldo:** se serializan sobre la pareja; la liquidación se valida contra el saldo vigente en ese instante.
- **Saldo invertido tras una corrección:** la sugerencia cambia de dirección; ninguna liquidación anterior se reescribe (US-10).
- **Importe máximo:** $999.999.999 compartido al 50/50 o al 33/67 produce partes exactas que suman el total, según Q8.
- **Fecha futura en un gasto compartido:** se permite como en privado (16.13) y cuenta en su mes.
- **Mover a Pareja de un gasto editado en otra pestaña:** falla por versión y no mueve nada.
- **Mover a Pareja sin pareja activa:** el botón no aparece.
- **Deshacer de Mover después de que el otro editó el compartido:** se rechaza (Q15).
- **Cookie de contexto en `us` sin pareja:** estado «todavía no disponible» de P0-1, sin leer datos.
- **Cookie en `us` de una pareja de la que la persona ya no es integrante** (no ocurre en P0, por ADR-003, pero la lectura lo comprueba): el servidor verifica la membresía activa en cada lectura y no muestra nada del grupo.
- **Fallo ambiguo al guardar** (gasto compartido, liquidación, mover): se aplica la regla de la 002 (decisión del fundador del 5 de noviembre y F45-1): campos bloqueados, solo se reintenta lo mismo con la misma clave, y cerrar pregunta «¿Cerrar sin confirmar?».
- **Un gasto compartido anotado en un mes que no es el visible:** tras guardar se lleva a Actividad en el mes del gasto con el aviso y el resaltado (F45-2).
- **Listas largas:** cientos de gastos compartidos en un mes se leen por cursor, sin duplicados ni saltos (F44-2).

## Requirements *(mandatory)*

### Functional Requirements

#### Base de datos, seguridad y acceso a datos (ADR-013)

- **FR-001**: Las tablas de P0-2 (`groups`, `group_members`, `group_invitations`, `transaction_allocations` y la de liquidaciones si el plan la separa) viven en `juntia_data`, con RLS en todas, y son **tablas controladas**: solo las escriben funciones `security definer` de `juntia_private` propiedad de `juntia_writer` (ADR-013 §1, §2).
- **FR-002**: El plan decide y documenta **antes de migrar** si las liquidaciones viven en `transactions` (tipo `settlement`, con `from_user_id` y `to_user_id`) o en una tabla propia, con las restricciones `check` que fuerzan las combinaciones legales (§7.3, «Contrato por tipo»; ADR-013, «Qué no decide»).
- **FR-003**: Las auxiliares de membresía («¿es integrante activo de este grupo?») viven en `juntia_private`, devuelven solo un booleano, tienen `search_path = ''` y evitan la recursión entre las políticas de `groups` y `group_members` (ADR-013 §5.1).
- **FR-004**: Restricciones e índices protegen por cualquier camino: `couple` con como máximo dos integrantes activos; una pareja activa por persona; una invitación activa por pareja; token guardado solo como hash y único; partes que suman exactamente el importe (trigger diferido); partes y pagador solo de integrantes activos; liquidación entre dos integrantes distintos del mismo grupo y en su moneda; gasto de grupo en la moneda del grupo; `income` siempre privado (§5.5, §7.3; ADR-013 §2.4).
- **FR-005**: La restricción `transactions_private_only_p0_1` de la 002 se retira y la RLS de `transactions` añade la rama de grupo: un integrante activo lee los movimientos de su grupo; nadie lee los privados de otra persona, tampoco anulados (spec 002, data-model §2.3; ADR-001, Consecuencias).
- **FR-006**: Toda operación que cambia el saldo, la membresía o las invitaciones bloquea la **raíz del grupo** antes de leer saldos o membresías; Mover a Pareja bloquea además el movimiento privado, en el orden determinista que fije el plan (ADR-013 §3.2 y §3.3).
- **FR-007**: Los importes cruzan la frontera como texto (partes, saldos, liquidaciones, vista previa), con la prueba de ida y vuelta de `9007199254740993` en las vistas y funciones nuevas (ADR-013 §4).
- **FR-008**: Ningún camino que atiende a una persona usa `service_role` (ADR-013 §5.8).
- **FR-009**: Las funciones nuevas añaden sus códigos de error a la tabla de la 002 y su copy a `src/lib/copy/es.ts` (ADR-013 §6.3).

#### Pareja e invitaciones (§5.5, §15.5, ADR-003; 04·15)

- **FR-010**: La pareja es un grupo de tipo `couple`, moneda COP y zona `America/Bogota`, con la propietaria (`owner`) y un integrante (`member`). Cuándo se crea, según Q13 (§5.5, §7.3).
- **FR-011**: Solo la propietaria crea y anula invitaciones; una invitación tiene correo destino normalizado, hash del token, caducidad de 7 días, un solo uso y estado (pendiente, aceptada, anulada, vencida) (§15.5).
- **FR-012**: El token se genera con un generador criptográfico, se muestra **una sola vez** en el enlace de M3b y nunca se guarda en claro; el enlace no se puede volver a leer del servidor salvo regenerando la invitación según la regla de «una activa» (§5.5). Cómo funciona «Copiar enlace» en M4 sin token en claro lo resuelve el plan, sin guardar el token.
- **FR-013**: Aceptar es una operación atómica e idempotente que revalida token, correo de una cuenta verificada, caducidad, estado, membresía y disponibilidad de la pareja, añade al integrante y marca la invitación como usada (§7.3, «Operaciones críticas»; handoff).
- **FR-014**: Antes de entrar no se muestra nada de la pareja ni de quien invita (M5); tras entrar, la intención vuelve a la invitación y se revalida (handoff, «Sin sesión»). Las respuestas de error son las mismas para todos los motivos (M7), sin enumerar.
- **FR-015**: Mi pareja muestra los estados M1–M7 de 04·15 con CoupleStatus (ACTIVA, PENDIENTE, SOLO TÚ, NO VÁLIDA), SensitiveActionConfirmation para «Anular» y la LimitNote de «Salir de la pareja» (decisión 16.6; ADR-003).
- **FR-016**: Se puede invitar desde Mi pareja, desde el estado de Nosotros sin pareja y desde la primera entrada (A6), que recupera «Invitar a mi pareja» de 04·17: la spec 002 lo quitó solo porque en P0-1 no existía la pareja (spec 002, Q6), y la anatomía de Cuenta y Acceso está aprobada (decisión 16.6). Se aprueba viendo la pantalla en el PR B.
- **FR-017**: Los colores de persona se asignan por orden de ingreso: la propietaria `person.1`, el integrante `person.2`, cada uno con su patrón de tramo (DESIGN_SYSTEM §1.2; Q8 usa el mismo orden para el desempate).

#### Gastos compartidos y repartos (§5.1, §5.2, §15.5; 02·5)

- **FR-018**: Un gasto compartido tiene grupo, pagador (integrante activo, según Q6), importe, categoría, fecha, descripción, partes por integrante y versión; nace con su reparto en una operación atómica e idempotente (§5.4, §7.3).
- **FR-019**: Los modos de reparto son 50/50, Porcentaje e Importe; las partes se calculan en el dominio con el algoritmo de mayor residuo de ADR-002, con la granularidad y el desempate de Q8, y la función SQL las vuelve a comprobar (ADR-013 §6.2).
- **FR-020**: El dominio tiene una función pura de reparto con pruebas de propiedad: para cualquier importe válido, modo y participantes, las partes suman exactamente el importe y el resultado es determinista (§5.2).
- **FR-021**: Anotar en Nosotros añade contexto, pagador, participantes y reparto con la preselección de Q5, y el error E3 con la cifra exacta que falta o sobra (02·5; Q4).
- **FR-022**: Editar un gasto compartido usa control de versión y recalcula partes y saldo en la misma operación, con auditoría; quién y qué campos, según Q12. El contexto no cambia (ADR-001 punto 8).
- **FR-023**: Eliminar un gasto compartido lo anula con auditoría y lo excluye de totales, listas, saldo y búsquedas; las liquidaciones previas no cambian (§5.4).
- **FR-024**: «Deshacer» de 6 s tras anotar un gasto compartido lo anula con auditoría, como en P0-1 (spec 002, FR-034).

#### Saldos y liquidaciones (§5.1, §15.5, ADR-007; 02·3, 04·2)

- **FR-025**: `computeBalance(expenses, settlements, members)` es una función pura del dominio que devuelve, por integrante, pagado, le corresponde, liquidaciones enviadas y recibidas y `net_owed`, con `net = pagado − corresponde + enviadas − recibidas`, y la suma de los `net` es cero (§5.1; handoff, «Orden de implementación»; COMPONENT_SPECIFICATIONS, «Cálculo P0»). El periodo, según Q9.
- **FR-026**: La sugerencia de liquidación es única y determinista: quien tiene `net < 0` → quien tiene `net > 0` por `|net|`; nunca crea una transferencia (§15.5).
- **FR-027**: Registrar una liquidación es atómico e idempotente; valida dos integrantes activos distintos, la moneda del grupo, la dirección deudor → acreedor y un importe positivo ≤ saldo pendiente, todo bajo el bloqueo del grupo (§5.1; ADR-013 §3). Quién la registra y su fecha, según Q10.
- **FR-028**: Una liquidación no se edita; su corrección, según Q11 (ADR-007).
- **FR-029**: Las liquidaciones no cuentan en `gasto_consumo`, `group_total`, categorías ni presupuestos, y se muestran aparte con «Liquidado» y «no es un gasto» (§5.1; handoff, reglas de UI).
- **FR-030**: Tras cualquier corrección se recalcula el saldo; si se invierte, se muestra invertido y la sugerencia cambia de dirección (US-10).

#### Mover a Pareja (ADR-001; 04·10, 04·12, 04·13)

- **FR-031**: Mover a Pareja es una sola operación atómica e idempotente que anula el privado y crea el compartido con referencia al anulado, conserva el pagador y la fecha, y escribe auditoría; nunca hay dos gastos activos (ADR-001 puntos 1–5).
- **FR-032**: Se ofrece desde el detalle de un gasto privado propio (A1) y desde Editar al cambiar Contexto a Nosotros, solo con pareja activa y nunca para ingresos (handoff; COMPONENT_SPECIFICATIONS, «Reclasificar»; §7.3).
- **FR-033**: A2 con importe y pagador fijos y la elección de participantes y reparto; A3 con ChangePreview (según Q3); A3b con los campos bloqueados; A4 con la fila «movido desde Yo» y el toast con Deshacer; A5 con el error sin conexión (04·10).
- **FR-034**: Deshacer de Mover a Pareja es una operación propia, atómica e idempotente, disponible según la ventana y las dependencias de Q15; restaura el gasto en Yo como un registro nuevo y conserva toda la auditoría (ADR-001 punto 6).
- **FR-035**: El bloqueo por financiación de meta (ADR-001 punto 7) queda como comprobación en la función desde P0-2; su LimitNote y su prueba con datos llegan con P0-3, cuando existan las metas.
- **FR-036**: El privado anulado sigue invisible para el otro integrante en cualquier vista, función o agregado (ADR-001, Consecuencias).

#### Contexto y privacidad de lectura (lecciones F44-1; US-14)

- **FR-037**: En el contexto Nosotros, el servidor **no consulta** movimientos privados: las vistas de Nosotros leen solo movimientos con grupo, y Inicio, Actividad, el detalle, Balance, el buscador y los filtros de Nosotros no construyen ninguna vista privada (handoff, reglas de UI; spec 002, F44-1).
- **FR-038**: El contexto de la página lo decide la cookie `juntia_context` como en la 002, y además el servidor comprueba la **membresía activa** antes de leer datos del grupo; sin membresía, Nosotros muestra el estado sin pareja (spec 002, F44-1).
- **FR-039**: Ni el HTML ni el payload RSC ni ningún prefetch de una ruta en Nosotros contienen descripciones, importes ni identificadores de movimientos privados de ninguno de los dos, ni con la cookie ausente, no válida o en discrepancia con el dispositivo (spec 002, F44-1, segunda ronda).
- **FR-040**: Cambiar de contexto nunca muestra, ni un fotograma, datos del contexto anterior bajo títulos del nuevo; la caché del cliente de un contexto no se reutiliza en el otro (US-14; §6.4 S1).
- **FR-041**: Los mensajes de error, los avisos (toasts), la vista previa y la auditoría visible para el otro nunca contienen datos privados de quien escribe (ChangePreview: «nunca privados del otro»).

#### Lecturas paginadas (lección F44-2)

- **FR-042**: Las listas de Nosotros (Actividad del mes, desglose del balance, historial de liquidaciones) se leen por cursor con orden total estable, sin duplicados ni saltos entre páginas aunque se inserten o anulen filas durante la lectura; un fallo a mitad falla la lectura entera (spec 002, F44-2, `readByCursor`).
- **FR-043**: Los totales y el saldo se calculan sobre el conjunto completo, nunca sobre la primera página.

#### Inicio, Actividad y Balance (04·1, 04·2, 04·6, 04·7, 04·9)

- **FR-044**: Inicio en Nosotros según 04·1 INICIO · NOSOTROS: número héroe del gasto compartido del mes, saldo POR SALDAR con «Ver balance», en qué se fue y recientes, sin los bloques de metas (P0-3) ni «apartaron» (P0-3).
- **FR-045**: Inicio en Yo según 04·1 INICIO · YO: `gasto_consumo` de Yo (privados + parte) con «Solo tuyos» y «Tu parte compartida», y las filas compartidas con «Compartido · tu parte» (DEC-G04; US-4).
- **FR-046**: Actividad en Nosotros con gastos compartidos y liquidaciones, filtros, buscador y flechas de mes como en P0-1; tabla de escritorio con «Pagó · Reparto» y panel de detalle con «A quién le corresponde» (04·1, 04·7).
- **FR-047**: Balance: pantalla propia en móvil (desde Inicio) y destino del rail y del sidebar desde 1024, además del módulo de Inicio; estados por saldar, al día, sin gastos compartidos, cargando y error (§15.3; 04·2; RESPONSIVE).
- **FR-048**: Metas y Plan en Nosotros siguen con su estado provisional hasta P0-3, sin cifras.
- **FR-049**: Ninguna pantalla de P0-2 muestra presupuesto, «restante», «excedido», «te alcanza» ni límite cero (DEC-R01; DEC-R17).

#### S1 y S4 (MOTION_SYSTEM §1 y §3)

- **FR-050**: S1 Context Transition con su coreografía, su interrupción reversible y su fallback de movimiento reducido; se anima solo con los datos del contexto nuevo ya recibidos (§6.4).
- **FR-051**: S4 Shared Balance anima solo después de la confirmación del servidor; con error no anima nada y ofrece Reintentar; con movimiento reducido muestra el estado final (§6.4; MOTION_SYSTEM §3).
- **FR-052**: E5 de un gasto compartido anima el total, la fila y el saldo que se tacha y se actualiza (02·5); los dos momentos L2 del producto no cambian (MOTION_SYSTEM, «Contención»).

#### Copy, accesibilidad y responsive

- **FR-053**: Todo el copy nuevo vive en `src/lib/copy/es.ts` y respeta las palabras prohibidas del glosario §9 («le debe», nunca «está en deuda»; «Liquidado», nunca «Pagado»; «Porcentaje 55/45», nunca «Proporcional») (`docs/CONVENTIONS.md` B.1).
- **FR-054**: Sin scroll horizontal en 360, 390, 430, 768, 1024, 1280 y 1440 px; texto al 200 %; objetivos de 44 px; teclado completo (segmentados con flechas, hojas con Escape, `N` para Anotar); `aria-live` para guardados, liquidaciones y cambio de contexto; personas con color + patrón + inicial (§15.7; handoff §Accesibilidad).
- **FR-055**: Los dos temas en todas las pantallas nuevas (04·5, 04·8, 04·13).

#### Integridad de las escrituras compartidas (lecciones de la 002)

- **FR-056**: **Toda** escritura compartida —crear, editar y anular gasto compartido, deshacer, registrar y corregir liquidación, mover y deshacer mover, crear, anular y aceptar invitación— lleva clave de idempotencia con huella; misma clave y otra huella falla con su error (ADR-013 §3.1).
- **FR-057**: Toda edición de un registro compartido lleva versión; una versión vieja falla y la interfaz lo explica (16.15; ADR-013 §3.5).
- **FR-058**: Los errores `40P01` y `40001` se reintentan en servidor con la misma clave un número acotado de veces (ADR-013 §3.4).
- **FR-059**: En el cliente, la clave nace al abrir cada hoja o diálogo y se reutiliza en cada reintento; tras un fallo ambiguo, los campos se bloquean y cerrar pregunta antes (spec 002, decisión del fundador del 5 de noviembre y F45-1).

#### Estado del cliente que sobrevive a la navegación (lecciones F43-1 y F45-2)

- **FR-060**: Los avisos con «Deshacer» de gasto compartido, liquidación y Mover a Pareja, y el resaltado de la fila nueva, sobreviven a una navegación dentro de la app; una respuesta tardía nunca pisa el aviso de una operación posterior (spec 002, evidencia del PR D).
- **FR-061**: Si el registro nuevo no está visible en la pantalla actual, se lleva a Actividad en el contexto y el mes del registro, con el aviso y el resaltado (F45-2).
- **FR-062**: Cambiar de contexto con una hoja abierta no cambia el contexto de la hoja ya abierta: la hoja guarda lo que la persona eligió en ella.

#### Pruebas y CI (ADR-011, `docs/TESTING.md`)

- **FR-063**: pgTAP para cada función nueva: éxito, rechazo por RLS con una tercera cuenta, repetición idempotente, misma clave con otra huella, cada validación y la invariante de dos integrantes (ADR-013, Consecuencias).
- **FR-064**: Integración de servidor para la concurrencia: dos aceptaciones, dos liquidaciones del total, edición contra edición, edición contra liquidación, Mover a Pareja contra edición, y la ausencia de ventana con dos gastos activos (§15.6.3 puntos 1 y 2).
- **FR-065**: Dominio puro: `computeBalance` y el reparto contra el dataset dorado de P0-2 y con pruebas de propiedad (suma cero; partes exactas) (ADR-011, fila 4).
- **FR-066**: La siembra crea **una pareja aislada por worker** y un `storageState` por worker y por rol, Sara y Tomás (`docs/TESTING.md` §5, reglas 1 y 2). Mientras se itera, las capas de base de datos corren contra `juntia-dev` con sus guardias (decisión 18); el gate es CI.
- **FR-067**: Nace la **spec E2E 3** «Pareja 50/50 y liquidación», con los casos «Cambiar Yo/Nosotros» y «Mover a Pareja» de la matriz, y la spec E2E 1 suma el caso «Invitación → login → volver → aceptar» (`docs/TESTING.md`, «Tope» y «Matriz»).
- **FR-068**: axe en todas las rutas y estados nuevos, en los dos temas, incluida Balance (handoff, criterios).

#### Fuera de alcance (explícito)

- Presupuestos, Spending Story, metas, aportes, gasto con meta, `total_destinado_neto`, Análisis y exportación de lo compartido (P0-3).
- Salir de la pareja, expulsar, transferir la propiedad y `member_history_snapshots` (ADR-003).
- Grupos de 3 o más y optimización de liquidaciones para N (P1).
- «Mover a Yo», ingresos compartidos, multimoneda, reembolsos parciales, adjuntos y recurrentes.
- Notificaciones, correos propios y tiempo real (§15.5; según Q16).
- Eliminar cuenta (bloqueo legal, §15.6.1).

### Key Entities

- **Pareja (grupo `couple`)**: tipo, moneda, zona horaria, propietaria, fecha de creación y versión. Máximo dos integrantes activos.
- **Integrante**: persona, pareja, rol (`owner` o `member`), estado, fecha de ingreso y orden de ingreso (que da el color y el desempate).
- **Invitación**: pareja, correo destino normalizado, hash del token, caducidad, estado, quién la creó, quién la aceptó y cuándo.
- **Gasto compartido**: movimiento con grupo, pagador, importe, categoría, fecha, descripción, estado, versión y, si viene de Mover a Pareja, la referencia al privado anulado.
- **Parte**: gasto, integrante e importe exacto; las partes de un gasto suman su importe.
- **Liquidación**: grupo, de quién, a quién, importe, fecha, nota opcional, autor, estado y, según Q11, su anulación.
- **Saldo**: no se guarda; se deriva con `computeBalance` de gastos, partes y liquidaciones activos.
- **Registro de auditoría** e **idempotencia**: los de la 002, ampliados a las operaciones nuevas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A 360, 390, 430, 768, 1024, 1280 y 1440 px, en los dos temas, cada pantalla nueva se ve sin scroll horizontal ni solapamientos; las capturas de 390 y 1440 en los dos temas van en cada PR de implementación y los dos fundadores las aprueban, incluidos los `[P]` de la tabla de abajo (§15.7; §15.9).
- **SC-002**: Cero violaciones serias o críticas de axe en todas las rutas y estados nuevos, en los dos temas, incluida Balance (handoff, criterios).
- **SC-003**: Con el dataset dorado de P0-2, Nosotros muestra exactamente 2.840.000 y el desglose por categoría; Balance, Sara +429.900 / Tomás −429.900; tras la liquidación parcial, saldo 229.900 y consumo 2.840.000; Yo de Sara, 1.912.900 (handoff, criterios; dataset dorado).
- **SC-004**: En las pruebas de propiedad, el 100 % de los casos generados da partes que suman exactamente el importe y saldos que suman cero.
- **SC-005**: Cero datos privados de cualquiera de los dos en el HTML, el payload RSC, las vistas y las funciones de Nosotros, con las cookies de contexto válida, ausente y no válida (FR-037 a FR-041).
- **SC-006**: Cero registros duplicados en las pruebas de doble envío y reintento de cada escritura compartida (FR-056).
- **SC-007**: Cero actualizaciones perdidas en las pruebas de concurrencia de FR-064; cero parejas con más de dos integrantes activos y cero personas en dos parejas.
- **SC-008**: Cero instantes con dos gastos activos en las pruebas concurrentes de Mover a Pareja (§15.6.3 punto 1).
- **SC-009**: Cero lecturas paginadas con filas duplicadas o saltadas en las pruebas de cursor con inserciones y anulaciones entre páginas.
- **SC-010**: INP menor de 200 ms al abrir Anotar en Nosotros y al guardar un gasto compartido; CLS = 0 en las cargas con Skeleton de Inicio en Nosotros, Actividad en Nosotros y Balance (§15.7). Medidos en laboratorio y reportados como tal.
- **SC-011**: S1 y S4 completamente usables con movimiento reducido, con el valor final en el DOM (US-17).
- **SC-012**: Los dos fundadores aprueban la salida interna: forman su pareja con sus cuentas reales, anotan gastos compartidos (uno 70/30 o 55/45), registran una liquidación parcial y otra completa y explican sin ayuda quién debe cuánto (maestro §11; US-16; escenario de pareja de §4).
- **SC-013**: Las `[V]` de la tabla «Inventario de `[V]`» tienen salida real en la evidencia del slice.

## Assumptions

- **Contexto por defecto:** la preferencia de la 001 y la cookie de la 002 siguen igual; Nosotros se habilita con la pareja activa.
- **Una pareja activa por persona** desde el primer día; nadie sale en P0 (ADR-003).
- **Sin datos compartidos anteriores:** la pareja empieza sin historia; los gastos privados anteriores solo pasan a Nosotros con Mover a Pareja.
- **Anotar en Nosotros** usa el mismo catálogo de categorías que en privado, sin «Ingresos» (§7.3).
- **La auditoría visible** en el detalle se limita a «Anotado por X · fecha» y «Editado por X · fecha» (04·1); los valores anteriores quedan en `audit_events` (según Q12).
- **Las pantallas que no están diseñadas** (error de liquidación mayor que el saldo, saldo invertido, Balance sin gastos compartidos, M7 por pareja propia pendiente) se componen con primitivos y patrones aprobados y se aprueban viendo la pantalla en su PR (§15.9).
- **La revisión visual humana** es el gate de «Visual y motion», fuera de CI (ADR-011 §7), con la pasada de Impeccable de cada PR de implementación.
- **Las verificaciones de dispositivo** aplazadas por la decisión 19 siguen aplazadas hasta MVP-1; P0-2 no las hereda como bloqueantes.
- **El despliegue** sigue la decisión 13 (merges de la dueña con «Create a merge commit»).

---

## Dataset dorado de P0-2

Octubre de 2026, contexto Nosotros de Sara (propietaria, `person.1`) y Tomás
(integrante, `person.2`). Importes, pagadores, repartos y partes **copiados** de
`COMPONENT_SPECIFICATIONS.md`, «Datos de referencia»; categorías y fechas de 04·1,
04·7 y del desglose de Inicio (Hogar 1.600.000 · Mercado 640.000 · Servicios
360.000 · Restaurantes 240.000) (§15.10, «Dataset dorado», regla 1).

| Fecha | Descripción | Categoría | Pagó | Reparto | Sara | Tomás | Importe |
| --- | --- | --- | --- | --- | ---: | ---: | ---: |
| 1 oct | Arriendo | Hogar | Sara | Porcentaje 55/45 | 880.000 | 720.000 | 1.600.000 |
| 12 oct | Mercado del mes | Mercado | Tomás | 50/50 | 226.800 | 226.800 | 453.600 |
| 18 oct | EPM | Servicios | Tomás | 50/50 | 135.050 | 135.050 | 270.100 |
| 21 oct | Internet fibra | Servicios | Sara | 50/50 | 44.950 | 44.950 | 89.900 |
| 23 oct | Cena en Carmen | Restaurantes | Sara | 50/50 | 120.000 | 120.000 | 240.000 |
| 24 oct | Carulla Laureles | Mercado | Tomás | 50/50 | 93.200 | 93.200 | 186.400 |
| **Total** | | | S 1.929.900 · T 910.100 | | **1.500.000** | **1.340.000** | **2.840.000** |

- **Saldo:** Sara +429.900 · Tomás −429.900 → «Tomás le debe a Sara 429.900 · POR SALDAR». Antes de Carulla, 523.100 (02·5 E5).
- **Liquidación parcial:** Tomás → Sara **200.000**, el **25 de octubre** (la fecha la define esta spec, regla 2; el diseño no la da). Después: saldo **229.900** y gasto de Nosotros **2.840.000** (handoff, criterios).
- **Yo de Sara:** 412.900 privados (parte de P0-1, sin cambios) + 1.500.000 de parte = **1.912.900**.
- **Yo de Tomás:** parte 1.340.000; sus privados no están en el dataset y no se estiman (handoff, «No disponible»).
- **No forman parte del dataset:** la liquidación de septiembre «Sara → Tomás 312.000» que decora 04·2, los aportes (P0-3) y el ejemplo de Mover a Pareja (Q18).
- La parte queda **completada por P0-2** cuando el módulo `src/domain/golden/` la contenga con las pruebas que la consumen (regla 4).

## Inventario de `[P]` que toca P0-2

Clasificación en los dos ejes del maestro §15.9.

| Elemento `[P]` | ¿Afecta al alcance? | ¿Requiere aprobación antes de implementar? | Situación en P0-2 |
| --- | --- | --- | --- |
| SharedBalance · «Balance pagó vs. corresponde» | **Sí** — P0-2 | **Sí** | **Abierto: Q2.** Se resuelve antes del plan |
| ChangePreview | **Sí** — P0-2 / P0-3 | **Sí** | **Abierto: Q3.** ADR-001 ya lo menciona; se resuelve antes del plan |
| Anotar gasto (flujo E1–E5), versión compartida | **Sí** | **Sí** | **Abierto: Q4.** La versión privada está aprobada (16.2) |
| Sección Cuenta: CoupleStatus, SensitiveActionConfirmation, LimitNote | **Sí** — P0-2 (pareja) | **Sí** | **Aprobada** la anatomía (decisión 16.6); se aprueban las pantallas de Mi pareja viendo el PR B |
| Personas configurables, escalables a N (+ patrón) | No | **Sí** | P0-2 usa `person.1–2` y sus patrones de tramo en barras y avatares; se aprueba viendo las pantallas del PR D. `person.3–6` no se usan |
| Sara lila → petróleo y demás paleta | No | **Sí** — viendo la pantalla | Primera vez que se ven dos personas juntas: se aprueba en las capturas de los PR B a D |
| Gasto, ingreso y liquidación en tinta | No | **Sí** — viendo la pantalla | Primera vez que aparece una liquidación: se aprueba en el PR D |
| Texto ampliado hasta 200 % | No | **No** — requisito obligatorio | Se aplica y se prueba (FR-054) |

No tocados por P0-2: GoalStack, FundingLedger, ConfirmationBadge, PlanningNote,
persistencia del tema y teclado del monto (ya cerrados) y Spline Sans Mono.

**Tres `[P]` que afectan al alcance quedan abiertos (Q2, Q3, Q4)**: el plan no
empieza sin su respuesta.

## Inventario de `[V]` que toca P0-2

**Deciden cómo se construye — se ejecutan antes de cerrar el plan:**

| `[V]` | Fuente | Qué hay que ejecutar |
| --- | --- | --- |
| Auxiliar de membresía sin recursión | ADR-013 §5.1 | Prototipo en `juntia-dev` (decisión 18): políticas de `groups` y `group_members` con la auxiliar `security definer`, sin recursión, para `authenticated` y `juntia_writer` |
| Bloqueo del grupo como raíz | ADR-013 §3 | Que dos liquidaciones del total concurrentes se serializan con el bloqueo elegido y la segunda falla |
| Retorno tras el login con la intención | Handoff, «Sin sesión» | Que el `next` de la 002 conserva el enlace de invitación tras entrar, crear la cuenta y verificarla, sin abrir una redirección a otro origen (lección F43-3) |

**Comprueban lo construido — se ejecutan durante la implementación:**

| `[V]` | Fuente | Qué se comprueba |
| --- | --- | --- |
| Conversión privado → compartido | ADR-001; handoff, Pendiente; §15.6.3 punto 1 | Transacción única, concurrencia, idempotencia y RLS del registro anulado |
| Idempotencia de las escrituras que mueven dinero | §15.6.3 punto 2 | Las de FR-056 |
| Tests de `computeBalance` | COMPONENT_SPECIFICATIONS, SharedBalance | Contra el dataset dorado y con propiedades |
| ADR-013 [V] 1, 2, 3, 4, 5, 6 y 7 sobre las tablas nuevas | ADR-013 | `juntia_writer`, escritura directa imposible, atomicidad, concurrencia, idempotencia, importes de ida y vuelta y privilegios efectivos |
| Umbrales de §15.7 | Maestro §15.7 | SC-010 y FR-054 |
| Presupuestos de tiempo | ADR-011; decisión 19.5 | `verify`, SQL/RLS y el job `e2e` con la spec 3 (< 480 s) |

## Verificaciones de §15.6.3 que aplican a P0-2

| Punto de §15.6.3 | ¿Aplica? |
| --- | --- |
| 1. Atomicidad de Mover a Pareja | **Sí** (US-8; FR-031; SC-008) |
| 2. Idempotencia de las escrituras que mueven dinero | **Sí**: gasto compartido, liquidación, Mover a Pareja y sus deshacer y correcciones (FR-056; SC-006) |
| 3. `goal_usage_confirmations` | No — P0-3 |
| 4. RLS de metas | No — P0-3. **Sí** la RLS de grupo, membresía e invitaciones (US-10) |
| 5 y 6. Gasto con meta | No — P0-3 |
| 7. Ediciones concurrentes de presupuesto | No — P0-3. **Sí** el equivalente en gastos compartidos (FR-057) |

## ADR, erratas y conflictos

- **ADR que aplican:** ADR-001, ADR-003 y ADR-013 (archivo), ADR-002 y ADR-007 (maestro §12.2), ADR-011 y ADR-012. **ADR nuevo:** ninguno es necesario si los fundadores responden Q8 y Q11 como recomienda la tabla; si consideran que Q8 (pesos enteros) o Q11 (anular liquidaciones) es una decisión nueva frente a ADR-002 o ADR-007, el plan propone un ADR corto **antes** de implementarla (`AGENTS.md` 17).
- **Erratas pendientes del paquete:** ninguna (`docs/design/README.md`).
- **Lecturas registradas para la revisión** (ninguna bloquea; donde hay conflicto, manda el documento superior):
  1. **02·5 E5 en Nosotros muestra «Didi a Envigado · Privado» en Recientes.** Contradice la regla del handoff y del maestro §5.5: los privados nunca se renderizan en Nosotros. Manda la regla; la fila no se construye (FR-037).
  2. **El rótulo «Octubre» del Balance** frente al `net_owed` sin periodo del maestro: Q9.
  3. **«Lo último usado» de 02·5** frente a «nunca se asume 50/50» y «sin reparto por defecto» de §15.5: Q5.
  4. **«Liquidaciones inmutables» (ADR-007)** frente a la necesidad de corregir un error: Q11.
  5. **ChangePreview `[P]`** frente a ADR-001 aceptado, que ya lo describe: Q3.
  6. **El ejemplo de Mover a Pareja** frente al dataset dorado de P0-1: Q18.
  7. **El hito de los presupuestos de CI** de `docs/TESTING.md` frente al reparto de DEC-G04 entre P0-2 y P0-3: Q17.

## Specs E2E que añade P0-2

**Una**, dentro del máximo de 2 por especificación (ADR-011 §3).

| | Antes de P0-2 | P0-2 añade | Después |
| --- | ---: | ---: | ---: |
| Specs E2E existentes | 2 (1 «Acceso y Mi cuenta», 2 «Anotar gasto, cronometrado») | 1 (spec 3 «Pareja 50/50 y liquidación») | 3 |

| PR (según Q1) | Spec E2E |
| --- | --- |
| A · Base de datos, seguridad y dinero | Ninguna; crece la siembra (`seedCouple()`) y el `storageState` por rol |
| B · Mi pareja e invitaciones | La **spec 1** suma el caso «Invitación → login → volver → aceptar» |
| C · Gastos compartidos y Mover a Pareja | Ninguna nueva: el recorrido completo todavía no existe sin Balance. La spec 2 sigue corriendo en Yo |
| D · Balance, liquidaciones, S1 y S4 | **Nace la spec 3**: anotar 50/50, ver el saldo, liquidación parcial, y los casos «Cambiar Yo/Nosotros» (sin privados tras cambiar, con prefetch y caché) y «Mover a Pareja» |

Quedan **dos plazas** del tope de 4–6: la spec 4 (metas) y la 5 (presupuestos) de
P0-3, y la sexta libre. Con tres specs, el hito de los presupuestos de tiempo se
alcanza al cierre de P0-2, según Q17.

## Criterios de aceptación aplicables

### Del handoff («Criterios de aceptación (solo P0)»)

| Criterio | ¿Aplica a P0-2? |
| --- | --- |
| Mi cuenta: los criterios de 05·9 | **Sí**, la parte de pareja (FR-015) |
| DEC-G04: `total_destinado_neto`… | No — P0-3. **Sí** `gasto_consumo` en Yo y Nosotros (FR-044, FR-045) |
| Un gasto compartido existe una vez (total en Nosotros, parte en Yo); ninguna pantalla, export ni agregado suma Yo + Nosotros. | **Sí** (US-4; SC-003) |
| Los aportes no cambian `gasto_consumo`… | No — P0-3 |
| Una liquidación parcial Tomás → Sara 200.000 deja el consumo en 2.840.000 y el saldo en 229.900. | **Sí** (US-6; SC-003) |
| Un gasto con meta… · Usar o retirar aportes ajenos… · Un retiro nunca se presenta como ingreso. | No — P0-3 |
| Anotar registra privado o compartido desde un solo flujo; la reclasificación privado → compartido deja un único gasto activo y un registro de auditoría. | **Sí** (US-2, US-8; Q4) |
| No se puede crear un espacio compartido con más de 2 integrantes. | **Sí** (US-10; SC-007) |
| El saldo de la pareja reproduce el caso de octubre incluyendo una liquidación parcial; la sugerencia es única y no crea transferencias. | **Sí** (US-5, US-6; FR-026) |
| Ambos integrantes pueden crear, editar y desactivar un presupuesto… | No — P0-3 |
| Los dos temas pasan axe sin violaciones serias en Inicio, Actividad, Anotar, Balance y Meta. | **Sí**, salvo Meta (P0-3) (SC-002) |
| Todos los momentos de motion respetan `prefers-reduced-motion`. | **Sí** (SC-011) |
| Los datos del caso de octubre reproducen exactamente los totales mostrados en el diseño. | **Sí**, la parte de P0-2 (SC-003); el ejemplo de Mover, según Q18 |

### Del maestro §15.7 (umbrales que bloquean la aceptación)

| Umbral | ¿Aplica a P0-2? |
| --- | --- |
| CLS = 0 en las cargas con skeleton de las rutas clave | **Sí** (SC-010) |
| INP < 200 ms al abrir Anotar y al guardar | **Sí**, también en Nosotros (SC-010) |
| Mediana < 10 s para un gasto habitual en teléfono real (US-12) | Aplazada por la decisión 19.1 hasta MVP-1; P0-2 no la cambia y mantiene la ruta de 2 toques (US-2, escenario 7) |
| Sin scroll horizontal en 360, 390, 430, 1024 y 1440 | **Sí** (SC-001) |
| Objetivos táctiles ≥ 44 px | **Sí** (FR-054) |

### Del maestro §10.3, §11 y CLAUDE.md 11

P0-2 se acepta con la RLS de grupo, las invariantes y la atomicidad de Mover a
Pareja con salida registrada (SC-005 a SC-009, SC-013) y con la salida interna
aprobada por los dos (SC-012). Los datos reales compartidos se usan después de esas
salidas y de la copia semanal de la 002 (16.11, 19.3). El gate premium completo
rige el lanzamiento MVP-1, no este slice.
