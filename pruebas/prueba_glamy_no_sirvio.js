/* 👎 "No me sirvió" en las respuestas de Glamy (chat y Glamy BI):
   - Cada respuesta buena trae el botón; las de error no.
   - Abre un campo opcional "¿Qué esperabas?"; Cancelar no guarda nada.
   - Enviar guarda en glamy_comentarios la pregunta, la respuesta, las herramientas, la sección y la nota
     (no va al bloc de nadie) y queda en la actividad.
   La función de Supabase se simula. Datos de ejemplo. */
const { abrirHub } = require('./arnes');

(async () => {
  const h = await abrirHub({ tablas:{ glamy_comentarios:[] } });
  const { p, check } = h;
  await p.evaluate(() => {
    window.__glamy = () => ({ data:{ texto:'Su pago se ve en **Recepción**.\n⟦ir:calendario⟧', herramientas:['buscar_persona'] }, error:null });
    Object.defineProperty(sb, 'functions', { value:{ invoke: async (nombre, { body }) => window.__glamy(body) } });
    sessionStorage.clear();
    document.getElementById('glamyFab').style.display = 'flex';
    setActiveSection('cobranza');
  });

  h.paso('1. Chat: cada respuesta trae "👎 No me sirvió"');
  await p.click('#glamyFab');
  await p.fill('#glamyTexto', '¿Cómo va el pago de 5500000001?');
  await p.click('#glamyEnviar');
  await p.waitForSelector('.glamy-msg.ella [data-g-mal]');
  check((await p.$$('[data-g-mal]')).length === 1, 'la respuesta trae el botón');
  await p.click('[data-g-mal]');
  check(await p.isVisible('[data-g-mal-nota]'), 'abre "¿Qué esperabas?"');
  await h.captura('glamy-no-sirvio.png');
  await p.click('[data-g-mal-cancelar]');
  check((await h.ops('glamy_comentarios', 'insert')).length === 0 && await p.isVisible('[data-g-mal]'), 'Cancelar no guarda nada');

  h.paso('2. Enviar guarda la pregunta, la respuesta y la nota');
  await p.click('[data-g-mal]');
  await p.fill('[data-g-mal-nota]', 'Me mandó a Recepción y era Cobranza');
  await p.click('[data-g-mal-enviar]');
  await p.waitForTimeout(400);
  const c = (await h.ops('glamy_comentarios', 'insert'))[0];
  check(c && c.pregunta === '¿Cómo va el pago de 5500000001?' && c.respuesta.includes('Recepción') && c.modo === 'chat'
        && c.seccion === 'cobranza' && c.herramientas?.[0] === 'buscar_persona' && c.nota === 'Me mandó a Recepción y era Cobranza',
        'guarda todo en glamy_comentarios (' + JSON.stringify(c) + ')');
  check((await p.textContent('#glamyMsgs')).includes('se guardó para mejorar a Glamy') && !(await p.$('[data-g-mal]')), 'da las gracias y ya no ofrece el botón');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'glamy_no_sirvio'), 'queda en la actividad');
  check((await h.ops('notas', 'insert')).length === 0 && (await h.ops('bloc_notas', 'insert')).length === 0, 'no manda nada al bloc');
  await h.captura('glamy-no-sirvio-gracias.png');

  h.paso('3. Se conserva al reabrir; los errores no traen el botón');
  await p.evaluate(() => { cerrarGlamy(); abrirGlamy(); });
  check((await p.textContent('#glamyMsgs')).includes('se guardó para mejorar'), 'sigue marcada al reabrir');
  await p.evaluate(() => { window.__glamy = () => ({ data:null, error:{ message:'sin conexión', context:{ json: async () => ({}) } } }); });
  await p.fill('#glamyTexto', 'otra');
  await p.click('#glamyEnviar');
  await p.waitForTimeout(400);
  check((await p.$$('.glamy-msg.error [data-g-mal]')).length === 0, 'la respuesta de error no trae el botón');

  h.paso('4. Si falla al guardar, lo dice y deja reintentar');
  await p.evaluate(() => { glamy.mensajes = []; window.__glamy = () => ({ data:{ texto:'Respuesta X', herramientas:[] }, error:null }); });
  await p.fill('#glamyTexto', 'pregunta X');
  await p.click('#glamyEnviar');
  await p.waitForSelector('[data-g-mal]');
  await h.fallar(op => op.tabla === 'glamy_comentarios');
  await p.click('[data-g-mal]');
  await p.click('[data-g-mal-enviar]');
  await p.waitForTimeout(400);
  check((await p.textContent('#toast')).includes('No se pudo guardar') && await p.isVisible('[data-g-mal-enviar]'), 'avisa y deja el botón para reintentar');
  await h.fallar(null);
  await p.click('[data-g-mal-enviar]');
  await p.waitForTimeout(400);
  check((await h.ops('glamy_comentarios', 'insert')).filter(x => x.pregunta === 'pregunta X').length === 2 && (await p.textContent('#glamyMsgs')).includes('se guardó'), 'al reintentar se guarda');
  await p.evaluate(() => cerrarGlamy());

  h.paso('5. Glamy BI: también en cada respuesta');
  await h.limpiarOps();
  await p.evaluate(() => {
    bi.respuestas = [{ pregunta:'Anticipos pendientes por ciudad', texto:'**Lectura**\n- Ciudad Uno lleva más.', herramientas:['bi_tabla'], ids:[] },
                     { pregunta:'falló', texto:'No pude responder ahora', ids:[], error:true }];
    biPintarRespuestas();
  });
  check((await p.$$('#biRespuestas [data-g-mal]')).length === 1, 'la respuesta buena trae el botón y la de error no');
  await p.evaluate(() => document.querySelector('#biRespuestas [data-g-mal="b0"]').click());
  await p.waitForTimeout(200);
  await p.evaluate(() => { document.querySelector('#biRespuestas [data-g-mal-nota="b0"]').value = 'Quería leads, no inscritas'; document.querySelector('#biRespuestas [data-g-mal-enviar="b0"]').click(); });
  await p.waitForTimeout(400);
  const b = (await h.ops('glamy_comentarios', 'insert'))[0];
  check(b && b.modo === 'bi' && b.seccion === 'reportes' && b.pregunta === 'Anticipos pendientes por ciudad' && b.herramientas?.[0] === 'bi_tabla' && b.nota === 'Quería leads, no inscritas',
        'guarda la respuesta de Glamy BI (' + JSON.stringify(b) + ')');
  check((await p.textContent('#biRespuestas')).includes('se guardó para mejorar'), 'da las gracias');

  h.paso('6. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.evaluate(() => { abrirGlamy(); glamy.mensajes = [{ rol:'user', texto:'¿Dónde cobro?' }, { rol:'assistant', texto:'En **Cobranza**.\n⟦ir:cobranza⟧', mal:'abierto' }]; pintarGlamy(); });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('glamy-no-sirvio-celular.png');

  await h.terminar();
})();
