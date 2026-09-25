/* Corre todas las pruebas (prueba_*.js) una tras otra y dice cuáles fallaron. */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pruebas = fs.readdirSync(__dirname).filter(f => /^prueba_.*\.js$/.test(f)).sort();
const fallaron = [];
for (const f of pruebas) {
  console.log(`\n===== ${f} =====`);
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { stdio:'inherit', env:process.env });
  if (r.status !== 0) fallaron.push(f);
}
console.log('\n' + (fallaron.length ? `✗ Fallaron: ${fallaron.join(', ')}` : `✓ Todas en verde (${pruebas.length} archivos)`));
process.exit(fallaron.length ? 1 : 0);
