# 2026-11-11 · Buscar por el teléfono alterno

Pedido de una vendedora (por Enoc): "filtro el segundo número y no me aparece la alumna, tengo que estar adivinando".
"Permitido generar" el 11 nov.

## Causa
El buscador de **Alumnos y Leads**, el de **Cobranza → Por cobrar** y el de **Ceder su lugar** solo comparaban el teléfono
principal. ("Fuera del tablero también existe", Recepción, Historial, Glamy y "Este número ya está en el Hub" ya buscaban los dos.)

## Qué se hizo (solo Hub; sin cambios en la base ni en datos)
- `telCoincide(persona, texto)`: una sola regla ('principal', 'alterno' o nada), sin importar espacios, guiones ni el 52;
  con 7+ dígitos compara los últimos 10. La usan los tres buscadores.
- Tablero: busca por los dos números; si la encontró por el alterno, su tarjeta dice "Encontrada por su teléfono alterno: …".
  La lista de inscritas ahora trae el alterno.
- Cobranza: igual, con la etiqueta en su renglón (las inscritas de Cobranza ahora traen el alterno).
- Ceder su lugar: encuentra a quien irá por su alterno y dice "(es su teléfono alterno)".
- Glamy: el manual lo explica. `HUB_VERSION = '2026-11-11-buscar-alterno'`.

## ¿Qué pasa si…?
- El alterno de una es el principal de otra: salen las dos, cada una con su etiqueta. - Un pedazo del número (3 a 6 dígitos):
  igual que antes, también contra el alterno. - Por nombre: no cambia. - No se toca ningún dato.

## Pruebas
- `prueba_buscar_alterno.js` (8/8), capturas 1200/390.
