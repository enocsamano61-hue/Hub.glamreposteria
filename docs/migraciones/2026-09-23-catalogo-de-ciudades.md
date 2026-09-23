# Catálogo de ciudades limpio + buscador de ciudad — 23 sep 2026

Migración `ciudades_01_inegi_alias_fusion_y_limpieza` + cambios en `hub/index.html`.

## El problema

La tabla `ciudades` tenía **1,326 filas**. 1,142 eran texto libre del Excel convertido en
"ciudad": sin estado, sin coordenadas y **sin ningún uso** en las 6 tablas que apuntan a
`ciudades`. Además había la misma ciudad dos o tres veces ("Celaya" / "Celaya Gto",
"Mty" / "Monterrey") y nombres a medias. Los vendedores no encontraban la suya en el selector.

## Lo que se hizo en Supabase

1. **Respaldo** completo antes de tocar nada: `respaldo.ciudades_20260923` (1,326 filas).
   Cada unión quedó registrada en `respaldo.ciudades_fusion_20260923` (de → a, tabla, filas movidas).
2. **Columnas nuevas** en `ciudades`:
   - `alias text[]`: nombres viejos y variantes del Excel. El buscador los usa.
   - `oculta boolean`: no se ofrece en los selectores, pero se conserva su historial.
   - `cvegeo text`: clave INEGI de la localidad.
3. **12 uniones** de la misma ciudad (misma clave INEGI). Se movieron eventos, leads, personas,
   sedes, paradas de gira y personal de apoyo a la ciudad que se queda. Si la que se borraba
   tenía coordenadas y la otra no, se conservaron.

   | Se queda | Se unió |
   |---|---|
   | La Piedad de Cabadas | La Piedad |
   | Ciudad del Carmen | Ciudad Del Carmen (38 sedes) |
   | Valladolid | Valladolid (40 sedes) |
   | Ciudad Valles | Ciudad Valles (25 sedes) |
   | Uruapan | Uruapan (15 sedes) |
   | Pátzcuaro | Pátzcuaro (28 sedes) |
   | Celaya | Celaya (2 sedes) |
   | San Juan Bautista Tuxtepec | San Juan Bautista Tuxtepec (32 sedes) |
   | Los Reyes de Salgado | Los Reyes Del Salgado (1 evento) |
   | Zamora de Hidalgo | Zamora De Hgo Mich (3 eventos) |
   | Monterrey | Mty (38 eventos) |
   | Rioverde | Rio Verde Slp (3 eventos, 1 parada) |

4. **Se borraron las variantes sin uso.** La condición se evaluó al aplicar la migración, así que
   si alguien había usado una en ese momento, no se borraba.
5. **Nombre oficial INEGI** para las coincidencias seguras (130 ciudades): "Cd Obregon" →
   "Ciudad Obregón", "Heroica De Guaymas" → "Heroica Guaymas", "Culiacán" → "Culiacán Rosales",
   etc. El nombre anterior queda como alias. Las que no tenían estado ya lo tienen.
6. **11 hojas del Excel que no son ciudades** quedaron `oculta = true`: Online, Cancelados,
   Galletería, Internacional, etc.

Resultado: **172 ciudades** (11 ocultas). No quedó ninguna referencia huérfana. Los conteos de
leads, personas, eventos, sedes, paradas e inscripciones son idénticos antes y después.

### Pendientes de decisión (no se tocaron)

31 ciudades en uso cuyo nombre INEGI no fue seguro. Se enviaron a Sistemas para decidir una por
una. Ejemplos: Acapulco (→ Acapulco de Juárez), Pachuca (→ Pachuca de Soto), Querétaro (→ Santiago
de Querétaro), "Oaxaca" sin estado (¿unir con Oaxaca de Juárez?), el grupo Cdmx / Cdmx Centro /
Cdmx Sur, Dolores Hidalgo (2 variantes).

## Lo que se hizo en el Hub

**Buscador de ciudad** en lugar del `<select>` en estos lugares:

- ficha del lead;
- Nuevo lead;
- Plazas;
- calculadora de cupo.

Además, hay sugerencias en la ciudad de una sede nueva y búsqueda tolerante en el filtro de
ciudad del catálogo de sedes.

- No importan acentos ni mayúsculas. Ignora "Cd", "Ciudad", "Heroica", "de", "los"… y entiende
  "Pto" = Puerto.
- Busca también por los nombres viejos: "mty" encuentra Monterrey y dice "escrita antes como Mty".
- Tolera errores de dedo ("hermosiyo", "juares", "meirda") y palabras juntas o separadas
  ("villa hermosa").
- "celaya gto": la abreviatura del estado sólo filtra.
- Las ciudades con curso próximo en el Calendario salen primero, con su fecha.
- Teclado: ↑ ↓ Enter; Escape cancela sin cerrar la ficha.
- El `<select>` sigue existiendo, escondido, así que el resto del código no cambió.

**Nueva ciudad (Plazas)** ya no duplica. Si lo escrito se parece mucho a una existente
("Cd Obregon"), avisa cuál es y te lleva a ella. Crear otra de todos modos es opcional.

**Giras:** las sedes de cada parada y el botón "Ver sedes" ahora buscan por la ciudad enlazada.
Antes buscaban por el nombre, que con los nombres oficiales ya no coincidiría con el texto de la
sede.

Pruebas: `prueba_ciudades` 61/61. Regresión: vendedor 23, ui 50, sync 29, inscribir 76.

## Cómo revertir

```sql
-- Nombres/alias: los nombres anteriores están en respaldo.ciudades_20260923.
-- Filas borradas: INSERT INTO ciudades SELECT ... FROM respaldo.ciudades_20260923 WHERE id NOT IN (SELECT id FROM ciudades);
-- Uniones: respaldo.ciudades_fusion_20260923 dice qué id se movió a cuál.
```
