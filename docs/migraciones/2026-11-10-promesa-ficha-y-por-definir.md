# 2026-11-10 · Promesa de la ficha manda · Cursos con "fecha por definir"

"Permitido generar" de Enoc el 10 nov para las dos.

## A) Promesa vieja en el lead de una inscrita (alerta roja del vigilante, caso de Comalcalco)
- Causa: Cobranza cambió la fecha de pago en la **ficha** (15/12) y en su **lead** se quedó la promesa vieja (06/11).
  El vigilante (`promesa_escondida`) las comparaba y la marcaba como "promesa escondida": era la ficha la que estaba al día.
- Datos: su lead respaldado en `respaldo.leads_20261110`; se le quitó la promesa vieja, con nota en su historial.
- Base: disparador `promesa_de_ficha_manda` (inscripciones, al cambiar `fecha_proximo_pago`): quita la promesa distinta de
  su lead del mismo curso, con nota. Las reglas rojas quedaron en 0.

## B) Cursos con "fecha por definir" (Jared: "les vendimos sin tener fecha, solo que podamos poner la ciudad")
### Base (migraciones `cursos_fecha_por_definir` y `glamy_fecha_por_definir`; funciones en `respaldo.funciones_20261110`)
- `eventos.fecha_por_definir` (fecha null). Uno solo por ciudad y gira (índice único). Los cursos viejos del Excel sin
  fecha siguen siendo históricos (no tienen la marca).
- `curso_por_definir(ciudad, curso)`: cualquiera del equipo; solo giras vigentes; si la ciudad ya tiene curso con fecha de esa
  gira, dice que lo elija; crea o reutiliza; a los Gerentes (Jared) les llega una tarea con botón al Calendario.
- `curso_poner_fecha(evento, fecha)`: solo administradores; fecha de hoy en adelante; cierra la tarea y lo anota en el
  historial de sus inscritas. No es "cambio de fecha" (nunca tuvo).
- `embudo_cursos` y `avisar_ciudad_sin_curso` cuentan los "por definir"; `glamy_buscar_persona` trae `fecha_por_definir` y
  `glamy_paso_curso` lo explica. Vigilante amarilla `por_definir_sin_fecha` (con alumnas pagadas, más de 30 días).
### Hub (`HUB_VERSION = '2026-11-10-por-definir'`)
- Selectores de curso (Registrar pago, Confirmar pago, Nuevo lead, ficha del lead, Cambiar de curso): "+ Otra ciudad · fecha
  por definir…" abre la ventana: ciudad (propone la del lead) y gira. Queda "Ciudad · fecha por definir · gira". Cancelar deja vacío.
- Calendario: recuadro "Fecha por definir" (ciudad, gira, inscritas, con pago, leads, desde cuándo) y "Poner fecha" (administradores).
- Cobranza: sus inscritas se cargan aunque no tengan fecha; nunca "Curso ya pasó"; con anticipo y sin fecha de pago van a
  "Más adelante" ("curso con fecha por definir"). Leads ligados a ellos son de la gira que viene. Embudo: al final de su gira.
- Ficha: "fecha por definir"; "Ceder su lugar" sí se puede. "Este número ya está en el Hub": "Inscrita · … · fecha por definir".

## ¿Qué pasa si…? (B)
1. Se captura tarde: igual. 2. Paga y se inscribe: en su curso por definir. 3. No se encuentra el pago: como siempre.
4. Cambia de curso: entre por definir y con fecha, conserva lo pagado. 5. Cede su lugar: igual. 6. Reembolso: igual.
7. Se le pone fecha: todas pasan solas a ese día (Cobranza, Recepción, diplomas). 8. Ya existe: se reutiliza, nunca dos.
9. Su curso ya pasó: no aplica sin fecha. 10. Cobranza, Embudo, semáforo, Calendario y Glamy leen la misma marca.

## Pruebas
- `prueba_fecha_por_definir.js` (15/15), capturas 1200/390. Historia H16 (A y B contra la base real). Historias: fallas=0.
