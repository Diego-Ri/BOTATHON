import type { ReactNode } from 'react';
import { Calculator } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

interface FormulaCardProps {
  titulo?: string;
  formula: string;
  calculo: string;
  resultado: string;
  descripcion?: string;
  icono?: ReactNode;
}

/** Fórmula + reemplazo numérico: deja la trazabilidad visible en pantalla. */
export function FormulaCard({
  titulo = 'Cómo se calcula',
  formula,
  calculo,
  resultado,
  descripcion,
  icono,
}: FormulaCardProps) {
  return (
    <Card>
      <CardHeader
        titulo={titulo}
        descripcion={descripcion}
        icono={icono ?? <Calculator className="size-4" aria-hidden="true" />}
      />
      <CardBody className="space-y-3">
        <p className="text-sm font-semibold leading-relaxed text-ink">{formula}</p>
        <div className="overflow-x-auto rounded-lg border border-line bg-soft px-3 py-2.5">
          <code className="whitespace-nowrap font-mono text-xs text-muted">
            {calculo}
          </code>
        </div>
        <p className="text-lg font-semibold text-brand-800 tabular">{resultado}</p>
      </CardBody>
    </Card>
  );
}
