/* Página de diplomas (diplomas/index.html → certificados.glamreposteria.com).
   Celular inválido, no encontrado, límite de intentos, "¿Eres tú?" con el nombre en 3 renglones,
   pago pendiente, dos cursos, "mi nombre está mal" (manda el nombre a Academia), diploma real en PDF
   con vista previa y descarga, número con +52, celular. Datos inventados; la base se simula. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const CAPTURAS = path.join(__dirname, 'capturas');
const TIPOS = { '.js':'application/javascript', '.jpg':'image/jpeg', '.png':'image/png', '.ttf':'font/ttf' };
const CAMPOS_GIRA = [
  { clave:'nombre', texto:'{nombre}', x:386, y:388.5, tam:40, tam_min:14, ancho:232, alto:83, renglones:3, interlineado:1.05, fuente:'nickainley', alinear:'centro', color:'#774228' },
  { clave:'mes', texto:'{mes}', x:297.96, y:814.6, tam:10.8, espaciado:1.33, centrar_tinta:true, fuente:'baskerville_italica', alinear:'centro', color:'#774228' },
];
const R = (id, nombre, listo, ciudad = 'Ciudad Prueba', fecha = '2026-10-13') => ({ id, fecha, ciudad, nombre, nombre_impreso:null, listo });
const BUSCAR = {
  '9990000001': [R('i1', 'MARÍA GUADALUPE DEL CARMEN HERNÁNDEZ DE LA CRUZ', true)],
  '9990000002': [R('i2', 'FABI DEBE PRUEBA', false)],
  '9990000003': [R('i3', 'ANA DOS CURSOS', true, 'Otra Ciudad', '2026-10-12'), R('i4', 'ANA DOS CURSOS', true, 'Ciudad Prueba', '2026-03-02')],
};

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport:{ width:390, height:844 }, acceptDownloads:true });
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  let ok = 0, mal = 0;
  const check = (c, m) => { if(c) ok++; else { mal++; console.log('  ✗', m); } };
  const paso = t => console.log(t);
  const llamadas = [];
  const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'*', 'Access-Control-Allow-Methods':'POST, GET, OPTIONS' };

  // Archivos del Hub (fondo, letras, armado del PDF) desde la copia local; librerías desde vendor/.
  await p.route(/^https:\/\/(fonts\.googleapis|fonts\.gstatic)\.com/, r => r.fulfill({ status:200, body:'' }));
  await p.route(/^https:\/\/hub\.glamreposteria\.com\//, r => {
    const ruta = path.join(RAIZ, 'hub', new URL(r.request().url()).pathname);
    if(!fs.existsSync(ruta)) return r.fulfill({ status:404, body:'' });
    r.fulfill({ status:200, contentType:TIPOS[path.extname(ruta)] || 'application/octet-stream', headers:cors, body:fs.readFileSync(ruta) });
  });
  await p.route(/cdn\.jsdelivr\.net\/npm\/pdf-lib@/, r => r.fulfill({ status:200, contentType:'application/javascript', body:fs.readFileSync(path.join(__dirname, 'vendor', 'pdf-lib.min.js')) }));
  await p.route(/cdn\.jsdelivr\.net\/npm\/@pdf-lib\/fontkit@/, r => r.fulfill({ status:200, contentType:'application/javascript', body:fs.readFileSync(path.join(__dirname, 'vendor', 'fontkit.umd.min.js')) }));
  // La base: solo las tres funciones del portal.
  await p.route(/supabase\.co\/rest\/v1\/rpc\//, r => {
    const req = r.request();
    if(req.method() === 'OPTIONS') return r.fulfill({ status:204, headers:cors });
    const fn = req.url().split('/rpc/')[1], args = JSON.parse(req.postData() || '{}');
    llamadas.push({ fn, args, apikey:req.headers().apikey });
    const json = (status, cuerpo) => r.fulfill({ status, contentType:'application/json', headers:cors, body:JSON.stringify(cuerpo) });
    if(fn === 'diploma_buscar'){
      if(args.p_telefono === '9990000009') return json(400, { message:'Demasiados intentos. Espera unos minutos y vuelve a intentar.' });
      return json(200, BUSCAR[args.p_telefono] || []);
    }
    if(fn === 'diploma_datos'){
      const res = Object.values(BUSCAR).flat().find(x => x.id === args.p_inscripcion);
      return json(200, { listo:true, id:res.id, fecha:res.fecha, ciudad:res.ciudad, nombre:res.nombre, nombre_impreso:null,
        plantilla:{ fondo_url:'/certificados/diploma-gira.jpg', campos:CAMPOS_GIRA, textos:{ mes:'' }, ancho:'595.5', alto:'842.25', usa_folio:false } });
    }
    if(fn === 'diploma_reportar_nombre') return json(200, { ok:true });
    return json(404, { message:'función desconocida' });
  });

  // La página se sirve desde un dominio https de prueba (con file:// el navegador no deja descargar).
  await p.route('https://certificados.prueba/**', r => r.fulfill({ status:200, contentType:'text/html', body:fs.readFileSync(path.join(RAIZ, 'diplomas', 'index.html')) }));
  await p.goto('https://certificados.prueba/');
  await p.waitForTimeout(300);
  const visible = s => p.isVisible(s);
  const txt = s => p.textContent(s);
  const buscar = async tel => { await p.fill('#tel', tel); await p.click('#btnBuscar'); await p.waitForTimeout(250); };
  const llamadasDe = fn => llamadas.filter(l => l.fn === fn);

  paso('1. Número incompleto, no encontrado y límite de intentos');
  check(await visible('#pasoTel') && !(await visible('#pasoQuien')), 'empieza pidiendo el celular');
  await buscar('99912');
  check((await txt('#avisoTel')).includes('10 dígitos') && llamadas.length === 0, 'número corto: avisa y no consulta');
  await buscar('9991112222');
  check((await txt('#avisoTel')).includes('No encontramos') && llamadasDe('diploma_buscar').length === 1, 'no encontrado: lo dice');
  check(llamadas[0].apikey?.startsWith('sb_publishable_'), 'usa la llave pública');
  await buscar('9990000009');
  check((await txt('#avisoTel')).includes('Demasiados intentos'), 'muestra el mensaje del límite');
  await p.screenshot({ path:path.join(CAPTURAS, 'diplomas-celular-inicio.png') });

  paso('2. ¿Eres tú? con el nombre en 3 renglones (y número con +52)');
  await buscar('+52 999 000 0001');
  check(llamadasDe('diploma_buscar').pop().args.p_telefono === '9990000001', 'quita el +52 y los espacios');
  check(await visible('#pasoQuien') && !(await visible('#pasoTel')), 'pasa a "¿Eres tú?"');
  const renglones = await p.$eval('.nombre-diploma', d => d.innerHTML.split('<br>'));
  check(renglones.join(' / ') === 'María Guadalupe del Carmen / Hernández / de la Cruz', 'nombre como sale: ' + renglones.join(' / '));
  check((await txt('.curso .donde')).includes('Ciudad Prueba') && (await txt('.curso .donde')).includes('13 de octubre de 2026'), 'ciudad y fecha del curso');
  await p.screenshot({ path:path.join(CAPTURAS, 'diplomas-celular-eres-tu.png') });

  paso('3. Sí, soy yo → diploma real');
  await p.click('[data-si="0"]');
  await p.waitForSelector('#btnDescargar:not([hidden])', { timeout:20000 }).catch(() => {});
  const datos = llamadasDe('diploma_datos').pop();
  check(datos?.args.p_telefono === '9990000001' && datos.args.p_inscripcion === 'i1', 'pide los datos con su número y su curso');
  check((await txt('#tituloDiploma')).includes('Felicidades, María'), 'felicita: ' + await txt('#tituloDiploma'));
  const pdf = await p.evaluate(async () => { const b = new Uint8Array(await estado.pdf.arrayBuffer()); let t = ''; for(let i = 0; i < b.length; i += 8192) t += String.fromCharCode(...b.subarray(i, i + 8192)); return { tam:b.length, b64:btoa(t) }; });
  const bytes = Buffer.from(pdf.b64, 'base64');
  check(bytes.subarray(0, 5).toString() === '%PDF-' && pdf.tam > 500000, 'arma el PDF con fondo y letras: ' + pdf.tam);
  fs.writeFileSync(path.join(CAPTURAS, 'diploma-portal.pdf'), bytes);
  check(await p.$eval('#btnDescargar', a => a.download) === 'Diploma Maria Guadalupe del Carmen Hernandez de la Cruz.pdf', 'nombre del archivo (sin acentos)');
  check(await p.$eval('#previa', c => !c.hidden && c.width > 300 && Math.abs(c.height / c.width - 842.25 / 595.5) < 0.01), 'vista previa vertical');
  const [descarga] = await Promise.all([p.waitForEvent('download', { timeout:5000 }).catch(() => null), p.click('#btnDescargar')]);
  check(descarga?.suggestedFilename() === 'Diploma Maria Guadalupe del Carmen Hernandez de la Cruz.pdf', 'el botón descarga el PDF: ' + descarga?.suggestedFilename());
  await p.waitForTimeout(300);
  await p.screenshot({ path:path.join(CAPTURAS, 'diplomas-celular-diploma.png'), fullPage:true });

  paso('4. Pago pendiente: no deja descargar');
  await p.click('#pasoDiploma [data-volver]');
  await buscar('9990000002');
  check((await txt('.curso')).includes('pago pendiente') && !(await p.$('[data-si]')), 'avisa y no ofrece el diploma');
  check(!!(await p.$('[data-mal="0"]')), 'sí puede avisar si su nombre está mal');

  paso('5. Mi nombre está mal');
  await p.click('[data-mal="0"]');
  check(await visible('#pasoNombre'), 'pide el nombre correcto');
  await p.fill('#nombreCorrecto', 'ab'); await p.click('#btnNombre'); await p.waitForTimeout(150);
  check((await txt('#avisoNombre')).includes('completo') && !llamadasDe('diploma_reportar_nombre').length, 'nombre muy corto: avisa');
  await p.fill('#nombreCorrecto', '  Fabiola   Débora  Prueba '); await p.click('#btnNombre'); await p.waitForTimeout(250);
  const rep = llamadasDe('diploma_reportar_nombre').pop();
  check(rep?.args.p_nombre === 'Fabiola Débora Prueba' && rep.args.p_inscripcion === 'i2' && rep.args.p_telefono === '9990000002', 'manda el nombre limpio: ' + JSON.stringify(rep?.args));
  check((await txt('#avisoNombre')).includes('Academia va a corregir') && !(await visible('#formNombre')), 'confirma y oculta el formulario');

  paso('6. Dos cursos con el mismo número');
  await p.click('#pasoNombre [data-atras]'); await p.click('#pasoQuien [data-volver]');
  await buscar('9990000003');
  check((await p.$$('.curso')).length === 2 && (await txt('#listaCursos')).includes('Otra Ciudad'), 'muestra los dos cursos');
  await p.click('[data-si="1"]');
  await p.waitForSelector('#btnDescargar:not([hidden])', { timeout:20000 }).catch(() => {});
  check(llamadasDe('diploma_datos').pop()?.args.p_inscripcion === 'i4', 'descarga el del curso que eligió');

  paso('7. Celular y computadora');
  check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sin scroll horizontal en celular');
  await p.setViewportSize({ width:1200, height:900 });
  await p.screenshot({ path:path.join(CAPTURAS, 'diplomas-computadora.png') });
  check(await p.evaluate(() => document.querySelector('.marco').getBoundingClientRect().width <= 460), 'en computadora queda centrada y angosta');

  check(errores.length === 0, 'sin errores de JS: ' + errores.join(' | '));
  console.log(`\nprueba_diplomas: ${ok}/${ok + mal}`);
  await b.close();
  process.exitCode = mal ? 1 : 0;
})();
