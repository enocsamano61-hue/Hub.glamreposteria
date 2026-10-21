# 👥 Ciudades / Plazas: todas las alumnas de la ciudad para darles seguimiento — 21 oct 2026

Enoc pidió poder ver **a todas las alumnas históricas de una ciudad**, no solo los cursos, y darles seguimiento para venderles.

## Decisiones de Enoc ("permitido generar")
- **Seguimiento:** la asesora les **marca o les manda WhatsApp** y anota cómo le fue. No se crean leads automáticamente.
- **Quién lo ve:** quien tenga la sección Ciudades. Al entrar a una ciudad se ve todo lo de esa ciudad.
- **Qué entra:** **todo el histórico**, incluidas las que fueron leads y nunca se inscribieron.

## Qué hace
Ciudades / Plazas tiene una tarjeta nueva, **"👥 Todas las alumnas de esta ciudad"**, debajo de los cursos.

### La lista
- Sale cada persona **una sola vez**, aunque haya tomado varios cursos.
- **Quién entra:**
  - quien se inscribió a un curso en esa ciudad;
  - quien fue lead interesada en ella;
  - quien tiene esa ciudad en su ficha.
- **Quién no entra:** la **lista negra**.
- **Cada fila muestra:**
  - nombre (al tocarlo abre su **Historial cliente** completo) y teléfono;
  - último curso, su fecha y cuántos cursos ha tomado ("Fue lead, no se ha inscrito" si nunca se inscribió);
  - marcas: ⭐ VIP, Llegó / No llegó, Liquidó y Lead (si hoy tiene un lead abierto);
  - último contacto: qué pasó, cuándo, quién y la nota.
- **Muestra 100 a la vez**, con "Mostrar más". Monterrey tiene 1,230 personas.

### Filtros (cada uno con su número)
- Todas.
- Sin contactar en 30 días.
- 👍 Les interesa.
- No llegaron a su curso.
- ⭐ VIP.
- Son lead ahora.
- Nunca se inscribieron.

Además se puede **buscar** por nombre o teléfono.

### Acciones por alumna
- **💬 WhatsApp:**
  - usa las plantillas de Mensajes;
  - al enviarlo queda anotado en sus interacciones (como en el resto del Hub) y la fila se actualiza.
- **Registrar contacto:**
  - opciones: 📞 le marqué y contestó, 🔕 no contestó, 💬 le escribí por WhatsApp, 👍 le interesa, 👎 no le interesa, 📝 nota (la nota pide texto);
  - se guarda en `interacciones` (canal, resultado, nota y quién), así que también se ve en Historial cliente;
  - queda en la actividad del equipo.

### Exportar CSV
- Exporta la lista **con el filtro y la búsqueda aplicados**: nombre, teléfono, VIP, último curso, fecha, asistencia, liquidó, cursos, si es lead y el último contacto.
- Queda anotado en la actividad del equipo.

## Base de datos: `plaza_personas_seguimiento`
- **Función nueva:** `plaza_personas(ciudad)`.
  - Junta las tres fuentes sin repetir y calcula el último curso y el último contacto.
  - **Solo lee** y corre con los permisos de quien consulta (`security invoker`). `anon` no tiene acceso.
  - Monterrey (1,230 personas) responde en ~0.1 s.
- **Sin tablas nuevas ni cambios de datos:** el seguimiento usa `interacciones`, que ya existía. Su columna `resultado` (texto libre) guarda la clave de lo que pasó.
- **Páginas:** el Hub pide la lista de 1,000 en 1,000 (la base no regresa más por consulta).

## Pruebas
- **`pruebas/prueba_plaza_alumnas.js` (28/28):**
  - la lista por páginas, "Mostrar más", el escape (XSS), lead sin inscripción, último contacto, VIP y cursos;
  - los 7 filtros con sus números y la búsqueda por nombre y teléfono;
  - registrar contacto (la nota vacía no se guarda, se guarda en `interacciones` y en la actividad);
  - WhatsApp, ir a su historial, exportar CSV y celular sin scroll de lado.
- **El arnés** (`pruebas/arnes.js`) ahora acepta `.range()` en las llamadas a funciones, como supabase-js.
- **Suite completa:** en verde (22 archivos).
- **Capturas:** `plaza-alumnas.png` y `plaza-alumnas-celular.png`.

## Glamy
El manual explica la lista y cómo registrar contactos. La función `glamy` quedó en la **versión 7**.
