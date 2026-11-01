# 1 nov 2026 · Comentario al dar de alta (pedido de Jared)

Autorizado por Enoc ("permitido generar, también en Inscribir a un curso").

## Qué pasaba
"+ Nuevo lead" no tenía dónde escribir un comentario: había que crear el lead, abrir su ficha y comentar ahí.

## Qué se hizo (sin cambios en la base)
- **"+ Nuevo lead"**: casilla **"Comentario (opcional)"** al final, antes de "Crear lead".
- **"Inscribir a un curso"** (aviso "ya está en el Hub", Historial cliente, "Otro curso" en su ficha): la misma casilla, al final. Sale también cuando ya tenía un lead abierto y se usa ese. **No** sale en "Registrar pago" de un lead que ya existe (su ficha ya tiene la caja de comentarios).
- Se guarda con la **misma función** que la caja de la ficha (`guardarComentario`): queda en su historial de contactos con la fecha y quién lo escribió, como último comentario de su lead (lo que ven Cobranza y el Embudo) y en la actividad (`comentario_agregado`). En "Inscribir a un curso" se guarda después del "PAGO REPORTADO…", así queda como el último.
- "+ Nuevo lead" ahora pide de regreso el `id` del lead creado (para ligar el comentario).

## ¿Qué pasa si…?
- *…se deja vacío?* Todo igual que antes; no se guarda nada.
- *…la persona ya existía en el Hub?* El comentario va al lead nuevo; su historial de antes no cambia.
- *…ya tiene un lead abierto en "+ Nuevo lead"?* No se crea nada (como antes) y se ofrece abrir el que existe; ahí se comenta.
- *…el lead se crea pero el comentario falla?* Avisa: "El lead se creó, pero el comentario no se guardó… Agrégalo desde su ficha."
- *…escriben mucho texto?* Se guarda completo, igual que en la ficha.

## Pruebas
- `pruebas/prueba_comentario_alta.js` (13): con comentario (historial, último comentario, actividad), sin comentario, Inscribir a un curso (después del pago reportado), con lead abierto, Registrar pago de un lead existente (sin la casilla), celular. Capturas `comentario-alta-*.png`.
- Glamy v33 (manual: alta del lead e Inscribir a un curso) + caso nuevo en `examen_glamy.js`.
- `HUB_VERSION = '2026-11-01-comentario-alta'`. Aviso `2026-11-01-comentario-alta`: **sin publicar**.

- **Publicado el 1 nov** en main (verificado en producción) y **aviso publicado** (Enoc: "sí, adelante"), migración `publicar_aviso_2026_11_01_comentario_alta`. Examen de Glamy: 49/49 en la segunda corrida (la primera, 47/49 por redacción en dos casos que no cambiaron).
