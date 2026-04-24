import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !clave) { setError('Todos los campos son obligatorios'); return; }

    setLoading(true);
    try {
      await login(email, clave);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="form-container">
        <h2>Iniciar Sesión</h2>
        <p className="form-subtitle">Accede a tu cuenta exclusiva</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                value={clave} 
                onChange={e => setClave(e.target.value)} 
                placeholder="••••••••" 
                required 
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Ocultar" : "Mostrar"}
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <button type="submit" className="form-submit" disabled={loading}>
            {loading ? 'Verificando...' : 'Acceder'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            ¿No tienes cuenta? <Link to="/registro" style={{ color: 'var(--gold)', fontWeight: 500 }}>Regístrate aquí</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
