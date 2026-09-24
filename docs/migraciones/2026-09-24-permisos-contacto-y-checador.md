# Revisión de permisos: contacto que no se dejaba guardar y checador — 24 sep 2026

Reporte: a los usuarios que no son admin no los dejaba editar correo o teléfono desde la ficha
de la alumna o del lead, ni agregar pagos. Al admin sí.

## Lo que se revisó

- **Base de datos (RLS):** `personas`, `leads`, `pagos` e `inscripciones` permiten leer y escribir
  a cualquier usuario con sesión. No hay triggers. En los registros de la API, ningún guardado a
  esas tablas fue rechazado. Los usuarios sin admin sí guardaron hoy (Isabel, Ines, Cinthia).
- **Hub:** el único candado por rol en pagos es `confirmar_pagos` (ver abajo). Editar contacto no
  tiene ningún candado por rol.

## Causa 1 — datos viejos del Excel bloqueaban el formulario (arreglado)

El formulario revisaba **todos** los campos, aunque no se hubieran cambiado:

- 5,238 personas tienen notas en el correo: "N/T", "NO TIENE", "SE ENVIA INFO POR WPP", "N/A"…
  Al querer corregirles el teléfono salía *"El correo no se ve bien escrito"* y no guardaba.
- 120 alumnas tienen el teléfono con menos de 10 dígitos. Al querer agregarles el correo salía
  *"El teléfono no tiene 10 dígitos"*.
- En la ficha del lead el correo también se revisaba, así que con esos datos no se podía guardar
  nada (ni el estatus).

El admin no lo veía porque probaba con fichas que tenían datos limpios. No era un tema de permisos.

Arreglo en `hub/index.html`: `problemaContacto()` recibe la fila como estaba y sólo revisa los
campos que la persona cambió. Un correo o teléfono **nuevo** mal escrito se sigue rechazando.
Aplica a "✏️ Datos de contacto" (alumna, Historial) y a la ficha del lead.

Verificado en Chromium con Supabase simulado, usuario de Ventas:
- antes: correo "N/T" + teléfono nuevo → *"El correo no se ve bien escrito"*; lead con teléfono
  corto + correo nuevo → *"el teléfono no tiene 10 dígitos"*;
- ahora: los dos guardan; un correo nuevo "otra cosa" o un teléfono nuevo de 4 dígitos siguen
  rechazándose.

## Causa 2 — el checador no arrancaba para nadie sin admin (arreglado en Supabase)

`iniciarChecador()` hace `insert(...).select('id')`. Para devolver el id, Postgres también pide
permiso de **lectura**, y `sesiones_usuario` sólo dejaba leer a admins o a quien ve Actividad del
equipo. Resultado: 403 en cada ingreso (dos por el reintento), sin botón de checar
entrada/salida y sin registro de sesiones para esos usuarios.

Migración `checador_cada_quien_ve_sus_sesiones`: política SELECT "cada quien ve sus sesiones".
Cada quien ve **sólo sus filas**; ver las de los demás sigue siendo de admins o de quien tiene
`puede_ver_actividad`. Probado como Isabel: el insert con `select` ya responde y no ve sesiones
ajenas.

## Pagos — cómo están los permisos hoy (sin cambios)

`permisos_accion` da **💳 Confirmar pagos** a Ventas, Cobranza y Gerente (los admins siempre).

- **Academia e Inbox** (Tamar, Eliab) y **Logística** (Saga) no lo tienen. En un lead sólo ven
  💜 Registrar pago. No ven ✅ Inscribir ni ✅ Confirmar pago, y Cobranza tiene que confirmar lo
  que reporten.
- Registrar un abono a una alumna ya inscrita no tiene candado para nadie.

Si esos roles deben confirmar pagos: Usuarios y permisos → "Qué puede hacer cada rol" → marcar
💳 Confirmar pagos.
