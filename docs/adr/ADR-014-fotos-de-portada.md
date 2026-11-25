# ADR-014 — Fotos de portada en Storage privado (metas y planes)

**Estado:** **Aceptado** (25 de noviembre de 2026; maestro §15.10, decisión 27.2). Propuesto el 24 de noviembre de 2026. Los fundadores aceptaron ese día las recomendaciones de la spec 006 que lo afectan (Q1, Q16, Q17 y Q19). Con Q16 = (a), las portadas se activan en MVP-2 para las metas y para los planes. La portada de un plan cerrado no se cambia ni se quita sin reabrirlo (Q12). La revisión del PR #94 cerró F94-1 a F94-10. No se implementa antes de declarar MVP-1, y sus `[V]` siguen pendientes · **Origen:** número reservado por el maestro §15.10, decisiones 22.6 y 24.13 («ADR-014, Storage privado de fotos de metas», a MVP-2), ampliado a los planes de la especificación 006 · **Alcance:** MVP-2

## Contexto

- El maestro §7.1 deja «Supabase Storage privado» para después de P0, y §7.4 exige
  RLS también en **buckets privados**. §7.5: «limitar almacenamiento, adjuntos y
  consultas desde el principio».
- Las metas tienen foto en el diseño (GoalCard, meta inmersiva, BRAND §5, focal
  point, scrim), pero **no en MVP-1**: se usa el fallback aprobado `[A]` (decisiones
  22.6 y 24.13). Las `[V]` de scrim, luminancia y casos de foto pasaron a MVP-2 con
  este ADR (§15.6.2 punto 2).
- La especificación 006 (Planes) pide «subirle una foto al plan, igual que en las
  metas». Es el mismo problema: un archivo privado, de la persona o de la pareja,
  con metadatos potencialmente sensibles y un costo de almacenamiento.
- **Estado del código (revisado el 24 de noviembre de 2026, sin modificarlo):** no
  existe ningún bucket, ninguna política sobre `storage.objects` ni ninguna columna
  de foto. `src/features/goals/goal-card.tsx` y `goal-immersive.tsx` solo usan el
  fallback; el nombre de transición `goal-photo-{id}` ya existe y se reutilizaría.
  `supabase/config.toml` trae `[storage]` activado con el `file_size_limit` por
  defecto (50 MiB) y sin buckets.
- Las fundadoras usan **iPhone** (decisión 12): las fotos llegan como HEIC o como
  JPEG grandes con EXIF, incluida la ubicación GPS.
- La base de datos está en Supabase **Free** (decisión 16.10), y la app en Vercel
  **Hobby** (§7.1, ADR-009).
- La copia semanal (16.11, 19.3, 24.9) es de la base de datos. **Los objetos de
  Storage no viajan en un volcado de Postgres.**
- El borrado manual de cuenta (24.8, 25.3) borra filas. **Borrar una fila de
  `storage.objects` no borra el archivo**: se borra con la API de Storage.

## Decisión

### 1. Qué cubre

Una **foto de portada** por meta o por plan. Nada más: no recibos, no adjuntos de
gastos (`attachments`, §7.3, sigue siendo P1 y necesitará su propio ADR), no
galerías, no avatares (el perfil sigue sin foto, §15.5).

### 2. Dónde y con qué permisos

- **Un bucket privado**, `covers`, nunca público.
- **Una portada lógica tiene dos variantes** (F94-4), en rutas deterministas bajo un
  mismo prefijo:
  - `u/{owner_user_id}/{cover_id}/full.jpg` y `u/{owner_user_id}/{cover_id}/thumb.jpg`
    para lo privado;
  - `g/{group_id}/{cover_id}/full.jpg` y `g/{group_id}/{cover_id}/thumb.jpg` para lo
    de la pareja.

  `full` tiene lado largo ≤ 2048 px y `thumb`, ≤ 640 px. **La unidad es el
  prefijo `…/{cover_id}/`**: subir, reemplazar, borrar, barrer y restaurar operan
  siempre sobre las dos variantes juntas.
- **Metadatos en una tabla controlada**, `juntia_data.cover_photos` (ADR-013 §2):
  - propietaria XOR pareja;
  - `full_path` y `thumb_path`, explícitos y obligatorios, que deben coincidir con
    la convención (una restricción lo comprueba);
  - `full_bytes`, `thumb_bytes`, ancho y alto;
  - `sha256` de cada variante, que se usa como ETag (§2, «Lectura»);
  - focal point `{x,y}` en %, `created_by` y `status` (`pending | ready`).

  La meta o el plan apuntan a su `cover_id` solo cuando la portada está `ready`,
  es decir, cuando las dos variantes ya se subieron.
- **RLS en `storage.objects`** para el bucket `covers`: leer, crear y borrar solo si
  el primer segmento de la ruta es `u` y el segundo es `auth.uid()`, o si es `g` y
  quien llama es integrante activa de esa pareja, con las mismas auxiliares de
  membresía de ADR-013 §5.1 (`juntia_membership`). Sin `update`: reemplazar es subir
  otro objeto y borrar el anterior.
- **Lectura (F94-2). Recomendación: (a), una ruta autenticada de la app.** Por
  ejemplo `GET /api/covers/{cover_id}/{full|thumb}`. En **cada** petición:
  1. lee la sesión;
  2. comprueba la autorización **vigente** contra la base de datos: la persona es
     dueña o integrante activa de la pareja, y la portada está `ready` y enlazada a
     una meta o un plan que esa persona ve;
  3. descarga el objeto de Storage con la sesión de quien pide, y la RLS del bucket
     se aplica como segunda barrera;
  4. responde con `Cache-Control: private, no-cache` y `ETag` = `sha256`.

  Con `no-cache`, el navegador puede guardar la imagen, pero **revalida en cada
  uso**. Una revalidación con el ETag vigente responde `304` sin volver a descargar
  de Storage, así que el egress apenas crece. Una portada de ~600 KB cabe de sobra
  en el límite de 4,5 MB por respuesta de Vercel.

  **Por qué (a) y no URL firmadas.** En Supabase, una URL firmada es un **token al
  portador**: se valida al emitirla, no en cada descarga. Mientras dura sirve a
  quien la tenga, aunque no tenga sesión, y una caché puede alargar ese acceso. Eso
  no cumple lo que promete el maestro §5.5: revocar «inmediatamente» el acceso a
  los archivos al salir de la pareja. Con (a), el acceso termina en la siguiente
  petición, incluido lo que el navegador ya tenía guardado, porque `no-cache` lo
  obliga a revalidar.

  **Alternativa (b):** mantener las URL firmadas (10 minutos) y documentar que son
  transferibles mientras duran; limitar la caché a `private, max-age` ≤ la vida de
  la URL; y dejar como `[V]` la medición del plazo real de revocación. (b) **no
  cumple §5.5 al pie de la letra**: si los fundadores la prefieren por costo, es una
  decisión suya y se registra como excepción a §5.5. Hasta entonces, **(a) es la
  propuesta de este ADR**.
- Nunca una URL pública.
- **Salida de la pareja** (cuando exista, ADR-003): se pierde el acceso a las fotos
  de la pareja con la misma membresía que revoca el resto (§5.5).

### 3. Límites y formatos

| Regla | Valor propuesto | Por qué |
| --- | --- | --- |
| Fotos por meta o plan | 1 | Es una portada, no un álbum (§7.5) |
| Formatos de entrada | JPEG, PNG, WebP; HEIC/HEIF si el navegador la decodifica | Fotos de iPhone. `[V]`: Safari de iOS suele entregar JPEG al elegir de la fototeca |
| Tamaño de origen | Rechazo por encima de 15 MB, antes de procesar | Evita colgar el teléfono |
| Formato guardado | **JPEG**, calidad ≈ 0,82 | Universal y sin decodificador extra |
| Dimensiones guardadas | Lado largo ≤ **2048 px** | Basta para la meta inmersiva a 1440 px con densidad 1,5–2 |
| Tamaño guardado | Objetivo ≤ 600 KB; **rechazo en servidor por encima de 1,5 MB** | Presupuesto de almacenamiento (§6) |
| Límite del bucket | `file_size_limit` 1,5 MB y `allowed_mime_types` `image/jpeg` | Segunda barrera en Storage |

Los números son `[V]` hasta medirlos con fotos reales de iPhone en `juntia-dev`.

### 4. EXIF, ubicación y metadatos

- **Se eliminan todos**: EXIF (incluida la ubicación GPS, la fecha y el modelo del
  teléfono), XMP, IPTC y perfiles ICC que no sean sRGB.
- **Primera barrera, en el cliente:** la foto se decodifica, se reencuadra al lado
  máximo y se recodifica a JPEG en un `<canvas>`. Un JPEG que sale de un canvas no
  lleva EXIF. La orientación se aplica **antes** de recodificar, para que la foto no
  quede girada al perder la etiqueta.
- **Segunda barrera, en el servidor: lista blanca de segmentos (F94-5).** La subida
  pasa por una acción del servidor que recorre **todos** los marcadores del JPEG
  de las dos variantes, sin librería nueva, y **solo acepta** esta secuencia:

  | Marcador | Qué es | Condición |
  | --- | --- | --- |
  | `SOI` (`FFD8`) | Inicio | Primero, una vez |
  | `APP0` (`FFE0`) con identificador `JFIF\0` | Cabecera JFIF | Opcional, una vez, sin miniatura incrustada (`Xthumbnail = Ythumbnail = 0`) |
  | `DQT` (`FFDB`), `DHT` (`FFC4`), `DRI` (`FFDD`) | Tablas y reinicio | Cualquier número |
  | `SOF0` (`FFC0`) o `SOF2` (`FFC2`) | Baseline o progresivo | Una vez; 8 bits; 1 o 3 componentes; dimensiones dentro de §3 |
  | `SOS` (`FFDA`), datos y `RST0`–`RST7` (`FFD0`–`FFD7`) | Imagen | — |
  | `EOI` (`FFD9`) | Fin | Último, **sin bytes después** |

  **Todo lo demás se rechaza**, también si no lleva datos personales:
  - `APP1`–`APP15`, incluidos `APP1` (EXIF/XMP), `APP2` (ICC/FlashPix), `APP13`
    (IPTC) y `APP14` (Adobe);
  - `COM` (`FFFE`);
  - cualquier otro `SOFn`;
  - marcadores desconocidos;
  - datos después de `EOI`.

  Si encuentra uno, **rechaza**; no intenta limpiar. `[V]`: confirmar que el
  `toBlob('image/jpeg')` de Safari, Chrome y Firefox produce, en las dos variantes
  (`full` y `thumb`), solo segmentos de esta lista.

  Si algún navegador emite otro, por ejemplo un perfil ICC, el cliente lo quita de
  forma segura antes de subir: recorre los marcadores y descarta el segmento
  completo, sin tocar los datos de imagen. El servidor vuelve a validar la lista
  blanca de todos modos. La lista **no** se amplía en silencio: ampliarla exige
  revisar este ADR.

  Después de validar, sube las dos variantes con la sesión de quien llama, así que
  la RLS del bucket se aplica.
- **Límite de Vercel:** el cuerpo de una función es de 4,5 MB como máximo; con el
  tope de 1,5 MB de lo guardado, la subida cabe por la acción del servidor.
- **El focal point** lo elige la persona al subir (arrastrar el encuadre) y se
  guarda en la tabla, no en el archivo.

### 5. Borrado

- **Cuándo deja de servir una portada (F94-2).** Deja de servir **en el commit de la
  transacción SQL** que la desenlaza o borra la fila: desde ese momento, la ruta de
  lectura de §2 responde `404` porque la autorización vigente ya no la encuentra. El
  borrado del archivo en Storage ocurre **después**, fuera de la transacción, y
  puede reintentarse. Ese retraso no reabre el acceso, porque la ruta no sirve
  nada que la base de datos no autorice. **No se afirma** que el archivo
  desaparece al instante.
- **Reemplazar** la foto: se suben las dos variantes nuevas bajo un `cover_id`
  nuevo, en estado `pending`. Luego, una operación atómica e idempotente enlaza
  el `cover_id` nuevo y desenlaza el anterior. Tras confirmarse, se borra con la
  API de Storage **el prefijo completo** del anterior, es decir, las dos variantes.
  Si el borrado falla, ese `cover_id` queda registrado como huérfano para
  reintentar. La interfaz ya no lo muestra.
- **Quitar** la foto, **eliminar un plan** (spec 006, Q14) o una meta que se pueda
  eliminar: igual, sin `cover_id` nuevo.
- **Barrido de huérfanos.** Un script manual agrupa los objetos del bucket por
  prefijo `…/{cover_id}/` y compara cada grupo con `cover_photos`:
  - un prefijo cuyo `cover_id` está `ready` y enlazado **se conserva entero**, con
    sus dos variantes;
  - un prefijo sin fila, o con fila desenlazada, o `pending` desde hace más de 24 h,
    se borra entero;
  - una fila `ready` a la que le falte alguna variante se desenlaza, y la meta o el
    plan vuelven al fallback.

  **Nunca se borra una variante suelta.** Lo corre el gestor antes de cada copia y
  antes de cada borrado de cuenta.
- **Restauración.** Tras restaurar la base de datos, el mismo script desenlaza las
  filas cuyas variantes no existan en Storage, y esas metas o planes vuelven al
  fallback. Una portada lógica se restaura entera o no se restaura.
- **Borrado de cuenta (MVP-1 manual, 24.8 y 25.3):** el procedimiento de
  `specs/005-gate-mvp-1/contracts/account-deletion.md` añade un paso: listar y
  borrar con la API de Storage los objetos de `u/{id}/` de cada persona y, si se
  borra la pareja, los de `g/{group_id}/`; registrar el recuento en el manifiesto. El
  cambio a ese contrato va en el PR que implemente este ADR, no aquí.
- **Exportación (§15.5):** no incluye las fotos; incluye los metadatos (sin la ruta
  interna). La interfaz lo dice al subir.
- **Copias:** las fotos **no** entran en la copia semanal. Son reemplazables; si una
  restauración las pierde, la meta o el plan vuelven al fallback sin romper nada. Es
  una pérdida aceptada que los fundadores deben aprobar (spec 006, Q19).

### 6. Costos del plan Free

Cifras de referencia que **hay que verificar** en la página de precios de Supabase
y de Vercel al implementar `[V]`; no se dan por buenas aquí.

- **Almacenamiento de Supabase Free:** del orden de 1 GB de archivos. Con un
  objetivo de 600 KB por foto, caben más de 1.500 portadas; una pareja crea decenas
  al año. El riesgo no es el espacio sino los huérfanos, que el barrido controla.
- **Transferencia (egress) de Supabase Free:** del orden de unos pocos GB al mes.
  Una portada de 600 KB vista 20 veces al día por dos personas son unos 700 MB al
  mes **sin caché**. Con la ruta de §2 (`no-cache` con ETag), la mayoría de los usos
  son `304`, que no descargan de Storage. Además:
  - la variante `thumb`, de lado ≤ 640 px (≈ 80 KB), se usa en listas y
    tarjetas, y la `full` solo en el detalle y la meta inmersiva;
  - la ruta corre en Vercel: el tráfico de la función y la transferencia de Hobby
    también son `[V]`. Para dos personas son del orden de MB al mes.
- **Transformación de imágenes de Supabase:** es de pago; **no se usa**. Las dos
  variantes se generan en el cliente.
- **Optimización de imágenes de Vercel Hobby:** tiene cuota mensual; las portadas se
  sirven con `unoptimized`, ya preparadas, y no consumen esa cuota.
- **Alarma:** si el uso de Storage o de egress pasa del 50 % de la cuota del plan,
  el gestor lo lleva a los fundadores antes de seguir.

### 7. Relación con las fotos de las metas

Este ADR es **el ADR-014 que reservaron las decisiones 22.6 y 24.13**, ampliado a
los planes. Un solo mecanismo sirve a las dos entidades. Activar la foto en las
metas en MVP-2 es una decisión de producto aparte (spec 006, Q16): si se activa, se
ejecutan las `[V]` de BRAND §5 (scrim ≥ 4,5:1, luminancia del tercio inferior,
cuatro casos de foto) y de MOTION_SYSTEM §4 (foto decodificada, springs a 55 fps con
la foto a pantalla completa).

## Alternativas consideradas

1. **Sin fotos, solo fallback.** Lo más barato y lo más seguro. Se descarta como
   propuesta porque los fundadores lo pidieron, pero sigue siendo válido para el
   PR B de la 006 (spec 006, Q1).
2. **Fotos predeterminadas por tipo** (BRAND §5, «predeterminadas por tipo de
   meta»), empaquetadas en la app, sin subida. Sin riesgo de privacidad ni costo de
   Storage. Puede convivir con este ADR como un paso intermedio.
3. **Vercel Blob privado.** Añade un proveedor y otra frontera de permisos; la RLS
   no se aplica allí y habría que reescribir la membresía en código.
4. **Limpiar EXIF en el servidor con `sharp`.** Más robusto ante clientes raros,
   pero añade una dependencia nativa pesada a las funciones (AGENTS 13 y 19). Se
   prefiere rechazar en el servidor lo que el cliente no limpió.
5. **URL pública con nombre imposible de adivinar.** Incompatible con §7.4.

## Consecuencias

- Primera vez que Juntia guarda archivos de las personas: aparece una frontera de
  permisos nueva (`storage.objects`) que necesita pgTAP propio.
- Las fotos no tienen copia: se acepta perderlas en una restauración.
- El borrado manual de cuenta gana un paso fuera de SQL.
- Aparece un script de barrido de huérfanos.

## Verificación pendiente [V]

1. RLS de `storage.objects` en la versión de Supabase del stack, con tres cuentas
   (dueña, pareja, tercera): leer, crear y borrar.
2. **Ruta de lectura (F94-2):**
   - con tres cuentas, solo la dueña o la pareja obtienen `200`;
   - tras desenlazar la portada o perder la membresía, la **siguiente** petición da
     `404`/`403`, también si el navegador la tenía en caché (revalidación con
     `no-cache`);
   - un `304` con ETag no descarga de Storage.
3. **Matriz de la lista blanca (F94-9).** Cada combinación se mide por separado,
   con un registro de los segmentos encontrados:
   - entradas: fotos reales de iPhone (HEIC y JPEG con GPS);
   - salida: el `toBlob` de Safari (iOS y macOS), Chrome y Firefox;
   - variantes: `full` y `thumb`.

   Resultado esperado en cada combinación (F94-10), según si el navegador puede
   decodificar la entrada (§3: HEIC/HEIF solo se acepta si el navegador la
   decodifica; Chrome y Firefox, en general, no lo hacen):
   - **Si la decodifica:** se verifican las dos variantes; en cada una, que lo
     guardado contiene **solo** segmentos de la lista blanca de §4, que la
     orientación es correcta, que las dimensiones cumplen y que el servidor lo
     acepta. Si un navegador emite un segmento extra, se registra cuál es y se
     comprueba que el cliente lo quita de forma segura y el servidor acepta el
     resultado.
   - **Si no puede decodificarla:** se verifica un error claro de formato no
     compatible, sin subir nada a Storage ni crear una portada.
   - **En los dos casos:** se registra el formato real que entregó el selector de
     archivos, porque iOS puede convertir el HEIC a JPEG antes de entregarlo.
4. **Pruebas negativas de la lista blanca (F94-5):** el servidor rechaza un JPEG
   con `APP1` (EXIF con GPS), uno con un `APP2` (ICC), uno con un `COM`, uno con
   `APP0` que trae miniatura, uno con bytes después de `EOI` y uno con un `SOF`
   distinto de 0 y 2.
5. **Reemplazo más barrido (F94-4):**
   1. se sube la portada A (`full` y `thumb`);
   2. se reemplaza por B;
   3. se corre el barrido.

   Resultado esperado: el prefijo de A desaparece entero, B conserva sus **dos**
   variantes y la ruta sirve las dos. Además, si `thumb` de B se borra a mano, el
   barrido desenlaza B y el plan vuelve al fallback.
6. Las cuotas vigentes de Supabase Free (almacenamiento y egress) y de Vercel Hobby
   (optimización de imágenes, transferencia y funciones) en la fecha de
   implementación.
7. El scrim y la luminancia de BRAND §5, si se activan las fotos de las metas.
8. Que una fila borrada de `storage.objects` sin la API deja el archivo, para
   documentar el paso del borrado de cuenta con la salida real.

## Referencias

- `docs/JUNTIA_MASTER.md` §5.5, §7.1, §7.3, §7.4, §7.5, §15.5, §15.6.2 y §15.10
  (decisiones 16.10, 16.11, 19.3, 22.6, 24.8, 24.9, 24.13 y 25.3)
- ADR-003 · ADR-010 («Fuera de P0-3») · ADR-013 §2 y §5.1
- `docs/design/BRAND_FOUNDATION.md` §5 · `COMPONENT_SPECIFICATIONS.md` §GoalCard ·
  `MOTION_SYSTEM.md` §4
- `specs/006-planes/spec.md`, Q1, Q14, Q16, Q17 y Q19
- `specs/005-gate-mvp-1/contracts/account-deletion.md`
