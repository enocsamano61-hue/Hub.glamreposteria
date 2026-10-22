# 2026-10-22 · Cambio de fecha de un curso (se recorrió la gira)

Pedido de Jared (vía Enoc): avisar del cambio de fecha a las confirmadas por WhatsApp desde el Hub,
dejar registrado que ya saben, que aceptaron o que pidieron reembolso, y que se les da un curso de la
Academia de regalo; que todos lo vean en el mismo lugar. Permitido por Enoc el 22 oct 2026.

Decisiones de Enoc:
- "Cambiar fecha" desde el Calendario (solo administradores).
- WhatsApp con plantilla, editable en Mensajes; al mandarlo queda registrado que se le avisó.
- El regalo es solo registro, con el curso en sus notas.
- Reembolso: lo atiende Cobranza o Jared; **Cobranza cierra el lugar**.
- Se avisa a todos los de ese curso (inscritas y leads); las importantes son las que ya pagaron.

## Base de datos (migraciones `cambio_fecha_gira` y `embudo_cursos_inscritas_cerradas`)
Respaldos: `respaldo.eventos_20261022_cambio_fecha`, `respaldo.mensajes_predeterminados_20261022`.

- `cambios_fecha`: cada cambio (curso, fecha anterior, nueva, motivo, quién, cuándo).
- `cambio_fecha_avisos`: por persona de ese cambio (inscripción o lead), `estado`
  (`sin_avisar`, `avisada`, `acepto`, `reembolso`, `reembolsada`, `no_va`), quién y cuándo, nota y
  regalo (curso, quién, cuándo). RLS: el equipo lee; nadie escribe directo (solo las funciones).
  Candado contra borrar en las dos tablas.
- Funciones (`security definer`, revisan permisos adentro):
  - `cambiar_fecha_evento(evento, fecha, motivo)`: solo administradores. Cambia `eventos.fecha`,
    guarda el cambio y pone en la lista a las inscritas (menos las que ya no van) y los leads abiertos.
  - `cambio_fecha_marcar(aviso, estado, nota)`: cualquier usuario del Hub. "Avisada" no baja a quien
    ya respondió. Deja renglón en `interacciones`. "Ya no va" pasa el lead a "No va a ir al curso".
    "Reembolso" crea tarea en el bloc a los roles Cobranza y Gerente (con "Ir →" a la ficha).
  - `cambio_fecha_regalo(aviso, curso)`: solo si aceptó; anota el curso en `notas_migracion`.
  - `cambio_fecha_cerrar_reembolso(aviso, nota)`: solo Cobranza, Gerente o administradores. Cierra
    el lugar (estatus "No va a ir al curso", `motivo_baja` = "Reembolso por cambio de fecha") y marca
    la tarea como hecha.
  - `cambio_fecha_lista(evento)` (`security invoker`): el último cambio de cada curso con su gente.
- Plantilla compartida "Cambio de fecha" en `mensajes_predeterminados` (los administradores la editan
  en Mensajes).
- `embudo_cursos`: las inscritas con el lugar cerrado (no va / perdió anticipo) cuentan en "No van",
  igual que en el Calendario y Recepción.

Probado contra la base real dentro de una transacción que se deshizo (Martínez de la Torre):
14 inscritas (14 con pago) y 13 leads a la lista; la vendedora no puede cambiar la fecha ni cerrar
reembolsos; tareas para Cobranza y Gerente; avisada no baja a aceptó; regalo en notas; el embudo pasa
la cerrada a "No van". Después se confirmó que no quedó nada (0 cambios, la fecha sigue igual).

## Hub (`hub/index.html`)
- Hoja del día del Calendario: botón "📅 Cambiar fecha" (administradores) con ventana de nueva fecha,
  motivo y aviso de cuántas se mueven; y el bloque del cambio.
- Cobranza → Embudo: el mismo bloque en cada curso (números, barra y lista: ya pagaron, inscritas sin
  pago, leads) con WhatsApp, Aceptó, Reembolso / Ya no va, Regalo dado, "Reembolso hecho · cerrar
  lugar" (solo Cobranza, Gerente y administradores) y ↩ para deshacer.
- Ficha de la inscrita: renglón con su estado del cambio y su regalo.
- Mensajes: variable `{fecha_anterior}`; `abrirEnviarWhatsApp` acepta `plantilla` (título) y un texto
  de respaldo si la plantilla no existe.
- `preguntarConfirmacion` acepta `etiquetaMotivo` y `ejemploMotivo` (sin cambiar el contrato).
- Actividad: `curso_fecha_cambiada`, `cambio_fecha_respuesta`, `cambio_fecha_regalo`, `cambio_fecha_reembolso`.

## Glamy
`manual.ts`: sección "Cambio de fecha de un curso", botón en el Calendario y `{fecha_anterior}`.

## Pruebas
- Nueva `pruebas/prueba_cambio_fecha.js` (31/31). Suite: 28 archivos en verde.
- Capturas: `cambio-fecha-modal.png`, `cambio-fecha-embudo.png` (1200) y `cambio-fecha-celular.png` (390).
