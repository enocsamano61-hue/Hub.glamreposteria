# Glam Repostería — reglas para agentes

- NADA se construye sin "permitido generar" de Enoc (una por fase). Leer y hacer SELECT es libre.
- `main` = producción (hub.glamreposteria.com). Trabaja en tu rama; sube a main solo con permiso
  y con `node pruebas/correr_todas.js` en verde (usa NODE_PATH=$(npm root -g)).
- Nunca borres datos: hay candados. Respaldo en `respaldo.tabla_AAAAMMDD` antes de migrar.
- Cero datos personales en el repo. No toques logistica_cursos, giras, gira_paradas.
- Código con comentarios en español; escapa con escHtml/escapeAttr; reutiliza funciones existentes;
  llama registrarActividad. Variables CSS (paleta C): --wine=frambuesa, --wine-dark=frambuesa oscuro, --champagne=rosa de adorno.
- Cada cambio: prueba Playwright + capturas 1200/390 px + docs/migraciones/AAAA-MM-DD-tema.md.
- Lee docs/FLUJO-DE-TRABAJO.md (este reporte) antes de empezar.
- Dos agentes (Claude y Codex), un agente por fase y nunca la misma sección de hub/index.html a la vez.
  Codex: ramas `codex/<tema>` desde el main más reciente, entrega por PR, sin acceso a Supabase
  (escribe el SQL en el doc de la fase); Claude aplica migraciones, publica a main y despliega Glamy.
  Ver la sección 0 de docs/FLUJO-DE-TRABAJO.md.
