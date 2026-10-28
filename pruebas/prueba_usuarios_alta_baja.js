/* Usuarios (28 oct 2026): los administradores crean usuarios (contraseña temporal que se ve una sola vez, con el
   mensaje para WhatsApp), los dan de baja (sin borrar nada) y les dan contraseña nueva; solo quien recibe los tickets
   (Enoc) hace administradores, da "Recibe tickets" o toca la cuenta de un administrador. La gente nueva ve la
   bienvenida de su rol (no las actualizaciones de antes de su alta), Glamy se presenta al terminarla y el Reporte
   del día dice quién no la termina. La función "usuarios" se simula con window.__usr. Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const ANTES = '2026-01-01T10:00:00Z';
const USUARIOS = [
  { id:'u1', nombre:'Jefe Prueba', rol:'Sistemas', email:'jefe@ejemplo.com', es_admin:true, recibe_pedidos:true, activo:true, creado_en:ANTES },
  { id:'u2', nombre:'Admin Dos', rol:'Gerente', email:'admin2@ejemplo.com', es_admin:true, activo:true, creado_en:ANTES },
  { id:'u3', nombre:'Vendedora Prueba', rol:'Ventas', email:'vende@ejemplo.com', es_vendedor:true, activo:true, creado_en:ANTES },
  { id:'u4', nombre:'Se Fue Prueba', rol:'Ventas', email:'sefue@ejemplo.com', activo:false, baja_en:'2026-10-01T10:00:00Z', baja_por:'u1', creado_en:ANTES },
];
const BIENV = { id:'b1', version:'bienvenida-ventas', titulo:'Bienvenida al Hub · Ventas', tipo:'bienvenida', rol:'Ventas', publicada:true, creado_en:'2026-10-28T09:00:00Z',
  contenido:{ secciones:[{ titulo:'Tu trabajo', puntos:['**Alumnos y Leads**: tus leads.'] }] },
  preguntas:[{ pregunta:'¿Dónde registras un pago?', opciones:['En mi WhatsApp', 'En su lead: Registrar pago'], correcta:1, bien:'Correcto.', mal:'Va en su lead.' }] };
const NOV_VIEJA = { id:'n1', version:'2026-10-27-fase1', titulo:'Actualización de antes', tipo:'novedad', publicada:true, creado_en:'2026-09-01T10:00:00Z',
  contenido:{ secciones:[{ titulo:'Qué cambió', texto:'Algo.' }] }, preguntas:[] };

(async () => {
  const jefe = { ...USUARIOS[0] };
  const h = await abrirHub({ tablas:{ usuarios:USUARIOS.map(u => ({ ...u })), permisos_rol:[{ rol:'Ventas', seccion_id:'board' }, { rol:'Cobranza', seccion_id:'cobranza' }],
      permisos_accion:[], hub_novedades:[NOV_VIEJA, BIENV], hub_novedades_leidas:[], vigilante_resultados:[], hub_pedidos:[], glamy_comentarios:[], glamy_uso:[],
      sesiones_usuario:[], actividad_usuario:[] },
    usuario:jefe, equipo:USUARIOS.map(u => ({ ...u })) });
  const { p, check } = h;
  await p.evaluate(() => {
    window.__llamadas = [];
    window.__usr = body => body.accion === 'crear' ? { ok:true, usuario_id:'u9', nombre:body.nombre, email:body.email, password:'Glam-AB2C-D3EF' }
      : body.accion === 'baja' ? { ok:true, nombre:'x' } : { ok:true, nombre:'Vendedora Prueba', email:'vende@ejemplo.com', password:'Glam-ZZ99-YY88' };
    Object.defineProperty(sb, 'functions', { value:{ invoke: async (nombre, { body }) => { window.__llamadas.push({ nombre, body:JSON.parse(JSON.stringify(body)) });
      const r = window.__usr(body); return r.error ? { data:null, error:{ message:'non-2xx', context:{ json: async () => r } } } : { data:r, error:null }; } } });
    usr.tab = 'personas'; setActiveSection('usuarios'); return renderUsuariosPermisos();
  });
  await p.waitForTimeout(400);
  const lista = () => p.textContent('#usrPersonas');
  const si = async () => { await p.waitForSelector('#modalConfirmar.open'); await p.click('#confirmarSi'); await p.waitForTimeout(300); };

  h.paso('1. Lista: activos primero, los de baja al final y sin contarlos');
  let t = await lista();
  check(t.includes('3 personas') && t.includes('De baja 1'), 'cuenta solo a los activos y dice cuántos de baja');
  const orden = await p.$$eval('[data-usr-persona]', xs => xs.map(x => x.dataset.usrPersona));
  check(orden[orden.length - 1] === 'u4', 'el dado de baja va al final');
  check(await p.isVisible('#usrNuevo'), 'botón "Nuevo usuario"');
  await h.captura('usuarios-alta-lista.png');

  h.paso('2. Nuevo usuario (Enoc ve Administrador y Recibe tickets)');
  await p.click('#usrNuevo');
  await p.waitForSelector('#modalUsuario.open');
  check(await p.isVisible('#usrNAdmin') && await p.isVisible('#usrNTickets'), 'quien recibe los tickets puede hacer administradores');
  await p.click('#usrNCrear');
  check((await p.textContent('#usrNError')).includes('nombre'), 'pide el nombre');
  await p.fill('#usrNNombre', '  Nueva   Prueba ');
  await p.fill('#usrNEmail', 'VENDE@ejemplo.com');
  await p.click('#usrNCrear');
  check((await p.textContent('#usrNError')).includes('Vendedora Prueba'), 'avisa si el correo ya es de alguien');
  await p.fill('#usrNEmail', 'Nueva@Ejemplo.com');
  await p.selectOption('#usrNRol', 'Ventas');
  await p.check('#usrNVende');
  await p.click('#usrNCrear');
  await p.waitForSelector('#usrClave');
  const ll = await p.evaluate(() => window.__llamadas.at(-1));
  check(ll.nombre === 'usuarios' && ll.body.accion === 'crear' && ll.body.nombre === 'Nueva Prueba' && ll.body.email === 'nueva@ejemplo.com'
    && ll.body.rol === 'Ventas' && ll.body.es_vendedor === true && ll.body.es_admin === false, 'llama a la función con sus datos (correo en minúsculas)');
  check((await p.textContent('#usrClave')) === 'Glam-AB2C-D3EF', 'muestra la contraseña temporal');
  const msj = await p.textContent('#usrMsj');
  check(msj.includes('Hola Nueva') && msj.includes('nueva@ejemplo.com') && msj.includes('Glam-AB2C-D3EF') && msj.includes('Glamy'), 'con el mensaje para WhatsApp');
  check(await p.evaluate(() => EQUIPO.some(u => u.id === 'u9' && u.es_vendedor) && VENDEDORES.some(u => u.id === 'u9')), 'ya sale como vendedora en el Hub');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'usuario_creado'), 'queda en la actividad');
  await h.captura('usuarios-alta-nuevo.png');
  await p.click('#closeModalUsuario');

  h.paso('3. Dar de baja (no se borra nada)');
  await p.click('[data-usr-editar="u3"]');
  await p.click('[data-usr-persona="u3"] [data-usr-accion="baja"]');
  check((await p.textContent('#confirmarAviso')).includes('No se borra nada'), 'avisa que no se borra nada');
  await si();
  check((await p.evaluate(() => window.__llamadas.at(-1).body)).accion === 'baja', 'llama a la función: baja');
  check(await p.evaluate(() => !VENDEDORES.some(u => u.id === 'u3') && EQUIPO.find(u => u.id === 'u3').activo === false), 'deja de salir como vendedora');
  check((await p.textContent('[data-usr-persona="u3"]')).includes('De baja'), 'su renglón dice "De baja"');
  check(await p.isVisible('[data-usr-persona="u3"] [data-usr-accion="reactivar"]'), 'y tiene "Reactivar"');
  check(await p.evaluate(() => { pintarSelectorPara(); return ![...document.querySelectorAll('#notaParaSelect option')].some(o => o.value === 'u3'); }), 'ya no se le pueden asignar tareas');

  h.paso('4. Reactivar y contraseña nueva');
  await p.click('[data-usr-persona="u3"] [data-usr-accion="reactivar"]');
  await p.waitForSelector('#usrClave');
  check((await p.evaluate(() => window.__llamadas.at(-1).body)).accion === 'reactivar' && (await p.textContent('#usrClave')) === 'Glam-ZZ99-YY88', 'reactivar le da contraseña temporal');
  check(!(await p.textContent('#usrMsj')).includes('bienvenida'), 'el mensaje es el de contraseña nueva');
  await p.click('#closeModalUsuario');
  await p.click('[data-usr-persona="u3"] [data-usr-accion="contrasena"]');
  await si();
  await p.waitForSelector('#modalUsuario.open');
  check((await p.evaluate(() => window.__llamadas.at(-1).body)).accion === 'contrasena', 'nueva contraseña temporal');
  check((await p.textContent('[data-usr-persona="u3"]')).includes('Todavía no entra'), 'queda "Todavía no entra" hasta que ponga la suya');
  await p.click('#closeModalUsuario');

  h.paso('5. Un error de la función se ve tal cual');
  await p.evaluate(() => { window.__usr = () => ({ error:'A un administrador solo lo puede cambiar quien recibe los tickets.' }); });
  await p.click('[data-usr-persona="u3"] [data-usr-accion="contrasena"]');
  await si();
  await p.waitForTimeout(300);
  check((await p.textContent('#toast')).includes('solo lo puede cambiar'), 'muestra el motivo');

  h.paso('6. Otro administrador: no hace administradores ni toca a otro admin');
  await p.evaluate(() => { usuarioActual = { ...usuarioActual, id:'u2', nombre:'Admin Dos', recibe_pedidos:false }; usr.abierto = 'u3'; usrPintarPersonas(); });
  check(await p.$eval('[data-usr-persona="u3"] [data-usr-campo="es_admin"]', x => x.disabled) && await p.$eval('[data-usr-persona="u3"] [data-usr-campo="recibe_pedidos"]', x => x.disabled), 'los switches de admin y tickets, bloqueados');
  check((await p.textContent('[data-usr-persona="u3"]')).includes('Solo Jefe Prueba puede cambiarlo'), 'dice quién puede');
  check(!(await p.$eval('[data-usr-persona="u3"] [data-usr-accion="baja"]', x => x.disabled)), 'a una vendedora sí la puede dar de baja');
  await p.evaluate(() => { usr.abierto = 'u1'; usrPintarPersonas(); });
  check(await p.$eval('[data-usr-persona="u1"] [data-usr-accion="baja"]', x => x.disabled) && (await p.textContent('[data-usr-persona="u1"]')).includes('solo lo cambia Jefe Prueba'), 'a un administrador no');
  await p.evaluate(() => { usr.abierto = 'u2'; usrPintarPersonas(); });
  check(await p.$eval('[data-usr-persona="u2"] [data-usr-accion="contrasena"]', x => x.disabled), 'ni a sí mismo');
  await p.click('#usrNuevo');
  check(!(await p.isVisible('#usrNAdmin')) && (await p.textContent('#usrModalCuerpo')).includes('pídeselo a Jefe Prueba'), 'el alta no ofrece hacerlo administrador');
  await p.click('#closeModalUsuario');

  h.paso('7. Dado de baja: no entra');
  await p.evaluate(() => { window.__salio = false; sb.auth.signOut = async () => { window.__salio = true; return { error:null }; };
    window.__tablas.usuarios.find(u => u.id === 'u4').email = 'sefue@ejemplo.com'; return onLogin({ user:{ email:'sefue@ejemplo.com' } }); });
  await p.waitForTimeout(300);
  check(await p.evaluate(() => window.__salio) && (await p.textContent('#loginError')).includes('dado de baja'), 'cierra la sesión y dice por qué');
  await p.evaluate(() => { document.getElementById('loginScreen').style.display = 'none'; document.getElementById('appShell').classList.add('active'); document.getElementById('loginError').className = 'login-error'; });

  h.paso('8. Alguien nuevo: su bienvenida, no las actualizaciones de antes');
  await p.evaluate(() => {
    usuarioActual = { id:'u9', nombre:'Nueva Prueba', rol:'Ventas', es_admin:false, activo:true, bienvenida_pendiente:true, creado_en:'2026-10-28T12:00:00Z' };
    window.__rpc.novedad_leida = a => { window.__tablas.hub_novedades_leidas.push({ novedad_id:a.p_novedad, usuario_id:'u9', leida_en:new Date().toISOString(), errores:a.p_errores }); return null; };
    try{ sessionStorage.clear(); }catch(_){}
    return revisarNovedades();
  });
  await p.waitForSelector('#novedadOverlay.open');
  let tar = await p.textContent('#novTarjeta');
  check(tar.includes('Bienvenida al Hub') && tar.includes('Bienvenida al Hub · Ventas') && tar.includes('Fin de la bienvenida'), 'le sale la bienvenida de su rol');
  await h.captura('usuarios-alta-bienvenida.png');
  await p.click('#novSeguir');
  await p.click('[data-nov-q="0"][data-nov-o="1"]');
  await p.click('#novTerminar');
  await p.waitForSelector('#novCerrar');
  tar = await p.textContent('#novTarjeta');
  check(tar.includes('Bienvenida terminada') && tar.includes('Glamy') && !tar.includes('versión nueva'), 'al terminar: Glamy te espera (y no recarga el Hub)');
  check(await p.evaluate(() => usuarioActual.bienvenida_pendiente === false), 'ya no está pendiente');
  await p.click('#novCerrar');
  await p.waitForTimeout(400);
  check(await p.evaluate(() => document.getElementById('glamyPanel').classList.contains('open') && glamy.mensajes.at(-1).rol === 'assistant'
    && glamy.mensajes.at(-1).texto.includes('Nueva') && glamy.mensajes.at(-1).texto.includes('asistente')), 'Glamy se presenta en el chat');
  check(!(await p.evaluate(() => window.__llamadas.some(l => l.nombre === 'glamy'))), 'sin gastar una pregunta');
  await h.captura('usuarios-alta-glamy.png');
  await p.evaluate(() => cerrarGlamy());
  await p.evaluate(() => revisarNovedades());
  await p.waitForTimeout(400);
  check(!(await p.evaluate(() => document.getElementById('novedadOverlay').classList.contains('open'))), 'la actualización de antes de su alta no le sale');

  h.paso('9. Quien ya estaba sí ve la actualización (y no la bienvenida)');
  await p.evaluate(() => { usuarioActual = { id:'u3', nombre:'Vendedora Prueba', rol:'Ventas', activo:true, bienvenida_pendiente:false, creado_en:'2026-01-01T10:00:00Z' }; return revisarNovedades(); });
  await p.waitForSelector('#novedadOverlay.open');
  check((await p.textContent('#novTarjeta')).includes('Actualización de antes'), 'le sale la actualización');
  await p.evaluate(() => { document.getElementById('novedadOverlay').classList.remove('open'); document.body.style.overflow = ''; nov.actual = null; });

  h.paso('10. Reporte del día y Actividad: gente nueva y quién falta');
  await p.evaluate(j => { usuarioActual = j;
    window.__tablas.usuarios.push(
      { id:'u9', nombre:'Nueva Prueba', rol:'Ventas', activo:true, bienvenida_pendiente:true, creado_en:new Date(Date.now() - 2 * 864e5).toISOString() },
      { id:'u10', nombre:'Nueva Cobranza', rol:'Cobranza', activo:true, bienvenida_pendiente:true, creado_en:new Date().toISOString() });
    return renderReporteDia(); }, jefe);
  await p.waitForTimeout(400);
  const rep = await p.textContent('#reporteDia');
  check(rep.includes('Gente nueva') && rep.includes('Nueva Prueba todavía no termina su bienvenida') && rep.includes('hace 2 días'), 'el reporte dice quién no termina su bienvenida');
  check(rep.includes('Nueva Cobranza') && rep.includes('su rol no tiene bienvenida publicada'), 'y si su rol no tiene bienvenida publicada');
  const falta = (rep.split('Falta leerla')[1] || '').split('Gente nueva')[0];
  check(falta.includes('Admin Dos') && !falta.includes('Nueva Prueba') && !falta.includes('Se Fue Prueba'), 'falta leer la actualización: ni los nuevos ni los de baja');
  await h.captura('usuarios-alta-reporte.png');
  await p.evaluate(() => pintarNovedadesActividad());
  await p.waitForTimeout(300);
  const act = await p.textContent('#actividadNovedades');
  check(act.includes('Bienvenidas por rol') && act.includes('1 de 1 publicadas') && act.includes('Actualización de antes'), 'Actividad: las bienvenidas aparte, con "Ver cómo se ve"');
  check(/0 de 3 la leyeron/.test(act) && /Falta leerla.*Admin Dos/.test(act) && !/Falta leerla[^·]*Nueva Prueba/.test(act), 'Actividad cuenta a los mismos que el reporte (activos que ya estaban)');

  h.paso('11. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.evaluate(() => { setActiveSection('usuarios'); usr.abierto = 'u3'; usrPintarPersonas(); });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('usuarios-alta-celular.png');
  await p.evaluate(() => usrMostrarClave({ nombre:'Nueva Prueba', email:'nueva@ejemplo.com', password:'Glam-AB2C-D3EF' }, 'Listo: Nueva Prueba ya tiene usuario', true));
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'la contraseña y el mensaje caben');
  await h.captura('usuarios-alta-nuevo-celular.png');

  await h.terminar();
})();
