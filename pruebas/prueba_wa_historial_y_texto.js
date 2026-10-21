/* Fase 0, primera entrega:
   - El WhatsApp que se manda desde el Hub sí queda en el historial de contacto (interacciones).
     Antes la escritura nunca salía porque no se esperaba su respuesta.
   - El texto que escribe el equipo (notas del bloc, historial del lead, comentarios, bitácora)
     se muestra como texto, no como HTML.
   - Etiquetas nuevas: "Inscrita (anticipo confirmado)" y "Registradas en la gira".
   Datos de ejemplo, sin personas reales. */
const { abrirHub } = require('./arnes');

const RARO = '<img src=x onerror="window.__xss=1"> texto raro';

(async () => {
  const h = await abrirHub({ tablas:{
      interacciones:[{ id:'it1', persona_id:'p1', fecha:'2026-10-20T18:00:00Z', canal:'otro', nota:RARO }],
      mensajes_predeterminados:[],
      actividad_usuario:[{ usuario_id:'u1', accion:'tarea_asignada', detalle:'Alguien: «' + RARO + '»', creado_en:'2026-10-21T10:00:00Z' }],
      sesiones_usuario:[],
    } });
  const { p, check } = h;
  await p.evaluate(() => { window.open = () => null; });   // no abrir pestañas reales de WhatsApp

  h.paso('1. WhatsApp: queda en el historial de contacto');
  await p.evaluate(() => { window.__aviso = 0; abrirEnviarWhatsApp({ telefono:'5510000001', nombre:'Alumna Prueba', personaId:'p1', leadId:'l1', alEnviar:() => { window.__aviso++; } }); });
  await p.waitForSelector('#modalWhats.open');
  await p.fill('#waTexto', 'Hola, te escribo del curso');
  await p.click('#waEnviar');
  await p.waitForTimeout(300);
  const ins = (await h.ops('interacciones', 'insert')).pop();
  check(ins && ins.persona_id === 'p1' && ins.lead_id === 'l1' && ins.canal === 'whatsapp' && ins.asesor_id === 'u1', 'se guarda en interacciones con persona, lead, canal y quién');
  check((await h.filas('interacciones')).some(i => i.canal === 'whatsapp' && i.persona_id === 'p1'), 'la fila sí quedó guardada');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'whatsapp_enviado'), 'y en la actividad del equipo');
  check(await p.evaluate(() => window.__aviso) === 1, 'avisa a quien lo abrió (Ciudades, Certificados)');

  h.paso('2. Si falla el guardado, lo dice');
  await h.fallar(op => op.tabla === 'interacciones' && op.tipo === 'insert');
  await p.evaluate(() => abrirEnviarWhatsApp({ telefono:'5510000002', nombre:'Alumna Dos', personaId:'p2', alEnviar:() => { window.__aviso++; } }));
  await p.waitForSelector('#modalWhats.open');
  await p.fill('#waTexto', 'Hola');
  await p.click('#waEnviar');
  await p.waitForTimeout(300);
  check((await p.textContent('#toast')).includes('no quedó en su historial'), 'avisa que no quedó en el historial');
  check(await p.evaluate(() => window.__aviso) === 2, 'el aviso de envío sigue funcionando');
  await h.fallar(null);
  const sinPersona = (await h.ops('interacciones', 'insert')).length;
  await p.evaluate(() => abrirEnviarWhatsApp({ telefono:'5510000003', nombre:'Sin ficha' }));
  await p.waitForSelector('#modalWhats.open');
  await p.fill('#waTexto', 'Hola');
  await p.click('#waEnviar');
  await p.waitForTimeout(300);
  check((await h.ops('interacciones', 'insert')).length === sinPersona, 'sin persona ligada no intenta guardar historial');

  h.paso('3. Notas del bloc como texto');
  await p.evaluate(raro => {
    NOTAS = [{ id:'n1', usuario_id:'u1', texto:raro + '\nsegundo renglón', color:'x" onmouseover="window.__xss=1', completado:false, orden:0,
      creado_en:'2026-10-21T10:00:00Z', actualizado_en:'2026-10-21T10:00:00Z' }];
    renderNotas();
    document.getElementById('notasPanel').classList.add('open');
  }, RARO);
  check(await p.$('[data-nota-id="n1"] .texto img') === null && (await p.textContent('[data-nota-id="n1"] .texto')).includes('<img src=x'), 'la etiqueta se ve como texto, no se crea');
  check(await p.evaluate(() => document.querySelector('[data-nota-id="n1"]').className.includes('champagne') && !document.querySelector('[data-nota-id="n1"]').hasAttribute('onmouseover')),
        'un color raro no se mete en la tarjeta');
  check((await p.innerText('[data-nota-id="n1"] .texto')).includes('\nsegundo renglón'), 'conserva los saltos de renglón');
  await h.captura('texto-seguro-bloc.png');
  await p.evaluate(() => document.getElementById('notasPanel').classList.remove('open'));

  h.paso('4. Historial del lead y bitácora como texto');
  await p.evaluate(() => {
    leadsCache.push({ id:'l1', estatus_id:3, comentario:null, personas:{ id:'p1', nombre:'Alumna Prueba', telefono_principal:'5510000001' } });
    return abrirModalLead('l1');
  });
  await p.waitForTimeout(300);
  check(await p.$('#modalHistorial img') === null && (await p.textContent('#modalHistorial')).includes('<img src=x'), 'la ficha del lead muestra el historial como texto');
  check((await p.textContent('#modalHistorial')).includes('WHATSAPP'), 'y ahí aparece el WhatsApp guardado');
  await p.evaluate(() => document.getElementById('modalLead').classList.remove('open'));
  await p.evaluate(() => { setActiveSection('actividad'); return renderActividad(); });
  await p.waitForTimeout(300);
  check(await p.$('#actividadFeed img') === null && (await p.textContent('#actividadFeed')).includes('<img src=x'), 'la bitácora del equipo muestra el texto tal cual');
  check(!(await p.evaluate(() => window.__xss)), 'ningún texto ejecutó código');

  h.paso('5. Etiquetas nuevas');
  check(await p.evaluate(() => (ESTATUS || []).some(e => e.id === 12 && e.etiqueta === 'Inscrita (anticipo confirmado)')), 'el estatus 12 se llama "Inscrita (anticipo confirmado)"');
  await p.evaluate(() => {
    calendarioDias = { '2026-11-01':[{ id:'e1', ciudadId:'c1', ciudad:'Ciudad Prueba', liq:2, ant:3, pend:1 }] };
    montoPorEventoCache = { e1:{ total:0, liq:0, ant:0 } };
    setActiveSection('ventas');
    return renderVentasEmbudo();
  });
  await p.waitForTimeout(300);
  const ch = await p.evaluate(() => ({ labels:chartInstances.chartEmbudo.data.labels, datos:chartInstances.chartEmbudo.data.datasets[0].data }));
  check(ch.labels.join('|') === 'Registradas en la gira|Con anticipo o más|Liquidadas' && ch.datos.join('|') === '6|5|2', 'Ventas: "Registradas en la gira" en vez de "Contactados" (' + ch.labels.join('|') + ')');

  h.paso('6. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.evaluate(() => document.getElementById('notasPanel').classList.add('open'));
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('texto-seguro-bloc-celular.png');

  await h.terminar();
})();
