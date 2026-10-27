# 2026-10-27 · Fase 1: aviso de actualización, toda inscrita es lead, una sola caja de comentarios, regalos y Hub sin emojis

Permitido por Enoc el 27 oct 2026 ("permitido generar", Fase 1 del road map).

Decisiones de Enoc:
1. Aviso de "Nueva actualización": sale en cuanto se puede, pero **no** si la persona está editando algo; igual para
   todos y una sola vez por persona; página borrosa, leer hasta abajo y cuestionario para seguir; quién lo leyó se ve
   en Actividad del equipo. El texto y las preguntas de cada aviso se le entregan a Enoc antes de publicarlo.
2. "Todos los inscritos son lead; un lead es cualquier persona que ya tomó curso; no existe uno sin el otro."
3. Unificar las cajas de comentarios.
4. "Regalo dado" daba a entender que ya se dio: ahora **Registrar regalo** (curso + si ya se envió el acceso) y
   **Ya se envió**; también desde la ficha.
5. **Ya le avisé**: hay quien manda el WhatsApp desde su celular, sin el botón del Hub.
6. Quitar los emojis del Hub ("que se vea seria la página"). Glamy conserva los suyos; las plantillas de WhatsApp
   para clientas no se tocan.
7. Glamy al día con todo lo anterior.

## 1. Aviso "Nueva actualización del Hub"
- Base (migración `hub_novedades`): tablas `hub_novedades` (version única, titulo, fecha, contenido jsonb
  `{secciones:[{titulo, texto?, puntos?}], nota?}`, preguntas jsonb `[{pregunta, opciones, correcta, bien, mal}]`,
  publicada) y `hub_novedades_leidas` (novedad, usuario, leída en, errores; llave las dos). RLS: todo el equipo lee
  las publicadas y lo suyo; administradores todo. Candados contra borrado. RPC `novedad_leida(p_novedad, p_errores)`.
- Hub: `HUB_VERSION`, `revisarNovedades` (al entrar, cada 60 s y al volver a la pestaña), `novEditando` (ficha o
  formulario abierto, Recepción, Glamy con texto o tecleó hace menos de 20 s → reintenta cada 3 s). Paso 1 leer
  (Continuar se activa al llegar abajo; **negritas**), paso 2 cuestionario (todas bien; si se equivoca explica y
  cuenta el error; "Volver a leer"), paso 3 Listo. Si la versión publicada es más nueva que la del Hub abierto,
  "Continuar" recarga. Actividad del equipo → tarjeta "Nueva actualización" con quién la leyó, errores, quién falta y
  "Ver cómo se ve" (vista previa del administrador, no cuenta como leída). Actividad `novedad_leida`.
- Publicar un aviso = poner `publicada = true` a su fila. El de esta fase se dio de alta **sin publicar** para que
  Enoc lo revise.

## 2. Toda inscrita es lead (migración `toda_inscrita_es_lead`)
- Respaldo `respaldo.leads_20261027` (722 filas). Columna nueva `leads.de_inscrita`.
- `lead_de_inscripcion(p_insc)`: crea su lead **cerrado** (estatus "Inscrita", o "No va" si no va) con la fecha de su
  inscripción y el comentario "Inscrita (lead creado por el Hub desde su inscripción)." `asegurar_lead_de_persona`
  lo hace para una persona; trigger `inscripcion_con_lead` para cada inscripción nueva (o que cambia de persona).
- Se crearon 155 leads: las inscritas de cursos que vienen que no tenían lead. Quedan 0 sin lead en cursos que vienen.
  Las inscripciones viejas (35,912 sin lead) **no** se llenaron de golpe: su lead se crea la primera vez que se abre
  su ficha (`asegurar_lead_de_persona` desde el Hub).
- Estos leads no entran al Embudo, a Cobranza ni a la Bandeja, y `bi_fuente` los excluye de las métricas de leads.
- Hub: la pestaña Lead abre su lead abierto o, si no hay, el cerrado más reciente; ya no sale gris.

## 3. Una sola caja de comentarios
- Lead, inscrita y Recepción: "Agregar comentario" + "Guardar comentario" (`guardarComentario`): va a
  `interacciones` con `asesor_id` de quien lo escribe (antes en el lead se guardaba sin autor) y queda en
  `leads.comentario` (lo que ven Cobranza y el Embudo). Actividad `comentario_agregado`.
- En la inscrita salen sus últimos 5 contactos y "Ver todo su historial" (pestaña Contactos). `notas_migracion`
  queda plegada en "Notas fijas" (se sigue guardando sola). En Recepción las notas fijas se ven sin editar.

## 4 y 5. Regalo y "Ya le avisé" (migración `cambio_fecha_regalo_enviado`)
- Respaldo `respaldo.cambio_fecha_avisos_20261027` (413 filas). Columnas `regalo_enviado_en`, `regalo_enviado_por`.
- `cambio_fecha_regalo(p_aviso, p_curso, p_enviado)` (nueva firma, la vieja sigue) y `cambio_fecha_regalo_enviado(p_aviso)`.
- Los regalos anteriores se marcaron enviados y los comentarios a mano ("Pan de muerto") se pasaron a la columna:
  hoy 14 con regalo (los 14 enviados) y 14 que aceptaron sin regalo.
- Lista de Cambio de fecha: chips "Aceptaron sin regalo", "Regalo: falta enviar acceso", "Regalo: acceso enviado";
  botones "Ya le avisé" (→ Avisada + nota "se le avisó por WhatsApp desde el celular"), "Registrar regalo",
  "Ya se envió". Los mismos en la ficha de la inscrita. Actividad `cambio_fecha_regalo_enviado`.

## 6. Hub sin emojis
- `hub/index.html`: se quitaron de botones, etiquetas, títulos, avisos y tarjetas. Se quedan: Glamy (todo lo suyo),
  plantillas y reporte de WhatsApp para clientas, y las marcas ✓ ✕. Botones que eran solo un emoji ahora son íconos
  de línea (SVG, clase `.ico`); los grupos de Cobranza son puntos de color (`.cob-punto`); VIP es la palabra "VIP".
  Respaldo del archivo de antes en el historial de git.
- Base: respaldo `respaldo.funciones_20261027` y se quitaron los emojis de los textos que el Hub muestra de
  `agl_retirar_acceso`, `agl_revisar_accesos`, `bandeja_limpieza`, `bi_alertas`, `bi_resumen_semanal`,
  `diploma_reportar_nombre`, `hub_pedidos_avisar`, `leads_candado_pago_por_confirmar` y `glamy_paso_lead`
  (el "dónde" que le dice a Glamy, para que nombre los botones como se ven).
- Pendiente de limpieza: `bi_alertas_cuadre()` quedó sin uso (borrar funciones se hace aparte, con Enoc).

## 7. Glamy v22
- `glamy_curso`: `cambio_de_fecha.regalos` (aceptaron sin regalo / falta enviar acceso / acceso enviado), filtro
  `regalo_falta`, y la lista trae su regalo y su estado.
- Manual: aviso de actualización, toda inscrita es lead, una sola caja de comentarios y Notas fijas, Registrar
  regalo / Ya se envió, Ya le avisé, y que los botones del Hub se nombran sin emojis (ella conserva los suyos).
- Examen 29/29 (7 casos nuevos de la Fase 1).

## Pruebas
- Nuevas: `prueba_novedades.js` (25), `prueba_lead_de_inscrita.js` (7), `prueba_comentarios.js` (16),
  `prueba_regalo_y_aviso.js` (17). Ajustadas por los emojis y las cajas: ficha, ficha_unica, recepcion, cambio_fecha,
  embudo, academia_*, cobranza_grupos, plaza_alumnas, vip y otras.
- `correr_todas.js`: 41 archivos en verde. Capturas a 1200 y 390 px en cada prueba nueva.
