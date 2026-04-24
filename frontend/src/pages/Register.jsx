import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [nums, setNums] = useState([0, 0]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setNums([Math.floor(Math.random() * 10) + 1, Math.floor(Math.random() * 10) + 1]);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (parseInt(captchaAnswer) !== nums[0] + nums[1]) {
      setError('La respuesta de verificación es incorrecta');
      return;
    }

    setLoading(true);
    try {
      await register(nombre, email, clave);
      setSuccess('¡Registro exitoso! Redirigiendo al inicio de sesión...');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="form-container">
        <h2>Crear Cuenta</h2>
        <p className="form-subtitle">Únete al mundo de la exclusividad</p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre completo</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" required />
          </div>

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
                placeholder="Mínimo 6 caracteres" 
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

          <div className="form-group">
            <label>Verificación: ¿Cuánto es {nums[0]} + {nums[1]}?</label>
            <input type="number" value={captchaAnswer} onChange={e => setCaptchaAnswer(e.target.value)} placeholder="Tu respuesta" required />
          </div>

          <button type="submit" className="form-submit" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Registrarme'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 500 }}>Inicia sesión aquí</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
