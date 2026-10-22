# 2026-10-22 · Glamy BI entiende lenguaje sencillo: ciudades pendientes, "no van" y promesas

Permitido por Enoc el 22 oct 2026. Origen: le pidió a Glamy BI *"en cada ciudad pendiente a la que
iremos, cuántas inscritas con anticipo, cuántas con fecha de pago pendiente y cuántas confirmaron que no
van, en una sola tabla, que las filas sean las ciudades"* y salieron dos tablas con 117 y 108 ciudades
(toda la gira desde enero 2026), columnas que no eran y cortadas. Enoc lo pide con palabras sencillas a
propósito: Glamy debe aprender a interpretarlas.

## Qué fallaba
1. No existía "solo cursos que faltan"; y en leads el filtro de fechas era por fecha de alta, no del curso.
2. Glamy llamó dos veces a la tabla.
3. "Con anticipo" se tomó como "con pago" (incluía liquidadas); "no van" solo contaba inscritas.
4. La tabla iba a media pantalla y con encabezados cortados.

## Base (migración `glamy_bi_lenguaje_y_pendientes`, respaldo en `respaldo.funciones_20261022`)
- `bi_fuente`: cada fuente trae `fc` (fecha del curso). Leads: su ciudad es la del curso ligado (si no
  tiene, la de interés). Fuente nueva `nv` (No van): inscritas que ya no van + leads "No va a ir al
  curso", la misma persona en el mismo curso cuenta una vez.
- `bi_ejecutar(..., p_proximos)`: el motor con "solo cursos que faltan" (fc ≥ hoy). `bi_correr` queda con
  su firma de siempre (la usa el resumen semanal) y llama a `bi_ejecutar` sin el filtro.
- `bi_consulta` / `bi_matriz` aceptan `proximos: true`. La tabla por ciudad trae la **fecha del curso**
  de cada ciudad; con `proximos` salen TODAS las ciudades que faltan (también en ceros), por fecha.
- Métricas: `inscritas_deben` ahora se llama **"Con anticipo (deben)"** y exige anticipo > 0 (como el
  Calendario); nuevas **`promesa_vigente`** (prometieron pagar y la fecha no llega) y **`no_van`**;
  `promesas_vencidas` ya no cuenta las que reportaron pago por confirmar; `bajas` = solo inscritas.
- Con datos reales, la pregunta de Enoc: 48 ciudades (Monterrey en ceros), Con anticipo (deben) 219,
  Promesa vigente 25, No van 17; 1.3 s.

## Glamy (v17)
- `bi_consulta` y `bi_tabla` con `proximos`; métricas nuevas; `bi_tabla` una sola vez (si la repite, la
  nueva reemplaza a la anterior).
- Instrucción 9: **diccionario de frases sencillas** → métrica/filtro ("ciudades pendientes / las que
  faltan / a las que iremos" → proximos; "con anticipo" → Con anticipo (deben); "fecha de pago
  pendiente / prometieron pagar" → Promesa vigente; "cancelaron / no van / se bajaron" → No van; etc.) y
  decir en una frase cómo lo entendió.
- Modo prueba con `modo: "bi"` y la lista de herramientas que llamó con sus datos.
- `pruebas/examen_glamy.js`: +6 casos de Glamy BI en lenguaje sencillo (incluida la pregunta textual de
  Enoc). 18/18 dos veces seguidas (US$0.012 por corrida).

## Hub
- Periodo **"Cursos que faltan"** en la franja de Glamy BI.
- Tabla resumen a todo lo ancho, encabezados en dos renglones, columna **"Fecha del curso"** (ordenable),
  etiqueta "Solo cursos que faltan", CSV con la fecha.
- Las marcas de botón mal cerradas de Glamy (⟦ir:board⟦) igual se vuelven botón.
- Sugerencia nueva: "Ciudades que faltan: con anticipo, prometieron pagar y no van".

## Pruebas
- `prueba_glamy_bi.js` 50/50 (paso 9b y periodo), `prueba_glamy_no_sirvio.js` 17/17.
- Captura `glamy-bi-pendientes.png`.
