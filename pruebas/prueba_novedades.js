/* Aviso de "Nueva actualización": aparece una vez por persona, no interrumpe a quien está editando, obliga a
   leer hasta abajo y a contestar bien el cuestionario, y queda quién la leyó (Actividad del equipo).
   Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const parrafo = 'Texto de ejemplo para que la lectura sea larga y haya que bajar hasta el final para continuar. ';
const NOVEDAD = { id:'nov1', version:'2026-10-27-fase1', titulo:'Fichas más claras', fecha:'2026-10-27', publicada:true, creado_en:'2026-10-27T10:00:00Z',
  contenido:{ secciones:[
    { titulo:'Qué cambió', puntos:['**Una sola caja de comentarios** en el lead y en la inscrita.', 'Registrar regalo.', 'Ya le avisé.'] },
    { titulo:'Por qué', texto: parrafo.repeat(12) },
    { titulo:'Cómo se usa', texto:'Abre cualquier ficha y escribe en **Agregar comentario**.' } ],
    nota:'Las notas del Excel están en **Notas fijas**.' },
  preguntas:[
    { pregunta:'¿Dónde se escribe un comentario?', opciones:['En Notas fijas', 'En Agregar comentario', 'En ningún lado'], correcta:1, bien:'Correcto.', mal:'No: Notas fijas es para datos que no cambian.' },
    { pregunta:'Le avisaste desde tu celular. ¿Qué haces?', opciones:['Nada', 'Tocar Ya le avisé'], correcta:1, bien:'Correcto.', mal:'Si no se marca, el Hub cree que nadie le avisó.' },
  ] };

(async () => {
  const h = await abrirHub({ tablas:{ hub_novedades:[NOVEDAD], hub_novedades_leidas:[], usuarios:[{ id:'u1', nombre:'Cobranza Prueba' }, { id:'u2', nombre:'Vendedora Prueba' }],
      sesiones_usuario:[], actividad_usuario:[] },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true } });
  const { p, check } = h;
  await p.evaluate(() => { window.__rpc.novedad_leida = args => { window.__tablas.hub_novedades_leidas.push({ novedad_id:args.p_novedad, usuario_id:'u1', leida_en:new Date().toISOString(), errores:args.p_errores }); return null; }; });
  const abierta = () => p.evaluate(() => document.getElementById('novedadOverlay').classList.contains('open'));

  h.paso('1. No interrumpe a quien está editando');
  await p.evaluate(() => document.getElementById('modalConfirmar').classList.add('open'));
  await p.evaluate(() => iniciarNovedades());
  await p.waitForTimeout(500);
  check(!(await abierta()), 'con una ficha o formulario abierto, espera');
  await p.evaluate(() => document.getElementById('modalConfirmar').classList.remove('open'));
  await p.waitForTimeout(3500);
  check(await abierta(), 'en cuanto lo cierra, aparece');
  check(await p.evaluate(() => getComputedStyle(document.getElementById('novedadOverlay')).backdropFilter.includes('blur')), 'la página de atrás se ve borrosa');

  h.paso('2. Hay que leer hasta abajo');
  const txt = await p.textContent('#novTarjeta');
  check(txt.includes('Nueva actualización del Hub') && txt.includes('Fichas más claras') && txt.includes('Paso 1 de 3'), 'título y pasos');
  check(await p.$eval('#novTarjeta b', b => b.textContent) === 'Una sola caja de comentarios', 'las **negritas** se ven como negritas');
  check(await p.$eval('#novSeguir', b => b.disabled), 'sin leer hasta abajo no se puede seguir');
  await h.captura('novedad-leer.png');
  await p.$eval('#novCuerpo', c => { c.scrollTop = c.scrollHeight; c.dispatchEvent(new Event('scroll')); });
  await p.waitForTimeout(100);
  check(!(await p.$eval('#novSeguir', b => b.disabled)), 'al llegar al final se activa');
  await p.click('#novSeguir');

  h.paso('3. Cuestionario');
  check((await p.textContent('#novTarjeta')).includes('Pregunta 1 de 2') && await p.$eval('#novTerminar', b => b.disabled), 'dos preguntas y no deja seguir sin contestar');
  await p.click('[data-nov-q="0"][data-nov-o="0"]');
  check((await p.textContent('#novTarjeta')).includes('Notas fijas es para datos que no cambian') && (await p.textContent('#novTarjeta')).includes('Vuelve a intentar'), 'si se equivoca, le explica');
  await p.click('[data-nov-q="0"][data-nov-o="1"]');
  check((await p.textContent('#novTarjeta')).includes('Correcto.'), 'luego acierta');
  await h.captura('novedad-cuestionario.png');
  await p.click('#novReleer');
  check((await p.textContent('#novTarjeta')).includes('Paso 1 de 3') && !(await p.$eval('#novSeguir', b => b.disabled)), '"Volver a leer" regresa al texto sin volver a bloquear');
  await p.click('#novSeguir');
  check(await p.$eval('#novTerminar', b => b.disabled), 'conserva lo contestado y falta la segunda');
  await h.limpiarOps();
  await p.click('[data-nov-q="1"][data-nov-o="1"]');
  check(!(await p.$eval('#novTerminar', b => b.disabled)), 'con todas bien, ya puede continuar');
  await p.click('#novTerminar');
  await p.waitForTimeout(300);
  const rpc = (await h.ops('rpc:novedad_leida', 'rpc'))[0];
  check(rpc && rpc.p_novedad === 'nov1' && rpc.p_errores === 1, 'queda que la leyó y con cuántos errores (' + JSON.stringify(rpc) + ')');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'novedad_leida'), 'y en la actividad');
  check((await p.textContent('#novTarjeta')).includes('Listo, ya puedes continuar'), 'pantalla de listo');
  await p.click('#novCerrar');
  await p.waitForTimeout(300);
  check(!(await abierta()), 'se cierra y sigue donde estaba');

  h.paso('4. Una sola vez');
  await p.evaluate(() => revisarNovedades());
  await p.waitForTimeout(400);
  check(!(await abierta()), 'ya leída, no vuelve a salir');

  h.paso('5. Actividad del equipo');
  await p.evaluate(() => pintarNovedadesActividad());
  await p.waitForTimeout(300);
  const act = await p.textContent('#actividadNovedades');
  check(act.includes('1 de 2 la leyeron') && act.includes('Cobranza Prueba') && act.includes('1 error') && act.includes('Falta leerla') && act.includes('Vendedora Prueba'),
        'dice quién la leyó y quién falta');
  await h.limpiarOps();
  await p.$eval('[data-nov-previa="nov1"]', b => b.click());
  await p.waitForTimeout(300);
  check(await abierta(), 'el administrador puede ver cómo se ve');
  await p.$eval('#novCuerpo', c => { c.scrollTop = c.scrollHeight; c.dispatchEvent(new Event('scroll')); });
  await p.click('#novSeguir');
  await p.click('[data-nov-q="0"][data-nov-o="1"]'); await p.click('[data-nov-q="1"][data-nov-o="1"]');
  await p.click('#novTerminar');
  await p.waitForTimeout(200);
  check((await h.ops('rpc:novedad_leida', 'rpc')).length === 0, 'la vista previa no cuenta como leída');
  await p.click('#novCerrar');

  h.paso('6. Escribiendo no la interrumpe');
  await p.evaluate(() => { window.__tablas.hub_novedades_leidas = []; nov.actual = null; });
  await p.evaluate(() => { setActiveSection('cobranza'); document.querySelector('#cobTabs [data-cob-tab="cobrar"]').click(); const i = document.getElementById('cobBuscar'); i.focus(); i.dispatchEvent(new KeyboardEvent('keydown', { key:'a', bubbles:true })); });
  await p.evaluate(() => revisarNovedades());
  await p.waitForTimeout(500);
  check(!(await abierta()), 'si está escribiendo, espera');
  await p.evaluate(() => { document.activeElement.blur(); });
  await p.waitForTimeout(3500);
  check(await abierta(), 'y sale en cuanto deja de escribir');

  h.paso('7. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('novedad-celular.png');

  await h.terminar();
})();
