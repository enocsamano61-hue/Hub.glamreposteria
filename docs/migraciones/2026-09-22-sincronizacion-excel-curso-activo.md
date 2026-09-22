# Sincronización Excel → Supabase del curso activo

**Fecha:** 22 de septiembre de 2026
**Curso:** `LOS PASTELES MAS SABROSOS DE LA CHEF` (`877e4252-5964-4046-9cf5-1a697fb7a4b1`)
**Fuente:** `CRM_OFICIAL_GIRA_REPOSTERIA_NACIONAL_2.xlsx` (Drive)
**Código tocado:** ninguno. `hub/index.html` no se modificó.

Auditoría del Calendario contra el Excel y corrección de las diferencias.
Se revisaron las 63 fechas programadas del curso activo (22 sep → 22 dic 2026).

## Resultado de la auditoría

De las 63 ciudades del Calendario, 39 ya coincidían. Las 24 restantes tenían
dos problemas distintos:

| Problema | Ciudades | Alumnos |
|---|---:|---:|
| Faltaban en Supabase (ventas nuevas del Excel) | 17 | 138 |
| Sobraban en Supabase (contaminación de la carga inicial) | 8 | 374 |

**No había contradicciones:** ningún alumno tenía datos distintos entre Excel
y Supabase. Solo faltaban o sobraban filas.

### Los 138 que faltaban

Casi exactamente la gira de septiembre–octubre, la que estaba por arrancar.
Son ventas registradas en el Excel después de la carga inicial. El caso más
grave era Puerto Peñasco: el curso era **ese mismo día** y el Hub mostraba 12
alumnos cuando el Excel tenía 21.

### Los 374 que sobraban

La carga inicial volcó **todos** los bloques de cada hoja dentro del evento del
curso activo, no solo el bloque del curso. Se rastreó cada teléfono hasta su
bloque exacto en el Excel:

- **Mérida** 258 → 15. Venían de `PROSPECTOS FACEBOOK`, las colas de
  `INES CAMPAÑA` / `ROSALINDA` / `ELOISA MAGAÑA`, *Postres Virales jul-2025*,
  `NO LLEGÓ AL CURSO`, *Pastelería Gourmet 2021* y *24 Recetas 2022*.
- **Córdoba** 112 → 20. 79 eran la lista de teléfonos sueltos al final de la
  hoja, más *Postres Virales jul-2025* y varias listas de prospectos.
- **Tierra Blanca** 33 → 2, **Chilpancingo** 5 → 1, **Xalapa** 2 → 1,
  **Ocosingo** 3 → 2, **Mexicali** y **Los Mochis** 1–2 cada uno.

De los 374, **249 no tenían nombre** en el Excel (teléfonos sueltos de listas
de prospectos) y 125 eran alumnos reales de otro curso. **Ninguno** venía del
roster del curso activo.

## Migraciones aplicadas

Los nombres son los de Supabase; el SQL completo vive allí.

### `fase1_alta_138_alumnos_excel_curso_activo`

Alta de los 138 en `personas` + `inscripciones`. 87 ya existían como `personas`
y solo les faltaba la inscripción; 51 fueron altas nuevas.

Convención de pago, copiada de la carga inicial para no mezclar criterios:

| Situación | `anticipo` | `liquidado` | `estatus_id` |
|---|---|---|---|
| Pago registrado | monto | `true` | 12 `pagado` |
| Sin abonar | 0 | `false` | 1 `pago_por_confirmar` |
| Negativa explícita por escrito | 0 | `false` | 6 `no_va_al_curso` |

Quedó en 110 pagados, 20 pendientes y 8 bajas.

El `ON CONFLICT (telefono_principal) DO UPDATE` solo rellena campos vacíos
(`coalesce(personas.campo, EXCLUDED.campo)`); nunca pisa un dato ya capturado.
El `nombre` únicamente se sobrescribe cuando el existente era `'(sin nombre)'`.

Las 8 bajas llevan la razón textual del Excel copiada en `notas_migracion`
para poder auditarlas. No se marcó a nadie como `no_va_al_curso` por inferencia:
solo con una frase explícita del vendedor ("no va a poder asistir", "no irá",
"no nos va a poder acompañar"). Quien dejó de contestar o bloqueó el WhatsApp
quedó como pendiente, no como baja.

### `fase2_reubicar_374_inscripciones_a_su_evento_historico`

**No se borró a nadie.** La inscripción se *mueve* al evento histórico real de
su misma ciudad (todos ya existían: *Postres Virales*, *Gourmet*, *Betunes*,
*Bodas*, *24 Recetas*, *Decoración*, o el `Histórico — sin curso identificado`
de esa ciudad).

Esto importa por una razón concreta: `generarReactivacionGira()`
(`hub/index.html:3588`) arma la lista de reactivación leyendo **`inscripciones`,
no `leads`**:

```js
const { data: inscripciones } = await sb.from('inscripciones')
  .select('persona_id, evento_id').in('evento_id', eventoIds);
```

Si se hubieran convertido en `leads` y borrado la inscripción, esas 374 personas
quedarían invisibles para ese botón: el día que se programe otro curso en
Mérida, la reactivación no las encontraría. Moviendo la inscripción, el botón
las sigue jalando solo y no hay que tocar código.

Efecto secundario deseado: tampoco inundan el tablero de vendedores hoy.
`cargarLeads()` (`hub/index.html:2143`) filtra por las ciudades de la gira
activa, y Mérida / Córdoba / Tierra Blanca están en ella — 374 leads sin nombre
habrían más que duplicado el tablero de un día para otro.

De los 374, **53 ya tenían inscripción en su evento destino**: su fila en el
curso activo era un duplicado exacto y se eliminó (la persona y su inscripción
histórica quedan intactas). Las otras 321 se movieron. Un `UPDATE` directo
habría fallado contra `inscripciones_persona_id_evento_id_key`.

### `fase3_iris_lead_hermosillo_y_telefono_mochis`

- **Iris Cervantes Cordero** (Guaymas, 4 oct) dijo que no puede asistir porque
  no estará en la ciudad, y en el Excel le ofrecieron la fecha de **Hermosillo**
  (3 oct). Su inscripción de Guaymas quedó como baja y su lead existente —que
  venía como `no_va_al_curso` y sin ciudad— se reactivó apuntando a Hermosillo
  con `origen = 'recuperacion'`. Se actualizó el lead, no se creó otro.
- **Guadalupe Mariel Arellano Manedez** (Los Mochis, 7 oct) es alumna real y
  liquidó $900, pero su teléfono estaba capturado con 11 dígitos
  (`68716826241`). No hay forma de saber cuál de las dos lecturas es la buena,
  así que se conservan ambas: `6871682624` como principal y `8716826241` en
  `telefono_alternativo`, con nota en `notas_migracion`. **Falta confirmarlo
  con ella.**

## Estado final

| | Antes | Después |
|---|---:|---:|
| Alumnos del curso activo (fechas del Calendario) | 661 | **425** |
| Pagados | — | 299 |
| Cobrado | — | $187,509 |
| `personas` | 36,328 | 36,373 |
| `leads` | 334 | 334 |

El total baja porque deja de estar inflado; pasa a ser el número real vendido.

Verificación: se replicó la consulta de `cargarCalendario()`
(`hub/index.html:2405`) y las 63 fechas cuadran con el Excel. Integridad en
cero: sin inscripciones huérfanas, sin leads huérfanos, sin teléfonos
duplicados. El nombre del curso no cambió, así que `CURSO_ACTIVO_NOMBRE`
(`hub/index.html:2100`) sigue resolviendo.

## Trampas encontradas (para la próxima vez)

Tres cosas que costaron y conviene no volver a tropezar:

**1. Los encabezados del Excel no son confiables.** Varias hojas los traen
desalineados o repiten la palabra `ANTICIPO`:

```
NOMBRE||||TELEFONO|CIUDAD|ANTICIPO|CUMPLEAÑOS|CORREO|ANTICIPO|||||VIP
                          ^^^^^^^^                    ^^^^^^^^
                          (trae el cumpleaños)        (trae el pago real)
```

Leer por índice de columna asignaba **$0 a 45 alumnas que sí habían pagado
$700** (Rosarito y San Luis Río Colorado completos, Durango, Cd Obregón). La
hoja `R ROSARITO` ni tiene columna `TELEFONO` en su encabezado. La extracción
tiene que ser **por contenido**: el correo es la celda con `@`, el pago es la
celda con `$` + monto, el paquete es la que dice `BASICO`/`VIP`.

**2. El bloque del curso está enterrado y con erratas.** El título aparece como
fila-sección en medio de la hoja (Mérida r234, Córdoba r318, Tehuacán r49), a
veces con una fila en blanco entre el título y el encabezado, y escrito como
`LOS PASTLES`, `LOS PASTELES LOS MAS SABROSOS` o `MAS SOBROSOS`. Hay que buscar
con coincidencia difusa y no cortar el bloque en la primera fila con teléfono
"sucio" (Córdoba r324 trae `2711912610/ MARIELA 271193`).

**3. Contar por teléfono único subestima.** Varias hojas tienen pares que
comparten número —madre e hija, como Elda y Akeylah en Mérida— así que
deduplicar por teléfono los colapsa en uno. Por eso Mérida quedó en 15 y no en
14, y Córdoba en 20 y no en 19: **la cuenta de Supabase es la correcta.**

## Pendientes

- Ocho ciudades programadas con **cero alumnos**: Tlapacoyan, Teziutlán,
  Perote, Cd del Carmen, Campeche, Valladolid Yucatán, Puerto Escondido y
  Manzanillo. No es error de datos, es hueco comercial.
- La ciudad placeholder `Sin ciudad identificada (curso 360°)` con 46 alumnos
  de ciudad desconocida.
- Los otros cursos (*Postres Virales*, *Pastelería 360°*): ~50 hojas con datos
  de 2025 sin auditar.
- Confirmar el teléfono de Guadalupe Mariel (Los Mochis).

## Nota sobre datos personales

Este documento describe la lógica de las migraciones pero **no incluye nombres
ni teléfonos**. Los listados nominales se entregaron aparte y el SQL completo
queda en el historial de migraciones de Supabase, que ya es donde viven esos
datos. No tiene sentido replicarlos al repositorio.
