import type { AppLocale } from '../types/locale';

export function resolveContentLocale(uiLocale: AppLocale): AppLocale {
  if (uiLocale === 'fr') return 'en';
  return uiLocale;
}
