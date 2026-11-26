# Feature Specification: 005 · Gate privado conjunto «funcional + espectacular» (P0-4)

**Feature Branch**: `claude/docs-spec-005-p0-4-eeb039` (la carpeta de la spec y la rama son independientes, ADR-012 §1.5)

**Created**: 2026-11-17

**Status**: Draft — etapa Specify con las decisiones resueltas. Los fundadores respondieron las doce preguntas (Q1–Q12) el 17 de noviembre de 2026 aceptando todas las recomendaciones («Sí, las 12»). Lista para el merge de su PR documental y, después, para la etapa Plan (ADR-012 §3.1). Los requisitos que aplican una respuesta citan la opción elegida.

**Input**: User description: "Especificación 005 · P0-4 de Juntia, «Gate privado conjunto "funcional + espectacular"» (maestro §11): ejecutar las pruebas de dinero y privacidad, incluido el ledger de metas; smoke E2E de release; revisar S1–S5 con datos reales y movimiento reducido; revisar 360/390/430/768/1024/1440, teclado, safe areas, listas largas, modo oscuro y estados completos; verificar Core Web Vitals con los medios disponibles y documentar qué no se puede medir aún en p75 real; checklist de release y exportación (recuperación, respaldo y restauración); aprobación de los dos fundadores. Solo aquí se declara MVP-1. Sin funcionalidades nuevas."

> **Qué es este documento.** Dice **qué** se comprueba en P0-4, **con qué
> evidencia** y **qué falta** para declarar MVP-1. **No decide nada**: cada
> requisito cita la decisión que aplica. Lo que no estaba decidido fue a los
> fundadores como `[NECESITA DECISIÓN]`, con opciones y la recomendación del
> redactor, y quedó respondido el 17 de noviembre de 2026 («Clarifications»). Jerarquía: maestro (§15 prevalece) > ADR > paquete de `docs/design/` y
> `docs/CONVENTIONS.md` > esta spec (`AGENTS.md` §2). En este archivo, `[P]`
> significa **propuesta** y `[V]` **verificación pendiente**, según el maestro
> §15.9; no significan «paralelizable», que solo vale dentro de `tasks.md` (ADR-012
> §3.2).
>
> **P0-4 no añade funcionalidades.** Su trabajo es verificar lo construido en P0-1
> a P0-3, cerrar las verificaciones aplazadas a «antes de MVP-1», corregir los
> **defectos** que encuentre y registrar la aprobación de los fundadores. Un
> hallazgo que pida una funcionalidad nueva va a la lista de MVP-2, no a este gate
> (maestro §3, «Regla de recorte»; §12.4).
>
> **Desviación de la plantilla, a propósito.** Como en la 003 y la 004, la
> plantilla de Spec Kit limita a tres las aclaraciones; aquí hay doce, porque el
> encargo pide que todo lo no decidido llegue a los fundadores. Se marcaron
> `[NECESITA DECISIÓN]` en lugar de `[NEEDS CLARIFICATION]`; hoy están resueltas.

> **Enmienda del 25 de noviembre de 2026 (maestro §15.10, decisión 30).** Tras la
> corrida completa delegada en un agente (`corrida-completa.md`, PR #104), los
> fundadores separaron dos hitos:
>
> - **Aceptación técnica de MVP-1**, que es lo que esta spec llama **«declarar
>   MVP-1»**. Incluye la corrección de C-1 a C-7 en un PR de código acotado, con
>   regresiones y evidencia nueva (la única excepción a la congelación, 30.2), y todas
>   las demás verificaciones de esta spec, sin rebajar ninguna.
> - **Validación por uso real**: los 7 días consecutivos de Q10, con D4, la
>   valoración de FR-081 y SC-011. Se conserva, pero **se aplaza** (30.6).
>
> Donde esta spec pide los 7 días, la valoración tras el periodo o la congelación de
> D4 **antes de declarar MVP-1**, rige la decisión 30. La corrida delegada y FR-080 se
> rigen por la 30.7, que es una propuesta pendiente de los fundadores. El informe del
> PR #104 se conserva como evidencia histórica, con sus FAIL.

### Fuentes que aplica

| Fuente | Qué aporta a P0-4 |
| --- | --- |
| Maestro §1, «Puerta de salida de MVP-1» | Los dos, con cuentas y dispositivos distintos, completan el escenario de §4 con meta privada y compartida y datos reales; aprueban estética, legibilidad, interacciones y fluidez en 390 y 1440; todo funciona con movimiento reducido |
| Maestro §4 | US-01 a US-23 y el «Escenario de aceptación de pareja antes del lanzamiento» |
| Maestro §6.3, §6.4, §6.7 | Anchos, safe areas, teclado, estados equivalentes; gate de cada experiencia S1–S5; criterio «wow» verificable |
| Maestro §7.4, §7.5 | Telemetría sin importes; exportación, copia externa cifrada y restauración de prueba; riesgos del plan Free |
| Maestro §10.1 a §10.4 | Pruebas según riesgo, metas cuantitativas (CWV p75 o laboratorio rotulado), definición de terminado, release gate humano conjunto |
| Maestro §11, «P0-4» y fila P0-4 del backlog | Alcance de esta spec; evidencia: «Checklist de release + exportación» |
| Maestro §15.5, §15.6, §15.7 | Exportación JSON + CSV; bloqueo legal (§15.6.1); dependencias técnicas (§15.6.2); verificaciones de §15.6.3; umbrales que bloquean |
| Maestro §15.9 | `[P]` y `[V]`: ningún `[V]` se da por ejecutado sin salida real |
| Maestro §15.10, decisiones 12, 16, 18, 19, 21 y 22 | Verificaciones heredadas y excepciones formales; pendientes de lanzamiento de la decisión 16; iteración contra `juntia-dev`; aplazamientos «antes de MVP-1» (19.1, 19.2, 19.4); barrido de accesibilidad «antes de MVP-1» (21.2); alcance de P0-3 |
| ADR-011 y `docs/TESTING.md` | Capas, tope de 4–6 specs E2E (hoy 5), matriz de recorridos, presupuestos de job, aceptación por etapas (§8), gate visual humano |
| ADR-012 | Formato de la spec y gates por PR documental |
| ADR-013 | Acceso a datos; las comprobaciones de privilegios y escritura directa que el gate vuelve a correr |
| `docs/design/HANDOFF_CLAUDE_CODE.md` | «Criterios de aceptación (solo P0)», «Accesibilidad», «Rendimiento», «Pendiente», «Evaluación» |
| `docs/design/MOTION_SYSTEM.md`, `RESPONSIVE_SPECIFICATIONS.md`, `COMPONENT_SPECIFICATIONS.md`, `DESIGN_SYSTEM.md`, `BRAND_FOUNDATION.md` | S1–S5 y su alternativa sin movimiento; anchos y safe areas; `[V]` pendientes |
| Specs 001 a 004 (`spec.md`, `tasks.md`, `evidence.md`) | Forma y tono; verificaciones y tareas de laboratorio aún sin salida (T040, T054, T067 y T079 de la 004, entre otras) |
| `docs/audits/2026-11-impeccable.md` y `docs/audits/2026-11-t084/` | Auditoría «previa al gate P0-4» (F02 abierto) y simulación de la salida interna de P0-3 |
| Issue #53 (F51-11) | Fila optimista doble: Q2 |

## Decisiones de los fundadores que esta spec recoge

Tomadas antes de la etapa Specify. Esta spec las **registra y aplica**; no las toma.
El PR documental T085 (o el que lo suceda) las lleva al maestro §15.10.

- **17 de noviembre de 2026 · Metas sin foto en MVP-1.** Se queda el fallback aprobado de GoalCard (`[A]`). **ADR-014** (Storage privado de fotos de metas) pasa a **MVP-2**. Corrige el «antes de P0-4» de la decisión 22.6, de ADR-010 y de la spec 004. Consecuencia en esta spec: los `[V]` de fotos y scrim (BRAND_FOUNDATION, scrim y casos de foto; COMPONENT_SPECIFICATIONS §GoalCard; DESIGN_SYSTEM [V] (b), HANDOFF «Fotos» y §15.6.2 punto 2) **no aplican a MVP-1** y salen del gate (ver «Inventario de `[V]`»).
- **22 de noviembre de 2026 · Categorías Oficina y Ropa; rejilla de Anotar de 4 × 3.** Entran las categorías de gasto **Oficina** (`office`) y **Ropa** (`clothing`), y la rejilla de Anotar pasa de 3 × 3 a **4 columnas × 3 filas con el mismo alto** (208 px a 360, 390 y 1440), para no empeorar el teclado del iPhone. Las claves existentes no cambian. Diseño: comp «Juntia DS v1 - 06b Categoria 4x3» en Claude Design (variante del 06, opción 1c). Migración `20261122120000_categories_office_clothing.sql`, aplicada solo en juntia-dev; producción la aplica el gestor con el «sí» de un fundador. **Confirmado por los fundadores el 22 de noviembre de 2026**, viendo el comp, en la revisión del PR #92 (antes eran provisionales): (1) «Entretenimiento» pasa a **«Ocio»**, que cabe en la ficha (solo el texto; la clave sigue siendo `entertainment`); (2) **«Otra» la última, a dos casillas**, para cerrar la casilla 12 sin inventar una categoría (opción B del comp; la A la deja vacía); (3) **las etiquetas a 11 px** con −0,01 em: «Restaurantes» mide 76,3 px a 12 px y la ficha de 360 mide 74 px, así que no cabía (opción R1; la R2 la parte en dos líneas); (4) el orden: las ocho de antes, luego Oficina, Ropa y Otra; (5) iconos (maletín y camiseta de Phosphor) y tintes (derivados de «Liquen» y «Malva polvo»). `docs/design/DESIGN_SYSTEM.md` §1.3 ya lo recoge; lo que queda por actualizar está en la fila 19 de «Contradicciones para el PR documental T085». El problema del teclado del iPhone va en otro cambio.
- **23 de noviembre de 2026 · Marca 1c, «La J que se construye».** Los fundadores eligieron la dirección 1c del comp «Juntia DS v1 - 09 Marca» y **aprobaron su pulido, el comp «Juntia DS v1 - 09b Marca 1c»** (Claude Design, proyecto `caabf357-a0df-4048-886f-8c46c8979c5a`), con cuatro decisiones: (1) **el logo maestro 1c tal cual el 09b**: fuste bosque y curva arena con la junta a la vista, y «Juntia» en Brygada 1918 Medium Itálica; (2) **la versión pequeña de 16–32 px**: `icon.svg` dibujado al píxel (junta de 2 px) con colores por tema, y `favicon.ico` sobre **baldosa bosque**, porque un `.ico` no cambia con el tema y el bosque mide 1,3:1 sobre la pestaña oscura; (3) **la frase A, «Lo tuyo, lo mío y lo nuestro.»**, para la imagen Open Graph, la misma para todos los enlaces, también la invitación, sin nombres, montos ni datos; (4) **sin logo a 390 px dentro de la app**: el `[P]` del 09b queda resuelto como «no se añade»; a 1440 va en la barra lateral y de 1024 a 1279 el isotipo reemplaza la «J» del rail. La PWA (manifest y service worker) sigue aplazada. La marca está en `docs/design/DESIGN_SYSTEM.md` §3a, con tres **[V] pendientes de verificar en navegador real**, que no se dan por hechos: Safari y el `icon.svg` con tema, el cambio de color en Chrome y Edge sin recargar, y los colores reales de las pestañas de Safari 26. Lo que queda por llevar al maestro está en la fila 20 de «Contradicciones para el PR documental T085».
- **24 de noviembre de 2026 · Texto de la tarjeta al compartir.** Los fundadores eligieron la opción 2 para la descripción de la tarjeta (`description`, `og:description` y `twitter:description`; `copy.share.description`): **«Las cuentas de la pareja, claras: quién pagó, cuánto le toca a cada uno y lo que ahorran juntos.»** La imagen no cambia: su frase sigue siendo la A del 23 de noviembre. Es la misma para todos los enlaces y no lleva datos. Recogido en `docs/design/DESIGN_SYSTEM.md` §3a.
- **17 de noviembre de 2026 · El job `e2e` del CI se parte en dos jobs paralelos.** Lo hace otra sesión; esta spec **no lo diseña**. Cuenta con ese margen para las pruebas que P0-4 añada (FR-095), sin mover ningún presupuesto (cláusula anticliquet, `docs/TESTING.md` §9).

### Lo que ya estaba decidido y no se reabre

Para que la revisión no lo reabra (contexto, no decisión de esta spec):

- **Campos táctiles a 16 px** en móvil y táctil (PR #82); **control de ancho** en todas las pantallas y estados de la pasada de accesibilidad (PR #82, F82-1..3).
- **Texto en `rem`** para el texto ampliado al 200 % (F13; decisión de los fundadores del 11 de noviembre de 2026; PR #79), con la excepción aceptada F79-3 (suelos de `--money-*-fit` en px).
- **Diálogos de escritorio anclados arriba** desde 768 px, con las confirmaciones centradas (PR #81; `docs/audits/2026-11-dialogs/README.md`).
- **Pagador por defecto = quien anota** (decisión de los fundadores del 12 de noviembre de 2026, T084 punto 6b; PR #80); el reparto sigue siendo el último usado.
- **«Tu disponible»** en Metas · Yo y en la meta inmersiva (F06 y T084; PR #77 y #80), y **«Retiro de la meta»** (T084; PR #80).
- **Fondos del gasto con meta propuestos según la parte de cada uno en el reparto** (F20, aprobado el 11 de noviembre de 2026; PR #77).
- Dirección **I2 Bosque & Arena**, Phosphor con `AppIcon`, tipografía de la decisión 14, navegación de §15.3.

Varias de estas decisiones todavía no están escritas en los documentos superiores; la
lista está en «Contradicciones para el PR documental T085».

## Clarifications

Las doce respuestas son **decisiones de los fundadores del 17 de noviembre de
2026**, que aceptaron las recomendaciones de la etapa Specify tal como se
propusieron («Sí, las 12»). Alejandro las comunicó al gestor en nombre de los dos.
Esta spec las registra y las aplica; no las toma. El PR documental posterior las
lleva al maestro §15.10, con las enmiendas que exigen («Contradicciones para el PR
documental T085», filas 14 a 18). Cada pregunta conserva su número, su contexto y
sus opciones como historia; los requisitos citan la opción elegida.

### Session 2026-11-17

- Q1 → **(a)**: tres PR: A, pruebas y arneses; B, correcciones; C, evidencia y cierre (solo documentos).
- Q2 → **(a)**: el issue #53 se difiere a MVP-2 como límite conocido; vuelve a los fundadores si la doble fila molesta en el uso diario.
- Q3 → **(a)**: sin spec E2E nueva; las cinco specs sobre el commit candidato en Chromium y una vez en WebKit, más la checklist de humo de los fundadores en producción; el nivel 2 nocturno se difiere a MVP-2.
- Q4 → **(a)**: F02 se mide primero en producción con iPhone; se corrige en el PR B si la mediana supera 1 s o si un fundador lo juzga un defecto.
- Q5 → **(c)**: solo laboratorio en MVP-1, con LCP y la tabla de «no medible en p75 real»; la medición de campo (RUM) pasa a MVP-2.
- Q6 → **(a) para el Mac y (c) para Android**: el CLS en iPhone con el inspector de Safari se ejecuta antes de MVP-1 con un Mac prestado; las verificaciones de Android, incluidos los springs a 55 fps, se prorrogan más allá de MVP-1 como excepción formal, y su revalidación pasa a ser condición de abrir la app a un tercero. Enmienda la decisión 19.2.
- Q7 → **(a)**: CLS fuera de Chromium con un comparador por fotogramas en WebKit y Firefox; si no es fiable, vuelve a los fundadores con «solo WebKit».
- Q8 → **(a)**: la eliminación de cuenta y los pendientes de la decisión 16 aplican al lanzamiento público; en MVP-1, un procedimiento manual de eliminación ensayado en `juntia-dev`. Enmienda el §15.6.1 y la decisión 16.
- Q9 → **(a)**: copia semanal, más una antes de cada migración de producción, más una restauración real con el esquema de P0-3 antes de declarar MVP-1; pérdida máxima aceptada, 7 días.
- Q10 → **(a)**: escenario de pareja de §4 en móvil y escritorio, más 7 días consecutivos de uso diario real y notas separadas en cuatro ejes. **Enmendada el 25 nov 2026 (maestro, decisión 30):** los 7 días y las notas en cuatro ejes pasan a la validación por uso real, aplazada (30.5 y 30.6); el escenario de §4 se rige por la 30.7.
- Q11 → **(a)**: entran el residuo de F13 al 200 %, la pérdida del monto al cruzar 768 px y el marco de foco si incumple el handoff; «Descartar» y el cierre con View Transition van a MVP-2; «Tu disponible · aportaste» se aprueba en la revisión de S5.
- Q12 → **(a)**: sin purga de la tabla de idempotencia en MVP-1; se mide su tamaño y se revisa en MVP-2.

### Contexto y opciones de cada pregunta

Lo que se presentó a los fundadores en la etapa Specify. Se conserva como historia.

#### Q1 · Forma de la especificación y reparto en PR

- **Decidido** (fundadores, 17 nov 2026): opción **(a)**, tres PR (A, B y C).
- **Contexto:** P0-4 no construye pantallas; hace tres tipos de trabajo: pruebas y arneses que faltan (código de pruebas), correcciones de los defectos que salgan y verificaciones humanas con su evidencia. Las specs 003 y 004 usaron cuatro y cinco PR.
- **Opciones:**
  - (a) **Tres PR**:
    - **A · Pruebas y arneses que faltan**: huecos de cobertura de FR-012, arnés de LCP y CLS fuera de Chromium (Q7), y la lista de estados de FR-041.
    - **B · Correcciones**: los defectos que encuentren A, el barrido y la revisión de S1–S5, más lo que decidan Q4 y Q11.
    - **C · Evidencia y cierre**: el registro del gate en `evidence.md`, la checklist de release, las verificaciones de dispositivo y la aprobación de los fundadores, solo documentos.
  - (b) Un PR por eje (pruebas, responsive y accesibilidad, rendimiento, release, aprobación): cinco PR más pequeños, con más gates de CI.
  - (c) Un solo PR de código y uno de evidencia.
- **Recomendación (aceptada): (a).** Separa lo que gasta CI (A y B) de lo que solo es documento (C, que no lanza CI, `AGENTS.md` 15a). B puede partirse si las correcciones tocan áreas distintas. El orden es A → barrido y revisión → B → C.

#### Q2 · Issue #53, fila optimista doble (F51-11): ¿entra en P0-4?

- **Decidido** (fundadores, 17 nov 2026): opción **(a)**, se difiere a MVP-2 como límite conocido.
- **Contexto:**
  - **Qué pasa:** la fila temporal de Anotar se oculta cuando la lista trae el `savedId`, que solo se conoce al responder la acción. Si una navegación trae la fila real antes, se ven dos filas durante la ventana, normalmente de menos de 1 s.
  - **Qué no rompe:**
    - La base de datos no duplica: la idempotencia lo impide.
    - Los totales excluyen las filas temporales (F51-2).
    - Está registrado como «límite conocido» en `src/features/expenses/annotate/machines.test.ts`.
  - **El arreglo propuesto en el issue no es un retoque de interfaz.** Es un cambio de contrato de función:
    - `create_transaction` acepta un `p_transaction_id` generado en el cliente y ligado a la clave de idempotencia.
    - Quizá también las escrituras compartidas de P0-2.
    - Por eso necesita **un ADR bajo ADR-013**, una migración y pgTAP.
- **Opciones:**
  - (a) **Diferir a MVP-2** como límite conocido documentado. Se conserva la prueba que lo describe y el issue sigue abierto.
  - (b) Entrar en P0-4 con su ADR antes del plan, una migración y pruebas pgTAP e integración.
  - (c) Entrar en P0-4 con una heurística de cliente. Ya se rechazó el 11 de noviembre: podría ocultar otro gasto idéntico.
- **Recomendación (aceptada): (a).** Es solo visual, breve y no afecta a dinero, privacidad ni totales. Además, (b) cambia el contrato de las funciones de dinero justo antes del gate, y eso obligaría a repetir las pruebas de idempotencia de P0-1 y P0-2.
  - **Condición:** si en la revisión de S2 (FR-030) los fundadores ven la doble fila con datos reales y la juzgan un defecto de uso diario, la decisión vuelve a ellos con (b).
  - Con (a), el issue pasa a la lista «Fuera de MVP-1».

#### Q3 · Smoke E2E de release y el «nivel 2» que no existe

- **Decidido** (fundadores, 17 nov 2026): opción **(a)**, sin spec nueva: cinco specs en Chromium y una vez en WebKit, más la checklist de humo en producción; nivel 2 a MVP-2.
- **Contexto:**
  - **Lo que hay:** cinco specs E2E de seis posibles (`docs/TESTING.md`, «Tope»). Cubren las cuatro familias de smoke de §10.1, US-12 y Mi cuenta, y corren en CI contra el Supabase limpio del runner, solo en Chromium.
  - **Lo que `docs/TESTING.md` §3 describe pero no existe:** un «Nivel 2 — al mergear a `main` y de noche», con las cinco specs en Chromium y WebKit, snapshots de 5 rutas y rendimiento. **Ese workflow no existe:** `ci.yml` solo corre en `pull_request` y `workflow_dispatch`.
  - **Lo que nada prueba hoy:** el despliegue real de producción (Vercel y el Supabase de producción).
- **Opciones:**
  - (a) **Sin spec E2E nueva.** El smoke de release tiene dos partes:
    - **Las cinco specs completas** sobre el commit etiquetado para el lanzamiento, en Chromium y **una vez en WebKit**, lanzadas a mano.
    - Una **checklist de humo manual en producción** que hacen los fundadores con sus cuentas reales y que solo escribe datos reales legítimos: entrar, anotar, ver Inicio, abrir Balance, abrir una meta, exportar y salir.
    - El nivel 2 nocturno se registra como no implementado y se difiere a MVP-2, en el PR documental.
  - (b) **Sexta spec E2E «Release smoke»** contra un preview o contra producción con cuentas de prueba. Contra producción mete datos de prueba en producción y necesita cuentas fuera de la lista permitida (decisión 16.9).
  - (c) **Crear ahora el workflow nocturno** de `docs/TESTING.md` §3. Gasta minutos de CI cada noche: con la cuenta Free, unos 15 minutos × 30 días ≈ 450 de 2.000.
- **Recomendación (aceptada): (a).** Usa la cobertura que ya existe sin gastar la sexta plaza ni minutos diarios, y prueba producción como la usarán los dos. WebKit se corre **una vez** porque los dos fundadores usan iPhone (Safari), y hoy ninguna spec ha corrido en WebKit.

#### Q4 · F02: S1 y S5 detrás de un esqueleto con la latencia real

- **Decidido** (fundadores, 17 nov 2026): opción **(a)**, medir primero en producción y corregir si la mediana supera 1 s o si un fundador lo juzga un defecto.
- **Contexto:**
  - **El hallazgo:** la auditoría previa al gate (F02, «Importante», `docs/audits/2026-11-impeccable.md`) midió contra `juntia-dev` 1,5–3 s de esqueleto al cambiar Yo ↔ Nosotros y al abrir una meta. En ese tiempo la coreografía de S1 y S5 no llega a verse.
  - **Por qué pesa:** S1 y S5 son dos de las cinco experiencias insignia del gate «espectacular» (§6.4).
  - **Lo que falta saber:** la propia auditoría pide medir en producción con un teléfono real, y nadie lo ha hecho. Corregirlo no es una funcionalidad nueva, pero sí cambia cómo se cargan los datos: precargar el otro contexto y la meta frontal, o arrancar la coreografía con lo que ya se tiene.
- **Opciones:**
  - (a) **Medir primero** en producción, en el iPhone de cada fundador, con 10 cambios de contexto y 10 aperturas de meta cada uno, y registrar el tiempo hasta el contenido.
    - **Corrección en el PR B** si el tiempo mediano supera **1 s** o si cualquiera de los dos fundadores lo juzga un defecto en la revisión de S1 o S5.
    - **La técnica la elige el plan**, dentro de MOTION_SYSTEM §1: animar solo después de recibir datos del contexto correcto (US-14).
  - (b) Corregir sin medir, con prefetch del otro contexto y de la meta frontal.
  - (c) Aceptar el comportamiento actual como límite de MVP-1.
- **Recomendación (aceptada): (a).** Evita una corrección que podría no hacer falta en producción.
  - **El umbral de 1 s es una propuesta del redactor**, no una decisión del maestro. Los fundadores pueden fijar otro.
  - **El prefetch del otro contexto debe respetar** FR-085 de la 004 y FR-037 a FR-039 de la 003: nada de un ámbito en el HTML, el RSC o la caché del otro.

#### Q5 · Core Web Vitals: qué se mide y qué se declara no medible

- **Decidido** (fundadores, 17 nov 2026): opción **(c)**, laboratorio en MVP-1 y medición de campo en MVP-2.
- **Contexto:**
  - **Lo que pide el maestro:** DEC-V04 y §10.2 piden LCP ≤ 2,5 s, INP ≤ 200 ms y CLS ≤ 0,1 **en el p75 de experiencias reales**. Si no hay tráfico suficiente, se reporta laboratorio «y no se presenta como p75 medido». §15.7 fija los umbrales que **bloquean**: CLS = 0 en las cargas con skeleton, INP < 200 ms al abrir Anotar y al guardar.
  - **Lo que hay:** con dos personas, un p75 real no tiene significado estadístico. La app no tiene medición de campo (RUM).
  - **El riesgo de añadirla:** sería telemetría nueva, sujeta a §7.4, sin importes ni identificadores.
- **Opciones:**
  - (a) **Solo laboratorio**, con los arneses existentes de `tests/evidence/` y Chromium emulado:
    - CPU 4× y 6×, red lenta y 390 y 1440 px.
    - Más **LCP de laboratorio** en Inicio y Actividad (hoy no se mide).
    - Más lo que los iPhone permitan medir.
    - Una tabla que diga, por métrica, «laboratorio» o «no medible en p75 real: motivo».
  - (b) Añadir medición de campo (por ejemplo Vercel Speed Insights o `web-vitals` hacia un endpoint propio) durante el uso diario de Q10. Es una dependencia y una telemetría nuevas, y necesitaría su revisión de privacidad.
  - (c) (a) ahora y (b) en MVP-2, cuando haya más uso.
- **Recomendación (aceptada): (c).** (a) cumple §10.2 literalmente («reportar métricas de laboratorio… y no presentarlas como p75 medido»), y (b) añadiría telemetría justo antes del gate para un p75 de dos personas. LCP no tiene umbral en §15.7: se reporta y, si supera 2,5 s en laboratorio, es un hallazgo que se trae a los fundadores, no un bloqueo automático.

#### Q6 · Verificaciones que necesitan un Android o un Mac, sin dispositivo

- **Decidido** (fundadores, 17 nov 2026): opción **(a) para el Mac** (CLS en iPhone antes de MVP-1) y **(c) para Android** (excepción prorrogada más allá de MVP-1, revalidación antes de abrir la app a un tercero).
- **Contexto:**
  - **Las excepciones vigentes:** la decisión 19.2 aprobó cinco excepciones formales «a revalidar antes del lanzamiento de MVP-1, en cuanto haya un Android o un Mac». Están en `specs/002` y son:
    - T090, sombras táctiles en un Android de gama media.
    - T092, TalkBack.
    - T094, CLS en iPhone con el inspector de Safari, que necesita un Mac.
    - T095, respaldo tipográfico de Onest en Android.
    - La parte Android de T086, teclado de terceros.
  - **Un hueco sin dueño:** la `[V]` de MOTION_SYSTEM de springs a ≥ 55 fps en un Android de gama media no figura en ninguna excepción.
  - **El dato de partida:** los dos fundadores usan iPhone y ninguno tiene Android.
- **Opciones:**
  - (a) **Conseguir los dispositivos para el gate**: un Android de gama media prestado o comprado y un Mac prestado, y ejecutar las seis verificaciones contra producción con las cuentas reales.
  - (b) **Dispositivo real remoto**: un servicio de pruebas en la nube contra `juntia-dev`, nunca contra producción ni con datos reales. Es un servicio externo nuevo y quizá de pago.
  - (c) **Prorrogar las excepciones más allá de MVP-1**, con los cinco datos de la decisión 12, incluida la de los springs. Requiere enmendar la decisión 19.2, que dice «antes del lanzamiento de MVP-1».
- **Recomendación (aceptada): (a) para el Mac y (c) para Android.**
  - **Por qué (a) para el Mac:** el CLS en iPhone afecta a los dos usuarios reales.
  - **Por qué (c) para Android:** ninguno de los dos usuarios de MVP-1 usa Android, así que el riesgo residual no alcanza a nadie hasta que haya un usuario de Android.
  - **Con (c), dos cosas:** la revalidación pasa a ser condición de abrir la app a un tercero, y la mitigación sigue siendo la emulación de Chrome y axe.
  - **Si los fundadores eligen (c)**, el PR documental enmienda la decisión 19.2.

#### Q7 · CLS = 0 fuera de Chromium (decisión 19.4): ¿con qué método?

- **Decidido** (fundadores, 17 nov 2026): opción **(a)**, comparador por fotogramas en WebKit y Firefox.
- **Contexto:**
  - **La obligación:** la decisión 19.4 aplazó «CLS = 0 en Firefox y WebKit» como criterio obligatorio antes de MVP-1, con el gestor como dueño. La decisión 12 la marcaba «sin excepción posible».
  - **Por qué no se ha medido:** el arnés R2 usa la API Layout Instability y el screencast de CDP, que solo existen en Chromium. WebKit y Firefox no exponen `layout-shift`.
- **Opciones:**
  - (a) **Método por fotogramas:**
    - Playwright graba la carga en WebKit y Firefox con red y CPU lentas.
    - Un comparador comprueba que, entre el primer fotograma con esqueleto y el contenido final, ningún bloque cambia de posición: sus cajas se miden con `getBoundingClientRect` en cada fotograma de una carga instrumentada.
    - Corre en las rutas con sesión contra `juntia-dev` (decisión 18) y en las rutas sin sesión.
    - La evidencia sale de un run de CI lanzado a mano.
  - (b) **Revisión humana fotograma a fotograma** de las grabaciones, sin comparador.
  - (c) **Medir solo WebKit**, que es el motor de los dos usuarios, y dejar Firefox en excepción formal. Exige enmendar la 19.4.
- **Recomendación (aceptada): (a) sobre WebKit y Firefox**, con las mismas rutas clave que FR-050.
  - **Por qué:** es objetivo y repetible, y no reabre una decisión «sin excepción».
  - **Si el método no se puede construir** con fiabilidad dentro del PR A, la pregunta vuelve a los fundadores con (c).

#### Q8 · Eliminación de cuenta y los «pendientes de lanzamiento»: ¿bloquean MVP-1 privado?

- **Decidido** (fundadores, 17 nov 2026): opción **(a)**, aplican al lanzamiento público; en MVP-1, procedimiento manual ensayado.
- **Contexto:**
  - **Lo que dice el maestro:** el §15.6.1 dice que la eliminación de cuenta «bloquea **declarar el lanzamiento privado**», y exige un procedimiento real, verificable y revisado legalmente.
  - **Los pendientes de la decisión 16:** suma a ese bloqueo cuatro «pendientes de lanzamiento»:
    - términos legales definitivos;
    - servidor de correo propio;
    - apertura del registro;
    - cerrar la enumeración por la API de Auth (16.16).
  - **Lo que decidieron después los fundadores:** el 5 de noviembre de 2026 decidieron dejar el correo de Supabase y pulir correo e inicio de sesión al final del producto. El encargo de esta spec pone **fuera de MVP-1** el SMTP propio, Google y Resend.
  - **Lo que hay en producción:** MVP-1 es privado y para dos personas, con el registro cerrado a sus dos correos (decisión 16.9).
- **Opciones:**
  - (a) **Los cuatro pendientes de la decisión 16 aplican al lanzamiento público**, no a MVP-1. El registro sigue cerrado y la enumeración queda como riesgo aceptado mientras lo esté.
    - **La eliminación de cuenta** se cubre con un **procedimiento manual documentado y ensayado** en `juntia-dev`: lo ejecuta el gestor con el «sí» de la persona y su resultado es verificable.
    - **La revisión legal** se exige antes de abrir la app a terceros.
    - **La interfaz** sigue diciendo «no disponible» y explica cómo pedirlo.
    - **Requiere enmendar** el §15.6.1 y la decisión 16.
  - (b) **Cumplir el §15.6.1 tal como está**: construir y someter a revisión legal la eliminación de cuenta antes de MVP-1. Es una funcionalidad nueva dentro de un gate que no las admite.
  - (c) (a) sin procedimiento manual: la eliminación queda totalmente fuera hasta el lanzamiento público.
- **Recomendación (aceptada): (a).**
  - **Por qué:** las dos personas son a la vez las dueñas de los datos y las del producto. Un procedimiento manual ensayado protege su derecho sin construir una funcionalidad en el gate.
  - **El resto ya era coherente:** los otros pendientes quedan donde los fundadores ya los pusieron, al final del producto.
  - **El enfoque no cambia:** es una enmienda del maestro y la hace el PR documental, no esta spec.

#### Q9 · Respaldo y recuperación: cuánto dato puede perderse

- **Decidido** (fundadores, 17 nov 2026): opción **(a)**, semanal más antes de cada migración más restauración real; pérdida máxima 7 días.
- **Contexto:**
  - **Lo vigente:**
    - La decisión 16.11 fija una copia completa cifrada fuera de Supabase antes del primer dato real y, después, una copia semanal manual.
    - La decisión 19.3 fija la primera copia real y su restauración antes del primer movimiento real en producción.
    - El plan Free de Supabase no tiene recuperación a un punto en el tiempo (PITR) y puede suspender el proyecto (§7.5).
  - **Lo que implica hoy:** con la copia semanal se pueden perder hasta 7 días de movimientos.
  - **Lo que dice la evidencia:** `specs/002-cuentas-y-gastos-privados/evidence.md` todavía muestra T097 (primera copia real y su restauración) como pendiente. Si ya se hizo, falta registrar su salida (FR-004).
  - **Lo que no se ha ensayado:** el esquema de P0-3, con sus seis tablas, solo se ha restaurado en el ensayo de CI con datos sintéticos, no con una copia real.
- **Opciones:**
  - (a) **Semanal, más una copia antes de cada migración de producción, más una restauración real** de una copia con el esquema de P0-3 en el equipo de un fundador antes de declarar MVP-1. Pérdida máxima aceptada: 7 días.
  - (b) Copia diaria manual, con una pérdida máxima de 1 día y más trabajo para un fundador.
  - (c) Pasar a un plan de Supabase con PITR, con su coste.
- **Recomendación (aceptada): (a).** Es lo ya decidido más dos puntos que la protegen donde más riesgo hay: las migraciones y el esquema nuevo. Que la pérdida máxima sea 7 días es una decisión de los fundadores y queda escrita como tal.

#### Q10 · Aprobación de los fundadores: cuánto uso diario y cómo se registra

- **Decidido** (fundadores, 17 nov 2026): opción **(a)**, sesión guiada más 7 días consecutivos de uso diario real.
- **Contexto:**
  - **Lo que pide el maestro:** «ambos aprueban uso diario, legibilidad, rapidez y carácter visual» (§11). Ambos completan US-01 a US-04, US-18 a US-23 y S1–S5 en teléfono y desktop, «tareas completadas sin explicación externa», con comentarios por separado (§10.4).
  - **Lo que no dice:** ni cuánto uso diario hace falta antes de aprobar ni la forma del registro.
- **Opciones:**
  - (a) **Una sesión guiada y un periodo de uso:**
    - **La sesión guiada:** el escenario de pareja de §4, completo, en móvil y en escritorio.
    - **El periodo:** al menos **7 días consecutivos de uso diario real** en producción.
    - **El registro:** cada fundador escribe por separado sus notas en los cuatro ejes (uso diario, legibilidad, rapidez, carácter visual) y responde las tres preguntas de §6.7: qué es claro, qué impresiona y qué estorba.
    - **Para declarar MVP-1:** los dos aprueban sin fallos críticos abiertos.
  - (b) Solo la sesión guiada, sin periodo de uso.
  - (c) Un periodo más largo, de 14 días.
- **Recomendación (aceptada): (a).** Siete días cubren una semana completa de gastos reales, con un fin de semana y una liquidación. Es lo mínimo para que «uso diario» signifique algo.
  - **Qué es un fallo crítico:** un defecto de dinero, privacidad, pérdida de datos o accesibilidad básica (§12.4).
  - **Los fallos menores** van a la lista de MVP-2 con dueño.

#### Q11 · Defectos y pedidos de usabilidad abiertos: ¿cuáles entran en P0-4?

- **Decidido** (fundadores, 17 nov 2026): opción **(a)**, entra lo que incumple un criterio del gate; el refinamiento va a MVP-2.
- **Contexto:** quedan abiertos, sin corregir, estos puntos:
  - **Residuo de F13:** con la raíz al 200 %, Inicio · Yo a 1440 mide 1.447 px, por el abanico en px (`docs/audits/2026-11-impeccable/f13/README.md` §3). Las hojas, los diálogos, A1–A6 y la invitación no se capturaron al 200 %.
  - **Goal Journey sin View Transition al cerrar:** limitación conocida, `specs/004-presupuestos-y-metas/evidence.md`.
  - **Tres pedidos de los fundadores** en el registro del gestor:
    - cruzar 768 px con Anotar abierto pierde el monto escrito;
    - un «Descartar» para una fila atascada;
    - el marco de foco del campo del monto.
  - **«Tu disponible · aportaste»:** sigue pendiente de aprobación en pantalla.
- **Opciones:**
  - (a) **Entra en P0-4** todo lo que incumpla un criterio de este gate:
    - el residuo de F13, porque el 200 % sin pérdida es obligatorio (§15.9);
    - la pérdida del monto al cruzar 768 px, porque pierde datos escritos;
    - el marco de foco si no cumple el foco del handoff.
    - **Va a la lista de MVP-2:** lo que es refinamiento, es decir, «Descartar» y el cierre con View Transition.
    - **Se aprueba en pantalla:** «Tu disponible · aportaste», en la revisión de S5.
  - (b) Todo entra en P0-4.
  - (c) Nada entra: solo los defectos que encuentre el barrido.
- **Recomendación (aceptada): (a).** Respeta «no se baja el estándar» y «no se añaden funcionalidades» a la vez. «Descartar» es una funcionalidad nueva de recuperación, no la corrección de un defecto.

#### Q12 · Tabla de idempotencia: ¿se purga antes de MVP-1?

- **Decidido** (fundadores, 17 nov 2026): opción **(a)**, sin purga en MVP-1; se mide y se revisa en MVP-2.
- **Contexto:** `specs/002-cuentas-y-gastos-privados/data-model.md` deja la purga de los registros de idempotencia para revisar «antes de MVP-1». Con dos personas, el crecimiento es de cientos de filas al mes. Purgar mal rompería la recuperación de una respuesta perdida, porque `write_status` lee esos registros.
- **Opciones:**
  - (a) **Sin purga en MVP-1.** El gate mide y registra el tamaño de la tabla y la revisión pasa a MVP-2.
  - (b) Definir ahora una retención (por ejemplo, 90 días) con su migración y sus pruebas.
- **Recomendación (aceptada): (a).** Medir no cuesta nada y purgar es un cambio de esquema sin necesidad hoy.

## User Scenarios & Testing *(mandatory)*

Las historias de P0-4 son **recorridos de verificación**. Cada una se puede ejecutar y
registrar por separado; juntas son la condición para declarar MVP-1.

### User Story 1 - El dinero y la privacidad pasan completos sobre el commit de lanzamiento (Priority: P1)

El gestor ejecuta la suite completa de dinero y privacidad sobre el commit que se va a
etiquetar como MVP-1. Incluye el ledger de metas, la restauración y los huecos de
cobertura que esta spec cierra, y registra la salida.

**Why this priority**: §1: «No se publica el MVP si… calcula mal». Sin esto, nada más importa.

**Independent Test**: un run de CI sobre el commit candidato con todos los jobs en verde, más la tabla de cobertura de esta spec, sin huecos sin dueño.

**Acceptance Scenarios**:

1. **Given** el commit candidato, **When** corren los jobs `app`, `db` y `e2e` (o los dos jobs e2e una vez partidos), con las cinco specs E2E, **Then** todo está en verde, el ensayo de restauración pasa con sus controles negativos N1–N11, y la salida queda en `evidence.md`.
2. **Given** la tabla «Cobertura de dinero y privacidad», **When** se revisa contra US-01 a US-23 y §15.6.3 puntos 1 a 7, **Then** cada fila tiene al menos una prueba que corre en CI, o una razón escrita de por qué no aplica (US-07, fuera de MVP-1).
3. **Given** el dataset dorado completo (partes de P0-1, P0-2 y P0-3), **When** corren las pruebas de dominio, **Then** se reproducen sin redondeo el caso de octubre, las siete filas de DEC-G04 y los escenarios de noviembre.

---

### User Story 2 - El humo de release pasa en producción con cuentas reales (Priority: P1)

Los dos fundadores recorren en producción, con sus cuentas y dispositivos, la checklist
de humo de release (Q3, opción a), y el gestor corre las cinco specs E2E en WebKit una vez.

**Why this priority**: es la única prueba del despliegue real; CI usa un Supabase limpio.

**Independent Test**: la checklist de humo firmada por los dos y el run de WebKit en verde.

**Acceptance Scenarios**:

1. **Given** producción con el commit etiquetado, **When** cada fundador entra, anota un gasto real, ve Inicio y Actividad, abre Balance (escritorio) o el balance desde Inicio (móvil), abre una meta, exporta y sale, **Then** cada paso funciona sin error y la cifra que muestra coincide con lo registrado.
2. **Given** las cinco specs E2E, **When** se lanzan a mano en WebKit sobre el commit candidato, **Then** pasan; un fallo solo de WebKit es un defecto del gate (los dos usan Safari).

---

### User Story 3 - S1–S5 se ven y se entienden con datos reales, con y sin movimiento (Priority: P1)

Los dos fundadores revisan cada experiencia insignia con sus datos reales, en su
iPhone y en escritorio a 1440, primero con movimiento y después con «Reducir
movimiento» del sistema.

**Why this priority**: §1 y §6.4: «No se publica… si solo está "funcional pero feo"»; el gate de cada experiencia exige datos persistidos.

**Independent Test**: la tabla de revisión S1–S5 (FR-030), con una fila por experiencia, ancho y modo de movimiento, y las notas de cada fundador.

**Acceptance Scenarios**:

1. **Given** datos reales de la pareja, **When** se cambia Yo ↔ Nosotros (S1), **Then** las cifras, el color y los títulos cambian sin mostrar ni un fotograma de datos del otro contexto (US-14), y la transición se ve, o el resultado de Q4 queda registrado.
2. **Given** Anotar (S2), **When** se registra un gasto privado, uno compartido y uno con meta, **Then** cada uno se guarda una vez, la fila nueva aparece en su lista y el total cambia; con movimiento reducido no hay desplazamientos ni escalas y el valor final está en el DOM (US-17).
3. **Given** Análisis (S3) con y sin presupuesto, **When** se lee el mes, **Then** sin presupuesto no hay «restante», «excedido», barras vacías ni cero ficticio; con presupuesto se ve límite, consumido, desviación y ritmo con texto, forma y color.
4. **Given** el balance de la pareja (S4), **When** se registra una liquidación parcial real, **Then** el saldo cambia de forma continua, el gasto del grupo no baja y nada sugiere ganadores ni perdedores.
5. **Given** la meta compartida (S5), **When** cada uno aporta y se registra un gasto con meta, **Then** la cinta y los aportes por persona se actualizan después de la confirmación del servidor; una bajada por uso explica qué se compró, sin animación de pérdida.
6. **Given** el sistema con «Reducir movimiento», **When** se repiten los pasos 1 a 5, **Then** todo es usable y completo, sin animaciones expresivas.

---

### User Story 4 - Ninguna pantalla se rompe en ningún ancho, tema o estado (Priority: P1)

El gestor lanza el barrido completo de accesibilidad y responsive (decisión 21.2) y
completa la matriz de estados de §6.3 con el dataset y con listas largas.

**Why this priority**: §6.3 y §10.3: los estados son parte del diseño y de la aceptación; la decisión 21.2 pone un barrido «antes de MVP-1».

**Independent Test**: el run `@sweep` en verde y la matriz de estados completa con capturas.

**Acceptance Scenarios**:

1. **Given** el barrido `@sweep`, **When** corre en 360, 390, 430, 768, 1024, 1280 y 1440, en los dos temas, con texto al 200 %, recorrido de teclado y objetivos de 44 px, **Then** no hay violaciones serias ni críticas de axe, no hay scroll horizontal y no falla ninguna comprobación de geometría.
2. **Given** una cuenta de `juntia-dev` con listas largas (FR-043), **When** se abren Actividad, el historial de aportes y el de presupuestos, **Then** la lista pagina sin saltos, el total no cambia al cargar más y nada se solapa.
3. **Given** el iPhone de cada fundador, **When** se abre Anotar con el teclado y se usa la barra inferior, **Then** el teclado no tapa el campo activo ni Guardar, y la barra respeta el área segura.

---

### User Story 5 - Los umbrales de rendimiento tienen medición, y lo no medible lo dice (Priority: P2)

El gestor mide en laboratorio los umbrales de §15.7 y los proxies de CWV, consolida las
tareas de laboratorio pendientes de las specs 003 y 004 y escribe la tabla de «no
medible en p75 real» (Q5, opción c).

**Why this priority**: §15.7 bloquea la aceptación; §10.2 exige no presentar laboratorio como p75.

**Independent Test**: la tabla de rendimiento de FR-050 a FR-056, con cifra, método, versión del navegador y rótulo.

**Acceptance Scenarios**:

1. **Given** las rutas con esqueleto, **When** se miden 40 cargas por ruta como en la 001, **Then** CLS = 0, sin redondear.
2. **Given** Anotar, **When** se mide abrir y guardar (privado, compartido y con meta) con CPU 4×, **Then** INP < 200 ms.
3. **Given** que no hay medición de campo, **When** se escribe la tabla de CWV, **Then** cada métrica dice «laboratorio» o «no medible en p75 real: motivo», nunca «p75».

---

### User Story 6 - Si algo se pierde, se recupera (Priority: P1)

Un fundador, con el gestor, hace una copia real de producción, la restaura en su equipo,
comprueba las invariantes y deja escrito el procedimiento de recuperación de acceso y
de despliegue.

**Why this priority**: §7.4 y §12.3 («Pérdida de datos»): «exportación y recuperación probada».

**Independent Test**: la checklist de release (FR-060 a FR-069) firmada, con la salida de la restauración.

**Acceptance Scenarios**:

1. **Given** producción con datos reales de P0-1 a P0-3, **When** se hace la copia cifrada y se restaura en un PostgreSQL 17 limpio, **Then** las invariantes pasan y los recuentos y huellas por tabla coinciden con el manifiesto, incluidas las seis tablas de P0-3.
2. **Given** cada fundador, **When** exporta JSON y CSV, **Then** el archivo llega, contiene sus datos autorizados y nunca los privados, las metas personales ni los presupuestos personales del otro.
3. **Given** que un fundador olvida su contraseña, **When** usa la recuperación en producción, **Then** recibe el enlace y vuelve a entrar.
4. **Given** un despliegue defectuoso, **When** se sigue el procedimiento de vuelta atrás, **Then** el despliegue anterior vuelve a servir sin tocar la base de datos.

---

### User Story 7 - Los dos aprueban y se declara MVP-1 (Priority: P1)

Tras 7 días consecutivos de uso diario real (Q10, opción a), cada fundador registra por separado su
valoración; si los dos aprueban y no hay fallos críticos abiertos, el PR documental
de cierre declara MVP-1.

> **Enmienda del 25 de noviembre de 2026 (decisión 30).** La declaración es la
> aceptación técnica: los dos aprueban sin fallos críticos abiertos (FR-082) después de
> las verificaciones de esta spec, sin esperar al periodo de uso. El escenario 1 se rige
> por la 30.7. El escenario 2, el periodo y su valoración, es la validación por uso real,
> aplazada (30.6). El escenario 3 vale para los dos hitos.

**Why this priority**: §11: «Solo aquí se declara MVP-1 lanzado».

**Independent Test**: las dos valoraciones en `evidence.md` y el estado del maestro actualizado por un PR documental fusionado.

**Acceptance Scenarios**:

1. **Given** el escenario de pareja de §4, **When** lo completan en móvil y en escritorio, **Then** terminan cada tarea sin ayuda y leen bien cada cifra.
2. **Given** el periodo de uso diario, **When** cada uno valora uso diario, legibilidad, rapidez y carácter visual, **Then** sus notas quedan por separado, con lo que es claro, lo que impresiona y lo que estorba (§6.7).
3. **Given** un fallo crítico abierto, **When** se pretende declarar MVP-1, **Then** no se declara.

### Edge Cases

- **Una verificación falla en el gate:** el umbral no se mueve. Se corrige el defecto (PR B) o vuelve a los fundadores. Nunca se marca «superada» (`AGENTS.md` 12; §15.10, decisión 12).
- **Una verificación no se puede ejecutar por falta de dispositivo:** solo se admite la excepción formal de la decisión 12, con sus cinco datos y aprobada por los dos (Q6: hoy solo las de Android, prorrogadas más allá de MVP-1). Su estado es «EXCEPCIÓN APROBADA», nunca «verificado».
- **El barrido destapa un defecto en una pantalla ya aceptada:** es un defecto del gate, no una regresión de su slice. Se corrige en el PR B con su prueba en la capa más baja.
- **Un hallazgo pide una funcionalidad nueva:** va a la lista de MVP-2 con dueño. No entra en P0-4 sin decisión de los fundadores.
- **Producción se suspende por inactividad (plan Free):** la checklist de release incluye cómo detectarlo y reactivarlo (§7.5). No se usa un «ping» como garantía.
- **Se descubre un dato real anotado antes de la primera copia (decisión 19.3):** se registra tal cual en la evidencia, se hace la copia de inmediato y se informa a los fundadores. No se reescribe la historia.
- **El job de CI supera su presupuesto con las pruebas nuevas:** el hallazgo es la suite, no el techo (cláusula anticliquet); cuenta el margen de la partición del job `e2e`.
- **La doble fila del #53 aparece durante el uso diario:** el issue está diferido a MVP-2 (Q2, opción a); si un fundador la juzga un defecto de uso diario, vuelve a los fundadores con la opción (b) y su ADR.
- **Un fundador aprueba y el otro no:** no se declara MVP-1. Las notas del que no aprueba se convierten en defectos o en decisiones.

## Requirements *(mandatory)*

### Functional Requirements

Cada requisito dice su **evidencia**:

- **CI** es un job en verde sobre el commit candidato, con la salida pegada en la evidencia (ADR-011 §9.8); `juntia-dev` sirve para iterar, no para cerrar.
- **Laboratorio** es una medición rotulada como tal, con el método, la versión del navegador, la emulación y la salida.
- **Dispositivo** es una verificación en un teléfono real, con fecha, modelo y versión del sistema.
- **Revisión humana** es la valoración escrita de los fundadores o del gestor.

#### Entrada al gate y cierres heredados

- **FR-001**: P0-4 empieza con **P0-3 aceptada**:
  - T084, la salida interna real de los fundadores, con cuentas reales, no la simulación de `docs/audits/2026-11-t084/`;
  - el PR documental T085 fusionado.
  - **Evidencia:** las dos tareas con su salida en `specs/004-presupuestos-y-metas/evidence.md`.
- **FR-002**: El gate **consolida en una sola tabla** las verificaciones que las specs 001 a 004 dejaron «antes de MVP-1» o sin cierre registrado («Inventario de verificaciones heredadas»). Cada fila termina en uno de cuatro estados: «salida real» (con su enlace), «EXCEPCIÓN APROBADA», «no aplica: motivo» o «abierta». **Evidencia:** la tabla en `evidence.md`, sin filas abiertas al declarar MVP-1.
- **FR-003**: Las tareas que quedaron sin casilla marcada pese a estar hechas se registran con su salida y no se repiten. Las que no tienen salida se ejecutan. Es el caso de 004 (89 tareas sin marcar) y de 003-T072/T073/T074. **Evidencia:** el enlace a la salida o el run nuevo.
- **FR-004**: Se comprueba y se registra si la **primera copia real y su restauración** (002-T097; decisión 19.3) se hicieron antes del primer movimiento real en producción. Si no se hicieron, se hacen de inmediato y se informa a los fundadores sin reescribir nada. **Evidencia:** revisión humana y la salida de la copia.

#### Dinero y privacidad, incluido el ledger de metas

- **FR-010**: Toda la suite de dinero y privacidad corre en verde sobre el commit candidato:
  - las 21 pruebas pgTAP;
  - la integración de servidor;
  - el dominio y el dataset dorado;
  - las cinco specs E2E;
  - el ensayo de restauración con N1–N11.
  - **Evidencia:** CI.
- **FR-011**: La tabla «Cobertura de dinero y privacidad» de esta spec se mantiene al día. Cada historia US-01 a US-23 y cada punto de §15.6.3 nombra sus pruebas, y **ninguna prueba se duplica en otra capa** si no detecta nada nuevo (ADR-011; `docs/TESTING.md` §4). **Evidencia:** revisión del gestor.
- **FR-012**: Se cierran los huecos de cobertura de la tabla, cada uno **en la capa más baja que detecta su fallo**:
  - **US-08:** el caso literal «gasto grupal 400.000 al 50/50 → 400.000 del grupo, 200.000 a cada persona, nunca 800.000», en dominio y en la vista de una sentencia de integración.
  - **US-21:** las etiquetas «Apartado en Juntia» y «Transferencia declarada», que nunca se presentan como verificadas por un banco, en componentes.
  - **US-13:** que ni el registro, ni Anotar, ni Inicio, ni la invitación a la pareja exigen crear un presupuesto, en componentes, sin un E2E nuevo.
  - **US-11:** que no existe ninguna función ni control de salida o expulsión. Ya lo cubre la lista exacta de funciones de `supabase/tests/01_privileges` y no se añade otra prueba; la tabla lo cita.
  - **Evidencia:** CI.
- **FR-013**: **Ningún dato financiero ni personal sale a terceros por telemetría, errores ni registros** (§7.4). El gate comprueba tres cosas:
  - que la app no envía analítica;
  - que las respuestas de error no llevan importes ni notas;
  - que los registros de ejecución de Vercel de una semana de uso no contienen importes, comercios, notas ni tokens.
  - **Evidencia:** revisión de código y de la red en la checklist de humo, más la revisión humana de los registros.
- **FR-014**: Las comprobaciones de aislamiento de la superficie interna (001-T072, partes 1 y 2) se **repiten en producción** con el commit candidato: HTML, RSC, 404 y host no autorizado. Son controles de aislamiento y no admiten excepción (decisión 12). **Evidencia:** la salida de la sonda.
- **FR-015**: Se comprueba que ninguna clave privilegiada está en variables `NEXT_PUBLIC_*` del despliegue de producción, y que las migraciones aplicadas en producción coinciden, una a una, con las del repositorio en el commit candidato. **Evidencia:** la salida de la comprobación, sin valores de claves.

#### Smoke de release (Q3, opción a)

- **FR-020**: Las cinco specs E2E corren **completas** sobre el commit candidato, lanzadas a mano: Chromium en el gate y **una vez en WebKit**, sin crear una sexta spec (Q3, opción a). **Evidencia:** CI.
- **FR-021**: La **checklist de humo en producción** la recorren los dos fundadores, cada uno con su cuenta y su teléfono:
  - entrar;
  - anotar un gasto privado real;
  - ver Inicio y Actividad;
  - abrir el balance;
  - abrir una meta;
  - exportar;
  - salir y volver a entrar.
  - **Evidencia:** revisión humana, con fecha, modelo y versión del sistema.
- **FR-022**: El commit que se declara MVP-1 lleva una **etiqueta de producción** en git, como las etiquetas de despliegue de P0-1 a P0-3 (`specs/002-cuentas-y-gastos-privados/quickstart.md` §4.0), y Vercel reconoce a la dueña como autora del HEAD de `main` (decisión 13, regla 2). **Evidencia:** la etiqueta y el despliegue.

#### S1–S5 con datos reales y movimiento reducido

- **FR-030**: La **tabla de revisión S1–S5** tiene una fila por experiencia × {iPhone de cada fundador, 1440 px} × {con movimiento, con «Reducir movimiento»}. Cada fila lleva tres cosas: los pasos del gate de §6.4 (datos persistidos, estados negativos, errores de red, números largos, carga lenta y refrescos), la nota de cada fundador y las capturas o clips. **Evidencia:** revisión humana más capturas.
- **FR-031**: Con «Reducir movimiento», S1–S5 son completamente usables:
  - sin desplazamientos ni escalas;
  - con el valor final en el DOM;
  - con la alternativa documentada en MOTION_SYSTEM (US-17).
  - Lo objetivo ya está en CI (los casos de movimiento reducido de las specs 2 y 3 y del registro de axe) y se cita, no se duplica.
  - **Evidencia:** CI más revisión humana.
- **FR-032**: **F02** (S1 y S5 detrás del esqueleto) se mide en producción, en el iPhone de cada fundador, con 10 cambios de contexto y 10 aperturas de meta cada uno (Q4, opción a). Se corrige en el PR B si la mediana hasta el contenido supera 1 s o si un fundador lo juzga un defecto en la revisión de S1 o S5. Si hay corrección, conserva el aislamiento de contexto: nada de un ámbito en el HTML, el RSC, el prefetch ni la caché del otro (FR-085 de la 004; FR-037 a FR-039 de la 003). **Evidencia:** laboratorio o dispositivo, y CI de privacidad si se corrige.
- **FR-033**: Las `[P]` que siguen pendientes de aprobación en pantalla se aprueban en esta revisión, cada una por separado:
  - «Tu disponible · aportaste»;
  - la paleta propuesta;
  - «Gasto, ingreso y liquidación en tinta»;
  - las personas con patrón, en `person.1–2`.
  - **Evidencia:** revisión humana.
- **FR-034**: Los criterios de aceptación del handoff («solo P0») se recorren uno por uno con datos reales y cada uno se marca con su prueba o su revisión. **Evidencia:** la tabla «Criterios de aceptación aplicables».

#### Anchos, teclado, safe areas, listas largas, modo oscuro y estados

- **FR-040**: El **barrido completo** `@sweep` corre sobre el commit candidato (decisión 21.2): 360, 390, 430, 768, 1024, 1280 y 1440 px, los dos temas, texto al 200 %, teclado completo y objetivos de 44 px. Cero violaciones serias o críticas, cero scroll horizontal y cero fallos de geometría. **Evidencia:** CI lanzado a mano.
- **FR-041**: Una **matriz de estados × pantallas** según §6.3 tiene, para cada estado y en los dos temas, la prueba o la captura que lo cubre.
  - **Los estados:** sin movimientos, sin pareja, sin presupuesto, con presupuesto, sin metas, con metas, meta completada, retiro rechazado, exceso, datos extremos, error, carga, latencia, movimiento reducido, oscuro, muchos movimientos, textos largos y permisos denegados.
  - **Lo que no se cubre:** un estado sin cobertura se añade al registro de accesibilidad del PR A, o se justifica como «no aplica».
  - **Evidencia:** CI más capturas.
- **FR-042**: **Texto al 200 %** sin pérdida en todas las pantallas, también en hojas, diálogos, acceso (A1–A6) e invitación, que la pasada de F13 no capturó. El residuo de Inicio · Yo a 1440 (1.447 px) se corrige en el PR B (Q11, opción a). **Evidencia:** CI más capturas.
- **FR-043**: **Listas largas** con una cuenta sembrada en `juntia-dev`, con dos órdenes de magnitud por encima del uso esperado y al menos 500 movimientos en un mes, para Actividad, el historial de aportes y el de presupuestos. Paginación estable, totales de una sola lectura (FR-096 de la 004) y nada solapado a 390 ni a 1440. **Evidencia:** capturas más la integración existente de más de 500 filas.
- **FR-044**: **Teclado virtual y safe areas** en el iPhone de cada fundador:
  - Anotar con el teclado nativo;
  - el campo activo y Guardar visibles;
  - la barra inferior y la hoja respetan la zona del indicador de inicio;
  - en horizontal, nada queda detrás de la muesca.
  - Cierra la parte iPhone de 002-T086 y la `[V]` de `visualViewport` de RESPONSIVE (decisión 19.1).
  - **Evidencia:** dispositivo.
- **FR-045**: **Modo oscuro** en todas las pantallas y estados, según el diseño aprobado, sin inversión automática (§6.1). **Evidencia:** el barrido más las capturas de la tabla S1–S5.
- **FR-046**: **Teclado físico** en escritorio:
  - todo se opera con teclado;
  - el atajo N abre Anotar;
  - Escape cierra hojas y diálogos;
  - el foco vuelve al disparador, también al llegar por URL (lección T084 punto 3).
  - **Evidencia:** CI (barrido) más revisión humana.

#### Rendimiento y Core Web Vitals (Q5, opción c)

- **FR-050**: **CLS = 0** sin redondear en las cargas con esqueleto de las rutas clave, con 40 cargas por ruta como en la 001. Las rutas son Inicio (Yo y Nosotros), Actividad, Balance, Plan, Análisis y Metas. Consolida 003-T054 y T068 y 004-T040, T054 (CLS de Metas) y T079. **Evidencia:** laboratorio, en Chromium.
- **FR-051**: **CLS = 0 fuera de Chromium**, en WebKit y Firefox, con el comparador por fotogramas (Q7, opción a): entre el primer fotograma con esqueleto y el contenido final, ningún bloque cambia de posición, en las rutas de FR-050, con sesión contra `juntia-dev` y sin sesión. Si el método no resulta fiable en el PR A, vuelve a los fundadores con «solo WebKit» (002-T093; decisión 19.4). **Evidencia:** laboratorio, run de CI lanzado a mano.
- **FR-052**: **INP < 200 ms** al abrir Anotar y al guardar, en gasto privado, compartido y con meta, con CPU 4× a 390 y 1440. Consolida 003-T054 y 004-T067. **Evidencia:** laboratorio.
- **FR-053**: **Rendimiento del abanico de GoalStack con 6 metas** en gama media emulada (004-T054; decisión 22.2): CPU, red y versión del navegador declaradas. Si falla, la pantalla cae a la lista y vuelve a los fundadores, como dice la 22.2. **Evidencia:** laboratorio.
- **FR-054**: **LCP de laboratorio** en Inicio y Actividad a 390 (4G emulado, CPU 4×) y a 1440. Se reporta contra 2,5 s como **proxy**, rotulado «laboratorio» (§10.2; Q5, opción c). Si supera 2,5 s, es un hallazgo que se trae a los fundadores, no un bloqueo automático. **Evidencia:** laboratorio.
- **FR-055**: **US-12 · mediana < 10 s** para un gasto habitual en el iPhone de cada fundador, con al menos 10 gastos y el método escrito (002-T087; decisión 19.1). Los tiempos de CI no la sustituyen. **Evidencia:** dispositivo.
- **FR-056**: La **tabla de Core Web Vitals** dice, por métrica (LCP, INP, CLS), qué se midió, dónde y con qué método. Lo que no puede medirse en p75 real lo dice con su motivo (dos usuarios y sin medición de campo; la medición de campo pasa a MVP-2, Q5, opción c). Nada se rotula «p75». **Evidencia:** la tabla en `evidence.md`.

#### Checklist de release, exportación, respaldo y recuperación

- **FR-060**: **Exportación** con cuentas reales:
  - cada fundador descarga el JSON y el CSV;
  - comprueba que el archivo abre;
  - comprueba que contiene sus movimientos, metas, aportes, solicitudes y presupuestos autorizados;
  - comprueba que no contiene nada privado del otro.
  - El contenido ya lo prueban la integración (`export`, `planning-export`) y la descarga, la spec E2E 1; aquí se confirma con datos reales.
  - **Evidencia:** CI más revisión humana.
- **FR-061**: **Copia real y restauración** antes de declarar MVP-1 (Q9, opción a): una copia cifrada de producción con el esquema de P0-3, restaurada en un PostgreSQL 17 limpio del equipo de un fundador, con `check-invariants.sql` y el manifiesto de recuentos y huellas (`specs/002-cuentas-y-gastos-privados/quickstart.md` §4.1 a §4.3). Ningún agente ve la contraseña de producción (decisión 19.3). **Evidencia:** la salida de la restauración, sin datos.
- **FR-062**: La **frecuencia de las copias y la pérdida máxima aceptada** quedan escritas en la checklist (Q9, opción a): copia semanal manual y una antes de cada migración de producción; pérdida máxima aceptada, 7 días. Con un dueño y un recordatorio. **Evidencia:** la checklist.
- **FR-063**: **Recuperación de acceso** en producción con el correo de Supabase: la recuperación por enlace funciona para cada fundador. Se documentan el límite de envío y qué hacer si se alcanza. **Evidencia:** revisión humana.
- **FR-064**: **Vuelta atrás de un despliegue:** un procedimiento escrito para volver al despliegue anterior en Vercel sin tocar la base de datos, ensayado una vez sobre un preview o un despliegue anterior. **Evidencia:** la salida del ensayo.
- **FR-065**: **Migración de producción:** antes de cada una, una copia (Q9, opción a) y el «sí» de un fundador antes de cada paso de escritura. Es la regla vigente del gestor, que la checklist hace explícita. **Evidencia:** la checklist.
- **FR-066**: **Suspensión del plan Free** (§7.5): la checklist dice cómo detectar que el proyecto está pausado, cómo reactivarlo y que no se usa un «ping» como garantía. **Evidencia:** la checklist.
- **FR-067**: **Eliminación de cuenta y pendientes de lanzamiento** (Q8, opción a): aplican al lanzamiento público, no a MVP-1. Para MVP-1, el procedimiento manual de eliminación escrito, ensayado en `juntia-dev` y con salida verificable, y la interfaz que sigue diciendo «no disponible» y explica cómo pedirlo. La revisión legal se exige antes de abrir la app a terceros. **Evidencia:** la salida del ensayo.
- **FR-068**: **Tabla de idempotencia** (Q12, opción a): sin purga en MVP-1; su tamaño medido y registrado, y la revisión, en la lista de MVP-2. **Evidencia:** la consulta.
- **FR-069**: La **checklist de release** es un documento del slice (`specs/005-gate-mvp-1/release-checklist.md`), creado en el plan, con todas las casillas de FR-060 a FR-068 marcadas con su evidencia. Es la evidencia de la fila P0-4 del backlog («Checklist de release + exportación»). **Evidencia:** la checklist firmada por el gestor y un fundador.

#### Verificaciones de dispositivo (decisiones 19.1 y 19.2)

- **FR-070**: Se ejecutan en el iPhone de los fundadores, en producción y con datos reales, las verificaciones aplazadas por la 19.1:
  - VoiceOver con Anotar real (002-T091; 001-T075), extendido al menos a Inicio, Balance y una meta;
  - contraste en los dos temas (002-T089; 001-T073);
  - el teclado (FR-044);
  - US-12 (FR-055);
  - el back-swipe de iOS frente al cierre de Goal Journey (MOTION_SYSTEM `[V]`; 004).
  - **Evidencia:** dispositivo.
- **FR-071**: Las verificaciones que necesitan un Android o un Mac se resuelven así (Q6):
  - **Mac, opción (a):** 002-T094, el CLS en iPhone con el inspector de Safari, se ejecuta antes de declarar MVP-1 con un Mac prestado, contra producción y con las cuentas reales. **Evidencia:** dispositivo.
  - **Android, opción (c):** 002-T086 (parte Android), T090, T092 y T095, más los springs a ≥ 55 fps en Android de gama media de MOTION_SYSTEM, quedan como «EXCEPCIÓN APROBADA» **prorrogada más allá de MVP-1**, con los cinco datos de la decisión 12. Su revalidación pasa a ser condición de abrir la app a un tercero, y la mitigación sigue siendo la emulación de Chrome y axe. **Evidencia:** la excepción registrada, con los springs añadidos.
- **FR-072**: La persistencia del tema en `profiles` y la cookie (`[P][V]`, decisión 16.7) tiene una salida explícita: el tema elegido en un dispositivo se aplica sin parpadeo al entrar en el otro. **Evidencia:** dispositivo o CI.

#### Aprobación de los fundadores (Q10, opción a)

- **FR-080**: Los dos fundadores, con cuentas y dispositivos distintos, completan el **escenario de pareja de §4** en móvil y en escritorio, incluidas una meta individual y una compartida, aportes independientes, un gasto con meta sin doble conteo y un presupuesto que crean y desactivan. **Evidencia:** revisión humana.
- **FR-081**: Tras el periodo de uso diario de Q10, cada fundador escribe **por separado** su valoración en cuatro ejes (uso diario, legibilidad, rapidez y carácter visual) y en las tres preguntas de §6.7 (qué es claro, qué impresiona y qué estorba). **Evidencia:** las dos notas en `evidence.md`.
- **FR-082**: **MVP-1 se declara** solo si:
  - los dos aprueban;
  - no queda ningún fallo crítico abierto (dinero, privacidad, pérdida de datos o accesibilidad básica, §12.4);
  - la tabla de FR-002 no tiene filas «abiertas».
  - La declaración la registra un PR documental que actualiza el estado del maestro, de `AGENTS.md` y de `CLAUDE.md`; esta spec no la hace.
  - **Evidencia:** el merge de ese PR.
- **FR-083**: Los fallos no críticos que salgan del uso diario van a una **lista de MVP-2** con dueño. No bloquean la declaración si los dos lo aceptan por escrito. **Evidencia:** la lista.

> **Enmienda del 25 de noviembre de 2026 (decisión 30).**
>
> - **FR-080:** se rige por la 30.7. Hasta que los fundadores confirmen esa propuesta,
>   sigue exigiendo la sesión guiada de los dos para la aceptación técnica.
> - **FR-081:** pasa a la validación por uso real, aplazada (30.6), y no condiciona la
>   declaración.
> - **FR-082:** «los dos aprueban» es la aprobación de la aceptación técnica, con las
>   demás condiciones intactas.
> - **FR-083:** la lista de MVP-2 se entrega con la declaración con lo que haya. Los
>   fallos no críticos del periodo de uso se añaden cuando ese periodo ocurra.

#### Pruebas y CI (ADR-011, `docs/TESTING.md`)

- **FR-090**: P0-4 **no añade specs E2E** (Q3, opción a); el total sigue en 5 de un tope de 4–6. Las pruebas nuevas van en dominio, componentes o integración (FR-012) o son arneses de laboratorio fuera del gate de PR (`tests/evidence/`).
- **FR-091**: Las capas de base de datos se iteran contra `juntia-dev` con sus guardias (decisión 18). El gate es CI sobre el commit candidato.
- **FR-092**: El barrido `@sweep` y las cinco specs en WebKit se lanzan a mano y **una vez por commit candidato**. No se relanzan «para ver si pasan» (`AGENTS.md` 15a).
- **FR-093**: Los arneses de laboratorio nuevos (LCP; CLS fuera de Chromium con el comparador por fotogramas, Q7) viven en el proyecto `evidence` y no corren en el gate de PR.
- **FR-094**: Cada corrección del PR B lleva su prueba en la capa más baja que detecta el fallo, con el procedimiento de `docs/TESTING.md` §6.
- **FR-095**: Los presupuestos de job no se mueven. El margen para las pruebas nuevas sale de la partición del job `e2e` que hace otra sesión (decisión de los fundadores del 17 de noviembre de 2026); si aun así se supera un presupuesto, se aplica la cláusula anticliquet.

#### Fuera de alcance de MVP-1 (explícito)

- **Fotos de metas** y ADR-014 (Storage privado), que pasan a MVP-2 (decisión de los fundadores del 17 de noviembre de 2026), junto con sus `[V]` de scrim y luminancia.
- **Correo propio (SMTP), «Entrar con Google» y Resend**: el correo de autenticación sigue siendo el de Supabase (decisión de los fundadores del 5 de noviembre de 2026; Q8, opción a: el correo propio pasa al lanzamiento público).
- **Landing, demo pública y case study** (§3; ADR-008).
- **IA, Jev, Gemini, OCR, voz, scraping, precios y ofertas** (§2.4; DEC-S01).
- **Modo offline** y cola de sincronización (§7.5; ADR-006).
- **Grupos de 3 o más**, salir o expulsar de la pareja (ADR-003), presupuestos sugeridos (DEC-R01-S), aportes programados, recurrentes y multimoneda.
- **Issue #53** (fila optimista doble), a MVP-2 (Q2, opción a).
- **Nivel 2 nocturno** de `docs/TESTING.md` §3, a MVP-2 (Q3, opción a).
- **Medición de campo (RUM)**, a MVP-2 (Q5, opción c).
- **Eliminación de cuenta en la interfaz**, términos legales definitivos, apertura del registro y cierre de la enumeración por la API de Auth: aplican al lanzamiento público (Q8, opción a).
- **Verificaciones en Android** (002-T086 parte Android, T090, T092, T095 y los springs a 55 fps): prorrogadas más allá de MVP-1 como excepción formal; se revalidan antes de abrir la app a un tercero (Q6, opción c).

### Key Entities

P0-4 no crea datos de producto. Sus entidades son registros de evidencia:

- **Verificación heredada**: origen (spec y tarea), qué verifica, dueño, momento, estado (salida real, EXCEPCIÓN APROBADA, no aplica, abierta) y enlace a la salida.
- **Fila de revisión S1–S5**: experiencia, dispositivo o ancho, modo de movimiento, pasos, nota de cada fundador y capturas.
- **Medición de laboratorio**: métrica, ruta, método, emulación, navegador y versión, número de cargas o interacciones, resultado y rótulo «laboratorio».
- **Casilla de la checklist de release**: qué se comprobó, quién, cuándo y la salida, sin secretos ni datos.
- **Valoración de un fundador**: autor, fecha, los cuatro ejes, las tres preguntas de §6.7 y la decisión (aprueba o no aprueba).
- **Excepción formal**: los cinco datos de la decisión 12.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El commit candidato tiene **todos los jobs de CI en verde**, con las cinco specs E2E y el ensayo de restauración con N1–N11, y la salida pegada en la evidencia.
- **SC-002**: Las cinco specs E2E pasan **una vez en WebKit** sobre el commit candidato (Q3, opción a).
- **SC-003**: **Cero filas «abiertas»** en el inventario de verificaciones heredadas; cada una tiene salida real, «EXCEPCIÓN APROBADA» o «no aplica» con motivo.
- **SC-004**: **Cero violaciones serias o críticas** de axe, cero scroll horizontal y cero fallos de geometría en el barrido completo: siete anchos, dos temas, 200 %, teclado y 44 px.
- **SC-005**: **CLS = 0** sin redondear en las rutas clave con esqueleto en Chromium (40 cargas por ruta) y, con el método de Q7, en WebKit y Firefox.
- **SC-006**: **INP < 200 ms** al abrir Anotar y al guardar en sus tres variantes, en laboratorio.
- **SC-007**: **Mediana < 10 s** en el iPhone de cada fundador para un gasto habitual (US-12).
- **SC-008**: **Cero datos ajenos** en la exportación real de cada fundador y cero importes, notas o tokens en la telemetría, los errores y los registros revisados.
- **SC-009**: La **restauración real** de una copia con el esquema de P0-3 pasa las invariantes y coincide con el manifiesto de recuentos y huellas.
- **SC-010**: S1–S5 tienen su fila de revisión **aprobada por los dos fundadores** en iPhone y en 1440, con y sin movimiento reducido.
- **SC-011**: Los dos fundadores **aprueban por separado** uso diario, legibilidad, rapidez y carácter visual tras el periodo de uso de Q10, sin fallos críticos abiertos. **Enmienda del 25 nov 2026 (decisión 30):** se mide en la validación por uso real, aplazada (30.6), y no condiciona la declaración de MVP-1.
- **SC-012**: La tabla de Core Web Vitals **no contiene ninguna cifra rotulada «p75»** que no venga de medición de campo.

## Assumptions

- **P0-1, P0-2 y P0-3 están en producción** (`juntia-alpha.vercel.app`) y los fundadores las usan con datos reales; P0-3 se acepta antes de empezar P0-4 (FR-001).
- **Los dos fundadores usan iPhone** y ninguno tiene Android (decisión 12); para el CLS en iPhone se consigue un Mac prestado (Q6, opción a).
- **El catálogo, las pantallas y el dataset dorado** son los de la 004; P0-4 no añade pantallas.
- **El job `e2e` partido en dos** lo entrega otra sesión antes del PR A; si no llega, la cláusula anticliquet sigue valiendo.
- **El correo de autenticación** sigue siendo el de Supabase, con su límite de envío.
- **El despliegue** sigue la decisión 13; las migraciones a producción las aplica el gestor con el «sí» de un fundador antes de cada paso de escritura.
- **La revisión visual humana** es el gate de «Visual y motion», fuera de CI (ADR-011 §7), con Impeccable y Playwright como verificación, no como dirección.

---

## Cobertura de dinero y privacidad

Inventario de lo que **existe** (sobre `main` en `160d568`) y lo que **falta**. No se
duplica nada: una fila con cobertura no recibe pruebas nuevas.

**Capas existentes.**

- **pgTAP:** 21 archivos en `supabase/tests/`: privilegios y lista exacta de funciones (01), vistas `security_invoker` (03), `juntia_writer` (04), escritura directa imposible y auditoría inmutable (05), perfiles (06), movimientos (07), funciones de dinero (08), lista permitida (09), invitaciones y pareja (10, 10a), dinero compartido y Mover a Pareja (11, 11a), presupuestos (12, 12a), restauración (12_restore_schema), metas, ledger y solicitudes (13, 13a, 13b) y repartos (13_split_validation).
- **Integración** (`tests/integration/`): auth, foundation, controlled-tables, money, shared-money, concurrency, consistency, balance-months, budgets, goals, goal-races, metrics, export, planning-export, planning-pages, planning-adapters, seed, restore y restore-planning.
- **Dominio:** money, allocations, balances, budgets, goals y metrics (DEC-G04), con el dataset dorado `src/domain/golden/` (`october-2026.ts`, partes de P0-1 y P0-2; `planning-2026.ts`, parte de P0-3).
- **E2E:** las cinco specs de `tests/e2e/` (access-account, annotate, couple-settle, goals, budgets).

| Historia | Cubierta por | Hueco y requisito |
| --- | --- | --- |
| US-01 Gasto privado sin presupuesto | 11a, money SC-007, budgets.test (null ≠ 0), dataset de octubre | — |
| US-02 Cena en pareja | balances.test, 11_shared_money, E2E 3 | — |
| US-03 70/30 | allocations.test | — |
| US-04 Presupuesto activo y desactivado | planningScenarios.us04, plan.test, 12_budgets, E2E 5 | — |
| US-05 Privacidad RLS | 06, 08, 11a, 13a, controlled-tables, money SC-007, casos de privacidad de las E2E | — |
| US-06 Auditoría | 05, 08, 11 (anulación de liquidaciones), money | — |
| US-07 Presupuesto sugerido | — | **No aplica**: fuera de MVP-1 («No bloquea MVP-1», §4) |
| US-08 Sin doble conteo | 11a, dataset de octubre | **Falta el caso literal 400.000** → FR-012 |
| US-09 Liquidez | componentes (analysis, goal-funding, goals) | — (copy en componentes; auditoría de copy sin «te alcanza» en la revisión) |
| US-10 Corrección tras liquidar | balances.test, concurrency | — |
| US-11 Miembros salientes | 01_privileges (lista exacta de funciones, sin salida ni expulsión); couple.test (LimitNote) | — (se cita, FR-012) |
| US-12 Captura rápida | E2E 2 (tiempo de laboratorio y doble toque) | **Falta la mediana en teléfono real** → FR-055 |
| US-13 Presupuesto ausente | componentes de plan y presupuestos, E2E 5 | **Falta la prueba explícita «nunca se exige»** → FR-012 |
| US-14 Transición de contexto | casos de cookie, HTML, RSC y prefetch en las E2E 1, 3, 4 y 5 | — |
| US-15 Escritorio | comprobaciones a 1440 del barrido | **Juicio humano** → FR-030, FR-080 |
| US-16 Shared Balance | componentes (settle, shared-balance) | **Juicio humano** → FR-030 |
| US-17 Movimiento reducido | routes.a11y, casos @serial de las E2E 2 y 3 | Más la revisión humana → FR-031 |
| US-18 Meta individual | planningScenarios.us18, metrics, 13a | — |
| US-19 Meta compartida | planningScenarios.us19, E2E 4, 13_goals | — |
| US-20 Gasto con meta | goals (integración), metrics, 13_goals | — |
| US-21 Reserva frente a transferencia | goals.test (`transferred_declared`) | **Falta la etiqueta «Apartado en Juntia»** → FR-012 |
| US-22 Privacidad de metas | 13_goals, 13a, 13b, metrics, E2E 4 | — |
| US-23 Retiro y anulación seguros | 13_goals, goal-races, goals (integración) | — |

| Punto de §15.6.3 | Cubierto por |
| --- | --- |
| 1. Atomicidad de Mover a Pareja | 11_shared_money, concurrency, E2E 3 |
| 2. Idempotencia | 08, 10, 11, 12, 13; money, shared-money, goals |
| 3. `goal_usage_confirmations` | 13_goals, goals, goal-races |
| 4. RLS de metas | 13a, 13b, metrics, E2E 4 |
| 5. Registro inicial del gasto con meta | 13_goals, goals |
| 6. Autorización posterior de fondos ajenos | 13_goals, goals, goal-races, E2E 4 |
| 7. Ediciones concurrentes de presupuesto | 12_budgets, budgets (integración), E2E 5 |

**Ledger de metas:** cubierto en las cuatro capas, más el ensayo de restauración (N11,
una regla por control). P0-4 lo vuelve a ejecutar sobre el commit candidato (FR-010) y
con una copia real (FR-061); no añade pruebas.

## Inventario de verificaciones heredadas

Lo que las specs 001 a 004 dejaron «antes de MVP-1» o sin cierre registrado. El
estado es el que muestran las `evidence.md` sobre `160d568`; FR-002 y FR-003 lo
actualizan.

| Origen | Verificación | Estado registrado | Cierre en P0-4 |
| --- | --- | --- | --- |
| 002-T086 | Teclado nativo con la hoja de Anotar: iPhone; Android con teclado de terceros | iPhone **aplazada (19.1)**; Android **EXCEPCIÓN APROBADA (19.2)** | FR-044; Android prorrogada más allá de MVP-1 (Q6, opción c) |
| 002-T087 | US-12, mediana < 10 s en teléfono real | **Aplazada (19.1)** | FR-055 |
| 002-T089 (001-T073) | Contraste en iPhone, dos temas | **Aplazada (19.1)** | FR-070 |
| 002-T090 (001-T074) | Sombras táctiles en Android de gama media | **EXCEPCIÓN APROBADA (19.2)** | Prorrogada más allá de MVP-1 (Q6, opción c) |
| 002-T091 (001-T075) | VoiceOver con Anotar real | **Aplazada (19.1)** | FR-070 |
| 002-T092 (001-T075) | TalkBack | **EXCEPCIÓN APROBADA (19.2)** | Prorrogada más allá de MVP-1 (Q6, opción c) |
| 002-T093 | CLS = 0 en Firefox y WebKit | **Aplazada (19.4)**, gestor | FR-051 (Q7, opción a) |
| 002-T094 | CLS en iPhone con el inspector de Safari | **EXCEPCIÓN APROBADA (19.2)** | FR-071, con un Mac prestado antes de MVP-1 (Q6, opción a) |
| 002-T095 | Respaldo tipográfico de Onest en Android | **EXCEPCIÓN APROBADA (19.2)** | Prorrogada más allá de MVP-1 (Q6, opción c) |
| 002-T097 | Primera copia real y su restauración | **Pendiente** en la evidencia | FR-004, FR-061 |
| 002-T036 | Correo de verificación de la segunda fundadora en dev y prod | Parcial | FR-003 |
| 002-T101, T103, T105 | Revisión del PR D, salida interna, cierre de F0-b | Pendientes en la evidencia | FR-003 |
| 003-T054 | INP de Anotar en Nosotros; CLS de Inicio y Actividad | Pendiente | FR-050, FR-052 |
| 003-T068 | CLS de Balance | Pendiente | FR-050 |
| 003-T072 | Tabla de cierre de `[V]` de la 003 (incluida la función pura del balance y Mover a Pareja) | Abierta | FR-003 |
| 003-T073, T074 | Salida interna y cierre de P0-2 | Pendientes en la evidencia | FR-003 |
| 004-T040 | CLS = 0 con esqueleto de Plan | Pendiente | FR-050 |
| 004-T054 | GoalStack con 6 metas en gama media; CLS de Metas | Pendiente (su cierre era antes del merge del PR C) | FR-050, FR-053 |
| 004-T067 | INP al abrir Anotar y guardar un gasto con meta | Pendiente | FR-052 |
| 004-T079 | CLS = 0 con esqueleto de Análisis | Pendiente | FR-050 |
| 004-T080 | Gate del PR E: privacidad y presupuesto del job `e2e` | Pendiente en la evidencia | FR-003 |
| 004-T082 | Barrido de accesibilidad de cierre de P0-3 y las cinco specs | Pendiente | FR-003; lo absorbe FR-040 si no se hizo |
| 004-T041, T056, T069, T081 | Revisiones visuales de los fundadores | Parciales | FR-003, FR-033 |
| 004-T084, T085 | Salida interna de P0-3 y PR documental | Pendientes | FR-001 |
| Decisión 21.2 | Barrido completo «antes de MVP-1» | — | FR-040 |
| Decisión 16.16 | Enumeración por la API de Auth, riesgo aceptado «hasta MVP-1» | Riesgo aceptado | Al lanzamiento público (Q8, opción a) |
| `specs/002` data-model | Purga de la tabla de idempotencia «antes de MVP-1» | Sin revisar | FR-068: sin purga, se mide (Q12, opción a) |

## Inventario de `[V]`

| `[V]` | Fuente | Estado | Cierre en P0-4 |
| --- | --- | --- | --- |
| Contraste en dispositivo real | DESIGN_SYSTEM [V] (a); handoff | Aplazada (19.1) | FR-070 · fundadores · dispositivo |
| VoiceOver, TalkBack y axe en dispositivo | Handoff, «Validación real» | VoiceOver aplazada; TalkBack en excepción; axe solo en CI | FR-070, FR-071 · fundadores |
| Sombras táctiles en gama media | DESIGN_SYSTEM [V] (c) | EXCEPCIÓN APROBADA | Prorrogada más allá de MVP-1 (Q6, opción c) |
| Springs a ≥ 55 fps en Android de gama media con foto | MOTION_SYSTEM | **Sin dueño ni excepción** | Entra en la excepción de Android, prorrogada más allá de MVP-1 (Q6, opción c), con sus cinco datos; se revalida con la meta inmersiva sin foto |
| Gesto de cierre frente al back-swipe de iOS | MOTION_SYSTEM; §15.6.2 punto 1 | Aplazada (19.1) | FR-070 · fundadores · dispositivo |
| View Transitions con App Router | MOTION_SYSTEM; §15.6.2 punto 1 | Cerrada para la apertura; el cierre no usa View Transition (limitación) | A MVP-2 (Q11, opción a) |
| Altura del teclado nativo (`visualViewport`) | RESPONSIVE | iPhone aplazada; Android en excepción | FR-044; FR-071 |
| Rendimiento del abanico con 6 metas o más | RESPONSIVE; §15.6.2 punto 4 | Pendiente (004-T054) | FR-053 · gestor · laboratorio |
| Teclado nativo en Android con teclados de terceros | §15.6.2 punto 3 | Excepción (19.2) | Prorrogada más allá de MVP-1 (Q6, opción c) |
| Persistencia del tema en `profiles` y cookie | COMPONENT_SPECIFICATIONS §ThemeSelector | Sin cierre explícito encontrado | FR-072 |
| Ediciones concurrentes de presupuesto | Handoff; COMPONENT_SPECIFICATIONS | Cerrada (004, PR A y B) | Se repite en FR-010 |
| `goal_usage_confirmations`, atomicidad del gasto con meta, RLS de metas | Handoff, «Pendiente» | Cerradas (004, con run) | Se repite en FR-010 |
| Conversión privado → compartido | Handoff, «Pendiente» | Cubierta en CI (003); su tabla de cierre, abierta | FR-003 |
| **Fotos: scrim por luminancia, 4,5:1 y casos de foto** | BRAND_FOUNDATION; COMPONENT_SPECIFICATIONS §GoalCard; DESIGN_SYSTEM [V] (b); handoff; §15.6.2 punto 2 | No ejecutadas | **No aplican a MVP-1**: metas sin foto (decisión del 17 de noviembre de 2026); pasan a MVP-2 con ADR-014 |

## Inventario de `[P]`

Ningún `[P]` que afecte al alcance queda abierto (§15.9; decisiones 16, 20 y 22). Los
que solo requieren aprobación en pantalla y siguen sin ella se aprueban en la revisión
de S1–S5 (FR-033): la paleta propuesta (Sara petróleo, Hogar azul tenue, superficie
oscura), «Gasto, ingreso y liquidación en tinta», las personas con patrón en
`person.1–2`, «Cuenta reutiliza los fondos de categoría» y la copy «Tu disponible ·
aportaste». El texto ampliado al 200 % no requiere aprobación: es obligatorio (FR-042).

## Criterios de aceptación aplicables

### Del handoff («Criterios de aceptación (solo P0)»)

Todos aplican al gate y se recorren con datos reales (FR-034): Mi cuenta (05·9);
DEC-G04 sin «Total gastado» ni número héroe; un gasto compartido existe una vez; los
aportes no cambian `gasto_consumo`; la liquidación parcial de 200.000 deja 229.900;
el gasto con meta crea un único gasto real; el uso o retiro ajeno sin confirmación
queda bloqueado; un retiro nunca es ingreso; Anotar privado o compartido desde un solo
flujo; nunca más de dos integrantes; el saldo de octubre; presupuestos con historial y
sin pérdida concurrente; axe en los dos temas en Inicio, Actividad, Anotar, Balance y
Meta; movimiento reducido; y los totales del caso de octubre.

### Del maestro §15.7 (umbrales que bloquean)

| Umbral | Requisito |
| --- | --- |
| CLS = 0 en las cargas con esqueleto de las rutas clave | FR-050, FR-051 |
| INP < 200 ms al abrir Anotar y al guardar | FR-052 |
| Mediana < 10 s en teléfono real (US-12) | FR-055 |
| Sin scroll horizontal en 360, 390, 430, 1024 y 1440 | FR-040 (con 768 y 1280) |
| Objetivos táctiles ≥ 44 px | FR-040 |

### Del maestro §1, §10.4 y §11

MVP-1 se declara con el escenario de pareja completado por los dos en móvil y
escritorio, con metas, sin fugas ni incoherencias (FR-080), con S1–S5 aprobadas
(SC-010), con la aprobación separada de los dos (FR-081, FR-082) y con la checklist de
release y exportación firmada (FR-069).

> **Enmienda del 25 de noviembre de 2026 (decisión 30).** La declaración es la
> aceptación técnica: FR-080 según la 30.7, SC-010, FR-082 y FR-069. FR-081 pasa a la
> validación por uso real, aplazada (30.6).

## Specs E2E que añade P0-4

**Ninguna** (Q3, opción a). El total sigue en 5 de 4–6; la sexta plaza queda libre.

## ADR, erratas y conflictos

- **ADR que aplican:** ADR-001 a ADR-004, ADR-007, ADR-010, ADR-011, ADR-012 y ADR-013.
- **ADR nuevo:** ninguno. El #53 se difiere (Q2, opción a), así que no hace falta el ADR bajo ADR-013. ADR-014 pasa a MVP-2.
- **Enmiendas del maestro que exigen las respuestas:** filas 14 a 18 de «Contradicciones para el PR documental T085». La decisión 19.4 no se enmienda, porque Q7 eligió (a). Las hace el PR documental posterior, no esta spec.
- **Erratas pendientes del paquete:** ninguna en `docs/design/README.md`.

## Contradicciones para el PR documental T085

Esta spec **no las corrige**. Las lista para el PR documental de cierre de P0-3 (T085)
o el que lo suceda. En cada una manda la decisión más reciente de los fundadores, que
ya está en el código.

| # | Tema | Texto antiguo (dónde) | Decisión vigente (fuente) |
| --- | --- | --- | --- |
| 1 | **Pagador por defecto** | «La primera vez, "Pagó: yo"» y el último pagador recordado: maestro decisión 20.5; spec 003 Q5, US-2 escenario 1, FR-021; `specs/003-pareja-y-balances/quickstart.md` | Pagador = quien anota; el reparto se sigue recordando (fundadores, 12 nov 2026, T084 6b; PR #80, `src/features/expenses/split-state.ts`). Comentarios de código desfasados en `annotate-shared.test.tsx` y `shared-load.ts` |
| 2 | **«Tus aportes» en Metas · Yo** | Maestro decisión 22.11; spec 004 Q11, US-6, FR-035; quickstart, data-model y contracts de la 004 | «Tu disponible» (F06, 11 nov; T084, 12 nov; PR #77 y #80). **Desviación aprobada del 19 de noviembre de 2026:** la tarjeta B5 también pasa a «Tu disponible en {meta}: $X → $Y» (antes «Tus aportes en {meta} $X → $Y», que citan el comp 04·11 B5, spec 004 US-7 escenario 6 y su `evidence.md`), porque $X es lo disponible de quien aprueba (fundadores, «Sí, apruebo»; `src/lib/copy/es.ts`). «Tus aportes» permanece en los mensajes de error y en las notas de rechazo de la solicitud (`rejectNote` y `rejected`), a propósito. El PR documental (#89) decía que se quedaba en B5: debe recoger esta desviación |
| 3 | **«Retiro de meta · reasignación»** | `docs/GLOSSARY.md` (tres lugares); `docs/design/BRAND_FOUNDATION.md`; spec 004 US-6 y FR-100; quickstart de la 004 | «Retiro de la meta» (T084, 12 nov; PR #80). El concepto «reasignación, no ingreso» del handoff sigue valiendo |
| 4 | **Diálogos centrados en escritorio** | `docs/design/COMPONENT_SPECIFICATIONS.md` §Modal/§BottomSheet («diálogo centrado de 520 px»); `RESPONSIVE_SPECIFICATIONS.md` (dos lugares); spec 001 y su T035 (históricos) | Anclados arriba desde 768 px; confirmaciones centradas (decisión del 12 nov; PR #81; `docs/audits/2026-11-dialogs/README.md`) |
| 5 | **Q16 de la 004: fondos «proporcionales a lo disponible»** | Maestro decisión 22.16; spec 004 Q16 y FR-051 | Proporcionales a la parte de cada uno en el reparto, con mayor residuo (F20, 11 nov; F77-3; PR #77). Las Q16 de la 002 (perfil) y la 003 (tiempo real) no tienen conflicto |
| 6 | **Tamaños de texto en px** | `docs/design/DESIGN_SYSTEM.md` §1.4 (tokens y clamps en px) | Texto en `rem` (F13, 11 nov; PR #79), con la excepción F79-3 |
| 7 | **Campos táctiles a 16 px** | Ningún documento lo dice; `body.m` es 15 px en DESIGN_SYSTEM | 16 px en táctil (PR #82). Es un hueco de documentación, no una contradicción literal |
| 8 | **Fotos de metas y ADR-014 «antes de P0-4»** | Maestro §15.6.2 punto 2 y decisión 22.6; `docs/adr/ADR-010-metas.md`; spec 004 Q6, FR-036, tabla de `[V]`, ADR; plan, tasks y research de la 004; handoff («Fotos», «Pendiente»); BRAND_FOUNDATION; DESIGN_SYSTEM [V] (b); COMPONENT_SPECIFICATIONS §GoalCard; RESPONSIVE (foto de 470 px) | Sin fotos en MVP-1; ADR-014 a MVP-2 (fundadores, 17 nov 2026) |
| 9 | **Nivel 2 nocturno** | `docs/TESTING.md` §3 lo describe (cinco specs en Chromium y WebKit, snapshots, rendimiento) | No existe workflow nocturno ni post-merge (`.github/workflows/ci.yml`). Ver fila 17 |
| 10 | **Correo propio «antes de MVP-1»** | Maestro decisión 16.10 y «Pendientes de lanzamiento» de la decisión 16; `specs/002` quickstart y spec | Correo y acceso, al final del producto (fundadores, 5 nov 2026). Ver fila 16 |
| 11 | **Presupuesto del job `e2e`** | `docs/TESTING.md` §9 y decisiones 19.5 y 21.4 (un job, < 660 s) | El job se parte en dos (fundadores, 17 nov 2026); la tabla de presupuestos cambia con esa partición |
| 12 | **«READY WITH BLOCKERS» del handoff** | `docs/design/HANDOFF_CLAUDE_CODE.md`, «Decisiones»: bloquean la eliminación de cuenta **y la confirmación técnica de Supabase** | La confirmación técnica no es un pendiente (maestro §15.6, nota final). La eliminación de cuenta, al lanzamiento público (fila 16) |
| 13 | **Casillas de `tasks.md`** | `specs/004-presupuestos-y-metas/tasks.md`: 0 de 89 marcadas pese a los PR A–E fusionados; `specs/001` igual en parte | El estado real está en las `evidence.md` (FR-003) |
| 19 | **Categorías y rejilla de Anotar** (añadida el 22 nov 2026; numerada tras las enmiendas para no renumerarlas) | comp 06, opción 1c («Rejilla fija de 3 × 3», 9 categorías); `specs/002-cuentas-y-gastos-privados/data-model.md` §2.2 (catálogo de diez) | Doce categorías: Oficina (`briefcase`; #E3E4CF/#52532A, oscuro #272A1D/#C0CAA1) y Ropa (`t-shirt`; #EEDCE5/#684257, oscuro #33232C/#D6B1C5), «Ocio», rejilla de 4 × 3 con «Otra» a dos casillas y etiquetas a 11 px (fundadores, 22 nov 2026; comp 06b; `src/components/ui/category-icon.tsx`, `src/styles/tokens.css`). Confirmado por los fundadores el 22 de noviembre de 2026; `DESIGN_SYSTEM.md` §1.3 ya lo recoge en el PR #92 (doce categorías, «Ocio» y `tag` para «Otra») |
| 20 | **Marca 1c** (añadida el 23 nov 2026) | CLAUDE.md, punto 10 («el logo definitivo no se exige»); `docs/design/BRAND_FOUNDATION.md` §6 (no nombra la marca) | Logo 1c aprobado por los fundadores el 23 nov 2026 con cuatro decisiones (comp 09b; esta spec, «Decisiones de los fundadores que esta spec recoge»; `docs/design/DESIGN_SYSTEM.md` §3a; `src/components/brand/`, iconos e imagen para compartir en `src/app`). Pendiente: la decisión en el maestro §15.10 y la referencia en BRAND_FOUNDATION §6 |

### Enmiendas del maestro que exigen las decisiones del 17 de noviembre de 2026

Las respuestas a Q1–Q12 cambian textos de rango superior. Esta spec no los toca: el
PR documental las aplica al maestro (§15.10, como decisión nueva) y a los documentos
que se citan.

| # | Enmienda | Dónde | Origen |
| --- | --- | --- | --- |
| 14 | **Fotos de metas en MVP-2**, no «antes de P0-4»; ADR-014 a MVP-2; los `[V]` de scrim y luminancia salen de MVP-1 | Maestro decisión 22.6 y §15.6.2 punto 2; `docs/adr/ADR-010-metas.md`; spec 004 (Q6, FR-036, tabla de `[V]`, ADR) | Fundadores, 17 nov 2026 (ver fila 8) |
| 15 | **Verificaciones de Android prorrogadas más allá de MVP-1** (002-T086 Android, T090, T092, T095 y los springs a 55 fps, que se añaden a la excepción); revalidación antes de abrir la app a un tercero. El CLS en iPhone (T094) sigue antes de MVP-1, con un Mac | Maestro decisión 19.2 (y la tabla «Lo que hereda P0-1» de la decisión 12); `specs/002-cuentas-y-gastos-privados/evidence.md` | Q6, opciones (a) y (c) |
| 16 | **Eliminación de cuenta y pendientes de lanzamiento al lanzamiento público**: términos legales, correo propio, apertura del registro y enumeración por la API de Auth (16.16); en MVP-1, procedimiento manual ensayado y revisión legal antes de abrir a terceros | Maestro §15.6.1; decisión 16 («Pendientes de lanzamiento») y 16.10; handoff («READY WITH BLOCKERS», «Datos»); `specs/002` spec y quickstart | Q8, opción (a) (ver filas 10 y 12) |
| 17 | **Nivel 2 nocturno no implementado, diferido a MVP-2**: `docs/TESTING.md` §3 lo describe como si existiera; dejar escrito que no existe y que en MVP-1 lo sustituyen las cinco specs a mano en Chromium y una vez en WebKit | `docs/TESTING.md` §3 («Nivel 2») | Q3, opción (a) (ver fila 9) |
| 18 | **Issue #53 a MVP-2** como límite conocido; sin ADR en P0-4 | Issue #53; registro de límites conocidos en `src/features/expenses/annotate/machines.test.ts` (sin cambio de código) | Q2, opción (a) |

## Reparto en PR (Q1, opción a)

| PR | Contenido | Spec E2E | Lanza CI |
| --- | --- | --- | --- |
| **A · Pruebas y arneses** | Huecos de FR-012, matriz de estados de FR-041 en el registro de accesibilidad, arnés de LCP (FR-054), arnés de CLS fuera de Chromium (FR-051, comparador por fotogramas), cuenta de listas largas en la siembra de `juntia-dev` (FR-043) | Ninguna | Sí |
| **Mediciones y revisiones** | Barrido `@sweep`, WebKit, laboratorio, dispositivo, revisión S1–S5, uso diario | — | Runs a mano |
| **B · Correcciones** | Defectos que salgan de A y de las revisiones; F02 si la medición lo exige (Q4); el residuo de F13, la pérdida del monto al cruzar 768 px y el marco de foco (Q11) | Ninguna | Sí |
| **C · Evidencia y cierre** | `evidence.md`, `release-checklist.md`, inventarios actualizados, valoraciones de los fundadores | — | No (solo `.md` y `.png`) |
| **PR documental de declaración** | Estado del maestro, `AGENTS.md` y `CLAUDE.md`: «MVP-1 declarado» | — | Sí (toca `AGENTS.md` y `CLAUDE.md`) |
