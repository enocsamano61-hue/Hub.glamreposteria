# Pasar a curso en línea + saldo de Glamy + exámenes cortos (11 nov 2026)

"Permitido generar" de Enoc (11 nov), los tres juntos.

## Por qué
1. **Panel de Glamy**: medía "este mes" contra un saldo fijo de $10 escrito en el código. La consola de Anthropic
   cuenta desde la recarga del 19 oct ($10 → $8.56). Además los **exámenes de Glamy** (modo prueba) no se anotaban:
   eran ~90 % del gasto ($1.15 de $1.44) y el panel no los veía.
2. **Exámenes**: cada publicación corría las 56 preguntas (~$0.04), y cuando una fallaba al azar se repetían todas.
3. **Pasar a curso en línea**: una alumna de Comalcalco liquidó el presencial ($1,500) pero lo tomará en línea. Seguía
   contando en su curso ("cuando lleguemos al conteo nos va a aparecer como que va a llegar").

## Qué se hizo
### Base (migraciones `glamy_saldo_recargas` y `pasar_a_curso_en_linea`)
Respaldos: `respaldo.funciones_20261111` (bi_fuente, bandeja_limpieza, bi_proyeccion, vigilante_calcular,
glamy_buscar_persona), `respaldo.inscripciones_20261111` y `respaldo.pagos_20261111` (la inscripción del caso y sus pagos).
- `glamy_uso`: `prueba` (exámenes, sin usuario: `usuario_id` ya acepta vacío) y `nota`.
- `glamy_recargas` (fecha, monto en USD, nota): la lee y la llena quien recibe los tickets; candado de no borrar.
  Se cargó la recarga del 19 oct ($10). Una sola fila `prueba` de $1.1471 con nota: los exámenes del 19 oct al 11 nov
  que no se anotaron (diferencia contra la consola: recargado $10, saldo $8.56, uso anotado $0.2929).
- `pagos.verificacion` acepta `paso_a_linea`. Columnas nuevas: `inscripciones.venta_en_linea_id`, `paso_a_linea_en`,
  `paso_a_linea_por`; `pagos.pago_en_linea_id`; `pagos_en_linea.pago_origen_id`.
- `inscripcion_pasar_a_linea(insc, curso_en_linea, precio, motivo)`: cualquiera del equipo. No deja si ya llegó, si su
  curso ya pasó, si su lugar ya está cerrado, si tiene diploma, si tiene un pago por confirmar o si el precio es menor
  a lo pagado. Crea la venta en línea (misma persona y vendedora), copia cada pago confirmado a `pagos_en_linea`
  (ya confirmado, misma fecha y banco) y marca el original `paso_a_linea` (no se borra). La inscripción queda
  "No va" con anticipo 0 y la liga a su venta. Historial de la persona y aviso a Cobranza si no lo hizo Cobranza.
- `inscripcion_regresar_a_presencial(insc, motivo)`: solo administradores, mientras no se haya dado el acceso ni haya
  pagos en línea nuevos. Cancela la venta, regresa los pagos a `confirmado` y el estatus sale de sus pagos.
- Los pagos `paso_a_linea` no cuentan en: Glamy BI (`bi_fuente` 'pag'), la proyección, la Bandeja de limpieza ni las
  reglas del vigilante de pagos que no cuadran / capturados dos veces. `glamy_buscar_persona` trae `paso_a_curso_en_linea`.

### Hub (`HUB_VERSION = '2026-11-11-pasar-a-linea'`)
- Panel de Glamy: KPI **Saldo (desde la recarga)** = recargas − gasto (equipo + exámenes) desde la primera recarga, con
  barra y "al ritmo de los últimos 14 días alcanza para ~N días". Hoy / 7 días / Este mes y "Por persona" son solo del
  equipo. Renglón de **exámenes del mes** y **Registrar recarga** (actividad `glamy_recarga`). El Reporte del día ya no
  cuenta errores de los exámenes. Se quitó `GLAMY_SALDO_USD`.
- Ficha de la inscrita: **Pasar a curso en línea** (curso en línea de entrada el mismo, precio = lo pagado o el del
  catálogo, motivo, resumen de lo que pasa). Ya pasada: aviso con el curso y lo pagado, **Abrir su venta en línea** y, para
  administradores, **Regresar a presencial**; sin cobro, sin "Cambiar/Ceder", sin "Más información". Sus pagos dicen
  "pasó a en línea" y no se corrigen. Actividad `paso_a_linea` / `regreso_a_presencial`.

### Glamy (v42)
- Cada pregunta del modo prueba se anota en `glamy_uso` como `prueba`.
- Manual: "Pasar a curso en línea" y el saldo del panel.

### Exámenes (pruebas/examen_glamy.js)
- `--tema=palabra,palabra`: 8 básicas + las del tema (examen corto de un cambio chico). `--repetir`: solo las que
  fallaron la última vez. Sin nada: completo (va cuando cambia `index.ts`, el modelo o las herramientas, o el manual
  cambia mucho). Dos preguntas nuevas (pasar a en línea, saldo).

## Nada de fotos
El saldo se calcula cada vez (recargas − uso). Lo pagado de la venta en línea sale de `venta_en_linea_resumen` (sus
pagos). La inscripción no guarda "lo que pasó": la liga a la venta y los pagos marcados lo dicen. La única cifra escrita
a mano es la fila de los exámenes viejos, que es un registro de algo que pasó (no se recalcula).

## ¿Qué pasa si…?
- Debe algo todavía: pasa lo pagado y la venta en línea queda debiendo la diferencia (promesa en su semáforo).
- Tiene un pago por confirmar: no deja; primero se confirma o se marca "no llegó".
- Se equivocaron: un administrador la regresa (mientras no tenga acceso ni pagos en línea nuevos).
- Ya llegó o el curso pasó: no sale el botón (y la base no deja).
- Los números: el cobrado de la gira baja lo que pagó y pasa a en línea.
- Entra una recarga automática y no se anota: el saldo sale más bajo; el panel dice la última recarga anotada.
- Cambian los precios de Anthropic: hay que ajustar `PRECIO` en la función (diferencia de centavos con la consola).

## Pruebas
- `prueba_pasar_a_linea.js` (20/20), capturas 1200/390: pasar-linea-ficha.png, pasar-linea-aviso.png,
  pasar-linea-celular.png, glamy-saldo.png, glamy-saldo-celular.png.
- `prueba_glamy.js` y `prueba_reporte_dia.js` ajustadas (saldo primero; errores sin los exámenes).
- `correr_todas` 62/62. Historias `fallas=0 bien=83` (H18 nueva). Vigilante 0 rojas.
- Funciones probadas con el caso real dentro de una transacción que se deshizo (pasa liquidada $1,500; al regresar,
  vuelve liquidada y la venta cancelada).
- Examen corto (`--tema="(11 nov)"`): 10/10 · US$0.0128, anotado en `glamy_uso` como prueba (10 filas).

## Publicado (11 nov 2026)
- Producción con `HUB_VERSION = '2026-11-11-pasar-a-linea'` (verificado contra hub/index.html). Glamy v42 (igual al repo).
- Aviso `2026-11-11-pasar-a-linea` publicado.
- Caso de Comalcalco: pasado a "Los Pasteles más sabrosos de la chef" en línea ($1,500, liquidada, falta dar acceso);
  su lugar presencial quedó "No va" con la liga a su venta. Respaldo previo en `respaldo.inscripciones_20261111` y
  `respaldo.pagos_20261111`. Vigilante 0 rojas después.
