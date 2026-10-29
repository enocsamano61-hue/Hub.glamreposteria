# 2026-10-29 · Academia → Alumnas: el estado del kit de cada alumna

Pedido el 28 oct (captura de Academia → Alumnas con la columna Decisión encerrada): ver ahí mismo, por alumna, el estado
de su kit con los mismos estados del tablero de Kits. Permitido por Enoc el 29 oct ("permitido generar").

En la misma conversación pidieron "agregar que ya se envió el curso de regalo a los que aceptaron el cambio de fecha"
(captura de la ficha del 26 oct, versión vieja con emojis). Eso ya existía desde la Fase 1 en la ficha de la inscrita
("Registrar regalo" y "Ya se envió"); no se cambió nada. Al 28 oct: 63 inscritas aceptaron, 27 con regalo enviado,
36 sin regalo registrado.

## Hub (solo `hub/index.html`; la base no cambia)
- `cargarAlumnasAcademia` también lee `academia_kits` (id, alumna, estado, marca de envío, alta) cada vez que se abre
  la lista: nada se guarda aparte.
- `kitDeAlumna` / `htmlKitAlumna`: etiqueta con el nombre y color de su columna en Kits, con la misma regla del tablero
  (`estadoKit`, `K_ESTADOS`). Si su decisión es "Kit" dice solo el estado; si es otra, "Kit: Entregado". Con dos o más
  kits: el más reciente que no esté cancelado y "+N". Decidió kit sin tarjeta: "Sin tarjeta".
- En su panel ("¿Qué decidió?"): "Su kit: …" y **Ver en Kits**, que abre la pestaña Kits con su tarjeta elegida.

## ¿Qué pasa si…?
- Tiene tarjeta de kit y otra decisión (16 al 29 oct, casi todas graduadas con el kit entregado): sale "Kit: …".
- Tiene dos kits (1 caso): el más reciente no cancelado, "+1".
- Decidió kit y no tiene tarjeta (0 hoy): "Sin tarjeta".
- Tarjetas sin alumna ligada (4): no salen en Alumnas; siguen en Kits como antes.
- Mueven la tarjeta en Kits: al volver a Alumnas se lee el estado de hoy.
- Leads, inscritas, cambio de fecha, Cobranza, Embudo y Glamy BI: no les afecta. Vigilante e historias: sin cambios.

## Glamy v27
- Manual: el estado del kit en Academia → Alumnas y "Ver en Kits". Examen con un caso nuevo.

## Pruebas
- Nueva `pruebas/prueba_academia_kit_estado.js` (13). Capturas `academia-kit-estado.png` y `-celular.png`.
