# 📊 Embudo por curso (Cobranza y Calendario) — 21 oct 2026

Para Cinthia: ver, por cada curso de la gira, en qué punto está cada alumna, darles seguimiento sin salir de ahí y sacar reportes para WhatsApp. Nació del desfase del Calendario (Martínez de la Torre mostraba 14 inscritas, pero había más alumnas en camino).

## Decisiones de Enoc ("permitido generar")
- **Dónde:** en Cobranza, en una pestaña nueva, y también en la hoja del día del Calendario, para ver el detalle mientras la gira se está dando.
- **Qué cursos:** solo los de la **gira en curso**: los cursos del curso activo, de hoy en adelante.
- **Inscritas:** separadas en **Liquidadas** y **Con anticipo**.
- **Reporte:** con opciones, para que Cinthia saque lo que necesite.

## Los grupos (cada alumna en uno solo)
| Grupo | Regla |
|---|---|
| Liquidadas | Inscrita en ese curso y liquidada |
| Con anticipo | Inscrita en ese curso que todavía debe |
| Sin confirmar | Lead en "Pago por confirmar" |
| Promesa vigente | Lead con fecha de anticipo de hoy en adelante |
| Promesa vencida | Lead con fecha de anticipo ya pasada |
| Sin respuesta | Lead abierto sin fecha de anticipo |
| No van (aparte) | Lead en "No va a ir al curso"; no cuenta en el total |

Reglas para los leads:
- Un lead **ya inscrito** en ese curso cuenta solo como inscrita.
- Un lead **sin curso ligado** cuenta en el **próximo curso de su ciudad** y se marca "Sin curso ligado".
- Los demás estatus finales ("Pagó el curso", "No llegó", "Perdió anticipo") no cuentan como lead.

## Qué hace

### Cobranza → "📊 Embudo por curso"
- **Pestañas:** "💳 Por cobrar" es la pantalla de antes, sin cambios; "📊 Embudo por curso" es la nueva.
- **Una tarjeta por curso,** en orden de fecha:
  - barra de colores;
  - chips con el número de cada grupo;
  - "en N días" y el total (sin las que no van).
- **Al tocar un grupo, su lista.** Cada alumna trae:
  - teléfono y vendedora;
  - según el grupo: lo pagado y lo que debe, lo reportado y hace cuánto, la fecha prometida o cuántos días lleva vencida;
  - su último comentario;
  - 💬 WhatsApp (queda en su lead) y **Abrir** (su lead o la ficha de la inscrita).

  Al cerrar el lead o la ficha, el embudo se vuelve a consultar.
- **Alertas:**
  - anticipos sin confirmar con más de 1 día;
  - promesas que vencen hoy;
  - leads sin curso ligado.
- **Filtro por vendedora** (incluye "Sin vendedora") y botón **↻ Actualizar**.
- **Copiar reporte** para WhatsApp:
  - De qué: un curso (se elige) o toda la gira.
  - Para quién: todas juntas, o una sección por vendedora.
  - Qué incluye: números por grupo, nombres de las pendientes (sin confirmar, vencidas, promesas, sin respuesta), teléfonos y últimos comentarios.
  - Se ve el texto antes de copiarlo, y queda en la actividad del equipo.

### Calendario → hoja del día
- En los cursos de hoy en adelante, debajo de las filas de siempre, sale el **embudo del curso**: la barra, los chips y la lista de cada grupo.
- También dice cuántas están **"en camino"** (todavía no inscritas).

## Base de datos: `embudo_cursos`
- **Función nueva:** `embudo_cursos(curso, desde, evento)`. Regresa una fila por alumna, con su grupo, curso, vendedora, montos, promesa y comentario.
- **Solo lee** y corre con los permisos de quien consulta; `anon` no tiene acceso.
- **Sin tablas nuevas ni cambios de datos.**
- **Prueba contra la base real** (21 oct):
  - Martínez de la Torre da 14 con anticipo, 3 sin confirmar, 4 promesas, 2 vencidas, 7 sin respuesta y 2 que no van; cuadra con el análisis a mano.
  - Toda la gira son 483 filas, sin alumnas repetidas, en ~0.15 s.

## Pruebas
- **`pruebas/prueba_embudo.js` (29/29):**
  - pestañas, lo que se le pide a la base, tarjetas en orden, grupos y total sin "no van", barra;
  - alertas y las listas de cada grupo (promesa, vencida con días, sin curso ligado, inscritas con lo que deben);
  - XSS, WhatsApp, Abrir y filtro por vendedora;
  - reporte: un curso, toda la gira, por vendedora, con y sin teléfonos o nombres, copiar y actividad;
  - la hoja del Calendario con "en camino" y la lista de un grupo;
  - celular sin scroll de lado.
- **Suite completa:** en verde (23 archivos).
- **Capturas:** `embudo-cobranza.png`, `embudo-calendario.png` y `embudo-celular.png`.

## Glamy
El manual explica la pestaña del embudo y el embudo en la hoja del día del Calendario. La función `glamy` quedó en la **versión 9**.
