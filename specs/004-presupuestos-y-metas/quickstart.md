# Quickstart — 004 · Presupuestos opcionales y metas (P0-3)

Cómo comprobar P0-3 a mano, de principio a fin, con dos cuentas en pareja.
Complementa los quickstart de la 002 y la 003, que siguen valiendo para entrar,
formar la pareja, la copia y `juntia-dev`. **Nada de esto se ejecuta contra
producción** sin la confirmación del fundador en cada paso de escritura (ADR-011
§9.5) y, si ya hay datos reales, sin la copia de la decisión 19.3.

## 1. Preparar

1. `npm ci` y `npm run verify` en la rama.
2. `juntia-dev` con su guardia y su bloqueo (decisión 18); un solo agente a la vez.
3. Sara y Tomás con pareja activa (quickstart de la 003, §2), en dos navegadores.

## 2. Sin presupuesto, sin castigo (US-1)

1. Sara, en Yo, abre Plan: ve el resumen del mes y «Sin presupuesto · Crear
   presupuesto (opcional)», nunca «$0», barras vacías ni «excedido».
2. Abre Análisis desde Plan: cuatro capítulos, sin límites; sin mes anterior con
   gastos, sin «+X %».
3. Ningún texto dice «te alcanza» ni equivalentes.

## 3. Presupuestos (US-2)

1. Tomás, en Nosotros, crea Mercado con 800.000. Sara, desde su navegador, lo sube a
   900.000. Plan muestra «Último cambio: Sara subió Mercado a $900.000».
2. Tomás, con la hoja abierta desde antes del cambio de Sara, guarda 700.000: ve
   «Sara cambió este presupuesto» con el valor vigente; nada se sobrescribe.
3. Con los gastos de octubre del dataset: Mercado «Quedan 260.000», Restaurantes
   (260.000) CERCA DEL LÍMITE al 92 %, Servicios (340.000) «Se pasaron por 20.000»,
   Hogar «sin presupuesto».
4. Un presupuesto recién creado en una categoría sin gastos dice «Quedan $X · 0 %» con
   su barra; es distinto de «sin presupuesto».
5. Desactivar Servicios: el mes en curso queda sin presupuesto; el historial conserva
   los meses anteriores con su límite.
6. Tomás no ve los presupuestos de Yo de Sara en ninguna pantalla ni exportación.

## 4. Metas, aportes y retiros (US-4, US-5, US-6)

1. Sara crea en Nosotros «Japón», 18.000.000, abril de 2027. Metas en Nosotros
   muestra «Apartado en metas compartidas» y la tarjeta con el fallback (sin foto).
2. Sara registra un aporte: no hay «¿Quién aporta?»; el aporte es suyo. El número
   héroe de Inicio no cambia; aparece «Apartado para metas».
3. «Deshacer» dentro de los 6 s: el aporte queda anulado y sigue en el historial.
4. Tomás retira más de lo que tiene: «Puedes retirar hasta $X». Retira una parte con
   motivo: la fila dice «Retiro de meta · reasignación», sin «+».
5. Sara intenta retirar fondos de Tomás: no se ofrece.
6. Sara crea una meta personal en Yo: Tomás nunca la ve. En Yo, Sara ve sus metas y,
   aparte, las compartidas con «Tus aportes $X».
7. Abrir Japón: Goal Journey crece hasta la vista inmersiva; Escape cierra y el foco
   vuelve a la tarjeta. Con movimiento reducido, crossfade.

## 5. Gasto con meta (US-7, US-8)

1. Sara anota en Nosotros «Tiquetes a Tokio», 3.000.000, pagó Tomás, 50/50, «Con una
   meta»: Japón. B1 lista solo metas compartidas, sin las personales ni deshabilitadas.
2. FundingLedger propone un reparto proporcional; Sara escribe 1.620.000 propios y
   1.380.000 de Tomás. B3 muestra Japón «ahora» y «si aprueba».
3. «Registrar y pedir a Tomás»: el gasto ya existe; Japón baja solo los fondos de Sara;
   la tarjeta dice PENDIENTE DE TOMÁS y «No vence».
4. Tomás, al navegar, ve la solicitud en Inicio y aprueba: Japón baja lo de Tomás; el
   balance de la pareja es el mismo que antes de aprobar.
5. Repetir con otro gasto y rechazar: el gasto sigue; solo cuentan los fondos de Sara.
6. Sara anota en Yo un gasto con su meta personal; en el detalle, «Mover a Pareja» no
   aparece y se ve la LimitNote. «Quitar el uso de la meta» devuelve los fondos y Mover
   a Pareja vuelve a estar disponible.
7. Eliminar un gasto con meta: la confirmación avisa que el uso también se quita.

## 6. Métricas (DEC-G04)

1. Análisis en Nosotros, octubre del dataset: gasto 2.840.000; «Lo que apartaron»
   900.000 (Sara 500.000 · Tomás 400.000); PlanningNote 3.740.000, con «No es lo
   gastado ni un saldo bancario» y «Cómo se calcula».
2. En Yo de Sara: gasto 1.912.900, aportes 500.000, destinado neto 2.412.900.
3. `total_destinado_neto` no aparece en Inicio ni como número héroe, ni rotulado «Total
   gastado».

## 7. Escrituras y privacidad

1. Con la red cortada al guardar un aporte: tras 15 s, «no se pudo confirmar»; los
   campos quedan bloqueados; «Comprobar estado» y «Reintentar» con la misma clave.
2. Recargar la página con un aporte sin confirmar: no se recupera nada del navegador;
   se ve el estado del servidor.
3. Dos avisos con «Deshacer» seguidos: el segundo queda bloqueado hasta resolver el
   primero.
4. En Nosotros, ver el código fuente y el payload RSC de Metas, Plan, Análisis y
   Anotar: ningún nombre ni importe de una meta o un presupuesto personal.
