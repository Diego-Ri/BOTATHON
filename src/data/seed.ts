import { PERIODOS, PERIODO_ACTUAL } from '@/domain/constants';
import type {
  Area,
  Cargo,
  Catalogo,
  Instituto,
  MetaMensual,
  Profesional,
  Usuario,
} from '@/domain/types';

/** RNG determinista: mismos datos demo en cada carga y en los tests. */
function mulberry32(semilla: number) {
  let estado = semilla;
  return () => {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function redondear1(valor: number): number {
  return Math.round(valor * 10) / 10;
}

const INSTITUTOS: Instituto[] = [
  {
    id: 'inst-inr',
    nombre: 'Instituto Nacional de Rehabilitación',
    sigla: 'INR',
  },
  {
    id: 'inst-int',
    nombre: 'Instituto Nacional del Tórax',
    sigla: 'INT',
  },
  {
    id: 'inst-ino',
    nombre: 'Instituto Nacional de Oncología',
    sigla: 'INO',
  },
];

const AREAS: Area[] = [
  { id: 'area-inr-fisica', institutoId: 'inst-inr', nombre: 'Rehabilitación Física' },
  { id: 'area-inr-neuro', institutoId: 'inst-inr', nombre: 'Rehabilitación Neurológica' },
  { id: 'area-inr-respiratoria', institutoId: 'inst-inr', nombre: 'Terapia Respiratoria' },
  { id: 'area-int-medicina', institutoId: 'inst-int', nombre: 'Medicina Respiratoria' },
  { id: 'area-int-cirugia', institutoId: 'inst-int', nombre: 'Cirugía Torácica' },
  { id: 'area-int-imagenes', institutoId: 'inst-int', nombre: 'Imágenes Diagnósticas' },
  { id: 'area-ino-medica', institutoId: 'inst-ino', nombre: 'Oncología Médica' },
  { id: 'area-ino-radioterapia', institutoId: 'inst-ino', nombre: 'Radioterapia' },
  { id: 'area-ino-paliativos', institutoId: 'inst-ino', nombre: 'Cuidados Paliativos' },
];

const CARGOS: Cargo[] = [
  { id: 'kinesiologia', nombre: 'Kinesiología' },
  { id: 'enfermeria', nombre: 'Enfermería' },
  { id: 'medicina', nombre: 'Medicina' },
  { id: 'terapia_ocupacional', nombre: 'Terapia Ocupacional' },
  { id: 'fonoaudiologia', nombre: 'Fonoaudiología' },
  { id: 'psicologia', nombre: 'Psicología' },
];

const NOMBRES = [
  'Camila', 'Matías', 'Paula', 'Andrés', 'Valentina', 'Diego', 'Francisca', 'Javier',
  'Daniela', 'Sebastián', 'Antonia', 'Cristóbal', 'Josefa', 'Nicolás', 'Fernanda', 'Ignacio',
  'Catalina', 'Rodrigo', 'Constanza', 'Felipe', 'María', 'Tomás', 'Javiera', 'Vicente',
  'Isidora', 'Benjamín', 'Amanda', 'Lucas', 'Trinidad', 'Martín', 'Emilia', 'Álvaro',
  'Renata', 'Gabriel', 'Florencia', 'Simón', 'Magdalena', 'Joaquín', 'Paz', 'Maximiliano',
];

const APELLIDOS = [
  'Rojas', 'Fuentes', 'Herrera', 'Salinas', 'Soto', 'Pérez', 'Silva', 'Montoya',
  'Mena', 'González', 'Muñoz', 'Rivas', 'Castro', 'Araya', 'Vergara', 'Navarro',
  'Espinoza', 'Valdés', 'Sepúlveda', 'Contreras', 'Morales', 'Ortiz', 'Ramírez', 'Cáceres',
  'Torres', 'Flores', 'Reyes', 'Gutiérrez', 'Paredes', 'Vargas', 'Sandoval', 'Leiva',
  'Cortés', 'Figueroa', 'Núñez', 'Riquelme', 'Tapia', 'Alarcón', 'Bustos', 'Peña',
];

const PATRON_CARGOS: Record<string, string[]> = {
  rehabilitacion: [
    'kinesiologia', 'kinesiologia', 'terapia_ocupacional', 'fonoaudiologia',
    'enfermeria', 'medicina', 'psicologia', 'kinesiologia',
  ],
  respiratorio: [
    'medicina', 'enfermeria', 'kinesiologia', 'kinesiologia',
    'enfermeria', 'medicina', 'psicologia', 'terapia_ocupacional',
  ],
  oncologia: [
    'medicina', 'enfermeria', 'psicologia', 'enfermeria',
    'medicina', 'kinesiologia', 'terapia_ocupacional', 'fonoaudiologia',
  ],
  imagenes: [
    'medicina', 'enfermeria', 'kinesiologia', 'medicina',
    'enfermeria', 'psicologia', 'terapia_ocupacional', 'kinesiologia',
  ],
};

const CARGOS_POR_AREA: Record<string, keyof typeof PATRON_CARGOS> = {
  'area-inr-fisica': 'rehabilitacion',
  'area-inr-neuro': 'rehabilitacion',
  'area-inr-respiratoria': 'respiratorio',
  'area-int-medicina': 'respiratorio',
  'area-int-cirugia': 'respiratorio',
  'area-int-imagenes': 'imagenes',
  'area-ino-medica': 'oncologia',
  'area-ino-radioterapia': 'oncologia',
  'area-ino-paliativos': 'oncologia',
};

const HORAS = [176, 154, 132, 88, 176, 176, 154, 132];

function crearProfesionales(): Profesional[] {
  const usados = new Set<string>();
  const profesionales: Profesional[] = [];
  let indice = 0;

  for (const [indiceArea, area] of AREAS.entries()) {
    const patron = PATRON_CARGOS[CARGOS_POR_AREA[area.id] ?? 'rehabilitacion'] ?? PATRON_CARGOS.rehabilitacion;
    const instituto = INSTITUTOS.find((item) => item.id === area.institutoId);
    if (!instituto) continue;

    for (let posicion = 0; posicion < 8; posicion += 1) {
      let nombre = '';
      let intento = 0;

      do {
        const nombreBase = NOMBRES[(indice * 3 + indiceArea + intento) % NOMBRES.length];
        const apellido1 = APELLIDOS[(indice * 5 + indiceArea * 2 + intento) % APELLIDOS.length];
        const apellido2 = APELLIDOS[(indice * 11 + posicion + intento * 2) % APELLIDOS.length];
        nombre = `${nombreBase} ${apellido1} ${apellido2}`;
        intento += 1;
      } while (usados.has(nombre) && intento < 40);

      usados.add(nombre);
      profesionales.push({
        id: `prof-${String(indice + 1).padStart(3, '0')}`,
        nombre,
        cargoId: patron[posicion] ?? 'medicina',
        areaId: area.id,
        institutoId: area.institutoId,
        horasContratadas: HORAS[posicion] ?? 176,
        activo: true,
      });
      indice += 1;
    }
  }

  return profesionales;
}

function crearRegistros(profesionales: Profesional[]): MetaMensual[] {
  const registros: MetaMensual[] = [];

  for (const [indicePeriodo, periodo] of PERIODOS.entries()) {
    for (const profesional of profesionales) {
      const random = mulberry32(hash(`${profesional.id}-${periodo.id}-metasalud`));
      const factorJornada = profesional.horasContratadas / 176;
      const tendencia = 1 + indicePeriodo * 0.004;

      const objetivo = Math.round(
        (228 + random() * 64) * factorJornada * tendencia,
      );
      const desempeno = 0.76 + random() * 0.35;
      const realizadas = Math.round(objetivo * desempeno);

      const horasDirectas = redondear1(
        profesional.horasContratadas * (0.65 + random() * 0.1),
      );
      const horasIndirectas = redondear1(
        profesional.horasContratadas * (0.18 + random() * 0.06),
      );
      const horasNAS = redondear1(
        Math.max(0, profesional.horasContratadas - horasDirectas - horasIndirectas),
      );

      const planificado = Math.round(objetivo * (0.96 + random() * 0.08));
      const sorteo = random();
      let desviacion: number;

      if (sorteo < 0.68) {
        desviacion = (random() * 2 - 1) * 5;
      } else if (sorteo < 0.88) {
        desviacion = (random() > 0.5 ? 1 : -1) * (5 + random() * 5);
      } else {
        desviacion = (random() > 0.5 ? 1 : -1) * (10.4 + random() * 17);
      }

      const sic = Math.max(1, Math.round(planificado * (1 + desviacion / 100)));

      registros.push({
        id: `meta-${profesional.id}-${periodo.id}`,
        profesionalId: profesional.id,
        periodo: periodo.id,
        atencionesObjetivo: objetivo,
        atencionesRealizadas: realizadas,
        horasDirectas,
        horasIndirectas,
        horasNAS,
        horasContratadas: profesional.horasContratadas,
        planificado,
        sic,
      });
    }
  }

  return registros;
}

export const PROFESIONALES_SEED = crearProfesionales();
export const METAS_SEED = crearRegistros(PROFESIONALES_SEED);

export const CATALOGO_SEED: Catalogo = {
  institutos: INSTITUTOS,
  areas: AREAS,
  cargos: CARGOS,
  profesionales: PROFESIONALES_SEED,
  periodos: PERIODOS,
  periodoActual: PERIODO_ACTUAL,
};

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}

const camila = PROFESIONALES_SEED.find(
  (profesional) =>
    profesional.areaId === 'area-inr-fisica' &&
    profesional.cargoId === 'kinesiologia',
);
const matias = PROFESIONALES_SEED.find(
  (profesional) =>
    profesional.areaId === 'area-int-medicina' &&
    profesional.cargoId === 'enfermeria',
);

if (camila) camila.nombre = 'Camila Rojas Pérez';
if (matias) matias.nombre = 'Matías Fuentes Silva';

export const USUARIOS_DEMO: Usuario[] = [
  {
    id: 'usr-prof-camila',
    nombre: camila?.nombre ?? 'Camila Rojas Pérez',
    email: 'camila.rojas@metasalud.cl',
    rol: 'profesional',
    cargo: 'Kinesióloga',
    cargoId: camila?.cargoId ?? 'kinesiologia',
    institutoId: 'inst-inr',
    areaId: 'area-inr-fisica',
    profesionalId: camila?.id ?? 'prof-001',
    iniciales: iniciales(camila?.nombre ?? 'Camila Rojas'),
    descripcion: 'Kinesiología · Rehabilitación Física · INR',
  },
  {
    id: 'usr-prof-matias',
    nombre: matias?.nombre ?? 'Matías Fuentes Silva',
    email: 'matias.fuentes@metasalud.cl',
    rol: 'profesional',
    cargo: 'Enfermero',
    cargoId: matias?.cargoId ?? 'enfermeria',
    institutoId: 'inst-int',
    areaId: 'area-int-medicina',
    profesionalId: matias?.id ?? 'prof-025',
    iniciales: iniciales(matias?.nombre ?? 'Matías Fuentes'),
    descripcion: 'Enfermería · Medicina Respiratoria · INT',
  },
  {
    id: 'usr-jef-paula',
    nombre: 'Paula Herrera Díaz',
    email: 'paula.herrera@metasalud.cl',
    rol: 'jefatura_area',
    cargo: 'Kinesióloga · Jefa de área',
    institutoId: 'inst-inr',
    areaId: 'area-inr-fisica',
    iniciales: iniciales('Paula Herrera Díaz'),
    descripcion: 'Jefatura · Rehabilitación Física · INR',
  },
  {
    id: 'usr-dir-andres',
    nombre: 'Andrés Salinas Montoya',
    email: 'andres.salinas@metasalud.cl',
    rol: 'direccion_instituto',
    cargo: 'Director del instituto',
    institutoId: 'inst-inr',
    iniciales: iniciales('Andrés Salinas Montoya'),
    descripcion: 'Dirección · Instituto Nacional de Rehabilitación',
  },
  {
    id: 'usr-nac-valentina',
    nombre: 'Valentina Soto Mena',
    email: 'valentina.soto@metasalud.cl',
    rol: 'direccion_nacional',
    cargo: 'Dirección nacional',
    iniciales: iniciales('Valentina Soto Mena'),
    descripcion: 'Visión nacional · 3 institutos · 9 áreas',
  },
];

export const USUARIO_POR_ID = new Map(USUARIOS_DEMO.map((usuario) => [usuario.id, usuario]));
