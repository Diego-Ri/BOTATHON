import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartNoAxesCombined } from 'lucide-react';
import type { PuntoSerie } from '@/domain/types';
import { COLORES, ESTILO_TOOLTIP } from '@/lib/chartColors';
import { etiquetaPeriodoCorta, formatearNumero, formatearPctConSigno } from '@/lib/format';
import { EmptyState } from '@/components/ui/Feedback';

interface ComparativoChartProps {
  datos: PuntoSerie[];
  umbral: number;
}

interface TooltipItem {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string | number;
}

function TooltipComparativo({
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
      {payload.map((item) => {
        const esPorcentaje = item.dataKey === 'desviacion';
        return (
          <p key={item.name} className="flex items-center gap-2 text-muted">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.name}:{' '}
            <span className="font-semibold text-ink">
              {esPorcentaje
                ? formatearPctConSigno(item.value ?? 0)
                : formatearNumero(item.value ?? 0)}
            </span>
          </p>
        );
      })}
    </div>
  );
}

export function ComparativoChart({ datos, umbral }: ComparativoChartProps) {
  if (datos.length === 0) {
    return (
      <EmptyState
        icono={<ChartNoAxesCombined className="size-5" aria-hidden="true" />}
        titulo="Sin comparación disponible"
        descripcion="No hay registros planificados ni SIC para los filtros activos."
      />
    );
  }

  const data = datos.map((punto) => ({
    periodo: etiquetaPeriodoCorta(punto.periodo),
    Planificado: punto.indicadores.planificado,
    SIC: punto.indicadores.sic,
    desviacion: punto.indicadores.desviacion,
  }));

  return (
    <div className="h-80 w-full" role="img" aria-label="Comparación mensual entre planificado y SIC">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={COLORES.grid} strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="periodo"
            tick={{ fill: COLORES.muted, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: COLORES.grid }}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="atenciones"
            tick={{ fill: COLORES.muted, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(valor: number) => formatearNumero(valor)}
          />
          <YAxis
            yAxisId="desviacion"
            orientation="right"
            tick={{ fill: COLORES.muted, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            domain={[-50, 50]}
            tickFormatter={(valor: number) => `${valor}%`}
            width={44}
          />
          <Tooltip content={<TooltipComparativo />} cursor={{ fill: 'rgba(200,5,17,0.06)' }} />
          <Legend
            verticalAlign="bottom"
            height={34}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: COLORES.muted }}
          />
          <ReferenceLine
            yAxisId="desviacion"
            y={umbral}
            stroke={COLORES.danger}
            strokeDasharray="4 4"
          />
          <ReferenceLine
            yAxisId="desviacion"
            y={-umbral}
            stroke={COLORES.danger}
            strokeDasharray="4 4"
          />
          <ReferenceLine yAxisId="desviacion" y={0} stroke={COLORES.muted} />
          <Bar
            yAxisId="atenciones"
            dataKey="Planificado"
            fill={COLORES.nas}
            radius={[4, 4, 0, 0]}
            maxBarSize={26}
            isAnimationActive={false}
          />
          <Bar
            yAxisId="atenciones"
            dataKey="SIC"
            fill={COLORES.brand}
            radius={[4, 4, 0, 0]}
            maxBarSize={26}
            isAnimationActive={false}
          />
          <Line
            yAxisId="desviacion"
            type="monotone"
            dataKey="desviacion"
            name="Desviación SIC"
            stroke={COLORES.warning}
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ r: 2.5, fill: COLORES.warning }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
