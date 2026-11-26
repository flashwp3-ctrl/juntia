# Corrida completa de MVP-1 con dos cuentas de prueba — 005

**Qué es.** Los fundadores decidieron que la corrida completa de MVP-1 la hiciera un agente con dos cuentas de prueba
que forman pareja, en lugar de hacerla ellos a mano. Esta corrida recorre el escenario de pareja del maestro §4 y lo
que entra en MVP-1 según las specs 002, 003 y 004, a 390 y 1440 px. Es una **verificación de uso**, no evidencia de CI
ni de dispositivo real. Solo se probó, no se corrigió nada: durante el gate no hay código, migraciones ni despliegues.

**Resultado en una línea.** Ningún fallo de dinero ni de privacidad. Todas las cifras cuadran a mano con §5.1 y DEC-G04.
Hay cinco hallazgos (dos medios y tres bajos, todos de presentación o copy) y siete sugerencias de usabilidad. Seis
puntos quedan BLOQUEADOS porque necesitan correo real, un teléfono real o una operación administrativa.

## Entorno

| Dato | Valor |
| --- | --- |
| Fecha | 25 de noviembre de 2026, 19:10–20:30 (America/Bogota) |
| Commit probado | `b2f2f907f996e218b38398854bcc5c68c8d4b20b` (`main`, merge del PR #102), sin cambios locales |
| App | `next build` + `next start` (build de producción) en `http://localhost:3400` |
| Base de datos y Auth | **juntia-dev** (`itfrhnadovezpahikuol`). Producción no se tocó |
| Cuentas | Dos cuentas nuevas `corrida-ana-…@seed.test` y `corrida-beto-…@seed.test`, creadas ya verificadas con la API de administración, con el mismo mecanismo de `tests/support/admin-user.ts` (no hizo falta tocar la lista permitida). Credenciales solo en `.env.corrida.local`, ignorado por git |
| Datos | Solo ficticios («Taxi ficticio», «Arriendo ficticio», «Viaje ficticio»…) |
| Navegadores | Chromium de Playwright (`playwright-cli` 0.1.23), una sesión aislada por cuenta, para las acciones y las capturas `.png`. Navegador integrado de Claude (Chromium) para la revisión visual de Ana a 1440 y 390 px y para el «otro dispositivo» del tema |
| Configuración de Auth | Sin cambios en ningún proyecto. No se envió ningún correo |

**Por qué dos navegadores.** Cada cuenta necesita su propia sesión a la vez, y el navegador integrado comparte cookies
entre pestañas. Además, el navegador integrado no guarda capturas en archivo. Por eso las acciones y las capturas del
repositorio salen de Playwright, y el navegador integrado sirvió para mirar la app como la ve una persona.

**Cómo entró Ana en el navegador integrado.** Pegar desde el portapapeles no funciona en ese panel, y escribir la
contraseña la habría dejado en el chat. Se generó con la API de administración un enlace de recuperación de un solo uso,
sin enviar correo, y se abrió en el panel. El enlace llevó a «Crea una contraseña nueva» con sesión abierta y desde ahí
a Inicio. Así se probó además la ruta `/auth/confirm` de recuperación (A-7).

**Capturas.** 92 PNG en [`evidence/corrida-completa/`](evidence/corrida-completa/) (5,9 MB; la mayor, 165 KB). Las
de la invitación muestran un prefijo truncado del enlace; los tres tokens están anulados, reemplazados o usados.

## Lista de comprobación

Estados: **PASS**, **FAIL**, **BLOQUEADO** (con su motivo). Los anchos son 390 salvo que diga 1440. «A» es Ana
(propietaria) y «B» es Beto.

### A. Registro y acceso

| # | Comprobación | Resultado | Evidencia |
| --- | --- | --- | --- |
| A-1 | Registro con correo fuera de la lista permitida: «Verifica tu correo» con el texto neutro, sin cuenta ni correo | PASS | `a1-registro-no-permitido-390` |
| A-2 | Registro con correo permitido y verificación por enlace | BLOQUEADO: SMTP aplazado y los `@seed.test` no reciben correo. Las cuentas se crearon verificadas por la API de administración | — |
| A-3 | Contraseña incorrecta: «Correo o contraseña incorrectos.» sin decir cuál falló | PASS | `a2-contrasena-incorrecta-390` |
| A-4 | Primera entrada (A6) «Hola, Ana», sin pedir presupuesto; con P0-2 ofrece también «Invitar a mi pareja» | PASS | `a3-primera-entrada-390` |
| A-5 | Recuperar acceso: aviso uniforme con un correo sin cuenta | PASS | `a4-recuperar-uniforme-390` |
| A-6 | Cerrar sesión: «Cerraste sesión en este dispositivo.»; `/cuenta` lleva a Entrar y, al entrar, vuelve a `/cuenta` | PASS | `a5-sesion-cerrada-390` |
| A-7 | Enlace de recuperación abierto → «Crea una contraseña nueva» con sesión | PASS parcial: con enlace generado por administración, no recibido por correo. No se cambió la contraseña | — |
| A-8 | Cambiar contraseña desde Seguridad y sesión | BLOQUEADO: enviaría un correo (cupo de 2 por hora y SMTP aplazado). Solo se comprobó que la pantalla existe | `b1-mi-cuenta-390` |

### B. Mi cuenta y ajustes

| # | Comprobación | Resultado | Evidencia |
| --- | --- | --- | --- |
| B-1 | El avatar abre Mi cuenta, sin sexta pestaña; en escritorio, el perfil al pie del sidebar | PASS | `b1-mi-cuenta-390`, `m8-mi-cuenta-1440` |
| B-2 | Mi perfil: cambiar el nombre visible → «Perfil actualizado.»; correo bloqueado | PASS | `b2-perfil-guardado-390` |
| B-3 | Apariencia: Oscuro se guarda en perfil y cookie; en el otro navegador, sin cookie previa, la sesión nueva llega con `juntia_theme=dark` y pinta oscuro | PASS. El «sin destello» no se pudo aislar: el panel ya usa tema oscuro | `b3-apariencia-oscuro-390` |
| B-4 | Privacidad y datos: qué ve cada uno, exportar, y «Eliminar tu cuenta» como nota que explica cómo pedirlo | PASS | `b5-privacidad-390` |
| B-5 | Categorías: once de gasto más Ingresos, cuadrícula fija con «Otra» al final; presupuestos solo por categoría de gasto | PASS | `c3-anotar-privado-390`, `h3-limite-invalido-390` |

### C. Yo: movimientos privados

| # | Comprobación | Resultado | Evidencia |
| --- | --- | --- | --- |
| C-1 | Inicio sin movimientos: estado vacío, nunca «$0» | PASS | `c1-inicio-vacio-390` |
| C-2 | Nosotros sin pareja: «Todavía no disponible» con «Invitar a mi pareja» | PASS | `c2-nosotros-sin-pareja-390` |
| C-3 | Anotar gasto privado (US-01, 45.000 Transporte): sube el total, fila nueva y «Gasto guardado · Deshacer» | PASS | `c3-anotar-privado-390`, `c3-guardado-toast-390` |
| C-4 | Deshacer del aviso: el total de Yo pasa de 616.111 a 628.111 con el gasto y vuelve a 616.111 al deshacer; la fila desaparece | PASS | `c4-deshacer-aviso-390` |
| C-5 | Ingreso: «+$300.000», no cuenta en el gasto del mes | PASS | `f4-ingreso-sin-mover-390` |
| C-6 | Editar: monto 23.000 → 25.000, «con ediciones»; el tipo no se puede cambiar | PASS | `c6-detalle-privado-390` |
| C-7 | Eliminar con confirmación; Escape cancela y devuelve el foco; sale de totales y lista | PASS | `c7-eliminar-confirmar-390` |
| C-8 | Actividad: grupos por día, buscar, filtro por tipo y por categoría | PASS | `c8-actividad-buscar-390`, `c8-actividad-filtro-categoria-390` |
| C-9 | Fecha futura (enero 2027): permitida; las flechas llegan hasta enero y no más allá | PASS | `c9-actividad-mes-futuro-390` |
| C-10 | Doble toque en Guardar: un solo gasto | PASS | — |

### D. Pareja: invitar y aceptar

| # | Comprobación | Resultado | Evidencia |
| --- | --- | --- | --- |
| D-1 | Mi pareja sin pareja (M2) | PASS | `d1-mi-pareja-sin-pareja-390` |
| D-2 | Crear invitación (M3b): enlace de un solo uso, vence a los 7 días | PASS | `d2-invitacion-creada-390` |
| D-3 | Anular invitación con confirmación → vuelve a M2 | PASS | `d3-anular-confirmar-390` |
| D-4 | Generar enlace nuevo: el enlace cambia | PASS | `d3-enlace-nuevo-390` |
| D-5 | Enlace abierto sin sesión (M5): no muestra quién invita ni datos | PASS | `d4-invitacion-sin-sesion-390` |
| D-6 | B entra, pasa por su primera entrada y vuelve a la invitación (M6) | PASS | `d5-invitacion-m6-390` |
| D-7 | Enlace anulado y enlace reemplazado → «Esta invitación ya no sirve» (M7) | PASS | `d6-enlace-anulado-m7-390` |
| D-8 | B acepta → los dos ven ACTIVA, «2 de 2 integrantes» | PASS | `d5-aceptada-390` |
| D-9 | Reabrir el enlace ya usado → M7 | PASS | — |
| D-10 | «Salir de la pareja» es solo una nota | PASS | `d5-aceptada-390` |
| D-11 | Un tercero no entra | PASS parcial: la pareja está completa y no ofrece invitar; no se creó una tercera cuenta | `d5-aceptada-390` |

### E. Gastos compartidos (Anotar en Nosotros)

| # | Comprobación | Resultado | Evidencia |
| --- | --- | --- | --- |
| E-1 | US-02: cena de 180.000, pagó Ana, 50/50 → «Beto le debe a Ana $90.000» | PASS | `e1-anotar-nosotros-390`, `e1-guardado-nosotros-390` |
| E-2 | US-03: 150.000 al 70/30 → 105.000 y 45.000 exactos | PASS | `e2-reparto-70-30-390`, `e2-detalle-70-30-390` |
| E-3 | Porcentaje que no suma: «Sobran $30.000 (20 %)» y Guardar deshabilitado | PASS | `e3-porcentaje-falta-390` |
| E-4 | Importe que no suma: «Faltan $10.000 por asignar» | PASS | `e3-importe-faltan-390` |
| E-5 | Pagador = el otro integrante (pagó Beto) | PASS | `e3-importe-faltan-390` |
| E-6 | Un solo participante: «Beto asume el 100 %» | PASS | `e4-un-participante-390` |
| E-7 | B anota: pagador por defecto = quien anota; 50/50 la primera vez | PASS | `e6-inicio-nosotros-beto-390` |
| E-8 | Inicio en Nosotros: total, «En qué se fue» y saldo | PASS (con C-1) | `e6-inicio-nosotros-beto-390` |
| E-9 | Yo con parte compartida: 490.000 = 45.000 propios + 445.000 de parte | PASS | `e7-inicio-yo-ana-390` |
| E-10 | Editar un gasto de B desde A: aviso de recálculo; B ve «Editado por Ana» | PASS | `e8-editar-compartido-390` |
| E-11 | Eliminar un gasto compartido: el aviso dice que el otro lo verá; el saldo baja | PASS | — |
| E-12 | Edición simultánea de los dos: la segunda falla con «Este gasto cambió en otro lugar…» | PASS | `e11-edicion-concurrente-390` |
| E-13 | Ingreso desde Nosotros: queda «Solo tú» | PASS | `e10-ingreso-en-nosotros-390` |

### F. Mover a Pareja y Deshacer

| # | Comprobación | Resultado | Evidencia |
| --- | --- | --- | --- |
| F-1 | Botón «Mover a Pareja» en el detalle de un gasto privado; un ingreso no lo tiene | PASS | `f1-detalle-con-mover-390`, `f4-ingreso-sin-mover-390` |
| F-2 | Importe y pagador fijos; ChangePreview con cifras antes y después, correctas | PASS | `f1-mover-a3-preview-390` |
| F-3 | Confirmar → «Movido a Pareja. Beto ahora le debe $140.000 a Ana.» con Deshacer durante unos 6 s; la fila dice «movido desde Yo» | PASS | `f3-toast-deshacer-390` |
| F-4 | Deshacer → «Volvió a Yo.»; sale de Nosotros y vuelve a Yo | PASS | `f3-tras-deshacer-390` |
| F-5 | B no ve el privado anulado ni el devuelto (HTML de Inicio, Actividad y Balance en Yo y Nosotros) | PASS | — |
| F-6 | Gasto pagado con meta: el detalle no ofrece Mover a Pareja | PASS | — |

### G. Balance y liquidaciones

| # | Comprobación | Resultado | Evidencia |
| --- | --- | --- | --- |
| G-1 | Balance: «Pagó X · le corresponden Y» por persona y desglose del mes; cifras correctas | PASS | `g1-balance-390` |
| G-2 | Hoja de liquidación: dirección fija, saldo pendiente, Todo/Otro, «Juntia no mueve dinero» | PASS | `g2-hoja-liquidacion-390` |
| G-3 | Importe mayor que el saldo → «Puedes registrar hasta $85.000.» | PASS (ver S-2) | `g3-liquidacion-mayor-resultado-390` |
| G-4 | Fecha futura → «Elige una fecha de hoy o pasada.» | PASS (ver S-2) | `g4-fecha-futura-resultado-390` |
| G-5 | Parcial de 35.000 y Deshacer → queda «Anulada» en el historial y el saldo vuelve | PASS | `g2-balance-tras-parcial-390` |
| G-6 | Liquidación completa registrada por B → «Al día», LIQUIDADO | PASS | `g5-balance-al-dia-390` |
| G-7 | Anular una liquidación desde su detalle: confirmación, ANULADA con autor; el saldo se reabre | PASS | `g7-detalle-liquidacion-390` |
| G-8 | US-10: corregir un gasto ya liquidado invierte el saldo (Beto le debe 150.000) sin tocar las liquidaciones | PASS | `g8-saldo-invertido-390` |
| G-9 | Balance en Yo explica que está en Nosotros | PASS | `g0-balance-en-yo-390` |
| G-10 | Metas y aportes no cambian el saldo (US-19) | PASS | — |

### H. Plan y presupuestos

| # | Comprobación | Resultado | Evidencia |
| --- | --- | --- | --- |
| H-1 | Sin presupuesto: «$X · sin presupuesto · Crear», nunca límite 0 | PASS | `h1-plan-sin-presupuesto-390` |
| H-2 | Límite 0 o mayor que 999.999.999 → no se guarda y explica el rango | PASS | `h3-limite-invalido-390` |
| H-3 | Crear en Nosotros: «Se pasaron por $30.000 · 120 % · EXCEDIDO» y «Quedan $10.000 · 93 % · CERCA DEL LÍMITE» | PASS | `h4-plan-presupuestos-390` |
| H-4 | Sin duplicados: «Crear presupuesto» solo ofrece categorías sin presupuesto | PASS | — |
| H-5 | Editar con historial (autor, de/a) | PASS | `h6-conflicto-presupuesto-390` |
| H-6 | Conflicto: B guarda con versión antigua → «Ana cambió este presupuesto. Ahora el límite es $200.000.», sin sobrescribir | PASS | `h6-conflicto-presupuesto-390` |
| H-7 | Desactivar: el gasto sigue y no aparece ningún límite cero | PASS | `h7-desactivado-390` |
| H-8 | Presupuesto personal de A en Yo: invisible para B en Yo y en Nosotros | PASS | `h8-presupuesto-personal-ana-390` |

### I. Metas

| # | Comprobación | Resultado | Evidencia |
| --- | --- | --- | --- |
| I-1 | Metas vacía: «Todavía no tienes metas» | PASS | `i1-metas-vacia-yo-390` |
| I-2 | Meta personal con fecha: «Estimación · Faltan … al mes» | PASS | `i2-meta-privada-creada-390` |
| I-3 | US-18: aporte de 250.000 → 12 %; el gasto de Yo no cambia; «Apartaste … para metas» aparte | PASS | `i4-meta-privada-con-aporte-390` |
| I-4 | Aporte con fecha futura rechazado | PASS | — |
| I-5 | Meta compartida; US-19: A 300.000 «Apartado en Juntia» + B 200.000 «Transferencia declarada» = 50 %, con autor | PASS | `i4-meta-compartida-aportes-beto-390` |
| I-6 | Metas · Yo de B: compartidas aparte con «Tu disponible» | PASS | `i5-metas-yo-beto-tu-disponible-390` |
| I-7 | Deshacer un aporte (DESHECHO) y anular otro con confirmación (ANULADO) | PASS | `i6-aporte-toast-390`, `i6-aporte-anulado-390` |
| I-8 | Retiro con motivo: «Retiro de la meta» en el historial; «Tu disponible · aportaste» | PASS | — |
| I-9 | Retiro mayor que lo disponible → «Puedes retirar hasta $250.000» | PASS | `i8-retiro-mayor-390` |
| I-10 | En meta compartida solo se retira lo propio («Solo se retira de tus propios aportes», tope 200.000) | PASS | — |
| I-11 | Gasto con meta personal en Yo: solo metas personales elegibles; meta 200.000 → 120.000 y el gasto cuenta | PASS | `i9-b2-meta-elegida-390` |
| I-12 | Gasto con meta compartida: FundingLedger (reparto ≠ fondos), «Registrar y pedir a Beto», PENDIENTE «No vence» | PASS | `i10-b2-fundingledger-390`, `i10-b4-pendiente-actividad-390` |
| I-13 | B ve la solicitud en Inicio con «Tu disponible … $200.000 → $100.000» y aprueba → la meta baja a 300.000 | PASS | `i10-b5-solicitud-inicio-beto-390` |
| I-14 | B rechaza otra: el gasto sigue y solo cuentan los fondos de A; «BETO NO APROBÓ» | PASS | `i10-b7-rechazada-detalle-390` |
| I-15 | Quitar el uso de la meta: los fondos vuelven (meta 270.000 → 300.000) | PASS (con C-3) | `i11-quitar-uso-detalle-390` |
| I-16 | Meta superada: «Lo lograste» y excedente neutro; «Dar por lograda» manual | PASS (con C-4) | `i12-meta-superada-390` |
| I-17 | Archivar con fondos → bloqueado con explicación; sin fondos → archivada, solo lectura | PASS | `i13-archivar-con-fondos-resultado-390` |
| I-18 | US-22: B no ve la meta personal de A ni sus aportes (HTML de cinco rutas en Yo y Nosotros) | PASS | — |

### J. Inicio, Análisis y DEC-G04

| # | Comprobación | Resultado | Evidencia |
| --- | --- | --- | --- |
| J-1 | Inicio Nosotros: el héroe es el gasto y «Apartado para metas $500.000 · no se suman» va aparte | PASS | `m1-inicio-nosotros-1440` |
| J-2 | Análisis Yo: gasto 605.000, aportes 670.000, destinado neto 925.000 (= 605 + 670 − 170 − 180, comprobado a mano) | PASS | `j2-analisis-yo-390` |
| J-3 | Análisis Nosotros: 890.000 + 500.000 − 0 − 200.000 = 1.190.000; aportes por persona | PASS | `j2-analisis-nosotros-390`, `m6-analisis-nosotros-1440` |
| J-4 | «Destinado neto» solo en Análisis; nunca «te alcanza», «total gastado» ni «presupuesto $0» (12 pantallas) | PASS | — |

### K. Exportación

| # | Comprobación | Resultado | Evidencia |
| --- | --- | --- | --- |
| K-1 | La hoja dice qué incluye, qué no y que no sirve para restaurar | PASS | `k1-exportar-hoja-390` |
| K-2 | JSON y CSV de A y de B descargan; importes como texto en unidades menores; sin UUID | PASS | `k1-exportar-listo-json-390` |
| K-3 | El export de B no contiene nada privado de A, y al revés; no incluye movimientos eliminados ni deshechos | PASS | — |

### L. Privacidad entre los dos

| # | Comprobación | Resultado | Evidencia |
| --- | --- | --- | --- |
| L-1 | B busca en Actividad, Yo y Nosotros, textos privados de A → «Nada coincide» | PASS | `l1-beto-busca-privado-ana-390` |
| L-2 | HTML servido a B (Inicio, Actividad, Plan, Análisis, Metas y Balance, en Yo y Nosotros) sin descripciones privadas de A, en tres momentos de la corrida | PASS | — |
| L-3 | Exportes cruzados limpios (K-3) | PASS | — |

### M. Responsive, escritorio y accesibilidad

| # | Comprobación | Resultado | Evidencia |
| --- | --- | --- | --- |
| M-1 | Sin scroll horizontal: 8 rutas × Yo/Nosotros × 390 y 1440 (32 combinaciones) | PASS | — |
| M-2 | 1440: sidebar con selector Yo/Nosotros, Balance como destino, perfil al pie | PASS | `m3-balance-destino-1440` |
| M-3 | 1440: Actividad en tabla con «Pagó · Reparto» y panel de detalle | PASS | `m2-actividad-tabla-panel-1440` |
| M-4 | 1440: Anotar como diálogo, abierto con la tecla N | PASS | `m7-anotar-dialogo-1440` |
| M-5 | 1440: Metas, Plan y Análisis con composición de escritorio | PASS | `m4-metas-nosotros-1440`, `m4-metas-yo-1440`, `m5-plan-nosotros-1440` |
| M-6 | Movimiento reducido: el cambio a Nosotros sin animaciones en curso y con «Ahora ves: Nosotros» anunciado | PASS | `n1-reduced-motion-cambio-nosotros-390` |

### N. Fuera del alcance del agente

| # | Comprobación | Resultado |
| --- | --- | --- |
| N-1 | US-12, mediana < 10 s en teléfono real (V7) | BLOQUEADO: necesita a una persona con su teléfono |
| N-2 | iPhone: F02, teclado y safe areas, VoiceOver, back-swipe (V1, V4, V5, V6) | BLOQUEADO: necesita dispositivo real |
| N-3 | Borrado manual de cuenta (`contracts/account-deletion.md`) | BLOQUEADO: es una operación administrativa con el «sí» escrito, no un camino de la app; ya se ensayó en 005-T039. La nota de la interfaz pasa (B-4) |

## Hallazgos (fallos)

Ninguno toca dinero ni privacidad: los cálculos y la visibilidad son correctos en todos los casos. Los cinco son de
presentación o de copy.

### C-1 · El saldo anterior tachado aparece bajo la dirección nueva — media

- **Pasos.** Con «Beto le debe a Ana $115.000», B anota un gasto que invierte el saldo (Arriendo 400.000, pagó Beto,
  50/50). Mirar Inicio en Nosotros.
- **Esperado.** O no se muestra el valor anterior cuando cambia la dirección, o se muestra con su dirección («antes:
  Beto le debía $115.000 a Ana»).
- **Obtenido.** «Ana le debe a Beto ~~$115.000~~ $85.000». Se lee como si Ana hubiera debido 115.000, que es falso.
- **Captura.** `e6-inicio-nosotros-beto-390`.

### C-2 · Actividad en Yo y Inicio en Yo dan dos «gasto del mes» distintos — media (confirmar si es intencional)

- **Pasos.** Con pareja y gastos compartidos, abrir Inicio en Yo y luego Actividad en Yo, el mismo mes.
- **Esperado.** Spec 003 US-4: en Yo, los compartidos «aparecen en su lista con “Compartido · tu parte”» y cuentan por la
  parte. Inicio lo hace.
- **Obtenido.** Inicio de B: «En noviembre gastaste $472.000». Actividad de B: «Gasto de noviembre $37.000», un
  movimiento, solo los privados; buscar un compartido en Yo da «Nada coincide». Si es una decisión, falta decirlo en la
  pantalla («Solo tus movimientos privados»); si no lo es, Actividad en Yo debería incluir las filas «tu parte».
- **Capturas.** `c8-actividad-yo-beto-390`, `e7-inicio-yo-ana-390`.

### C-3 · Tras «Quitar el uso de la meta», el detalle sigue diciendo «Pagado con una meta» — baja

- **Pasos.** A anota un gasto compartido con la meta Viaje y pide fondos a B. B rechaza. A abre el detalle y pulsa
  «Quitar el uso de la meta».
- **Esperado.** Spec 004 US-8.2: el gasto queda como «Dinero del mes».
- **Obtenido.** Los fondos sí vuelven (la meta pasa de 270.000 a 300.000) y desaparece la fila de uso. Pero el detalle
  sigue mostrando «Pagado con una meta · Viaje ficticio» y la tarjeta «BETO NO APROBÓ… Solo cuentan los fondos ya
  usados», también al recargar.
- **Captura.** `i11-quitar-uso-detalle-390`.

### C-4 · Meta personal superada con texto de pareja — baja (copy)

- **Pasos.** Meta personal de 100.000 con un aporte de 120.000.
- **Esperado.** Singular: «Cuando quieras, puedes darla por lograda.»
- **Obtenido.** «Lo lograste · Cuando quieran, pueden darla por lograda.»
- **Captura.** `i12-meta-superada-390`.

### C-5 · «Gasto noviembre» en Nosotros frente a «Gasto de noviembre» en Yo — baja (copy)

- **Pasos.** Abrir Actividad en Nosotros y en Yo.
- **Esperado.** El mismo patrón en los dos contextos.
- **Obtenido.** En Nosotros falta «de».
- **Captura.** `m2-actividad-tabla-panel-1440`, frente a `c8-actividad-yo-beto-390`.

## Sugerencias de usabilidad (no son fallos)

- **S-1 · El registro borra la contraseña tras un error de validación.** Al enviar sin confirmar el aviso, sale
  «Completa los tres campos y confirma el aviso.» y el campo de contraseña queda vacío. Captura
  `a1-registro-no-permitido-390` (estado final; el intermedio se vio en la corrida).
- **S-2 · En la liquidación, el tope y la fecha se avisan solo al enviar.** Con 90.000 sobre un saldo de 85.000 o con
  fecha futura, el botón sigue habilitado («Registrar $90.000») y la nota «Después de esto…» desaparece. El aviso llega
  al pulsar. Funciona, pero podría decirse mientras se escribe.
- **S-3 · Meta personal abierta por URL desde Nosotros.** Dice «No encontramos esta meta… no sea de este contexto». Es
  correcto por privacidad, pero confunde a la dueña; podría ofrecer «Cambiar a Yo». Captura
  `i6-meta-otro-contexto-390`.
- **S-4 · «Rechazar» una solicitud de fondos no pide confirmación.** No se puede deshacer; un toque accidental obliga a
  repetir la compra con meta. «Aprobar» tampoco confirma, pero ahí la pantalla ya muestra el efecto.
- **S-5 · Balance en Yo no ofrece cambiar a Nosotros.** Explica que el balance está en Nosotros, pero no trae un botón;
  hay que ir al selector. Captura `g0-balance-en-yo-390`.
- **S-6 · Cambiar de Yo a Nosotros tarda unos 1,3 s** en mostrar los datos desde localhost contra São Paulo (medido con
  movimiento reducido). Es F02, ya conocido (24.4); se anota para la medición en iPhone.
- **S-7 · Desactivar un presupuesto no pide confirmación.** Es reversible y conserva el historial, así que no es grave;
  se anota porque el resto de acciones de estado sí confirman.

## Lo que no cubre esta corrida

- No es evidencia de CI ni de los `[V]`: solo cuenta el CI sobre el commit candidato (ADR-011 §9.8).
- No hubo correo real (A-2, A-8) ni dispositivos reales (N-1, N-2).
- No se probaron las carreras (dos liquidaciones simultáneas, anular frente a aceptar una invitación): las cubren las
  pruebas de integración.
- Los datos de la corrida quedan en juntia-dev. Un `npm run db:dev:reset` los borra; las dos cuentas de Auth se
  conservan.
