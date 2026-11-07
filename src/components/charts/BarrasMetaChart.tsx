import type { FilaConsolidada } from '@/domain/selectors';
import { formatearPct } from '@/lib/format';
import { cn } from '@/lib/cn';

interface BarrasMetaChartProps {
  filas: FilaConsolidada[];
  meta: number;
  limite?: number;
}

export function BarrasMetaChart({ filas, meta, limite = 8 }: BarrasMetaChartProps) {
  const visibles = filas.slice(0, limite);

  return (
    <ul className="space-y-4">
      {visibles.map((fila) => {
        const valor = fila.indicadores.metaGestion;
        const ancho = Math.min(100, Math.max(0, valor));
        const tono =
          valor >= meta ? 'bg-success' : valor >= meta * 0.9 ? 'bg-warning' : 'bg-danger';

        return (
          <li key={fila.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-xs font-medium text-ink" title={fila.nombre}>
                {fila.nombre}
              </span>
              <span className="shrink-0 text-xs font-semibold text-ink tabular">
                {formatearPct(valor)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-line/70">
                <div
                  className={cn('h-full rounded-full', tono)}
                  style={{ width: `${ancho}%` }}
                />
                <span
                  className="absolute top-0 h-full w-0.5 bg-navy/45"
                  style={{ left: `${meta}%` }}
                />
              </div>
              <span className="w-14 text-right text-[10px] text-muted">
                {fila.profesionales} prof.
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
