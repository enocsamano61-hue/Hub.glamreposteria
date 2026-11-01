# 31 oct 2026 · Monto del anticipo prometido (pedido de Jared)

Autorizado por Enoc ("permitido generar").

## Qué pasaba
La base ya tenía `leads.monto_anticipo` y Cobranza ya lo leía (Te toca cobrar hoy, Por cobrar, Calendario), pero **ninguna pantalla dejaba escribirlo**: "+ Nuevo lead" y la ficha del lead solo pedían la fecha. Por eso los leads salían con "—" en lugar de un monto. Al 31 oct: 62 leads abiertos con fecha de anticipo, **0** con monto (los 51 con monto eran datos viejos).

"Registrar pago" ya dejaba escribir cualquier cantidad (solo pide que sea mayor a $0; venía con $700 escrito). Eso es lo **pagado**; esto es lo **prometido**.

## Qué se hizo (sin cambios de estructura en la base)
- **"+ Nuevo lead" y ficha del lead**: casilla **"Monto del anticipo"** junto a la fecha, con botón **"$700"** de un toque (`ANTICIPO_HABITUAL`). Vacío = todavía no lo sabe (no frena el alta). En $0 o negativo no guarda y dice por qué. `LEAD_SELECT` ya trae `monto_anticipo` (un solo lugar).
- **Registrar pago**: arranca con lo prometido (si no hay, $700 como antes). Debajo dice "Prometió dar $X"; si escriben menos, "Prometió $X; estás registrando $Y. Se puede: lo que falte queda por cobrar." **No lo impide.**
- **Tarjeta del tablero**: "Anticipo 2 nov · $700".
- **Cobranza → Completar datos**: bloque nuevo **"Leads con fecha de anticipo pero sin monto"** (de la misma lista de Cobranza, `itemsCobranza`), con casilla y botón "$700" en el renglón; se guarda y el renglón sale. Actividad `lead_actualizado` ("anticipo prometido $700").
- **Vigilante** (migración `vigilante_lead_fecha_sin_monto`, respaldo de la función en `respaldo.funciones_20261031`): regla **amarilla** `lead_fecha_sin_monto` (leads abiertos de cursos que vienen, con fecha, sin monto y sin pago reportado). Al publicarla: 58. Rojas siguen en 0.
  - Nota: el vigilante cuenta todos los cursos que vienen; Completar datos, solo la gira que viene (como "Leads sin curso"). Por eso pueden no ser el mismo número.

## ¿Qué pasa si…?
- *…no sabe cuánto dará?* Se deja vacío; sale en Completar datos y en el vigilante (amarillo) para llenarlo después.
- *…paga distinto a lo prometido?* Registrar pago guarda lo que de verdad pagó; si es menos, lo avisa sin impedirlo; lo que falte queda por cobrar.
- *…cambia la promesa?* Se corrige en la ficha del lead (igual que la fecha).
- *…se inscribe o ya no va?* Deja de contar como promesa (igual que la fecha).
- *…pone $0?* No se guarda y dice por qué.
- *…ya reportó su pago?* No sale en Completar datos ni en el vigilante (ya hay monto pagado).

## Pruebas
- `pruebas/prueba_monto_anticipo.js` (20): Nuevo lead con $700, con otro monto, vacío y en $0; tarjeta del tablero; ficha; Registrar pago (arranca con lo prometido, aviso al pagar menos, sin monto = $700 sin aviso); Completar datos; celular. Capturas `monto-anticipo-*.png`.
- `pruebas/historias/historias.sql`: H11 (con fecha y sin monto el vigilante lo cuenta; con monto, ya no). Corrida: fallas=0, bien=44.
- Glamy v32 (manual: alta del lead, Registrar pago, Completar datos) + caso nuevo en `examen_glamy.js`.
- `HUB_VERSION = '2026-10-31-monto-anticipo'`. Aviso `2026-10-31-monto-anticipo`: **sin publicar**.

- **Publicado el 1 nov** en main (verificado en producción) y **aviso publicado** (Enoc: "adelante con los 2"), migración `publicar_aviso_2026_10_31_monto_anticipo`.
