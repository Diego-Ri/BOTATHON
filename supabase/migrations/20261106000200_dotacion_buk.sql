-- =============================================================================
-- 02 · Dotación BUK
-- Profesionales, importaciones, registros crudos, dotación mensual y cambios
-- =============================================================================

create table if not exists public.profesionales (
  id                uuid primary key default gen_random_uuid(),
  codigo_buk        text not null unique,
  nombre_seudonimo  text not null,
  metadata          jsonb not null default '{}'::jsonb,
  activo            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.importaciones (
  id              uuid primary key default gen_random_uuid(),
  fuente          text not null check (fuente in ('BUK', 'SIC')),
  archivo_nombre  text not null,
  archivo_hash    text not null,
  periodo_anio    int,
  periodo_mes     int check (periodo_mes between 1 and 12),
  estado          text not null default 'pendiente'
                  check (estado in ('pendiente', 'procesando', 'completada', 'con_errores', 'fallida')),
  filas_total     int not null default 0,
  filas_ok        int not null default 0,
  filas_error     int not null default 0,
  usuario_id      uuid references auth.users(id),
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz,
  unique (fuente, archivo_hash)
);

create table if not exists public.importacion_errores (
  id              bigserial primary key,
  importacion_id  uuid not null references public.importaciones(id) on delete cascade,
  fila            int,
  columna         text,
  codigo          text not null,
  mensaje         text not null,
  severidad       text not null default 'error' check (severidad in ('error', 'warning')),
  payload         jsonb,
  created_at      timestamptz not null default now()
);

-- Fila cruda del reporte: conserva columnas que aún no conocemos.
create table if not exists public.dotacion_registros (
  id                bigserial primary key,
  importacion_id    uuid not null references public.importaciones(id) on delete cascade,
  fila              int not null,
  payload           jsonb not null,
  profesional_codigo text,
  instituto_codigo  text,
  anio              int,
  mes               int,
  valido            boolean not null default true,
  created_at        timestamptz not null default now()
);

create table if not exists public.dotacion_mensual (
  id                      uuid primary key default gen_random_uuid(),
  profesional_id          uuid not null references public.profesionales(id),
  instituto_id            uuid not null references public.institutos(id),
  anio                    int not null,
  mes                     int not null check (mes between 1 and 12),
  cargo_id                uuid not null references public.cargos(id),
  tipo_contrato_id        uuid references public.tipos_contrato(id),
  horas_semanales         numeric(6,2) not null check (horas_semanales > 0 and horas_semanales <= 60),
  fecha_inicio            date not null,
  fecha_termino           date,
  reemplaza_a_id          uuid references public.profesionales(id),
  es_reemplazo            boolean not null default false,
  es_vacante              boolean not null default false,
  incluir_en_planificacion boolean not null default true,
  importacion_id          uuid references public.importaciones(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (profesional_id, instituto_id, anio, mes),
  constraint dotacion_vigencia check (
    fecha_termino is null or fecha_termino >= fecha_inicio
  )
);

create table if not exists public.licencias (
  id              uuid primary key default gen_random_uuid(),
  profesional_id  uuid not null references public.profesionales(id),
  tipo            text not null default 'licencia_medica',
  fecha_desde     date not null,
  fecha_hasta     date not null,
  importacion_id  uuid references public.importaciones(id),
  created_at      timestamptz not null default now(),
  constraint licencia_vigencia check (fecha_hasta >= fecha_desde)
);

create table if not exists public.cambios_dotacion (
  id              bigserial primary key,
  importacion_id  uuid references public.importaciones(id),
  profesional_id  uuid not null references public.profesionales(id),
  instituto_id    uuid references public.institutos(id),
  anio            int not null,
  mes             int not null,
  campo           text not null,
  valor_anterior  text,
  valor_nuevo     text,
  vigencia_desde  date,
  detectado_en    timestamptz not null default now(),
  revisado        boolean not null default false
);

-- -----------------------------------------------------------------------------
-- Triggers updated_at
-- -----------------------------------------------------------------------------
drop trigger if exists trg_profesionales_updated_at on public.profesionales;
create trigger trg_profesionales_updated_at
  before update on public.profesionales
  for each row execute function public.set_updated_at();

drop trigger if exists trg_dotacion_mensual_updated_at on public.dotacion_mensual;
create trigger trg_dotacion_mensual_updated_at
  before update on public.dotacion_mensual
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
create index if not exists idx_dotacion_registros_import
  on public.dotacion_registros(importacion_id);
create index if not exists idx_dotacion_registros_prof
  on public.dotacion_registros(profesional_codigo, anio, mes);
create index if not exists idx_dotacion_mensual_periodo
  on public.dotacion_mensual(anio, mes);
create index if not exists idx_dotacion_mensual_prof
  on public.dotacion_mensual(profesional_id, anio, mes);
create index if not exists idx_dotacion_mensual_inst
  on public.dotacion_mensual(instituto_id, anio, mes);
create index if not exists idx_licencias_prof
  on public.licencias(profesional_id, fecha_desde, fecha_hasta);
create index if not exists idx_cambios_dotacion_prof
  on public.cambios_dotacion(profesional_id, anio, mes);
create index if not exists idx_cambios_dotacion_import
  on public.cambios_dotacion(importacion_id);
create index if not exists idx_importacion_errores_import
  on public.importacion_errores(importacion_id);
create index if not exists idx_importaciones_periodo
  on public.importaciones(fuente, periodo_anio, periodo_mes);

-- -----------------------------------------------------------------------------
-- Comentarios
-- -----------------------------------------------------------------------------
comment on table public.profesionales is 'Profesional anonimizado. codigo_buk es el identificador estable del reporte BUK.';
comment on table public.importaciones is 'Cabecera de cada carga de reporte BUK/SIC. archivo_hash permite ingesta idempotente.';
comment on table public.importacion_errores is 'Errores y advertencias detectados al validar un reporte.';
comment on table public.dotacion_registros is 'Fila cruda del reporte BUK en JSONB para no perder columnas futuras.';
comment on table public.dotacion_mensual is 'Dotación normalizada por profesional, instituto y mes. Permite múltiples filas por profesional (multi-instituto).';
comment on table public.cambios_dotacion is 'Diff detectado al comparar una nueva importación con la dotación vigente.';
comment on table public.licencias is 'Licencias médicas u otras ausencias que reducen la disponibilidad mensual.';
