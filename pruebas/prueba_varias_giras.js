/* Varias giras a la vez (5 nov 2026): se venden "Mesa de Postres" (dic 2026) y "Pasteles" (desde ene 2027) al mismo tiempo.
   - Los selectores de curso dicen "Ciudad · fecha · curso".
   - Los botones de paquete dicen el precio del curso elegido (Precios → Precio de cada curso); sin precio: "(sin precio)".
   - Inscribir en un curso sin precio: se puede; queda sin precio y sin "lo que falta" (la base lo calcula al capturar el precio).
   - Precios: una tarjeta por gira; al capturar el precio se guarda con su curso y queda en la actividad.
   - Cambiar de curso entre giras: el precio pasa a ser el de la otra gira y el aviso dice cuánto debía y cuánto debe.
   - Calendario y Cobranza: filtro "Todas las giras / Pasteles / Mesa de Postres".
   - Diploma: en la gira sin diseño dice "Falta el diseño del diploma". Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ev = (id, dias, curso, ciudad) => ({ id, fecha:mas(dias), curso_id:curso, ciudad_id:'c' + ciudad, sede:'Salón', ciudades:{ id:'c' + ciudad, nombre:'Ciudad ' + ciudad, estado:'Coahuila' } });
const EVENTOS = [ev('m1', 30, 'curM', 'Norte'), ev('m2', 33, 'curM', 'Sur'), ev('p1', 70, 'curP', 'Norte'), ev('p2', 75, 'curP', 'Este')];
const GIRAS_EJ = [
  { id:'curM', nombre:'Mesa de Postres', corto:'Mesa de Postres', inicio:HOY, proxima:mas(30) },
  { id:'curP', nombre:'LOS PASTELES MAS SABROSOS DE LA CHEF', corto:'Pasteles', inicio:HOY, proxima:mas(70) }];
const PRECIOS_EJ = [
  { id:'pPb', nombre:'Pasteles · Básico', curso_id:'curP', paquete:'BASICO', precio:1400, activo:true, area:'gira', orden:100 },
  { id:'pPv', nombre:'Pasteles · VIP', curso_id:'curP', paquete:'VIP', precio:1900, activo:true, area:'gira', orden:101 },
  { id:'pMb', nombre:'Mesa de Postres · Básico', curso_id:'curM', paquete:'BASICO', precio:null, activo:true, area:'gira', orden:102 },
  { id:'pMv', nombre:'Mesa de Postres · VIP', curso_id:'curM', paquete:'VIP', precio:null, activo:true, area:'gira', orden:103 },
  { id:'pSv', nombre:'Subir a VIP', clave:'subir_vip', precio:500, activo:true, area:'gira', orden:1 }];
const persona = (id, nombre) => ({ id, nombre, telefono_principal:'55000000' + id.slice(-2) });
const lead = (id, pid, nombre, evento) => ({ id, persona_id:pid, evento_id:evento.id, ciudad_interes_id:evento.ciudad_id, paquete:'BASICO', asesor_id:'u2',
  creado_en:new Date().toISOString(), estatus:{ id:2 }, estatus_id:2, comentario:null, personas:persona(pid, nombre), eventos:evento, ciudades:{ nombre:evento.ciudades.nombre } });
const INSC = { id:'i1', persona_id:'p01', evento_id:'p1', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11, paquete:'BASICO',
  asesor_id:'u2', notas_migracion:null, fecha_proximo_pago:null, asistencia:null,
  personas:persona('p01', 'Alumna Que Cambia'), eventos:{ fecha:mas(70), sede:'Salón', curso_id:'curP', ciudades:{ nombre:'Ciudad Norte' } }, pagos:[] };

(async () => {
  const h = await abrirHub({ tablas:{ eventos:EVENTOS.map(e => ({ ...e })), cursos:GIRAS_EJ.map(g => ({ id:g.id, nombre:g.nombre, activo:true })),
      precios:PRECIOS_EJ, inscripciones:[], pagos:[], interacciones:[], personas:[], mensajes_predeterminados:[],
      leads:[lead('l1', 'p11', 'Lead De Mesa', EVENTOS[0]), lead('l2', 'p12', 'Lead De Pasteles', EVENTOS[2]), lead('l3', 'p13', 'Lead Mesa Dos', EVENTOS[1])] },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true },
    equipo:[{ id:'u1', nombre:'Cobranza Prueba', es_vendedor:false, rol:'Cobranza' }, { id:'u2', nombre:'Vendedora Prueba', es_vendedor:true, rol:'Ventas' }] });
  const { p, check } = h;
  const montar = () => p.evaluate(([g, e]) => { GIRAS = g.map(x => ({ ...x })); EVENTOS_CAL = e; EVENTOS_CAL_PASADOS = []; CIUDADES_GIRA_ACTIVA = ['cNorte', 'cSur', 'cEste'];
    CIUDADES_POR_GIRA = { curM:new Set(['cNorte', 'cSur']), curP:new Set(['cNorte', 'cEste']) };
    CIUDADES = e.map(x => ({ id:x.ciudad_id, nombre:x.ciudades.nombre, estado:'Coahuila' }));
    window.__rpc.glamy_buscar_persona = () => ({ encontradas:0, personas:[] }); return cargarPrecios(); }, [GIRAS_EJ, EVENTOS]);
  await montar();

  h.paso('1. El selector de curso dice "Ciudad · fecha · curso"');
  await p.evaluate(() => setActiveSection('board'));
  await p.waitForTimeout(500);
  await montar();
  await p.click('#btnNuevoLead'); await p.waitForSelector('#modalNuevo.open');
  await p.evaluate(() => { const s = document.getElementById('nuevoEvento'); s.innerHTML = opcionesEvento(''); });
  const textos = await p.$$eval('#nuevoEvento option', xs => xs.map(x => x.textContent));
  check(textos.some(t => t.startsWith('Ciudad Norte') && t.endsWith('· Mesa de Postres')) && textos.some(t => t.startsWith('Ciudad Norte') && t.endsWith('· Pasteles')),
    'la misma ciudad en las dos giras se distingue por el curso: ' + textos.slice(1).join(' | '));
  await p.click('#nuevoEventoBuscar');
  await p.waitForTimeout(200);
  check((await p.$$eval('#nuevoEvento + * .tag-gira, .bc-lista .tag-gira', xs => xs.map(x => x.textContent))).includes('Mesa de Postres'), 'la lista con buscador también dice la gira');
  await h.captura('varias-giras-selector.png');
  await p.keyboard.press('Escape');

  h.paso('2. Los botones de paquete dicen el precio del curso elegido');
  const botones = () => p.$$eval('#nuevoPaquete [data-paq]', xs => xs.map(x => x.textContent.trim()));
  await p.evaluate(() => { const s = document.getElementById('nuevoEvento'); s.value = 'p1'; s.dispatchEvent(new Event('change', { bubbles:true })); });
  check(JSON.stringify(await botones()) === JSON.stringify(['Básico $1,400', 'VIP $1,900']), 'Pasteles: ' + (await botones()).join(' / '));
  await p.evaluate(() => { const s = document.getElementById('nuevoEvento'); s.value = 'm1'; s.dispatchEvent(new Event('change', { bubbles:true })); });
  check(JSON.stringify(await botones()) === JSON.stringify(['Básico (sin precio)', 'VIP (sin precio)']), 'Mesa de Postres sin precio: ' + (await botones()).join(' / '));
  await h.captura('varias-giras-sin-precio.png');
  await p.evaluate(() => document.getElementById('modalNuevo').classList.remove('open'));

  h.paso('3. Inscribir en un curso sin precio: se puede y queda pendiente su precio');
  await p.evaluate(() => { window.renderBoard = async () => {}; window.renderCalendario = async () => {}; leadsCache = window.__tablas.leads.slice(); leadAbiertoId = 'l1'; abrirModalInscribir(); });
  await p.waitForSelector('#modalInscribir.open');
  await p.evaluate(() => { const s = document.getElementById('inscribirEvento'); s.value = 'm1'; s.dispatchEvent(new Event('change', { bubbles:true })); });
  await p.fill('#inscribirPagado', '700');
  await p.dispatchEvent('#inscribirPagado', 'input');
  check((await p.textContent('#inscribirPreview')).includes('todavía no tiene precio'), 'la vista previa avisa que el curso no tiene precio y que se calcula después');
  await h.captura('varias-giras-inscribir-sin-precio.png');
  await h.limpiarOps();
  await p.click('#guardarInscribir');
  await p.waitForTimeout(600);
  const ins = (await h.ops('inscripciones', 'insert'))[0];
  check(ins && ins.precio_pactado === null && ins.restante === null && ins.liquidado === false && ins.anticipo === 700 && ins.estatus_id === 11,
    'queda inscrita con lo que pagó, sin precio ni "lo que falta" (' + JSON.stringify(ins && { p:ins.precio_pactado, r:ins.restante, e:ins.estatus_id }) + ')');
  await p.evaluate(() => { document.getElementById('modalInscribir').classList.remove('open'); cerrarModalInscripcion?.(); document.getElementById('modalLead')?.classList.remove('open'); });
  await p.evaluate(() => { leadAbiertoId = 'l2'; abrirModalInscribir(); });
  await p.waitForSelector('#modalInscribir.open');
  await p.evaluate(() => { const s = document.getElementById('inscribirEvento'); s.value = 'p1'; s.dispatchEvent(new Event('change', { bubbles:true })); });
  await p.fill('#inscribirPagado', '700');
  await p.dispatchEvent('#inscribirPagado', 'input');
  check((await p.textContent('#inscribirPreview')).includes('Queda debiendo $700'), 'en Pasteles, como siempre: debe $700 de $1,400');
  await p.evaluate(() => document.getElementById('modalInscribir').classList.remove('open'));

  h.paso('4. Precios: una tarjeta por gira y se captura el de Mesa de Postres');
  await p.evaluate(() => setActiveSection('precios'));
  await p.waitForTimeout(500);
  await montar(); await p.evaluate(() => pintarPreciosCurso());
  const tarjetas = await p.$$eval('#preciosCurso .precio-curso-titulo', xs => xs.map(x => x.textContent));
  check(tarjetas.length === 2 && tarjetas[0].includes('Mesa de Postres') && tarjetas[1].includes('Pasteles'), 'las dos giras, la que sigue primero: ' + tarjetas.join(' | '));
  check(!(await p.textContent('#preciosLista')).includes('Pasteles · Básico'), 'los precios de curso no se mezclan con lo que se cobra aparte');
  await h.limpiarOps();
  await p.fill('[data-precio-curso="curM"][data-precio-paq="BASICO"] .precio-curso-valor', '1600');
  await p.dispatchEvent('[data-precio-curso="curM"][data-precio-paq="BASICO"] .precio-curso-valor', 'change');
  await p.waitForTimeout(500);
  const up = (await h.ops('precios', 'update'))[0];
  check(up && up.precio === 1600, 'se guarda el precio en su renglón (Mesa de Postres · Básico)');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'precio_cambiado' && a.detalle.includes('Mesa de Postres · Básico')), 'queda en la actividad');
  await h.captura('varias-giras-precios.png');
  await p.fill('[data-precio-curso="curM"][data-precio-paq="VIP"] .precio-curso-valor', '0');
  await p.dispatchEvent('[data-precio-curso="curM"][data-precio-paq="VIP"] .precio-curso-valor', 'change');
  await p.waitForTimeout(300);
  check((await p.textContent('[data-precio-curso="curM"][data-precio-paq="VIP"]')).includes('mayor a $0'), 'en $0 no guarda y dice por qué');

  h.paso('5. Cambiar de curso entre giras recalcula lo que debe');
  await p.evaluate(i => { window.__tablas.inscripciones = [i]; return abrirModalInscripcion('i1'); }, INSC);
  await p.waitForTimeout(400);
  await p.click('#btnCambiarCurso');
  await p.waitForTimeout(200);
  await p.fill('#fichaCursoSelectBuscar', 'Ciudad Sur');
  await p.keyboard.press('Enter');
  check(await p.inputValue('#fichaCursoSelect') === 'm2', 'se elige el curso de la otra gira');
  await h.limpiarOps();
  await p.click('#fichaCursoOk');
  await p.waitForSelector('#modalConfirmar.open');
  const aviso = await p.textContent('#modalConfirmar');
  check(aviso.includes('Cambia de gira') && aviso.includes('$1,600') && aviso.includes('Antes debía $700') && aviso.includes('ahora debe $900'), 'el aviso dice el precio nuevo y cuánto debía y debe');
  await h.captura('varias-giras-cambiar-curso.png');
  await p.click('#confirmarSi');
  await p.waitForTimeout(400);
  const mv = (await h.ops('inscripciones', 'update'))[0];
  check(mv && mv.evento_id === 'm2' && mv.precio_pactado === 1600 && mv.restante === 900 && mv.liquidado === false && mv.notas_migracion.includes('$1,400 → $1,600'),
    'se mueve con el precio de la otra gira y queda el rastro');
  await p.evaluate(() => cerrarModalInscripcion());
  await p.evaluate(i => { window.__tablas.inscripciones = [{ ...i, evento_id:'p1' }]; return abrirModalInscripcion('i1'); }, INSC);
  await p.waitForTimeout(400);
  await p.click('#btnCambiarCurso');
  await p.fill('#fichaCursoSelectBuscar', 'Ciudad Este');
  await p.keyboard.press('Enter');
  await h.limpiarOps();
  await p.click('#fichaCursoOk');
  await p.waitForSelector('#modalConfirmar.open');
  check(!(await p.textContent('#modalConfirmar')).includes('Cambia de gira'), 'dentro de la misma gira no cambia el precio');
  await p.click('#confirmarSi');
  await p.waitForTimeout(400);
  check(!('precio_pactado' in ((await h.ops('inscripciones', 'update'))[0] || {})), 'y no lo toca');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('6. Filtro de gira en Cobranza y Calendario');
  await p.evaluate(() => { window.__tablas.inscripciones = []; });
  await p.evaluate(async () => { setActiveSection('cobranza'); });
  await p.waitForTimeout(400);
  await montar();
  await p.evaluate(() => renderCobranza());
  await p.waitForTimeout(600);
  const pills = await p.$$eval('#cobFiltroGira [data-gira-filtro]', xs => xs.map(x => x.textContent));
  check(JSON.stringify(pills) === JSON.stringify(['Todas las giras', 'Mesa de Postres', 'Pasteles']), 'Cobranza trae el filtro: ' + pills.join(' | '));
  await p.click('#cobTabs [data-cob-tab="cobrar"]');
  await p.waitForTimeout(400);
  // (lo que ve Por cobrar sale de cobDatos; Lead De Mesa ya se inscribió en el paso 3)
  const caja = () => p.evaluate(() => cobDatos.leads.map(l => l.personas?.nombre).join(' | '));
  check((await caja()).includes('Lead Mesa Dos') && (await caja()).includes('Lead De Pasteles'), 'con "Todas las giras" salen las dos: ' + await caja());
  await p.click('#cobFiltroGira [data-gira-filtro="curM"]');
  await p.waitForTimeout(700);
  check((await caja()).includes('Lead Mesa Dos') && !(await caja()).includes('Lead De Pasteles'), 'con "Mesa de Postres", solo los de esa gira: ' + await caja());
  check((await p.evaluate(() => localStorage.getItem('giraFiltro'))) === 'curM', 'se recuerda la gira elegida');
  await h.captura('varias-giras-cobranza.png');
  await p.click('#cobFiltroGira [data-gira-filtro=""]');
  await p.waitForTimeout(500);

  h.paso('7. Diploma: la gira sin diseño no usa el de otro curso');
  const falta = await p.evaluate(() => { cc.tipo = 'gira'; cc.plantillas = { gira:{ tipo:'gira', curso_id:'curP', campos:[] } };
    return [faltaDisenoCert({ evento:{ curso_id:'curM' } }), faltaDisenoCert({ evento:{ curso_id:'curP' } })]; });
  check(falta[0] === true && falta[1] === false, 'Mesa de Postres: falta el diseño; Pasteles: su diploma de siempre');

  h.paso('8. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.evaluate(() => setActiveSection('precios'));
  await p.waitForTimeout(400);
  await montar(); await p.evaluate(() => pintarPreciosCurso());
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado en Precios');
  await h.captura('varias-giras-celular.png');
  await p.evaluate(() => setActiveSection('cobranza'));
  await p.waitForTimeout(600);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'ni en Cobranza con el filtro de gira');

  await h.terminar();
})();
