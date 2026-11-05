# 2026-11-05 · Cursos en línea (ticket #6)

Pedido por Enoc el 3 nov 2026. Respondieron Enoc, Eliab y Jared. Se trata de vender los cursos grabados de la Academia Glam: una unidad de negocio aparte de la gira.
("permitido generar": pendiente)

## Cómo funciona hoy (respuestas)
- Hay 55 cursos (lista de Eliab). Se venden por separado y cada uno tiene su precio público. No hay Básico ni VIP.
- Son cursos grabados: la alumna los ve cuando quiera, en la Academia (https://academiaglamr.cursosdereposteria.com.mx/#/).
- Para entrar, la alumna tiene que liquidar. Normalmente:
  1. promete el pago;
  2. paga;
  3. Enoc o Beth confirman el pago en el banco;
  4. se le manda el cupón y el link.
- Acceso: el link de la Academia es el mismo para todas y cada curso tiene su propio link. Se genera un cupón por curso individual que baja el precio a cero.
- La plataforma da el diploma.
- Las promesas en línea salen en el semáforo de cada vendedora, marcadas "En línea".
- Sección para todas las vendedoras, Cobranza y administradores. Beth no necesita usuario por ahora.
- El Excel de ventas pasadas se carga en una fase posterior.

## Qué se va a hacer

### Base
Las tablas son nuevas, así que no hay datos que respaldar. Las funciones se respaldan en `respaldo.funciones_20261105`.
- `cursos_en_linea`: nombre, precio, link del curso y activo.
  - Se cargan los 55 sin precio ni link.
  - Los llenan los administradores en Precios → "Cursos en línea".
- `ventas_en_linea`:
  - persona, curso en línea, vendedora, precio pactado y fecha de promesa;
  - cupón, quién dio el acceso y cuándo.
  - Lo que lleva pagado y lo que debe **no se guarda**: se calcula de sus pagos.
- `pagos`: gana `venta_en_linea_id` (va esto o la inscripción, no los dos). Usa la misma confirmación "Llegó / No llegó" que ya existe.
- `venta_en_linea_estado(id)`: Prometido → Pagado (falta confirmar) → Liquidado → Con acceso. Se calcula, no se guarda.
- Permiso nuevo `confirmar_pagos_en_linea`. Lo tienen los administradores (Enoc); Beth lo tendrá cuando tenga usuario.

### Hub
- Sección **"Cursos en línea"** en el menú (vendedoras, Cobranza y administradores):
  - lista de ventas con su estado y filtro por vendedora y estado;
  - botón "+ Venta en línea": busca la persona (o la da de alta), elige el curso, toma el precio del catálogo (editable) y la fecha de promesa;
  - registrar pago: el mismo modal de Registrar pago, con banco y comprobante;
  - confirmar pago: solo quien tenga el permiso;
  - **"Dar acceso"**: solo cuando ya está liquidado.
    - Se escribe el cupón.
    - Se abre WhatsApp con el mensaje: link de la Academia + link del curso + cupón.
    - Queda marcado "Con acceso", con quién y cuándo.
- Semáforo de la vendedora (Te toca cobrar): sus promesas en línea, con la etiqueta "En línea" y el mismo rojo/amarillo/verde.
- Ficha de la persona: un apartado "Cursos en línea" con lo que compró.
- Precios: catálogo de los 55, con precio y link editables por los administradores.
- Plantilla de mensaje "Acceso a curso en línea", editable en Mensajes.
- Todo con `registrarActividad`: venta_en_linea_creada, pago_en_linea_registrado, pago_en_linea_confirmado, acceso_en_linea_dado.

### Glamy
- Manual: cómo registrar una venta en línea, quién confirma y cuándo se da el acceso.
- Consulta: "¿cuántas ventas en línea van este mes?" y "¿quién debe de en línea?", por separado de la gira.

## Nada de fotos
- El estado y el saldo se calculan de los pagos de hoy. Si se marca "No llegó", la venta regresa sola a "Pagado (falta confirmar)" o a "Prometido".
- El semáforo de la vendedora, la sección y Glamy usan la misma `venta_en_linea_estado`.
- Los números de la gira no incluyen ventas en línea. Hay reportes separados.

## ¿Qué pasa si…?
1. **La capturan tarde.** Se registra con su fecha de promesa real. El semáforo la pinta según la fecha de hoy.
2. **Paga y liquida.** Pasa a "Liquidado (falta confirmar)". Al confirmarlo, se activa "Dar acceso".
3. **Su pago no se encontró.** "No llegó": deja de contar, el estado baja y "Dar acceso" se apaga si todavía no se había dado. Si ya tenía acceso, se crea una tarea a Cobranza.
4. **Se cambia de curso en línea.** Antes de dar el acceso se puede cambiar el curso: lo pagado se queda y el precio se recalcula. Después del acceso, no se puede (el cupón ya se usó). Cualquier caso especial lo ve un administrador.
5. **Cede su lugar.** No aplica: el curso grabado es personal.
6. **Reembolso.** Lo hace un administrador. La venta queda "Cancelada" y, si ya tenía acceso, se crea una tarea para quitarlo en la plataforma.
7. **Su curso cambia de fecha.** No aplica: no tiene fecha.
8. **La misma persona compra dos cursos o tiene dos teléfonos.** Son dos ventas de la misma persona. Los teléfonos se manejan como hoy (principal y alterno).
9. **Su curso ya pasó.** No aplica. Una venta "Con acceso" queda terminada.
10. **¿Todos lo cuentan igual?** Sí: la sección, el semáforo, Cobranza y Glamy usan la misma función. La gira y el Embudo de la gira no las cuentan.

## Vigilante e historias
- Regla roja: venta "Con acceso" sin estar liquidada y confirmada.
- Regla amarilla: liquidada y confirmada hace más de 2 días sin acceso.
- Regla amarilla: curso en línea vendido sin precio en el catálogo.
- Historia H14:
  1. promesa;
  2. pago;
  3. "No llegó" (el estado baja);
  4. pago nuevo, confirmado;
  5. acceso.
  - Además: la gira no la cuenta.

## Pruebas
- `prueba_cursos_en_linea.js`: alta, pago, confirmación con y sin permiso, "Dar acceso" bloqueado hasta liquidar, mensaje de WhatsApp, semáforo "En línea", "No llegó" y celular a 390 px.
- `correr_todas.js` en verde, historias con `fallas=0`, vigilante rojo en 0 y examen de Glamy.
- Al publicar, se cierra el ticket #6 (Alondra).

## Por decidir (Enoc)
- **El cupón.** ¿Lo escribe quien da el acceso (Enoc, Eliab, Jared…) o cualquier vendedora? Propuesta: quien tenga el permiso de confirmar pagos, porque así el acceso no sale antes de que el dinero esté confirmado.
- **Pagos en línea en Cobranza.** Propuesta: sí, con una pestaña "En línea" separada de la gira.
