/* Una sola caja de comentarios (27 oct 2026): la misma en la ficha del lead y en la de la inscrita. Cada comentario
   va al historial de la persona con la fecha y quién lo escribió, y queda como último comentario de su lead (lo que
   ven Cobranza y el Embudo). Las notas de siempre de la inscrita pasan a "Notas fijas". Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const PER = { id:'p1', nombre:'ALUMNA COMENTARIOS', telefono_principal:'7831000001' };
const INSC = { id:'i1', persona_id:'p1', evento_id:'evA', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11, paquete:'BASICO',
  asesor_id:'u2', notas_migracion:'CUMPLEAÑOS: 03/03/1994', fecha_proximo_pago:null, asistencia:null, estatus:{ id:11 },
  personas:PER, eventos:{ fecha:mas(90), sede:'Salón', ciudades:{ nombre:'Ciudad A' } }, pagos:[] };
const LEAD = { id:'l1', persona_id:'p1', estatus_id:12, estatus:{ id:12, etiqueta:'Inscrita (anticipo confirmado)' }, asesor_id:'u2', ciudad_interes_id:'cA',
  evento_id:'evA', creado_en:'2026-10-20T10:00:00Z', comentario:null, eventos:{ id:'evA', fecha:mas(90), ciudades:{ nombre:'Ciudad A' } }, personas:PER, ciudades:{ nombre:'Ciudad A' } };

(async () => {
  const h = await abrirHub({ tablas:{ inscripciones:[INSC], leads:[LEAD], pagos:[],
      interacciones:[{ id:'x1', persona_id:'p1', fecha:'2026-10-23T17:00:00Z', canal:'whatsapp', nota:'WHATSAPP enviado desde el Hub.', asesor_id:'u2' }] },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true } });
  const { p, check } = h;

  h.paso('1. Ficha de la inscrita');
  await p.evaluate(() => abrirModalInscripcion('i1'));
  await p.waitForTimeout(500);
  check(await p.isVisible('#inscComentNuevo') && await p.isVisible('#inscComentGuardar'), 'tiene la caja "Agregar comentario"');
  check((await p.textContent('#inscComentLista')).includes('WHATSAPP enviado desde el Hub'), 'abajo se ven sus últimos comentarios y contactos');
  check(!(await p.isVisible('#modalInscNotasEdit')) && (await p.textContent('#inscNotasFijas summary')).includes('Notas fijas'), 'las notas del Excel van plegadas en "Notas fijas"');
  await h.limpiarOps();
  await p.click('#inscComentGuardar');
  check((await p.textContent('#toast')).includes('Escribe el comentario') && (await h.ops('interacciones', 'insert')).length === 0, 'vacío no guarda');
  await p.fill('#inscComentNuevo', 'Pidió que le llamen en la tarde');
  await p.click('#inscComentGuardar');
  await p.waitForTimeout(400);
  const ins = (await h.ops('interacciones', 'insert'))[0];
  check(ins && ins.persona_id === 'p1' && ins.lead_id === 'l1' && ins.asesor_id === 'u1' && ins.nota === 'Pidió que le llamen en la tarde', 'va a su historial, con su lead y con quién lo escribió (' + JSON.stringify(ins) + ')');
  check((await h.ops('leads', 'update')).some(u => u.comentario === 'Pidió que le llamen en la tarde'), 'queda como último comentario de su lead (Cobranza y Embudo)');
  check((await h.ops('inscripciones', 'update')).length === 0, 'no pisa sus notas fijas');
  check(await p.inputValue('#inscComentNuevo') === '' && (await p.textContent('#inscComentLista')).includes('Pidió que le llamen en la tarde'), 'el cuadro queda vacío y el comentario aparece abajo');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'comentario_agregado'), 'queda en la actividad');
  await h.captura('comentarios-inscrita.png');
  await p.click('#inscComentTodos');
  await p.waitForTimeout(400);
  check(await p.evaluate(() => document.querySelector('#modalInscripcion .modal').classList.contains('ver-contactos')), '"Ver todo su historial" abre Contactos');

  h.paso('2. Ficha del lead: la misma caja');
  await p.evaluate(() => { cerrarModalInscripcion(); if(!leadsCache.some(l => l.id === 'l1')) leadsCache.push(window.__tablas.leads[0]); return abrirModalLead('l1'); });
  await p.waitForTimeout(500);
  check((await p.textContent('#modalHistorial')).includes('Pidió que le llamen en la tarde'), 'el comentario escrito en la inscrita se ve en el lead');
  await h.limpiarOps();
  await p.fill('#modalComentarioNuevo', 'Confirmó que va con su hermana');
  await p.click('#comentLeadGuardar');
  await p.waitForTimeout(400);
  const ins2 = (await h.ops('interacciones', 'insert'))[0];
  check(ins2 && ins2.lead_id === 'l1' && ins2.asesor_id === 'u1', 'se guarda con su propio botón y con quién lo escribió');
  check((await h.ops('leads', 'update')).length === 1 && (await p.inputValue('#modalComentarioNuevo')) === '', 'sin tocar lo demás del lead');
  check((await p.textContent('#modalHistorial')).includes('Confirmó que va con su hermana'), 'y aparece en su historial');
  await h.captura('comentarios-lead.png');

  h.paso('3. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.evaluate(() => { document.getElementById('modalLead').classList.remove('open'); return abrirModalInscripcion('i1'); });
  await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById('inscComentNuevo').scrollIntoView());
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('comentarios-celular.png');

  await h.terminar();
})();
