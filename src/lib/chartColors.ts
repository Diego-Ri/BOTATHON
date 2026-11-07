/** Paleta de gráficos alineada con los tokens de `index.css` (blanco, rojo y negro). */
export const COLORES = {
  brand: '#c80511',
  brandOscuro: '#82050e',
  brandClaro: '#f5535e',
  navy: '#111111',
  // Segunda serie de las tendencias: rojo de marca (distinto del negro).
  azul: '#c80511',
  directas: '#c80511',
  indirectas: '#111111',
  nas: '#c9c9c9',
  success: '#0f9f6e',
  warning: '#c98a16',
  danger: '#9a1b25',
  muted: '#8c8c8c',
  grid: '#e6e6e6',
  surface: '#ffffff',
} as const;

export const ESTILO_TOOLTIP = {
  borderRadius: 12,
  border: `1px solid ${COLORES.grid}`,
  boxShadow: '0 12px 32px -12px rgba(17, 17, 17, 0.3)',
  fontSize: 12,
  padding: '10px 12px',
} as const;
