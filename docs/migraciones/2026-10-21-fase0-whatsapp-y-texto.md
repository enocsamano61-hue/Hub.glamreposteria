# 2026-10-21 · Fase 0, primera entrega: WhatsApp en el historial, texto seguro y dos nombres

Origen: reporte de Codex "Reporte integral del frontend" (hallazgos H5 y H6), revisado por Claude
contra el código y la base. Permitido por Enoc el 21 oct 2026, junto con los dos cambios de nombre.

## Qué cambió

### 1. Los WhatsApp del Hub sí quedan en el historial de contacto (H5)
- **Problema comprobado con datos reales:** `interacciones` tenía 834 registros y **cero** de WhatsApp,
  mientras que `actividad_usuario` tenía 9 `whatsapp_enviado` (24 sep – 12 oct). `registrarEnvioWa`
  hacía `sb.from('interacciones').insert(...)` sin `await`; la biblioteca de Supabase solo manda la
  petición cuando alguien espera el resultado, así que nunca salía.
- **Ahora:** `registrarEnvioWa` es `async`, espera la escritura y, si falla, avisa
  "El WhatsApp se abrió, pero no quedó en su historial". Copia `waDatos` antes de esperar.
- Afecta a todos los botones de WhatsApp: Alumnos y Leads, Cobranza, Embudo, Ciudades, Certificados, etc.
- Los WhatsApp anteriores al 21 oct **no** se pueden recuperar (solo existe la línea de la bitácora).
- Verificado contra la base real (transacción revertida): un usuario de Ventas puede insertar
  `canal='whatsapp'` con las políticas actuales.

### 2. Texto del equipo como texto (H6)
Se escapan con `escHtml` los textos libres que se metían al HTML tal cual:
- notas y tareas del bloc (`notas_usuario.texto`), y el color de la tarjeta se limita a `NOTA_COLORES`;
- historial de contacto en la ficha del lead (`interacciones.nota`);
- bitácora de Actividad del equipo (nombre, acción y detalle);
- comentario `notas_migracion` y lista de alumnas por ciudad;
- observaciones del historial de una sede;
- nombre en "Pagos recientes" de Ventas.

No se reescribe ni se borra nada en la base; solo cambia cómo se muestra.
**Pendiente (Codex, Fase 1):** barrido del resto de nombres que se pintan sin escapar (listas de
logística, sedes y algunos tableros). No son texto libre del equipo, pero conviene cerrarlo.

### 3. Nombres
- Estatus id 12 (clave `pagado`): **"Pagó el curso" → "Inscrita (anticipo confirmado)"**. Solo cambia
  la etiqueta; la clave y el id quedan igual, así que nada del código ni de las funciones cambia.
- Ventas → Embudo de conversión: **"Contactados" → "Registradas en la gira"** (y "Liquidados" →
  "Liquidadas"). La barra sumaba liquidadas + con anticipo + sin pago: no eran contactos comerciales.

## Base de datos
Migración `estatus_pagado_inscrita_etiqueta`:
```sql
create table if not exists respaldo.estatus_20261021 as select * from public.estatus;
update public.estatus set etiqueta = 'Inscrita (anticipo confirmado)' where clave = 'pagado' and id = 12;
```
Ninguna función ni vista usaba el texto "Pagó el curso".

## Glamy
`manual.ts`: estatus con su nombre nuevo (y que el anterior es el mismo), "Registradas en la gira",
y que los WhatsApp ya quedan en Historial cliente desde el 21 oct.

## Pruebas
- Nueva `pruebas/prueba_wa_historial_y_texto.js` (18/18). Contra el código anterior falla en 10
  comprobaciones (WhatsApp no guardado, HTML creado desde texto, etiqueta vieja).
- `arnes.js`: etiqueta del estatus 12.
- Suite completa: 25 archivos en verde.
- Capturas: `texto-seguro-bloc.png` (1200) y `texto-seguro-bloc-celular.png` (390).

## Lo que sigue de la Fase 0 (versión ligera, aprobada por Enoc)
| Paso | Quién | Qué |
|---|---|---|
| 2 | Claude | Función de servidor que guarde la ficha del lead completa o nada, sin duplicar el comentario (id del comentario generado en la pantalla), y otra que marque el certificado enviado en sus dos tablas a la vez. |
| 3 | Codex (PR) | Ficha del lead: aviso al cerrar con cambios (Guardar / Seguir editando / Descartar), que la respuesta no se vaya a otra ficha (H16), usar la función del paso 2 (H2, H12, H13, H14). |
| 4 | Codex (PR) | Tareas que no se marcan hechas si falla (H3), notas de inscripción recuperables (H15), cola de certificados que no avanza si falla (H17, H18). |
| 5 | Codex (PR) | WhatsApp: **preguntar "¿Ya lo enviaste?"** antes de contarlo como enviado (decisión de Enoc, H4). |

Sin tabla de "comprobantes de operación" ni manejo de conflictos entre pestañas (decisión de Enoc).
Nota: `leads.actualizado_en` y `personas.actualizado_en` existen pero ningún trigger los mantiene.
