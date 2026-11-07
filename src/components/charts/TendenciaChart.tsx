import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PuntoSerie } from '@/domain/types';
import { COLORES, ESTILO_TOOLTIP } from '@/lib/chartColors';
import { etiquetaPeriodoCorta, formatearPct } from '@/lib/format';
import { EmptyState } from '@/components/ui/Feedback';
import { ChartNoAxesCombined } from 'lucide-react';

interface TendenciaChartProps {
  datos: PuntoSerie[];
  metaGestion: number;
}

interface TooltipItem {
  name?: string;
  value?: number;
  color?: string;
}

function TooltipTendencia({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: readonly TooltipItem[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={ESTILO_TOOLTIP}>
      <p className="mb-1 font-semibold capitalize text-ink">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-2 text-muted">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.name}:{' '}
          <span className="font-semibold text-ink">
            {formatearPct(item.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function TendenciaChart({ datos, metaGestion }: TendenciaChartProps) {
  if (datos.length === 0) {
    return (
      <EmptyState
        icono={<ChartNoAxesCombined className="size-5" aria-hidden="true" />}
        titulo="Sin serie para los filtros activos"
        descripcion="Ajusta el instituto, área o cargo para ver la evolución mensual."
      />
    );
  }

  const data = datos.map((punto) => ({
    periodo: etiquetaPeriodoCorta(punto.periodo),
    'Meta de gestión': punto.indicadores.metaGestion,
    '% FOJA': punto.indicadores.foja,
  }));

  const valores = data.flatMap((punto) => [
    punto['Meta de gestión'],
    punto['% FOJA'],
    metaGestion,
  ]);
  const minimo = Math.max(0, Math.floor((Math.min(...valores) - 8) / 10) * 10);
  const maximo = Math.min(
    120,
    Math.ceil((Math.max(...valores) + 8) / 10) * 10,
  );
  const dominio: [number, number] = [minimo, Math.max(minimo + 10, maximo)];

  return (
    <div className="h-72 w-full" role="img" aria-label="Evolución mensual de meta de gestión y FOJA">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={COLORES.grid} strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="periodo"
            tick={{ fill: COLORES.muted, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: COLORES.grid }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: COLORES.muted, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={dominio}
            tickFormatter={(valor: number) => `${valor}%`}
          />
          <Tooltip content={<TooltipTendencia />} cursor={{ stroke: COLORES.grid }} />
          <Legend
            verticalAlign="bottom"
            height={32}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: COLORES.muted }}
          />
          <ReferenceLine
            y={metaGestion}
            stroke={COLORES.navy}
            strokeDasharray="4 4"
            label={{
              value: `Meta ${metaGestion}%`,
              position: 'insideTopRight',
              fill: COLORES.navy,
              fontSize: 10,
            }}
          />
          <Line
            type="monotone"
            dataKey="Meta de gestión"
            stroke={COLORES.brand}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="% FOJA"
            stroke={COLORES.azul}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
