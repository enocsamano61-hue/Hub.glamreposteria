/* Paleta C "rosa claro" del Hub y letra nueva del nombre en el diploma de gira (oct 2026).
   - Paleta: variables, barra lateral rosa pastel con letra oscura, contraste suficiente y que no quede
     ningún color de la paleta anterior en los estilos.
   - Diploma: el nombre sale en mayúsculas con Barlow Semi Condensed (se arma el PDF real con pdf-lib). */
const fs = require('fs');
const path = require('path');
const { abrirHub } = require('./arnes');

const CERTS = path.join(__dirname, '..', 'hub', 'certificados');
const VENDOR = path.join(__dirname, 'vendor');

(async () => {
  const h = await abrirHub({ usuario:{ id:'u3', nombre:'Admin Prueba', rol:'Gerente', es_admin:true } });
  const { p, check } = h;

  h.paso('1. Variables de la paleta C');
  const vars = await p.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return Object.fromEntries(['--wine', '--wine-dark', '--champagne', '--bg', '--barra-1', '--barra-2', '--sobre-barra', '--ambar']
      .map(v => [v, cs.getPropertyValue(v).trim().toUpperCase()]));
  });
  check(vars['--wine'] === '#B23C6C' && vars['--wine-dark'] === '#8E2F57' && vars['--champagne'] === '#E296B0' && vars['--bg'] === '#FDF5F7',
        'frambuesa, frambuesa oscuro, rosa de adorno y fondo rosa suave (' + JSON.stringify(vars) + ')');
  check(vars['--ambar'] === '#C6A66B', 'el ámbar de estado no cambia');
  const estilos = await p.evaluate(() => [...document.querySelectorAll('style')].map(s => s.textContent).join('\n') + document.body.innerHTML);
  const viejos = ['#B02D80', '#5B2C83', '#4AA3F0', '#C2338A', '#F06BB8', '#8E5BB8', '194,51,138', '#5A1F2B', '#3B151D'].filter(c => estilos.includes(c));
  check(viejos.length === 0, 'no queda ningún color de las paletas anteriores (' + viejos.join(', ') + ')');

  h.paso('2. Barra lateral y contraste');
  // Contraste WCAG entre dos colores rgb(...) calculados por el navegador.
  const contraste = await p.evaluate(() => {
    const rgb = s => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
    const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const cr = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const cs = el => getComputedStyle(el);
    const barra = '#FBE6EC', barra2 = '#F1BEC7';
    const prueba = document.createElement('div'); document.body.appendChild(prueba);
    const color = c => { prueba.style.color = c; return cs(prueba).color; };
    const nav = document.querySelector('.nav-item:not(.active)');
    const btn = document.createElement('button'); btn.className = 'btn-primary'; btn.textContent = 'x'; document.body.appendChild(btn);
    const r = {
      nav: Math.min(cr(cs(nav).color, color(barra)), cr(cs(nav).color, color(barra2))),
      boton: cr(cs(btn).color, cs(btn).backgroundColor),
      texto: cr(color('var(--ink)'), color('var(--bg)')),
      suave: cr(color('var(--ink-soft)'), color('var(--card)')),
      sidebarFondo: cs(document.querySelector('.sidebar')).backgroundImage,
    };
    btn.remove(); prueba.remove();
    return r;
  });
  check(contraste.sidebarFondo.includes('rgb(251, 230, 236)') && contraste.sidebarFondo.includes('rgb(241, 190, 199)'), 'barra lateral rosa pastel');
  check(contraste.nav >= 4.5, `menú legible sobre la barra (${contraste.nav.toFixed(2)}:1)`);
  check(contraste.boton >= 4.5, `botón principal legible (${contraste.boton.toFixed(2)}:1)`);
  check(contraste.texto >= 7 && contraste.suave >= 4.5, `texto y texto suave legibles (${contraste.texto.toFixed(2)} y ${contraste.suave.toFixed(2)}:1)`);
  await p.evaluate(() => setActiveSection('calendario'));
  await p.waitForTimeout(300);
  const activa = await p.evaluate(() => { const a = document.querySelector('.nav-item.active'); return a && getComputedStyle(a).backgroundColor; });
  check(activa === 'rgb(255, 255, 255)', 'la sección abierta resalta en blanco');
  await h.captura('paleta-c-hub.png');
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'celular sin scroll de lado');
  await h.captura('paleta-c-celular.png');
  await p.setViewportSize({ width:1200, height:900 });
  await p.evaluate(() => { document.getElementById('appShell').classList.remove('active'); document.getElementById('loginScreen').style.display = 'flex'; });
  await p.waitForTimeout(200);
  check((await p.evaluate(() => getComputedStyle(document.getElementById('loginScreen')).backgroundImage)).includes('rgb(246, 211, 220)'), 'inicio de sesión en rosa claro');
  await h.captura('paleta-c-login.png');
  await p.evaluate(() => { document.getElementById('loginScreen').style.display = 'none'; document.getElementById('appShell').classList.add('active'); });

  h.paso('3. Nombre del diploma de gira en mayúsculas con Barlow');
  const servir = (archivo, tipo) => r => r.fulfill({ status:200, contentType:tipo, headers:{ 'Access-Control-Allow-Origin':'*' }, body:fs.readFileSync(archivo) });
  await p.route('https://prueba.local/**', r => r.fulfill({ status:404, body:'' }));
  await p.route(/cdn\.jsdelivr\.net\/npm\/pdf-lib@/, servir(path.join(VENDOR, 'pdf-lib.min.js'), 'application/javascript'));
  await p.route(/cdn\.jsdelivr\.net\/npm\/@pdf-lib\/fontkit@/, servir(path.join(VENDOR, 'fontkit.umd.min.js'), 'application/javascript'));
  await p.route('https://prueba.local/diploma-gira.jpg', servir(path.join(CERTS, 'diploma-gira.jpg'), 'image/jpeg'));
  await p.route('https://prueba.local/barlow.ttf', servir(path.join(CERTS, 'BarlowSemiCondensed-SemiBold.ttf'), 'font/ttf'));
  check(fs.existsSync(path.join(CERTS, 'OFL-Barlow.txt')), 'la licencia de la letra va junto a ella');
  const r = await p.evaluate(async () => {
    CERT_FUENTES.barlow = 'https://prueba.local/barlow.ttf';
    // Se anota qué letras propias se incrustan (el PDF las guarda comprimidas, no se pueden buscar como texto).
    await cargarPdfLib();
    const incrustadas = [], original = PDFLib.PDFDocument.prototype.embedFont;
    PDFLib.PDFDocument.prototype.embedFont = function(f, o){ if(f instanceof Uint8Array) incrustadas.push(window.fontkit.create(f).postscriptName); return original.call(this, f, o); };
    const campo = { x:386, y:388.5, tam:40, alto:83, ancho:232, clave:'nombre', color:'#774228', texto:'{nombre}', fuente:'barlow', mayusculas:true,
                    alinear:'centro', tam_min:14, renglones:3, interlineado:1.05 };
    const pl = { ancho:595.5, alto:842.25, fondo_url:'https://prueba.local/diploma-gira.jpg', campos:[campo] };
    const bytes = await armarPdfCertificado(pl, { nombre:'María Fernanda López de la Garza' });
    let error = null;
    try{ await armarPdfCertificado(pl, { nombre:'Begoña Müller' }); }catch(e){ error = e.message; }
    PDFLib.PDFDocument.prototype.embedFont = original;
    return { tam:bytes.length, incrustadas,
             renglones:renglonesNombre(textoCert('María Fernanda López de la Garza', campo), 3), sinMayus:textoCert('Ana', { }), error };
  });
  check(r.incrustadas[0] === 'BarlowSemiCondensed-SemiBold', 'el nombre lleva la letra Barlow Semi Condensed (' + r.incrustadas.join(', ') + ')');
  check(JSON.stringify(r.renglones) === JSON.stringify(['MARÍA FERNANDA', 'LÓPEZ', 'DE LA GARZA']), 'mayúsculas con acentos y "de la" junto a su apellido (' + r.renglones.join(' / ') + ')');
  check(r.sinMayus === 'Ana', 'los demás datos no se pasan a mayúsculas');
  check(r.error === null, 'tiene ñ y diéresis (' + r.error + ')');
  check(r.tam < 1.2e6, `el PDF pesa ${Math.round(r.tam / 1024)} KB`);

  await h.terminar();
})();
