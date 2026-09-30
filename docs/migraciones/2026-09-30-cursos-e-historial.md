# Cursos e Historial cliente — 30 sep 2026

Pidieron optimizar las dos secciones para trabajar con la información histórica (todos, en especial
Academia). Se quedan **separadas** porque son dos formas de trabajar: Cursos = revisar alumnas por
curso y por ciudad; Historial = buscar y rastrear a cualquier persona. Sin exportar a Excel.
Migraciones `historico_01_vistas_y_separadas` y `historico_02_resumen_solo_con_sesion`.

## Supabase (solo se crearon objetos; ningún dato cambió)
- `normalizar_texto(t)`: sin acentos, minúsculas, sin signos.
- **`vista_alumnos`**: una fila por inscripción con persona, teléfonos normalizados (`tel10`, `alt10`),
  curso, ciudad, estado, fecha, pagos, estatus, paquete, vendedor y `pago` (liq / ant / sin / nol /
  perdio). **Es la base para reportes futuros** (p. ej. "alumnas de Torreón que tomaron Postres
  Virales y no han vuelto" se arma con un filtro sobre esta vista).
- `vista_personas_busqueda`, `vista_cursos_explorador`, `vista_curso_ciudades`.
- `resumen_alumnos(curso, ciudad, búsqueda)`: conteos por estado de pago, personas distintas y cobrado,
  con la misma búsqueda que la tabla. Solo usuarios con sesión.
- Todas las vistas con `security_invoker` (respetan RLS: sin sesión no se ve nada).
- Tabla **`personas_separadas`** (par ordenado, sin llaves foráneas): "No son la misma persona".
- Velocidad medida: lista de un curso 80 ms; resumen del curso más grande (17 mil) 0.4 s; búsqueda por
  nombre en 36 mil personas 0.27 s; por teléfono 0.04 s.

## Cursos (una sola pantalla, sin ventanas encima)
- **Cursos**: buscador, filtros Todos / Con fechas próximas / Solo históricos; la gira activa va primero.
  Cada curso: alumnas, ciudades, años y barra de liquidadas.
- **Ciudades** del curso: buscador; alumnas, fechas, % liquidadas, "próximo"; "Todas las ciudades".
- **Alumnas**: buscador (nombre en cualquier orden o teléfono), filtros de pago con conteo (solo los que
  tienen alumnas), resumen (inscripciones, personas distintas, cobrado, % liquidadas), tabla ordenable
  de 50 en 50 con "Ver más", 💬 WhatsApp; tocar una alumna abre su **Historial**.
- Todo se busca, filtra y pagina en el servidor. "(sin curso)" y "sin fecha" se ven tal cual.

## Historial cliente
- Buscador grande: nombre (palabras en cualquier orden), 4+ números del teléfono o correo. Muestra
  **todas** las coincidencias con etiquetas (⭐, N cursos, N registros, ⚠).
- Perfil: teléfonos, correo, cumpleaños; cursos tomados, pagado, debe (cursos próximos), primera → última
  vez; **línea de tiempo** de cursos (toca uno → ficha); últimos contactos; 💬 WhatsApp, ✏️ Datos de
  contacto y **➕ Nuevo lead** (nombre y teléfono ya escritos, para reactivarla).
- **Mismo teléfono** (últimos 10 dígitos, principal o adicional) es el único caso en que se comparan
  nombres; con teléfono distinto nunca se juntan:
  - misma persona si un nombre está dentro del otro, o coinciden primer nombre y un apellido (se
    perdona una letra en palabras de 5+): se ven **juntas** ("🔗 N registros juntos");
  - nombre distinto: aviso "📞 Mismo teléfono que … (posible familiar)" con enlace.
  - "**No son la misma persona**" separa y lo recuerda para todos (`personas_separadas`, Actividad).
  - Solo cambia cómo se muestran: no se une ni borra nada en la base. Hoy: 122 pares con el mismo
    teléfono (≈79 misma persona, 15 posibles familiares, 28 distintas).

Se quitó `abrirModalCursoCiudades` (ya no se usa). `abrirModalAlumnos` se queda (lo usa Plazas).

## Pruebas
- `prueba_cursos_historial` 40/40 (arnés ahora entiende `ilike`, `or`, `range` y `rpc`). Regresión:
  9 archivos en verde. Encontró un error antes de publicar (el botón "No son la misma persona" leía mal
  su atributo) y se corrigió.
- API real: las 8 consultas y la función responden 200; sin sesión la función da 401. Como usuario sin
  admin (transacción que se deshizo): ve las 36,391 inscripciones, el resumen funciona y puede separar.
