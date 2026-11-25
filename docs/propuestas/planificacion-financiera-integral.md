# Propuesta de los fundadores: evolución hacia la planificación financiera integral

**Estado:** propuesta de los fundadores **pendiente de análisis y de decisión**
(25 de noviembre de 2026). **No es una decisión, no amplía el alcance y no es
autoridad.** No modifica el maestro, los ADR vigentes, la spec 006 ni el alcance
aprobado de MVP-1. Si algo de este documento contradice al maestro o a un ADR,
manda el maestro o el ADR.

**Qué no es:** no es una spec de Spec Kit (ADR-012). Los bloques A–D de abajo son
**agrupaciones provisionales sin número de spec**. Los números definitivos se
asignan solo cuando los fundadores aprueben el análisis y se abra cada spec, de una
en una.

**Datos:** todas las cifras son **ficticias** y solo conservan la coherencia
matemática de los ejemplos. No corresponden a la situación financiera de nadie.
Las pruebas, fixtures y capturas que salgan de aquí usan datos anonimizados.

**Siguiente paso acordado:** cuando termine el trabajo documental de Planes, el
gestor hace el análisis de la sección 6, respetando las restricciones del gate de
MVP-1 (solo documentación, sin código ni migraciones). El resultado se presenta a
los fundadores **antes** de decidir alcance, prioridades, arquitectura o
implementación.

---

## 1. Contexto y motivación de los fundadores

A partir de nuestras necesidades financieras reales, queremos evaluar una
evolución de Juntia que vaya más allá del registro de gastos, la distribución de
responsabilidades económicas en pareja y el seguimiento de metas de ahorro.

Actualmente, Juntia permite conocer qué ocurrió con nuestro dinero. Queremos que,
progresivamente, también permita organizar qué queremos hacer con él y evaluar
las consecuencias de nuestras decisiones financieras futuras.

Las necesidades que nos interesan incluyen:

- Administrar ingresos provenientes de diferentes empleos y actividades profesionales.
- Conocer nuestros gastos personales y compartidos reales.
- Comprar inmuebles para inversión.
- Administrar créditos y compromisos de largo plazo.
- Recibir ingresos por arrendamiento.
- Planificar gastos anuales, como seguros, impuestos y mantenimiento.
- Construir y mantener fondos de emergencia.
- Ahorrar para viajes, celebraciones familiares y matrimonio.
- Realizar abonos extraordinarios a capital.
- Construir patrimonio sin sacrificar innecesariamente nuestra calidad de vida.
- Evaluar decisiones financieras con horizontes de uno, cinco o más años.

El objetivo es que Juntia se convierta en una herramienta que podamos utilizar
diariamente para administrar nuestras finanzas personales y compartidas, tanto en
el presente como en el futuro.

No queremos construir una segunda aplicación para resolver estas necesidades.
Queremos evaluar cómo incorporarlas coherentemente a Juntia.

## 2. Instrucciones para el gestor del proyecto

Antes de proponer cambios, revisar:

- `docs/JUNTIA_MASTER.md`
- `docs/BACKLOG_MVP2.md`
- `AGENTS.md`
- `docs/GLOSSARY.md`
- `docs/CONVENTIONS.md`
- ADR vigentes.
- Spec 004: Presupuestos y metas.
- Spec 005: Gate de MVP-1.
- Spec 006: Planes, viajes, salidas y eventos.
- Modelo de datos y arquitectura actualmente implementados.
- Sistema de diseño y navegación aprobados.

Esta petición constituye una propuesta de evolución funcional de los fundadores,
no una aprobación automática de requisitos técnicos, decisiones de arquitectura,
cambios de alcance o nuevas especificaciones definitivas.

El gestor deberá identificar:

1. Qué necesidades ya están cubiertas.
2. Qué funcionalidades están contempladas en el backlog.
3. Qué funcionalidades requieren ampliar decisiones existentes.
4. Qué funcionalidades necesitan nuevos ADR.
5. Qué dependencias existen entre ellas.
6. Qué decisiones deben consultar nuevamente a los fundadores.
7. Qué división de especificaciones resulta más apropiada.

No modificar ni ampliar unilateralmente la spec 006.

No interrumpir el gate de MVP-1 ni implementar funcionalidades de MVP-2 antes de
su declaración formal.

Seguir el proceso Specify → Clarify → Plan → Tasks → Implementation establecido
para el proyecto.

---

## Bloque A (provisional) — Ingresos, gastos y compromisos recurrentes

### Objetivo

Permitir registrar ingresos y obligaciones económicas recurrentes para conocer
anticipadamente los movimientos esperados de cada persona y de la pareja,
reduciendo el trabajo manual de captura.

### Casos de uso

- Salario mensual.
- Segundo empleo.
- Ingresos freelance.
- Primas laborales.
- Bonificaciones.
- Arrendamientos recibidos.
- Servicios públicos.
- Administración de inmuebles.
- Suscripciones.
- Créditos.
- Cuotas de inmuebles sobre planos.
- Seguros.
- Impuestos prediales.
- Otros gastos periódicos.

### Capacidades propuestas

#### A.1 — Configuración de recurrencias

Permitir configurar:

- Nombre.
- Tipo: ingreso o egreso.
- Importe fijo o estimado.
- Categoría, cuando corresponda.
- Fecha inicial.
- Fecha final opcional.
- Frecuencia.
- Próxima fecha esperada.
- Contexto personal o compartido.
- Responsable del pago o recepción.
- Reparto entre integrantes cuando corresponda.
- Estado activo, pausado o finalizado.

Considerar frecuencias semanales, quincenales, mensuales, trimestrales,
semestrales, anuales y personalizadas.

#### A.2 — Movimientos esperados frente a movimientos reales

Diferenciar explícitamente:

- Movimiento previsto.
- Movimiento confirmado o registrado.
- Movimiento pendiente.
- Movimiento omitido.
- Movimiento cancelado.

La existencia de una recurrencia no debe crear ingresos o gastos reales antes de
que se produzcan.

Debe evaluarse un mecanismo de confirmación y vinculación con movimientos
existentes, evitando registros duplicados.

#### A.3 — Ingresos variables e inciertos

Permitir distinguir ingresos habituales, extraordinarios, estimados y
condicionales.

Ejemplos (cifras ficticias):

- Salario habitual de $7.200.000.
- Posible segundo ingreso de $4.300.000.
- Prima de diciembre estimada entre $5.400.000 y $7.100.000.
- Arrendamiento esperado de un inmueble que todavía no está arrendado.

Un ingreso esperado no debe incrementar automáticamente el dinero registrado ni
considerarse recibido.

#### A.4 — Calendario financiero

Evaluar una vista que permita consultar obligaciones e ingresos previstos por
fecha.

Debe ser posible conocer qué compromisos se aproximan, cuáles están pendientes y
cuáles ya se registraron.

#### A.5 — Compromisos de duración definida

Soportar obligaciones con fecha de terminación o número determinado de cuotas.

Ejemplo: un apartamento sobre planos cuya cuota inicial se paga mensualmente
durante varios años, hasta la fecha de entrega.

La terminación de un compromiso debe poder reflejarse en futuras proyecciones.

### Fuera del alcance inicial propuesto

- Integraciones bancarias.
- Débitos automáticos.
- Ejecución de pagos.
- Conciliación bancaria automática.
- Cálculos de amortización de créditos, correspondientes a un bloque posterior.

---

## Bloque B (provisional) — Presupuesto integral, flujo de caja y provisiones

### Objetivo

Evolucionar el modelo actual de presupuestos por categoría para permitir una
planificación mensual integral basada en ingresos previstos, gastos reales,
compromisos y objetivos de ahorro.

Los presupuestos actuales deben conservar su funcionamiento y significado.

Cualquier ampliación deberá revisar expresamente las restricciones de ADR-004,
DEC-R01, DEC-R17 y las decisiones de la spec 004.

### Capacidades propuestas

#### B.1 — Presupuesto mensual integral

Permitir distribuir los ingresos esperados entre:

- Gastos personales.
- Gastos compartidos.
- Obligaciones recurrentes.
- Provisiones para gastos futuros.
- Metas de ahorro.
- Viajes y experiencias.
- Abonos extraordinarios a deudas.
- Otros destinos definidos por la persona o pareja.

Debe ser posible consultar el importe asignado, ejecutado y pendiente de cada
componente.

El sistema deberá evitar sumar dos veces una obligación recurrente que también
pertenece a una categoría presupuestada.

#### B.2 — Presupuesto frente a ejecución real

Mostrar separadamente:

- Importe presupuestado.
- Importe comprometido.
- Importe ejecutado.
- Desviación respecto al presupuesto.
- Importe pendiente de asignar.

Permitir identificar categorías en las que se está gastando más o menos de lo
previsto.

No asumir que un excedente presupuestario equivale a dinero disponible en una
cuenta bancaria.

#### B.3 — Provisiones para gastos futuros

Permitir organizar gastos conocidos que no ocurren todos los meses.

Ejemplos:

- Seguro anual del vehículo.
- Prediales.
- SOAT.
- Mantenimiento del vehículo.
- Matrículas.
- Seguros de inmuebles.
- Vacaciones.
- Regalos y celebraciones.

Una obligación anual de $7.680.000 podría distribuirse mediante una provisión
mensual de $640.000 (cifras ficticias).

También debe contemplarse la posibilidad de cubrir una obligación anual
utilizando un ingreso extraordinario, como una prima laboral.

Evaluar la reutilización del modelo de metas y su ledger, evitando construir un
segundo mecanismo de ahorro que duplique conceptos existentes.

Distinguir entre una asignación prevista y dinero efectivamente reservado.

Cuando se pague una obligación provisionada, evitar contabilizar dos veces el
aporte y el gasto.

#### B.4 — Presupuestos futuros

Permitir planificar meses posteriores, contemplando diferencias respecto al mes
actual.

Ejemplos:

- Enero: gastos extraordinarios de seguros e impuestos.
- Mayo: viaje familiar.
- Julio: matrimonio.
- Agosto: inicio de un nuevo crédito.

Evaluar cómo encaja esta capacidad con las reglas vigentes de presupuestos
mensuales, historial y versiones.

#### B.5 — Presupuesto basado en comportamiento real

A partir de suficiente historial, ofrecer información descriptiva sobre:

- Promedio mensual por categoría.
- Mediana de gastos.
- Variaciones entre meses.
- Gastos extraordinarios.
- Compromisos habituales.
- Distribución del gasto.

Evaluar sugerencias voluntarias de presupuestos conforme a DEC-R01-S.

Nunca crear o modificar presupuestos automáticamente sin consentimiento.

#### B.6 — Metas de ahorro integradas al presupuesto

Permitir incluir aportes previstos para metas como:

- Fondo de emergencia.
- Matrimonio.
- Viajes.
- Cuotas iniciales de inmuebles.
- Remodelaciones.
- Educación.
- Inversiones.

Mostrar el progreso real y, por separado, los aportes planificados.

Un aporte a una meta no debe convertirse en un gasto de consumo.

#### B.7 — Flujo mensual previsto

Permitir consultar cuánto representan los ingresos y compromisos futuros dentro de
un periodo.

Separar claramente el flujo previsto del flujo real.

Antes de implementar una cifra de liquidez o saldo disponible, determinar qué
información de cuentas y saldos requiere el bloque C.

### Ejemplo ilustrativo de presupuesto (cifras ficticias)

| Concepto | Importe mensual |
|---|---:|
| Ingreso habitual | $7.200.000 |
| Gastos personales estimados | $3.100.000 |
| Cuota personal de crédito inmobiliario | $1.350.000 |
| Cuota personal de segundo inmueble | $820.000 |
| Provisiones anuales | $640.000 |
| Viajes y experiencias | $550.000 |
| Excedente previsto por asignar | $740.000 |

El usuario debe poder consultar cómo cambia este presupuesto cuando modifica un
compromiso o una asignación.

Los valores son ilustrativos y el presupuesto no constituye una certificación de
liquidez.

---

## Bloque C (provisional) — Cuentas, activos, deudas y patrimonio

### Objetivo

Permitir conocer la posición financiera personal y compartida, diferenciando
ingresos, gastos, dinero líquido, inversiones, activos, obligaciones y patrimonio
neto.

### Capacidades propuestas

#### C.1 — Cuentas y productos financieros

Evaluar el registro manual de:

- Cuentas de ahorros.
- Cuentas corrientes.
- Efectivo.
- Fondos de inversión.
- CDT.
- Fondos voluntarios de pensiones.
- Inversiones bursátiles.
- Otros productos financieros.

Permitir registrar saldo inicial, saldo actualizado, titularidad y fecha de
actualización.

Definir si los saldos serán declarativos, derivados de movimientos o una
combinación de ambos modelos con conciliación explícita.

#### C.2 — Disponibilidad del dinero

Diferenciar entre:

- Dinero líquido.
- Dinero reservado para metas.
- Dinero comprometido.
- Inversiones de corto plazo.
- Inversiones con vencimiento.
- Recursos de difícil disponibilidad.

Ejemplo: tener $16.500.000 en un CDT (cifra ficticia) no equivale necesariamente
a disponer de esos recursos inmediatamente.

El fondo de emergencia debe poder identificarse sin incrementar artificialmente
los activos totales.

#### C.3 — Transferencias entre cuentas

Evaluar movimientos de dinero entre cuentas propias.

Una transferencia de una cuenta de ahorros a una inversión no representa un nuevo
gasto ni un nuevo ingreso.

Debe mantenerse la integridad de los saldos y evitarse el doble conteo.

#### C.4 — Activos patrimoniales

Permitir registrar activos como:

- Vivienda propia.
- Apartamentos de inversión.
- Inmuebles sobre planos.
- Vehículos.
- Inversiones.
- Otros activos relevantes.

Para cada activo, evaluar:

- Nombre.
- Tipo.
- Valor de adquisición.
- Valor comercial estimado.
- Fecha de valoración.
- Titularidad.
- Porcentaje de participación.
- Estado del activo.
- Deudas asociadas.
- Ingresos y gastos asociados.

La valorización estimada no debe registrarse como ingreso recibido.

En inmuebles sobre planos, diferenciar los derechos adquiridos y los aportes
realizados del valor total proyectado del inmueble terminado.

#### C.5 — Créditos y obligaciones financieras

Permitir registrar:

- Créditos hipotecarios.
- Créditos de libre inversión.
- Créditos de vehículos.
- Tarjetas de crédito.
- Préstamos personales.
- Compromisos de financiación.
- Otras deudas.

Evaluar los siguientes datos:

- Capital inicial.
- Saldo pendiente.
- Tasa de interés.
- Tipo de tasa.
- Periodicidad de la tasa.
- Fecha de desembolso.
- Plazo.
- Cuota.
- Seguros y cargos adicionales.
- Titularidad legal.
- Responsabilidad económica acordada.
- Activo asociado, si existe.

Diferenciar la deuda legal frente a la entidad financiera de los acuerdos
económicos privados de la pareja.

#### C.6 — Amortización y abonos a capital

Permitir consultar:

- Capital pendiente.
- Intereses pagados.
- Capital amortizado.
- Cuotas restantes estimadas.
- Costos adicionales.
- Abonos extraordinarios.
- Fecha estimada de terminación.

Evaluar sistemas de amortización y tasas soportadas inicialmente.

Diferenciar entre reducción de cuota y reducción de plazo.

Permitir registrar aportes extraordinarios realizados por cada integrante y
evaluar su impacto sobre las responsabilidades económicas, sin modificar
automáticamente porcentajes de propiedad legal.

El componente de capital de una cuota debe distinguirse del interés y otros
costos.

Definir cómo se presenta la salida de caja completa sin clasificar
incorrectamente todo el pago como consumo.

#### C.7 — Inmuebles de inversión

Evaluar el seguimiento de:

- Valor del inmueble.
- Cuota inicial.
- Remodelaciones.
- Crédito asociado.
- Arriendo recibido.
- Administración.
- Comisiones inmobiliarias.
- Prediales.
- Seguros.
- Mantenimiento.
- Periodos de vacancia.
- Rentabilidad estimada.
- Flujo de caja del inmueble.

Diferenciar rentabilidad bruta, rentabilidad neta y flujo después de
financiación.

No asumir valorizaciones o ingresos futuros garantizados.

#### C.8 — Patrimonio neto

Permitir consultar la evolución del patrimonio considerando activos menos
pasivos.

Diferenciar:

- Patrimonio personal.
- Patrimonio compartido.
- Participación económica individual en activos compartidos.
- Liquidez.
- Nivel de endeudamiento.

Evitar sumar el patrimonio compartido completo al patrimonio individual de cada
integrante.

Los agregados deben respetar estrictamente los permisos de acceso y no revelar
activos, saldos o deudas privadas.

#### C.9 — Fondo de emergencia

Evaluar una herramienta que permita consultar:

- Objetivo de ahorro.
- Recursos efectivamente reservados.
- Gastos esenciales mensuales.
- Obligaciones financieras esenciales.
- Meses estimados de cobertura.
- Recursos faltantes para alcanzar el objetivo.

El cálculo debe identificar los datos estimados y depender de recursos
efectivamente disponibles.

---

## Bloque D (provisional) — Proyecciones financieras y simulación de escenarios

### Objetivo

Permitir evaluar decisiones financieras futuras a partir de ingresos, gastos,
compromisos, metas, activos y deudas registrados en Juntia.

Esta funcionalidad debe ser descriptiva y simulativa. No debe presentar resultados
futuros como certezas ni realizar operaciones financieras reales.

### Capacidades propuestas

#### D.1 — Proyecciones por horizonte temporal

Evaluar horizontes de:

- Próximo mes.
- Tres meses.
- Seis meses.
- Un año.
- Tres años.
- Cinco años.
- Horizonte personalizado.

Permitir consultar la evolución estimada de ingresos, egresos, liquidez,
obligaciones, ahorro y patrimonio.

#### D.2 — Escenarios independientes

Permitir crear y comparar escenarios sin alterar los datos financieros reales.

Ejemplos:

- Situación actual.
- Segundo empleo confirmado.
- Pérdida de uno de los ingresos.
- Incremento de gastos personales.
- Inicio de ingresos por arrendamiento.
- Compra de un nuevo inmueble.
- Viaje familiar.
- Matrimonio.
- Gastos extraordinarios.
- Reducción de deuda mediante abonos adicionales.

Cada escenario debe conservar sus propios supuestos y permitir modificarlos.

#### D.3 — Evaluación de ingresos inciertos

Ejemplo (cifras ficticias):

- Escenario base: $7.200.000 mensuales.
- Escenario optimista: $11.500.000 mensuales.
- Escenario de estrés: reducción temporal de ingresos.

Los ingresos condicionales no deben formar parte del escenario base sin decisión
explícita.

#### D.4 — Simulador de reducción de deuda

Permitir comparar alternativas como:

- Pagar únicamente la cuota obligatoria.
- Realizar abonos extraordinarios mensuales.
- Realizar abonos extraordinarios ocasionales.
- Utilizar ingresos por arrendamiento para amortizar capital.
- Destinar un porcentaje de ingresos adicionales a reducir deuda.

Mostrar, cuando los datos sean suficientes:

- Fecha estimada de terminación.
- Intereses estimados.
- Ahorro de intereses frente al escenario base.
- Capital pendiente por periodo.
- Flujo de caja comprometido.
- Efecto sobre el fondo de emergencia.

Documentar las fórmulas, las hipótesis y las limitaciones de cada cálculo.

#### D.5 — Simulador de decisiones financieras

Permitir incorporar una decisión futura y comparar sus consecuencias.

Ejemplos (cifras ficticias):

- Viajar por $6.800.000.
- Comprar un vehículo.
- Adquirir un inmueble sobre planos.
- Aumentar el ahorro mensual.
- Realizar un abono extraordinario de $9.500.000.
- Incrementar el presupuesto de matrimonio.

Mostrar cómo cambia la proyección de liquidez, deuda y ahorro frente al escenario
original.

No emitir una autorización de gasto ni afirmar que una persona puede permitirse
una compra.

#### D.6 — Planificación de múltiples objetivos simultáneos

Permitir evaluar conjuntamente objetivos como:

- Mantener un fondo de emergencia.
- Pagar obligaciones mensuales.
- Viajar cada año.
- Ahorrar para el matrimonio.
- Reducir deuda.
- Comprar inmuebles.
- Construir patrimonio.

El usuario debe poder asignar prioridades y modificar importes sin que Juntia
decida unilateralmente qué objetivo es más importante.

#### D.7 — Visualización temporal

Evaluar visualizaciones como:

- Evolución de liquidez por mes.
- Evolución de deuda pendiente.
- Ahorro acumulado.
- Patrimonio estimado.
- Ingresos frente a compromisos.
- Fechas relevantes de metas y obligaciones.
- Comparación entre escenarios.

Las cifras reales y las proyectadas deben tener una diferenciación visual
inequívoca, incluyendo alternativas accesibles que no dependan exclusivamente del
color.

#### D.8 — Alertas descriptivas de planificación

Evaluar avisos como:

- El escenario proyecta un déficit en determinado mes.
- Coinciden varios compromisos extraordinarios.
- El fondo de emergencia proyectado queda por debajo del objetivo definido.
- Una meta requiere incrementar los aportes previstos.
- Existe un saldo de crédito pendiente al finalizar el horizonte.

Evitar mensajes alarmistas, culpabilizantes o recomendaciones financieras
presentadas como certezas.

---

## 3. Caso de uso transversal (cifras ficticias)

Escenario de referencia para validar que las funcionalidades propuestas puedan
trabajar conjuntamente. **Todas las cifras son ficticias**; solo conservan la
coherencia del ejemplo del bloque B.

### Situación inicial

Una persona cuenta con:

- Ingreso habitual de $7.200.000 mensuales.
- Posible segundo ingreso de $4.300.000 mensuales.
- Gastos personales estimados de $3.100.000 mensuales.
- Fondo de emergencia de $11.000.000.
- CDT de $16.500.000.
- Ahorro previsional de $8.300.000.
- Primas extraordinarias esperadas en diciembre.

La pareja tiene:

- Un inmueble de inversión recién adquirido.
- Un crédito de $170.000.000.
- Cuota mensual conjunta de $2.700.000 (cada uno asume $1.350.000).
- Remodelación pendiente.
- Ingresos futuros estimados por arrendamiento.
- Un segundo inmueble sobre planos con entrega dentro de varios años.
- Una obligación mensual conjunta de $1.640.000 para su cuota inicial (cada uno
  asume $820.000).
- Un saldo adicional que deberá financiarse cuando se entregue el inmueble.

Además, existen objetivos personales y familiares:

- Gastos extraordinarios anuales de entre $7.000.000 y $8.500.000.
- Un viaje familiar de aproximadamente $6.800.000.
- Matrimonio.
- Recuperación del fondo de emergencia.
- Pago anticipado del crédito.
- Construcción de patrimonio a largo plazo.

### Preguntas que Juntia debería permitir explorar

1. ¿Cuánto gasto realmente cada mes?
2. ¿Cuánto representan mis obligaciones fijas?
3. ¿Cuánto dinero tengo efectivamente disponible?
4. ¿Cuánto tengo reservado para objetivos futuros?
5. ¿Cómo cambia mi posición financiera si realizo el viaje?
6. ¿Cómo llegaría a enero después de pagar los gastos extraordinarios?
7. ¿Cuánto tardaría en recuperar mi fondo de emergencia?
8. ¿Qué pasa si no se concreta el segundo ingreso?
9. ¿Qué cambia si comienzo a recibir arriendo?
10. ¿Cuánto podría reducir el plazo del crédito haciendo abonos adicionales?
11. ¿Cuál sería la deuda pendiente cuando reciba el segundo inmueble?
12. ¿Cuánto patrimonio tendría en diferentes escenarios a la fecha de entrega del
    segundo inmueble?
13. ¿Qué sucede si priorizo viajar y ahorrar para el matrimonio en lugar de
    amortizar toda la deuda inmediatamente?
14. ¿Cuál es la situación individual de cada integrante y cuál es la situación
    compartida?

Juntia no tiene que tomar estas decisiones por nosotros. Debe proporcionar
información suficientemente clara para que podamos tomarlas nosotros mismos.

---

## 4. Principios transversales obligatorios

### Integridad financiera

Mantener separados los conceptos de:

- Ingreso real.
- Ingreso previsto.
- Gasto de consumo.
- Salida de caja.
- Transferencia.
- Aporte a una meta.
- Retiro de una meta.
- Provisión.
- Compromiso futuro.
- Amortización de capital.
- Interés.
- Activo.
- Pasivo.
- Valorización.
- Patrimonio.

Un mismo movimiento económico no debe contabilizarse dos veces.

Los planes, recurrentes, presupuestos, metas, activos y deudas deberán poder
relacionarse sin duplicar el importe del movimiento original.

### Privacidad

Mantener los principios actuales de Yo y Nosotros.

- Los datos privados nunca se revelan mediante agregados compartidos.
- Los ingresos personales no se comparten automáticamente.
- Los activos y las deudas personales permanecen privados por defecto.
- Los escenarios privados no son visibles para la pareja.
- La información compartida requiere un modelo de acceso explícito.

### Seguridad y arquitectura

Respetar la arquitectura financiera existente, incluyendo:

- RLS y restricciones en base de datos.
- ADR-013.
- Escrituras controladas.
- Idempotencia.
- Auditoría.
- Control de concurrencia.
- Integridad monetaria.
- Exportación.
- Eliminación de cuentas.
- Estrategia de copias de seguridad y restauración.

Cualquier nueva dimensión financiera deberá justificar sus invariantes, modelo de
datos y mecanismos de acceso.

### Experiencia de usuario

Juntia debe continuar siendo sencilla para quienes solamente desean registrar
gastos.

Las funcionalidades avanzadas deben ser opcionales y progresivas.

No queremos convertir la pantalla principal en una herramienta contable compleja.

Conservar:

- La captura rápida de movimientos.
- El diseño visual existente.
- Accesibilidad.
- Soporte de modo claro y oscuro.
- Experiencia responsive.
- Navegación aprobada.
- Rendimiento y presupuestos técnicos existentes.

No añadir nuevos destinos de navegación ni modificar los componentes aprobados sin
una decisión explícita de los fundadores.

### Transparencia

Toda estimación debe identificar sus supuestos.

Un presupuesto no equivale a liquidez.

Una meta no equivale necesariamente a una cuenta bancaria.

Una proyección no equivale a un resultado garantizado.

Un ingreso esperado no equivale a dinero recibido.

No incorporar IA, conexiones bancarias, recomendaciones de inversión ni
automatizaciones de pagos como requisitos implícitos de estas especificaciones.

---

## 5. Estrategia de implementación propuesta

Orden propuesto originalmente por los fundadores:

| Etapa | Funcionalidad | Resultado esperado |
|---|---|---|
| Spec 005 | Cierre de MVP-1 | Base estable y aceptada |
| Spec 006 | Planes y viajes | Organización de experiencias y sus gastos |
| Bloque A | Recurrentes y compromisos | Conocimiento de obligaciones futuras |
| Bloque B | Presupuesto integral | Planificación y distribución de ingresos |
| Bloque C | Cuentas y patrimonio | Visión de activos, liquidez y deudas |
| Bloque D | Proyecciones y escenarios | Evaluación de decisiones futuras |

El gestor deberá validar este orden. La sección 8.2 recoge el orden de
dependencias que los fundadores consideran razonable a partir de la primera
lectura del gestor; el orden definitivo debe salir del análisis.

En particular, debe determinar si determinadas capacidades de cuentas y saldos del
bloque C son requisitos previos para alguna parte del bloque B.

No forzar el desarrollo secuencial si existen dependencias que aconsejen otro
orden.

No ampliar el número de pruebas E2E indiscriminadamente. Aplicar ADR-011 y las
restricciones aprobadas para MVP-2, comprobando cada invariante en la capa de
pruebas más baja que pueda detectar su incumplimiento.

---

## 6. Entregable solicitado al gestor

En esta primera etapa queremos un análisis documental y funcional, no
implementación.

Solicitamos:

1. Revisar esta propuesta contra el estado real del proyecto.
2. Elaborar una matriz de funcionalidades existentes, contempladas y nuevas.
3. Identificar contradicciones con decisiones vigentes.
4. Proponer la división definitiva de especificaciones.
5. Elaborar un mapa de dependencias.
6. Identificar posibles ADR nuevos o ampliaciones de los existentes.
7. Evaluar los riesgos de arquitectura, privacidad e integridad financiera.
8. Proponer un orden de implementación fundamentado.
9. Presentar preguntas y alternativas concretas a los fundadores.
10. Proponer cómo registrar estas ideas en el backlog sin presentarlas como
    decisiones ya aceptadas.

No escribir código, migraciones ni modificar el alcance aprobado.

No cerrar decisiones en nombre de los fundadores.

No comenzar simultáneamente las cuatro especificaciones.

Una vez revisada y aceptada esta propuesta, avanzar con una especificación a la
vez, siguiendo el proceso establecido de Spec Kit.

---

## 7. Visión de producto

Queremos que Juntia evolucione alrededor de cuatro preguntas fundamentales:

- ¿En qué se fue nuestro dinero?
- ¿Cómo queremos distribuir nuestro dinero?
- ¿Qué tenemos y qué debemos?
- ¿Cómo cambiarían nuestras finanzas si tomamos una determinada decisión?

El propósito de Juntia no es obligarnos a gastar menos, ahorrar todo o maximizar
nuestro patrimonio a cualquier costo.

Es ayudarnos a construir una vida financiera organizada, consciente y sostenible,
tanto individualmente como en pareja.

Queremos poder invertir, comprar vivienda, viajar, celebrar con nuestras familias
y cumplir nuestras metas, comprendiendo el impacto financiero de cada decisión.

Juntia debe acompañar esas decisiones, no tomarlas por nosotros.

La visión que queremos explorar es que Juntia nos permita **registrar, entender,
organizar y proyectar** nuestras finanzas, ayudándonos a construir patrimonio y
disfrutar de nuestra vida sin perder el control financiero.

---

## 8. Precisiones de los fundadores tras la primera lectura del gestor (25 nov 2026)

La primera lectura del gestor señaló cuatro riesgos:

- el tamaño del cambio frente a la hoja de ruta del maestro;
- mantener los datos al día sin conexión bancaria;
- la exactitud de los cálculos de créditos en Colombia;
- la mayor complejidad de la privacidad.

También propuso un orden por dependencias. Los fundadores registran estas
precisiones, que **siguen siendo parte de la propuesta y no decisiones aprobadas**.

### 8.1 Alcance y hoja de ruta

Somos conscientes de que esta evolución representa un cambio importante en la
visión de Juntia. Sin embargo, no queremos implementar todo simultáneamente ni
establecer que todas estas funcionalidades deban formar parte de MVP-2.

La intención es construirlas progresivamente, priorizando nuestras necesidades
reales como usuarios y obteniendo valor de cada entrega.

Estamos abiertos a reconsiderar la hoja de ruta posterior a MVP-1, incluyendo la
prioridad de los grupos de más de dos personas. Actualmente, nuestras necesidades
de planificación financiera personal y en pareja tienen mayor relevancia para
nosotros.

Esto deberá discutirse y aprobarse formalmente después del análisis, sin modificar
todavía el maestro.

### 8.2 Orden de implementación

Nos parece razonable el orden de dependencias propuesto por el gestor:

1. Ingresos, gastos y compromisos recurrentes.
2. Créditos y deudas.
3. Cuentas, activos y patrimonio.
4. Presupuesto integral, flujo de caja y provisiones.
5. Proyecciones financieras y escenarios.

Sin embargo, consideremos si una primera versión del presupuesto integral podría
aportar valor antes de implementar completamente el módulo patrimonial. No
quisiéramos que registrar inmuebles, vehículos o inversiones bursátiles se
convierta en un prerrequisito innecesario para organizar nuestros ingresos y
gastos mensuales.

El orden definitivo deberá surgir del análisis de dependencias.

### 8.3 Actualización de datos sin integración bancaria

Debe tratarse como un **requisito transversal de producto** y no simplemente como
un detalle visual. Considerar:

- Fecha de última actualización de cada saldo o valoración.
- Diferenciación entre valores confirmados, estimados y proyectados.
- Recordatorios opcionales para actualizar información.
- Mecanismos de conciliación manual sencillos.
- Identificación de proyecciones que utilizan información desactualizada.
- Posibilidad de corregir saldos sin generar ingresos o gastos ficticios.

La aplicación no debe transmitir una precisión que los datos disponibles no
permiten.

Tampoco queremos que mantener actualizada nuestra información financiera se
convierta en una tarea administrativa excesiva.

### 8.4 Créditos y amortización

De acuerdo con limitar inicialmente los sistemas de amortización soportados.

Preferimos que Juntia calcule correctamente unos pocos tipos de crédito antes de
intentar soportarlos todos.

Podríamos comenzar evaluando créditos en pesos colombianos, con tasa fija y cuota
fija, contemplando la separación de capital, intereses, seguros y cargos
adicionales.

La UVR, las tasas variables y otros sistemas más complejos pueden evaluarse
posteriormente.

Las simulaciones deberán verificarse contra tablas de amortización y extractos
bancarios reales, utilizando **datos anonimizados** para las pruebas del
repositorio.

También es importante diferenciar la titularidad legal de un crédito de los
acuerdos económicos entre los miembros de la pareja.

### 8.5 Privacidad

Mantener la privacidad por defecto como un principio **no negociable**.

La planificación financiera personal debe funcionar incluso si uno de los
integrantes decide no compartir sus ingresos, activos, cuentas o deudas con su
pareja.

No debemos introducir filtraciones indirectas mediante totales, proyecciones,
indicadores, comparaciones o diferencias entre escenarios.

### 8.6 Simplicidad y adopción progresiva

Juntia debe seguir siendo útil para una persona que únicamente quiere registrar
gastos, sin obligarla a configurar cuentas, salarios, activos o presupuestos
avanzados.

Cada nueva capacidad debe ser opcional y aportar valor por sí misma.

No queremos construir un ERP ni una aplicación contable.

### 8.7 Registro documental

Condiciones con las que se registra este documento:

- Se identifica como propuesta de los fundadores pendiente de análisis y decisión.
- Conserva su contenido funcional completo, incluyendo estas observaciones.
- Todas las cifras financieras son ficticias y conservan solo la coherencia
  matemática de los ejemplos.
- No contiene referencias personales que permitan reconstruir la situación
  financiera de los fundadores.
- El backlog la referencia, diferenciada de las funcionalidades ya aprobadas.
- No se asignan todavía números definitivos a las nuevas specs (por eso los
  bloques A–D).
- No modifica el maestro, los ADR vigentes, la spec 006 ni el alcance aprobado de
  MVP-1.
- No incluye código ni migraciones.
