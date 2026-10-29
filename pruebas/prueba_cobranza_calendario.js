/* Cobranza → Calendario (29 oct 2026): lo primero que se ve en Cobranza. El mes con los nombres de quién paga cada
   día, sin filtros ni grupos: leads (su promesa de anticipo), inscritas (su fecha de pago) y, si su rol la ve,
   Academia Glam (mensualidades y abonos prometidos). Tocar un día da su lista con WhatsApp y Abrir. Lo que ya pasó
   sin pagar sale en rojo; lo de meses anteriores y lo que no tiene fecha se avisa arriba. Mismos renglones que
   Por cobrar (itemsCobranza). Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const MES = HOY.slice(0, 7);
// Días dentro de este mes para que la prueba no dependa de la fecha
const finMes = (() => { const [a, m] = MES.split('-').map(Number); return new Date(a, m, 0).toLocaleDateString('en-CA'); })();
const DIA_HOY = HOY, DIA_PASADO = HOY.slice(8) > '01' ? MES + '-01' : null, DIA_FUTURO = HOY < finMes ? finMes : null;
const ev = (id, dias) => ({ id, fecha:mas(dias), curso_id:'cur1', ciudades:{ id:'c' + id, nombre:'Ciudad ' + id } });
const insc = (id, nombre, extra) => ({ id, anticipo:700, restante:700, liquidado:false, precio_pactado:1400, paquete:'BASICO', asesor_id:'u2', fecha_proximo_pago:null,
  personas:{ id:'p' + id, nombre, telefono_principal:'5500000000' }, estatus:{ id:11, clave:'anticipo_vigente', etiqueta:'x' }, ...extra });
const lead = (id, nombre, extra) => ({ id, persona_id:'p' + id, estatus_id:2, estatus:{ id:2 }, asesor_id:'u2', ciudad_interes_id:'cA', creado_en:new Date().toISOString(),
  personas:{ id:'p' + id, nombre, telefono_principal:'5511111111' }, ...extra });

(async () => {
  const leads = [
    lead('l1', 'Lead Paga Hoy', { fecha_compromiso_pago:DIA_HOY, monto_anticipo:700 }),
    lead('l2', 'Lead Sin Fecha', {}),
    lead('l3', 'Lead Dos Hoy', { fecha_compromiso_pago:DIA_HOY }),
    lead('l4', 'Lead Tres Hoy', { fecha_compromiso_pago:DIA_HOY }),
    lead('l5', 'Lead Cuatro Hoy', { fecha_compromiso_pago:DIA_HOY }),
    lead('l6', 'Lead Del Mes Pasado', { fecha_compromiso_pago:mas(-40) }),
  ];
  if(DIA_PASADO) leads.push(lead('l7', 'Lead Ya Vencio', { fecha_compromiso_pago:DIA_PASADO }));
  const h = await abrirHub({ tablas:{
      inscripciones:[
        insc('i1', 'Inscrita Con Fecha', { eventos:ev('A', 60), fecha_proximo_pago:DIA_FUTURO || DIA_HOY }),
        insc('i2', 'Inscrita Sin Fecha', { eventos:ev('B', 60) }),
      ],
      leads, pagos:[],
      vista_agl_cobros:[{ mensualidad_id:'m1', suscripcion_id:'s1', numero:3, meses:24, vence:DIA_HOY, monto:799, estado:'pendiente', vendedor_id:'u2',
        alumna_nombre:'Alumna Academia', alumna_telefono:'5522222222', plan_nombre:'Chef repostero' }],
      vista_agl_cuentas:[{ suscripcion_id:'s2', vendedor_id:'u2', fecha_promesa:null, alumna_nombre:'Abonos Sin Fecha', alumna_telefono:'5533333333', plan_nombre:'Hobbie', saldo:1000, por_confirmar:0 }],
    },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true } });
  const { p, check } = h;
  await p.evaluate(async () => {
    cursoActivoIdCache = 'cur1'; CIUDADES_GIRA_ACTIVA = ['cA'];
    window.__wa = null; abrirEnviarWhatsApp = o => { window.__wa = o; };
    setActiveSection('cobranza');
    await renderCobranza();
  });
  await p.waitForTimeout(600);
  const cal = () => p.textContent('#cobVistaCalendario');
  const dia = f => p.textContent(`[data-cc-dia="${f}"]`);

  h.paso('1. Es lo primero que se ve en Cobranza, sin filtros');
  check(await p.isVisible('#cobVistaCalendario') && !(await p.isVisible('#cobVistaCobrar')) && (await p.textContent('#cobTabs .subtab.active')).includes('Calendario'), 'abre en Calendario');
  check(!(await p.$('#cobVistaCalendario select')) && !(await p.$('#cobVistaCalendario input')), 'sin filtros ni buscadores');
  check((await p.$$('#cobVistaCalendario .cc-dia:not(.fuera)')).length === Number(finMes.slice(8)), 'un cuadro por cada día del mes');

  h.paso('2. Los nombres en su día');
  const hoyTxt = await dia(DIA_HOY);
  check(hoyTxt.includes('Lead Paga') && hoyTxt.includes('+') && hoyTxt.includes('más'), 'hoy: los primeros nombres y "+N más"');
  check(await p.$eval(`[data-cc-dia="${DIA_HOY}"] .cc-n`, x => x.textContent) === '5', 'y cuántos son (4 leads + 1 de Academia Glam)');
  check(await p.$eval(`[data-cc-dia="${DIA_HOY}"]`, x => x.classList.contains('hoy')), 'hoy va marcado');
  if(DIA_FUTURO) check((await dia(DIA_FUTURO)).includes('Inscrita Con'), 'la inscrita en su fecha de pago');
  if(DIA_PASADO) check(await p.$eval(`[data-cc-dia="${DIA_PASADO}"]`, x => x.classList.contains('vencido')), 'lo que ya pasó sin pagar, en rojo');
  const avisos = await cal();
  check(avisos.includes('1 atrasado de meses anteriores') && avisos.includes('3 sin fecha de pago'), 'arriba: atrasados de antes y quién no tiene fecha (lead, inscrita sin fecha y abonos sin fecha)');
  check(!(await cal()).includes('Inscrita Sin Fecha'), 'la inscrita sin fecha de pago no se inventa un día');
  await h.captura('cobranza-calendario.png');

  h.paso('3. Tocar un día: su lista con WhatsApp y Abrir');
  await p.click(`[data-cc-dia="${DIA_HOY}"]`);
  await p.waitForTimeout(200);
  const lista = await p.textContent('#cobVistaCalendario .cc-lista');
  check(lista.includes('5') && lista.includes('Lead Paga Hoy') && lista.includes('Lead Cuatro Hoy') && lista.includes('Alumna Academia') && lista.includes('Academia Glam'), 'la lista del día, con todos');
  check(lista.includes('$700') && lista.includes('$799') && lista.includes('$1,499'), 'cuánto paga cada una y el total del día');
  await p.click('.cc-fila[data-cc-k="lead"][data-cc-id="l1"] [data-cc-acc="wa"]');
  check(await p.evaluate(() => window.__wa?.telefono === '5511111111' && window.__wa?.leadId === 'l1'), 'WhatsApp con su teléfono');
  await p.click('.cc-fila[data-cc-k="lead"][data-cc-id="l1"] [data-cc-acc="abrir"]');
  await p.waitForTimeout(400);
  check(await p.evaluate(() => document.getElementById('modalLead').classList.contains('open') && leadAbiertoId === 'l1'), 'Abrir abre su lead');
  await p.evaluate(() => document.getElementById('modalLead').classList.remove('open'));
  await p.waitForTimeout(300);
  await h.captura('cobranza-calendario-dia.png');

  h.paso('4. Atrasados de antes y sin fecha');
  await p.click('.cc-aviso [data-cc-dia="antes"]');
  await p.waitForTimeout(200);
  check((await p.textContent('#cobVistaCalendario .cc-lista')).includes('Lead Del Mes Pasado') && (await p.textContent('#cobVistaCalendario .cc-lista')).includes('venció'), 'los atrasados de meses anteriores, con cuándo venció');
  await p.click('[data-cc-sinfecha]');
  await p.waitForTimeout(300);
  check(await p.isVisible('#cobVistaCobrar') && (await p.textContent('#cobTabs .subtab.active')).includes('Por cobrar'), '"Ver en Por cobrar" lleva a la lista de siempre');
  await p.click('#cobTabs [data-cob-tab="calendario"]');
  await p.waitForTimeout(300);

  h.paso('5. Cambiar de mes');
  await p.click('[data-cc-mes="1"]');
  await p.waitForTimeout(300);
  check(!(await p.$(`[data-cc-dia="${DIA_HOY}"]`)) && (await p.$$('#cobVistaCalendario .cc-dia:not(.fuera)')).length >= 28, 'el mes siguiente');
  await p.click('[data-cc-hoy]');
  await p.waitForTimeout(300);
  check(!!(await p.$(`[data-cc-dia="${DIA_HOY}"].sel`)), '"Hoy" regresa con el día de hoy abierto');

  h.paso('6. Sin la sección Academia Glam, no sale lo de la Academia');
  await p.evaluate(() => { const antes = seccionesPermitidas; window.seccionesPermitidas = () => antes().filter(s => s !== 'academia_glam'); return ccCargar(); });
  await p.waitForTimeout(300);
  check(!(await cal()).includes('Alumna Academia') && !(await cal()).includes('Academia Glam'), 'solo lo de la gira');

  h.paso('7. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('cobranza-calendario-celular.png');

  await h.terminar();
})();
