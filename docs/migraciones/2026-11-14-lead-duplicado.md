# 2026-11-14 · Lead duplicado

Pedido del equipo por WhatsApp (14 nov): el mismo alumno quedó capturado por dos vendedoras en el mismo curso
(Acapulco, Pasteles) y salía dos veces; "¿podemos quitar el que dice vendedor …?". Enoc: "deja lo ajustamos para que lo
puedan editar y quitar manual". "Permitido generar" el 14 nov, con estas decisiones de Enoc:
1. Cualquiera del equipo puede marcar un duplicado, aunque las dos fichas sean de vendedoras distintas.
2. En este caso, se queda el lead que el equipo dijo, pero con los datos de la persona que ya tenía historial (lada correcta).

## Qué pasaba
- No era la misma ficha dos veces: eran **dos personas** en la base, cada una con su lead, porque el teléfono tenía **un
  dígito distinto**. El Hub solo juntaba personas con el teléfono idéntico.
- La única salida era cerrar el sobrante como "No va a ir al curso" (así se hizo el 12 nov con otro caso), que lo cuenta
  como alguien que se bajó. No existía el estatus "Duplicado".
- Al 14 nov había 3 casos así en leads abiertos (los encuentra la regla nueva del vigilante).

## Base (migración `leads_duplicado_01` + parches con respaldo)
Respaldos: `respaldo.leads_20261114`, `estatus_20261114`, `interacciones_20261114`, `personas_20261114`,
`cambio_fecha_avisos_20261114` y `respaldo.funciones_20261114` (las 7 funciones que se parcharon).
- Estatus nuevo **`duplicado`** (id 16, "Duplicado", final). Columnas en `leads`: `duplicado_de` (el lead que quedó),
  `duplicado_en`, `duplicado_por`, `estatus_antes_de_duplicado`.
- **Una sola regla de "se parecen"**: `parecido_nombre`, `parecido_tel` (igual o un dígito distinto, a 10 dígitos; los de
  relleno como 0000000000 no cuentan) y `parecido_persona` → `mismo_nombre`, `mismo_telefono` o `telefono_casi_igual`
  (este último solo con el mismo primer nombre).
- `leads_parecidos(...)`: leads abiertos (o "Inscrita") del mismo curso que se parecen, sin los que alguien marcó como
  personas distintas (`personas_separadas`); con `p_texto`, busca por nombre o teléfono.
- `lead_marcar_duplicado(duplicado, queda, persona, motivo)` (security definer, usuario activo): en una sola transacción
  cierra el duplicado, pasa el que queda a la persona elegida (llena lo que le faltaba: curso, promesa, monto, comentario),
  mueve su historial de contacto y sus comprobantes, pone el otro teléfono como alterno si no tenía (uno con un dígito
  distinto se toma como error de dedo y no se copia), arregla la lista del cambio de fecha (un renglón visible por persona)
  y deja nota en el historial. No deja cerrar el lead de una inscrita ni uno con pago por confirmar, ni juntar cursos
  distintos, ni cambiar de persona a quien ya está inscrita.
- `lead_quitar_duplicado(lead, motivo)`: solo administradores; regresa el estatus que tenía (el historial se queda en el otro).
- Parches (texto reemplazado, verificado): `asegurar_lead_de_persona` y `lead_de_inscripcion` nunca escogen un duplicado;
  `bi_fuente` (leads y cambio de fecha), `cambio_fecha_lista` y `glamy_curso` no cuentan renglones de duplicados;
  `glamy_buscar_persona` los pone al final con `es_duplicado`.
- Vigilante: regla amarilla **`posible_lead_duplicado`** ("Posibles leads duplicados (mismo curso)").

## Hub
- Ficha del lead: botón **"Es un duplicado"**; aviso "Hay otro lead parecido en este curso… Revisar".
- Ventana "¿Es un duplicado?": parecidos del curso + buscador; "Es la misma persona" / "No es la misma"; cuál se queda,
  con qué datos (propone la persona que ya tomó cursos), resumen de lo que pasa y motivo opcional.
- Ficha de un duplicado: "Este lead es un duplicado", "Abrir el que quedó" y, administradores, "Ya no es duplicado".
- "Duplicado" no sale en el selector de estatus; el tablero no carga duplicados.
- "+ Nuevo lead": si en ese curso ya hay alguien parecido (que no sea el mismo número exacto, eso ya lo detenía), avisa
  con "Abrir su lead" o "Es otra persona: crear el lead".
- `registrarActividad`: `lead_duplicado`, `lead_ya_no_duplicado` (y `personas_separadas`). `HUB_VERSION = '2026-11-14-lead-duplicado'`.

## Glamy
- Manual: sección "Lead duplicado" (cómo se marca, quién se queda, qué pasa, "No es la misma", "Ya no es duplicado",
  aviso al dar de alta, `es_duplicado` en buscar_persona). Sin cambios en `index.ts`.

## Nada de fotos
- La marca de duplicado la pone una persona (como "No va"), y la base la mantiene: el duplicado es un estatus final y
  todas las cuentas (Embudo, Cobranza, Inicio, Glamy, Glamy BI, la lista del cambio de fecha) lo dejan fuera con la misma
  condición. Los posibles duplicados no se guardan: se calculan del estado de hoy con la misma función en la ficha, el
  alta y el vigilante.

## ¿Qué pasa si…?
1. **La capturan tarde:** el alta avisa si ya hay alguien parecido en su curso; si igual se crea, la ficha y el vigilante lo ven.
2. **El lead paga y queda inscrita:** la inscrita siempre se queda; su lead no se puede cerrar como duplicado.
3. **Su pago no se encontró:** el lead regresa a su estatus y se puede marcar normal; con un pago por confirmar no se deja cerrar.
4. **Se cambia de curso:** los duplicados se buscan en el mismo curso; dos leads de cursos distintos no son duplicado (la base lo rechaza).
5. **Cede su lugar:** se trabaja sobre el lead que quedó, igual que hoy.
6. **No va / reembolso / perdió anticipo:** son estatus finales; el duplicado no los toca.
7. **Su curso cambia de fecha:** la lista queda con un solo renglón de esa persona (el del lead que queda).
8. **Dos cursos o dos teléfonos:** dos cursos no es duplicado; el otro teléfono queda como alterno.
9. **Su curso ya pasó:** el vigilante solo revisa cursos que vienen o por definir; el botón sigue funcionando.
10. **¿Cuentan igual?** Sí: todos excluyen el estatus final "Duplicado"; la regla de "se parecen" es una sola función.
- **Lo marcan por error:** un administrador lo regresa con "Ya no es duplicado" (con motivo).
- **Eran dos personas distintas:** "No es la misma" las guarda en `personas_separadas` y ya no se sugieren ni las cuenta el vigilante.

## Pruebas
- `prueba_lead_duplicado.js` (31/31), capturas a 1200 y 390 px sin scroll de lado.
- Las funciones se probaron con el caso real dentro de una transacción que se deshizo (marcar, revisar Embudo, vigilante y
  teléfonos, y quitar la marca).
- Historia nueva **H19** en `pruebas/historias/historias.sql`: sus 11 revisiones salen bien. La corrida completa da
  `fallas=13 bien=81` por **4 casos rojos que ya estaban antes de este cambio**: dos inscritas de Mesa de Postres
  (12 nov) en un curso todavía sin precio (`inscrita_curso_sin_precio` y, por lo mismo, `liquidada_no_cuadra`). Se arreglan
  solos cuando se capture el precio de Mesa de Postres en Precios.
