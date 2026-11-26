# Contrato de las verificaciones humanas — 005

Quién hace cada verificación humana, cuándo, cómo y qué evidencia deja. Aplica FR-021,
FR-030–FR-034, FR-044, FR-055, FR-060–FR-064, FR-070–FR-072 y FR-080–FR-081, y las
respuestas Q4, Q6, Q9 y Q10. Los pasos (0b, 6, 7) son los del orden de ejecución de
[../plan.md](../plan.md).

## Reglas comunes

- **Dónde:** en producción, con las cuentas reales, salvo que la fila diga `juntia-dev`.
  Solo se escriben datos reales legítimos: nada de gastos de prueba en producción.
- **Cada fila de dispositivo** registra: fecha, rol («fundador 1», «fundador 2», «la
  dueña», «el gestor»), modelo de iPhone, versión de iOS, navegador y su versión, commit
  desplegado (lo enseña el panel de Vercel o la etiqueta), resultado y evidencia.
- **Privacidad de la evidencia: una sola regla**, la de [../plan.md](../plan.md), «PR C ·
  Evidencia y cierre» (F85-6). En corto:
  - **al repositorio** (solo `.md`, `.png` y `.txt` bajo `specs/005-gate-mvp-1/evidence/`)
    entran capturas con datos de prueba (runner o `juntia-dev`) o capturas de producción
    **anonimizadas**, con importes, nombres, comercios, notas, metas y correos tapados de
    forma opaca por quien las hizo, más recuentos, tiempos e identificadores;
  - **se quedan con los fundadores** las imágenes y los clips originales, los nombres
    identificables y las firmas;
  - una captura de producción solo entra cuando el hallazgo no se reproduce con el
    dataset;
  - nunca contraseñas, tokens ni textos de aprobaciones.

  «Captura PNG» en los protocolos de abajo significa siempre una captura que cumple esta
  regla.
- **Un fallo es un fallo:** se registra tal cual y va a B o a los fundadores. Nada se
  marca «verificado» sin salida (`AGENTS.md` 12).
- **Quién es quién:** «los dos» son los dos fundadores; «la dueña» es la fundadora dueña
  del repositorio, de Vercel y de Supabase; «el gestor» es la sesión que coordina, que
  prepara, calcula y registra, pero no sustituye a una persona en lo que esta spec pide a
  una persona.

## Protocolos

### V1 · F02 en iPhone (FR-032, Q4) — paso 0b; repetir tras B si se corrige

- **Quién:** cada fundador, en su iPhone.
- **Cómo:** grabación de pantalla de iOS. **S1:** en Inicio, 10 cambios Yo ↔ Nosotros,
  alternos, esperando a ver el contenido antes del siguiente. **S5:** desde Metas, 10
  aperturas de meta, alternando dos metas y volviendo atrás entre una y otra.
- **Medida:** fotograma del toque (resaltado del control) → primer fotograma sin ningún
  bloque de esqueleto. Se cuenta en Fotos fotograma a fotograma (60 fps ≈ 16,7 ms).
- **Evidencia:** tabla de 20 tiempos por persona; el gestor calcula la mediana por
  persona y experiencia; un fotograma PNG del toque y otro del contenido por experiencia.
- **Decisión que activa:** mediana > 1 s, o un fundador lo juzga defecto → corrección en
  B (research R10).

### V2 · Revisión de S1–S5 (FR-030, FR-031, FR-033, FR-034) — primera pasada en 0b, final en 6

- **Quién:** los dos, por separado.
- **Dónde:** el iPhone de cada uno y un escritorio a 1440 px.
- **Matriz:** S1–S5 × {iPhone, 1440} × {con movimiento, con «Reducir movimiento» de
  iOS o del sistema} = 20 filas por persona.
- **En cada fila, los pasos del gate de §6.4:** datos persistidos (los reales), un estado
  negativo (por ejemplo, un saldo en contra o una meta sin aportes), un error de red
  (modo avión un momento, después Reintentar), números largos, carga lenta (la red del
  teléfono basta) y un refresco.
- **Lo que se aprueba aparte** (FR-033): «Tu disponible · aportaste», la paleta propuesta,
  «Gasto, ingreso y liquidación en tinta», las personas con patrón y «Cuenta reutiliza
  los fondos de categoría». Cada una con «apruebo», «no apruebo» o un comentario.
- **Criterios del handoff** (FR-034): la tabla de la spec «Criterios de aceptación
  aplicables» se recorre con datos reales y cada criterio queda con su prueba de CI o su
  nota de revisión.
- **Evidencia:** la tabla S1–S5 en `evidence.md`, con una nota por persona y fila, y una
  captura PNG por experiencia y ancho.

### V3 · Humo de release en producción (FR-021, Q3) — paso 6

- **Quién:** cada fundador, con su cuenta y su teléfono.
- **Pasos:**
  1. entrar;
  2. anotar un gasto privado real;
  3. ver Inicio y Actividad, con el gasto en la lista y en el total;
  4. abrir el balance (desde Inicio en el móvil);
  5. abrir una meta;
  6. exportar JSON y CSV;
  7. salir y volver a entrar.
- **Red (FR-013):** con la pestaña de red del inspector o, sin Mac, con un fundador en
  Safari de escritorio, ninguna petición a dominios de terceros (solo el de la app,
  Supabase y Vercel).
- **Evidencia:** la casilla de V3 en la checklist, con fecha, modelo e iOS, por persona.

### V4 · Teclado nativo y safe areas (FR-044) — 0b y 6

- **Quién:** cada fundador.
- **Pasos:**
  - Anotar con el teclado nativo: el campo activo y Guardar siempre visibles;
  - la barra inferior y la hoja respetan el indicador de inicio;
  - en horizontal, nada queda detrás de la muesca;
  - **girar el teléfono con un monto escrito en Anotar:** el monto sigue (cierra en
    dispositivo el punto de 768 px, research R8).
- **Evidencia:** capturas PNG en vertical y horizontal; fila de dispositivo.

### V5 · VoiceOver y contraste (FR-070) — 0b y 6

- **Quién:** VoiceOver, un fundador; contraste, los dos.
- **VoiceOver:** Anotar completo (monto, categoría, contexto, Guardar, el aviso de
  guardado), Inicio, Balance y una meta: cada control se anuncia con su nombre y su
  estado, y el orden sigue la pantalla.
- **Contraste:** las mismas pantallas en los dos temas, al sol y a la sombra; se anota
  cualquier texto que cueste leer.
- **Evidencia:** notas por pantalla; capturas de lo que falle.

### V6 · Back-swipe frente al cierre de la meta inmersiva (FR-070) — paso 6

- **Quién:** los dos.
- **Pasos:** abrir una meta y cerrarla con el gesto de volver de iOS, 5 veces. La meta se
  cierra una vez, sin doble animación ni pantalla en blanco, y el foco vuelve a la carta.
- **Evidencia:** nota y dos fotogramas PNG (gesto y resultado).

### V7 · US-12, mediana < 10 s (FR-055) — pasos 6 o 7

- **Quién:** cada fundador.
- **Pasos:** grabación de pantalla durante al menos 10 gastos habituales reales; tiempo
  del toque en Anotar al aviso «Guardado».
- **Evidencia:** tabla de tiempos y mediana por persona; el método escrito.

### V8 · Tema entre dispositivos (FR-072) — paso 6

- **Quién:** un fundador.
- **Pasos:** elegir el tema oscuro en el iPhone; entrar en el escritorio con la misma
  cuenta: se ve oscuro desde el primer fotograma, sin parpadeo. Y al revés.
- **Evidencia:** nota con los dos dispositivos.

### V9 · CLS en iPhone con el Mac prestado (FR-071, Q6 opción a) — paso 6

- **Quién:** un fundador con el Mac; el gestor prepara el grabador y ejecuta el
  comparador.
- **Antes:** el grabador probado como «Inspector Bootstrap Script» en Safari de
  escritorio contra `juntia-dev` (research R11).
- **Pasos:** iPhone conectado; Safari del Mac → Desarrollo → el iPhone → la pestaña de
  Juntia; el grabador como «Inspector Bootstrap Script»; 10 cargas por ruta de FR-050;
  tras cada una, `copy(JSON.stringify(window.__clsFrames))` en la consola y pegar en un
  archivo del Mac. Una grabación de Timelines («Layout & Rendering») de una carga de
  Inicio.
- **Evidencia:** la salida del comparador por ruta (`.txt`, sin datos: solo cajas), la
  captura de Timelines y la fila de dispositivo con la versión de Safari del Mac.
- **Si sale distinto de 0:** defecto para B y otra sesión con el Mac.

### V10 · Exportación con datos reales (FR-060) — paso 6

- **Quién:** cada fundador.
- **Pasos:** descargar JSON y CSV desde Mi cuenta → Privacidad; abrir los dos (el CSV en
  Números o Excel); comprobar que están sus movimientos, metas, aportes, solicitudes y
  presupuestos, y que no hay nada privado del otro (sus gastos de Yo, sus metas
  personales, sus presupuestos personales).
- **Evidencia:** recuentos por tipo y «nada del otro: sí/no», sin pegar el contenido.

### V11 · Recuperación de acceso (FR-063) — paso 6

- **Quién:** cada fundador.
- **Pasos:** «¿Olvidaste tu contraseña?» en producción, el correo de Supabase, el enlace,
  una contraseña nueva y volver a entrar.
- **La dueña copia del panel** de Supabase el límite de envío de correos de Auth vigente,
  y la checklist dice qué hacer si se alcanza (esperar la ventana, o que la dueña
  restablezca la contraseña desde el panel).
- **Evidencia:** fecha y resultado por persona; el límite copiado.

### V12 · Vuelta atrás de un despliegue (FR-064) — paso 6

- **Quién:** la dueña, con el gestor.
- **Pasos:** en Vercel, «Instant Rollback» al despliegue de producción anterior (sin
  migraciones entre los dos); comprobar que sirve; volver a promover el candidato;
  comprobar que sirve. A una hora sin uso.
- **Evidencia:** identificadores de los despliegues y la hora de cada paso.

### V13 · 7 días de uso diario y valoración (FR-080, FR-081, Q10) — paso 7

> **Enmienda del 25 de noviembre de 2026 (maestro §15.10, decisión 30).** V13 es la
> **validación por uso real**, que se conserva pero se aplaza (30.6): el periodo, D4 y la
> valoración se hacen cuando se cumpla esa condición y no condicionan la declaración de
> MVP-1, que es su aceptación técnica (30.5). «Antes del periodo» (FR-080) se rige por la
> 30.7: hasta que los fundadores la confirmen, la sesión guiada sigue en el paso 6.

- **Quién:** los dos.
- **Antes del periodo:** la sesión guiada del escenario de pareja de §4, en móvil y en
  escritorio, con una meta individual y una compartida, aportes de los dos, un gasto con
  meta sin doble conteo y un presupuesto creado y desactivado (FR-080).
- **El periodo:** 7 días consecutivos de uso real, con al menos un fin de semana y una
  liquidación.
- **Despliegues durante el periodo (D4, opción a; fundadores, 18 nov 2026):** los
  despliegues de producción **se congelan**. Si aparece un fallo crítico, el periodo se
  para, se corrige en un PR B, el candidato nuevo pasa el paso 4 y **los 7 días vuelven
  a empezar** desde el día del nuevo despliegue. El gestor registra en `evidence.md` la
  fecha de inicio de cada periodo y, si lo hubo, el motivo del reinicio.
- **Al final, cada fundador por separado y sin leer la del otro:**
  - una nota en cada eje: uso diario, legibilidad, rapidez y carácter visual;
  - las tres preguntas de §6.7: qué es claro, qué impresiona, qué estorba;
  - la decisión: «apruebo» o «no apruebo».
- **Evidencia:** las dos valoraciones en `evidence.md`, identificadas por rol («fundador
  1», «fundador 2»), sin nombres ni datos de la pareja. Un fallo crítico
  (dinero, privacidad, pérdida de datos o accesibilidad básica) impide aprobar; los
  demás van a la lista de MVP-2 con dueño (FR-083).

### V14 · Copia y restauración real (FR-061, FR-062, Q9) — paso 7

> **Enmienda del 25 de noviembre de 2026 (decisión 30.5).** V14 es de la aceptación
> técnica: se hace después del paso 6 y antes de declarar, no al final del periodo de
> uso, que queda aplazado. La 24.9 no cambia.

- **Quién:** el fundador que tiene gpg y la copia, en su equipo, con el gestor
  acompañando sin ver la contraseña.
- **Pasos:**
  - `scripts/backup.sh` en modo producción (quickstart de la 002 §4.1), con la
    comprobación de migraciones contra la última `db-prod-*`;
  - `scripts/restore-plain.sh` sobre un PostgreSQL 17 limpio (§4.3);
  - `check-invariants.sql`;
  - el manifiesto de recuentos y huellas, incluidas las seis tablas de P0-3.
- **Evidencia:** el manifiesto y el log de la restauración, sin datos (los scripts ya los
  escriben así).

### V15 · Ensayo del borrado de cuenta (FR-067, Q8; D2, opción a) — tras el PR A

- **Quién:** el gestor, en `juntia-dev`, con el guardia de destino.
- **Cómo:** [account-deletion.md](account-deletion.md).
- **Evidencia:** recuentos antes y después, y la comprobación de Auth.
