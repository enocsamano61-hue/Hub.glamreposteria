# 🧁 Glamy: cupcake, sin tutorial, sin límites, Uso y Tickets — 19 oct 2026

Segunda vuelta de Glamy, el mismo día. Lo que pidió Enoc:

- un botón más bonito;
- quitar el tutorial;
- quitar el límite de preguntas y solo medir el uso;
- que los "pedidos" se llamen **tickets**.

Antes: [`2026-10-19-glamy.md`](2026-10-19-glamy.md). Lo que dice ese documento sigue valiendo, salvo lo que se cambia aquí.

## Qué cambió

### 1. El botón es un cupcake (opción B de la maqueta)

- **Dónde:** abajo a la derecha, donde estaba el "?".
- **Cómo es:** un cupcake fucsia con carita y destellos, dibujado en SVG dentro de la página. Abajo lleva la etiqueta "Glamy".
- **El mismo cupcake** sale en el encabezado del chat.
- **Globito "¿Te ayudo?":**
  - Sale una vez al día por persona, por 9 segundos.
  - Se recuerda en el `localStorage` del navegador; si no se puede guardar, no pasa nada.
  - Al tocarlo abre a Glamy.
- **En Recepción:** el botón, el globito y el panel se ocultan.

### 2. Se quitó el tutorial completo

- **Lo que se quitó:**
  - el botón "?" y su panel de preguntas frecuentes;
  - los tips de la primera vez, con el fondo oscuro y "Entendido / Saltar tutorial";
  - la tarjeta "Tus primeros pasos" en Inicio;
  - la tarjeta "Avance del tutorial" en Actividad del equipo;
  - todo su código y sus estilos.
- **En la base no se borró nada:**
  - `tutorial_faq` se sigue usando, porque Glamy lee ahí las preguntas frecuentes.
  - `tutorial_spotlight`, `tutorial_pasos`, `tutorial_vistas_vistas` y `tutorial_pasos_completados` quedan guardadas sin usarse.

### 3. Sin límites, solo medir

- **Qué se quitó** de la función `glamy`:
  - el límite de 40 preguntas al día;
  - el tope de $25 USD al mes.
- **Qué se sigue anotando:** cada pregunta en `glamy_uso`.
- **El límite real** es el saldo cargado en Anthropic ($10 USD al 19 oct 2026), siempre que la **recarga automática** esté apagada en Billing.
- **En el chat:** ya no hay contador de preguntas restantes.

### 4. Sección "Glamy" (solo Enoc)

- **Qué reemplaza:** a "Pedidos al Hub".
- **Quién la ve:** solo quien tiene `usuarios.recibe_pedidos`. No aparece en la matriz de permisos por rol.
- **Pestañas:**
  - **📊 Uso** (lee `glamy_uso`):

    | Bloque | Qué muestra |
    |---|---|
    | Resumen | Preguntas y costo de hoy, de los últimos 7 días y del mes |
    | Proyección | Costo al cierre del mes contra el saldo de $10 (`GLAMY_SALDO_USD` en `hub/index.html`). La barra se pone roja arriba del 70 %. |
    | Gráfica | Preguntas por día, últimos 14 días |
    | Consultas | Lo más consultado del mes (la primera herramienta de cada pregunta, o "cómo se hace" si no usó ninguna) y cuántos errores hubo |
    | Por persona | Todo el equipo, aunque no la haya usado: preguntas, costo, lo que más usa y último uso |

  - **🎫 Tickets:** el mismo tablero de antes, con el texto cambiado a "ticket". La pestaña dice cuántos tickets siguen abiertos.

### 5. "Pedidos" ahora se llaman tickets

- **Pantalla:** sección, tarjetas, detalle ("Lo levantó"), avisos y "Copiar para Claude" ("Ticket del Hub #N").
- **Glamy:**
  - Las herramientas ahora se llaman `mis_tickets`, `buscar_tickets_abiertos` y `crear_ticket`.
  - La marca del botón es `⟦tickets⟧`.
  - El Hub sigue aceptando `⟦pedidos⟧` de pláticas viejas.
- **Base de datos:** la tabla sigue llamándose `hub_pedidos`, y la columna `recibe_pedidos` también. Cambiarles el nombre no aporta nada y arriesga romper cosas.
- **Avisos viejos** del bloc con `vista:'pedidos'` también abren Glamy → Tickets.

## Base de datos

- **`glamy_06_tickets`:** reemplaza la función del trigger `hub_pedidos_avisar()`.
  - Textos nuevos: "🎫 Ticket nuevo #N…" y "🎫 Tu ticket #N «…» pasó a: …".
  - El aviso abre `vista:'glamy'` con la etiqueta "Ver ticket".
  - Solo cambia la función; no toca datos, así que no lleva respaldo.

## Función `glamy` (versión 3)

- Sin límites, con los nombres de tickets.
- El manual dice que Glamy es el cupcake. Ya no menciona el botón "?" y agrega la sección `glamy`.
- **Revisión de tipos:** pasa.
- **Prueba real en modo prueba:**
  - pidió una función que no existe → ofreció levantar un ticket y preguntó lo necesario;
  - preguntó por el "?" → dijo que no existe y presentó al cupcake.
- La llave de prueba se caducó al terminar.

## Pruebas

- **`pruebas/prueba_glamy.js`** (59/59). Además de lo anterior, cubre:
  - el tutorial ya no existe;
  - el cupcake en el botón y en el encabezado;
  - el globito una sola vez al día;
  - sin contador de preguntas;
  - Uso: resumen, proyección, lo más consultado, errores, tabla por persona y 14 barras;
  - contador de tickets abiertos;
  - avisos nuevos y viejos que abren el ticket;
  - el botón `⟦tickets⟧`;
  - en celular.
- **Suite completa:** en verde (17 archivos).
