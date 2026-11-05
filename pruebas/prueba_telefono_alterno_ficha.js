/* Teléfono alterno a la vista en la ficha del lead (5 nov 2026): antes estaba plegado en "Datos de contacto"
   como "Teléfono adicional" y el equipo no lo encontraba.
   - La ficha del lead trae "Teléfonos" arriba, a la vista: principal y "Teléfono alterno (opcional)".
   - El encabezado dice "· alterno …" si tiene.
   - Mismas reglas que en "+ Nuevo lead": 10 dígitos y distinto al principal; se guarda con "Guardar cambios".
   - La ventana "Datos de contacto" (inscrita, Historial, Academia) usa los mismos nombres. Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ev = { id:'A', fecha:mas(40), curso_id:'cur1', ciudad_id:'cA', ciudades:{ id:'cA', nombre:'Ciudad A' } };
const persona = { id:'p1', nombre:'CLIENTA DE EJEMPLO', telefono_principal:'5510000001', telefono_alternativo:'5510000002' };

(async () => {
  const h = await abrirHub({ tablas:{ inscripciones:[], pagos:[], interacciones:[], mensajes_predeterminados:[], personas:[{ ...persona }],
      leads:[{ id:'l1', persona_id:'p1', estatus_id:2, estatus:{ id:2, etiqueta:'Aún no vence su pago' }, asesor_id:'u2', ciudad_interes_id:'cA', evento_id:'A', eventos:ev,
        creado_en:new Date().toISOString(), personas:{ ...persona } }] },
    usuario:{ id:'u2', nombre:'Vendedora Prueba', rol:'Ventas', es_admin:false, es_vendedor:true },
    equipo:[{ id:'u2', nombre:'Vendedora Prueba', es_vendedor:true, rol:'Ventas' }] });
  const { p, check } = h;
  const abrir = () => p.evaluate(e => { GIRAS = [{ id:'cur1', nombre:'CURSO PRUEBA' }]; EVENTOS_CAL = [e]; leadsCache = window.__tablas.leads.slice(); return abrirModalLead('l1'); }, ev);
  await abrir();
  await p.waitForTimeout(500);

  h.paso('1. Los teléfonos están a la vista');
  check(await p.isVisible('#modalTelefonoAltEdit') && await p.isVisible('#modalTelefonoEdit'), 'principal y alterno se ven sin abrir nada');
  check((await p.textContent('#leadTelefonos')).includes('Teléfono alterno (opcional)'), 'con el mismo nombre que en "+ Nuevo lead"');
  check((await p.inputValue('#modalTelefonoAltEdit')) === '5510000002', 'trae el alterno que tiene');
  check((await p.textContent('#modalLeadTelefono')).includes('alterno 5510000002'), 'el encabezado también lo dice');
  check(!(await p.textContent('#leadDatosContacto summary')).includes('teléfonos'), 'la sección plegada ya no es de teléfonos');
  await h.captura('telefono-alterno-ficha.png');

  h.paso('2. Mismas reglas al guardar');
  await p.fill('#modalTelefonoAltEdit', '55 1000 0001');
  await h.limpiarOps();
  await p.click('#guardarLead');
  await p.waitForTimeout(400);
  check((await h.ops('personas', 'update')).length === 0 && (await p.textContent('#toast')).includes('igual al principal'), 'igual al principal: no guarda y dice por qué');
  await p.fill('#modalTelefonoAltEdit', '551000');
  await p.click('#guardarLead');
  await p.waitForTimeout(400);
  check((await h.ops('personas', 'update')).length === 0 && (await p.textContent('#toast')).includes('alterno no tiene 10 dígitos'), 'incompleto: no guarda');
  await p.fill('#modalTelefonoAltEdit', '5520000003');
  await p.click('#guardarLead');
  await p.waitForTimeout(600);
  check((await h.ops('personas', 'update')).some(u => u.telefono_alternativo === '5520000003'), 'uno nuevo se guarda en la persona');
  await p.evaluate(() => document.getElementById('modalLead').classList.remove('open'));
  await abrir();
  await p.waitForTimeout(500);
  await p.fill('#modalTelefonoAltEdit', '');
  await h.limpiarOps();
  await p.click('#guardarLead');
  await p.waitForTimeout(600);
  check((await h.ops('personas', 'update')).some(u => u.telefono_alternativo === null), 'vacío: se quita');
  await p.evaluate(() => document.getElementById('modalLead').classList.remove('open'));

  h.paso('3. La ventana "Datos de contacto" usa los mismos nombres');
  await p.evaluate(() => abrirDatosContacto('p1'));
  await p.waitForSelector('#modalContacto.open');
  const txt = await p.textContent('#modalContacto');
  check(txt.includes('Teléfono principal') && txt.includes('Teléfono alterno (opcional)') && !txt.includes('Teléfono 2'), 'Teléfono principal y Teléfono alterno (opcional)');
  await p.evaluate(() => document.getElementById('modalContacto').classList.remove('open'));

  h.paso('4. Celular');
  await p.setViewportSize({ width:390, height:844 });
  await abrir();
  await p.waitForTimeout(500);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('telefono-alterno-ficha-celular.png');

  await h.terminar();
})();
