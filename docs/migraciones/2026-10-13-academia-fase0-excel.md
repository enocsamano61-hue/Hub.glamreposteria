# 🎓 Academia · Fase 0: el Excel completo en Supabase — 13 oct 2026

**Archivo:** `ACADEMIA GLAM REPOSTERIA "UNIVERSIDAD DEL EXITO"` (Drive), copia del 13 oct, md5 `77820ced…`
**Migraciones:** `academia_01_esquema`, `academia_02_funcion_de_carga`, `academia_03_prospectos_cruce_por_lote`
**Script:** `scripts/academia/cargar_excel_academia.py` (repetible)
**Hub (`hub/index.html`):** sin cambios. Las pantallas son las Fases 1–4.

Decisiones del 13 oct (Sistemas):
- **Corte:** no hay fecha. Sistemas avisa cuándo recargar.
- **Colores:** son solo visuales. Se guardan en la copia exacta y no se usan para decidir nada.
- **Prospectos:** van en una lista aparte de Academia y no entran a `leads`.
- **Alumnas sin teléfono:** se cargan marcadas "Sin teléfono".
- **Generaciones:** se capturan tal cual (una por hoja) y Academia las corrige.
- **Encuesta y estado civil:** solo Academia y admins, igual que la CURP.

---

## Resultado

| | Excel | Supabase |
|---|---:|---:|
| Celdas con dato (capa 1) | 36,522 | **36,522** |
| Generaciones | 10 hojas | **10** |
| Alumnas | 1,328 renglones | **1,328** (1,294 personas distintas) |
| Alumnas sin teléfono | 10 | **10** (sin persona, marcadas "Sin teléfono en el Excel") |
| Pagos (celdas de mensualidad/abono) | 8,866 | **8,866** |
| Graduaciones | 2 | **2** (ago 2026 pasada · ago 2027 próxima, gen 4, 5 y 6) |
| Asistentes a la graduación de ago 2026 | 48 | **48** (45 ligadas a su alumna) |
| Kits | 44 | **44** (40 ligados) |
| Hotel | 38 | **38** |
| Prospectos | 302 + 236 + 28 | **566** (114 ya están en `personas`) |
| Contenido (módulos, planes, copys, objeciones, clases, conversión) | 710 celdas | **710** |

Alumnas por generación: 1ª 116 · 2ª 193 · 3ª 55 · 4ª 69 · 5ª mensual 18 · Academia 2025 502 ·
Academia 2026 371 · Sous Chef 1 · Hobby 2 · Repostero 1.

**`personas`:**
- 36,590 → **36,829**, con **239 personas nuevas**.
- En 632 personas que ya existían **solo se llenó lo vacío**: 160 correos y 581 cumpleaños.
- Se verificó contra el respaldo: **0** correos o cumpleaños pisados y **0** cambios en otros campos.

**Pagos:**
- 6,816 `pagado`.
- 2,007 `por_revisar`: sin monto legible, o con monto de más de $5,000 (precio o espacio comido).
- 43 `debe`.
- **Siempre** se guarda el texto original de la celda.

**Decisión de graduación**, tomada de la columna GRADUACIÓN:

| Valor en el Excel | Decisión |
|---|---|
| GRADUADA | `graduada` (40) |
| KIT… | `kit` (23) |
| GRAD 2027 / SI | `se_gradua` (8) |
| NO ASISTIRÁ / NO QUIERE | `no_quiere` (2) |
| MSJ | `contactada` |
| Lo demás | `por_contactar` (1,255) |

El texto original queda en `graduacion_excel`.

**A revisar (69):**
- 59 alumnas cuyo teléfono ya era de una persona del Hub con **otro nombre**, por ejemplo madre e hija con el mismo número. Quedan ligadas, con la nota "confirmar que es la misma persona".
- 10 sin teléfono.

**No se cargaron como alumnas** (quedan en la capa 1):
- 64 renglones separadores: "DESERTORES", "TORREON AC 2026"… Su texto queda como `seccion_excel` de las alumnas que siguen.
- 2 encabezados repetidos.
- 22 renglones sin nombre ni teléfono.

---

## Tablas

| Tabla | Qué guarda | Quién la lee |
|---|---|---|
| `academia_excel_archivos` / `academia_excel_celdas` | **Capa 1:** copia exacta, una fila por celda (valor, tipo, fórmula, color, comentario, link) con la huella del archivo | Solo admins |
| `academia_generaciones` | Una por hoja | Equipo |
| `academia_alumnas` | Una por renglón: persona, generación, hoja/fila/sección de origen, matrícula, ciudad, vendedora, importes, graduación, decisión, notas, `revisar` | Equipo (edita Academia) |
| `academia_pagos` | Una por celda de pago: texto original, monto, banco, fecha, color, estado, `origen` excel/hub | Equipo (edita Academia) |
| `academia_datos_privados` | CURP, dirección, estado civil, encuesta de ingreso, redes y **el renglón completo del Excel** | 🔒 Academia y admins |
| `academia_graduaciones` | Fechas, precios, conceptos (12 cada una), itinerario | Equipo (edita Academia) |
| `academia_graduacion_asistentes`, `academia_kits`, `academia_hotel` | Listas de la hoja GRADUACION AC | 🔒 Academia y admins |
| `academia_prospectos` | PROSPECTOS, EXPO CINTERMEX, INSCRITOS (PENDIENTES DE PAGO) | 🔒 Academia y admins |
| `academia_contenido` | Material: módulos (con links), planes, copys, objeciones… | Equipo (edita Academia) |
| `academia_carga_llave` | Hash de la llave temporal de carga | Nadie (RLS sin políticas) |

- "Academia" es `es_academia()`: admin o rol "Academia e Inbox".
- **Ninguna** tabla nueva tiene políticas de DELETE.
- Todas tienen el candado `no_borrar_*` / `no_vaciar_*`.
- Las únicas llaves foráneas hacia tablas existentes son `academia_alumnas.persona_id` y `academia_prospectos.persona_id`, una por tabla, hacia `personas`. Los embeds que ya usa el Hub no cambian (probado: 200).

**Lo que el Hub edita y la recarga respeta:**
- `academia_alumnas`: `decision`, `notas`.
- `academia_pagos`: `monto` y `estado` cuando el texto de la celda no cambió, y los pagos con `origen = 'hub'`.
- `academia_generaciones.nombre`.
- `notas` de asistentes, kits, hotel y prospectos.

---

## Cómo recargar cuando llegue un Excel nuevo

1. Guardar el `.xlsx` en el scratchpad (nunca en el repo) y correr en seco:
   `python3 -I scripts/academia/cargar_excel_academia.py ACADEMIA.xlsx --seco`
   Comparar los conteos contra esta tabla y explicar cualquier diferencia antes de seguir.
2. Respaldar `personas` en `respaldo.personas_AAAAMMDD_academia`.
3. Generar una llave local que **no** pase por el chat; solo se manda el hash:
   ```bash
   python3 -I -c "import secrets,hashlib;t=secrets.token_hex(32);open('LLAVE','w').write(t);print(hashlib.sha256(t.encode()).hexdigest())"
   ```
   ```sql
   insert into academia_carga_llave (token_hash, expira_en) values ('<hash>', now() + interval '90 minutes');
   grant execute on function academia_carga(text, text, jsonb) to anon;
   ```
4. `python3 -I scripts/academia/cargar_excel_academia.py ACADEMIA.xlsx --llave LLAVE`
   Si se corta, se retoma con `--archivo <id> --desde <paso>` sin volver a copiar las celdas.
5. **Cerrar siempre:**
   ```sql
   update academia_carga_llave set expira_en = now() where expira_en > now();
   revoke execute on function academia_carga(text, text, jsonb) from anon;
   ```
6. Verificar los conteos contra el seco, los campos de `personas` contra el respaldo y la API real.

La función identifica cada registro por **generación + teléfono** (o nombre si no hay teléfono).
- Una alumna nueva se agrega.
- Una existente se actualiza.
- Nada se borra: si una alumna desaparece del Excel, se queda en el Hub.
- Cada recarga crea un archivo nuevo en la capa 1, así que se puede comparar una copia contra otra.

---

## Verificaciones hechas

- **Conteos por hoja** iguales al recorrido en seco.
- **Recarga:** 0 personas nuevas, 0 duplicados.
- **API real con la clave publicable, sin sesión:** las 11 tablas nuevas responden 200 `[]`, una columna inventada da 400 y `rpc/academia_carga` da 401 (*permission denied*).
- **Embeds existentes** (`personas → inscripciones!inscripciones_persona_id_fkey`, `leads → personas, estatus!leads_estatus_id_fkey`): 200.
- **RLS con usuarios reales**, en transacciones que se deshicieron:

  | Rol | Alumnas | Privados | Kits | Prospectos | Capa 1 | Puede editar la decisión |
  |---|---:|---:|---:|---:|---:|---|
  | Academia e Inbox | 1,328 | 1,328 | 44 | 566 | 0 | Sí |
  | Ventas, Cobranza | 1,328 | 0 | 0 | 0 | 0 | No |
  | Sistemas (admin) | todo | todo | todo | todo | 36,522 | Sí |

- **Borrar** se rechaza: RLS para usuarios, y el candado incluso para `postgres`.
- **Asesor de seguridad:** sin hallazgos nuevos, salvo dos esperados:
  - la tabla de la llave no tiene políticas (a propósito);
  - `es_academia()` y `es_admin_glam()` se pueden llamar con sesión (solo dicen si la usuaria es de Academia o admin).

## Trampas encontradas (para la próxima carga)

- **Fechas leídas como teléfono.** `2026-02-19 00:00:00` daba `0219000000`. Los teléfonos ya no aceptan fechas ni ladas que empiecen en 0 o 1.
- **Separador o alumna sin teléfono:**
  - Es **separador** si solo hay un texto en la columna del nombre y nada más.
  - Un nombre con apellidos, o con cualquier otro dato, es **alumna**.
- **Cambio de teléfono.** Entre el 24 sep y el 13 oct, una alumna de 2026 cambió de número. Para comparar copias del Excel se usa teléfono **y** nombre.
- **Tiempo límite de la API (3 s para `anon`).** Un cruce con `personas` por cada renglón se cae. Se hace un solo cruce por lote (`academia_03`).
- **Respaldo con el mismo nombre.** Otra sesión trabajaba el mismo día con `respaldo.personas_20261013`. No se pisó: este respaldo se llama `personas_20261013_academia`.

## Pendientes

- **Fase 1, Alumnas:**
  - sección `academia` en `SECCIONES`, `permisos_rol` y `PERMISOS_POR_ROL_DEFAULT`;
  - acción `cobrar_academia` para Tamar y Eliab;
  - ver y resolver los 69 "a revisar".
- **Fase 2, Graduación:** pasar los conceptos a **Precios** con etiqueta Academia. No se hizo ahora porque Recepción los mostraría como extras de la gira.
- **Fases 3 y 4:** kits (estado y guía) y certificados (PDF con la plantilla).
- **COPPYS de la academia → `mensajes_predeterminados`.**
- **Fechas del Excel:** las de la graduación 2027 dicen 2026 en las celdas. Se tomó la del título (3 ago 2027).

## Nota sobre datos personales

Aquí no hay nombres, teléfonos, CURP, direcciones ni montos individuales. El script no los imprime y el Excel nunca se sube al repo.
