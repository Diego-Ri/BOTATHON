import { CheckCircle2, Calculator } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { horasCuadran } from '@/domain/calc';
import type { Configuracion, Indicadores } from '@/domain/types';
import {
  formatearHoras,
  formatearNumero,
  formatearPct,
  formatearPctConSigno,
} from '@/lib/format';

interface TrazabilidadCardProps {
  indicadores: Indicadores;
  configuracion: Configuracion;
}

export function TrazabilidadCard({
  indicadores,
  configuracion,
}: TrazabilidadCardProps) {
  const concilia = horasCuadran(indicadores);

  return (
    <Card>
      <CardHeader
        titulo="Trazabilidad del cálculo"
        descripcion="Los porcentajes se recalculan sobre estos totales, no se promedian."
        icono={<Calculator className="size-4" aria-hidden="true" />}
        accion={
          <Badge
            tono={concilia ? 'success' : 'warning'}
            icono={
              concilia ? (
                <CheckCircle2 className="size-3" aria-hidden="true" />
              ) : undefined
            }
          >
            {concilia ? 'Cuadra con el motor' : 'Revisar desglose'}
          </Badge>
        }
      />
      <CardBody className="space-y-3">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Atenciones
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink tabular">
              {formatearNumero(indicadores.atencionesRealizadas)} reales /{' '}
              {formatearNumero(indicadores.atencionesObjetivo)} objetivo
            </dd>
            <dd className="text-[11px] text-muted">
              Meta de gestión {formatearPct(indicadores.metaGestion)} · objetivo{' '}
              {formatearPct(configuracion.metaGestionObjetivo)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Planificado vs SIC
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink tabular">
              {formatearNumero(indicadores.planificado)} /{' '}
              {formatearNumero(indicadores.sic)}
            </dd>
            <dd className="text-[11px] text-muted">
              Desviación {formatearPctConSigno(indicadores.desviacion)} · umbral{' '}
              {formatearPct(configuracion.umbralDesviacion)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Desglose de horas
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink tabular">
              {formatearHoras(indicadores.horasDirectas)} directas +{' '}
              {formatearHoras(indicadores.horasIndirectas)} indirectas +{' '}
              {formatearHoras(indicadores.horasNAS)} NAS ={' '}
              {formatearHoras(indicadores.horasContratadas)} contratadas
            </dd>
            <dd className="text-[11px] text-muted">
              % FOJA {formatearPct(indicadores.foja)} · objetivo{' '}
              {formatearPct(configuracion.fojaObjetivo)}
            </dd>
          </div>
        </dl>
      </CardBody>
    </Card>
  );
}
