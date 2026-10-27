/* Copiar nombre y teléfono en Cursos e Historial: botón , menú del clic
   derecho y que seleccionar texto no abra el historial. Datos inventados. */
const { abrirHub } = require('./arnes');

const CURSO = 'LOS PASTELES MAS SABROSOS DE LA CHEF';
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const P = (id, nombre, tel) => ({ id, nombre, nombre_norm:norm(nombre), telefono_principal:tel, telefono_alternativo:null,
  tel10:tel.replace(/\D/g, '').slice(-10), alt10:'', correo:'', fecha_nacimiento:null, en_lista_negra:false });
const personas = [P('pA', 'Rosa Prueba Uno', '+52 871 111 1111'), P('pB', 'Lucía Prueba Dos', '871-222-2222')];
const al = (pp, i) => ({ inscripcion_id:'i' + i, persona_id:pp.id, nombre:pp.nombre, nombre_norm:pp.nombre_norm, telefono_principal:pp.telefono_principal,
  tel10:pp.tel10, alt10:'', en_lista_negra:false, curso_id:'k1', curso:CURSO, ciudad_id:'c1', ciudad:'Torreón', fecha:'2026-10-09',
  precio_pactado:1400, anticipo:700, restante:700, liquidado:false, pago:'ant', paquete:'BASICO', asesor_id:'u2' });

(async () => {
  const h = await abrirHub({ ancho:1200, alto:800, tablas:{
    vista_cursos_explorador:[{ curso_id:'k1', curso:CURSO, alumnas:2, ciudades:1, desde:'2026-10-09', hasta:'2026-10-09', proximos:2, liquidadas:0 }],
    vista_curso_ciudades:[{ curso_id:'k1', ciudad_id:'c1', ciudad:'Torreón', estado:'Coahuila', alumnas:2, fechas:1, desde:'2026-10-09', hasta:'2026-10-09', liquidadas:0, proximos:2 }],
    vista_alumnos:[al(personas[0], 1), al(personas[1], 2)], vista_personas_busqueda:personas, personas_separadas:[],
    interacciones:[], personas:[], leads:[],
  } });
  const { p, check } = h;
  // Portapapeles de mentira: guardamos lo que se copia.
  await p.evaluate(() => {
    window.__copiado = [];
    Object.defineProperty(navigator, 'clipboard', { value:{ writeText: t => { window.__copiado.push(t); return Promise.resolve(); } }, configurable:true });
    window.__rpc.resumen_alumnos = () => ({ total:2, personas:2, cobrado:1400, liq:0, ant:2, sin:0, nol:0, perdio:0, vip:0 });
  });
  const copiado = () => p.evaluate(() => window.__copiado.slice(-1)[0]);
  const toast = () => p.textContent('#toast');
  const seccion = () => p.evaluate(() => document.querySelector('.view.active, section.active')?.id || [...document.querySelectorAll('[id^="view-"]')].find(v => v.offsetParent)?.id);

  h.paso('1. Cursos: junto al nombre y al teléfono');
  await p.evaluate(async () => { cursoActivoIdCache = undefined; setActiveSection('cursos'); await renderCursos(); });
  await p.waitForTimeout(400);
  const fila = '#cxAlumnas tr[data-cx-persona="pA"]';
  check(await p.$$eval(fila + ' [data-copiar]', els => els.length) === 2, 'dos en la fila (nombre y teléfono)');
  await p.click(fila + ' [data-copiar-tipo="nombre"]'); await p.waitForTimeout(150);
  check(await copiado() === 'Rosa Prueba Uno', 'copia el nombre: ' + await copiado());
  check((await toast()).includes('Nombre copiado'), 'avisa "Nombre copiado"');
  check(await p.isVisible('#view-cursos'), 'el no abre el historial');
  await p.click(fila + ' [data-copiar-tipo="telefono"]'); await p.waitForTimeout(150);
  check(await copiado() === '8711111111', 'el teléfono se copia solo con números, sin el 52: ' + await copiado());
  check((await toast()).includes('Teléfono copiado'), 'avisa "Teléfono copiado"');
  await p.focus(fila + ' [data-copiar-tipo="nombre"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  check(await p.evaluate(() => window.__copiado.length) === 3 && await p.isVisible('#view-cursos'), 'también se copia con Enter (teclado)');

  h.paso('2. Clic derecho: menú propio');
  await p.click(fila + ' td:nth-child(3)', { button:'right' }); await p.waitForTimeout(100);
  const ops = await p.$$eval('#menuCopiar [data-menu-copiar]', els => els.map(e => e.dataset.menuCopiar));
  check(ops.join() === 'nombre,tel,ambos,ver,wa', 'opciones del menú: ' + ops.join());
  check((await p.textContent('#menuCopiar')).includes('Rosa Prueba Uno'), 'el menú dice de quién es');
  await h.captura('copiar-menu-computadora.png');
  await p.click('#menuCopiar [data-menu-copiar="ambos"]'); await p.waitForTimeout(150);
  check(await copiado() === 'Rosa Prueba Uno 8711111111', 'copia nombre y teléfono: ' + await copiado());
  check(!(await p.$('#menuCopiar')), 'el menú se cierra al elegir');
  check(await p.isVisible('#view-cursos'), 'y no cambia de pantalla');
  await p.click(fila + ' td:nth-child(2)', { button:'right' }); await p.keyboard.press('Escape');
  check(!(await p.$('#menuCopiar')), 'Escape cierra el menú');
  await p.click(fila + ' td:nth-child(2)', { button:'right' }); await p.mouse.click(5, 5);
  check(!(await p.$('#menuCopiar')), 'clic afuera cierra el menú');
  await p.click('#cxAlumnas tr[data-cx-persona="pB"] td:nth-child(2)', { button:'right' });
  await p.click('#menuCopiar [data-menu-copiar="tel"]'); await p.waitForTimeout(150);
  check(await copiado() === '8712222222', 'teléfono con guiones queda solo números: ' + await copiado());
  await p.click(fila + ' td:nth-child(2)', { button:'right' });
  await p.click('#menuCopiar [data-menu-copiar="wa"]'); await p.waitForTimeout(300);
  check(await p.evaluate(() => document.getElementById('modalWhats').classList.contains('open') && waDatos?.ciudad === 'Torreón'),
    'WhatsApp del menú abre el mismo envío que (con ciudad del curso)');
  check((await p.textContent('#waTitulo')).includes('Rosa'), 'a la alumna correcta');
  await p.evaluate(() => document.getElementById('modalWhats').classList.remove('open'));

  h.paso('3. Seleccionar texto no abre el historial');
  await p.evaluate(() => {
    const b = document.querySelector('#cxAlumnas tr[data-cx-persona="pA"] td b');
    const r = document.createRange(); r.selectNodeContents(b); getSelection().removeAllRanges(); getSelection().addRange(r);
    b.dispatchEvent(new MouseEvent('click', { bubbles:true }));
  });
  await p.waitForTimeout(200);
  check(await p.isVisible('#view-cursos'), 'con texto seleccionado se queda en Cursos');
  check(!(await p.evaluate(() => document.addEventListener && document.querySelector('#menuCopiar'))), 'sin menú abierto');
  await p.evaluate(() => getSelection().removeAllRanges());
  await p.click(fila + ' td:nth-child(2)', { button:'right' });
  check(!!(await p.$('#menuCopiar')), 'sin selección sí sale el menú propio');
  await p.keyboard.press('Escape');
  await p.click(fila + ' td:nth-child(2)'); await p.waitForTimeout(500);
  check(await p.isVisible('#view-historial'), 'un clic normal en la fila sigue abriendo el historial');

  h.paso('4. Historial: lista y perfil');
  await p.fill('#historialSearch', 'prueba'); await p.waitForTimeout(700);
  const item = '#hxLista [data-ctx-persona="pB"]';
  check(await p.$$eval(item + ' [data-copiar]', els => els.length) === 2, 'lista: de nombre y teléfono');
  const selAntes = await p.evaluate(() => hx.sel);
  await p.click(item + ' [data-copiar-tipo="nombre"]'); await p.waitForTimeout(150);
  check(await copiado() === 'Lucía Prueba Dos', 'lista: copia el nombre');
  check(await p.evaluate(() => hx.sel) === selAntes, 'lista: el no cambia la persona seleccionada');
  await p.click(item, { button:'right' });
  check((await p.$$eval('#menuCopiar [data-menu-copiar]', els => els.map(e => e.dataset.menuCopiar))).includes('ver'), 'lista: el menú trae Ver historial');
  await p.click('#menuCopiar [data-menu-copiar="ver"]'); await p.waitForTimeout(400);
  check((await p.textContent('#historialResultado .hx-cab h2')).includes('Lucía Prueba Dos'), 'Ver historial abre su perfil');
  check(await p.$$eval('#historialResultado .hx-cab [data-copiar]', els => els.length) === 2, 'perfil: en nombre y teléfono');
  await p.click('#historialResultado .hx-cab [data-copiar-tipo="telefono"]'); await p.waitForTimeout(150);
  check(await copiado() === '8712222222', 'perfil: copia el teléfono');
  await p.click('#historialResultado .hx-cab h2', { button:'right' });
  const opsPerfil = await p.$$eval('#menuCopiar [data-menu-copiar]', els => els.map(e => e.dataset.menuCopiar));
  check(opsPerfil.join() === 'nombre,tel,ambos,wa', 'perfil: menú sin "Ver historial" (ya está ahí): ' + opsPerfil.join());
  await h.captura('copiar-historial-computadora.png');
  await p.keyboard.press('Escape');

  h.paso('5. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.evaluate(async () => { setActiveSection('cursos'); await renderCursos(); }); await p.waitForTimeout(400);
  check(await p.isVisible(fila + ' [data-copiar-tipo="nombre"]'), 'el se ve en celular');
  await p.click(fila + ' [data-copiar-tipo="nombre"]'); await p.waitForTimeout(150);
  check(await copiado() === 'Rosa Prueba Uno' && await p.isVisible('#view-cursos'), 'y copia sin abrir el historial');
  await p.click(fila + ' td:nth-child(2)', { button:'right' });
  const box = await p.$eval('#menuCopiar', m => { const r = m.getBoundingClientRect(); return r.right <= innerWidth && r.bottom <= innerHeight && r.left >= 0; });
  check(box, 'el menú no se sale de la pantalla');
  await h.captura('copiar-celular.png');
  await p.keyboard.press('Escape');
  check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sin scroll horizontal');

  await h.terminar();
})();
