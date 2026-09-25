# Nunca se quita nada: histórico en Calendario y candado contra borrados — 25 sep 2026

Reporte: mientras hacían ajustes en la gira de Mexicali, el día desapareció del Calendario.
Regla del negocio: **nunca se quita nada; todo queda como histórico y se puede editar.**

## Qué pasó
- **No se borró nada.** El evento del 24 sep de Mexicali (36 inscritas, 3 leads) seguía en la
  base, y los registros de la API no tenían ningún DELETE ni PATCH en `eventos`.
- **Causa 1:** el Calendario, Alumnos y Leads → Inscritos y el selector "Curso que tomará" pedían
  solo `fecha >= hoy`. Un día que ya pasó dejaba de verse.
- **Causa 2:** "hoy" se calculaba con `new Date().toISOString()`, que da la fecha de Londres
  (UTC). En Mexicali (UTC-7), a las 5 pm del 24 el Hub ya creía que era 25, así que el día se
  escondió en pleno curso. El mismo error ponía la fecha de mañana en los abonos registrados
  después de las 5–6 pm, y afectaba el checador y "Tiempo en pantalla hoy".

## Hub (`hub/index.html`)
- **"Hoy" con la hora de México** en los 11 lugares:
  - `hoyISO()` = fecha local;
  - el checador busca desde la medianoche local;
  - "Tiempo en pantalla hoy" compara contra la fecha local.
- **Gira actual:** `inicioDeGira()` / `obtenerInicioGira()`.
  - El mismo curso se usó en varias giras (ene–mar y desde sep 2026).
  - Desde el próximo día de la gira se camina hacia atrás mientras los días estén a 30 días o
    menos (`DIAS_ENTRE_GIRAS`). El primer hueco grande separa giras.
  - Hoy la gira empieza el **10 sep (Parral)**.
- **Calendario:** muestra todos los días de la gira actual, incluidos los que ya pasaron.
  - Se abre en el mes de hoy.
  - Los días pasados se ven en gris con "✔ pasó" (en celular, solo ✔).
  - Se abren y se editan igual: alumnas, estatus, abonos, corregir, contacto y WhatsApp. La hoja
    del día dice "ya pasó (histórico, se puede editar)".
- **Alumnos y Leads → Inscritos:** incluye las inscritas de días que ya pasaron, con la etiqueta
  "✔ curso pasado". Hoy son 687 inscritas de la gira: 317 de días pasados y 36 de Mexicali.
- **"Curso que tomará" y los selectores de curso:**
  - los próximos siguen arriba;
  - los de esta gira que ya pasaron salen al final como "(ya pasó)", y en el buscador en el
    grupo "✔ Ya pasaron";
  - un lead cuyo curso ya pasó lo conserva (antes decía "(curso anterior)").
  - `EVENTOS_CAL` sigue siendo solo de hoy en adelante, para los valores por defecto y el orden
    de las ciudades. `EVENTOS_CAL_PASADOS` y `eventoPorId()` cubren los pasados.

## Supabase
Migración `historico_01_candado_contra_borrados`:
- Función `no_borrar_historico()` y triggers `no_borrar_<tabla>` (BEFORE DELETE) y
  `no_vaciar_<tabla>` (BEFORE TRUNCATE) en `eventos`, `inscripciones`, `pagos`, `leads` y
  `personas`.
- Cualquier borrado se rechaza con: *No se borra nada de "tabla": queda como histórico.
  Cámbialo de estatus o archívalo.*
- Antes se revisó que no hubiera funciones ni cascadas que borren de esas tablas: no hay. El
  Hub tampoco las borra.
- Mantenimiento autorizado puede saltarse el candado solo dentro de una transacción, con
  `SET LOCAL glam.permitir_borrar = 'si';`.
- Probado dentro de una transacción que siempre se deshace: las 5 tablas rechazan el borrado y
  no se borró nada.
- Mensajes predeterminados, tareas y permisos siguen pudiéndose borrar (pendiente decidir si se
  archivan).

## Pruebas
- `prueba_historico` 28/28, con el navegador en hora de Mexicali (24 sep 5:30 pm y 26 sep).
- Regresión: vendedor 23, ui 50, sync 29, inscribir 76, ciudades 61, pagos 58, cobranza 44,
  Cobranza en móvil 43, contacto 15, ladas 16, mensajes 28, cobro 50.
- Las consultas nuevas del Calendario y de Inscritos se probaron contra la API real y responden 200.

## Nota
Inscritos trae hasta 1,000 filas por consulta (el límite de la API). La gira actual va en 687.
Si una gira pasa de 1,000 inscritas, hay que paginar esa consulta.
