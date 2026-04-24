import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, isLoggedIn, isAdmin } = useAuth();

  return (
    <>
      <section className="hero-section">
        <div className="video-container">
          <video autoPlay loop muted playsInline>
            <source src="/videos/Video_inicio.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="hero-content">
          {isLoggedIn ? (
            <div className="glass-card">
              <h2 className="hero-title" style={{ fontSize: '2.8rem', marginBottom: '8px' }}>
                Panel de <em>Control</em>
              </h2>
              <span style={{
                color: 'var(--gold-light)',
                fontSize: '1.15rem',
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontWeight: 300,
                display: 'block',
                marginBottom: '28px',
                letterSpacing: '1px'
              }}>
                Bienvenido de vuelta, {user.nombre}
              </span>
              <p className="hero-subtitle" style={{ marginBottom: '38px' }}>
                Gestiona tus compras, explora las nuevas colecciones
                y accede a tus beneficios exclusivos como miembro.
              </p>
              <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {isAdmin && (
                  <Link to="/admin/productos">
                    <button className="btn-outline" style={{ borderColor: 'var(--rose-gold)', color: 'var(--rose-gold)' }}>
                      ⚙ Dashboard Admin
                    </button>
                  </Link>
                )}
                <Link to="/catalogo">
                  <button className="btn-outline">Explorar Catálogo</button>
                </Link>
                <Link to="/carrito">
                  <button className="btn-primary"><span>Ver mi Carrito</span></button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="hero-title">
                Bienvenido a <em>Luxury&nbsp;Jewelry</em>
              </h2>
              <p className="hero-subtitle">
                Donde el brillo, la exclusividad y la perfección se convierten en arte.
                <br />
                Descubre piezas creadas para quienes solo aceptan lo extraordinario.
              </p>
              <Link to="/catalogo">
                <button className="btn-outline">Descubrir Colección</button>
              </Link>
            </>
          )}
        </div>
      </section>

      {!isLoggedIn && (
        <section className="about-section">
          <h3>¿Quiénes somos?</h3>
          <span className="gold-accent">Artesanía · Exclusividad · Elegancia</span>
          <p>
            En <strong>Luxury Jewelry</strong>, nos especializamos en ofrecer joyas
            únicas que combinan diseño exclusivo, tradición y elegancia. Nuestro
            compromiso es brindar piezas que cuenten historias, reflejen emociones
            y acompañen a nuestros clientes en sus momentos más memorables.
          </p>
        </section>
      )}
    </>
  );
}
