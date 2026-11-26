# ADR-017 — Importes previstos y tratamiento del total de gastos previstos

**Estado:** **Propuesto** (25 de noviembre de 2026). Es el candidato **ADR-b** del análisis (`docs/propuestas/analisis-planificacion-financiera.md` §6), con el número que le toca al abrirse (maestro §15.10, decisión 29.10). Se acepta antes de la etapa Plan de la spec 007 (`AGENTS.md` 17). **No cierra Q15**, que sigue abierta hasta los comps (29.4). No se implementa antes de declarar MVP-1 ni antes de que Planes (spec 006) esté aceptada (28.18, condición 6) · **Origen:** especificación 007 (`specs/007-recurrentes-calendario/spec.md`), precisión de Q15, Q10, F101-10, F101-17, FR-020 a FR-022, FR-042 y FR-045 a FR-047; maestro §15.10, decisiones 29.4, 29.7 y 29.10; ADR-016 · **Alcance:** MVP-2

En este archivo `[P]` es una **propuesta** que necesita decisión de los
fundadores, `[V]` una **verificación pendiente** (maestro §15.9) y **«comps»**
una decisión de presentación que se toma viendo las pantallas (FR-082), no de
arquitectura. Los nombres de columnas y funciones son de trabajo; los nombres
visibles se deciden con los comps y entran en `docs/GLOSSARY.md` solo aprobados
(Q2). Los importes de los ejemplos son **ficticios**.

## Contexto

ADR-016 (aceptado) fija dónde viven las recurrencias y sus instancias, y que cada
versión guarda un **tipo de importe** (`fixed`, `range`, `unknown`). La spec y la
decisión 29 delegan en este ADR dos cosas:

| # | Cuestión delegada | Origen | Dónde se resuelve |
| --- | --- | --- | --- |
| 1 | Cómo se guardan y se muestran los importes previstos: fijo, estimado con rango, condicional, y conocido, estimado o desconocido; un importe desconocido nunca es cero | Q10, F101-10, F101-17; FR-020 a FR-022, FR-042 | §1 y §2 |
| 2 | Qué cifras pueden mezclar lo previsto y lo real | Análisis §6, ADR-b; precisión de Q15 | §3 |
| 3 | El **tratamiento** de la posible cifra de Q15 (b): qué entra, cómo se tratan los estimados, los rangos, los condicionales y los desconocidos, qué estados cuentan y la privacidad en Yo y en Nosotros | 29.4; precisión de Q15; FR-045 a FR-047 | §4 a §6 |
| 4 | Que la cifra no salga de las métricas reales ni alimente ninguna, y respete ADR-016 (regla de los hechos y P7) | 29.4; ADR-016 §1, §2 y §11 | §5 |

**Q15 sigue abierta.** Este ADR no decide si existe el total. Define el contrato
que tendría que cumplir **si** los comps aprueban la opción (b). Con (a), el
respaldo, no se construye nada de §4 a §6, y §1 y §2 siguen valiendo para las
instancias.

Las **ocho condiciones de los fundadores** para el total (precisión de Q15) son el
marco. Este ADR las cita y dice dónde se cumple cada una (§7):

1. nunca se mezcla con métricas de movimientos reales;
2. no suma ingresos, gastos y aportes en una cifra neta;
3. los ingresos condicionales no se presentan como seguros;
4. un importe desconocido no se trata como cero;
5. si solo se cuentan importes fijos pendientes de confirmar, se dice;
6. ADR-b define el tratamiento de estimados, rangos, estados y privacidad;
7. no se calculan excedentes, disponibilidad financiera, capacidad de pago ni
   previsto frente a real;
8. en Nosotros, solo información compartida autorizada; la ausencia no es cero.

Además rigen DEC-R17 (nunca liquidez, disponibilidad, capacidad de pago ni «te
alcanza»), DEC-G04 (`total_destinado_neto` nunca es «Total gastado» ni la cifra
héroe) y la decisión 28.11 (sin «total del hogar»).

## Decisión

### 1. El importe previsto: tres formas, ninguna es cero

Cada versión de una regla (ADR-016 §4) guarda su importe con una de **tres
formas**, y nada más:

| `amount_kind` | Columnas | Significado | Se muestra como |
| --- | --- | --- | --- |
| `fixed` | `amount_minor` | Un importe conocido | Ese importe |
| `range` | `amount_min_minor` < `amount_max_minor` | Un **estimado**: está entre dos importes | Los dos extremos, rotulados como estimado |
| `unknown` | ninguna | **No se sabe** cuánto será | «Importe desconocido» (texto de los comps), **nunca $0** |

- **«Estimado» siempre es un rango**, como dicen FR-001 y FR-020 («estimado con
  rango»). No hay estimado de un solo valor: así no existe una cifra que parezca
  exacta sin serlo.
- **Desconocido no es un valor**, sino la ausencia de valor. No hay ninguna
  columna con 0. Las restricciones lo hacen imposible: todos los importes son
  `> 0`, en pesos enteros (`% 100 = 0`; decisión 20.8) y con el mismo tope que las
  metas, y un `unknown` tiene todas las columnas de importe nulas.
- Los importes son `bigint` en unidades menores y cruzan la frontera como texto
  (ADR-013 §4).

**Combinaciones permitidas, por tipo de regla** (`check` en la versión):

| Tipo de regla | Certeza | `amount_kind` permitido |
| --- | --- | --- |
| Gasto | — | `fixed` o `range` |
| Ingreso | fijo | `fixed` |
| Ingreso | estimado | `range` |
| Ingreso | condicional | `fixed`, `range` o `unknown` (conocido, estimado o desconocido; F101-10) |
| Aporte a meta | — | Lo fija ADR-d. Este ADR solo exige que no sea `unknown` |

- Un ingreso también lleva su **tipo**, habitual o extraordinario (Q10).
- Un ingreso condicional lleva **siempre** el texto de su **condición**:
  obligatorio, con espacios recortados, de 1 a 140 caracteres. Ninguna otra regla
  lo lleva. No hay motor de condiciones (F101-10).
- **Un gasto nunca es `unknown`.** Como `unknown` solo existe en ingresos
  condicionales, y el total de §4 solo suma gastos, el total no puede encontrarse
  nunca un importe desconocido. La condición 4 se cumple por construcción, no por
  una regla de cálculo. Aun así, §4 trata `unknown` explícitamente, por si una
  decisión futura lo admitiera en otro tipo.

### 2. Cómo se muestra el importe de una instancia (FR-022, FR-042)

- El importe de una instancia es el de **su versión** (ADR-016 §4: la de su
  posición o, si tuvo un hecho, la fijada; P7).
- **Fijo:** el importe. **Rango:** los dos extremos con el rótulo de estimado,
  nunca su punto medio ni uno solo de los dos. **Desconocido:** el texto, nunca
  $0 ni un guion que se pueda leer como cero.
- **Ingreso condicional:** siempre con su condición y con el rótulo de
  condicional, también si su importe es conocido. Nunca se presenta como
  recibido, seguro ni disponible (FR-022; condición 3).
- **Confirmar** sigue ADR-016 §7.2: el toque único solo con importe fijo y, en
  ingresos, con certeza fija; los demás casos abren Anotar y piden el importe
  efectivamente recibido o pagado (FR-012, FR-021; F101-17).
- Ningún importe previsto alimenta ninguna cifra real (§3).

### 3. Ninguna cifra mezcla lo previsto con lo real

Es la respuesta a la pregunta del análisis («¿qué cifras pueden mezclar lo
previsto y lo real?»): **ninguna**.

- **Ninguna métrica de §5.1, de DEC-G04, de presupuestos (ADR-004), de Balance,
  de Análisis ni de Metas** incluye nada previsto. Lo garantiza ADR-016 §1 y se
  verifica como allí (`[V]` 1).
- **Ninguna cifra prevista se combina con una real**, ni con un presupuesto, en
  ninguna operación: ni suma, ni resta, ni diferencia, ni porcentaje, ni barra de
  progreso, ni comparación «previsto frente a real» (condición 7). Comparar lo
  previsto con el límite de un presupuesto también queda fuera: se leería como
  capacidad de pago.
- **Ninguna cifra prevista se rotula** como «disponible», «te alcanza», «puedes
  pagarlo», «saldo», «Total gastado» ni equivalentes (DEC-R17, DEC-G04; BRAND §4 y
  GLOSSARY §9).
- Lo único que existe con importes previstos son: los importes de cada instancia
  (§2) y, solo si los comps aprueban Q15 (b), el total de gastos previstos de §4.
  **No hay** totales de ingresos previstos ni de aportes programados: no forman
  parte de Q15 (b), y abrirlos sería una decisión nueva (condición 2).

### 4. El total de gastos previstos, si Q15 se cierra en (b)

**Una sola cifra por contexto y mes, calculada al leer, nunca guardada.**

**Qué entra** (cada criterio, explícito en la consulta):

| Criterio | Regla |
| --- | --- |
| Tipo | Solo reglas de **gasto**. Nunca ingresos ni aportes programados (condición 2) |
| Contexto | En **Yo**, solo las reglas privadas de quien consulta (`owner_user_id = auth.uid()`). En **Nosotros**, solo las reglas compartidas de la pareja (`group_id` de la pareja activa). Nunca las dos juntas: no hay «total del hogar» (28.11). Ver P2 |
| Mes | Las instancias cuya **fecha prevista** cae en el mes, en `America/Bogota`. Para una instancia con hechos, la fecha **fijada** (ADR-016 §2, P7) |
| Estado | Según P1. Recomendación: solo las **sin resolver**: previstas y pendientes, incluidas las pendientes por D1 |
| Excluidas siempre | Las confirmadas (ya son reales), las omitidas, las canceladas, las posiciones consumidas por una pausa y las que no pertenecen al calendario (ADR-016 §5, pasos 1, 2, 5 y 6) |

**Qué devuelve.** No un número, sino una estructura que conserva lo que se sabe y
lo que no:

| Campo | Contenido |
| --- | --- |
| `included_count` | Cuántas instancias entran |
| `fixed_minor` | Suma de los importes fijos |
| `range_count`, `range_min_minor`, `range_max_minor` | Cuántas son estimados y la suma de sus mínimos y de sus máximos |
| `unknown_count` | Cuántas no tienen importe. Hoy siempre 0 en gastos (§1); se devuelve igual |

Las sumas son exactas, en `bigint` y sin redondeo, y salen como texto.

**Reglas de presentación que no dependen de los comps:**

1. **Ausencia no es cero** (condición 8). Si `included_count = 0`, no se muestra
   ninguna cifra, sino una frase: no hay gastos previstos por confirmar ese mes, o
   no hay recurrencias registradas en ese contexto. Nunca «$0».
2. **Un estimado nunca se presenta como exacto.** Si hay rangos, la cifra es un
   rango, o el importe fijo con el estimado aparte. Nunca un único número que
   sume rangos.
3. **Un desconocido nunca suma cero** (condición 4). Si `unknown_count > 0`, la
   cifra dice que es incompleta y cuántas faltan. Hoy no ocurre (§1).
4. **Si solo se muestran los fijos, se dice** (condición 5), con cuántos estimados
   quedan fuera.
5. **El rótulo dice exactamente qué incluye** (FR-045): que son gastos, de qué
   contexto, de qué mes y en qué estados (por ejemplo, «por confirmar»). El texto
   lo fijan los comps.
6. **Nunca junto a una cifra real** en una misma operación ni en una comparación
   (§3).

**Lo que deciden los comps** (presentación, no arquitectura): si la cifra se
enseña como un solo rango o como fijo y estimado por separado, el texto exacto del
rótulo, y si se ve o no (Q15 (a) o (b)). La estructura de arriba admite las dos
formas sin cambiar nada.

**Dónde se ve** (P3): recomendación, solo en la ruta de Recurrentes y en su
calendario, junto a la lista de las instancias que suma.

### 5. De dónde sale la cifra

- Es una **lectura** sobre las tablas `recurring_*` de ADR-016 y su función pura de
  calendario. Va en una función de `public`, `security invoker` y con cuerpo SQL
  estándar, como el resto de lecturas de ADR-016 §11, sin `usage` sobre
  `juntia_data`.
- Usa **la misma función de estado** que el calendario (ADR-016 §5): lo que el
  total suma es exactamente lo que la lista muestra como prevista o pendiente en
  ese mes y contexto. No hay una segunda definición de «qué está previsto».
- Respeta la **regla de los hechos** y **P7**: una instancia con hechos usa su fecha
  y su versión fijadas.
- **No lee** `transactions`, `transaction_allocations`, `goal_ledger_entries`,
  `budgets` ni ninguna vista de métricas, y **ninguna vista ni función de
  métricas la usa** (`[V]` 1).
- El dominio en TypeScript tiene el mismo cálculo, puro, para las pruebas de
  FR-090, contra la misma tabla de casos (`[V]` 4).

### 6. Privacidad (condición 8; F101-2; 28.11)

- **Cada cifra se calcula solo con lo que su contexto autoriza**, con los filtros
  explícitos de §4. La RLS es una defensa adicional, no el filtro (como ADR-015,
  F94-3, y ADR-016 §7.6).
- **No hay ninguna cifra que incluya recurrencias privadas de las dos personas**,
  ni la privada de una con la compartida. Así no se puede deducir nada por
  diferencia: Beto puede ver su total de Yo y el de Nosotros, y ninguno de los dos
  contiene nada de Ana privado. Por eso tampoco se puede restar uno de otro.
- **Los recuentos** (`included_count`, `range_count`, `unknown_count`) siguen el
  mismo filtro que las sumas: nunca cuentan nada que quien consulta no pueda ver.
- **Los errores, los tiempos y los metadatos** no dependen de las reglas privadas
  ajenas: la función no las lee.
- **La ausencia** se dice igual en Yo y en Nosotros (§4, regla 1), y nunca
  distingue entre «la otra persona no tiene nada» y «no te lo podemos mostrar».
- Los aportes programados, que siempre son privados (Q12), no entran nunca.

### 7. Las ocho condiciones de los fundadores

| # | Condición | Dónde se cumple |
| --- | --- | --- |
| 1 | No se mezcla con métricas reales | §3; §5 |
| 2 | No suma ingresos, gastos y aportes | §3; §4 («Tipo») |
| 3 | Ingresos condicionales nunca como seguros | §2. No entran en el total |
| 4 | Un desconocido no es cero | §1 (no hay ceros; un gasto nunca es `unknown`); §4, regla 3 |
| 5 | Si solo se cuentan fijos, se dice | §4, regla 4 |
| 6 | Tratamiento de estimados, rangos, estados y privacidad | §1, §2, §4 (P1) y §6 |
| 7 | Sin excedentes, disponibilidad, capacidad de pago ni previsto frente a real | §3 |
| 8 | En Nosotros, solo lo compartido; la ausencia no es cero | §4 («Contexto»); §4, regla 1; §6 |

## Alternativas consideradas

1. **Guardar el total por mes.** Se desactualizaría con cada edición, pausa,
   confirmación u omisión, y duplicaría la función de estado de ADR-016. Se calcula
   al leer.
2. **Un único número con el punto medio de los rangos.** Parece exacto y no lo es:
   contradice FR-022 y la condición 4 en su espíritu.
3. **Tratar un desconocido como cero** o excluirlo en silencio. Contradice la
   condición 4.
4. **Estimado de un solo valor.** La spec define «estimado con rango». Añadirlo
   obligaría a explicar en el total qué parte es exacta.
5. **Un total de Yo que incluya la parte propia de los gastos compartidos.** Mezcla
   contextos, abre deducciones por diferencia y se parece a un «total del hogar».
   Es la opción (b) de P2, que no se recomienda.
6. **Incluir las confirmadas con su importe previsto.** Pondría en la misma cifra
   lo ya pagado y lo que falta, y invitaría a leer «previsto frente a real». Es la
   opción (b) de P1, que no se recomienda.

## Consecuencias

- §1 y §2 se aplican tanto si Q15 se cierra en (a) como en (b): son restricciones
  de las versiones de ADR-016 (los `check` de §1) y reglas de presentación de cada
  instancia.
- §4 a §6 se construyen **solo si los comps aprueban (b)**. Con (a), no hay función
  de total ni nada que la consuma.
- Ninguna tabla nueva y ningún cambio a ADR-016, ADR-004, ADR-010 ni ADR-013. Las
  restricciones de §1 completan las que ADR-016 §11 ya prevé para
  `recurring_rule_versions`.
- **Q15 no se cierra aquí.** Cuando los comps la cierren, la spec y la 29.4 se
  reconcilian en un PR documental aparte, como ADR-016.
- Si los fundadores cambian alguna `[P]`, se refleja aquí antes de aceptar el ADR.

## Verificación pendiente [V]

1. **Lo previsto no toca lo real**, con los tres métodos de ADR-016 `[V]` P1
   (`pg_depend`, `pg_proc.prosrc` y SC-001), incluida la función de total: ninguna
   vista ni función de métricas depende de ella, y ella no lee ninguna tabla ni
   vista de dinero real.
2. **Privacidad del total** (pgTAP con tres cuentas, como FR-092 y SC-003):
   - el total y los recuentos de Yo de Beto, y los de Nosotros, son idénticos con
     y sin una recurrencia privada de Ana;
   - una tercera cuenta no obtiene nada;
   - ningún error ni metadato cambia.
3. **Ausencia no es cero:** sin reglas, o con todas las instancias del mes
   resueltas, la función devuelve `included_count = 0`, y la interfaz no muestra
   ninguna cifra.
4. **Cálculo gemelo** (dominio TS y SQL, la misma tabla de casos):
   - fijos y rangos mezclados;
   - una pendiente por D1 y una omisión deshecha con valores fijados (P7);
   - una posición consumida por una pausa;
   - una posición fuera del calendario;
   - los límites de mes en `America/Bogota`;
   - una confirmada, una omitida y una cancelada, que no entran.
5. **Restricciones de §1:** se rechaza un gasto `unknown`, un ingreso fijo con
   rango, un condicional sin condición, una condición en una regla no
   condicional, un rango con mínimo ≥ máximo y cualquier importe ≤ 0 o que no sea
   de pesos enteros.
6. **Importes como texto** de ida y vuelta, también las sumas (ADR-013 §4), con
   valores cerca del tope.
7. **Copy:** ningún rótulo del total ni de un importe previsto usa las palabras
   prohibidas de BRAND §4 y GLOSSARY §9, ni las de DEC-R17 y DEC-G04.
8. **Rendimiento:** el total del mes con el dataset del Plan, dentro de §15.7.

## Cuestiones para los fundadores `[P]`

| # | Cuestión | Opciones | Recomendación | Dónde |
| --- | --- | --- | --- | --- |
| P1 | Qué estados entran en el total | (a) solo las **sin resolver** del mes (previstas y pendientes, incluidas las pendientes por D1): es «lo que queda por confirmar»; (b) todas las del mes salvo las omitidas y las canceladas, con su importe previsto, también las ya confirmadas | (a): no pone en la misma cifra lo ya pagado y lo que falta, y no invita a «previsto frente a real» | §4 |
| P2 | Qué contiene el total de Yo | (a) solo las recurrencias privadas de quien consulta; lo compartido, solo en Nosotros; (b) Yo enseña además, como cifra aparte y nunca sumada, el total de lo compartido | (a): un contexto, una cifra, como Actividad. Lo compartido ya está en Nosotros | §4; §6 |
| P3 | Dónde se ve el total | (a) solo en la ruta de Recurrentes y su calendario, junto a la lista que suma; (b) también en el módulo de pendientes de Inicio (Q16), sin ninguna cifra real al lado | (a): lejos de las métricas reales de Inicio, cumple la condición 1 sin depender del diseño | §4 |

**Para los comps** (presentación, no `[P]`): si se ve el total (Q15 (a) o (b));
si se muestra como un rango o como fijo y estimado por separado; el texto del
rótulo; y el texto de «importe desconocido» y de la ausencia.

## Referencias

- `docs/JUNTIA_MASTER.md` §2.4 (DEC-R17), §5.1, §5.2, §15.4 (DEC-G04) y §15.10
  (decisiones 20.8, 28.11, 29.4, 29.7, 29.10 y 29.11)
- `specs/007-recurrentes-calendario/spec.md`: precisión de Q15, Q10, F101-10,
  F101-17, FR-001, FR-012, FR-020 a FR-022, FR-042, FR-045 a FR-047, FR-082 y
  FR-090 a FR-092
- `docs/propuestas/analisis-planificacion-financiera.md` §6 (ADR-b)
- ADR-004 · ADR-013 §4 · ADR-015 §4 (F94-3) · ADR-016 §1, §2, §4, §5, §7.2 y §11
