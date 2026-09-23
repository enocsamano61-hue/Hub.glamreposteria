# Nombres comunes, "Confirmar fecha" y datos de contacto — 23 sep 2026

Migraciones `ciudades_02_nombre_comun_y_uniones` y `estatus_confirmar_fecha_y_cumpleanos`, más
cambios en `hub/index.html`.

## 1 · Ciudades con su nombre común

Dirección pidió usar el nombre que usa la gente, para que no se confunda el vendedor. El INEGI
queda sólo para corregir ortografía.

- 36 ciudades regresan a su nombre común:
  - Heroica Guaymas → Guaymas
  - Culiacán Rosales → Culiacán
  - Xalapa-Enríquez → Xalapa
  - Heroica Puebla de Zaragoza → Puebla
  - León de los Aldama → León
  - Toluca de Lerdo → Toluca
  - Juárez → Ciudad Juárez
  - Queretaro → Querétaro
  - Cosoloacaque → Cosoleacaque
  - Hidalgo De Parral → Parral
  - …y el resto de la lista.

  El nombre anterior **y** el oficial quedan como alias, así que el buscador encuentra la ciudad
  de cualquier forma. A las que ya tenían nombre común (Durango, Acapulco, Pachuca…) sólo se les
  agregó el oficial como alias.
- 4 uniones más, cada una de una variante sin estado hacia la ciudad que se queda:
  - Oaxaca → Oaxaca
  - Dolores Hidalgo → Dolores Hidalgo, Gto.
  - San Pedro De Las Colonias → San Pedro de las Colonias, Coah.
  - Slp → San Luis Potosí
- Se les puso estado a Taxco (Guerrero), Naucalpan (Estado de México) y Santa Cruz Huatulco
  (Oaxaca).
- Respaldo: `respaldo.ciudades_20260923b` y `respaldo.ciudades_fusion_20260923b`.

Quedan 168 ciudades. Siguen sin decidir: Cdmx Centro / Cdmx Sur, "Ciudad Hidalgo" sin estado y
"Coapeche … Misantla".

## 2 · Estatus "Confirmar fecha"

- Estatus nuevo `confirmar_fecha` (id 13, color mostaza). En el tablero sale en "Necesita
  atención".
- **Leads**: se aplicó a los 34 leads cuyo comentario traía varias fechas de promesa.
  - 32 cambian a "Confirmar fecha".
  - Los 2 que estaban en "Pago por confirmar" conservan su estatus.
  - A todos se les antepone la duda en el comentario, sin borrar lo que decía. Ejemplo:
    *"CONFIRMAR FECHA DE ANTICIPO: su comentario trae varias fechas (28 ago, 15 sep, 25 sep). La
    última anotada es 25 sep…"*
  - La duda también queda en su historial.
  - Respaldo: `respaldo.confirmar_fecha_20260923`.
- **Inscritas**: las 3 cuya nota de cobranza decía enero de 2026 (Minatitlán, Frontera Comalapa,
  Chilpancingo) pasan a "Confirmar fecha". Se les quitó esa fecha de próximo pago y se agregó la
  duda a su nota.

## 3 · Cumpleaños

Se llenó `personas.fecha_nacimiento` en **5,844 personas** a partir de
`CUMPLEAÑOS: dd/mm/aaaa` en comentarios de leads y notas de inscripción. Condiciones:

- sólo fechas válidas, de 1930 a 2012;
- sólo si la persona no tenía una;
- sólo si todas sus notas dicen la misma.

Respaldo: `respaldo.cumpleanos_20260923`.

## 4 · Datos de contacto editables desde cualquier ficha

- **Ficha del lead**: se agregaron correo y fecha de nacimiento a los campos de nombre y
  teléfonos.
- **Ficha de inscripción** e **Historial cliente**:
  - muestran tel 1 · tel 2 · correo · 🎂 cumpleaños (edad);
  - tienen el botón **✏️ Datos de contacto**, que abre el mismo formulario.
- Validaciones:
  - teléfonos de 10 dígitos;
  - correo bien escrito;
  - edad entre 10 y 100 años;
  - no deja poner un teléfono 1 que ya es de otra persona.
- Historial cliente ahora también encuentra a la persona por su teléfono 2.

Pruebas: `prueba_contacto` 15/15. Regresión: ciudades 61, pagos 58, cobranza 44, vendedor 23,
ui 50, sync 29, inscribir 76.
