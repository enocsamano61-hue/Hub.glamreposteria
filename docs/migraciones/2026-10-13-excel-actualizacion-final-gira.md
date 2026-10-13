# Última actualización del Hub desde el Excel de la gira (13 oct 2026)

**Fecha:** 13 de octubre de 2026
**Archivo:** `CRM_OFICIAL_GIRA_REPOSTERIA_NACIONAL_3.xlsx`, descargado al final del 12 oct (md5 `2f48516f2be102cb1dc29cb143fa04b2`)
**Curso:** `LOS PASTELES MAS SABROSOS DE LA CHEF` (`877e4252-5964-4046-9cf5-1a697fb7a4b1`)
**Código tocado:** ninguno. `hub/index.html` no se modificó.
**Por qué importa:** después de esta carga **se deja de usar el Drive**; el Hub queda como única fuente.

---

## Alcance (acordado con Enoc)

| Parte | Qué se trajo |
|---|---|
| **Gira norte, cursos ya dados** (Parral 10 sep → Durango 12 oct, 23 fechas) | Actualización completa: altas, pagos, precio, paquete VIP, asistencia, bajas, contacto |
| **Guadalupe Victoria** (13 oct, el mismo día de la carga) | Sólo lo vendido antes del curso. Lo del día lo captura el equipo en el Hub |
| **Gira sur** (26 oct → 22 dic, 47 fechas) | Altas, pagos, VIP, bajas explícitas, contacto. Sin asistencia |
| **Hoja LPMSDLC** (leads del curso) | Leads que no existían; cierre de los que ya se inscribieron; 6 que pagaron un curso del sur se inscriben con ⚠ VALIDAR |

El calendario del Hub se comparó contra las fotos oficiales de la gira (norte y sur): las 71 fechas coinciden.

## Decisiones de Enoc

1. Pagos: **A + B** — una fila en `pagos` por lo cobrado en el curso (fecha del curso, confirmado; forma de pago sólo si el Excel la dice) **y** una por cada anticipo que sólo existía en el Excel (con banco, fecha y hora). El anticipo de la inscripción sigue siendo el total.
2. No llegó con anticipo: **"Perdió anticipo" (15)** donde el vendedor escribió "pierde anticipo"; **"No llegó" (14)** en el resto, guardando el estatus anterior como hace Recepción.
3. Sin pago y no fue: **"No va al curso" (6)**. Quien no está en el Hub no se da de alta.
4. Precios especiales del Excel (1,100 / 1,200 / 1,300, casi siempre "curso pasado"): **se usa el precio capturado**.
5. Pagó anticipo pero el Excel no dice si llegó: **urgente (9)**.
6. LPMSDLC pagadas para un curso del sur: **se inscriben con ⚠ VALIDAR**.
7. Leads de quien quedó inscrita: **cerrados** con la nota "CERRADO 13 oct 2026".
8. Comentarios del Excel: **se anexan** como `EXCEL 13 oct 2026: …` (nunca se borra lo anterior). Contacto: sólo se rellena lo vacío.
9. Recepción: **no se cierra**; se le deja a Jared una tarea en su 📝 para revisar y cerrar cada ciudad.

## Lo que el Excel enseñó nuevo (además de la guía)

- **Columna `LIQUIDO`** (y su errata `LIQUDIO` en Delicias): el vendedor marca así a quien terminó de pagar en el curso. Es la evidencia de "llegó y liquidó".
- **Sección "NO ASISTIERON / NO LLEGARON"** justo debajo del bloque del curso en 10 ciudades (Juárez, Agua Prieta, SLRC, Mexicali, Tijuana, Ensenada, Rosarito, Guaymas, Los Mochis, Mazatlán). Es la evidencia escrita de quién no llegó. Puede traer renglones con sólo el teléfono.
- **Frases en la propia fila**: "NO LLEGA PIERDE ANTICIPO", "NO VA A LLEGAR", "TOMARÁ CURSO ONLINE".
- **Celda de pago con varios abonos** y el segundo sin `$` (`$700 … + 500 10 sep …`). Se leen todos; sólo cuenta la celda de pago (la que empieza con `$`/`ABONO`), no los `$` que aparecen en comentarios (p. ej. "allá dan los cursos en $3000").
- **Teléfonos compartidos** (mamá/hija, hermanas, "fue X en su lugar"): el cruce por teléfono tomó en 7 casos el renglón equivocado. Se corrigieron a mano antes de aplicar (ver abajo). Para la próxima: emparejar primero por teléfono **y** nombre, y sólo después por teléfono.
- **Muchas "pagó" eran leads con 💜 pago reportado que nadie confirmó**: por eso no aparecían inscritas (Durango tenía 17 inscritas en el Hub y 33 en el Excel).

## Resultado

### Gira norte (23 fechas ya dadas)

| | Antes | Después |
|---|---:|---:|
| Inscritas | 534 | 659 (+125 altas) |
| Liquidadas | 257 | ≈525 |
| Llegaron / No llegaron | 0 / 0 | 519 / 53 |
| Cobrado (suma de anticipos) | $382,914 | $858,740 |

Parral → Caborca ya tienen precio en cada inscripción y en el evento ($1,400; anticipo sugerido $700).

### Totales aplicados (`respaldo.excel_20261013_registro`)

| Concepto | Cantidad |
|---|---:|
| Inscripciones actualizadas | 588 |
| Inscripciones nuevas | 130 |
| Personas nuevas | 39 |
| Pagos registrados | 1,086 ($810,510) |
| Leads cerrados | 90 |
| Leads nuevos (LPMSDLC) | 6 |
| Tarea para Jared | 1 |
| Huella md5 | `18187de89eddfd84bad3c30132b20691` |

Más 3 inscripciones (Parral 1, Nogales 2) que no estaban en el Excel y no tenían precio: se les puso $1,400 con nota.

### Invariantes verificadas al final (alcance: curso activo desde el 10 sep)

| Revisión | Resultado |
|---|---:|
| `anticipo + restante = precio` (sin bajas ni pagos de más) | 0 descuadres |
| `liquidado` coherente con `anticipo >= precio` | 0 |
| Estatus pagado sin liquidar | 0 |
| Sin precio | 0 |
| Persona en dos cursos de la gira | 0 |
| Pagos registrados mayores al anticipo | 0 |
| Teléfonos duplicados / inscripciones huérfanas | 0 / 0 |

8 inscripciones tienen **pago de más** (anticipo > precio). Se dejan tal cual para revisar devolución o saldo a favor.

## Casos que quedan para revisión humana (lista nominal entregada aparte)

| Caso | Cuántos | Qué se hizo |
|---|---:|---|
| No llegó (14) / Perdió anticipo (15) | 33 / 20 | marcados con asistencia "no llegó"; se deciden en No llegaron |
| Pagó anticipo y el Excel no dice si llegó | 9 | urgente (9) con nota |
| Teléfono compartido: "fue otra persona en su lugar" | 2 | una sola inscripción, nota ⚠ VALIDAR |
| Dos hermanas con el mismo teléfono (una no llegó, la otra liquidó) | 1 | urgente: capturar a la segunda con su propio número |
| Nombre del Excel distinto al del Hub en ese lugar | 4 | se aplicó y se dejó nota ⚠ VALIDAR |
| Renglón de otra persona (familiar) que dice "no va" | 1 | no se tocó la inscripción; sólo nota |
| Inscritas desde LPMSDLC | 6 | estatus 11 con ⚠ VALIDAR |
| Pago de más | 8 | sin cambio |
| Anticipos del Excel sin día/mes | 29 | sumados en el anticipo, sin fila en `pagos` |
| Steward / personal de apoyo | 7 | no se inscribieron |

## Cómo se aplicó

1. Respaldo: `respaldo.inscripciones_20261013` (730), `pagos_20261013` (112), `leads_20261013` (511), `personas_20261013` (36,529), `notas_usuario_20261013`.
2. Los cambios calculados desde el Excel se subieron como texto a `respaldo.excel_20261013_raw` en 10 bloques; **cada bloque se comprobó con md5** contra el cálculo local.
3. Se convirtieron a tablas de trabajo (`respaldo.excel_20261013_u/a/g/c/lc/ln`) y cada referencia se resolvió 1 a 1 contra el Hub.
4. El conector de Supabase dejó de aceptar escrituras con varios cambios (se colgaba a los 60 s sin llegar a la base), así que **Enoc corrió el script final desde el SQL Editor de Supabase** (`excel_13oct_aplicar.sql`, entregado aparte porque trae nombres). El script:
   - corre en una transacción y se niega a correr dos veces;
   - **no pisa** inscripciones que el equipo cambió en el Hub después del respaldo (las salta y las reporta; no hubo ninguna);
   - guarda lo creado en `respaldo.excel_20261013_personas_creadas`, `_insc_creadas`, `_pagos_creados`, `_leads_creados`.

   Nota: el SQL Editor marcó "UPDATE sin WHERE" (falso positivo: todos los UPDATE usan `FROM … WHERE`) y al final dio `relation "_vend" does not exist` porque parte el script; todo lo anterior ya se había guardado y se verificó completo.

## Cómo revertir

El script entregado trae al final, comentado, el bloque de reversa. Resumen:

```sql
begin;
set local glam.permitir_borrar = 'si';
-- inscripciones actualizadas: regresar columnas desde respaldo.inscripciones_20261013
-- borrar lo creado: respaldo.excel_20261013_pagos_creados, _insc_creadas, _leads_creados, _personas_creadas
-- leads cerrados: regresar estatus/comentario desde respaldo.leads_20261013
-- personas: regresar correo/cumpleaños/tel 2 desde respaldo.personas_20261013
-- tarea de Jared: notas_usuario con texto 'PENDIENTE (Excel 13 oct)%'
commit;
```

## Pendientes

- **Jared**: revisar y cerrar la Recepción de las 23 ciudades del norte (tarea en su 📝). Al cerrar, el Hub marca "No llegó" a quien siga sin marca, por eso primero hay que revisar las urgentes y las pocas sin marca (Parral 2, Delicias 3, Obregón 3, …).
- **Vendedores**: confirmar los casos en urgente y los ⚠ VALIDAR.
- Siguen los pendientes anteriores de la guía (`docs/GUIA_ACTUALIZAR_DESDE_DRIVE.md` §13): Córdoba/Mérida con "anticipos" de $10–$50, teléfono ambiguo de 11 dígitos, Tepatitlán sin fecha, ciudades por decidir.
- El conector de Supabase colgándose en escrituras: si vuelve a pasar, el camino probado es el SQL Editor con un solo script transaccional.

## Anexo: Guadalupe Victoria (13 oct, mismo día, hoja aparte)

Última fecha de la gira norte. El equipo mandó la hoja de la ciudad al terminar el curso
(`GUADALUPE_VICTORIA.xlsx`, md5 `c29f8ff2fc44ffe65e1b81d29b2529bf`). Las 14 alumnas de la hoja dicen `LIQUIDO`.

| | Antes | Después |
|---|---:|---:|
| Inscritas | 12 | 14 |
| Llegaron / liquidadas | 0 / 1 | 14 / 14 |
| Cobrado | $9,100 | $20,100 |

- 12 inscripciones existentes → llegó + pagado + liquidada, con una fila en `pagos` por lo cobrado en el curso.
- 1 alta de un lead con 💜 pago reportado sin confirmar (anticipo registrado con banco BanCoppel, decisión de Enoc); el lead se cerró.
- 1 alta de persona + inscripción que no existía en el Hub.
- 2 inscripciones sin vendedor → el del Excel.
- 1 nombre con apellidos repetidos corregido (decisión de Enoc).
- Sin pago y sin inscripción en la hoja (1) y steward (1): sin cambios.
- Recepción **abierta**; tarea a Jared "Cerrar la Recepción de Guadalupe Victoria 13 oct" con botón "Abrir Recepción".

Respaldos: `respaldo.gv_20261013_inscripciones`, `_pagos`, `_leads`, `_personas`; lo creado en
`respaldo.gv_20261013_creados`. Se aplicó desde el SQL Editor (el conector se colgó otra vez al escribir).
Verificado: 0 descuadres entre pagos y anticipo, 0 inscripciones saltadas.

## Nota sobre datos personales

Aquí no hay nombres, teléfonos ni montos individuales. Las listas nominales (plan por alumna, casos para revisar, LPMSDLC) y el script con nombres se entregaron aparte, fuera del repo.
