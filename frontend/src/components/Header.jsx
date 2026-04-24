import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

export default function Header() {
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setShowDropdown(false);
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const fotoSrc = user?.foto
    ? `http://localhost:3001/${user.foto}`
    : DEFAULT_AVATAR;

  const path = location.pathname;

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowDropdown(false);
  }, [path]);

  return (
    <header className="main-header">
      <div className="header-content">
        <div className="logo-box" onClick={() => navigate('/')}>
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
          <Link to="/" className={path === '/' ? 'active-nav' : ''}>Inicio</Link>
          <Link to="/catalogo" className={path === '/catalogo' ? 'active-nav' : ''}>Catálogo</Link>

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
                
                <Link to="/perfil" onClick={() => setShowDropdown(false)}>Mi Perfil</Link>
                {isAdmin && <Link to="/admin/productos" onClick={() => setShowDropdown(false)}>⚙ Dashboard Admin</Link>}
                
                <button onClick={handleLogout} className="btn-logout-dropdown">Cerrar Sesión</button>
              </div>
            </div>
          ) : (
            <>
              <Link to="/registro" className={path === '/registro' ? 'active-nav' : ''}>Registrarse</Link>
              <Link to="/login" className={path === '/login' ? 'active-nav' : ''}>Iniciar sesión</Link>
            </>
          )}

          <Link to="/carrito" className={`carrito-btn no-underline ${path === '/carrito' ? 'active-nav' : ''}`}>🛒 Carrito</Link>
        </nav>
      </div>
    </header>
  );
}
