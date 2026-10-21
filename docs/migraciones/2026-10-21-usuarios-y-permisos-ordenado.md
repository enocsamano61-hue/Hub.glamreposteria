# 👤 Usuarios y permisos, ordenado en dos pestañas — 21 oct 2026

Enoc veía la sección "todo por todos lados y confusa":
- tres tablas apiladas;
- una tabla de 17 columnas que no cabía en la pantalla (ni en celular);
- los roles de administradores con casillas vacías, aunque ven todo;
- y no se podía cambiar el rol de nadie desde el Hub.

## Decisiones de Enoc ("permitido generar")
1. Dividirla en dos pestañas: **Personas** y **Roles**.
2. Poder cambiar el **rol**, **vendedora** y **recibe tickets** desde aquí.
3. Poder **crear un rol nuevo**.
4. **Dar de alta usuarios nuevos** (correo y contraseña) queda para después.

## Qué hace

### 👥 Personas
- **Resumen arriba:** cuántas personas, cuántos administradores y cuántas por rol.
- **Buscador** por nombre, correo o rol.
- **Una fila por persona:** nombre, correo, su rol y etiquetas (Admin · Vendedora · Recibe tickets · Ve actividad).
- **"Editar" abre su panel:**
  - **Rol:** lista con todos los roles; al cambiarlo, cambia lo que ve.
  - **Administrador:** pide confirmación con la ventana del Hub. Nadie se lo puede quitar a sí mismo.
  - **Es vendedora:** sale en "¿Quién vendió?" y en los filtros. Se actualiza al momento en todo el Hub.
  - **Recibe tickets de Glamy.**
  - **Ve actividad del equipo:** no se toca si ya es administrador.
  - **"Lo que ve":** las secciones y acciones que le tocan por su rol, o "Todo el Hub" si es administrador.
- **Cada cambio queda en la actividad del equipo** (`usuario_cambiado`), por ejemplo "rol: Cobranza → Ventas".

### 🎭 Roles
- **A la izquierda, los roles**, con cuántas personas los tienen. Los roles donde todos son administradores dicen "ven todo (admins)".
- **Crear rol:** se escribe el nombre y nace solo con Inicio. No deja duplicar nombres (sin importar mayúsculas ni acentos).
- **A la derecha, el rol elegido:**
  - quiénes lo tienen;
  - sus secciones con interruptores, agrupadas por área: **Siempre** (Inicio, fijo), **Ventas y cobranza**, **Gira**, **Academia**, **Herramientas**. Cada una con su descripción.
  - sus **Acciones especiales** (Confirmar pagos, Ver todo en Academia Glam, Cobrar en Academia), con su explicación.
- **Rol sin configurar:** antes veía las secciones de fábrica, y al tocarlo por primera vez se quedaba solo con la marcada. Ahora se avisa, y al primer cambio **se guardan todas las de fábrica** y solo se quita o agrega la que se tocó.
- **Cada cambio queda en la actividad** (`permiso_cambiado`, `rol_creado`).
- **En celular** los roles salen como botones arriba y el panel debajo, sin scroll de lado.

## Base de datos
**Sin cambios.** La base ya solo deja a los administradores editar `usuarios`, `permisos_rol` y `permisos_accion` (RLS), y la pantalla usa esas mismas tablas.

## Pruebas
- **`pruebas/prueba_usuarios.js` (30/30):**
  - **Personas:** lista, resumen, etiquetas, escape (XSS) y búsqueda.
  - **Editar:** "lo que ve", cambio de rol (y lo que ve con el rol nuevo), vendedora (se refleja en el Hub), admin con confirmación (cancelar y confirmar), "ve actividad" bloqueado si es admin, actividad, y que nadie se quite su propio admin.
  - **Roles:** lista con su gente y "ven todo", áreas y acciones, marcar y desmarcar secciones, acciones, actividad.
  - **Rol sin configurar:** guarda las de fábrica.
  - **Rol nuevo:** se crea, no se duplica y ya se puede asignar.
  - **Celular.**
- **Suite completa:** en verde (24 archivos).
- **Capturas:** `usuarios-personas.png`, `usuarios-roles.png`, `usuarios-roles-celular.png` y `usuarios-personas-celular.png`.
