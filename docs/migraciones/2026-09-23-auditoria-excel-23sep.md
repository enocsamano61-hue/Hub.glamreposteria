# Auditoría del Excel del 23 de septiembre

**Fecha:** 23 de septiembre de 2026
**Archivo:** `CRM_OFICIAL_GIRA_REPOSTERIA_NACIONAL_2.xlsx` descargado el 23 sep (md5 `b44d4d32…`)
**Alcance:** curso activo (LOS PASTELES MAS SABROSOS DE LA CHEF), sólo el Calendario
**Migraciones:** `fase9_…`, `fase10_…`, `fase11_…`

---

## Resultado

| | Antes | Después |
|---|---:|---:|
| Inscritos en el Calendario | 408 | **433** |
| Dinero ya pagado que el Calendario no reflejaba | — | **$29,450** recuperados |
| VIP que el Hub tenía como BÁSICO | 18 | 0 |

Diferencias restantes contra el Excel: **todas explicadas** (ver el final).

---

## La trampa nueva: renglones vacíos con significado

El primer barrido marcó **30 "bajas"**. Ninguna lo era. Los vendedores empezaron a
**dejar renglones vacíos a media lista para separar a las que se cayeron**: arriba las
que pagaron, abajo (en rojo, sin pago, con "no asiste") las que no van.

El parser tomaba el primer renglón vacío como fin del bloque. Se corrigió para tolerar
huecos, **y se validó contra el archivo del día anterior** antes de creerle: dio 325 filas
de más. Revisando por qué, en Mexicali los 5 renglones debajo del hueco eran rojos, sin
pago y todos decían que no asisten. Si se hubiera aplicado "saltar huecos" tal cual,
**se habrían inscrito 5 personas que no van, un día antes del curso**.

Regla que queda: **el significado de un renglón se decide por su contenido** (pago, color,
comentario), **nunca por su posición en la hoja**.

---

## Método

1. **Excel contra Excel** (22 sep → 23 sep), con el **mismo parser en ambos archivos**,
   para que sus defectos se cancelen. De 118 cambios en hojas del Calendario, 71 eran sólo
   comentarios de seguimiento; los 59 restantes (pago, paquete, altas, bajas) se cruzaron
   con Supabase uno por uno.
2. **Excel contra Supabase**, por contenido, ciudad por ciudad.
3. Los dos barridos se cruzaron entre sí para asegurar que ninguno dejara huecos.

---

## Fase 9 — inscribir a quien ya pagó (24 altas, $17,600)

- **20** pagaron, los vendedores ya las pasaron de la hoja LPMSDLC a la de su ciudad, y en
  el Hub seguían siendo sólo lead. Se inscriben con el vendedor tomado del Excel.
- **3** pagaron pero en el Excel **siguen sólo en LPMSDLC** (2 de Mexicali, curso al día
  siguiente; 1 de Ensenada). Se inscriben por decisión de Sistemas con nota **⚠ VALIDAR**.
  Las dos de Mexicali tienen **el mismo comprobante al minuto**: se pide confirmar si fueron
  dos transferencias o una.
- **1** alta nueva en San Luis Río Colorado (curso ese mismo día), no existía en el Hub.
- **1** persona nueva en SLRC registrada **sólo como lead urgente, sin inscripción**: el
  Excel dice "STEWEARD", sin pago ni paquete. Puede ser personal de apoyo; inscribirla
  habría hecho que el Hub le cobrara $1,400 en la puerta.
- Los 23 leads se cerraron con la convención de la Fase 7 (estatus pagado + nota CERRADO).

## Fase 10 — VIP y pagos nuevos (21 inscripciones)

- **18 subieron a VIP** ($1,900). Estatus según lo que dice el Excel:
  - "VIP LIQ(UIDA) EN CURSO" → **Liquida en curso** (14)
  - "liquida un día antes" / "el viernes 25" → **Pago programado** (2)
  - sólo "VIP" → se quedan en anticipo vigente (2)
- **3 pagos nuevos**: una alumna de Mexicali liquidó con **$50 de más** (anotado para
  revisar si se devuelven), y dos VIP de SLRC liquidaron $1,900.

## Fase 11 — errores que ya venían de antes (correcciones + urgente)

Por decisión del 23 sep: se corrigen con lo que dice el Excel, se deja comentario y se
marcan en **urgente** para que los vendedores confirmen contra el comprobante.

| Caso | Qué pasaba | De dónde venía |
|---|---|---|
| 9 alumnas de Guaymas | en **$0** con "verificar antes de cobrar" | **Error de la Fase 4**: el Excel siempre tuvo "$700" con banco y fecha, desde el primer archivo. Se leyó sólo Supabase sin cotejar el Excel — la misma clase de error que el de precios VIP. |
| 1 de Minatitlán | en $0 | el Excel dice "$60026 MARZO" (un espacio comido: $600 del 26 de marzo) |
| 1 de Tijuana | como **NO VA** y $0 | aparece **dos veces** en la hoja con el mismo correo; la carga tomó el renglón viejo de prospecto y no el que tiene $700 pagados |
| 1 de Xalapa | en un evento histórico | **Error de la Fase 2**: estaba debajo de un renglón vacío y el parser no la vio. Se comprobó que es **la única persona con pago** a la que le pasó eso. |

Además, sólo comentario + urgente:
- **SLRC**: un alumno que ya estaba en urgente **desapareció de todo el Excel**. No hay nada
  escrito de que cancelara; no se marca como baja.
- **Hermosillo**: una alumna VIP fue movida a la hoja de **Nogales**, que no tiene curso.
  Sigue inscrita en Hermosillo hasta que se confirme.

---

## Una corrección al propio reporte

Durante la auditoría se reportó que la Fase 7 había **duplicado 6 personas** como dos
leads cada una. **Era falso**: cada par de teléfonos es una sola persona con un solo lead
(el segundo número ya estaba como teléfono alternativo). La consulta buscaba por ambos
teléfonos y contaba el mismo lead dos veces. Se dejó por escrito porque se le dijo al
usuario antes de verificarlo.

---

## Diferencias que quedan contra el Excel (todas explicadas)

| Tipo | Cuántas | Por qué |
|---|---:|---|
| Teléfonos con otro formato (EE.UU. con lada 1, o un dígito de más) | 6 | sí están; el Hub y el Excel los escriben distinto |
| Inscritas que siguen sólo en LPMSDLC | 3 | decisión del 23 sep, con nota ⚠ VALIDAR |
| Montos escritos sin "$" en el Excel (Córdoba, Mérida, …) | 28 | el Hub tiene la misma cifra |
| Saldo a favor de un curso anterior | 1 | a propósito ($100) |
| Casos en urgente esperando confirmación humana | 3 | alumno borrado del Excel, alumna movida a Nogales, teléfono ambiguo de 11 dígitos |

**Invariantes verificadas al final:** 0 descuadres entre pagado + debe = precio (excluyendo
bajas, que deben $0 a propósito); `liquidado` coherente en las 433; ninguna persona en dos
cursos del Calendario; ninguna sin precio.

---

## Pendientes

- **Córdoba y Mérida**: "anticipos" de $10, $20, $50 en la columna ANTICIPO. El Hub tiene lo
  mismo que el Excel, pero no parecen pagos reales. No se tocaron: no hay forma de saber el
  monto correcto.
- **20 casos en urgente** para que los vendedores confirmen (la mayoría, las correcciones
  de este día).
- **Pedir a los vendedores que no usen renglones vacíos como separador**, o seguir
  leyendo por contenido como se hace ahora — el parser ya lo soporta, pero es frágil.

---

## Nota sobre datos personales

Como en los documentos anteriores, aquí no hay nombres, teléfonos ni montos individuales.
La lista nominal se entregó aparte al usuario.
