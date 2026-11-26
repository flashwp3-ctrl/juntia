# ADR-017 — Importes previstos y tratamiento del total de gastos previstos

**Estado:** **Propuesto** (25 de noviembre de 2026). **Los fundadores decidieron P1–P3 el 26 de noviembre de 2026**, con las opciones (a), **condicionadas a que Q15 se cierre en (b)** tras revisar y aprobar los comps; (a), sin totales, se mantiene como respaldo («Decisiones de los fundadores»). Pasa a Aceptado con su registro en el maestro, en un PR de reconciliación posterior, como ADR-016 con el PR #105. Es el candidato **ADR-b** del análisis (`docs/propuestas/analisis-planificacion-financiera.md` §6), con el número que le toca al abrirse (maestro §15.10, decisión 29.10). Se acepta antes de la etapa Plan de la spec 007 (`AGENTS.md` 17). **No cierra Q15**, que sigue abierta hasta los comps (29.4). No se implementa antes de declarar MVP-1 ni antes de que Planes (spec 006) esté aceptada (28.18, condición 6) · **Origen:** especificación 007 (`specs/007-recurrentes-calendario/spec.md`), precisión de Q15, Q10, F101-10, F101-17, FR-020 a FR-022, FR-042 y FR-045 a FR-047; maestro §15.10, decisiones 29.4, 29.7 y 29.10; ADR-016 · **Alcance:** MVP-2

En este archivo, las tres `[P]` (P1–P3) **ya están decididas** por los fundadores
(26 de noviembre de 2026), condicionadas a Q15 (b); se conservan sus números como
referencia, y las opciones descartadas quedan como contexto. `[V]` una **verificación pendiente** (maestro §15.9) y **«comps»**
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

**Contrato de integridad** (F106-6). La base de datos rechaza cualquier
combinación incompatible, venga por donde venga la escritura (ADR-013 §2.4). Este
ADR fija **qué** se exige; el mecanismo físico lo fija el Plan, con ADR-013 y
ADR-016, sin añadir columnas duplicadas:

1. **Columnas exclusivas por `amount_kind`**, exigiendo de forma explícita las que
   no pueden ser nulas, porque un `check` que se evalúa a `NULL` no rechaza la
   fila:
   - `fixed`: `amount_minor` no nulo; `amount_min_minor` y `amount_max_minor`
     nulos;
   - `range`: `amount_min_minor` y `amount_max_minor` no nulos, con mínimo <
     máximo; `amount_minor` nulo;
   - `unknown`: las tres nulas.
2. **Compatibilidad entre el tipo de la regla y la versión.** El tipo (`kind`)
   vive en `recurring_rules` y la versión en `recurring_rule_versions`. Un `check`
   no puede leer otra tabla, así que el Plan elige el mecanismo (por ejemplo, un
   trigger de la versión, como el de compatibilidad de vínculos de ADR-016 §11).
3. **La certeza y el tipo de ingreso** son obligatorios en las versiones de un
   ingreso y nulos en las de cualquier otro tipo.
4. **La condición** es obligatoria solo en un ingreso condicional y nula en
   cualquier otra versión.
5. Las combinaciones permitidas son las de la tabla siguiente, y ninguna otra.

**Combinaciones permitidas, por tipo de regla:**

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

**Alcance de esta prohibición** (F106-7). Rige dentro del alcance de la spec 007.
No sustituye lo que decidan, con su propia aprobación, specs posteriores como
Flujo y liquidez (28.3). La protección de §5.1 y de DEC-G04 sí es permanente:
ninguna de esas métricas incluye nunca nada previsto.

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

**Una sola cifra por contexto y mes, calculada al leer, nunca guardada.** Todo
§4 a §6, y P1 a P3, están **condicionados a que los comps cierren Q15 en (b)**.

**El total no calcula nada que ADR-016 ya resuelva** (F106-1, F106-2). Agrega la
**proyección autorizada de instancias** de ADR-016: la misma lectura que usa el
calendario, que ya entrega cada instancia con su **estado**, su **fecha prevista**
y su **versión resueltos** por ADR-016 (§4, §5 y P7). El total **no selecciona
ninguna versión ni ninguna fecha**: toma las de cada instancia tal como vienen. Así,
una instancia con valores fijados desde su primer hecho usa esos valores aunque ya
no tenga hechos vigentes (P7). Ejemplo: se omite y se deshace la del 10 de febrero
de $100.000, y después la regla pasa al día 20 por $150.000. El total toma
$100.000 el 10 de febrero, igual que el calendario. Una regla de una sola fecha
con valores fijados cuenta en el mes de su fecha fijada.

**Qué entra** (cada criterio, explícito en la consulta):

| Criterio | Regla |
| --- | --- |
| Tipo | Solo reglas de **gasto**. Nunca ingresos ni aportes programados (condición 2) |
| Contexto | En **Yo**, solo las reglas privadas de quien consulta (`owner_user_id = auth.uid()`). En **Nosotros**, solo las reglas compartidas de la pareja (`group_id` de la pareja activa). Nunca las dos juntas: no hay «total del hogar» (28.11). P2 (a), decidida |
| Mes | Las instancias cuya **fecha prevista resuelta** (la que entrega la proyección) cae en el mes, en `America/Bogota` |
| Estado | Según P1 (a), decidida (abajo) |
| Excluidas siempre | Las omitidas, las canceladas, las posiciones consumidas por una pausa y las que no pertenecen al calendario (ADR-016 §5, pasos 1, 2, 5 y 6) |

**P1 y lo que cambia con cada opción** (F106-3). **Decidida: (a)**, condicionada a Q15 (b). (b) queda descartada y se conserva como contexto:

| | P1 (a), **decidida**: por confirmar | P1 (b), **descartada**: todo el mes previsto |
| --- | --- | --- |
| Estados que entran | Previstas y pendientes, incluidas las pendientes por D1 y las que vuelven a pendiente por la excepción contextual de P6 (ADR-016 §9) | Además, las **confirmadas** |
| Importe de una confirmada | No entra | Su **importe previsto histórico**, el de su versión fijada. **Nunca lo pagado**: ningún importe del total procede del movimiento real (§5) |
| Qué significa la cifra | Lo que queda por confirmar en el mes | Lo que estaba previsto para el mes, se haya confirmado o no |
| Rótulo | Debe decir «por confirmar» (o el texto de los comps con ese sentido) | Debe decir que es lo previsto del mes **y que no es lo pagado** |
| Ejemplo: Arriendo $800.000 confirmado, Internet $100.000 pendiente, Mercado $200.000 previsto | **$300.000** | **$1.100.000** |
| Ausencia (`included_count = 0`) | Nada por confirmar ese mes, o nada registrado | Nada previsto ese mes, o nada registrado |

**Qué devuelve.** No un número, sino una estructura que conserva lo que se sabe y
lo que no:

| Campo | Contenido |
| --- | --- |
| `included_count` | Cuántas instancias entran |
| `fixed_count`, `fixed_minor` | Cuántas tienen importe fijo y su suma (F) |
| `range_count`, `range_min_minor`, `range_max_minor` | Cuántas son estimados, y la suma de sus mínimos (Σmín) y de sus máximos (Σmáx) |
| `unknown_count` | Cuántas no tienen importe. Hoy siempre 0 en gastos (§1); se devuelve igual |

**Reglas de presentación que no dependen de los comps:**

1. **Ausencia no es cero** (condición 8). Si `included_count = 0`, no se muestra
   ninguna cifra, sino una frase **neutra** («No hay gastos previstos por
   confirmar este mes»). `included_count = 0` **no
   prueba** que no haya recurrencias: decir «no hay recurrencias registradas» solo
   está permitido si eso se comprobó aparte, con la misma autorización (F106-5 c).
   Nunca «$0».
2. **Un estimado nunca se presenta como exacto.** Si hay rangos, la cifra agregada
   es un rango que **suma los fijos en los dos extremos**: mínimo = F + Σmín y
   máximo = F + Σmáx (F106-5 b). O se muestran por separado los fijos y el
   estimado. Nunca un único número que sume rangos.
3. **Un desconocido nunca suma cero** (condición 4). Si `unknown_count > 0`, la
   cifra dice que es incompleta y cuántas faltan. Hoy no ocurre (§1).
4. **Si solo se muestran los fijos, se dice** (condición 5), con cuántos estimados
   quedan fuera. **Si no hay ningún fijo** (`fixed_count = 0`) y se muestran solo
   los fijos, no se muestra «$0»: se dice que no hay importes fijos y cuántos
   estimados se excluyeron (F106-5 a).
5. **El rótulo dice exactamente qué incluye** (FR-045): que son gastos, de qué
   contexto, de qué mes y en qué estados, según P1 (a): «por confirmar». El texto lo fijan los comps.
6. **Nunca junto a una cifra real** en una misma operación ni en una comparación
   (§3).

**Lo que deciden los comps** (presentación, no arquitectura): si la cifra se ve o
no (Q15 (a) o (b)); si se enseña como un solo rango o como fijos y estimado por
separado; y el texto exacto del rótulo y de la ausencia. La estructura de arriba
admite las dos formas sin cambiar nada.

**Dónde se ve** (P3 (a), decidida, condicionada a Q15 (b)): **solo** en la ruta de
Recurrentes y en su calendario, junto a la lista de las instancias que suma. Inicio
conserva las métricas reales y el aviso «Por confirmar», sin incorporar importes
previstos.

### 5. De dónde sale la cifra: importe y estado, cada uno por su lado (F106-1)

El total depende de dos cosas que tienen fuentes distintas:

- **La procedencia del importe:** sale **solo de las versiones de las reglas
  recurrentes** (`recurring_rule_versions`), a través de la versión resuelta de cada
  instancia. Ningún importe del total viene de un movimiento real.
- **La resolución del estado:** es la **proyección autorizada de instancias de
  ADR-016**. Esa proyección depende, **indirectamente**, del movimiento efectivo:
  para saber si una instancia está confirmada o es una pendiente por D1, ADR-016
  §5 y §8 consultan si su movimiento efectivo está activo, porque una anulación
  hecha desde Actividad no escribe nada en `recurring_*`. El total no repite esa
  consulta: la recibe resuelta.

**Prohibido**, expresamente:

1. sumar importes de movimientos reales en el total;
2. alimentar cualquier métrica real (§5.1, DEC-G04, presupuestos, Balance,
   Análisis, Metas) con lo previsto;
3. crear una **segunda función de estado**: el total usa la de ADR-016, nunca una
   propia;
4. tocar las escrituras de MVP-1 para mantener el total: el total no se guarda y
   no necesita que nadie lo actualice.

**La dependencia va en una sola dirección.** Recurrentes consulta el estado
autorizado a través de ADR-016. **Las métricas reales nunca consultan
Recurrentes.**

- La lectura vive en una función de `public`, `security invoker` y con cuerpo SQL
  estándar, como el resto de lecturas de ADR-016 §11, sin `usage` sobre
  `juntia_data`.
- El dominio en TypeScript tiene el mismo cálculo, puro, para las pruebas de
  FR-090, contra la misma tabla de casos (`[V]` 4).
- **Para el Plan** (no es una decisión nueva): la suma de `bigint` en Postgres
  devuelve `numeric`. El acumulador se queda en `numeric`, sin convertirlo a
  `bigint`. `SUM` sin filas devuelve `NULL`, y la función lo devuelve como
  `included_count = 0` con las sumas a cero solo **dentro** de la estructura,
  nunca como cifra visible (§4, regla 1). Se comprueba el desbordamiento. Todo se
  transporta como texto (ADR-013 §4).

### 6. Privacidad (condición 8; F101-2; 28.11)

- **Cada cifra se calcula solo con lo que su contexto autoriza**, con los filtros
  explícitos de §4 sobre la proyección autorizada de ADR-016. La RLS es una
  defensa adicional, no el filtro (como ADR-015, F94-3, y ADR-016 §7.6).
- **No hay ninguna cifra que incluya recurrencias privadas de las dos personas**,
  ni la privada de una con la compartida. Así no se puede deducir nada por
  diferencia: Beto puede ver su total de Yo y el de Nosotros, y ninguno de los dos
  contiene nada de Ana privado.
- **Los recuentos** siguen el mismo filtro que las sumas: nunca cuentan nada que
  quien consulta no pueda ver.
- **Resolver el estado de una instancia compartida nunca requiere leer la
  programación privada de Ana.** El movimiento efectivo de un vínculo a un gasto
  compartido es el propio movimiento vinculado, sin cadena (ADR-016 §8). Por eso,
  en la cadena de P6, el total de Nosotros es el mismo exista o no una recurrencia
  privada de Ana vinculada originalmente al gasto.
- **Los errores, los tiempos y los metadatos** no dependen de las reglas privadas
  ajenas: la lectura no las ve.
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
   confirmación, omisión o anulación, y obligaría a tocar las escrituras de MVP-1
   para mantenerlo. Se calcula al leer.
2. **Una función de estado propia del total.** Duplicaría ADR-016 §5 y podría
   divergir del calendario, sobre todo en D1, P6 y P7. El total consume la
   proyección de ADR-016.
3. **Un único número con el punto medio de los rangos.** Parece exacto y no lo es:
   contradice FR-022 y la condición 4 en su espíritu.
4. **Tratar un desconocido como cero** o excluirlo en silencio. Contradice la
   condición 4.
5. **Estimado de un solo valor.** La spec define «estimado con rango». Añadirlo
   obligaría a explicar en el total qué parte es exacta.
6. **Una cifra personal combinada en Yo**: lo privado más la parte propia de los
   gastos compartidos, sumado en un solo número (F106-4). Mezcla contextos, se
   parece a un «total del hogar» (28.11) y exigiría una regla de reparto para lo
   previsto que la spec no tiene. Es distinta de P2 (b), descartada, que enseña dos cifras
   separadas y nunca sumadas.

## Consecuencias

- §1 y §2 se aplican tanto si Q15 se cierra en (a) como en (b): son restricciones
  de las versiones de ADR-016 y reglas de presentación de cada instancia.
- §4 a §6 se construyen **solo si los comps aprueban (b)**. Con (a), no hay función
  de total ni nada que la consuma.
- Ninguna tabla nueva y ningún cambio a ADR-016, ADR-004, ADR-010 ni ADR-013. El
  contrato de §1 completa las restricciones que ADR-016 §11 ya prevé para
  `recurring_rule_versions`.
- **Q15 no se cierra aquí.** Las decisiones P1–P3 están condicionadas a que Q15 se
  cierre en (b) tras revisar y aprobar los comps; si el total no puede
  comunicarse con claridad, se mantiene (a), sin totales.
- **Reconciliación de la spec 007 y del maestro.** Va en un **PR documental
  aparte, posterior a este**, como el #105 para ADR-016. En él ADR-017 pasa a
  Aceptado con su registro en el maestro. **Este PR no toca la spec ni el
  maestro.** Q15 (29.4) y la 29.8 siguen abiertas.

  | Decisión | Spec 007 | Maestro, decisión 29 |
  | --- | --- | --- |
  | **P1** (a) | Precisión de Q15 y **FR-045** y **FR-046**: si Q15 se cierra en (b), el total incluye solo los gastos previstos y pendientes de confirmar, incluidas las reaperturas por D1 y la excepción contextual de P6. US3.4 | **29.4** (tratamiento de estados); fila nueva de registro de ADR-017 |
  | **P2** (a) | Precisión de Q15 («en Nosotros, solo información compartida autorizada») y **FR-046**: en Yo, solo los gastos privados previstos propios; lo compartido, solo en Nosotros. **FR-062** | **29.4** (privacidad); fila de registro |
  | **P3** (a) | **FR-045** y **FR-050**: el total solo en Recurrentes y su calendario; Inicio conserva las métricas reales y el aviso «Por confirmar», sin importes previstos | **29.4**; fila de registro |
  | Resto de ADR-017 | §1 y §2 (importes): **FR-001**, **FR-020** a **FR-022** y **FR-042**; §3: **FR-047**; «Lo que hace falta para pasar a Plan», punto 3: ADR-b aceptado | **29.7** (lo que tocaba a ADR-b, resuelto) y **29.10** (ADR-b hecho; falta ADR-d) |

## Verificación pendiente [V]

1. **Dependencia en una sola dirección** (§5), con los tres métodos de ADR-016
   `[V]` P1 (`pg_depend`, `pg_proc.prosrc` y SC-001):
   - ninguna vista ni función de métricas reales depende de la función de total
     ni de ninguna lectura de `recurring_*`;
   - la función de total no suma ningún importe de `transactions` ni del ledger, y
     no define su propio estado: lo toma de la proyección de ADR-016;
   - SC-001 con y sin recurrencias, con instancias en todos los estados.
2. **Privacidad del total** (pgTAP con tres cuentas, como FR-092 y SC-003):
   - el total y los recuentos de Yo de Beto, y los de Nosotros, son idénticos con
     y sin una recurrencia privada de Ana;
   - **la ausencia total** de gastos visibles para Beto (sin recurrencias propias
     ni compartidas) da el mismo resultado con y sin recurrencias privadas de Ana;
   - **la cadena de P6**: el total de Nosotros es idéntico con y sin una
     recurrencia privada de Ana vinculada originalmente al gasto que después se
     movió a Pareja, en cada paso de la cadena (ADR-016 §9);
   - una tercera cuenta no obtiene nada, y ningún error ni metadato cambia.
3. **Ausencia y presentación** (§4, reglas 1 a 4): con `included_count = 0`, la
   función devuelve la estructura vacía y la interfaz no muestra ninguna cifra ni
   afirma que no haya recurrencias si no se comprobó; con solo estimados y «solo
   fijos», no aparece «$0».
4. **Cálculo gemelo** (dominio TS y SQL, la misma tabla de casos), para P1 (a),
   la decidida:
   - fijos y rangos mezclados, con el rango agregado F + Σmín a F + Σmáx;
   - todos estimados (`fixed_count = 0`);
   - una pendiente por D1;
   - **P7**: omitida y deshecha del 10 de febrero ($100.000) y regla editada
     después al día 20 ($150.000): cuenta $100.000 el 10 de febrero; y una regla de
     una sola fecha con valores fijados, en el mes de su fecha fijada;
   - **P6**: la instancia compartida que vuelve a pendiente tras el Deshacer;
   - una posición consumida por una pausa y una fuera del calendario;
   - los límites de mes en `America/Bogota`;
   - omitidas, canceladas y confirmadas, que no entran (en el ejemplo de §4, el
     total es $300.000).
5. **Contrato de §1:** se rechazan, también por SQL directo:
   - un gasto `unknown`;
   - un ingreso fijo con rango;
   - un condicional sin condición, y una condición en una versión no condicional;
   - certeza o tipo de ingreso en una versión que no es de ingreso, o su ausencia
     en una de ingreso;
   - las columnas de importe que no corresponden a su `amount_kind`, y la falta de
     las que sí;
   - un rango con mínimo ≥ máximo;
   - cualquier importe ≤ 0 o que no sea de pesos enteros;
   - una versión incompatible con el tipo de su regla.
6. **Importes como texto** de ida y vuelta, también las sumas, con valores cerca
   del tope y el acumulador `numeric` (ADR-013 §4).
7. **Copy:** ningún rótulo del total ni de un importe previsto usa las palabras
   prohibidas de BRAND §4 y GLOSSARY §9, ni las de DEC-R17 y DEC-G04.
8. **Rendimiento:** el total del mes con el dataset del Plan, dentro de §15.7.

## Decisiones de los fundadores (26 de noviembre de 2026)

Los fundadores aprobaron P1–P3 con las opciones recomendadas. Su texto,
transmitido por el gestor, se cita literalmente:

> Aprobamos las tres opciones recomendadas de ADR-017:
>
> * P1(a): el total mensual incluye exclusivamente los gastos previstos y pendientes de confirmar, incluidas las reaperturas por D1 y la excepción contextual de P6.
> * P2(a): en Yo se muestran únicamente los gastos privados previstos propios. Los gastos compartidos se muestran exclusivamente en Nosotros.
> * P3(a): el total se muestra únicamente en Recurrentes y su calendario. Inicio conserva las métricas reales y el aviso «Por confirmar», sin incorporar importes previstos.
>
> Las tres decisiones quedan condicionadas a que Q15 se cierre en (b) tras revisar y aprobar los comps.
>
> Q15 permanece abierta. Si el total no puede comunicarse de manera clara, mantenemos (a), sin totales, como respaldo.
>
> Registra literalmente estas decisiones en ADR-017, marca las alternativas descartadas y prepara el delta para la revisión final de fidelidad.
>
> No se reabre ADR-016, no se resuelve ADR-d ni la decisión 29.8 y no se autoriza todavía Plan ni implementación.
>
> Mantener la precedencia de Planes y las restricciones de N-8.

| # | Cuestión | Decidida, condicionada a Q15 (b) | Descartada | Dónde |
| --- | --- | --- | --- | --- |
| P1 | Qué estados entran en el total | (a) solo las **sin resolver** del mes: previstas y pendientes de confirmar, incluidas las reaperturas por D1 y las de la excepción contextual de P6 | (b) además las confirmadas, con su importe previsto histórico | §4 |
| P2 | Qué contiene el total de Yo | (a) solo los gastos privados previstos propios; lo compartido, solo en Nosotros | (b) dos cifras separadas en Yo, la privada y la compartida, nunca sumadas | §4 |
| P3 | Dónde se ve el total | (a) solo en Recurrentes y su calendario; Inicio conserva las métricas reales y el aviso «Por confirmar», sin importes previstos | (b) también en el módulo de pendientes de Inicio | §4 |

**Q15 sigue abierta.** Si los comps no la cierran en (b), estas decisiones no se
aplican y rige (a), sin totales. No se reabre ADR-016, no se resuelve ADR-d ni la
29.8, y no se autoriza todavía el Plan ni la implementación. Se mantienen la
precedencia de Planes y las restricciones de N-8 (28.18).

**Para los comps** (presentación, no `[P]`): si se ve el total (Q15 (a) o (b));
si se muestra como un rango o como fijos y estimado por separado; el texto del
rótulo; y el texto de «importe desconocido» y de la ausencia.

## Referencias

- `docs/JUNTIA_MASTER.md` §2.4 (DEC-R17), §5.1, §5.2, §15.4 (DEC-G04) y §15.10
  (decisiones 20.8, 28.11, 29.4, 29.7, 29.10 y 29.11)
- `specs/007-recurrentes-calendario/spec.md`: precisión de Q15, Q10, F101-10,
  F101-17, FR-001, FR-012, FR-020 a FR-022, FR-042, FR-045 a FR-047, FR-082 y
  FR-090 a FR-092
- `docs/propuestas/analisis-planificacion-financiera.md` §6 (ADR-b)
- ADR-004 · ADR-013 §4 · ADR-015 §4 (F94-3) · ADR-016 §1, §2, §4, §5, §7.2 y §11
