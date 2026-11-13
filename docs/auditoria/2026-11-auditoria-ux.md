# 2026-11 · Auditoría del Hub: más rápido, más claro, más fluido

Fecha: 13 nov 2026. Hecha por Claude. **Es solo auditoría: no se cambió código, no se escribió en la base, no se
publicó nada.** Cada fase de la sección 7 necesita su propio "permitido generar".

Revisado: `hub/index.html` (18,553 líneas), la base de Supabase (definiciones, estadísticas de uso y planes de
consulta con `explain` sin `analyze`), y la función `glamy` (solo su código; no se le hizo ninguna pregunta).
No se consultaron `logistica_cursos`, `giras` ni `gira_paradas`. Este documento no trae nombres, teléfonos ni correos:
solo conteos y ejemplos inventados.

---

## 1. Lo más importante, en una página

Los cinco hallazgos que más pesan, en orden:

1. **El Hub se vuelve a cargar completo él solo, muchas veces al día.** En 30 días hubo 7,350 arranques completos
   para 171 "persona-día": **43 arranques por persona al día**. Uno de cada tres ocurre menos de 3 segundos después
   del anterior (nadie recarga así a mano). Cada arranque lanza unas 40 consultas, repinta la pantalla y crea un
   renglón nuevo en el checador. Hallazgo F1.
2. **Al arrancar, todos cargan pantallas que casi nadie abre**, y son las más lentas de toda la base: la lista de
   Cursos tarda 2.3 s en promedio (hasta 7.5 s) y la de Ciudades 0.6 s. Mientras no terminan, no aparecen el bloc de
   tareas ni Glamy, ni se activa la sincronía en vivo. Hallazgo F2.
3. **Cobranza corre cada minuto una consulta de 4 segundos** ("Hoy atender"), aunque nada haya cambiado. Es la
   segunda consulta más cara de la base. Hallazgos F3 y R2.
4. **Falta un índice en `pagos`** (y otros cuatro chicos). Por eso varias pantallas recorren las 36,744 inscripciones
   de la historia para mostrar las 378 de la gira. Se arregla con una migración chica. Hallazgo R1.
5. **Lo pagado, lo que debe y "liquidada" los calcula el navegador y los guarda como dato**, en dos o tres escrituras
   separadas. Es justo lo que prohíbe la regla "nada de fotos": hoy hay 22 inscritas cuyos pagos no cuadran con lo
   pagado, y si dos personas cobran a la misma alumna a la vez, un cobro pisa al otro. Hallazgo F4.

Lo bueno, para no perderlo: las reglas rojas del vigilante están en 0, las pruebas pasan salvo una que depende de la
hora (sección 9.4), ninguna sección se desborda a lo ancho en celular, los textos están en español claro casi en todo
el Hub, y la Recepción está bien pensada para la puerta (buscador con foco, atajos de teclado, refresco propio).

Lo que **no** pude comprobar está en la sección 8. Lo principal: no observé a nadie del equipo usando el Hub ni lo
abrí con una sesión real, así que los clics están contados en el código y en las pruebas, y los tiempos son los que
registra la base, no los que siente la persona en su celular.

---

## 2. Cómo se midió

| Qué | Con qué | Límite |
|---|---|---|
| Consultas lentas y repetidas | Estadísticas de la base (`pg_stat_statements`), acumuladas desde el 19 sep 2026 (55 días) | Son promedios; no dicen a quién le tocó la lenta |
| Por qué son lentas | `explain` sin `analyze` y las definiciones de vistas y funciones | Es el plan estimado, no el tiempo real de una corrida |
| Índices, permisos (RLS), funciones | Catálogo de Postgres y los avisos de Supabase (seguridad y rendimiento) | — |
| Arranques del Hub | Conteos de `sesiones_usuario` (se crea un renglón por arranque) | No dice la causa, solo cuántos y cada cuánto |
| Pasos y clics por tarea | Lectura del código y de las pantallas de las pruebas | No es observación de personas reales |
| Celular (390 px) | Barrido con Playwright sobre la base simulada, más las capturas que generan las pruebas | Datos inventados; no es un teléfono real ni su red |
| Glamy | Lectura de `index.ts` y `manual.ts`, y conteos de `glamy_uso` | No se le preguntó nada (cuesta dinero) |

Tamaños de hoy: 37,021 personas · 36,744 inscripciones (378 de cursos que vienen) · 985 leads (339 abiertos) ·
1,406 pagos · 1,630 cursos con fecha (57 por venir) · 10 personas activas en el equipo · base de 117 MB, de los
cuales 44 MB son 100 tablas de respaldo.

---

## 3. El día de cada rol

Los clics cuentan toques o clics de ratón; "campos" son los que hay que llenar o revisar. Las frecuencias salen de la
bitácora de los últimos 30 días.

### 3.1 Vendedora (3 personas)

| Tarea | Frecuencia (30 días) | Camino hoy | Pasos | Qué estorba |
|---|---|---|---|---|
| Dar de alta un lead | 268 | Alumnos y Leads → "+ Nuevo lead" → formulario → "Crear lead" | 2 clics + 14 campos a la vista (unos 6 obligatorios en la práctica) | El formulario muestra todo junto: correo, fecha de nacimiento, teléfono alterno y comentario pesan lo mismo que teléfono y curso. Hay tres campos para "a dónde va" (Curso que tomará, Ciudad de interés, Curso de interés). Hallazgo F6 |
| Actualizar un lead (estatus, fecha, comentario) | 702 + 431 comentarios | Abrir tarjeta → cambiar → guardar | 2 a 4 clics | La ficha tiene **tres botones de guardar distintos**: "Guardar" (vendedor), "Guardar comentario" y "Guardar cambios" (hasta abajo). Si cambia el estatus y solo toca "Guardar comentario", el estatus se pierde sin aviso. Hallazgo F5 |
| Reportar un pago | 199 | Abrir tarjeta → "Registrar pago" → formulario → "Registrar pago" | 3 clics + 11 campos a la vista (3 a 5 por llenar) | El formulario es largo en celular; el comprobante queda hasta abajo |
| Ver qué le toca cobrar hoy | diario | Inicio → "Te toca cobrar hoy" | 0 clics | Bien resuelto. Pero Inicio se repinta cada minuto (hallazgo F3) |
| Mandar WhatsApp desde el Hub | **11** | Tarjeta → WhatsApp → elegir mensaje → "Abrir WhatsApp con el mensaje" | 3 clics | Casi no se usa: 11 envíos contra 1,952 contactos anotados. No pude comprobar por qué (sección 8) |
| Buscar a alguien | constante | Buscador del tablero (solo la gira) o Historial cliente (todas) | 1 campo | Son dos buscadores con alcance distinto y nada lo dice en pantalla. Historial tarda 0.3 a 1 s por búsqueda. Hallazgo R4 |

### 3.2 Cobranza (1 persona)

| Tarea | Frecuencia (30 días) | Camino hoy | Pasos | Qué estorba |
|---|---|---|---|---|
| Confirmar un pago reportado | 181 | Cobranza → Por confirmar → abrir → "Inscribir al curso" → revisar 8 campos → "Inscribir" → se abre su ficha → cerrar | 5 clics por pago | Después de "Inscribir", el Hub recarga el tablero **y** el calendario completos antes de mostrar la ficha: de 1 a 3 s de espera por cada pago. Con 10 pagos seguidos son 50 clics y medio minuto de espera. Hallazgo F7 |
| Ver a quién cobrar hoy | diario | Cobranza → Calendario o Por cobrar | 1 clic | La pantalla corre cada minuto la consulta de 4 s y se repinta. Hallazgo F3 |
| Limpiar datos ("Hoy atender", Completar datos) | diario | Cobranza → Completar datos | 1 clic + 1 por renglón | Hoy hay 234 renglones por atender y 95 tareas de sistema abiertas en los blocs: demasiado para verse como "pendiente del día". Hallazgo F9 |
| Cobrar un saldo | 11 "pago registrado" | Por cobrar → abrir ficha → monto → "Registrar abono" | 3 clics + 2 a 4 campos | Bien. El riesgo es de fondo: hallazgo F4 |

Cobranza tiene 5 pestañas (Calendario, Por cobrar, Embudo por curso, Completar datos, En línea) que en celular se
parten en dos renglones, más la lista "Por confirmar" y "Hoy atender" arriba. Es la pantalla más cargada del Hub.

### 3.3 Recepción, el día del curso

| Tarea | Camino hoy | Pasos | Qué estorba |
|---|---|---|---|
| Abrir la Recepción | Menú → Calendario → tocar el día → "Recepción" | 3 a 4 toques | No hay acceso directo "Recepción de hoy" en Inicio. En celular el nombre de la ciudad se corta a 3 letras en el calendario ("CIU…"). Hallazgo R8 |
| Marcar llegada | Buscar → tocar a la alumna → "Llegó" | 1 campo + 2 toques | Bien |
| Cobrar en la puerta | Buscar → tocar → monto y forma de pago → cobrar | 1 campo + 3 a 4 toques | Dos escrituras separadas (el pago y el total). Si falla el internet del salón entre una y otra, queda un pago sin sumar. No hay aviso de "sin conexión". Hallazgos F4 y R9 |
| Cerrar el día | "Cerrar recepción" | 2 toques | Bien; se puede reabrir |

La Recepción se refresca sola cada 20 s (3 consultas chicas, de un solo curso): está bien dimensionada.

### 3.4 Academia (2 personas)

Academia, Graduación, Kits y Certificados funcionan por pestañas dentro de la sección y cargan solo al entrar
(no al arrancar): bien. Lo que encontré:

- Las fechas de las fichas se guardan solas al cambiar; el resto pide botón. En la misma pantalla conviven las dos
  costumbres (hallazgo F5).
- Academia Glam sigue sin alumnas activadas, pero a quien "ve todo" se le corre en **cada arranque** una función que
  escribe en la base (`agl_revisar_accesos`): 3,208 veces en 55 días para revisar cero alumnas. Hallazgo R6.
- Hay tres tablas de Academia que el Hub ya no lee (`academia_prospectos`, `academia_contenido`, `academia_hotel`):
  sus datos existen pero no se ven en ninguna pantalla. No pude comprobar si alguien los extraña (sección 8).

### 3.5 Administradores (Dueña, Gerente, Sistemas)

| Tarea | Camino hoy | Qué estorba |
|---|---|---|
| Ver cómo va la gira | Inicio (3 números + avance) → Ventas / Reportes / Glamy BI | El número "Inscritas de la gira" tarda 1.1 s y se recalcula cada minuto. Inicio, Cobranza, Calendario y Embudo calculan "debe" y "liquidada" cada uno por su lado (hallazgo F4) |
| Reporte del día (quien recibe tickets) | Inicio | Bien: junta vigilante, tickets y Glamy. Son 8 consultas chicas |
| Alta de un curso nuevo | Cursos → "+" | Usa tres ventanas `prompt()` del navegador, una de ellas pide escribir a mano una clave técnica. Hallazgo R10 |
| Usuarios y permisos | Sección propia | Bien ordenada desde octubre |

El menú tiene **20 secciones** en una sola lista. En celular es un desplegable de 20 renglones. Quien tiene pocas
secciones no lo sufre; un administrador sí. Hallazgo F8.

---

## 4. Hallazgos de fondo (ordenados por impacto)

Cada uno necesita plan, "¿qué pasa si…?" completo y su "permitido generar". Aquí van los principales.

### F1 · El Hub se recarga completo él solo (43 veces por persona al día)

- **Problema.** `sesiones_usuario` recibe un renglón cada vez que corre el arranque completo (`continuarSesion`).
  En 30 días: 7,350 arranques, 171 persona-días. De esos arranques, 2,505 (34 %) ocurren a menos de 3 s del
  anterior y 1,861 (25 %) entre 3 s y 1 min. En 41 persona-días hubo más de 50 arranques; el máximo fue 774 en un día.
  La causa más probable está en `initAuth`: cada aviso `SIGNED_IN` de Supabase vuelve a llamar a `onLogin` sin
  revisar si esa persona ya estaba dentro, y Supabase manda ese aviso también al volver a la pestaña y al renovar la
  sesión, no solo al escribir la contraseña. **No lo pude ver en vivo** (haría falta una sesión real); el conteo sí
  es real.
- **A quién afecta.** A todos. Es la razón más probable de "se me movió la pantalla", de avisos repetidos ("Tienes N
  tareas nuevas") y de buena parte de la lentitud: cada arranque son unas 40 consultas, entre ellas las más caras
  (F2). También ensucia el checador: 9,345 renglones para 10 personas.
- **Propuesta.** Que el arranque completo corra una sola vez por persona y por carga de página: si llega un
  `SIGNED_IN` de la misma persona que ya está dentro, solo se actualiza la sesión. El checador reutiliza el renglón
  del día en vez de crear otro.
- **Esfuerzo.** Chico en código; mediano con sus pruebas (hay que simular los avisos de sesión en el arnés).
- **Riesgo.** Medio: toca el inicio de sesión. Un error deja a alguien sin entrar o con datos de otra persona.
- **¿Qué pasa si…?**
  - …cierra sesión y entra otra persona en el mismo navegador: tiene que arrancar completo (usuario distinto).
  - …le cambian el rol o la dan de baja con el Hub abierto: hoy se entera en la siguiente recarga involuntaria;
    después hará falta revisarlo en el repaso periódico.
  - …cambia su contraseña en el primer ingreso: ese camino ya llama a `continuarSesion` aparte y debe seguir igual.
  - …deja la pestaña dormida toda la noche: al volver se renueva la sesión; debe refrescar datos, no rearrancar.
  - …el checador: ¿las horas trabajadas cambian si ya no hay un renglón por arranque? Hay que revisar cómo suma
    Actividad del equipo antes de tocarlo.

### F2 · Al arrancar se cargan Cursos y Ciudades para todos (las consultas más lentas de la base)

- **Problema.** `continuarSesion` espera a `renderCursos()` y `renderCiudadSelect()` junto con el tablero. Detrás están:

  | Consulta | Veces (55 días) | Promedio | Máximo | Tiempo total |
  |---|---|---|---|---|
  | `vista_cursos_explorador` (lista de Cursos) | 8,283 | 2.28 s | 7.5 s | 5.2 horas |
  | `vista_resumen_plaza` (resumen de la primera ciudad) | 9,867 | 0.61 s | 5.6 s | 1.7 horas |
  | `resumen_alumnos` + `vista_alumnos` + `vista_curso_ciudades` (primer curso) | ~8,200 c/u | 0.06 a 0.17 s | 3.4 s | 0.9 horas |
  | Todas las fechas de la historia para armar la lista de ciudades (1,630 renglones en 2 páginas) | 19,135 | 0.05 s | 0.6 s | 0.25 horas |

  La vista de Cursos junta **todos** los cursos con **todas** sus fechas y **todas** las inscripciones de la historia
  cada vez. Y como el bloc de tareas, el botón de Glamy y la sincronía en vivo se activan **después** de ese
  `Promise.all`, esperan a la más lenta.
- **A quién afecta.** A todos en cada arranque (y hay 43 al día por persona, F1). A vendedoras y Cobranza más, porque
  no usan esas secciones.
- **Propuesta.** Cargar Cursos y Ciudades al entrar a su sección (como ya hacen Academia, Ventas o Cobranza). Mostrar
  el bloc y Glamy en cuanto se sabe quién es la persona. Y de fondo, que la lista de Cursos salga de una función de
  la base que no recorra la historia completa cada vez.
- **Esfuerzo.** Mediano (el cambio de orden es chico; la función nueva y sus pruebas, medianas).
- **Riesgo.** Bajo-medio: otras pantallas usan `CIUDADES_CON_CURSO` (selectores de ciudad). Hay que cargar eso aparte.
- **¿Qué pasa si…?**
  - …alguien abre Cursos por primera vez: espera esos 2 s ahí, con un "Cargando…", y no en cada arranque.
  - …se crea una ciudad o un curso nuevo: la lista se vuelve a pedir al entrar; no se guarda como foto.
  - …Glamy manda a alguien a Cursos con un botón: la sección debe cargar sola al abrirse desde ese botón.
  - …¿los números de Cursos cuadran con el Embudo y el Calendario? Hoy no usan la misma función (ver F4): la función
    nueva debe salir de la misma regla.

### F3 · Cada minuto se vuelve a pedir toda la pantalla, haya cambios o no

- **Problema.** La sincronía tiene tres disparadores a la vez: el aviso en vivo (bien), el regreso a la pestaña y un
  repaso **cada 60 s** que recarga la sección abierta completa. Además corren cada minuto la revisión de avisos
  (`hub_novedades`, 2 consultas) y el latido del checador (26,910 escrituras). Lo que cuesta cada repaso:
  - Inicio: el contador de inscritas (1.1 s) más toda la lista de Cobranza para "Te toca cobrar hoy" (1.05 s).
  - Cobranza: lo anterior más "Hoy atender" (4.07 s) y Por confirmar.
  - Alumnos y Leads: 5 a 7 consultas (0.1 a 0.3 s).
  - Calendario: 4 a 6 consultas (0.2 s).
- **A quién afecta.** A Cobranza sobre todo (su pantalla trabaja 5 s de cada 60) y a quien deja Inicio abierto. En
  celular gasta datos y batería.
- **Propuesta.** Que el repaso de cada minuto pregunte primero "¿cambió algo?" con una consulta mínima, y solo
  entonces recargue. "Hoy atender" se pide al entrar y con el botón Actualizar, no en cada repaso. Los avisos se
  revisan al arrancar y al volver a la pestaña.
- **Esfuerzo.** Mediano.
- **Riesgo.** Medio: la sincronía se hizo para que dos personas no vean realidades distintas en cobranza. Si la
  consulta mínima no ve un cambio, alguien cobra con datos viejos.
- **¿Qué pasa si…?**
  - …el canal en vivo se cae sin avisar: el repaso sigue existiendo; solo se vuelve barato.
  - …el cambio fue en `pagos` (hoy **no** está en las tablas que avisan en vivo): la consulta mínima debe mirar
    también pagos. Hoy un pago confirmado por otra persona llega solo por el repaso.
  - …tiene una ficha abierta: igual que hoy, no se repinta debajo de los dedos.
  - …el curso cambia de fecha o alguien cede su lugar: son cambios en `eventos` e `inscripciones`, que ya avisan.

### F4 · Lo pagado, lo que debe y "liquidada" se guardan como dato y los calcula el navegador

- **Problema.** `inscripciones.anticipo`, `restante` y `liquidado` no los mantiene la base: los calcula
  `calcularAbono` en el navegador y los guarda en una segunda escritura después de insertar el pago (Recepción,
  ficha, inscribir). Además "debe" se calcula de tres formas:

  | Dónde | Cómo calcula lo que debe |
  |---|---|
  | Hub (`debeDe`), Recepción, ficha | precio − pagado; si no hay precio, `restante` |
  | Glamy (`glamy_debe`) | precio − pagado; si no hay precio, `restante` |
  | Embudo (`embudo_cursos`) y la lista de Cobranza | `restante` tal cual |

  Hoy coinciden en casi todo (1 inscrita de 378 da distinto), pero dependen de que el navegador nunca falle.
  Lo que ya se ve: 22 inscritas con "pagos no cuadran" en el vigilante, 3 de ellas con pagos capturados cuya suma no
  da lo pagado, y 20 con dinero pagado sin ningún renglón de pago (no pude comprobar cuántas vienen del Excel y
  cuántas de una escritura a medias). La regla de qué es "gira vigente" y "lead en puerta" también vive dos veces
  (en JavaScript y en `cursos_vigentes` / `ciudades_en_puerta`), y "dónde empieza la gira" (hueco de 30 días) solo
  existe en JavaScript.
- **A quién afecta.** A Cobranza y Recepción (dinero), y a administradores (números que deben cuadrar entre Inicio,
  Calendario, Cobranza, Embudo, Glamy y Glamy BI).
- **Propuesta.** Una sola fuente en la base: el total pagado sale de la suma de `pagos` (trigger que mantiene
  `anticipo`, `restante` y `liquidado`, o una vista que los calcula), y una función `registrar_pago` que hace todo
  en una sola operación. El Hub deja de calcular y solo muestra. Una función `debe_de(inscripción)` que usen el
  Hub, el Embudo, Cobranza y Glamy.
- **Esfuerzo.** Grande. Toca el flujo del dinero: ficha, Recepción, inscribir, corregir montos, ceder lugar, pasar a
  en línea, las cargas del Excel, el vigilante y las historias.
- **Riesgo.** Alto. Requiere respaldo, migración con cuadre antes y después, y publicarse fuera de día de curso.
- **¿Qué pasa si…?**
  1. …la capturan tarde: no cambia; el total sale de sus pagos.
  2. …el lead paga y queda inscrita: la inscripción y su primer pago deben nacer en la misma operación.
  3. …su pago no se encontró (`no_llego`): deja de sumar solo, sin que el navegador reste.
  4. …se cambia de curso: los pagos se van con la inscripción; el precio puede cambiar y "debe" se recalcula.
  5. …cede su lugar: hoy `ceder_lugar` ya es una función de la base; hay que revisar que no escriba totales a mano.
  6. …pierde su anticipo o pide reembolso: ¿el dinero sigue contando como pagado? Hay que decidirlo antes (hoy
     depende del estatus).
  7. …su curso cambia de fecha: no le afecta.
  8. …tiene dos cursos: cada inscripción suma solo sus pagos.
  9. …su curso ya pasó: igual; los históricos del Excel (36 mil) **no tienen renglones de pago**: el trigger no debe
     ponerles pagado = 0. Es el punto más delicado de la migración.
  10. …¿todos lo cuentan igual?: ese es el objetivo; se agrega regla roja al vigilante (sección 6).
  - …dos personas cobran a la misma alumna a la vez: hoy gana la última y se pierde un abono del total; con la suma
    en la base, no.

### F5 · La ficha tiene varios botones de guardar y no avisa si te vas sin guardar

- **Problema.** La ficha del lead tiene "Guardar" (vendedor), "Guardar comentario" y "Guardar cambios". La de la
  inscrita tiene "Registrar abono", "Guardar comentario", "Guardar estatus" y "Guardar corrección", y además campos
  que se guardan solos (fechas). Cerrar con la ✕ no avisa si quedó algo escrito. En todo el Hub hay 10 botones que
  dicen solo "Guardar" y 12 variantes ("Guardar cambios", "Guardar estatus", "Guardar nota"…).
- **A quién afecta.** Vendedoras y Cobranza (702 actualizaciones de lead y 431 comentarios en 30 días).
- **Propuesta.** Una sola costumbre por ficha: o todo se guarda solo y lo dice ("Guardado"), o hay un solo botón que
  guarda lo que cambió. Y un aviso al cerrar si hay texto sin guardar. Decidirlo con una maqueta.
- **Esfuerzo.** Mediano.
- **Riesgo.** Medio: el guardado automático ya causó un problema (30 cambios de fecha en 3 minutos, corregido el
  3 nov). Hay que conservar esa espera.
- **¿Qué pasa si…?**
  - …dos personas tienen la misma ficha abierta: hoy gana la última que guarda, campo por campo o todo junto según
    el botón. Con guardado por campo el choque es menor.
  - …cambia el estatus a "Pago por confirmar" a mano: hay un candado en la base que lo impide sin los datos del
    pago; el mensaje de ese error hoy sale en crudo (ver R3).
  - …el lead ya está inscrito: la promesa de pago se pasa sola a su ficha (trigger); el aviso debe decirlo.

### F6 · "Nuevo lead" pide 14 cosas de un jalón

- **Problema.** Teléfono, alterno, nombre, correo, nacimiento, curso, ciudad, curso de interés, fecha de anticipo,
  monto, paquete, vendedor y comentario, todos visibles. En celular son más de dos pantallas de alto. La etiqueta del
  paquete trae escrito "$1,400 / $1,900" en el HTML en cuatro formularios; el precio real se pinta después desde
  Precios (si esa consulta falla o tarda, se ve el precio viejo).
- **A quién afecta.** Vendedoras (268 altas en 30 días) y quien captura desde el celular.
- **Propuesta.** Dos pasos: primero teléfono (revisa si ya existe, que ya lo hace), nombre y curso o ciudad; lo demás
  plegado en "Más datos". Un solo selector de destino que sirva para "curso con fecha", "ciudad sin fecha" y "aún no
  decide". El paquete muestra el precio solo cuando ya lo leyó.
- **Esfuerzo.** Mediano.
- **Riesgo.** Bajo-medio: el vigilante ya marca 180 leads sin curso y 61 con fecha sin monto; esconder campos puede
  subir esos números. Conviene que lo opcional se pida en el momento en que hace falta (al prometer fecha, pedir monto).
- **¿Qué pasa si…?**
  - …el teléfono ya existe o es el alterno de alguien: ya se resuelve hoy; no cambia.
  - …su ciudad no tiene curso: hoy se avisa a quien arma la ruta; no cambia.
  - …ya está inscrita en ese curso: hoy se avisa; no cambia.

### F7 · Confirmar un pago son 5 clics y dos recargas completas

- **Problema.** Tras "Inscribir", el código hace `await renderBoard()` y `await renderCalendario(true)` antes de abrir
  la ficha. Y la confirmación son cuatro escrituras separadas desde el navegador (inscripción, pago, cierre del lead,
  nota en el historial): si la tercera falla, queda inscrita con el lead abierto (el vigilante lo marca como "lead
  abierto de una inscrita": hoy 1).
- **A quién afecta.** Cobranza (181 confirmaciones en 30 días) y Ventas con permiso de confirmar.
- **Propuesta.** Una función `confirmar_pago_de_lead` en la base que haga todo junto y revise el permiso ahí. En
  pantalla: confirmar desde la lista "Por confirmar" con un solo botón cuando los datos ya vienen completos, y pasar
  al siguiente sin recargar todo.
- **Esfuerzo.** Mediano-grande (va de la mano con F4).
- **Riesgo.** Alto: es dinero. Va después de F4 o junto con ella.
- **¿Qué pasa si…?**
  - …ya está inscrita en ese curso: hoy se cierra el lead y el pago se revisa en su ficha; la función debe hacer lo mismo.
  - …el pago no se encontró: sigue el botón "No se encontró" (regresa al estatus anterior).
  - …el vendedor elegido no es el dueño del lead: hoy pide motivo; se conserva.
  - …el curso no tiene precio: hoy deja precio y resto vacíos; se conserva.
  - …dos personas confirman el mismo pago a la vez: hoy pueden salir dos inscripciones (la base lo frena por la
    llave única persona + curso) o dos pagos; con la función, la segunda recibe "ya estaba confirmado".

### F8 · El menú tiene 20 secciones en una lista, y en celular la cabecera ocupa un tercio de la pantalla

- **Problema.** 20 secciones sin agrupar. En 390 px, antes del contenido van: logo, selector de sección, un botón
  "Cerrar sesión" a todo lo ancho, título y subtítulo (unos 250 px de 844). No hay dirección por sección: si se
  recarga la página (y pasa 43 veces al día, F1) regresa a Inicio, y el botón "atrás" del celular saca del Hub en vez
  de cerrar la ficha.
- **A quién afecta.** A todos en celular; a administradores también en computadora.
- **Propuesta.** Agrupar el menú (Vender · Cobrar · Cursos y gira · Academia · Administración). En celular, cabecera
  de un renglón y "Cerrar sesión" dentro del menú. Recordar la sección abierta y que "atrás" cierre la ficha.
- **Esfuerzo.** Mediano. Necesita maqueta.
- **Riesgo.** Bajo-medio: cambia de lugar cosas que el equipo ya encuentra de memoria; necesita aviso de actualización.
- **¿Qué pasa si…?**
  - …a alguien le quitan una sección mientras la tiene recordada: abre en Inicio.
  - …Glamy o una tarea del bloc mandan a una sección: siguen funcionando igual (`setActiveSection`).

### F9 · Los pendientes de limpieza son demasiados para sentirse "de hoy"

- **Problema.** "Hoy atender" trae 234 renglones; el vigilante marca 180 leads sin curso, 91 inscritas sin vendedora,
  62 inscritas sin pago y sin fecha, 61 leads con fecha sin monto; hay 95 tareas de sistema abiertas en los blocs.
  Con esos tamaños la lista deja de leerse.
- **A quién afecta.** Cobranza, Ventas y quien recibe el reporte del día.
- **Propuesta.** Primero una limpieza de una vez (con el equipo, por tipo). Después, que cada tipo tenga dueño y
  tope: si un tipo pasa de cierto número, se muestra como un solo renglón "180 leads sin curso → resolver en lote"
  con una pantalla para asignar varios a la vez. Y evitar el origen: pedir el dato cuando se crea (liga con F6).
- **Esfuerzo.** Mediano (la pantalla en lote); la limpieza es trabajo del equipo.
- **Riesgo.** Bajo.
- **¿Qué pasa si…?**
  - …un lead sin curso es de una ciudad que no se visita: hoy ya se separa ("ciudad fuera de la gira"); en lote
    debe poder cerrarse con motivo.
  - …la inscrita sin vendedora viene del Excel: asignar en lote por ciudad o por fecha.

### F10 · Permisos: la base deja que cualquier persona con sesión escriba casi todo

- **Problema.** 21 tablas conservan la política inicial "todo para cualquiera con sesión": `personas`, `leads`,
  `inscripciones`, `pagos`, `eventos`, `interacciones`, `cursos`, `ciudades`, `estatus`, `sedes`, `personal_apoyo` y
  las del tutorial. `precios` lo puede editar cualquiera con sesión. `tutorial_faq`, que entra a las instrucciones de
  Glamy, también. El permiso "confirmar pagos" solo se revisa en el navegador. Además 23 funciones con permisos
  elevados las puede llamar alguien **sin sesión**; revisé las que escriben y todas rechazan por dentro a quien no
  tiene usuario, pero no hay razón para dejarlas abiertas. Ya estaba anotado en octubre; sigue igual.
- **A quién afecta.** Al negocio: con 10 personas el riesgo es un error o una cuenta robada, no un ataque.
- **Propuesta.** Por pasos: (1) quitar a "sin sesión" el permiso de ejecutar funciones que no son del portal de
  diplomas; (2) `precios`, `estatus`, `cursos`, `tutorial_faq`: escribir solo administradores; (3) `pagos` e
  `inscripciones`: escribir solo por funciones (sale gratis después de F4 y F7).
- **Esfuerzo.** Chico para (1) y (2); grande para (3).
- **Riesgo.** Medio: una política mal puesta deja a alguien sin poder trabajar. Se prueba contra la API real con un
  usuario de cada rol, dentro de una transacción que se deshace.
- **¿Qué pasa si…?**
  - …una vendedora necesita corregir un nombre o un teléfono: `personas` sigue abierta a escritura del equipo.
  - …Recepción cobra en la puerta sin ser de Cobranza: hoy puede; hay que decidir si el permiso es "cobrar" aparte de
    "confirmar".
  - …las pruebas de Playwright: no ven RLS; esto solo se prueba contra la base real.

### F11 · Glamy contesta de golpe, no conforme escribe

- **Problema.** La función espera a tener toda la respuesta (hasta 6 vueltas con herramientas) antes de mandar algo.
  La persona ve "pensando" todo ese tiempo. `glamy_buscar_persona` tarda 0.57 s en promedio (hasta 3.5 s) porque
  busca sobre las 37 mil personas sin índice de texto. Uso real: 177 preguntas desde el 19 oct (unas 7 al día) y 3
  "No me sirvió".
- **A quién afecta.** A quien la usa; hoy es poco uso, por eso va al final.
- **Propuesta.** Respuesta en vivo (streaming) y el índice de búsqueda de R4. Medir antes cuánto tarda de verdad:
  `glamy_uso` no guarda la duración; agregarla es el primer paso.
- **Esfuerzo.** Mediano. **Riesgo.** Bajo-medio (hay que republicar Glamy y correr su examen, que cuesta).
- **¿Qué pasa si…?** …se corta a media respuesta: debe quedar lo ya escrito y un "se cortó, vuelve a preguntar";
  hoy un corte no deja nada.

---

## 5. Arreglos rápidos (ordenados por impacto)

Cada uno cabe en una fase chica. Los de base de datos van con respaldo y migración con nombre.

### R1 · Índices que faltan

- **Problema.** `pagos` no tiene índice por inscripción: cada pantalla que trae "inscritas con sus pagos" recorre la
  tabla de pagos una vez por inscrita. La base lleva 4.4 millones de recorridos completos de `pagos` (6 mil millones
  de renglones leídos) y 2.8 millones de `leads`. Tampoco hay índice para "fechas de un curso" en `eventos`.
  El plan estimado de la consulta de Cobranza recorre las 37 mil inscripciones y, por cada una, toda la tabla de pagos.
- **A quién afecta.** Todos: Inicio, Cobranza, Calendario, Recepción, Embudo, Glamy.
- **Propuesta.** Cinco índices: `pagos(inscripcion_id)`, `eventos(curso_id, fecha)`, `leads(persona_id)`,
  `leads(ciudad_interes_id)`, `interacciones(lead_id)`. Supabase marca 62 llaves sin índice; el resto son tablas
  chicas y no urgen. Hay 15 índices que nunca se han usado (se anotan; no se borran).
- **Esfuerzo.** Chico. **Riesgo.** Bajo (las tablas son chicas; crear el índice tarda menos de un segundo).
- **¿Qué pasa si…?** …la consulta sigue lenta: es porque filtra las inscripciones "por la fecha de su curso" y eso
  obliga a recorrer la historia; se arregla en R2. Medir antes y después con las mismas estadísticas.

### R2 · Pedir las inscritas por curso, no por fecha; y aligerar "Hoy atender"

- **Problema.** Seis consultas del Hub piden `inscripciones` filtrando por la fecha del curso
  (`eventos!inner … gte(fecha)`): la base revisa las 36,744 para quedarse con unas 400 (1.0 a 1.4 s cada una; el
  contador "Inscritas de la gira" de Inicio cuesta 1.1 s para pintar un número). El Hub ya tiene en memoria la lista
  de cursos que vienen. Aparte, `bandeja_limpieza` (4.07 s) arma el nombre completo de las 37 mil personas antes de
  filtrar y llama a `situacion_pago` una vez por inscrita.
- **A quién afecta.** Cobranza, Inicio, tablero de Inscritos, Calendario.
- **Propuesta.** Pedir por `evento_id in (los cursos de la gira)`, que usa el índice que ya existe. Reescribir
  `bandeja_limpieza` para que busque el nombre solo de quien sale en la lista. Mismo resultado, sin cambiar reglas.
- **Esfuerzo.** Chico-mediano. **Riesgo.** Medio-bajo: cambia consultas de Cobranza; se comprueba con las historias
  y comparando el resultado viejo y el nuevo sobre los datos reales (deben dar idéntico).
- **¿Qué pasa si…?**
  - …el curso tiene fecha por definir: va en la misma lista de cursos de la gira (hoy son dos consultas pegadas).
  - …la gira tiene más de 200 fechas: la lista de ids se parte en bloques.
  - …se agrega una fecha mientras el Hub está abierto: la lista de cursos se refresca con la sincronía.

### R3 · Mensajes de error en español claro

- **Problema.** 141 de los 458 avisos muestran el texto técnico de la base tal cual ("Error cargando leads: …" seguido
  de un mensaje en inglés). 16 fallas solo se anotan en la consola y la persona no se entera (por ejemplo, si falla
  "Hoy atender" la caja queda vacía, como si no hubiera pendientes).
- **A quién afecta.** A todos, sobre todo con mala señal.
- **Propuesta.** Una función `avisoError(qué estaba haciendo, error)` que traduzca los casos comunes (sin internet,
  sesión vencida, sin permiso, dato repetido) y deje el texto técnico en un "ver detalle". Cuando una lista falla,
  decirlo en la lista con un botón "Reintentar".
- **Esfuerzo.** Mediano (son muchos puntos, pero mecánico). **Riesgo.** Bajo.
- **¿Qué pasa si…?** …el error viene de un candado de la base con mensaje ya en español (los `raise exception`): se
  muestra tal cual, que ya es claro.

### R4 · Búsqueda de personas con índice

- **Problema.** Historial cliente busca en `vista_personas_busqueda`, que quita acentos y limpia teléfonos de las
  37 mil personas en cada tecleo (0.33 a 1 s; hasta 5 s). No hay índice de texto. Glamy busca igual.
- **A quién afecta.** Vendedoras, Cobranza, Glamy.
- **Propuesta.** Columnas calculadas por la base (`nombre_norm`, `tel10`, `alt10`) con índice de trigramas, o un índice
  sobre la expresión. No es una foto: la base las mantiene sola.
- **Esfuerzo.** Chico-mediano. **Riesgo.** Bajo (respaldo de `personas` antes).
- **¿Qué pasa si…?** …corrigen un nombre o teléfono: la columna se recalcula sola. …juntan duplicados: igual.

### R5 · Escapar nombres y ciudades en las tarjetas

- **Problema.** La regla es escapar todo dato con `escHtml`. No se cumple en las tarjetas del tablero (nombre y
  ciudad), en "últimos leads" de Inicio ni en el selector de ciudades. Hay unas 140 líneas por revisar. Un nombre
  capturado con signos `<` `>` rompe la tarjeta o ejecuta código en la pantalla de los demás.
- **A quién afecta.** A todos (seguridad y pantallas rotas).
- **Propuesta.** Barrido de esas líneas y una prueba con un nombre "malicioso" inventado en cada pantalla.
- **Esfuerzo.** Chico-mediano. **Riesgo.** Bajo.
- **¿Qué pasa si…?** …el nombre trae `&` o comillas legítimas: se ve bien escapado, no doble escapado (probarlo).

### R6 · No correr al arrancar lo que no hace falta

- **Problema.** `agl_revisar_accesos` (escribe en la base) corre en cada arranque de quien ve todo en Academia Glam:
  3,208 veces para cero alumnas activas. La revisión de avisos corre cada minuto (29,964 lecturas de una tabla de 21
  renglones).
- **Propuesta.** Academia Glam: revisarlo al entrar a su sección o en el cron diario que ya existe para el vigilante.
  Avisos: al arrancar y al volver a la pestaña.
- **Esfuerzo.** Chico. **Riesgo.** Bajo.
- **¿Qué pasa si…?** …se activan alumnas y alguien se atrasa: la tarea de "retirar acceso" saldría al día siguiente
  (cron) en vez de al siguiente arranque. Con un atraso medido en días, no cambia nada.

### R7 · Fijar las versiones de las librerías y no frenar la carga

- **Problema.** `supabase-js@2` se pide sin versión fija: el día que salga una versión nueva, producción cambia sola.
  Chart.js se descarga para todos aunque solo Ventas y Reportes tienen gráficas. Los tres scripts frenan la primera
  pintada. El archivo pesa 1.29 MB (320 KB comprimido).
- **Propuesta.** Versión exacta de `supabase-js`; Chart.js al entrar a Ventas o Reportes; `defer` donde se pueda.
- **Esfuerzo.** Chico. **Riesgo.** Bajo-medio (el orden de carga importa; probar el arranque).
- **¿Qué pasa si…?** …el CDN no responde: hoy el Hub no abre; se puede servir la copia propia desde `hub/`.

### R8 · Celular: letras, botones y calendario

- **Problema (medido a 390 px, sección 9.4).** Ninguna sección se desborda a lo ancho: eso está bien. Lo que falla:
  el contenido empieza hasta el pixel 235 a 250 de 844 (F8); las pestañas miden 32 a 35 px de alto y las flechas del
  calendario 30 × 30 (lo cómodo para el dedo son 40 o más); hay 186 tamaños de letra por debajo de 12 px en el CSS
  (de 9 a 11.5); el calendario corta el nombre de la ciudad a tres letras; la ficha del lead mide 1.9 pantallas de
  alto y la de la inscrita 1.6, con 25 botones a la vista; y hay 6 puntos de quiebre distintos (520, 600, 640, 700,
  760 y 900 px), así que entre secciones cambia cuándo se "vuelve celular".
- **A quién afecta.** Recepción y vendedoras, que son quienes más usan celular.
- **Propuesta.** Mínimo de 12 px para texto y 40 px de alto para lo que se toca; dos puntos de quiebre (celular y
  tableta); en el calendario de celular, lista por día en vez de cuadrícula, o el nombre completo en dos renglones.
- **Esfuerzo.** Mediano (muchos retoques chicos; capturas 1200 y 390 de cada sección). **Riesgo.** Bajo.

### R9 · Avisar cuando no hay internet

- **Problema.** El Hub no detecta que se fue la conexión. En la puerta de un salón, cobrar sin señal termina en un
  aviso técnico o en nada.
- **Propuesta.** Franja "Sin conexión: lo que hagas no se guarda" y botones de cobro apagados mientras dure. No
  guardar cobros para después (eso sí sería una foto, y con dinero).
- **Esfuerzo.** Chico. **Riesgo.** Bajo.
- **¿Qué pasa si…?** …la señal va y viene: al volver, refrescar la Recepción antes de volver a prender los botones.

### R10 · Restos de ventanas del navegador y textos fijos

- **Problema.** Quedan 3 `confirm()` (checar salida, confirmar ruta, generar reactivación) y 3 `prompt()` (curso
  nuevo, uno pide teclear una clave técnica). Los precios "$1,400 / $1,900" están escritos en cuatro formularios.
- **Propuesta.** Usar `preguntarConfirmacion` (ya existe) y un formulario chico para curso nuevo. Los botones de
  paquete se pintan con el precio de Precios o sin precio.
- **Esfuerzo.** Chico. **Riesgo.** Bajo.

### R12 · "Hoy" debe ser el mismo día para el Hub y para la base

- **Problema.** El Hub toma "hoy" del reloj del aparato (`hoyISO`, definida dos veces); la base, el vigilante y el
  panel de Glamy usan la hora de México. De las 6 de la tarde a la medianoche de México, un aparato en otra zona
  horaria (o con el reloj mal) ve como "hoy" el día siguiente: promesas que "ya vencieron", cobros de mañana en "Te
  toca cobrar hoy". Por esa misma diferencia falla una prueba a esas horas (sección 9.4).
- **A quién afecta.** A quien viaja con la gira o trae mal la zona horaria del celular; y a quien corre las pruebas.
- **Propuesta.** Una sola `hoyISO()` que use siempre la hora de México, y la prueba con la misma regla.
- **Esfuerzo.** Chico. **Riesgo.** Bajo-medio: `hoyISO` se usa en casi todas las pantallas; se prueba cambiando la
  zona horaria del navegador de pruebas.
- **¿Qué pasa si…?** …el curso es en una ciudad con otra hora (frontera, Quintana Roo): el día del curso puede
  empezar una hora antes o después; se acepta, porque toda la base ya vive en hora de México.

### R11 · Limpieza de la base (sin borrar nada)

- **Problema.** Funciones que ya nadie llama: `agl_candidatas` (2 versiones), `agl_meses_excel`, `bi_alertas_cuadre`
  y las versiones viejas de `agl_config_generacion`, `agl_guardar_plan`, `agl_activar`, `agl_activar_abonos` y
  `cambio_fecha_regalo`. Tablas sin uso: `asesores`, `comisiones`, `secuencia_nurture`, `estatus_tonos_alternos` y
  cuatro del tutorial. El esquema `respaldo` pasó de unas 50 a 100 tablas (44 MB de 117). Los avisos de Supabase
  marcan 52 políticas que recalculan quién es la persona en cada renglón y 3 tablas con políticas duplicadas.
- **Propuesta.** Un documento de inventario con "se usa / no se usa / desde cuándo", quitar permisos de ejecución a
  lo muerto, y una política de respaldos (por ejemplo, conservar 60 días; lo anterior se exporta y se archiva fuera,
  con autorización expresa). Reescribir las políticas marcadas con `(select auth.uid())`.
- **Esfuerzo.** Chico-mediano. **Riesgo.** Bajo si no se borra; los respaldos solo con permiso explícito.

---

## 6. Historias y reglas del vigilante que propongo (no se corrieron)

Quedan escritas para agregarlas a `pruebas/historias/historias.sql` cuando se autorice la fase que las necesita.
Usan el mismo estilo del archivo: datos inventados, todo dentro de una transacción que se deshace.

**H-A · Dos cobros a la vez (para F4).** Crear una inscrita de prueba con precio 1,400 y un pago de 700. Simular dos
cobros de 350 que parten del mismo total leído (700). Esperado después de F4: pagado = 1,400, debe = 0, liquidada.
Hoy daría 1,050 con dos pagos que suman 1,400.

```sql
-- Boceto: se ajusta a las funciones que existan al construir la fase
-- 1) persona, inscripción (precio 1400) y pago de 700 de prueba
-- 2) select registrar_pago(v_insc, 350, …);  select registrar_pago(v_insc, 350, …);
-- 3) comprobar: (select anticipo from inscripciones where id = v_insc) = 1400
--               y (select sum(monto) from pagos where inscripcion_id = v_insc and verificacion <> 'no_llego') = 1400
--               y situacion_pago(v_insc) = 'liquidada'
-- 4) reglas rojas del vigilante en 0; raise exception para deshacer
```

**H-B · Pago que no llegó (para F4).** Inscrita con dos pagos; marcar uno como `no_llego`. Esperado: lo pagado baja
solo, deja de estar liquidada, el Embudo la pasa a "con anticipo" y Glamy dice lo mismo que el Hub.

**H-C · Confirmar un pago de punta a punta en una sola operación (para F7).** Lead con pago reportado → función de
confirmar. Esperado: una inscripción, un pago, lead cerrado en "Inscrita", una nota en el historial; al repetir la
llamada, ningún renglón nuevo.

**H-D · Mismo número en todas partes (para F4 y R2).** Para cada curso de la gira: inscritas, liquidadas y total por
cobrar según `embudo_cursos`, según la consulta nueva de Cobranza y según `glamy_curso`. Esperado: idénticos.

**Reglas nuevas para `vigilante_calcular`:**

| Regla | Tipo | Qué revisa |
|---|---|---|
| `debe_no_coincide` | Roja | Inscritas de la gira donde "debe" del Hub (precio − pagado) no es igual a `restante` |
| `pagado_sin_renglon` | Amarilla → roja después de F4 | Inscritas de la gira con dinero pagado y ningún renglón en `pagos` (hoy 20) |
| `arranques_de_mas` | Amarilla (para quien recibe el reporte) | Personas con más de 50 arranques del Hub ayer (hoy pasa 41 veces en 30 días); sirve para comprobar F1 |
| `consulta_lenta` | Amarilla | Alguna consulta del Hub con promedio mayor a 1 s en las estadísticas de la base |

---

## 7. Propuesta de fases, en orden

Primero lo que da más por menos y no toca dinero; luego lo de fondo. Un agente por fase.

| # | Fase | Incluye | Esfuerzo | Riesgo | Por qué en este lugar |
|---|---|---|---|---|---|
| 1 | **Arranque una sola vez** | F1 | Chico-mediano | Medio | Es lo que más se nota y abarata todo lo demás. Primero se confirma la causa con una sesión real |
| 2 | **Índices** | R1 | Chico | Bajo | Una migración; mejora todas las pantallas sin tocar el Hub |
| 3 | **Arranque ligero** | F2 (orden de carga), R6, R7 | Mediano | Bajo-medio | Con 1 y 2, el arranque queda en lo indispensable |
| 4 | **Consultas por curso y "Hoy atender"** | R2 | Chico-mediano | Medio-bajo | Quita las consultas de 1 a 4 s que quedan |
| 5 | **Repaso barato** | F3 | Mediano | Medio | Ya con consultas rápidas, se decide cuánto repaso hace falta |
| 6 | **Seguridad rápida** | R5, F10 pasos 1 y 2 | Chico-mediano | Medio | No depende de lo demás; se puede adelantar |
| 7 | **Errores claros y sin conexión** | R3, R9, R10, R12 | Mediano | Bajo | Buena fase para Codex (pantalla, sin base) |
| 8 | **Celular** | R8, F8 (con maqueta) | Mediano | Bajo-medio | Buena fase para Codex |
| 9 | **Fichas y alta de lead** | F5, F6 (con maqueta) | Mediano | Medio | Cambia costumbres del equipo: maqueta y aviso |
| 10 | **Dinero en la base** | F4, luego F7 y F10 paso 3 | Grande | Alto | La más importante de fondo; necesita las fases 2 y 4 hechas y un día sin curso |
| 11 | **Búsqueda y Glamy** | R4, F11 | Mediano | Bajo-medio | Uso bajo hoy; se puede adelantar R4 si Historial molesta |
| 12 | **Limpieza** | R11, F9 (pantalla en lote) | Mediano | Bajo | Cuando haya calma |

Cómo saber si sirvió (se mide con lo mismo que se midió aquí):

- Arranques por persona al día: de 43 a menos de 5.
- Consultas del Hub con promedio mayor a 1 s: de 10 a 0.
- "Hoy atender": de 4.07 s a menos de 0.3 s.
- Confirmar un pago: de 5 clics y 1 a 3 s de espera a 2 clics sin espera.
- Reglas rojas del vigilante en 0 e historias con `fallas=0` antes y después de cada fase.

---

## 8. Lo que no pude comprobar

1. **La causa exacta de las recargas (F1).** El conteo es real; que sea el aviso `SIGNED_IN` es lo más probable por
   cómo está escrito `initAuth`, pero no lo vi pasar. Se confirma en 10 minutos con una sesión real y la consola
   abierta.
2. **Tiempos que siente la persona.** Medí lo que tarda la base, no la red ni el celular. No abrí el sitio
   publicado con sesión.
3. **Uso real por pantalla.** La bitácora registra acciones (guardar, confirmar), no qué secciones se abren. No sé,
   por ejemplo, cuánta gente abre Cursos o Ciudades; lo deduje de que nadie guarda nada desde ahí.
4. **Por qué casi no se manda WhatsApp desde el Hub** (11 en 30 días). Puede ser que usen otro medio, o que la
   bitácora no anote todos los envíos.
5. **De dónde vienen las 20 inscritas con dinero y sin renglón de pago**: carga del Excel o escritura a medias.
6. **Si alguien extraña** las pantallas de `academia_prospectos`, `academia_contenido` y `academia_hotel`.
7. **Glamy en vivo**: no se le preguntó nada ni se corrió su examen. Lo de F11 sale del código y de los conteos.
8. **Las historias** (`historias.sql`) no se corrieron, por instrucción. Las reglas rojas del vigilante las leí de su
   última corrida guardada: todas en 0.
9. **Giras y Logística**: sus pantallas se revisaron solo por fuera (menú y carga); sus tablas no se consultaron.
10. **Realtime**: no revisé la configuración de la publicación en vivo; lo de que `pagos` no avisa sale del código
    del Hub, que solo escucha `leads`, `inscripciones`, `personas` y `eventos`.

Pruebas: el resultado de `node pruebas/correr_todas.js` está en la sección 9.4.

---

## 9. Anexo: números

### 9.1 Las consultas que más tiempo le cuestan a la base (55 días)

| Consulta | La pide | Veces | Promedio | Total |
|---|---|---|---|---|
| Lista de Cursos (`vista_cursos_explorador`) | Arranque | 8,283 | 2,279 ms | 18,875 s |
| "Hoy atender" (`bandeja_limpieza`) | Cobranza, cada minuto | 3,861 | 4,069 ms | 15,710 s |
| Resumen de ciudad (`vista_resumen_plaza`) | Arranque y Ciudades | 9,867 | 613 ms | 6,047 s |
| Inscritas con pagos, por fecha del curso | Cobranza e Inicio ("Te toca cobrar") | 4,665 + 1,623 + 514 | 1,050 a 1,387 ms | 7,453 s |
| Contador "Inscritas de la gira" | Inicio | 3,846 + 1,449 | 1,082 a 1,240 ms | 5,960 s |
| Inscritas del tablero | Alumnos y Leads → Inscritos | 5,606 + 2,126 | 340 a 543 ms | 3,063 s |
| Leads del tablero | Alumnos y Leads, Cobranza, Recepción | ~30,000 en varias formas | 66 a 272 ms | ~4,200 s |
| Alumnas de un curso (`vista_alumnos`) | Arranque y Cursos | 8,023 | 168 ms | 1,350 s |
| Todas las alumnas de la ciudad (`plaza_personas`) | Ciudades | 4,252 | 295 ms | 1,256 s |
| Búsqueda de personas | Historial | ~2,500 | 328 a 995 ms | ~1,170 s |
| Latido del checador | Cada minuto | 26,910 | 5 ms | 123 s |

Nota: `pg_timezone_names` (1,169 veces, 362 ms) es de la propia API de Supabase al recargar su esquema, no del Hub.

### 9.2 El archivo del Hub

| Medida | Valor |
|---|---|
| Líneas / peso | 18,553 / 1.29 MB (320 KB comprimido) |
| Funciones | 669 |
| Llamadas a la base en el código | 305 `sb.from` + 43 `sb.rpc` + 16 paginadas |
| Ventanas (modales) | 29 |
| Avisos (`toast`) | 458, de los cuales 141 muestran el error técnico |
| Secciones del menú | 20 |
| Puntos de quiebre de pantalla | 6 distintos |
| Tamaños de letra menores a 12 px en el CSS | 186 |

### 9.3 Base

125 funciones, 98 triggers, 134 políticas, 13 vistas en `public`. 62 llaves foráneas sin índice, 15 índices sin uso,
52 políticas que recalculan la identidad por renglón, 23 funciones con permisos elevados ejecutables sin sesión.
Vigilante (última corrida): rojas en 0; amarillas: 180 leads sin curso, 91 inscritas sin vendedora, 62 inscritas sin
pago y sin fecha, 61 leads con fecha sin monto, 39 teléfonos repetidos, 22 pagos que no cuadran, 19 por confirmar sin
comprobante, 6 por confirmar sin datos.

### 9.4 Celular (390 × 844) y pruebas

**Barrido a 390 px** (Playwright, base simulada con 8 alumnas y 8 leads inventados, usuario administrador; varias
secciones salen casi vacías con esos datos, así que esto mide la estructura, no una pantalla llena):

| Medida | Resultado |
|---|---|
| Secciones con desborde horizontal de la página | 0 de 20 |
| Dónde empieza el contenido | pixel 235 a 250 (28 a 30 % de la pantalla) |
| Pestañas y botones de menos de 36 px de alto | En 11 de 20 secciones (pestañas de 32 a 35 px; flechas del calendario de 30 × 30) |
| Tablas más anchas que la pantalla (con scroll propio) | Cursos, Ventas, No llegaron |
| Textos visibles de menos de 12 px | Inicio 22, Glamy 17, Calendario 11, Alumnos y Leads 9, Cursos 8, Cobranza 7 |
| Ficha del lead | 1.9 pantallas de alto · 14 campos · 15 botones visibles |
| Ficha de la inscrita | 1.6 pantallas de alto · 20 campos · 25 botones visibles (33 en total) |
| Errores de JavaScript durante el barrido | 0 |

**Pruebas** (`NODE_PATH=$(npm root -g) node pruebas/correr_todas.js`, 13 nov 2026, 04:10 UTC = 12 nov 22:10 en México):
62 archivos, 1,740 revisiones: **1,739 pasan y 1 falla**.

- Falla `prueba_pasar_a_linea.js`, paso 4 ("se anota la recarga"). No es un error del Hub: el panel de Glamy pone la
  fecha de México y la prueba compara contra la fecha del reloj de la máquina (UTC). Falla siempre que se corre entre
  las 6 de la tarde y la medianoche de México, y pasa el resto del día. Es la misma familia de las dos pruebas que ya
  se corrigieron ("del 1 al 19 de cada mes", "último día del mes"). Arreglo propuesto en R12. **No la toqué.**
- No se corrieron `pruebas/examen_glamy.js` ni `pruebas/historias/historias.sql`.
