/* Humo: cada sección del menú abre sin errores de JS, como admin y como Logística. */
const { abrirHub } = require('./arnes');

(async () => {
  for (const usuario of [
    { id:'u1', nombre:'Admin Prueba', rol:'Sistemas', es_admin:true },
    { id:'u1', nombre:'Recepción Prueba', rol:'Logística', es_admin:false },
  ]) {
    const h = await abrirHub({ usuario, nombre:'prueba_humo (' + usuario.rol + ')' });
    const vistas = await h.p.$$eval('#desktopNav [data-view]', els => els.map(e => e.dataset.view));
    h.check(vistas.length >= 14, 'hay secciones en el menú: ' + vistas.length);
    for (const v of vistas) {
      await h.p.evaluate(id => setActiveSection(id), v);
      await h.p.waitForTimeout(200);
      h.check(await h.p.isVisible('#view-' + v), 'se ve la sección ' + v);
    }
    await h.terminar();
  }
})();
