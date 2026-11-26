# Corrida completa de MVP-1 con dos cuentas de prueba — 005

**Qué es.** Los fundadores decidieron que esta corrida la hiciera un agente con dos cuentas de prueba que forman pareja, en
lugar de recorrerla ellos a mano, y aplazar el uso real con sus datos. **El registro de ese cambio del gate queda pendiente
en el maestro.** Este informe no declara que el gate haya cambiado.

La corrida recorre el escenario de pareja del maestro §4 y lo que entra en MVP-1 según las specs 002, 003 y 004. Es una
**verificación de uso con datos ficticios en juntia-dev**: no es evidencia de CI ni de dispositivo real (ver
«[Qué cubre y qué se acredita en otro sitio](#qué-cubre-esta-corrida-y-qué-se-acredita-en-otro-sitio)»). Durante el gate
no se corrige nada: solo se prueba y se documenta.

## Resumen

- **Lo que se vio.** No se detectaron errores aritméticos ni fugas de datos privados en los recorridos comprobados.
- **Inconsistencias.** Hay inconsistencias en cómo se presentan el consumo mensual y el estado de la financiación con
  metas.
- **Límites.** Las verificaciones no ejecutadas y los límites de la corrida van por separado, con estado NO PROBADO o
  BLOQUEADO y su referencia.

**En números:**

- 142 filas: **119 PASS · 7 FAIL · 4 BLOQUEADO · 12 NO PROBADO**. Los FAIL son los siete hallazgos C-1 a C-7, todos de
  presentación o copy.
- Ocho sugerencias de usabilidad (S-1 a S-8), que no son fallos.
- Matriz de privacidad de 240 peticiones (HTML, RSC y RSC de prefetch), sin fugas.

## Entorno

| Dato | Valor |
| --- | --- |
| Fechas | Ronda 1: 25 de noviembre de 2026, 19:10–20:30. Ronda 2: 25 de noviembre, 21:35–22:05 (America/Bogota) |
| Commit probado | `b2f2f907f996e218b38398854bcc5c68c8d4b20b` (`main`, merge del PR #102), sin cambios locales, en las dos rondas |
| App | `next build` + `next start` (build de producción) en `http://localhost:3400` |
| Base de datos y Auth | **juntia-dev**. Producción no se tocó |
| Cuentas | `corrida-ana-…@seed.test` (Ana, propietaria) y `corrida-beto-…@seed.test` (Beto). Credenciales solo en un archivo local ignorado por git |
| Datos | Solo ficticios. Los de la ronda 2 empiezan por «R2» o «Zq» |
| Navegadores | Chromium de Playwright (`playwright-cli` 0.1.23), con una sesión aislada por cuenta, para las acciones, las capturas y las peticiones de la matriz. Navegador integrado de Claude (Chromium) para la revisión visual de Ana a 1440 y 390 px |
| Configuración de Auth | Sin cambios. No se envió ningún correo |

**Uso de la API privilegiada (F104-10).** La clave secreta de juntia-dev se usó solo en tres momentos:

1. **Preparar las cuentas.** Se crearon las dos cuentas ya verificadas, con el mismo mecanismo que
   `tests/support/admin-user.ts`. No hizo falta tocar la lista permitida.
2. **Generar un enlace de recuperación de un solo uso**, sin enviar correo, para que Ana entrara en el navegador
   integrado sin escribir la contraseña en el chat. El token se consumió al abrirlo.
3. **Una lectura** para comprobar A-1: listar los usuarios de Auth y contar cuántos tienen el correo rechazado.

Todas las operaciones funcionales (anotar, editar, invitar, liquidar, aportar, aprobar, exportar…) se hicieron con
sesiones de usuario en la app, nunca con la clave de servicio. Las exportaciones del anexo también son de usuario.

**Capturas.** 108 PNG en [`evidence/corrida-completa/`](evidence/corrida-completa/) (7,2 MB; la mayor, 165 KB). Las de
la ronda 2 empiezan por `r2-`. La revisión de privacidad de las capturas está en el
[anexo B](#anexo-b--privacidad-de-las-capturas).

## Método y capas

| Capa | Qué se hizo | Dónde está |
| --- | --- | --- |
| Recorrido funcional móvil | Todos los flujos a **390 px** con las dos cuentas | Lista de comprobación |
| Revisión de escritorio | Composición a **1440 px** (sidebar, Balance como destino, tabla con panel, diálogos) y, en la ronda 2, anotar, liquidar y aportar a 1440 | Bloque M |
| Matriz de privacidad | Peticiones con la sesión de cada usuario | [Matriz](#matriz-de-privacidad-f104-5) |
| Pruebas automatizadas previas | No se ejecutaron aquí. Se citan como referencia de lo NO PROBADO | Columna «Evidencia» |
| Pendiente, fuera de esta corrida | 360, 430, 768 y 1024 px; texto al 200 %; teclado completo; movimiento reducido más allá del cambio de contexto; VoiceOver; dispositivo real; red lenta y listas largas | Bloque N y [última sección](#qué-cubre-esta-corrida-y-qué-se-acredita-en-otro-sitio) |

## Lista de comprobación

Estados: **PASS**, **FAIL** (enlaza su hallazgo), **BLOQUEADO** (no se puede hacer en esta corrida, con el motivo) y
**NO PROBADO** (se podría, pero no se ejecutó aquí; con la prueba automatizada que lo cubre, si existe). «A» es Ana y
«B» es Beto. Las capturas están en `evidence/corrida-completa/` y se citan sin la extensión `.png`.

### A. Registro y acceso

| # | Comprobación | Estado | Evidencia |
| --- | --- | --- | --- |
| A-1 | Registro con un correo fuera de la lista permitida: «Verifica tu correo» con texto neutro | PASS | `a1-registro-no-permitido-390`. Lectura de Auth: 0 de 1.590 usuarios con ese correo |
| A-2 | Ese registro no envía correo | NO PROBADO | No hay registro de envíos accesible; el hook de la lista permitida lo cubre `supabase/tests/09_allowlist.test.sql` |
| A-3 | Registro con un correo permitido y verificación por enlace | BLOQUEADO | SMTP aplazado; los `@seed.test` no reciben correo |
| A-4 | Contraseña incorrecta: «Correo o contraseña incorrectos.» sin decir cuál falló | PASS | `a2-contrasena-incorrecta-390` |
| A-5 | Primera entrada (A6) «Hola, Ana», sin pedir presupuesto | PASS | `a3-primera-entrada-390` |
| A-6 | Recuperar acceso: aviso uniforme con un correo sin cuenta | PASS | `a4-recuperar-uniforme-390`. 0 usuarios con ese correo |
| A-7a | Enlace de recuperación válido → «Crea una contraseña nueva» con sesión abierta | PASS | Enlace generado por administración, no recibido por correo |
| A-7b | Cambiar la contraseña, entrar con la nueva y rechazar un enlace caducado o reutilizado | NO PROBADO | `tests/integration/confirm-code.test.ts`, `tests/integration/auth.test.ts`; el flujo con correo, solo en el job `e2e` (`@mail`) |
| A-8 | Cambiar la contraseña desde Seguridad y sesión | BLOQUEADO | Enviaría un correo (cupo de 2 por hora y SMTP aplazado) |
| A-9 | Cerrar sesión: aviso; `/cuenta` lleva a Entrar y, al entrar, vuelve a `/cuenta` | PASS | `a5-sesion-cerrada-390` |

### B. Mi cuenta y ajustes

| # | Comprobación | Estado | Evidencia |
| --- | --- | --- | --- |
| B-1 | El avatar abre Mi cuenta, sin sexta pestaña; en escritorio, el perfil al pie del sidebar | PASS | `b1-mi-cuenta-390`, `m8-mi-cuenta-1440` |
| B-2 | Mi perfil: cambiar el nombre visible → «Perfil actualizado.»; el correo no se puede editar | PASS | `b2-perfil-guardado-390` |
| B-3a | El tema oscuro se guarda en perfil y cookie, y otro navegador lo recibe al entrar (`juntia_theme=dark`) | PASS | `b3-apariencia-oscuro-390` |
| B-3b | Primer pintado sin destello en el otro dispositivo | NO PROBADO | El panel ya estaba en oscuro, así que no se pudo aislar. `tests/evidence/theme-cls.capture.ts` |
| B-4 | Privacidad y datos: qué ve cada uno, exportar y la nota de eliminación con cómo pedirla | PASS | `b5-privacidad-390` |
| B-5 | Categorías: once de gasto más Ingresos; presupuesto solo por categoría de gasto | PASS | `c3-anotar-privado-390`, `h3-limite-invalido-390` |

### C. Yo: movimientos privados

| # | Comprobación | Estado | Evidencia |
| --- | --- | --- | --- |
| C-1 | Inicio sin movimientos: estado vacío, nunca «$0» | PASS | `c1-inicio-vacio-390` |
| C-2 | Nosotros sin pareja: «Todavía no disponible» con «Invitar a mi pareja» | PASS | `c2-nosotros-sin-pareja-390` |
| C-3 | US-01: gasto privado de 45.000 en Transporte; sube el total y aparece «Gasto guardado · Deshacer» | PASS | `c3-anotar-privado-390`, `c3-guardado-toast-390` |
| C-4 | Deshacer del aviso: total de Yo 616.111 → 628.111 → 616.111 y la fila desaparece | PASS | `c4-deshacer-aviso-390` |
| C-5 | Ingreso «+$300.000» que no cuenta en el gasto | PASS | `f4-ingreso-sin-mover-390` |
| C-6 | Editar 23.000 → 25.000, «con ediciones»; el tipo no se puede cambiar | PASS | `c6-detalle-privado-390` |
| C-7 | Eliminar con confirmación; Escape cancela y devuelve el foco | PASS | `c7-eliminar-confirmar-390` |
| C-8 | Actividad: agrupada por día, búsqueda, filtro por tipo y por categoría | PASS | `c8-actividad-buscar-390`, `c8-actividad-filtro-categoria-390` |
| C-9 | Fecha futura (enero de 2027) permitida; las flechas llegan hasta enero y no más | PASS | `c9-actividad-mes-futuro-390` |
| C-10 | Doble toque en Guardar: buscar «Doble toque» da «1 movimiento coincide» | PASS | — |

### D. Pareja: invitar y aceptar

| # | Comprobación | Estado | Evidencia |
| --- | --- | --- | --- |
| D-1 | Mi pareja sin pareja (M2) | PASS | `d1-mi-pareja-sin-pareja-390` |
| D-2 | Crear invitación (M3b): enlace de un solo uso, vence a los 7 días | PASS | `d2-invitacion-creada-390` |
| D-3 | Anular la invitación con confirmación → M2 | PASS | `d3-anular-confirmar-390` |
| D-4 | Generar enlace nuevo: el enlace cambia | PASS | `d3-enlace-nuevo-390` |
| D-5 | Enlace abierto sin sesión (M5): no muestra quién invita | PASS | `d4-invitacion-sin-sesion-390` |
| D-6 | B entra, pasa por su primera entrada y vuelve a la invitación (M6) | PASS | `d5-invitacion-m6-390` |
| D-7 | Enlaces anulado y reemplazado → M7 | PASS | `d6-enlace-anulado-m7-390` |
| D-8 | B acepta → ACTIVA, «2 de 2 integrantes» en las dos cuentas | PASS | `d5-aceptada-390` |
| D-9 | Reabrir el enlace usado → M7 | PASS | — |
| D-10 | «Salir de la pareja» es solo una nota | PASS | `d5-aceptada-390` |
| D-11a | Con la pareja completa no se ofrece invitar | PASS | `d5-aceptada-390` |
| D-11b | Un tercero no puede entrar a la pareja | NO PROBADO | `supabase/tests/10_couple.test.sql` (l.30 «tercero no acepta», l.50 «exactamente dos integrantes»), `10a_couple_tables.test.sql` |
| D-12 | B, que es integrante y no propietario, no tiene controles para invitar, regenerar ni anular | PASS | `r2-d-beto-sin-invitar-390`. En servidor: `10_couple.test.sql` l.31–32 (un no propietario no anula ni regenera) |
| D-13 | Una cuenta con un correo distinto del invitado no puede aceptar | NO PROBADO | `10_couple.test.sql` l.29–30 (JT104 sin enumerar) |
| D-14 | Invitación caducada | NO PROBADO | `10_couple.test.sql` l.66–73 (preview y aceptación vencidas) |

### E. Gastos compartidos

| # | Comprobación | Estado | Evidencia |
| --- | --- | --- | --- |
| E-1 | US-02: 180.000, pagó Ana, 50/50 → «Beto le debe a Ana $90.000» | PASS | `e1-anotar-nosotros-390`, `e1-guardado-nosotros-390` |
| E-2 | US-03: 150.000 al 70/30 → 105.000 y 45.000 | PASS | `e2-reparto-70-30-390`, `e2-detalle-70-30-390` |
| E-3 | Porcentaje que no suma: «Sobran $30.000 (20 %)» y Guardar deshabilitado | PASS | `e3-porcentaje-falta-390` |
| E-4 | Importe que no suma: «Faltan $10.000 por asignar» | PASS | `e3-importe-faltan-390` |
| E-5 | Reparto por importe válido (US2.2): 90.000 = Ana 30.000 + Beto 60.000; saldo 240.000 → 300.000 | PASS | `r2-e-importe-valido-390` |
| E-6 | 100.001 al 50/50 (US2.4b): Ana 50.001 y Beto 50.000; el peso sobrante va a quien entró primero; saldo 300.000 → 350.000 | PASS | `r2-e-100001-detalle-390` |
| E-7 | Pagador = el otro integrante (pagó Beto) | PASS | `e3-importe-faltan-390` |
| E-8 | Un solo participante que es el pagador: «Beto asume el 100 %» | PASS | `e4-un-participante-390` |
| E-9 | Un participante que no es el pagador (US2.4a): pagó Beto y solo participa Ana; saldo 350.000 → 310.000 | PASS | — |
| E-10 | Quitar y volver a añadir un participante (US2.4d–f): «Ana asume el 100 %…» y, al volver, 15.000/25.000 restaurados | PASS | `r2-e-participante-vuelve-390` |
| E-11 | B anota: antes de guardar, el resumen dice «Reparto: Pagó Beto · 50/50 · Ana y Beto» | PASS | — |
| E-12a | Inicio en Nosotros: total, «En qué se fue» y saldo calculados bien | PASS | `e6-inicio-nosotros-beto-390` |
| E-12b | Inicio en Nosotros: el saldo anterior tachado cuando cambia de dirección | FAIL ([C-1](#c-1--el-saldo-anterior-tachado-aparece-bajo-la-dirección-nueva--media)) | `e6-inicio-nosotros-beto-390` |
| E-13 | Yo con parte compartida: Ana 490.000 = 45.000 + 445.000 | PASS | `e7-inicio-yo-ana-390` |
| E-14 | Editar un gasto de B desde A: aviso de recálculo y «Editado por Ana» | PASS | `e8-editar-compartido-390` |
| E-15 | Eliminar un compartido: el aviso dice que el otro lo verá y el saldo baja | PASS | — |
| E-16 | Edición simultánea: la segunda falla con «Este gasto cambió en otro lugar…» | PASS | `e11-edicion-concurrente-390` |
| E-17 | Ingreso desde Nosotros: queda «Solo tú» | PASS | `e10-ingreso-en-nosotros-390` |

### F. Mover a Pareja y Deshacer

| # | Comprobación | Estado | Evidencia |
| --- | --- | --- | --- |
| F-1 | «Mover a Pareja» en un gasto privado; un ingreso no lo tiene | PASS | `f1-detalle-con-mover-390`, `f4-ingreso-sin-mover-390` |
| F-2 | Importe y pagador fijos; ChangePreview correcto (saldo 100.000 → 130.000) | PASS | `f1-mover-a3-preview-390` |
| F-3 | Confirmar → «Movido a Pareja. Beto ahora le debe $140.000 a Ana.» con Deshacer unos 6 s | PASS | `f3-toast-deshacer-390` |
| F-4 | Deshacer → «Volvió a Yo.»; sale de Nosotros y vuelve a Yo | PASS | `f3-tras-deshacer-390` |
| F-5 | B no recibe ni el privado anulado ni el devuelto | PASS | [Matriz](#matriz-de-privacidad-f104-5) y búsqueda de las descripciones en el HTML de B |
| F-6 | Un gasto pagado con meta personal no se puede mover: «No se puede mover este gasto…» | PASS | `r2-i-no-se-puede-mover-390` |
| F-7 | Deshacer Mover a Pareja después de una edición o una liquidación (FR-034) | NO PROBADO | La ventana de 6 s no da tiempo en la UI. `supabase/tests/11_shared_money.test.sql` l.103 y l.118 (JT117) |

### G. Balance y liquidaciones

| # | Comprobación | Estado | Evidencia |
| --- | --- | --- | --- |
| G-1 | Balance: «Pagó X · le corresponden Y» y desglose del mes | PASS | `g1-balance-390` |
| G-2 | Hoja de liquidación: dirección fija, saldo pendiente, Todo/Otro, «Juntia no mueve dinero» | PASS | `g2-hoja-liquidacion-390` |
| G-3 | Importe mayor que el saldo → «Puedes registrar hasta $85.000.» | PASS (ver S-2) | `g3-liquidacion-mayor-resultado-390` |
| G-4 | Fecha futura → «Elige una fecha de hoy o pasada.» | PASS (ver S-2) | `g4-fecha-futura-resultado-390` |
| G-5 | Parcial de 35.000: el saldo va de 85.000 a 50.000 y, al deshacer, vuelve a 85.000. Después se registra de nuevo y queda en 50.000; el historial muestra una anulada y una activa | PASS | `g2-balance-tras-parcial-390` |
| G-6 | Liquidación completa registrada por B → «Al día», LIQUIDADO | PASS | `g5-balance-al-dia-390` |
| G-7 | Anular una liquidación desde su detalle: ANULADA con autor; saldo 150.000 → 100.000 | PASS | `g7-detalle-liquidacion-390` |
| G-8 | US-10: corregir un gasto ya liquidado invierte el saldo (Beto le debe 150.000) sin tocar las liquidaciones | PASS | `g8-saldo-invertido-390` |
| G-9 | Balance en Yo explica que está en Nosotros | PASS | `g0-balance-en-yo-390` |
| G-10 | Metas, aportes, aprobaciones y rechazos no cambian el saldo (US-19; 004 US7.10): 360.000 antes y después de aprobar | PASS | — |
| G-11 | Dos liquidaciones simultáneas del total | NO PROBADO | `tests/integration/concurrency.test.ts` |

### H. Plan y presupuestos

| # | Comprobación | Estado | Evidencia |
| --- | --- | --- | --- |
| H-1 | Sin presupuesto: «$X · sin presupuesto · Crear», nunca límite 0 | PASS | `h1-plan-sin-presupuesto-390` |
| H-2 | Límite 0 o mayor que 999.999.999: no se guarda y explica el rango | PASS | `h3-limite-invalido-390` |
| H-3 | «Se pasaron por $30.000 · 120 % · EXCEDIDO» y «Quedan $10.000 · 93 % · CERCA DEL LÍMITE» | PASS | `h4-plan-presupuestos-390` |
| H-4 | Sin duplicados: «Crear presupuesto» solo ofrece categorías libres | PASS | — |
| H-5 | Editar con historial (autor, de y a) | PASS | `h6-conflicto-presupuesto-390` |
| H-6 | Conflicto: «Ana cambió este presupuesto. Ahora el límite es $200.000.», sin sobrescribir | PASS | `h6-conflicto-presupuesto-390` |
| H-7 | Desactivar: el gasto sigue y no aparece límite cero | PASS | `h7-desactivado-390` |
| H-8 | El presupuesto personal de A no le llega a B, ni en Yo ni en Nosotros | PASS | `h8-presupuesto-personal-ana-390`. Búsqueda en el HTML de B: «40.000» ausente |

### I. Metas

| # | Comprobación | Estado | Evidencia |
| --- | --- | --- | --- |
| I-1 | Metas vacía | PASS | `i1-metas-vacia-yo-390` |
| I-2 | Meta personal con fecha y «Estimación» | PASS | `i2-meta-privada-creada-390` |
| I-3 | US-18: aporte de 250.000 → 12 %; gasto de Yo igual; «Apartaste…» aparte | PASS | `i4-meta-privada-con-aporte-390` |
| I-4 | Aporte con fecha futura rechazado | PASS | — |
| I-5 | US-19: A 300.000 (apartado) + B 200.000 (transferencia declarada) = 50 %, con autor | PASS | `i4-meta-compartida-aportes-beto-390` |
| I-6 | Metas · Yo de B: compartidas aparte con «Tu disponible» | PASS | `i5-metas-yo-beto-tu-disponible-390` |
| I-7 | Deshacer un aporte (DESHECHO) y anular otro (ANULADO) | PASS | `i6-aporte-toast-390`, `i6-aporte-anulado-390` |
| I-8 | Anular un aporte cuyos fondos ya se usaron: «Anular aporte» no se ofrece | PASS | `r2-i-anular-aporte-usado-390`. En servidor: `13_goals.test.sql` l.46 |
| I-9 | Retiro con motivo, «Retiro de la meta» | PASS | — |
| I-10 | Retiro mayor que lo disponible → «Puedes retirar hasta $250.000» | PASS | `i8-retiro-mayor-390` |
| I-11 | En la meta compartida solo se retira lo propio (tope 200.000) | PASS | — |
| I-12 | Gasto con meta personal en Yo: Bicicleta 200.000 → 120.000; el gasto cuenta | PASS | `i9-b2-meta-elegida-390` |
| I-13 | Gasto con meta compartida (Tiquetes 200.000, reparto 50/50): FundingLedger, «Registrar y pedir a Beto», PENDIENTE «No vence» | PASS | `i10-b2-fundingledger-390`, `i10-b4-pendiente-actividad-390` |
| I-14 | B aprueba: la meta baja de 400.000 a 300.000 | PASS | `i10-b5-solicitud-inicio-beto-390` |
| I-15 | B rechaza otra (Cena 60.000, reparto 30/30): el gasto sigue y solo cuentan los 30.000 de A | PASS | `i10-b7-rechazada-detalle-390` |
| I-16 | La creadora cancela una solicitud pendiente: sale de Actividad y del Inicio de B; la meta no recibe los fondos de B | PASS | — |
| I-17 | La tarjeta de la solicitud cancelada en el detalle del gasto | FAIL ([C-6](#c-6--la-solicitud-cancelada-se-sigue-leyendo-como-pendiente--media)) | `r2-i-solicitud-cancelada-390` |
| I-18 | Aprobar después de que bajen los fondos (B se queda con 10.000 y le piden 30.000): se rechaza y no cambia nada | PASS | `r2-i-aprobar-sin-fondos-390` |
| I-19 | Texto y vista previa de esa aprobación sin fondos | FAIL ([C-7](#c-7--aprobar-sin-fondos-suficientes-vista-previa-engañosa-y-error-genérico--baja)) | `r2-i-aprobar-sin-fondos-antes-390`, `r2-i-aprobar-sin-fondos-390` |
| I-20 | Doble toque en Aprobar: el uso se aplica una sola vez (disponible de B 60.000 → 30.000) | PASS | — |
| I-21a | Quitar el uso: los fondos vuelven (270.000 → 300.000) y `gasto_financiado_con_meta` lo excluye (US8.5) | PASS | Análisis Nosotros: 280.000 financiados sin los 30.000 quitados |
| I-21b | Estado que muestra el gasto después de quitar el uso | FAIL ([C-3](#c-3--tras-quitar-el-uso-el-gasto-sigue-diciendo-pagado-con-una-meta--media)) | `i11-quitar-uso-detalle-390` |
| I-22 | Eliminar un gasto financiado: el aviso lo explica y los fondos vuelven (120.000 → 200.000) | PASS | `r2-i-eliminar-gasto-financiado-390` |
| I-23 | Bajar el gasto por debajo de lo financiado → «Primero quita el uso de la meta o usa menos.» | PASS | `r2-i-reducir-bajo-financiado-390` |
| I-24 | Quitar el uso de una meta personal y después mover a Pareja: se mueve y los fondos vuelven | PASS | `r2-i-no-se-puede-mover-390` |
| I-25a | Meta superada: excedente neutro y «Dar por lograda» manual | PASS | `i12-meta-superada-390` |
| I-25b | Texto de la meta personal superada | FAIL ([C-4](#c-4--meta-personal-superada-con-texto-de-pareja--baja)) | `i12-meta-superada-390` |
| I-26 | Archivar con fondos está bloqueado; sin fondos, «Meta archivada: queda de solo lectura con su historial.» | PASS | `i13-archivar-con-fondos-resultado-390` |
| I-27 | Archivar con una solicitud pendiente y saldo cero | NO PROBADO | No se puede aislar en la UI (una solicitud pendiente exige fondos). No encontré una prueba específica; `13_goals.test.sql` l.33 cubre «no archivar con fondos» |
| I-28 | US-22: la meta personal de A no le llega a B | PASS | [Matriz](#matriz-de-privacidad-f104-5) |

### J. Inicio, Análisis y DEC-G04

| # | Comprobación | Estado | Evidencia |
| --- | --- | --- | --- |
| J-1 | Inicio Nosotros: el héroe es el gasto; «Apartado para metas» aparte | PASS | `m1-inicio-nosotros-1440` |
| J-2 | Análisis Yo, ronda 1: 605.000 + 670.000 − 170.000 − 180.000 = 925.000 | PASS | `j2-analisis-yo-390`; [anexo A](#anexo-a--movimientos-de-la-corrida) |
| J-3 | Análisis Nosotros, ronda 1: 890.000 + 500.000 − 0 − 200.000 = 1.190.000 | PASS | `j2-analisis-nosotros-390` |
| J-4 | Análisis Nosotros, estado final: 1.271.001 + 560.000 − 90.000 − 280.000 = 1.461.001, calculado a mano antes de mirarlo | PASS | Anexo A |
| J-5 | «Destinado neto» solo en Análisis; nunca «te alcanza», «total gastado» ni «presupuesto $0» (12 pantallas) | PASS | — |
| J-6 | Actividad en Yo frente a Inicio en Yo | FAIL ([C-2](#c-2--actividad-e-inicio-en-yo-muestran-dos-cifras-de-gasto-del-mes--media)) | `c8-actividad-yo-beto-390` |
| J-7 | Copy del resumen de Actividad en los dos contextos | FAIL ([C-5](#c-5--gasto-noviembre-frente-a-gasto-de-noviembre--baja)) | `m2-actividad-tabla-panel-1440` |

### K. Exportación

| # | Comprobación | Estado | Evidencia |
| --- | --- | --- | --- |
| K-1 | La hoja dice qué incluye, qué no y que no sirve para restaurar | PASS | `k1-exportar-hoja-390` |
| K-2 | JSON y CSV de las dos cuentas descargan con los mismos recuentos por tipo; importes como texto en unidades menores; 0 UUID | PASS | [Comprobaciones verificables](#comprobaciones-verificables-f104-9) |
| K-3 | El export de cada uno no tiene nada privado del otro; no incluye eliminados ni deshechos | PASS | Ídem |

### L. Privacidad entre los dos

| # | Comprobación | Estado | Evidencia |
| --- | --- | --- | --- |
| L-1 | B busca en Actividad textos privados de A → «Nada coincide» | PASS | `l1-beto-busca-privado-ana-390` |
| L-2 | Matriz actor × contexto × ruta × canal: 240 peticiones, 0 fugas | PASS | [Matriz](#matriz-de-privacidad-f104-5) |
| L-3 | En Nosotros, ninguno recibe sus propios privados (003 FR-037–041) | PASS | Ídem |
| L-4 | El selector de metas de Anotar en Nosotros no consulta metas personales (004 FR-085) | PASS | Ídem |
| L-5 | Exportes cruzados limpios | PASS | K-3 |

### M. Escritorio y accesibilidad (revisión, no barrido)

| # | Comprobación | Estado | Evidencia |
| --- | --- | --- | --- |
| M-1 | Sin scroll horizontal: 8 rutas × Yo/Nosotros × 390 y 1440 = 32 combinaciones, `scrollWidth` = ancho en todas | PASS | — |
| M-2 | 1440: sidebar con selector, Balance como destino, perfil al pie | PASS | `m3-balance-destino-1440` |
| M-3 | 1440: Actividad en tabla con «Pagó · Reparto» y panel | PASS | `m2-actividad-tabla-panel-1440` |
| M-4 | 1440: Anotar como diálogo, también con N; anotar y guardar | PASS | `m7-anotar-dialogo-1440`, `r2-m-anotar-guardado-1440` |
| M-5 | 1440: liquidar (375.500 tras 10.000) y aportar (Viaje 180.000 → 190.000) | PASS | `r2-m-liquidar-hoja-1440`, `r2-m-balance-tras-liquidar-1440`, `r2-m-aporte-dialogo-1440`, `r2-m-meta-tras-aporte-1440` |
| M-6 | 1440: Metas, Plan y Análisis con composición de escritorio | PASS | `m4-metas-nosotros-1440`, `m4-metas-yo-1440`, `m5-plan-nosotros-1440` |
| M-7 | Movimiento reducido en el cambio Yo → Nosotros: `getAnimations()` en curso = 0 a los 120 ms y a la hoja de Anotar; anuncio «Ahora ves: Nosotros» | PASS | `n1-reduced-motion-cambio-nosotros-390` |
| M-8 | 360, 430, 768 y 1024 px; texto al 200 %; teclado completo; resto de movimiento reducido | NO PROBADO | Barrido `@sweep` y evidencia de la 005 (`specs/005-gate-mvp-1/evidence.md`) |

### N. Fuera del recorrido de usuario

| # | Comprobación | Estado | Evidencia |
| --- | --- | --- | --- |
| N-1 | US-12, mediana < 10 s en teléfono real (V7) | BLOQUEADO | Necesita a una persona con su teléfono |
| N-2 | iPhone: F02, teclado y safe areas, VoiceOver y back-swipe (V1, V4, V5, V6) | BLOQUEADO | Necesita un dispositivo real |
| N-3 | Borrado manual de cuenta | NO PROBADO | Fuera del recorrido de usuario, con evidencia administrativa en 005-T039 (`contracts/account-deletion.md`). La nota de la app pasa (B-4) |
| N-4 | Red lenta, errores de red y listas largas | NO PROBADO | `tests/evidence/release-long-lists.capture.ts`; capturas de 005-T027 y T054 |

## Hallazgos (FAIL)

Ninguno afecta a los cálculos ni a la visibilidad de los datos. Son siete, de presentación o de copy.

### C-1 · El saldo anterior tachado aparece bajo la dirección nueva — media

- **Pasos.** Con «Beto le debe a Ana $115.000», B anota Arriendo 400.000, pagó Beto, 50/50. Mirar Inicio en Nosotros.
- **Esperado.** O no se muestra el valor anterior cuando cambia la dirección, o se muestra con su propia dirección.
- **Obtenido.** «Ana le debe a Beto ~~$115.000~~ $85.000», que se lee como si Ana hubiera debido 115.000.
- **Captura.** `e6-inicio-nosotros-beto-390`.

### C-2 · Actividad e Inicio en Yo muestran dos cifras de gasto del mes — media

Es una **inconsistencia semántica de información financiera**, no un incumplimiento demostrado de la spec.

- **Lo que dice la spec.** 003 FR-045 exige el consumo personal completo (privados más la parte compartida) en Inicio
  en Yo, y FR-046 regula Actividad en Nosotros. **No hay una orden explícita sobre Actividad en Yo.**
- **Cifras de la misma persona, el mismo mes y el mismo estado de los datos (B, noviembre, ronda 1).**
  - Inicio en Yo: «En noviembre gastaste $472.000» = 37.000 privados + 435.000 de parte compartida.
  - Actividad en Yo: «Gasto de noviembre $37.000», un movimiento. Buscar un compartido en Yo da «Nada coincide».
- **Decisión pendiente para los fundadores.** Actividad en Yo puede ser el historial privado o el consumo personal
  completo. Si es lo primero, la pantalla debería decirlo; si es lo segundo, faltan las filas «tu parte».
- **Captura.** `c8-actividad-yo-beto-390`.

### C-3 · Tras «Quitar el uso», el gasto sigue diciendo «Pagado con una meta» — media

- **Pasos.** A anota la cena de 60.000 con la meta Viaje y pide 30.000 a B. B rechaza. A pulsa «Quitar el uso de la
  meta».
- **Esperado.** 004 US8.2 (`spec.md` l.422): el gasto queda como «Dinero del mes».
- **Obtenido.**
  - La restitución es correcta: la meta pasa de 270.000 a 300.000, y `gasto_financiado_con_meta` de Nosotros excluye
    esos 30.000 (J-4).
  - El detalle, en cambio, sigue mostrando «Pagado con una meta · Viaje ficticio» y la tarjeta «BETO NO APROBÓ… Solo
    cuentan los fondos ya usados», también al recargar.
  - Con una meta personal y sin solicitud (I-24), el detalle sí queda limpio.
- **Captura.** `i11-quitar-uso-detalle-390`.

### C-4 · Meta personal superada con texto de pareja — baja

- **Pasos.** Meta personal de 100.000 con un aporte de 120.000.
- **Obtenido.** «Lo lograste · Cuando quieran, pueden darla por lograda.»
- **Esperado.** El singular: «Cuando quieras, puedes darla por lograda.»
- **Captura.** `i12-meta-superada-390`.

### C-5 · «Gasto noviembre» frente a «Gasto de noviembre» — baja

En Nosotros falta «de». Capturas `m2-actividad-tabla-panel-1440` y `c8-actividad-yo-beto-390`.

### C-6 · La solicitud cancelada se sigue leyendo como pendiente — media

- **Pasos.**
  1. A anota «R2 solicitud a cancelar», 40.000 con la meta Viaje, 20.000 de cada uno, y pide los 20.000 de B.
  2. A pulsa «Cancelar solicitud» en Actividad.
- **Esperado.** La tarjeta muestra el estado cancelado, como «BETO NO APROBÓ» en el rechazo (ConfirmationBadge).
- **Obtenido.**
  - Lo funcional es correcto: la solicitud sale de Actividad y del Inicio de B, y la meta conserva solo el uso de A.
  - Pero el detalle del gasto mantiene la tarjeta «Viaje ficticio · Pides $20.000 de los aportes de Beto», sin
    ninguna etiqueta de estado.
  - Además, la cancelación no pidió confirmación (S-4).
- **Captura.** `r2-i-solicitud-cancelada-390`.

### C-7 · Aprobar sin fondos suficientes: vista previa engañosa y error genérico — baja

- **Pasos.**
  1. A pide 30.000 de B en «R2 aprobar tras retiro».
  2. B retira 90.000 y se queda con 10.000 disponibles; lo pendiente no reserva fondos.
  3. B pulsa Aprobar.
- **Esperado.** 004 US7.9: «Tus aportes cambiaron: ahora tienes $10.000 en Viaje ficticio», y nada cambia.
- **Obtenido.**
  - Nada cambia: la meta y el saldo siguen igual.
  - Pero, antes de aprobar, la tarjeta dice «Tu disponible en Viaje ficticio: $10.000 → $0», como si cupiera.
  - El error es genérico: «Revisa los fondos: deben sumar el uso y estar disponibles por aportante. · Revisar».
- **Capturas.** `r2-i-aprobar-sin-fondos-antes-390`, `r2-i-aprobar-sin-fondos-390`.

## Sugerencias de usabilidad (no son fallos)

- **S-1 · El registro borra la contraseña escrita** tras un error de validación, por ejemplo si no se confirmó el aviso.
- **S-2 · En la liquidación, el tope y la fecha futura se avisan al enviar.** Mientras tanto el botón sigue habilitado
  («Registrar $90.000») y la nota «Después de esto…» desaparece.
- **S-3 · Abrir por URL una meta personal desde Nosotros** muestra «No encontramos esta meta…». Es correcto por
  privacidad, pero podría ofrecer «Cambiar a Yo». Captura `i6-meta-otro-contexto-390`.
- **S-4 · «Rechazar» y «Cancelar solicitud» no piden confirmación**, y ninguna de las dos se puede deshacer.
- **S-5 · Balance en Yo** explica que el balance está en Nosotros, pero no trae un botón para cambiar.
- **S-6 · Cambiar de Yo a Nosotros tarda unos 1,3 s en mostrar los datos.** Es el mismo **F02** ya registrado (decisión
  24.4), no un hallazgo nuevo. Además, 1,3 s medidos en localhost contra una base remota en São Paulo no son una medición
  de Core Web Vitals ni de dispositivo.
- **S-7 · Desactivar un presupuesto no pide confirmación.** Es reversible y conserva el historial.
- **S-8 · La exportación no atribuye los usos de meta compartida por aportante.** En `goal_entries`, los usos tienen
  `person` vacío. Con la exportación sola no se puede rehacer la parte de `gasto_financiado_con_meta` que corresponde a
  cada uno.

## Matriz de privacidad (F104-5)

**Método.**

- **Quién pide.** Cada usuario, con su propia sesión, pide cada ruta en los dos contextos (cookie `juntia_context`
  `me` o `us`) por tres canales: HTML, RSC (`RSC: 1`) y RSC de prefetch (`RSC: 1` + `Next-Router-Prefetch: 1`),
  siguiendo la redirección de `_rsc` de Next 16.4.
- **Qué se busca.** En el cuerpo de cada respuesta, cuatro marcas de cada dato privado: descripción, importe formateado,
  importe en unidades menores e id. Los datos son privados creados con cifras únicas:
  - Ana: un gasto `ZqPrivAna` de 13.579 y la meta `ZqMetaAna` (objetivo 7.531.000, aporte 86.420).
  - Beto: un gasto `ZqPrivBeto` de 24.681.
- **Rutas.** `/`, `/actividad?mes=2026-11`, `/actividad?mes=2027-01`, `/metas`, `/plan`, `/plan/analisis`, `/balance`,
  `/cuenta/privacidad`, el detalle del gasto privado del otro y el detalle de la meta privada de Ana.

| Actor | Peticiones | Respuestas | Fugas de lo privado del otro | Lo propio en Nosotros | Control positivo (lo propio en Yo) |
| --- | ---: | --- | ---: | ---: | --- |
| Ana | 60 | 20 HTML, 20 RSC y 20 de prefetch, todas 200 con su tipo correcto | 0 | 0 | Aparece en 11 respuestas (HTML, RSC y prefetch) |
| Beto | 60 | Ídem | 0 | 0 | Aparece en 10 respuestas (HTML y RSC) |

**Ids que vuelven en la ruta pedida.** Al pedir `/actividad/<id privado del otro>` o `/metas/<id de la meta de Ana>`, el
HTML contiene ese id porque está en la propia URL pedida. La respuesta no contiene la descripción, el importe ni las
unidades menores, y la página dice «No encontramos…». No se cuenta como fuga.

**Selector de metas en Anotar desde Nosotros (FR-085).**

- Se cambió a Nosotros con el selector de la UI, se abrió Anotar y se eligió «Con una meta», interceptando todas las
  respuestas de `localhost`.
- El diálogo solo lista «Viaje ficticio · Saldo $180.000».
- Ni el DOM ni la única petición (un POST de 442 B) contienen el nombre, el id ni las cifras de las metas personales de
  Ana.

Observación: si la cookie dice `us` pero la UI quedó en Yo, el diálogo se abre en Yo y lista las metas personales de la
propia Ana. Es su propio dato y en el contexto que se ve, así que no es una fuga.

**Búsqueda y exportación.** L-1 y K-3.

**Lo que no se inspeccionó.** Las rutas de Mi cuenta distintas de Privacidad, las respuestas de las acciones de
escritura y la cuenta de un tercero ajeno a la pareja. Esas capas las cubren el pgTAP de RLS
(`supabase/tests/03_views.test.sql`, `13a_goal_tables.test.sql`) y las pruebas de prefetch de las specs E2E 3, 4 y 5
(`tests/support/rsc-capture.ts`, `tests/e2e/access-account.e2e.ts` «Nosotros no lleva datos privados…»).

## Comprobaciones verificables (F104-9)

| Fila | Resultado verificable |
| --- | --- |
| A-1 | Lectura de Auth en juntia-dev: 0 de 1.590 usuarios con `corrida-noperm-x7@seed.test` ni con `noexiste-corrida-91@seed.test`. Que no se envió correo es A-2, NO PROBADO |
| C-10 | Buscar «Doble toque» en Actividad tras el doble toque → «1 movimiento coincide» |
| E-11 | Texto del botón antes de guardar: «Reparto: Pagó Beto · 50/50 . Ana y Beto» |
| G-5 | Saldo 85.000 → (35.000) → 50.000 → Deshacer → 85.000 → (35.000) → 50.000. Historial: «Ana → Beto · Anulada · $35.000» y «Ana → Beto · Liquidado · $35.000» |
| I-20 | Disponible de B 60.000 → 30.000; una sola fila «Uso · R2 aprobar tras retiro» nueva; saldo 360.000 antes y después |
| I-26 | Tras retirar 120.000: «Meta archivada: queda de solo lectura con su historial.» y la meta en «Archivadas» con $0 |
| K-2 | Ana: JSON y CSV con 21 movimientos, 2 liquidaciones, 4 metas, 20 entradas de meta, 4 solicitudes y 5 presupuestos (56 filas). Beto: 17, 2, 1, 11, 4 y 4 (39 filas). JSON = CSV en las dos cuentas. 40 columnas en el CSV. 0 UUID |
| K-3 | Buscando 13 marcas: Ana contiene sus privados y ninguno de Beto; Beto contiene «Farmacia privada» y «ZqPrivBeto», y nada de Ana. No aparecen «Almuerzo», «Cine para deshacer» ni «Taxi solo de Beto» (eliminados o deshechos). «Casco» solo aparece como uso anulado de la meta propia de Ana |
| F-5, I-28, L-2 | Matriz: 240 peticiones, 0 fugas |
| M-1 | `scrollWidth` = ancho del viewport en las 32 combinaciones (390/390 y 1440/1440) |
| M-7 | `prefers-reduced-motion: reduce` = true; `document.getAnimations()` en curso = 0 a los 120 ms del cambio y con la hoja de Anotar abierta; región viva «Ahora ves: Nosotros» |
| Saldo final | Desde la exportación de Ana: 1.011.001 pagado − 660.501 de parte + 35.000 enviado − 10.000 recibido = **375.500** a favor de Ana, igual a lo que muestra Balance |

## Anexo A · Movimientos de la corrida

Los datos salen de la exportación de usuario del estado final y del registro de la corrida para lo que la exportación no
guarda: eliminados, deshechos, ediciones y liquidaciones anuladas. Importes en pesos. **Saldo positivo: Beto le debe a
Ana.**

### A.1 · Gastos compartidos, liquidaciones y saldo, en orden

| # | Movimiento | Total | Pagó | Parte Ana / Beto | Efecto | Saldo |
| ---: | --- | ---: | --- | --- | ---: | ---: |
| 1 | Cena ficticia | 180.000 | Ana | 90.000 / 90.000 | +90.000 | 90.000 |
| 2 | Mercado 70/30 | 150.000 | Ana | 105.000 / 45.000 | +45.000 | 135.000 |
| 3 | Internet pagado por Beto | 120.000 | Beto | 50.000 / 70.000 | −50.000 | 85.000 |
| 4 | Taxi solo de Beto (eliminado en el n.º 14) | 30.000 | Ana | 0 / 30.000 | +30.000 | 115.000 |
| 5 | Arriendo ficticio (editado en el n.º 9) | 400.000 | Beto | 200.000 / 200.000 | −200.000 | −85.000 |
| 6 | Liquidación Ana → Beto, **deshecha** | 35.000 | — | — | +35.000 y luego −35.000 | −85.000 |
| 7 | Liquidación Ana → Beto | 35.000 | — | — | +35.000 | −50.000 |
| 8 | Liquidación Ana → Beto, registrada por Beto (anulada en el n.º 10) | 50.000 | — | — | +50.000 | 0 |
| 9 | Edición de Arriendo 400.000 → 100.000 (por Ana) | 100.000 | Beto | 50.000 / 50.000 | +150.000 | 150.000 |
| 10 | Anulación de la liquidación del n.º 8 | — | — | — | −50.000 | 100.000 |
| 11 | Regalo para mover (de Yo a Nosotros) | 60.000 | Ana | 30.000 / 30.000 | +30.000 | 130.000 |
| 12 | Entrada para mover (de Yo a Nosotros) | 20.000 | Ana | 10.000 / 10.000 | +10.000 | 140.000 |
| 13 | Helado: se movió y se deshizo | 15.000 | Ana | — | 0 | 140.000 |
| 14 | Eliminación de «Taxi solo de Beto» | — | — | — | −30.000 | 110.000 |
| 15 | Tiquetes con meta | 200.000 | Ana | 100.000 / 100.000 | +100.000 | 210.000 |
| 16 | Cena con meta rechazada | 60.000 | Ana | 30.000 / 30.000 | +30.000 | **240.000** (fin de la ronda 1) |
| 17 | R2 importe válido 30-60 | 90.000 | Ana | 30.000 / 60.000 | +60.000 | 300.000 |
| 18 | R2 cien mil uno | 100.001 | Ana | 50.001 / 50.000 | +50.000 | 350.000 |
| 19 | R2 pagó Beto, solo Ana | 40.000 | Beto | 40.000 / 0 | −40.000 | 310.000 |
| 20 | R2 solicitud a cancelar | 40.000 | Ana | 20.000 / 20.000 | +20.000 | 330.000 |
| 21 | R2 aprobar tras retiro | 60.000 | Ana | 30.000 / 30.000 | +30.000 | 360.000 |
| 22 | R2 personal con meta, luego movido | 30.000 | Ana | 15.000 / 15.000 | +15.000 | 375.000 |
| 23 | R2 escritorio anotar | 21.000 | Ana | 10.500 / 10.500 | +10.500 | 385.500 |
| 24 | Liquidación Beto → Ana | 10.000 | — | — | −10.000 | **375.500** (final) |

### A.2 · Metas: aportes, retiros y usos por aportante

| Meta | Movimiento | Ana | Beto | Estado |
| --- | --- | ---: | ---: | --- |
| Bicicleta ficticia (personal de Ana) | Aporte | 250.000 | — | activo |
| | Aporte | 50.000 | — | deshecho |
| | Aporte | 100.000 | — | anulado |
| | Retiro «Reasignar a otra cosa» | 50.000 | — | activo |
| | Uso «Casco pagado con meta» (gasto privado) | 80.000 | — | activo en la ronda 1; anulado al eliminar el gasto en la ronda 2 |
| | Uso «R2 personal con meta» | 30.000 | — | uso quitado |
| Meta para archivar (personal de Ana) | Aporte / retiro «Cierre de prueba» | 120.000 / 120.000 | — | activos; meta archivada |
| ZqMetaAna (personal de Ana, ronda 2) | Aporte | 86.420 | — | activo |
| Viaje ficticio (compartida) | Aportes | 300.000 + 10.000 | 200.000 + 50.000 | activos |
| | Retiro «R2 bajar fondos» | — | 90.000 | activo |
| | Uso Tiquetes (reparto 100.000 / 100.000) | 100.000 | 100.000 | el de Beto, aprobado |
| | Uso Cena rechazada (reparto 30.000 / 30.000) | 30.000 | 30.000 pedidos | rechazado; el uso de Ana se quitó después |
| | Uso «R2 solicitud a cancelar» (20.000 / 20.000) | 20.000 | 20.000 pedidos | cancelado; el uso de Ana sigue |
| | Uso «R2 aprobar tras retiro» (30.000 / 30.000) | 30.000 | 30.000 | aprobado al segundo intento |

### A.3 · DEC-G04 a partir de estos datos

| Vista | Gasto | + Aportes | − Retiros | − Financiado con meta | = Destinado neto |
| --- | ---: | ---: | ---: | ---: | ---: |
| Yo de Ana, fin de la ronda 1 | 605.000 = privados 140.000 (Taxi 45.000 + Helado 15.000 + Casco 80.000) + partes 465.000 (filas 1, 2, 3, 9, 11, 12, 15 y 16) | 670.000 (250.000 + 300.000 + 120.000) | 170.000 (50.000 + 120.000) | 180.000 (Casco 80.000 + Tiquetes 100.000 de Ana) | **925.000** |
| Nosotros, fin de la ronda 1 | 890.000 (filas 1, 2, 3, 9, 11, 12, 15 y 16) | 500.000 | 0 | 200.000 (Tiquetes) | **1.190.000** |
| Nosotros, final | 1.271.001 (+ filas 17–23) | 560.000 | 90.000 | 280.000 (Tiquetes 200.000 + R2 cancelar 20.000 + R2 aprobar 60.000) | **1.461.001** |

La cifra de Yo de la ronda 1 ya no se reproduce hoy en la app, porque en la ronda 2 se eliminó el gasto «Casco»; se
documenta tal como se midió.

## Anexo B · Privacidad de las capturas

Un subagente de revisión abrió una por una las 108 capturas: las 92 de la ronda 1 en una pasada y las 16 `r2-` en otra.
El agente de la corrida vio además, durante el trabajo, unas 25 de ellas. En ninguna aparecen:

- contraseñas, claves, tokens completos de invitación o recuperación, JWT ni cookies;
- correos que no sean `@seed.test`;
- datos reales;
- la referencia del proyecto dev;
- otras ventanas o el escritorio.

Las capturas de invitación (`d2-invitacion-creada-390`, `d3-enlace-nuevo-390`) muestran un prefijo truncado del enlace
(`#t=Wyo…`, `#t=jzut5…`); esos tokens están anulados, reemplazados o usados. El informe no contiene la referencia del
proyecto dev.

## Qué cubre esta corrida y qué se acredita en otro sitio

| Tema | Esta corrida | Dónde se acredita |
| --- | --- | --- |
| Uso de pareja de punta a punta con datos ficticios, 390 y 1440 | Sí | Este informe |
| CI sobre el commit candidato (`app`, `db`, `e2e`, `a11y-session`, `@sweep`, `release`) | No | `release-checklist.md` §1, con los run del candidato |
| Dispositivo real (iPhone, VoiceOver, teclado, US-12) | No | `contracts/human-verifications.md`, V1–V7 |
| Copia, restauración y vuelta atrás | No | `release-checklist.md` §4 y §5 |
| Borrado manual de cuenta | Fuera del recorrido de usuario | Evidencia administrativa en 005-T039 (`contracts/account-deletion.md`) |
| Declaración de MVP-1 | No | Aprobación humana de los fundadores (`release-checklist.md`, «Firmas») |

**Lo que este informe no afirma.** No declara que el gate haya cambiado. Los fundadores decidieron delegar esta corrida
y aplazar el uso real; el registro de ese cambio del gate queda pendiente en el maestro.

Los datos de la corrida siguen en juntia-dev hasta el próximo `db:dev:reset`. Las dos cuentas de Auth se conservan.
