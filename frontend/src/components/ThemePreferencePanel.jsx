import { Monitor, SunMedium, MoonStar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { THEME_OPTIONS } from '../utils/themePreferences';

const THEME_ICONS = {
  light: SunMedium,
  ambient: Monitor,
  dark: MoonStar
};

export default function ThemePreferencePanel({
  title = 'Estilo de la página',
  description = 'Elige la apariencia visual que prefieres para navegar por Luxury Jewelry.',
  className = ''
}) {
  const { themePreference, setThemePreference } = useAuth();

  return (
    <section className={`theme-preference-panel ${className}`.trim()}>
      <div className="theme-preference-head">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      <div className="theme-preference-grid">
        {THEME_OPTIONS.map((option) => {
          const Icon = THEME_ICONS[option.id] || Monitor;
          const isActive = themePreference === option.id;

          return (
            <button
              key={option.id}
              type="button"
              className={`theme-preference-option ${isActive ? 'is-active' : ''}`}
              onClick={() => {
                setThemePreference(option.id).catch(() => {
                  // La UI ya revierte el tema si la persistencia falla.
                });
              }}
            >
              <span className="theme-preference-icon">
                <Icon size={18} />
              </span>
              <span className="theme-preference-copy">
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
