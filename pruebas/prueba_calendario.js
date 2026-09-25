/* Calendario (fase 5): tarjetas por curso con avance y estado, y la hoja
   del día como centro de operaciones. Datos inventados. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const dia = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const EVS = [
  { id:'evP', fecha:dia(-6), ciudad:'Pasado Sin Recepcion', cerrada:null },
  { id:'evK', fecha:dia(-4), ciudad:'Sin Cerrar', cerrada:null },
  { id:'evC', fecha:dia(-2), ciudad:'Cerrado Con Saldo', cerrada:'2026-09-01T00:00:00Z' },
  { id:'evH', fecha:HOY,     ciudad:'Hoy Ciudad', cerrada:null },
  { id:'evM', fecha:dia(3),  ciudad:'Manana Tres', cerrada:null },
];
const eventos = EVS.map(e => ({ id:e.id, fecha:e.fecha, ciudad_id:'c-' + e.id, curso_id:'cur1', sede:'Salón ' + e.id,
  recepcion_cerrada_en:e.cerrada, ciudades:{ id:'c-' + e.id, nombre:e.ciudad }, cursos:{ nombre:'LOS PASTELES MAS SABROSOS DE LA CHEF' } }));
let n = 0;
const insc = (evId, extra) => ({ id:'i' + (++n), evento_id:evId, anticipo:700, restante:700, precio_pactado:1400, liquidado:false,
  estatus_id:11, asistencia:null, paquete:'BASICO', asesor_id:'u2', estatus_antes_de_cierre:null, acceso_online_en:null,
  personas:{ id:'p' + n, nombre:'Alumna ' + n + ' Prueba', telefono_principal:'00000000' + String(n).padStart(2, '0') },
  eventos:{ ...eventos.find(e => e.id === evId) }, ...extra });
const liq = { anticipo:1400, restante:0, liquidado:true, estatus_id:12 };
const inscripciones = [
  insc('evP', liq), insc('evP', liq), insc('evP'),
  insc('evK', { ...liq, asistencia:'llego' }), insc('evK'),
  insc('evC', { ...liq, asistencia:'llego' }), insc('evC', { anticipo:1100, restante:300, asistencia:'llego' }),
  insc('evC', { asistencia:'no_llego', estatus_id:14, estatus_antes_de_cierre:11 }),
  insc('evH', { ...liq, asistencia:'llego' }), insc('evH'), insc('evH', { estatus_id:6 }),
  insc('evM'), insc('evM', liq),
];

(async () => {
  const h = await abrirHub({ tablas:{ cursos:[{ id:'cur1', nombre:'LOS PASTELES MAS SABROSOS DE LA CHEF' }], eventos, inscripciones, leads:[] } });
  const { p, check } = h;
  await p.evaluate(async () => { cursoActivoIdCache = undefined; inicioGiraCache = null; setActiveSection('calendario'); await renderCalendario(); });
  await p.waitForTimeout(200);
  const irA = fecha => p.evaluate(f => {
    const [y, m] = f.split('-').map(Number);
    const i = calendarioMeses.findIndex(x => x.y === y && x.m === m - 1);
    if(i >= 0){ calendarioMesIdx = i; pintarCalendarioMes(); }
  }, fecha);
  const tarjeta = async fecha => { await irA(fecha); const el = await p.$(`.cal-tarjeta[data-key="${fecha}"]`); return el ? (await el.innerText()).replace(/\s+/g, ' ') : ''; };

  h.paso('1. Cada día con curso es una tarjeta con ciudad, alumnas, avance y estado');
  let t = await tarjeta(dia(-6));
  check(t.includes('PASADO SIN RECEPCION') || t.includes('Pasado Sin Recepcion'), 'ciudad: ' + t);
  check(t.includes('3 alumnas') && t.includes('2/3 liquidadas') && t.includes('Pasó'), 'pasado sin Recepción: liquidadas y “Pasó” (no se marca como pendiente): ' + t);
  t = await tarjeta(dia(-4));
  check(t.includes('1/2 llegaron') && t.includes('Falta cerrar recepción'), 'con llegadas sin cerrar: ' + t);
  t = await tarjeta(dia(-2));
  check(t.includes('2/3 llegaron') && t.includes('Quedan $300'), 'cerrado con saldo de quien llegó: ' + t);
  t = await tarjeta(HOY);
  check(t.includes('2 alumnas') && t.includes('1/2 llegaron') && t.includes('Recepción hoy'), 'hoy (“no va al curso” no cuenta): ' + t);
  t = await tarjeta(dia(3));
  check(t.includes('1/2 liquidadas') && t.includes('En 3 días'), 'próximo: ' + t);
  check(await p.$eval(`.cal-tarjeta[data-key="${dia(3)}"] .cal-barra i`, el => el.style.width) === '50%', 'barra al 50%');
  await irA(HOY);
  check((await p.textContent('.cal-legend')).includes('Requiere atención'), 'leyenda con los estados');
  await h.captura('calendario-computadora.png');

  h.paso('2. La hoja del día: centro de operaciones');
  await p.click(`.cal-tarjeta[data-key="${HOY}"]`);
  await p.waitForTimeout(200);
  const hoja = (await p.innerText('#sheetEventos')).replace(/\s+/g, ' ');
  check(hoja.includes('Hoy Ciudad') && hoja.includes('Recepción hoy') && hoja.includes('Entrar a recepción'), 'ciudad, estado y botón');
  check(/1 llegaron/.test(hoja) && /1 faltan/.test(hoja), 'llegaron / faltan: ' + hoja.slice(0, 300));
  check(hoja.includes('$2,800') && hoja.includes('$700'), 'cobrado $2,800 (incluye a la que no va) y pendiente $700');
  await h.captura('calendario-hoja.png');
  await p.click('[data-cat="liq"]');
  await p.waitForTimeout(200);
  check(await p.isVisible('#sheetListaBody') && (await p.textContent('#sheetListaLabel')).length > 0, 'las filas abren la lista de alumnas');
  await p.evaluate(() => cerrarSheetCalendario());

  h.paso('3. Curso futuro: liquidadas / deben');
  await irA(dia(3));
  await p.click(`.cal-tarjeta[data-key="${dia(3)}"]`);
  await p.waitForTimeout(200);
  const hoja2 = (await p.innerText('#sheetEventos')).replace(/\s+/g, ' ');
  check(/1 liquidadas/.test(hoja2) && /1 deben/.test(hoja2) && !hoja2.includes('No llegaron'), 'futuro sin fila de No llegaron: ' + hoja2.slice(0, 200));
  await p.evaluate(() => cerrarSheetCalendario());

  h.paso('4. De la hoja a No llegaron, ya filtrado por la ciudad');
  await irA(dia(-2));
  await p.click(`.cal-tarjeta[data-key="${dia(-2)}"]`);
  await p.waitForTimeout(200);
  check((await p.innerText('[data-nollegaron-evt="0"]')).includes('1'), 'fila “No llegaron 1”');
  await p.click('[data-nollegaron-evt="0"]');
  await p.waitForTimeout(300);
  check(await p.isVisible('#view-nollegaron'), 'abre No llegaron');
  check(await p.inputValue('#nlCiudad') === 'c-evC', 'con la ciudad del curso elegida: ' + await p.inputValue('#nlCiudad') + ' ' + await p.evaluate(() => [...document.querySelectorAll('#nlCiudad option')].map(o => o.value).join(',') + ' filas:' + nl.filas.length + ' ini:' + nl.ciudadInicial));

  h.paso('5. Resumen del mes y celular');
  await p.evaluate(() => setActiveSection('calendario'));
  await irA(HOY);
  check((await p.textContent('.cal-resumen')).includes('Por cobrar'), 'resumen con Por cobrar');
  check(await p.evaluate(() => document.querySelectorAll('.cal-tarjeta[tabindex="0"]').length) > 0, 'las tarjetas se pueden abrir con teclado');
  await p.setViewportSize({ width:390, height:844 });
  await p.waitForTimeout(150);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sin scroll horizontal');
  await h.captura('calendario-celular.png');

  await h.terminar();
})();
