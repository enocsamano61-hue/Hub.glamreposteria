/* Ficha única (fase 1): la ficha del lead y la de la inscrita tienen el mismo encabezado y las mismas
   pestañas (Lead · Inscripción · Contactos). Cambiar de pestaña abre la otra ficha de la MISMA persona;
   "Contactos" es el mismo historial en las dos. Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const PER = { id:'p1', nombre:'Alumna Ficha Única', telefono_principal:'5500000001', telefono_alternativo:null, correo:null, fecha_nacimiento:null, en_lista_negra:true };
const LEAD = { id:'l1', persona_id:'p1', estatus_id:2, estatus:{ id:2, etiqueta:'Aún no vence su pago' }, evento_id:'ev1', asesor_id:'u2', paquete:'VIP',
  creado_en:new Date().toISOString(), fecha_compromiso_pago:mas(5), ciudad_interes_id:'c1',
  eventos:{ id:'ev1', fecha:mas(40), ciudad_id:'c1', ciudades:{ nombre:'Ciudad Uno' } }, ciudades:{ nombre:'Ciudad Uno' }, personas:PER };
const LEAD_VIEJO = { ...LEAD, id:'l0', estatus_id:12, estatus:{ id:12, etiqueta:'Inscrita (anticipo confirmado)' }, creado_en:'2025-01-01T10:00:00Z' };
const INSC = { id:'i1', persona_id:'p1', evento_id:'ev2', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11, paquete:'BASICO',
  asesor_id:'u2', notas_migracion:null, fecha_proximo_pago:null, personas:PER, eventos:{ fecha:mas(60), sede:'Salón', ciudades:{ nombre:'Ciudad Dos' } }, pagos:[] };
const INSC_PASADA = { ...INSC, id:'i0', eventos:{ fecha:'2025-03-01', sede:'S', ciudades:{ nombre:'Ciudad Vieja' } } };

(async () => {
  const h = await abrirHub({ tablas:{
      leads:[LEAD, LEAD_VIEJO], inscripciones:[INSC, INSC_PASADA], personas:[PER],
      interacciones:[
        { persona_id:'p1', fecha:new Date().toISOString(), canal:'whatsapp', nota:'WHATSAPP enviado: recordatorio', asesor_id:'u2' },
        { persona_id:'p1', fecha:'2026-10-01T15:00:00Z', canal:'otro', nota:'Dice que paga el viernes <b>', asesor_id:'u1' },
      ] },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true } });
  const { p, check } = h;
  await p.evaluate(lead => { leadsCache = [lead]; }, LEAD);
  const abierto = id => p.evaluate(i => document.getElementById(i).classList.contains('open'), id);
  const tabs = sel => p.$$eval(sel + ' button', xs => xs.map(x => ({ t:x.textContent, a:x.classList.contains('activa'), d:x.disabled })));

  h.paso('1. Desde un lead: mismo encabezado y pestañas');
  await p.evaluate(() => abrirModalLead('l1'));
  await p.waitForTimeout(400);
  check(await p.isVisible('#modalLead .ficha-cabeza #modalLeadAvatar') && await p.isVisible('#btnLeadContacto') && await p.isVisible('#btnLeadOtroCurso') && await p.isVisible('#btnLeadWhats'),
        'avatar, Datos de contacto, Otro curso y WhatsApp como en la ficha de la inscrita');
  check((await p.textContent('#modalLeadTelefono')).includes('VIP') && (await p.textContent('#modalLeadTelefono')).includes('Lista negra'), 'señala VIP y lista negra');
  const t1 = await tabs('#ftabsLead');
  check(t1.length === 3 && t1[0].t.includes('Lead · Ciudad Uno') && t1[0].a && t1[1].t.includes('Inscripción · Ciudad Dos') && t1[2].t === 'Contactos',
        'pestañas Lead (activa) · Inscripción (solo cursos que vienen) · Contactos: ' + t1.map(x => x.t).join(' | '));
  check(!(await p.isVisible('#modalNombreEdit')), 'los datos de contacto van plegados');
  await p.click('#btnLeadContacto');
  await p.waitForTimeout(300);
  check(await p.isVisible('#modalNombreEdit'), '"Datos de contacto" los abre');
  check((await p.textContent('#modalHistorial')).includes('WhatsApp') && (await p.textContent('#modalHistorial')).includes('Vendedora Prueba'), 'el historial dice por dónde y quién');
  await h.captura('ficha-unica-lead.png');

  h.paso('2. Pestaña Inscripción: abre la ficha de la inscrita de la misma persona');
  await p.click('#ftabsLead [data-ft="insc:i1"]');
  await p.waitForTimeout(500);
  check(!(await abierto('modalLead')) && await abierto('modalInscripcion') && await p.evaluate(() => modalInscId === 'i1'), 'cambia a su ficha de inscrita');
  const t2 = await tabs('#ftabsInsc');
  check(t2.length === 3 && t2[1].a && t2[0].t.includes('Lead'), 'mismas pestañas, ahora activa Inscripción');
  check((await p.textContent('#modalInscTelefono')).includes('Lista negra'), 'también señala lista negra');
  await h.captura('ficha-unica-inscripcion.png');

  h.paso('3. Contactos: el mismo historial en las dos');
  await p.click('#ftabsInsc [data-ft="contactos"]');
  await p.waitForTimeout(300);
  check(await p.isVisible('#fcontInsc') && !(await p.isVisible('#panelInscPago')), 'muestra contactos y esconde el cobro');
  const c = await p.textContent('#fcontInsc');
  check(c.includes('WhatsApp') && c.includes('Nota') && c.includes('Dice que paga el viernes <b>') && !(await p.$('#fcontInsc b')), 'canal, nota y quién; escapado');
  await h.captura('ficha-unica-contactos.png');
  await p.click('#ftabsInsc [data-ft="insc:i1"]');
  check(await p.isVisible('#panelInscPago'), 'regresar a Inscripción vuelve al cobro');

  h.paso('4. Pestaña Lead: regresa a la ficha del lead');
  await p.click('#ftabsInsc [data-ft="lead:l1"]');
  await p.waitForTimeout(500);
  check(await abierto('modalLead') && !(await abierto('modalInscripcion')) && await p.evaluate(() => leadAbiertoId === 'l1'), 'abre su lead');

  h.paso('5. Su lead está cerrado: la pestaña Lead abre ese (toda inscrita es lead); el modo "solo cobro" no estorba');
  await p.evaluate(() => { window.__tablas.leads = window.__tablas.leads.filter(l => l.id !== 'l1'); document.getElementById('modalLead').classList.remove('open'); });
  await p.evaluate(() => abrirModalInscripcion('i1'));
  await p.waitForTimeout(500);
  const t5 = await tabs('#ftabsInsc');
  check(t5[0].t.startsWith('Lead') && !t5[0].d, 'Lead se puede abrir aunque su lead ya esté cerrado (' + JSON.stringify(t5[0]) + ')');
  await p.evaluate(() => { cerrarModalInscripcion(); return abrirModalInscripcion('i1', { soloCobro:true }); });
  await p.waitForTimeout(400);
  check(!(await p.isVisible('#ftabsInsc')), 'en "solo cobro" no salen las pestañas');
  await p.click('#cobroFichaCompleta');
  check(await p.isVisible('#ftabsInsc'), '"Ver ficha completa" las muestra');

  h.paso('6. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('ficha-unica-celular.png');

  await h.terminar();
})();
