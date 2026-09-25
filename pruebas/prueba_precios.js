/* Sección Precios (fase 2): ver, ajustar, ocultar y agregar; todo se guarda solo. */
const { abrirHub } = require('./arnes');

const PRECIOS = [
  { id:'pr1', nombre:'Subir a VIP', precio:500, activo:true, orden:1, actualizado_por:null, actualizado_en:null },
  { id:'pr2', nombre:'Uniforme', precio:null, activo:true, orden:2, actualizado_por:null, actualizado_en:null },
];

(async () => {
  const h = await abrirHub({ tablas:{ precios: JSON.parse(JSON.stringify(PRECIOS)) } });
  const { p, check } = h;
  const fila = id => `[data-precio-id="${id}"]`;
  const updates = () => h.ops('precios', 'update');
  const actividad = () => h.ops('actividad_usuario', 'insert');

  h.paso('1. La sección está en el menú y lista los precios');
  check(await p.isVisible('#desktopNav [data-view="precios"]'), 'Precios aparece en el menú');
  await p.click('#desktopNav [data-view="precios"]');
  await p.waitForTimeout(200);
  check(await p.isVisible('#view-precios'), 'se abre la sección');
  check(await p.inputValue(fila('pr1') + ' .precio-valor') === '500', 'VIP en $500');
  check(await p.inputValue(fila('pr2') + ' .precio-valor') === '', 'Uniforme sin precio');
  check((await p.textContent(fila('pr2') + ' .precio-meta')).includes('Sin precio'), 'avisa que el uniforme no tiene precio');
  await h.captura('precios-computadora.png');

  h.paso('2. Poner precio al uniforme se guarda solo');
  await h.limpiarOps();
  await p.fill(fila('pr2') + ' .precio-valor', '350');
  await p.dispatchEvent(fila('pr2') + ' .precio-valor', 'change');
  await p.waitForTimeout(200);
  let ups = await updates();
  check(ups.length === 1 && ups[0].precio === 350 && ups[0].actualizado_por === 'u1' && ups[0].actualizado_en, 'guardó $350 con quién y cuándo: ' + JSON.stringify(ups));
  check((await p.textContent(fila('pr2') + ' .guardado-estado')).includes('✓ Guardado'), 'dice ✓ Guardado');
  let act = await actividad();
  check(act.some(a => a.accion === 'precio_cambiado' && a.detalle === 'Uniforme: sin precio → $350'), 'queda en Actividad: ' + JSON.stringify(act));

  h.paso('3. El mismo valor no vuelve a guardar');
  await h.limpiarOps();
  await p.dispatchEvent(fila('pr2') + ' .precio-valor', 'change');
  await p.waitForTimeout(150);
  check((await updates()).length === 0, 'sin cambios, sin guardar');

  h.paso('4. Precio inválido o nombre vacío no se guardan');
  await p.fill(fila('pr1') + ' .precio-valor', '-5');
  await p.dispatchEvent(fila('pr1') + ' .precio-valor', 'change');
  await p.waitForTimeout(150);
  check((await updates()).length === 0 && await p.inputValue(fila('pr1') + ' .precio-valor') === '500', 'negativo: regresa a $500');
  await p.fill(fila('pr1') + ' .precio-nombre', '   ');
  await p.dispatchEvent(fila('pr1') + ' .precio-nombre', 'change');
  await p.waitForTimeout(150);
  check((await updates()).length === 0 && await p.inputValue(fila('pr1') + ' .precio-nombre') === 'Subir a VIP', 'nombre vacío: regresa');

  h.paso('5. Renombrar');
  await p.fill(fila('pr1') + ' .precio-nombre', 'Cambio a VIP');
  await p.dispatchEvent(fila('pr1') + ' .precio-nombre', 'change');
  await p.waitForTimeout(150);
  check((await updates()).some(u => u.nombre === 'Cambio a VIP'), 'guardó el nombre');

  h.paso('6. Quitar el precio (vacío) se guarda como sin precio');
  await h.limpiarOps();
  await p.fill(fila('pr1') + ' .precio-valor', '');
  await p.dispatchEvent(fila('pr1') + ' .precio-valor', 'change');
  await p.waitForTimeout(150);
  check((await updates()).some(u => u.precio === null), 'precio null');

  h.paso('7. Ocultar y volver a mostrar');
  await h.limpiarOps();
  await p.click(fila('pr2') + ' .precio-visible');
  await p.waitForTimeout(200);
  check((await updates()).some(u => u.activo === false), 'guardó activo=false');
  check(await p.getAttribute(fila('pr2'), 'class').then(c => c.includes('oculto')), 'se ve atenuado');
  act = await actividad();
  check(act.some(a => a.detalle === 'Uniforme: oculto'), 'Actividad dice oculto');
  await p.click(fila('pr2') + ' .precio-visible');
  await p.waitForTimeout(200);
  check((await updates()).some(u => u.activo === true), 'visible otra vez');

  h.paso('8. Agregar uno nuevo');
  await h.limpiarOps();
  await p.fill('#precioNuevoNombre', 'Mandil');
  await p.fill('#precioNuevoMonto', '250');
  await p.click('#btnAgregarPrecio');
  await p.waitForTimeout(200);
  const ins = await h.ops('precios', 'insert');
  check(ins.length === 1 && ins[0].nombre === 'Mandil' && ins[0].precio === 250 && ins[0].activo === true && ins[0].orden === 3 && ins[0].actualizado_por === 'u1', 'insertó Mandil $250: ' + JSON.stringify(ins));
  check(await p.$('[data-precio-id] .precio-nombre[value="Mandil"]') !== null, 'aparece en la lista');
  check(await p.inputValue('#precioNuevoNombre') === '', 'limpia el formulario');
  check((await actividad()).some(a => a.accion === 'precio_agregado' && a.detalle === 'Mandil: $250'), 'Actividad: precio agregado');

  h.paso('9. Sin nombre o repetido no agrega');
  await h.limpiarOps();
  await p.fill('#precioNuevoMonto', '100');
  await p.click('#btnAgregarPrecio');
  await p.waitForTimeout(100);
  await p.fill('#precioNuevoNombre', 'mandil');
  await p.click('#btnAgregarPrecio');
  await p.waitForTimeout(100);
  check((await h.ops('precios', 'insert')).length === 0, 'no insertó');

  h.paso('10. Nuevo sin precio (lo pone quien lo cobre)');
  await p.fill('#precioNuevoNombre', 'Curso online');
  await p.fill('#precioNuevoMonto', '');
  await p.press('#precioNuevoMonto', 'Enter');
  await p.waitForTimeout(200);
  check((await h.ops('precios', 'insert')).some(i => i.nombre === 'Curso online' && i.precio === null), 'Enter agrega sin precio');

  h.paso('11. Si la base falla, avisa y regresa el valor');
  await h.fallar(op => op.tabla === 'precios' && op.tipo === 'update');
  await p.fill(fila('pr1') + ' .precio-valor', '600');
  await p.dispatchEvent(fila('pr1') + ' .precio-valor', 'change');
  await p.waitForTimeout(200);
  check((await p.textContent(fila('pr1') + ' .guardado-estado')).includes('No se guardó'), 'dice ⚠ No se guardó');
  check(await p.inputValue(fila('pr1') + ' .precio-valor') === '', 'regresa al valor guardado (sin precio)');
  await h.fallar(null);

  h.paso('12. Usuario sin admin de cualquier rol la ve (respaldo de permisos)');
  const roles = await p.evaluate(() => Object.entries(PERMISOS_POR_ROL_DEFAULT).filter(([r, s]) => !s.includes('precios')).map(([r]) => r));
  check(roles.length === 0, 'todos los roles traen Precios en el respaldo: faltan ' + roles.join(', '));

  h.paso('13. Celular 390 px');
  await p.setViewportSize({ width:390, height:844 });
  await p.waitForTimeout(150);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sin scroll horizontal');
  await h.captura('precios-celular.png');

  await h.terminar();
})();
