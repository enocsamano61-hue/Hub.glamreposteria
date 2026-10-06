# Copiar nombre y teléfono en Cursos e Historial — 6 oct 2026

Lo pidió Academia: en Cursos, al tratar de seleccionar el nombre de una alumna para copiarlo,
la fila abría el Historial. Solo cambia `hub/index.html`. No hay migración ni cambios en Supabase.

## Qué cambia

- **Botón 📋** junto al nombre y al teléfono en:
  - Cursos (tabla de alumnas),
  - Historial cliente (lista de resultados y perfil, en cada teléfono).
  Copia y avisa "✓ Nombre copiado" / "✓ Teléfono copiado" sin abrir nada. Sirve en celular
  y con teclado (Tab + Enter).
- **Clic derecho** sobre una alumna (mismos lugares) abre un menú: Copiar nombre · Copiar
  teléfono · Copiar nombre y teléfono · Ver historial (no sale dentro del perfil) · WhatsApp.
  - En Cursos, WhatsApp usa el mismo envío que el 💬 de la fila (con ciudad, fecha y saldo).
  - Si hay texto seleccionado o se tiene Shift, sale el menú normal del navegador.
  - Se cierra con Escape, clic afuera o al hacer scroll.
- **El teléfono se copia solo con números**; si trae el 52 (o 521) al inicio se quita:
  `+52 871 111 1111` → `8711111111`.
- **Seleccionar texto ya no abre el historial** en Cursos: se puede copiar con Ctrl+C.

Funciones nuevas: `telParaCopiar`, `btnCopiar`, `attrsCopiar`, `copiarTexto`,
`hayTextoSeleccionado`, `cerrarMenuCopiar`. El 📋 es un `<span role="button">` porque cada
resultado del Historial ya es un `<button>` y no se puede anidar otro.

## Pruebas

- `prueba_copiar` 34/34: copiar nombre y teléfono (con +52 y con guiones), que el 📋 no
  navegue, Enter con teclado, opciones del menú en Cursos y en el perfil, nombre y teléfono
  juntos, Escape y clic afuera, WhatsApp desde el menú, texto seleccionado sin navegar, clic
  normal sigue abriendo el historial, celular (menú dentro de la pantalla, sin scroll horizontal).
- Regresión: las 10 suites en verde.
