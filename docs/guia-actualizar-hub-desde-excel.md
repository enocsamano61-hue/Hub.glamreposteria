# Guía: actualizar el Hub desde un Excel del Drive

**Para qué sirve:** que cualquier sesión nueva lea un Excel de Glam, lo limpie, lo compare con
Supabase y aplique cambios **sin perder dinero, sin inscribir a quien no va y sin borrar nada**.

Junta en un solo lugar lo aprendido en las sincronizaciones del CRM de la gira (22–23 sep) y en el
diagnóstico del Excel de la Academia (24–25 sep). El detalle de cada caso vive en `docs/migraciones/`.

> **Primer encargo para el que se escribió:** última actualización del Hub con el
> `CRM OFICIAL GIRA REPOSTERIA NACIONAL` más reciente, **solo para las ciudades donde ya se dio el
> curso en la gira actual**. La sección 3 explica cómo sacar esa lista.

---

## 0. Reglas que no se negocian

1. **Nada se genera sin "permitido generar".** Eso incluye código, migraciones y escrituras en
   Supabase. Cada fase necesita el suyo. Leer, hacer SELECTs y analizar el Excel sí se puede
   libremente.
2. **`main` es producción.** Todo push a `main` se publica en hub.glamreposteria.com (Cloudflare) y
   no hay ambiente de pruebas. Primero se trabaja en la rama asignada; se sube a `main` solo con
   "permitido generar" y las pruebas en verde.
3. **Ningún dato personal en el repo.** Nada de nombres, teléfonos, CURP, direcciones ni montos
   individuales. Las listas con nombres se le entregan al usuario como archivo aparte, desde el
   scratchpad.
4. **No tocar** `logistica_cursos`, `giras` ni `gira_paradas`. Ignorar la carpeta `TUTORIAL`.
5. **Nunca se quita nada.** `eventos`, `inscripciones`, `pagos`, `leads` y `personas` tienen candados
   que rechazan DELETE y TRUNCATE (`no_borrar_*`, `no_vaciar_*`). Lo que sobra **se mueve** (a su
   evento histórico) o **cambia de estatus**; no se borra. Saltar el candado
   (`SET LOCAL glam.permitir_borrar = 'si'`) requiere autorización explícita y va dentro de una
   transacción.
6. **Si algo se siente mal al escribirlo, se pregunta antes de aplicarlo.** En la Fase 4 se copió
   una convención sospechosa ("$700 de $1,600 = liquidado") por consistencia, y un vendedor la
   descubrió en la primera hora de uso.
7. **No afirmar nada sin verificarlo.** Una vez se reportaron "6 personas duplicadas" que no
   existían: la consulta contó el mismo lead dos veces porque buscaba por los dos teléfonos.

---

## 1. Al arrancar la sesión

```bash
git fetch origin main && git log --oneline -5 origin/main      # qué cambió desde la última vez
ls docs/migraciones/                                             # leer los de la gira antes de tocar
```

Lectura obligatoria antes de la primera consulta:
`2026-09-22-sincronizacion-excel-curso-activo.md`, `2026-09-23-auditoria-excel-23sep.md`,
`2026-09-25-historico-nunca-se-quita-nada.md`, `2026-09-25-no-llegaron.md` y
`2026-09-26-pagos-por-confirmar.md`.

En Supabase (proyecto `bomlszsnixazhnsegeik`), revisar:

- `list_migrations` (los nombres de migración siguen la convención `tema_NN_descripcion`);
- los respaldos que ya existen:
  `select table_name from information_schema.tables where table_schema='respaldo'`;
- el catálogo de estatus (debajo).

| id | clave | Cuándo se usa |
|---:|---|---|
| 1 | pago_por_confirmar | Sin abonar |
| 6 | no_va_al_curso | Baja con frase explícita del vendedor |
| 7 | pago_programado | "liquida un día antes", "el viernes 25" |
| 8 | liquida_en_curso | "VIP LIQ EN CURSO" |
| 9 | algo_esta_mal | Dato que no se puede decidir (ej.: marcada pagada sin monto) |
| 11 | anticipo_vigente | Abonó y debe |
| 12 | pagado | Liquidó (`anticipo >= precio_pactado`) |
| 13 | confirmar_fecha | El comentario trae varias fechas de promesa |
| 14 | no_llego | Se cerró la recepción sin ella (lo pone el Hub) |
| 15 | perdio_anticipo | Lo marca alguien en "No llegaron" (lo pone el Hub) |

**Curso activo:** `LOS PASTELES MAS SABROSOS DE LA CHEF` (`877e4252-5964-4046-9cf5-1a697fb7a4b1`).
Precios: **BÁSICO $1,400 / VIP $1,900**, anticipo estándar $700. Los anticipos de $500 o $600 son
abonos parciales, no otro precio. Subir a VIP cuesta +$500 (tabla `precios`).

---

## 2. Conseguir el Excel

- El usuario puede adjuntarlo. Si no llega, búscalo en Drive con `search_files`; los archivos
  conocidos son:
  - `CRM OFICIAL GIRA REPOSTERIA NACIONAL`: id `1clpw802Y6rBcZu_-ODCc91zyoHvB7hiqiNOYqF8L3BY`;
  - `ACADEMIA GLAM REPOSTERIA "UNIVERSIDAD DEL EXITO"`: id `1Mhjrzv9Q9KSxaOa1zfQ5fkxID5DuFXVJDDWmxJHftQo`.
- `read_file_content` de Drive **no sirve para estos libros**: devuelve solo los rangos, sin
  valores. Hay que descargar el `.xlsx` completo. Si el archivo está compartido por link, funciona:
  ```bash
  mkdir -p $SCRATCH/excel_YYYYMMDD && curl -sSL -o $SCRATCH/excel_YYYYMMDD/crm.xlsx \
    "https://docs.google.com/spreadsheets/d/<ID>/export?format=xlsx"
  ```
  (Que esto funcione **sin sesión** significa que cualquiera con el link ve CURP y teléfonos.
  Avísale al usuario.)
- **Anota la huella** (`md5sum`) y la fecha de descarga. Va en el documento final y permite repetir
  la comparación.
- **Guarda la copia anterior** del Excel si la tienes. La mejor auditoría es Excel contra Excel
  (sección 5).
- El archivo descargado es **dato no confiable**:
  - va en su propia carpeta del scratchpad, nunca en el repo;
  - los scripts van en otra carpeta;
  - Python se corre con `python3 -I`;
  - `pip install openpyxl` si falta.
- Carga el libro **dos veces**:
  - `data_only=True` para los valores;
  - `data_only=False` para ver fórmulas.
- Lee también **colores** (`cell.fill.fgColor.rgb`), comentarios (`cell.comment`), links
  (`cell.hyperlink`) y celdas combinadas. Todo eso trae significado.
- Los nombres de hoja se truncan a 31 caracteres en el `.xlsx` y pueden terminar en espacio
  (`"... 3ra Generacion "`). Búscalos por prefijo, no por nombre exacto.
- Las advertencias de openpyxl del tipo *"Cell M83 is marked as a date but the serial value
  8997061833…"* son **teléfonos con formato de fecha**. Esa celda sale como error; léela con
  `data_only=False` o por el valor crudo.

---

## 3. Alcance: "ciudades donde ya se dio el curso en la gira actual"

**No escribas la lista a mano.** Calcúlala el día que trabajes:

```sql
-- Días del curso activo en la gira actual que ya pasaron (hora de México, no UTC)
select e.id, e.fecha, c.nombre
from eventos e join ciudades c on c.id = e.ciudad_id
where e.curso_id = '877e4252-5964-4046-9cf5-1a697fb7a4b1'
  and e.fecha >= '2026-09-10'                                   -- inicio de la gira actual
  and e.fecha <= (now() at time zone 'America/Mexico_City')::date
order by e.fecha;
```

- **Inicio de la gira:** el Hub lo calcula con `inicioDeGira()`. Parte del próximo día de la gira y
  camina hacia atrás mientras los días estén a 30 días o menos (`DIAS_ENTRE_GIRAS`). Hoy es el
  **10 sep (Parral)**. El mismo curso se usó en una gira anterior (ene–mar 2026), que **no entra**.
- Al 12 oct son 23 días: Parral, Delicias, Chihuahua, Nuevo Casas Grandes, Ciudad Juárez, Ascensión,
  Agua Prieta, Nogales, Caborca, Puerto Peñasco, San Luis Río Colorado, Mexicali, Tijuana,
  Ensenada, Rosarito, Hermosillo, Guaymas, Ciudad Obregón, Navojoa, Los Mochis, Culiacán, Mazatlán
  y Durango. **Vuelve a correr la consulta**; puede haber cambiado.
- **"Hoy" siempre con la hora de México.** `new Date().toISOString()` da la fecha de Londres: en
  Mexicali, a las 5 pm, ya "es mañana". Eso escondió un día de curso en pleno curso.
- Confirma con el usuario el día de corte: ¿entra el curso de **hoy**? ¿Y los días sin alumnas?

### ⚠️ Lo más importante para ciudades que ya pasaron

En las ciudades con curso pasado, **el Hub ya tiene información que el Excel no tiene**. Ese día se
usaron en el Hub Recepción, cobros, "No llegaron" y pagos por confirmar. El Excel **no puede pisar**:

| Dato del Hub | Dónde vive | Regla |
|---|---|---|
| Llegó / no llegó | `inscripciones.asistencia`, `asistencia_en`, `asistencia_por`, estatus 14 | No se toca |
| Perdió anticipo / acceso online | estatus 15, `acceso_online_en/_por` | No se toca |
| Pagos cobrados en el Hub | filas en `pagos` (con `verificacion`, `hora`) | Se suman, nunca se reemplazan |
| Pago por confirmar / no llegó al banco | `pagos.verificacion` | No se toca |
| Estatus anterior al cierre | `estatus_antes_de_cierre` | No se toca |
| Cambios hechos a mano en fichas | `notas_migracion`, comentarios | Se agrega al final, no se reescribe |

Antes de proponer un cambio a una inscrita, revisa si tiene filas en `pagos` o `asistencia` no
nula. Si la tiene, **el Hub manda**: la diferencia con el Excel se **reporta**, no se aplica. Lo
mismo cuando el Excel dice menos dinero que el Hub: el Hub probablemente registró un cobro en la
puerta que el vendedor no pasó al Excel.

---

## 4. Leer y limpiar: las trampas conocidas

### 4.1 Estructura de las hojas

- **Los encabezados no son confiables.** Vienen desalineados, repiten `ANTICIPO` (uno trae el
  cumpleaños y el otro el pago) y a veces falta `TELEFONO` (`R ROSARITO`). Leer por índice de
  columna dejó en $0 a 45 alumnas que habían pagado $700.
  → **Extrae por contenido:**
  - correo = la celda con `@`;
  - pago = la celda con `$` y un monto;
  - paquete = la que dice `BASICO` o `VIP`;
  - teléfono = la que tiene 10 dígitos.
- **El bloque del curso está enterrado** a media hoja (Mérida r234, Córdoba r318), a veces con una
  fila en blanco entre el título y el encabezado, y con erratas: `LOS PASTLES`, `MAS SOBROSOS`,
  `LOS PASTELES LOS MAS SABROSOS`. → Búscalo con **coincidencia difusa**. La carga inicial detectó
  los títulos por **tamaño de fuente**, no por texto.
- **Una hoja tiene varios bloques** (prospectos de Facebook, colas por vendedor, cursos viejos,
  teléfonos sueltos al final). La carga inicial los volcó todos al curso activo (374 de más).
  → Solo cuenta el bloque del curso activo.
- **Los renglones vacíos tienen significado.** Los vendedores dejan un renglón vacío para separar,
  abajo, a las que se cayeron (en rojo, sin pago, "no asiste").
  - No cortes el bloque en el primer vacío.
  - Tampoco lo saltes a ciegas: en Mexicali eso habría inscrito a 5 personas que no van.
  - → **El significado de un renglón lo decide su contenido (pago, color, comentario), nunca su
    posición.**
- **Filas separadoras** que no son personas: nombres de gira o ciudad, `DESERTORES`,
  `MAS DE 4 PAGOS PENDIENTES`, `SESIONES LIVE`, encabezados repetidos (`NOMBRE`), instrucciones
  (`MATRICULA: DIA DE NAC…`). Una fila con nombre pero sin teléfono, monto ni apellidos casi
  siempre es separador. **Cuéntalas y repórtalas**; no las descartes en silencio.

### 4.2 Personas y teléfonos

- **Normaliza:** solo dígitos y los **últimos 10**. Vienen como float (`6421412153.0`: quita el `.0`
  **antes** de quitar lo que no es dígito), con espacios, guiones, `/`, texto pegado
  (`2711912610/ MARIELA 271193`) o dos números en la celda (`6623381384 / 633 119 5…`).
- **Las fechas no son teléfonos.** Una celda `2026-02-19 00:00:00` da `0219000000` si solo se quitan
  los no dígitos. Descarta celdas de fecha y ladas que empiecen en 0 o 1.
- **El teléfono cambia entre copias del Excel.** Para comparar dos copias usa teléfono **y** nombre.
- **11 dígitos son ambiguos** (`68716826241`). Guarda ambas lecturas (principal y
  `telefono_alternativo`) con nota, y pide confirmarlo. Los de EE.UU. traen lada `1`.
- **Busca siempre por principal y por alternativo.** Si una persona aparece por los dos números,
  **es una sola**: no la cuentes dos veces.
- **Un teléfono puede ser de dos personas** (madre e hija). Deduplicar solo por teléfono las junta
  en una. Compara también el nombre.
- **La misma persona puede estar dos veces en la hoja** (un renglón viejo de prospecto y otro con
  el pago). Quédate con el que tiene pago y repórtalo.
- **Los vendedores mueven alumnas entre hojas:**
  - de `LPMSDLC` a la hoja de su ciudad;
  - a una ciudad **sin curso** (Hermosillo → Nogales).

  Quien **desaparece** del Excel **no es baja**: sigue inscrita, con nota y en urgente.
- **`STEWARD` / personal de apoyo** no es alumna. Inscribirla haría que el Hub le cobrara $1,400 en
  la puerta. Va como lead urgente o en `personal_apoyo`, nunca como inscrita.

### 4.3 Dinero

- **El texto de pago** tiene el formato `PAGADO $580 26 JUNIO 19:05 COPPEL`,
  `$700 20 AGOSTO 21:33 COPPEL` o `ANTICIPO_2: $700 …`. Extrae monto, fecha, hora y banco, y
  **guarda siempre el texto original** en `notas_migracion`.
- **Errores típicos:**
  - espacio comido: `$60026 MARZO` = $600 del 26 de marzo;
  - montos sin `$` (Córdoba, Mérida);
  - `$1OOO` con letra O;
  - `+` sumando abonos: `$400 09 FEBRERO + $200 23 FEBRERO`.
- **Filtra montos > $5,000** al sumar abonos: son precios o restantes corruptos
  (`$61981.00`). Los "anticipos" de $10, $20 o $50 son sospechosos; repórtalos y no los toques.
- **Bancos que aparecen:** Hey, Coppel, Banorte, BBVA, Azteca, Mercado Pago, OXXO y efectivo.
- **Siempre hay precio.** Antes de dar por buena una migración de pagos, comprueba que
  `precio_pactado` exista y que `anticipo + restante = precio_pactado` en cada fila (las bajas
  deben $0 a propósito). Sin precio, `liquidado` es adivinanza.
- **VIP** se reconoce por `paquete` o por la palabra `VIP` en notas o comentario. En el Hub, el
  paquete solo puede ser `BASICO` o `VIP`; el texto libre viejo ("AMIGA DE KAROLA", "PROMO $980")
  va a notas.
- **Marcada "pagada" sin monto en ningún lado:** estatus 9 con "VERIFICAR ANTES DE COBRAR". Nunca
  asumas que debe el total, porque se le cobraría a alguien que ya pagó. **Pero antes revisa el
  Excel de nuevo:** en Guaymas el `$700` siempre estuvo ahí y el error fue leer solo Supabase.
- **Pagó de más** (+$50): anótalo para revisar si se devuelve. No lo ajustes.

### 4.4 Estatus y fechas

- **Baja (6) solo con frase explícita del vendedor**: "no va a poder asistir", "no irá", "no nos va
  a poder acompañar". Quien dejó de contestar o bloqueó el WhatsApp **sigue pendiente**.
- Las frases del Excel se traducen así:
  - `VIP LIQ(UIDA) EN CURSO` → 8;
  - "liquida un día antes" o "el viernes 25" → 7;
  - solo `VIP` → 11.
- **Fechas en comentarios:** solo cuentan las **promesas de pago** (`30 SEP LO HACE`,
  `REAGENDA 7 SEP`, `COBRANZA VENTAS: dd/mm/aaaa`). No cuentan `CUMPLEAÑOS:` ni las fechas de
  contacto (`HOY 21 SEP`, `WPP 6 SEP`, `NCO`, `REC`).
  - Una sola fecha → se llena.
  - **Varias fechas distintas → estatus 13 "Confirmar fecha"**, sin elegir una.
- **Cumpleaños** solo si la fecha es válida (de 1930 a 2012), la persona no tenía uno y todas sus
  notas dicen lo mismo.
- **Fechas escritas a mano** ("15 DE FEBRERO 2004", "27 DE SEO 1985") no se convierten por
  adivinanza. Si no son claras, se quedan en notas.

### 4.5 Colores

Los colores **son estatus** para los vendedores y para Recepción ("como hacía con un color en el
Excel"). En el Excel de la Academia hay 5,350 celdas verdes `#93C47D`, 825 rojas `#FF0000` y otras
rosas, amarillas, naranjas y magentas. En el CRM, rojo = "no va".

- Guarda el hex en la nota, como hizo la carga inicial: `Color de estatus sin confirmar (hex
  #93c47d)`.
- **Pide la clave de colores** al usuario antes de usarlos para decidir algo.

---

## 5. Comparar: tres barridos

1. **Excel contra Excel** (el anterior contra el nuevo) **con el mismo parser** en los dos, para que
   sus defectos se cancelen. Así salen los cambios reales. Clasifícalos:
   - solo comentario de seguimiento (la mayoría: 71 de 118 la última vez);
   - pago nuevo;
   - cambio de paquete;
   - alta;
   - baja;
   - se movió de hoja;
   - desapareció.
2. **Excel contra Supabase**, por contenido, **ciudad por ciudad** (evento por evento), cruzando por
   teléfono principal o alterno y nombre. Clasifica:
   - **falta en el Hub** (venta nueva);
   - **sobra en el Hub** (contaminación, o la movieron);
   - **contradice** (monto, paquete o estatus distinto). Aplica aquí la tabla de la sección 3:
     ¿el Hub tiene datos posteriores?
3. **Cruza los dos barridos** para que ninguno deje huecos. Un cambio que aparece en el primero y
   no en el segundo (o al revés) se explica antes de aplicarlo.

Cada diferencia termina en una de cuatro decisiones: **aplicar**, **reportar sin aplicar**,
**urgente para que el vendedor confirme** o **explicada, no requiere nada** (por ejemplo, otro
formato de teléfono). Al final, **todas las diferencias restantes deben quedar explicadas** en una
tabla.

Para replicar lo que ve el usuario, copia la consulta de `cargarCalendario()` de `hub/index.html` y
compara contra esos números, no contra una consulta tuya.

---

## 6. Proponer, esperar y aplicar

### Antes de "permitido generar"

- Presenta un resumen **por ciudad**: altas, pagos nuevos (monto total), cambios de paquete,
  bajas, movimientos y casos a revisar.
- Entrega en el scratchpad, para el usuario, la **lista nominal** (CSV o Excel) con fila de origen,
  valor del Excel, valor del Hub y decisión propuesta. No va en el repo.
- Haz preguntas concretas sobre los casos dudosos. No avances con supuestos.

### Con "permitido generar"

1. **Respaldo primero:** `respaldo.<tabla>_AAAAMMDD` (agrega un sufijo si ya existe:
   `_fase4`, `b`…). Respalda todas las tablas que vas a tocar, completas.
2. **Migración con nombre** (`gira_NN_descripcion` o el tema que corresponda) con `apply_migration`.
   Agrupa por tipo de cambio (altas, pagos, estatus) para que cada una se pueda auditar.
3. **Personas:** `ON CONFLICT (telefono_principal) DO UPDATE` **solo rellena lo vacío**
   (`coalesce(personas.campo, EXCLUDED.campo)`). Nunca pisa un dato capturado. El nombre solo se
   reemplaza si era `'(sin nombre)'`.
4. **Inscripciones:**
   - hay llave única `(persona_id, evento_id)`;
   - para mover a alguien a otro evento, revisa primero si ya tiene inscripción ahí;
   - si es un duplicado exacto, se archiva o cambia de estatus; no se borra (candado).
5. **Lo que sobra** en el curso activo **se mueve** a su evento histórico real de la misma ciudad
   (o al `Histórico — sin curso identificado` de esa ciudad). No se convierte en lead: la
   reactivación de giras (`generarReactivacionGira`) lee `inscripciones`.
6. **Un lead que pagó** se inscribe y el lead se cierra (estatus pagado + nota `CERRADO`). Se
   actualiza el lead existente; no se crea otro.
7. **Toda corrección deja rastro:** razón textual del Excel en `notas_migracion` y, si un humano
   debe confirmarla, marca de urgente.
8. **Al cambiar el esquema**, manda `NOTIFY pgrst, 'reload schema'` (a veces hay que mandarlo
   suelto).
9. **Nunca agregues una segunda llave foránea** hacia una tabla que ya se embebe (PGRST201 tumba el
   Hub). Nombra siempre la relación en los embeds:
   `estatus!leads_estatus_id_fkey(...)`, `eventos!inscripciones_evento_id_fkey!inner(...)`.

---

## 7. Verificar

- **Conteos antes y después** por ciudad, contra el Excel.
- **Invariantes** (todas deben dar 0):
  ```sql
  -- pagado + debe = precio (sin contar bajas)
  select count(*) from inscripciones i join eventos e on e.id=i.evento_id
  where e.curso_id='877e4252-5964-4046-9cf5-1a697fb7a4b1' and i.estatus_id not in (6,15)
    and coalesce(i.anticipo,0)+coalesce(i.restante,0) <> i.precio_pactado;
  -- liquidado coherente
  ... and i.liquidado <> (coalesce(i.anticipo,0) >= i.precio_pactado);
  -- sin precio
  ... and i.precio_pactado is null;
  -- persona en dos días del curso activo
  select persona_id from inscripciones i join eventos e on e.id=i.evento_id
  where e.curso_id='877e4252-…' and e.fecha >= '2026-09-10' group by 1 having count(*)>1;
  -- inscripciones o leads huérfanos, teléfonos principales duplicados
  ```
- **Contra la API real:** cada consulta nueva o cambiada, con la clave publicable del Hub, debe
  responder **200** (con RLS sin sesión da `[]`). Las pruebas simuladas no detectan errores de la
  base: llaves foráneas, RLS, caché de esquema.
- **Recalcula una muestra a mano** (3–5 alumnas por ciudad) contra la celda del Excel.
- Si hubo código: `NODE_PATH=$(npm root -g) node pruebas/correr_todas.js` en verde, más capturas a
  1200 px y 390 px (ver `pruebas/README.md`).

---

## 8. Documentar y cerrar

- Escribe `docs/migraciones/AAAA-MM-DD-tema.md` con este orden:
  - resultado (tabla antes/después);
  - archivo y md5;
  - migraciones aplicadas;
  - trampas nuevas;
  - diferencias restantes (todas explicadas);
  - pendientes;
  - nota de datos personales.

  **Sin nombres ni teléfonos.**
- **Si descubres una trampa nueva, agrégala a esta guía.**
- Haz commit en la rama asignada y, con autorización, en `main`. Verifica que ya está publicado y
  avísale al usuario.

---

## 9. Lo aprendido en el Excel de la Academia

> **Ya se migró** (Fase 0, 13 oct). La recarga está en
> `docs/migraciones/2026-10-13-academia-fase0-excel.md` y `scripts/academia/cargar_excel_academia.py`.

- **Separador o alumna sin teléfono:**
  - Es **separador** si solo hay un texto en la columna del nombre y nada más.
  - Si hay apellidos o cualquier otro dato, es **alumna**.
- **Tiempo límite de la API:** `anon` tiene 3 s y `authenticated` 8 s. Los cruces con `personas` (36 mil filas) se hacen una vez por lote, nunca una vez por renglón.
- **Datos grandes:** no se mandan por `execute_sql`, porque pasarían por el chat. Se mandan con el script contra una función protegida por una llave temporal: solo se guarda su hash, vence, y el permiso se quita al terminar.
- **Antes de crear un respaldo, revisa que el nombre no exista.** Otra sesión puede estar trabajando el mismo día.


- Son 20 hojas y **35,047 celdas con dato**. Las alumnas están en 7 hojas de generación (~1,250 filas,
  1,228 teléfonos distintos, 24 en más de una hoja). El **81 %** ya existe en `personas`.
- Hay ~7,400 celdas de pago mensual. La mitad sigue el patrón `PAGADO $580 <fecha> <hora> <banco>`;
  ~2,200 son texto libre.
- `GRADUACION AC` mezcla en una hoja dos eventos lado a lado (izquierda: el que ya pasó; derecha:
  el próximo), listas de invitados, kits y hotel. Se leen **por bloques**, cada uno debajo de su
  propio encabezado `NOMBRE ALUMNO` / `NOMBRE`.
- `personas` no tiene dirección ni CURP. Las políticas de acceso (RLS) del esquema base dejan leer
  y escribir todo a cualquiera con sesión (`fase1_autenticado_todo_*`). Los datos sensibles van en
  **una tabla aparte con su propia RLS**.
- `pagos.inscripcion_id` es obligatorio. Los abonos que no son de un evento necesitan su propia
  tabla.
- Propuesta acordada como dirección ("todo el Drive a Supabase y lo demás es solo frontend"):
  - **capa 1:** copia exacta **celda por celda** (valor, texto, fórmula, color, comentario, link,
    md5 del archivo), solo para administradores;
  - **capa 2:** tablas ordenadas que conservan siempre la hoja y la fila de origen y el texto
    original.
  - Corte: cargar, recargar de forma repetible (por hoja + fila + teléfono) hasta que el frontend
    esté listo, y dejar el Excel en solo lectura.
  - Quedan abiertas las preguntas A–E de esa sesión: corte, otros archivos, prospectos, clave de
    colores y privacidad.

---

## 10. Prompt sugerido para la sesión nueva

> Lee `docs/guia-actualizar-hub-desde-excel.md` completo y los documentos de `docs/migraciones/` que
> cita. Te adjunto el `CRM OFICIAL GIRA REPOSTERIA NACIONAL` más reciente. Objetivo: última
> actualización del Hub **solo para las ciudades del curso activo cuyo día ya pasó en la gira
> actual** (sección 3). Solo lectura: diagnóstico con los tres barridos (sección 5), respetando lo
> que el Hub ya registró después del curso (asistencia, pagos, no llegaron). Entrégame el resumen
> por ciudad, la lista nominal en un archivo aparte y tus preguntas. No generes nada hasta que diga
> "permitido generar".
