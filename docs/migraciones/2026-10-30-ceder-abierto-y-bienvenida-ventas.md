# 2026-10-30 · Ceder su lugar abierto para todos (con aviso a Cobranza) y bienvenida de Ventas

Permitido por Enoc el 30 oct 2026 ("permitido generar, todas": fases A a E del road map).

## A. Ceder su lugar abierto para todos
- Base (migración `ceder_lugar_abierto_con_aviso_a_cobranza`): `ceder_lugar` ya no pide ser administrador o Cobranza.
  Respaldo de la función en `respaldo.funciones_20261027`. Se conservan las protecciones: solo antes del curso, si no
  ha llegado, sin diploma ni anticipo perdido, motivo obligatorio, rastro en `inscripcion_traspasos` y en el historial
  de las dos personas con quién lo hizo.
- Aviso: si lo hace alguien que no es de Cobranza, a cada usuario activo de Cobranza le llega una nota al bloc
  ("Cedió su lugar: X → Y (ciudad)", con quién, lo que pagó y el motivo, y botón "Abrir ficha").
- Hub: `puedeCederLugar()` abierto a todo el equipo. "Cambiar de curso" sigue como estaba.
- Probado en la base con retroceso: Josefina (Ventas) cede un lugar → se hace y llega 1 aviso a Cobranza.
- `prueba_ceder_lugar.js` (23): Ventas ahora sí ve el botón.

## B. Bienvenida de Ventas
- `hub_novedades` (tipo bienvenida, rol Ventas) `publicada = true` (migración `publicar_bienvenida_ventas`). La ve
  quien tenga el rol Ventas y su bienvenida pendiente (hoy, Josefina).

## C. Cobranza → Completar datos (solo Hub)
- Pestaña nueva: una lista de lo que falta, con las reglas del vigilante: **inscritas sin fecha de pago** (no han pagado nada;
  salen de `itemsCobranza`), **inscritas sin vendedora** (cursos que vienen, menos "No va" y "Perdió anticipo") y **leads sin
  curso** (abiertos). Se llena en el renglón (fecha desde hoy, vendedora, curso con los de su ciudad primero), se guarda al
  elegir, el renglón sale y queda en la actividad (`fecha_cobro_movida`, `venta_asignada`, `lead_actualizado`). "Abrir" lleva
  a la ficha. Después se vuelve a leer Cobranza para que el Calendario y Por cobrar se pongan al día.

## D. "Te toca cobrar hoy" (ticket #4 de Jared)
- En el Inicio de quien es vendedora (`es_vendedor`, y no recibe los tickets): lo suyo de hoy (anticipos prometidos de sus
  leads y fecha de pago de sus inscritas) con total, WhatsApp y Abrir, y "Se te pasaron" (vencidos, con 5 a la vista).
  Sale de la misma lista de Cobranza (`cargarCobranza` / `itemsCobranza`) filtrada a ella: los números cuadran con Cobranza
  y el Calendario. Aviso corto al entrar, una vez al día por persona.
- Las inscritas sin vendedora no salen en el panel de nadie: por eso la fase C ("Completar datos") va antes.

## E. Por cobrar más simple
- De 9 grupos a 6: **Por confirmar, Vencidos, Hoy y esta semana, Sin fecha** y, cerrados, **Más adelante** y **Curso ya pasó · debe**.
  "Sin fecha" junta a los leads sin fecha de anticipo y a las inscritas sin pago ni fecha; "Más adelante" junta lo de después de
  7 días y lo que se cobra el día del curso. Se quitaron los filtros Leads/Inscritas y de vendedora; queda el buscador y el día.

## ¿Qué pasa si…?
- Una vendedora cede un lugar: se hace y a Cobranza le llega el aviso; Cobranza o un administrador lo hacen igual, sin aviso.
- Completan datos de una inscrita: aparece en el Calendario (su día) y, con vendedora, en el panel de esa vendedora.
- Una vendedora no tiene nada hoy: el panel dice "Hoy no te toca cobrar a nadie".
- Lo que se cobra "el día del curso" sin fecha de pago y con anticipo: va a "Más adelante" (antes tenía su grupo verde).

## Pruebas
- Nuevas: `prueba_cobranza_completar.js` (13), `prueba_toca_cobrar.js` (13). Ajustadas: `prueba_ceder_lugar.js`,
  `prueba_cobranza_grupos.js`, `prueba_fecha_pago_inscrita.js`. Capturas `cobranza-completar*.png`, `toca-cobrar*.png`.

- **Aviso publicado el 30 oct** (Enoc: "publica el aviso"), migración `publicar_aviso_2026_10_30`. Ticket #4 de Jared cerrado (`cerrar_ticket_4_toca_cobrar`).
