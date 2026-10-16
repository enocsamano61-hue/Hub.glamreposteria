/* Academia (fase 4, pestaña Certificados).
   Gira: diploma vertical de la gira (fondo real, nombre en Nickainley en hasta 3 renglones, mes del curso),
   sin folio, solo para quien llegó y liquidó con pagos confirmados (o se agrega a mano ya liquidada);
   revisa letras que no existen y nombres demasiado largos. Mandar con {link} → Enviado y certificado_entregado,
   regenerar, falla de subida, plantilla (mes, posición). Academia: folio (sin configurar / configurar),
   programa obligatorio, diploma con matrícula. Celular. Datos inventados. */
const fs = require('fs');
const path = require('path');
const { abrirHub } = require('./arnes');

const VENDOR = path.join(__dirname, 'vendor');
const CERTS = path.join(__dirname, '..', 'hub', 'certificados');
// La misma plantilla de gira que queda en la base (academia_10_diploma_gira).
const CAMPOS_GIRA = [
  { clave:'nombre', texto:'{nombre}', x:386, y:388.5, tam:40, tam_min:14, ancho:232, alto:83, renglones:3, interlineado:1.05, fuente:'nickainley', alinear:'centro', color:'#774228' },
  { clave:'mes', texto:'{mes}', x:297.96, y:814.6, tam:10.8, espaciado:1.33, centrar_tinta:true, fuente:'baskerville_italica', alinear:'centro', color:'#774228' },
];
const CAMPOS_ACA = [
  { clave:'nombre', texto:'{nombre}', x:229.5, y:205.5, tam:49.5, fuente:'manuscrita', alinear:'izq', ancho_max:520, color:'#B5308E' },
  { clave:'programa', texto:'{programa}', x:229.5, y:289.4, tam:19.5, fuente:'negrita', alinear:'izq', ancho_max:520, color:'#111111' },
  { clave:'lugar_fecha', texto:'{lugar_fecha}', x:229.5, y:315.2, tam:12.8, fuente:'normal', alinear:'izq', ancho_max:520, color:'#333333' },
  { clave:'generacion', texto:'{generacion}', x:86.2, y:568.3, tam:9, fuente:'negrita', alinear:'centro', ancho_max:150, color:'#111111' },
  { clave:'firma2', texto:'{firma2}', x:537.8, y:551.3, tam:13.5, fuente:'negrita', alinear:'centro', ancho_max:190, color:'#111111' },
  { clave:'firma2_cargo', texto:'{firma2_cargo}', x:537.7, y:567.8, tam:9, fuente:'normal', alinear:'centro', ancho_max:190, color:'#444444' },
  { clave:'matricula', texto:'Matrícula {matricula}', x:765, y:552, tam:9.4, fuente:'normal', alinear:'der', ancho_max:130, color:'#444444' },
  { clave:'folio', texto:'Folio {folio}', x:765, y:567, tam:9.4, fuente:'normal', alinear:'der', ancho_max:130, color:'#444444' },
];
const PER = (id, nombre, tel) => ({ id, nombre, telefono_principal:tel });
// pago: 'ok' liquidada y confirmada · 'debe' le faltan $2,000 · 'pc' liquidada con un pago por confirmar
const INS = (id, ev, persona, asistencia, pago = 'ok', estatus_id = 12) => ({ id, evento_id:ev, persona_id:persona.id, asistencia, estatus_id, certificado_entregado:false,
  precio_pactado:3000, anticipo:pago === 'debe' ? 1000 : 3000, restante:pago === 'debe' ? 2000 : 0, liquidado:pago !== 'debe',
  pagos:[{ verificacion:'confirmado' }, ...(pago === 'pc' ? [{ verificacion:'por_confirmar' }] : [])], personas:persona });
const base = () => ({
  eventos: [
    { id:'e1', curso_id:'c1', fecha:'2026-10-01', sede:'Salón Prueba', ciudades:{ nombre:'Ciudad Prueba' } },
    { id:'e2', curso_id:'c1', fecha:'2026-10-05', sede:'Salón Dos', ciudades:{ nombre:'Otra Ciudad' } },
  ],
  inscripciones: [
    INS('i1', 'e1', PER('p1', 'ANA PRUEBA UNO', '0000000001'), 'llego'),
    INS('i2', 'e1', PER('p2', 'BETY PRUEBA DOS', '0000000002'), 'llego'),
    INS('i9', 'e1', PER('p9', 'MARÍA GUADALUPE DEL CARMEN HERNÁNDEZ DE LA CRUZ', '0000000009'), 'llego'),
    INS('i6', 'e1', PER('p6', 'FABI DEBE', '0000000006'), 'llego', 'debe'),
    INS('i7', 'e1', PER('p7', 'GINA POR CONFIRMAR', '0000000007'), 'llego', 'pc'),
    INS('i3', 'e1', PER('p3', 'CARLA SIN LLEGADA', '0000000003'), null),
    INS('i8', 'e1', PER('p8', 'HELE SIN LLEGAR DEBE', '0000000008'), null, 'debe'),
    INS('i4', 'e1', PER('p4', 'DORA NO VA', '0000000004'), null, 'ok', 6),
    INS('i5', 'e2', PER('p5', 'ELSA PRUEBA CINCO', '0000000005'), 'llego'),
  ],
  certificados: [
    { id:'cx', tipo:'gira', evento_id:'e2', inscripcion_id:'i5', alumna_id:null, nombre_impreso:'Elsa Prueba Cinco', datos:{}, folio:null,
      estado:'enviado', archivo_path:'gira/2026/x.pdf', link:'https://prueba.local/x.pdf', generado_en:'2026-10-06T10:00:00Z', enviado_en:'2026-10-06T11:00:00Z' },
  ],
  certificado_plantillas: [
    { id:'pg', tipo:'gira', fondo_url:'https://prueba.local/diploma-gira.jpg', campos:CAMPOS_GIRA, textos:{ curso:'LOS PASTELES', mes:'' },
      folio_prefijo:null, folio_siguiente:null, folio_digitos:6, ancho:595.5, alto:842.25, usa_folio:false },
    { id:'pa', tipo:'academia', fondo_url:'https://prueba.local/fondo-academia.png', campos:CAMPOS_ACA,
      textos:{ lugar_fecha:'Ciudad Prueba, a 1 de agosto de 2026.', firma2:'Nombre de Prueba', firma2_cargo:'DIRECCIÓN ACADÉMICA' },
      folio_prefijo:null, folio_siguiente:null, folio_digitos:4, ancho:792, alto:612, usa_folio:true },
  ],
  academia_generaciones: [{ id:'g1', clave:'gen1', nombre:'1ª generación', hoja:'1ER GEN', orden:1, programa:null }],
  academia_alumnas: [
    { id:'a1', generacion_id:'g1', nombre:'FER GRADUADA', telefono:'0000000011', matricula:'M-001', persona_id:'pa1', decision:'graduada', personas:{ telefono_principal:'0000000011' } },
    { id:'a2', generacion_id:'g1', nombre:'GABY GRADUADA', telefono:null, matricula:null, persona_id:null, decision:'graduada', personas:null },
    { id:'a3', generacion_id:'g1', nombre:'HILDA PENDIENTE', telefono:'0000000013', matricula:null, persona_id:null, decision:'por_contactar', personas:null },
  ],
  mensajes_predeterminados: [{ id:'m1', usuario_id:'u3', titulo:'Certificado', texto:'Hola {nombre}, aquí está tu certificado: {link}', compartido:true, foto_url:null }],
});
const ACADEMIA = { id:'u3', nombre:'Academia Prueba', rol:'Academia e Inbox', es_admin:false };

(async () => {
  const h = await abrirHub({ tablas:base(), usuario:ACADEMIA, equipo:[{ id:'u3', nombre:'Academia Prueba', es_vendedor:false, rol:'Academia e Inbox' }] });
  const { p, check } = h;
  // pdf-lib, fontkit, fondos y letras salen de copias locales (nada a internet).
  const servir = (archivo, tipo) => r => r.fulfill({ status:200, contentType:tipo, headers:{ 'Access-Control-Allow-Origin':'*' }, body:fs.readFileSync(archivo) });
  // Playwright usa la última ruta registrada primero: la genérica va antes.
  await p.route('https://prueba.local/**', r => r.fulfill({ status:200, body:'' }));
  await p.route(/cdn\.jsdelivr\.net\/npm\/pdf-lib@/, servir(path.join(VENDOR, 'pdf-lib.min.js'), 'application/javascript'));
  await p.route(/cdn\.jsdelivr\.net\/npm\/@pdf-lib\/fontkit@/, servir(path.join(VENDOR, 'fontkit.umd.min.js'), 'application/javascript'));
  await p.route('https://prueba.local/diploma-gira.jpg', servir(path.join(CERTS, 'diploma-gira.jpg'), 'image/jpeg'));
  await p.route('https://prueba.local/fondo-academia.png', servir(path.join(CERTS, 'fondo-academia.png'), 'image/png'));
  for(const [url, archivo] of [['greatvibes', 'GreatVibes-Regular.ttf'], ['nickainley', 'Nickainley-Normal.ttf'], ['baskerville', 'LibreBaskerville-Italic.ttf']])
    await p.route(`https://prueba.local/${url}.ttf`, servir(path.join(CERTS, archivo), 'font/ttf'));

  const txt = s => p.textContent(s);
  const ultimo = async (tabla, tipo) => (await h.ops(tabla, tipo)).pop();
  const esperar = () => p.waitForTimeout(250);
  const esperarLibre = () => p.waitForFunction(() => !cc.ocupado, null, { timeout:15000 });
  const abrir = async (tablas = base()) => {
    await p.evaluate(t => {
      window.__tablas = t; window.__ops = []; MENSAJES = null; cursoActivoIdCache = 'c1';
      CERT_FUENTES = { manuscrita:'https://prueba.local/greatvibes.ttf', nickainley:'https://prueba.local/nickainley.ttf', baskerville_italica:'https://prueba.local/baskerville.ttf' };
      usuarioActual = { id:'u3', nombre:'Academia Prueba', rol:'Academia e Inbox', es_admin:false }; PERMISOS_ROL_CACHE = {};
      PERMISOS_ACCION_CACHE = { 'Academia e Inbox':new Set(['cobrar_academia']) };
      ac = { tab:'alumnas', generaciones:null, gen:null, filas:[], resumen:new Map(), filtro:'todas', sel:null, pagosDe:null, pagos:null, pagoSel:null, privados:null, limite:AC_POR_PAGINA };
      cc = { tipo:'gira', plantillas:null, grupos:[], grupo:null, filas:[], otras:[], deben:[], cola:[], ocupado:false };
      // Storage simulado: guarda lo que se sube para revisarlo.
      window.__subidos = [];
      Object.defineProperty(sb, 'storage', { configurable:true, value:{ from: bucket => ({
        upload: async (ruta, datos, opc) => {
          const b = datos instanceof Uint8Array ? datos : new Uint8Array(await datos.arrayBuffer());
          window.__subidos.push({ bucket, ruta, tipo:opc?.contentType, tam:b.length, inicio:String.fromCharCode(...b.subarray(0, 5)), b64:(() => { let t = ''; for(let i = 0; i < b.length; i += 8192) t += String.fromCharCode(...b.subarray(i, i + 8192)); return btoa(t); })() });
          return { data:{ path:ruta }, error:null };
        },
        getPublicUrl: ruta => ({ data:{ publicUrl:'https://prueba.local/storage/' + bucket + '/' + ruta } }),
      }) } });
      // Folio: igual que la función de la base (falla si no está configurado).
      window.__rpc = { siguiente_folio: ({ p_tipo }) => {
        const pl = window.__tablas.certificado_plantillas.find(x => x.tipo === p_tipo);
        if(pl.folio_prefijo == null || pl.folio_siguiente == null) throw new Error('sin folio');
        const f = pl.folio_prefijo + String(pl.folio_siguiente).padStart(pl.folio_digitos, '0'); pl.folio_siguiente++; return f;
      } };
      const rpc = sb.rpc;
      sb.rpc = (fn, args) => { try{ return rpc(fn, args); } catch(e){ return Promise.resolve({ data:null, error:{ message:'Falta configurar el folio de ' + args.p_tipo + '.' } }); } };
      window.open = () => null;
      aplicarPermisosNav();
    }, tablas);
    await p.evaluate(() => setActiveSection('academia'));
    await p.waitForTimeout(200);
    await p.click('[data-ac-tab="certificados"]');
    await p.waitForTimeout(300);
  };
  // Escribe y sale del campo (el "change" de verdad, una sola vez).
  const cambiar = async (sel, valor) => { await p.fill(sel, valor); await p.$eval(sel, el => el.blur()); };
  const grupo = async id => { await p.click(`[data-c-grupo="${id}"]`); await esperar(); };
  const subidos = () => p.evaluate(() => window.__subidos.map(({ b64, ...r }) => r));
  const filasLista = () => p.$$eval('#cLista [data-c-fila]', f => f.map(x => x.dataset.cFila).join());
  const guardarPdf = async (i, archivo) => fs.writeFileSync(path.join(__dirname, 'capturas', archivo), Buffer.from(await p.evaluate(n => window.__subidos[n].b64, i), 'base64'));
  const abrirPlantilla = async () => { if(await p.$eval('#cPlantilla', c => c.hidden)){ await p.click('#cPlantillaBtn'); await esperar(); } };

  h.paso('1. Grupos de la gira: solo cuentan las que ya liquidaron');
  await abrir();
  check(await p.isVisible('#acPanelCertificados') && !(await p.isVisible('#acPanelKits')), 'cambia a la pestaña Certificados');
  const g1 = await txt('[data-c-grupo="e1"]'), g2 = await txt('[data-c-grupo="e2"]');
  check(g1.includes('Ciudad Prueba') && /3\s*listas/.test(g1) && /0\s*generados/.test(g1) && g1.includes('2 aún no'), 'curso 1: 3 listas, 2 aún no: ' + g1);
  check(g2.includes('Otra Ciudad') && /1\s*listas/.test(g2) && /1\s*enviados/.test(g2), 'curso 2: 1 enviado: ' + g2);
  check((await h.ops('certificados', 'insert')).length === 0, 'abrir no crea nada');

  h.paso('2. Lista: listas, las que aún no y agregar a mano');
  await grupo('e1');
  check(await filasLista() === 'i1,i2,i9', 'solo llegaron y liquidaron con pagos confirmados: ' + await filasLista());
  check(!(await txt('#cLista')).includes('folio'), 'la gira no pide folio');
  check(await p.$eval('[data-c-nombre="i9"]', i => i.value) === 'María Guadalupe del Carmen Hernández de la Cruz', 'nombre con mayúsculas y partículas en minúscula');
  check((await txt('[data-c-asi="i9"]')).includes('María Guadalupe del Carmen / Hernández / de la Cruz'), 'muestra cómo sale en 3 renglones: ' + await txt('[data-c-asi="i9"]'));
  const deben = await txt('.c-deben');
  check(deben.includes('Fabi Debe') && deben.includes('Debe $2,000') && deben.includes('Gina Por Confirmar') && deben.includes('Pago por confirmar') && !deben.includes('Hele'),
    'aparte: la que debe y la del pago por confirmar: ' + deben);
  check(!(await p.$('[data-c-debe="i6"] button')), 'las que aún no, sin botón de generar');
  check(await p.$$eval('#cAgregarSel option', o => o.map(x => x.value).join()) === ',i3', 'agregar a mano: solo la que ya liquidó (no la que debe ni la que no va)');
  check((await txt('[data-c-acc="generarTodos"]')).includes('3 pendientes'), 'botón: 3 pendientes');

  h.paso('3. Generar el diploma (PDF real, sin folio)');
  await h.limpiarOps();
  await p.click('[data-c-generar="i9"]'); await esperarLibre(); await esperar();
  let sub = await subidos();
  if(!sub.length) console.log('toast:', await txt('#toast'));
  check(sub.length === 1 && sub[0].bucket === 'certificados' && sub[0].inicio === '%PDF-' && sub[0].tipo === 'application/pdf' && sub[0].tam > 500000, 'sube un PDF con fondo y letras completas: ' + JSON.stringify(sub));
  check(/^gira\/\d{4}\/[0-9a-f-]{36}\.pdf$/.test(sub[0]?.ruta || ''), 'nombre de archivo aleatorio: ' + sub[0]?.ruta);
  check((await h.ops('rpc:siguiente_folio', 'rpc')).length === 0, 'no pide folio');
  const c9 = (await h.filas('certificados')).find(c => c.inscripcion_id === 'i9');
  check(c9.folio == null && c9.estado === 'generado' && c9.link.includes(sub[0].ruta), 'queda generado, sin folio, con link');
  check(c9.datos?.nombre === 'María Guadalupe del Carmen Hernández de la Cruz' && c9.datos.mes === 'OCTUBRE 2026', 'guarda nombre y el mes del curso: ' + JSON.stringify(c9.datos));
  const fila9 = await txt('[data-c-fila="i9"]');
  check(fila9.includes('Generado') && !fila9.includes('Folio') && fila9.includes('Regenerar') && fila9.includes('Ver PDF'), 'la fila lo muestra');
  await guardarPdf(0, 'diploma-gira-largo.pdf');

  h.paso('4. Nombre corregido: "Así sale" cambia al momento');
  await h.limpiarOps();
  await cambiar('[data-c-nombre="i1"]', 'Ana Sofía Prueba Uno'); await esperar();
  check((await txt('[data-c-asi="i1"]')).includes('Ana Sofía / Prueba / Uno'), 'Así sale: ' + await txt('[data-c-asi="i1"]'));
  await p.click('[data-c-generar="i1"]'); await esperarLibre(); await esperar();
  check((await subidos()).length === 2 && (await h.filas('certificados')).find(c => c.inscripcion_id === 'i1')?.datos?.nombre === 'Ana Sofía Prueba Uno', 'genera con el nombre corregido');
  await guardarPdf(1, 'diploma-gira.pdf');

  h.paso('5. Revisiones para no generar un diploma mal hecho');
  await cambiar('[data-c-nombre="i2"]', 'Bety 🎂 Prueba'); await esperar();
  await p.click('[data-c-generar="i2"]'); await esperarLibre(); await esperar();
  check((await subidos()).length === 2 && (await txt('#toast')).includes('no tiene') && (await txt('#toast')).includes('🎂'), 'letra que no existe: no sube y dice cuál: ' + await txt('#toast'));
  check((await h.filas('certificados')).find(c => c.inscripcion_id === 'i2')?.estado === 'pendiente', 'queda pendiente');
  await cambiar('[data-c-nombre="i2"]', 'Maximiliana Guadalupe Fernanda Alejandra Josefina Bety Hernández Rodríguez'); await esperar();
  await p.click('[data-c-generar="i2"]'); await esperarLibre(); await esperar();
  check((await subidos()).length === 2 && (await txt('#toast')).includes('demasiado largo'), 'nombre demasiado largo: no sube y pide acortarlo: ' + await txt('#toast'));
  await cambiar('[data-c-nombre="i2"]', 'Bety Prueba Dos'); await esperar();

  h.paso('6. Mandar por WhatsApp con {link}');
  await p.click('[data-c-mandar="i9"]'); await p.waitForSelector('#modalWhats.open');
  const wa = await p.$eval('#waTexto', t => t.value);
  check(wa.includes(c9.link) && wa.startsWith('Hola María,'), 'el mensaje lleva el link: ' + wa);
  await h.limpiarOps();
  await p.click('#waEnviar'); await esperar();
  check((await ultimo('certificados', 'update'))?.estado === 'enviado', 'queda "Enviado"');
  check((await ultimo('inscripciones', 'update'))?.certificado_entregado === true, 'marca certificado_entregado en la inscripción');
  check((await txt('[data-c-fila="i9"]')).includes('Enviado') && /1\s*enviados/.test(await txt('[data-c-grupo="e1"]')), 'lista y grupo se actualizan');

  h.paso('7. Agregar a mano (ya liquidada) y generar las pendientes');
  await p.selectOption('#cAgregarSel', 'i3'); await p.click('[data-c-acc="agregar"]'); await esperar();
  const ins3 = await ultimo('certificados', 'insert');
  check(ins3?.inscripcion_id === 'i3' && ins3.estado === 'pendiente', 'agrega a Carla');
  check(await filasLista() === 'i1,i2,i3,i9' && !(await p.$('#cAgregarSel')), 'aparece en la lista: ' + await filasLista());
  check(/4\s*listas/.test(await txt('[data-c-grupo="e1"]')), 'el grupo cuenta 4');
  check((await txt('[data-c-acc="generarTodos"]')).includes('2 pendientes'), 'botón: 2 pendientes');
  await h.limpiarOps();
  await p.click('[data-c-acc="generarTodos"]'); await esperarLibre(); await esperar();
  check((await subidos()).length === 4, 'sube 2 PDF más');
  check(/4\s*generados/.test(await txt('[data-c-grupo="e1"]')), 'todos generados');

  h.paso('8. Mandar todos (uno por uno)');
  check((await txt('[data-c-acc="mandarTodos"]')).includes('3 links'), 'botón: 3 links');
  await p.click('[data-c-acc="mandarTodos"]'); await p.waitForSelector('#modalWhats.open');
  check((await txt('#waTitulo')).includes('Ana'), 'abre la primera');
  await p.click('#waEnviar'); await p.waitForTimeout(700);
  check(await p.isVisible('#modalWhats.open') && (await txt('#waTitulo')).includes('Bety'), 'sigue con la siguiente');
  await p.click('#waEnviar'); await p.waitForTimeout(700);
  await p.click('#waEnviar'); await p.waitForTimeout(400);
  check((await h.filas('certificados')).filter(c => c.evento_id === 'e1').every(c => c.estado === 'enviado'), 'las 4 enviadas');

  h.paso('9. Regenerar uno ya enviado pide confirmación');
  await h.limpiarOps();
  await p.click('[data-c-generar="i2"]'); await p.waitForSelector('#modalConfirmar.open');
  await p.click('#confirmarNo'); await esperar();
  check((await subidos()).length === 4, 'cancelar no regenera');
  await p.click('[data-c-generar="i2"]'); await p.waitForSelector('#modalConfirmar.open'); await p.click('#confirmarSi');
  await esperarLibre(); await esperar();
  const c2 = (await h.filas('certificados')).find(c => c.inscripcion_id === 'i2');
  check((await subidos()).length === 5 && c2.estado === 'generado', 'PDF nuevo, vuelve a "Generado"');

  h.paso('10. Si falla la subida, no queda como generado');
  await p.evaluate(() => { Object.defineProperty(sb, 'storage', { configurable:true, value:{ from: () => ({
    upload: async () => ({ data:null, error:{ message:'falla simulada' } }), getPublicUrl: () => ({ data:{ publicUrl:'' } }) }) } }); });
  await p.click('[data-c-generar="i2"]'); await esperarLibre(); await esperar();
  check((await txt('#toast')).includes('No se pudo subir') && (await h.filas('certificados')).find(c => c.inscripcion_id === 'i2').link === c2.link, 'avisa y deja el link anterior');

  h.paso('11. Cuando liquida, pasa sola a la lista');
  const pagada = base();
  Object.assign(pagada.inscripciones.find(i => i.id === 'i6'), { anticipo:3000, restante:0, liquidado:true });
  pagada.inscripciones.find(i => i.id === 'i7').pagos = [{ verificacion:'confirmado' }, { verificacion:'confirmado' }];
  await abrir(pagada); await grupo('e1');
  check(await filasLista() === 'i1,i2,i6,i7,i9' && !(await p.$('.c-deben')), 'Fabi y Gina ya están en la lista: ' + await filasLista());

  h.paso('12. Plantilla de gira: sin folio, mes editable, hoja vertical');
  await abrirPlantilla();
  const plTxt = await txt('#cPlantilla');
  check(!plTxt.includes('Prefijo') && plTxt.includes('Mes de abajo') && !plTxt.includes('Curso (como sale'), 'sin folio; solo el texto que usa la plantilla (el mes)');
  check(await p.$eval('.c-previa', d => Math.abs(d.clientHeight / d.clientWidth - 842.25 / 595.5) < 0.02), 'vista previa vertical');
  check((await txt('.c-previa')).includes('María Fernanda') && (await p.$eval('.c-previa span.bloque', s => s.innerHTML.split('<br>').length)) === 3, 'vista previa con el nombre en 3 renglones');
  await h.limpiarOps();
  await cambiar('[data-c-texto="mes"]', 'Diciembre 2026'); await esperar();
  check((await ultimo('certificado_plantillas', 'update'))?.textos?.mes === 'Diciembre 2026', 'guarda el mes');
  check((await txt('.c-previa')).includes('DICIEMBRE 2026'), 'la vista previa lo muestra en mayúsculas');
  await p.click('[data-c-generar="i6"]'); await esperarLibre(); await esperar();
  check((await h.filas('certificados')).find(c => c.inscripcion_id === 'i6')?.datos?.mes === 'DICIEMBRE 2026', 'el diploma sale con ese mes');
  await cambiar('[data-c-campo="0"][data-c-prop="y"]', '390'); await esperar();
  const upC = await ultimo('certificado_plantillas', 'update');
  check(upC?.campos?.[0]?.y === 390 && upC.campos[0].renglones === 3 && upC.campos[1].espaciado === 1.33 && upC.campos.length === 2, 'guarda la posición sin tocar lo demás');
  await h.captura('certificados-plantilla.png');

  h.paso('13. Academia: folio sin configurar, configurar, programa obligatorio');
  await p.click('[data-c-tipo="academia"]'); await esperar();
  const ga = await txt('[data-c-grupo="g1"]');
  check(ga.includes('1ª generación') && /2\s*graduadas/.test(ga) && ga.includes('Falta el programa'), 'generación con 2 graduadas: ' + ga);
  await grupo('g1');
  check(await filasLista() === 'a1,a2', 'solo graduadas');
  check((await txt('#cLista')).includes('configura el folio'), 'avisa que falta el folio');
  check(!(await p.$('[data-c-asi="a1"]')), 'el diploma de academia es de un renglón (sin "Así sale")');
  check((await txt('[data-c-fila="a2"]')).includes('Sin teléfono'), 'avisa sin teléfono');
  await h.limpiarOps();
  await p.click('[data-c-generar="a1"]'); await esperarLibre(); await esperar();
  check((await h.ops('certificados', 'insert')).length === 0 && (await txt('#toast')).includes('programa'), 'sin programa no genera');
  await cambiar('[data-c-programa="g1"]', 'CHEF DE PRUEBA'); await esperar();
  check((await ultimo('academia_generaciones', 'update'))?.programa === 'CHEF DE PRUEBA', 'guarda el programa de la generación');
  await p.click('[data-c-generar="a1"]'); await esperarLibre(); await esperar();
  check((await ultimo('certificados', 'insert'))?.alumna_id === 'a1' && (await txt('#toast')).includes('folio'), 'sin folio crea el registro pero no arma el PDF: ' + await txt('#toast'));
  await abrirPlantilla();
  await cambiar('[data-c-pl="folio_prefijo"]', 'ACA-'); await esperar();
  await cambiar('[data-c-pl="folio_siguiente"]', '7'); await esperar();
  check((await txt('#cPlantilla')).includes('ACA-0007') && !(await txt('#cLista')).includes('configura el folio'), 'muestra el siguiente folio y ya no avisa');
  await cambiar('[data-c-pl="folio_siguiente"]', '-3'); await esperar();
  check((await txt('#toast')).includes('número válido'), 'no acepta número negativo');
  await p.click('[data-c-generar="a1"]'); await esperarLibre(); await esperar();
  const ca = (await h.filas('certificados')).find(c => c.alumna_id === 'a1');
  check(ca?.folio === 'ACA-0007' && ca.estado === 'generado' && ca.tipo === 'academia', 'diploma con su folio: ' + ca?.folio);
  check(ca?.datos?.programa === 'CHEF DE PRUEBA' && ca.datos.matricula === 'M-001' && ca.datos.generacion === '1ª GENERACIÓN', 'datos del diploma');
  sub = await subidos();
  check(/^academia\//.test(sub[sub.length - 1].ruta) && sub[sub.length - 1].inicio === '%PDF-', 'sube el PDF en academia/');
  await guardarPdf(sub.length - 1, 'certificado-academia.pdf');
  check(!(await p.$('[data-c-mandar="a2"]')), 'sin teléfono no hay botón de WhatsApp');
  await h.captura('certificados-computadora.png');

  h.paso('14. Celular');
  await p.setViewportSize({ width:390, height:844 });
  await p.click('[data-c-tipo="gira"]'); await esperar(); await grupo('e1');
  check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sin scroll horizontal');
  await h.captura('certificados-celular.png');

  await h.terminar();
})();
