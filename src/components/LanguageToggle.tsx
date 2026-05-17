import { AppLocale } from '../types/locale';

const LOCALES: { code: AppLocale; label: string }[] = [
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
];

interface LanguageToggleProps {
  selected: AppLocale[];
  onChange: (langs: AppLocale[]) => void;
}

export function LanguageToggle({ selected, onChange }: LanguageToggleProps) {
  function toggle(code: AppLocale) {
    if (selected.includes(code)) {
      if (selected.length === 1) return;
      onChange(selected.filter((l) => l !== code));
    } else {
      onChange([...selected, code]);
    }
  }

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {LOCALES.map(({ code, label }) => (
        <label
          key={code}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
            selected.includes(code)
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(code)}
            onChange={() => toggle(code)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium">{label}</span>
        </label>
      ))}
    </div>
  );
}
