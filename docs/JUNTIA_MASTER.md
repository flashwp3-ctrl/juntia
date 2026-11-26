# Juntia — Documento maestro del producto

**Versión:** 1.3 (dirección visual y decisiones P0 cerradas) · **Fecha:** 2 de noviembre de 2026 · **Estado:** F0-a cerrada; F0-b cerrada en especificación y pendiente en implementación (§15.1); listo para empezar la implementación de P0. El cuerpo del documento conserva el texto de v1.2; la **§15 (Actualización v1.3)** registra las decisiones posteriores y **prevalece** donde difiera.

> **Nombre de producto elegido por los dos fundadores:** **Juntia**. Se utilizará en la interfaz, los documentos y las exploraciones de diseño desde F0-a. No se ha registrado ninguna marca ni comprado ningún dominio; antes de una publicación comercial se revisarán antecedentes marcarios y disponibilidad real. El desarrollo privado **no se bloquea** por esa diligencia. El repositorio/carpeta puede llamarse `juntia`; si ya existe uno llamado `ronda`, se conserva su historial y se cambia la marca sin recrearlo. La investigación de precios sigue separada en `docs/research/` y NO define requisitos del MVP.

## 1. Resumen ejecutivo y contrato de lanzamiento

Juntia es una aplicación web progresiva (PWA) de **finanzas personales y compartidas, mobile-first**, pensada inicialmente para dos personas en Medellín. Debe permitir que cada una registre gastos propios, elija qué comparte, gestione gastos de pareja y grupos, entienda los saldos y pueda liquidarlos sin confundir quién pagó con quién consumió. El producto debe ser excelente desde su **primera versión real**, no un panel básico que se embellezca meses después.

**Propuesta de valor:** «Lo tuyo, lo mío y lo nuestro, claro de un vistazo». La marca elegida es **Juntia**; el eslogan sigue siendo copy editable durante F0.

**Contrato innegociable:** la primera entrega privada que usarán ambos reúne **funcionalidad real + alta calidad de diseño + animaciones con propósito + excelente experiencia móvil y escritorio**. Ninguna de estas cuatro áreas se pospone a una supuesta «fase de pulido». El alcance se recorta eliminando funciones no esenciales, **no bajando el estándar visual**.

| Dimensión | Primera versión privada («MVP-1 premium») | Después, sin bloquearla |
| --- | --- | --- |
| Uso real | Auth, espacios privados, pareja, gastos, repartos, balances, liquidaciones, historial y metas personales/compartidas con aportes registrados | Grupos avanzados, OCR, voz, automatizaciones |
| Presupuestos | **Opcionales**: registrar gastos y ahorrar hacia metas funciona sin presupuesto; crear/ver límites básicos si se desea | Sugerencias basadas en historial, reglas de aporte automático y metas avanzadas |
| Diseño | Dirección visual propia, sistema de componentes, S1–S4 y la experiencia de metas S5; mobile y desktop excelentes | Landing narrativa, case study, variantes experimentales |
| Motion | `MOTION.md`, transiciones contextuales, captura, balance, relato de gasto y progreso de metas; reduced motion | Motion decorativo y experimentación de marketing |
| Confianza | Dinero determinista, privacidad real/RLS, idempotencia, exportación inicial, manejo de errores | Offline completo, integraciones bancarias |
| Inteligencia | Métricas descriptivas calculadas sin LLM | Gemini/Jev, ofertas, price intelligence y recomendaciones |

**Dos objetivos simultáneos en MVP-1:** (1) tú y tu pareja deben poder usar Juntia diariamente sin necesitar otra app para el flujo básico; (2) ambos deben abrirla y sentir que es un producto diseñado con carácter y detalle, también al usarla en escritorio. La intención de competir en Awwwards/Webby es una **aspiración de calidad de ejecución**, no una garantía de premio.

**Puerta de salida de MVP-1 (release gate):** el uso interno con datos reales está permitido desde P0-1, una vez que los controles de integridad, RLS y recuperación del slice estén verificados; este gate corresponde exclusivamente a declarar el lanzamiento privado completo, no bloquea las pruebas tempranas. Para declarar MVP-1, ambos usuarios, con cuentas y dispositivos distintos, completan el escenario de aceptación de la §4 **incluyendo meta privada y meta compartida** con datos reales, sin fugas ni incoherencias; aprueban estética, legibilidad, interacciones y fluidez en **390 y 1440 px**; todo funciona con movimiento reducido. **No se publica el MVP si solo está «funcional pero feo», ni si es precioso pero calcula mal.**

> **Enmienda del 25 de noviembre de 2026** (§15.10, decisión 30). Declarar MVP-1 es su **aceptación técnica** (30.5): conserva todas las verificaciones técnicas, de dispositivo, de accesibilidad, de seguridad, de privacidad, de restauración y de aprobación humana. El uso con datos reales durante **siete días consecutivos** es la **validación por uso real**: se conserva, pero se aplaza hasta que existan Planes y la planificación financiera que los fundadores necesitan (30.6). Cómo se cubre el escenario de §4 de este párrafo, si con la corrida delegada del PR #104 o con la sesión de los dos, está en la 30.7.

**Límite del alcance:** el motor de ofertas de supermercados, matching de productos, scraper, Google Search Grounding, Jev, restaurante frecuente, campañas de descuento y alertas automáticas son una línea de producto posterior, documentada en `docs/research/oportunidades.md`; **no entran en las dependencias ni en los criterios de aceptación del MVP-1**.

## 2. Visión, usuarios, principios y límites

### 2.1 Visión

Entender las finanzas propias y compartidas, **lo que gastamos y lo que apartamos para metas**, sin administrar una hoja de cálculo. La pregunta orientadora es «¿cómo vamos este mes: tú, yo y nosotros, y qué estamos construyendo?». La experiencia debe ser tan clara como Tricount para anotar y saldar gastos, y desarrollar una identidad visual propia sin copiarla.

### 2.2 Usuarios

- **Yo:** registro de gastos e ingresos privados, categorías, historial, meta individual y análisis, con o sin presupuestos.
- **Nosotros:** gastos compartidos de dos personas, quién pagó, quién consumió, saldos, liquidaciones, **meta compartida con aportes atribuibles** y presupuesto conjunto **solo si lo activan**.
- **Grupo:** motor común extensible a N personas; P0 prioriza pareja de dos, sin bloquear diseño de autorización para grupos más amplios.
- **Visitante futuro:** demo pública ficticia y case study, sin acceso a datos privados; no bloquea MVP-1.

### 2.3 Principios

1. **Registrar antes de planificar.** La app es plenamente utilizable **sin presupuesto**, también al crear metas; su ausencia nunca equivale a «límite = 0».
2. **Una misma experiencia hermosa y real.** Diseño, microinteracciones y calidad técnica se entregan junto con las funciones que representan; no hay una fase de cosmética obligatoria post-MVP.
3. **Mobile-first, desktop-first class.** Diseñar primero el flujo táctil, pero crear composición, densidad y navegación específicas para ordenador; no estirar tarjetas.
4. **Captura en menos de 10 s** para el caso habitual tras onboarding, sin sacrificar la validación financiera.
5. **Dimensiones financieras separadas:** gasto, consumo asignado, pagado, deuda y ahorro asignado a metas; nunca confundir ahorro con consumo ni aportes con obligaciones entre integrantes.
6. **Privacidad por defecto:** un gasto privado nunca se revela a miembros de grupos, tampoco por agregados, errores ni analítica.
7. **Movimiento semántico:** animación que explica relaciones, cambios y estados. Soporta reduced motion, lectores de pantalla, latencia y fallos.
8. **Sin culpa:** no mensajes punitivos, rankings de pareja ni alarmas por no crear presupuesto.
9. **Decisiones verificables:** IA jamás altera cifras oficiales; no inventar precios ni garantizar «te alcanza».
10. **Sin sobreingeniería:** tests sólidos de dinero/seguridad, smoke E2E de lo esencial y QA visual obligatorio; PRs pequeños.

### 2.4 Exclusiones conscientes del MVP-1

No conexión bancaria, **custodia o transferencia automática de dinero**, compra de inversiones financieras, rentabilidades, OCR, captura por voz, sincronización offline completa, IA, comparación automática de productos, scraping, notificaciones de promociones, campañas Hot Sale, multi-SKU, motor de restaurantes, gamificación y monetización. La instalación como PWA puede prepararse de forma mínima y segura, sin prometer guardado offline.

**DEC-R17 — No presumir liquidez:** sin presupuesto nunca decir «te alcanza»; **con presupuesto tampoco** se deduce saldo de cuenta o capacidad de pago, salvo que exista información específica y suficiente. Presupuesto disponible ≠ dinero bancario disponible.

## 3. Alcance por entregas, no por sueños

El lanzamiento se llama **MVP-1 premium**. Puede tener entregas internas graduales, pero **la primera versión que ambos adoptan debe estar funcional y visualmente aprobada a la vez**. «Fase 0» es una exploración breve, no un proyecto paralelo de meses.

| Clasificación | Alcance | Nota |
| --- | --- | --- |
| **F0-a (preparación)** | 3 direcciones **estáticas** del Inicio; cada una a 390/1440 px, misma fixture | Elegir una; sin backend ni clips de motion |
| **F0-b (fundación visual)** | `DESIGN.md`, `MOTION.md`, app shell mobile/desktop, Expense Flow prototipo y estados con/sin presupuesto | No construir todo el producto con datos ficticios |
| **MVP-1 / P0 funcional** | Cuentas, privacidad, pareja, invitación, movimientos, repartos 50/50 y personalizados, saldos y liquidaciones | Datos reales, autorización y cálculos correctos |
| **MVP-1 / P0 planificación** | Gastos sin presupuesto como primera clase; crear/editar/desactivar presupuesto mensual opcional; **metas individuales y compartidas, aportes, retiros propios y uso de fondos vinculado a gasto** | No autogenerar límite ni confundir aportes con gastos |
| **MVP-1 / P0 visual** | S1–S4 y **S5 Goal Journey** en los flujos reales; dashboard, lista y formularios premium en móvil y escritorio | S5 es compacta y semántica, no una sub-app |
| **MVP-1 / P0 confianza** | RLS, idempotencia, pruebas de dinero, accesibilidad, error/loading/empty, exportación básica y recuperación | Bloqueante para uso de dinero real |
| **P1, después del MVP** | Recurrentes, presets, presupuestos sugeridos a partir de historial, **aportes programados y simulaciones avanzadas de metas**, análisis detallado, demo pública/case study | Se prioriza según uso real |
| **P1/P2 investigación** | Spike controlado de precios **tras cuatro semanas consecutivas de uso estable de MVP-1 por ambos usuarios** | Documento independiente, sin comprometer release |
| **P2** | OCR, voz, importación CSV, offline robusto, multidivisa, ofertas, Jev, Gemini y notificaciones | Cada funcionalidad por validar |

**Regla única para iniciar el spike de precios:** cuatro semanas consecutivas de uso estable de MVP-1 por ambos usuarios, sin defectos críticos de dinero, privacidad o pérdida de datos. No se exige completar MVP-2 ni MVP-3; esto no bloquea leer y conservar investigación, pero sí iniciar la integración de precios en el producto.

**No entra en F0:** landing pública, modo demo completo, benchmarking formal, Pro/monetización, sistema de precios. La demo interna con fixtures es un medio de QA; la **demo pública navegable** para portafolio puede prepararse tras abrir uso privado y no debe consumir el tiempo del flujo real.

**Regla de recorte cuando haya presión:** quitar una funcionalidad periférica o limitar grupos a pareja, pero preservar las experiencias S1–S5 dentro de los casos básicos, la calidad de datos y la privacidad. Si una animación experimental consume demasiado tiempo, reducir su complejidad sin eliminar su intención visual ni la elegancia del flujo.

## 4. Historias de usuario y pruebas de aceptación

Las historias de dinero son contratos automatizados. Las historias de UX se comprueban en teléfonos y escritorio, no solo con capturas de una UI estática.

| ID | Historia | Resultado verificable |
| --- | --- | --- |
| US-01 | Gasto privado, sin presupuesto | A registra COP 45.000 de transporte y solo A puede verlo. Dashboard muestra el gasto y **no** muestra presupuesto cero ni exceso. |
| US-02 | Cena en pareja | COP 180.000 pagados por A, 50/50: pareja gastó 180.000, A y B consumieron 90.000; B debe 90.000. Liquidación B→A por 90.000 deja deuda cero sin alterar gasto. |
| US-03 | Distribución personalizada | COP 150.000 al 70/30 deja 105.000/45.000 exactos; suma de asignaciones idéntica a total. |
| US-04 | Presupuesto opcional activo | Grupo crea presupuesto de restaurantes de 1.000.000 y gasta 1.180.000: 118% y 180.000 de exceso. Al desactivarlo siguen apareciendo gasto e historial, **no** cifras de límite cero. |
| US-05 | Privacidad RLS | Usuario ajeno no ve transacciones ni agregados privados o grupales, incluso invocando consultas sin filtros de cliente. |
| US-06 | Cambios y auditoría | Ediciones y anulaciones conservan historial auditado; liquidaciones realizadas no se reescriben en silencio. |
| US-07 | Sugerencia futura | Un presupuesto sugerido nunca se activa sin confirmación; con poca evidencia se omite la cifra. **No bloquea MVP-1.** |
| US-08 | Sin doble conteo | Gasto grupal 400.000 al 50/50: 400.000 del grupo, 200.000 asignados a cada persona; nunca se suman vistas solapadas a 800.000. |
| US-09 | Liquidez | Con o sin presupuesto, «restante del presupuesto» nunca se etiqueta «dinero que tienes» o «te alcanza». |
| US-10 | Corrección posterior a liquidación | Recalcular saldos si cambia el gasto sin modificar la liquidación confirmada; visualizar saldo invertido si corresponde. |
| US-11 | Miembros salientes | Si no existe snapshot histórico seguro, no se habilita salida/expulsión desde UI; no se pierden hechos propios silenciosamente. |
| US-12 | Captura rápida | Tras onboarding, registrar un gasto típico con cantidad/categoría/contexto en mediana <10 s en teléfono real; sin doble envío. |
| US-13 | Presupuesto ausente | No se obliga a crearlo al registrarse, al registrar gasto, al abrir dashboard ni al invitar a pareja. |
| US-14 | Transición de contexto | Cambiar Yo/Nosotros actualiza cifras, color/estructura y accesibilidad sin mostrar por un instante datos de otro alcance. |
| US-15 | Experiencia desktop | A 1440 px hay layout editorial con navegación, jerarquía y densidad propios; la pantalla no es el diseño móvil ampliado. |
| US-16 | Shared Balance | El usuario comprende quién debe, cuánto y cómo saldar, con visualización elegante que no parece una competencia. |
| US-17 | Reduced motion | Captura, cambio de contexto, relato de gasto y balance son completamente utilizables sin animaciones expresivas. |
| US-18 | Meta individual sin presupuesto | A crea una meta privada de 2.000.000 y asigna 250.000; solo A la ve. El progreso muestra 250.000, `gasto_consumo` queda igual, `aporte_a_metas` aumenta 250.000 y no se inventa límite de presupuesto. |
| US-19 | Meta compartida | A aporta 300.000 y B aporta 200.000 a una meta de pareja. El progreso es 500.000; los aportes son visibles con autor; no crean deuda ni liquidación por defecto y no alteran gastos. |
| US-20 | Gasto financiado con meta | Se utiliza 500.000 de una meta ya fondeada para una compra de 500.000. La meta baja 500.000, se crea o vincula **un único gasto real** y el indicador `total_destinado_neto` evita volver a considerar esos mismos 500.000 como dinero nuevo. |
| US-21 | Reserva frente a transferencia | Al reservar 100.000 dentro de la app, se muestra «apartado en Juntia» sin afirmar que cambió el saldo bancario. Si se declara transferencia a otra cuenta, se etiqueta «transferencia declarada», no «verificada por banco». |
| US-22 | Privacidad y autorización de metas | Un tercero no ve metas privadas ni sus aportes. Un miembro solo lee metas compartidas de grupos donde está autorizado y no puede atribuirse aportes de otra persona. |
| US-23 | Correcciones y retiro seguro | Un retiro o anulación de aporte no puede dejar la meta con saldo negativo ni modificar el histórico sin auditoría; la operación de gasto financiado y uso de meta es atómica e idempotente. |

**Escenario de aceptación de pareja antes del lanzamiento:** cada uno crea su cuenta, A registra gasto privado, B verifica que no puede verlo, crean pareja, registran 5 gastos compartidos (uno 70/30), realizan una liquidación parcial y otra completa, revisan la actividad mensual, crean una **meta individual y otra compartida**, realizan aportes independientes, registran un gasto financiado desde meta sin doble conteo, crean opcionalmente un presupuesto, lo desactivan y verifican que gastos y metas siguen visibles; completan las mismas tareas en móvil y escritorio. El equipo registra fallos y los corrige antes del lanzamiento.

**Prueba ligera de competencia:** usar Tricount juntos durante unos **20 minutos en un teléfono** para observar fricciones de registro y liquidación; no se exige informe formal ni bloquea F0.

## 5. Dominio y reglas de dinero

### 5.1 Dimensiones financieras que no deben confundirse

| Métrica | Definición | ¿Altera presupuesto? |
| --- | --- | --- |
| `group_total` | Suma de gastos activos atribuidos a ese grupo y periodo | Sí: presupuesto del grupo |
| `personal_consumption` | Gastos privados propios + partes que corresponden al usuario en gastos grupales | Sí: presupuestos personales |
| `gross_paid` | Total que la persona pagó originalmente por gastos | No: refleja pagos, no consumo |
| `net_cash_outflow` | Salidas por gastos + liquidaciones enviadas − liquidaciones recibidas; sin fingir saldo bancario | No: indicador de flujo en el sistema |
| `net_owed` | Saldo del integrante frente al grupo por gasto pagado, partes asignadas y liquidaciones | No |
| `settlement` | Movimiento de compensación registrado entre integrantes | Nunca: no es un gasto |
| `goal_contribution` | Aporte registrado a una meta individual o compartida; representa **destinación de dinero**, no gasto de consumo | No; suma al indicador de dinero destinado |
| `goal_withdrawal` | Reversión/retiro de una asignación, auditado; reduce el saldo de la meta | No; resta del dinero destinado neto |
| `goal_usage` | Uso de fondos previamente asignados para financiar **un gasto vinculado** | El gasto vinculado sí cuenta; el uso no cuenta dos veces |

**Signo del balance:** saldo positivo = el grupo le debe a la persona; negativo = la persona debe al grupo. La suma de balances de un grupo debe dar cero con moneda homogénea y reglas de redondeo consistentes.

**Ejemplo de referencia:** comida de COP 180.000 pagada por A, reparto 50/50.

| Indicador | Antes | Después de B→A por COP 90.000 |
| --- | ---: | ---: |
| Gasto grupal | 180.000 | 180.000 |
| Consumo A | 90.000 | 90.000 |
| Consumo B | 90.000 | 90.000 |
| Pagado originalmente por A | 180.000 | 180.000 |
| Flujo neto de A dentro del sistema | 180.000 salida | 90.000 salida |
| Saldo a favor de A | 90.000 | 0 |
| Deuda de B | 90.000 | 0 |

**Las metas NO alteran `net_owed`** ni generan deudas por diferencias entre aportes. Una meta de pareja suma aportaciones declaradas; no impone un reparto 50/50 de ahorro, salvo que se implemente más adelante un compromiso explícito independiente.

**Fórmula por integrante para un grupo, sin cuentas múltiples:**

`net_owed = sum(pagos_de_gastos) − sum(partes_asignadas) − sum(liquidaciones_recibidas) + sum(liquidaciones_enviadas)`.

Liquidaciones parciales son válidas; el total neto se recalcula en cada cambio. Para P0 **no se permite registrar una liquidación que aumente deliberadamente el sobrepago**, salvo que una corrección posterior produzca un saldo invertido. Las liquidaciones deben asociarse a dos miembros activos del mismo grupo y a una moneda idéntica. Si existe deuda neta entre ambos, el importe de liquidación se limita a la deuda pendiente de la dirección elegida; no se implementa una optimización automática compleja para N personas en P0.

### 5.2 Importes, moneda, periodo y precisión

- Persistir importes como enteros de **unidades menores ISO 4217** (`bigint` en PostgreSQL), nunca `float` ni dinero en números JS de punto flotante. Serializar al frontend en strings decimales cuando corresponda.
- COP tiene escala ISO de dos decimales; para el ingreso manual P0 de COP se aceptan pesos enteros, se convierten de forma exacta a unidades menores y se muestran sin decimales habituales. No confundir «pesos ingresados» con «centavos almacenados».
- Cada transacción lleva código de moneda ISO 4217. En P0, gastos de grupo y liquidaciones usan la moneda configurada del grupo; una operación distinta se rechaza, no se convierte silenciosamente.
- `transaction_date` define el mes presupuestal; `created_at`/`updated_at` son auditoría. El periodo mensual se interpreta según la zona horaria explícita del contexto (inicialmente `America/Bogota`).
- Un cálculo de redondeo por partes siempre produce suma exacta igual al importe origen. Para porcentajes, aplicar asignación de mayor residuo y desempate estable por identificador de participante (algoritmo versionado), en vez de asumir arbitrariamente que todos los centavos van al pagador.
- `budget_remaining` existe **solo si hay presupuesto activo**, puede ser negativo y muestra «excedido» en lugar de ocultarlo en cero. Las categorías no asignadas deben contar en el total de gastos del contexto. **Los aportes a metas no son consumo de categorías presupuestales; tienen seguimiento separado.**
- Usar eventos/estados de anulación auditada, no eliminación silenciosa de movimientos financieros.

### 5.3 DEC-R01 — Presupuestos opcionales y no aditivos

**Presupuesto ausente no es presupuesto cero.** El dominio diferencia expresamente: (a) no existe presupuesto, (b) existe presupuesto activo con límite válido, (c) presupuesto archivado/desactivado. Las consultas no fabrican `limit=0` mediante `COALESCE`; el frontend recibe `budget: null` o un estado tipado equivalente. El límite monetario cero **no se admite** como presupuesto activo en P0, salvo una regla de producto explícita futura.

El registro, historial, resumen por categoría, importes mensuales, balances y liquidaciones funcionan sin presupuesto. El onboarding no pregunta obligatoriamente «¿cuánto quieres gastar?»; ofrece esa opción como secundaria. Sin presupuesto, dashboard y **Spending Story** usan transacciones, tendencias disponibles y categoría, no «restante», «excedido» ni barras vacías fingiendo límites. Con presupuesto activo aparecen consumo, porcentaje, desviación y ritmo.

Existen dos atribuciones paralelas **no aditivas**:

1. **Presupuesto grupal opcional:** consume el importe completo de gastos activos del grupo/periodo/categoría. Nunca incorpora gastos privados.
2. **Presupuesto personal opcional:** consume gastos privados de la persona y la parte económica asignada a esa persona en gastos grupales de la categoría/periodo.

Ejemplo: mercado grupal 400.000, 50/50. Si existen los tres presupuestos, el grupo consume 400.000; cada persona consume 200.000. No sumar 400.000 + 200.000 + 200.000 como «gasto consolidado». El gasto total real viene de transacciones únicas. Si no existe uno o ninguno de los presupuestos, el consumo y los gastos **siguen existiendo**.

Presupuestos P0: mensuales, por contexto/categoría/moneda/periodo; crear, editar, archivar y consultar histórico. El catálogo canónico evita mapeos ambiguos; categorías custom P1. Ingresos y liquidaciones no cuentan como consumo. La UI etiqueta claramente período, contexto y moneda. El modo sin presupuesto se diseña y prueba tan cuidadosamente como el modo con presupuesto.

**Presupuesto sugerido (posterior, DEC-R01-S):** no activar automáticamente. Con pocas transacciones no proponer importe; con al menos un periodo razonablemente completo se podría mostrar una hipótesis editable con incertidumbre; con varios meses comparar categorías/medianas y gastos extraordinarios. Activación siempre manual y opt-in. El umbral exacto se calibra con datos y UX reales, no con números arbitrarios en P0.

**DEC-R17 — Asequibilidad:** ningún presupuesto, ni siquiera uno holgado, demuestra que alguien disponga del dinero en caja o cuenta. Juntia no dice «te alcanza», «puedes pagarlo» o «es financieramente seguro» sin datos suficientes y una política de inferencia explicitada; en MVP-1 se limita a describir gasto y presupuesto.

### 5.4 Edición, anulaciones, correcciones y devolución

- **Edición:** registrar actor, instante, valor anterior y nuevo en auditoría. Actualizar el estado efectivo del gasto y recalcular partes y balances mediante una operación atómica.
- **Anulación:** excluir el gasto anulado de agregados actuales; conservar su rastro de auditoría. No borrar liquidaciones previas relacionadas.
- **Gasto ya liquidado:** si una corrección invierte el balance del grupo, mostrar saldo a favor o deuda revisada; nunca «revertir» una transferencia real sin un nuevo asiento explícito.
- **Reembolso completo en P0:** puede representarse como anulación **solo si realmente revierte íntegramente el gasto original**; si hubo consumo parcial o devolución parcial, no manipular el gasto con importe negativo arbitrario. Usar modelo explícito de refund vinculado en P1.
- **Idempotencia:** cliente genera `idempotency_key` única por intención de escritura; servidor impone unicidad por actor/acción/contexto, para evitar duplicados en doble tap o reintentos.
- **Atomicidad:** creación/edición de gasto y asignaciones se confirman o revierten como una unidad; no se deja un gasto sin reparto válido.

### 5.5 Reglas de participantes y lifecycle

- Un grupo de tipo `couple` admite **máximo dos integrantes activos**; el tipo `group` permite N según política de producto.
- Un grupo nunca ve movimientos privados, aunque pertenezca a las mismas personas.
- El creador es `owner`; el rol `member` puede registrar y consultar según permisos. Solo `owner` administra invitaciones, roles y cierre de grupo en P0.
- Invitaciones: token aleatorio almacenado como hash, caducidad, aceptación autenticada, un solo uso, validación de límite de participantes y protección contra repetición.
- **Salida/expulsión (ADR-003):** por defecto, revocar inmediatamente el acceso al grupo, sus movimientos, participantes y archivos. Para preservar hechos propios, antes de habilitar la acción se implementa un **resumen histórico mínimo, propiedad del miembro**, con fecha, monto pagado, parte asignada, categoría canónica y saldo final al momento de salir, sin notas ni adjuntos de otras personas. No otorga acceso a los registros activos del grupo. Si el resumen seguro aún no existe, la UI de salida/expulsión queda deshabilitada en P0 y documentada como pendiente; no implementar una revocación que destruya el historial del usuario por accidente.
- Si al salir hay deuda, solicitar primero resolución o confirmar un proceso explícito de cierre, sin generar liquidaciones ficticias.
- Los exportes de datos propios y el borrado de cuenta respetan derechos aplicables y retención/auditoría estrictamente necesaria; la política final requiere revisión legal antes de publicación pública.

### 5.6 DEC-G01 a DEC-G06 — Metas individuales y compartidas (P0)

**Objetivo funcional:** permitir reservar o registrar aportes hacia una meta sin convertirlos artificialmente en consumo; mostrar cuánto del dinero del período se destinó a **gastos** y cuánto a **metas**. No es una cuenta bancaria, instrumento de inversión, billetera custodiada ni promesa de rentabilidad. Se usará el término **«aporte a una meta»** o «ahorro destinado», no «inversión financiera» por defecto.

**DEC-G01 — Tipos y alcance.** Una meta (`goal`) tiene propietario **privado** (`owner_user_id`) **XOR** grupo (`group_id`), título, icono/categoría visual, monto objetivo positivo, moneda COP P0, fecha objetivo opcional y estado `active | completed | archived`. Metas privadas solo para su propietario; metas compartidas visibles a integrantes activos autorizados. Las metas funcionan **con presupuesto y sin él** y no tienen obligación de porcentaje de aporte entre integrantes. Para P0 solo pareja de dos en UI, con dominio preparado para grupos N.

**DEC-G02 — Operaciones permitidas.** Crear/editar meta; aportar (`goal_contribution`), consultar aportes por miembro, **retirar o desasignar contribuciones propias no consumidas** con motivo, registrar uso de fondos contra **un gasto real** (`goal_usage` vinculado a `transaction_id`) y archivar cuando el balance esté reconciliado. Todas con actor, timestamp, idempotencia y auditoría. No se crea un banco ni movimientos automáticos. Una modificación no puede forzar saldo negativo; el gasto y su uso de meta se registran de forma atómica. Al retirar recursos compartidos de terceros o pretender utilizar sus aportes, P0 requiere **confirmación explícita del otro miembro** antes de aplicarse; si no está implementada, la operación queda bloqueada, sin vía de autorización implícita.

**DEC-G03 — Reserva declarativa vs transferencia.** Cada aporte indica `funding_mode`: `reserved` (dinero mentalmente apartado **dentro de Juntia**, sin salida bancaria demostrada) o `transferred_declared` (usuario declara haber movido dinero a una cuenta propia, **sin verificación bancaria**). Ambos aumentan el progreso de la meta, pero solo la transferencia puede describirse como movimiento entre cuentas declarado. No inferir saldos bancarios reales o liquidez a partir de la reserva. P0 no rastrea entidades bancarias ni concilia estados externos.

**DEC-G04 — Métricas y anti-doble-conteo.** El uso de una meta compartida se atribuye a los **aportantes cuyos fondos asignados se consumen**, no automáticamente al mismo 50/50 del gasto: cada uso conserva sus `goal_usage_allocations` exactas por integrante, y la suma equivale al uso total. El gasto mantiene su reparto económico independiente. Esta separación hace que el `total_destinado_neto` individual y el grupal concilien sin imputar ahorro de otra persona. Si no existe atribución válida o falta consentimiento sobre aportes ajenos, rechazar la operación. Se muestran en paralelo:

- `gasto_consumo`: compras y servicios reales del periodo, privados más partes asignadas según la vista; **no incluye aportes a metas**.
- `aporte_a_metas`: nuevas asignaciones en el periodo; en vista grupal se presenta el total y en vista individual solo los aportes propios, **sin sumarlos entre vistas**.
- `retiro_de_metas`: dinero desasignado durante el periodo, no equivale a ingreso ganado.
- `gasto_financiado_con_meta`: porción de un gasto real enlazada a fondos antes asignados; el mismo gasto sigue en `gasto_consumo`, pero se identifica como financiado con ahorro previo.
- **`total_destinado_neto` (métrica de planificación, no saldo bancario)** = `gasto_consumo + aporte_a_metas − retiro_de_metas − gasto_financiado_con_meta`. Esto evita contar dos veces un mismo dinero cuando se ahorra en un periodo y se utiliza después. Puede ser negativo en periodos de liberación neta; explicar el signo y nunca renombrarlo como «total gastado».

Ejemplo A: noviembre, COP 2.000.000 de consumo y COP 500.000 apartados para viaje: **gasto COP 2.000.000, aportes COP 500.000, total destinado neto COP 2.500.000**. Ejemplo B: diciembre, se compra algo por COP 500.000 usando íntegramente aquella meta: **gasto de consumo COP 500.000, gasto financiado con meta COP 500.000 y dinero nuevo destinado neto a ese uso COP 0**. La actividad conserva el gasto como compra real y muestra el uso del ahorro anterior. Si se libera una reserva en vez de comprar, el retiro se presenta como reasignación, no ingreso. La fórmula debe implementarse mediante funciones puras probadas; no mezclar resúmenes de **Yo** y **Nosotros** para fabricar un consolidado duplicado.

**DEC-G05 — Progreso y cierres.** `goal_balance = Σ contributions − Σ withdrawals − Σ usages`, siempre ≥ 0 por meta. `progress = goal_balance / target`, con estado de meta completada configurable (el objetivo alcanzado no implica que se haya comprado nada). Al financiar una compra y disminuir el balance, la actividad conserva el hito de ahorro alcanzado y muestra explícitamente el uso; no ocultar el movimiento histórico. Si una meta se supera, mostrar excedente de manera neutra. No calcular intereses, rendimientos ni valorizaciones sin fuente independiente.

**DEC-G06 — Privacidad, membresía e integridad.** Una aportación privada jamás es visible a la pareja. En metas compartidas, actor y contribuyente deben ser miembros activos, salvo snapshots históricos seguros según ADR-003; el cliente no puede crear aportes a nombre de terceros. Acciones sensibles comprobadas en servidor y RLS; `goal_usage` requiere gasto del mismo contexto, misma moneda, fondos disponibles **por aportante**, distribución de uso reconciliada y confirmaciones requeridas. Auditoría, idempotencia y validación de cantidades son **bloqueantes**. Las contribuciones no cambian `net_owed`, `group_total` ni el consumo de presupuestos.

**Alcance de P0:** metas personal/pareja, importe y fecha opcional, progreso, aportes, retiro propio y compra vinculada a meta, con diseño premium. Fuera de P0: débitos automáticos, banca conectada, metas con rendimientos, inversiones reales, multimoneda, metas condicionales, reglas de contribuciones periódicas, aprobación de N participantes y sugerencias IA.

## 6. Dirección de arte y sistema de motion — parte del MVP

### 6.1 Identidad visual

**Territorio provisional:** *Warm Editorial Finance*: composición editorial premium + precisión financiera + calidez humana. La identidad de **Juntia** parte de juntar, construir y avanzar; arcos, trayectorias, proximidad y conexiones pueden expresar esa idea, sin imponer un logotipo antes de elegir la dirección. Evitar dashboards de tarjetas indistinguibles, exceso de degradados, decoraciones que no enseñan nada y copia de otros productos.

**Principio creativo:** «Expresar sin distraer; informar sin juzgar». La ambición es construir una obra web con criterio de diseño —potencialmente presentable a Awwwards o Webby— y un producto que merezca ser usado, **sin garantizar nominación ni premio**.

**Tipografía candidata:** Instrument Serif para titulares editoriales puntuales, Geist o Manrope para UI, Geist Mono para microetiquetas; revisar licencias. Números tabulares y formato COP de Colombia. Las elecciones finales se cierran tras F0-a.

| Token propuesto | Claro | Uso |
| --- | --- | --- |
| `canvas` | `#F7F6F2` | Fondo general |
| `ink` | `#15241F` | Lectura principal |
| `surface` | `#FFFFFF` | Contenedores |
| `primary` | `#356A53` | Acciones, contraste por verificar |
| `lime-soft` | `#D9E5C7` | Apoyos y progresos |
| `alert-coral` | `#C86553` | Exceso, nunca solo color |
| `sand` | `#E6D6BF` | Acentos |
| `ink-muted` | `#60716A` | Texto secundario, validar AA |

Se diseña un tema oscuro propio por tokens semánticos, no mediante inversión automática de colores. **DESIGN.md** determina tipografía, ritmo de espaciado, componentes, layouts, tokens y ejemplos aprobados. Ninguna skill puede reemplazar esa decisión sin revisión humana.

### 6.1.1 Sistema de iconografía — obligatorio en MVP-1 (DEC-V03)

**Problema que evita:** una interfaz con excelente tipografía y motion puede seguir sintiéndose genérica o incompleta si la navegación, las categorías y los estados quedan sin iconos. La iconografía es una **parte explícita del diseño aprobado**, no un agregado decorativo al finalizar.

**Bibliotecas candidatas gratuitas y compatibles con uso comercial (verificar licencia al instalar):**

| Biblioteca | Licencia | Carácter | Uso sugerido |
| --- | --- | --- | --- |
| [Phosphor Icons](https://phosphoricons.com/) / `@phosphor-icons/react` | MIT | Expresiva; familias regular, bold, fill y duotone | **Primera candidata** para la identidad cálida y editorial |
| [Tabler Icons](https://tabler.io/icons) / `@tabler/icons-react` | MIT | Precisa, extensa, línea consistente | Alternativa si se elige Quiet Precision |
| [Lucide](https://lucide.dev/) / `lucide-react` | ISC | Sobria y muy integrada con shadcn | Alternativa técnica si se necesita máxima simplicidad |
| [Iconoir](https://iconoir.com/) / `iconoir-react` | MIT | Delgada y refinada, trazo 1.5px | Alternativa para dirección minimalista |

**Decisión:** F0-a compara **tratamiento iconográfico visible** en cada una de las tres propuestas. F0-b elige **una biblioteca primaria**, documenta el porqué y bloquea su uso consistente en `DESIGN.md`. Phosphor es el valor predeterminado **propuesto**, no una elección impuesta antes de ver las tres direcciones. Evitar mezclar Phosphor, Lucide y Tabler en una misma pantalla por conveniencia. Si shadcn trae iconos Lucide por defecto y se elige Phosphor, se adaptan los componentes para usar el sistema seleccionado. Iconos especiales, ilustraciones SVG propias y logos de marca externa son excepciones documentadas.

**Inventario mínimo obligatorio para el primer MVP:**

- **Navegación:** Inicio, Movimientos, **Metas**, Plan/Presupuestos, Nosotros/Grupo, Perfil y acción principal Agregar; la agrupación final respeta el espacio móvil.
- **Categorías:** supermercado/mercado, restaurantes, hogar, transporte, salud, entretenimiento, compras, servicios/suscripciones e ingresos. Incluir estado «Otra»; categorías editables utilizan un fallback coherente.
- **Acciones y estados:** guardar, editar, buscar, filtrar, compartir, dividir, liquidar, **aportar a meta, retirar, progreso, meta completada**, volver, confirmar, advertencia, error, éxito, sincronizando, sin movimientos y sin presupuesto.
- **Identidad propia:** pictogramas/SVG de autor solo en puntos memorables (empty states, Shared Balance, Spending Story, **Goal Journey** y momentos de onboarding), con lenguaje visual emparentado con arcos y trayectorias; no usar emojis como reemplazo de iconografía del producto.

**Reglas de diseño/implementación:**

1. `DESIGN.md` contiene selección de set, mapa semántico `concepto → icono`, tamaños, pesos, color, estados activos y ejemplos mobile/desktop. Se crea un `AppIcon` o wrapper tipado para impedir variaciones arbitrarias.
2. Tamaños orientativos: **16 px** para metadatos, **20–24 px** en acciones y navegación, **28–32 px** en momentos destacados. Íconos y textos se alinean en la misma retícula óptica; no reducir la zona táctil: controles de **al menos 44×44 px**.
3. Navegación principal y acciones críticas muestran **etiquetas textuales**; ningún icono ambiguo sustituye por sí solo «Registrar gasto», «Liquidar» o «Compartir». Todo botón solo-icono lleva nombre accesible (`aria-label` en el control); los SVG decorativos se ocultan a lectores de pantalla.
4. Iconos de estado nunca comunican éxito, exceso o advertencia solo mediante color. Mantener contraste, grosor y legibilidad en modos claro/oscuro y a 360–430 px.
5. Las transiciones de iconos pueden usar Motion si tienen semántica (selección, adición, confirmación, cambio de contexto), respetando `MOTION.md` y `prefers-reduced-motion`. Evitar morphs ornamentales continuos.
6. Importar componentes SVG individuales con tree shaking, sin cargar icon fonts o sets completos; fijar versiones y registrar avisos de licencia en el repositorio cuando correspondan.

**Gate visual:** F0-a enseña iconografía en los seis mockups; F0-b entrega un inventario mínimo renderizado en navegación, categorías y Expense Flow; cada slice de P0 incluye sus iconos y estados **a la vez que su funcionalidad**, no en un supuesto pulido posterior. Se rechaza una pantalla con placeholders de iconos, emojis sustitutos o iconografía inconsistente.

### 6.2 Exploración F0-a — corta y concreta

Tres variaciones **estáticas de la misma pantalla Inicio**, con los **mismos datos**, cada una a **390 px móvil y 1440 px escritorio**:

- **A — Warm Editorial:** titulares expresivos y visualización protagonista.
- **B — Quiet Precision:** mayor densidad, calma y legibilidad.
- **C — Bold Utility:** captura directa, cifras más protagonistas y controles claros.

El objetivo es elegir dirección, no construir seis aplicaciones. Una revisión de ambas personas selecciona una y documenta 5–10 reglas en `DESIGN.md`, **incluyendo el tratamiento de iconografía**. **F0-a no incluye motion clips, backend, landing ni benchmark formal**. Las tres variantes usan también **el mismo miniestado de meta** (p. ej., ahorro de viaje), evitando diseñar un dashboard que luego no tenga lugar para una función P0.

### 6.3 Mobile-first y excelente en desktop

**Móvil:** revisar 360, 390 y 430 px, safe areas iOS, teclado virtual, menú inferior, objetivo táctil ≥44×44, acceso continuo a «Agregar», contexto inequívoco, scrolling con gestos naturales y recuperación de errores. Las acciones frecuentes quedan al alcance de una mano donde sea razonable.

**Escritorio:** revisar 1024 y 1440 px y pantallas anchas; sidebar o rail, columnas editoriales asimétricas, panel de detalle contextual, navegación teclado/mouse, hover/focus consistentes, contenido bien limitado y mayor densidad útil. **No** ampliar mecánicamente la UI móvil. La app debe sentirse diseñada para escritorio aunque la lógica móvil sea prioritaria.

**Estados equivalentes en los dos formatos:** sin movimientos, sin grupo, **sin presupuesto**, con presupuesto, **sin metas, con metas, meta completada y retiro rechazado**, exceso, datos extremos, error, loading, latencia, reduced motion, dark, muchos movimientos, textos largos, permisos denegados. Son parte del diseño y de la aceptación.

### 6.4 Experiencias insignia S1–S5 — integradas con datos reales en MVP-1

**S1 — The Context Transition** (nombre de interacción, visualmente asociada a Juntia). Al cambiar Yo ↔ Nosotros, la composición y métricas se transforman con layout compartido, manteniendo continuidad, separación de permisos y títulos claros. Evitar flashes de datos de otro contexto y animar únicamente después de recibir información apropiada.

**S2 — The Expense Flow.** CTA accesible → bottom sheet o modal adaptado a viewport → importe protagonista y controles ergonómicos → selección explícita de contexto/pagador/reparto → guardar con estado pendiente/éxito/error → transición al listado actual. Confirmación discreta y deshacer solo cuando sea seguro; un gesto genera una transacción (idempotencia). Objetivo típico <10 s.

**S3 — The Spending Story** (evolución de Budget Story). **Sin presupuesto:** mostrar gasto acumulado por tiempo, categorías, comparación si hay datos y una historia visual descriptiva; jamás mostrar alerta de exceso, cero ficticio o proyección sin base. **Con presupuesto:** sumar límite, consumido, desviación y ritmo; comunicar sobrepaso con texto, forma y color. El mismo componente adapta su narrativa, no crea una pantalla castigo para quien no planifica.

**S4 — The Shared Balance.** Animación elegante de quién pagó, a quién corresponde consumo y qué saldo queda; una liquidación transforma de manera continua el balance mostrado **sin disminuir el gasto del grupo**. Se evita representar ganadores/perdedores entre pareja; números finales legibles y verificables, no escondidos por partículas.

**S5 — The Goal Journey.** Una meta personal o compartida muestra progreso en una composición editorial cuidada, con iconografía propia, aportes de cada participante y movimiento intencional al registrar un aporte o vincular una compra. **No** se presenta el ahorro como gasto, ni como saldo bancario verificado. Si la meta disminuye por un uso, la visualización explica qué se logró y cómo se utilizó el dinero, sin una animación de «pérdida». Es una interacción compacta dentro de la pantalla de metas; no requiere un nuevo micrositio ni un motor 3D.

**Gate de cada experiencia:** funciona con datos persistidos y estados negativos; se comprueba en 390/1440, teclado y pantalla táctil, reduced motion, errores de red, números largos, carga lenta y refrescos. Un screenshot bonito no basta; guardar/repartir/liquidar debe operar realmente.

### 6.5 MOTION.md obligatorio desde F0-b

`MOTION.md` es un artefacto de primera clase junto a `DESIGN.md`; contiene:

1. Principios de movimiento y jerarquía: feedback, continuidad, emoción y límites.
2. Tokens: `instant` ~90–140 ms; `standard` ~180–260 ms; `expressive` ~350–550 ms; `spring` por física moderada; `stagger` ~30–55 ms para grupos breves.
3. Especificación de S1–S5: estados, entrada/salida, gestos, tiempos, interrupciones, errores y fallback sin movimiento.
4. Presupuesto de rendimiento: preferir transform/opacity; medir en móvil de gama media; no animaciones continuas ni canvas/WebGL en dashboards.
5. Accesibilidad: `prefers-reduced-motion`, foco preservado, lectura asistida, números finales en DOM, no ocultar validaciones tras efectos.
6. Rúbrica de QA: fluidez, continuidad, intención, comodidad y coherencia desktop/móvil; clips internos de los flujos **implementados**, no obligación en F0-a.

Motion for React para gestos y layout; CSS para feedback simple; View Transitions solo donde compatibilidad y coordinación con Motion funcionen. React Bits en elementos específicos con licencia revisada. GSAP/Lenis **solo eventualmente para la landing posterior**, no para el gasto diario. Nunca dos librerías compitiendo por un mismo nodo.

### 6.6 Herramientas y criterio de selección

| Herramienta | Uso | Restricción |
| --- | --- | --- |
| Tailwind + tokens + shadcn/Radix | Base accesible y personalizable | No conservar aspecto genérico por defecto |
| Motion for React | S1–S5, gestures/layout/presence | Cada motion debe explicar estado |
| CSS propio | Hover, focus, transiciones simples | Mantener perceptible en pantallas táctiles |
| SVG propio/visx/Recharts | Visualizaciones financieras | Texto y alternativa accesibles |
| React Bits | Efectos acotados, muy personalizados | Revisar licencias; no WebGL continuo en dashboard |
| Taste Skill v2 | Landing/portfolio posterior | No dirige dashboards internos |
| Impeccable + emil-design-eng | Dirección/UI y auditoría de motion | Aplicar skills relevantes, no todos siempre |

### 6.7 Criterio subjetivo, pero verificable de aprobación «wow»

Antes de dar por lanzado MVP-1, ambos usuarios prueban en móvil y escritorio las experiencias S1–S5, **incluida la meta compartida**, usando datos reales; cada uno describe por separado qué es claro, qué impresiona y qué estorba. El objetivo es que **ambos digan que se ve y se siente excelente sin sacrificar velocidad**. Feedback humano documentado + fallos concretos corregidos; esto no sustituye a tests financieros ni promete premio.

## 7. Arquitectura y datos

### 7.1 Estrategia técnica

**Monolito modular Next.js/TypeScript**; sin microservicios ni monorepo obligatorio en P0. Separar dominio financiero, acceso a datos, UI y conectores de terceros para permitir evolución sin reescritura.

| Capa | Propuesta |
| --- | --- |
| App | Next.js App Router + React compatible + TypeScript strict |
| Rendering | Server Components donde aporten, client components para experiencias interactivas |
| UI | Tailwind + tokens propios + shadcn/ui/Radix personalizado |
| Formularios | React Hook Form + Zod; validación repetida en servidor |
| Estado | TanStack Query solo para caché cliente pertinente; optimistic UI donde haya rollback claro |
| Persistencia | Supabase PostgreSQL con RLS y migraciones versionadas |
| Auth | Supabase Auth, cookies/sesiones seguras |
| Archivos | Supabase Storage privado (P1) |
| IA | Adaptadores en servidor con secrets fuera del cliente |
| PWA | Manifest y estrategia de service worker seleccionada tras prueba con la versión real de Next; no fijar Serwist sin validar bundler |
| Deploy | Vercel Hobby **solo uso personal no comercial**; revisar plan antes de SaaS |
| CI | lint, typecheck, unit de dominio, integración RLS, build y pocos E2E smoke |

Verificar compatibilidad exacta de la versión estable de Next, React, Motion y estrategia PWA **durante bootstrap**; registrar versiones fijadas y lockfile. React 19.3 introdujo estabilidad de View Transitions, pero el enrutador y los navegadores deben validarse para cada caso.

### 7.2 Estructura propuesta

```text
src/
  app/                    # rutas, layouts, errores y carga
  features/
    auth/
    expenses/
    groups/
    budgets/
    goals/
    activity/
    insights/
    demo/               # P1: demo pública aislada, después de MVP-1
  domain/
    money/                # Money, moneda, escala y redondeo
    transactions/         # reglas por tipo y validación
    allocations/          # partes y porcentajes
    balances/             # deuda y liquidaciones
    budgets/              # atribución y cálculo
    goals/                # aportes, saldo, uso y cero doble conteo
  components/
    ui/                   # primitivos accesibles
    finance/              # SVG, indicadores y gráficos
  lib/
    db/
    supabase/
    security/
    analytics/
    ai/                 # posterior, no dependencia P0
  styles/tokens.css
supabase/
  migrations/
  tests/rls/
docs/
  adr/
  research/
  design/
```

**Regla de dependencia:** `domain` no importa componentes React ni SDK de IA, Supabase o Vercel. Las operaciones persisten en transacciones del servidor y devuelven objetos normalizados y validados.

### 7.3 Modelo relacional inicial

| Tabla | Propósito | Restricción notable |
| --- | --- | --- |
| `profiles` | Preferencias y datos mínimos | Propiedad por `auth.uid()` |
| `groups` | Tipo, moneda, zona horaria, creador | `couple` ≤ 2 miembros activos |
| `group_members` | Miembros, rol, fechas y estado | Membresía como autoridad |
| `group_invitations` | Destino, token hash, caducidad | Aceptación atómica y de un uso |
| `categories` | Catálogo canónico del sistema P0 | Categorías propias P1 |
| `transactions` | Gasto/ingreso/liquidación, fecha, autor, moneda | Scope privado **XOR** grupo |
| `transaction_allocations` | Porción exacta asignada a cada miembro | Total = importe del gasto; cada miembro válido |
| `budgets` | Límite **opcional** por contexto, categoría, periodo y moneda | Ausencia ≠ cero; una configuración activa por clave |
| `savings_goals` (P0) | Meta privada XOR grupal, nombre, importe objetivo, moneda, fecha opcional y estado | RLS por dueño o membresía; balance derivado, nunca negativo |
| `goal_ledger_entries` (P0) | Aporte, retiro propio o uso enlazado a transacción | Registro inmutable/auditado, actor, monto positivo, tipo, funding mode si es aporte, idempotencia; links válidos |
| `goal_usage_allocations` (P0) | Importe de un uso de meta consumido de aportaciones disponibles por miembro | Suma exacta = uso total, autorización y balance disponible por aportante |
| `goal_usage_confirmations` (P0) | Aprobación del otro integrante cuando se usan aportes ajenos | No confirmar = no ejecutar uso compartido sensible |
| `audit_events` | Autor, cambio y entidad, metadata mínima | Sin edición directa desde cliente |
| `member_history_snapshots` | Resumen histórico mínimo de exintegrante | Solo propietario; sin datos de terceros |
| `idempotency_records` | Control de repetición por intención | Clave única acorde al actor/acción |
| `recurring_rules` (P1) | Recurrentes | Instancias sin duplicados |
| `attachments` (P1) | Recibos privados | Política por transacción y estado de membresía |
| `ai_insights` (P1) | Resultados estructurados/versionados | Alcance, consentimiento, expiración |
| `refunds` (P1) | Ajustes parciales vinculados | Nunca reembolso huérfano |

**Contrato por tipo:** en P0 `expense` puede ser privado o de grupo; `income` es privado; `settlement` es solo grupal, entre dos miembros y sin categoría presupuestal. `goal_ledger_entries` pertenecen al motor de metas y NO se insertan como gastos ficticios en `transactions`; `goal_usage` referencia un gasto legítimo existente o creado atómicamente. `payer_user_id` aplica a gastos; `from_user_id/to_user_id` aplica a liquidaciones. Si se utiliza una única tabla con columnas opcionales, CHECK constraints fuerzan combinaciones legales; también es válida la separación física de liquidaciones si reduce ambigüedad. Documentar la decisión antes de migrar.

**Operaciones críticas:** creación de gasto+allocations, aceptación de invitación, corrección+auditoría, liquidación, **aporte/retiro y uso de meta con gasto enlazado** deben ser transacciones atómicas. El cliente no puede suministrar una lista de participantes que no pertenezcan al grupo. Todas las escrituras validan ownership, membresía, tipo, moneda y fecha en servidor/SQL; RLS es última barrera, no sustituto de dominio.

### 7.4 Privacidad, autorización y demo

- RLS en todas las tablas expuestas y buckets privados. `USING` y `WITH CHECK` acordes a propiedad/membresía, no solo `TO authenticated`.
- No autorizar con `user_metadata` editable; no exponer keys privilegiadas en `NEXT_PUBLIC_*`; minimizar JWT stale claims.
- Vistas de reporte con `security_invoker` (cuando aplique); evaluar funciones privilegiadas caso por caso, sin `SECURITY DEFINER` por conveniencia.
- Metas privadas: solo propietario. Metas compartidas: membresía activa + autorización sobre aportes/uso; **no exponer metas privadas vía agregados o actividad compartida**. Un miembro no puede declarar aportes de otro.
- Nunca filtrar datos de privacidad solo en frontend: probar acceso directo por cliente autenticado de otro usuario.
- Al abandonar grupo, exmiembros no tienen lectura del grupo ni de sus archivos; solo su snapshot personal seguro si está implementado.
- Telemetría sin importe, comercio, notas, nombre propio, token o identificadores financieros sensibles; consentimiento/controles documentados.
- **Demo pública posterior al MVP-1** con fixtures estáticas aisladas de producción, sin credenciales ni datos financieros reales; las fixtures internas de F0 y QA nunca se confunden con persistencia real.
- Exportación y eliminación de datos con reglas claras; copia de seguridad externa cifrada y restauración de prueba antes del uso real de largo plazo.

### 7.5 Persistencia, PWA y confiabilidad

En P0, la web requiere conexión para guardar movimientos. Se puede cargar una interfaz demo y estados sin red, pero **no** prometer registro offline antes de una cola de sincronización segura.

Para P1 offline: operaciones con clave idempotente; cola local cifrada o protegida en la medida posible; reintentos seguros; orden, conflictos, cierre de sesión y expulsión de grupo explícitos; un gasto capturado sin red permanece «pendiente de sincronización», no se muestra como contabilizado en servidor.

Operación en niveles gratuitos: la suspensión por inactividad de Supabase Free es posible; no usar un «ping semanal» como garantía. Monitorizar avisos, practicar recuperación y considerar un plan superior cuando la app tenga uso relevante. Vercel Hobby no se utiliza para operación comercial. Limitar almacenamiento, adjuntos y consultas desde el principio.

## 8. Insights y oportunidades — futuro desacoplado

### 8.1 Primero datos confiables, no IA

El MVP-1 muestra agregados **deterministas**: gasto registrado por periodo/contexto, categoría, consumido por miembro, saldos netos y estado de presupuesto *cuando exista*. El historial ya es útil sin presupuestos ni sugerencias. En particular, no construir un motor de recomendaciones durante F0 ni durante los flujos críticos de pareja.

### 8.2 Presupuesto sugerido después del uso real

**DEC-R01-S:** con suficiente historial, ofrecer un **borrador voluntario** de presupuesto por categoría basado en datos reales, con periodo, método, intervalos y limitaciones. No autoactivar ni recurrir a LLM para hacer el cálculo oficial. Si hay un solo mes atípico, mostrar cautela o no sugerir importe. Permitir «Ver propuesta», «Editar», «Ahora no» y «No volver a sugerir».

### 8.3 IA posterior, privada y verificable

Gemini, Jev u otros modelos son opcionales. El código calcula cifras; la IA clasifica o explica señales basadas en agregados con consentimiento, sin acceder por defecto al historial privado completo. Resultados estructurados y validados, con fallback sin IA, cuota global y privacidad por contexto. No decir «te alcanza» por un descuento ni porque haya presupuesto restante (DEC-R17).

### 8.4 Price intelligence como línea de investigación separada

**No implementar para MVP-1:** adaptadores de supermercados, scrapers, matching SKU, históricos de precios, Search Grounding, APIs de Mercado Libre, restaurantes, ofertas Hot Sale y notificaciones. Todo vive en `docs/research/oportunidades.md`: hipótesis, cobertura por tienda, fuentes permitidas, permisos legales, riesgos, experimento de 10–20 artículos y arquitectura eventual. **Que una web sea pública o `robots.txt` permita una ruta no equivale a licencia de reutilización comercial.** Priorizar APIs y acuerdos oficiales; evaluar scraper solo si los términos lo permiten.

**Única entrada en roadmap:** «Spike controlado de precios, tras cuatro semanas consecutivas de uso estable de MVP-1 por ambos usuarios». El spike requiere permiso/fuente verificable y no altera métricas financieras centrales.

## 9. Herramientas, skills y gobierno del diseño con Claude Code

**Jerarquía:** Documento maestro v1.1.1 congelado → ADRs/contratos de dinero → `DESIGN.md` y `MOTION.md` aprobados → especificaciones del slice → sugerencias de skills. Un skill no es director de arte del proyecto y no cambia el alcance sin aprobación.

| Herramienta | Función en el ciclo | Uso inicial |
| --- | --- | --- |
| Impeccable | Explorar, criticar, documentar y pulir el producto interno | F0-a/F0-b y cada pantalla P0 |
| emil-design-eng | Evaluar principios de interacción, curvas y animaciones | F0-b y cada S1–S5 |
| Playwright CLI | Abrir UI real, verificar viewports, revisar screenshots/clips | Durante todo el MVP |
| web-design-guidelines | A11y, responsive, formularios, foco y navegación | Gate por slice |
| Supabase/Postgres best practices | Schema, índices, transacciones y RLS | Datos reales |
| Taste Skill v2 | Diseño editorial de landing/caso de estudio | **Después** del primer uso privado |
| React Bits | Base seleccionada de microefectos, siempre adaptada | Solo si mejora una interacción concreta |

Usar versiones, comandos y dependencias fijadas tras inspeccionar documentación oficial, no instalar todas las skills permanentemente. Consultar `https://github.com/pbakaus/impeccable`, `https://motion.dev`, `https://github.com/microsoft/playwright-cli`, `https://github.com/vercel-labs/agent-skills`, `https://github.com/supabase/agent-skills`, `https://github.com/Leonxlnx/taste-skill` y `https://github.com/DavidHDev/react-bits` antes de instalación.

**Forma de trabajar sin sobrecarga:** PRs pequeños y demostrables. `CLAUDE.md` breve con enlaces a master, `DESIGN.md`, `MOTION.md` y ADRs. Cada slice debe describir: comportamiento real, reglas de autorización/dinero aplicables, diseño móvil/escritorio, motion/fallback, estados, evidencias. Ningún PR cambia branding/arquitectura en secreto. No convertir el proyecto en una cadena interminable de aprobaciones; revisión humana sólo para decisiones visuales importantes y gates reales.

## 10. Calidad y rendimiento: un MVP confiable y visualmente sobresaliente

### 10.1 Pruebas según riesgo

| Nivel | Qué cubre | Herramienta | Gate |
| --- | --- | --- | --- |
| Unitarias dominio | Money, redondeos, splits, saldos, liquidaciones, presupuestos opcionales, **ledger de metas y no doble conteo** | Vitest | **Bloqueante** |
| Base de datos/seguridad | RLS, invitaciones, idempotencia, escritura atómica, roles, acceso privado, **metas privadas/compartidas y confirmaciones** | SQL/Supabase tests | **Bloqueante** |
| Componentes | Expense Flow, reparto, presupuesto ausente, Shared Balance, **Goal Journey**, error/loading | RTL selectivo | En flujos críticos |
| Smoke E2E | Registro privado; pareja + 50/50 + liquidación; **meta individual/compartida con aportes y uso**, presupuesto activado/desactivado | Playwright | Pocos, bloqueantes |
| Visual y motion | S1–S5 reales, screenshots/clips, reduced motion, dark, móvil y desktop | Navegadores reales | **Bloqueante para cada flujo insignia** |

### 10.2 Metas cuantitativas

**Core Web Vitals:** en el p75 de experiencias reales, **LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1**. Cuando no exista tráfico suficiente, reportar métricas de laboratorio (Lighthouse / Performance panel / dispositivos físicos) como proxy y **no presentarlas como p75 medido**. Evaluar rutas reales de dashboard y captura, no solo landing. Complementar con CPU moderada, 4G, interacción táctil, listas largas y transición entre contextos.

Otros objetivos: mediana de gasto frecuente <10 s tras onboarding, ausencia de scroll horizontal en 360/390/430/1024/1440, contraste WCAG AA verificado, targets táctiles cómodos, teclado funcional, valores financieros exactos y cero fugas de datos en escenarios RLS. Lighthouse 95+ es un objetivo secundario aspiracional, **no reemplaza** las métricas anteriores.

### 10.3 Definición de terminado de cada slice MVP

**No negociable antes de aceptar el slice:**

- [ ] Flujos reales funcionan con persistencia autorizada; no mocks presentados como realidad.
- [ ] Cálculos y RLS pasan las pruebas correspondientes; lint, typecheck y build sin fallos.
- [ ] Diseño de alta calidad a **390 y 1440**, más 360/430/1024 y tamaños intermedios sin rupturas.
- [ ] Iconografía semántica presente en navegación, categorías, acciones y estados; consistente con `DESIGN.md` y accesible, sin placeholders ni emojis sustitutos.
- [ ] Animación planificada en `MOTION.md` funciona, maneja interrupciones y tiene fallback reduced motion.
- [ ] Formularios, foco, teclado virtual, error/loading/empty, light/dark si está aprobado y datos largos se ven bien.
- [ ] No aparece ningún `budget_remaining` o alerta de exceso cuando `budget === null`; **aportes y retiros de metas aparecen separados de gastos, sin falsa liquidez ni sumas duplicadas**.
- [ ] El responsable visual revisó capturas del producto funcionando y registró observaciones.

**No bloqueantes fuera de alcance:** landing de premios, demos públicas elaboradas, perfección de microefectos decorativos, E2E masivos, OCR, ofertas, IA, scrapers y experimentos de monetización. Un defecto real de accesibilidad, privacidad o usabilidad sí bloquea.

### 10.4 Release gate humano conjunto

Las pruebas internas con gastos reales empiezan desde P0-1, después de verificar autorización, cálculos y recuperación de datos de ese slice. **No requieren S1–S5 terminadas.** El gate que sigue aplica solo a declarar el lanzamiento privado completo: antes de declarar MVP-1, **ambas personas** completan el escenario US-01 a US-04, **US-18 a US-23** y S1–S5 en teléfono y desktop. El criterio de «está genial» debe reflejar una experiencia medible: tareas completadas sin explicación externa, lectura correcta de cifras, percepción de calidad y fluidez, sin fallos críticos. Registrar comentarios por separado y corregir los problemas importantes. No basta una captura de Figma o una demo fake.

> **Enmienda del 25 de noviembre de 2026** (§15.10, decisión 30). Este gate se reparte en dos hitos. La **aceptación técnica** («declarar MVP-1», 30.5) conserva la revisión de S1–S5 por las dos personas, la aprobación humana y todas las verificaciones técnicas. La **validación por uso real** (siete días consecutivos y comentarios por separado en cuatro ejes) se aplaza (30.6). El escenario US-01 a US-04 y US-18 a US-23 por las dos personas se rige por la 30.7.

## 11. Plan de ejecución — calidad visual y producto real avanzan juntos

**El orden no es «MVP feo → embellecer».** Cada vertical slice añade funcionalidad real y el tratamiento visual que merece; F0 sólo decide dirección y componentes fundacionales. La salida es un **MVP-1 premium** usable y aprobado por los dos. Las etapas siguientes expanden capacidades, no reparan deliberadamente una mala experiencia inicial.

### F0-a — Elegir dirección de arte (muy corto)

- A/B/C en **capturas estáticas** de *Inicio*, las mismas cifras y contexto, a 390 y 1440 px; presupuesto presente y ausente **no** exigen seis diseños: mostrar una variante seleccionada para confirmar ambos estados después de la decisión.
- Revisar con ambos usuarios y aprobar una dirección. Documentar decisiones en `DESIGN.md` (tokens, tipografía, layout, tono, contrastes objetivo **e iconografía**).
- **Salida:** una dirección elegida y una página de reglas; no landing, benchmark formal, clips, backend ni animaciones completas. **El mismo resumen de una meta ficticia aparece en las tres propuestas.**

### F0-b — Fundar interfaz y motion (sin retrasar funcionalidad)

- App shell móvil/escritorio con navegación y selector de contexto; fixtures tipadas de Yo/Nosotros **y una meta privada/compartida**. Elegir set de iconos principal y aplicar inventario semántico de §6.1.1.
- Expense Flow animado y reversible, estados con/sin presupuesto, 390/1440 y reduced motion; definir `MOTION.md`.
- Construir sólo los primitivos reutilizables, no todo un design system exhaustivo sin casos reales.
- **Salida:** UI de alto nivel validada y preparada para conectar al primer slice real.

### P0-1 — Cuentas y gastos privados con UI final, no placeholder

- Auth, sesiones seguras, perfiles, migraciones y RLS individual.
- Money/transactions, gastos e ingresos privados, categorías, calendario, historial y dashboard **sin presupuesto**.
- Conectar Expense Flow y app shell al servidor; empty/error/loading/móvil/escritorio desde el PR.
- **Salida interna:** una persona registra, edita y anula movimientos reales y los entiende en una UI premium; pruebas con datos reales permitidas desde este slice tras validar RLS, invariantes y recuperación básica. No esperar P0-4 para obtener feedback.

### P0-2 — Pareja y balances con visualización final

- Pareja (`couple`) de dos miembros, invitación segura, rol y membresía; límites y pruebas RLS.
- Repartos 50/50, porcentaje e importes; saldos y liquidaciones parciales, auditoría y correcciones.
- **S1 Context Transition** + **S4 Shared Balance** conectados a datos reales y revisados en móvil y escritorio.
- **Salida interna:** los dos pueden compartir, comprender y saldar sin usar otra app.

### P0-3 — Presupuestos opcionales, metas y Spending Story real

- Crear/editar/archivar presupuestos personales o grupales; sin presupuesto sigue habiendo gastos, historia, categorías y reportes.
- **S3 Spending Story** en ambos estados, sin predicción inventada; métricas y filtros por periodo.
- **Metas P0:** creación de meta individual y compartida, aportes por miembro, retiros propios, vista de progreso y **S5 Goal Journey**, reservas declarativas frente a transferencias declaradas.
- **Integridad de metas:** compra/uso vinculados de forma atómica, confirmaciones para uso de aportes ajenos y `total_destinado_neto` sin doble conteo; tests de privacidad y límites de saldo.
- Dividir en PRs cortos: primero esquema/ledger, luego UI/animación, luego enlace compra + regresión. No convertir metas en banca conectada.
- Completar la exportación y recuperación de alcance global; la protección y recuperación básica de movimientos privados ya se habilitó en P0-1 para pruebas internas.
- **Salida interna:** gastos con/sin presupuesto **y metas privadas/compartidas** son elegantes, claros y válidos; el usuario entiende gasto vs ahorro destinado.

### P0-4 — Gate privado conjunto «funcional + espectacular»

- Ejecutar tests de dinero y privacidad **incluido ledger de metas**; smoke E2E; revisar S1–S5 con datos reales y reduced motion.
- Revisar 360/390/430/768/1024/1440, teclado, safe areas, listas largas, modo oscuro según diseño aprobado y estados completos.
- Verificar CWV con medios disponibles y documentar qué no puede medirse aún en p75 real.
- **Ambos aprueban** uso diario, legibilidad, rapidez y carácter visual. **Solo aquí se declara MVP-1 lanzado**.

> **Enmienda del 25 de noviembre de 2026** (§15.10, decisión 30). P0-4 termina con la **aceptación técnica** de MVP-1, que es su declaración (30.5). La aprobación de uso diario, legibilidad, rapidez y carácter visual tras siete días de uso real es la **validación por uso real**, aplazada (30.6).

### Después de MVP-1 — Iteración de uso real y portafolio

- Observar uso conjunto real durante varias semanas y arreglar las fricciones que aparezcan.
- **MVP-2:** recurrentes, presets de captura, estadísticas mejores, sugerencia voluntaria de presupuestos cuando haya historial suficiente, **aportes programados y metas avanzadas**; priorización según evidencia.
- **MVP-3:** demo pública aislada, landing editorial, PWA más completa, case study de interacción y performance, ampliación a grupos N si la pareja lo necesita.
- **Tras cuatro semanas consecutivas de uso estable de MVP-1 por ambos usuarios:** spike controlado de fuentes y precios, descrito en `docs/research/oportunidades.md`, sin depender de MVP-2/MVP-3 ni implicar la construcción completa de un motor comercial.
- **Evolución posterior:** OCR, Gemini/Jev, alertas de supermercado/restaurantes, productos/SKU, multidivisa, offline robusto, integraciones, monetización según demanda.

> **Enmienda del 25 de noviembre de 2026** (§15.10, decisiones 28.2 a 28.4). **MVP-2** pasa a ser Planes, Recurrentes y calendario (con los presets de captura y los aportes programados) y el Presupuesto integral v1, sin liquidez. Las estadísticas mejores y la sugerencia voluntaria de presupuestos (DEC-R01-S) pasan a una spec propia de estadísticas y sugerencias, priorizada según evidencia. Después de MVP-2 sigue la hoja de ruta de la decisión 28.3. De **MVP-3** solo se mueve la ampliación a grupos N, que va detrás de esa hoja de ruta; la demo pública, la landing, la PWA y el case study no cambian.

### Backlog de la primera entrega

| Ticket | Objetivo | Tipo de evidencia |
| --- | --- | --- |
| F0-a | Tres direcciones estáticas Inicio 390/1440 **con una meta en la fixture**; selección humana | Capturas comparables + `DESIGN.md` |
| F0-b | Shell responsive, Expense Flow animado, `MOTION.md` | Interacción demo en móvil y desktop |
| P0-1a | Auth privada, RLS, modelo Money | SQL + tests de dominio |
| P0-1b | CRUD privado, actividad, dashboard sin presupuesto | Prueba con datos reales + screenshots |
| P0-2a | Grupo pareja e invitación | Tests de membresía/RLS |
| P0-2b | Repartos, liquidaciones y Shared Balance | Tests + vídeo de interacción real |
| P0-2c | Context Transition con aislamiento de datos | QA móvil/escritorio + a11y |
| P0-3a | Presupuesto opt-in y modelo de atribución | Tests de existencia/ausencia y cálculo |
| P0-3b | Spending Story con/sin presupuesto | QA visual y métricas reconciliadas |
| P0-3c | Modelo y API de metas privadas/compartidas; ledger y RLS | SQL + invariantes + US-18/19/22/23 |
| P0-3d | UI de metas + S5 Goal Journey; aportes y retiros | QA móvil/escritorio + pruebas reales |
| P0-3e | Usar meta para financiar gasto + no doble conteo | Test atómico + US-20/21/23 |
| P0-4 | Beta privada aprobada por ambos | Checklist de release + exportación |

**Regla de avance:** no esperar el «pulido final» para cada pantalla; todo slice integra diseño, motion aplicable y funcionalidad. No pedir una semana de approvals por cada botón, pero sí revisión seria de **S1–S5**. No expandir metas a banca, inversiones ni automatismos en P0.

## 12. Decisiones, riesgos y ADRs

### 12.1 Decisiones vigentes para MVP-1

| ID | Decisión | Vigencia |
| --- | --- | --- |
| DEC-R01 | **Presupuesto opcional**; ausencia distinta de cero; registro completo sin crear límite; presupuesto sugerido opt-in después | Desde F0 y esquema P0 |
| DEC-R17 | **No decir «te alcanza»** por ausencia o existencia de presupuesto sin evidencia de liquidez | Desde toda la UI |
| DEC-R09 | **Juntia es el nombre elegido del producto** y se usa en UI y documentación; verificar marca y registrar dominio antes de uso público/comercial (no bloquear MVP privado) | Desde F0 |
| DEC-V01 | Diseño premium y funcionalidad salen **en la misma primera entrega privada** | Gate MVP-1 |
| DEC-V02 | `DESIGN.md` + `MOTION.md` desde F0-b; experiencias S1–S5 forman parte de P0 | Gate visual |
| DEC-V03 | Iconografía coherente y accesible como parte del MVP: biblioteca primaria elegida en F0-b e inventario mínimo en §6.1.1 | Gate visual |
| DEC-V05 | Móvil primero y escritorio expresamente diseñado, ambos aprobados | Gate visual |
| DEC-V04 | LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 en p75 real cuando sea medible | Performance |
| DEC-G01 | Metas personales y compartidas P0 con presupuesto opcional | MVP-1 |
| DEC-G02 | Aportes no son gastos ni crean deudas; retiro/uso bajo reglas y autorización | Motor financiero |
| DEC-G03 | Reservado virtual o transferido declarado; nunca saldo bancario verificado | UX + seguridad |
| DEC-G04 | `total_destinado_neto` explicable y sin doble conteo | Reportes |
| DEC-G05 | Balance de meta y progreso derivados de ledger auditable | Motor financiero |
| DEC-G06 | Autorización/RLS/idempotencia para metas y uso de aportes compartidos | Seguridad |
| DEC-S01 | Ofertas, scraping, Google y Jev están aislados en investigación, **no bloquean** MVP-1 | Roadmap futuro |

### 12.2 ADRs del motor financiero (se mantienen del maestro v1.0)

| ADR | Tema | Resolución |
| --- | --- | --- |
| ADR-001 | Contextos | Conversión privado→grupo no es toggle invisible: crear nuevo gasto compartido y anular el previo con flujo auditado |
| ADR-002 | Dinero/splits | Unidades menores ISO + algoritmo mayor residuo y desempate estable; moneda única por grupo P0. Nota de implementación: §15.10, decisión 20.8 |
| ADR-003 | Historial de miembros | Acceso grupal revocado; snapshot privado mínimo o bloquear la acción de salida/expulsión hasta existir |
| ADR-004 | Presupuestos | Grupo = gasto completo; personal = gasto privado + partes; **ambos opcionales, ausencia ≠ cero**, totales no aditivos. Nota de implementación: §15.10, decisión 22.7 |
| ADR-005 | IA | Post-MVP, consentimiento, agregados minimizados, salida validada y fallback sin modelo |
| ADR-006 | Offline | No prometer sin cola idempotente y conflictos resueltos |
| ADR-007 | Correcciones | Ajustes auditados recalculan balances; liquidaciones inmutables. **Enmienda:** se pueden anular con auditoría, nunca editar ni borrar (§15.10, decisión 20.11) |
| ADR-008 | Demo | Pública posterior, exclusivamente fixtures aisladas sin acceso a finanzas reales |
| ADR-009 | Planes | Uso personal no comercial en hosting Hobby; revisar licencia/plan antes de actividad comercial |
| ADR-010 | Metas | Ledger auditable separado de consumo; usos enlazados a gasto, sin doble contabilización; confirmación para aportes ajenos. Notas de implementación: §15.10, decisiones 22.13 y 22.17 |

### 12.3 Riesgos y mitigaciones

| Riesgo | Cómo se manifiesta | Acción |
| --- | --- | --- |
| **Proyecto interminable** | Scrapers, IA, OCR y landing desvían el MVP | Gate estricto: investigación no entra en backlog P0 |
| **MVP funcional, pero genérico** | Se entrega la UI como CRUD convencional | S1–S5, `DESIGN.md`, `MOTION.md` y aprobación visual son P0 |
| **MVP bello, pero incorrecto** | Dinero, repartos, permisos o liquidaciones fallan | Tests críticos + SQL RLS + scenario real de pareja |
| **Presupuesto obligatorio encubierto** | Dashboard interpreta `null` como cero | DEC-R01 + US-01/04/13 y tests visuales |
| **Sensación falsa de liquidez** | Alertas «te alcanza» por presupuesto | DEC-R17 y copy audit |
| **Experiencia desktop inferior** | Tarjetas móviles estiradas | Composición responsive específica y gate 1440 px |
| **Motion que bloquea la tarea** | Gestos lentos, layout shift, mareo | Reduced motion, budgets de duración y medición |
| **Nombre ya utilizado por terceros** | Juntia coincide con nombre encontrado en otra categoría de gestión comunitaria y dominios principales ocupados | Marca Juntia elegida; investigar registro/viabilidad antes de actividad pública o comercial |
| **Datos privados expuestos** | RLS incorrecta, telemetría con importes | Tests negativos; minimización de datos |
| **Pérdida de datos** | Errores de persistencia/free tiers | Idempotencia, exportación y recuperación probada |
| **Metas mal contabilizadas** | Doble conteo, ahorro tratado como gasto o saldo negativo | DEC-G01..G06, ledger, pruebas US-18..23 |

### 12.4 Fuera de la ruta crítica

No impedir MVP-1 por dominio, páginas de marketing, premios, métricas del mercado, precio de Scraping APIs, elección de LLM, proveedores de ofertas, habilidades de Jev, investigación de supermercados o perfeccionamiento de mockups no conectados a flujos reales. **Sí detener operaciones que comprometan seguridad, dinero, integridad, accesibilidad básica o la calidad de S1–S5 y de las metas aprobadas**.

## 13. Cómo arrancar con Claude Code

El primer PR realiza **solo F0-a**; el segundo, F0-b. **No desarrollar toda la app demo antes de implementar la funcionalidad real.** Los tickets posteriores son vertical slices que entregan diseño+motion+comportamiento y avanzan hacia el release privado.

### Prompt de F0-a

> Lee íntegramente `docs/JUNTIA_MASTER.md`, en especial DEC-R01/DEC-R17, §6 y §11. Inspecciona el repositorio antes de editar. Propón **tres direcciones de Inicio** dentro del territorio visual Warm Editorial Finance, usando **los mismos datos** (incluyendo miniestado de meta) y capturas estáticas a 390 y 1440 px. No construyas tres apps ni grabes animaciones; no añadas Supabase, Auth, Gemini, Jev, scraping, landing ni demo pública. Cuida legibilidad financiera, personalidad de autor, **iconografía visible y coherente**, tratamiento sin presupuesto, densidad desktop y viabilidad mobile-first. Usa Impeccable para crítica visual. Entrega las seis capturas verificables, una tabla pequeña de pros/contras y `DESIGN.md` propuesto; **no declares ganadora por tu cuenta**. Reporta solo comandos y validaciones ejecutados realmente.

### Prompt de F0-b (después de selección humana)

> Implementa shell mobile-first **y composición desktop original**, Expense Flow animado, fixtures tipadas y los estados con y sin presupuesto siguiendo `DESIGN.md`, **incluido su sistema de iconos, categorías y estados**; crea `MOTION.md` con tokens, S1–S5 y fallback reduced motion. Verifica 390/1440 y teclado móvil. No conectar aún backend, ni crear landing, demo pública, scrapers, OCR o chat IA. El resultado debe ser un prototipo pequeño que **sirva de base directa para el primer slice real**, no una segunda app descartable.

### Regla para los PRs de producto

Cada PR posterior debe demostrar: **la feature funciona con datos reales y permisos correctos; se ve excelente en móvil y escritorio, con iconografía semántica consistente; el motion relevante tiene sentido y fallback; se probaron invariantes y se adjuntaron capturas reales**. No aceptar un PR solo por tests verdes ni solo por screenshots bonitos. Review humano en las decisiones de dirección e interacciones insignia; el resto avanza sin burocracia excesiva.

## 14. Referencias, trazabilidad y estado

**Fuente de verdad de producto:** este documento v1.2 consolidado (erratas de bootstrap conservadas; metas y marca integradas). Hereda las reglas contables, de privacidad y arquitectura del documento maestro v1.0 y formaliza DEC-R01, DEC-R17, el estándar visual simultáneo y el nuevo roadmap.

**Investigación fuera del plan MVP:** `docs/research/oportunidades.md` (precios, scraping, supermercados, Merchant API/Search Grounding, Jev, restaurantes y campañas); `docs/research/competidores.md` (Tricount, Roonda, SplitRound, Pillelo, Priceo y referencias de diseño). **Las afirmaciones de competidores y proveedores necesitan revalidarse antes de decisiones comerciales**; ninguna es premisa obligatoria de un MVP financiero privado.

**Referencias oficiales para implementación (verificar versión/licencia al usar):**

- Motion: https://motion.dev/
- Impeccable: https://github.com/pbakaus/impeccable
- Taste Skill: https://github.com/Leonxlnx/taste-skill
- React Bits: https://github.com/DavidHDev/react-bits
- Supabase RLS: https://supabase.com/docs/guides/api/securing-your-api
- Supabase skills: https://github.com/supabase/agent-skills
- React View Transitions: https://react.dev/blog/2026/09/09/react-19-3
- Playwright CLI: https://github.com/microsoft/playwright-cli
- Web performance: https://web.dev/articles/vitals
- Vercel Hobby: https://vercel.com/docs/plans/hobby
- Phosphor Icons: https://github.com/phosphor-icons/react (MIT)
- Tabler Icons: https://github.com/tabler/tabler-icons (MIT)
- Lucide: https://lucide.dev/license (ISC)
- Iconoir: https://iconoir.com/docs/faq (MIT)

### Registro de cambios v1.1 vs v1.0

1. **MVP-1 combina funcionalidad real y experiencia visual premiable** en un único gate privado; se eliminó la idea de «primero funcional, después bonito».
2. **DEC-R01:** presupuestos opt-in, ausencia ≠ cero; estados con/sin presupuesto especificados en onboarding, consultas, dashboard y visualizaciones.
3. **DEC-R17:** no afirmar capacidad de compra o liquidez por un límite restante.
4. **Cuatro interacciones insignia:** Context Transition, Expense Flow, Spending Story (con/sin presupuesto) y Shared Balance; todas parte del MVP-1.
5. `MOTION.md` es obligatorio junto a `DESIGN.md` desde F0-b.
6. **F0 dividida en a/b**: tres direcciones estáticas 390/1440 y después shell + Expense Flow; las otras experiencias se integran en slices con persistencia real.
7. **Rendimiento**: LCP/INP/CLS en p75, con diferenciación entre datos reales y mediciones de laboratorio.
8. **DEC-R09 (decisión histórica de v1.1, sustituida en v1.2):** nombre provisional sin bloquear MVP privado; ahora el nombre elegido es Juntia, pendiente de verificación marcaria prepublicación.
9. **IA y ofertas** aisladas en investigación, con un solo spike de precios tras cuatro semanas consecutivas de uso estable de MVP-1.
10. **Gate de calidad conjunta:** aprobación real por ambos usuarios en móvil y escritorio, sin depender de landing ni caso de estudio.

**Estado:** listo para F0-a. Correcciones finales de bootstrap: DEC-V05 desktop, ventana única de cuatro semanas para el spike, y uso interno permitido desde P0-1 sin aplicar gate de lanzamiento. No iterar documentos por mejoras cosméticas. Este documento no afirma que existan un esquema SQL desplegado, una implementación probada ni un derecho de scraping adquirido.

### Actualización puntual v1.1.1 — iconografía

- Se identificó que v1.1 **no imponía iconografía** de forma explícita. §6.1.1 introduce DEC-V03, biblioteca primaria elegida durante F0-b, inventario mínimo y reglas de accesibilidad.
- Se incorporó la revisión de iconos a F0-a, F0-b, prompts y definición de terminado. **No amplía el alcance funcional ni retrasa el MVP**, formaliza calidad visual que ya era obligatoria.


### Actualización de producto v1.2 — Juntia y metas

- **Nombre elegido:** Juntia (antes Ronda), visible en F0-a, interfaz y documentos. Sin afirmación de exclusividad marcaria, adquisición de dominio ni lanzamiento público. Si el repositorio ya se creó con el nombre `ronda`, renombrar repo **no es requisito** para empezar; evitar borrar historial.
- **P0-3 amplía planificación:** metas personales y compartidas con aportes reales registrados, retiro permitido, uso de fondos vinculado a gasto y experiencia premium S5.
- **Contabilidad no duplicada:** gastos de consumo, aportaciones a metas, retiros y gastos financiados con metas se presentan por separado; `total_destinado_neto` expresa planificación, no saldo bancario.
- **F0-a sigue igual de acotada:** 3 diseños × 2 viewports; añade una meta a las fixtures, no nuevas pantallas ni clips.
- **IA, scraping, descuentos y automatización de aportes siguen fuera del MVP-1** y en la investigación desacoplada.

## 15. Actualización v1.3 — dirección visual elegida y decisiones P0 cerradas

**Fecha:** 2 de noviembre de 2026. Esta sección **registra** decisiones ya tomadas y aprobadas por los dos fundadores durante la fase de diseño; no introduce decisiones nuevas. Donde contradiga al cuerpo v1.2 del documento, **manda esta sección**.

El paquete de diseño completo está en `docs/design/` (importado desde el proyecto de Claude Design; ver `docs/design/README.md`). El documento operativo es `docs/design/HANDOFF_CLAUDE_CODE.md`.

### 15.1 Estado de F0-a y F0-b

**F0-a cerrada; F0-b cerrada en especificación, pendiente en implementación.** No escribir «F0-b cerrada» a secas en ningún documento del repositorio.

- **F0-a cerrada.** La exploración visual se hizo en Claude Design y recorrió las direcciones A→J antes de llegar a tres finalistas (I1 Salvia & Durazno, I2 Bosque & Arena, I3 Piedra & Coral). **Dirección elegida: I2 · Bosque & Arena.** Queda sin efecto la tripleta A/B/C de §6.2 (Warm Editorial / Quiet Precision / Bold Utility), que describía una exploración que no es la que se ejecutó.
- **F0-b cerrada en especificación.** El sistema de diseño, los componentes, el motion y las especificaciones responsive están entregados como `docs/design/DESIGN_SYSTEM.md`, `COMPONENT_SPECIFICATIONS.md`, `MOTION_SYSTEM.md` y `RESPONSIVE_SPECIFICATIONS.md`. Estos archivos cumplen el papel que §6.1/§6.5 asignaban a `DESIGN.md` y `MOTION.md`; **no se crearán documentos con esos nombres**. La dirección **I2 · Bosque & Arena está elegida en firme y no se reabre.**
- **F0-b pendiente en implementación.** De los entregables **ejecutables** que §11 asigna a F0-b, la 001 (aceptada el 4 de noviembre de 2026) **entregó** el app shell móvil y de escritorio con navegación y selector de contexto, y los primitivos reutilizables. **Faltan** el Expense Flow animado y reversible con estados con y sin presupuesto, y las fixtures tipadas de Yo/Nosotros y de una meta privada o compartida. Se reparten entre dos especificaciones (decisión de los fundadores del 3 de noviembre de 2026, §15.10): la **001** produce el app shell con navegación y selector de contexto y los primitivos; la especificación de **P0-1** produce el Expense Flow, ya conectado al servidor. Las fixtures tipadas dejan de ser un entregable de **interfaz** —la 001 muestra estados vacíos diseñados—, pero **siguen siendo obligatorias** como dataset dorado de pruebas, con responsable y fase por slice en §15.10 («Dataset dorado»). F0-b se cierra cuando la 001 y la especificación de P0-1 estén aceptadas.
- **Fase actual: P0.** Las reglas de `AGENTS.md` y `CLAUDE.md` que congelaban el trabajo en F0-a quedan actualizadas en consecuencia. `prompts/F0-A.md` se conserva en `prompts/archive/` como registro histórico y **no es ejecutable**.
- **Pendiente real:** la especificación **001 quedó aceptada el 4 de noviembre de 2026** (decisión 12; `specs/001-frontend-foundation/evidence.md`, «Aceptación de la 001»). El scaffold, el app shell con navegación y selector de contexto y los primitivos ya existen. Para cerrar F0-b falta lo que va a P0-1: el Expense Flow conectado al servidor, las fixtures tipadas y las verificaciones heredadas de la decisión 12. Mientras tanto vale la frase de arriba, sin escribir «F0-b cerrada» a secas.
- **P0-3 implementada y en producción; su aceptación espera la salida interna de los fundadores (004-T084).** Los cinco PR de la especificación 004 (#66, #67, #68, #69 y #71) y los ajustes posteriores (#77 a #82, decisión 23) están en `main` y en producción. El PR documental de cierre (004-T085) reconcilia los documentos con las decisiones 23 a 25. **`[PENDIENTE T084]`** Texto de aceptación preparado, **sin marcar** hasta que los fundadores hagan la salida interna: «**P0-3 quedó aceptada el ___ de noviembre de 2026** (salida interna de los dos fundadores con sus cuentas reales, 004-T084: ___; `specs/004-presupuestos-y-metas/evidence.md`, «Cierre de P0-3»). Lo siguiente es P0-4, el gate privado conjunto de MVP-1 (especificación 005).» Mientras no se complete, P0-3 **no** está aceptada y P0-4 no la da por cumplida (FR-001 de la 005).

### 15.2 Iconografía (cierra DEC-V03)

Biblioteca primaria elegida: **Phosphor Icons** (`@phosphor-icons/react`, MIT), con wrapper tipado `AppIcon` e imports individuales. Tabler, Lucide e Iconoir quedan descartadas. El mapa semántico `concepto → icono`, los pesos (Regular, Fill, Bold, Duotone) y los tamaños están en `docs/design/DESIGN_SYSTEM.md` §3. El inventario mínimo de §6.1.1 sigue siendo obligatorio.

### 15.3 Navegación (sustituye a §6.1.1)

- **Móvil:** Inicio · Actividad · **+ integrado** (al centro, a ras de la barra, no elevado) · Metas · Plan.
- **Cuenta:** avatar (`AccountButton`) en el encabezado de Inicio, Actividad, Metas y Plan; perfil al pie de la sidebar en escritorio. Un toque, **sin sexta pestaña y sin menú**. Rutas `/cuenta`, `/cuenta/perfil`, `/cuenta/pareja`, `/cuenta/apariencia`, `/cuenta/privacidad`, `/cuenta/seguridad`.
- Queda sin efecto la agrupación anterior «Inicio, Movimientos, Metas, Plan, Nosotros, Perfil».
- **Escritorio:** rail de 76 px desde 1024 y sidebar de 248 px desde 1280.
- **Destinos de escritorio** (decisión del 3 de noviembre, §15.10): Inicio · Actividad · Metas · Plan · **Balance**, más Anotar. Balance es destino **solo en escritorio**, en el rail y en el sidebar; en móvil la barra no cambia y el balance completo se abre desde Inicio. Desde 1024 el Shared Balance sigue siendo además un módulo de Inicio.
- **Selector Yo/Nosotros:** dentro del sidebar desde 1280; **a 1024, arriba a la derecha del contenido**, igual que en móvil y tablet. No hay popover desde el rail.
- **Tema:** solo en Mi cuenta › Apariencia. El sidebar no lleva control de tema.

### 15.4 DEC-G04 — fórmula aprobada

`total_destinado_neto = gasto_consumo + aporte_a_metas − retiro_de_metas − gasto_financiado_con_meta`

Es una **métrica de planificación**, no de consumo ni de liquidez. Se conserva en el dominio como función pura con tests. **Nunca** se rotula «Total gastado», nunca es el número héroe y puede ser negativa (se explica el signo). En la interfaz aparece solo como nota secundaria explicada, dentro de Análisis. La tabla de verificación con el caso de octubre y los casos de retiro y gasto con meta está en `docs/design/HANDOFF_CLAUDE_CODE.md`; los cálculos deben reproducirla fila por fila.

### 15.5 Alcance P0 cerrado

| Tema | Decisión |
| --- | --- |
| Grupos | Espacios personales y parejas de **exactamente dos**. Crear grupos de 3 o más no se habilita en MVP-1, pero datos, membresías, permisos y cálculos se modelan para N. Grupos N = P1. |
| Repartos | 50/50, porcentaje personalizado e importe personalizado. Nunca se asume 50/50. «Porcentaje 55/45» es configurable, no proporcional a ingresos. |
| Liquidaciones | `net = pagado − corresponde ± liquidaciones`. Parciales permitidas. Sugerencia determinista deudor → acreedor. **Nunca** se crea una transferencia; Juntia solo registra la liquidación declarada. |
| Presupuestos | Opcionales. Cualquiera de los dos crea, edita o desactiva, con autor, fecha e historial. **Sin segunda aprobación** ni activación automática. Ediciones concurrentes protegidas sin sobrescritura silenciosa. |
| Autenticación | Supabase Auth con **correo y contraseña**, verificación de correo y recuperación por enlace seguro. Sin Google/Apple, sin magic link independiente, sin passkeys, sin MFA propio. Sin enumeración de cuentas. |
| Invitaciones | Solo la propietaria invita. Caducidad de **7 días**, token de **un solo uso** guardado como hash, **una invitación activa** por pareja, asociada al correo y aceptable solo por una cuenta verificada con ese correo. Enlace compartido a mano, sin correos propios. |
| Perfil | Nombre visible editable; correo visible y no editable; avatar con inicial y color del sistema, sin foto. |
| Preferencias | Solo Claro/Oscuro/Sistema. COP fijo. Sin reparto por defecto, color editable, moneda ni notificaciones. |
| Exportación | **JSON + CSV** de lo autorizado (nunca privados del otro, tokens ni datos internos). No es restauración. |
| Mover a Pareja | Una transacción atómica e idempotente anula el gasto privado y crea el compartido, con auditoría; el pagador original se mantiene; nunca hay dos gastos activos. Deshacer solo inmediato y solo si el servidor confirma que no hay dependencias. No existe «mover a Yo» general en P0. |
| Gasto con meta | El gasto real se registra de inmediato junto con el uso de fondos **propios**. Los fondos del otro integrante se piden por cantidad exacta; mientras está pendiente no se descuentan ni cuentan como financiación, **no vence** y no es una transferencia. Si se rechaza o cancela, el gasto permanece. |

### 15.6 Bloqueos y verificaciones: tres categorías

Agrupar todo lo pendiente bajo «bloqueos de lanzamiento» degradaba verificaciones que §10.1 y §10.3 tratan como bloqueantes de slice. Se separan en tres categorías con consecuencias distintas.

**Advertencia de jerarquía.** El encuadre de `docs/design/HANDOFF_CLAUDE_CODE.md` («bloquean el lanzamiento, no la implementación») **no releva** de §10.1 («Base de datos/seguridad: RLS, invitaciones, idempotencia, escritura atómica» = **Bloqueante**) ni de §10.3 («Cálculos y RLS pasan las pruebas correspondientes»). **Ninguna verificación de seguridad, autorización o atomicidad se pospone al lanzamiento.** Donde el handoff y el maestro difieran, manda el maestro.

#### 15.6.1 Bloqueo legal de lanzamiento

1. **Eliminación de cuenta.** Se comunica en la interfaz como no disponible. Requiere un procedimiento real, verificable y revisado legalmente antes de declarar el lanzamiento privado. Bloquea **declarar el lanzamiento privado**, no el desarrollo.

> **Enmienda del 17 de noviembre de 2026** (decisión 24.8, Q8 de la especificación 005). La eliminación de cuenta en la interfaz, con su revisión legal, y los pendientes de la decisión 16 (términos legales, correo propio, apertura del registro y enumeración por la API de Auth, 16.16) **aplican al lanzamiento público**, no a MVP-1. En MVP-1 vale un **procedimiento manual de eliminación**, documentado, ensayado en `juntia-dev` y verificable (`specs/005-gate-mvp-1/contracts/account-deletion.md`); la interfaz sigue diciendo que la eliminación no está disponible en la app y explica cómo pedirla. La revisión legal se exige antes de abrir la app a terceros. El procedimiento es una operación administrativa excepcional, con las notas fechadas del 18 de noviembre de 2026 en ADR-007, ADR-010 y ADR-013 (decisión 25.3).

#### 15.6.2 Dependencia técnica a investigar durante ingeniería

No bloquea por sí sola; se resuelve dentro del slice que la necesita y su resultado se documenta allí.

1. View Transitions con App Router y back-swipe de iOS.
2. Detección de luminancia para el scrim de las fotos de meta. **No aplica a MVP-1** (decisión 24.13, 17 de noviembre de 2026): las metas no tienen foto en MVP-1 y esta dependencia pasa a MVP-2, con ADR-014.
3. Teclado nativo en Android con teclados de terceros.
4. Rendimiento del abanico de metas (GoalStack) en gama media.

#### 15.6.3 Verificación que bloquea la aceptación del slice

Bloqueante según §10.1 y §10.3. No se acepta el slice sin la prueba ejecutada y su salida real registrada.

1. Atomicidad de la conversión privado → compartido (ADR-001): transacción única, concurrencia y RLS del registro anulado.
2. Idempotencia de las escrituras que mueven dinero.
3. `goal_usage_confirmations`: bloqueo sin consentimiento y revalidación al confirmar.
4. RLS de metas privadas y compartidas.
5. **Registro inicial del gasto con meta.** El gasto real, el uso de **fondos propios** y sus asignaciones se escriben en **una sola operación atómica e idempotente**. No espera ninguna aprobación.
6. **Autorización posterior de fondos ajenos.** El uso de fondos del otro integrante se registra en una **transacción separada**, atómica e idempotente, que vincula la financiación al gasto **ya existente**, revalidando permisos, saldos y estado de la meta. La meta nunca queda negativa. Si se rechaza o cancela, el gasto permanece. Mientras la solicitud está pendiente, esos fondos **no se descuentan ni cuentan como financiación**.
7. Protección de ediciones concurrentes de presupuesto, sin sobrescritura silenciosa.

La **confirmación técnica de capacidades de Supabase** que antes figuraba como bloqueo de lanzamiento no es un pendiente de lanzamiento ni una investigación abierta: sus tres partes —flujos atómicos, idempotencia y RLS de metas— se corresponden una a una con los puntos 1 a 6 de **15.6.3** y se resuelven ejecutando esas verificaciones. No queda nada de ella en 15.6.2, que recoge solo dependencias de presentación e interacción.

### 15.7 Umbrales de rendimiento que bloquean la aceptación

CLS = 0 en las cargas con skeleton de las rutas clave · INP < 200 ms al abrir Anotar y al guardar · mediana < 10 s para registrar un gasto habitual en teléfono real tras el onboarding (US-12) · sin scroll horizontal en 360, 390, 430, 1024 y 1440 · objetivos táctiles ≥ 44 px. Lighthouse 95+ sigue siendo aspiracional y **no** reemplaza estos umbrales. **Verificado hasta ahora: nada.** No se ejecutó ninguna medición durante la fase de diseño.

> **Excepción para MVP-1 del 19 de noviembre de 2026** (§15.10, decisión 26.1). El CLS = 0 admite un único residuo: el de las fuentes que llegan tarde. En Chromium, con CPU y red lentas, son 3–4 de cada 50 cargas de Plan, Metas y Balance, con CLS ≤ 0,025. En Firefox, el primer pintado de `/crear-cuenta` a 390. Safari da 0. D-01 no cambia y la excepción se revisa después de MVP-1. Fuera de ese residuo, el umbral sigue bloqueando.

### 15.8 Lo que esta actualización NO cambia

Siguen vigentes sin modificación: DEC-R01 (presupuesto opcional, `null` ≠ cero), DEC-R17 (no afirmar «te alcanza»), DEC-G01..G03 y G05..G06, los ADR-001 a ADR-010 de §12.2, las exclusiones del MVP-1 de §2.4 y §12.4, la arquitectura de §7, el gate humano conjunto de §10.4 y la definición de terminado de §10.3.

### 15.9 Interpretación formal de [A], [P] y [V]

Las etiquetas del paquete de `docs/design/` no son decorativas. Significan:

- **[A] — aprobado.** Decisión de diseño cerrada. Se implementa tal cual.
- **[P] — propuesta** de refinamiento. Requiere **gate humano** antes de implementarse **cuando afecte al alcance de una especificación**. No se cierra dentro de un PR de código (coherente con `AGENTS.md` punto 17).
- **[V] — verificación pendiente.** Nunca se considera ejecutada. Se resuelve ejecutándola y pegando la salida real.

Aprobar la dirección I2 · Bosque & Arena **no** convirtió los `[P]` en decisiones cerradas.

#### Inventario completo de [P]

Barrido de los seis documentos de `docs/design/` (etiqueta literal `[P]` y columna `P` de la tabla de trazabilidad del handoff). Se clasifica cada propuesta en **dos ejes distintos**:

- **¿Afecta al alcance?** — ¿determina qué funcionalidad o componente debe construir una especificación?
- **¿Requiere aprobación antes de implementar?** — ¿es una elección todavía marcada como propuesta que nadie ha aprobado?

> «No» en la columna de alcance significa únicamente que la propuesta no cambia las fronteras funcionales de una especificación. **No significa aprobación automática.** Una propuesta visual debe estar respaldada por una decisión aprobada, o resolverse por revisión humana, antes de su implementación definitiva. Cuando el maestro ya cerró la elección —como Phosphor en §15.2— no requiere otra aprobación aunque el documento importado conserve `[P]`.

**El mecanismo es ligero.** Una propuesta **visual** se aprueba **viendo la pantalla construida** en la revisión del PR del slice: no necesita ADR ni un gate propio. Solo van a ADR las propuestas significativas o difíciles de revertir (`AGENTS.md` punto 17). **No hay 17 ADR ni 17 gates**; hay una revisión humana por slice que cubre los `[P]` que ese slice toca.

| Elemento | Archivo | Por qué está marcado como propuesta | ¿Afecta al alcance? | ¿Requiere aprobación antes de implementar? |
| --- | --- | --- | --- | --- |
| SharedBalance / «Balance pagó vs. corresponde» | COMPONENT_SPECIFICATIONS.md §SharedBalance · HANDOFF_CLAUDE_CODE.md, tabla | La codificación de la barra (pagó vs. corresponde, tramos de liquidado y recibido) se propuso en esta fase y no se validó con los dos usuarios. | **Sí** — P0-2 | **Sí** — al revisar la pantalla de Balance |
| GoalStack / «Pila tipo Wallet» | COMPONENT_SPECIFICATIONS.md §GoalStack · HANDOFF_CLAUDE_CODE.md, tabla | El patrón de pila con gestos es una propuesta de presentación; existe la alternativa de lista. Depende además del rendimiento (15.6.2). | **Sí** — P0-3 | **Sí** — pila vs. lista es una elección de producto |
| ChangePreview | COMPONENT_SPECIFICATIONS.md §ChangePreview | Componente propuesto para previsualizar cifras antes/después; no está exigido por ninguna historia del maestro. | **Sí** — P0-2 / P0-3 | **Sí** — decide si el componente existe |
| FundingLedger (reparto ≠ fondos) | COMPONENT_SPECIFICATIONS.md §FundingLedger | Separar «reparto del gasto» de «fondos de la meta» en dos bloques es una propuesta de UI sobre reglas aprobadas (DEC-G01..G06). | **Sí** — P0-3 | **Sí** — al revisar la pantalla |
| ConfirmationBadge y solicitud pendiente | COMPONENT_SPECIFICATIONS.md §ConfirmationBadge | Los estados y su redacción se propusieron aquí; la regla de fondo (no vence, no es transferencia) sí está aprobada en §15.5. | **Sí** — P0-3 | **Sí** — redacción de estados de dinero |
| PlanningNote (destinado neto) | COMPONENT_SPECIFICATIONS.md §PlanningNote | Forma concreta de presentar DEC-G04 como nota secundaria. La fórmula es [A] (§15.4); su presentación es propuesta. | **Sí** — P0-3 | **Sí** — DEC-G04 es sensible (§15.4) |
| Sección Cuenta completa: AccountButton, ProfileHeader, AccountMenuItem, ThemeSelector, CoupleStatus, SensitiveActionConfirmation, LimitNote | COMPONENT_SPECIFICATIONS.md §Cuenta | La sección entera se marcó propuesta. La **navegación** a Cuenta sí está aprobada (§15.3); la anatomía de sus siete componentes no. | **Sí** — P0-1 (perfil, apariencia) y P0-2 (pareja) | **Sí** — al revisar las pantallas de Cuenta. **Aprobada** la anatomía el 4 de noviembre de 2026 (§15.10, decisión 16) |
| Persistencia del tema (`profiles` + cookie) | COMPONENT_SPECIFICATIONS.md §ThemeSelector | Marcada `[P][V]`: mecanismo propuesto **y** sin validar. | **Sí** — P0-1 | **Sí** — y además hay que ejecutar el `[V]`. **Aprobada** el 4 de noviembre de 2026 (§15.10, decisión 16); el `[V]` sigue pendiente |
| Anotar gasto (flujo E1–E5) | COMPONENT_SPECIFICATIONS.md §Anotar gasto (flujo) | El guion de cinco estados es propuesta; el maestro §11 solo exige un Expense Flow animado y reversible. | **Sí** — F0-b pendiente y P0-1 | **Sí** — es el flujo central del producto. **Aprobado** en su versión privada el 4 de noviembre de 2026 (§15.10, decisión 16) |
| Teclado nativo para el monto (`inputmode="numeric"`) | COMPONENT_SPECIFICATIONS.md §Anotar gasto · HANDOFF_CLAUDE_CODE.md, tabla | Elección de entrada propuesta; depende del comportamiento real en Android (15.6.2). | **Sí** — P0-1 | **Sí** — junto con la fila siguiente. **Aprobado** el 3 de noviembre de 2026 (§15.10, decisión 11) |
| Teclado propio descartado | HANDOFF_CLAUDE_CODE.md §Accesibilidad | El descarte es una propuesta, no una decisión registrada en el maestro. Es la cara opuesta del punto anterior. | **Sí** — P0-1 | **Sí** — se aprueba junto con la fila anterior. **Aprobado** el 3 de noviembre de 2026 (§15.10, decisión 11) |
| Personas configurables, escalables a N (+ patrón) | DESIGN_SYSTEM.md §1.2 · HANDOFF_CLAUDE_CODE.md, tabla | Tokens `person.1–6` y patrón de tramo pensados para N, cuando P0 es pareja de exactamente dos (§15.5). | No — P0 se implementa con `person.1–2` | **Sí** — el patrón de tramo y `person.3–6` no están aprobados; en P0 simplemente no se usan |
| Sara lila → petróleo; Hogar lavanda → azul tenue; superficie oscura #1C1F20 → #191C1F | DESIGN_SYSTEM.md §4 · HANDOFF_CLAUDE_CODE.md, tabla | Cambios de paleta propuestos respecto a I2 y al maestro. | No — cambia valores de token, no fronteras funcionales | **Sí** — propuesta visual ya codificada en `DESIGN_SYSTEM.md`; se aprueba viendo la pantalla |
| Gasto, ingreso y liquidación en tinta | DESIGN_SYSTEM.md §4 · HANDOFF_CLAUDE_CODE.md, tabla | Propuesta de codificación cromática para evitar que ahorro e ingreso compartan verde. | No — cambia valores de token, no fronteras funcionales | **Sí** — propuesta visual ya codificada en `DESIGN_SYSTEM.md`; afecta a cómo se lee el dinero |
| Cuenta reutiliza los fondos de categoría para sus fichas de ícono | DESIGN_SYSTEM.md §4 | Reutilización propuesta; no crea tokens nuevos. | No | **Sí** — propuesta visual ya codificada en `DESIGN_SYSTEM.md`; se aprueba viendo la pantalla |
| Stack de UI sugerido (Phosphor + `AppIcon`, Motion for React, `next/font`) | HANDOFF_CLAUDE_CODE.md §Stack de UI sugerido | Marcado propuesta en el handoff, pero **Phosphor con `AppIcon` ya está cerrado** por §15.2 y el stack por §7.1/§15. Prevalece el maestro: aquí `[P]` no reabre nada. | No | **No** — el maestro ya cerró la elección (§15.2, §7.1) |
| Spline Sans Mono para metadatos (`meta.mono`) | DESIGN_SYSTEM.md §1.4 | Elección del gestor dentro de la decisión 14 (§15.10); los fundadores aprobaron Brygada 1918 y Onest, no la monoespaciada. Añadida el 4 de noviembre de 2026. | No — cambia la familia de un token, no fronteras funcionales | **Sí** — se aprueba viendo las capturas del PR de implementación de la decisión 14. **Aprobado** el 4 de noviembre de 2026 (§15.10, decisión 14) |
| Texto ampliado hasta 200% | HANDOFF_CLAUDE_CODE.md §Accesibilidad | Comportamiento responsive propuesto (filas a 2 líneas, segmentados apilados, importes con clamp). | No — refinamiento de un requisito ya obligatorio | **No** — el requisito (200% sin pérdida) ya es obligatorio; la técnica se valida probándola, no aprobándola. **Técnica decidida** el 11 de noviembre de 2026: todo el texto en `rem` (F13; decisión 23.1), con la excepción F79-3 |

**Total: 18 elementos distintos.** **11 afectan al alcance** de alguna especificación de P0. **16 requieren aprobación antes de implementarse**; las dos excepciones son el stack de UI (cerrado por §15.2 y §7.1) y el texto ampliado al 200% (requisito ya obligatorio). Los cinco elementos con alcance **No** y aprobación **Sí** —las tres propuestas de paleta, el patrón de personas y la monoespaciada de la decisión 14— son el motivo de que los dos ejes estén separados.

**Estado.** La tabla conserva la clasificación original. Desde entonces se han cerrado, con la decisión 20 (§15.10), SharedBalance, ChangePreview (solo en Mover a Pareja) y la versión compartida de Anotar, aprobados en su forma, con la aprobación final en pantalla en los PR de implementación de P0-2. Antes se habían cerrado las dos filas del teclado del monto (§15.10, decisión 11) y se ha añadido y cerrado la fila de Spline Sans Mono (§15.10, decisión 14; aprobada el 4 de noviembre de 2026), y se han cerrado Anotar, la sección Cuenta y la persistencia del tema (§15.10, decisión 16; el `[V]` del tema sigue pendiente). Con la decisión 22 se aprobaron en su forma GoalStack, FundingLedger, ConfirmationBadge y PlanningNote, con la aprobación final en pantalla prevista en los PR C, D y E de P0-3 (la de D y E, dada el 11 de noviembre de 2026: 004-T069 y T081). La técnica del texto ampliado al 200 % quedó decidida el 11 de noviembre de 2026: todo el texto en `rem` (F13, decisión 23.1); el requisito sigue siendo obligatorio y se comprueba en el barrido. Los demás `[P]` siguen abiertos y se aprueban viendo la pantalla en la revisión de S1–S5 de P0-4. Los documentos importados de `docs/design/` mantienen su marca `[P]`, como en el caso de Phosphor: prevalece el maestro.

**Conciliación con el barrido.** `grep -rn "\[P\]" docs/design/` devuelve 23 líneas: 17 marcas de elemento (10 en `COMPONENT_SPECIFICATIONS.md`, 4 en `DESIGN_SYSTEM.md`, 3 en `HANDOFF_CLAUDE_CODE.md`), 2 líneas de leyenda (`BRAND_FOUNDATION.md`, `COMPONENT_SPECIFICATIONS.md`) y 4 líneas de `docs/design/README.md` que explican la etiqueta. Las 6 filas con columna `P` de la tabla de trazabilidad del handoff (líneas 144, 145, 146, 154, 156, 157) **no añaden elementos nuevos**: son los mismos de `COMPONENT_SPECIFICATIONS.md` y `DESIGN_SYSTEM.md` vistos desde los tokens. La tabla tiene 18 elementos y el barrido, 17 marcas: la fila de Spline Sans Mono está cerrada y ya no tiene marca literal en `DESIGN_SYSTEM.md`. Las dos filas del teclado, también cerradas, sí la conservan, porque su `[P]` venía del paquete importado; el de Spline Sans Mono lo puso la decisión 14 y se quitó al aprobarla.

#### Cómo se cierra un [P]

Quien redacte la especificación de un slice lista los `[P]` que toca y su clasificación en los dos ejes.

- Un `[P]` que **afecta al alcance** se resuelve **antes** de escribir la especificación: determina qué se construye.
- Un `[P]` que solo **requiere aprobación** se resuelve **en la revisión del PR del slice**, viendo la pantalla construida. No necesita ADR ni gate previo.
- Solo va a un ADR en `docs/adr/` la resolución significativa o difícil de revertir (`AGENTS.md` punto 17).

Un `[P]` no se da por cerrado dentro de un PR de código sin que una persona lo apruebe explícitamente en la revisión.

### 15.10 Decisiones de los fundadores del 3 de noviembre de 2026

Tomadas por los dos fundadores en la hoja de decisiones previa a la especificación 001, con contexto, capturas del diseño y opciones. Las diez coinciden con la recomendación del gestor y no llevan notas. Las decisiones 11 a 30 se tomaron después, por separado, y se registran debajo de la tabla. Esta sección es su registro; lo que cambian en otros documentos se aplicó en el mismo PR.

| # | Decisión | Elección | Consecuencia |
| --- | --- | --- | --- |
| 1 | ADR-011, pruebas y CI | **Aprobado, con pgTAP** | ADR-011 pasa a Aceptado. Las pruebas de RLS se escriben en SQL plano con pgTAP, después de verificar qué forma del claim usa la versión de Supabase del stack (su pregunta abierta 1 queda cerrada con esa condición) |
| 2 | ADR-012, Spec Kit en parte | **Aprobado** | ADR-012 pasa a Aceptado. Sigue el PR de inicialización con las condiciones del propio ADR |
| 3 | Protección de `main` | **Protección local ahora; plan de pago de GitHub antes de datos reales.** Revisada el 4 de noviembre de 2026: **sin plan de pago**, y la protección local pasa a ser la definitiva | Regla de denegación en `.claude/settings.json` y hook `pre-push` versionado. Más débiles que una protección de servidor (ADR-012 §5). Con la revisión del 4 de noviembre, los fundadores aceptan ese riesgo de forma explícita: `main` no tiene protección de servidor, tampoco con datos reales, y depende de la disciplina de `AGENTS.md` 14a |
| 4 | Balance en escritorio | **Destino propio** | §15.3: quinto destino solo en escritorio. Se añade al mapa semántico de iconos |
| 5 | Contexto a 1024 | **Selector arriba a la derecha del contenido** | §15.3. Sin popover desde el rail |
| 6 | Tema en el sidebar | **Solo en Mi cuenta › Apariencia** | §15.3. El sidebar no lleva control de tema |
| 7 | Expense Flow | **En la especificación de P0-1, conectado al servidor** | §15.1: F0-b se reparte entre la 001 y P0-1 |
| 8 | Mi cuenta en la 001 | **Acceso mínimo a `/cuenta`** | La anatomía de `AccountButton` sigue siendo `[P]` (§15.9) y se aprueba con P0-1, cuando haya una persona con sesión |
| 9 | Rutas sin datos en la 001 | **Estados vacíos diseñados** | Actividad, Metas y Plan muestran su estado vacío real. Nada de datos de ejemplo en la navegación |
| 10 | Selector Yo/Nosotros en la 001 | **Funciona y recuerda el contexto, sin animación** | La transición S1 llega con los datos de pareja, en P0-2 |

#### Decisión 11: teclado del monto

Tomada por los fundadores el mismo día, antes de lanzar la especificación 001, y comunicada al gestor en conversación, sin hoja de decisiones. `AmountInput` es uno de los primitivos que el handoff asigna a la 001, y dependía de dos `[P]` que afectan al alcance (§15.9). El gestor recomendó mover `AmountInput` a P0-1. **Los fundadores eligieron mantenerlo en la 001.**

| # | Decisión | Elección | Consecuencia |
| --- | --- | --- | --- |
| 11 | Teclado del monto | **Teclado nativo (`inputmode="numeric"`); teclado propio descartado** | Se cierran las dos filas del teclado en §15.9. `AmountInput` se construye en la 001 como primitivo, según `docs/design/COMPONENT_SPECIFICATIONS.md` §Input (Monto) |

Lo que esta decisión **no** cierra:

- **El comportamiento en Android con teclados de terceros** sigue siendo la dependencia técnica 3 de §15.6.2. Se investiga dentro de P0-1, con la hoja de Anotar real, junto con la verificación `[V]` de la altura del teclado (`visualViewport`) de `docs/design/RESPONSIVE_SPECIFICATIONS.md`. Si el resultado obliga a cambiar la entrada, el cambio vuelve a los fundadores.
- **El uso de `AmountInput` en la 001.** Anotar sigue abriendo solo el aviso de que el registro llega con P0-1, sin campos que aparenten guardar (bloque siguiente). La especificación 001 decide cómo se verifica un primitivo que el shell todavía no muestra, en la capa más baja que detecte el fallo (ADR-011).

#### Decisión 12: aceptación por etapas de la 001

Tomada por los fundadores el 3 de noviembre de 2026, durante la revisión del PR D de la 001 (verificación y cierre). Cuatro verificaciones de la fase 10 de `specs/001-frontend-foundation/tasks.md` necesitan un dispositivo que los fundadores no tienen o un proyecto de Vercel que todavía no existe. Los dos fundadores usan iPhone y ninguno tiene Android.

| # | Decisión | Elección | Consecuencia |
| --- | --- | --- | --- |
| 12 | Cierre de la 001 con verificaciones que necesitan dispositivo o Vercel | **Aceptación por etapas** | La 001 se acepta sin T072–T075. Esas cuatro verificaciones pasan a ser **criterios de aceptación obligatorios de P0-1**: P0-1 no se acepta si alguna sigue sin salida real, **salvo una excepción formal** de las que se describen debajo |

**La 001 se acepta cuando se cumplen todas:**

1. CLS = 0 en todas las cargas medidas, incluida la repetición ampliada de al menos 40 cargas, sin redondear (§15.7).
2. Los dos fundadores aprobaron la revisión visual (SC-001) y entienden sin ayuda que la versión todavía no guarda datos (SC-008).
3. Las demás tareas de la fase 10 tienen salida real y el CI está en verde.

**Lo que hereda P0-1:**

| Verificación | Dueño | Cuándo |
| --- | --- | --- |
| T072 · Superficie interna en Vercel, parte 1: **aislamiento en producción** (HTML y RSC sin fuga, 404) | Gestor | Justo después del primer despliegue de producción y antes de que nadie use un despliegue. Sin excepción posible: es un control de aislamiento (§15.6; ADR-011 §8). **Hecha el 4 de noviembre de 2026** |
| T072, parte 2: **aislamiento en preview** (un host no autorizado sobre un preview responde 404, la segunda barrera de `isAllowedInternalHost`) | Gestor, con un alias de prueba **no productivo** del tipo `*.vercel.app` que asigna la dueña; nunca el dominio de producción | **Al disponer del primer preview real y antes de que nadie use un preview.** Sin excepción posible: es un control de aislamiento (ADR-011 §8). El preview necesita un commit de la dueña (decisión 13, regla 3) |
| T072, parte 3: **funcionamiento en preview** (la superficie da 200 por las URL de despliegue y de rama) | Fundadores, con sesión en Vercel | Antes de aceptar P0-1. Aplazada por decisión de los fundadores del 4 de noviembre de 2026: comprueba que la superficie se ve donde debe y no es un control de aislamiento |
| T073 · Contraste en dispositivo (iPhone) | Fundadores | Antes de aceptar P0-1; se puede adelantar en cualquier momento |
| T074 · Sombras táctiles en un Android de gama media | Fundadores | Antes de aceptar P0-1. Admite excepción formal si no hay un Android disponible |
| T075 · VoiceOver con el flujo real de Anotar | Fundadores | Al cerrar P0-1. Sin excepción posible, porque los fundadores tienen iPhone |
| T075 · TalkBack con el flujo real de Anotar | Fundadores | Al cerrar P0-1. Admite excepción formal si no hay un Android disponible |
| CLS = 0 fuera de Chromium: Firefox y WebKit con el arnés R2 | Gestor | Antes de aceptar P0-1. Sin excepción posible. El mecanismo que da CLS = 0 en la 001 (`<link rel="expect" blocking="render">`) lo soporta Safari desde la 18.2, pero no Firefox ni Safari anterior; en la 001 solo se demostró en Chromium |
| CLS en un iPhone real | Fundadores | Antes de aceptar P0-1. Admite excepción formal si no hay un Mac para el inspector web de Safari |
| Respaldo tipográfico de la fuente de interfaz en Android (Onest desde la decisión 14) | Fundadores | Antes de aceptar P0-1. Admite excepción formal si no hay un Android disponible |

**Excepción formal.** Solo la admiten las filas que lo dicen —T074, la parte de TalkBack de T075, el CLS en un iPhone real y el respaldo tipográfico en Android—, y solo cuando falta el dispositivo o el equipo que nombran. Los **dos fundadores** la aprueban antes de aceptar P0-1. Se registra en la evidencia de P0-1 con estos datos:

- la verificación que no se ejecutó;
- el motivo;
- el riesgo residual;
- la mitigación (por ejemplo, axe y la emulación de Android en Chrome, aunque no la sustituyen);
- quién la revalida y cuándo, a más tardar antes del lanzamiento MVP-1.

Su estado es **«EXCEPCIÓN APROBADA»**, nunca «verificado» ni «superado».

**Lo que no cambia.** Ningún umbral se mueve. Una verificación aplazada no se presenta como superada: queda «pendiente: motivo» hasta tener salida real (`AGENTS.md` 12). La especificación de P0-1 copia esta tabla entre sus criterios de aceptación. La aceptación por etapas como regla general de pruebas está en ADR-011 §8.

#### Decisión 13: dueño del repositorio y cuenta de despliegue

Tomada por los dos fundadores el 4 de noviembre de 2026. La causa son dos límites:

- **Vercel Hobby no despliega repositorios privados de una organización de GitHub.** Eso chocaba con §7.1 («Vercel Hobby») mientras el repositorio estaba en `juntia-labs`.
- **Los minutos de GitHub Actions y las cuotas de Vercel se cobran al dueño.** En la cuenta personal del primer fundador, Juntia compartía bolsa con otro proyecto suyo, que ya las supera.

| # | Decisión | Elección | Consecuencia |
| --- | --- | --- | --- |
| 13 | Dueño del repositorio y cuenta de despliegue | **`flashwp3-ctrl/juntia`**, repositorio privado en la cuenta personal de **la segunda fundadora**, y **su propia cuenta Vercel Hobby** | El repositorio y el despliegue quedan bajo su titularidad, con sus propios minutos de Actions y sus propias cuotas de Vercel. El primer fundador colabora como colaborador con permiso de escritura. `juntia-labs/juntia` redirige al nuevo dueño; los enlaces históricos no se reescriben |

**Reglas que se derivan:**

1. **Autoría honesta.** Cada fundador firma sus commits con su propia identidad de Git. Los commits de los agentes llevan la identidad del fundador que los opera, hoy el primero (`alejandrowp3`). Los commits no se atribuyen artificialmente a la dueña de la cuenta para que desplieguen.
   - *Corrección registrada:* los commits `6789d95` y `2028875`, de los PR #23 y #24, salieron con la identidad de `flashwp3-ctrl` por una regla anterior a esta redacción. No se reescriben, porque eso exigiría force-push, y quedan anotados aquí.
2. **Despliegue de producción.** Hobby solo despliega los commits de un repositorio privado cuyo autor es la dueña de la cuenta. Por eso **los merges a `main` los hace la cuenta `flashwp3-ctrl` y siempre con «Create a merge commit»**: es el único método que crea un commit nuevo cuyo autor es quien mergea. «Squash and merge» atribuye el commit al autor del PR y «Rebase and merge» conserva los autores originales, así que ninguno de los dos garantiza el despliegue. Mientras Juntia use Hobby, la dueña **deshabilita «Allow squash merging» y «Allow rebase merging»** en Settings › General › Pull Requests, para que no se puedan elegir por error. En el primer despliegue real se comprueba que Vercel reconoce a la dueña como autora del HEAD de `main`; si no la reconoce, la regla se revisa antes de seguir.
3. **Previews.** El preview de un PR cuyo último commit no es de la dueña queda bloqueado en Hobby. Cuando hace falta uno, la segunda fundadora añade un commit propio a la rama del PR, que puede ser vacío (`git commit --allow-empty`). Es una estrategia por comprobar, no probada: su funcionamiento se verifica al configurar el proyecto y se registra con su salida. Si los dos necesitan previews automáticos de forma habitual, se pasa a Vercel Pro, que despliega commits de cualquier miembro del equipo.
4. **Protección de `main`.** GitHub Free no ofrece protección de ramas en repositorios privados de una cuenta personal. Se mantiene la barrera local de `AGENTS.md` 14a. Los fundadores decidieron el 4 de noviembre de 2026 **no contratar GitHub Pro** (decisión 3, revisada): la protección local es la definitiva.
5. **T072** (decisión 12) tiene tres partes. El aislamiento en producción se ejecuta justo después del primer despliegue y antes de compartir la URL. El aislamiento en preview se ejecuta con el primer preview real, antes de usarlo. El funcionamiento en preview se ejecuta antes de aceptar P0-1. Las dos partes de preview usan la regla 3.

> **Nota del 18 de noviembre de 2026** (decisión 25.1). El repositorio `flashwp3-ctrl/juntia` es **público** desde el 18 de noviembre de 2026. El dueño y la cuenta de despliegue no cambian, y las reglas 1 a 3 siguen vigentes mientras los fundadores no decidan otra cosa. La regla 4 se apoyaba en que GitHub Free no ofrece protección de ramas en un repositorio **privado**; en uno público sí la ofrece. **Decisión de los fundadores del 18 de noviembre de 2026: «No por ahora».** `main` sigue sin protección de servidor aunque ahora se podría proteger, y el proceso no cambia: el gate en verde antes de mergear, los merges los hacen los fundadores y vale la barrera local de `AGENTS.md` 14a.

#### Decisión 14: tipografía de marca

Tomada por los dos fundadores el 4 de noviembre de 2026, después de una comparativa de 10 fuentes de interfaz y 7 parejas completas, aplicadas sobre pantallas reales en claro y oscuro. La auditoría de Impeccable de la 001 marcó **Instrument Serif y Geist** como fuentes sobreusadas, y los fundadores decidieron diferenciar Juntia de esa estética frecuente sin perder legibilidad.

| # | Decisión | Elección | Consecuencia |
| --- | --- | --- | --- |
| 14 | Tipografía de marca | **Brygada 1918** para los titulares (antes Instrument Serif) y **Onest** para la interfaz y las cifras (antes Geist). Para los metadatos (antes Geist Mono), **Spline Sans Mono**: propuesta del gestor, aprobada por los fundadores el 4 de noviembre de 2026 viendo las capturas del PR #32 (punto 4) | Sustituye la tipografía [A] de `BRAND_FOUNDATION.md` §6 en titulares, interfaz, cifras y metadatos. Las tres fuentes pasan el detector `overused-font` de Impeccable, tienen licencia OFL en Google Fonts y soportan el español; Onest tiene cifras tabulares. Brygada aporta pesos 400–700 con itálicas reales, y así la jerarquía de titulares ya no depende solo del tamaño |

**Qué cambia y dónde:**

1. **Documentos de marca:** `BRAND_FOUNDATION.md` §6, `DESIGN_SYSTEM.md` §1.4, `HANDOFF_CLAUDE_CODE.md` y `COMPONENT_SPECIFICATIONS.md` nombran las fuentes nuevas en este PR. La **escala** de `DESIGN_SYSTEM.md` §1.4 (tamaños, interlineados y tracking) conserva por ahora los valores de Instrument Serif y Geist. El PR de implementación la recalibra para cada fuente y actualiza la tabla. **Estado:** la escala se recalibró el 4 de noviembre de 2026 en el PR de implementación (#32); ver `DESIGN_SYSTEM.md` §1.4.
2. **Implementación,** en un PR de Claude Code porque toca la composición del shell. Incluye:
   - las fuentes en `next/font`;
   - un respaldo calibrado por peso para mantener CLS = 0, como en D-01;
   - la escala en `tokens.css`;
   - el arnés de CLS, axe y capturas a 390 y 1440 px en los dos temas, que los fundadores vuelven a aprobar.
3. **Claude Design:** los comps DS v1 01, 02 y 04 cambian de fuentes para que P0-1 nazca con la tipografía nueva. La anatomía no cambia.
4. **Spline Sans Mono** fue una propuesta del gestor: solo aparece en fechas y referencias. Los dos fundadores la **aprobaron** el 4 de noviembre de 2026 viendo las capturas del PR de implementación (#32). Su `[P]` queda cerrado en `DESIGN_SYSTEM.md` §1.4 (fila `meta.mono`) y en el inventario de §15.9.

**Lo que no cambia:** la paleta y los tokens de color de I2, la anatomía de los componentes y las cifras tabulares (`tabular-nums` global). La verificación heredada «respaldo tipográfico en Android» (decisión 12) pasa a aplicarse a Onest.

#### Decisión 15: acceso a datos

Tomada por los dos fundadores el 4 de noviembre de 2026, después de tres rondas de revisión adversarial de ADR-013 (PR #34). Cierra el pendiente de acceso a datos que figuraba al final de esta sección.

| # | Decisión | Elección | Consecuencia |
| --- | --- | --- | --- |
| 15 | Acceso a datos | **ADR-013: `supabase-js` con `@supabase/ssr` y funciones de Postgres, sin ORM en P0** | ADR-013 pasa a Aceptado. La API solo expone `public`, con vistas `security_invoker` y funciones de entrada. Las tablas viven en `juntia_data` y las funciones que escriben dinero en `juntia_private`, como `security definer` propiedad de `juntia_writer`, un rol sin `BYPASSRLS`: la RLS se sigue aplicando con la identidad de quien llama. Ninguna escritura directa sobre las tablas de dinero ni de membresía. Idempotencia y bloqueo del agregado en cada operación, importes como texto en la frontera y `pg_graphql` desactivado |

**Condición:** la verificación `[V]` 1 de ADR-013, que comprueba el mecanismo de `juntia_writer` en la versión de Supabase del stack, se ejecuta con la primera migración de P0-1 y **antes** de la primera función de dinero. Si falla, ADR-013 se reabre; no se sustituye por funciones propiedad de `postgres`.

#### Decisión 16: alcance de P0-1

Tomada el 4 de noviembre de 2026 sobre la hoja de decisiones de P0-1, en las doce primeras con la recomendación del gestor. Las 16.13 a 16.15 salieron de la revisión adversarial del PR #35; en la 16.13 los fundadores eligieron permitir fechas futuras, frente a la recomendación de no permitirlas. El primer fundador la aprobó en la conversación con el gestor; la segunda fundadora la confirma con el merge del PR de la especificación 002. La especificación 002 (`specs/002-cuentas-y-gastos-privados/spec.md`, «Clarifications») las aplica.

| # | Tema | Elección |
| --- | --- | --- |
| 16.1 | Forma | Una especificación, la 002, con cuatro PR de implementación seguidos: A, base de datos, seguridad y dinero; B, acceso y Mi cuenta; C, Inicio, Actividad y Exportar; D, Anotar, editar y eliminar, más las verificaciones heredadas (orden de C y D según la 16.18) |
| 16.2 | Anotar E1–E5 `[P]` | Aprobado en su versión privada, sin «Pagó», «Participan» ni «Reparto» |
| 16.3 | Ingresos | Selector «Gasto o Ingreso» en Anotar, aprobado viendo la pantalla |
| 16.4 | Eliminar | La interfaz dice «Eliminar»; el movimiento se anula y se audita. Sin «Deshacer» posterior |
| 16.5 | Inicio y Nosotros sin pareja | Inicio en Yo sin los bloques compartidos; en Nosotros, «todavía no disponible» |
| 16.6 | Cuenta y Acceso `[P]` | Anatomía aprobada; P0-1 construye todo menos Mi pareja |
| 16.7 | Persistencia del tema `[P][V]` | Aprobada: `profiles` y una cookie; el `[V]` se ejecuta antes de cerrar el plan |
| 16.8 | «Calendario» | Flechas de mes en Actividad, sin vista de cuadrícula |
| 16.9 | Registro | Solo los correos de los fundadores hasta MVP-1, validados por la base de datos; aviso de versión privada de prueba, sin texto legal inventado |
| 16.10 | Supabase | Plan Free en la cuenta de la segunda fundadora, región São Paulo, con el correo de Supabase hasta antes de MVP-1 |
| 16.11 | Recuperación | Antes del primer dato real, copia completa cifrada fuera de Supabase y restauración de prueba; después, copia semanal manual |
| 16.12 | Exportar | En P0-1, JSON y CSV de los movimientos privados propios |
| 16.13 | Fecha futura | Se permite; Actividad deja llegar a cualquier mes futuro con movimientos |
| 16.14 | Tipo al editar | No se cambia de gasto a ingreso ni al revés |
| 16.15 | Edición doble | La segunda edición con versión antigua falla y lo explica; nada se pierde en silencio |
| 16.16 | Enumeración por la API de Auth | Riesgo aceptado hasta MVP-1; las pantallas no enumeran. Decidida por el primer fundador el 4 de noviembre de 2026, tras el preflight del plan de P0-1: la API de Auth de Supabase, llamada directamente, revela si un correo está en la lista permitida (403) y si ya tiene cuenta (422). Se suma a los pendientes de lanzamiento |
| 16.17 | Creación del perfil | En el primer acceso verificado, con el nombre visible de A2 guardado hasta entonces en los metadatos de la cuenta. Decidida por el primer fundador el 4 de noviembre de 2026 en la revisión del PR del plan de P0-1 (spec 002, Q16 y FR-029) |
| 16.18 | Orden de los PR C y D | Orden de los PR C y D intercambiado: C = Inicio, Actividad y Exportar; D = Anotar, editar y eliminar, más las verificaciones heredadas; mismo alcance. Decidida por el primer fundador el 4 de noviembre de 2026 en la revisión del PR de tasks de la 002: E5 necesita Inicio y Actividad para actualizar el total y la fila |

La 16.16 salió del preflight del plan de P0-1 y la 16.17 de su revisión; la segunda fundadora las confirma con el merge del PR del plan. La 16.18 salió de la revisión del PR de tasks y la confirma con el merge de ese PR.

**Pendientes de lanzamiento que añade esta decisión:** términos legales definitivos, servidor de correo propio, apertura del registro y cerrar la enumeración por la API de Auth (16.16). Se suman al bloqueo legal de §15.6.1.

> **Enmienda del 17 de noviembre de 2026** (decisión 24.8, Q8 de la especificación 005). Estos pendientes, y el correo propio que la 16.10 situaba «antes de MVP-1», aplican al **lanzamiento público**, no a MVP-1. El correo propio y el acceso con otros proveedores ya se habían llevado al final del producto (decisión de los fundadores del 5 de noviembre de 2026). En MVP-1 siguen el correo de Supabase, el registro limitado a los correos de los fundadores (16.9) y el riesgo aceptado de la 16.16.

#### Decisión 17: sin Docker en los equipos de desarrollo

Tomada por el primer fundador el 4 de noviembre de 2026, al empezar el plan de P0-1: Docker Desktop vuelve lento su equipo. La segunda fundadora la confirma con el merge de su PR.

| # | Decisión | Elección | Consecuencia |
| --- | --- | --- | --- |
| 17 | Dónde corre Supabase en desarrollo | **Sin Docker en los equipos.** Las pruebas que necesitan Supabase corren solo en CI; la app se usa en desarrollo contra un segundo proyecto Free, `juntia-dev` | Enmienda ADR-011 §9 y `docs/TESTING.md`. `verify` local ejecuta lint, typecheck, dominio y componentes, y declara las capas de base de datos «solo en CI». `juntia-dev` vive en la cuenta de la segunda fundadora, sin datos reales y sin claves de producción. Los jobs de base de datos corren en todo PR de código, sin filtro de rutas. Las migraciones se aplican a `juntia-dev` con el destino explícito en la sintaxis de la CLI fijada (ADR-011 §9.5). La copia de la decisión 16 (16.11) usa `pg_dump`, y su prueba de restauración tiene dos partes: el procedimiento, en un runner efímero de CI con datos de prueba, y la copia real, restaurada en un PostgreSQL normal en el equipo de un fundador (elegido por el primer fundador frente a aceptar una garantía reducida). La copia real nunca pasa por CI |

#### Decisión 18: iterar las pruebas de base de datos contra `juntia-dev`

Tomada por el primer fundador el 6 de noviembre de 2026: en seis días de noviembre el CI consumió 711 de los 2.000 minutos mensuales de GitHub Free, casi todo en iteraciones de agentes sobre las capas que solo podían correr en CI (decisión 17). La segunda fundadora la confirma con el merge de su PR.

| # | Decisión | Elección | Consecuencia |
| --- | --- | --- | --- |
| 18 | Dónde iteran los agentes las capas de base de datos | **Contra `juntia-dev`, desde el equipo de un fundador.** `juntia-dev` pasa a ser un entorno de pruebas desechable: los agentes aplican migraciones, lo reinician y ejecutan pgTAP, integración de servidor y E2E contra él mientras desarrollan. El CI se reserva para los puntos de control que pide el `tasks.md` del slice y para el gate final | Enmienda ADR-011 §9 (§9.5 y §9.9) y `docs/TESTING.md`. **El gate no cambia:** un PR solo está verificado con `verify` más los jobs de CI en verde sobre el mismo commit, con el Supabase limpio del runner, y la evidencia de las `[V]` sale de CI, no de `juntia-dev` (ADR-011 §9.8). Condiciones: la clave secreta de `juntia-dev` vive solo en un `.env.test` local ignorado por git, nunca en el repositorio, en el chat ni en un camino de petición de la app; ninguna clave de producción se usa en pruebas; antes de cada escritura un guardia comprueba que el destino es `itfrhnadovezpahikuol`; un solo agente usa `juntia-dev` a la vez; producción conserva la confirmación del fundador antes de cada paso de escritura. Los correos reales (límite de 2 por hora) y el ensayo de restauración siguen solo en CI. Las cuentas que los fundadores usen a mano en `juntia-dev` pueden borrarse al reiniciarlo. Si `juntia-dev` deja de bastar, la alternativa sigue siendo Docker con límite de memoria (ADR-011 §9, «Consecuencias») |

#### Decisión 19: verificaciones de dispositivo y copia antes de usar producción

Tomada por los dos fundadores el 6 de noviembre de 2026, durante el PR D de la especificación 002 (aceptación de P0-1); la comunicó Alejandro en nombre de los dos. Ajusta, para P0-1, la tabla «Lo que hereda P0-1» de la decisión 12 y el momento de la copia de la 16.11. La segunda fundadora la confirma con el merge del PR D.

| # | Decisión | Elección | Consecuencia |
| --- | --- | --- | --- |
| 19.1 | Verificaciones en iPhone de P0-1: teclado nativo con la hoja de Anotar, US-12 en el teléfono, contraste (001-T073) y VoiceOver con el Anotar real (001-T075) | **Aplazadas, con el riesgo aceptado.** Pasan a ser **criterio de aceptación obligatorio antes del lanzamiento de MVP-1**, con dueños los fundadores | Es la regla de ADR-011 §8 para verificaciones aplazadas: cada una con dueño y momento, y ninguna se presenta como superada; queda «aplazada por decisión 19» hasta tener salida real. Ninguna es de seguridad, autorización, aislamiento ni atomicidad. P0-1 se acepta sin ellas; MVP-1 no se lanza sin ellas |
| 19.2 | Verificaciones que necesitan un Android o un Mac: sombras táctiles (001-T074), TalkBack (001-T075), CLS en un iPhone real y respaldo tipográfico de Onest en Android | **Excepción formal aprobada por los dos fundadores**, con los cinco datos de la decisión 12 | Estado «EXCEPCIÓN APROBADA», nunca «verificado». Se revalidan antes del lanzamiento de MVP-1, en cuanto haya un Android o un Mac |
| 19.4 | CLS = 0 fuera de Chromium, en Firefox y WebKit (decisión 12, «sin excepción posible»; T093 de la 002) | **Aplazada, con el riesgo aceptado**, como la 19.1: criterio obligatorio antes del lanzamiento de MVP-1, con el gestor de dueño | El arnés R2 mide con la API Layout Instability y el screencast de CDP, que solo existen en Chromium; medirlo en Firefox y WebKit necesita un método nuevo, y sin sesión solo cubriría `/entrar` y la 404. Las rutas con sesión dependerán de `juntia-dev` (decisión 18) o de otro método que se apruebe. No es un control de aislamiento |
| 19.3 | Primera copia real y su restauración (16.11; SC-010 de la 002) | **Cambia el momento, no se elimina:** antes del **primer movimiento real en producción**, no antes del merge del PR D | Producción todavía no tiene datos reales y una copia ahora no protege nada. La hace un fundador con el gestor; ningún agente ve la contraseña de producción. Sin la salida de la copia y la restauración, no se anota ningún dato real |
| 19.5 | Presupuesto del job `e2e` | **Sube de < 360 s a < 480 s.** **Desde el 10 de noviembre de 2026, < 660 s** (decisión de los fundadores, al final de la decisión 21). El tope duro del job pasa a 12 minutos (decisión de los fundadores del 10 de noviembre de 2026, junto con el presupuesto de 660 s), para que el presupuesto avise antes de que GitHub cancele el job. El job no se parte, para no gastar más minutos de CI | Medido en 421–445 s en los PR C y D de la 002: la spec E2E 2 y más de 64 auditorías de axe con sesión, cada una con su cuenta sembrada. Enmienda ADR-011 §4 y `docs/TESTING.md` §9 solo para ese job; el resto de los jobs sigue con < 6 min. Hasta el hito de §9 el presupuesto avisa y no bloquea |

**Lo que no cambia.** Ningún umbral se mueve. Los controles de aislamiento heredados de la decisión 12 no se aplazan: las tres partes de 001-T072 tienen salida real (6 de noviembre de 2026). El orden de la tabla sigue el de las verificaciones; 19.4 y 19.5 se tomaron el mismo día, después de las tres primeras.

> **Enmienda de la 19.2 del 17 de noviembre de 2026** (decisión 24.6, Q6 de la especificación 005, opciones (a) y (c)). Las verificaciones que necesitan un **Android** —sombras táctiles (001-T074, 002-T090), TalkBack (001-T075, 002-T092), el respaldo tipográfico de Onest (002-T095) y el teclado nativo con teclados de terceros (parte de Android de 002-T086), más los **springs a 55 fps** de `docs/design/MOTION_SYSTEM.md`, que se añaden a la excepción— **se prorrogan más allá de MVP-1** como excepción formal. Su revalidación pasa a ser condición para **abrir la app a un tercero**, no para declarar MVP-1. El **CLS en un iPhone real** (002-T094) **sale de la excepción**: se ejecuta antes de MVP-1 con el inspector de Safari en un Mac prestado. El estado sigue siendo «EXCEPCIÓN APROBADA», nunca «verificado», con los cinco datos de la decisión 12, y la tabla «Lo que hereda P0-1» de la decisión 12 se lee con esta enmienda.
>
> **Enmienda de la 19.5 del 17 de noviembre de 2026** (decisión 24.14). El job `e2e` **sí se parte**: el axe con sesión sale a un job propio, `a11y-session`, que corre en paralelo con su propio Supabase y su propio build (PR #83, mergeado el 17 de noviembre). Cada uno de los dos jobs conserva el presupuesto de **< 660 s** (bloquea) y el tope duro de **12 min**. Se partió en vez de subir el presupuesto: el gate del PR #82 midió 609 s de 660 y P0-4 añade pruebas. La frase «el job no se parte, para no gastar más minutos de CI» queda sin efecto; el arranque de Supabase se paga dos veces, costo aceptado. Desde el 18 de noviembre de 2026 los minutos de Actions dejan de ser una restricción mientras el repositorio siga público (decisión 25.1).

#### Decisión 20: alcance de P0-2

Los dos fundadores la tomaron el 6 de noviembre de 2026 sobre las 18 preguntas abiertas de la especificación 003 (`specs/003-pareja-y-balances/spec.md`). Aceptaron todas las recomendaciones tal como estaban propuestas. Alejandro la comunicó al gestor en nombre de los dos, y la segunda fundadora la confirma con el merge del PR de la especificación (#47). La spec 003 la aplica en su sección «Clarifications».

| # | Tema | Elección |
| --- | --- | --- |
| 20.1 | Forma | Una especificación, la 003, con cuatro PR de implementación: A, base de datos, seguridad y dinero; B, Mi pareja e invitaciones; C, gastos compartidos y Mover a Pareja; D, Balance, liquidaciones, S1 y S4 |
| 20.2 | SharedBalance `[P]` | Aprobado en su forma; la aprobación final en pantalla es la revisión visual del PR D |
| 20.3 | ChangePreview `[P]` | Aprobado en su forma, solo en Mover a Pareja (ADR-001 ya lo describía) |
| 20.4 | Anotar compartido E1–E5 `[P]` | Aprobado en su forma: contexto, pagó, participan, reparto y «Faltan $X». Completa la 16.2 |
| 20.5 | Reparto al abrir Anotar en Nosotros | Lo último que usó esa persona, siempre visible; la primera vez, «Pagó: yo» y 50/50 visibles. No es una preferencia configurable. **Enmienda del 12 de noviembre de 2026** (decisión 23.3): el **pagador** por defecto es siempre **quien anota**; el **reparto** se sigue recordando |
| 20.6 | Pagador | Cualquier integrante activo, también el que no anota; la autoría queda visible |
| 20.7 | Participantes | Al menos uno; quien paga no tiene por qué participar, y una parte de 0 equivale a no participar |
| 20.8 | Granularidad del reparto | Pesos enteros, desempate estable por orden de ingreso a la pareja y porcentajes enteros. **Nota de implementación de ADR-002** (`docs/adr/ADR-002-dinero-y-repartos.md`) |
| 20.9 | Saldo | Acumulado desde que existe la pareja; el desglose se filtra por mes |
| 20.10 | Liquidación | La registra cualquiera de los dos, declarativa y sin confirmación, de deudor a acreedor y por un importe que no supere el saldo pendiente; con fecha de hoy o pasada, nunca futura |
| 20.11 | Liquidación registrada por error | Se anula con auditoría, nunca se edita ni se borra; «Deshacer» de 6 s. **Enmienda de ADR-007** («liquidaciones inmutables»), en `docs/adr/ADR-007-correcciones.md` |
| 20.12 | Editar y eliminar un gasto compartido | Cualquiera de los dos, con control de versión; no cambia el contexto; el otro ve «Editado por X · fecha» |
| 20.13 | Nacimiento de la pareja | Al crear la invitación. Quien es propietaria de una pareja de un solo integrante no acepta otra invitación hasta anular la suya |
| 20.14 | Invitación y lista permitida | Al crear la invitación no se comprueba el correo contra la lista (no se enumera) |
| 20.15 | Deshacer de Mover a Pareja | 6 s. Lo bloquea cualquier edición, anulación o liquidación posterior. El importe no cambia al mover, y deshacer restaura el gasto como un registro nuevo |
| 20.16 | Tiempo real | No en P0-2: los datos se actualizan al navegar, al volver a la pestaña y tras cada escritura propia |
| 20.17 | Hito de los presupuestos de CI | Bloquean al cierre de P0-2, como dice `docs/TESTING.md`, con tres specs E2E, los balances y `gasto_consumo`; el resto de DEC-G04 llega con P0-3 |
| 20.18 | Ejemplo de Mover a Pareja | Escenario hipotético que se prueba por diferencias; el dataset dorado de P0-1 no cambia |

Además, el comp 02·5 E5, que muestra una fila privada en Nosotros, se resuelve a favor de la regla de privacidad (§5.5): esa fila no se construye.

#### Decisión 21: accesibilidad en dos niveles de CI

Los dos fundadores la tomaron el 7 de noviembre de 2026, después del PR C de la 003, cuyo job `e2e` tardó **524 s** frente al tope de 480 s de la decisión 19.5. De esos 524 s, 280 s eran el barrido de accesibilidad con sesión. Alejandro la comunicó al gestor en nombre de los dos («Punto medio»).

| # | Tema | Elección |
| --- | --- | --- |
| 21.1 | axe en cada PR de código | **Nivel ligero:** cada pantalla y cada estado registrado se audita **una vez**, a 390 px, en los dos temas, sin sesión en el job `app` y con sesión en el job `e2e`. Sigue siendo bloqueante: una violación seria o crítica rompe el PR |
| 21.2 | Barrido completo | Los siete anchos (360, 390, 430, 768, 1024, 1280 y 1440), el texto al 200 %, el recorrido completo con teclado y los objetivos táctiles de 44 px salen del PR y corren **a mano** con «Run workflow»: al cerrar cada etapa (fin de P0-2, fin de P0-3, antes de MVP-1) y en todo PR que cambie el diseño de una pantalla existente o añada una nueva. Lo lanza el gestor; sus fallos bloquean el cierre de la etapa |
| 21.3 | Lo que no cambia | WCAG AA sigue siendo obligatorio; los criterios de aceptación (FR-054, SC-001, FR-068 y equivalentes) se cumplen igual, solo cambia **cuándo** se comprueban. El gate visual humano no cambia |
| 21.4 | Presupuesto | Con el nivel ligero, el job `e2e` vuelve por debajo de los 480 s de la 19.5, que sigue vigente y pasa a bloquear desde el PR D de la 003 (20.17). **Desde el 10 de noviembre de 2026, < 660 s** (decisión de los fundadores, abajo). **Desde el 17 de noviembre de 2026**, el axe con sesión corre en su propio job, `a11y-session`, en paralelo con `e2e`, cada uno con < 660 s y 12 min de tope (decisión 24.14) |

Enmienda `docs/TESTING.md` §3 («Qué rutas pasa axe en un PR») y la tabla de presupuestos. El cambio del workflow y de los archivos `*.a11y.ts` va en el primer PR de código posterior (el PR D de la 003).

> **Decisión de los fundadores del 10 de noviembre de 2026:** el tope del job `e2e` sube de 480 s a 660 s. Medición del gate del PR #67 (run 42849936048): 517 s con las specs 1, 2, 3 y 5 (Supabase 139 s, build 89 s, E2E 69 s, axe con sesión 194 s); la mitigación (a) no fue segura (medición del PR A) y la (b) no basta, porque la mayor parte es preparación fija; se aplicó la (c) de `specs/004-presupuestos-y-metas/contracts/ci.md`. Enmienda las decisiones 19.5 y 21.4, `docs/TESTING.md` §9 y `scripts/ci.mjs`.

> **Decisión de los fundadores del 11 de noviembre de 2026:** el nivel ligero de accesibilidad de cada PR corre por área, con el mismo criterio del selector de specs E2E (lo compartido o desconocido, todo); el barrido completo `@sweep` sigue corriendo entero al cerrar cada etapa y en los PR con pantallas nuevas. Lo aplica `scripts/a11y-select.mjs` en el paso de axe del job `e2e`; el mapa está en `specs/004-presupuestos-y-metas/contracts/ci.md` («Selector de accesibilidad por área») y en `docs/TESTING.md` §3. Decisiones del gestor del mismo día: `routes.a11y.ts` se parte por el área de cada ruta del registro (`A11Y_ROUTE_AREAS`; el núcleo solo corre con lo compartido o un cambio del núcleo; sin la variable, todo el registro), y `src/lib/copy/es.ts` es neutro, como en E2E, salvo que el PR no toque ningún área: entonces corre todo. Riesgo aceptado: un cambio de copy que afecte nombres accesibles de otra área no se detecta en el gate; lo cubren la revisión y el barrido completo al cerrar cada etapa. Enmienda la decisión 21.1 solo en qué casos del nivel ligero corren en un PR; el job `app` (estados sin sesión) no cambia.

> **Decisión de los fundadores del 17 de noviembre de 2026** (decisión 24.14): los estados con sesión de la 21.1 y el barrido completo de la 21.2 se ejecutan en el job **`a11y-session`**, ya no en `e2e`. El selector por área y el control de ancho de `routes.a11y.ts` van con ellos. El mismo día, los fundadores añadieron a la pasada de cada estado la **comprobación de ancho** (el documento nunca es más ancho que el viewport) y, por debajo de 768 px, que ningún campo de texto baja de 16 px (decisión 23.6).

#### Decisión 22: alcance de P0-3

Los dos fundadores la tomaron el 7 de noviembre de 2026 sobre las 19 preguntas abiertas de la especificación 004 (`specs/004-presupuestos-y-metas/spec.md`). Aceptaron todas las recomendaciones tal como estaban propuestas («Aceptamos»). Alejandro la comunicó al gestor en nombre de los dos, y la segunda fundadora la confirma con el merge del PR de la especificación (#63). La spec 004 la aplica en su sección «Clarifications».

| # | Tema | Elección |
| --- | --- | --- |
| 22.1 | Forma | Una especificación, la 004, con cinco PR de implementación: A, base de datos, seguridad y dominio; B, Plan y presupuestos (nace la spec E2E 5); C, metas, aportes, retiros y S5 (nace la spec E2E 4); D, gasto con meta y confirmaciones (amplía la spec 4 con dos sesiones); E, Análisis, PlanningNote, exportación y cierre (amplía la spec 5). B y C pueden ir en paralelo después de A |
| 22.2 | GoalStack `[P]` | Aprobado en su forma: pila en móvil y abanico desde lg, con «Ver todas» siempre visible. Si falla el rendimiento del abanico con 6 metas en gama media, se cae a la lista y vuelve a los fundadores. Aprobación final en pantalla en el PR C. **Criterio de «falla»** (decisión 25.4, D3): menos de 55 fps, es decir, menos del 95 % de los fotogramas en ≤ 18,2 ms o alguno de más de 50 ms, con CPU 4×. **Excepción para MVP-1** (18 de noviembre de 2026, decisión 25.4): el primer deslizamiento a 390 no cumple por un único fotograma de unos 85 ms; la pila no cae a la lista y se revisa con la precarga de F02 |
| 22.3 | FundingLedger, ConfirmationBadge `[P]` y ChangePreview en B3 | Aprobados en su forma; «NO SE REGISTRÓ» solo con un rechazo confirmado. Aprobación final en pantalla en el PR D |
| 22.4 | PlanningNote `[P]` | Aprobada en su forma, solo en Análisis. Aprobación final en pantalla en el PR E |
| 22.5 | Análisis (S3) | Ruta hija de Plan, con acceso desde Plan y desde «En qué se fue» de Inicio; sin destino de navegación nuevo |
| 22.6 | Fotos de las metas | **Fuera de P0-3**: se usa el fallback aprobado de GoalCard. La subida de fotos necesitará un ADR propio (**ADR-014**, Storage privado de fotos de metas) antes de P0-4. **Enmienda del 17 de noviembre de 2026** (decisión 24.13): las metas **no tienen foto en MVP-1**; el fallback aprobado (`[A]`) se queda y **ADR-014 pasa a MVP-2** |
| 22.7 | Vigencia del presupuesto | Rige cada mes hasta que se edita o se desactiva; una edición rige desde el mes en que se hace y los meses anteriores conservan su límite. **Nota de implementación de ADR-004** (`docs/adr/ADR-004-presupuestos.md`) |
| 22.8 | Alcance del presupuesto | Solo por categoría de gasto (las nueve, incluida «Otra»), nunca «Ingresos»; sin total del mes |
| 22.9 | Ritmo y proyecciones | Solo aritmética descriptiva, sin extrapolar; sin «próximo aporte planeado» |
| 22.10 | Comparación con el mes anterior | Solo si el mes anterior tiene gastos en ese contexto; hasta dos categorías con mayor aumento, nunca un gasto concreto ni una causa |
| 22.11 | Metas en Yo y en Nosotros | Nosotros, solo compartidas; Yo, las personales y aparte las compartidas con «Tus aportes», sin un total que las sume. **Enmienda del 12 de noviembre de 2026** (decisión 23.4): lo disponible de cada persona se rotula **«Tu disponible»**, en Metas · Yo y en la meta inmersiva |
| 22.12 | Fecha y modo de aportes y retiros | Fecha de hoy o pasada, nunca futura; «Apartado en Juntia» por defecto, con transferencia declarada opcional |
| 22.13 | Corregir un aporte | Se anula con auditoría («Deshacer» de 6 s y «Anular aporte» mientras los fondos sigan disponibles), nunca se edita ni se borra; el retiro queda para reasignaciones reales. **Nota de ADR-010** (`docs/adr/ADR-010-metas.md`) |
| 22.14 | Retiro de aportes ajenos | No en P0: solo aportes propios |
| 22.15 | Editar, lograr y archivar una meta | Edita cualquiera de los dos con versión y auditoría; «Dar por lograda» es manual; archivar exige saldo 0 y ninguna solicitud pendiente; nada con historia se borra |
| 22.16 | Alcance del gasto con meta | Una meta por gasto, elegida al anotar; uso ≤ gasto; propuesta de fondos proporcional a lo disponible, editable. **Enmienda del 11 de noviembre de 2026** (decisión 23.2, F20 y F77-3): con reparto, la propuesta es **la parte de cada uno en el reparto del gasto**, en pesos enteros con mayor residuo; sin reparto, lo proporcional a lo disponible redondeado a mil. Nunca por encima de lo disponible de nadie, y sigue siendo editable |
| 22.17 | Editar o anular un gasto con meta | «Quitar el uso de la meta» como operación propia; anular el gasto quita el uso en la misma operación; no se baja el monto por debajo de lo usado. **Nota de ADR-010** |
| 22.18 | Mes de `gasto_financiado_con_meta` | El mes del gasto (`transaction_date`), también para lo aprobado después |
| 22.19 | Dataset dorado de P0-3 | Aprobadas las filas que define la spec 004; los casos de noviembre son escenarios hipotéticos que se prueban por diferencias, como la 20.18 |

Además, tres lecturas del paquete de diseño se resuelven a favor del documento superior, sin pregunta: el selector «¿Quién aporta?» de 04·3 no se construye (DEC-G06: aporta quien registra), el «Aporte a Boda» de 04·7 es a Japón (dataset dorado) y el texto «el dinero sigue en la cuenta de Sara» se sustituye por el del handoff, «sigue donde lo tengan».

#### Decisión 23: ajustes de P0-3 tras la auditoría y la salida simulada

Los dos fundadores las tomaron entre el 11 y el 17 de noviembre de 2026, durante la auditoría de Impeccable de toda la app (PR #76), la simulación de la guía de salida interna de P0-3 (004-T084, `docs/audits/2026-11-t084/`) y la revisión de los PR #77 a #82. Alejandro las comunicó al gestor en nombre de los dos. Ya están en el código y en producción; esta sección es su registro, escrito en el PR documental de cierre de P0-3 (004-T085), y enmienda las filas que se citan.

| # | Tema | Elección | Dónde |
| --- | --- | --- | --- |
| 23.1 | Texto ampliado al 200 % (F13, 11 nov) | Todos los tamaños de texto en `rem`, para que el texto crezca con la preferencia del sistema. Excepción aceptada por el gestor (F79-3): los suelos de `--money-*-fit` siguen en px | PR #79 (12 nov); `docs/design/DESIGN_SYSTEM.md` §1.4; §15.9 |
| 23.2 | Propuesta de fondos del gasto con meta (F20, 11 nov; F77-3) | Con reparto, cada aportante empieza en **su parte del reparto del gasto**, en pesos enteros con mayor residuo y el mismo criterio en los tres modos de reparto; sin reparto, lo proporcional a lo disponible redondeado a mil; nunca por encima de lo disponible de nadie; editable | PR #77; enmienda la 22.16; spec 004, Q16 y FR-051 |
| 23.3 | Pagador por defecto (12 nov, punto 6b de la salida simulada) | El pagador de un gasto compartido nuevo es **quien anota**. El reparto se sigue recordando, como dice la 20.5 | PR #80; enmienda la 20.5; spec 003, Q5, US-2 y FR-021 |
| 23.4 | Textos de metas (12 nov, punto 8; F06) | Lo disponible de cada persona se rotula **«Tu disponible»** (Metas · Yo y meta inmersiva); «Tus aportes» se queda, a propósito, desde el 19 de noviembre de 2026 solo en los mensajes de error y en las notas de rechazo de la solicitud (`rejectNote` y `rejected` en `src/lib/copy/es.ts`): ese día los fundadores aprobaron que B5 diga «Tu disponible en {meta}: $X → $Y» («Sí, apruebo»; PR #91). El retiro se rotula **«Retiro de la meta»**, con su motivo en Actividad, sin «· reasignación». Las filas de uso de una meta ya **no** dicen «no es un gasto nuevo». El concepto no cambia: un retiro es una reasignación de fondos propios, nunca un ingreso | PR #77 y #80; enmienda la 22.11; `docs/GLOSSARY.md`; `docs/design/BRAND_FOUNDATION.md` §4; spec 004 |
| 23.5 | Diálogos de escritorio (12 nov) | Desde 768 px, `Modal` y `BottomSheet` adaptativa van **anclados arriba** (`max(48px, 8dvh)` más el inset seguro), centrados en horizontal, y crecen o se acortan por abajo. Las **confirmaciones siguen centradas** | PR #81 (17 nov); `docs/audits/2026-11-dialogs/README.md`; `docs/design/COMPONENT_SPECIFICATIONS.md` §Modal y §BottomSheet; `RESPONSIVE_SPECIFICATIONS.md` |
| 23.6 | Campos de texto y ancho (17 nov) | Por debajo de md o con puntero táctil, todo campo de texto calcula **al menos 16 px** (1 rem), porque Safari de iPhone amplía la página al enfocar un campo más pequeño y la deja así. AmountInput conserva su `clamp` y el escritorio con ratón no cambia. Además, la pasada de accesibilidad comprueba en **cada pantalla y estado** que el documento no es más ancho que el viewport y, por debajo de 768 px, que ningún campo baja de 16 px. Motivo: el desborde de Actividad del 11 de noviembre (585 px a 390) llegó a producción sin que ningún gate lo detectara | PR #82 (17 nov); `docs/design/DESIGN_SYSTEM.md` §1.4; `docs/TESTING.md` §3 |

**Lo que no cambia.** Las reglas de dinero (DEC-G01 a DEC-G06, §15.5) y la 22.13 (un retiro es una reasignación real, distinta de anular un aporte). La copy «Tu disponible · aportaste» de la meta inmersiva sigue pendiente de aprobación en pantalla en la revisión de S5 de P0-4 (24.11).

#### Decisión 24: alcance de P0-4

Los dos fundadores la tomaron el 17 de noviembre de 2026 sobre las doce preguntas de la especificación 005 (`specs/005-gate-mvp-1/spec.md`, «Clarifications»). Aceptaron todas las recomendaciones tal como estaban propuestas («Sí, las 12»). Alejandro la comunicó al gestor en nombre de los dos, y la segunda fundadora la confirmó con el merge del PR de la especificación (#84). Las 24.13 y 24.14 las tomaron el mismo día, antes de la especificación, y la especificación las aplica.

| # | Tema | Elección |
| --- | --- | --- |
| 24.1 | Forma | Tres PR: A, pruebas y arneses; B, correcciones; C, evidencia y cierre (solo documentos) |
| 24.2 | Issue #53 (fila optimista doble) | Se difiere a **MVP-2** como límite conocido, sin ADR en P0-4; vuelve a los fundadores si la doble fila molesta en el uso diario |
| 24.3 | Humo del candidato | Sin spec E2E nueva: las cinco specs sobre el commit candidato, en Chromium y una vez en WebKit, más la checklist de humo de los fundadores en producción. El **nivel 2 nocturno** de ADR-011 §5, que nunca se implementó, se difiere a **MVP-2** |
| 24.4 | F02 (S1 y S5 ocultas por la latencia) | Se mide primero en producción con iPhone; se corrige en el PR B si la mediana supera 1 s o si un fundador lo juzga un defecto |
| 24.5 | Core Web Vitals | Solo laboratorio en MVP-1, con LCP y la tabla de lo «no medible en p75 real»; la medición de campo (RUM) pasa a MVP-2 |
| 24.6 | Dispositivos | El CLS en iPhone, con un Mac prestado, antes de MVP-1; las verificaciones de Android, incluidos los springs a 55 fps, se prorrogan más allá de MVP-1. Enmienda la 19.2 (nota en la decisión 19) |
| 24.7 | CLS fuera de Chromium | Comparador por fotogramas en WebKit y Firefox; si no es fiable, vuelve a los fundadores con «solo WebKit». La 19.4 no se enmienda |
| 24.8 | Eliminación de cuenta y pendientes de lanzamiento | Al **lanzamiento público**; en MVP-1, un procedimiento manual ensayado en `juntia-dev`. Enmienda §15.6.1 y la decisión 16 (notas allí) |
| 24.9 | Copias | Semanal, más una antes de cada migración de producción, más una restauración real con el esquema de P0-3 antes de declarar MVP-1; pérdida máxima aceptada, 7 días |
| 24.10 | Aprobación de MVP-1 | El escenario de pareja de §4 en móvil y escritorio, más 7 días consecutivos de uso diario real y notas separadas en cuatro ejes. **Enmienda del 25 de noviembre de 2026** (decisión 30): se separan dos hitos. La **aceptación técnica**, que es «declarar MVP-1», conserva el escenario de §4 (con la sustitución de la sesión guiada que decide la 30.7) y todas las demás verificaciones. Los **7 días de uso diario real** y las notas en cuatro ejes pasan a la **validación por uso real**, que se conserva pero se aplaza (30.5 y 30.6) |
| 24.11 | Defectos de diseño que entran | El residuo de F13 al 200 %, la pérdida del monto al cruzar 768 px y el marco de foco si incumple el handoff. «Descartar» y el cierre con View Transition, a MVP-2. «Tu disponible · aportaste» se aprueba en la revisión de S5 |
| 24.12 | Tabla de idempotencia | Sin purga en MVP-1; se mide su tamaño y se revisa en MVP-2 |
| 24.13 | Fotos de las metas | **Fuera de MVP-1.** Se queda el fallback aprobado de GoalCard (`[A]`) y **ADR-014** (Storage privado de fotos de metas) pasa a **MVP-2**. Enmienda la 22.6 y §15.6.2 punto 2; los `[V]` de scrim, luminancia y casos de foto del paquete de diseño no aplican a MVP-1 |
| 24.14 | Job `e2e` del CI | Se parte en dos jobs paralelos, `e2e` y `a11y-session` (axe con sesión), cada uno con < 660 s y 12 min de tope, en vez de subir el presupuesto. Además existe el job `release`, solo a mano, que no es del gate (spec 005). PR #83, mergeado el 17 de noviembre. Enmienda las 19.5 y 21.4, ADR-011 §4 y `docs/TESTING.md` §9 |

#### Decisión 25: plan de P0-4 y registros del 18 de noviembre de 2026

| # | Tema | Elección |
| --- | --- | --- |
| 25.1 | Repositorio público | **`flashwp3-ctrl/juntia` es público desde el 18 de noviembre de 2026**, por decisión de los fundadores. **Motivo:** se agotaron los 2.000 minutos mensuales de GitHub Actions que la cuenta Free tiene para un repositorio privado (como referencia, solo el punto de control del laboratorio del PR A de la 005, run 44349192421, facturó 176 minutos). **Consecuencia:** mientras el repositorio siga público, los minutos de Actions **dejan de ser una restricción**. Todo lo que entra en el repositorio pasa a ser público: siguen valiendo, sin cambio, las reglas que ya impedían guardar en él datos reales, claves o secretos (`AGENTS.md` 6 y 15a; decisión 18). **Las reglas de `AGENTS.md` 15a se mantienen tal cual** (decisión de los fundadores del 18 de noviembre de 2026): iterar en borrador, un solo push por revisión y no lanzar CI en PRs de documentos siguen siendo buena práctica, porque hay menos ruido y un gate por cada versión revisada, y vuelven a importar si el repositorio pasa a privado. `AGENTS.md` no cambia. La protección de `main`, «no por ahora» (nota de la decisión 13) |
| 25.2 | D1 · PR A antes de aceptar P0-3 | El plan de la 005 (D1, opción a, 18 nov) decía que el PR A se itera en borrador y **no se mergea** hasta que 004-T084 y 004-T085 estén cerrados. **Los fundadores mergearon el PR A (#87) el 18 de noviembre de 2026, antes de lo que decía D1**, por decisión propia (gate verde en `42e2575`). El PR A no cambia la app: añade pruebas, arneses, el job `release` y el script del borrado manual. El resto de D1 no cambia: el PR B, el PR C y el candidato esperan a P0-3 aceptada (FR-001 de la 005) |
| 25.3 | D2 · Borrado manual de cuenta | Sin pareja activa, se borra todo lo de la persona; con pareja activa, la pareja completa, con el «sí» escrito de las dos y la exportación previa de cada una (`specs/005-gate-mvp-1/contracts/account-deletion.md`). Es una **operación administrativa excepcional**, limitada al procedimiento autorizado y ensayado, nunca un camino de la app. Sus reglas están en las notas del 18 de noviembre de 2026 de ADR-007, ADR-010 y ADR-013. Resultado de N1 (comprobado el 18 de noviembre de 2026 en `juntia-dev`, caso 1 de 005-T039): `allocations_check_sum` **no** se suspende |
| 25.4 | D3 · Criterio de «falla» del abanico | Menos de 55 fps: menos del 95 % de los fotogramas en ≤ 18,2 ms o alguno de más de 50 ms, con CPU 4×, durante el hover, el foco y el deslizamiento, a 1440 (abanico) y a 390 (pila). Enmienda la 22.2. El laboratorio del PR A midió que solo fallan las **primeras** interacciones (`specs/005-gate-mvp-1/evidence.md`, «GoalStack con 6 metas»). Los fundadores decidieron el 18 de noviembre de 2026 («Sí, primero arreglar») corregir primero ese arranque en el PR B y volver a medir; solo si sigue fallando, la pantalla cae a la lista. **Resultado y excepción (fundadores, 18 de noviembre de 2026, «Excepción MVP-1»):** tras la corrección del PR B, el primer deslizamiento a 390 sigue con un único fotograma de unos 85 ms (71 ms de render de React más el IntersectionObserver de la precarga por viewport del `<Link>` de Next); del segundo al sexto deslizamiento y el primer hover a 1440 cumplen. Se aprueba como **excepción para MVP-1**: la pila **no** pasa a lista, y se revisa cuando se trate la precarga en F02 |
| 25.5 | D4 · Periodo de uso de la 24.10 | Despliegues de producción congelados durante los 7 días; un fallo crítico se corrige en un PR B, el candidato nuevo vuelve a pasar el humo y los 7 días vuelven a empezar. **Enmienda del 25 de noviembre de 2026** (decisión 30): la regla no cambia, pero se aplica al periodo de la **validación por uso real**, que se aplaza (30.6) y ya no precede a la declaración de MVP-1. La congelación del gate tiene una única excepción, acotada a C-1–C-7 (30.2) |
| 25.6 | N2 · Listas largas | Los fundadores no recorren en el teléfono la cuenta de listas largas de `juntia-dev`: revisan las capturas de 005-T027 y T054 |

D1 a D4 se tomaron sobre el plan de la 005 (PR #85, «Para los fundadores») y N1 y N2 sobre sus tareas (PR #86); los fundadores aceptaron las recomendaciones tal como estaban propuestas, y Alejandro las comunicó al gestor en nombre de los dos. Ningún presupuesto de CI, umbral ni spec E2E cambia con esta decisión.

#### Decisión 26: residuo de CLS por fuentes tardías

Tomada por los fundadores el 19 de noviembre de 2026, con las mediciones del PR B de P0-4. Alejandro la comunicó al gestor en nombre de los dos.

| # | Tema | Elección |
| --- | --- | --- |
| 26.1 | CLS = 0 de §15.7 con fuentes que llegan tarde | **Excepción para MVP-1.** Cubre solo este residuo:<br>- **Chromium**, con CPU y red lentas: en Plan, Metas y Balance, 3–4 de cada 50 cargas tienen un CLS ≤ 0,025. Es texto libre que cambia de ancho cuando llegan Onest o Brygada 1918.<br>- **Firefox**: en `/crear-cuenta` a 390, 8 de 15 cargas se desplazan 16–34 px en el primer pintado, antes de que haya fuentes.<br>- **Safari** da 0 en todas las pantallas.<br>D-01, el respaldo calibrado de la 001 (`specs/001-frontend-foundation/evidence.md`), no cambia. La excepción se revisa después de MVP-1. El umbral no se mueve: fuera de este residuo, CLS = 0 sigue bloqueando |
| 26.2 | Calibración de D-01 para las cifras | **Afinado**, hecho en el PR B de P0-4 (18 de noviembre de 2026): una cara de respaldo **solo para dígitos**, con `unicode-range` U+0030–0039 sobre Verdana y `size-adjust` de 105,71 % / 94,67 %. Donde no hay Verdana, el respaldo es el de siempre |

#### Decisión 27: Planes, primera funcionalidad de MVP-2

Los fundadores respondieron el 24 de noviembre de 2026 las preguntas Q1–Q23 de la especificación 006 (`specs/006-planes/spec.md`, «Clarifications»). Alejandro las comunicó al gestor en nombre de los dos, y la segunda fundadora las confirmó con el merge del PR de la especificación (#94, 25 de noviembre de 2026). La 27.4 la tomó Alejandro el 25 de noviembre de 2026, y la 27.5 la tomaron los dos fundadores ese mismo día (Alejandro la comunicó en nombre de los dos). **Nada de esto se implementa antes de declarar MVP-1** (spec 005).

| # | Tema | Elección |
| --- | --- | --- |
| 27.1 | Planes | **Primera funcionalidad de MVP-2.** Un plan (viaje, salida o evento) es una etiqueta adicional de los gastos: no cambia ninguna cifra de Yo, Nosotros, el balance, los presupuestos ni Análisis. Se aceptaron todas las recomendaciones de Q1–Q23 salvo la de **Q12, que cambia**: un plan cerrado **queda bloqueado** (no aparece al anotar, no se le asocian ni quitan gastos y no se edita), se reabre para cambiarlo, y el importe de sus gastos se sigue pudiendo editar. MVP-2 mantiene el tope de specs E2E de P0 (Q20). El detalle está en la especificación; esta fila no la copia |
| 27.2 | ADR-014, fotos de portada | **Aceptado** el 25 de noviembre de 2026: portada privada en Storage para metas y planes, las dos en MVP-2. Enmienda la 24.13 solo en que ADR-014 deja de ser solo de metas |
| 27.3 | ADR-015, planes y etiqueta de gastos | **Aceptado** el 25 de noviembre de 2026 |
| 27.4 | Gasto compartido pagado con una meta compartida, dentro de un plan (Q24, opción A) | La parte cubierta con la meta aparece en «Quién pagó» como una línea propia, «Pagado con la meta {meta}», que no se asigna a ninguno de los dos. El gasto cuenta completo en el total del plan y en el desglose por categoría (Q7). El «pagó» y el «le corresponde» de un plan son **cifras derivadas propias del plan** (ADR-015 §4), no `gross_paid` ni las asignaciones guardadas: descuentan la parte cubierta con la meta, solo con usos aplicados, y reparten lo que queda con la proporción de las asignaciones originales (confirmado por los fundadores el 25 de noviembre de 2026). Se recalculan cuando cambia el uso de la meta. Quedan intactos `gross_paid` (§5.1), las asignaciones originales, `net_owed`, Balance, que sigue siendo el único saldo real, y ADR-010. La «Diferencia en este plan» es informativa y puede no coincidir con Balance |
| 27.5 | Comps de Planes y total en Yo | **Comps aprobados** el 25 de noviembre de 2026: «Juntia DS v1 - 10a Planes 06-1-06-4» y «10b Planes 06-5-06-9», del proyecto de Claude Design `caabf357-a0df-4048-886f-8c46c8979c5a`, con los tres ajustes obligatorios hechos: la foto hasta 15 MB, las variantes de eliminar con 13 y 12 gastos, y la línea de Q24 en 06·3h. **Decisión visual:** en Yo, la tarjeta de un plan de la pareja muestra el total compartido, el mismo que ven los dos, y nunca suma los privados de quien mira (Q6, Q9). El detalle y las `[V]` que siguen abiertas están en `specs/006-planes/design-comps.md` |

#### Decisión 28: planificación financiera integral, hoja de ruta posterior a MVP-1 y una spec en implementación y otra en documentación

Los fundadores propusieron el 25 de noviembre de 2026 llevar Juntia a una planificación financiera integral, en cuatro bloques provisionales A–D (`docs/propuestas/planificacion-financiera-integral.md`, PR #97). El gestor la analizó en `docs/propuestas/analisis-planificacion-financiera.md` (PR #98, mergeado el 25 de noviembre de 2026 tras la revisión adversarial, con los hallazgos F98-1 a F98-14 cerrados). Los fundadores respondieron ese mismo día las preguntas Q1–Q19 del análisis (§9) y la regla de N-8 (§8.4 y §12). Alejandro las comunicó al gestor en nombre de los dos. **Esta decisión las registra**: dejan de ser «respuestas propuestas» con el merge del PR de la decisión 28 (#99).

El análisis **no es autoridad**: esta decisión lo cita para el detalle y no lo copia. Si el análisis y esta decisión difieren, manda esta decisión. La propuesta original no se modifica: es el registro de lo que pidieron los fundadores.

| # | Tema | Elección |
| --- | --- | --- |
| 28.1 | Respuestas Q1–Q19 | **Se aceptan tal como figuran en el análisis, §9**, con sus precisiones (Q7, Q8, Q9, Q12, Q13 y Q15) y las tres preguntas añadidas en la revisión (Q17 a Q19). Las filas 28.2 a 28.17 las resumen; el texto completo, la «Q8 revisada» y el procedimiento de evidencia de Q15 están en el análisis |
| 28.2 | Alcance de MVP-2 (Q1; N-1) | **Planes + Recurrentes y calendario + Presupuesto integral v1.** El resto se desarrolla de forma progresiva, sin límites artificiales que impidan avanzar si las entregas terminan antes. Enmienda §11, «MVP-2» (nota allí) |
| 28.3 | Hoja de ruta posterior a MVP-1 (Q3) | **Planes → Recurrentes y calendario → Presupuesto integral v1 (sin liquidez) → Créditos y deudas → Cuentas, activos y patrimonio → Flujo y liquidez → Proyecciones y escenarios.** Estadísticas y sugerencias es independiente y se prioriza según evidencia (Q4). Planes conserva su número y su nombre: es la spec 006. Los nombres de las specs nuevas posteriores son **provisionales** y **ninguna de ellas tiene número**: cada una lo recibe al abrirse, de una en una, según 28.18. Las etiquetas de letra del análisis (R, P1, D, K, P2, E, S) son solo de trabajo. La cadencia entre specs y los periodos de observación por riesgo son los del análisis §8.3. El objetivo de terminar 2026 con Planes y Recurrentes, y si se puede el Presupuesto integral v1, es **orientativo**: no es un compromiso de fecha ni autoriza a recortar alcance o calidad |
| 28.4 | Grupos de más de dos (Q2; N-2) | **Detrás de la hoja de ruta de 28.3.** Se mantiene la compatibilidad de la arquitectura con N miembros (§15.5), sin construir ahora su experiencia. El resto de MVP-3 no cambia. Enmienda §11, «MVP-3» (nota allí) |
| 28.5 | Planes (Q5) | **Primera y sin cambios.** La decisión 27 y la spec 006 quedan intactas |
| 28.6 | Recurrentes, presets y aportes programados (Q4, Q17) | Las recurrencias (backlog, fila 3) y los aportes programados como recurrencia de tipo «aporte a meta» (fila 7) van en la spec de **Recurrentes y calendario**. Los **presets de captura** (fila 4) van en la misma spec como **concepto distinto**: un preset es una plantilla para anotar rápido y no genera obligaciones, movimientos previstos ni compromisos de presupuesto. La separación conceptual está decidida. Se evalúa reutilizar componentes y lógica **sin imponer una entidad común**: si comparten tabla o entidad lo decide el Plan de esa spec. También **se evalúa separarlos en PR independientes** dentro de la misma spec, con una condición obligatoria: los presets no retrasan innecesariamente el núcleo de recurrencias. Las estadísticas (fila 5) y DEC-R01-S (fila 6) van a la spec de estadísticas y sugerencias |
| 28.7 | Forma del presupuesto integral y su nombre (Q6, Q19) | **Capa nueva.** Los presupuestos por categoría (ADR-004, 22.7 y 22.8) y sus métricas quedan intactos. Se evita «plan del mes». Preferencia inicial: **«Distribución mensual»**, **sin cerrar**: el nombre se evalúa en la spec y los comps, en Yo y en Nosotros, y entra en `docs/GLOSSARY.md` solo cuando se apruebe |
| 28.8 | Dónde vive lo nuevo y los avisos (Q10, Q11) | Recurrentes y el presupuesto integral, como **rutas hijas de Plan**, igual que Análisis (22.5); la navegación de §15.3 no gana destinos. La de patrimonio se evalúa con comps en su spec. Los avisos, **solo dentro de la app**, inicialmente |
| 28.9 | Ingreso compartido (Q7) | **Privado en v1** (§7.3 no cambia). El ingreso externo lo registra solo quien lo recibe, por lo recibido; se distingue la participación económica del dinero efectivamente recibido, sin ingresos ficticios por repartos no ejecutados. Garantías (F98-8; análisis §7.1):<br>- una transferencia interna ya ejecutada entre los dos **no es un segundo ingreso económico**. Ejemplo ficticio: llega un arriendo de $1.000.000 a la cuenta de A, que A registra; si A le pasa $500.000 a B, B no los registra como ingreso;<br>- **v1 no representa bien esa transferencia**, ni como salida de A ni como entrada de B: es una limitación conocida;<br>- en Nosotros, que no haya ingresos compartidos registrados **no equivale a cero**: se dice que no hay ninguno registrado, como `null` ≠ 0 en DEC-R01;<br>- **ADR-f** (transferencias y saldos) y **ADR-j** (ingreso compartido) siguen pendientes; el ingreso compartido se revisa antes de la spec de cuentas, activos y patrimonio |
| 28.10 | Cuota inicial y cuota del crédito antes de deudas y patrimonio (Q8) | **(a) Por defecto, un gasto real al pagar; (b) con reserva previa real, el gasto financiado con meta** que ya existe (ADR-010), con sus aprobaciones y reversiones. **Nunca se registra una cuota ya pagada a un tercero como un mero aporte a una meta**; los aportes previos para reservar el dinero antes del pago sí se permiten (opción (b), ADR-010 y los aportes programados de 28.6). No se exige crear una meta. La cuota del crédito es un gasto real rotulado «sin desglosar», con las cuatro condiciones del análisis §9. Limitación aceptada: estos pagos entran en `gasto_consumo`, y su efecto sobre `total_destinado_neto` sale solo de DEC-G04. Vincular o reclasificar los históricos es una posibilidad que se evalúa, **no una migración garantizada** |
| 28.11 | Privacidad (Q9) | **Privado por defecto, sin «total del hogar».** Cada elemento se comparte explícitamente cuando su spec lo soporte. Los agregados y los escenarios compartidos usan solo lo compartido. Los escenarios privados pueden usar lo propio y lo compartido a lo que su dueño tenga acceso, sin exponer resultados privados (análisis §7.2) |
| 28.12 | Proyecciones (Q12) | **Simulaciones deterministas con supuestos visibles**, nunca predicciones. Las integrales van en la spec de proyecciones y escenarios. El simulador de amortización de un crédito puede ir en la spec de créditos y deudas cuando su ADR esté aceptado. La 22.9 sigue rigiendo el Análisis |
| 28.13 | Tope E2E (Q13) | **Se mantiene** para Recurrentes y el presupuesto integral (ADR-011 §3; spec 006, Q20). Se revisa antes de créditos y deudas y de cuentas y patrimonio. El tope no impide probar los invariantes en su capa |
| 28.14 | Crédito v1 (Q14) | COP, tasa fija, cuota fija, método francés, componentes separados y abonos con reducción de plazo o de cuota. **Fuera por ahora:** UVR, tasa variable y tarjetas |
| 28.15 | Evidencia de amortización (Q15) | **Dos clases que no se mezclan:** casos sintéticos reproducibles en el repositorio y contraste con referencias bancarias reales **fuera** del repositorio, del que solo entra el resultado, sin datos (análisis §9, «Procedimiento de evidencia») |
| 28.16 | Desactualización (Q16) | Umbrales por tipo de dato, visibles y calibrables con evidencia de uso |
| 28.17 | Documentación de Recurrentes durante el gate (Q18) | **Sí, solo documentación**: spec, ADR propuestos y diseño. Sin implementación, migraciones ni despliegues. Solo después de los cuatro prerrequisitos de 28.19 |
| 28.18 | Una spec en implementación y otra en documentación activa (N-8; análisis §8.4 y §12) | **Como máximo una spec en implementación y una spec en documentación activa a la vez**, con diez condiciones:<br>1. nunca se implementan dos specs funcionales a la vez;<br>2. nunca hay dos specs nuevas en documentación activa a la vez;<br>3. la documentación de la siguiente puede adelantarse cuando la anterior está en implementación o bloqueada por un gate externo;<br>4. la spec prioritaria conserva la precedencia: si vuelve a documentación, se pausa la de la siguiente;<br>5. cada spec conserva sus propios gates de Specify, Clarify, Plan, Tasks e Implementation (ADR-012 §3.1);<br>6. ninguna spec empieza su implementación hasta que sus dependencias y la spec anterior estén aceptadas;<br>7. las decisiones, ADR y diseños de una spec posterior no modifican unilateralmente los contratos de la anterior;<br>8. el trabajo en paralelo va en ramas y worktrees independientes (`AGENTS.md` 14b);<br>9. el trabajo documental no provoca despliegues de producción, no altera el candidato de MVP-1 ni interfiere con su gate;<br>10. el gate de siete días de MVP-1 sigue intacto (24.10, 25.5). **Enmienda del 25 de noviembre de 2026** (decisión 30.9): el gate de MVP-1 sigue intacto salvo la excepción acotada a C-1–C-7 (30.2); la aceptación técnica conserva todas sus verificaciones, y la validación de siete días se conserva, aplazada (30.6), con la 25.5 aplicada a su periodo.<br>**Regla operativa:** la documentación de una spec está **activa** (se escribe, se revisa y sus PR avanzan) o **pausada** (su PR queda en borrador, sin commits ni revisiones, y conserva los gates ya mergeados); solo la activa cuenta para el límite. Secuencia: durante el gate, Planes está bloqueada por un gate externo y Recurrentes puede tener la documentación activa; al declarar MVP-1, Planes vuelve a documentación activa (Plan y Tasks) y Recurrentes se **pausa**; cuando se mergea el PR de Tasks de Planes, Recurrentes se reanuda; Recurrentes no se implementa hasta que Planes esté aceptada. **Los gates siguen siendo independientes:** cada uno es el merge de un PR documental de una sola spec, y pausar una spec no deshace ni salta ninguno de los suyos. Sustituye, en este punto, la regla de «una especificación a la vez» de la propuesta §6 |
| 28.19 | Prerrequisitos para ejercer 28.18 (F98-14; análisis §8.4) | **Ninguna spec empieza su documentación en paralelo con otra hasta que se cumplan los cuatro:**<br>1. esta decisión está registrada en §15.10;<br>2. la reconciliación normativa está **fusionada**: la nota del 25 de noviembre de 2026 de ADR-012 (§3.1 y su `[V]` 4), `AGENTS.md` 14b y `docs/BACKLOG_MVP2.md`, que van en el mismo PR que esta decisión. El resto de documentos de la tabla de reconciliación del análisis §8.4 no cambia;<br>3. está **verificado** cómo selecciona Spec Kit la spec activa y que los worktrees quedan aislados entre sí (ADR-012, `[V]` 4);<br>4. se cumplen las condiciones previas de Q18.<br>Los prerrequisitos 1 y 2 se cumplen con el merge de este PR. **Esta decisión no da por verificados el 3 ni el 4**: cada uno necesita su propia evidencia, registrada antes de abrir la documentación de Recurrentes |

**Lo que esta decisión no autoriza.** Ni código, ni migraciones, ni despliegues durante el gate de MVP-1 (spec 005; decisión 25.5), ni rebajar ningún criterio de aceptación, verificación humana o revisión adversarial. No abre ninguna spec, no asigna números y no escribe ningún ADR: los candidatos ADR-a a ADR-j del análisis §6 se escriben y se aceptan antes de la etapa Plan de la spec que los necesita (`AGENTS.md` 17). No cambia la spec 006 ni el alcance de MVP-1.

**Lo que no cambia.** DEC-R01 (presupuesto opcional, `null` ≠ 0), DEC-R17 (nunca «te alcanza», «puedes pagarlo» ni «es financieramente seguro» sin datos suficientes y una política de inferencia explícita). La restricción es sobre la **disponibilidad financiera o liquidez inferida**: ninguna spec presenta dinero como disponible en caja o en cuenta sin esa información y esa política, y tener cuentas con fecha de actualización es un prerrequisito que por sí solo no demuestra liquidez. No afecta al disponible presupuestario (lo que queda de un presupuesto, que DEC-R17 ya distingue del dinero bancario) ni a «Tu disponible» de una meta, que son los fondos registrados y no consumidos de su ledger (23.4). Siguen también DEC-G04 (`total_destinado_neto` nunca es «Total gastado» ni la cifra héroe, y el «total asignado» del presupuesto integral es otra cifra), las 22.8 y 22.9, la navegación de §15.3 y el contrato de ingreso privado de §7.3. Donde una spec posterior necesite ampliarlas, lo hace con el ADR que corresponda (análisis §3 y §6), no con esta decisión.

#### Decisión 29: Recurrentes y calendario, Clarify de la spec 007

Los fundadores respondieron el 25 de noviembre de 2026 las preguntas Q1–Q19 de la especificación 007 (`specs/007-recurrentes-calendario/spec.md`, «Clarifications», Session 2026-11-25), y ese mismo día confirmaron las siete decisiones D1–D7 que dejó la revisión adversarial del PR de la spec. El gestor transmitió su texto a la sesión de la spec. El PR de la spec (#101) se mergeó el 25 de noviembre de 2026 (`a2204ef`), tras cuatro rondas de revisión adversarial que cerraron F101-1 a F101-20, con GO definitivo y una precisión no bloqueante, F101-21, delegada a ADR-a (29.7). La spec se abrió con la documentación de Recurrentes autorizada durante el gate (28.17 a 28.19). **Esta decisión las registra.** La fila 29.11, añadida el 25 de noviembre de 2026 en el PR de reconciliación, registra además la aceptación de ADR-016 (ADR-a) y las decisiones P1–P7 de los fundadores. La fila 29.12, añadida el 26 de noviembre de 2026 de la misma forma, registra la aceptación de ADR-017 (ADR-b) y sus decisiones P1–P3. La fila 29.13, añadida el 26 de noviembre de 2026 de la misma forma, registra la aceptación de ADR-018 (ADR-d) y sus decisiones P1 y P2, y cierra la 29.8. La fila 29.14, añadida el 26 de noviembre de 2026 en un PR documental, registra la evaluación visual de los comps que hicieron los dos fundadores ese día: aprueba los comps, cierra Q15 en (b) y responde C-1 a C-8. La spec es la fuente del detalle: esta decisión la cita y no la copia. Si las dos difieren, manda esta decisión (`AGENTS.md` §2) y la spec se corrige. **Nada de esto se implementa antes de declarar MVP-1** (spec 005) **ni antes de que Planes (spec 006) esté aceptada** (28.18, condición 6).

| # | Tema | Elección |
| --- | --- | --- |
| 29.1 | Respuestas Q1–Q19 | **Se aceptan las recomendaciones de la etapa Specify salvo Q4, Q6 y Q15, que cambian**, con precisiones en Q7, Q12, Q13, Q17 y Q18. El texto completo está en la tabla de la Session 2026-11-25 y en «Precisiones de los fundadores»; si difieren de la recomendación original («Contexto y opciones de cada pregunta»), manda la tabla. Además: no se reabre ninguna decisión anterior y no se incorpora nada del Presupuesto integral, Créditos, Patrimonio ni Flujo y liquidez. Las filas 29.2 a 29.4 recogen los tres cambios; esta fila no copia el resto |
| 29.2 | Confirmar y vincular (Q4, cambia) | **Confirmar: (c).** Un importe fijo se confirma en un toque con los datos de la versión de la instancia (F101-6), con la opción de abrir Anotar antes de guardar; un importe estimado o en rango va a Anotar. En ingresos, el toque único exige además certeza fija. Los ingresos condicionales, aunque su importe previsto sea conocido, y los de importe desconocido abren Anotar y exigen indicar el importe efectivamente recibido (F101-17; FR-012 y FR-021). **Vincular: (b).** Sugerido y confirmado por la persona, más búsqueda manual; nunca automático y solo con movimientos compatibles (F101-1). Las precisiones (ingresos, Gasto con meta y ADR-010, fecha prevista frente a fecha efectiva) están en la spec |
| 29.3 | Editar una recurrencia (Q6, cambia a (c)) | **La edición cambia solo las instancias futuras sin resolver** (previstas). Las pendientes conservan los datos y la versión que les correspondían; las confirmadas, omitidas y canceladas no cambian. ADR-a resuelve la identidad estable de las instancias y que una edición de frecuencia o fecha no genere duplicados. **Resuelto por ADR-016 (29.11):** una posición por periodo; dentro de una recurrencia se editan los datos, el día dentro de su periodo, N y la fecha final, y cambiar la unidad, el intervalo o el origen es el flujo «Cambiar frecuencia» (P2). **Excepción a esta fila, aprobada expresamente por los fundadores (P7):** una instancia cuya fecha y versión quedaron fijadas por una omisión las conserva para siempre, también si la omisión se deshace y aunque vuelva a estar prevista, y las ediciones posteriores no la cambian |
| 29.4 | Cifras de lo previsto (Q15) · ADR-b | **Cerrada en (b) el 26 de noviembre de 2026 (29.14):** «Q15(b): sí al total mensual de gastos previstos», con la variante **b2** de los comps (P-2): los importes fijos y los estimados por separado. Es un total mensual de **gastos previstos**, separado de ingresos y aportes programados y con un rótulo que dice exactamente qué incluye. Las condiciones están en la spec (precisión de Q15; FR-045 a FR-047). El tratamiento de estimados, rangos, estados y privacidad está en ADR-017 (29.12); con este cierre **entran en vigor P1(a), P2(a) y P3(a)**, sin cambiar el ADR. Registro original del 25 de noviembre de 2026: la fila quedó abierta hasta los comps, explorando (b) con (a), sin totales, como respaldo. **Veto de DEC-R17**, en cualquier caso: el total de previstos **no es liquidez ni disponibilidad**, y nunca se calculan a partir de él excedentes, disponibilidad financiera, capacidad de pago ni previsto frente a real (decisión 28, «Lo que no cambia») |
| 29.5 | Precisiones Q7, Q12, Q13, Q17 y Q18 | **Registradas tal como figuran en la spec** («Precisiones de los fundadores»). La regla de la colisión quincenal de Q7, que aquí era una propuesta del redactor para ADR-a, **la decidieron los fundadores en P1 (29.11)**: el primer día va del 1 al 15 y el segundo del 16 al 31. La precisión de Q18 sobre finalizar a mano se completa con P3 (29.11) |
| 29.6 | D1–D7 de la revisión F101 | **Confirmadas**, con precisiones en D3, D4 y D5 (spec, «Precisiones de la revisión F101», y la tabla «Estados y transiciones»):<br>- **D1** (F101-4), tal como se recomendó: la anulación **económica** del movimiento real devuelve la instancia a pendiente de resolución, con su fecha prevista y su versión, aunque su fecha no haya llegado;<br>- **D2** (F101-5), tal como se recomendó: confirmar o vincular antes de la fecha prevista solo si el hecho ya ocurrió (fecha efectiva hoy o anterior);<br>- **D3** (F101-8 i): se puede omitir anticipadamente una instancia futura con una acción explícita. Deshacer se rige por la precedencia de ADR-016 §6.4 (FR-017), conservando la fecha y la versión históricas (P7, 29.11);<br>- **D4** (F101-8 ii). **Precisión:** deshacer una omisión no reactiva una recurrencia finalizada a mano ni archivada, y lo cancelado sigue cancelado. Se distingue de la terminación automática, que conserva las obligaciones pendientes. Cuándo está disponible Deshacer se rige por la precedencia de ADR-016 §6.4 (FR-017);<br>- **D5** (F101-8 iv). **Precisiones:** pausar un compromiso de duración definida consume las posiciones del calendario original: las ocurrencias del periodo pausado no se generan, pero cuentan como posiciones del calendario original; la fecha final no se extiende y reanudar no las recupera; la pausa nunca cambia en silencio el número de ocurrencias; una ocurrencia consumida no equivale a una cuota pagada; omitir tampoco equivale a conservar una obligación pendiente; si la obligación sigue existiendo y no se ha pagado, se conserva como pendiente cuando corresponda; antes de pausar se explica el efecto sobre las próximas ocurrencias y la fecha final. ADR-016 resuelve la representación y la trazabilidad, sin amortización ni gestión de deuda: las posiciones consumidas no se materializan, y no hay recuperación manual excepcional en v1 (P4, 29.11);<br>- **D6** (F101-9), tal como se recomendó: eliminar con historia equivale a archivar la recurrencia y cancelar sus instancias sin resolver, tras ver y confirmar la lista;<br>- **D7** (F101-7), tal como se recomendó: la pausa automática de un aporte programado se dispara cuando la meta pasa **formalmente** a lograda o a archivada; llegar al 100 % no basta.<br>Los hallazgos F101-13 a F101-20 de las rondas 2 y 3 son correcciones directas de la spec, no decisiones: no reabren D1–D7 |
| 29.7 | Cuestiones para ADR-a, ADR-b y ADR-d | **Las fijan los ADR, no esta decisión.** La lista está en la spec: «Cuestiones que la tabla dejaba a ADR-a» (con la obligatoria de F101-19, también en FR-014a), FR-047 para ADR-b, y «Lo que hace falta para pasar a Plan», punto 3, para el alcance de los tres. **F101-21**, de la ronda 4 de la revisión, también iba a ADR-a: la precedencia de Deshacer una omisión cuando hubo varias pausas, con un caso de prueba con dos pausas, sin añadir estados ni transiciones a la tabla de la spec.<br>**Resueltas por ADR-016 (29.11):** todas las «Cuestiones que la tabla dejaba a ADR-a», incluidas F101-19 (P6) y F101-21 (ADR-016 §6.4), y la parte de la concurrencia entre confirmar un aporte y lograr o archivar la meta que toca a ADR-a (ADR-016 §10 y §14).<br>**Resuelto por ADR-017 (29.12):** lo que correspondía a ADR-b (FR-047).<br>**Resuelto por ADR-018 (29.13):** lo que correspondía a ADR-d, incluida su parte de esa concurrencia (F101-7, F101-16). Ninguna cuestión de esta fila queda pendiente, y la 29.8 queda cerrada (29.13) |
| 29.8 | Vincular un aporte histórico a una meta inactiva | **Cerrada el 26 de noviembre de 2026 por la 29.13:** sí, con P2(b) de ADR-018 (§6). Era una cuestión abierta, para ADR-d o para los fundadores: Si se puede vincular a una instancia un aporte histórico válido, registrado cuando la meta estaba activa, de una meta que ya no está activa. Crear o confirmar aportes nuevos en ella sigue prohibido (FR-034a; F101-16; 004, FR-040) |
| 29.9 | Nota para la etapa Plan | **No es un requisito nuevo.** La revisión sugiere una **prueba de equivalencia** para F101-2: un aporte manual de Ana y el mismo aporte confirmado desde su recurrencia privada son indistinguibles para Beto en vistas, exportación, errores y metadatos. Encaja en FR-092 y SC-003; el Plan decide su capa |
| 29.10 | Qué falta antes de Plan | Lo que la spec enumera en «Lo que hace falta para pasar a Plan». Los puntos 1, 2 y 4 están cumplidos: las respuestas, con esta decisión; D1–D7, el 25 de noviembre de 2026; y la revisión del PR #101, con su merge. ADR-a está hecho: ADR-016 aceptado (29.11). ADR-b está hecho: ADR-017 aceptado (29.12). ADR-d está hecho: ADR-018 aceptado (29.13). Con eso están aceptados los tres ADR. El punto 5 también está cumplido: el **prompt de diseño** de la spec (FR-082; PR #113) y los **comps** (PR #114), aprobados por los fundadores el 26 de noviembre de 2026, con el **cierre de Q15 en (b)** (29.14). Falta:<br>- los **gates** de 28.17 y 28.18: durante el gate de MVP-1 solo se adelanta documentación (spec, ADR propuestos y diseño), y la documentación de esta spec se pausa mientras Planes hace su Plan y sus Tasks.<br>**Ninguna implementación** antes de declarar MVP-1 y de que Planes esté aceptada: Planes conserva la precedencia (N-8; 28.18) |
| 29.11 | ADR-016 (ADR-a), recurrencias e instancias previstas, y las decisiones P1–P7 | **Aceptado** el 25 de noviembre de 2026 (PR #103, GO de la revisión adversarial F103). Los fundadores aprobaron ese día P1–P7 con las opciones recomendadas y estas precisiones:<br>- **P1**, quincenal: «días del 1 al 15 y del 16 al 31»;<br>- **P2**, qué se puede editar: «opción A, edición restringida y flujo atómico e idempotente de Cambiar frecuencia […], incluyendo la cancelación explícita de las pendientes que no se trasladan». Cambiar la unidad, el intervalo o el origen exige ese flujo;<br>- **P3**, previstas al finalizar a mano o eliminar con historia: «cancelación de todas las futuras en compromisos finitos y cese de generación en recurrencias sin fin»;<br>- **P4**: «sin recuperación manual excepcional en v1»;<br>- **P5**: «las pendientes legítimas que permanezcan o reaparezcan tras el archivo o la finalización siguen visibles y son resolubles sin reactivar la recurrencia. Esto no recupera las instancias canceladas durante la finalización»;<br>- **P6**, F101-19: «opción C, coexistencia». Se acepta expresamente el riesgo de duplicación semántica entre obligaciones independientes de distintos contextos, y la excepción contextual tras Deshacer Mover a Pareja (la instancia compartida vinculada al reemplazo vuelve a pendiente). No hay deduplicación entre contextos ni ningún aviso que revele programaciones privadas;<br>- **P7**, qué recupera Deshacer una omisión: «opción A». Una instancia conserva permanentemente la fecha y la versión fijadas, incluso después de deshacer una omisión y ante ediciones posteriores. **Es una excepción a Q6 (29.3), aprobada expresamente.**<br>La spec 007 está reconciliada con ellas («Session 2026-11-25 · ADR-016»). No se amplía el alcance, no se añaden mecanismos y no se inicia ninguna implementación. En el momento de aceptar ADR-016, Q15 (29.4) y la 29.8 seguían abiertas. ADR-b y ADR-d seguían pendientes (29.10). ADR-b se acepta en la 29.12 y ADR-d en la 29.13, que cierra la 29.8. Q15 se cierra en (b) en la 29.14. |
| 29.12 | ADR-017 (ADR-b), importes previstos y tratamiento del total de gastos previstos, y sus decisiones P1–P3 | **Aceptado** el 26 de noviembre de 2026 (PR #106, GO de la revisión adversarial F106). Fija los importes previstos (§1 y §2), que ninguna cifra mezcla lo previsto con lo real (§3) y el tratamiento del total **si Q15 se cierra en (b)** (§4 a §6). Los fundadores aprobaron ese día las opciones recomendadas:<br>- **P1(a)**: «el total mensual incluye exclusivamente los gastos previstos y pendientes de confirmar, incluidas las reaperturas por D1 y la excepción contextual de P6.»<br>- **P2(a)**: «en Yo se muestran únicamente los gastos privados previstos propios. Los gastos compartidos se muestran exclusivamente en Nosotros.»<br>- **P3(a)**: «el total se muestra únicamente en Recurrentes y su calendario. Inicio conserva las métricas reales y el aviso «Por confirmar», sin incorporar importes previstos.»<br>«Las tres decisiones quedan condicionadas a que Q15 se cierre en (b) tras revisar y aprobar los comps.» En ese momento **Q15 (29.4) seguía abierta**: «Si el total no puede comunicarse de manera clara, mantenemos (a), sin totales, como respaldo.» Se cerró en (b) el 26 de noviembre de 2026 (29.14), y con eso P1(a), P2(a) y P3(a) entraron en vigor. La spec 007 está reconciliada («Session 2026-11-26 · ADR-017»). No se reabría ADR-016, y en ese momento no se resolvían ADR-d ni la 29.8, que se resuelven después, en la 29.13. No se autorizan todavía el Plan ni la implementación; se mantienen la precedencia de Planes y las restricciones de N-8 (28.18) |
| 29.13 | ADR-018 (ADR-d), aportes programados, y sus decisiones P1 y P2 | **Aceptado** el 26 de noviembre de 2026 (PR #110, GO de la revisión adversarial F110). Fija la confirmación y la privacidad de los aportes programados, la pausa por meta inactiva (derivada de la historia de estados de la meta, sin que Metas toque recurrencias) y la concurrencia con lograr y archivar. ADR-010, los estados y transiciones de Metas y las funciones de MVP-1 no cambian. Los fundadores aprobaron ese día:<br>- **P1(a)**: «Los aportes programados tendrán exclusivamente un importe fijo. No se admiten rangos ni importes desconocidos. La aportante podrá modificar el importe efectivo mediante el borrador antes de confirmar, conforme a ADR-016.»<br>- **P2(b)**: «Se permite vincular un aporte histórico válido y no anulado a su instancia programada aunque la meta esté lograda o archivada, siempre que corresponda a la misma meta y a la misma aportante y cumpla todas las condiciones de ADR-016 §7.4.» «El vínculo no crea un aporte nuevo, no modifica saldos, no mueve fondos y no reactiva la meta ni la recurrencia.» «Crear o confirmar aportes nuevos en una meta inactiva sigue prohibido.»<br>**Cierra la 29.8** con P2(b). La spec 007 está reconciliada («Session 2026-11-26 · ADR-018»). ADR-016 y ADR-017 llevan notas fechadas que remiten a ADR-018 y a esta fila, sin cambiar sus decisiones: ADR-016 en su tabla de cuestiones delegadas, §6.2, §10, §11, §14, `[V]` P9, Consecuencias, «Decisiones de los fundadores» y su tabla de reconciliación; ADR-017 en §1, Consecuencias y «Decisiones de los fundadores». En ese momento Q15 (29.4) seguía abierta; se cerró en (b) en la 29.14. No se autorizan todavía el Plan ni la implementación; se mantienen la precedencia de Planes, los gates independientes y las restricciones de N-8 (28.18) |
| 29.14 | Comps de Recurrentes, Q15 y las cuestiones C-1 a C-8 | **Comps aprobados** el 26 de noviembre de 2026: «Juntia DS v1 - 11a Recurrentes 07-1-07-7» y «11b Recurrentes 07-8-07-15», del proyecto de Claude Design `caabf357-a0df-4048-886f-8c46c8979c5a`, con el GO de la revisión adversarial F114 (PR #114) y las capturas en `specs/007-recurrentes-calendario/comps/`. Los dos fundadores hicieron la evaluación visual ese día y el gestor transmitió su texto, que va literal debajo de esta tabla. Lo que decide:<br>- **Q15 se cierra en (b)** (29.4), con la variante **b2** (P-2): los importes fijos y los estimados por separado, una sola variante para todos y sin configuración. **Entran en vigor P1(a), P2(a) y P3(a) de ADR-017** (29.12), sin cambiar el ADR;<br>- **P-1 a P-14** quedan decididas. P-4 cierra **Q2**: los nombres propuestos se aprueban y entran en `docs/GLOSSARY.md`;<br>- **C-1 a C-8** quedan respondidas. C-1: Inicio lleva a Por confirmar, y desde Inicio no se confirma ni se muestran importes previstos. C-3: «Deshacer» durante 6 s solo después de confirmar, no después de vincular; es la anulación económica del movimiento creado, con el contrato que le corresponde (ADR-007; en aportes, ADR-010 y la 22.13), y la instancia vuelve a Por confirmar por D1. C-5: «7 de 24» como forma neutra. C-7: sin badge en la pestaña Plan. C-8: aviso previo con el número exacto, sin límite;<br>- **las `[V]` siguen abiertas**.<br>El detalle está en `specs/007-recurrentes-calendario/design-comps.md`, y la spec 007 está reconciliada («Session 2026-11-26 · Comps»). **Quedan para el Plan**, sin cambiar ADR-016 ni ADR-018: cómo cumple el Deshacer de C-3 las autorizaciones y la concurrencia de cada anulación; dónde se guarda el descarte de C-4 sin revelar programaciones privadas; y cómo se cuenta C-8 sin materializar instancias. Si alguna de las tres exigiera cambiar un contrato aceptado, irá a un ADR antes del Plan. No se autorizan el Plan, las Tasks ni la implementación; se mantienen la precedencia de MVP-1 y de Planes y las restricciones de N-8 (28.18) |

**Texto de los fundadores (29.14), literal:**

> Estamos de acuerdo con las recomendaciones, con las siguientes precisiones:
>
> Q15 y propuestas P-1 a P-14
>
> * Q15(b): sí al total mensual de gastos previstos.
> * P-2: b2, con los importes fijos y estimados separados. Una sola variante para todos, sin configuración adicional.
> * P-3: aprobamos el rótulo y la nota.
> * P-4 / Q2: aprobamos los nombres propuestos.
> * P-5: importe desconocido, nunca $0.
> * P-6: lista ancha con panel en escritorio.
> * P-7 a P-11: aprobados tal como están en los comps.
> * P-12: variante base, mantener Metas intacta.
> * P-13: importe vacío con el rango como ayuda.
> * P-14: Deshacer durante 6 segundos, conforme a C-3.
>
> C-1 a C-8
>
> * C-1: Inicio lleva a Por confirmar. No se confirma directamente desde Inicio ni se muestran allí importes previstos.
> * C-2: mantener «Por confirmar» como estado y «sin confirmar» en el rótulo del total.
> * C-3: Deshacer durante 6 segundos después de confirmar, no después de vincular. Debe contemplar gastos, ingresos y aportes, respetando el contrato de anulación correspondiente, las autorizaciones y la concurrencia. La instancia vuelve a Por confirmar conforme a D1. No se elimina la auditoría ni se amplían permisos.
> * C-4: descarte individual hasta que otra instancia autorizada del contexto correspondiente pase a Por confirmar. No puede revelar indirectamente programaciones privadas de la otra persona.
> * C-5: «7 de 24» como forma neutra.
> * C-6: mantener Metas intacta.
> * C-7: descartamos el badge en la pestaña Plan.
> * C-8: aviso previo con el número exacto de instancias pendientes, sin límite funcional arbitrario. Se conserva el modelo de cálculo de ADR-016, sin crear movimientos reales ni materializar instancias innecesariamente.
>
> Mantener abiertas todas las verificaciones [V].
>
> Registrar las decisiones en un PR exclusivamente documental, reconciliando la spec, el maestro, GLOSSARY, design-comps y los demás documentos que corresponda. No modificar ADR aceptados fuera de su procedimiento.
>
> No iniciar Plan, Tasks ni implementación. Se mantiene la precedencia de MVP-1, Planes y N-8.
>
> Enviar el nuevo PR a revisión adversarial independiente antes de fusionarlo.

**Lo que esta decisión no autoriza.** Ni código, ni migraciones, ni despliegues (28.17; decisión 25.5). La decisión 29, en su registro original de Clarify, no aceptaba ningún ADR. La ampliación 29.11 registra la aceptación de ADR-016 y las decisiones P1–P7. La ampliación 29.12 registra la aceptación de ADR-017 y sus decisiones P1–P3, **condicionadas a que Q15 se cierre en (b)**. La ampliación 29.13 registra la aceptación de ADR-018 y sus decisiones P1 y P2, y cierra la 29.8. Ninguna de las tres cerraba Q15. La ampliación 29.14 registra la aprobación de los comps: cierra Q15 en (b), con lo que entran en vigor P1–P3 de ADR-017, decide P-1 a P-14 y responde C-1 a C-8; los nombres aprobados entran en `docs/GLOSSARY.md` (Q2). Ninguna de las cuatro autoriza el Plan, las Tasks ni la implementación, cambia un ADR aceptado o cierra una verificación `[V]`, y no convierten en decisión ninguna otra propuesta pendiente.

**Lo que no cambia.** Todo lo de la decisión 28, «Lo que no cambia», en especial DEC-R17 y DEC-R01. Tampoco la spec 006 ni la decisión 27, ni ADR-001, ADR-003, ADR-010 y ADR-015, ni los estados de Metas (spec 007, «Assumptions»), ni la navegación de §15.3: Recurrentes es una ruta hija de Plan (28.8).

#### Decisión 30: cierre de MVP-1, corrección de C-1 a C-7 y aceptación técnica separada de la validación por uso real

Los fundadores la tomaron el 25 de noviembre de 2026 sobre el informe de la **corrida completa de MVP-1** que **delegaron en un agente**: dos cuentas ficticias que forman pareja, Ana y Beto, en `juntia-dev` y con datos ficticios (`specs/005-gate-mvp-1/corrida-completa.md`, **PR #104**, mergeado en `ea18bce` con GO definitivo de la revisión adversarial). La corrida dio 143 filas: 120 PASS, 7 FAIL, 4 BLOQUEADO y 12 NO PROBADO. No detectó errores aritméticos ni fugas de datos privados en lo comprobado. Los siete FAIL son los defectos de presentación o copy **C-1 a C-7**, y además dejó las sugerencias **S-1 a S-8**. El gestor transmitió el texto de los fundadores, que se reproduce literalmente:

> Decisiones de los fundadores — cierre de MVP-1:
>
> 1. Defectos C-1 a C-7
>
> Autorizamos corregir los siete defectos antes de declarar MVP-1, mediante una excepción expresa y acotada a la congelación actual.
> - C-1: si cambia la dirección de la deuda, no mostrar el saldo anterior tachado bajo la dirección nueva.
> - C-2: Inicio en Yo conserva el consumo personal completo (privados más la parte compartida). Actividad en Yo conserva exclusivamente los movimientos privados y su encabezado debe identificar inequívocamente que muestra gastos privados. No se modifican cálculos, consultas, permisos ni filtros para resolver esta inconsistencia.
> - C-3: el estado mostrado debe reflejar la financiación efectivamente aplicada, conservando el historial autorizado de solicitudes.
> - C-4 y C-5: corregir los textos.
> - C-6: mostrar inequívocamente que la solicitud fue cancelada.
> - C-7: no presentar una aprobación sin fondos suficientes como viable. Mostrar el mensaje específico establecido en la spec y mantener intactas las validaciones del servidor.
> S-1 a S-8 quedan registrados como pendientes de valoración futura. No forman parte de esta autorización.
>
> 2. Modificación del gate de MVP-1
>
> Separamos la aceptación técnica de MVP-1 de la validación mediante siete días consecutivos de uso real.
>
> El periodo de uso real se aplaza hasta disponer de Planes y las funcionalidades de planificación financiera que los fundadores necesitan para utilizar Juntia con sus propios datos. No se elimina dicha validación: su nuevo momento de ejecución deberá quedar registrado explícitamente.
>
> Se mantienen las demás verificaciones técnicas, de dispositivo, accesibilidad, seguridad, privacidad, restauración y aprobación humana.
>
> 3. Procedimiento
>
> Prepara primero un PR exclusivamente documental que registre estas decisiones y reconcilie todas las referencias normativas afectadas, incluidas 24.10, 25.5 y 28.18.
>
> No comenzar las correcciones de código hasta que ese PR haya sido revisado, aprobado y fusionado.
>
> Después, preparar un PR acotado a C-1–C-7, con pruebas de regresión específicas y nueva evidencia. No ampliar el alcance, introducir funcionalidades adicionales, alterar las fórmulas financieras ni modificar el modelo de datos sin autorización expresa.
>
> El informe del PR #104 se conserva como evidencia histórica de la corrida original. No se reescriben sus FAIL como si nunca hubieran ocurrido.
>
> Mantener la precedencia de Planes, los gates independientes y las restricciones de N-8.

**Esta decisión los registra.** Si el texto literal y una fila difieren, manda el texto literal. Las filas 30.6 y 30.7 nacieron como **propuestas `[P]` del redactor** para los puntos que el texto dejaba abiertos. Los fundadores las **decidieron el 26 de noviembre de 2026**, con el texto literal que figura debajo de la tabla, en «Decisiones de los fundadores del 26 de noviembre de 2026 (30.6, 30.7 y FR-013)». Las dos filas dicen qué regía mientras eran propuestas, pero esa regla ya no aplica.

| # | Tema | Elección |
| --- | --- | --- |
| 30.1 | Informe del PR #104 | **Evidencia histórica de la corrida original.** Se conserva tal cual: sus FAIL no se reescriben ni se marcan como superados. La corrección de C-1 a C-7 se acredita con **evidencia nueva**, aparte, en el PR de 30.2. El informe decía que el registro del cambio del gate «queda pendiente en el maestro»: lo cumple esta decisión, sin editar el informe |
| 30.2 | Excepción a la congelación | **Expresa y acotada a siete correcciones de presentación y copy, C-1 a C-7.** La congelación vigente durante el gate de MVP-1 es: ni código, ni migraciones, ni despliegues (decisiones 28 y 29, «Lo que esta decisión no autoriza»; informe del PR #104, «Qué es»). La excepción cubre:<br>- **un PR de código acotado a C-1–C-7**, con pruebas de regresión específicas de cada defecto y evidencia nueva;<br>- **los pasos 4 a 6 del plan de la 005, sin cambios, sobre el candidato que incluye ese PR.** El paso 4 se ejecuta completo.<br>**Regla de parada:** si una corrección exige cambiar una consulta financiera, un permiso o una validación del servidor, la sesión se detiene y pide autorización expresa a los fundadores antes de seguir.<br>**No cubre**, en ninguna de las siete correcciones: migraciones ni cambios del modelo de datos; cambios de fórmulas financieras; cambios de cálculos, consultas, permisos, filtros ni validaciones del servidor (el texto literal los nombra en C-2 y C-7, y la prohibición vale para todas); funcionalidades nuevas; ni S-1 a S-8. Ampliarla exige una autorización expresa de los fundadores, registrada aquí. Fuera de ella, la congelación sigue igual. No se confunde con la congelación de despliegues del periodo de uso real (25.5), que es otra regla |
| 30.3 | Criterio de cada corrección | El del texto literal, defecto por defecto. El «Esperado» y las capturas de cada uno están en el informe del PR #104, «Hallazgos (FAIL)»:<br>- **C-1:** si cambia la dirección de la deuda, no se muestra el saldo anterior tachado bajo la dirección nueva;<br>- **C-2:** Inicio en Yo conserva el consumo personal completo (privados más la parte compartida; 003 FR-045). Actividad en Yo muestra **solo los movimientos privados**, y su encabezado dice inequívocamente que son gastos privados. Se corrige solo la presentación: no cambian los cálculos, las consultas, los permisos ni los filtros;<br>- **C-3:** el estado que se muestra refleja la financiación **efectivamente aplicada**, y se conserva el historial autorizado de solicitudes;<br>- **C-4 y C-5:** se corrigen los textos;<br>- **C-6:** se muestra inequívocamente que la solicitud fue cancelada;<br>- **C-7:** una aprobación sin fondos suficientes no se presenta como viable. Se muestra el mensaje específico de la spec: «Tus aportes cambiaron: ahora tienes $X en {meta}» (004, US7, escenario 9). Las validaciones del servidor quedan intactas |
| 30.4 | Orden | **Primero este PR documental**, revisado, aprobado y fusionado. **Después**, el PR de código de 30.2. Ninguna corrección de código empieza antes de ese merge |
| 30.5 | Dos hitos separados | **Aceptación técnica de MVP-1.** Es lo que significa, desde esta decisión, **«declarar MVP-1»** y «MVP-1 declarado», en este maestro, en las decisiones 27 a 29 y en las specs 005, 006 y 007. Requiere:<br>- C-1 a C-7 corregidos en el PR de 30.2, con sus regresiones y evidencia nueva;<br>- el CI sobre el commit candidato (005, paso 4);<br>- **todas las demás verificaciones de la spec 005, sin rebajar ninguna:** técnicas, de dispositivo, de accesibilidad, de seguridad, de privacidad, de restauración y de aprobación humana. Eso incluye la entrada al gate (FR-001, con 004-T084 y T085), el inventario de FR-002 sin filas abiertas, S1–S5 aprobadas por los dos (SC-010), el humo de release, las verificaciones V1 a V12 y V15, la **restauración real** de la 24.9 (FR-061, V14), los registros de Vercel de **una semana de uso** en producción con actividad representativa (FR-013; detalle abajo, «FR-013 en la aceptación técnica»), la tabla de idempotencia (FR-068), la checklist de release firmada (FR-069) y la aprobación de los dos sin fallos críticos abiertos (FR-082);<br>- el PR documental de declaración (005-T109).<br>Las verificaciones que la 005 hacía al final del periodo de uso (V14, FR-013 y FR-068) se hacen antes de declarar, después del paso 6. La tabla SC-001 a SC-012 de la 005 conserva **SC-011** visible con el estado «Pendiente · validación por uso real (30.6)»: no es una excepción ni una prueba superada, solo cambia su momento, y queda fuera de lo que debe estar superado para declarar. FR-002 y SC-003 siguen sin filas abiertas.<br>**Validación por uso real de MVP-1.** Son los **7 días consecutivos de uso diario real** de la 24.10, con sus reglas: al menos un fin de semana y una liquidación (005, V13); despliegues de producción congelados durante los 7 días y reinicio del periodo ante un fallo crítico (25.5); la valoración por separado de cada fundador en los cuatro ejes, con las tres preguntas de §6.7 (FR-081, SC-011), que la 005 sitúa **tras** el periodo; y la lista de MVP-2 de los fallos no críticos que salgan de ese uso (FR-083). **No se elimina: se aplaza** (30.6). No bloquea la aceptación técnica, y por tanto tampoco la implementación de Planes (27; 28.18) |
| 30.6 | Cuándo se hace la validación por uso real | **Decidida el 26 de noviembre de 2026** (texto literal abajo). Los siete días consecutivos de validación por uso real **empiezan cuando Planes (006), Recurrentes y calendario (007) y el Presupuesto integral v1 estén aceptados y en producción**. Se mantienen las condiciones de la 24.10 y la 25.5: la congelación de despliegues durante el periodo, el reinicio ante un fallo crítico y la valoración individual de los dos fundadores. El gestor abre el periodo (005-T094) cuando se cumple la condición, y el resultado se registra en esta sección. **Precondición de T094** (30.7): antes de abrir el periodo, los dos ejecutan el escenario humano completo de §4 (005, V13, «Antes del periodo»). La congelación, los fallos críticos y el reinicio de los 7 días siguen la 25.5 y no se confunden con la excepción de 30.2. El PR de declaración (005-T109) deja escrito que la validación por uso real sigue pendiente, con esta condición de inicio. *Constancia:* mientras fue propuesta `[P]`, regía que la validación quedaba pendiente con el momento abierto, sin darla por hecha ni por innecesaria; también se presentó como alternativa un conjunto menor (Planes y Recurrentes), que los fundadores no eligieron |
| 30.7 | La corrida delegada y el escenario de §4 (FR-080) | **Decidida el 26 de noviembre de 2026** (texto literal abajo). **Exclusivamente para la aceptación técnica de MVP-1**, la sesión guiada de FR-080 (005-T092) **se sustituye** por la corrida delegada del PR #104 y la nueva evidencia de las correcciones C-1–C-7. Los fundadores aceptan expresamente las diferencias de cobertura documentadas en la tabla «Diferencias de la corrida delegada (30.7)», abajo. **El escenario humano completo** se ejecuta antes de iniciar los siete días de validación por uso real, **como precondición de T094**. La sustitución **no acredita anticipadamente ninguna otra verificación humana ni de dispositivo**, y no sustituye SC-012 de las specs 002–004, 004-T084 (que sigue exigiendo una salida humana con cuentas reales como condición de entrada al gate, FR-001), SC-010, FR-082 ni las demás verificaciones pendientes. *Constancia:* mientras fue propuesta `[P]`, regía que FR-080 seguía exigiendo la sesión guiada de los dos (005-T092) para la aceptación técnica |
| 30.8 | S-1 a S-8 | **Pendientes de valoración futura**, registradas en `docs/BACKLOG_MVP2.md`. No están autorizadas ni forman parte de la excepción de 30.2. S-6 es el F02 ya registrado (24.4), no un hallazgo nuevo |
| 30.9 | Lo que se mantiene de N-8 | La precedencia de Planes (28.5; 28.18, condiciones 4 y 6), los gates independientes de cada spec (28.18, condición 5, y su regla operativa) y las demás restricciones de N-8 (28.18 y 28.19). La **condición 10** de la 28.18 queda así: el gate de MVP-1 sigue intacto salvo la excepción de 30.2. La aceptación técnica conserva todas sus verificaciones, y la validación de siete días se conserva, aplazada (30.6), con la 25.5 aplicada a su periodo. Enmienda la 24.10, la 25.5 y la condición 10 de la 28.18 (notas allí) |

**Decisiones de los fundadores del 26 de noviembre de 2026 (30.6, 30.7 y FR-013).** Respondieron a las propuestas 30.6 y 30.7 y a FR-013 después del GO de la revisión adversarial del PR #107 (`b348862`). El gestor transmitió su texto, que se reproduce literalmente:

> **Decisiones de los fundadores — 30.6 y 30.7**
>
> **30.6 — Aprobada.** Los siete días consecutivos de validación por uso real comenzarán cuando Planes, Recurrentes y calendario y Presupuesto integral v1 estén aceptados y en producción.
>
> Se mantienen las condiciones de 24.10 y 25.5, incluida la congelación de despliegues, el reinicio ante fallos críticos y la valoración individual de ambos fundadores.
>
> **30.7 — Aprobada.** Autorizamos sustituir la sesión guiada de FR-080, exclusivamente para la aceptación técnica de MVP-1, por la corrida delegada del PR #104 y la nueva evidencia de las correcciones C-1–C-7.
>
> Aceptamos expresamente las diferencias de cobertura documentadas. Ejecutaremos el escenario humano completo antes de iniciar los siete días de validación por uso real, como precondición de T094.
>
> Esta sustitución no acredita anticipadamente ninguna otra verificación humana ni de dispositivo, ni sustituye SC-012 de las specs 002–004, 004-T084, SC-010, FR-082 o las demás verificaciones pendientes.
>
> **FR-013 — Sin excepción.** Mantenemos el requisito de una semana de registros de producción con actividad representativa. Intentaremos acreditarlo mediante las verificaciones del candidato en producción. Si no resulta posible, se nos deberá presentar la situación y solicitar una decisión expresa.
>
> Registra literalmente estas decisiones, incorpora los ajustes F107-8 y F107-9 y prepara el delta para la revisión final de fidelidad.
>
> No iniciar las correcciones de C-1–C-7 hasta que el PR #107 esté aprobado y fusionado.
>
> Se mantienen la precedencia de Planes, los gates independientes y las restricciones de N-8.

**Diferencias de la corrida delegada (30.7).** Lo que la corrida del PR #104 no cubre respecto a la sesión guiada de FR-080 (informe, «Entorno» y «Método y capas»):

| Diferencia | En la corrida delegada | En la sesión guiada de FR-080 |
| --- | --- | --- |
| Alta de las cuentas | Creadas por vía administrativa, ya verificadas, sin pasar por la verificación del correo | Cuentas de los fundadores, con su alta y su verificación reales |
| Navegador y dispositivo | Chromium emulado (Playwright y el navegador integrado), sin dispositivo real | Teléfono y escritorio de cada fundador |
| Escritorio | Revisión a 1440 y, en la ronda 2, solo anotar, liquidar y aportar | Escenario completo en escritorio |
| Quién lo ejecuta | Un agente | Los dos fundadores |
| Qué acredita | La aritmética y la privacidad de lo recorrido; no la comprensión humana de las cifras | Que los dos terminan cada tarea sin ayuda y leen bien cada cifra |
| Cuentas y datos | Ficticios, en `juntia-dev`, sin cuentas ni dispositivos de los fundadores | Cuentas reales de los fundadores en producción |

**FR-013 en la aceptación técnica (30.5).** FR-013 pide revisar los registros de ejecución de Vercel de **una semana de uso**. Se conserva esa ventana: una semana de registros de producción que contenga **actividad representativa** (anotar, editar, compartir, liquidar, metas, solicitudes y exportar). Se registran la versión desplegada que generó los registros, las operaciones que se ejecutaron en esa semana y las búsquedas con su número de coincidencias, nunca las líneas. No exige los 7 días de uso personal de la validación por uso real, y **no se da por superado con la corrida de `juntia-dev`**. **Decisión de los fundadores del 26 de noviembre de 2026: sin excepción.** Se mantiene el requisito de una semana de registros de producción con actividad representativa. Los fundadores intentarán acreditarlo con las verificaciones del candidato en producción. Si no resulta posible, se les presenta la situación y se les pide una decisión expresa; ni el agente ni el gestor la toman.

**Lo que esta decisión no autoriza.** Ningún código fuera del PR de 30.2, ni ese PR antes del merge de este. Ni migraciones, ni cambios del modelo de datos o de las fórmulas financieras, ni funcionalidades nuevas, ni S-1 a S-8. No declara MVP-1: la declaración sigue siendo el PR de 005-T109, con todas sus condiciones. No rebaja ninguna verificación, umbral ni revisión adversarial. No cierra ningún `[V]` y no da por hecha la entrada al gate (FR-001: 004-T084 y T085), que no cambia. No reescribe el informe del PR #104.

**Lo que no cambia.** La 24.9 (copia semanal, pérdida máxima de 7 días y restauración real antes de declarar), la 24.6 y la excepción de Android, las demás filas de las decisiones 24 y 25, las decisiones 26 a 29, el spike de precios tras cuatro semanas de uso estable (§11) y todo lo de la decisión 28, «Lo que no cambia».

#### Dataset dorado: quién lo produce y cuándo

El caso de octubre de `docs/design/COMPONENT_SPECIFICATIONS.md` y la tabla de DEC-G04 de `docs/design/HANDOFF_CLAUDE_CODE.md` son el **dataset dorado** de la suite (ADR-011). Retirarlo de las pantallas de la 001 no lo hace opcional. Vive en **un único módulo tipado del dominio**, que crece por slice:

| Parte del dataset | La produce | Con qué pruebas |
| --- | --- | --- |
| Tipos del dataset —contexto Yo/Nosotros, persona, moneda COP— y los movimientos **privados** de Sara, que suman exactamente 412.900 | Especificación de **P0-1** | Dinero, categorías y consumo privado |
| Los seis gastos compartidos de octubre con sus repartos (55/45 y 50/50), el saldo Sara +429.900 / Tomás −429.900 y la liquidación parcial de 200.000 | Especificación de **P0-2** | Repartos, `computeBalance`, liquidaciones, el «gasto existe una vez» |
| Aportes de Sara 500.000 y Tomás 400.000, meta Japón y las siete filas de DEC-G04 | Especificación de **P0-3** | Ledger de metas, no doble conteo, `total_destinado_neto` |

Reglas:

1. **Los valores se copian de los documentos de diseño, nunca se recalculan.** Si un cálculo no los reproduce, el cálculo está mal.
2. Donde el diseño solo da un total —los 412.900 privados de Sara—, la especificación que lo usa define las filas, que deben sumar **exactamente** ese total y se marcan como completadas por el slice.
3. **La 001 no produce ninguna parte:** no tiene dominio financiero. Al cierre de F0-b —la 001 y P0-1 aceptadas— existe el módulo con sus tipos y la parte de P0-1. Las partes de P0-2 y P0-3 son el resto de aquel entregable de F0-b, transferido explícitamente a esos slices.
4. Como en el arranque progresivo de ADR-011: un slice de la tabla **no mergea** sin añadir su parte y las pruebas que la consumen.

#### Comportamiento provisional en la 001

La 001 no tiene servidor, cuentas ni datos. Aplicar las decisiones 4, 6, 8, 9 y 10 sin inventar comportamiento exige una regla: **lo que todavía no existe dice que no existe**. Nunca se presenta como si una consulta real hubiera devuelto vacío o cero. Es la misma regla que impide presentar datos simulados como reales (§10.3).

- **Aviso de versión base en el shell.** Mientras no haya persistencia, el AppShell muestra un aviso visible de que esta versión todavía no guarda datos. Desaparece cuando P0-1 conecta el servidor. Con él, los estados vacíos de la decisión 9 se leen como diseño y no como resultado de una consulta.
- **Ninguna afirmación financiera sin datos.** Ninguna pantalla muestra «$0», «Al día», «le debe», totales, barras de presupuesto ni progreso de metas. Un estado vacío neutral («Todavía no hay movimientos») está permitido; una cifra, no.
- **Anotar** sigue visible y operable, también con el atajo `N`, porque es la acción protagonista del shell. Al activarlo abre un aviso explícito de que registrar gastos llega con P0-1, **sin campos que aparenten guardar**.
- **Balance** (escritorio, decisión 4): su ruta existe y muestra un estado de «todavía no disponible» que explica que el balance aparece cuando exista la pareja (P0-2). Nunca «Al día» ni una cifra.
- **Mi cuenta** (decisión 8): el acceso mínimo lleva a `/cuenta`, que dice que la cuenta llega con el inicio de sesión (P0-1).
- **Tema** (decisión 6): en la 001 sigue al sistema (`prefers-color-scheme`), con el script bloqueante y los dos temas completos. No hay selector manual hasta que exista Mi cuenta › Apariencia, prevista con P0-1. El tema oscuro de la 001 se verifica emulando el esquema de color del sistema.
- **Selector Yo/Nosotros** (decisión 10): cambia y recuerda el contexto; el contenido no varía porque no hay datos.

La especificación 001 diseña el aspecto y el copy de cada uno de estos estados con el paquete de diseño. Lo que no puede hacer es sustituirlos por datos de ejemplo.

**Acceso a datos: decidido.** El mecanismo de acceso a datos, que figuraba aquí como pendiente, lo resuelve ADR-013, aceptado el 4 de noviembre de 2026 (decisión 15). No afecta a la 001, que no tiene base de datos.
