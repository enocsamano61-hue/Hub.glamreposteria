# Fechas de cobro rescatadas de los comentarios — 23 sep 2026

Migración `cobranza_02_fechas_rescatadas_de_comentarios`.

Para que la vista Cobranza sirviera desde el primer día, se leyeron las fechas que ya venían
escritas en los comentarios importados del Excel. **Sólo se llenó donde la fecha era clara.**

## Leads → `fecha_compromiso_pago`

Se revisaron los 260 leads activos con comentario. Cada comentario mezcla varias fechas y sólo
cuentan las **promesas de pago**:

| Cuenta como promesa | No cuenta |
|---|---|
| La columna de fecha del Excel (`2026-09-21 00:00:00`): es la fecha de anticipo acordada. Coincide con las reagendas y Cobranza persigue justo después. | `CUMPLEAÑOS: …` |
| `COBRANZA VENTAS: dd/mm/aaaa` | Fechas de contacto: `HOY 21 SEP`, `WPP 6 SEP`, `NCO …`, `REC …` |
| Texto con verbo de pago: `30 SEP LO HACE`, `REAGENDA 7 SEP`, `ANTICIPO 24 SEPTIEMBRE`, `ABONA`, `TENTATIVAMENTE` | "9 SEP VA A DEMORAR…", "… NO …" |
| | La columna del Excel cuando el comentario ya registra un pago (`$785 4 feb … coppel`), porque ahí es la fecha de ese pago |

Resultado:

- **98 leads con una sola fecha** → se llenó. 15 son de hace más de 60 días (leads viejos que
  siguen activos) y salen como 🔴 vencidos.
- **34 leads con varias fechas distintas** → **no se tocaron**. Van en una lista aparte para
  revisión, con la promesa más reciente como sugerencia. No se incluye aquí porque trae nombres
  y teléfonos.
- **128 sin promesa de pago** → siguen sin fecha (⚫ en Cobranza).

## Inscritas → `fecha_proximo_pago`

Sólo las **3** con `COBRANZA: dd/mm/aaaa` explícito en el curso activo: Minatitlán, Frontera
Comalapa y Chilpancingo. Las tres dicen enero de 2026, meses antes de su curso (nov/dic). Por
eso salen como vencidas: hay que confirmarlas con Cobranza. Las demás notas de cobranza ("PDP",
"03 FEBR", texto libre) no se tocaron.

## Seguridad

- Sólo se llenó donde el campo estaba vacío.
- Todo queda en `respaldo.fechas_rescatadas_20260923` (tipo, id, fecha, de dónde salió, si se
  aplicó): 101 filas, las 101 aplicadas. Se verificó con una huella MD5 de (id, fecha) contra lo
  calculado.
- Para revertir: `UPDATE leads SET fecha_compromiso_pago = NULL WHERE id IN (SELECT id FROM
  respaldo.fechas_rescatadas_20260923 WHERE tipo='lead')`, y lo mismo con inscripciones.

## Ajuste en la vista Cobranza

Cobranza ahora trae **los mismos leads que el tablero**: los de ciudades de la gira activa o sin
ciudad. Así no aparecen leads de giras viejas.

Con los datos de hoy queda así:

- 31 🟣 por confirmar;
- 63 🔴 vencidos (14 de hace más de 60 días);
- 5 🟡 esta semana;
- 129 ⚫ sin fecha.

Pruebas: `prueba_cobranza` 44/44 más toda la regresión.
