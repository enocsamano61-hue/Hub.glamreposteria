# 30 oct 2026 · Regalo firme (reporte de Jared) y semáforo de cobros de la vendedora

Autorizado por Enoc ("permitido generar").

## F. Regalo firme en el cambio de fecha

**Reporte de Jared:** en la lista de Cambio de fecha, a una alumna que ya tenía su regalo ("pan de muerto", acceso enviado) le volvían a salir los botones de Aceptó / Reembolso / Ya le avisé.

**Causa:** con el regalo registrado solo salía el botón chico "↩" (regresar a "Sin avisar"). Al tocarlo, la alumna regresaba a "Sin avisar" **con el regalo todavía puesto**: arriba decía "Regalo… acceso enviado" y abajo reaparecían los botones. Eran 4 inscritas (todas regresadas el 29 oct entre 18:55 y 18:56).

**Qué se hizo**
- Migración `cambio_fecha_regalo_firme`:
  - Respaldo `respaldo.cambio_fecha_avisos_20261030` (y de la función en `respaldo.funciones_20261030`).
  - Reparación: las inscritas con regalo que estaban en "Sin avisar"/"Avisada" vuelven a "Aceptó" (ya recibieron su regalo). Quedaron 0 con regalo fuera de "Aceptó".
  - `cambio_fecha_marcar`: quien tiene regalo no puede pasar a otro estado que no sea "Aceptó" ("Ya tiene regalo registrado: primero quítale el regalo"). Protege aunque la pantalla estuviera vieja.
  - Función nueva `cambio_fecha_regalo_quitar(aviso, nota)`: quita el regalo, deja nota en su ficha y en su historial.
- Hub: con regalo registrado ya no sale "↩"; sale **"Quitar regalo"** (con confirmación y motivo opcional). Misma regla en la lista y en las dos fichas (usan `cfBotones`). Actividad: `cambio_fecha_regalo_quitado`.

**¿Qué pasa si…?**
- *…se registró el regalo a la persona equivocada?* "Quitar regalo" y se registra a la correcta.
- *…tiene regalo y pide reembolso?* Primero se quita el regalo (la base lo exige); el botón Reembolso no sale con regalo.
- *…el regalo está registrado pero sin enviar el acceso?* Se queda "Ya se envió" y "Quitar regalo".
- *…alguien con la pantalla vieja toca "↩"?* La base lo rechaza con un mensaje claro.

## G. Semáforo en el Inicio de la vendedora

Dentro de **Te toca cobrar hoy**, cuatro cuadros de sus propios cobros (misma lista de Cobranza, `itemsCobranza`; nada se guarda):
- **Rojo** · vencidos (la fecha ya pasó y no han pagado).
- **Amarillo** · vencen hoy o en los próximos 3 días.
- **Verde** · con fecha más adelante.
- **Gris** · sin fecha (solo si hay; Cobranza se las completa en "Completar datos").

Al tocar un color sale su lista (total, WhatsApp, Abrir; hasta 30 y avisa el resto). Si se abre el rojo, "Se te pasaron" no se repite abajo.

**¿Qué pasa si…?**
- *…no tiene cobros?* Los cuadros salen en 0 y dice "Nada por cobrar por ahora".
- *…tiene cobros pero ninguno hoy?* Dice "Hoy no te toca cobrar a nadie" y el verde/amarillo cuentan.
- *…la inscrita está por confirmar o su curso ya pasó?* No cuenta (igual que Cobranza).
- *…la fecha de la inscrita es la del curso, sin fecha de pago real?* Va a gris (Sin fecha), como en Completar datos.
- *…es administradora?* Solo lo ve si está marcada como vendedora; Enoc (Reporte del día) no cambia.

## Glamy y pruebas
- Glamy v30 (manual: semáforo y "Quitar regalo"); examen con 2 casos nuevos.
- `prueba_regalo_y_aviso.js` (paso 3b) y `prueba_toca_cobrar.js` (paso 1b y vacíos); capturas `regalo-quitar.png`, `toca-cobrar-semaforo.png`.
- `pruebas/historias/historias.sql`: H10 (con regalo no se regresa; se quita y entonces sí) y H6 quita el regalo antes del reembolso. Última corrida: fallas=0, bien=41.
- `HUB_VERSION = '2026-10-30-semaforo'` (siempre ≥ la última actualización publicada).
- Aviso `2026-10-30-semaforo`: **sin publicar** (espera "publica el aviso").
