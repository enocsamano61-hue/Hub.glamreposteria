/* Toda inscrita es lead (regla de Enoc, 27 oct 2026). La pestaña "Lead" de su ficha ya no sale bloqueada:
   si nunca tuvo lead en el Hub (alumna del Excel) se le crea (asegurar_lead_de_persona), y si su lead ya está
   cerrado ("Inscrita") se abre ese. Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ev = { fecha:mas(90), sede:'Salón', ciudades:{ nombre:'Ciudad A' } };
const insc = (id, persona) => ({ id, persona_id:persona, evento_id:'evA', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11, paquete:'BASICO',
  asesor_id:'u2', notas_migracion:'CUMPLEAÑOS: 03/03/1994', fecha_proximo_pago:null, asistencia:null, estatus:{ id:11 },
  personas:{ id:persona, nombre:'ALUMNA ' + persona.toUpperCase(), telefono_principal:'78310000' + persona.slice(-2) }, eventos:ev, pagos:[] });
const leadCerrado = (id, persona) => ({ id, persona_id:persona, estatus_id:12, estatus:{ id:12, etiqueta:'Inscrita (anticipo confirmado)' }, asesor_id:'u2',
  ciudad_interes_id:'cA', evento_id:'evA', creado_en:'2026-10-20T10:00:00Z', comentario:null, eventos:{ id:'evA', fecha:mas(90), ciudades:{ nombre:'Ciudad A' } },
  personas:{ id:persona, nombre:'ALUMNA ' + persona.toUpperCase(), telefono_principal:'78310000' + persona.slice(-2) }, ciudades:{ nombre:'Ciudad A' } });

(async () => {
  const h = await abrirHub({ tablas:{ inscripciones:[insc('i1', 'p01'), insc('i2', 'p02')], leads:[leadCerrado('l2', 'p02')], pagos:[], interacciones:[] },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true } });
  const { p, check } = h;
  await p.evaluate(() => {
    // La base crea su lead cerrado ("Inscrita") con su inscripción
    window.__rpc.asegurar_lead_de_persona = ({ p_persona }) => {
      const i = window.__tablas.inscripciones.find(x => x.persona_id === p_persona);
      window.__tablas.leads.push({ id:'lNuevo', persona_id:p_persona, estatus_id:12, estatus:{ id:12, etiqueta:'Inscrita (anticipo confirmado)' }, asesor_id:'u2', ciudad_interes_id:'cA',
        evento_id:'evA', creado_en:new Date().toISOString(), comentario:null, de_inscrita:true, eventos:{ id:'evA', fecha:i.eventos.fecha, ciudades:{ nombre:'Ciudad A' } },
        personas:i.personas, ciudades:{ nombre:'Ciudad A' } });
      return 'lNuevo';
    };
  });
  const tabLead = () => p.$eval('#ftabsInsc [data-ft^="lead:"], #ftabsInsc button[disabled]', b => ({ txt:b.textContent, disabled:b.disabled, ft:b.dataset.ft || '' }));

  h.paso('1. Alumna del Excel que nunca tuvo lead');
  await p.evaluate(() => abrirModalInscripcion('i1'));
  await p.waitForTimeout(500);
  check((await h.ops('rpc:asegurar_lead_de_persona', 'rpc')).some(o => o.p_persona === 'p01'), 'se le crea su lead');
  const t1 = await tabLead();
  check(!t1.disabled && t1.ft === 'lead:lNuevo', 'la pestaña Lead ya se puede abrir (' + JSON.stringify(t1) + ')');
  await h.captura('lead-de-inscrita-pestanas.png');
  await p.click('#ftabsInsc [data-ft="lead:lNuevo"]');
  await p.waitForSelector('#modalLead.open');
  check((await p.textContent('#modalLeadNombre')).includes('ALUMNA P01'), 'abre su lead');
  await p.evaluate(() => document.getElementById('modalLead').classList.remove('open'));

  h.paso('2. Su lead ya está cerrado ("Inscrita")');
  await h.limpiarOps();
  await p.evaluate(() => abrirModalInscripcion('i2'));
  await p.waitForTimeout(500);
  check((await h.ops('rpc:asegurar_lead_de_persona', 'rpc')).length === 0, 'si ya tiene lead no se crea otro');
  const t2 = await tabLead();
  check(!t2.disabled && t2.ft === 'lead:l2', 'se abre su lead cerrado (' + JSON.stringify(t2) + ')');

  h.paso('3. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');

  await h.terminar();
})();
