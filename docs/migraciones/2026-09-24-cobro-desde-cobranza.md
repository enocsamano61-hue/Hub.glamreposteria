# Cobrar desde Cobranza — 24 sep 2026

Lo pidió Cobranza: ella también registra anticipos y abonos, y tenía que ir al Calendario para
hacerlo. Solo cambia `hub/index.html`. No hay migración: se usan `pagos` e `inscripciones`
como ya estaban.

## Qué cambia

- **💵 Cobrar en cada fila de Cobranza**, junto a 💬 y 📅.
  - **Inscrita:** abre su ficha **solo con el abono**, sin vendedor, comentarios ni pestañas.
    "Ver ficha completa" muestra todo.
  - **Lead:** con el permiso 💳 Confirmar pagos abre **✅ Confirmar pago**, que inscribe y
    registra el anticipo. Sin el permiso abre **💜 Registrar pago**. La ficha del lead queda
    abierta debajo.
  - Tocar el nombre abre la ficha completa, igual que antes.
- **💵 Registrar pago** arriba de Cobranza: busca a cualquier persona por nombre (las palabras
  en cualquier orden dentro del nombre) o por teléfono (principal o adicional).
  - Salen **todas** sus inscripciones, liquidadas o con saldo, la más reciente primero, y sus
    leads abiertos.
  - Sirve para cobrarle a alguien que no está en la lista, por ejemplo con un curso de hace
    más de 2 semanas o de otra gira.
- **El abono es el mismo en todos lados.** La pestaña "Agregar pago" del Calendario y el cobro
  directo de Cobranza traen:
  - precio, pagado y **cuánto debe**;
  - **Liquida todo**, que pone el saldo exacto;
  - vista previa: "queda debiendo $X" o "✅ Queda liquidada";
  - si pagó **de más**, pide confirmación antes de guardar;
  - **próximo pago** en el mismo paso, si le queda saldo. Se guarda en `fecha_proximo_pago` y
    queda en Actividad del equipo como fecha movida.

El cálculo del saldo es igual que antes: al liquidar pasa a "Pagó", y si no liquida, el
estatus no cambia. La vista previa y el guardado usan la misma función (`calcularAbono`), así
que lo que se ve es lo que se guarda.

El buscador nombra sus relaciones (`inscripciones!inscripciones_persona_id_fkey`,
`leads!leads_persona_id_fkey`), por la lección del 24 sep. Quita comas, paréntesis y
comodines del texto antes de armar el filtro.

## Pruebas

- `prueba_cobro` 50/50.
- Regresión: vendedor 23, ui 50, sync 29, inscribir 76, ciudades 61, pagos 58, cobranza 44,
  Cobranza en móvil 43, contacto 15, ladas 16, mensajes 28.
- La consulta del buscador se probó contra la API real, por nombre y por teléfono, y responde 200.
