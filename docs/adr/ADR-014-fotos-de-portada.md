# ADR-014 — Fotos de portada en Storage privado (metas y planes)

**Estado:** **Propuesto** (24 de noviembre de 2026). Los fundadores aceptaron el 24 de noviembre de 2026 las recomendaciones de la spec 006 que lo afectan (Q1, Q16, Q17 y Q19). Con Q16 = (a), las portadas se activan en MVP-2 para las metas y para los planes. La portada de un plan cerrado no se cambia ni se quita sin reabrirlo (Q12). Pasa a **Aceptado** en el PR documental que registre la decisión en el maestro §15.10, y no se implementa antes de declarar MVP-1 · **Origen:** número reservado por el maestro §15.10, decisiones 22.6 y 24.13 («ADR-014, Storage privado de fotos de metas», a MVP-2), ampliado a los planes de la especificación 006 · **Alcance:** MVP-2

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

## Decisión propuesta

### 1. Qué cubre

Una **foto de portada** por meta o por plan. Nada más: no recibos, no adjuntos de
gastos (`attachments`, §7.3, sigue siendo P1 y necesitará su propio ADR), no
galerías, no avatares (el perfil sigue sin foto, §15.5).

### 2. Dónde y con qué permisos

- **Un bucket privado**, `covers`, nunca público. Rutas
  `u/{owner_user_id}/{cover_id}.jpg` para lo privado y `g/{group_id}/{cover_id}.jpg`
  para lo de la pareja.
- **Metadatos en una tabla controlada**, `juntia_data.cover_photos` (ADR-013 §2):
  propietaria XOR pareja, ruta, bytes, ancho, alto, focal point `{x,y}` en %,
  `created_by`. La meta o el plan apuntan a su `cover_id`.
- **RLS en `storage.objects`** para el bucket `covers`: leer, crear y borrar solo si
  el primer segmento de la ruta es `u` y el segundo es `auth.uid()`, o si es `g` y
  quien llama es integrante activa de esa pareja, con las mismas auxiliares de
  membresía de ADR-013 §5.1 (`juntia_membership`). Sin `update`: reemplazar es subir
  otro objeto y borrar el anterior.
- **Lectura por URL firmada** de vida corta (propuesta: 10 minutos), emitida en el
  servidor después de comprobar el permiso, con `Cache-Control` privado. Nunca una
  URL pública ni un enlace que sirva a quien no tenga sesión.
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
- **Segunda barrera, en el servidor:** la subida pasa por una acción del servidor
  que comprueba la firma del archivo (`FF D8 FF`), el tamaño, las dimensiones y
  **la ausencia de los segmentos APP1 (EXIF/XMP) y APP13 (IPTC)**, recorriendo los
  marcadores del JPEG, sin librería nueva. Si encuentra uno, **rechaza**; no intenta
  limpiar. Después sube el objeto con la sesión de quien llama, así que la RLS del
  bucket se aplica.
- **Límite de Vercel:** el cuerpo de una función es de 4,5 MB como máximo; con el
  tope de 1,5 MB de lo guardado, la subida cabe por la acción del servidor.
- **El focal point** lo elige la persona al subir (arrastrar el encuadre) y se
  guarda en la tabla, no en el archivo.

### 5. Borrado

- **Reemplazar o quitar** la foto: una operación atómica e idempotente actualiza la
  tabla y, tras confirmarse, borra el objeto anterior con la API de Storage. Si el
  borrado del objeto falla, queda un **huérfano** registrado para reintentar; la
  interfaz ya no lo muestra.
- **Eliminar un plan** (spec 006, Q14) o una meta que se pueda eliminar: igual.
- **Barrido de huérfanos:** un script manual compara `storage.objects` del bucket con
  `cover_photos` y borra lo que sobra. Lo corre el gestor antes de cada copia y antes
  de cada borrado de cuenta.
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
  mes **sin caché**. Con `Cache-Control` privado de un día en la URL firmada y
  variantes pequeñas para las tarjetas, baja a decenas de MB. Por eso:
  - se guarda también una **miniatura** de lado ≤ 640 px (≈ 80 KB) para listas y
    tarjetas, y la grande solo en el detalle y la meta inmersiva;
  - las URL firmadas se reutilizan mientras no caduquen.
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
   (dueña, pareja, tercera): leer, crear, borrar y pedir URL firmada.
2. Fotos reales de iPhone (HEIC y JPEG con GPS): lo guardado no tiene APP1 ni APP13,
   la orientación es correcta, el tamaño cumple.
3. El rechazo del servidor con un JPEG que conserva EXIF.
4. Las cuotas vigentes de Supabase Free (almacenamiento y egress) y de Vercel Hobby
   (optimización de imágenes) en la fecha de implementación.
5. El scrim y la luminancia de BRAND §5, si se activan las fotos de las metas.
6. Que una fila borrada de `storage.objects` sin la API deja el archivo, para
   documentar el paso del borrado de cuenta con la salida real.

## Referencias

- `docs/JUNTIA_MASTER.md` §5.5, §7.1, §7.3, §7.4, §7.5, §15.5, §15.6.2 y §15.10
  (decisiones 16.10, 16.11, 19.3, 22.6, 24.8, 24.9, 24.13 y 25.3)
- ADR-003 · ADR-010 («Fuera de P0-3») · ADR-013 §2 y §5.1
- `docs/design/BRAND_FOUNDATION.md` §5 · `COMPONENT_SPECIFICATIONS.md` §GoalCard ·
  `MOTION_SYSTEM.md` §4
- `specs/006-planes/spec.md`, Q1, Q14, Q16, Q17 y Q19
- `specs/005-gate-mvp-1/contracts/account-deletion.md`
