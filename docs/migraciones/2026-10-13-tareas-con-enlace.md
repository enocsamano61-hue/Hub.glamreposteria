# Tareas con botón "Ir →" y comentario de sistema

**Fecha:** 13 de octubre de 2026
**Alcance:** Supabase (1 migración) + `hub/index.html`

## Por qué

Después de la carga del Excel del 13 oct quedaron casos que sólo una persona puede
resolver (confirmar si llegó, validar una inscripción, decidir un "no llegó", cerrar la
Recepción…). Las tareas del bloc 📝 eran sólo texto: había que buscar a la alumna a mano.

## Qué cambió

| | |
|---|---|
| `notas_usuario.enlace` (jsonb) | Destino del botón: `{ vista, inscripcion?, lead?, evento?, ciudad?, etiqueta? }` |
| `notas_usuario.de_sistema` | La tarea la generó el sistema (carga, auditoría), no una persona |
| `notas_usuario.nota_sistema` | Explicación del sistema; se muestra en su propio recuadro gris "⚙️ COMENTARIO DE SISTEMA" para no confundirla con lo que escribe el equipo |

Migración `tareas_01_enlace_y_comentario_de_sistema`. **Sin llaves foráneas** (evita el
PGRST201 por segunda relación).

En la tarjeta de la tarea:

- Encabezado "⚙️ Sistema" cuando `de_sistema`.
- Botón **"<etiqueta> →"** cuando hay `enlace.vista`: cierra el bloc, cambia a la sección y
  - con `inscripcion` abre la ficha de la alumna;
  - con `lead` abre la ficha del lead;
  - con `evento` abre la Recepción de ese curso;
  - con `vista: 'nollegaron'` y `ciudad` deja filtrada la ciudad.
- Las tareas viejas y las que escribe el equipo se ven igual que antes.

Prueba nueva: `pruebas/prueba_tareas_enlace.js` (14 revisiones). Las 11 suites en verde.

## Tareas cargadas el 13 oct (una por alumna)

| Para | Cuántas | De qué |
|---|---:|---|
| Ines | 29 | 4 urgentes, 4 nombre distinto, 6 pago de más, 1 validar LPMSDLC, 14 "no llegó" por decidir |
| Isabel | 26 | 3 urgentes, 1 nombre distinto, 2 pago de más, 1 validar LPMSDLC, 19 "no llegó" por decidir |
| Jared | 32 | 23 "cerrar la Recepción" (una por ciudad del norte) + 9 casos (los sin vendedor se le asignaron con esa aclaración) |
| Enoc | 5 | pendientes de la guía y seguimiento |

Todas las asigna "Enoc" con `de_sistema = true`. La tarea general previa a Jared quedó
marcada como hecha ("reemplazada por una tarea por ciudad").

## Cómo crear tareas así en el futuro

```sql
insert into notas_usuario (usuario_id, asignado_por, texto, de_sistema, nota_sistema, enlace)
values ('<usuario>', '<quien asigna>', 'Qué hacer, en una línea', true,
        'Por qué y qué se espera', '{"vista":"cobranza","inscripcion":"<id>","etiqueta":"Abrir ficha"}');
```

Vistas válidas: los `id` de `SECCIONES` en `hub/index.html` (`cobranza`, `nollegaron`,
`calendario`, `board`, `cursos`, `historial`, `plaza`…).
