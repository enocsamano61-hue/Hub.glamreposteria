# 2026-10-22 · Venderle otro curso a alguien que ya conocemos (sin trámites)

Permitido por Enoc el 22 oct 2026. Origen: "si contacto a alguien que fue a cupcakes en Poza Rica y ahora
la mando a Tuxpan, al darle Nuevo lead me dirá que ya existe… siento que es muy burocrático; debería
haber dónde elegir a mano a qué ciudad o fecha se va a inscribir". Decisiones: el botón va donde lo
necesite quien inscribe; siempre pasa por Cobranza; solo cursos de la gira activa, con enfoque en la
lada de su teléfono.

## Antes
- "Un teléfono = un lead": si la persona tuvo un lead alguna vez (aunque estuviera cerrado y fuera de
  otro curso), "+ Nuevo lead" no dejaba crear otro y mandaba a editar el viejo (curso, ciudad y
  vendedora del lead viejo se sobrescribían).
- El selector de curso ordenaba solo por fecha.

## Ahora (`hub/index.html`, sin cambios en la base)
- `leadVigenteDe(personaId)`: el lead que alguien está trabajando = estatus no final y de esta gira
  (su curso no ha pasado; sin curso, creado desde el inicio de la gira). Solo ese detiene "+ Nuevo
  lead" ("Este número ya es lead… Abrir su lead"). Si no hay, se crea un lead nuevo sobre la misma
  persona y el viejo queda igual (aviso: "sus cursos y leads de antes siguen igual").
- Selector de curso (`listaBuscadora` con `sugeridas`, `sugerirPorLada`, `cursoPorLada`): grupos
  "📍 Por su lada (783)", "📍 Mismo estado" y "📅 Otras ciudades de la gira". Usa la tabla `ladas`
  que ya existía. Aplica en Nuevo lead, el lead, Registrar pago e Inscribir.
- **"➕ Inscribir a un curso"** (`abrirInscribirACurso`): en Historial cliente, en el aviso "Este número
  ya está en el Hub" (Nuevo lead y "Fuera del tablero") y **"➕ Otro curso"** en la ficha de la inscrita.
  Reutiliza el modal de Registrar pago: curso (trae el de su lada), paquete, pago y "¿Quién vendió?".
  - Si tiene lead vigente: se usa ese lead (lo dice arriba).
  - Si no: el lead se crea al guardar, directo en "Pago por confirmar" (si Cobranza no encuentra el
    pago regresa a "Aún no vence su pago"). Cancelar no deja nada.
  - Si ya está inscrita en ese curso: abre su ficha con el pago escrito (no crea lead).
  - Nunca inscribe sola: Cobranza confirma como siempre. Actividad `pago_reportado`.
- Glamy: manual actualizado (paso 1 y el atajo "Inscribir a un curso").

## Pruebas
- `pruebas/prueba_inscribir_otro_curso.js` 27/27. Capturas: `otro-curso-selector-lada.png`,
  `otro-curso-aviso-existe.png`, `otro-curso-inscribir.png`, `otro-curso-historial.png`,
  `otro-curso-inscribir-celular.png`, `otro-curso-aviso-celular.png`.
