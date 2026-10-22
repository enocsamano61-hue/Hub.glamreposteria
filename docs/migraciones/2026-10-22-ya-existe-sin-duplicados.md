# 2026-10-22 · "¿Ya existe?": que no se dupliquen leads

Después del ticket #1. Permitido por Enoc el 22 oct 2026, con estas decisiones:
1. Si ya está inscrita en un curso que no ha pasado: **dejar decidir, pero avisar** que ya existe.
2. El buscador del tablero busca en todas las ciudades para todas (respetando las secciones del rol).
3. La limpieza de los 38 teléfonos repetidos queda para después.

## Por qué se duplicaban (revisado en código y base)
- Al crear un lead solo se revisaba si la persona ya tenía **lead**, no si ya estaba **inscrita**
  (así pasó con las 2 de Minatitlán). Desde el 20 sep: 12 leads nuevos de personas ya inscritas.
- La revisión llegaba hasta el final, al darle "Crear".
- El buscador del tablero solo busca en lo cargado (leads de la gira activa): no encuentra
  inscritas ni leads de otras ciudades.
- El teléfono se comparaba exacto, solo el principal (con 52 o espacios no coincidía).

## Cambios (`hub/index.html`)
- Se reutiliza la función de la base `glamy_buscar_persona` (la misma de Glamy; `security invoker`,
  respeta las secciones del rol): últimos 10 dígitos del teléfono principal **o alterno**, o nombre
  sin acentos. Contra la base real: 0.1 s por teléfono, 0.5 s por nombre. **Sin migración.**
- **+ Nuevo lead:** el teléfono va primero. Al tener 10 dígitos aparece "Este número ya está en el
  Hub" con lo que se sabe (inscrita / fue alumna, ciudad, fecha, lo que debe; leads con vendedora y
  estatus) y botones **Abrir ficha** / **Abrir lead**.
- **Al guardar:** si está inscrita en un curso de hoy en adelante, pregunta "Ya está inscrita…
  ¿Crear el lead de todos modos?". El bloqueo que ya existía ("Este número ya es lead") sigue igual.
- **Misma persona:** si el número coincide con el teléfono principal guardado en otro formato (con 52,
  espacios), se usa esa persona en lugar de crear otra. Si solo coincide con un teléfono **alterno**
  (puede ser un familiar), no se junta: se muestra y decide quien vende.
- **Buscador del tablero:** compara teléfonos sin espacios, guiones ni 52 y nombres sin acentos; con
  7+ dígitos o 4+ letras muestra abajo **"Fuera del tablero también existe"** (quien no está en el
  tablero), con botones para abrir su lead (aunque sea de otra ciudad) o su ficha.

## Glamy y docs
- `manual.ts` (paso 1 del proceso de venta y el tablero) y `docs/proceso-de-venta.md`.

## Pruebas
- Nueva `pruebas/prueba_ya_existe.js` (19/19). Suite: 27 archivos en verde.
- Capturas: `ya-existe-nuevo-lead.png`, `ya-existe-aviso.png`, `ya-existe-tablero.png` (1200),
  `ya-existe-tablero-celular.png`, `ya-existe-nuevo-lead-celular.png` (390).

## Pendiente (decisión de Enoc: después)
- 38 teléfonos con 2+ personas, 98 principal = alterno de otra, 642 teléfonos sin 10 dígitos.
