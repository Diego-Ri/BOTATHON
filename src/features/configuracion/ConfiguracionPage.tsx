import { useEffect, useState } from 'react';
import {
  Check,
  Database,
  LayoutList,
  RotateCcw,
  Save,
  ServerCog,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  CONFIGURACION_INICIAL,
  DESCRIPCION_ROL,
  ETIQUETAS_ROL,
} from '@/domain/constants';
import { ACCESO_VISTAS, ROLES } from '@/domain/permissions';
import type { Rol } from '@/domain/types';
import { NAVEGACION } from '@/components/layout/nav';
import { USUARIOS_DEMO } from '@/data/seed';
import { PageHeader } from '@/components/data/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, type TonoBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { InlineAlert } from '@/components/ui/Feedback';
import { useConfiguracion, useConfiguracionStore } from '@/store/configuracion';
import { formatearPct } from '@/lib/format';

const TONO_ROL: Record<Rol, TonoBadge> = {
  profesional: 'brand',
  jefatura_area: 'info',
  direccion_instituto: 'success',
  direccion_nacional: 'neutral',
};

interface Formulario {
  metaGestionObjetivo: string;
  fojaObjetivo: string;
  umbralDesviacion: string;
}

export default function ConfiguracionPage() {
  const configuracion = useConfiguracion();
  const actualizar = useConfiguracionStore((estado) => estado.actualizar);
  const restablecer = useConfiguracionStore((estado) => estado.restablecer);
  const [formulario, setFormulario] = useState<Formulario>({
    metaGestionObjetivo: String(configuracion.metaGestionObjetivo),
    fojaObjetivo: String(configuracion.fojaObjetivo),
    umbralDesviacion: String(configuracion.umbralDesviacion),
  });
  const [errores, setErrores] = useState<Partial<Formulario>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    setFormulario({
      metaGestionObjetivo: String(configuracion.metaGestionObjetivo),
      fojaObjetivo: String(configuracion.fojaObjetivo),
      umbralDesviacion: String(configuracion.umbralDesviacion),
    });
  }, [configuracion]);

  useEffect(() => {
    if (!mensaje) return;
    const temporizador = window.setTimeout(() => setMensaje(null), 3500);
    return () => window.clearTimeout(temporizador);
  }, [mensaje]);

  const cambiar = (clave: keyof Formulario, valor: string) => {
    setFormulario((actual) => ({ ...actual, [clave]: valor }));
    setErrores((actual) => ({ ...actual, [clave]: undefined }));
    setMensaje(null);
  };

  const guardar = () => {
    const nuevosErrores: Partial<Formulario> = {};
    const meta = Number(formulario.metaGestionObjetivo.replace(',', '.'));
    const foja = Number(formulario.fojaObjetivo.replace(',', '.'));
    const umbral = Number(formulario.umbralDesviacion.replace(',', '.'));

    if (!Number.isFinite(meta) || meta < 1 || meta > 100) {
      nuevosErrores.metaGestionObjetivo = 'Debe estar entre 1% y 100%.';
    }
    if (!Number.isFinite(foja) || foja < 1 || foja > 100) {
      nuevosErrores.fojaObjetivo = 'Debe estar entre 1% y 100%.';
    }
    if (!Number.isFinite(umbral) || umbral < 1 || umbral > 50) {
      nuevosErrores.umbralDesviacion = 'Debe estar entre 1% y 50%.';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    actualizar({
      metaGestionObjetivo: Math.round(meta * 10) / 10,
      fojaObjetivo: Math.round(foja * 10) / 10,
      umbralDesviacion: Math.round(umbral * 10) / 10,
    });
    setMensaje('Parámetros guardados. Se aplicaron a todas las vistas y exportaciones.');
  };

  const restaurar = () => {
    restablecer();
    setErrores({});
    setMensaje('Se restablecieron los valores iniciales del sistema.');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Configuración"
        titulo="Parámetros del panel"
        descripcion="Ajusta las metas de referencia y el umbral del semáforo. Los cambios se guardan en este navegador hasta conectar la configuración al backend."
        acciones={<Badge tono="brand">Solo dirección nacional</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { etiqueta: 'Roles definidos', valor: '4', detalle: 'Un alcance por rol' },
          { etiqueta: 'Vistas', valor: '8', detalle: '7 de gestión + login' },
          { etiqueta: 'Usuarios demo', valor: '5', detalle: 'Para recorrer todos los alcances' },
          { etiqueta: 'Cuentas estimadas', valor: '86', detalle: '72 profesionales + jefaturas y direcciones' },
        ].map((dato) => (
          <Card key={dato.etiqueta} className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {dato.etiqueta}
            </p>
            <p className="mt-1 text-2xl font-semibold text-ink tabular">{dato.valor}</p>
            <p className="mt-0.5 text-[11px] text-muted">{dato.detalle}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            titulo="Parámetros de gestión"
            descripcion="Valores usados en KPIs, semáforos, alertas y reportes exportados."
            icono={<Settings2 className="size-4" aria-hidden="true" />}
          />
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                etiqueta="Meta de gestión objetivo"
                type="number"
                min={1}
                max={100}
                step={0.5}
                value={formulario.metaGestionObjetivo}
                onChange={(event) => cambiar('metaGestionObjetivo', event.target.value)}
                sufijo="%"
                error={errores.metaGestionObjetivo}
                ayuda="Referencia institucional. Por defecto 90%."
              />
              <Input
                etiqueta="% FOJA objetivo"
                type="number"
                min={1}
                max={100}
                step={0.5}
                value={formulario.fojaObjetivo}
                onChange={(event) => cambiar('fojaObjetivo', event.target.value)}
                sufijo="%"
                error={errores.fojaObjetivo}
                ayuda="Ocupación esperada de la jornada asistencial."
              />
              <Input
                etiqueta="Umbral de desviación planificado vs SIC"
                type="number"
                min={1}
                max={50}
                step={0.5}
                value={formulario.umbralDesviacion}
                onChange={(event) => cambiar('umbralDesviacion', event.target.value)}
                sufijo="%"
                error={errores.umbralDesviacion}
                ayuda="Sobre este valor, la vista muestra alerta roja."
              />
              <div className="flex items-end">
                <div className="w-full rounded-lg bg-soft px-3 py-2.5 text-[11px] leading-relaxed text-muted ring-1 ring-inset ring-line">
                  Regla actual: verde hasta{' '}
                  <strong className="text-ink">
                    {formatearPct(configuracion.umbralDesviacion * 0.5)}
                  </strong>
                  , ámbar hasta{' '}
                  <strong className="text-ink">
                    {formatearPct(configuracion.umbralDesviacion)}
                  </strong>
                  , alerta sobre ese valor.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Button onClick={guardar} icono={<Save className="size-4" aria-hidden="true" />}>
                Guardar cambios
              </Button>
              <Button
                variante="outline"
                onClick={restaurar}
                icono={<RotateCcw className="size-4" aria-hidden="true" />}
              >
                Restablecer
              </Button>
              <span className="text-[11px] text-muted">
                Valores iniciales: {CONFIGURACION_INICIAL.metaGestionObjetivo}% /{' '}
                {CONFIGURACION_INICIAL.fojaObjetivo}% / umbral{' '}
                {CONFIGURACION_INICIAL.umbralDesviacion}%
              </span>
            </div>

            {mensaje ? (
              <InlineAlert tono="success" titulo="Configuración actualizada">
                {mensaje}
              </InlineAlert>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            titulo="Origen de datos"
            descripcion="Hoy la demo usa datos deterministas en memoria; el contrato ya existe."
            icono={<Database className="size-4" aria-hidden="true" />}
            accion={
              <Badge tono="info">
                {import.meta.env.VITE_REPOSITORIO === 'http' ? 'HTTP' : 'Mock local'}
              </Badge>
            }
          />
          <CardBody className="space-y-4">
            <div className="rounded-xl bg-navy p-4 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
                Repositorio activo
              </p>
              <p className="mt-1 font-mono text-xs">
                {import.meta.env.VITE_REPOSITORIO === 'http'
                  ? import.meta.env.VITE_API_URL ?? '/api'
                  : 'MockRepository · datos demo'}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-white/55">
                Cambia a <code className="text-brand-200">VITE_REPOSITORIO=http</code>{' '}
                y define <code className="text-brand-200">VITE_API_URL</code> para usar
                el backend.
              </p>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Contrato previsto
              </p>
              <ul className="space-y-1.5 font-mono text-[11px] text-muted">
                <li><span className="font-semibold text-brand-700">GET</span> /api/catalogos</li>
                <li><span className="font-semibold text-brand-700">GET</span> /api/metas?instituto=&amp;area=&amp;cargo=&amp;mes=&amp;profesional=</li>
                <li><span className="font-semibold text-brand-700">GET</span> /api/series?...</li>
                <li><span className="font-semibold text-brand-700">GET/PUT</span> /api/configuracion</li>
                <li><span className="font-semibold text-brand-700">POST</span> /api/auth/session</li>
              </ul>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-[11px] leading-relaxed text-warning-strong ring-1 ring-inset ring-warning/20">
              <ServerCog className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <p>
                El backend debe derivar el alcance desde la sesión y repetir los
                filtros. Ocultar un control en la UI no es un control de seguridad.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          titulo="Matriz de roles y vistas"
          descripcion="8 vistas incluyendo login. La navegación se genera desde esta misma matriz."
          icono={<LayoutList className="size-4" aria-hidden="true" />}
          accion={<Badge tono="brand">4 roles</Badge>}
        />
        <div className="scrollbar-sutil overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <caption className="sr-only">
              Acceso de cada rol a las vistas del sistema
            </caption>
            <thead>
              <tr className="border-b border-line bg-soft text-[10px] uppercase tracking-wide text-muted">
                <th scope="col" className="px-5 py-2.5 font-semibold">Rol</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Alcance de datos</th>
                {NAVEGACION.map((vista) => (
                  <th key={vista.id} scope="col" className="px-3 py-2.5 text-center font-semibold">
                    {vista.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ROLES.map((rol) => (
                <tr key={rol}>
                  <td className="px-5 py-3">
                    <Badge tono={TONO_ROL[rol]}>{ETIQUETAS_ROL[rol]}</Badge>
                  </td>
                  <td className="px-3 py-3 text-[11px] text-muted">
                    {DESCRIPCION_ROL[rol]}
                  </td>
                  {NAVEGACION.map((vista) => {
                    const permite = ACCESO_VISTAS[vista.id].includes(rol);
                    return (
                      <td key={vista.id} className="px-3 py-3 text-center">
                        {permite ? (
                          <Check className="mx-auto size-4 text-success" aria-label="Permitido" />
                        ) : (
                          <span className="text-muted/40" aria-label="No permitido">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader
            titulo="Usuarios demo"
            descripcion="5 cuentas para recorrer los cuatro alcances sin cambiar de sesión manualmente."
            icono={<Users className="size-4" aria-hidden="true" />}
            accion={<Badge tono="neutral">5 usuarios</Badge>}
          />
          <ul className="divide-y divide-line">
            {USUARIOS_DEMO.map((usuarioDemo) => (
              <li key={usuarioDemo.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar
                  nombre={usuarioDemo.nombre}
                  iniciales={usuarioDemo.iniciales}
                  tamano="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">
                    {usuarioDemo.nombre}
                  </p>
                  <p className="truncate text-[10px] text-muted">
                    {usuarioDemo.descripcion}
                  </p>
                </div>
                <Badge tono={TONO_ROL[usuarioDemo.rol]}>
                  {ETIQUETAS_ROL[usuarioDemo.rol]}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            titulo="Siguiente paso · backend"
            descripcion="Checklist para reemplazar el mock sin reescribir la UI."
            icono={<ShieldCheck className="size-4" aria-hidden="true" />}
          />
          <CardBody>
            <ul className="space-y-3 text-xs text-muted">
              {[
                'Implementar GET /catalogos, /metas y /series con los mismos tipos del dominio.',
                'Derivar el alcance del usuario desde la sesión y devolver 403 si intenta salir de él.',
                'Persistir la configuración con auditoría (usuario, fecha y valores anteriores).',
                'Reemplazar la sesión demo por OIDC/SSO sin cambiar useUsuarioActual.',
                'Mover la generación de PDF/Excel al servidor si se requiere historial centralizado.',
                'Agregar pruebas de contrato y de conciliación de totales contra el motor.',
              ].map((paso) => (
                <li key={paso} className="flex items-start gap-2">
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    <Check className="size-2.5" aria-hidden="true" />
                  </span>
                  {paso}
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-lg bg-soft px-3 py-2.5 text-[11px] leading-relaxed text-muted ring-1 ring-inset ring-line">
              El dominio, el motor de cálculo y los tipos ya están separados de la
              capa de datos. La conexión se reduce a implementar{' '}
              <code className="font-semibold text-ink">DataRepository</code>.
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
