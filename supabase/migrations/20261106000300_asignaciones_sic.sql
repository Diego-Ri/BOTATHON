-- =============================================================================
-- 03 · Asignaciones especiales y ejecución SIC
-- =============================================================================

create table if not exists public.asignaciones_profesional (
  id              uuid primary key default gen_random_uuid(),
  profesional_id  uuid not null references public.profesionales(id),
  asignacion_id   uuid not null references public.asignaciones_catalogo(id),
  horas_semanales numeric(5,2) not null check (horas_semanales > 0),
  vigencia_desde  date not null,
  vigencia_hasta  date,
  estado          text not null default 'pendiente'
                  check (estado in ('pendiente', 'aprobada', 'rechazada', 'revocada')),
  justificacion   text,
  solicitado_por  uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint asignacion_vigencia check (
    vigencia_hasta is null or vigencia_hasta >= vigencia_desde
  )
);

create table if not exists public.aprobaciones (
  id              uuid primary key default gen_random_uuid(),
  asignacion_id   uuid not null references public.asignaciones_profesional(id) on delete cascade,
  estado          text not null check (estado in ('aprobada', 'rechazada')),
  aprobado_por    uuid references auth.users(id),
  comentario      text,
  created_at      timestamptz not null default now()
);

-- Fila cruda del reporte SIC
create table if not exists public.sic_registros (
  id                 bigserial primary key,
  importacion_id     uuid not null references public.importaciones(id) on delete cascade,
  fila               int not null,
  payload            jsonb not null,
  profesional_codigo text,
  instituto_codigo   text,
  anio               int,
  mes                int,
  valido             boolean not null default true,
  created_at         timestamptz not null default now()
);

create table if not exists public.atenciones_sic (
  id                    uuid primary key default gen_random_uuid(),
  profesional_id        uuid not null references public.profesionales(id),
  instituto_id          uuid not null references public.institutos(id),
  anio                  int not null,
  mes                   int not null check (mes between 1 and 12),
  atenciones_directas   numeric(10,2) not null default 0 check (atenciones_directas >= 0),
  atenciones_indirectas numeric(10,2) not null default 0 check (atenciones_indirectas >= 0),
  atenciones_total      numeric(10,2) generated always as (atenciones_directas + atenciones_indirectas) stored,
  importacion_id        uuid references public.importaciones(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (profesional_id, instituto_id, anio, mes)
);

-- -----------------------------------------------------------------------------
-- Regla: máximo de asignaciones para profesionales con más de N horas
-- -----------------------------------------------------------------------------
create or replace function public.validar_max_asignaciones()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_horas   numeric;
  v_umbral  numeric;
  v_max     int;
  v_count   int;
begin
  if new.estado not in ('pendiente', 'aprobada') then
    return new;
  end if;

  -- Horas del mes más reciente del profesional (suma multi-instituto).
  select coalesce(sum(d.horas_semanales), 0)
  into v_horas
  from public.dotacion_mensual d
  where d.profesional_id = new.profesional_id
    and (d.anio, d.mes) = (
      select d2.anio, d2.mes
      from public.dotacion_mensual d2
      where d2.profesional_id = new.profesional_id
      order by d2.anio desc, d2.mes desc
      limit 1
    );

  v_umbral := coalesce(public.fn_parametro('umbral_horas_max_asignaciones', new.vigencia_desde), 30);
  v_max := coalesce(public.fn_parametro('max_asignaciones', new.vigencia_desde), 2)::int;

  if v_horas > v_umbral then
    select count(*)
    into v_count
    from public.asignaciones_profesional a
    where a.profesional_id = new.profesional_id
      and a.estado in ('pendiente', 'aprobada')
      and a.id <> new.id
      and a.vigencia_desde <= coalesce(new.vigencia_hasta, 'infinity'::date)
      and (a.vigencia_hasta is null or a.vigencia_hasta >= new.vigencia_desde);

    if v_count >= v_max then
      raise exception
        'El profesional ya tiene % asignaciones activas. Máximo permitido: % para más de % horas semanales.',
        v_count, v_max, v_umbral
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_max_asignaciones on public.asignaciones_profesional;
create trigger trg_validar_max_asignaciones
  before insert or update on public.asignaciones_profesional
  for each row execute function public.validar_max_asignaciones();

create or replace function public.aplicar_aprobacion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.asignaciones_profesional
  set estado = new.estado,
      updated_at = now()
  where id = new.asignacion_id;
  return new;
end;
$$;

drop trigger if exists trg_aplicar_aprobacion on public.aprobaciones;
create trigger trg_aplicar_aprobacion
  after insert on public.aprobaciones
  for each row execute function public.aplicar_aprobacion();

drop trigger if exists trg_asignaciones_updated_at on public.asignaciones_profesional;
create trigger trg_asignaciones_updated_at
  before update on public.asignaciones_profesional
  for each row execute function public.set_updated_at();

drop trigger if exists trg_atenciones_sic_updated_at on public.atenciones_sic;
create trigger trg_atenciones_sic_updated_at
  before update on public.atenciones_sic
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
create index if not exists idx_asignaciones_prof
  on public.asignaciones_profesional(profesional_id, vigencia_desde, vigencia_hasta);
create index if not exists idx_asignaciones_estado
  on public.asignaciones_profesional(estado);
create index if not exists idx_aprobaciones_asignacion
  on public.aprobaciones(asignacion_id);
create index if not exists idx_sic_registros_import
  on public.sic_registros(importacion_id);
create index if not exists idx_sic_registros_prof
  on public.sic_registros(profesional_codigo, anio, mes);
create index if not exists idx_atenciones_sic_periodo
  on public.atenciones_sic(anio, mes);
create index if not exists idx_atenciones_sic_prof
  on public.atenciones_sic(profesional_id, anio, mes);
create index if not exists idx_atenciones_sic_inst
  on public.atenciones_sic(instituto_id, anio, mes);

-- -----------------------------------------------------------------------------
-- Comentarios
-- -----------------------------------------------------------------------------
comment on table public.asignaciones_profesional is 'Asignaciones especiales (liderazgo, docencia, comité, etc.) con vigencia y estado de aprobación.';
comment on table public.aprobaciones is 'Historial de aprobación/rechazo de asignaciones que lo requieren.';
comment on table public.sic_registros is 'Fila cruda del reporte SIC en JSONB.';
comment on table public.atenciones_sic is 'Atenciones realizadas por profesional, instituto y mes, para comparar planificado vs ejecutado.';
