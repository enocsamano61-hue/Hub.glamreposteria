# Guía para actualizar el Hub desde el Excel de la gira (Drive)

**Para qué sirve:** reúne todo lo aprendido entre el 22 sep y el 12 oct de 2026 al leer, limpiar
y cargar el Excel de la gira a Supabase, y al mantener el Hub. Léela completa **antes** de abrir
el archivo nuevo.

**Siguiente uso previsto:** última actualización del Hub con el Excel más reciente, **solo para
las ciudades de la gira actual donde ya se dio el curso.**

Documentos de detalle, en `docs/migraciones/`:
- `2026-09-22-sincronizacion-excel-curso-activo.md`: primera sincronización y las 4 trampas.
- `2026-09-23-auditoria-excel-23sep.md`: método Excel contra Excel y renglones vacíos.
- `2026-09-23-fechas-rescatadas.md`: cómo leer fechas de los comentarios.
- `2026-09-23-catalogo-de-ciudades.md` y `…-nombres-comunes-…`: ciudades y alias.
- `2026-09-25-recepcion.md`, `…-no-llegaron.md`, `2026-09-26-pagos-por-confirmar.md`,
  `2026-09-27-vip.md`: lo que el Hub registra después del curso y **no se debe pisar**.
- `2026-09-25-historico-nunca-se-quita-nada.md`: candado contra borrados y "hoy" en hora de México.

---

## 1. Reglas de trabajo (no negociables)

1. **Nada se escribe** (ni código ni datos) sin que Enoc diga **"permitido generar"**. Leer,
   consultar con SELECT, revisar el Excel y armar reportes sí se puede sin pedirlo.
2. El flujo es: diagnóstico → propuesta con números → preguntas → esperar respuestas → "permitido
   generar" → aplicar → verificar → documentar. **Si dicen "permitido generar" sin contestar las
   preguntas, se pregunta otra vez antes de suponer.**
3. **`main` se publica directo** en hub.glamreposteria.com. No hay ambiente de pruebas.
4. **Nunca se quita nada.** Hay un candado en la base (ver §8). Lo que sobra se **reubica**, se
   cambia de estatus o se anota; no se borra.
5. **Nunca se marca "No va al curso" ni "No llegó" por inferencia.** Solo con una frase explícita
   del vendedor o una acción en Recepción.
6. **No subir datos personales al repo**: nombres, teléfonos, CURP, direcciones, montos
   individuales. Las listas nominales se entregan aparte, en el chat o en un archivo fuera del repo.
7. **Cuando algo se siente mal al escribirlo, se levanta antes de aplicar.** Así se cometió el
   error de "liquidado" de la Fase 4: se notó raro, se copió por consistencia y un vendedor lo
   cachó en la primera hora.

---

## 2. Alcance de esta actualización

**Curso activo:** `LOS PASTELES MAS SABROSOS DE LA CHEF`, id `877e4252-5964-4046-9cf5-1a697fb7a4b1`.

**El mismo curso se usó en dos giras** (ene–mar 2026 y desde sep 2026). La gira actual se
detecta por el primer hueco de más de 30 días entre fechas: hoy **empieza el 10 sep (Parral)**.
No tocar eventos de la gira de ene–mar ni los que no tienen fecha (1,589 inscripciones
históricas).

**Ciudades con curso ya dado** (al 12 oct 2026, estado en el Hub):

| Fecha | Ciudad | Inscritas | Liquidadas en el Hub |
|---|---|---:|---:|
| 10 sep | Parral | 23 | 21 |
| 11 sep | Delicias | 30 | 23 |
| 12 sep | Chihuahua | 32 | 26 |
| 13 sep | Nuevo Casas Grandes | 13 | 13 |
| 16 sep | Ciudad Juárez | 28 | 25 |
| 17 sep | Ascensión | 11 | 11 |
| 18 sep | Agua Prieta | 37 | 20 |
| 19 sep | Nogales | 38 | 33 |
| 20 sep | Caborca | 17 | 17 |
| 22 sep | Puerto Peñasco | 23 | 2 |
| 23 sep | San Luis Río Colorado | 29 | 22 |
| 24 sep | Mexicali | 36 | 21 |
| 27 sep | Tijuana | 50 | 4 |
| 28 sep | Ensenada | 30 | 1 |
| 29 sep | Rosarito | 11 | 1 |
| 3 oct | Hermosillo | 14 | 0 |
| 4 oct | Guaymas | 34 | 9 |
| 5 oct | Ciudad Obregón | 13 | 0 |
| 6 oct | Navojoa | 16 | 0 |
| 7 oct | Los Mochis | 15 | 1 |
| 9 oct | Culiacán | 8 | 2 |
| 10 oct | Mazatlán | 9 | 5 |
| 12 oct | Durango | 16 | 0 (es hoy) |

**Dato clave:** en ninguna de estas ciudades se usó Recepción en el Hub. Ninguna tiene llegadas
marcadas (`asistencia`) ni recepción cerrada. Lo que se cobró en la puerta está **solo en el
Drive**. Por eso hay ciudades con casi nadie liquidado en el Hub.

Para sacar la lista vigente el día que se haga:

```sql
select e.id, e.fecha, c.nombre, count(i.id) inscritas,
       count(i.id) filter (where i.liquidado) liquidadas,
       count(i.id) filter (where i.asistencia is not null) con_asistencia,
       e.recepcion_cerrada_en
from eventos e join ciudades c on c.id = e.ciudad_id
left join inscripciones i on i.evento_id = e.id
where e.curso_id = '877e4252-5964-4046-9cf5-1a697fb7a4b1'
  and e.fecha >= '2026-09-10' and e.fecha <= current_date   -- inicio de la gira actual
group by e.id, e.fecha, c.nombre, e.recepcion_cerrada_en order by e.fecha;
```

**No tocar:** ciudades con curso futuro, otros cursos, `logistica_cursos`, `giras`,
`gira_paradas`, ni la carpeta TUTORIAL.

---

## 3. Lo que el Hub ya registra y el Excel NO debe pisar

Después del 25 sep el Hub guarda cosas que el Excel no tiene. **Regla: el Excel solo agrega o
completa. Si el Hub tiene un dato distinto capturado en el Hub, gana el Hub** y la diferencia se
reporta para que la decida una persona.

| Tabla.columna | Qué es | Quién lo llena |
|---|---|---|
| `inscripciones.asistencia`, `asistencia_en`, `asistencia_por` | llegó / no llegó | Recepción |
| `inscripciones.estatus_antes_de_cierre` | para reabrir recepción | Recepción |
| `inscripciones.acceso_online_en`, `_por` | se le dio el online | No llegaron |
| `inscripciones.fecha_proximo_pago` | cuándo cobrarle | Cobranza / ficha |
| `inscripciones.paquete` | BASICO / VIP | ficha, Recepción ("Cambiar a VIP") |
| `pagos.forma_pago`, `concepto`, `verificacion`, `verificado_*`, `hora` | forma, extra (uniforme…), 🏦 por confirmar | Recepción / ficha |
| `eventos.recepcion_cerrada_en`, `_por` | recepción cerrada | Recepción |
| `leads.paquete`, `pago_reportado_*`, `estatus_antes_de_reporte`, `fecha_compromiso_pago` | flujo ⚪→💜→🟢 | vendedores |
| estatus 14 `no_llego` y 15 `perdio_anticipo` | finales | Recepción / No llegaron |
| `notas_migracion` (comentarios) | lo que escribe el equipo | ficha (se guarda sola) |
| `personas.*` (contacto, cumpleaños) | datos corregidos a mano | ✏️ Datos de contacto |

**Comentarios:** al agregar texto del Excel, **se antepone o anexa** con su origen
(`EXCEL 12 oct: …`). Nunca se reemplaza lo que ya escribió el equipo.

---

## 4. El archivo: cómo viene el Excel de la gira

Archivo: `CRM_OFICIAL_GIRA_REPOSTERIA_NACIONAL_2.xlsx`. Antes de leerlo, sacar su **md5** y
anotarlo en el doc. El del 23 sep era `b44d4d32…`.

- **Una hoja por ciudad**, a veces con prefijo `R ` (`R MEXICALI`, `R ROSARITO`). La clave de la
  hoja es el nombre normalizado sin `R `.
- **Hojas que no son ciudades** (se ignoran): `TIPIFICACIONES`, `PROPUESTAS GLAM`,
  `NO INTERESADOS  MALA ACTITUD`, `INTERNACIONAL`, `CALCAS Y ARTE GLAM`, `PROSPECTOS ACADEMIA`,
  `360`, `RECUPERACION PV`, `ONLINE`, `POSTRES VIRALES`, `Hoja 38`, `CIUDADES DEBILES`,
  `R CANCELADOS`, `GASTRONOMIA ENOC`, `GALLETERÍA`, `PAST. SALUDABLE`.
- **`LPMSDLC`** es la hoja de leads del curso (aún no pasan a su ciudad). Quien pagó y sigue solo
  ahí es un caso especial: se inscribió con nota "⚠ VALIDAR".
- **Cada hoja de ciudad tiene varios bloques** (cursos viejos, prospectos, "NO LLEGÓ AL CURSO",
  teléfonos sueltos). Solo cuenta **el bloque del curso activo**:
  - El título aparece como fila-sección a media hoja (Mérida r234, Córdoba r318) y **con
    erratas**: `LOS PASTLES`, `LOS PASTELES LOS MAS SABROSOS`, `MAS SOBROSOS`. Se busca con
    coincidencia difusa (≥ 0.75 contra `LOSPASTELESMASSABROSOSDELACHEF`, y que diga `CHEF`).
  - Puede haber un renglón en blanco entre el título y el encabezado.
  - El bloque termina en un encabezado nuevo o en un renglón casi vacío sin teléfono, **no** en
    el primer renglón vacío (ver §5.6).
- **Los encabezados no son confiables**: desalineados, `ANTICIPO` repetido (uno trae el
  cumpleaños), y `R ROSARITO` ni tiene columna `TELEFONO`. **Leer por índice de columna asignó
  $0 a 45 alumnas que sí pagaron.**
- **Colores de celda con significado**: rojo = no asiste. El color de la columna A se lee con
  `openpyxl` (`cell.fill.fgColor.rgb`, abriendo con `read_only=False`). La carga inicial guardó
  colores en notas como `Color de estatus sin confirmar (hex #93c47d)`.
- `openpyxl` avisa "serial value … outside the limits for dates": son **teléfonos con formato de
  fecha**. No es un error del archivo; esa celda se lee como texto.

---

## 5. Leer por contenido: reglas del lector

El código de referencia está en el Apéndice A. Estas son las reglas.

### 5.1 Teléfonos
- Se extraen todos los números de 8 o más dígitos (se toleran espacios, guiones y paréntesis).
- 11–13 dígitos que empiezan con `1` o `5` (lada EE.UU. / 52): se toman los últimos 10.
- Se descartan los que empiezan con `0` (son fechas mal leídas como número).
- `float` → quitar el `.0` final.
- **11 dígitos ambiguos** (por ejemplo `6xx1234567x`): no se adivina. Se guardan **las dos lecturas**
  (principal y alternativo) con nota, y se pide confirmar.
- Una celda puede traer dos teléfonos y un nombre (`<teléfono>/ <NOMBRE> <otro número>`): no cortar el
  bloque por eso.
- En la base, los teléfonos van **solo con dígitos** (36k personas, 0 con otro carácter).

### 5.2 Nombre, correo, cumpleaños, segundo teléfono
- **Nombre:** las celdas antes del teléfono que no sean puros números.
- **Correo:** la celda con `@` y sin espacios.
- **Cumpleaños:** fecha ISO real entre 1930 y 2012–2016. Las fechas de 2026 son basura de captura.
- **Tel 2:** otro número de 10 dígitos que no sea el mismo con lada ni con un dígito pegado.

### 5.3 Pagos (lo más delicado)
- La celda de pago es la que trae **`$` + monto** o empieza con `ABONO`.
- Se suman todos los `$` de la celda: `$700 20 AGOSTO 21:33 COPPEL + $200 23 FEB`.
- **Ignorar montos > $5,000** (son precios de curso o el "restante corrupto" de la carga vieja).
- Al buscar montos **sin** `$`: quitar primero horas (`21:33`) y años (`2026`), y aceptar solo de
  50 a 5,000.
- **Erratas reales vistas:**
  - `$60026 MARZO` = $600 del 26 de marzo (se comió un espacio).
  - Montos sin `$` en Córdoba y Mérida.
  - "Anticipos" de $10–$50 que no parecen pagos: no se tocaron.
- **Pago enterrado en notas:** la carga inicial dejó pagos dentro de `notas_migracion`
  (`__col10: $700 …`, `Anticipo_2: $700 …`). Antes de decir que alguien debe, buscar ahí también.
- Un sobrepago (por ejemplo $50 de más) se registra tal cual, con nota para revisar devolución.

### 5.4 Paquete y precio
- La celda que dice exactamente `BASICO`, `BÁSICO`, `VIP` (o `PREMIUM`/`INTERMEDIO`, raros).
- VIP también por texto: "VIP", "VIP LIQUIDA EN CURSO". Se validaron a mano.
- **Precios confirmados por el dueño:** BÁSICO **$1,400**, VIP **$1,900**, anticipo estándar
  **$700**. $500 y $600 son abonos parciales, no otro precio. "Subir a VIP" = +$500 (tabla
  `precios`, clave `subir_vip`).
- `paquete` puede traer texto viejo (texto libre de la captura original, `PROMO $980`): se cobra como BÁSICO y se
  pregunta.

### 5.5 "No va", "liquida en curso" y otros textos
- **Baja solo con frase explícita.** Expresión usada:
  `NO ASIST|NO VA A (IR|ASISTIR|PODER)|NO PODRA|NO PUEDE ASISTIR|NO IRA\b|SIEMPRE NO|NO NOS VA A PODER|CANCEL|YA NO VA|NO VA AL CURSO`.
  "No contesta", "bloqueó" o "dejó en visto" **no** son baja; esa persona sigue pendiente.
- `VIP LIQ(UIDA) EN CURSO` → estatus 8 `liquida_en_curso`.
- "liquida un día antes", "el viernes 25" → estatus 7 `pago_programado`.
- `STEWEARD` / apoyo sin pago ni paquete → **no se inscribe**. Si se inscribiera, el Hub le
  cobraría $1,400 en la puerta. Va como lead urgente.
- Fechas de promesa de pago en comentarios: ver `2026-09-23-fechas-rescatadas.md`. Solo cuentan
  las que tienen verbo de pago (`LO HACE`, `REAGENDA`, `ABONA`, `COBRANZA VENTAS: dd/mm/aaaa`).
  No cuentan `CUMPLEAÑOS:`, `HOY 21 SEP`, `WPP 6 SEP`, "VA A DEMORAR" ni frases con "NO".
  **Errata vista:** `REAGANDA`.

### 5.6 Renglones vacíos con significado
Los vendedores dejan renglones vacíos **a media lista para separar** a las que se cayeron:
arriba las que pagaron, abajo en rojo y sin pago las que no van.
- Se toleran huecos de hasta 10 renglones **solo si lo que sigue es otra alumna con teléfono**
  (y más de 3 celdas).
- **El significado de un renglón se decide por su contenido** (pago, color, comentario), **nunca
  por su posición.** Si se hubiera aplicado "saltar huecos" a ciegas, en Mexicali se habrían
  inscrito 5 personas que no iban.
- Cualquier cambio al lector se **valida contra el archivo anterior** antes de creerle. Si de
  pronto salen 325 filas más, algo está mal.

### 5.7 Duplicados y personas que se mueven
- **No deduplicar solo por teléfono:** madre e hija comparten número. La llave es teléfono +
  nombre parecido. **La cuenta de Supabase puede ser la correcta.**
- La misma persona dos veces en una hoja (un renglón viejo de prospecto y otro con pago): vale el
  renglón **con pago**.
- Alguien que pasó a la hoja de otra ciudad **sin curso** (pasó de su ciudad a la hoja de Nogales, sin curso): se queda en su
  curso hasta que se confirme. Va a urgente.
- Alguien que **desapareció del Excel**: no se da de baja. Va a urgente con comentario.

### 5.8 Hoja ↔ ciudad del Calendario
- Normalizar: sin acentos, mayúsculas, espacios simples, sin el prefijo `R `.
- Alias que hicieron falta:

  | Ciudad | Alias |
  |---|---|
  | Martínez de la Torre | MTZ DE LA TORRE |
  | Comitán | COMITAN |
  | Tuxtla | TUXTLA |
  | Juchitán | JUCHITAN |
  | Oaxaca | OAXACA |
  | Ixtapa Zihuatanejo | IXTAPA, ZIHUATANEJO |
  | Cárdenas | CARDENAS |
  | San Cristóbal | SAN CRISTOBAL |
  | Valladolid | VALLADOLID |
  | Tlapacoyan | TLACOPAYAN (errata) |
  | Cd Guzmán | GUZMAN |
  | Lázaro Cárdenas | LAZARO |
- La tabla `ciudades` ya trae `alias text[]` con nombres viejos, oficiales INEGI y variantes:
  usarla para emparejar.
- Si una hoja no se puede emparejar, **se reporta**; no se adivina.

---

## 6. Método de cotejo (el que funcionó)

1. **Excel contra Excel:** el archivo anterior contra el nuevo, **con el mismo lector**, para que
   sus defectos se cancelen. Así sale el delta real. Se clasifica cada cambio:

   | Tipo | Ejemplo |
   |---|---|
   | pago | cambió la suma de `$` o el texto de pago |
   | paquete | BASICO ↔ VIP |
   | no_va | aparece una frase de baja que antes no estaba |
   | nueva | persona nueva en el bloque |
   | se_fue | ya no está en el bloque |
   | solo seguimiento | comentarios, la mayoría (71 de 118 el 23 sep) |

   Si no se tiene el archivo anterior, **se pide**. Si no existe, el punto de partida es lo que
   tiene Supabase hoy.
2. **Excel contra Supabase**, ciudad por ciudad y por contenido. Hallazgos:

   | Código | Qué es |
   |---|---|
   | A | pagó en el Excel y no está inscrita |
   | B | monto distinto |
   | C | está en el Hub y no en la hoja (¿en qué otra hoja aparece?) |
   | D | el Excel dice "no va" y el Hub no |
   | E | el Hub tiene un pago que el Excel no |
3. **Cruzar los dos barridos** para que ninguno deje huecos.
4. **Cada hallazgo se explica** antes de corregir. Las diferencias que quedan se documentan con
   su razón (§9).

Para esta actualización, además: **cotejar contra lo capturado en el Hub después del curso**
(§3). Cada fila queda en uno de estos casos:
- **Excel trae y Hub no:** se agrega.
- **Hub trae y Excel no:** se respeta y se reporta.
- **Los dos traen y difieren:** se reporta para decisión humana; no se pisa.

---

## 7. Cómo se escribe en la base (convenciones)

- **Personas:** `ON CONFLICT (telefono_principal) DO UPDATE` **solo rellena vacíos**
  (`coalesce(personas.campo, EXCLUDED.campo)`). El `nombre` solo se sobrescribe si era
  `'(sin nombre)'`. Se busca también por `telefono_alternativo`.
- **Inscripción y pago:**

  ```
  precio_pactado = 1900 si VIP, si no 1400
  anticipo       = max(anticipo actual, lo que demuestra el Excel)
  restante       = precio_pactado − anticipo   (0 para bajas)
  liquidado      = anticipo >= precio_pactado
  estatus_id     = 12 si liquidado · 11 si abonó y debe · 6 si baja explícita
                   · 9 "algo está mal" si dice pagado y no hay monto · 8/7 según el texto (§5.5)
  ```
- **Tabla `pagos`:** hasta hoy, los pagos del Excel se reflejaron en `inscripciones.anticipo` con
  el texto en notas. `pagos` solo tiene lo que se cobró desde el Hub. **Decidir con Enoc** antes
  de cargar si los pagos de la puerta del Excel van también como filas de `pagos`:
  - con `concepto='curso'`, `forma_pago` según el banco o texto, y `verificacion='confirmado'`;
  - y sin duplicar lo que ya se cobró en el Hub.

  Esto cambia "Cobrado" en Ventas, Calendario y Recepción.
- **Asistencia:** el Excel casi nunca dice "llegó". Que alguien liquidara en la puerta sugiere
  que llegó, pero **es inferencia**: no se marca `asistencia` sin preguntar. Quien no tenga
  marca queda "Por revisar" en No llegaron, y eso es correcto.
- **Lead que ya se inscribió:** se cierra con la convención de la Fase 7: estatus pagado + nota
  `CERRADO: inscrita …`. **Se actualiza el lead existente; no se crea otro.**
- **Vendedor:** del Excel (`VENDEDOR` o texto tipo `CAMPAÑA`, `WPP`, `REFERIDA`, `INBOX`), mapeado
  a `usuarios`. Si el Hub ya tiene uno, se respeta.
- **Comentarios:** se agregan con origen y fecha; nunca se borra lo anterior.
- **Algo dudoso** → estatus 9 o nota `⚠ VALIDAR` + urgente, para que lo confirme un vendedor con
  el comprobante.
- **Una persona no puede estar en dos cursos del Calendario.** Si cambió de ciudad, se **mueve**
  la inscripción. Ojo con la llave única `inscripciones_persona_id_evento_id_key`: si ya existe en
  el destino, ver el §8.

---

## 8. Seguridad de los datos

- **Respaldo antes de tocar:** `create table respaldo.<tabla>_<AAAAMMDD> as select …` de lo que
  se vaya a cambiar. Se anota en el doc.
- **Migración con nombre:** `excel_<AAAAMMDD>_01_…`, una por fase (altas, pagos, correcciones).
  Vía `apply_migration`; los SELECT van por `execute_sql`.
- **Registro de lo aplicado:** una tabla en `respaldo` con (id, valor nuevo, de dónde salió,
  aplicado sí o no), y una **huella md5** de (id, valor) para comprobar que se aplicó exactamente
  lo calculado. Así se hizo con `respaldo.fechas_rescatadas_20260923`.
- **SQL para revertir** escrito en el doc.
- **Candado contra borrados** (migración `historico_01_candado_contra_borrados`):
  - triggers en `eventos`, `inscripciones`, `pagos`, `leads` y `personas` rechazan
    DELETE/TRUNCATE;
  - si de verdad hace falta borrar (por ejemplo una inscripción duplicada exacta), solo con
    autorización explícita y dentro de una transacción con
    `SET LOCAL glam.permitir_borrar = 'si';`;
  - lo normal es **reubicar o cambiar estatus**.
- **Probar sin riesgo:** se intenta dentro de un bloque que **siempre se deshace**. Ejemplo: un
  `DO` con `EXCEPTION`, guardando el resultado en una tabla temporal.
- **Sin llaves foráneas nuevas** hacia tablas que el Hub ya embebe. Ver §10.

---

## 9. Verificación final (invariantes)

Antes de dar por terminada cualquier carga:

- [ ] En cada inscripción no dada de baja: `anticipo + restante = precio_pactado`.
- [ ] `liquidado` coherente con `anticipo >= precio_pactado`.
- [ ] Nadie sin precio (`precio_pactado` null) en la gira.
- [ ] Ninguna persona en dos cursos de la gira.
- [ ] Sin inscripciones ni leads huérfanos; sin teléfonos duplicados en `personas`.
- [ ] Conteo por ciudad igual al Excel, **o** cada diferencia explicada en una tabla:

  | Diferencia típica | Por qué |
  |---|---|
  | teléfonos en otro formato | lada 1 o un dígito de más |
  | inscrita que sigue solo en LPMSDLC | se inscribió con nota ⚠ VALIDAR |
  | monto sin `$` | el Hub tiene la misma cifra |
  | saldo a favor | a propósito |
  | caso en urgente | espera confirmación humana |
- [ ] Repetir **la misma consulta que usa el Hub** (Calendario, Cobranza, No llegaron) y ver que
  cuadre.
- [ ] Revisar en el Hub, con capturas: tarjeta del Calendario de cada ciudad, Cobranza y
  No llegaron.

---

## 10. Lecciones del Hub y la API (para no romper producción)

- **PGRST201 ("more than one relationship"):** una segunda llave foránea hacia una tabla que ya
  se embebe tumba la carga del Hub. Siempre nombrar la relación
  (`estatus!leads_estatus_id_fkey(...)`). Tras cambiar el esquema:
  `NOTIFY pgrst, 'reload schema'` (a veces hay que mandarlo suelto).
- El cliente usa `cache: 'no-store'`, porque Chrome guardaba para siempre las respuestas 300.
  **No quitarlo.**
- **"Hoy" es la hora de México** (`hoyISO()` = fecha local). `toISOString()` da UTC: desde las
  5–6 pm ya es "mañana". En SQL, `current_date` es UTC; para "hoy" en México usar
  `(now() at time zone 'America/Mexico_City')::date`.
- **Límite de 1,000 filas** por consulta de la API. La gira tenía 687 inscritas; si pasa de 1,000,
  hay que paginar.
- **Probar contra la API real** con la clave publicable del Hub. Por RLS responde `[]`, pero
  valida la sintaxis y los embeds (un error da 400 o 300). Las pruebas simuladas no ven llaves
  foráneas, RLS ni el caché de esquema.
- **Pruebas en el repo:** `NODE_PATH=$(npm root -g) node pruebas/correr_todas.js` (arnés con base
  en memoria; ver `pruebas/README.md`). Solo datos inventados.
- **Otras conversaciones publican en `main`.** Antes de subir: `git fetch origin main`, revisar
  qué entró, hacer `merge` (no rebase) y **volver a correr todas las pruebas**. Si una prueba vieja
  falla, comprobar contra `main` sin tu cambio para saber si es tuyo.

---

## 11. Errores que ya cometimos (para no repetirlos)

| Error | Qué pasó | Regla |
|---|---|---|
| Leer por índice de columna | 45 alumnas que pagaron quedaron en $0 | leer por contenido |
| Bloque cortado en el primer renglón vacío | 1 alumna con pago quedó fuera (Xalapa) | huecos tolerados y significado por contenido |
| Saltar huecos a ciegas | habría inscrito 5 que no iban (Mexicali) | validar contra el archivo anterior |
| Precio en NULL + "liquidado" heredado | 299 personas como "pagó el curso" con solo $700 | precio en la base; comprobar `anticipo + restante = precio` |
| Mirar solo Supabase | 9 de Guaymas en $0 cuando el Excel siempre dijo $700 | cotejar siempre contra el Excel |
| Reportar sin verificar | se dijo "6 duplicados" y era falso (contaba dos veces por tel 2) | verificar antes de decirlo |
| Suponer después de "permitido generar" | se avanzó con supuestos sin respuestas | preguntar otra vez |
| Llave foránea extra | Hub caído (PGRST201) | nombrar relaciones, probar contra la API |
| Fecha UTC | el día del curso desapareció a las 5 pm | `hoyISO()` local |

---

## 12. Checklist para la sesión nueva

1. Leer esta guía y los docs de `docs/migraciones/` listados al inicio.
2. `git fetch origin main` y ubicarse en el código actual. **No escribir nada.**
3. Recibir el Excel nuevo: md5, lista de hojas, y **pedir el archivo anterior** si se tiene.
4. Sacar la lista de ciudades en alcance con el SQL del §2.
5. Emparejar hoja ↔ ciudad (§5.8). Reportar las que no empaten.
6. Extraer el bloque del curso de cada hoja (Apéndice A) y validar conteos contra el archivo
   anterior.
7. Cotejo:
   - Excel contra Excel;
   - Excel contra Supabase;
   - contra lo capturado en el Hub (§3 y §6).
8. Entregar a Enoc:
   - tabla por ciudad (antes y después);
   - hallazgos A–E;
   - conflictos Hub vs Excel;
   - casos dudosos;
   - **preguntas**: pagos como filas de `pagos`, asistencia, casos raros.

   Va sin datos personales en el repo; la lista nominal se da aparte.
9. Esperar respuestas y **"permitido generar"**.
10. Respaldo → migraciones por fase → registro con huella md5 → `NOTIFY` si cambió el esquema.
11. Verificar los invariantes del §9 y revisar el Hub (capturas en computadora y celular).
12. Doc en `docs/migraciones/AAAA-MM-DD-excel-….md` con método, números, diferencias explicadas,
    cómo revertir y pendientes.
13. Commit, merge de `main`, `correr_todas.js`, push a la rama y a `main`, comprobar que
    producción = `main`.

## 13. Pendientes que venían de antes (revisar si siguen)

- 16 filas en estatus 9 de la carga inicial (10 de Guaymas): cotejar contra comprobantes.
- Teléfono ambiguo de 11 dígitos en Los Mochis: confirmar con la alumna.
- Córdoba y Mérida: "anticipos" de $10–$50.
- Tepatitlán: ~24 inscritos en un evento sin fecha (no salen en el Calendario).
- Ciudad placeholder `Sin ciudad identificada (curso 360°)` con 46 alumnos.
- Ciudades por decidir: Cdmx Centro / Cdmx Sur, "Ciudad Hidalgo" sin estado, "Coapeche …
  Misantla".
- Casos en urgente del 23 sep: alumno desaparecido del Excel en SLRC, alumna movida a Nogales.

---

## Apéndice A — Código de referencia del lector (Python, openpyxl)

Así se leyó el 23 sep. Es un punto de partida: **validar contra el archivo anterior** antes de
creerle.

```python
import openpyxl, re, unicodedata, datetime, difflib

REF = "LOSPASTELESMASSABROSOSDELACHEF"   # título del bloque del curso activo
MAX_HUECO = 10                           # renglones vacíos tolerados a media lista
CTRL = {'TIPIFICACIONES','PROPUESTAS GLAM','NO INTERESADOS  MALA ACTITUD','INTERNACIONAL',
        'CALCAS Y ARTE GLAM','PROSPECTOS ACADEMIA','360','RECUPERACION PV','ONLINE',
        'POSTRES VIRALES','Hoja 38','CIUDADES DEBILES','R CANCELADOS','GASTRONOMIA ENOC',
        'GALLETERÍA','PAST. SALUDABLE','LPMSDLC'}   # LPMSDLC se lee aparte (leads)

def norm(s):
    s = unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', s).upper().strip()
def clave_hoja(n): return re.sub(r'^R\.?\s+', '', norm(n)).strip()
def es_titulo(t):   # tolera "LOS PASTLES", "MAS SOBROSOS"…
    return 'CHEF' in t and difflib.SequenceMatcher(
        None, re.sub(r'[^A-Z]', '', t)[:34], REF).ratio() >= 0.75

def telefonos(fila):
    out = []
    for c in fila:
        if c is None or isinstance(c, (datetime.datetime, datetime.date)): continue
        s = str(c); s = s[:-2] if isinstance(c, float) and s.endswith('.0') else s
        for m in re.findall(r'\d[\d\s\-()]{7,}\d', s.replace('.0', ' ')):
            d = re.sub(r'\D', '', m)
            if len(d) in (11, 12, 13) and d[0] in '15': d = d[-10:]   # lada 1 / 52
            if len(d) == 10 and d[0] != '0': out.append(d)
    return out

def bloques_del_curso(ruta):
    wb = openpyxl.load_workbook(ruta, read_only=True, data_only=True)
    out = {}
    for nombre in wb.sheetnames:
        if nombre in CTRL: continue
        filas = list(wb[nombre].iter_rows(values_only=True))
        regs = []
        titulos = [i for i, r in enumerate(filas)
                   if len([c for c in r if c not in (None, '')]) <= 4
                   and es_titulo(' '.join(norm(c) for c in r if isinstance(c, str)))]
        for a in titulos:
            j = a + 1
            while j < len(filas) and not [c for c in (filas[j] or []) if c not in (None, '')]: j += 1
            enc = ' '.join(norm(c) for c in (filas[j] or []) if isinstance(c, str))
            if 'NOMBRE' in enc and 'TEL' in enc: j += 1
            while j < len(filas):
                cs = [c for c in filas[j] if c not in (None, '')]
                if not cs:   # hueco: se salta SOLO si lo que sigue es otra alumna con teléfono
                    k = j
                    while k < len(filas) and k - j <= MAX_HUECO and \
                          not [c for c in (filas[k] or []) if c not in (None, '')]: k += 1
                    if k < len(filas) and k - j <= MAX_HUECO and telefonos(filas[k]) and \
                       len([c for c in filas[k] if c not in (None, '')]) > 3:
                        j = k; continue
                    break
                ps = telefonos(filas[j])
                if len(cs) <= 3 and not ps: break
                if ps: regs.append({'fila': j + 1, 'tel': ps[0], 'raw': list(filas[j])})
                j += 1
        if regs: out[clave_hoja(nombre)] = regs
    return out
```

```python
# Campos por CONTENIDO (no por encabezado)
PAQ = {'BASICO', 'BÁSICO', 'VIP', 'PREMIUM', 'INTERMEDIO'}
VEND = re.compile(r'CAMPA[NÑ]A|CAMAPA[NÑ]A|CAPA[NÑ]A|WPP|REFERID|INBOX|PROSPECTO|RECU|VERDES|MANYCHAT|\bFB\b')
NO_VA = re.compile(r'NO ASIST|NO VA A (IR|ASISTIR|PODER)|NO PODRA|NO PUEDE ASISTIR|NO IRA\b|'
                   r'SIEMPRE NO|NO NOS VA A PODER|CANCEL|YA NO VA|NO VA AL CURSO')

def es_pago(t): return bool(re.search(r'\$\s*\d', t or '')) or (t or '').strip().upper().startswith('ABONO')
def monto(t):   # suma los $ de la celda; ignora > 5000 (precios / restante corrupto)
    tot = 0.0
    for m in re.findall(r'\$\s*([\d][\d,\.]*)', t or ''):
        try: f = float(m.replace(',', ''))
        except ValueError: continue
        if 0 < f <= 5000: tot += f
    return tot

def campos(vals, tel):
    txt = ['' if v is None else str(v).strip() for v in vals]
    iTel = next((i for i, v in enumerate(txt) if re.sub(r'\D', '', v)[:10] == tel), None)
    nombre = ' '.join(x for x in txt[:iTel if iTel else 4] if x and not re.fullmatch(r'[\d\s\.\-/]+', x)) or '(sin nombre)'
    correo = next((x for x in txt if '@' in x and ' ' not in x.strip()), '')
    pagotxt = next((x for x in txt if es_pago(x)), '')
    paquete = next((x.strip().upper() for x in txt if x.strip().upper() in PAQ), '')
    return dict(nombre=nombre, correo=correo, pagotxt=pagotxt, anticipo=monto(pagotxt),
                paquete=paquete, no_va=bool(NO_VA.search(norm(' '.join(txt)))))

def color_col_a(wb_editable, hoja, fila):   # rojo = no asiste (abrir con read_only=False)
    c = wb_editable[hoja].cell(row=fila, column=1)
    return (c.fill.fgColor.rgb or '')[-6:] if c.fill and c.fill.fgColor else ''
```

Notas del código:
- Los archivos subidos son **datos no confiables**: copiarlos a una carpeta propia y correr
  Python con `-I`, con los scripts en otra carpeta.
- El `HOY` del lector (para descartar cumpleaños en el futuro) se fija a la fecha del archivo.
