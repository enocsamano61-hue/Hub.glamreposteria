# 2026-10-26 · Ficha de la inscrita: "👤 Ceder su lugar"

Permitido por Enoc el 26 oct 2026. Origen: ticket #2 de Jared. Una inscrita no puede ir (p. ej. por el cambio
de fecha) y va otra persona en su lugar (su mamá), con el anticipo que ya dio. Solo se podía "Cambiar de curso".

Decisiones de Enoc: lo hacen administradores y Cobranza; no se cobra nada extra; se puede ceder a quien la
clienta diga que irá (motivo obligatorio).

## Cómo funciona
- En la ficha de la inscrita, junto a "Cambiar de curso": **👤 Ceder su lugar** → teléfono de quien irá (si ya
  está en el Hub sale para elegirla; si no, se escribe su nombre y se da de alta) → motivo → confirmar.
- **El lugar es el mismo**: la misma inscripción pasa a la otra persona con lo que pagó, su paquete, su precio,
  su vendedora, su comisión y su aviso del cambio de fecha. No se cancela ni se crea otra: los números
  (Embudo, Cobranza, Calendario, no van) no cambian.
- La primera NO queda como "No va" (inflaría "No van" y bajas): queda el rastro "Cedió su lugar".

## Base (migraciones `ceder_lugar_inscripcion`, `ceder_lugar_solo_admin_y_cobranza`)
- Tabla nueva `inscripcion_traspasos` (de quién, a quién, curso, motivo, quién lo hizo, cuándo). Solo lectura
  para el equipo; candado contra borrado (`no_borrar_historico`).
- Función `ceder_lugar(p_insc, p_persona, p_motivo)` (security definer), todo de una vez:
  cambia la persona de la inscripción, deja la nota "CEDIÓ SU LUGAR …" en sus notas, pasa su aviso del cambio
  de fecha, y anota en el historial de contacto de las dos ("Cedió su lugar a…" / "Recibió el lugar de…").
  Si estaba en "No va" o "No llegó", el estatus vuelve a salir de sus pagos.
- Candados: solo administradores o Cobranza (Ventas tiene "Confirmar pagos" pero NO puede ceder lugares),
  motivo obligatorio, otra persona distinta, curso que no ha pasado, que no haya llegado, sin diploma, que no
  haya perdido su anticipo, y que quien recibe no esté ya inscrita en ese curso.
- Probado contra la base con ensayos que se deshacen (admin, Cobranza sí; Ventas no; motivo vacío; misma
  persona; segundo intento a quien ya quedó inscrita).

## Hub y Glamy
- `hub/index.html`: botón y panel en `#fichaCurso`; actividad `lugar_cedido`; la ficha ahora trae `asistencia`.
- Lista negra: se marca al elegirla y se advierte antes de confirmar.
- Glamy v21: el manual explica "Ceder su lugar". Examen 22/22.

## Pruebas
- `pruebas/prueba_ceder_lugar.js` 23/23. Capturas `ceder-lugar-panel.png`, `-confirmar.png`, `-celular.png`.
