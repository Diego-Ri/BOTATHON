-- =============================================================================
-- 06 · Ingesta, cálculo, simulación y vistas de dashboard
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers de parseo (tolerantes a formatos de Excel)
-- -----------------------------------------------------------------------------
create or replace function public.fn_parse_date(p_text text)
returns date
language plpgsql
immutable
as $$
begin
  if p_text is null or btrim(p_text) = '' then
    return null;
  end if;
  if btrim(p_text) ~ '^\d{4}-\d{2}-\d{2}' then
    return btrim(p_text)::date;
  end if;
  if btrim(p_text) ~ '^\d{2}/\d{2}/\d{4}$' then
    return to_date(btrim(p_text), 'DD/MM/YYYY');
  end if;
  return null;
exception when others then
  return null;
end;
$$;

create or replace function public.fn_parse_numeric(p_text text)
returns numeric
language plpgsql
immutable
as $$
begin
  if p_text is null or btrim(p_text) = '' then
    return null;
  end if;
  return replace(btrim(p_text), ',', '.')::numeric;
exception when others then
  return null;
end;
$$;

create or replace function public.fn_jwt_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    case
      when nullif(current_setting('request.jwt.claims', true), '') is not null
        then (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
    end
  );
$$;

-- -----------------------------------------------------------------------------
-- RPC: ingesta de reporte BUK
-- p_registros: arreglo JSON de filas del reporte.
-- Devuelve: importacion_id, filas_total, filas_ok, filas_error, advertencias.
-- -----------------------------------------------------------------------------
create or replace function public.rpc_ingestar_buk(
  p_archivo text,
  p_hash text,
  p_anio int,
  p_mes int,
  p_registros jsonb,
  p_usuario uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_registros jsonb := p_registros;
  v_hash text;
  v_import_id uuid;
  v_existing uuid;
  v_row jsonb;
  v_idx int := 0;
  v_ok int := 0;
  v_errores int := 0;
  v_warnings int := 0;
  v_error text;
  v_error_col text;
  v_codigo text;
  v_nombre text;
  v_inst_codigo text;
  v_cargo_nombre text;
  v_tipo_nombre text;
  v_reemplaza_codigo text;
  v_horas numeric;
  v_anio int;
  v_mes int;
  v_fecha_inicio date;
  v_fecha_termino date;
  v_es_vacante boolean;
  v_es_reemplazo boolean;
  v_incluir boolean;
  v_prof_id uuid;
  v_inst_id uuid;
  v_cargo_id uuid;
  v_tipo_id uuid;
  v_reemplazo_id uuid;
  v_old_id uuid;
  v_old_horas numeric;
  v_old_cargo uuid;
  v_old_tipo uuid;
  v_old_inicio date;
  v_old_fin date;
  v_old_vacante boolean;
  v_new_id uuid;
begin
  if coalesce(public.fn_jwt_role(), '') not in ('', 'service_role', 'authenticated') then
    raise exception 'No autorizado para ingestar reportes' using errcode = '42501';
  end if;
  if public.fn_jwt_role() = 'authenticated'
     and coalesce(public.current_rol(), '') <> 'planificacion_central' then
    raise exception 'Solo planificación central puede ingestar reportes' using errcode = '42501';
  end if;

  if v_registros is null then
    raise exception 'p_registros es obligatorio';
  end if;
  if jsonb_typeof(v_registros) = 'object' then
    v_registros := coalesce(v_registros->'registros', v_registros->'rows', '[]'::jsonb);
  end if;
  if jsonb_typeof(v_registros) <> 'array' then
    raise exception 'p_registros debe ser un arreglo JSON';
  end if;

  v_hash := coalesce(nullif(btrim(p_hash), ''), md5(v_registros::text));

  select id into v_existing
  from public.importaciones
  where fuente = 'BUK' and archivo_hash = v_hash;

  if v_existing is not null then
    return jsonb_build_object(
      'importacion_id', v_existing,
      'duplicada', true,
      'filas_total', (select filas_total from public.importaciones where id = v_existing),
      'filas_ok', (select filas_ok from public.importaciones where id = v_existing),
      'filas_error', (select filas_error from public.importaciones where id = v_existing)
    );
  end if;

  insert into public.importaciones
    (fuente, archivo_nombre, archivo_hash, periodo_anio, periodo_mes, estado, usuario_id)
  values
    ('BUK', coalesce(p_archivo, 'reporte_buk.xlsx'), v_hash, p_anio, p_mes, 'procesando',
     coalesce(p_usuario, auth.uid()))
  returning id into v_import_id;

  for v_row in select value from jsonb_array_elements(v_registros) loop
    v_idx := v_idx + 1;
    v_error := null;
    v_error_col := null;
    v_inst_id := null;
    v_cargo_id := null;
    v_tipo_id := null;
    v_reemplazo_id := null;

    if jsonb_typeof(v_row) <> 'object' then
      v_error := 'La fila no es un objeto JSON';
      v_error_col := 'fila';
    end if;

    if v_error is null then
      v_codigo := nullif(btrim(coalesce(v_row->>'profesional_codigo', v_row->>'codigo_profesional', v_row->>'codigo', '')), '');
      v_nombre := nullif(btrim(coalesce(v_row->>'nombre', v_row->>'nombre_profesional', '')), '');
      v_inst_codigo := nullif(btrim(coalesce(v_row->>'instituto_codigo', v_row->>'codigo_instituto', v_row->>'instituto', '')), '');
      v_cargo_nombre := nullif(btrim(coalesce(v_row->>'cargo', v_row->>'cargo_nombre', '')), '');
      v_tipo_nombre := nullif(btrim(coalesce(v_row->>'tipo_contrato', v_row->>'contrato', '')), '');
      v_reemplaza_codigo := nullif(btrim(coalesce(v_row->>'reemplaza_a', v_row->>'reemplaza_codigo', '')), '');
      v_horas := public.fn_parse_numeric(coalesce(v_row->>'horas_semanales', v_row->>'horas', ''));
      v_fecha_inicio := public.fn_parse_date(coalesce(v_row->>'fecha_inicio', v_row->>'inicio', ''));
      v_fecha_termino := public.fn_parse_date(coalesce(v_row->>'fecha_termino', v_row->>'termino', ''));
      v_anio := coalesce(public.fn_parse_numeric(v_row->>'anio')::int, p_anio);
      v_mes := coalesce(public.fn_parse_numeric(v_row->>'mes')::int, p_mes);
      v_es_vacante := lower(coalesce(v_row->>'es_vacante', v_row->>'vacante', 'false'))
                      in ('true', '1', 'si', 'sí', 'x');
      v_incluir := lower(coalesce(v_row->>'incluir_en_planificacion', v_row->>'incluir', 'true'))
                   not in ('false', '0', 'no', 'n');
    end if;

    if v_error is null and v_codigo is null then
      v_error := 'profesional_codigo es obligatorio';
      v_error_col := 'profesional_codigo';
    end if;
    if v_error is null and v_inst_codigo is null then
      v_error := 'instituto_codigo es obligatorio';
      v_error_col := 'instituto_codigo';
    end if;
    if v_error is null and v_cargo_nombre is null then
      v_error := 'cargo es obligatorio';
      v_error_col := 'cargo';
    end if;
    if v_error is null and v_horas is null then
      v_error := 'horas_semanales es obligatorio y numérico';
      v_error_col := 'horas_semanales';
    end if;
    if v_error is null and (v_horas <= 0 or v_horas > 60) then
      v_error := 'horas_semanales debe estar entre 0 y 60';
      v_error_col := 'horas_semanales';
    end if;
    if v_error is null and v_fecha_inicio is null then
      v_error := 'fecha_inicio es obligatoria (YYYY-MM-DD o DD/MM/YYYY)';
      v_error_col := 'fecha_inicio';
    end if;
    if v_error is null and v_fecha_termino is not null and v_fecha_termino < v_fecha_inicio then
      v_error := 'fecha_termino no puede ser anterior a fecha_inicio';
      v_error_col := 'fecha_termino';
    end if;
    if v_error is null and v_anio is null then
      v_error := 'anio es obligatorio';
      v_error_col := 'anio';
    end if;
    if v_error is null and (v_mes is null or v_mes < 1 or v_mes > 12) then
      v_error := 'mes debe estar entre 1 y 12';
      v_error_col := 'mes';
    end if;

    if v_error is null then
      select id into v_inst_id
      from public.institutos
      where lower(codigo) = lower(v_inst_codigo) or lower(nombre) = lower(v_inst_codigo)
      limit 1;
      if v_inst_id is null then
        v_error := 'Instituto no encontrado: ' || v_inst_codigo;
        v_error_col := 'instituto_codigo';
      end if;
    end if;

    if v_error is null then
      select id into v_cargo_id
      from public.cargos
      where lower(nombre) = lower(v_cargo_nombre) or lower(codigo) = lower(v_cargo_nombre)
      limit 1;
      if v_cargo_id is null then
        v_error := 'Cargo no encontrado: ' || v_cargo_nombre;
        v_error_col := 'cargo';
      end if;
    end if;

    if v_error is null and v_tipo_nombre is not null then
      select id into v_tipo_id
      from public.tipos_contrato
      where lower(nombre) = lower(v_tipo_nombre) or lower(codigo) = lower(v_tipo_nombre)
      limit 1;
    end if;

    if v_error is null and v_reemplaza_codigo is not null then
      select id into v_reemplazo_id
      from public.profesionales
      where codigo_buk = v_reemplaza_codigo;
      if v_reemplazo_id is null then
        insert into public.importacion_errores
          (importacion_id, fila, columna, codigo, mensaje, severidad, payload)
        values
          (v_import_id, v_idx, 'reemplaza_a', 'REEMPLAZO_NO_ENCONTRADO',
           'No se encontró el profesional reemplazado: ' || v_reemplaza_codigo, 'warning', v_row);
        v_warnings := v_warnings + 1;
      end if;
    end if;

    v_es_reemplazo := lower(coalesce(v_row->>'es_reemplazo', 'false'))
                      in ('true', '1', 'si', 'sí', 'x')
                      or v_reemplazo_id is not null;

    if v_error is not null then
      insert into public.importacion_errores
        (importacion_id, fila, columna, codigo, mensaje, severidad, payload)
      values
        (v_import_id, v_idx, v_error_col, 'FILA_INVALIDA', v_error, 'error', v_row);

      insert into public.dotacion_registros
        (importacion_id, fila, payload, profesional_codigo, instituto_codigo, anio, mes, valido)
      values
        (v_import_id, v_idx, v_row, v_codigo, v_inst_codigo, v_anio, v_mes, false);

      v_errores := v_errores + 1;
      continue;
    end if;

    insert into public.profesionales (codigo_buk, nombre_seudonimo)
    values (v_codigo, coalesce(v_nombre, v_codigo))
    on conflict (codigo_buk) do update
      set nombre_seudonimo = excluded.nombre_seudonimo
    returning id into v_prof_id;

    select id, horas_semanales, cargo_id, tipo_contrato_id, fecha_inicio, fecha_termino, es_vacante
    into v_old_id, v_old_horas, v_old_cargo, v_old_tipo, v_old_inicio, v_old_fin, v_old_vacante
    from public.dotacion_mensual
    where profesional_id = v_prof_id
      and instituto_id = v_inst_id
      and anio = v_anio
      and mes = v_mes;

    insert into public.dotacion_mensual
      (profesional_id, instituto_id, anio, mes, cargo_id, tipo_contrato_id,
       horas_semanales, fecha_inicio, fecha_termino, reemplaza_a_id,
       es_reemplazo, es_vacante, incluir_en_planificacion, importacion_id)
    values
      (v_prof_id, v_inst_id, v_anio, v_mes, v_cargo_id, v_tipo_id,
       v_horas, v_fecha_inicio, v_fecha_termino, v_reemplazo_id,
       v_es_reemplazo, v_es_vacante, v_incluir, v_import_id)
    on conflict (profesional_id, instituto_id, anio, mes) do update
      set cargo_id = excluded.cargo_id,
          tipo_contrato_id = excluded.tipo_contrato_id,
          horas_semanales = excluded.horas_semanales,
          fecha_inicio = excluded.fecha_inicio,
          fecha_termino = excluded.fecha_termino,
          reemplaza_a_id = excluded.reemplaza_a_id,
          es_reemplazo = excluded.es_reemplazo,
          es_vacante = excluded.es_vacante,
          incluir_en_planificacion = excluded.incluir_en_planificacion,
          importacion_id = excluded.importacion_id,
          updated_at = now()
    returning id into v_new_id;

    -- Diff para trazabilidad
    if v_old_id is not null then
      if v_old_horas is distinct from v_horas then
        insert into public.cambios_dotacion
          (importacion_id, profesional_id, instituto_id, anio, mes, campo, valor_anterior, valor_nuevo, vigencia_desde)
        values
          (v_import_id, v_prof_id, v_inst_id, v_anio, v_mes, 'horas_semanales',
           v_old_horas::text, v_horas::text, make_date(v_anio, v_mes, 1));
      end if;
      if v_old_cargo is distinct from v_cargo_id then
        insert into public.cambios_dotacion
          (importacion_id, profesional_id, instituto_id, anio, mes, campo, valor_anterior, valor_nuevo, vigencia_desde)
        values
          (v_import_id, v_prof_id, v_inst_id, v_anio, v_mes, 'cargo_id',
           v_old_cargo::text, v_cargo_id::text, make_date(v_anio, v_mes, 1));
      end if;
      if v_old_tipo is distinct from v_tipo_id then
        insert into public.cambios_dotacion
          (importacion_id, profesional_id, instituto_id, anio, mes, campo, valor_anterior, valor_nuevo, vigencia_desde)
        values
          (v_import_id, v_prof_id, v_inst_id, v_anio, v_mes, 'tipo_contrato_id',
           v_old_tipo::text, v_tipo_id::text, make_date(v_anio, v_mes, 1));
      end if;
      if v_old_inicio is distinct from v_fecha_inicio then
        insert into public.cambios_dotacion
          (importacion_id, profesional_id, instituto_id, anio, mes, campo, valor_anterior, valor_nuevo, vigencia_desde)
        values
          (v_import_id, v_prof_id, v_inst_id, v_anio, v_mes, 'fecha_inicio',
           v_old_inicio::text, v_fecha_inicio::text, make_date(v_anio, v_mes, 1));
      end if;
      if v_old_fin is distinct from v_fecha_termino then
        insert into public.cambios_dotacion
          (importacion_id, profesional_id, instituto_id, anio, mes, campo, valor_anterior, valor_nuevo, vigencia_desde)
        values
          (v_import_id, v_prof_id, v_inst_id, v_anio, v_mes, 'fecha_termino',
           v_old_fin::text, v_fecha_termino::text, make_date(v_anio, v_mes, 1));
      end if;
      if v_old_vacante is distinct from v_es_vacante then
        insert into public.cambios_dotacion
          (importacion_id, profesional_id, instituto_id, anio, mes, campo, valor_anterior, valor_nuevo, vigencia_desde)
        values
          (v_import_id, v_prof_id, v_inst_id, v_anio, v_mes, 'es_vacante',
           v_old_vacante::text, v_es_vacante::text, make_date(v_anio, v_mes, 1));
      end if;
    end if;

    insert into public.dotacion_registros
      (importacion_id, fila, payload, profesional_codigo, instituto_codigo, anio, mes, valido)
    values
      (v_import_id, v_idx, v_row, v_codigo, v_inst_codigo, v_anio, v_mes, true);

    v_ok := v_ok + 1;
  end loop;

  update public.importaciones
  set filas_total = v_idx,
      filas_ok = v_ok,
      filas_error = v_errores,
      estado = case when v_errores > 0 then 'con_errores' else 'completada' end,
      completed_at = now()
  where id = v_import_id;

  return jsonb_build_object(
    'importacion_id', v_import_id,
    'duplicada', false,
    'filas_total', v_idx,
    'filas_ok', v_ok,
    'filas_error', v_errores,
    'advertencias', v_warnings
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: ingesta de reporte SIC
-- -----------------------------------------------------------------------------
create or replace function public.rpc_ingestar_sic(
  p_archivo text,
  p_hash text,
  p_anio int,
  p_mes int,
  p_registros jsonb,
  p_usuario uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_registros jsonb := p_registros;
  v_hash text;
  v_import_id uuid;
  v_existing uuid;
  v_row jsonb;
  v_idx int := 0;
  v_ok int := 0;
  v_errores int := 0;
  v_error text;
  v_error_col text;
  v_codigo text;
  v_inst_codigo text;
  v_anio int;
  v_mes int;
  v_dir numeric;
  v_ind numeric;
  v_total numeric;
  v_prof_id uuid;
  v_inst_id uuid;
begin
  if coalesce(public.fn_jwt_role(), '') not in ('', 'service_role', 'authenticated') then
    raise exception 'No autorizado para ingestar reportes' using errcode = '42501';
  end if;
  if public.fn_jwt_role() = 'authenticated'
     and coalesce(public.current_rol(), '') <> 'planificacion_central' then
    raise exception 'Solo planificación central puede ingestar reportes' using errcode = '42501';
  end if;

  if v_registros is null then
    raise exception 'p_registros es obligatorio';
  end if;
  if jsonb_typeof(v_registros) = 'object' then
    v_registros := coalesce(v_registros->'registros', v_registros->'rows', '[]'::jsonb);
  end if;
  if jsonb_typeof(v_registros) <> 'array' then
    raise exception 'p_registros debe ser un arreglo JSON';
  end if;

  v_hash := coalesce(nullif(btrim(p_hash), ''), md5(v_registros::text));

  select id into v_existing
  from public.importaciones
  where fuente = 'SIC' and archivo_hash = v_hash;

  if v_existing is not null then
    return jsonb_build_object('importacion_id', v_existing, 'duplicada', true);
  end if;

  insert into public.importaciones
    (fuente, archivo_nombre, archivo_hash, periodo_anio, periodo_mes, estado, usuario_id)
  values
    ('SIC', coalesce(p_archivo, 'reporte_sic.xlsx'), v_hash, p_anio, p_mes, 'procesando',
     coalesce(p_usuario, auth.uid()))
  returning id into v_import_id;

  for v_row in select value from jsonb_array_elements(v_registros) loop
    v_idx := v_idx + 1;
    v_error := null;
    v_error_col := null;
    v_prof_id := null;
    v_inst_id := null;

    if jsonb_typeof(v_row) <> 'object' then
      v_error := 'La fila no es un objeto JSON';
      v_error_col := 'fila';
    end if;

    if v_error is null then
      v_codigo := nullif(btrim(coalesce(v_row->>'profesional_codigo', v_row->>'codigo_profesional', v_row->>'codigo', '')), '');
      v_inst_codigo := nullif(btrim(coalesce(v_row->>'instituto_codigo', v_row->>'codigo_instituto', v_row->>'instituto', '')), '');
      v_anio := coalesce(public.fn_parse_numeric(v_row->>'anio')::int, p_anio);
      v_mes := coalesce(public.fn_parse_numeric(v_row->>'mes')::int, p_mes);
      v_dir := public.fn_parse_numeric(coalesce(v_row->>'atenciones_directas', v_row->>'directas', ''));
      v_ind := public.fn_parse_numeric(coalesce(v_row->>'atenciones_indirectas', v_row->>'indirectas', ''));
      v_total := public.fn_parse_numeric(coalesce(v_row->>'atenciones_total', v_row->>'total', ''));

      if v_dir is null and v_total is not null then
        v_dir := v_total;
        v_ind := coalesce(v_ind, 0);
      end if;
    end if;

    if v_error is null and v_codigo is null then
      v_error := 'profesional_codigo es obligatorio';
      v_error_col := 'profesional_codigo';
    end if;
    if v_error is null and v_inst_codigo is null then
      v_error := 'instituto_codigo es obligatorio';
      v_error_col := 'instituto_codigo';
    end if;
    if v_error is null and (v_anio is null or v_mes is null or v_mes < 1 or v_mes > 12) then
      v_error := 'anio/mes inválidos';
      v_error_col := 'anio/mes';
    end if;
    if v_error is null and v_dir is null then
      v_error := 'atenciones_directas es obligatorio';
      v_error_col := 'atenciones_directas';
    end if;
    if v_error is null and (v_dir < 0 or coalesce(v_ind, 0) < 0) then
      v_error := 'Las atenciones no pueden ser negativas';
      v_error_col := 'atenciones';
    end if;

    if v_error is null then
      select id into v_prof_id from public.profesionales where codigo_buk = v_codigo;
      if v_prof_id is null then
        v_error := 'Profesional no encontrado en dotación BUK: ' || v_codigo;
        v_error_col := 'profesional_codigo';
      end if;
    end if;

    if v_error is null then
      select id into v_inst_id
      from public.institutos
      where lower(codigo) = lower(v_inst_codigo) or lower(nombre) = lower(v_inst_codigo)
      limit 1;
      if v_inst_id is null then
        v_error := 'Instituto no encontrado: ' || v_inst_codigo;
        v_error_col := 'instituto_codigo';
      end if;
    end if;

    if v_error is not null then
      insert into public.importacion_errores
        (importacion_id, fila, columna, codigo, mensaje, severidad, payload)
      values
        (v_import_id, v_idx, v_error_col, 'FILA_INVALIDA', v_error, 'error', v_row);

      insert into public.sic_registros
        (importacion_id, fila, payload, profesional_codigo, instituto_codigo, anio, mes, valido)
      values
        (v_import_id, v_idx, v_row, v_codigo, v_inst_codigo, v_anio, v_mes, false);

      v_errores := v_errores + 1;
      continue;
    end if;

    insert into public.atenciones_sic
      (profesional_id, instituto_id, anio, mes, atenciones_directas, atenciones_indirectas, importacion_id)
    values
      (v_prof_id, v_inst_id, v_anio, v_mes, v_dir, coalesce(v_ind, 0), v_import_id)
    on conflict (profesional_id, instituto_id, anio, mes) do update
      set atenciones_directas = excluded.atenciones_directas,
          atenciones_indirectas = excluded.atenciones_indirectas,
          importacion_id = excluded.importacion_id,
          updated_at = now();

    insert into public.sic_registros
      (importacion_id, fila, payload, profesional_codigo, instituto_codigo, anio, mes, valido)
    values
      (v_import_id, v_idx, v_row, v_codigo, v_inst_codigo, v_anio, v_mes, true);

    v_ok := v_ok + 1;
  end loop;

  update public.importaciones
  set filas_total = v_idx,
      filas_ok = v_ok,
      filas_error = v_errores,
      estado = case when v_errores > 0 then 'con_errores' else 'completada' end,
      completed_at = now()
  where id = v_import_id;

  return jsonb_build_object(
    'importacion_id', v_import_id,
    'duplicada', false,
    'filas_total', v_idx,
    'filas_ok', v_ok,
    'filas_error', v_errores
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Cálculo de planificación
-- -----------------------------------------------------------------------------
create or replace function public.fn_generar_planificacion(
  p_anio int,
  p_notas text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_version uuid;
  v_num int;
  v_prof record;
  v_d record;
  v_promedio numeric;
  v_tramo uuid;
  v_mes_inicio date;
  v_mes_fin date;
  v_dias_habiles numeric;
  v_dias_vacaciones numeric;
  v_dias_licencia numeric;
  v_dias_efectivos numeric;
  v_horas_total_mes numeric;
  v_share numeric;
  v_asig_semanal numeric;
  v_horas_contratadas numeric;
  v_horas_asignaciones numeric;
  v_horas_disponibles numeric;
  v_pct_dir numeric;
  v_pct_ind numeric;
  v_pct_nas numeric;
  v_min_dir int;
  v_min_ind int;
  v_pct_grupal numeric;
  v_pac_grupo int;
  v_horas_directas numeric;
  v_horas_indirectas numeric;
  v_horas_nas numeric;
  v_at_dir_ind numeric;
  v_sesiones_grupales numeric;
  v_at_grupales numeric;
  v_at_dir_total numeric;
  v_at_indirectas numeric;
  v_at_total numeric;
  v_meta_pct numeric;
  v_meta_gestion numeric;
  v_foja numeric;
begin
  if public.fn_jwt_role() = 'authenticated'
     and coalesce(public.current_rol(), '') <> 'planificacion_central' then
    raise exception 'Solo planificación central puede generar planificación' using errcode = '42501';
  end if;

  select coalesce(max(numero_version), 0) + 1
  into v_num
  from public.planificacion_versiones
  where anio = p_anio;

  insert into public.planificacion_versiones (anio, numero_version, estado, creado_por, notas)
  values (p_anio, v_num, 'borrador', auth.uid(), p_notas)
  returning id into v_version;

  for v_prof in
    select distinct d.profesional_id
    from public.dotacion_mensual d
    where d.anio = p_anio
      and d.incluir_en_planificacion
    order by d.profesional_id
  loop
    -- Promedio ponderado anual de horas semanales (ponderado por días hábiles).
    select sum(x.horas_mes * coalesce(x.dias, 20)) / nullif(sum(coalesce(x.dias, 20)), 0)
    into v_promedio
    from (
      select d.mes,
             sum(d.horas_semanales) as horas_mes,
             (
               select cm.dias_habiles
               from public.calendario_mensual cm
               join public.dotacion_mensual d2
                 on d2.instituto_id = cm.instituto_id
                and d2.anio = cm.anio
                and d2.mes = cm.mes
               where d2.profesional_id = v_prof.profesional_id
                 and d2.anio = p_anio
                 and d2.mes = d.mes
               order by d2.horas_semanales desc, cm.instituto_id
               limit 1
             ) as dias
      from public.dotacion_mensual d
      where d.profesional_id = v_prof.profesional_id
        and d.anio = p_anio
        and d.incluir_en_planificacion
      group by d.mes
    ) x;

    v_promedio := coalesce(v_promedio, 0);

    select id into v_tramo
    from public.tramos_jornada
    where (horas_min is null or v_promedio >= horas_min)
      and (horas_max is null or v_promedio < horas_max)
    order by orden
    limit 1;

    for v_d in
      select d.*,
             c.cargo_homologado_id,
             c.area_id,
             coalesce(a.atencion_grupal, false) as atencion_grupal
      from public.dotacion_mensual d
      join public.cargos c on c.id = d.cargo_id
      left join public.areas a on a.id = c.area_id
      where d.profesional_id = v_prof.profesional_id
        and d.anio = p_anio
        and d.incluir_en_planificacion
      order by d.mes, d.instituto_id
    loop
      v_mes_inicio := make_date(p_anio, v_d.mes, 1);
      v_mes_fin := (v_mes_inicio + interval '1 month - 1 day')::date;

      v_dias_habiles := coalesce((
        select cm.dias_habiles
        from public.calendario_mensual cm
        where cm.instituto_id = v_d.instituto_id
          and cm.anio = p_anio
          and cm.mes = v_d.mes
      ), 20);

      v_dias_vacaciones := coalesce((
        select cm.dias_vacaciones
        from public.calendario_mensual cm
        where cm.instituto_id = v_d.instituto_id
          and cm.anio = p_anio
          and cm.mes = v_d.mes
      ), 0);

      v_dias_licencia := coalesce((
        select sum((
          select count(*)
          from generate_series(
            greatest(l.fecha_desde, v_mes_inicio)::timestamp,
            least(l.fecha_hasta, v_mes_fin)::timestamp,
            interval '1 day'
          ) g
          where extract(isodow from g) < 6
        ))
        from public.licencias l
        where l.profesional_id = v_prof.profesional_id
          and l.fecha_desde <= v_mes_fin
          and l.fecha_hasta >= v_mes_inicio
      ), 0);

      v_dias_efectivos := greatest(v_dias_habiles - v_dias_vacaciones - v_dias_licencia, 0);

      v_horas_total_mes := coalesce((
        select sum(d2.horas_semanales)
        from public.dotacion_mensual d2
        where d2.profesional_id = v_prof.profesional_id
          and d2.anio = p_anio
          and d2.mes = v_d.mes
          and d2.incluir_en_planificacion
      ), 0);

      v_share := case
        when v_horas_total_mes > 0 then v_d.horas_semanales / v_horas_total_mes
        else 0
      end;

      v_asig_semanal := coalesce((
        select sum(a.horas_semanales)
        from public.asignaciones_profesional a
        where a.profesional_id = v_prof.profesional_id
          and a.estado = 'aprobada'
          and a.vigencia_desde <= v_mes_fin
          and (a.vigencia_hasta is null or a.vigencia_hasta >= v_mes_inicio)
      ), 0);

      v_horas_contratadas := v_d.horas_semanales * v_dias_efectivos / 5.0;
      v_horas_asignaciones := v_asig_semanal * v_dias_efectivos / 5.0 * v_share;
      v_horas_disponibles := greatest(v_horas_contratadas - v_horas_asignaciones, 0);

      select pct_directo, pct_indirecto, pct_nas
      into v_pct_dir, v_pct_ind, v_pct_nas
      from public.param_distribucion
      where cargo_homologado_id = v_d.cargo_homologado_id
        and tramo_id = v_tramo
        and vigencia_desde <= v_mes_inicio
        and (vigencia_hasta is null or vigencia_hasta >= v_mes_inicio)
      order by vigencia_desde desc
      limit 1;

      if v_pct_dir is null then
        v_pct_dir := 0.60;
        v_pct_ind := 0.20;
        v_pct_nas := 0.20;
      end if;

      v_min_dir := coalesce((
        select minutos
        from public.param_minutos_atencion
        where cargo_id = v_d.cargo_id
          and tipo_atencion = 'directa'
          and vigencia_desde <= v_mes_inicio
          and (vigencia_hasta is null or vigencia_hasta >= v_mes_inicio)
        order by vigencia_desde desc
        limit 1
      ), 45);

      v_min_ind := coalesce((
        select minutos
        from public.param_minutos_atencion
        where cargo_id = v_d.cargo_id
          and tipo_atencion = 'indirecta'
          and vigencia_desde <= v_mes_inicio
          and (vigencia_hasta is null or vigencia_hasta >= v_mes_inicio)
        order by vigencia_desde desc
        limit 1
      ), 30);

      v_pct_grupal := 0;
      v_pac_grupo := 0;
      if v_d.atencion_grupal then
        select pct_grupal, pacientes_por_grupo
        into v_pct_grupal, v_pac_grupo
        from public.param_atencion_grupal
        where area_id = v_d.area_id
          and (instituto_id = v_d.instituto_id or instituto_id is null)
          and vigencia_desde <= v_mes_inicio
          and (vigencia_hasta is null or vigencia_hasta >= v_mes_inicio)
        order by (instituto_id is not null) desc, vigencia_desde desc
        limit 1;
        v_pct_grupal := coalesce(v_pct_grupal, 0);
        v_pac_grupo := coalesce(v_pac_grupo, 0);
      end if;

      v_horas_directas := v_horas_disponibles * v_pct_dir;
      v_horas_indirectas := v_horas_disponibles * v_pct_ind;
      v_horas_nas := v_horas_disponibles * v_pct_nas;

      v_at_dir_ind := floor((v_horas_directas * (1 - v_pct_grupal) * 60) / v_min_dir);
      v_sesiones_grupales := floor((v_horas_directas * v_pct_grupal * 60) / v_min_dir);
      v_at_grupales := v_sesiones_grupales * v_pac_grupo;
      v_at_dir_total := v_at_dir_ind + v_at_grupales;
      v_at_indirectas := floor((v_horas_indirectas * 60) / v_min_ind);
      v_at_total := v_at_dir_total + v_at_indirectas;

      v_meta_pct := coalesce(public.fn_parametro('meta_gestion', v_mes_inicio), 0.90);
      v_meta_gestion := v_at_total * v_meta_pct;
      v_foja := case
        when v_horas_contratadas > 0 then v_horas_directas / v_horas_contratadas
        else 0
      end;

      insert into public.planificacion_mensual (
        version_id, profesional_id, instituto_id, anio, mes, cargo_id, tramo_id,
        horas_contratadas_mes, horas_promedio_anual, pct_directo, pct_indirecto, pct_nas,
        horas_asignaciones, horas_disponibles, horas_directas, horas_indirectas, horas_nas,
        atenciones_directas_plan, atenciones_grupales_plan, atenciones_indirectas_plan,
        atenciones_total_plan, meta_gestion, foja, detalle
      ) values (
        v_version, v_prof.profesional_id, v_d.instituto_id, p_anio, v_d.mes, v_d.cargo_id, v_tramo,
        round(v_horas_contratadas, 2), round(v_promedio, 2), v_pct_dir, v_pct_ind, v_pct_nas,
        round(v_horas_asignaciones, 2), round(v_horas_disponibles, 2),
        round(v_horas_directas, 2), round(v_horas_indirectas, 2), round(v_horas_nas, 2),
        v_at_dir_total, v_at_grupales, v_at_indirectas,
        v_at_total, round(v_meta_gestion, 2), round(v_foja, 4),
        jsonb_build_object(
          'dias_habiles', v_dias_habiles,
          'dias_vacaciones', v_dias_vacaciones,
          'dias_licencia', v_dias_licencia,
          'dias_efectivos', v_dias_efectivos,
          'horas_semanales', v_d.horas_semanales,
          'horas_totales_mes', v_horas_total_mes,
          'share_instituto', v_share,
          'asignaciones_semanales', v_asig_semanal,
          'minutos_directa', v_min_dir,
          'minutos_indirecta', v_min_ind,
          'pct_grupal', v_pct_grupal,
          'pacientes_por_grupo', v_pac_grupo,
          'meta_pct', v_meta_pct
        )
      )
      on conflict (version_id, profesional_id, instituto_id, anio, mes) do nothing;
    end loop;
  end loop;

  return v_version;
end;
$$;

-- -----------------------------------------------------------------------------
-- Simulación de parámetros
-- p_cambios: {"cargo_homologado_id": "...", "tramo_id": "...",
--             "pct_directo": 0.7, "pct_indirecto": 0.15, "pct_nas": 0.15}
-- -----------------------------------------------------------------------------
create or replace function public.fn_simular_parametros(
  p_anio int,
  p_cambios jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_version uuid;
  v_cargo_hom uuid;
  v_tramo uuid;
  v_dir numeric;
  v_ind numeric;
  v_antes numeric;
  v_despues numeric;
  v_meta_pct numeric;
  v_resultado jsonb;
begin
  if public.fn_jwt_role() = 'authenticated'
     and coalesce(public.current_rol(), '') <> 'planificacion_central' then
    raise exception 'Solo planificación central puede simular parámetros' using errcode = '42501';
  end if;

  v_cargo_hom := nullif(p_cambios->>'cargo_homologado_id', '')::uuid;
  v_tramo := nullif(p_cambios->>'tramo_id', '')::uuid;
  v_dir := nullif(p_cambios->>'pct_directo', '')::numeric;
  v_ind := nullif(p_cambios->>'pct_indirecto', '')::numeric;

  if v_dir is null or v_ind is null then
    raise exception 'p_cambios debe incluir pct_directo y pct_indirecto';
  end if;

  select id into v_version
  from public.planificacion_versiones
  where anio = p_anio
    and estado in ('borrador', 'aprobada')
  order by numero_version desc
  limit 1;

  if v_version is null then
    raise exception 'No existe una versión de planificación para el año %', p_anio;
  end if;

  select coalesce(sum(pm.atenciones_total_plan), 0)
  into v_antes
  from public.planificacion_mensual pm
  join public.cargos c on c.id = pm.cargo_id
  where pm.version_id = v_version
    and (v_cargo_hom is null or c.cargo_homologado_id = v_cargo_hom)
    and (v_tramo is null or pm.tramo_id = v_tramo);

  select coalesce(sum(
    floor((pm.horas_disponibles * v_dir
           * (1 - coalesce((pm.detalle->>'pct_grupal')::numeric, 0)) * 60)
          / coalesce((pm.detalle->>'minutos_directa')::numeric, 45))
    + floor((pm.horas_disponibles * v_dir
             * coalesce((pm.detalle->>'pct_grupal')::numeric, 0) * 60)
            / coalesce((pm.detalle->>'minutos_directa')::numeric, 45))
      * coalesce((pm.detalle->>'pacientes_por_grupo')::numeric, 0)
    + floor((pm.horas_disponibles * v_ind * 60)
            / coalesce((pm.detalle->>'minutos_indirecta')::numeric, 30))
  ), 0)
  into v_despues
  from public.planificacion_mensual pm
  join public.cargos c on c.id = pm.cargo_id
  where pm.version_id = v_version
    and (v_cargo_hom is null or c.cargo_homologado_id = v_cargo_hom)
    and (v_tramo is null or pm.tramo_id = v_tramo);

  v_meta_pct := coalesce(public.fn_parametro('meta_gestion', current_date), 0.90);

  v_resultado := jsonb_build_object(
    'anio', p_anio,
    'version_id', v_version,
    'cambios', p_cambios,
    'atenciones_antes', v_antes,
    'atenciones_despues', v_despues,
    'delta_atenciones', v_despues - v_antes,
    'delta_pct', case when v_antes > 0 then (v_despues - v_antes) / v_antes else null end,
    'meta_antes', v_antes * v_meta_pct,
    'meta_despues', v_despues * v_meta_pct
  );

  insert into public.simulaciones (usuario_id, anio, parametros_cambio, resultado)
  values (auth.uid(), p_anio, p_cambios, v_resultado);

  return v_resultado;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos de ejecución de RPCs
-- -----------------------------------------------------------------------------
revoke all on function public.rpc_ingestar_buk(text, text, int, int, jsonb, uuid) from public, anon;
revoke all on function public.rpc_ingestar_sic(text, text, int, int, jsonb, uuid) from public, anon;
revoke all on function public.fn_generar_planificacion(int, text) from public, anon;
revoke all on function public.fn_simular_parametros(int, jsonb) from public, anon;

grant execute on function public.rpc_ingestar_buk(text, text, int, int, jsonb, uuid) to authenticated, service_role;
grant execute on function public.rpc_ingestar_sic(text, text, int, int, jsonb, uuid) to authenticated, service_role;
grant execute on function public.fn_generar_planificacion(int, text) to authenticated, service_role;
grant execute on function public.fn_simular_parametros(int, jsonb) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Vistas de dashboard
-- -----------------------------------------------------------------------------
create or replace view public.v_planificacion_vigente
with (security_invoker = true) as
select pm.*, pv.anio as version_anio, pv.numero_version, pv.estado as version_estado
from public.planificacion_mensual pm
join public.planificacion_versiones pv on pv.id = pm.version_id
where pv.id in (
  select distinct on (anio) id
  from public.planificacion_versiones
  where estado in ('borrador', 'aprobada')
  order by anio, numero_version desc
);

create or replace view public.v_planificacion_nacional
with (security_invoker = true) as
select
  v.version_anio as anio,
  v.mes,
  count(distinct v.profesional_id) as profesionales,
  round(sum(v.horas_contratadas_mes), 2) as horas_contratadas,
  round(sum(v.horas_disponibles), 2) as horas_disponibles,
  round(sum(v.horas_directas), 2) as horas_directas,
  round(sum(v.horas_indirectas), 2) as horas_indirectas,
  round(sum(v.horas_nas), 2) as horas_nas,
  round(sum(v.atenciones_total_plan), 2) as atenciones_planificadas,
  round(sum(v.meta_gestion), 2) as meta_gestion,
  case
    when sum(v.horas_contratadas_mes) > 0
      then round(sum(v.horas_directas) / sum(v.horas_contratadas_mes), 4)
    else 0
  end as foja
from public.v_planificacion_vigente v
group by v.version_anio, v.mes
order by v.version_anio, v.mes;

create or replace view public.v_planificacion_instituto
with (security_invoker = true) as
select
  v.version_anio as anio,
  v.mes,
  i.codigo as instituto_codigo,
  i.nombre as instituto,
  i.region,
  a.nombre as area,
  c.nombre as cargo,
  count(distinct v.profesional_id) as profesionales,
  round(sum(v.horas_contratadas_mes), 2) as horas_contratadas,
  round(sum(v.horas_disponibles), 2) as horas_disponibles,
  round(sum(v.horas_directas), 2) as horas_directas,
  round(sum(v.atenciones_total_plan), 2) as atenciones_planificadas,
  round(sum(v.meta_gestion), 2) as meta_gestion,
  case
    when sum(v.horas_contratadas_mes) > 0
      then round(sum(v.horas_directas) / sum(v.horas_contratadas_mes), 4)
    else 0
  end as foja
from public.v_planificacion_vigente v
join public.institutos i on i.id = v.instituto_id
join public.cargos c on c.id = v.cargo_id
left join public.areas a on a.id = c.area_id
group by v.version_anio, v.mes, i.codigo, i.nombre, i.region, a.nombre, c.nombre
order by v.version_anio, v.mes, i.nombre, a.nombre, c.nombre;

create or replace view public.v_planificacion_profesional
with (security_invoker = true) as
select
  v.version_anio as anio,
  v.mes,
  p.codigo_buk,
  p.nombre_seudonimo,
  i.codigo as instituto_codigo,
  i.nombre as instituto,
  c.nombre as cargo,
  v.horas_contratadas_mes,
  v.horas_asignaciones,
  v.horas_disponibles,
  v.horas_directas,
  v.horas_indirectas,
  v.horas_nas,
  v.atenciones_directas_plan,
  v.atenciones_grupales_plan,
  v.atenciones_indirectas_plan,
  v.atenciones_total_plan,
  v.meta_gestion,
  v.foja
from public.v_planificacion_vigente v
join public.profesionales p on p.id = v.profesional_id
join public.institutos i on i.id = v.instituto_id
join public.cargos c on c.id = v.cargo_id
order by v.version_anio, v.mes, p.codigo_buk;

create or replace view public.v_cumplimiento_sic
with (security_invoker = true) as
select
  v.version_anio as anio,
  v.mes,
  v.profesional_id,
  p.codigo_buk,
  p.nombre_seudonimo,
  v.instituto_id,
  i.nombre as instituto,
  v.atenciones_total_plan as atenciones_planificadas,
  coalesce(s.atenciones_total, 0) as atenciones_sic,
  coalesce(s.atenciones_total, 0) - v.atenciones_total_plan as diferencia,
  case
    when v.atenciones_total_plan > 0
      then round((coalesce(s.atenciones_total, 0) - v.atenciones_total_plan) / v.atenciones_total_plan, 4)
    else null
  end as desviacion_pct
from public.v_planificacion_vigente v
join public.profesionales p on p.id = v.profesional_id
join public.institutos i on i.id = v.instituto_id
left join public.atenciones_sic s
  on s.profesional_id = v.profesional_id
 and s.instituto_id = v.instituto_id
 and s.anio = v.version_anio
 and s.mes = v.mes;

create or replace view public.v_alertas_desviacion
with (security_invoker = true) as
select *
from public.v_cumplimiento_sic
where desviacion_pct is not null
  and abs(desviacion_pct) > coalesce(public.fn_parametro('umbral_desviacion', current_date), 0.10)
order by abs(desviacion_pct) desc;

create or replace view public.v_foja_mensual
with (security_invoker = true) as
select
  v.version_anio as anio,
  v.mes,
  i.codigo as instituto_codigo,
  i.nombre as instituto,
  round(sum(v.horas_contratadas_mes), 2) as horas_contratadas,
  round(sum(v.horas_directas), 2) as horas_directas,
  case
    when sum(v.horas_contratadas_mes) > 0
      then round(sum(v.horas_directas) / sum(v.horas_contratadas_mes), 4)
    else 0
  end as foja
from public.v_planificacion_vigente v
join public.institutos i on i.id = v.instituto_id
group by v.version_anio, v.mes, i.codigo, i.nombre
order by v.version_anio, v.mes, i.nombre;

create or replace view public.v_dotacion_inconsistencias
with (security_invoker = true) as
with suma as (
  select
    d.profesional_id,
    d.anio,
    d.mes,
    sum(d.horas_semanales) as horas_semanales,
    count(*) as registros,
    count(distinct d.instituto_id) as institutos
  from public.dotacion_mensual d
  where d.incluir_en_planificacion
  group by d.profesional_id, d.anio, d.mes
)
select
  'horas_excedidas'::text as tipo,
  s.profesional_id,
  s.anio,
  s.mes,
  s.horas_semanales,
  public.fn_horas_jornada_legal(s.anio, s.mes) as horas_legales,
  s.registros,
  s.institutos
from suma s
where public.fn_horas_jornada_legal(s.anio, s.mes) is not null
  and s.horas_semanales > public.fn_horas_jornada_legal(s.anio, s.mes) + 0.01
union all
select
  'sin_calendario'::text,
  d.profesional_id,
  d.anio,
  d.mes,
  d.horas_semanales,
  null::numeric,
  null::bigint,
  null::bigint
from public.dotacion_mensual d
where d.incluir_en_planificacion
  and not exists (
    select 1
    from public.calendario_mensual cm
    where cm.instituto_id = d.instituto_id
      and cm.anio = d.anio
      and cm.mes = d.mes
  );

-- -----------------------------------------------------------------------------
-- Permisos de lectura de vistas
-- -----------------------------------------------------------------------------
grant select on public.v_planificacion_vigente to authenticated, service_role;
grant select on public.v_planificacion_nacional to authenticated, service_role;
grant select on public.v_planificacion_instituto to authenticated, service_role;
grant select on public.v_planificacion_profesional to authenticated, service_role;
grant select on public.v_cumplimiento_sic to authenticated, service_role;
grant select on public.v_alertas_desviacion to authenticated, service_role;
grant select on public.v_foja_mensual to authenticated, service_role;
grant select on public.v_dotacion_inconsistencias to authenticated, service_role;

revoke all on public.v_planificacion_vigente from anon;
revoke all on public.v_planificacion_nacional from anon;
revoke all on public.v_planificacion_instituto from anon;
revoke all on public.v_planificacion_profesional from anon;
revoke all on public.v_cumplimiento_sic from anon;
revoke all on public.v_alertas_desviacion from anon;
revoke all on public.v_foja_mensual from anon;
revoke all on public.v_dotacion_inconsistencias from anon;
