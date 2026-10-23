# 2026-10-23 · Gira en puerta, una sola clasificación de pago, bandeja de limpieza y candados

Permitido por Enoc el 23 oct 2026, después de la auditoría de dinero y embudos (solo lectura). Origen: una
inscrita con su pago pasado a "por confirmar" seguía igual en Cobranza y en el Embudo; el Embudo decía 289
"con anticipo" cuando 69 no habían pagado nada; Cobranza y el Embudo no cuadraban; se colaban leads de
ciudades que ya no se visitan, de cursos pasados y sin ciudad.

## Reglas (una sola definición para todas las pantallas de operación)
- **Lo que está en puerta**: cursos del curso activo de **hoy en adelante** y sus ciudades
  (`ciudades_en_puerta()` en la base, `cargarCiudadesGiraActiva()` + `leadEnPuerta()` en el Hub).
  Un lead es de la gira si está ligado a un curso que no ha pasado, o si no tiene curso pero su ciudad se visita.
- **Situación de pago de una inscrita** (`situacion_pago(id)` en la base = `situacionPagoInsc()` en el Hub), en este orden:
  no va (no va / perdió anticipo) → no llegó → verificar ("algo está mal") → **por confirmar** (tiene un pago
  por confirmar, aunque ya haya liquidado: no se ve liquidada hasta confirmarlo) → liquidada → con anticipo → sin pago.
- Un lead de alguien **ya inscrita en ese curso** no cuenta doble; si trae un pago por confirmar sí se queda en
  "por confirmar" (ese dinero aún no está en su ficha; al confirmarlo, el Hub lo pasa a su ficha y cierra el lead).

## Base (migraciones `gira_en_puerta_y_situacion_pago` y siguientes)
- Respaldo: `respaldo.funciones_20261023` (embudo_cursos, bi_alertas, bi_fuente, bi_metrica, bandeja_limpieza).
- Nuevas: `situacion_pago(uuid)`, `ciudades_en_puerta()`, `bandeja_limpieza()` (SECURITY INVOKER: respeta RLS).
- `embudo_cursos`: mismas columnas; inscritas por `situacion_pago` con grupos nuevos `sin_pago` y `verificar`;
  la inscrita con pago por confirmar va a `sin_confirmar`; `monto` = lo pagado (`anticipo`), ya no la suma de la
  tabla de pagos (22 anticipos del Excel salían en $0).
- `bi_alertas` (Hoy atender): solo la gira que viene + aviso de inscritas con pago por confirmar, pagos que no
  cuadran y leads fuera de la gira (bandeja).
- Glamy BI: `bi_fuente('ins')` trae `situacion`; métricas `inscritas_sin_pago` e `inscritas_por_confirmar`
  (sentido "menos").
- **Candado** `leads_candado_pago_por_confirmar` (trigger): un lead no entra a "Pago por confirmar" sin
  `pago_reportado_en` (💜 Registrar pago). Los que ya estaban así no se tocan (salen en la bandeja).
- Quedó una función vacía de prueba `bi_alertas_cuadre()` (solo cuenta; nadie la llama): la herramienta no deja
  ejecutar `drop` sin confirmación; borrarla a mano cuando se quiera.

## Hub (`hub/index.html`)
- **Cobranza → Por cobrar**: solo la gira que viene; inscritas con pago por confirmar en 🟣 con "🏦 $X por
  confirmar"; grupo nuevo **⏳ Curso ya pasó · debe** (las de cursos de hace ≤14 días que siguen debiendo; antes
  en Vencidos); marca "⚠ Verificar antes de cobrar"; "Lead · ya inscrita".
- **🧹 Bandeja de limpieza** (abajo en Cobranza): pc sin datos, pagos dobles, pagos que no cuadran, leads de
  alguien ya inscrita, ciudades que no se visitan, cursos pasados, sin ciudad, inscritas sin vendedora. Lo que
  trae dinero (💰) va primero y abierto. No cuenta en los números de arriba. "Abrir" abre la ficha.
- **Embudo**: grupos "Pago por confirmar", "Verificar" e "Inscrita sin pago" (los dos últimos solo si hay); el
  reporte de WhatsApp cuenta todas las inscritas.
- **Calendario**: sin el "fallback" que contaba leads de la ciudad de cualquier época; las que no van no cuentan;
  la liquidada con pago por confirmar no sale liquidada.
- **Inicio**: "Leads abiertos de la gira", "Inscritas de la gira", "Cursos de la gira" (antes todo el Hub).
- **Leads**: el tablero ya no trae leads ligados a cursos que ya pasaron ni de ciudades que no se visitan.
- **Candados**: "Pago por confirmar" a mano sin datos → pide 💜 Registrar pago; registrar en la ficha un pago con
  el mismo monto y fecha que uno existente → pregunta "¿Es otro pago?" (actividad `pago_doble_evitado`).
  Recepción no lo necesita: cobra exactamente lo que debe y después ya no deja cobrar.
- Ventas/Reportes: los conteos salen del Calendario (ya corregido); el dinero recibido sigue igual (lo que pagó
  quien perdió su anticipo sí se cobró).

## Limpieza de datos
- Los 3 leads "ya inscrita" **no se cerraron**: los 3 tienen un pago reportado ($700, $900 y $1,050) que no está en
  la ficha de su inscripción. Cerrarlos escondía ese dinero. Quedan en 🟣 Por confirmar ("Lead · ya inscrita")
  y en la bandeja; al confirmar el pago, el Hub lo pasa a su ficha y cierra el lead.

## Cuadre (verificado contra la base el 23 oct)
- Embudo vs Por cobrar: 191 leads en ambos, 48 por confirmar en ambos, 0 diferencias.
- Inscritas que vienen: 292 = 217 con anticipo + 64 sin pago + 7 verificar + 3 liquidadas + 1 por confirmar.
- `situacionPagoInsc` (Hub) vs `situacion_pago` (base) en 669 inscritas (gira + últimos 30 días): 0 diferencias.
- Glamy BI: inscritas_sin_pago 64 e inscritas_por_confirmar 1 en los cursos que faltan (igual que el Embudo).
- Bandeja hoy: 71 sin ciudad, 54 ciudad fuera, 7 curso pasado, 3 ya inscrita, 6 "pc" sin datos, 1 pago doble
  ($1,200 dos veces, 2 min), 1 pago que no cuadra ($600 vs $400), 95 sin vendedora.

## Glamy
- v19: manual (Cobranza gira en puerta, bandeja, grupos del Embudo, ficha única, estatus de inscrita, cambiar de
  curso, estado del pago, candados) y métricas nuevas. Examen 19/19.

## Pruebas
- `pruebas/prueba_gira_en_puerta.js` 25/25. Capturas `gira-en-puerta-cobranza.png`, `-bandeja.png`,
  `-pago-doble.png`, `-celular.png`.
- `pruebas/prueba_embudo.js` actualizada a los nombres nuevos (29/29).
