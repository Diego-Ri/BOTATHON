-- =============================================================================
-- 08 · Ajustes de volatilidad detectados por db lint
-- =============================================================================

-- to_date() es STABLE, no IMMUTABLE.
alter function public.fn_parse_date(text) stable;
