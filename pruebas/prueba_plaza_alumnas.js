/* Ciudades / Plazas → "Todas las alumnas de esta ciudad": lista del histórico, filtros, búsqueda,
   registrar contacto (interacciones), WhatsApp, ir a su historial, exportar CSV y celular.
   La función plaza_personas de la base se simula con window.__rpc; contra la base real se probó aparte
   (Monterrey: 1,230 personas en ~0.1 s). Datos de ejemplo, sin personas reales. */
const { abrirHub, EQUIPO_EJEMPLO } = require('./arnes');

const hoy = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(hoy + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const hace = n => new Date(Date.now() - n * 864e5).toISOString();

const persona = (i, extra) => ({ persona_id:'p' + i, nombre:`ALUMNA PRUEBA ${String(i).padStart(3, '0')}`, telefono:'55100' + String(i).padStart(5, '0'),
  vip:false, origen:'inscrita', cursos_aqui:1, cursos_total:1, ultimo_curso:'Los Pasteles más sabrosos de la Chef', ultima_fecha:mas(-200),
  ultima_asistencia:'llego', ultimo_liquidado:true, es_lead:false, ultimo_contacto:null, ultimo_canal:null, ultimo_resultado:null,
  ultima_nota:null, ultimo_asesor:null, ...extra });
const PERSONAS = [
  persona(1, { nombre:'<img src=x onerror="window.__xss=1"> Rara', vip:true, cursos_total:3 }),
  persona(2, { ultima_asistencia:'no_llego', ultimo_liquidado:false }),
  persona(3, { ultimo_contacto:hace(2), ultimo_canal:'llamada', ultimo_resultado:'interesada', ultima_nota:'quiere el de diciembre', ultimo_asesor:'u2' }),
  persona(4, { origen:'lead', cursos_aqui:0, cursos_total:0, ultimo_curso:null, ultima_fecha:null, ultima_asistencia:null, ultimo_liquidado:null, es_lead:true }),
  persona(5, { ultimo_contacto:hace(60), ultimo_canal:'whatsapp' }),
  ...Array.from({ length:225 }, (_, k) => persona(10 + k)),
];

(async () => {
  const h = await abrirHub({ tablas:{ vista_resumen_plaza:[{ ciudad_id:'c1', ciudad:'Ciudad Prueba', clientes_historicos:230, clientes_recurrentes:0, leads_pendientes:1 }],
      eventos:[], personal_apoyo:[], interacciones:[], mensajes_predeterminados:[] },
    usuario:{ id:'u1', nombre:'Recepción Prueba', rol:'Ventas', es_admin:false }, equipo:EQUIPO_EJEMPLO });
  const { p, check } = h;
  await p.evaluate(personas => {
    CIUDADES = [{ id:'c1', nombre:'Ciudad Prueba' }];
    window.__rpc.plaza_personas = () => personas;
    setActiveSection('plaza');
    return renderPlaza('c1');
  }, PERSONAS);
  await p.waitForTimeout(400);

  h.paso('1. Lista del histórico de la ciudad');
  const rangos = await p.evaluate(() => window.__ops.filter(o => o.tabla === 'rpc:plaza_personas' && o.tipo === 'range').map(o => o.datos));
  check(rangos.length === 1 && rangos[0][0] === 0 && rangos[0][1] === 999, 'se pide por páginas de 1,000');
  check(await p.$$eval('[data-plz-persona]', f => f.length) === 100, 'muestra las primeras 100');
  check((await p.textContent('#plazaPersonas')).includes('230 de 230'), 'dice cuántas son');
  await p.click('#plzMas');
  check(await p.$$eval('[data-plz-persona]', f => f.length) === 200, '"Mostrar más" agrega 100');
  check(!(await p.evaluate(() => window.__xss)) && (await p.textContent('[data-plz-persona="p1"]')).includes('<img'), 'los nombres se escapan');
  const t4 = await p.textContent('[data-plz-persona="p4"]');
  check(t4.includes('Fue lead, no se ha inscrito') && t4.includes('Lead'), 'quien fue lead sin inscribirse también sale');
  const t3 = await p.textContent('[data-plz-persona="p3"]');
  check(t3.includes('Le interesa') && t3.includes('hace 2 días') && t3.includes('Vendedora Prueba') && t3.includes('quiere el de diciembre'), 'muestra el último contacto, quién y la nota');
  check((await p.textContent('[data-plz-persona="p1"]')).includes('VIP') && (await p.textContent('[data-plz-persona="p1"]')).includes('3 cursos'), 'VIP y cuántos cursos tomó');
  await p.evaluate(() => document.getElementById('plazaPersonas').closest('.card').scrollIntoView());
  await h.captura('plaza-alumnas.png');

  h.paso('2. Filtros y búsqueda');
  const chip = async k => { await p.click(`[data-plz-filtro="${k}"]`); return p.$$eval('[data-plz-persona]', f => f.map(x => x.dataset.plzPersona)); };
  check(JSON.stringify(await chip('interesadas')) === '["p3"]', 'les interesa');
  check(JSON.stringify(await chip('no_llego')) === '["p2"]', 'no llegaron');
  check(JSON.stringify(await chip('vip')) === '["p1"]', 'VIP');
  check(JSON.stringify(await chip('leads')) === '["p4"]', 'son lead');
  check(JSON.stringify(await chip('nunca')) === '["p4"]', 'nunca se inscribieron');
  const sin = await chip('sin_contacto');
  check(!sin.includes('p3') && sin.includes('p5') && (await p.textContent('#plazaPersonas')).includes('229 de 230'), 'sin contactar en 30 días (la de hace 60 sí cuenta)');
  check((await p.textContent('[data-plz-filtro="sin_contacto"]')).includes('229'), 'cada filtro dice cuántas son');
  await chip('todas');
  await p.fill('#plzBuscar', 'rara');
  check(JSON.stringify(await p.$$eval('[data-plz-persona]', f => f.map(x => x.dataset.plzPersona))) === '["p1"]', 'busca por nombre');
  await p.fill('#plzBuscar', '0000013');
  check(JSON.stringify(await p.$$eval('[data-plz-persona]', f => f.map(x => x.dataset.plzPersona))) === '["p13"]', 'busca por teléfono');
  await p.fill('#plzBuscar', '');

  h.paso('3. Registrar contacto');
  await p.click('[data-plz-contacto="p2"]');
  check(await p.evaluate(() => document.getElementById('modalPlzContacto').classList.contains('open')), 'abre el registro de contacto');
  await p.selectOption('#plzContactoTipo', 'nota');
  await p.click('#plzContactoGuardar');
  check((await h.ops('interacciones', 'insert')).length === 0 && (await p.textContent('#toast')).includes('nota'), 'una nota vacía no se guarda');
  await p.selectOption('#plzContactoTipo', 'no_contesto');
  await p.fill('#plzContactoNota', 'volver a marcar el lunes');
  await p.click('#plzContactoGuardar');
  await p.waitForTimeout(300);
  const ins = (await h.ops('interacciones', 'insert'))[0];
  check(ins && ins.persona_id === 'p2' && ins.canal === 'llamada' && ins.resultado === 'no_contesto' && ins.nota === 'volver a marcar el lunes' && ins.asesor_id === 'u1',
        'se guarda en interacciones con canal, resultado, nota y quién');
  check((await p.textContent('[data-plz-persona="p2"]')).includes('Le marqué y no contestó') && (await p.textContent('[data-plz-persona="p2"]')).includes('hoy'), 'la fila muestra el contacto nuevo');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'plaza_contacto' && a.detalle.includes('Ciudad Prueba')), 'queda en la actividad del equipo');

  h.paso('4. WhatsApp e historial');
  await p.click('[data-plz-wa="p10"]');
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.getElementById('modalWhats').classList.contains('open') && waDatos.personaId === 'p10'), 'abre el WhatsApp con sus datos');
  await p.evaluate(() => waDatos.alEnviar());
  await p.evaluate(() => document.getElementById('modalWhats').classList.remove('open'));
  check((await p.textContent('[data-plz-persona="p10"]')).includes('WhatsApp enviado'), 'al enviarlo, la fila lo muestra');
  await p.click('[data-plz-historial="p3"]');
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.getElementById('view-historial').classList.contains('active') && document.getElementById('historialSearch').value === '5510000003'), 'el nombre abre su historial completo');
  await p.evaluate(() => setActiveSection('plaza'));

  h.paso('5. Exportar');
  const [descarga] = await Promise.all([p.waitForEvent('download'), p.click('#plzExportar')]);
  const csv = require('fs').readFileSync(await descarga.path(), 'utf8');
  check(descarga.suggestedFilename() === 'alumnas-ciudad-prueba.csv' && csv.split('\n').length === 231 && csv.includes('Le interesa'), 'exporta la lista filtrada');

  h.paso('6. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await p.evaluate(() => document.getElementById('plazaPersonas').scrollIntoView());
  await h.captura('plaza-alumnas-celular.png');

  await h.terminar();
})();
