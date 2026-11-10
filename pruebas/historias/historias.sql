/* HISTORIAS COMPLETAS contra la base real, sin dejar rastro (28 oct 2026).
   Recorren lo que hace el equipo de punta a punta y en cada paso revisan que todo cuadre: el Embudo,
   la lista del cambio de fecha y el lead; al final de cada historia, las reglas rojas del vigilante en 0.
   Las corre Claude antes de publicar, con la herramienta de SQL de Supabase. Todo pasa dentro de un
   bloque que termina en error a propósito, así la base queda igual. El resultado viene en ese mensaje:
   "HISTORIAS fallas=0 ..." = todo bien. Si falla una, no se publica.
   Las escrituras imitan las del Hub (hub/index.html): Registrar pago, Confirmar pago (inscribir desde el
   lead), No se encontró, Cambiar de curso, Ceder su lugar (ceder_lugar) y Reembolso
   (cambio_fecha_marcar + cambio_fecha_cerrar_reembolso), la promesa de una inscrita puesta en su lead (H7) y la baja de
   una vendedora con un lead abierto, con los candados de Usuarios (H8), dos giras a la vez con una sin precio (H13) y una venta de curso en línea de punta a punta (H14).
   Personas de prueba inventadas. */
do $historias$
declare
  v_hoy date := (now() at time zone 'America/Mexico_City')::date;
  e0 uuid; ea uuid; eb uuid; v_admin uuid; v_yo uuid; v_vend uuid;
  st_pagado int; st_ppc int; st_anticipo int; st_novence int; st_intento int;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; l1 uuid; l2 uuid; l3 uuid; i1 uuid; i3 uuid; a1 uuid; a3 uuid;
  p8 uuid; l8 uuid; u8 uuid; v_otro_admin uuid; ok_av int;
  ok int := 0; mal text[] := '{}'; t text; rojos text;
begin
  -- Ayudantes (solo viven en esta corrida)
  execute $f$create function pg_temp.grupos(p_ev uuid, p_per uuid) returns text language sql as $s$
    select coalesce(string_agg(x.grupo || case when x.inscripcion_id is not null then '(i)' else '(l)' end, ',' order by x.grupo), '-')
      from public.embudo_cursos((select curso_id from public.eventos where id = p_ev), (select fecha from public.eventos where id = p_ev), p_ev) x
     where x.persona_id = p_per $s$$f$;
  execute $f$create function pg_temp.lista(p_ev uuid, p_per uuid) returns text language sql as $s$
    select coalesce(string_agg(case when x.inscripcion_id is not null then 'inscrita' else 'lead' end || ':' || x.estado || ':' || coalesce(a.origen, '-'), ','), '-')
      from public.cambio_fecha_lista(p_ev) x join public.cambio_fecha_avisos a on a.id = x.aviso_id where x.persona_id = p_per $s$$f$;
  execute $f$create function pg_temp.rojos() returns text language sql as $s$
    select coalesce(string_agg((x ->> 'regla') || '=' || (x ->> 'n'), ' '), '') from jsonb_array_elements(public.vigilante_calcular()) x
     where x ->> 'tipo' = 'rojo' and (x ->> 'n')::int > 0 $s$$f$;

  -- Quién: el administrador que recibe los tickets (ceder lugar y cerrar reembolso piden administrador o Cobranza)
  select u.auth_user_id, u.id into v_admin, v_yo from public.usuarios u where u.recibe_pedidos limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  select id into v_vend from public.usuarios where es_vendedor limit 1;
  select id into st_pagado from public.estatus where clave = 'pagado';
  select id into st_ppc from public.estatus where clave = 'pago_por_confirmar';
  select id into st_anticipo from public.estatus where clave = 'anticipo_vigente';
  select id into st_novence from public.estatus where clave = 'no_vence_pago';
  select id into st_intento from public.estatus where clave = 'primer_intento';
  -- Cursos: uno sin cambio de fecha (e0) y dos con cambio (ea, eb)
  select e.id into e0 from public.eventos e where e.fecha > v_hoy + 1 and e.curso_id is not null
     and not exists (select 1 from public.cambios_fecha c where c.evento_id = e.id) order by e.fecha limit 1;
  select e.id into ea from public.eventos e where e.fecha > v_hoy + 1 and e.curso_id is not null
     and exists (select 1 from public.cambios_fecha c where c.evento_id = e.id) order by e.fecha limit 1;
  select e.id into eb from public.eventos e where e.fecha > v_hoy + 1 and e.curso_id is not null and e.id <> ea
     and exists (select 1 from public.cambios_fecha c where c.evento_id = e.id) order by e.fecha limit 1;
  if e0 is null or ea is null or eb is null then raise exception 'HISTORIAS no hay cursos para probar (e0=%, ea=%, eb=%)', e0, ea, eb; end if;
  rojos := pg_temp.rojos();
  if rojos <> '' then mal := mal || ('Antes de empezar ya fallan reglas rojas: ' || rojos); end if;

  -- ===== H1. Lead nuevo → Registrar pago → Confirmar pago (curso sin cambio de fecha) =====
  insert into public.personas (nombre, telefono_principal) values ('HISTORIA UNO', '0000000101') returning id into p1;
  insert into public.leads (persona_id, evento_id, estatus_id, asesor_id, ciudad_interes_id)
  values (p1, e0, st_novence, v_vend, (select ciudad_id from public.eventos where id = e0)) returning id into l1;
  t := pg_temp.grupos(e0, p1); if t = 'sin_respuesta(l)' then ok := ok + 1; else mal := mal || ('H1 lead nuevo · Embudo: ' || t); end if;
  update public.leads set pago_reportado_monto = 700, pago_reportado_fecha = v_hoy, pago_reportado_banco = 'BANCO PRUEBA',
         pago_reportado_por = v_yo, pago_reportado_en = now(), estatus_antes_de_reporte = estatus_id, estatus_id = st_ppc, actualizado_en = now()
   where id = l1;
  t := pg_temp.grupos(e0, p1); if t = 'sin_confirmar(l)' then ok := ok + 1; else mal := mal || ('H1 pago registrado · Embudo: ' || t); end if;
  insert into public.inscripciones (persona_id, evento_id, precio_pactado, paquete, anticipo, restante, liquidado, estatus_id, asesor_id, notas_migracion)
  values (p1, e0, 1400, 'BASICO', 700, 700, false, st_anticipo, v_vend, 'HISTORIA') returning id into i1;
  insert into public.pagos (inscripcion_id, monto, fecha, banco) values (i1, 700, v_hoy, 'BANCO PRUEBA');
  update public.leads set estatus_id = st_pagado, comentario = 'CERRADO: historia', actualizado_en = now() where id = l1;
  t := pg_temp.grupos(e0, p1); if t = 'anticipo(i)' then ok := ok + 1; else mal := mal || ('H1 confirmado · Embudo: ' || t); end if;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H1 vigilante: ' || rojos); end if;

  -- ===== H2. Registrar pago → "No se encontró" =====
  insert into public.personas (nombre, telefono_principal) values ('HISTORIA DOS', '0000000102') returning id into p2;
  insert into public.leads (persona_id, evento_id, estatus_id, asesor_id, ciudad_interes_id)
  values (p2, e0, st_intento, v_vend, (select ciudad_id from public.eventos where id = e0)) returning id into l2;
  update public.leads set pago_reportado_monto = 700, pago_reportado_fecha = v_hoy, pago_reportado_banco = 'BANCO PRUEBA',
         pago_reportado_por = v_yo, pago_reportado_en = now(), estatus_antes_de_reporte = estatus_id, estatus_id = st_ppc, actualizado_en = now()
   where id = l2;
  update public.leads set estatus_id = estatus_antes_de_reporte, estatus_antes_de_reporte = null, pago_reportado_monto = null, pago_reportado_fecha = null,
         pago_reportado_banco = null, pago_reportado_por = null, pago_reportado_en = null, comentario = 'PAGO NO ENCONTRADO: historia', actualizado_en = now()
   where id = l2;
  t := pg_temp.grupos(e0, p2); if t = 'sin_respuesta(l)' then ok := ok + 1; else mal := mal || ('H2 no se encontró · Embudo: ' || t); end if;
  if not exists (select 1 from public.inscripciones where persona_id = p2) then ok := ok + 1; else mal := mal || 'H2 quedó inscrita sin pago confirmado'::text; end if;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H2 vigilante: ' || rojos); end if;

  -- ===== H3. Inscrita → Cambiar de curso a uno con cambio de fecha → Aceptó → otro curso con cambio =====
  update public.inscripciones set evento_id = ea, notas_migracion = notas_migracion || ' || CAMBIÓ DE CURSO (historia)' where id = i1;
  if (select evento_id from public.leads where id = l1) = ea then ok := ok + 1; else mal := mal || 'H3 su lead se quedó en el curso anterior'::text; end if;
  t := pg_temp.lista(ea, p1); if t like 'inscrita:sin_avisar:%' then ok := ok + 1; else mal := mal || ('H3 lista del curso nuevo: ' || t); end if;
  t := pg_temp.grupos(ea, p1) || ' / antes: ' || pg_temp.grupos(e0, p1);
  if t = 'anticipo(i) / antes: -' then ok := ok + 1; else mal := mal || ('H3 Embudo: ' || t); end if;
  select a.id into a1 from public.cambio_fecha_avisos a where a.persona_id = p1 and a.inscripcion_id = i1
     and a.cambio_id = (select c.id from public.cambios_fecha c where c.evento_id = ea order by c.creado_en desc limit 1);
  perform public.cambio_fecha_marcar(a1, 'acepto', null);
  update public.inscripciones set evento_id = eb where id = i1;
  t := pg_temp.lista(eb, p1) || ' / antes: ' || pg_temp.lista(ea, p1);
  if t = 'inscrita:sin_avisar:otro_curso / antes: -' then ok := ok + 1; else mal := mal || ('H3 segundo cambio · listas: ' || t); end if;
  if exists (select 1 from public.cambio_fecha_avisos a join public.cambios_fecha c on c.id = a.cambio_id
              where a.persona_id = p1 and c.evento_id = eb and a.origen_nota like '%allá estaba: Aceptó%') then ok := ok + 1;
  else mal := mal || 'H3 la nota no dice qué tenía en el curso anterior'::text; end if;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H3 vigilante: ' || rojos); end if;

  -- ===== H4. Inscrita → Ceder su lugar a otra persona =====
  insert into public.personas (nombre, telefono_principal) values ('HISTORIA CUATRO', '0000000104') returning id into p4;
  perform public.ceder_lugar(i1, p4, 'Prueba de historia');
  t := pg_temp.lista(eb, p4) || ' / la que cedió: ' || pg_temp.lista(eb, p1);
  if t like 'inscrita:%' || ' / la que cedió: -' then ok := ok + 1; else mal := mal || ('H4 lista: ' || t); end if;
  t := pg_temp.grupos(eb, p4) || ' / la que cedió: ' || pg_temp.grupos(eb, p1);
  if t = 'anticipo(i) / la que cedió: -' then ok := ok + 1; else mal := mal || ('H4 Embudo: ' || t); end if;
  if exists (select 1 from public.leads where persona_id = p4) then ok := ok + 1; else mal := mal || 'H4 quien recibió el lugar no tiene lead'::text; end if;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H4 vigilante: ' || rojos); end if;

  -- ===== H5. Lead capturado después del cambio de fecha → Aceptó → paga =====
  insert into public.personas (nombre, telefono_principal) values ('HISTORIA CINCO', '0000000105') returning id into p3;
  insert into public.leads (persona_id, evento_id, estatus_id, asesor_id, ciudad_interes_id)
  values (p3, ea, st_novence, v_vend, (select ciudad_id from public.eventos where id = ea)) returning id into l3;
  t := pg_temp.lista(ea, p3); if t = 'lead:sin_avisar:nueva' then ok := ok + 1; else mal := mal || ('H5 lead nuevo · lista: ' || t); end if;
  select a.id into a3 from public.cambio_fecha_avisos a where a.persona_id = p3
     and a.cambio_id = (select c.id from public.cambios_fecha c where c.evento_id = ea order by c.creado_en desc limit 1);
  perform public.cambio_fecha_marcar(a3, 'acepto', null);
  update public.leads set pago_reportado_monto = 700, pago_reportado_fecha = v_hoy, pago_reportado_banco = 'BANCO PRUEBA',
         pago_reportado_por = v_yo, pago_reportado_en = now(), estatus_antes_de_reporte = estatus_id, estatus_id = st_ppc, actualizado_en = now()
   where id = l3;
  t := pg_temp.lista(ea, p3); if t = 'lead:acepto:nueva' then ok := ok + 1; else mal := mal || ('H5 pago reportado · lista: ' || t); end if;
  insert into public.inscripciones (persona_id, evento_id, precio_pactado, paquete, anticipo, restante, liquidado, estatus_id, asesor_id, notas_migracion)
  values (p3, ea, 1400, 'BASICO', 700, 700, false, st_anticipo, v_vend, 'HISTORIA') returning id into i3;
  insert into public.pagos (inscripcion_id, monto, fecha, banco) values (i3, 700, v_hoy, 'BANCO PRUEBA');
  update public.leads set estatus_id = st_pagado, comentario = 'CERRADO: historia', actualizado_en = now() where id = l3;
  t := pg_temp.lista(ea, p3); if t = 'inscrita:acepto:nueva' then ok := ok + 1; else mal := mal || ('H5 inscrita · lista: ' || t); end if;
  perform public.cambio_fecha_regalo(a3, 'Pan de muerto', false);
  if (select regalo_curso from public.cambio_fecha_avisos where id = a3) = 'Pan de muerto' then ok := ok + 1; else mal := mal || 'H5 no se pudo registrar su regalo'::text; end if;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H5 vigilante: ' || rojos); end if;

  -- ===== H6. Inscrita → pide reembolso → Cobranza cierra su lugar =====
  perform public.cambio_fecha_regalo_quitar(a3, 'historia');   -- con regalo no se puede pasar a reembolso: primero se quita
  perform public.cambio_fecha_marcar(a3, 'reembolso', 'historia');
  perform public.cambio_fecha_cerrar_reembolso(a3, 'historia');
  t := pg_temp.grupos(ea, p3); if t = 'no_van(i)' then ok := ok + 1; else mal := mal || ('H6 Embudo: ' || t); end if;
  t := pg_temp.lista(ea, p3); if t like 'inscrita:reembolsada:%' then ok := ok + 1; else mal := mal || ('H6 lista: ' || t); end if;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H6 vigilante: ' || rojos); end if;

  -- ===== H7. Inscrita sin pago → le ponen la promesa en la pestaña Lead → queda en su ficha (caso del 28 oct) =====
  insert into public.personas (nombre, telefono_principal) values ('HISTORIA SIETE', '0000000107') returning id into p2;
  insert into public.inscripciones (persona_id, evento_id, precio_pactado, paquete, anticipo, restante, liquidado, estatus_id, asesor_id, notas_migracion)
  values (p2, e0, 1400, 'BASICO', 0, 1400, false, st_ppc, v_vend, 'HISTORIA') returning id into i3;
  select id into l2 from public.leads where persona_id = p2 limit 1;   -- su lead "Inscrita" (lo crea la base)
  update public.leads set estatus_id = st_novence, fecha_compromiso_pago = v_hoy + 5, actualizado_en = now() where id = l2;
  if (select fecha_proximo_pago from public.inscripciones where id = i3) = v_hoy + 5 then ok := ok + 1; else mal := mal || 'H7 la promesa no pasó a su ficha'::text; end if;
  if (select estatus_id from public.leads where id = l2) = st_pagado then ok := ok + 1; else mal := mal || 'H7 su lead se reabrió'::text; end if;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H7 vigilante: ' || rojos); end if;

  -- ===== H8. Vendedora con un lead abierto → se da de baja → el vigilante pide reasignarlo; candados de Usuarios =====
  perform set_config('request.jwt.claims', '', true);   -- como la función usuarios (llave de servicio)
  insert into public.usuarios (nombre, rol, email, es_vendedor, bienvenida_pendiente)
  values ('HISTORIA VENDEDORA', 'Ventas', 'historia8@ejemplo.invalid', true, true) returning id into u8;
  insert into public.personas (nombre, telefono_principal) values ('HISTORIA OCHO', '0000000108') returning id into p8;
  insert into public.leads (persona_id, evento_id, estatus_id, asesor_id, ciudad_interes_id)
  values (p8, e0, st_novence, u8, (select ciudad_id from public.eventos where id = e0)) returning id into l8;
  update public.usuarios set activo = false, baja_en = now(), es_vendedor = false where id = u8;
  if exists (select 1 from jsonb_array_elements(public.vigilante_calcular()) x, jsonb_array_elements(x -> 'casos') c
              where x ->> 'regla' = 'leads_de_usuario_de_baja' and c ->> 'lead_id' = l8::text) then ok := ok + 1;
  else mal := mal || 'H8 el vigilante no ve el lead abierto de la vendedora dada de baja'::text; end if;
  -- Otro administrador (no recibe los tickets): no hace administradores ni reactiva a mano
  select auth_user_id into v_otro_admin from public.usuarios where es_admin and not recibe_pedidos and activo and auth_user_id is not null limit 1;
  if v_otro_admin is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', v_otro_admin, 'role', 'authenticated')::text, true);
    begin update public.usuarios set es_admin = true where id = u8; mal := mal || 'H8 otro administrador pudo hacer administrador a alguien'::text;
    exception when insufficient_privilege then ok := ok + 1; end;
    begin update public.usuarios set activo = true where id = u8; mal := mal || 'H8 se pudo reactivar a mano, sin la función'::text;
    exception when insufficient_privilege then ok := ok + 1; end;
    begin delete from public.usuarios where id = u8; mal := mal || 'H8 se pudo borrar un usuario'::text;
    exception when others then ok := ok + 1; end;
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  begin update public.usuarios set es_admin = true where id = u8; ok := ok + 1;
  exception when others then mal := mal || ('H8 quien recibe los tickets no pudo hacer administrador: ' || sqlerrm); end;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H8 vigilante: ' || rojos); end if;

  -- ===== H9. Una vendedora cede un lugar (abierto para todos, 30 oct) → se hace y a Cobranza le llega el aviso =====
  perform set_config('request.jwt.claims', json_build_object('sub', (select auth_user_id from public.usuarios where rol = 'Ventas' and activo and auth_user_id is not null limit 1), 'role', 'authenticated')::text, true);
  insert into public.personas (nombre, telefono_principal) values ('HISTORIA NUEVE', '0000000109') returning id into p8;
  insert into public.inscripciones (persona_id, evento_id, precio_pactado, paquete, anticipo, restante, liquidado, estatus_id, asesor_id, notas_migracion)
  values (p4, e0, 1400, 'BASICO', 700, 700, false, st_anticipo, v_vend, 'HISTORIA') returning id into i3;
  select count(*) into ok_av from public.notas_usuario where de_sistema and texto like 'Cedió su lugar%';
  perform public.ceder_lugar(i3, p8, 'Historia: la vendedora cede');
  if (select persona_id from public.inscripciones where id = i3) = p8 then ok := ok + 1; else mal := mal || 'H9 la vendedora no pudo ceder el lugar'::text; end if;
  if (select count(*) from public.notas_usuario where de_sistema and texto like 'Cedió su lugar%') > ok_av then ok := ok + 1; else mal := mal || 'H9 a Cobranza no le llegó el aviso'::text; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H9 vigilante: ' || rojos); end if;

  -- ===== H10. Cambio de fecha: con regalo la decisión es firme; se quita el regalo y entonces sí se puede regresar (30 oct) =====
  declare av uuid;
  begin
    select id into av from public.cambio_fecha_avisos where estado = 'acepto' and regalo_curso is not null and inscripcion_id is not null limit 1;
    if av is null then ok := ok + 3;
    else
      begin perform public.cambio_fecha_marcar(av, 'sin_avisar', null); mal := mal || 'H10 se pudo regresar a "Sin avisar" a alguien con regalo'::text;
      exception when others then ok := ok + 1; end;
      perform public.cambio_fecha_regalo_quitar(av, 'Historia');
      if (select regalo_curso from public.cambio_fecha_avisos where id = av) is null then ok := ok + 1; else mal := mal || 'H10 no se quitó el regalo'::text; end if;
      begin perform public.cambio_fecha_marcar(av, 'sin_avisar', null); ok := ok + 1;
      exception when others then mal := mal || ('H10 sin regalo no se pudo regresar: ' || sqlerrm); end;
    end if;
  end;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H10 vigilante: ' || rojos); end if;

  -- ===== H11. Lead con fecha de anticipo y sin monto → el vigilante lo cuenta; con monto, ya no (31 oct) =====
  -- (se compara la cuenta: la lista de casos del vigilante trae solo los primeros 50)
  select (x ->> 'n')::int into ok_av from jsonb_array_elements(public.vigilante_calcular()) x where x ->> 'regla' = 'lead_fecha_sin_monto';
  insert into public.personas (nombre, telefono_principal) values ('HISTORIA ONCE', '0000000111') returning id into p8;
  insert into public.leads (persona_id, evento_id, estatus_id, asesor_id, ciudad_interes_id, fecha_compromiso_pago)
  values (p8, e0, st_novence, v_vend, (select ciudad_id from public.eventos where id = e0), v_hoy + 2) returning id into l8;
  if (select (x ->> 'n')::int from jsonb_array_elements(public.vigilante_calcular()) x where x ->> 'regla' = 'lead_fecha_sin_monto') = ok_av + 1 then ok := ok + 1;
  else mal := mal || 'H11 el vigilante no cuenta el lead con fecha y sin monto'::text; end if;
  update public.leads set monto_anticipo = 700 where id = l8;
  if (select (x ->> 'n')::int from jsonb_array_elements(public.vigilante_calcular()) x where x ->> 'regla' = 'lead_fecha_sin_monto') = ok_av then ok := ok + 1;
  else mal := mal || 'H11 con monto el vigilante lo sigue contando'::text; end if;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H11 vigilante: ' || rojos); end if;

  -- ===== H12. Lead de una ciudad sin curso en la gira → a quien organiza la ruta (Gerente) le llega UNA tarea por ciudad (3 nov) =====
  declare v_cs uuid; v_l1 uuid; v_l2 uuid; v_p uuid;
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', (select auth_user_id from public.usuarios where rol = 'Ventas' and activo and auth_user_id is not null limit 1), 'role', 'authenticated')::text, true);
    select c.id into v_cs from public.ciudades c
     where not exists (select 1 from public.eventos e where e.ciudad_id = c.id and e.fecha >= v_hoy)
       and not exists (select 1 from public.notas_usuario n where n.enlace ->> 'ciudad_sin_curso' = c.id::text) limit 1;
    insert into public.personas (nombre, telefono_principal) values ('HISTORIA DOCE', '0000000112') returning id into v_p;
    insert into public.leads (persona_id, estatus_id, asesor_id, ciudad_interes_id) values (v_p, st_novence, v_vend, v_cs) returning id into v_l1;
    perform public.avisar_ciudad_sin_curso(v_l1);
    insert into public.personas (nombre, telefono_principal) values ('HISTORIA DOCE B', '0000000113') returning id into v_p;
    insert into public.leads (persona_id, estatus_id, asesor_id, ciudad_interes_id) values (v_p, st_novence, v_vend, v_cs) returning id into v_l2;
    perform public.avisar_ciudad_sin_curso(v_l2);
    if (select count(*) from public.notas_usuario n join public.usuarios u on u.id = n.usuario_id
         where u.rol = 'Gerente' and n.enlace ->> 'ciudad_sin_curso' = v_cs::text and not n.completado) = (select count(*) from public.usuarios where rol = 'Gerente' and activo)
       and (select count(*) from public.usuarios where rol = 'Gerente' and activo) > 0 then ok := ok + 1;
    else mal := mal || 'H12 no le llegó (o le llegó repetida) la tarea de la ciudad sin curso a quien organiza la ruta'::text; end if;
    if exists (select 1 from public.notas_usuario n where n.enlace ->> 'ciudad_sin_curso' = v_cs::text and n.texto ~ ' ([2-9]|[1-9][0-9]+) leads esperando') then ok := ok + 1;   -- (esa ciudad puede tener otros leads sin curso)
    else mal := mal || 'H12 la tarea no lleva la cuenta de leads de esa ciudad'::text; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  end;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H12 vigilante: ' || rojos); end if;

  -- ===== H13. Dos giras a la vez (5 nov): inscrita en una gira sin precio → el vigilante la marca en rojo y el Embudo la cuenta
  --       en su gira; al capturar el precio, la base le calcula lo que debe y, con Básico y VIP, la tarea de Jared se cierra =====
  declare v_em uuid; v_cm uuid; v_p uuid; v_i uuid; v_pb numeric; v_pv numeric;
  begin
    select e.id, e.curso_id into v_em, v_cm from public.eventos e
     where e.fecha > v_hoy and e.curso_id in (select public.cursos_vigentes()) and public.precio_paquete(e.curso_id, 'BASICO') is null
     order by e.fecha limit 1;
    if v_em is null then ok := ok + 5;   -- todas las giras ya tienen precio: no hay qué probar
    else
      insert into public.personas (nombre, telefono_principal) values ('HISTORIA TRECE', '0000000114') returning id into v_p;
      insert into public.inscripciones (persona_id, evento_id, precio_pactado, paquete, anticipo, restante, liquidado, estatus_id, asesor_id, notas_migracion)
      values (v_p, v_em, null, 'BASICO', 700, null, false, st_anticipo, v_vend, 'HISTORIA') returning id into v_i;
      insert into public.pagos (inscripcion_id, monto, fecha, banco) values (v_i, 700, v_hoy, 'BANCO PRUEBA');
      if exists (select 1 from jsonb_array_elements(public.vigilante_calcular()) x, jsonb_array_elements(x -> 'casos') c
                  where x ->> 'regla' = 'inscrita_curso_sin_precio' and c ->> 'inscripcion_id' = v_i::text) then ok := ok + 1;
      else mal := mal || 'H13 el vigilante no marca a la inscrita de una gira sin precio'::text; end if;
      t := pg_temp.grupos(v_em, v_p); if t = 'anticipo(i)' then ok := ok + 1; else mal := mal || ('H13 Embudo (sin precio no es liquidada): ' || t); end if;
      select precio into v_pb from public.precios where curso_id = v_cm and paquete = 'BASICO';
      select precio into v_pv from public.precios where curso_id = v_cm and paquete = 'VIP';
      update public.precios set precio = 1500 where curso_id = v_cm and paquete = 'BASICO';
      if (select precio_pactado = 1500 and restante = 800 and not liquidado from public.inscripciones where id = v_i) then ok := ok + 1;
      else mal := mal || 'H13 al capturar el precio no se le calculó lo que debe'::text; end if;
      rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H13 vigilante: ' || rojos); end if;
      update public.precios set precio = 2000 where curso_id = v_cm and paquete = 'VIP';
      if not exists (select 1 from public.notas_usuario n where n.de_sistema and not n.completado and n.enlace ->> 'curso_sin_precio' = v_cm::text) then ok := ok + 1;
      else mal := mal || 'H13 con Básico y VIP la tarea de capturar el precio sigue abierta'::text; end if;
    end if;
  end;

  -- ===== H14. Curso en línea (5 nov): vende la vendedora → registra el pago (por confirmar) → ella no lo puede confirmar ni meterlo
  --       directo → "no llegó" lo regresa a Prometida → pago nuevo confirmado → liquidada → acceso con cupón. La gira no lo cuenta =====
  declare v_vauth uuid; v_p uuid; v_v uuid; v_pg1 uuid; v_pg2 uuid; v_k uuid; v_gira numeric;
  begin
    select auth_user_id into v_vauth from public.usuarios where rol = 'Ventas' and activo and not es_admin and auth_user_id is not null limit 1;
    select id into v_k from public.cursos_en_linea order by orden limit 1;
    select coalesce(sum(monto), 0) into v_gira from public.pagos;
    perform set_config('request.jwt.claims', json_build_object('sub', v_vauth, 'role', 'authenticated')::text, true);
    insert into public.personas (nombre, telefono_principal) values ('HISTORIA CATORCE', '0000000115') returning id into v_p;
    v_v := public.venta_en_linea_crear(v_p, v_k, 900, v_hoy + 2, null, 'historia');
    if (select estado from public.venta_en_linea_resumen(v_v)) = 'prometida' then ok := ok + 1; else mal := mal || 'H14 recién vendida no es Prometida'::text; end if;
    v_pg1 := public.pago_en_linea_registrar(v_v, 900, v_hoy, 'BANCO PRUEBA', null);
    if (select estado from public.venta_en_linea_resumen(v_v)) = 'por_confirmar' then ok := ok + 1; else mal := mal || 'H14 pagada y sin confirmar no es Por confirmar'::text; end if;
    begin perform public.pago_en_linea_confirmar(v_pg1, true); mal := mal || 'H14 una vendedora sin permiso pudo confirmar'::text;
    exception when insufficient_privilege then ok := ok + 1; end;
    execute 'set local role authenticated';   -- como el Hub: con el rol del equipo, no como dueño de la base
    begin insert into public.pagos_en_linea (venta_id, monto, fecha, verificacion) values (v_v, 1, v_hoy, 'confirmado'); mal := mal || 'H14 se pudo meter un pago confirmado directo a la tabla'::text;
    exception when others then ok := ok + 1; end;
    begin update public.ventas_en_linea set acceso_dado_en = now() where id = v_v;
      if (select acceso_dado_en from public.ventas_en_linea where id = v_v) is null then ok := ok + 1; else mal := mal || 'H14 se pudo dar acceso directo en la tabla'::text; end if;
    exception when others then ok := ok + 1; end;
    execute 'reset role';
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    begin perform public.venta_en_linea_dar_acceso(v_v, 'CUPON1'); mal := mal || 'H14 dio acceso sin estar confirmada'::text;
    exception when others then ok := ok + 1; end;
    perform public.pago_en_linea_confirmar(v_pg1, false);
    if (select estado from public.venta_en_linea_resumen(v_v)) = 'prometida' then ok := ok + 1; else mal := mal || 'H14 con el pago que no llegó no regresó a Prometida'::text; end if;
    v_pg2 := public.pago_en_linea_registrar(v_v, 900, v_hoy, 'BANCO PRUEBA', null);
    perform public.pago_en_linea_confirmar(v_pg2, true);
    if (select estado from public.venta_en_linea_resumen(v_v)) = 'liquidada' then ok := ok + 1; else mal := mal || 'H14 confirmada no quedó Liquidada'::text; end if;
    perform public.venta_en_linea_dar_acceso(v_v, 'CUPON1');
    if (select estado from public.venta_en_linea_resumen(v_v)) = 'con_acceso' and (select cupon from public.ventas_en_linea where id = v_v) = 'CUPON1' then ok := ok + 1;
    else mal := mal || 'H14 no quedó Con acceso con su cupón'::text; end if;
    if (select coalesce(sum(monto), 0) from public.pagos) = v_gira then ok := ok + 1; else mal := mal || 'H14 el pago en línea se metió a los pagos de la gira'::text; end if;
    begin delete from public.ventas_en_linea where id = v_v; mal := mal || 'H14 se pudo borrar una venta en línea'::text;
    exception when others then ok := ok + 1; end;
  end;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H14 vigilante: ' || rojos); end if;

  /* H15 (6 nov 2026) Segundo pago prometido: la vendedora anota cuándo y cuánto va a dar después del anticipo;
     si paga menos, la promesa se queda con lo que falta de ella; si la cumple, la base la quita sola;
     el anticipo con el que se inscribe no la toca; al ceder su lugar, la promesa se quita. */
  declare v_p uuid; v_p2 uuid; v_i uuid;
  begin
    insert into public.personas (nombre, telefono_principal) values ('HISTORIA QUINCE', '0000000116') returning id into v_p;
    insert into public.inscripciones (persona_id, evento_id, precio_pactado, paquete, anticipo, restante, liquidado, estatus_id, asesor_id, notas_migracion, fecha_proximo_pago, monto_proximo_pago)
    values (v_p, e0, 1400, 'BASICO', 700, 700, false, st_anticipo, v_vend, 'HISTORIA', v_hoy + 6, 500) returning id into v_i;
    insert into public.pagos (inscripcion_id, monto, fecha, banco) values (v_i, 700, v_hoy, 'BANCO PRUEBA');
    if (select fecha_proximo_pago = v_hoy + 6 and monto_proximo_pago = 500 from public.inscripciones where id = v_i) then ok := ok + 1;
    else mal := mal || 'H15 el anticipo con el que se inscribió le quitó su promesa'::text; end if;
    update public.inscripciones set creado_en = now() - interval '1 day' where id = v_i;
    insert into public.pagos (inscripcion_id, monto, fecha, banco) values (v_i, 200, v_hoy, 'BANCO PRUEBA');
    if (select fecha_proximo_pago = v_hoy + 6 and monto_proximo_pago = 300 from public.inscripciones where id = v_i) then ok := ok + 1;
    else mal := mal || 'H15 pagó menos de lo prometido y la promesa no quedó con lo que falta'::text; end if;
    insert into public.pagos (inscripcion_id, monto, fecha, banco) values (v_i, 300, v_hoy, 'BANCO PRUEBA');
    if (select fecha_proximo_pago is null and monto_proximo_pago is null from public.inscripciones where id = v_i) then ok := ok + 1;
    else mal := mal || 'H15 cumplió su promesa y siguió con fecha (saldría vencida)'::text; end if;
    update public.inscripciones set fecha_proximo_pago = v_hoy + 9, monto_proximo_pago = 100 where id = v_i;
    insert into public.personas (nombre, telefono_principal) values ('HISTORIA QUINCE B', '0000000117') returning id into v_p2;
    perform public.ceder_lugar(v_i, v_p2, 'Historia: promesa al ceder');
    if (select fecha_proximo_pago is null and monto_proximo_pago is null from public.inscripciones where id = v_i) then ok := ok + 1;
    else mal := mal || 'H15 al ceder el lugar se quedó la promesa de quien cedió'::text; end if;
  end;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H15 vigilante: ' || rojos); end if;
  /* H16 (10 nov 2026) a) Cobranza cambia la fecha de pago en la ficha: la promesa vieja de su lead se quita (caso Karina).
     b) Curso con fecha por definir: se crea una sola vez por ciudad y gira, avisa a Jared, cuenta en el Embudo y,
        al ponerle fecha un administrador, la tarea se cierra y el curso deja de estar "por definir". */
  declare v_p uuid; v_l uuid; v_i uuid; v_cur uuid; v_ciu uuid; v_ev uuid; v_ev2 uuid;
  begin
    insert into public.personas (nombre, telefono_principal) values ('HISTORIA DIECISEIS', '0000000118') returning id into v_p;
    insert into public.inscripciones (persona_id, evento_id, precio_pactado, paquete, anticipo, restante, liquidado, estatus_id, asesor_id, notas_migracion, fecha_proximo_pago)
    values (v_p, e0, 1400, 'BASICO', 0, 1400, false, st_anticipo, v_vend, 'HISTORIA', v_hoy + 3) returning id into v_i;
    select id into v_l from public.leads where persona_id = v_p and evento_id = e0 limit 1;
    if v_l is null then
      insert into public.leads (persona_id, evento_id, estatus_id, asesor_id, ciudad_interes_id) values (v_p, e0, st_anticipo, v_vend, (select ciudad_id from public.eventos where id = e0)) returning id into v_l;
    end if;
    update public.leads set fecha_compromiso_pago = v_hoy + 3, estatus_id = st_anticipo where id = v_l;
    update public.inscripciones set fecha_proximo_pago = v_hoy + 20 where id = v_i;
    if (select fecha_compromiso_pago from public.leads where id = v_l) is null then ok := ok + 1;
    else mal := mal || 'H16 Cobranza cambió la fecha en la ficha y la promesa vieja se quedó en su lead'::text; end if;
    select c into v_cur from public.cursos_vigentes() c limit 1;
    select ci.id into v_ciu from public.ciudades ci
     where not exists (select 1 from public.eventos e where e.ciudad_id = ci.id and e.curso_id = v_cur and (e.fecha >= v_hoy or e.fecha_por_definir)) limit 1;
    v_ev := public.curso_por_definir(v_ciu, v_cur);
    v_ev2 := public.curso_por_definir(v_ciu, v_cur);
    if v_ev = v_ev2 and (select fecha is null and fecha_por_definir from public.eventos where id = v_ev) then ok := ok + 1;
    else mal := mal || 'H16 curso por definir duplicado o con fecha'::text; end if;
    if (select count(*) from public.notas_usuario where enlace ->> 'curso_por_definir' = v_ev::text and not completado) = (select count(*) from public.usuarios where rol = 'Gerente' and activo) then ok := ok + 1;
    else mal := mal || 'H16 a Jared no le llegó (o le llegó repetida) la tarea de ponerle fecha'::text; end if;
    insert into public.personas (nombre, telefono_principal) values ('HISTORIA DIECISEIS B', '0000000119') returning id into v_p;
    insert into public.inscripciones (persona_id, evento_id, precio_pactado, paquete, anticipo, restante, liquidado, estatus_id, asesor_id, notas_migracion)
    values (v_p, v_ev, 1400, 'BASICO', 700, 700, false, st_anticipo, v_vend, 'HISTORIA') returning id into v_i;
    insert into public.pagos (inscripcion_id, monto, fecha, banco) values (v_i, 700, v_hoy, 'BANCO PRUEBA');
    if exists (select 1 from public.embudo_cursos(v_cur, v_hoy, v_ev) x where x.inscripcion_id = v_i and x.grupo = 'anticipo') then ok := ok + 1;
    else mal := mal || 'H16 el Embudo no cuenta a la inscrita del curso por definir'::text; end if;
    rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H16 vigilante (por definir): ' || rojos); end if;
    perform public.curso_poner_fecha(v_ev, v_hoy + 40);
    if (select fecha = v_hoy + 40 and not fecha_por_definir from public.eventos where id = v_ev)
       and not exists (select 1 from public.notas_usuario where enlace ->> 'curso_por_definir' = v_ev::text and not completado) then ok := ok + 1;
    else mal := mal || 'H16 al ponerle fecha no quedó fechado o la tarea siguió abierta'::text; end if;
  end;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H16 vigilante: ' || rojos); end if;
  raise exception 'HISTORIAS fallas=% bien=% | %', coalesce(array_length(mal, 1), 0), ok, array_to_string(mal, ' || ');
end $historias$;
