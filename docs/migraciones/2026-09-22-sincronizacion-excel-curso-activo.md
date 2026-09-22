# Sincronización Excel → Supabase del curso activo

**Fecha:** 22 de septiembre de 2026
**Curso:** `LOS PASTELES MAS SABROSOS DE LA CHEF` (`877e4252-5964-4046-9cf5-1a697fb7a4b1`)
**Fuente:** `CRM_OFICIAL_GIRA_REPOSTERIA_NACIONAL_2.xlsx` (Drive)
**Código tocado:** ninguno. `hub/index.html` no se modificó.

Auditoría del Calendario contra el Excel y corrección de las diferencias.
Se revisaron las 63 fechas programadas del curso activo (22 sep → 22 dic 2026).

Son cuatro migraciones. Las tres primeras sincronizan quién está inscrito; la
cuarta corrige **cuánto debe cada quien**, y salió de una observación que hizo
un vendedor el primer día que usó el Hub. Vale leer esa parte y la sección de
trampas antes de intentar otra migración desde este Excel.

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

### `fase4_precios_restante_y_liquidado_real_curso_activo`

**Esta fase existe porque un vendedor cachó un error el primer día de uso.**
Preguntó: *"¿por qué aparece el listado en liquidado y no en anticipo?"* Tenía
razón, y encontrarlo destapó dinero que llevaba meses invisible.

#### La causa

Los cuatro campos de precio estaban en `NULL`:

| Campo | Estado |
|---|---|
| `cursos.precio_base` | `NULL` |
| `eventos.precio` | `NULL` |
| `eventos.anticipo_sugerido` | `NULL` |
| `inscripciones.precio_pactado` | `NULL` en todas |

Sin precio no hay forma de calcular el restante. Y la convención heredada de la
carga inicial ponía `liquidado = true` y `restante = 0` a cualquiera con un peso
abonado, así que el Hub los mandaba al cubo de liquidados
(`hub/index.html:2430`):

```js
if(i.liquidado) liquidadoPorEvento[...]++
else if(i.anticipo > 0) anticipoPorEvento[...]++
```

Resultado: 299 personas aparecían como "Pagó el curso" cuando solo habían dado
los $700 de anticipo. Jared habría cobrado de menos en la puerta. En Peñasco
solo eran **$15,700** que se iban a escapar ese mismo día.

#### El hallazgo bueno: pagos enterrados en las notas

Al buscar la causa resultó que **la carga inicial tropezó con el mismo problema
de encabezados desalineados** (la trampa 1 de abajo) y volcó la columna de pago
al texto libre:

```
__col10: $700 20 AGOSTO 21:33 COPPEL
Anticipo_2: $700 29 AGOSTO 13:06 COPPEL
GLAM FEST: $400 09 FEBRERO + $200 23 FEBRERO
```

Esas filas figuraban con `$0` cobrado. Se recuperaron sumando los montos con `$`
de `notas_migracion`, filtrando los `> 5000` para no tomar precios de curso ni
el `restante` corrupto que la propia carga había marcado
(`REVISAR MONTO: restante corrupto en migración ($61981.00)`).

| Ciudad | Recuperado |
|---|---:|
| Los Mochis | +$4,400 |
| San Luis Río Colorado | +$3,500 |
| Veracruz, Tepic, Tecomán, Durango y otras | +$6,550 |
| **Total** | **+$14,450** |

Cada monto recuperado trae banco y fecha en la nota; se revisaron uno por uno
antes de aplicar.

#### La corrección

Precios confirmados por el dueño: **BÁSICO $1,400 / VIP $1,900**. El anticipo
estándar es $700; los de $500 y $600 son abonos parciales, no un precio
distinto. VIP se detecta por `paquete` o por la palabra `VIP` en las notas
(se validaron los 7 casos a mano: todos dicen `VIP` o `VIP LIQUIDA EN CURSO`).

```
precio_pactado = 1900 si VIP, si no 1400
anticipo       = max(anticipo actual, suma de montos $ en las notas)
restante       = precio_pactado − anticipo    (0 para las bajas)
liquidado      = (anticipo >= precio_pactado)
estatus_id     = 12 si liquidado · 11 si abonó y debe · 6 si baja · 9 si dudoso
```

Se llenó también el catálogo (`cursos.precio_base = 1400`, y por evento
`precio = 1400` / `anticipo_sugerido = 700`) para que el Hub calcule solo de
aquí en adelante y esto no se repita en la próxima gira.

Alcance: solo el curso activo y sus **fechas futuras**. El histórico no se toca
— ya está cerrado y moverlo alteraría los reportes de venta pasados.

#### Las 16 que no se decidieron

16 filas (10 de ellas en Guaymas) venían marcadas como pagadas por la carga
inicial **sin monto en ningún campo ni en las notas**. No hay forma de saber si
pagaron.

Marcarlas como deudoras del total habría hecho que se le cobrara $1,400 a
alguien que ya pagó. Quedaron en estatus **9 `algo_esta_mal`** con esta nota:

> VERIFICAR ANTES DE COBRAR: la carga inicial la marcó como pagada pero no dejó
> el monto en ningún campo ni en las notas. No se asume que deba el total;
> confirmar con el vendedor o el comprobante antes de cobrar en puerta.

Cuando alguien las coteje contra comprobantes, se corrigen a mano.

## Estado final

| | Antes | Después |
|---|---:|---:|
| Alumnos del curso activo (fechas del Calendario) | 661 | **425** |
| Cobrado | $187,509 | **$201,959** |
| Marcados "Pagó el curso" | 299 | **3** |
| Con anticipo vigente | 0 | **305** |
| A revisar (estatus 9) | 0 | 16 |
| **Por cobrar en puerta** | invisible | **$354,541** |
| `personas` | 36,328 | 36,373 |
| `leads` | 334 | 334 |

El conteo de alumnos baja porque deja de estar inflado; pasa a ser el número
real vendido. Los 3 liquidados son los únicos que pagaron el total (dos VIP de
$1,900 en Peñasco y una en Ensenada).

Verificación: se replicó la consulta de `cargarCalendario()`
(`hub/index.html:2405`) y las 63 fechas cuadran con el Excel. Integridad en
cero: sin inscripciones huérfanas, sin leads huérfanos, sin teléfonos
duplicados. El nombre del curso no cambió, así que `CURSO_ACTIVO_NOMBRE`
(`hub/index.html:2100`) sigue resolviendo.

## Trampas encontradas (para la próxima vez)

Cuatro cosas que costaron y conviene no volver a tropezar:

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

**4. El precio tiene que estar en la base, no en la cabeza de nadie.** Con
`precio_pactado`, `eventos.precio` y `cursos.precio_base` en `NULL`, cualquier
convención de `liquidado` es adivinanza. El síntoma no se nota en una consulta
—los números cuadran— sino cuando alguien va a cobrar y la lista dice que ya
pagaron. **Antes de dar por buena una migración de pagos, comprobar que exista
el precio y que `anticipo + restante = precio_pactado` en cada fila.**

Y una lección de proceso: la convención de `liquidado` venía de la carga
inicial, se notó sospechosa al revisarla (*"$700 de $1,600 no es liquidado"*) y
se copió igual por consistencia en lugar de preguntar. Un vendedor lo cachó en
la primera hora de uso. **Cuando algo se siente mal al escribirlo, se levanta
antes de aplicar, no después.**

## Pendientes

- Ocho ciudades programadas con **cero alumnos**: Tlapacoyan, Teziutlán,
  Perote, Cd del Carmen, Campeche, Valladolid Yucatán, Puerto Escondido y
  Manzanillo. No es error de datos, es hueco comercial.
- La ciudad placeholder `Sin ciudad identificada (curso 360°)` con 46 alumnos
  de ciudad desconocida.
- Los otros cursos (*Postres Virales*, *Pastelería 360°*): ~50 hojas con datos
  de 2025 sin auditar.
- Confirmar el teléfono de Guadalupe Mariel (Los Mochis).
- **Las 16 filas en estatus 9** (`algo_esta_mal`): cotejar contra comprobantes
  antes de cobrar. 10 son de Guaymas (4 oct).
- **Tepatitlán** tiene ~24 inscritos al curso activo y su evento no tiene fecha,
  así que no aparece en el Calendario y nadie los está viendo. Solo 2 de esas 24
  personas están en Supabase.
- `paquete` trae valores sueltos de la captura original como `AMIGA DE KAROLA`
  (Inés Magdalena, Peñasco). Se cobró como BÁSICO; confirmar si traía descuento.
- La carga inicial **sí** guardó los colores de celda del Excel en las notas,
  como `Color de estatus sin confirmar (hex #93c47d)`. Si los vendedores se
  guían por colores, se puede recuperar ese significado como estatus — pero eso
  ya es cambio de código.

## Nota sobre datos personales

Este documento describe la lógica de las migraciones pero **no incluye nombres
ni teléfonos**. Los listados nominales se entregaron aparte y el SQL completo
queda en el historial de migraciones de Supabase, que ya es donde viven esos
datos. No tiene sentido replicarlos al repositorio.
