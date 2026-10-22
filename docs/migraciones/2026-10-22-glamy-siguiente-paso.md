# 2026-10-22 · Glamy: siguiente paso calculado, mapa de secciones, 👎 y examen

Permitido por Enoc el 22 oct 2026. Origen: preguntaron a Glamy por el estatus del lead de una alumna
(pago reportado sin confirmar) y los mandó a Calendario/Recepción cuando era Cobranza.

## Por qué pasaba
1. El manual decía que los pagos por confirmar se confirman "desde Recepción o la ficha" y Recepción
   aparecía en todo lo de pagos, sin decir que solo aplica el día del curso.
2. `glamy_buscar_persona` daba poco del lead (estatus y vendedora): ni pago reportado, ni promesa, ni
   comentario, ni fecha del curso. Glamy tenía que adivinar qué seguía.
3. No había forma de saber cuándo contestaba mal (glamy_uso no guarda texto).

## Base (migraciones `glamy_siguiente_paso_y_comentarios` y `glamy_paso_curso_cambio_y_deuda`)
- Respaldo de la versión anterior de la búsqueda en `respaldo.funciones_20261022`.
- `glamy_paso_curso(...)` y `glamy_paso_lead(...)`: el **siguiente paso** con definición fija
  (situación, sección, dónde y quién). Recepción solo si el curso es HOY. Orden de un curso: no va →
  cambio de fecha sin avisar (y además lo que debe) → hoy → pasado (no llegó / debe / diploma) →
  futuro (pagos por confirmar / debe / liquidada). Lead: cerrado → pago reportado sin confirmar (a su
  lead, lo confirma Cobranza) → curso pasado → sin curso → promesa vencida → promesa vigente → sin fecha.
- `glamy_buscar_persona`: cada curso trae `cambio_de_fecha` y `siguiente_paso`; cada lead trae
  `curso_ligado`, `fecha_promesa_anticipo`, `pago_reportado` (monto solo si el rol ve montos),
  `ultimo_comentario` (240 letras) y `siguiente_paso`. Mismos permisos que antes (invoker + RLS).
- `glamy_comentarios` (👎): pregunta, respuesta, herramientas, sección, modo, nota, revisado.
  RLS: cada quien inserta lo suyo; solo quien recibe los pedidos (Enoc) lee y marca revisado. Candado
  contra borrar. Probado: una vendedora inserta y no ve nada; el siguiente paso sale con datos reales.

## Glamy (v16)
- Manual: regla "Qué sigue y a dónde mandar" (usar SIEMPRE `siguiente_paso` para el botón) y mapa
  "situación → sección" (Calendario/Recepción solo el día del curso). Corregida la línea de pagos por confirmar.
- Modo prueba acepta `simular` (lo que regresaría cada herramienta) para el examen.
- `pruebas/examen_glamy.js`: 12 casos (pago de lead sin confirmar, deuda, pago en ficha, curso hoy,
  cambio de fecha, promesa vencida, no llegó, diploma y 4 sin datos). 12/12 dos veces seguidas,
  US$0.005 por corrida. Se corre antes de cada publicación de Glamy.

## Hub
- 👎 "No me sirvió" debajo de cada respuesta del chat de Glamy y de Glamy BI: campo opcional
  "¿Qué esperabas?", guarda en `glamy_comentarios`, no va al bloc. Actividad `glamy_no_sirvio`.

## Pruebas
- `pruebas/prueba_glamy_no_sirvio.js` 16/16. Capturas `glamy-no-sirvio.png`,
  `glamy-no-sirvio-gracias.png`, `glamy-no-sirvio-celular.png`.
- Para revisar los 👎: `select * from glamy_comentarios where not revisado order by creado_en desc`.
