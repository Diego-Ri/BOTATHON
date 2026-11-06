-- =============================================================================
-- 01 · Catálogos y parámetros
-- Botathon 2026 · "Cada hora cuenta" · Teletón
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Catálogos
-- -----------------------------------------------------------------------------
create table if not exists public.institutos (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique,
  nombre      text not null,
  region      text not null,
  zona        text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.areas (
  id                uuid primary key default gen_random_uuid(),
  codigo            text unique,
  nombre            text not null unique,
  atencion_grupal   boolean not null default false,
  activo            boolean not null default true,
  created_at        timestamptz not null default now()
);

create table if not exists public.cargos_homologados (
  id          uuid primary key default gen_random_uuid(),
  codigo      text unique,
  nombre      text not null unique,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.cargos (
  id                   uuid primary key default gen_random_uuid(),
  codigo               text unique,
  nombre               text not null unique,
  area_id              uuid references public.areas(id),
  cargo_homologado_id  uuid references public.cargos_homologados(id),
  activo               boolean not null default true,
  created_at           timestamptz not null default now()
);

create table if not exists public.tramos_jornada (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique,
  nombre      text not null,
  horas_min   numeric(5,2),
  horas_max   numeric(5,2),
  orden       int not null,
  constraint tramo_rango check (
    horas_min is null or horas_max is null or horas_min < horas_max
  )
);

create table if not exists public.tipos_contrato (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique,
  nombre      text not null unique,
  activo      boolean not null default true
);

create table if not exists public.periodos_planificacion (
  id                 uuid primary key default gen_random_uuid(),
  anio               int not null,
  nombre             text not null,
  mes_inicio         int not null check (mes_inicio between 1 and 12),
  mes_fin            int not null check (mes_fin between 1 and 12),
  horas_jornada_legal numeric(5,2) not null,
  unique (anio, nombre),
  constraint periodo_rango check (mes_inicio <= mes_fin)
);

-- -----------------------------------------------------------------------------
-- Parámetros editables (con vigencia)
-- -----------------------------------------------------------------------------
create table if not exists public.param_distribucion (
  id                   uuid primary key default gen_random_uuid(),
  cargo_homologado_id  uuid not null references public.cargos_homologados(id),
  tramo_id             uuid not null references public.tramos_jornada(id),
  pct_directo          numeric(5,4) not null check (pct_directo between 0 and 1),
  pct_indirecto        numeric(5,4) not null check (pct_indirecto between 0 and 1),
  pct_nas              numeric(5,4) not null check (pct_nas between 0 and 1),
  vigencia_desde       date not null default '2026-01-01',
  vigencia_hasta       date,
  created_at           timestamptz not null default now(),
  constraint distribucion_suma check (
    abs(pct_directo + pct_indirecto + pct_nas - 1) < 0.0001
  ),
  constraint distribucion_vigencia check (
    vigencia_hasta is null or vigencia_hasta >= vigencia_desde
  ),
  constraint distribucion_no_solapa exclude using gist (
    cargo_homologado_id with =,
    tramo_id with =,
    daterange(vigencia_desde, coalesce(vigencia_hasta, 'infinity'::date), '[]') with &&
  )
);

create table if not exists public.param_minutos_atencion (
  id              uuid primary key default gen_random_uuid(),
  cargo_id        uuid not null references public.cargos(id),
  tipo_atencion   text not null check (tipo_atencion in ('directa', 'indirecta', 'grupal')),
  minutos         int not null check (minutos > 0),
  vigencia_desde  date not null default '2026-01-01',
  vigencia_hasta  date,
  created_at      timestamptz not null default now(),
  constraint minutos_vigencia check (
    vigencia_hasta is null or vigencia_hasta >= vigencia_desde
  ),
  constraint minutos_no_solapa exclude using gist (
    cargo_id with =,
    tipo_atencion with =,
    daterange(vigencia_desde, coalesce(vigencia_hasta, 'infinity'::date), '[]') with &&
  )
);

create table if not exists public.param_atencion_grupal (
  id                    uuid primary key default gen_random_uuid(),
  area_id               uuid not null references public.areas(id),
  instituto_id          uuid references public.institutos(id),
  pct_grupal            numeric(5,4) not null check (pct_grupal between 0 and 1),
  pacientes_por_grupo   int not null check (pacientes_por_grupo > 0),
  vigencia_desde        date not null default '2026-01-01',
  vigencia_hasta        date,
  created_at            timestamptz not null default now(),
  constraint grupal_vigencia check (
    vigencia_hasta is null or vigencia_hasta >= vigencia_desde
  ),
  constraint grupal_no_solapa exclude using gist (
    area_id with =,
    (coalesce(instituto_id, '00000000-0000-0000-0000-000000000000'::uuid)) with =,
    daterange(vigencia_desde, coalesce(vigencia_hasta, 'infinity'::date), '[]') with &&
  )
);

create table if not exists public.asignaciones_catalogo (
  id                    uuid primary key default gen_random_uuid(),
  codigo                text not null unique,
  nombre                text not null unique,
  horas_semanales       numeric(5,2) not null check (horas_semanales >= 0),
  requiere_autorizacion boolean not null default false,
  activo                boolean not null default true,
  created_at            timestamptz not null default now()
);

create table if not exists public.parametros_sistema (
  id              uuid primary key default gen_random_uuid(),
  clave           text not null,
  valor           jsonb not null,
  descripcion     text,
  vigencia_desde  date not null default '2026-01-01',
  vigencia_hasta  date,
  created_at      timestamptz not null default now(),
  constraint parametro_vigencia check (
    vigencia_hasta is null or vigencia_hasta >= vigencia_desde
  ),
  constraint parametro_no_solapa exclude using gist (
    clave with =,
    daterange(vigencia_desde, coalesce(vigencia_hasta, 'infinity'::date), '[]') with &&
  )
);

create table if not exists public.feriados (
  id            uuid primary key default gen_random_uuid(),
  fecha         date not null,
  nombre        text not null,
  region        text,
  instituto_id  uuid references public.institutos(id),
  es_regional   boolean not null default false,
  created_at    timestamptz not null default now(),
  unique nulls not distinct (fecha, nombre, region, instituto_id)
);

create table if not exists public.calendario_mensual (
  id              uuid primary key default gen_random_uuid(),
  instituto_id    uuid not null references public.institutos(id),
  anio            int not null check (anio between 2020 and 2100),
  mes             int not null check (mes between 1 and 12),
  dias_habiles    numeric(5,2) not null check (dias_habiles >= 0),
  dias_inhabiles  numeric(5,2) not null default 0 check (dias_inhabiles >= 0),
  dias_vacaciones numeric(5,2) not null default 0 check (dias_vacaciones >= 0),
  created_at      timestamptz not null default now(),
  unique (instituto_id, anio, mes)
);

-- -----------------------------------------------------------------------------
-- Helpers de parámetros
-- -----------------------------------------------------------------------------
create or replace function public.fn_parametro(
  p_clave text,
  p_fecha date default current_date
)
returns numeric
language sql
stable
set search_path = public, pg_temp
as $$
  select (valor)::text::numeric
  from public.parametros_sistema
  where clave = p_clave
    and vigencia_desde <= p_fecha
    and (vigencia_hasta is null or vigencia_hasta >= p_fecha)
  order by vigencia_desde desc
  limit 1;
$$;

create or replace function public.fn_horas_jornada_legal(
  p_anio int,
  p_mes int
)
returns numeric
language sql
stable
set search_path = public, pg_temp
as $$
  select horas_jornada_legal
  from public.periodos_planificacion
  where anio = p_anio
    and p_mes between mes_inicio and mes_fin
  order by mes_inicio desc
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- Índices de apoyo
-- -----------------------------------------------------------------------------
create index if not exists idx_cargos_area on public.cargos(area_id);
create index if not exists idx_cargos_homologado on public.cargos(cargo_homologado_id);
create index if not exists idx_param_distribucion_lookup
  on public.param_distribucion(cargo_homologado_id, tramo_id, vigencia_desde);
create index if not exists idx_param_minutos_lookup
  on public.param_minutos_atencion(cargo_id, tipo_atencion, vigencia_desde);
create index if not exists idx_param_grupal_lookup
  on public.param_atencion_grupal(area_id, instituto_id, vigencia_desde);
create index if not exists idx_feriados_fecha on public.feriados(fecha);
create index if not exists idx_calendario_lookup
  on public.calendario_mensual(anio, mes, instituto_id);

-- -----------------------------------------------------------------------------
-- Comentarios de diccionario
-- -----------------------------------------------------------------------------
comment on table public.institutos is 'Institutos Teletón del país. La zona/región afecta feriados y vacaciones.';
comment on table public.cargos is 'Cargo BUK del profesional; se homologa para aplicar la tabla de distribución.';
comment on table public.param_distribucion is 'Porcentaje directo/indirecto/NAS por cargo homologado y tramo de jornada. Editable con vigencia.';
comment on table public.param_minutos_atencion is 'Minutos estándar por atención según cargo y tipo (directa/indirecta/grupal).';
comment on table public.param_atencion_grupal is 'Porcentaje de atención grupal y pacientes por grupo. instituto_id NULL = regla general.';
comment on table public.calendario_mensual is 'Días hábiles, inhábiles y vacaciones por instituto y mes.';
comment on table public.parametros_sistema is 'Parámetros globales: meta de gestión, máximo de asignaciones, umbrales de alerta.';
