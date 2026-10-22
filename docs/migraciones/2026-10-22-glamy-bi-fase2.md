# 2026-10-22 · Glamy BI fase 2: matriz, periodo, metas, resumen semanal y proyección

Permitido por Enoc el 22 oct 2026 ("de la 1 a la 5 de una sola vez"). Origen: sus pruebas reales
("resumen de alumnas por ciudad: cuántos anticipos pendientes, cuántos pendientes de pago…"), que
Glamy contestaba con gráficas sueltas en vez de una tabla, y la ambigüedad de "anticipos pendientes".

## Base de datos (migraciones `glamy_bi_fase2_motor` y `glamy_bi_resumen_semanal`)
- `bi_puede()`: administradores, o el resumen semanal del sistema (marca local `glam.bi_sistema`).
  La usan `bi_correr`, `bi_consulta`, `bi_matriz`, `bi_proyeccion` y `bi_alertas`.
- Métricas nuevas: `inscritas_deben`, `leads_promesa` (anticipos prometidos sin pagar),
  `leads_por_confirmar` (anticipos reportados sin confirmar). `por_cobrar` se muestra como "Deben ($)".
  `bi_sentido(k)`: si más es mejor, peor o neutro (para el color de la matriz).
- `bi_matriz(spec)`: varias métricas (máx. 10) por ciudad/curso/vendedora/estado/mes con totales y
  metas por fila. Probado con datos reales: 9 columnas por ciudad en 0.3 s.
- `bi_metas` (por gira; total, ciudad o vendedora; cobrado, con_pago, inscritas, liquidadas,
  conversión, pagos, asistencia). RLS solo admins; "Quitar" la desactiva; candado contra borrar.
  `bi_consulta` regresa `meta` (total y por fila).
- `bi_proyeccion`: cobrado + ritmo de pagos de las últimas 4 semanas × semanas hasta el último curso.
  Con datos reales: ritmo $93,405/semana, 21.7 semanas → $3,595,440 (estimado simple; siempre se
  muestra con su supuesto).
- `bi_resumen_semanal()` (security definer, sin permisos para usuarios): nota al bloc de cada
  administrador con cobrado (y meta), pagos de la semana vs la anterior, nuevas inscritas con pago,
  leads nuevos, conversión, proyección y lo de "Hoy atender"; el de la semana pasada se da por visto.
  **pg_cron** activado: `glamy-bi-resumen-semanal`, lunes 14:31 UTC (8:31 de México).

## Glamy
- Herramienta `bi_tabla` (matriz) y las métricas nuevas en `bi_consulta`.
- Instrucciones: usar una tabla para resúmenes con varios datos por fila; decir avance contra meta y la
  proyección con su supuesto; si la pregunta es ambigua, contestar la interpretación más probable y
  agregar hasta 2 preguntas de seguimiento con la marca ⟦seguir:…⟧ (el Hub las vuelve botones).
- Manual: Glamy BI con matriz, metas, proyección y resumen semanal.

## Hub (`hub/index.html`)
- Franja: **Periodo** (toda la gira, últimos 7 días, este mes, mes pasado, de… a…) y **🎯 Metas**
  (modal para capturar y quitar metas).
- KPI: barra de avance contra meta; en Cobrado, "Proyección al cierre" con su ritmo y semanas.
- Matriz: totales, color verde/rojo según la métrica, "% de meta" por celda, ordenar por columna,
  detalle al tocar una celda, CSV, guardar en el tablero (se vuelve a consultar como tabla).
- "Para afinar": las preguntas de seguimiento de Glamy como botones.
- Bloc: el "Ir →" del resumen semanal abre Reportes → Glamy BI.

## Pruebas
- `pruebas/prueba_glamy_bi.js` 44/44. Suite: 29 archivos en verde.
- Contra la base real (transacciones revertidas): matriz, metas, proyección, alertas, resumen semanal
  (3 notas, texto revisado) y bloqueo para vendedoras.
- Capturas: `glamy-bi-matriz.png`, `glamy-bi-metas.png`, `glamy-bi.png`, `glamy-bi-celular.png`.
