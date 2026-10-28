# 2026-10-28 · Que no vuelva a pasar: vigilante diario, reporte del día, reglas e historias

Permitido por Enoc el 28 oct 2026 ("permitido generar", las cuatro partes de un jalón).

## Por qué
Casi todas las fallas de octubre fueron la misma: la misma información en dos lugares que se desincronizan
(Embudo vs Cobranza, Glamy sin los datos del cambio de fecha, inscritas sin lead, dos cajas de comentarios,
la lista del cambio de fecha como foto del día del cambio). Las pruebas revisaban botones con datos de ejemplo,
no cómo quedan los datos reales cuando las alumnas se mueven; por eso los errores los encontraba el equipo.

Decisiones de Enoc:
- Las reglas rojas solo le avisan a él, en su Inicio como reporte diario (no al bloc).
- Las amarillas también, diario, en el mismo reporte.
- Sin alertas del negocio en su Inicio ("eso no es necesario para mí"): solo lo del Hub.
- Las reglas, como se propusieron.

## 1. Vigilante diario (migraciones `vigilante_de_datos`, `vigilante_diario_cron`)
- `vigilante_calcular()`: corre todas las reglas y regresa cuántos casos rompe cada una y hasta 50 ejemplos
  (no guarda nada). `vigilante_regla(...)` arma cada regla. Solo el dueño de la base la puede llamar.
- `vigilante_revisar()`: la corre y guarda el resultado del día en `vigilante_resultados` (una fila por regla por
  día; candado contra borrado; RLS: solo la ve quien recibe los tickets). La puede correr Enoc desde su Inicio.
- Cron `vigilante-diario`: `41 11 * * *` (5:41 de la mañana en México).
- Reglas **rojas** (errores del Hub; deben estar en 0): inscrita fuera de la lista de su cambio de fecha;
  inscrita sin lead; lead "Inscrita" sin su inscripción en ese curso (salvo que cedió su lugar); inscrita dos veces
  en el mismo curso; liquidada que debe o debe $0 sin estar liquidada; el Embudo no cuenta igual que la base
  (`embudo_cursos` por curso); Glamy no cuenta igual que la base o la lista (llama `glamy_curso` como Enoc para
  cada curso que viene).
- Reglas **amarillas** (datos que limpia el equipo; ya salen en la Bandeja): inscritas sin vendedora (Cobranza),
  leads abiertos sin curso (vendedoras), lo pagado no cuadra con los pagos capturados (Cobranza), pago capturado
  dos veces (Cobranza), "Pago por confirmar" sin datos (vendedoras), lead abierto de alguien ya inscrita
  (vendedoras), mismo teléfono en dos personas (administración; últimos 10 dígitos, así 52 + número cuenta igual).
- Primer resultado (28 oct): rojas en 0; amarillas 95 sin vendedora, 179 leads sin curso, 23 pagos que no
  cuadran, 1 pago doble, 6 por confirmar sin datos, 0 leads de inscrita, 38 teléfonos repetidos.
- Una corrida tarda ~2 s.

## 2. Arreglo que encontró la regla 3
- Al **cambiar a alguien de curso**, su lead "Inscrita" se quedaba en el curso anterior. Trigger nuevo
  `lead_sigue_a_su_inscripcion` (inscripciones, al cambiar `evento_id`): su lead pasa al curso nuevo (y su ciudad).
  Respaldo `respaldo.leads_20261028`. Se arregló el caso que había (Orizaba → Tierra Blanca).
- Quien **cedió su lugar** conserva su lead (queda el rastro "Cedió su lugar"); la regla no la cuenta.

## 3. Reporte del día (Inicio de quien recibe los tickets)
- `hub/index.html`: si el usuario recibe los tickets (Enoc), su Inicio ya no trae los KPI del negocio, "Tus
  pendientes" (avance de la gira) ni "Leads más recientes": trae **Reporte del día** con, solo si hay algo:
  errores del Hub (rojas), datos por limpiar (amarillas, con "+N / −N desde ayer" y quién los limpia), lo que
  reporta el equipo (tickets nuevos y "No me sirvió" de Glamy de ayer y hoy), veces que Glamy no pudo contestar
  ayer y quién falta de leer la actualización publicada. Si no hay nada: "Todo en orden". Si el vigilante no
  corrió hoy, lo dice primero. "Ver casos" abre la lista con botón a la ficha o al lead; "Revisar ahora" vuelve a
  correr el vigilante (actividad `vigilante_revisado`).
- Para todos: se quitó "Datos en vivo desde Supabase — todavía sin migrar el histórico…" (ya no era cierto).

## 4. Reglas del proyecto
- `AGENTS.md` y `docs/FLUJO-DE-TRABAJO.md` (sección 3.9): "nada de fotos", "¿qué pasa si…?" antes del permiso,
  historias y vigilante antes de publicar, y agregar una regla al vigilante cuando aparezca un tipo de falla nuevo.
- `docs/plantilla-fase.md`: plantilla del documento de cada fase con las 10 preguntas.

## 5. Historias completas (`pruebas/historias/historias.sql`)
- Seis recorridos contra la base real que se deshacen al final: lead → Registrar pago → Confirmar pago; "No se
  encontró"; cambio de curso (a uno con cambio de fecha y luego a otro, después de "Aceptó"); ceder su lugar; lead
  capturado después del cambio de fecha → Aceptó → paga → regalo; reembolso → Cobranza cierra.
- Revisan el Embudo, la lista del cambio de fecha y el lead en cada paso, y las reglas rojas del vigilante al final
  de cada historia. Resultado de hoy: `HISTORIAS fallas=0 bien=25`.

## Glamy v24
- Manual: el Reporte del día de Enoc y que, al cambiar de curso, su lead y su renglón del cambio de fecha se van
  con ella. Examen 31/31 (caso nuevo: qué pasa con el lead al cambiar de curso).

## Pruebas
- Nueva `pruebas/prueba_reporte_dia.js` (21). `correr_todas.js`: 43 archivos en verde.
  Capturas `reporte-dia.png`, `-casos.png`, `-todo-en-orden.png`, `-celular.png`.
