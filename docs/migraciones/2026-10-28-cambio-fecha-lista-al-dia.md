# 2026-10-28 · Lista de Cambio de fecha siempre al día

Permitido por Enoc el 28 oct 2026 ("permitido generar"). Origen: Enoc, Jared e Isabella vieron inscritas que salían
arriba (en el curso, con anticipo) pero no abajo, en la lista del cambio de fecha, y no les podían marcar "Aceptó"
ni darles su regalo.

Decisión de Enoc: **todas** deben estar en la lista. Las que se inscribieron ya con la fecha nueva también pueden
recibir regalo, con una etiqueta visible para que el equipo lo verifique y decida.

## Por qué faltaban
La lista era una foto del momento en que se cambió la fecha (22 oct). No se actualizaba:

| Caso | Cuántas | Qué pasaba |
|---|---|---|
| Su lead se capturó después del cambio | 10 inscritas (+ sus leads) | Nunca entraron a la lista ("se inscribieron después, no necesitan aviso"). |
| Eran leads al cambiar la fecha; pagaron y se inscribieron | 45 | Su renglón se quedó como lead: salían abajo, sin pago y sin "Registrar regalo". |
| Se les cambió de curso | 2 | Su renglón se quedó en la lista del curso anterior. |

## Base (migraciones `cambio_fecha_lista_al_dia`, `cambio_fecha_lista_al_dia_2`)
- Respaldo `respaldo.cambio_fecha_avisos_20261028` (413 filas). Respaldo de `bi_fuente` y `glamy_curso` en
  `respaldo.funciones_20261027` ("(28 oct)").
- Columnas nuevas en `cambio_fecha_avisos`: `origen` (`nueva` = llegó con la fecha nueva; `otro_curso` = la cambiaron
  de otro curso; `faltaba` = estaba en el curso pero no en la lista) y `origen_nota` ("Viene de Veracruz (allá
  estaba: Avisada)").
- `cambio_fecha_sincronizar(p_evento)` (security definer; solo usuarios con sesión): para cada curso con cambio de
  fecha que no ha pasado, pone en la lista a toda inscrita (menos No va / Perdió anticipo) y a todo lead abierto que
  no tenga renglón. Nunca borra:
  - lead que se inscribió → su renglón pasa a la inscripción y conserva lo marcado (si como lead dijo "ya no va" y
    aun así pagó, vuelve a "sin avisar");
  - viene de otro curso con lista → renglón nuevo `otro_curso` con nota de dónde venía y qué tenía (el del curso
    anterior se queda como historial);
  - si no, renglón nuevo `nueva` (su primer lead del curso o su inscripción es posterior al cambio) o `faltaba`.
- Triggers `cambio_fecha_lista_inscripciones` y `cambio_fecha_lista_leads` (alta, cambio de curso, de persona o de
  estatus) la llaman para ese curso. El Hub también la llama antes de leer la lista.
- `cambio_fecha_lista`: solo muestra a quien sigue en ese curso (la inscripción o el lead del renglón son de ese
  curso); los leads en "Pago por confirmar" traen `pago` y `monto` del pago reportado.
- `bi_fuente('cf')` y `glamy_curso` usan la misma regla. `glamy_curso` ya no tiene `inscritas_despues_del_cambio`
  (no necesitan aviso): ahora `inscritas_con_fecha_nueva` e `inscritas_de_otro_curso`, que ya cuentan en las
  inscritas; la lista de Glamy dice si es nueva o de dónde viene.
- Al aplicarla: 68 renglones (44 leads pasados a su inscripción, 20 nuevas, 2 de otro curso, 2 faltaban).
  Inscritas de cursos con cambio sin renglón: 0. Una segunda corrida no cambia nada. Lista = BI = 435 renglones.
- Probado contra la base con ensayos que se deshacen: lead nuevo → entra como "nueva"; se marca Aceptó, paga y se
  inscribe → el renglón pasa a la inscripción con "Aceptó"; se cambia de curso → sale en la lista del nuevo con
  "Viene de… (allá estaba: Aceptó)" y ya no en la del anterior.

## Hub
- Etiquetas: "Nueva: se inscribió con la fecha nueva. Verifica si le corresponde regalo." / "Viene de … Verifica qué
  se le dijo." / "Se agregó a la lista después del cambio." En la lista y en la ficha de la inscrita.
- Chips "Nuevas: verificar regalo" y "Vienen de otro curso". Las nuevas tienen todos los botones (también
  "Registrar regalo"): el equipo decide.
- El lead que ya se inscribió sale una sola vez, con las que pagaron (antes también salía entre los leads).
- Grupo "Leads (todavía no se inscriben)", con los que reportaron pago primero: "reportó pago de $X (falta confirmarlo)".

## Glamy v23
- Manual: la lista siempre al día, "Nueva" y "Viene de…", y que las nuevas ya cuentan en las inscritas.
- Examen 30/30 (caso nuevo: cuántas llegaron con la fecha nueva).

## Pruebas
- Nueva `pruebas/prueba_cambio_fecha_al_dia.js` (16). `prueba_cambio_fecha.js` con el nombre nuevo del grupo de
  leads. `correr_todas.js`: 42 archivos en verde. Capturas `cambio-fecha-al-dia.png` y `-celular.png`.
