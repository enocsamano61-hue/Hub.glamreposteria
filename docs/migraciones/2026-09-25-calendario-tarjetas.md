# Calendario: tarjetas por curso y hoja del día — 25 sep 2026

Fase 5 del rediseño (propuesta A). Solo cambia `hub/index.html`; no hay migración.

## Qué cambia

**Mes:** cada día con curso es una **tarjeta** en vez de tres números chiquitos:

- ciudad, número de alumnas;
- avance: **"18/30 llegaron"** si ya hubo recepción (o es hoy), si no **"9/22 liquidadas"**, con su barra;
- lo cobrado (anticipos y pagos del curso);
- **estado con ícono y texto** (no solo color):

| Estado | Cuándo |
|---|---|
| ● Recepción hoy / ● Mañana / ● En N días | Curso de hoy o de los próximos 7 días |
| ✓ Todo en orden | Recepción cerrada y nadie que llegó quedó debiendo |
| ⚠ Quedan $X | Recepción cerrada, pero alguien que llegó sigue debiendo |
| ⚠ Falta cerrar recepción | Se marcaron llegadas pero no se cerró |
| ✔ Pasó | Ya pasó y nunca se usó Recepción (los días anteriores a esta función no se marcan como pendientes) |

"No va al curso" y "Perdió anticipo" no cuentan como alumnas del curso, igual que en Recepción.
Arriba del mes: cursos del mes, alumnas, liquidadas y **por cobrar**. En celular la tarjeta
muestra solo ciudad, barra e ícono de estado.

**Hoja del día (centro de operaciones):** curso, ciudad, alumnas y sede; estado; **🎟️ Entrar a
recepción**; cuatro cuadros (llegaron / faltan, o liquidadas / deben si aún no es el día; cobrado;
pendiente) y barra. Filas que abren la lista de siempre: ✓ Liquidadas, $ Con anticipo, ! Sin pago
y ○ **No llegaron**, que lleva a esa sección **ya filtrada por la ciudad del curso**. Steward y
ayudantes siguen abajo.

Se quitó `clasificarCalendario` (verde/ámbar/rojo), que ya no se usa.

## Pruebas

- `prueba_calendario` 20/20: los cinco estados, barra, hoja de hoy y de un curso futuro, la fila
  que abre la lista, el salto a No llegaron con la ciudad elegida, teclado y celular. Encontró un
  error antes de publicar (el filtro por ciudad quedó en la función de Cobranza) y se corrigió.
- Regresión: ficha 52/52, precios 28/28, recepción 65/65, no llegaron 38/38, humo 18/18.
- API real: las consultas de eventos (con `recepcion_cerrada_en`) e inscripciones (con asistencia
  y saldo) responden 200.
