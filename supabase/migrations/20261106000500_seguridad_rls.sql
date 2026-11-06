-- =============================================================================
-- 05 · Seguridad, perfiles, auditoría y RLS
-- =============================================================================

create table if not exists public.profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  email           text,
  nombre          text,
  rol             text not null default 'profesional_lectura'
                  check (rol in ('planificacion_central', 'direccion_nacional', 'jefatura_instituto', 'profesional_lectura')),
  instituto_id    uuid references public.institutos(id),
  profesional_id  uuid references public.profesionales(id) on delete set null,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_instituto on public.profiles(instituto_id);

-- Crea el perfil automáticamente cuando nace un usuario en auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (user_id, email, nombre)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Helpers de autorización (security definer para evitar recursión de RLS)
-- -----------------------------------------------------------------------------
create or replace function public.current_rol()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select rol
  from public.profiles
  where user_id = auth.uid()
    and activo
  limit 1;
$$;

create or replace function public.current_instituto_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select instituto_id
  from public.profiles
  where user_id = auth.uid()
    and activo
  limit 1;
$$;

create or replace function public.current_profesional_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select profesional_id
  from public.profiles
  where user_id = auth.uid()
    and activo
  limit 1;
$$;

revoke all on function public.current_rol() from public;
revoke all on function public.current_instituto_id() from public;
revoke all on function public.current_profesional_id() from public;
grant execute on function public.current_rol() to authenticated, service_role;
grant execute on function public.current_instituto_id() to authenticated, service_role;
grant execute on function public.current_profesional_id() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Auditoría
-- -----------------------------------------------------------------------------
create table if not exists public.auditoria (
  id            bigserial primary key,
  tabla         text not null,
  registro_id   text not null,
  accion        text not null check (accion in ('INSERT', 'UPDATE', 'DELETE')),
  datos_antes   jsonb,
  datos_despues jsonb,
  usuario_id    uuid,
  justificacion text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_auditoria_tabla_registro
  on public.auditoria(tabla, registro_id);
create index if not exists idx_auditoria_fecha
  on public.auditoria(created_at desc);

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_just text := nullif(current_setting('app.justificacion', true), '');
begin
  if tg_op = 'DELETE' then
    insert into public.auditoria (tabla, registro_id, accion, datos_antes, usuario_id, justificacion)
    values (tg_table_name, old.id::text, tg_op, to_jsonb(old), v_user, v_just);
    return old;
  elsif tg_op = 'UPDATE' then
    insert into public.auditoria (tabla, registro_id, accion, datos_antes, datos_despues, usuario_id, justificacion)
    values (tg_table_name, new.id::text, tg_op, to_jsonb(old), to_jsonb(new), v_user, v_just);
    return new;
  else
    insert into public.auditoria (tabla, registro_id, accion, datos_despues, usuario_id, justificacion)
    values (tg_table_name, new.id::text, tg_op, to_jsonb(new), v_user, v_just);
    return new;
  end if;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'param_distribucion',
    'param_minutos_atencion',
    'param_atencion_grupal',
    'parametros_sistema',
    'asignaciones_catalogo',
    'dotacion_mensual',
    'asignaciones_profesional',
    'planificacion_versiones',
    'profiles'
  ] loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format(
      'create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.audit_row()',
      t
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Habilitar RLS
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'institutos', 'areas', 'cargos_homologados', 'cargos', 'tramos_jornada',
    'tipos_contrato', 'periodos_planificacion',
    'param_distribucion', 'param_minutos_atencion', 'param_atencion_grupal',
    'asignaciones_catalogo', 'parametros_sistema', 'feriados', 'calendario_mensual',
    'profesionales', 'importaciones', 'importacion_errores', 'dotacion_registros',
    'dotacion_mensual', 'licencias', 'cambios_dotacion',
    'asignaciones_profesional', 'aprobaciones', 'sic_registros', 'atenciones_sic',
    'planificacion_versiones', 'planificacion_mensual', 'simulaciones',
    'profiles', 'auditoria'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Políticas: catálogos y parámetros
-- Lectura para autenticados; escritura solo planificación central.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'institutos', 'areas', 'cargos_homologados', 'cargos', 'tramos_jornada',
    'tipos_contrato', 'periodos_planificacion',
    'param_distribucion', 'param_minutos_atencion', 'param_atencion_grupal',
    'asignaciones_catalogo', 'parametros_sistema', 'feriados', 'calendario_mensual'
  ] loop
    execute format('drop policy if exists lectura_autenticada on public.%I', t);
    execute format(
      'create policy lectura_autenticada on public.%I for select to authenticated using (true)',
      t
    );
    execute format('drop policy if exists gestion_central on public.%I', t);
    execute format(
      'create policy gestion_central on public.%I for all to authenticated using (public.current_rol() = ''planificacion_central'') with check (public.current_rol() = ''planificacion_central'')',
      t
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Políticas: profesionales
-- -----------------------------------------------------------------------------
drop policy if exists profesionales_lectura_central on public.profesionales;
create policy profesionales_lectura_central on public.profesionales
  for select to authenticated
  using (public.current_rol() in ('planificacion_central', 'direccion_nacional'));

drop policy if exists profesionales_lectura_jefatura on public.profesionales;
create policy profesionales_lectura_jefatura on public.profesionales
  for select to authenticated
  using (
    public.current_rol() = 'jefatura_instituto'
    and exists (
      select 1
      from public.dotacion_mensual d
      where d.profesional_id = profesionales.id
        and d.instituto_id = public.current_instituto_id()
    )
  );

drop policy if exists profesionales_lectura_propia on public.profesionales;
create policy profesionales_lectura_propia on public.profesionales
  for select to authenticated
  using (
    public.current_rol() = 'profesional_lectura'
    and id = public.current_profesional_id()
  );

drop policy if exists profesionales_escritura on public.profesionales;
create policy profesionales_escritura on public.profesionales
  for all to authenticated
  using (public.current_rol() = 'planificacion_central')
  with check (public.current_rol() = 'planificacion_central');

-- -----------------------------------------------------------------------------
-- Políticas: importaciones y registros crudos (solo central/dirección)
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['importaciones', 'importacion_errores', 'dotacion_registros', 'sic_registros'] loop
    execute format('drop policy if exists lectura_central on public.%I', t);
    execute format(
      'create policy lectura_central on public.%I for select to authenticated using (public.current_rol() in (''planificacion_central'', ''direccion_nacional''))',
      t
    );
    execute format('drop policy if exists escritura_central on public.%I', t);
    execute format(
      'create policy escritura_central on public.%I for all to authenticated using (public.current_rol() = ''planificacion_central'') with check (public.current_rol() = ''planificacion_central'')',
      t
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Políticas: dotación mensual
-- -----------------------------------------------------------------------------
drop policy if exists dotacion_lectura_central on public.dotacion_mensual;
create policy dotacion_lectura_central on public.dotacion_mensual
  for select to authenticated
  using (public.current_rol() in ('planificacion_central', 'direccion_nacional'));

drop policy if exists dotacion_lectura_jefatura on public.dotacion_mensual;
create policy dotacion_lectura_jefatura on public.dotacion_mensual
  for select to authenticated
  using (
    public.current_rol() = 'jefatura_instituto'
    and instituto_id = public.current_instituto_id()
  );

drop policy if exists dotacion_lectura_propia on public.dotacion_mensual;
create policy dotacion_lectura_propia on public.dotacion_mensual
  for select to authenticated
  using (
    public.current_rol() = 'profesional_lectura'
    and profesional_id = public.current_profesional_id()
  );

drop policy if exists dotacion_escritura on public.dotacion_mensual;
create policy dotacion_escritura on public.dotacion_mensual
  for all to authenticated
  using (public.current_rol() = 'planificacion_central')
  with check (public.current_rol() = 'planificacion_central');

-- -----------------------------------------------------------------------------
-- Políticas: licencias y cambios de dotación
-- -----------------------------------------------------------------------------
drop policy if exists licencias_lectura_central on public.licencias;
create policy licencias_lectura_central on public.licencias
  for select to authenticated
  using (public.current_rol() in ('planificacion_central', 'direccion_nacional'));

drop policy if exists licencias_lectura_jefatura on public.licencias;
create policy licencias_lectura_jefatura on public.licencias
  for select to authenticated
  using (
    public.current_rol() = 'jefatura_instituto'
    and exists (
      select 1 from public.dotacion_mensual d
      where d.profesional_id = licencias.profesional_id
        and d.instituto_id = public.current_instituto_id()
    )
  );

drop policy if exists licencias_lectura_propia on public.licencias;
create policy licencias_lectura_propia on public.licencias
  for select to authenticated
  using (
    public.current_rol() = 'profesional_lectura'
    and profesional_id = public.current_profesional_id()
  );

drop policy if exists licencias_escritura on public.licencias;
create policy licencias_escritura on public.licencias
  for all to authenticated
  using (public.current_rol() = 'planificacion_central')
  with check (public.current_rol() = 'planificacion_central');

drop policy if exists cambios_lectura_central on public.cambios_dotacion;
create policy cambios_lectura_central on public.cambios_dotacion
  for select to authenticated
  using (public.current_rol() in ('planificacion_central', 'direccion_nacional'));

drop policy if exists cambios_lectura_jefatura on public.cambios_dotacion;
create policy cambios_lectura_jefatura on public.cambios_dotacion
  for select to authenticated
  using (
    public.current_rol() = 'jefatura_instituto'
    and instituto_id = public.current_instituto_id()
  );

drop policy if exists cambios_lectura_propia on public.cambios_dotacion;
create policy cambios_lectura_propia on public.cambios_dotacion
  for select to authenticated
  using (
    public.current_rol() = 'profesional_lectura'
    and profesional_id = public.current_profesional_id()
  );

drop policy if exists cambios_escritura on public.cambios_dotacion;
create policy cambios_escritura on public.cambios_dotacion
  for all to authenticated
  using (public.current_rol() = 'planificacion_central')
  with check (public.current_rol() = 'planificacion_central');

-- -----------------------------------------------------------------------------
-- Políticas: asignaciones
-- -----------------------------------------------------------------------------
drop policy if exists asignaciones_lectura_central on public.asignaciones_profesional;
create policy asignaciones_lectura_central on public.asignaciones_profesional
  for select to authenticated
  using (public.current_rol() in ('planificacion_central', 'direccion_nacional'));

drop policy if exists asignaciones_lectura_jefatura on public.asignaciones_profesional;
create policy asignaciones_lectura_jefatura on public.asignaciones_profesional
  for select to authenticated
  using (
    public.current_rol() = 'jefatura_instituto'
    and exists (
      select 1 from public.dotacion_mensual d
      where d.profesional_id = asignaciones_profesional.profesional_id
        and d.instituto_id = public.current_instituto_id()
    )
  );

drop policy if exists asignaciones_lectura_propia on public.asignaciones_profesional;
create policy asignaciones_lectura_propia on public.asignaciones_profesional
  for select to authenticated
  using (
    public.current_rol() = 'profesional_lectura'
    and profesional_id = public.current_profesional_id()
  );

drop policy if exists asignaciones_insert on public.asignaciones_profesional;
create policy asignaciones_insert on public.asignaciones_profesional
  for insert to authenticated
  with check (
    public.current_rol() = 'planificacion_central'
    or (
      public.current_rol() = 'jefatura_instituto'
      and exists (
        select 1 from public.dotacion_mensual d
        where d.profesional_id = asignaciones_profesional.profesional_id
          and d.instituto_id = public.current_instituto_id()
      )
    )
  );

drop policy if exists asignaciones_update on public.asignaciones_profesional;
create policy asignaciones_update on public.asignaciones_profesional
  for update to authenticated
  using (public.current_rol() in ('planificacion_central', 'direccion_nacional'))
  with check (public.current_rol() in ('planificacion_central', 'direccion_nacional'));

drop policy if exists asignaciones_delete on public.asignaciones_profesional;
create policy asignaciones_delete on public.asignaciones_profesional
  for delete to authenticated
  using (public.current_rol() = 'planificacion_central');

-- -----------------------------------------------------------------------------
-- Políticas: aprobaciones
-- -----------------------------------------------------------------------------
drop policy if exists aprobaciones_lectura_central on public.aprobaciones;
create policy aprobaciones_lectura_central on public.aprobaciones
  for select to authenticated
  using (public.current_rol() in ('planificacion_central', 'direccion_nacional'));

drop policy if exists aprobaciones_lectura_jefatura on public.aprobaciones;
create policy aprobaciones_lectura_jefatura on public.aprobaciones
  for select to authenticated
  using (
    public.current_rol() = 'jefatura_instituto'
    and exists (
      select 1
      from public.asignaciones_profesional a
      join public.dotacion_mensual d on d.profesional_id = a.profesional_id
      where a.id = aprobaciones.asignacion_id
        and d.instituto_id = public.current_instituto_id()
    )
  );

drop policy if exists aprobaciones_lectura_propia on public.aprobaciones;
create policy aprobaciones_lectura_propia on public.aprobaciones
  for select to authenticated
  using (
    public.current_rol() = 'profesional_lectura'
    and exists (
      select 1 from public.asignaciones_profesional a
      where a.id = aprobaciones.asignacion_id
        and a.profesional_id = public.current_profesional_id()
    )
  );

drop policy if exists aprobaciones_insert on public.aprobaciones;
create policy aprobaciones_insert on public.aprobaciones
  for insert to authenticated
  with check (public.current_rol() in ('planificacion_central', 'direccion_nacional'));

-- -----------------------------------------------------------------------------
-- Políticas: atenciones SIC
-- -----------------------------------------------------------------------------
drop policy if exists sic_lectura_central on public.atenciones_sic;
create policy sic_lectura_central on public.atenciones_sic
  for select to authenticated
  using (public.current_rol() in ('planificacion_central', 'direccion_nacional'));

drop policy if exists sic_lectura_jefatura on public.atenciones_sic;
create policy sic_lectura_jefatura on public.atenciones_sic
  for select to authenticated
  using (
    public.current_rol() = 'jefatura_instituto'
    and instituto_id = public.current_instituto_id()
  );

drop policy if exists sic_lectura_propia on public.atenciones_sic;
create policy sic_lectura_propia on public.atenciones_sic
  for select to authenticated
  using (
    public.current_rol() = 'profesional_lectura'
    and profesional_id = public.current_profesional_id()
  );

drop policy if exists sic_escritura on public.atenciones_sic;
create policy sic_escritura on public.atenciones_sic
  for all to authenticated
  using (public.current_rol() = 'planificacion_central')
  with check (public.current_rol() = 'planificacion_central');

-- -----------------------------------------------------------------------------
-- Políticas: planificación
-- -----------------------------------------------------------------------------
drop policy if exists versiones_lectura on public.planificacion_versiones;
create policy versiones_lectura on public.planificacion_versiones
  for select to authenticated
  using (true);

drop policy if exists versiones_escritura on public.planificacion_versiones;
create policy versiones_escritura on public.planificacion_versiones
  for all to authenticated
  using (public.current_rol() = 'planificacion_central')
  with check (public.current_rol() = 'planificacion_central');

drop policy if exists plan_lectura_central on public.planificacion_mensual;
create policy plan_lectura_central on public.planificacion_mensual
  for select to authenticated
  using (public.current_rol() in ('planificacion_central', 'direccion_nacional'));

drop policy if exists plan_lectura_jefatura on public.planificacion_mensual;
create policy plan_lectura_jefatura on public.planificacion_mensual
  for select to authenticated
  using (
    public.current_rol() = 'jefatura_instituto'
    and instituto_id = public.current_instituto_id()
  );

drop policy if exists plan_lectura_propia on public.planificacion_mensual;
create policy plan_lectura_propia on public.planificacion_mensual
  for select to authenticated
  using (
    public.current_rol() = 'profesional_lectura'
    and profesional_id = public.current_profesional_id()
  );

drop policy if exists plan_escritura on public.planificacion_mensual;
create policy plan_escritura on public.planificacion_mensual
  for all to authenticated
  using (public.current_rol() = 'planificacion_central')
  with check (public.current_rol() = 'planificacion_central');

-- -----------------------------------------------------------------------------
-- Políticas: simulaciones
-- -----------------------------------------------------------------------------
drop policy if exists simulaciones_lectura on public.simulaciones;
create policy simulaciones_lectura on public.simulaciones
  for select to authenticated
  using (
    usuario_id = auth.uid()
    or public.current_rol() in ('planificacion_central', 'direccion_nacional')
  );

drop policy if exists simulaciones_insert on public.simulaciones;
create policy simulaciones_insert on public.simulaciones
  for insert to authenticated
  with check (public.current_rol() = 'planificacion_central');

-- -----------------------------------------------------------------------------
-- Políticas: perfiles y auditoría
-- -----------------------------------------------------------------------------
drop policy if exists profiles_lectura_propia on public.profiles;
create policy profiles_lectura_propia on public.profiles
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists profiles_lectura_central on public.profiles;
create policy profiles_lectura_central on public.profiles
  for select to authenticated
  using (public.current_rol() in ('planificacion_central', 'direccion_nacional'));

drop policy if exists profiles_gestion on public.profiles;
create policy profiles_gestion on public.profiles
  for all to authenticated
  using (public.current_rol() = 'planificacion_central')
  with check (public.current_rol() = 'planificacion_central');

drop policy if exists auditoria_lectura on public.auditoria;
create policy auditoria_lectura on public.auditoria
  for select to authenticated
  using (public.current_rol() in ('planificacion_central', 'direccion_nacional'));

-- -----------------------------------------------------------------------------
-- Comentarios
-- -----------------------------------------------------------------------------
comment on table public.profiles is 'Perfil de aplicación vinculado a auth.users. Define rol, instituto y profesional asociado.';
comment on table public.auditoria is 'Bitácora de cambios: tabla, registro, acción, antes/después, usuario y justificación.';
comment on function public.current_rol() is 'Rol del usuario autenticado, leído sin RLS para evitar recursión en políticas.';
