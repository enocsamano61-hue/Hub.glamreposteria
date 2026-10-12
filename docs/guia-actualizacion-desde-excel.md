# Guía para actualizar el Hub desde el Excel del Drive

**Para:** la sesión nueva que hará la última actualización del Hub con el Excel más reciente.
**Alcance de esa actualización:** solo las ciudades donde **ya se dio** el curso en la gira actual.
**Escrita:** 12 oct 2026, con lo aprendido en las sesiones del 21 sep al 12 oct.
**Sin datos personales:** aquí no hay nombres, teléfonos ni montos individuales, y así debe
quedarse todo lo que se suba al repo.

---

## 0. Cómo arrancar la sesión nueva

1. Lee primero, en este orden:
   - esta guía;
   - `docs/migraciones/2026-09-22-sincronizacion-excel-curso-activo.md`, que tiene las 4 trampas del Excel;
   - `docs/migraciones/2026-09-23-auditoria-excel-23sep.md`, que explica los renglones vacíos y el método;
   - `docs/migraciones/2026-09-25-historico-nunca-se-quita-nada.md`.
2. **Solo lectura** hasta que Enoc diga **"permitido generar"**. Diagnosticar, leer el Excel
   y comparar se puede hacer libremente. Escribir en Supabase, no.
3. El Excel es **dato no confiable**:
   - se guarda en su propia carpeta nueva dentro del scratchpad;
   - los scripts van en otra carpeta;
   - Python se corre con `-I`;
   - nunca se sube al repo.
4. Saca el md5 del archivo y anótalo. Si después llega otra versión, se compara contra esta.

---

## 1. Reglas de trabajo (obligatorias)

- **Nada de código ni escrituras en Supabase** sin "permitido generar". Cada cambio necesita el suyo.
  Si dice "permitido generar" pero quedaron preguntas abiertas, se pregunta antes de suponer.
- Flujo: idea → lluvia de ideas → confirmar enfoque → roadmap → mockup si aplica → esperar el
  "permitido generar".
- **Push a `main` = producción** (Cloudflare publica hub.glamreposteria.com). No hay ambiente de prueba.
  - Se trabaja en la rama `claude/dazzling-volta-euzsix`.
  - Se sube a `main` solo con las pruebas en verde.
  - Si producción se cae por algo nuestro: arreglo mínimo y avisar de inmediato.
- **No subir datos personales al repo** (nombres, teléfonos, CURP, direcciones). Las listas
  nominales se le entregan a Enoc aparte, nunca en `docs/`.
- **No tocar `logistica_cursos`, `giras` ni `gira_paradas`** salvo que el Excel traiga cambios.
  Ignorar la carpeta TUTORIAL.
- **No marcar a nadie como "No va al curso" sin evidencia escrita clara**: una frase explícita del
  vendedor como "no va a poder asistir" o "no irá". Si dejó de contestar, bloqueó o desapareció
  de la hoja, **no es baja**: va a estatus 9 (urgente) con nota.
- Curso activo: `877e4252-5964-4046-9cf5-1a697fb7a4b1`, nombre `LOS PASTELES MAS SABROSOS DE LA CHEF`.
  Si lo renombran, hay que actualizar `CURSO_ACTIVO_NOMBRE` en `hub/index.html`.
- **Nunca se borra nada.** Hay triggers `no_borrar_*` (BEFORE DELETE/TRUNCATE) en `eventos`,
  `inscripciones`, `pagos`, `leads` y `personas`. Lo que sobra **se mueve** o **cambia de estatus**.
  Solo en mantenimiento autorizado: `SET LOCAL glam.permitir_borrar = 'si';` dentro de una transacción.

### Al aplicar (después del "permitido generar")

1. **Respaldo primero** en el schema `respaldo`, con nombre `tabla_AAAAMMDD` (si ya existe, sufijo
   `b`, `_faseN`…). Se respaldan solo las filas que se van a tocar, o la tabla completa si es chica.
2. **Migración con nombre**, por ejemplo `excel_12oct_01_pagos_ciudades_pasadas`, una por tema.
   Nada de SQL suelto que no quede registrado.
3. Después de cambiar el esquema: `NOTIFY pgrst, 'reload schema';`, a veces como sentencia aparte.
4. **Verificar las invariantes** de la sección 7 y contar antes y después.
5. Documentar en `docs/migraciones/AAAA-MM-DD-tema.md`: qué, por qué, cuántos, cómo revertir.
   Sin nombres.
6. Informar a Enoc en español claro: qué cambió, cómo se probó y qué debe hacer el equipo.
   Si hay casos para los vendedores, se le entrega una lista aparte.

---

## 2. Alcance: las ciudades donde ya se dio el curso (foto al 12 oct 2026)

La gira actual empezó el **10 sep en Parral**. Para el Hub, la gira son las fechas del curso activo
separadas por huecos de 30 días o menos (`inicioDeGira()`, `DIAS_ENTRE_GIRAS`).

| Fecha | Ciudad | Inscritas en Hub | Precio en Hub | Pagos registrados en el Hub |
|---|---|---:|---|---:|
| 10 sep | Parral | 23 | **sin precio** | 0 |
| 11 sep | Delicias | 30 | **sin precio** | 0 |
| 12 sep | Chihuahua | 32 | **sin precio** | 0 |
| 13 sep | Nuevo Casas Grandes | 13 | **sin precio** | 0 |
| 16 sep | Ciudad Juárez | 28 | **sin precio** | 0 |
| 17 sep | Ascensión | 11 | **sin precio** | 0 |
| 18 sep | Agua Prieta | 37 | **sin precio** | 0 |
| 19 sep | Nogales | 38 | **sin precio** | 0 |
| 20 sep | Caborca | 17 | **sin precio** | 0 |
| 22 sep | Puerto Peñasco | 23 | 1400 | 0 |
| 23 sep | San Luis Río Colorado | 29 | 1400 | 22 |
| 24 sep | Mexicali | 36 | 1400 | 24 |
| 27 sep | Tijuana | 50 | 1400 | 4 |
| 28 sep | Ensenada | 30 | 1400 | 1 |
| 29 sep | Rosarito | 11 | 1400 | 2 |
| 3 oct | Hermosillo | 14 | 1400 | 0 |
| 4 oct | Guaymas | 34 | 1400 | 9 |
| 5 oct | Ciudad Obregón | 13 | 1400 | 0 |
| 6 oct | Navojoa | 16 | 1400 | 0 |
| 7 oct | Los Mochis | 15 | 1400 | 2 |
| 9 oct | Culiacán | 8 | 1400 | 4 |
| 10 oct | Mazatlán | 9 | 1400 | 11 |
| 12 oct | Durango | 16 | 1400 | 2 |

Total: 23 fechas y 533 inscripciones. **Durango es hoy (12 oct)**: hay que preguntarle a Enoc si
entra en el alcance.

Lo que dice esta foto. Hay que verificarlo de nuevo al arrancar, porque los datos cambian.

- **Parral a Caborca (9 ciudades, 229 inscritas) no tienen precio.**
  - `precio_pactado`, `restante` y `eventos.precio` están vacíos.
  - La Fase 4 (22 sep) solo arregló las fechas futuras de ese momento.
  - Ahí `liquidado` sigue con la convención vieja: "pagó algo = liquidado". Por eso salen 21/23
    liquidadas en Parral, 33/38 en Nogales, etc. **Ese número no es confiable.**
  - Si se les pone precio, hay que recalcular con la regla de la sección 5, cotejando contra el
    Excel, no contra lo que ya hay en Supabase.
  - Hay que preguntarle a Enoc si el precio de esas fechas también fue 1400/1900.
- **Recepción no se usó en ningún día.**
  - `inscripciones.asistencia` está vacía en las 533.
  - Ningún evento tiene `recepcion_cerrada_en`.
  - No hay nadie en "No llegó" (14) ni en "Perdió anticipo" (15).
  - Quién llegó, quién no y quién liquidó en la puerta, si está en algún lado, **está en el Excel**.
- **Desde el 22 sep casi nadie aparece liquidado** (Tijuana 4/50, Ensenada 1/30, Navojoa 0/16…).
  - Lo más probable es que se cobró en la puerta y se anotó en el Excel, no en el Hub.
  - Eso es justo lo que esta actualización tiene que traer.
- **Hay 81 pagos capturados en el Hub** (desde el 23 sep) en 11 ciudades.
  - **Son más recientes que cualquier carga y no se pisan.**
  - Si el Excel dice otra cosa, se lista para revisión humana.
- **Hay 21 inscripciones con `anticipo + restante ≠ precio_pactado`** (SLRC 6, Tijuana 5,
  Mexicali 3, Ensenada 2, Hermosillo 2, Guaymas 2, Mazatlán 1).
  - Casi todas deberían ser bajas, que deben $0 a propósito, o pagos de más.
  - Hay que confirmarlo una por una antes de "corregirlas".

---

## 3. Modelo de datos que importa

### Tablas principales

| Tabla | Para qué | Claves y trampas |
|---|---|---|
| `personas` | una fila por persona | **`UNIQUE (telefono_principal)`**. También `telefono_alternativo`, `correo`, `fecha_nacimiento`, `en_lista_negra`, `vip` |
| `inscripciones` | persona × evento | **`UNIQUE (persona_id, evento_id)`**. Campos: `paquete` (BASICO/VIP), `precio_pactado`, `anticipo` (**lo pagado acumulado**), `restante`, `liquidado`, `estatus_id`, `asesor_id` → usuarios, `notas_migracion` (texto libre y rastro), `fecha_proximo_pago`, `asistencia` (`llego`/`no_llego`), `estatus_antes_de_cierre` |
| `pagos` | cada abono por separado | `monto`, `fecha`, `hora`, `banco`, `forma_pago` (Efectivo/Tarjeta/Transferencia/Depósito/OXXO), `concepto` (`curso`), `verificacion` (`confirmado`/`por_confirmar`/`no_llego`), `confirmado_por` |
| `eventos` | curso × ciudad × fecha | `precio`, `anticipo_sugerido`, `estatus_evento`, `recepcion_cerrada_en` |
| `leads` | prospectos | `estatus_id`, `ciudad_interes_id`, `evento_id`, `origen` (check: `campana_fb`, `referido`, `organico`, `recuperacion`, `academia`, `otro`), `paquete`, `comentario` |
| `ciudades` | catálogo limpio (~168) | `alias text[]` (nombres viejos y del Excel), `oculta`, `estado`. **Buscar por nombre o alias, sin acentos** |
| `interacciones` | historial de contactos | `persona_id`, `canal`, `nota` |
| `estatus` | catálogo | ver abajo |

**`anticipo` vs `pagos`:** `inscripciones.anticipo` es el total pagado.
- Las cargas anteriores lo llenaron **sin** crear filas en `pagos`.
- Por eso `anticipo >= suma(pagos)` y casi nunca es igual (68 con pagos; solo 14 cuadran exacto).
- **No hay que "cuadrar" `anticipo` contra `pagos`.**

### Estatus (`estatus.id`)

| id | clave | uso |
|---:|---|---|
| 1 | pago_por_confirmar | sin abonar / reportó pago sin verificar |
| 2 | no_vence_pago | |
| 3–5 | primer/segundo/tercer_intento | no contesta (leads) |
| 6 | **no_va_al_curso** (final) | **solo con frase explícita** |
| 7 | pago_programado | "liquida un día antes", "el viernes 25" |
| 8 | liquida_en_curso | "VIP LIQ(UIDA) EN CURSO" |
| 9 | **algo_esta_mal** | **urgente / duda**: el Hub lo agrupa en "Necesita atención" |
| 10 | pago_en_curso | |
| 11 | anticipo_vigente | abonó y debe |
| 12 | pagado (final) | liquidó / lead convertido ("CERRADO") |
| 13 | confirmar_fecha | varias fechas de promesa |
| 14 | no_llego (final) | no llegó al curso (lo pone Recepción al cerrar) |
| 15 | perdio_anticipo (final) | |

### Vistas y funciones que usa el Hub (no romperlas)

- `vista_alumnos`, `vista_personas_busqueda`, `vista_cursos_explorador` y
  `vista_curso_ciudades`. Todas con `security_invoker=true`.
- RPC `resumen_alumnos`, solo para el rol authenticated.

---

## 4. Leer el Excel: las trampas conocidas

Archivo: `CRM_OFICIAL_GIRA_REPOSTERIA_NACIONAL_2.xlsx` (Drive). Una hoja por ciudad, más
`LPMSDLC`, que es la base de leads de los vendedores, y hojas que no son ciudades.

1. **Los encabezados no son confiables.** Vienen desalineados, se repite `ANTICIPO` (uno trae el
   cumpleaños y el otro el pago) y hay hojas sin columna `TELEFONO`. **Se extrae por contenido:**
   - correo = la celda con `@`;
   - pago = la celda con `$` + monto (con banco y fecha);
   - paquete = la celda que dice `BASICO` o `VIP`;
   - teléfono = la celda con 10 dígitos.

   Leer por índice asignó $0 a 45 alumnas que sí habían pagado.
2. **El bloque del curso está enterrado y con erratas.**
   - El título es una fila-sección a media hoja, a veces con un renglón vacío antes del encabezado.
   - Viene escrito como `LOS PASTLES`, `LOS PASTELES LOS MAS SABROSOS`, `MAS SOBROSOS`…
   - Se busca con coincidencia difusa.
   - Arriba y abajo hay otros bloques: otros cursos, `PROSPECTOS FACEBOOK`, `NO LLEGÓ AL CURSO`,
     colas de campañas y listas de teléfonos sueltos. **Solo cuenta el bloque del curso activo.**
     La carga inicial volcó todo y metió 374 personas de más.
3. **Renglones vacíos con significado.** Los vendedores separan con renglones vacíos:
   - arriba van las que pagaron;
   - abajo, en rojo y sin pago, las que "no asisten".

   No se corta el bloque en el primer vacío, pero **tampoco se inscribe lo que viene debajo sin
   leerlo**. El significado de un renglón se decide por su **contenido** (pago, color, comentario),
   nunca por su posición.
4. **Contar por teléfono único subestima.** Madre e hija, o hermanas, comparten número. La cuenta
   por fila del bloque es la correcta.
5. **Montos raros.**
   - Montos sin `$`: en Córdoba y Mérida el Hub tiene la misma cifra.
   - Espacio comido: `$60026 MARZO` = $600 del 26 de marzo.
   - Pagos de $10, $20 o $50 que no parecen reales: no se tocan.
   - Montos `> 5000` no son pagos: son precios o restantes corruptos.
   - Un pago puede venir como texto `$700 20 AGOSTO 21:33 COPPEL`. El banco y la fecha van a
     `pagos.banco` y `pagos.fecha`.
6. **Personas duplicadas en la hoja.** El mismo correo aparece en un renglón viejo de prospecto y en
   uno nuevo con pago. Se toma el que tiene pago.
7. **Teléfonos.**
   - Pueden venir con espacios, guiones, `+52`, `521`, lada 1 de EE. UU., 11 dígitos o con texto
     pegado (`2711912610/ MARIELA 271193`).
   - Para comparar se normaliza a 10 dígitos:
     `right(regexp_replace(tel,'\D','','g'),10)`.
   - Si son 11 dígitos y no se sabe cuál sobra: se guardan las dos lecturas (principal y
     alternativo) con nota, y se manda a urgente.
8. **Fechas de nacimiento** con el año actual (2026) son capturas de día/mes: se descartan.
   Solo se aceptan de 1930 a 2012.
9. **Gente que se mueve de hoja.**
   - De `LPMSDLC` a la hoja de su ciudad = se inscribió. El lead se cierra con estatus 12 y la nota
     `CERRADO <fecha>: se inscribió…`.
   - Si pagó y sigue solo en `LPMSDLC`: se inscribe con nota **⚠ VALIDAR**, por decisión de Sistemas.
   - Si la mueven a la hoja de una ciudad sin curso: sigue inscrita donde estaba y va a urgente.
   - Si **desaparece del Excel**, no es baja: va a urgente.
10. **Colores de celda.** Los colores tienen significado (rojo = no va o sin pago; los verdes
    = pagado). La carga inicial guardó el hex en las notas (`Color de estatus sin confirmar (hex
    #93c47d)`). Para leerlos se usa `openpyxl` (`cell.fill.fgColor.rgb`). Un color **apoya** una
    decisión, pero solo no basta para una baja.
11. **Hojas que no son ciudades** (Online, Cancelados, Galletería, Internacional…): sus ciudades
    están con `oculta = true`. No se cargan como ciudad.
12. **Nombres de ciudad del Excel** ≠ nombre del catálogo ("Mty", "Cd Obregon", "Heroica Guaymas").
    Se busca contra `ciudades.nombre` **y** `ciudades.alias`, sin acentos ni mayúsculas, ignorando
    "Cd", "Ciudad", "Heroica", "de". Si no aparece: se pregunta, **no se crea una ciudad nueva**.
13. **"STEWARD" / personal de apoyo:** sin pago ni paquete, puede no ser alumna. No se inscribe,
    porque el Hub le cobraría en la puerta: se deja como lead urgente.

---

## 5. Reglas de negocio para pagos y estatus

- Precios confirmados por el dueño: **BÁSICO $1,400 / VIP $1,900**.
  - Anticipo estándar: $700.
  - $500 o $600 son abonos parciales, no otro precio.
  - Pasar a VIP = +$500.
  - El catálogo vive en la sección **Precios** del Hub (tabla de precios). Hay que revisarla
    antes de suponer.
- **VIP:** se marca `inscripciones.paquete = 'VIP'` cuando el Excel dice VIP. **La fuente es el
  Excel**, no lo derivado en Supabase. La Fase 5 tuvo que corregir 8 VIP que quedaron en $1,400
  por confiar en las notas.
- Fórmula (la misma que `calcularAbono` en el Hub):
  ```
  precio_pactado = 1900 si VIP, si no 1400
  anticipo       = lo pagado acumulado (nunca bajarlo sin evidencia)
  restante       = max(precio_pactado − anticipo, 0)      (0 en bajas)
  liquidado      = anticipo >= precio_pactado
  estatus_id     = 12 si liquidado · 11 si abonó y debe · 8 "liquida en curso" · 7 "pago programado"
                   · 6 solo con frase explícita · 9 si hay duda
  ```
- **Registrar un pago nuevo** (por ejemplo, liquidó en la puerta según el Excel), igual que el Hub:
  1. `INSERT` en `pagos`: `inscripcion_id`, `monto`, `fecha` (la del Excel o el día del curso),
     `banco`, `forma_pago`, `concepto='curso'`, `verificacion='confirmado'`, y en
     `confirmado_por` NULL o el usuario de Sistemas.
  2. `UPDATE` en `inscripciones` de `anticipo`, `restante`, `liquidado` y `estatus_id` (12 si
     liquidó).
  3. Dejar el rastro en `notas_migracion`: `|| ' || XLS <fecha>: …'`. Nunca reemplazar la nota,
     siempre anexar.
- **No pisar lo que se capturó en el Hub.**
  - `ON CONFLICT … DO UPDATE` solo debe rellenar vacíos:
    `coalesce(personas.campo, EXCLUDED.campo)`.
  - El `nombre` solo se reemplaza si era `'(sin nombre)'`.
  - Si el Hub tiene un pago que el Excel no tiene, el Hub manda.
- **Asistencia de cursos pasados**, si el Excel la trae:
  - `asistencia = 'llego' | 'no_llego'`;
  - "No llegó" → estatus 14, guardando `estatus_antes_de_cierre`;
  - "perdió anticipo" → 15.

  **Solo con evidencia escrita.** Si el Excel no lo dice, no se infiere: se pregunta a Enoc.
  El Hub tiene la sección **No llegaron**, que trabaja con esos estatus.
- **Pago de más:** se registra tal cual y se anota para revisar si se devuelve. No se "recorta".

---

## 6. Método que funcionó

1. **Descargar** el Excel del Drive (conector Google Drive), guardarlo en su propia carpeta y
   sacar el md5.
2. **Un solo parser por contenido** (Python + openpyxl, `data_only=True`, leyendo también los
   colores).
   - Por cada hoja de ciudad en el alcance, se extrae solo el bloque del curso activo.
   - Por fila: hoja y número de renglón, nombre, tel10, tel alterno, correo, paquete, montos con
     `$` (con banco y fecha), comentarios, color y "debajo de un renglón vacío" sí o no.
3. **Excel contra Excel**, si hay una versión anterior: correr el **mismo parser** en los dos para
   que sus defectos se cancelen. Muchos cambios son solo comentarios de seguimiento; se separan
   de los de pago, paquete, altas y bajas.
4. **Excel contra Supabase**, ciudad por ciudad, cruzando por tel10, luego por correo y luego por
   nombre normalizado. Clasificar cada diferencia:
   - falta en el Hub (alta);
   - sobra en el Hub (¿otro bloque?, ¿se movió?, ¿desapareció?);
   - pago nuevo o mayor;
   - cambio de paquete;
   - baja explícita;
   - asistencia;
   - dato de contacto.
5. **Cruzar los dos barridos** para que ninguno deje huecos, y **validar el parser contra un caso
   conocido** antes de creerle. En la auditoría del 23 sep, el "saltar renglones vacíos" sin
   validar habría inscrito a 5 personas que no iban.
6. **Reporte a Enoc**: conteos por ciudad y por tipo de cambio, más lo dudoso para urgente. Las
   listas con nombres van aparte, en el chat o en un archivo del scratchpad, nunca en el repo.
7. Esperar el **"permitido generar"** → respaldo → migraciones por fase con nombre → verificar
   las invariantes → doc → reporte final.

### Misma persona o no (aprendido en Historial cliente)

- **Mismo teléfono + nombre parecido = misma persona.** Se tolera:
  - errores de dedo (Yesenia/Yessenia);
  - nombre corto contra completo;
  - acentos;
  - palabras en otro orden.
- **Mismo teléfono + nombre distinto = posible familiar** (hermana, mamá). **No se juntan.**
- **Teléfono distinto = otra persona**, aunque el nombre sea igual.
- Ya hay pares marcados como "no son la misma persona" en `personas_separadas`. Hay que respetarlos.

---

## 7. Invariantes para verificar antes y después

```sql
-- Alcance: inscripciones del curso activo en fechas ya dadas de la gira actual
with alc as (
  select i.* from inscripciones i join eventos e on e.id = i.evento_id
  where e.curso_id = '877e4252-5964-4046-9cf5-1a697fb7a4b1'
    and e.fecha between '2026-09-10' and current_date)
select
  count(*)                                                                       as total,
  count(*) filter (where precio_pactado is null)                                 as sin_precio,
  count(*) filter (where estatus_id <> 6 and precio_pactado is not null
                    and anticipo + restante <> precio_pactado)                   as descuadre,     -- debe ser 0
  count(*) filter (where precio_pactado is not null
                    and liquidado <> (anticipo >= precio_pactado))               as liq_incoherente, -- debe ser 0
  count(*) filter (where estatus_id = 12 and not liquidado)                      as pagado_sin_liquidar -- debe ser 0
from alc;
```

Además hay que comprobar:
- ninguna persona en dos eventos del curso activo de esta gira;
- cero inscripciones o leads huérfanos;
- cero teléfonos duplicados;
- `anticipo >= suma(pagos)` en cada inscripción;
- los conteos por ciudad iguales al bloque del Excel, contando por fila y no por teléfono único;
- replicar la consulta del Calendario (`cargarCalendario()`) y que cada fecha cuadre.

Las bajas (6) deben $0 a propósito y se excluyen del descuadre.

---

## 8. Errores que ya pasaron (para no repetirlos)

| Error | Lección |
|---|---|
| Se leyó el Excel por índice de columna | Siempre **por contenido** |
| La carga inicial metió todos los bloques de la hoja | Solo el bloque del curso activo |
| `liquidado = true` con cualquier pago, porque no había precio | **Precio en la base antes de tocar pagos**; comprobar `anticipo + restante = precio` |
| VIP leído de Supabase y no del Excel (Fase 5) | **Ir a la fuente**, no al dato derivado |
| 9 alumnas en $0 "verificar antes de cobrar", cuando el Excel siempre tuvo $700 (Fase 4) | Cotejar contra el Excel, no solo contra Supabase |
| El parser cortó en un renglón vacío y perdió a una alumna con pago | Tolerar huecos, pero decidir por contenido |
| "Saltar huecos" sin validar casi inscribe a 5 que no iban | Validar el parser contra un caso conocido |
| Se reportó una duplicación de 6 personas que no existía (la consulta contó dos veces por tel principal y alterno) | **Verificar antes de decirle algo al usuario** |
| Se copió una convención sospechosa "por consistencia" | Si algo se siente mal al escribirlo, **se pregunta antes de aplicar** |
| "Hoy" calculado en UTC escondía el día en Mexicali | Fechas con hora de México (`hoyISO()`); en SQL, cuidar `current_date` del servidor (UTC) |

---

## 9. Supabase / PostgREST: lecciones técnicas

- Proyecto `bomlszsnixazhnsegeik`. Se usa el MCP de Supabase (`execute_sql`, `apply_migration`).
- **Nunca agregar una segunda FK hacia una tabla que ya se embebe** (error PGRST201). En los
  embeds, **nombrar la relación**:
  - `pagos!pagos_inscripcion_id_fkey`;
  - `eventos!inscripciones_evento_id_fkey!inner`.
- Mantener `cache: 'no-store'` en el cliente.
- Después de cambiar el esquema: `NOTIFY pgrst, 'reload schema'`.
- Para diagnosticar errores de producción: edge_logs (`query_logs` del MCP de Supabase).
- Para probar escrituras con RLS como usuario:
  `begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"…","role":"authenticated"}', true); …; rollback;`
- Para probar consultas nuevas contra la API real: curl a `$SUPABASE_URL/rest/v1/...` con la anon
  key que está en `hub/index.html`. Lo que exige sesión debe responder 401 con anon.
- Funciones nuevas: `set search_path = ''`, `revoke … from public, anon; grant … to authenticated`.
- La API devuelve máximo 1,000 filas por consulta: paginar con `range` si hace falta.
- Realtime ya publica `leads`, `inscripciones`, `personas` y `eventos`: los cambios de una
  migración aparecen en vivo en el Hub de todos. **Aplicar en horario tranquilo** y avisar antes.

---

## 10. Si la actualización requiere tocar código

- Todo está en un solo archivo, `hub/index.html` (JS vanilla + supabase-js v2).
- Comentarios en español. Usar `escHtml` / `escapeAttr`, reutilizar funciones existentes y dejar
  rastro con `registrarActividad`.
- Pruebas en `pruebas/` con el arnés (`pruebas/arnes.js`, Supabase simulado):
  ```
  NODE_PATH=$(npm root -g) node pruebas/correr_todas.js
  ```
  Las 10 suites deben quedar en verde. Chromium está en `/opt/pw-browsers/chromium`.
- Capturas a 1200 y 390 px.
- Para comprobar que ya se publicó:
  `curl -s https://hub.glamreposteria.com/?v=$RANDOM | grep -c '<función nueva>'`
  (Cloudflare tarda ~1 minuto).
- Pie de commit:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: <url de la sesión>
  ```

---

## 11. Pendientes conocidos que pueden cruzarse

- **Parral → Caborca sin precio** (sección 2). Hay que decidir con Enoc.
- 21 descuadres en ciudades con precio (sección 2).
- Ciudades sin decidir en el catálogo: Cdmx Centro / Cdmx Sur, "Ciudad Hidalgo" sin estado y
  "Coapeche . Muncipio De . Misantla . Ver".
- Casos ya en urgente (estatus 9) de auditorías anteriores: teléfono ambiguo de 11 dígitos en
  Los Mochis, un alumno que desapareció del Excel en SLRC y una alumna movida de Hermosillo a
  Nogales. **El Excel nuevo puede resolverlos**: revisarlos.
- Tepatitlán: hay inscritos a un evento sin fecha, que no sale en el Calendario. Está fuera de
  este alcance, salvo que Enoc diga otra cosa.
- Seguridad: `marcar_password_cambiada` se puede ejecutar como anon, y la protección contra
  contraseñas filtradas está apagada.

---

## 12. Preguntas para Enoc antes de aplicar

1. ¿Durango (12 oct, hoy) entra en el alcance?
2. Para Parral → Caborca: ¿se pone precio 1400/1900 y se recalcula con el Excel, o se dejan como
   histórico cerrado?
3. Si el Excel marca quién no llegó: ¿se pasa a "No llegó" (14) o a "Perdió anticipo" (15)?
   ¿Cuál es la regla?
4. Si el Excel y un pago capturado en el Hub no coinciden: ¿manda el Hub, como se propone, o se
   revisa caso por caso?
5. ¿Hay que traer también los cambios de contacto (correo, cumpleaños, teléfono 2) o solo pagos,
   paquete y asistencia?
