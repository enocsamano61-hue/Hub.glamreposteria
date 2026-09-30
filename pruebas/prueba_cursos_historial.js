/* Cursos (curso → ciudad → alumnas) e Historial cliente (buscar, juntar
   registros del mismo teléfono y nombre parecido, separar). Datos inventados. */
const { abrirHub } = require('./arnes');

const ACTIVO = 'LOS PASTELES MAS SABROSOS DE LA CHEF';
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const P = (id, nombre, tel10, alt10 = '') => ({ id, nombre, nombre_norm:norm(nombre), telefono_principal:tel10, telefono_alternativo:alt10 || null, tel10, alt10, correo:'', fecha_nacimiento:null, en_lista_negra:false });
const personas = [
  P('pA', 'María Guadalupe López Pérez', '8711111111'),
  P('pB', 'María López', '8711111111'),
  P('pC', 'Ana López', '8710000000', '8711111111'),
  P('pD', 'María Guadalupe López Pérez', '8712222222'),
  P('pE', 'Yesenia Ruiz', '8713333333'),
  P('pF', 'Yessenia Ruiz Soto', '8713333333'),
];
const al = (i, extra) => ({ inscripcion_id:'i' + i, persona_id:'x' + i, nombre:'Alumna ' + String(i).padStart(2, '0') + ' Prueba', nombre_norm:'alumna ' + String(i).padStart(2, '0') + ' prueba',
  telefono_principal:'00000000' + String(i).padStart(2, '0'), tel10:'00000000' + String(i).padStart(2, '0'), alt10:'', en_lista_negra:false,
  curso_id:'k1', curso:ACTIVO, ciudad_id:'c1', ciudad:'Torreón', fecha:'2026-10-0' + (1 + i % 9), precio_pactado:1400, anticipo: i % 2 ? 1400 : 700,
  restante: i % 2 ? 0 : 700, liquidado: !!(i % 2), pago: i % 2 ? 'liq' : 'ant', paquete: i % 7 ? 'BASICO' : 'VIP', asesor_id:'u2', ...extra });
const alumnos = Array.from({ length:60 }, (_, i) => al(i));
alumnos.push(al(90, { ciudad_id:'c2', ciudad:'Saltillo' }));
alumnos.push({ ...al(91), persona_id:'pA', nombre:personas[0].nombre, nombre_norm:personas[0].nombre_norm, curso:'Postres Virales', curso_id:'k2', ciudad:'Monterrey', fecha:'2025-05-10', pago:'liq', paquete:'VIP' });
alumnos.push({ ...al(92), persona_id:'pB', nombre:'María López', nombre_norm:'maria lopez', curso:ACTIVO, curso_id:'k1', ciudad:'Torreón', fecha:'2026-10-05', pago:'ant', anticipo:700, restante:700 });

(async () => {
  const h = await abrirHub({ ancho:1366, alto:800, tablas:{
    vista_cursos_explorador:[
      { curso_id:'k2', curso:'Postres Virales', alumnas:5592, ciudades:60, desde:'2025-04-15', hasta:'2025-12-20', proximos:0, liquidadas:4000 },
      { curso_id:'k1', curso:ACTIVO, alumnas:3222, ciudades:63, desde:'2026-01-29', hasta:'2026-12-22', proximos:40, liquidadas:1709 },
      { curso_id:'k3', curso:'Histórico — sin curso identificado', alumnas:17395, ciudades:120, desde:'2020-07-26', hasta:'2026-10-18', proximos:0, liquidadas:9000 },
    ],
    vista_curso_ciudades:[
      { curso_id:'k1', ciudad_id:'c1', ciudad:'Torreón', estado:'Coahuila', alumnas:62, fechas:2, desde:'2026-02-01', hasta:'2026-10-09', liquidadas:30, proximos:1 },
      { curso_id:'k1', ciudad_id:'c2', ciudad:'Saltillo', estado:'Coahuila', alumnas:1, fechas:1, desde:'2026-10-01', hasta:'2026-10-01', liquidadas:0, proximos:1 },
    ],
    vista_alumnos:alumnos, vista_personas_busqueda:personas, personas_separadas:[],
    interacciones:[{ persona_id:'pA', fecha:'2026-09-12T10:00:00Z', canal:'whatsapp', nota:'Pidió fechas de Torreón', asesor_id:'u2' }],
    personas:[], leads:[],
    inscripciones:[{ id:'i91', anticipo:1900, restante:0, precio_pactado:1900, liquidado:true, estatus_id:12, paquete:'VIP', asesor_id:'u2', notas_migracion:null, personas:{ id:'pA', nombre:'María Guadalupe López Pérez', telefono_principal:'8711111111' }, eventos:{ fecha:'2025-05-10', sede:'S', ciudades:{ nombre:'Monterrey' } }, pagos:[] }],
  } });
  const { p, check } = h;
  const txt = s => p.textContent(s);
  await p.evaluate(() => { window.__rpc.resumen_alumnos = a => ({ total:61, personas:60, cobrado:63000, liq:30, ant:31, sin:0, nol:0, perdio:0, vip:9, _args:a }); });
  const ultimoRpc = () => p.evaluate(() => window.__ops.filter(o => o.tipo === 'rpc').slice(-1)[0]?.datos);
  const filasAl = () => p.$$eval('#cxAlumnas tr[data-cx-persona]', trs => trs.length);

  h.paso('1. Cursos: la gira activa arriba y seleccionada, todo en una pantalla');
  await p.evaluate(async () => { cursoActivoIdCache = undefined; setActiveSection('cursos'); await renderCursos(); });
  await p.waitForTimeout(300);
  const cursos = await p.$$eval('#listaCursos [data-cx-curso]', els => els.map(e => e.dataset.cxCurso + (e.classList.contains('sel') ? '*' : '')));
  check(cursos[0] === 'k1*', 'el curso activo va primero y seleccionado: ' + cursos.join());
  check((await txt('#listaCursos')).includes('Gira activa') && (await txt('#listaCursos')).includes('40 próximos'), 'etiquetas Gira activa y próximos');
  check((await txt('#cxCiudades')).includes('Torreón') && (await txt('#cxCiudades')).includes('Todas las ciudades'), 'ciudades del curso');
  check(await filasAl() === 50, 'primeras 50 alumnas: ' + await filasAl());
  check((await txt('#cxAlumnas')).includes('faltan 12'), 'botón Ver más con lo que falta');
  check((await txt('#cxResumen')).includes('63,000') && (await txt('#cxResumen')).includes('49%'), 'resumen del servidor: cobrado y % liquidadas');
  let r = await ultimoRpc();
  check(r && r.p_curso === 'k1' && r.p_ciudad === null && r.p_q === '', 'resumen pedido para el curso, todas las ciudades');
  check((await txt('#cxFPago')).includes('⭐ VIP') && !(await txt('#cxFPago')).includes('No llegó'), 'solo los filtros de pago que tienen alumnas');
  await h.captura('cursos-computadora.png');

  h.paso('2. Ver más y ordenar');
  await p.click('#cxMas'); await p.waitForTimeout(200);
  check(await filasAl() === 62, 'ahora las 62');
  await p.click('[data-cx-orden="nombre"]'); await p.waitForTimeout(200);
  check(await p.$eval('[data-cx-orden="nombre"]', e => e.classList.contains('ord')) && await filasAl() === 50, 'ordenar regresa a la primera página');

  h.paso('3. Filtros de pago y de ciudad');
  await h.limpiarOps();
  await p.click('[data-cx-pago="liq"]'); await p.waitForTimeout(200);
  check(await p.$$eval('#cxAlumnas .pago-tag', els => els.length > 0 && els.every(e => e.textContent === 'Liquidada')), 'solo liquidadas');
  check((await h.ops('vista_alumnos', 'select')).length === 1, 'una sola consulta');
  await p.click('[data-cx-ciudad="c2"]'); await p.waitForTimeout(200);
  check((await txt('#cxTitulo')).includes('Saltillo') && await filasAl() === 1, 'Saltillo: 1 alumna (el filtro de pago se reinicia)');
  r = await ultimoRpc();
  check(r.p_ciudad === 'c2', 'el resumen también es de Saltillo');
  await p.click('[data-cx-ciudad=""]'); await p.waitForTimeout(200);

  h.paso('4. Buscar alumna dentro del curso (palabras en cualquier orden)');
  await p.fill('#cxQAlumna', 'prueba alumna 05'); await p.waitForTimeout(500);
  check(await filasAl() === 1 && (await txt('#cxAlumnas')).includes('Alumna 05'), 'encuentra a “Alumna 05 Prueba”');
  r = await ultimoRpc();
  check(r.p_q === 'prueba alumna 05', 'el resumen usa la misma búsqueda');
  await p.fill('#cxQAlumna', '000007'); await p.waitForTimeout(500);
  check(await filasAl() === 1 && (await txt('#cxAlumnas')).includes('Alumna 07'), 'por teléfono');
  await p.fill('#cxQAlumna', ''); await p.waitForTimeout(500);

  h.paso('5. Buscar curso y filtros de cursos');
  await p.fill('#cxQCurso', 'virales');
  check((await p.$$('#listaCursos [data-cx-curso]')).length === 1, 'busca el curso');
  await p.fill('#cxQCurso', '');
  await p.click('[data-cx-fc="hist"]');
  check((await p.$$eval('#listaCursos [data-cx-curso]', els => els.map(e => e.dataset.cxCurso))).sort().join() === 'k2,k3', 'Solo históricos (sin el curso con fechas próximas)');
  await p.click('[data-cx-fc="todos"]');

  h.paso('6. WhatsApp desde la fila');
  await p.click('#cxAlumnas [data-cx-wa]'); await p.waitForTimeout(200);
  check(await p.isVisible('#modalWhats.open'), 'abre el envío por WhatsApp');
  await p.evaluate(() => document.getElementById('modalWhats').classList.remove('open'));

  h.paso('7. De la alumna a su historial completo');
  await p.evaluate(() => { cx.filas.unshift({ inscripcion_id:'i92', persona_id:'pB', nombre:'María López', telefono_principal:'8711111111', fecha:'2026-10-05', ciudad:'Torreón', pago:'ant', anticipo:700 }); pintarAlumnasCx(); });
  await p.click('#cxAlumnas tr[data-cx-persona="pB"]'); await p.waitForTimeout(500);
  check(await p.isVisible('#view-historial'), 'se abre Historial cliente');
  check((await txt('#historialResultado')).includes('2 registros juntos'), 'con sus registros juntos');

  h.paso('8. Historial: mismo teléfono + nombre parecido = misma persona; nombre distinto = familiar; otro teléfono = otra persona');
  await p.fill('#historialSearch', 'lopez'); await p.waitForTimeout(700);
  const grupos = await p.evaluate(() => hx.grupos.map(g => g.ids.slice().sort().join('+')));
  check(grupos.includes('pA+pB') && grupos.includes('pC') && grupos.includes('pD') && grupos.length === 3, 'pA+pB juntas, Ana aparte, la del otro teléfono aparte: ' + grupos.join(' | '));
  const perfil = (await p.innerText('#historialResultado')).replace(/\s+/g, ' ');
  check(perfil.includes('2 registros juntos') && perfil.includes('Mismo teléfono que Ana López'), 'aviso de juntos y de posible familiar');
  check(perfil.includes('Postres Virales') && perfil.includes(ACTIVO), 'la línea de tiempo trae los cursos de los dos registros');
  check(perfil.includes('Clienta fiel · 2 cursos') && perfil.includes('⭐ VIP'), 'clienta fiel y VIP');
  check(perfil.includes('Pidió fechas de Torreón'), 'últimos contactos');
  check((await txt('#hxLista')).includes('2 registros'), 'en la lista también se ve');
  await h.captura('historial-computadora.png');

  h.paso('9. Un error de dedo en el nombre también se junta');
  await p.fill('#historialSearch', 'yesenia'); await p.waitForTimeout(700);
  check(await p.evaluate(() => hx.grupos.length === 1 && hx.grupos[0].ids.length === 2), 'Yesenia / Yessenia con el mismo teléfono: una persona');

  h.paso('10. "No son la misma persona"');
  await h.limpiarOps();
  await p.click('[data-hx-separar]'); await p.waitForTimeout(100);
  check(await p.isVisible('#modalConfirmar.open'), 'pregunta antes');
  await p.click('#confirmarSi'); await p.waitForTimeout(700);
  const ins = (await h.ops('personas_separadas', 'insert'))[0];
  check(Array.isArray(ins) && ins.length === 1 && ins[0].persona_a === 'pE' && ins[0].persona_b === 'pF' && ins[0].creado_por === 'u1', 'guarda el par ordenado: ' + JSON.stringify(ins));
  check(await p.evaluate(() => hx.grupos.length === 1 && hx.grupos[0].ids.length === 1), 'ahora se ven por separado (Yessenia ya no sale junto a Yesenia)');
  check((await txt('#historialResultado')).includes('Mismo teléfono que'), 'y quedan como posible familiar');

  h.paso('11. Buscar por teléfono y búsqueda corta');
  await p.fill('#historialSearch', '2222'); await p.waitForTimeout(700);
  check(await p.evaluate(() => hx.grupos.length === 1 && hx.grupos[0].ids[0] === 'pD'), 'por 4 números del teléfono');
  await p.fill('#historialSearch', 'a'); await p.waitForTimeout(500);
  check((await txt('#hxLista')).includes('al menos 2 letras'), 'búsqueda muy corta avisa');

  h.paso('12. ➕ Nuevo lead con sus datos');
  await p.fill('#historialSearch', 'lopez'); await p.waitForTimeout(700);
  await p.click('#hxLista [data-hx-grupo="' + await p.evaluate(() => hx.grupos.find(g => g.ids.includes('pA')).clave) + '"]'); await p.waitForTimeout(400);
  await p.click('[data-hx-acc="lead"]'); await p.waitForTimeout(200);
  check(await p.isVisible('#modalNuevo.open') && await p.inputValue('#nuevoNombre') === 'María Guadalupe López Pérez' && await p.inputValue('#nuevoTelefono') === '8711111111', 'formulario con nombre y teléfono ya escritos');
  await p.evaluate(() => document.getElementById('modalNuevo').classList.remove('open'));

  h.paso('13. Tocar un curso abre su ficha');
  await p.click('[data-hx-insc="i91"]'); await p.waitForTimeout(200);
  check(await p.evaluate(() => document.getElementById('modalInscripcion').classList.contains('open')), 'abre la ficha de la inscripción');
  await p.evaluate(() => { alCerrarFichaInscripcion = null; cerrarModalInscripcion(); });

  h.paso('14. Celular');
  await p.setViewportSize({ width:390, height:844 });
  await p.waitForTimeout(150);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'historial sin scroll horizontal');
  await h.captura('historial-celular.png');
  await p.evaluate(() => setActiveSection('cursos'));
  await p.waitForTimeout(150);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'cursos sin scroll horizontal');
  await h.captura('cursos-celular.png');

  await h.terminar();
})();
