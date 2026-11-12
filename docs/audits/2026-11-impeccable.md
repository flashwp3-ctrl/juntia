# Auditoría Impeccable de Juntia — noviembre de 2026

Auditoría previa al gate P0-4 («funcional + espectacular»), sobre `main` en `b21d4e3` (PR #66–#75 incluidos). Es solo auditoría: no se cambió código de la app. Impeccable y Playwright **verifican** la ejecución; no dirigen el alcance ni reabren la dirección I2 Bosque & Arena (CLAUDE.md, regla 7). Lo que cambiaría el diseño aprobado va marcado como **propuesta** y lo deciden los fundadores.

## Resumen

- **Nada bloquea la beta.** Las pantallas de P0 están completas en Yo y Nosotros, a 390 y 1440, en claro y oscuro, con el dataset dorado. axe (WCAG 2.2 AA) pasó 366 veces sobre 93 pantallas y estados y solo falló en Anotar E4 en claro; no hay scroll horizontal en ninguna captura; el texto al 200 % no recorta nada; los esqueletos replican la geometría.
- **Lo más importante:** (1) con la latencia de juntia-dev, **S1 (Yo ↔ Nosotros) y S5 (abrir una meta) no llegan a verse**: el usuario ve 1,5–3 s de esqueleto o un spinner mientras el servidor responde, y la coreografía de MOTION_SYSTEM no ocurre (F02; hay que confirmarlo en producción y en un teléfono); (2) en **Inicio · Nosotros desde 1024**, las metas quedan en la columna estrecha y la columna izquierda se vacía tras «Recientes» (F03); (3) la fila **«Guardando…» de Anotar E4 no llega a 4,5:1** (3,44:1), y el registro de axe la excluye (F01); (4) en la meta inmersiva, **«Tus aportes» y el historial dan dos cifras distintas** con la misma palabra (F06, propuesta de copy).
- **Contratos de dinero y copy:** cumplen. Ningún «te alcanza», «Total gastado» ni ahorro presentado como gasto; `total_destinado_neto` aparece solo en la PlanningNote de Análisis y reproduce el caso de octubre (Nosotros $3.740.000).
- **Fidelidad a I2:** alta. Tipografía (Brygada 1918 + Onest + Spline Sans Mono), fichas de categoría, cinta de meta, tintes de meta, tema oscuro propio y Phosphor coherente en toda la app. Los avisos de «slop» del detector de Impeccable resultaron ser elecciones aprobadas de I2 (fondo lino, estado vacío con ficha, patrón rayado); de sus 33 avisos, uno es real (F24).
- **Nota global: 8/10 hoy; 9/10 con F01–F06 resueltos.** La app ya se siente diseñada y no plantilla; lo que falta es que el movimiento insignia aguante la latencia real y pulir la composición de escritorio.

| Gravedad | Defectos | Propuestas | Total |
| --- | ---: | ---: | ---: |
| Bloquea la beta | 0 | 0 | 0 |
| Importante | 3 | 1 | 4 |
| Menor | 9 | 2 | 11 |
| Pulido | 4 | 5 | 9 |
| **Total** | **16** | **8** | **24** |

## Cómo se hizo

- **Base:** `main` en `b21d4e3`. Documentos leídos: `CLAUDE.md`, `AGENTS.md`, maestro §6 y §15, los seis de `docs/design/` y `docs/GLOSSARY.md` (§9, palabras prohibidas). Skill `impeccable` v4.8.0, comandos `audit` y `critique`.
- **Detector:** el motor de Impeccable 0.1.18 **ya estaba en el repositorio** (`.claude/skills/impeccable/scripts/bin/windows-x64/impeccable.exe`, suma SHA-256 verificada contra `engine-checksums.txt`), así que **no se descargó ni se instaló nada**. Corrió dos veces: sobre el código (`impeccable detect src`, 68 archivos, 0 hallazgos; solo reglas por regex) y sobre la app renderizada con sesión real, por CDP, en 8 pantallas de Nosotros a 390 y 1440 (16 escaneos). Ver «Detector» abajo.
- **Recorrido:** Playwright 1.64 (Chromium) contra **juntia-dev** con `npm run e2e:dev`, su guardia de destino y su bloqueo, puerto 3400. Un spec temporal (no commiteado) reutilizó el registro de rutas de axe (`tests/a11y/route-registry.ts`, cada estado con su cuenta sembrada) y sembró la **pareja dorada** (`seedCouple({ golden: true })` + compartidos y privados del mes en curso + una segunda meta compartida + un gasto con meta pendiente de Tomás). Cada pantalla, a **390 y 1440, en claro y oscuro**, con movimiento reducido salvo en las mediciones de movimiento.
- **En cada captura:** axe con etiquetas WCAG 2.0/2.1/2.2 A y AA, scroll horizontal y una lista de controles de menos de 44 px. Esa lista dio falsos positivos que se descartaron al verificarlos: segmentados y botones `sm` llevan el área a 44 con `::after`, y los campos se tocan por su `<label>` (el mismo criterio que `target44` en `tests/support/a11y.ts`).
- **Además:** texto al 200 % en siete pantallas; esqueletos al navegar con las respuestas RSC retrasadas 4 s; muestreo de `document.getAnimations()` y fotogramas a 50–3.000 ms en S1, S2, S3 y S5, con y sin movimiento reducido; el total del héroe tras guardar (E5) a 100 ms–8 s; el foco al abrir la meta inmersiva con puntero.
- **Evidencia:** cada hallazgo tiene su captura (`docs/audits/2026-11-impeccable/Fnn-*.png`, recortes de las capturas completas) o la salida del detector. Las mediciones contra juntia-dev son de iteración, no evidencia de gate (ADR-011 §9.8).

## Puntuación Impeccable

**Audit (técnico): 16/20 — Bueno.**

| # | Dimensión | Nota | Hallazgo clave |
| --- | --- | ---: | --- |
| 1 | Accesibilidad | 3 | AA casi completo; F01 (contraste en E4), F10 (enlace de 17 px), F04 (anillo de foco al cargar) |
| 2 | Rendimiento | 3 | Sin CLS visible en esqueletos; la latencia percibida de S1 y S5 (F02) es el problema, no el render |
| 3 | Tematización | 4 | Tokens semánticos en todo; oscuro propio; sin colores sueltos en componentes salvo el verde de enlaces (F09) |
| 4 | Responsive | 3 | Sin scroll horizontal ni recortes; escritorio con composiciones desequilibradas (F03, F12, F19, F24) |
| 5 | Integridad de implementación | 3 | Sistema coherente y propio de Juntia; inconsistencias entre pantallas (F07, F11, F14, F22) |

**Critique (diseño, Nielsen): 31/40 — Bueno.**

| # | Heurística | Nota | Clave |
| --- | --- | ---: | --- |
| 1 | Visibilidad del estado | 3 | «Guardando…», «Pendiente de Tomás», «Por saldar» claros; S1/S5 esconden el estado tras un esqueleto (F02) |
| 2 | Lenguaje del mundo real | 4 | Copy en es-CO que explica la consecuencia financiera |
| 3 | Control y libertad | 3 | Deshacer, cancelar solicitud, anular aporte; exportar sin «×» (F11) |
| 4 | Consistencia | 3 | F07, F14, F17, F22 |
| 5 | Prevención de errores | 3 | Topes de retiro y de fondos; precarga no redonda en fondos de meta (F20) |
| 6 | Reconocer antes que recordar | 3 | Dos cifras de «aportes» en la misma pantalla (F06) |
| 7 | Flexibilidad y eficiencia | 3 | Atajo N, filtros, búsqueda; sin atajos de teclado para Yo/Nosotros |
| 8 | Estética y minimalismo | 3 | Un número héroe por pantalla; escritorio con huecos (F03, F19) |
| 9 | Recuperación de errores | 3 | Errores de red con «Reintentar»; sesión caducada que conserva lo escrito |
| 10 | Ayuda y documentación | 3 | «Cómo se calcula», notas de límite, explicaciones en cada hoja |

**Especificidad del diseño:** aprobada. La composición, las fichas, la cinta de meta, los tintes y la copy pertenecen a Juntia; una app ajena no podría usarlos sin cambios. El detector coincide: sus avisos de «slop» son elecciones aprobadas (ver abajo).

**Método de la critique:** un solo contexto (sin subagentes): `⚠️ DEGRADED: single-context` en el sentido de Impeccable. Se eligió así porque la evaluación de diseño se hizo antes de leer la salida del detector, que llegó al final, en la cuarta pasada.

## Detector de Impeccable

Escaneo renderizado (CDP, sesión de Sara en Nosotros, 390 y 1440, 16 escaneos). Cada aviso se verificó en contexto:

| Regla | Veces | Dónde | Veredicto |
| --- | ---: | --- | --- |
| `cream-palette` (slop) | 16 | Todas | **Falso positivo**: el fondo `#F7F3EB` es `color.surface.canvas` (linen.100) de I2 Bosque & Arena, aprobado. No se reabre. |
| `low-contrast` 1,5:1 | 10 | Inicio, Metas, meta inmersiva | **Falso positivo**: es la inicial gigante del fallback de meta (`color.goal.tint.*.initial` sobre `.bg`), decorativa y con `aria-hidden` (`goal-card.tsx:58`); el diseño la quiere tenue. |
| `text-occlusion` | 1 | Inicio 1440 | **Real**: el % de la meta que asoma queda tapado → **F24**. |
| `icon-tile-stack` (slop) | 2 | Balance | **Falso positivo**: es el estado vacío aprobado (ficha de 88 px, radio 28, HANDOFF «Auditoría anti-slop»); además el escaneo cayó en el vacío porque el contexto de esa ventana no tenía la preferencia en `localStorage`. |
| `repeating-stripes-gradient` (aviso) | 4 | Metas, meta inmersiva | **Falso positivo**: es el patrón rayado de la persona 2 (DESIGN_SYSTEM §1.2), que lleva la información además del color. |

El escaneo del código (`impeccable detect src`) dio 0 hallazgos, con la advertencia del propio detector de que las reglas por elemento no corren sobre `.tsx`.

## Patrones

- **Escritorio menos resuelto que móvil.** A 390 todo encaja; a 1440 aparecen columnas desequilibradas y piezas pequeñas en espacios grandes (F03, F12, F19, F24). Es el «no estirar el móvil» del maestro §6.3 en su versión fina.
- **El movimiento insignia depende del servidor.** S1 y S5 esperan datos antes de animar (lo que pide MOTION §1), pero con la latencia real eso deja al usuario frente a un esqueleto (F02). S3 (Análisis) sí se ve: 320 ms, `ease.standard`, una vez por capítulo.
- **Pequeñas divergencias entre pantallas hermanas**: el mismo dato con otro color (F14), otro orden (F22), otra cifra (F06) u otro tratamiento de tabla (F07).
- **Con movimiento reducido** no corre ninguna animación en S1 y la apertura de la meta es un fundido de la página (`::view-transition-group(root)`), como pide MOTION §4.

## Hallazgos

Orden: gravedad y, dentro de ella, impacto. «Tipo»: **defecto** = no cumple el diseño aprobado, el contrato o la accesibilidad; **propuesta** = cambiaría lo aprobado y la deciden los fundadores. Las capturas están en `docs/audits/2026-11-impeccable/`, nombradas por id. Los anchos y temas son los de la captura; donde se dice «todos», se vio en los cuatro combos.

| id | Gravedad | Pantalla | Contexto · ancho · tema | Qué pasa | Por qué importa | Archivo:línea probable | Sugerencia | Tipo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F01 | Importante | Anotar E4 (fila «Guardando…») | Yo · 390 y 1440 · claro | La fila en vuelo lleva `opacity-80`; su meta («Solo tú · Hoy · Guardando…») queda en #888278 sobre #F7F3EB = **3,44:1** (axe `color-contrast`). | WCAG 1.4.3 AA. Es el único texto que dice que el gasto aún no está guardado. El registro de axe marca E4 con `axe: false`, así que el CI nunca lo mide. | `src/components/ui/expense-row.tsx:72`; `tests/a11y/route-registry.ts` (E4 `axe: false`) | Marcar el estado sin opacidad sobre el texto (p. ej. ícono o fondo), o subir el texto secundario a `status.pending`; volver a pasar axe por E4. | Defecto |
| F02 | Importante | S1 Context Transition (Inicio) y S5 Goal Journey (Metas → meta) | Yo→Nosotros y Metas · 390 · claro · sin movimiento reducido | Con la latencia de juntia-dev (dos mediciones, en dos pasadas): tras tocar «Nosotros», la pantalla entera es esqueleto a los 50, 800 y 1.500 ms y solo a los 3 s hay contenido; `document.getAnimations()` no registra en ese tiempo ni el contador ni la entrada `s1-enter`, solo `skeleton-pulse`. Al tocar Japón, la tarjeta muestra un spinner hasta los 800 ms y la meta abre hacia los 1,5 s; el fotograma de 800 ms muestra la hoja nueva con la tarjeta vieja encima, en su sitio, y la zona de la foto vacía, sin tinte. | S1 y S5 son dos de las cinco experiencias insignia del gate «espectacular» (maestro §6.4). Si la red manda, lo que la pareja verá en su teléfono es un esqueleto, no la transición diseñada. | `src/features/context/context-view.tsx`; `src/features/goals/goal-stack.tsx` / `goal-card.tsx` (estado «Abriendo…») | Medir en producción con teléfono real. Si se confirma: precargar los datos del otro contexto y de la meta frontal (prefetch), o arrancar la coreografía con lo que ya se tiene (perilla, título, foto) mientras llegan las cifras. | Defecto |
| F03 | Importante | Inicio | Nosotros · 1440 · claro y oscuro | Desde 1024 la rejilla es 7/12 «Recientes» + 5/12 «balance, metas y en qué se fue». La columna derecha mide unos 1.000 px más que la izquierda, que queda vacía tras cinco filas; la pila de metas queda estrecha y alineada a la izquierda de su módulo. | RESPONSIVE_SPECIFICATIONS (md y lg) pide «Meta 7/12 · balance + Anotar 5/12». La meta compartida es la pieza emocional de Nosotros y aquí es la más pequeña. | `src/features/home/couple-home-view.tsx:68-101` | Verificar contra el comp 04·7; si manda el texto del responsive, mover metas a la columna ancha y Recientes debajo, o equilibrar las dos columnas. | Defecto |
| F06 | Importante | Meta inmersiva | Nosotros · todos | Arriba dice «Sara · Tus aportes $6.020.000»; en el historial de la misma pantalla, «Sara $6.120.000 · 11 aportes». La primera es lo disponible tras un uso de $100.000; la segunda, lo aportado. «Retirar» luego dice «Puedes retirar hasta $6.020.000». | Dos cifras distintas con la misma palabra en una pantalla de dinero generan desconfianza («¿dónde están mis $100.000?»). | `src/features/goals/goal-immersive.tsx:115`; copy en `src/lib/copy/es.ts:38` y `:70` | Rotular la primera como disponible («Disponible de Sara $6.020.000») o mostrar «aportó $6.120.000 · usado $100.000». Es copy nueva: la deciden los fundadores. | Propuesta |
| F04 | Menor | Meta inmersiva | Nosotros · 390 y 1440 · claro y oscuro | Al entrar por URL (recarga o enlace) el título recibe el foco y se pinta el anillo de 2 px alrededor del nombre, sin que nadie use el teclado. Al abrir con un toque no pasa (`:focus-visible` falso, verificado). | Un marco rectangular sobre el título insignia, justo en la pantalla más «espectacular», cada vez que se recarga. | `src/features/goals/goal-immersive.tsx` (foco al título, MOTION §4 «El foco va al título») | Enfocar el título con `focus({ focusVisible: false })` o usar `tabindex=-1` con estilo de foco propio cuando el foco es programático. | Defecto |
| F07 | Menor | Actividad | Nosotros · 1440 · claro y oscuro | En la tabla de escritorio, las filas «Aporte a Japón» ocupan cuatro columnas (`colSpan={4}`): la fecha va en el subtítulo, no en FECHA; no hay «Pagó · reparto»; la ficha es redonda de 40 y desalinea el texto. | RESPONSIVE: «desde xl, tabla de 5 columnas con encabezados». La tabla deja de ser escaneable justo en las filas de ahorro. | `src/features/activity/couple-activity-view.tsx:190` | Pintar el aporte en las mismas columnas: «Sara · aporte» en PAGÓ · REPARTO y la fecha en FECHA, conservando la ficha redonda. | Defecto |
| F08 | Menor | Inicio (encabezado) | Nosotros · 390 · claro (Tomás) | «Hola, Tomás» + avatar + selector no caben en una línea a 390: el selector baja a una segunda línea. Con «Sara» sí cabe; con nombres de 6 letras o más siempre bajará. | RESPONSIVE solo prevé bajar el titular a 360 (serif 30). El encabezado cambia de alto según el nombre de la persona. | `src/components/shell/app-shell.tsx:176` (PageHeader, `flex-wrap`) y el titular de saludo | Truncar o escalar el saludo antes de dejar caer el selector, o mostrar solo el nombre a 390. | Defecto |
| F09 | Menor | Acceso (entrar, crear cuenta, recuperar) | Sin sesión · 390 y 1440 · oscuro (también claro) | Los enlaces «Olvidé mi contraseña», «Crear cuenta», «Ya tengo cuenta» usan `text-saving`, el verde de ahorro. | DESIGN_SYSTEM §2.1, regla 2: «Verde texto = ahorro destinado». La primera pantalla enseña el verde con otro significado. | `src/features/auth/auth-ui.tsx:52` | Usar tinta subrayada o `action.primary` para enlaces; verificar contra el comp 04·17. | Defecto |
| F10 | Menor | Mi perfil · sesión caducada | Yo · 390 · claro | La única salida del aviso, «Entrar de nuevo», es un enlace en línea de 98×17 px. | Maestro §15.7 fija 44 px en objetivos táctiles; WCAG lo exime por ser texto en línea, pero es la acción de recuperación. | `src/features/account/profile-form.tsx:52` | Convertirlo en botón secundario `sm` (área de 44 con `::after`) dentro del aviso. | Defecto |
| F11 | Menor | Privacidad · Exportar (D2–D5) | Yo · 390 y 1440 · todos | El diálogo de exportar no lleva «×» en el encabezado; solo «Cerrar» al final. Anotar, metas, presupuesto y liquidar sí lo llevan. | COMPONENT_SPECIFICATIONS §BottomSheet: «cierre con gesto, botón ×, Escape o scrim». Inconsistencia entre hojas. | `src/features/account/account-controls.tsx:189` | Usar el mismo encabezado de hoja con «×» que el resto. | Defecto |
| F12 | Menor | Balance · desglose | Nosotros · 1440 · oscuro (también claro) | La tabla de cinco columnas se aprieta en unos 480 px: «Tiquetes a / Medellín», «Mercado del / mes», «Tomás · / 50/50» parten en dos líneas con espacio libre en la página. | La tabla es la prueba verificable del saldo; leída en escritorio debe escanearse en una línea. | `src/features/balance/balance-breakdown.tsx:32-39` | Dar ancho mínimo a «Gasto» y `whitespace-nowrap` a «Pagó · reparto», o repartir 6/12 – 6/12. | Defecto |
| F24 | Menor | Inicio · módulo de metas | Nosotros y Yo · 1440 · claro y oscuro | En la pila del módulo de Inicio de escritorio, la meta que asoma («Japón») muestra el nombre centrado y el ícono, pero su porcentaje queda debajo de la tarjeta frontal (`lg:top-16`): el detector lo marca como `text-occlusion` (50 % tapado) y la captura lo confirma. A 390 el «62 %» sí se ve. | COMPONENT_SPECIFICATIONS §GoalStack: «la segunda asoma 60 px con nombre y %». | `src/features/goals/goal-card.tsx:107` | Mantener el chip de % en la franja visible también desde `lg`. | Defecto |
| F14 | Menor | Análisis · capítulo 4 | Nosotros · todos | «$900.000 · Sara $500.000 · Tomás $400.000» va en tinta; en Inicio, «Apartado para metas $300.000» va en verde ahorro. | DESIGN_SYSTEM §2.1, regla 2. La misma clase de cifra cambia de color entre pantallas. | `src/features/analysis/analysis-screen.tsx:283-293` | Poner la cifra apartada en `finance.saving`, como en Inicio. | Defecto |
| F05 | Menor | Anotar E5 · guardado | Yo · 390 y 1440 · claro | La fila nueva aparece al instante (guardado optimista), pero el total del héroe no cambia hasta 0,4–1 s después (medido: $412.900 a los 100 y 400 ms, $457.900 al segundo). | MOTION §2: «la fila nueva … el total cuenta hacia arriba» como un solo momento. Durante ese medio segundo la lista y el total no cuadran. | `src/features/expenses/annotate-provider.tsx` (fila optimista) y el héroe de `home-view.tsx` | Sumar también el importe al héroe de forma optimista y corregir al confirmar, o retrasar la fila hasta el total. Toca la decisión de la fila optimista (backlog UX de los fundadores). | Propuesta |
| F13 | Menor | Todas (texto ampliado) | Nosotros · 390 · claro · raíz al 200 % | Con el tamaño de letra al 200 %, crecen los botones (en `rem`) pero no las filas, importes ni etiquetas (en `px`): en Balance, «Registrar liquidación» se dobla y «Tiquetes a Medellín» sigue a 13 px. No hay recortes ni scroll. | WCAG 1.4.4 se cumple con el zoom del navegador; quien sube la letra del sistema solo agranda una parte. RESPONSIVE marca el texto ampliado como [P]. | Tokens de tipografía en `src/styles/tokens.css` (tamaños en px) | Decidir si el 200 % debe escalar todo (tokens en `rem`). Es el cierre de un [P]. | Propuesta |
| F15 | Pulido | Inicio (titular) | Nosotros · 390 · claro y oscuro | «En noviembre gastaron juntos» deja «juntos» sola en la segunda línea. | Huérfana en el titular más visto de Nosotros. | `src/features/home/couple-home-view.tsx:61` | `text-wrap: balance` en los titulares serif. | Defecto |
| F16 | Pulido | Actividad · resumen del mes | Yo · 390 · claro y oscuro | Las fichas de categoría del resumen se parten casi una por línea: la tarjeta mide unos 430 px y empuja la lista fuera de la primera pantalla. | La lista es lo que se viene a ver en Actividad. | `src/features/activity/activity-view.tsx` (resumen) | Rejilla de dos columnas o scroll horizontal de fichas a 390. | Defecto |
| F21 | Pulido | 404 con sesión | 1440 · claro | Usa el ícono `warning` (Advertencia) y la fila de cuenta del sidebar pierde el avatar y el nombre («Mi cuenta» genérico). | DESIGN_SYSTEM §3: Error = `warning-circle`; «no encontrado» no es una advertencia. El sidebar cambia respecto al resto. | `src/app/not-found.tsx:23` | Usar `warning-circle` o `tray`/`compass`; cargar la cuenta en el 404 con sesión. | Defecto |
| F22 | Pulido | Plan y Análisis | Nosotros · 390 · claro | El mismo indicador de presupuesto cambia de orden (Plan: Mercado, Restaurantes, Servicios; Análisis: Mercado, Servicios, Restaurantes) y el badge «CERCA DEL LÍMITE» aparece en Plan pero no en Análisis. | Consistencia: la pareja compara las dos pantallas. | `src/features/plan/budget-indicator.tsx`; `src/features/analysis/analysis-screen.tsx` | Mismo orden y mismos badges en los dos sitios. | Defecto |
| F17 | Pulido | Sidebar · Mi cuenta activa | Yo y Nosotros · 1440 · claro y oscuro | Dentro de Cuenta, la fila del perfil se marca con un anillo interior de tinta de 2 px; los demás destinos activos usan fondo claro sin anillo. | Se lee como un anillo de foco, no como «estás aquí». | `src/features/account/account-button.tsx:43` | Usar el mismo activo que los destinos (fondo `nav-active` + elevación). | Propuesta |
| F18 | Pulido | Hojas de aporte y retiro | Nosotros · todos | Con el campo vacío, los botones dicen «Registrar aporte de $0» y «Retirar $0». | Una acción con «$0» parece un error. | `src/features/goals/contribute-sheet.tsx`, `withdraw-sheet.tsx` | Mostrar el importe solo cuando hay uno («Registrar aporte»). | Propuesta |
| F19 | Pulido | Metas | Nosotros · 1440 · claro y oscuro | El abanico mide unos 520 px en una columna de 1.150 px; «2 metas» y «Ver todas» quedan separados por casi 1.000 px. | La pantalla insignia de metas se ve vacía en escritorio. | `src/features/goals/goal-stack.tsx` | Tarjetas más grandes desde 1280 o el pie pegado al abanico. | Propuesta |
| F20 | Pulido | Anotar · Fondos de la meta | Nosotros · 390 · claro | Para un uso de $300.000, «Tus fondos» se precarga con $160.676 (reparto proporcional a lo aportado). | Una cifra no redonda que nadie escribiría; obliga a corregir. | `src/features/expenses/goal-funding/funding-ledger.tsx` | Precargar la parte propia del reparto (50/50 → $150.000) o redondear a mil. | Propuesta |
| F23 | Pulido | Exportar · archivo listo | Yo · 390 · claro | El archivo se llama `juntia-movimientos-AAAA-MM-DD.json` aunque incluye metas, aportes y presupuestos. | El nombre promete menos de lo que trae. | `src/lib/db/export.ts:87` | `juntia-datos-AAAA-MM-DD`. | Propuesta |

## Lo que funciona (mantener)

- **Contratos de dinero visibles en la copy.** «Es dinero apartado, no gastado. Sigue donde lo tengan», «Son cosas distintas: no se suman», «Las liquidaciones no son gastos», «Retirar libera dinero que apartaste. Es una reasignación, no un ingreso». Glosario §9 respetado en todo lo revisado.
- **Shared Balance** legible sin color: barras con marca de «le corresponde», patrón rayado para la persona 2, textos «Le deben / Debe» y desglose con la tabla del mes.
- **Plan sin presupuesto** nunca muestra un 0 % ni un exceso falso: «Sin presupuesto · Crear», y los estados cerca/excedido llevan ícono + texto + patrón.
- **Estados**: vacíos con ficha Duotone y texto útil; esqueletos con la geometría final (Actividad, Metas, Plan, Balance, Inicio); errores de red con «Reintentar»; sesión caducada que conserva lo escrito; 404 con salida.
- **Accesibilidad de base sólida**: anillo de foco global (`globals.css:115`), áreas de 44 px extendidas con `::after` en segmentados y botones `sm`, campos cuyo `<label>` envuelve el marco, `prefers-reduced-motion` tratado por momento (S1, S4, S5, abanico, tema).
- **Tema oscuro propio**, no invertido: superficies cercanas al negro, tintes de meta y fichas recalculados.

## Lo que no se pudo revisar, y por qué

- **Gestos táctiles reales** (arrastrar la hoja, deslizar la pila de metas, back-swipe de iOS, pull to refresh): Playwright con Chromium de escritorio emula el ancho, no el gesto. Lo mismo con el teclado nativo de Android.
- **Safari / WebKit y dispositivos reales**: solo Chromium (ADR-011 §6). Las View Transitions de S5 en Safari quedan sin ver.
- **Lectores de pantalla** (VoiceOver, TalkBack): no se ejecutaron; axe no los sustituye.
- **Hover del abanico de metas** (MOTION §4.1) y **S4 completo** (la animación de liquidar necesita registrar una liquidación real): solo se capturó la hoja de liquidar, en estático. El muestreo de movimiento de esa hoja no llegó a abrirla (el clic agotó su tiempo en el contexto de la medición), así que S4 queda sin medir.
- **S2 al guardar**: se midió el total (F05), no la coreografía completa del contador y el tachado del saldo.
- **INP y CLS medidos**: no se midieron; el proyecto `evidence` es del CI (ADR-011 §9.8).
- **Fotos de meta**: el dataset no tiene fotos, así que el scrim por luminancia [V] no se pudo ver; todas las metas muestran el fallback con tinte.
- **Estado de error de una sección de Nosotros** (`load-error.tsx`) y `error.tsx`: no hay forma limpia de provocarlos desde fuera sin tocar la app.
- **360, 430, 768 y 1024 px**: el encargo pide 390 y 1440; los barridos de siete anchos ya existen en `@sweep`.
- **Estados de un solo uso** en el segundo combo y siguientes (enlace de invitación listo, sesión caducada): se capturaron una vez, a 390 en claro.
