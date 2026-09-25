/* =========================================================
   ARNÉS DE PRUEBAS DEL HUB
   Abre hub/index.html en Chromium con las librerías locales (vendor/),
   sin tocar Supabase: sb.from se cambia por una base en memoria.

   Uso en una prueba:
     const { abrirHub, reporte } = require('./arnes');
     const h = await abrirHub({ tablas: { inscripciones: [ ... ] } });
     await h.p.click(...);
     h.check(condicion, 'qué se esperaba');
     await h.terminar();   // imprime "nombre: ok/total" y cierra
   ========================================================= */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const PAGINA = path.join(__dirname, 'prueba.html');
const CAPTURAS = path.join(__dirname, 'capturas');

/* La página de prueba es el Hub con los CDN cambiados por las copias locales. */
function generarPagina(){
  const html = fs.readFileSync(path.join(RAIZ, 'hub', 'index.html'), 'utf8')
    .replace('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', 'vendor/supabase.js')
    .replace('https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js', 'vendor/chart.js');
  fs.writeFileSync(PAGINA, html);
}

/* Usuario y catálogos de ejemplo (sin datos reales). */
const EQUIPO_EJEMPLO = [
  { id:'u1', nombre:'Recepción Prueba', es_vendedor:true, rol:'Logística' },
  { id:'u2', nombre:'Vendedora Prueba', es_vendedor:true, rol:'Ventas' },
];
const ESTATUS_EJEMPLO = [
  { id:1,  clave:'pago_por_confirmar', etiqueta:'Pago por confirmar' },
  { id:2,  clave:'no_vence_pago',      etiqueta:'Aún no vence su pago' },
  { id:6,  clave:'no_va_al_curso',     etiqueta:'No va a ir al curso', es_final:true },
  { id:11, clave:'anticipo_vigente',   etiqueta:'Fecha de anticipo vigente' },
  { id:12, clave:'pagado',             etiqueta:'Pagó el curso', es_final:true },
  { id:14, clave:'no_llego',           etiqueta:'No llegó al curso', es_final:true },
  { id:15, clave:'perdio_anticipo',    etiqueta:'Perdió anticipo', es_final:true },
];

/* Base en memoria que imita a PostgREST lo suficiente para las pruebas:
   select con eq, insert, update y delete sobre filas guardadas por tabla.
   Cada operación queda en window.__ops para revisarla después. */
function instalarStub({ tablas, usuario, equipo, estatus, permisosAccion }){
  window.__tablas = tablas;
  window.__ops = [];
  window.__fallar = null;   // (op) => true para simular un error de la base
  let siguienteId = 1;
  const copia = x => JSON.parse(JSON.stringify(x));
  sb.from = (tabla) => {
    const op = { tabla, tipo:'select', datos:null, filtros:[], single:false };
    let px;
    const q = {
      select(){ return px; },
      insert(d){ op.tipo = 'insert'; op.datos = d; return px; },
      update(d){ op.tipo = 'update'; op.datos = d; return px; },
      upsert(d){ op.tipo = 'insert'; op.datos = d; return px; },
      delete(){ op.tipo = 'delete'; return px; },
      eq(c, v){ op.filtros.push([c, v]); return px; },
      in(c, vals){ op.filtros.push([c, vals, 'in']); return px; },
      not(c, oper, v){
        if(oper === 'in') op.filtros.push([c, String(v).replace(/[()]/g, '').split(',').map(x => isNaN(x) ? x : Number(x)), 'notin']);
        return px;
      },
      single(){ op.single = true; return px; },
      maybeSingle(){ op.single = true; return px; },
      then(res, rej){
        window.__ops.push(copia(op));
        if(window.__fallar && window.__fallar(op))
          return Promise.resolve({ data:null, error:{ message:'falla simulada' } }).then(res, rej);
        const filas = (window.__tablas[tabla] = window.__tablas[tabla] || []);
        // "eventos.curso_id" busca dentro de la fila anidada, como el filtro de PostgREST.
        const valor = (f, c) => c.split('.').reduce((o, k) => (o == null ? undefined : o[k]), f);
        const cumple = f => op.filtros.every(([c, v, modo]) =>
          modo === 'in' ? v.includes(valor(f, c)) : modo === 'notin' ? !v.includes(valor(f, c)) : valor(f, c) === v);
        let data = null;
        if(op.tipo === 'select'){
          const r = filas.filter(cumple);
          data = op.single ? (r[0] ? copia(r[0]) : null) : copia(r);
        } else if(op.tipo === 'insert'){
          const nuevas = (Array.isArray(op.datos) ? op.datos : [op.datos]).map(d => ({ id:'n' + (siguienteId++), ...d }));
          filas.push(...nuevas);
          data = op.single ? copia(nuevas[0]) : copia(nuevas);
        } else if(op.tipo === 'update'){
          const r = filas.filter(cumple); r.forEach(f => Object.assign(f, op.datos));
          data = op.single ? (r[0] ? copia(r[0]) : null) : copia(r);
        } else if(op.tipo === 'delete'){
          window.__tablas[tabla] = filas.filter(f => !cumple(f));
          data = [];
        }
        return Promise.resolve({ data, error:null, count: Array.isArray(data) ? data.length : 0 }).then(res, rej);
      },
    };
    // Cualquier otro filtro (in, order, limit, ilike…) se acepta y no filtra.
    px = new Proxy(q, { get:(t, k) => (k in t ? t[k] : () => px) });
    return px;
  };
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').classList.add('active');
  EQUIPO = equipo;
  VENDEDORES = EQUIPO.filter(u => u.es_vendedor);
  ESTATUS = estatus;
  usuarioActual = usuario;
  asesorActualId = usuario.id;
  PERMISOS_ACCION_CACHE = permisosAccion;
}

async function abrirHub({
  nombre = path.basename(require.main.filename, '.js'),
  ancho = 1200, alto = 900, tablas = {},
  usuario = { id:'u1', nombre:'Recepción Prueba', rol:'Logística', es_admin:false },
  equipo = EQUIPO_EJEMPLO, estatus = ESTATUS_EJEMPLO, permisosAccion = {},
} = {}){
  generarPagina();
  fs.mkdirSync(CAPTURAS, { recursive:true });
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' })
    .catch(() => chromium.launch());
  const p = await b.newPage({ viewport:{ width:ancho, height:alto } });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  await p.route(/supabase\.co/, r => r.abort());   // nada sale a la base real
  await p.goto('file://' + PAGINA);
  await p.waitForTimeout(300);
  await p.evaluate(instalarStub, { tablas, usuario, equipo, estatus, permisosAccion });

  let ok = 0, mal = 0;
  const h = {
    p, errores,
    check(cond, msg){ if(cond) ok++; else { mal++; console.log('  ✗', msg); } },
    paso(t){ console.log(t); },
    /* Operaciones registradas: h.ops('pagos', 'insert') → lista de datos enviados */
    ops: (tabla, tipo) => p.evaluate(([t, ti]) => window.__ops.filter(o => o.tabla === t && o.tipo === ti).map(o => o.datos), [tabla, tipo]),
    limpiarOps: () => p.evaluate(() => { window.__ops = []; }),
    filas: tabla => p.evaluate(t => window.__tablas[t] || [], tabla),
    fallar: fn => p.evaluate(src => { window.__fallar = src ? new Function('op', 'return (' + src + ')(op)') : null; }, fn ? fn.toString() : null),
    captura: archivo => p.screenshot({ path: path.join(CAPTURAS, archivo) }),
    async terminar(){
      h.check(errores.length === 0, 'sin errores de JS: ' + errores.join(' | '));
      console.log(`\n${nombre}: ${ok}/${ok + mal}`);
      await b.close();
      process.exitCode = mal ? 1 : 0;
      return { ok, mal };
    },
  };
  return h;
}

module.exports = { abrirHub, generarPagina, EQUIPO_EJEMPLO, ESTATUS_EJEMPLO };
