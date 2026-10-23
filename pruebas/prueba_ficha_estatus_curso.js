/* Ficha de la inscrita: el estatus sale de sus pagos (ya no se le pueden poner estatus de lead),
   "Cambiar de curso" y la "Fecha de pago" a la vista. Origen: una inscrita quedó en "Pago por confirmar"
   con su pago ya confirmado y no se le podía cambiar el curso. Datos de ejemplo. */
const { abrirHub, ESTATUS_EJEMPLO } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ESTATUS = [...ESTATUS_EJEMPLO, { id:9, clave:'algo_esta_mal', etiqueta:'Algo está mal' }];
const INSC = { id:'i1', persona_id:'p1', evento_id:'evA', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:1, paquete:'BASICO',
  asesor_id:'u2', notas_migracion:'Nota vieja', fecha_proximo_pago:null,
  personas:{ id:'p1', nombre:'Alumna Estatus', telefono_principal:'7831000001' }, eventos:{ fecha:mas(100), sede:'Salón', ciudades:{ nombre:'Ciudad A' } }, pagos:[] };
const EVENTOS = [
  { id:'evA', fecha:mas(100), ciudad_id:'cA', ciudades:{ nombre:'Ciudad A' } },
  { id:'evB', fecha:mas(110), ciudad_id:'cB', ciudades:{ nombre:'Ciudad B' } },
  { id:'evC', fecha:mas(120), ciudad_id:'cC', ciudades:{ nombre:'Ciudad C' } },
];

(async () => {
  const h = await abrirHub({ estatus:ESTATUS, usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true } });
  const { p, check } = h;
  await p.evaluate(ev => { EVENTOS_CAL = ev; EVENTOS_CAL_PASADOS = []; CIUDADES = ev.map(e => ({ id:e.ciudad_id, nombre:e.ciudades.nombre, estado:'Estado' })); }, EVENTOS);
  const abrir = async (extra = {}, otras = []) => {
    await p.evaluate(([fila, otras]) => { window.__tablas.inscripciones = [fila, ...otras]; window.__tablas.pagos = []; window.__ops = []; return abrirModalInscripcion('i1'); },
      [{ ...INSC, ...extra }, otras]);
    await p.waitForTimeout(300);
  };
  const opciones = () => p.$$eval('#modalInscEstatusSelect option', xs => xs.map(x => x.textContent));

  h.paso('1. El estatus sale de sus pagos; ya no hay estatus de lead');
  await abrir();
  const op = await opciones();
  check(op[0].includes('Activa · según sus pagos: Con anticipo (deben)') && await p.inputValue('#modalInscEstatusSelect') === 'auto',
        'quedó en "Pago por confirmar" pero su pago dice: con anticipo');
  check(op.length === 5 && !op.some(o => o.includes('Pago por confirmar') || o.includes('Aún no vence')), 'solo 5 opciones, sin estatus de lead: ' + op.join(' | '));
  await p.evaluate(() => { document.getElementById('inscFichaMas').open = true; });
  await h.limpiarOps();
  await p.click('#guardarInscEstatus');
  await p.waitForTimeout(300);
  check((await h.ops('inscripciones', 'update'))[0]?.estatus_id === 11, 'guardar "Activa" lo pone en Con anticipo');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'inscripcion_estatus' && a.detalle.includes('Con anticipo (deben)')), 'la actividad lo dice en palabras de inscrita');

  h.paso('2. Marcas a mano: verificar, no va');
  await abrir({ estatus_id:9 });
  check((await p.$eval('#modalInscEstatusSelect', s => s.options[s.selectedIndex].textContent)).includes('Verificar antes de cobrar'), '"Algo está mal" se respeta: verificar antes de cobrar');
  await p.fill('#modalPagoMonto', '200');
  await h.limpiarOps();
  await p.click('#guardarInscPago');
  await p.waitForTimeout(300);
  check(!('estatus_id' in ((await h.ops('inscripciones', 'update'))[0] || {})), 'un abono no le quita la marca de verificar');
  await abrir();
  await p.evaluate(() => { document.getElementById('inscFichaMas').open = true; });
  await p.selectOption('#modalInscEstatusSelect', '6');
  await h.limpiarOps();
  await p.click('#guardarInscEstatus');
  await p.waitForTimeout(300);
  check((await h.ops('inscripciones', 'update'))[0]?.estatus_id === 6, '"No va a ir al curso" se marca a mano');

  h.paso('3. Un abono pone el estatus según sus pagos');
  await abrir({ estatus_id:2, anticipo:0, restante:1400 });
  check((await opciones())[0].includes('Sin pago'), 'sin pago');
  await p.fill('#modalPagoMonto', '1400');
  await h.limpiarOps();
  await p.click('#guardarInscPago');
  await p.waitForTimeout(300);
  check((await h.ops('inscripciones', 'update'))[0]?.estatus_id === 12, 'al liquidar queda liquidada');

  h.paso('4. Curso y fecha de pago a la vista');
  await abrir();
  check((await p.textContent('#fichaCursoTxt')).includes('Ciudad A') && await p.isVisible('#btnCambiarCurso'), 'dice su curso y deja cambiarlo');
  check(await p.isVisible('#inscProximoPago'), 'la fecha de pago está a la vista (antes estaba escondida en "Más información")');
  await p.fill('#inscProximoPago', mas(20));
  await p.dispatchEvent('#inscProximoPago', 'change');
  await p.waitForTimeout(300);
  check((await h.ops('inscripciones', 'update')).some(u => u.fecha_proximo_pago === mas(20)), 'guarda la fecha de pago');
  await h.captura('ficha-curso-y-fecha.png');

  h.paso('5. Cambiar de curso');
  await p.click('#btnCambiarCurso');
  await p.waitForTimeout(200);
  const opsCurso = await p.$$eval('#fichaCursoSelect option', xs => xs.map(x => x.value));
  check(!opsCurso.includes('evA') && opsCurso.includes('evB'), 'no ofrece el curso donde ya está');
  await h.captura('ficha-cambiar-curso.png');
  await p.fill('#fichaCursoSelectBuscar', 'Ciudad B');
  await p.keyboard.press('Enter');
  check(await p.inputValue('#fichaCursoSelect') === 'evB', 'se elige escribiendo la ciudad');
  await h.limpiarOps();
  await p.click('#fichaCursoOk');
  await p.waitForSelector('#modalConfirmar.open');
  check((await p.textContent('#modalConfirmar')).includes('Ciudad A') && (await p.textContent('#modalConfirmar')).includes('Ciudad B'), 'confirma de dónde a dónde');
  await p.click('#confirmarSi');
  await p.waitForTimeout(400);
  const mv = (await h.ops('inscripciones', 'update'))[0];
  check(mv && mv.evento_id === 'evB' && mv.notas_migracion.startsWith('Nota vieja || CAMBIÓ DE CURSO de Ciudad A'), 'la mueve y deja el rastro en sus notas');
  check(!('anticipo' in mv) && !('asesor_id' in mv), 'conserva lo que pagó y su vendedora');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'inscripcion_movida'), 'queda en la actividad');

  h.paso('6. No la mueve a un curso donde ya está inscrita');
  await abrir({}, [{ ...INSC, id:'i2', evento_id:'evC' }]);
  await p.click('#btnCambiarCurso');
  await p.fill('#fichaCursoSelectBuscar', 'Ciudad C');
  await p.keyboard.press('Enter');
  await h.limpiarOps();
  await p.click('#fichaCursoOk');
  await p.waitForTimeout(300);
  check((await h.ops('inscripciones', 'update')).length === 0 && (await p.textContent('#toast')).includes('ya está inscrita en ese curso'), 'avisa y no la duplica');

  h.paso('7. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await abrir();
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('ficha-curso-celular.png');

  await h.terminar();
})();
