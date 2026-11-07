import { useEffect, useRef, useState } from 'react';
import { Check, Link2, Lock, RotateCcw, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { useFiltros } from './FiltersProvider';

export function FilterBar({ mostrarAlcance = true }: { mostrarAlcance?: boolean }) {
  const {
    filtros,
    catalogo,
    opciones,
    bloqueados,
    etiquetaAlcance,
    setFiltro,
    limpiar,
  } = useFiltros();
  const [copiado, setCopiado] = useState<'ok' | 'error' | null>(null);
  const temporizador = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current) window.clearTimeout(temporizador.current);
    };
  }, []);

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado('ok');
    } catch {
      setCopiado('error');
    }
    if (temporizador.current) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setCopiado(null), 2500);
  };

  const hayBloqueados = Object.values(bloqueados).some(Boolean);

  return (
    <section
      className="card-base p-4 no-print"
      aria-label="Filtros de la vista"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            Filtros
          </span>
          {mostrarAlcance ? (
            <Badge tono="brand" icono={<ShieldCheck className="size-3" aria-hidden="true" />}>
              Alcance: {etiquetaAlcance}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variante="ghost"
            tamano="sm"
            onClick={copiarEnlace}
            icono={
              copiado === 'ok' ? (
                <Check className="size-3.5 text-success" aria-hidden="true" />
              ) : (
                <Link2 className="size-3.5" aria-hidden="true" />
              )
            }
            aria-live="polite"
          >
            {copiado === 'ok'
              ? 'Enlace copiado'
              : copiado === 'error'
                ? 'No se pudo copiar'
                : 'Copiar enlace'}
          </Button>
          <Button
            variante="outline"
            tamano="sm"
            onClick={limpiar}
            icono={<RotateCcw className="size-3.5" aria-hidden="true" />}
          >
            Restablecer
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Select
          etiqueta="Instituto"
          value={filtros.instituto ?? ''}
          onChange={(event) => setFiltro('instituto', event.target.value)}
          bloqueado={bloqueados.instituto}
          ayuda={bloqueados.instituto ? 'Acotado por tu rol' : undefined}
        >
          <option value="">Todos los institutos</option>
          {opciones.institutos.map((instituto) => (
            <option key={instituto.id} value={instituto.id}>
              {instituto.sigla} · {instituto.nombre}
            </option>
          ))}
        </Select>

        <Select
          etiqueta="Área"
          value={filtros.area ?? ''}
          onChange={(event) => setFiltro('area', event.target.value)}
          bloqueado={bloqueados.area}
          ayuda={bloqueados.area ? 'Acotada por tu rol' : undefined}
        >
          <option value="">Todas las áreas</option>
          {opciones.areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.nombre}
            </option>
          ))}
        </Select>

        <Select
          etiqueta="Cargo"
          value={filtros.cargo ?? ''}
          onChange={(event) => setFiltro('cargo', event.target.value)}
          bloqueado={bloqueados.cargo}
          ayuda={bloqueados.cargo ? 'Acotado por tu rol' : undefined}
        >
          <option value="">Todos los cargos</option>
          {opciones.cargos.map((cargo) => (
            <option key={cargo.value} value={cargo.value}>
              {cargo.label}
            </option>
          ))}
        </Select>

        <Select
          etiqueta="Mes"
          value={filtros.mes}
          onChange={(event) => setFiltro('mes', event.target.value)}
        >
          {catalogo.periodos.map((periodo) => (
            <option key={periodo.id} value={periodo.id}>
              {periodo.etiqueta}
            </option>
          ))}
        </Select>

        <Select
          etiqueta="Profesional"
          value={filtros.profesional ?? ''}
          onChange={(event) => setFiltro('profesional', event.target.value)}
          bloqueado={bloqueados.profesional}
          ayuda={
            bloqueados.profesional
              ? 'Solo puedes ver tu propia ficha'
              : undefined
          }
        >
          <option value="">Todos los profesionales</option>
          {opciones.profesionales.map((profesional) => {
            const area = catalogo.areas.find((item) => item.id === profesional.areaId);
            return (
              <option key={profesional.id} value={profesional.id}>
                {profesional.nombre}
                {area ? ` — ${area.nombre}` : ''}
              </option>
            );
          })}
        </Select>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
        <p>
          Los filtros se reflejan en la URL para compartir o volver con el botón
          del navegador.
        </p>
        {hayBloqueados ? (
          <p className="flex items-center gap-1.5">
            <Lock className="size-3" aria-hidden="true" />
            Los campos con candado están acotados por tu rol.
          </p>
        ) : null}
      </div>
    </section>
  );
}
