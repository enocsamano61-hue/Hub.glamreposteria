/* "Te toca cobrar hoy" (30 oct 2026, ticket #4 de Jared): en el Inicio de cada vendedora, lo suyo de hoy (anticipos
   prometidos de sus leads y fechas de pago de sus inscritas) y lo que se le pasó, de la misma lista de Cobranza,
   con WhatsApp y Abrir. No sale a quien no es vendedora ni a quien recibe los tickets; no sale lo de otra vendedora.
   Aviso corto al entrar, una vez al día. Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ev = (id, dias) => ({ id, fecha:mas(dias), curso_id:'cur1', ciudades:{ id:'c' + id, nombre:'Ciudad ' + id } });
const insc = (id, nombre, extra) => ({ id, anticipo:700, restante:700, liquidado:false, precio_pactado:1400, paquete:'BASICO', asesor_id:'u2', fecha_proximo_pago:null,
  personas:{ id:'p' + id, nombre, telefono_principal:'5500000000' }, estatus:{ id:11, clave:'anticipo_vigente', etiqueta:'x' }, eventos:ev('A', 60), ...extra });
const lead = (id, nombre, extra) => ({ id, persona_id:'p' + id, estatus_id:2, estatus:{ id:2 }, asesor_id:'u2', ciudad_interes_id:'cA', creado_en:new Date().toISOString(),
  personas:{ id:'p' + id, nombre, telefono_principal:'5511111111' }, ...extra });

(async () => {
  const h = await abrirHub({ tablas:{
      inscripciones:[
        insc('i1', 'Inscrita Hoy', { fecha_proximo_pago:HOY }),
        insc('i2', 'Inscrita Ajena', { fecha_proximo_pago:HOY, asesor_id:'u9' }),
        insc('i3', 'Inscrita Futura', { fecha_proximo_pago:mas(5) }) ],
      leads:[
        lead('l1', 'Lead Hoy', { fecha_compromiso_pago:HOY, monto_anticipo:700 }),
        lead('l2', 'Lead Vencido', { fecha_compromiso_pago:mas(-3), monto_anticipo:500 }),
        lead('l3', 'Lead Sin Fecha', {}),
        lead('l4', 'Lead Ajeno', { fecha_compromiso_pago:HOY, asesor_id:'u9' }) ],
      pagos:[] },
    usuario:{ id:'u2', nombre:'Vendedora Prueba', rol:'Ventas', es_admin:false, es_vendedor:true },
    equipo:[{ id:'u2', nombre:'Vendedora Prueba', es_vendedor:true, rol:'Ventas' }, { id:'u9', nombre:'Otra Vendedora', es_vendedor:true, rol:'Ventas' }] });
  const { p, check } = h;
  await p.evaluate(() => { cursoActivoIdCache = 'cur1'; CIUDADES_GIRA_ACTIVA = ['cA']; window.__wa = null; abrirEnviarWhatsApp = o => { window.__wa = o; };
    try{ localStorage.clear(); }catch(_){} return renderDashboard(); });
  await p.waitForTimeout(700);
  const t = () => p.textContent('#tocaCobrar');

  h.paso('1. Lo suyo de hoy');
  check(await p.isVisible('#tocaCobrar') && (await t()).includes('Te toca cobrar hoy'), 'el panel en su Inicio');
  check((await t()).includes('Lead Hoy') && (await t()).includes('Inscrita Hoy') && (await t()).includes('$1,400'), 'sus 2 de hoy, con el total ($700 + $700)');
  check(!(await t()).includes('Ajena') && !(await t()).includes('Ajeno') && !(await t()).includes('Futura') && !(await t()).includes('Sin Fecha'), 'no lo de otra vendedora, ni lo futuro, ni lo sin fecha');
  check((await t()).includes('Se te pasaron · 1') && (await t()).includes('Lead Vencido') && (await t()).includes('venció'), 'abajo lo que se le pasó');
  check((await p.textContent('#toast')).includes('Hoy te toca cobrar a 2') && (await p.textContent('#toast')).includes('se te pasaron 1'), 'aviso corto al entrar');
  await h.captura('toca-cobrar.png');

  h.paso('2. WhatsApp y Abrir');
  await p.click('[data-tc-k="lead"][data-tc-id="l1"] [data-tc-acc="wa"]');
  check(await p.evaluate(() => window.__wa?.telefono === '5511111111' && window.__wa?.leadId === 'l1'), 'WhatsApp con su teléfono');
  await p.click('[data-tc-k="lead"][data-tc-id="l1"] [data-tc-acc="abrir"]');
  await p.waitForTimeout(400);
  check(await p.evaluate(() => document.getElementById('modalLead').classList.contains('open') && leadAbiertoId === 'l1'), 'Abrir abre su lead');
  await p.evaluate(() => document.getElementById('modalLead').classList.remove('open'));

  h.paso('3. El aviso sale una vez al día');
  await p.evaluate(() => { document.getElementById('toast').className = 'toast'; document.getElementById('toast').textContent = ''; return renderDashboard(); });
  await p.waitForTimeout(600);
  check(!(await p.textContent('#toast')).includes('Hoy te toca'), 'al volver al Inicio no se repite');

  h.paso('4. Quien no es vendedora, o recibe los tickets, no lo ve');
  await p.evaluate(() => { usuarioActual = { ...usuarioActual, es_vendedor:false }; EQUIPO.find(u => u.id === 'u2').es_vendedor = false; return renderDashboard(); });
  await p.waitForTimeout(300);
  check(!(await p.isVisible('#tocaCobrar')), 'otro rol: no sale');
  await p.evaluate(() => { usuarioActual = { ...usuarioActual, es_vendedor:true, recibe_pedidos:true }; return renderDashboard(); });
  await p.waitForTimeout(300);
  check(!(await p.isVisible('#tocaCobrar')), 'quien recibe los tickets ve su reporte, no esto');

  h.paso('5. Sin nada para hoy');
  await p.evaluate(() => { usuarioActual = { ...usuarioActual, recibe_pedidos:false }; window.__tablas.leads = []; window.__tablas.inscripciones = []; return renderDashboard(); });
  await p.waitForTimeout(500);
  check((await t()).includes('Hoy no te toca cobrar a nadie') && !(await t()).includes('Se te pasaron'), 'dice que hoy no hay nada');

  h.paso('6. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.evaluate(() => { window.__tablas.leads = [{ id:'l1', persona_id:'p1', estatus_id:2, estatus:{ id:2 }, asesor_id:'u2', ciudad_interes_id:'cA', creado_en:new Date().toISOString(), fecha_compromiso_pago:new Date().toLocaleDateString('en-CA'),
    personas:{ id:'p1', nombre:'Nombre Largo De Alumna Para Celular', telefono_principal:'5511111111' } }]; return renderDashboard(); });
  await p.waitForTimeout(500);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('toca-cobrar-celular.png');

  await h.terminar();
})();
