# Quickstart — 003 · Pareja y balances (P0-2)

Cómo comprobar P0-2 a mano, de principio a fin, con dos cuentas. Complementa el
quickstart de la 002 (`specs/002-cuentas-y-gastos-privados/quickstart.md`), que
sigue valiendo para entrar, la copia y `juntia-dev`. **Nada de esto se ejecuta
contra producción** sin la confirmación del fundador en cada paso de escritura
(ADR-011 §9.5) y sin la copia semanal al día (decisión 16.11).

## 1. Preparar

1. `npm ci` y `npm run verify` en la rama.
2. Base de datos para iterar: `juntia-dev`, con los comandos y el guardia del PR
   técnico de la decisión 18 (PR #48). Nunca un `.env.test` con claves de
   producción. Un solo agente a la vez.
3. Dos cuentas verificadas en `juntia-dev`, creadas por la API de administración
   (ADR-011 §9.9): `sara@…` y `tomas@…`, las dos en la lista permitida de ese
   proyecto. Dos navegadores o dos perfiles, uno por persona.

## 2. Formar la pareja (US-1)

1. Sara: Mi cuenta › Mi pareja → M2 «Sin pareja» → «Invitar a mi pareja» → correo
   de Tomás → «Crear invitación». Se ve M3b con el enlace **una sola vez**.
2. Sara cierra y vuelve a Mi pareja: M4 «PENDIENTE» con «Generar enlace nuevo» y
   «Anular», **sin** «Copiar enlace».
3. «Generar enlace nuevo»: aparece otro enlace; el anterior, abierto por Tomás, da
   M7.
4. Tomás, **sin sesión**, abre el enlace nuevo: M5, sin nombre de Sara. «Entrar» →
   vuelve a la invitación → M6 «Sara te invitó…» → «Aceptar invitación» → M1
   «ACTIVA» para los dos.
5. Comprobar en `couple_members` que Tomás no ve el correo de Sara.

**Carreras (FR-010b), con dos pestañas:** anular en una y aceptar en la otra casi a
la vez → gana una; la otra muestra su error y nada cambia. Sara y Tomás se invitan
a la vez → ninguno acepta la del otro sin anular la suya.

## 3. Compartir y ver (US-2, US-3, US-4)

1. Tomás en Nosotros: Anotar → $186.400 → Mercado → Guardar. El resumen decía
   «Pagó: yo · 50/50» (primera vez, Q5). Nosotros sube; el saldo se tacha.
2. Sara en Nosotros: ve el gasto «Pagó Tomás · 50/50». En Yo ve «Compartido · tu
   parte $93.200» y su total de Yo suma solo la parte.
3. Sara anota en Yo un gasto privado. Tomás, en Nosotros y en Yo, no lo ve. Con
   las herramientas del navegador, el HTML y el RSC de `/` y `/actividad` de Sara
   en Nosotros no contienen la descripción ni el importe del privado (FR-039).
4. Casos del selector (FR-019a): quitar a Sara de Participan → Tomás 100 %; volver
   a añadirla → 50/50 (o el reparto anterior si era 55/45).
5. $100.001 al 50/50 → Sara $50.001, Tomás $50.000.

## 4. Corregir y mover (US-7, US-8)

1. Editar un gasto en las dos sesiones a la vez: la segunda da «{nombre} cambió
   este gasto antes» y nada se pierde. Editar en una y eliminar en la otra, en los
   dos órdenes: la segunda falla y nada cambia (FR-057).
2. Sara: un privado → «Mover a Pareja» → 50/50 → A3 con la vista previa de sus
   propias cifras → confirmar → A4. Tomás ve el gasto en Nosotros sin ninguna
   referencia al privado. «Deshacer» en los 6 s: vuelve a Yo como un registro nuevo.
3. Cortar la red justo al confirmar: A5 dice que **no se pudo confirmar**, no que
   no se movió; «Comprobar estado» lleva al resultado real.

## 5. Balance y liquidar (US-5, US-6)

1. Balance (escritorio) o Inicio › «Ver balance» (móvil): POR SALDAR, «Tomás le
   debe a Sara $X», barras por persona y la tabla de desglose.
2. Registrar liquidación «Otro» por un importe parcial: el saldo baja, el gasto
   del mes no cambia, la fila de Actividad dice «Liquidado · no es un gasto».
3. Intentar más que el saldo: el error dice el máximo. Fecha futura: no se puede.
4. Anular esa liquidación desde su detalle: sale del saldo y queda en el historial
   como anulada (enmienda de ADR-007).
5. Movimiento reducido activado: S1 y S4 muestran el estado final sin
   desplazamientos.

## 6. Comprobaciones con el dataset dorado

Con `seedCouple()` en `juntia-dev` o en el runner (estado `beforeSettlement`):
Nosotros 2.840.000; Hogar 1.600.000 · Mercado 640.000 · Servicios 360.000 ·
Restaurantes 240.000; Sara +429.900 / Tomás −429.900; Yo de Sara 1.912.900. Tras
la liquidación del 25 de octubre (`afterSettlement`): 229.900 y 2.840.000.
