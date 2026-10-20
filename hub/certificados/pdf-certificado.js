/* =========================================================
   ARMADO DEL CERTIFICADO / DIPLOMA EN PDF (pdf-lib, en el navegador).
   Lo usan el Hub (Academia → Certificados) y la página de diplomas
   (certificados.glamreposteria.com), para que el diploma salga idéntico
   en los dos lados. Si se cambia aquí, se cambia en ambos.
   ========================================================= */
const PDFLIB_URL = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const FONTKIT_URL = 'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js';
/* Letras propias de las plantillas (campo.fuente). Se cargan solo si la plantilla las usa y van
   completas dentro del PDF: la licencia de Nickainley no permite modificar (recortar) la letra.
   barlow: Barlow Semi Condensed SemiBold (licencia OFL), la del nombre del diploma de gira desde oct 2026. */
let CERT_FUENTES = {
  manuscrita: '/certificados/GreatVibes-Regular.ttf',
  nickainley: '/certificados/Nickainley-Normal.ttf',
  baskerville_italica: '/certificados/LibreBaskerville-Italic.ttf',
  barlow: '/certificados/BarlowSemiCondensed-SemiBold.ttf',
};
const CERT_FUENTE_CSS = { manuscrita:"'Great Vibes',cursive", nickainley:"'Nickainley',cursive", baskerville_italica:"'Libre Baskerville Cert',serif",
                          barlow:"'Barlow Cert',sans-serif" };
/* Un dato con "mayusculas": true se imprime en mayúsculas (el nombre del diploma de gira). */
function textoCert(texto, c){ return c?.mayusculas ? String(texto || '').toLocaleUpperCase('es-MX') : texto; }
function mesCert(iso){ return iso ? `${new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { month:'long' })} ${iso.slice(0, 4)}` : ''; }
const CERT_BYTES = {};
/* Los fondos y las letras viven en el Hub (/certificados/…). La página de diplomas está en otro
   dominio: ahí CERT_BASE = 'https://hub.glamreposteria.com' (el Hub los sirve con CORS). */
let CERT_BASE = '';
function urlCert(ruta){ return /^(https?:|blob:|data:)/.test(ruta || '') ? ruta : CERT_BASE + ruta; }

function cargarScript(src){
  return new Promise((ok, mal)=>{ const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ()=>mal(new Error('No se pudo cargar ' + src)); document.head.appendChild(s); });
}
async function cargarPdfLib(){
  if(!window.PDFLib) await cargarScript(PDFLIB_URL);
  if(!window.fontkit) await cargarScript(FONTKIT_URL);
}
async function bytesDe(ruta){
  const url = urlCert(ruta);
  if(!CERT_BYTES[url]){
    const r = await fetch(url);
    if(!r.ok) throw new Error(`No se pudo bajar ${url} (${r.status})`);
    CERT_BYTES[url] = new Uint8Array(await r.arrayBuffer());
  }
  return CERT_BYTES[url];
}
function fechaLargaCert(iso){ return iso ? new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' }) : ''; }
/* Un dato se imprime solo si todo lo que pide tiene valor ("Matrícula {matricula}" sin matrícula no sale). */
function rellenarCampo(texto, v){
  let falta = false;
  const t = String(texto || '').replace(/\{(\w+)\}/g, (_, k)=>{ const x = v[k]; if(x == null || String(x).trim() === '') falta = true; return x ?? ''; });
  return falta ? '' : t.trim();
}
function rgbHex(hex){
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '') || [0, '11', '11', '11'];
  return PDFLib.rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255);
}
/* Nombre como se imprime: palabras con mayúscula, "de", "la", "del"… en minúscula. */
const CERT_PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'di', 'van', 'von']);
function nombreDiploma(s){
  return String(s || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
    .map((w, i)=>i > 0 && CERT_PARTICULAS.has(w) ? w : w.replace(/(^|-)(\p{L})/gu, (m, a, b)=>a + b.toUpperCase())).join(' ');
}
/* Renglones del nombre: nombre(s) / apellido paterno / apellido materno.
   "de la Cruz" o "de los Santos" van juntos (la partícula se pega a la palabra que sigue). */
function renglonesNombre(nombre, max = 3){
  const bloques = []; let pend = [];
  for(const w of String(nombre || '').trim().split(/\s+/).filter(Boolean)){
    pend.push(w);
    if(!CERT_PARTICULAS.has(w.toLowerCase())){ bloques.push(pend.join(' ')); pend = []; }
  }
  if(pend.length){ if(bloques.length) bloques[bloques.length - 1] += ' ' + pend.join(' '); else bloques.push(pend.join(' ')); }
  if(bloques.length <= max) return bloques;
  return [bloques.slice(0, bloques.length - max + 1).join(' '), ...bloques.slice(bloques.length - max + 1)];
}
/* Un dato en varios renglones (el nombre del diploma): se mide la tinta real de cada renglón para
   centrarlo en su caja (c.x, c.y = centro; c.ancho × c.alto) sin tocar las líneas del fondo.
   Regresa { tam, lineas:[{ texto, x, base }] } con base = línea base medida desde arriba. */
function acomodarBloqueCert(f, k, texto, c){
  const lineas = renglonesNombre(texto, c.renglones);
  const m = lineas.map(t=>{
    if(!k){ const w = f.widthOfTextAtSize(t, 1), alto = f.heightAtSize(1, { descender:false }); return { x0:0, x1:w, arriba:alto, abajo:alto - f.heightAtSize(1) }; }
    const b = k.layout(t).bbox, u = k.unitsPerEm;
    return { x0:b.minX / u, x1:b.maxX / u, arriba:b.maxY / u, abajo:b.minY / u };
  });
  const paso = Number(c.interlineado) || 1.05, n = lineas.length;
  const altoT = m[0].arriba + (n - 1) * paso - m[n - 1].abajo;
  const anchoT = Math.max(...m.map(x=>x.x1 - x.x0));
  const tam = Math.min(Number(c.tam) || 40, c.ancho / anchoT, c.alto / altoT);
  // Antes que un diploma con letra diminuta, se detiene y pide acortar el nombre.
  if(tam < (Number(c.tam_min) || 12)) throw new Error('El nombre es demasiado largo para el diploma. Acórtalo en “Nombre como se imprime”.');
  const arriba = c.y - altoT * tam / 2;
  return { tam, lineas:lineas.map((t, i)=>({ texto:t, x:c.x - (m[i].x0 + m[i].x1) / 2 * tam, base:arriba + m[0].arriba * tam + i * paso * tam })) };
}
function dibujarBloqueCert(pag, f, k, texto, c, H, color){
  const { tam, lineas } = acomodarBloqueCert(f, k, texto, c);
  lineas.forEach(l=>pag.drawText(l.texto, { x:l.x, y:H - l.base, size:tam, font:f, color }));
}
/* Arma el PDF. Tamaño de hoja de la plantilla (por defecto carta horizontal, 792 × 612 pt).
   La posición "y" de cada dato es el centro del renglón, desde arriba. */
async function armarPdfCertificado(pl, valores){
  await cargarPdfLib();
  const { PDFDocument, StandardFonts, pushGraphicsState, popGraphicsState, setCharacterSpacing } = PDFLib;
  const W = Number(pl.ancho) || 792, H = Number(pl.alto) || 612;
  const doc = await PDFDocument.create();
  doc.registerFontkit(window.fontkit);
  doc.setTitle(`Certificado ${valores.nombre || ''}`.trim());
  const pag = doc.addPage([W, H]);
  const fondo = await bytesDe(pl.fondo_url);
  const esPng = fondo[0] === 0x89 && fondo[1] === 0x50;
  const img = esPng ? await doc.embedPng(fondo) : await doc.embedJpg(fondo);
  pag.drawImage(img, { x:0, y:0, width:W, height:H });
  const fuentes = { normal: await doc.embedFont(StandardFonts.Helvetica), negrita: await doc.embedFont(StandardFonts.HelveticaBold) };
  const medidas = {};   // fontkit de cada letra propia: para medir la tinta y revisar que tenga cada letra
  for(const clave of new Set((pl.campos || []).map(c=>c.fuente))){
    if(!CERT_FUENTES[clave]) continue;
    const bytes = await bytesDe(CERT_FUENTES[clave]);
    fuentes[clave] = await doc.embedFont(bytes, { subset:false });
    medidas[clave] = window.fontkit.create(bytes);
  }
  for(const c of pl.campos || []){
    const texto = textoCert(rellenarCampo(c.texto, valores), c); if(!texto) continue;
    const f = fuentes[c.fuente] || fuentes.normal, k = medidas[c.fuente];
    if(k){
      const faltan = [...new Set([...texto].filter(ch=>ch.trim() && !k.hasGlyphForCodePoint(ch.codePointAt(0))))];
      if(faltan.length) throw new Error(`La letra del certificado no tiene “${faltan.join(' ')}”. Corrige el texto antes de generar.`);
    }
    const color = rgbHex(c.color);
    if(c.renglones){ dibujarBloqueCert(pag, f, k, texto, c, H, color); continue; }
    let tam = Number(c.tam) || 12;
    const esp = Number(c.espaciado) || 0, nLetras = [...texto].length;
    // Ancho a centrar: el de la tinta (si se pide y hay medidas) o el del avance normal.
    const medir = t=>{
      if(k && c.centrar_tinta){ const b = k.layout(texto).bbox, u = k.unitsPerEm; return { x0:b.minX / u * t, ancho:(b.maxX - b.minX) / u * t + esp * (nLetras - 1) }; }
      return { x0:0, ancho:f.widthOfTextAtSize(texto, t) + esp * (nLetras - 1) };
    };
    let { x0, ancho } = medir(tam);
    if(c.ancho_max && ancho > c.ancho_max){ tam = tam * c.ancho_max / ancho; ({ x0, ancho } = medir(tam)); }   // textos largos se achican
    const x = (c.alinear === 'izq' ? c.x : c.alinear === 'der' ? c.x - ancho : c.x - ancho / 2) - x0;
    if(esp) pag.pushOperators(pushGraphicsState(), setCharacterSpacing(esp));
    pag.drawText(texto, { x, y:H - c.y - tam * 0.33, size:tam, font:f, color });
    if(esp) pag.pushOperators(popGraphicsState());
  }
  return await doc.save();
}
