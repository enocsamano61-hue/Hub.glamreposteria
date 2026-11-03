# 3 nov 2026 · Tickets #5, #7 y #8, y fechas que se guardaban de más

Autorizado por Enoc ("8 de acuerdo", "7 abre la opción… que se notifique a Jared", "5 perfecto", "sí revísala").

## #5 · Pago de $200 capturado por error (Cinthia) — solo datos
Migración `ticket5_anular_pago_por_error` (respaldo en `respaldo.pagos_20261103` y `respaldo.inscripciones_20261103`):
- El abono de $200 del 3 nov se **anuló** (`verificacion = 'no_llego'`, como el botón "No llegó"); no se borró.
- Su lugar quedó en pagó $200 · debe $1,200, con nota en su ficha y en su historial.
- **Posible lugar duplicado** (persona "(sin nombre)" con el mismo celular y otro lugar en el mismo curso, $0): **no se tocó**; tarea en el bloc de Cobranza para revisarlo a mano.
- Ticket cerrado (a Cinthia le llega el aviso).

## #8 · Teléfono alterno al dar de alta (Josefina)
- "+ Nuevo lead" trae **Teléfono alterno (opcional)** debajo del teléfono. A 10 dígitos (acepta +52, espacios, guiones), distinto del principal (si es igual, no guarda y lo dice). Se guarda en `personas.telefono_alternativo`; si la persona ya existía, se le agrega.

## #7 · Lead de una ciudad sin curso en la gira (Isabel)
Patricia Fosados no tenía inscripción nueva: Isabel creó un lead con ciudad Naranjos y sin curso, porque **Naranjos no tiene curso en la gira** (y "Mesa de Postres" no tiene cursos futuros).
- "+ Nuevo lead": si eligen una ciudad sin curso, sale el aviso "**<ciudad>** todavía no tiene curso en la gira. Puedes guardar el lead: al guardarlo le avisamos a **Jared** (organiza la ruta)…". Se guarda igual.
- Función nueva `avisar_ciudad_sin_curso(lead)` (migración `avisar_ciudad_sin_curso`): a quien tiene rol **Gerente** (Jared) le llega **una tarea por ciudad** al bloc ("Ciudad sin curso en la gira: Naranjos · N leads esperando", con quién lo dio de alta y botón "Ir a Giras"). Si ya tiene la tarea abierta de esa ciudad, se actualiza la cuenta (no se repite).
- También se avisa si en la ficha del lead le cambian la ciudad a una sin curso (y no tiene curso).
- El toast al guardar dice que ya se le avisó a Jared y que el lead se encuentra con el buscador del tablero o en Historial cliente (si la ciudad no es de la gira, no sale en el tablero).
- Registrar el pago sigue necesitando un curso: cuando Jared dé de alta el curso, se liga en la ficha y ya se registra.

## Fechas que se guardaban con cada movimiento
Una alumna tenía ~30 cambios de "próximo pago" en 3 minutos (1 nov, sin fecha, 1 ene…). Causa: la casilla de fecha de la ficha (y las de Completar datos y Graduación) guardaba en cada `change`, y al teclear el navegador suelta fechas a medias (año 0002, 0020, 0202; mes 01 mientras se escribe 11).
- Ahora esas casillas (`FECHAS_AUTOGUARDADO`) **esperan a que terminen**: guardan 1 s después del último cambio o al salir de la casilla, y solo si la fecha es completa y razonable (2020–2100) o vacía. Un solo guardado y una sola anotación en la actividad.
- Las demás fechas (formularios con botón Guardar, filtros) no cambian.

## ¿Qué pasa si…?
- *…el teléfono alterno es igual al principal o le faltan dígitos?* No guarda y dice por qué.
- *…la persona ya tenía un alterno?* Se reemplaza con el que escribieron (igual que el correo).
- *…dan de alta varios leads de la misma ciudad sin curso?* Jared tiene una sola tarea por ciudad con la cuenta al día.
- *…Jared ya cerró la tarea y llega otro lead?* Se abre una nueva.
- *…la ciudad ya tiene curso?* No hay aviso ni tarea.
- *…escriben la fecha y se van antes del segundo?* Al salir de la casilla se guarda en ese momento.
- *…dejan la fecha a medias (año 0020)?* No se guarda esa fecha.

## Pruebas
- `pruebas/prueba_tickets_3nov.js` (18): teléfono alterno (igual al principal, incompleto, con +52, vacío), ciudad sin curso (aviso, guardado, aviso a Jared), fecha que espera (no guarda a medias, guarda una vez, al salir de la casilla), celular. Capturas `ciudad-sin-curso-*.png`.
- Ajustadas: `prueba_ficha.js`, `prueba_ficha_estatus_curso.js`, `prueba_cobranza_completar.js` (esperan a que se guarde la fecha), `prueba_ya_existe.js` (el alterno va entre el teléfono y el nombre).
- `pruebas/historias/historias.sql`: H12 (una tarea por ciudad para quien organiza la ruta, con la cuenta). H1–H11 pasaron en la corrida completa; H12 se corrigió (la ciudad puede tener otros leads) y se corrió aparte: bien.
- Glamy v34 (manual: teléfono alterno y ciudad sin curso) + 2 casos en `examen_glamy.js`.
- `HUB_VERSION = '2026-11-03-tickets'`. Aviso `2026-11-03-tickets`: **sin publicar**.
