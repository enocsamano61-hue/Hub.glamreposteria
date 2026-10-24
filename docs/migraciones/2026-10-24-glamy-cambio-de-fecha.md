# 2026-10-24 · Glamy: cómo va el cambio de fecha de un curso

Permitido por Enoc el 24 oct 2026. Origen: Jared le dio 👎 a tres respuestas de Glamy (desde Calendario) sobre
Martínez de la Torre: "¿cuáles aceptaron el cambio de fecha?", "¿cuántos de los 17 faltan?" y "¿cuántos están
confirmados y cuántos me faltan por confirmar del cambio?". Glamy contestó de **pagos** por confirmar: la
herramienta `curso` no traía el cambio de fecha y entendió "confirmados" como pagos.

## Base
- Respaldo de la versión anterior en `respaldo.funciones_20261023` (`glamy_curso`).
- `glamy_curso` ahora regresa `cambio_de_fecha` (si el curso cambió de fecha): fechas anterior y nueva, conteo por
  estado del aviso (acepto, avisada, sin_avisar, reembolso, reembolsada, no_va) de inscritas y de leads por
  separado, y `inscritas_despues_del_cambio` (se inscribieron ya con la fecha nueva; no necesitan aviso).
- Filtros nuevos: `cambio_faltan` (sin avisar o avisadas sin contestar) y `cambio_aceptaron`, con nombre, teléfono
  y si es inscrita o lead (hasta 60).
- Mismos permisos de antes (solo roles con Calendario, Cursos, Plaza o Logística).

## Glamy (v20)
- La herramienta `curso` describe el cambio de fecha y los filtros nuevos; "por_confirmar" se aclara como PAGOS.
- Manual: "confirmados / aceptaron / ya saben / faltan" hablando del cambio de fecha = el aviso del cambio, no pagos;
  los botones Avisada / Aceptó son los que marcan que "ya saben".
- Examen: 3 casos nuevos con las preguntas de Jared. `examen_glamy.js` 22/22.

## Dato real (24 oct)
Martínez de la Torre (26 oct 2026 → 25 ene 2027): 17 inscritas = 10 aceptaron + 4 sin avisar + 3 inscritas después
del cambio; 13 leads sin avisar. En todo el Hub nadie está en "Avisada": el equipo pasa directo a "Aceptó".
