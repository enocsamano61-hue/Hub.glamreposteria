# 2026-11-05 · Varias giras a la vez (y alta de la gira Mesa de Postres, dic 2026)

Pedido por Enoc el 4 nov 2026. Se quiere vender y cobrar dos giras al mismo tiempo: "Los pasteles más sabrosos de la chef",
que vuelve el 16 ene 2027, y "Mesa de Postres", del 5 al 20 dic 2026. Hoy el Hub está armado para una sola gira: la
constante `CURSO_ACTIVO_NOMBRE` y la función `bi_curso_activo()` de la base.
("permitido generar": pendiente)

## Respuestas de Enoc
- Precio de Mesa de Postres: lo capturan ellos en **Precios** (Básico y VIP). Mientras esté vacío, se genera igual.
- Anticipo: $700 de cajón y siempre editable. Lo que diga la asesora (ya existe).
- Fechas: por ahora solo las del calendario. La sede y la hora se cargan y se editan después.
- Reportes: cada gira por separado.
- Cambio de curso entre giras: sí.

## Qué se va a hacer

### Base
- Respaldos: `respaldo.eventos_20261105`, `respaldo.precios_20261105` y `respaldo.funciones_20261105`.
- Alta de los 9 eventos de Mesa de Postres. Curso `823e8688-…`, las 9 ciudades ya existen y la sede queda "Por definir":

  | Fecha | Día | Ciudad |
  |---|---|---|
  | 5 dic | sáb | Torreón |
  | 6 dic | dom | San Pedro de las Colonias |
  | 10 dic | jue | Saltillo |
  | 11 dic | vie | Monclova |
  | 12 dic | sáb | Piedras Negras |
  | 13 dic | dom | Nuevo Laredo |
  | 16 dic | mié | Monterrey |
  | 19 dic | sáb | Matamoros |
  | 20 dic | dom | Reynosa |

- `cursos_vigentes()`: lista los cursos con eventos de hoy en adelante. Reemplaza a `bi_curso_activo()` donde se usa para "lo que se está vendiendo":
  - `ciudades_en_puerta`, que alimenta la bandeja y el vigilante;
  - `bi_alertas`;
  - `bi_resumen_semanal`.
- `bi_giras` y `bi_consulta` reciben el curso. Sin curso: "todas las vigentes, separadas por gira".
- `bi_curso_activo()` se queda y devuelve el curso vigente más próximo, para no romper a quien la llama.
- Precios por curso:
  - Pasteles: Básico 1400 y VIP 1900, los de hoy.
  - Mesa de Postres: vacío.
  - El precio sale de una sola función, `precio_paquete(curso, paquete)`, que usan el Hub y Glamy.
- Diplomas: `certificado_plantillas` gana un plantilla por curso. Si un curso no tiene la suya, usa la de "gira" de hoy.

### Hub
- `CURSO_ACTIVO_NOMBRE` y `obtenerCursoActivoId()` (14 usos) se cambian por "cursos vigentes". Ahí entran `EVENTOS_CAL` (20 usos) y `CIUDADES_GIRA_ACTIVA` (11 usos).
- Selector de curso en todos lados: "Ciudad · fecha · curso", agrupado por gira. Lo usan Nuevo lead, Registrar pago, Inscribir a un curso, la ficha y Cambiar de curso.
- Precios:
  - Los 4 pares de botones "Básico $1,400 / VIP $1,900" y `PRECIO_PAQUETE` leen el precio del curso elegido.
  - Si el curso no tiene precio, el botón dice "Básico (sin precio)". Se puede inscribir, y queda una tarea a los administradores: "Captura el precio de Mesa de Postres".
  - Pantalla Precios: una sección por curso vigente, con su Básico y su VIP.
- Cobranza, Te toca cobrar, Calendario y Embudo: muestran las dos giras. Agregan el filtro "Gira: todas / Pasteles / Mesa de Postres", y cada renglón dice su curso.
- Reportes / Glamy BI: siempre por gira. Por defecto se ve la gira que sigue en fecha.
- Ciudad sin curso (ticket #7): una ciudad "tiene curso" si cualquier gira vigente pasa por ahí.

### Glamy
- Manual: hay dos giras. Cómo elegir el curso en el selector y qué hacer si dice "sin precio".
- Las consultas BI aceptan "Mesa de Postres" o "Pasteles". Si no se dice cuál, contesta separado por gira.
- Al examen se le agregan casos de "¿cuántos van a Mesa de Postres en Monterrey?" y "¿cuánto cuesta Mesa de Postres?".

## Nada de fotos
- "Gira activa" deja de guardarse en una constante: se calcula cada vez con los cursos que tienen eventos futuros. Cuando pase la última fecha de Mesa de Postres, esa gira sale sola.
- El precio vive en la tabla Precios y lo calcula una sola función.
- `precio_pactado` de cada inscripción no es una foto: es lo que se le acordó a esa alumna, como ya funciona hoy.
- Lo que cuentan Hub, Glamy y Glamy BI por gira sale de las mismas funciones (`embudo_cursos(curso, …)`, `bi_giras(curso)`).

## ¿Qué pasa si…?
1. **La capturan tarde.** Elige el evento con su curso visible; nada cambia respecto a hoy.
2. **El lead paga y queda inscrita.** La inscripción va al evento elegido y su precio sale de ese curso.
3. **Su pago no se encontró.** Mismo flujo de "No llegó" que hoy. No depende del curso.
4. **Se cambia de curso**, también entre giras.
   - Conserva lo que pagó y su vendedora, como hoy.
   - Si el precio del curso nuevo es distinto, se recalcula lo que debe con el precio nuevo y el aviso de confirmación dice "Antes debía $X, ahora debe $Y".
   - El paquete se queda si existe en el otro curso.
5. **Cede su lugar.** Sin cambio: se queda en el mismo evento.
6. **No va, reembolso o pierde su anticipo.** Sin cambio. Cuenta en la gira de su evento.
7. **Su curso cambia de fecha.** "Cambiar fecha" ya trabaja por evento y no le afecta.
8. **La misma persona tiene dos cursos.** Puede estar en Mesa de Postres en diciembre y en Pasteles en enero: son dos inscripciones. "Ya está inscrita" solo frena si es el mismo evento, como hoy. En su ficha se ven las dos.
9. **Su curso ya pasó.**
   - Mesa de Postres sale de los selectores el 21 dic.
   - Sus reportes siguen visibles eligiendo la gira en Reportes.
   - `EVENTOS_CAL_PASADOS` queda por curso.
10. **¿Todos lo cuentan igual?** Sí. Hub, Glamy, BI, Embudo y Cobranza filtran por la misma `cursos_vigentes()` y el mismo curso.

## Vigilante e historias
- Vigilante: la regla roja nueva "inscripción con precio $0 o sin precio del curso" se marca en rojo hasta que capturen el precio.
- `ciudades_en_puerta` revisa las dos giras.
- Historia H13: una inscripción de Mesa de Postres y otra de Pasteles de la misma persona. Se cambia una entre giras, se recalcula lo que debe y Embudo, BI y Cobranza la cuentan en la gira correcta.

## Pruebas
- `prueba_varias_giras.js`: selector con curso, precios por curso, curso sin precio, filtro de gira, cambio entre giras con diferencia de precio y celular a 390 px.
- Se adaptan las pruebas que fijan `cursoActivoIdCache`. Se corre todo con `correr_todas.js`.
- Antes de publicar: historias con `fallas=0` y las reglas rojas del vigilante en 0.

## Por decidir (Enoc)
- **Diploma de Mesa de Postres.** El fondo de hoy (`diploma-gira.jpg`) dice "LOS PASTELES MÁS SABROSOS DE LA CHEF". Hace falta la imagen del diploma de Mesa de Postres. Mientras no llegue, el botón de diploma de esa gira dice "Falta el diseño del diploma" en lugar de imprimir el de Pasteles.
- **Curso sin precio.** Propuesta: se puede inscribir y el vigilante lo marca en rojo, para no frenar la venta.

---

## Lo que se hizo (5 nov 2026, "permitido generar" de Enoc)
Decisiones de Enoc: el diploma de Mesa de Postres dice "Falta el diseño del diploma" hasta que llegue el suyo; con curso sin
precio se puede inscribir, el vigilante lo marca y a Jared le queda un recordatorio; el cupón de cursos en línea solo lo da
quien confirma; Cobranza trae su pestaña "En línea".

### Base (migraciones aplicadas)
- `varias_giras_base`: respaldos `respaldo.funciones_20261105`, `respaldo.precios_20261105`, `respaldo.eventos_20261105`.
  `cursos_vigentes()` (cursos activos con fechas de hoy en adelante). `bi_curso_activo()` = la gira vigente que sigue en fecha.
  `ciudades_en_puerta`, `bandeja_limpieza`, `bi_alertas` y `bi_giras` (activa / proxima) ven todas las giras vigentes.
- `varias_giras_precios_y_mesa_de_postres`:
  - `precios.curso_id` y `precios.paquete` (Básico/VIP por curso; índice único por curso y paquete).
  - `precio_paquete(curso, paquete)`: la única regla del precio (Hub, vigilante y resumen semanal).
  - Disparador `precio_curso_al_dia`: al capturar el precio de un curso, a sus inscritas sin precio se les calcula lo que deben
    (precio, restante, liquidado) y, con Básico y VIP, se cierra la tarea de Jared.
  - Pasteles $1,400 / $1,900; Mesa de Postres vacío. Las 9 fechas de Mesa de Postres (dic 2026), sin sede.
  - Vigilante: roja `inscrita_curso_sin_precio`, amarilla `curso_sin_precio`.
  - `bi_resumen_semanal`: una sección por gira vigente.
  - Tarea a Jared (Gerente): "Captura el precio de Mesa de Postres (Básico y VIP)".
  - Efecto en datos: una inscrita de Pasteles sin precio ni paquete quedó en Básico debiendo $1,400 (respaldada en
    `respaldo.inscripciones_20261105`).
- `diploma_por_curso`: `certificado_plantillas.curso_id` (el de gira es de Pasteles; respaldo `respaldo.certificado_plantillas_20261105`);
  `diploma_datos` regresa `falta_diseno` si el curso es otro.

### Hub
- `GIRAS` / `obtenerGiras()` / `idsGiras()` / `enSuGira()` reemplazan a `CURSO_ACTIVO_NOMBRE` y `obtenerCursoActivoId()`.
- `etiquetaEvento()`: "Ciudad · fecha · curso" en todos los selectores y en la lista con buscador.
- Filtro de gira (`htmlFiltroGira`, se recuerda por persona) en Cobranza (y su Embudo) y Calendario; Ventas y Reportes, una gira a la vez.
  "Te toca cobrar" ve siempre las dos.
- `precioPaquete()` y `pintarPaquetes()`: los botones de paquete dicen el precio del curso elegido. Inscribir sin precio deja
  `precio_pactado` y `restante` vacíos (`sinPrecioInsc`: no se ve como liquidada en la ficha ni en Recepción).
- Precios → "Precio de cada curso". "Cambiar a VIP" cuesta la diferencia VIP − Básico de su curso.
- `precioAlCambiarDeCurso()`: Cambiar de curso (ficha) y Mover a otro curso (No llegaron) entre giras recalculan lo que debe y lo avisan.
- Certificados: "Falta el diseño del diploma" en los cursos de una gira sin diseño (`faltaDisenoCert`); certificados.glamreposteria.com lo dice igual.

### Pruebas
- `prueba_varias_giras.js` (25/25) y las 20 pruebas que fijaban el curso activo, adaptadas a `GIRAS`.
- Historias: H13 (inscrita en gira sin precio → vigilante rojo y Embudo "anticipo"; al capturar el precio se calcula lo que debe y se cierra la tarea).
- Glamy: manual (dos giras, precio por curso, Mesa de Postres sin precio, cambio entre giras, diploma) y 3 casos nuevos en el examen.
