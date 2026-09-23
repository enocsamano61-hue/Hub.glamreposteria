# Vista "📅 Cobranza" — 23 sep 2026

Migración `cobranza_01_fecha_proximo_pago_y_seccion` + cambios en `hub/index.html`.

## Para qué

Pidieron que Cinthia pudiera ver **por fecha de vencimiento** a quién cobrarle. También que,
cuando un vendedor capture un lead con su fecha de anticipo, Cobranza le diera seguimiento ese
día.

## Qué muestra

Dos tipos de personas, acomodadas contra el **día elegido** (hoy por defecto):

- **Leads**, por su **fecha de anticipo** (`leads.fecha_compromiso_pago`). Quedan fuera los
  cerrados (no va / pagó).
- **Inscritas que deben** (no liquidadas, con restante > 0, que sí van), de cursos de la gira
  activa, incluyendo los de las últimas 2 semanas. Se acomodan por su **próximo pago**
  (`inscripciones.fecha_proximo_pago`, nueva). Si está vacío, se usa **el día del curso** como
  límite y se marca "(día del curso)".

| Grupo | Quién |
|---|---|
| 🟣 Por confirmar | Leads en "Pago por confirmar" (los que reportaron los vendedores con 💜). Van primero. |
| 🔴 Vencidos | Su fecha ya pasó (dice hace cuántos días). |
| 🟠 Hoy / El día elegido | Su fecha es ese día. |
| 🟡 Esta semana | Los 7 días siguientes. |
| ⚪ Más adelante | Después. |
| ⚫ Sin fecha | Leads sin fecha de anticipo. |

## Cómo se usa

- **Selector de día**: ‹ › / calendario / "Hoy". Todo se reacomoda contra ese día.
- **Atajos**: un botón por grupo con cuántas personas y cuánto dinero. Al tocarlo, abre ese
  grupo.
- **Filtros**: Todos / Leads / Inscritas, por vendedor (incluye "Sin vendedor"), y búsqueda por
  nombre o teléfono.
- **En cada renglón**:
  - 💬 abre WhatsApp;
  - 📅 mueve la fecha (en un lead queda en su historial; todo queda en Actividad del equipo);
  - tocar el renglón abre la ficha. Desde un 🟣 ahí mismo se confirma o se marca "No se
    encontró".
- Al cerrar las fichas, la vista se vuelve a consultar. También se actualiza en vivo como el
  tablero cuando otra persona cambia algo.
- La **ficha de inscripción** tiene un campo nuevo, "Próximo pago", mientras debe.

## Permisos

Sección nueva `cobranza` en `permisos_rol` para **Cobranza, Dueña, Gerente y Sistemas**. Los
admins la ven siempre. Se puede dar o quitar a otros roles en "Usuarios y permisos", como las
demás secciones.

Pruebas: `prueba_cobranza` 43/43. Regresión: pagos 58, ciudades 61, vendedor 23, ui 50, sync 29,
inscribir 76.
