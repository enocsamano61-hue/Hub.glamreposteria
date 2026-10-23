/* Ficha de la inscrita: forma de pago y banco por separado, y la lista de sus pagos con "✏️ Corregir"
   (fecha, forma y banco). Origen: no se podía capturar el banco (compartía casilla con la forma) y un
   pago guardado no se podía corregir. Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const INSC = {
  id:'i1', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:2, asesor_id:'u2', notas_migracion:null, fecha_proximo_pago:null,
  personas:{ id:'p1', nombre:'Alumna Prueba Pagos', telefono_principal:'0000000000' },
  eventos:{ fecha:'2027-02-07', sede:'Salón', ciudades:{ nombre:'Ciudad Prueba' } },
  pagos:[
    { id:'pg1', monto:700, fecha:'2026-10-15', hora:'18:30:12', banco:'Transferencia', forma_pago:'Transferencia', concepto:'curso', verificacion:'confirmado' },
    { id:'pg2', monto:200, fecha:'2026-10-20', hora:'10:00:00', banco:null, forma_pago:'Efectivo', concepto:'curso', verificacion:'no_llego' },
  ],
};

(async () => {
  const h = await abrirHub({ usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:false }, permisosAccion:{} });
  const { p, check } = h;
  const abrir = async (permisos) => {
    await p.evaluate(([fila, perm]) => {
      PERMISOS_ACCION_CACHE = perm ? { Cobranza: new Set(perm) } : {};
      window.__tablas.inscripciones = [JSON.parse(JSON.stringify(fila))]; window.__tablas.pagos = JSON.parse(JSON.stringify(fila.pagos)); window.__ops = [];
      return abrirModalInscripcion('i1');
    }, [INSC, permisos]);
    await p.waitForTimeout(200);
  };

  h.paso('1. Forma de pago y banco por separado');
  await abrir(['confirmar_pagos']);
  await p.click('#cobroFormas [data-forma="Transferencia"]');
  await p.fill('#modalPagoBanco', 'Mercado Pago');
  check(await p.getAttribute('#cobroFormas [data-forma="Transferencia"]', 'class') === 'activo' && await p.inputValue('#modalPagoBanco') === 'Mercado Pago',
        'se marca Transferencia y se escribe el banco, sin pisarse');
  check(await p.evaluate(() => document.getElementById('modalPagoBanco').getAttribute('list') === 'bancosLista' && document.querySelectorAll('#bancosLista option').length >= 8),
        'el banco sugiere los bancos más usados');
  await p.fill('#modalPagoMonto', '300');
  await p.fill('#modalPagoFecha', '2026-10-18');
  await h.limpiarOps();
  await p.click('#guardarInscPago');
  await p.waitForTimeout(300);
  const nuevo = (await h.ops('pagos', 'insert'))[0];
  check(nuevo && nuevo.forma_pago === 'Transferencia' && nuevo.banco === 'Mercado Pago' && nuevo.fecha === '2026-10-18' && nuevo.monto === 300,
        'guarda forma, banco y fecha (' + JSON.stringify(nuevo) + ')');

  h.paso('2. Si escriben la forma en la casilla del banco, cuenta como forma');
  await abrir(['confirmar_pagos']);
  await p.fill('#modalPagoBanco', 'efectivo');
  await p.fill('#modalPagoMonto', '100');
  await h.limpiarOps();
  await p.click('#guardarInscPago');
  await p.waitForTimeout(300);
  const viejo = (await h.ops('pagos', 'insert'))[0];
  check(viejo && viejo.forma_pago === 'Efectivo' && viejo.banco === null, 'forma Efectivo, sin banco (' + JSON.stringify(viejo) + ')');

  h.paso('3. Lista de pagos en la ficha');
  await abrir(['confirmar_pagos']);
  const lista = await p.textContent('#fichaPagos');
  check(lista.includes('Pagos registrados (2)') && lista.includes('$700') && lista.includes('Transferencia') && !lista.includes('Transferencia · Transferencia'),
        'muestra sus pagos sin repetir "Transferencia"');
  check(lista.includes('no llegó'), 'el pago anulado dice que no llegó');
  await p.click('#fichaPagos summary');
  await h.captura('ficha-pagos-lista.png');

  h.paso('4. Corregir fecha, forma y banco');
  await p.click('#fichaPagos [data-fp-editar="pg1"]');
  check(await p.inputValue('#fichaPagos [data-fp-banco]') === '' && await p.inputValue('#fichaPagos [data-fp-forma]') === 'Transferencia',
        'al corregir, el banco que era la forma sale vacío para escribirlo');
  await p.fill('#fichaPagos [data-fp-fecha]', '2099-01-01');
  await p.click('#fichaPagos [data-fp-guardar="pg1"]');
  await p.waitForTimeout(200);
  check((await h.ops('pagos', 'update')).length === 0 && (await p.textContent('#toast')).includes('no puede ser después de hoy'), 'no deja una fecha futura');
  await p.fill('#fichaPagos [data-fp-fecha]', '2026-10-16');
  await p.fill('#fichaPagos [data-fp-banco]', 'BanCoppel');
  await h.captura('ficha-pagos-corregir.png');
  await h.limpiarOps();
  await p.click('#fichaPagos [data-fp-guardar="pg1"]');
  await p.waitForTimeout(300);
  const up = (await h.ops('pagos', 'update'))[0];
  check(up && up.fecha === '2026-10-16' && up.banco === 'BanCoppel' && up.forma_pago === 'Transferencia' && !('monto' in up), 'corrige fecha y banco, sin tocar el monto (' + JSON.stringify(up) + ')');
  check((await h.ops('inscripciones', 'update')).length === 0, 'no mueve el saldo');
  const act = (await h.ops('actividad_usuario', 'insert')).find(a => a.accion === 'pago_corregido');
  check(act && act.detalle.includes('fecha') && act.detalle.includes('fecha 15 oct → 16 oct') && act.detalle.includes('banco Transferencia → BanCoppel'), 'queda en la actividad con el antes y el después (' + act?.detalle + ')');
  check((await p.textContent('#fichaPagos')).includes('Transferencia · BanCoppel'), 'la lista ya muestra el banco');
  await h.limpiarOps();
  await p.click('#fichaPagos [data-fp-editar="pg1"]');
  await p.click('#fichaPagos [data-fp-guardar="pg1"]');
  await p.waitForTimeout(200);
  check((await h.ops('pagos', 'update')).length === 0, 'sin cambios no guarda nada');

  h.paso('4b. Estado: confirmado ↔ por confirmar, sin mover el saldo');
  await p.click('#fichaPagos [data-fp-editar="pg1"]');
  check(await p.inputValue('#fichaPagos [data-fp-estado]') === 'confirmado', 'el pago confirmado sale como Confirmado');
  await p.selectOption('#fichaPagos [data-fp-estado]', 'por_confirmar');
  await h.limpiarOps();
  await p.click('#fichaPagos [data-fp-guardar="pg1"]');
  await p.waitForTimeout(300);
  const upE = (await h.ops('pagos', 'update'))[0];
  check(upE && upE.verificacion === 'por_confirmar' && upE.verificado_en === null, 'pasa a por confirmar (' + JSON.stringify(upE) + ')');
  check((await h.ops('inscripciones', 'update')).length === 0, 'el saldo no se mueve');
  check((await p.textContent('#fichaPorConfirmar')).includes('$700') && (await p.textContent('#fichaPagos')).includes('🏦 por confirmar'), 'aparece arriba en "por confirmar" para "Ya llegó / No llegó"');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'pago_corregido' && a.detalle.includes('estado confirmado → por confirmar')), 'queda en la actividad');
  await h.captura('ficha-pagos-estado.png');
  await p.click('#fichaPagos [data-fp-editar="pg1"]');
  await p.selectOption('#fichaPagos [data-fp-estado]', 'confirmado');
  await h.limpiarOps();
  await p.click('#fichaPagos [data-fp-guardar="pg1"]');
  await p.waitForTimeout(300);
  const upC = (await h.ops('pagos', 'update'))[0];
  check(upC && upC.verificacion === 'confirmado' && upC.verificado_por === 'u1', 'y de regreso a confirmado, con quién lo confirmó');
  await p.click('#fichaPagos [data-fp-editar="pg2"]');
  check(!(await p.$('#fichaPagos [data-fp-estado]')) && (await p.textContent('#fichaPagos')).includes('no llegó (anulado)'), 'el anulado no se cambia desde aquí');
  await p.click('#fichaPagos [data-fp-cancelar]');

  h.paso('5. Sin permiso no hay "Corregir"');
  await abrir(null);
  check((await p.textContent('#fichaPagos')).includes('Pagos registrados (2)') && (await p.$$('#fichaPagos [data-fp-editar]')).length === 0, 've sus pagos pero no puede corregirlos');

  h.paso('6. Celular');
  await abrir(['confirmar_pagos']);
  await p.setViewportSize({ width:390, height:800 });
  await p.click('#fichaPagos summary');
  await p.click('#fichaPagos [data-fp-editar="pg1"]');
  await p.waitForTimeout(150);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('ficha-pagos-celular.png');

  await h.terminar();
})();
