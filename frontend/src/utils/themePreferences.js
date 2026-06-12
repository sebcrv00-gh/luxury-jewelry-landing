export const DEFAULT_THEME_PREFERENCE = 'dark';
export const THEME_PREFERENCE_STORAGE_KEY = 'luxury-jewelry-theme';

export const THEME_OPTIONS = [
  {
    id: 'light',
    label: 'Modo claro',
    shortLabel: 'Claro',
    description: 'Interfaz luminosa y limpia para sesiones diurnas o entornos muy iluminados.'
  },
  {
    id: 'ambient',
    label: 'Modo ambiente',
    shortLabel: 'Ambiente',
    description: 'Paleta suave y elegante con contraste medio para una lectura más cálida.'
  },
  {
    id: 'dark',
    label: 'Modo oscuro',
    shortLabel: 'Oscuro',
    description: 'Estética premium profunda y sofisticada. Es el estilo predeterminado del sistema.'
  }
];

export function normalizeThemePreference(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return THEME_OPTIONS.some(option => option.id === normalized)
    ? normalized
    : DEFAULT_THEME_PREFERENCE;
}
