/* Usuarios y permisos, en dos pestañas:
   👥 Personas (rol, admin, vendedora, recibe tickets, ve actividad, "lo que ve") y
   🎭 Roles (secciones por área, acciones especiales, rol nuevo). Datos de ejemplo, sin personas reales. */
const { abrirHub } = require('./arnes');

const persona = (id, nombre, rol, extra) => ({ id, nombre, rol, email:`${id}@ejemplo.com`, es_admin:false, puede_ver_actividad:false,
  es_vendedor:false, recibe_pedidos:false, ...extra });
const USUARIOS = [
  persona('u1', 'Admin Prueba', 'Sistemas', { es_admin:true, recibe_pedidos:true }),
  persona('u2', 'Vendedora Uno', 'Ventas', { es_vendedor:true }),
  persona('u3', 'Vendedora Dos', 'Ventas', { es_vendedor:true }),
  persona('u4', 'Cobranza Prueba', 'Cobranza'),
  persona('u5', '<img src=x onerror="window.__xss=1"> Rara', 'Logística'),
  persona('u6', 'Gerente Prueba', 'Gerente', { es_admin:true }),
];
const PERM_ROL = [['Ventas', 'inicio'], ['Ventas', 'board'], ['Ventas', 'cobranza'], ['Cobranza', 'inicio'], ['Cobranza', 'cobranza'], ['Cobranza', 'calendario']]
  .map(([rol, seccion_id]) => ({ rol, seccion_id }));
const PERM_ACC = [{ rol:'Ventas', accion:'confirmar_pagos' }];

(async () => {
  const h = await abrirHub({ tablas:{ usuarios:USUARIOS, permisos_rol:PERM_ROL, permisos_accion:PERM_ACC },
    usuario:{ id:'u1', nombre:'Admin Prueba', rol:'Sistemas', es_admin:true },
    equipo:USUARIOS.map(u => ({ id:u.id, nombre:u.nombre, rol:u.rol, es_vendedor:u.es_vendedor, es_admin:u.es_admin })) });
  const { p, check } = h;
  await p.evaluate(() => setActiveSection('usuarios'));
  await p.waitForTimeout(400);
  const persona$ = id => `[data-usr-persona="${id}"]`;

  h.paso('1. Personas');
  check(await p.$$eval('.usr-persona', x => x.length) === 6, 'una fila por persona');
  const resumen = await p.textContent('.usr-resumen');
  check(resumen.includes('6 personas') && resumen.includes('2 administradores') && resumen.includes('Ventas 2'), 'resumen: personas, admins y por rol');
  check((await p.textContent(persona$('u2'))).includes('Vendedora') && (await p.textContent(persona$('u1'))).includes('Recibe tickets'), 'etiquetas de vendedora y tickets');
  check(!(await p.evaluate(() => window.__xss)), 'los nombres se escapan');
  await p.fill('#usrBuscar', 'cobranza');
  check(await p.$$eval('.usr-persona', x => x.length) === 1, 'busca por nombre, correo o rol');
  await p.fill('#usrBuscar', '');
  await h.captura('usuarios-personas.png');

  h.paso('2. Editar a una persona');
  await p.click(`${persona$('u4')} [data-usr-editar]`);
  const panel = await p.textContent(`${persona$('u4')} .usr-panel`);
  check(panel.includes('Cobranza') && panel.includes('Calendario') && !panel.includes('Alumnos y Leads'), '"Lo que ve" sale de las secciones de su rol');
  await p.selectOption(`${persona$('u4')} [data-usr-rol]`, 'Ventas');
  await p.waitForTimeout(300);
  let upd = (await h.ops('usuarios', 'update')).pop();
  check(upd && upd.rol === 'Ventas', 'cambia el rol');
  check((await p.textContent(`${persona$('u4')} .usr-panel`)).includes('Confirmar pagos'), 'con el rol nuevo cambia lo que ve (y sus acciones)');
  await p.check(`${persona$('u4')} [data-usr-campo="es_vendedor"]`);
  await p.waitForTimeout(300);
  upd = (await h.ops('usuarios', 'update')).pop();
  check(upd && upd.es_vendedor === true && await p.evaluate(() => VENDEDORES.some(v => v.id === 'u4')), 'marca vendedora y ya sale en las vendedoras del Hub');
  await p.check(`${persona$('u4')} [data-usr-campo="es_admin"]`);
  await p.waitForSelector('#modalConfirmar.open');
  await p.click('#confirmarNo');
  await p.waitForTimeout(200);
  check(!(await p.isChecked(`${persona$('u4')} [data-usr-campo="es_admin"]`)) && (await h.ops('usuarios', 'update')).length === 2, 'hacer admin pide confirmar; cancelar no cambia nada');
  await p.check(`${persona$('u4')} [data-usr-campo="es_admin"]`);
  await p.waitForSelector('#modalConfirmar.open');
  await p.click('#confirmarSi');
  await p.waitForTimeout(300);
  check((await h.ops('usuarios', 'update')).pop()?.es_admin === true && (await p.textContent(`${persona$('u4')} .usr-panel`)).includes('Todo el Hub'), 'confirmado, es admin y ve todo');
  check(await p.isDisabled(`${persona$('u4')} [data-usr-campo="puede_ver_actividad"]`), '"Ve actividad" no se toca si ya es admin');
  const act = await h.ops('actividad_usuario', 'insert');
  check(act.filter(a => a.accion === 'usuario_cambiado').length === 3 && act.some(a => a.detalle.includes('rol: Cobranza → Ventas')), 'cada cambio queda en la actividad');
  await p.click(`${persona$('u1')} [data-usr-editar]`);
  check(await p.isDisabled(`${persona$('u1')} [data-usr-campo="es_admin"]`), 'nadie se quita a sí mismo el administrador');

  h.paso('3. Roles');
  await p.click('[data-usr-tab="roles"]');
  await p.waitForTimeout(200);
  const roles = await p.$$eval('.usr-rol-btn', x => x.map(y => y.textContent.replace(/\s+/g, ' ').trim()));
  check(roles.some(r => r.startsWith('Gerente') && r.includes('ven todo (admins)')) && roles.some(r => r.startsWith('Ventas 3 personas')), 'lista de roles con su gente (' + roles.join(' | ') + ')');
  await p.click('[data-usr-rolsel="Ventas"]');
  const pan = await p.textContent('.usr-rol-panel');
  check(pan.includes('Ventas y cobranza') && pan.includes('Gira') && pan.includes('Academia') && pan.includes('Herramientas') && pan.includes('Acciones especiales'), 'secciones agrupadas por área y acciones');
  check(await p.isChecked('[data-usr-sec="board"]') && !(await p.isChecked('[data-usr-sec="giras"]')) && await p.isChecked('[data-usr-acc="confirmar_pagos"]'), 'marca lo que el rol ya tiene');
  check(await p.isDisabled('[data-usr-sec="inicio"]'), 'Inicio siempre queda');
  await p.check('[data-usr-sec="giras"]');
  await p.waitForTimeout(300);
  check((await h.ops('permisos_rol', 'insert')).pop()?.seccion_id === 'giras', 'marcar una sección la guarda');
  await p.uncheck('[data-usr-sec="cobranza"]');
  await p.waitForTimeout(300);
  check((await h.filas('permisos_rol')).every(x => !(x.rol === 'Ventas' && x.seccion_id === 'cobranza')), 'desmarcar la quita');
  await p.check('[data-usr-acc="cobrar_academia"]');
  await p.waitForTimeout(300);
  check((await h.ops('permisos_accion', 'insert')).pop()?.accion === 'cobrar_academia', 'acciones especiales por rol');
  check((await h.ops('actividad_usuario', 'insert')).filter(a => a.accion === 'permiso_cambiado').length === 3, 'cada permiso queda en la actividad');

  h.paso('4. Rol sin configurar y rol nuevo');
  await p.click('[data-usr-rolsel="Logística"]');
  check((await p.textContent('.usr-rol-panel')).includes('todavía no se ha configurado'), 'avisa que un rol sin configurar ve lo de fábrica');
  const antes = (await h.filas('permisos_rol')).filter(x => x.rol === 'Logística').length;
  await p.uncheck('[data-usr-sec="logistica"]');
  await p.waitForTimeout(400);
  const despues = (await h.filas('permisos_rol')).filter(x => x.rol === 'Logística');
  check(antes === 0 && despues.length > 1 && !despues.some(x => x.seccion_id === 'logistica') && despues.some(x => x.seccion_id === 'inicio'),
        'al primer cambio guarda las de fábrica y quita solo la que se desmarcó');
  await p.fill('#usrRolNuevo', 'Ventas Academia');
  await p.click('#usrCrearRol');
  await p.waitForTimeout(300);
  check((await h.filas('permisos_rol')).some(x => x.rol === 'Ventas Academia' && x.seccion_id === 'inicio') && (await p.textContent('.usr-rol-panel h3')) === 'Ventas Academia',
        'crea el rol con Inicio y lo abre');
  await p.fill('#usrRolNuevo', 'ventas academia');
  await p.click('#usrCrearRol');
  check((await p.textContent('#toast')).includes('ya existe'), 'no deja duplicar un rol');
  await p.click('[data-usr-tab="personas"]');
  await p.click(`${persona$('u3')} [data-usr-editar]`);
  check((await p.$$eval(`${persona$('u3')} [data-usr-rol] option`, o => o.map(x => x.textContent))).includes('Ventas Academia'), 'el rol nuevo ya se puede asignar');
  await p.click('[data-usr-tab="roles"]');
  await p.click('[data-usr-rolsel="Ventas"]');
  await h.captura('usuarios-roles.png');

  h.paso('5. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'Roles sin scroll de lado');
  await h.captura('usuarios-roles-celular.png');
  await p.click('[data-usr-tab="personas"]');
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'Personas sin scroll de lado');
  await h.captura('usuarios-personas-celular.png');

  await h.terminar();
})();
