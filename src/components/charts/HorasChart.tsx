import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Indicadores } from '@/domain/types';
import { COLORES, ESTILO_TOOLTIP } from '@/lib/chartColors';
import { formatearHoras, formatearPct } from '@/lib/format';
import { porcentaje } from '@/domain/calc';

interface HorasChartProps {
  indicadores: Indicadores;
}

const SEGMENTOS = [
  { clave: 'horasDirectas', nombre: 'Horas directas', color: COLORES.directas },
  { clave: 'horasIndirectas', nombre: 'Horas indirectas', color: COLORES.indirectas },
  { clave: 'horasNAS', nombre: 'NAS (no asistencial)', color: COLORES.nas },
] as const;

interface TooltipItem {
  name?: string;
  value?: number;
  payload?: { color?: string; porcentaje?: number };
}

function TooltipHoras({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly TooltipItem[];
}) {
  if (!active || !payload?.length) return null;

  return (
    <div style={ESTILO_TOOLTIP}>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-2 text-muted">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: item.payload?.color }}
          />
          {item.name}:{' '}
          <span className="font-semibold text-ink">
            {formatearHoras(item.value ?? 0)}
          </span>
          <span>({formatearPct(item.payload?.porcentaje ?? 0)})</span>
        </p>
      ))}
    </div>
  );
}

export function HorasChart({ indicadores }: HorasChartProps) {
  const data = SEGMENTOS.map((segmento) => {
    const valor = indicadores[segmento.clave];
    return {
      name: segmento.nombre,
      value: valor,
      color: segmento.color,
      porcentaje: porcentaje(valor, indicadores.horasContratadas),
    };
  });

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {data.map((segmento) => (
                <Cell key={segmento.name} fill={segmento.color} />
              ))}
            </Pie>
            <Tooltip content={<TooltipHoras />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Contratadas
            </p>
            <p className="text-lg font-semibold text-ink tabular">
              {formatearHoras(indicadores.horasContratadas)}
            </p>
          </div>
        </div>
      </div>

      <ul className="w-full space-y-3">
        {data.map((segmento) => (
          <li key={segmento.name}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-ink">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: segmento.color }}
                />
                {segmento.name}
              </span>
              <span className="shrink-0 font-semibold text-ink tabular">
                {formatearHoras(segmento.value)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${segmento.porcentaje}%`,
                    backgroundColor: segmento.color,
                  }}
                />
              </div>
              <span className="w-12 text-right text-xs text-muted tabular">
                {formatearPct(segmento.porcentaje)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
