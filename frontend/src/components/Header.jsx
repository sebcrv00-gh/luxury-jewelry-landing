import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, LogIn, MoonStar, Palette, SunMedium, UserPlus, UserRound, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../api/axios';
import { THEME_OPTIONS } from '../utils/themePreferences';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

export default function Header() {
  const { user, isLoggedIn, isAdmin, logout, openAuthModal, themePreference, setThemePreference } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showGuestThemeMenu, setShowGuestThemeMenu] = useState(false);

  const themeIcons = {
    light: SunMedium,
    ambient: Monitor,
    dark: MoonStar
  };

  const handleLogout = async () => {
    await logout();
    setShowDropdown(false);
    setIsMobileMenuOpen(false);
  };

  const fotoSrc = user?.foto
    ? getImageUrl(user.foto)
    : DEFAULT_AVATAR;

  const path = location.pathname;
  const adminMenuLinks = [
    { to: '/admin?tab=dashboard', label: 'Panel Ejecutivo' },
    { to: '/admin?tab=inventory', label: 'Inventario' },
    { to: '/admin?tab=orders', label: 'Pedidos' },
    { to: '/admin?tab=clients', label: 'Clientes' },
    { to: '/admin?tab=tickets', label: 'Soporte' },
    { to: '/admin?tab=profile', label: 'Perfil Admin' }
  ];
  const clientMenuLinks = [
    { to: '/mi-cuenta', label: 'Mi Panel' },
    { to: '/mi-cuenta/perfil', label: 'Editar Perfil' },
    { to: '/mi-cuenta/pedidos', label: 'Mis Pedidos' },
    { to: '/mi-cuenta/wishlist', label: 'Lista de Deseos' },
    { to: '/perfil#preferencias-tema', label: 'Temas' }
  ];
  const themeSettingsLink = isAdmin
    ? '/admin?tab=settings&section=appearance'
    : '/perfil#preferencias-tema';

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowDropdown(false);
    setShowGuestThemeMenu(false);
  }, [path]);

  const handleOpenGuestAuth = (mode) => {
    openAuthModal(mode);
    setShowDropdown(false);
    setShowGuestThemeMenu(false);
    setIsMobileMenuOpen(false);
  };

  const handleThemeShortcut = () => {
    navigate(themeSettingsLink);
    setShowDropdown(false);
    setIsMobileMenuOpen(false);
  };

  const handleGuestThemeChange = (themeId) => {
    setThemePreference(themeId).catch(() => {});
  };

  return (
    <header className="main-header">
      <div className="header-content">
        <div className="logo-box" onClick={() => navigate(isAdmin ? '/admin?tab=dashboard' : '/')}>
          <img src="/images/Logo_Luxury_Joyeria-removebg-preview.png" alt="Logo Luxury Jewelry" />
          <span>Luxury Jewelry</span>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          className={`mobile-menu-toggle ${isMobileMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`nav-bar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          {!isAdmin && <Link to="/" className={path === '/' ? 'active-nav' : ''}>Inicio</Link>}
          {!isAdmin && <Link to="/catalogo" className={path === '/catalogo' ? 'active-nav' : ''}>Catálogo</Link>}
          {isAdmin && <Link to="/admin?tab=dashboard" className={path.startsWith('/admin') ? 'active-nav' : ''}>Centro de Control</Link>}

          {isLoggedIn ? (
            <div className="user-dropdown-container">
              <div className="user-widget" onClick={() => setShowDropdown(!showDropdown)}>
                <img src={fotoSrc} alt="Perfil" className="user-avatar" />
                <div className="hamburger-icon">
                  <span></span><span></span><span></span>
                </div>
              </div>

              <div className={`dropdown-menu ${showDropdown ? 'show' : ''}`}>
                <div className="dropdown-header">
                  <span className="dropdown-name">{user.nombre}</span>
                  <span className="dropdown-email">{user.email}</span>
                </div>

                {(isAdmin ? adminMenuLinks : clientMenuLinks).map(({ to, label }) => (
                  <Link key={to} to={to} onClick={() => setShowDropdown(false)}>{label}</Link>
                ))}

                {isAdmin && (
                  <button type="button" className="dropdown-action-btn" onClick={handleThemeShortcut}>
                    <Palette size={16} />
                    <span>Temas</span>
                  </button>
                )}

                <button onClick={handleLogout} className="btn-logout-dropdown">Cerrar Sesión</button>
              </div>
            </div>
          ) : (
            <div className="user-dropdown-container guest-dropdown-container">
              <button
                type="button"
                className="user-widget guest-widget"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span className="guest-widget-badge">
                  <UserRound size={16} />
                </span>
                <span className="guest-widget-label">Acceder</span>
                <ChevronDown size={16} className={`guest-widget-chevron ${showDropdown ? 'is-open' : ''}`} />
              </button>

              <div className={`dropdown-menu ${showDropdown ? 'show' : ''}`}>
                <div className="dropdown-header">
                  <span className="dropdown-name">Bienvenido a Luxury Jewelry</span>
                  <span className="dropdown-email">Accede o crea tu cuenta para una experiencia personalizada.</span>
                </div>

                <div
                  className={`guest-theme-group ${showGuestThemeMenu ? 'is-open' : ''}`}
                  onMouseEnter={() => setShowGuestThemeMenu(true)}
                  onMouseLeave={() => setShowGuestThemeMenu(false)}
                >
                  <button
                    type="button"
                    className="dropdown-action-btn guest-theme-toggle"
                    onClick={() => setShowGuestThemeMenu((current) => !current)}
                  >
                    <Palette size={16} />
                    <span>Temas</span>
                    <ChevronDown size={16} className={`guest-theme-toggle-chevron ${showGuestThemeMenu ? 'is-open' : ''}`} />
                  </button>

                  <div className="guest-theme-submenu">
                    {THEME_OPTIONS.map((option) => {
                      const ThemeIcon = themeIcons[option.id] || Palette;
                      const isActiveTheme = themePreference === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`guest-theme-option ${isActiveTheme ? 'is-active' : ''}`}
                          onClick={() => handleGuestThemeChange(option.id)}
                        >
                          <ThemeIcon size={15} />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button type="button" className="dropdown-action-btn" onClick={() => handleOpenGuestAuth('login')}>
                  <LogIn size={16} />
                  <span>Iniciar sesión</span>
                </button>
                <button type="button" className="dropdown-action-btn" onClick={() => handleOpenGuestAuth('register')}>
                  <UserPlus size={16} />
                  <span>Crear cuenta</span>
                </button>
              </div>
            </div>
          )}

          {!isAdmin && <Link to="/carrito" className={`carrito-btn no-underline ${path === '/carrito' ? 'active-nav' : ''}`}>🛒 Carrito</Link>}
        </nav>
      </div>
    </header>
  );
}
