# Sincronización en vivo entre usuarios

**Fecha:** 22 de septiembre de 2026
**Alcance:** Supabase (1 migración) + `hub/index.html`

---

## El problema

Los datos se cargaban **una sola vez, al iniciar sesión**, y se quedaban
congelados en la memoria del navegador:

```js
// esto corría UNA vez, en continuarSesion()
await Promise.all([renderBoard(), renderDashboard(), renderCalendario()]);
```

Si Isabel cambiaba el estatus de un lead, Jared no se enteraba. Y no sólo
"hasta cambiar de sección": `setActiveSection()` sólo muestra y esconde
pantallas, **no vuelve a consultar la base**. Jared tenía que recargar la
página completa (F5).

Con dos personas trabajando toda la mañana sin recargar, estaban viendo dos
realidades distintas. Con cobranza de por medio, eso significa dos personas
cobrándole a la misma alumna.

---

## Las cuatro decisiones de diseño

### 1. Realtime es la campanita, no el cartero

Cuando llega el aviso de que algo cambió, **no** se parchea la fila con lo que
trae el mensaje: se vuelve a correr la consulta completa.

Es a propósito. Esas consultas traen datos pegados de otras tablas (nombre,
ciudad, estatus, fecha del curso). Reconstruir eso a mano a partir del payload
es justo donde se meten los errores callados: una tarjeta que se queda con la
ciudad vieja y nadie lo nota durante semanas. Volver a consultar tarda ~300 ms
y siempre da el dato correcto.

Consecuencia práctica: como no se usa el contenido del mensaje, **no hace falta
`REPLICA IDENTITY FULL`**. Con la identidad por llave primaria basta, y así no
se infla el WAL con copias enteras de cada renglón en tablas de decenas de
miles (`inscripciones`: 36,363).

### 2. Respiro de 1 segundo

Si alguien captura 5 leads seguidos, se reconsulta una vez, no cinco.

### 3. Nunca repintar debajo de los dedos

Si hay una ficha abierta, una hoja del calendario desplegada o están
arrastrando un recuadro, **se espera**. Aparece un chip arriba —
*"Hay cambios nuevos · actualizar"* — y en cuanto cierran, se actualiza solo.

Sin esto, "tiempo real" se siente como *"se me movió la pantalla y perdí lo que
estaba escribiendo"*.

### 4. Red de seguridad doble

Un canal en vivo se cae sin avisar (se durmió el celular, se fue el wifi):

- al volver a la pestaña, refresca;
- y hay un repaso cada 60 s por si el canal murió callado.

---

## El eco del propio guardado

Realtime devuelve también las escrituras de uno mismo. Sin tratarlo, a quien
acababa de guardar le saltaba el chip de "hay cambios nuevos" por su propio
cambio.

Se resolvió **envolviendo el cliente de Supabase en un solo lugar**, en vez de
tocar cada uno de los guardados:

```js
sb.from = (tabla)=>{
  const q = _sbFrom(tabla);
  for(const metodo of ['insert','update','delete','upsert']){
    const original = q[metodo].bind(q);
    q[metodo] = (...args)=>{ ultimaEscrituraPropia = Date.now(); return original(...args); };
  }
  return q;
};
```

Así ningún guardado nuevo se puede olvidar de marcarse. Las **lecturas no se
sellan** — si lo hicieran, el Hub nunca avisaría de nada.

---

## Qué se actualiza solo

| Pantalla | En vivo |
|---|---|
| Alumnos y Leads (tablero) | ✅ |
| Calendario | ✅ |
| Inicio | ✅ |
| Ventas / Reportes | al entrar a la sección — son análisis, no operación |

Sólo se reconsulta **lo que la persona está viendo**. Las demás se marcan como
viejas y se refrescan al entrar, lo que de paso arregla el bug de navegación
que existía desde antes.

---

## Migración

`realtime_01_publicar_tablas_de_operacion`: publica `leads`, `inscripciones`,
`personas` y `eventos` en `supabase_realtime`.

Publicar una tabla **no la abre a nadie**: RLS sigue mandando y cada quien
recibe únicamente avisos de filas que ya podía leer.

---

## Cómo se verificó

### Confirmado

| Prueba | Resultado |
|---|---|
| Motor de sincronización (respiro, chip, espera, eco, apagado) | **29/29** |
| Regresión de vendedores | **23/23** |
| Regresión de interfaz | **50/50** |
| Las 4 tablas en la publicación | ✅ |
| Identidad ligera (llave primaria), no fila completa | ✅ |
| Realtime acepta las 5 suscripciones, sobre el cable | ✅ `ok`, con id por tabla |
| **RLS filtra la entrega**: con clave anónima, ante un UPDATE real | **0 cambios recibidos** |

La compuerta de entrega es exactamente `auth.role() = 'authenticated'` — la
misma política que hoy permite leer esas tablas. Si alguien puede ver un lead
en el Hub, recibirá sus cambios.

### No verificado desde aquí

Un navegador **con sesión iniciada** recibiendo el aviso. No hay contraseña de
ningún usuario disponible en el entorno de desarrollo, y crear una cuenta de
prueba en la autenticación de producción —con acceso de lectura a todo— no es
algo que se haga sin pedirlo.

El canal a nivel navegador tampoco se pudo probar en el sandbox
(`CHANNEL_ERROR: transport failure` desde `file://`), pero el WebSocket crudo
hacia Supabase **sí abre** desde el mismo entorno, así que es una limitación
del sandbox, no del Hub. El sitio real se sirve por HTTPS desde Cloudflare.

**Verificación pendiente, con dos sesiones reales:** abrir el Hub en dos
navegadores con usuarios distintos, cambiar el estatus de un lead en uno y
confirmar que el otro se mueve solo en ~1 segundo sin tocar nada.
