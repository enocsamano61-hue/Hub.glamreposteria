# Aterrizar los vendedores y las tareas asignadas

**Fecha:** 22 de septiembre de 2026
**Alcance:** Supabase (5 migraciones) + `hub/index.html`
**Curso activo:** LOS PASTELES MAS SABROSOS DE LA CHEF · `877e4252-5964-4046-9cf5-1a697fb7a4b1`

---

## Por qué

El Hub sabía cuánto se había cobrado, pero no de quién era cada venta. El nombre
del vendedor existía sólo como texto suelto dentro de los comentarios
(`Vend: ISA CAMPAÑA`), con 22 escrituras distintas para 6 personas. La vista
"Por vendedor" del tablero estaba bloqueada por eso, y no había forma de hacer
un corte.

Además, si un vendedor creaba un lead y meses después otro lo contactaba y le
vendía, no existía manera de mover esa venta a quien de verdad la cerró.

---

## El hallazgo que cambió el plan

Al intentar el primer backfill, Postgres lo rechazó:

```
23503: insert or update on table "inscripciones" violates foreign key constraint
DETAIL: Key (asesor_id)=(...) is not present in table "asesores".
```

Había **dos padrones de personas**:

| Tabla | Renglones | Qué es |
|---|---|---|
| `asesores` | 1 (Enoc) | del diseño original, nunca se pobló |
| `usuarios` | 9 | la real: logins, roles, `es_admin`, permisos |

Y los cinco campos que apuntaban al padrón muerto estaban **vacíos en los
36,363 registros**:

| Campo | Llenos / Total |
|---|---|
| `inscripciones.asesor_id` | 0 / 36,363 |
| `leads.asesor_id` | 0 / 343 |
| `pagos.confirmado_por` | 0 / 0 |
| `interacciones.asesor_id` | 0 / 2 |
| `comisiones.asesor_id` | 0 / 0 |

Por eso se repuntaron las 5 llaves a `usuarios` sin migrar un solo dato. Mantener
dos padrones sincronizados a mano era la forma más segura de que los cortes
salieran mal a los seis meses.

Efecto secundario: la gráfica **Ventas → Vendedores** llevaba desde siempre
mostrando "Sin asesor asignado" para todo el mundo, porque leía el padrón vacío.
Ahora funciona.

---

## Migraciones aplicadas

| # | Nombre | Qué hizo |
|---|---|---|
| 1 | `vendedores_01_marca_es_vendedor` | Columna `usuarios.es_vendedor`, prendida para Isabel, Ines, Jared y Saga |
| 2 | `vendedores_02_asesor_id_apunta_a_usuarios` | Repuntó las 5 llaves de `asesores` a `usuarios` + 2 índices |
| 3 | `vendedores_03_backfill_asesor_calendario` | 168 inscripciones + 8 leads del Calendario |
| 4 | `vendedores_04_moni_sin_dueno_urgente` | Marcó las 2 ventas de "MONI" |
| 5 | `notas_05_tareas_asignadas` + `notas_06_realtime_tareas` | Tareas asignadas y sus permisos |

### Resultado del backfill

| Vendedor | Inscritos | Leads | Cobrado | Por cobrar |
|---|---:|---:|---:|---:|
| Isabel | 84 | 2 | $44,600 | $65,600 |
| Ines | 50 | 6 | $32,259 | $37,841 |
| Jared | 31 | 0 | $20,350 | $24,150 |
| Cinthia *(histórico)* | 2 | 0 | $700 | $2,100 |
| Eliab *(histórico)* | 1 | 0 | $0 | $1,400 |
| **Sin asignar** | **263** | **163** | $108,350 | $253,950 |

Decisiones de alcance, acordadas antes de correrlo:

- **Sólo el Calendario** (curso activo con fecha futura) y los leads de esas
  mismas ciudades. Lo histórico se dejó intacto a propósito.
- **El texto original NO se borra.** Es reversible: vaciar `asesor_id` devuelve
  todo al estado anterior.
- **Cinthia y Eliab** conservan sus ventas pero no aparecen en el picklist.
- **"MONI"** no existe como usuario. Sus 2 ventas quedaron *sin* dueño y con
  comentario ⚠ URGENTE para que quien vendió las reclame.

---

## Por qué MONI no pasó a estatus 9

Las 2 alumnas (Comitán 28 nov y Minatitlán 7 nov) están **pagando al corriente**
(estatus 11, anticipo vigente). Moverlas a "algo está mal" las habría sacado de
la lista de cobranza. El pendiente es de quién es la comisión, no del pago,
así que se marcó con comentario y se dejaron donde estaban.

---

## Lo que cambió en el Hub

### 1. Picklist "¿Quién vendió?" en la ficha del alumno

La lista sale de `usuarios.es_vendedor`, **no de una lista escrita en el
código**: dar de alta o de baja a un vendedor es cambiar un renglón en la base.

Si la venta ya es de alguien que dejó de vender, esa persona **sí** aparece en
el picklist marcada "(histórico)" — si no, guardar cualquier otro cambio le
borraría la venta sin querer.

Sin vendedor, el aviso sale en rojo: *"esta venta no le cuenta a nadie en el corte"*.

### 2. Reasignar pregunta, y pregunta más fuerte si es a nombre propio

- Asignar sobre vacío → directo, sin fricción. No es una disputa, es capturar.
- Cambiar de dueño → confirmación con nombres, alumno y motivo opcional.
- Pasársela a uno mismo → el mismo diálogo en rojo, con el título
  *"¿Pasar esta venta a tu nombre?"*.
- Cancelar, click fuera y **Escape** cancelan; sólo el botón confirma.

Rastro doble, a propósito: renglón `VENTA REASIGNADA ... Isabel → Ines. Motivo: ...`
en las notas del alumno, **y** `venta_reasignada` en Actividad del equipo. La
bitácora se puede purgar algún día; la nota del alumno no.

Cualquier vendedor puede hacerlo, no sólo Gerencia: el caso de uso es justo que
quien cerró se la pase a su nombre. La protección no es el candado, es el
registro visible.

### 3. Vista "Por vendedor" desbloqueada

Un recuadro por vendedor con `$X cobrado · $Y por cobrar`, ordenados por
cantidad, y **"Sin vendedor asignado" siempre al final** — que es el recuadro
que de verdad importa: 263 ventas que hoy no le cuentan a nadie.

Las bajas (estatus 6) se excluyen de los montos del recuadro: no son dinero por
cobrar.

### 4. Tareas asignadas en el bloc de notas

El bloc 📝 era estrictamente privado — las políticas de la base **impedían**
escribir en el bloc de otra persona. Se abrió esa puerta sólo para admins y sólo
en un sentido: pueden **dejar** una tarea, no **leer** las notas de nadie.

| | |
|---|---|
| Admin (Enoc, Jared, Perla) ve un campo **"Para:"** | por defecto "Yo" — para todos los demás el bloc funciona igual que siempre |
| El destinatario puede | marcarla hecha |
| El destinatario **no** puede | borrarla — para que ningún pendiente desaparezca solo |
| Quien asignó ve | sólo **las tareas que él dejó**, y si ya se hicieron |
| Quien asignó **no** ve | las notas personales del equipo |
| Bitácora | `tarea_asignada` y `tarea_completada` |

**Aviso en vivo:** `notas_usuario` se publicó en Realtime. Si un admin deja una
tarea mientras el vendedor está adentro, aparece sin recargar, con un toast.
RLS filtra del lado del servidor, así que sólo llegan filas propias. Si el canal
no conecta, el Hub sigue igual que antes: la tarea se ve al siguiente login.

El contador rojo del 📝 da prioridad a las tareas sin ver sobre los pendientes
propios, y se apaga al **abrir el bloc** — no al recargar la página.

---

## Cómo se verificó

**Lógica pura — 23 pruebas.** Se extrajo un tramo contiguo del fuente real (no
fragmentos sueltos, que fue lo que rompió el arnés en la migración anterior) y
se probó agrupación, orden, exclusión de bajas de los montos, y los tres casos
del picklist.

**Navegador — 50 pruebas** con Playwright y **todas las escrituras a Supabase
interceptadas**. Cubren: que asignar sobre vacío no pregunte, que cambiar de
dueño sí, que cancelar y Escape no escriban absolutamente nada, que el rastro
quede completo sin borrar lo anterior, que el selector "Para:" sólo exista para
admins, y que una tarea recibida no ofrezca el botón de borrar.

**Permisos de la base — suplantando a cada usuario** con `SET LOCAL
request.jwt.claims`, dentro de transacciones revertidas:

| Prueba | Resultado |
|---|---|
| Ines (no admin) asigna una tarea | ❌ rechazado |
| Ines firma una tarea a nombre de Jared | ❌ rechazado |
| Jared (admin) asigna a Isabel | ✅ pasa |
| Isabel ve su tarea | ✅ |
| Isabel ve la nota privada de Jared | ❌ 0 filas |
| Isabel marca hecha su tarea | ✅ |
| Isabel borra la tarea asignada | ❌ sobrevive |
| Jared ve la tarea que asignó | ✅ |
| Jared ve la nota privada de Isabel | ❌ 0 filas |

Se confirmó que las pruebas no dejaron ni una fila en la base.

---

## Pendientes que abre esto

- **263 inscritos y 163 leads sin vendedor** en el Calendario. Se resuelven
  desde la vista "Por vendedor" → recuadro "Sin vendedor asignado".
- **Corte por vendedor** (ventas, cobrado, por cobrar, por rango y ciudad):
  el dato ya está listo, falta el reporte.
- **Origen del lead** (campaña / referido / inbox / WPP / recuperación) sigue
  mezclado en el mismo texto. `leads.origen` ya tiene su catálogo;
  `inscripciones` no tiene esa columna y no se agregó para no abrir frente.
- **Backfill histórico** (fuera del Calendario), si algún día se quieren cortes
  de giras pasadas.

---

## Nota sobre datos personales

Igual que el documento anterior, aquí no se incluyen nombres completos,
teléfonos ni montos individuales de alumnas. Los totales por vendedor sí, porque
son cifras de operación, no datos personales de terceros.
