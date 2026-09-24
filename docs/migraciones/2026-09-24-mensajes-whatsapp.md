# Mensajes predeterminados y envío por WhatsApp — 24 sep 2026

Migración `mensajes_01_predeterminados_y_fotos`, más cambios en `hub/index.html`.

## Qué pidieron

Que un vendedor pueda:

- guardar mensajes predeterminados, con foto;
- desde el Calendario, tocar "enviar WhatsApp", elegir el mensaje y que se abra WhatsApp listo
  para mandar, sin copiar y pegar.

## Supabase

- **Tabla `mensajes_predeterminados`**: usuario_id, titulo, texto, foto_url/foto_path y
  compartido.
  - RLS: cada quien ve los suyos y los compartidos; crea a su nombre; edita y borra los suyos
    (los admins, todos).
  - Dirección decidió que **cualquier vendedor** puede compartir un mensaje con el equipo.
- **Bucket `mensajes`**:
  - público, porque las fotos se mandan por WhatsApp;
  - 5 MB máximo y sólo JPG, PNG o WEBP;
  - cualquier usuario autenticado sube; cada quien borra sus fotos.
- Sección `mensajes` en `permisos_rol` para todos los roles.

## Hub

**Sección "Mensajes"** (Míos / Del equipo):

- Se crean con nombre, texto y foto opcional.
- Se pueden compartir con el equipo.
- El texto acepta datos que se llenan solos:

  | Dato | Qué pone |
  |---|---|
  | `{nombre}` | primer nombre, con mayúscula inicial |
  | `{nombre_completo}` | nombre completo |
  | `{ciudad}` | ciudad del curso |
  | `{fecha}` | "domingo 27 de septiembre" |
  | `{sede}` | lugar del curso |
  | `{debe}` | lo que le falta pagar |
  | `{vendedor}` | quien manda el mensaje |

  Se insertan tocándolos, justo donde está el cursor.

**Botón 💬** en:

- el Calendario (lista de alumnas y de leads de cada curso);
- la ficha del lead;
- la ficha de inscripción;
- Cobranza.

Al tocarlo:

1. Aparecen los mensajes (primero los tuyos, luego los del equipo, y "Escribir uno nuevo").
2. Se ve el texto ya lleno con los datos de la alumna y se puede ajustar.
3. **"Abrir WhatsApp con el mensaje"** abre `wa.me` en el chat de su número con el texto puesto.
4. Queda en su historial de contacto (canal WhatsApp) y en Actividad del equipo.

**Límite de WhatsApp con fotos**: un enlace directo a un número sólo puede llevar texto.

- En el celular, "📷 Enviar foto + texto" usa el menú de compartir. WhatsApp pide elegir el
  chat, y el texto también queda copiado por si WhatsApp no lo pega.
- En computadora se avisa que la foto va desde el celular y se ofrece descargarla.

Números:

- 10 dígitos → se agrega el 52;
- los que ya traen lada de país (p.ej. 1 + 10 de EE. UU.) se usan tal cual.

Pruebas: `prueba_mensajes` 28/28. Regresión: 372 pruebas en 9 suites, todas en verde.
