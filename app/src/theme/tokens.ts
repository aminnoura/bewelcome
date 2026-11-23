export const colors = {
  brand: '#F37000',
  brandDark: '#CD5E00',
  brandSoft: '#FFF4EC',
  brandSoftText: '#C25200',

  ink: '#0F172A',
  inkSecondary: '#334155',
  muted: '#64748B',
  subtle: '#94A3B8',

  canvas: '#F7F6F3',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EFEA',
  border: 'rgba(15, 23, 42, 0.08)',
  borderStrong: 'rgba(15, 23, 42, 0.14)',

  green: '#10B981',
  greenDark: '#059669',
  greenSoft: '#ECFDF5',
  greenText: '#047857',

  amber: '#F59E0B',
  amberSoft: '#FFFBEB',
  amberText: '#B45309',

  blue: '#0EA5E9',
  blueSoft: '#F0F9FF',
  blueText: '#0369A1',

  red: '#EF4444',
  redSoft: '#FEF2F2',
  redText: '#B91C1C',

  white: '#FFFFFF',
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 999,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
} as const;

export const breakpoints = {
  tablet: 768,
  desktop: 1024,
} as const;
