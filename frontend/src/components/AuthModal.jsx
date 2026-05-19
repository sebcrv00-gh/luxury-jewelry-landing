import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Eye, EyeOff, Sparkles, Crown, Diamond, ArrowLeft, Mail, KeyRound, ShieldCheck } from 'lucide-react';
import api from '../api/axios';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authModalMode, openAuthModal, login, register } = useAuth();
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginClave, setLoginClave] = useState('');
  
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regClave, setRegClave] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [nums, setNums] = useState([0, 0]);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const overlayRef = useRef(null);

  // Recovery state
  const [recoveryMode, setRecoveryMode] = useState(null); // null | 'email' | 'code' | 'success'
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [phoneHint, setPhoneHint] = useState('');

  useEffect(() => {
    if (isAuthModalOpen) {
      setIsClosing(false);
      setError('');
      setSuccess('');
      setShowPassword(false);
      setRecoveryMode(null);
      setRecoveryEmail('');
      setRecoveryCode('');
      setPhoneHint('');
      if (authModalMode === 'register') {
        setNums([Math.floor(Math.random() * 10) + 1, Math.floor(Math.random() * 10) + 1]);
      }
    }
  }, [isAuthModalOpen, authModalMode]);

  // Escape key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') handleClose(); };
    if (isAuthModalOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      closeAuthModal();
      setIsClosing(false);
    }, 400);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginEmail || !loginClave) { setError('Todos los campos son obligatorios'); return; }
    setLoading(true);
    try {
      await login(loginEmail, loginClave);
      handleClose();
      setLoginEmail('');
      setLoginClave('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (parseInt(captchaAnswer) !== nums[0] + nums[1]) {
      setError('La respuesta de verificación es incorrecta');
      return;
    }
    setLoading(true);
    try {
      await register(regNombre, regEmail, regClave);
      await login(regEmail, regClave); // Log in immediately
      handleClose(); // Close the modal, global WelcomeAnimation kicks in
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  // ─── Recovery Handlers ───
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!recoveryEmail) { setError('Ingresa tu correo electrónico'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/recovery/request-code', { email: recoveryEmail });
      setPhoneHint(data.phoneHint || '');
      setSuccess(data.message);
      setRecoveryMode('code');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!recoveryCode) { setError('Ingresa el código de verificación'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/recovery/verify-code', { email: recoveryEmail, code: recoveryCode });
      setSuccess(data.message);
      setRecoveryMode('success');
    } catch (err) {
      setError(err.response?.data?.error || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const exitRecovery = () => {
    setRecoveryMode(null);
    setRecoveryEmail('');
    setRecoveryCode('');
    setPhoneHint('');
    setError('');
    setSuccess('');
  };

  const isLogin = authModalMode === 'login';

  // ─── Recovery UI Renderer ───
  const renderRecovery = () => {
    if (recoveryMode === 'email') {
      return (
        <form onSubmit={handleRequestCode} className="auth-form-fields">
          <div className="recovery-header">
            <button type="button" className="recovery-back-btn" onClick={exitRecovery}>
              <ArrowLeft size={16} /> Volver
            </button>
            <div className="recovery-icon"><Mail size={28} /></div>
            <h3 className="recovery-title">Recuperar Contraseña</h3>
            <p className="recovery-desc">Ingresa tu correo electrónico y te enviaremos un código de verificación.</p>
          </div>
          <div className="auth-field">
            <label>Correo Electrónico</label>
            <input type="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} placeholder="tu@email.com" required autoFocus />
          </div>
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <span className="auth-spinner"></span> : <>Enviar Código</>}
          </button>
        </form>
      );
    }

    if (recoveryMode === 'code') {
      return (
        <form onSubmit={handleVerifyCode} className="auth-form-fields">
          <div className="recovery-header">
            <button type="button" className="recovery-back-btn" onClick={() => { setRecoveryMode('email'); setError(''); setSuccess(''); }}>
              <ArrowLeft size={16} /> Volver
            </button>
            <div className="recovery-icon"><ShieldCheck size={28} /></div>
            <h3 className="recovery-title">Verificar Código</h3>
            <p className="recovery-desc">
              Hemos enviado un código de 6 dígitos a <strong>{recoveryEmail}</strong>.
              {phoneHint && <><br/>Teléfono registrado: <strong>{phoneHint}</strong></>}
            </p>
          </div>
          <div className="auth-field">
            <label>Código de Verificación</label>
            <input 
              type="text" 
              value={recoveryCode} 
              onChange={e => setRecoveryCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
              placeholder="000000" 
              required 
              autoFocus
              maxLength={6}
              style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.4rem', fontWeight: '600' }}
            />
          </div>
          <button type="submit" className="auth-submit-btn" disabled={loading || recoveryCode.length < 6}>
            {loading ? <span className="auth-spinner"></span> : <>Verificar y Recuperar</>}
          </button>
        </form>
      );
    }

    if (recoveryMode === 'success') {
      return (
        <div className="auth-form-fields" style={{ textAlign: 'center' }}>
          <div className="recovery-header">
            <div className="recovery-icon recovery-icon-success"><KeyRound size={28} /></div>
            <h3 className="recovery-title">¡Contraseña Recuperada!</h3>
            <p className="recovery-desc">
              Tu nueva contraseña ha sido enviada a <strong>{recoveryEmail}</strong>. Revisa tu bandeja de entrada.
            </p>
          </div>
          <button type="button" className="auth-submit-btn" onClick={exitRecovery}>
            Volver a Iniciar Sesión
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`auth-modal-overlay ${isClosing ? 'closing' : ''}`} ref={overlayRef} onClick={handleClose}>
      <div className={`auth-modal-card ${isClosing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        
        {/* ─── LEFT: Branding Panel ─── */}
        <div className="auth-modal-brand">
          <div className="auth-brand-bg"></div>
          <div className="auth-brand-content">
            <div className="auth-brand-logo">
              <img src="/images/Logo_Luxury_Joyeria-removebg-preview.png" alt="Luxury Jewelry" />
            </div>
            <h3 className="auth-brand-title">Luxury Jewelry</h3>
            <p className="auth-brand-tagline">
              {recoveryMode 
                ? 'Recupera el acceso a tu cuenta' 
                : isLogin 
                  ? 'Bienvenido de vuelta a la elegancia' 
                  : 'Únete al mundo de la exclusividad'}
            </p>
            <div className="auth-brand-ornament">
              <span className="ornament-line"></span>
              <Diamond size={14} />
              <span className="ornament-line"></span>
            </div>
            <div className="auth-brand-features">
              <div className="auth-feature">
                <Crown size={16} />
                <span>Colecciones exclusivas</span>
              </div>
              <div className="auth-feature">
                <Sparkles size={16} />
                <span>Ofertas personalizadas</span>
              </div>
              <div className="auth-feature">
                <Diamond size={16} />
                <span>Acceso anticipado</span>
              </div>
            </div>
          </div>
          {/* Floating Particles */}
          <div className="auth-particle auth-particle-1"></div>
          <div className="auth-particle auth-particle-2"></div>
          <div className="auth-particle auth-particle-3"></div>
          <div className="auth-particle auth-particle-4"></div>
          <div className="auth-particle auth-particle-5"></div>
        </div>

        {/* ─── RIGHT: Form Panel ─── */}
        <div className="auth-modal-form-side">
          <button className="auth-modal-close" onClick={handleClose}>
            <X size={20} />
          </button>

          {/* Tab Switcher (hidden during recovery) */}
          {!recoveryMode && (
            <div className="auth-tab-switcher">
              <button 
                className={`auth-tab ${isLogin ? 'active' : ''}`} 
                onClick={() => openAuthModal('login')}
              >
                Iniciar Sesión
              </button>
              <button 
                className={`auth-tab ${!isLogin ? 'active' : ''}`} 
                onClick={() => openAuthModal('register')}
              >
                Crear Cuenta
              </button>
              <div className={`auth-tab-indicator ${isLogin ? 'left' : 'right'}`}></div>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="auth-alert auth-alert-error">
              <span>⚠</span> {error}
            </div>
          )}
          {success && (
            <div className="auth-alert auth-alert-success">
              <span>✓</span> {success}
            </div>
          )}

          {/* ─── Recovery Flow ─── */}
          {recoveryMode ? renderRecovery() : (
            <>
              {/* ─── Login Form ─── */}
              {isLogin ? (
                <form onSubmit={handleLogin} className="auth-form-fields">
                  <div className="auth-field">
                    <label>Correo Electrónico</label>
                    <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="tu@email.com" required />
                  </div>
                  <div className="auth-field">
                    <label>Contraseña</label>
                    <div className="auth-password-wrap">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={loginClave} 
                        onChange={e => setLoginClave(e.target.value)} 
                        placeholder="••••••••" 
                        required 
                      />
                      <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="recovery-link" 
                    onClick={() => { setRecoveryMode('email'); setError(''); setSuccess(''); }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                  <button type="submit" className="auth-submit-btn" disabled={loading}>
                    {loading ? (
                      <span className="auth-spinner"></span>
                    ) : (
                      <>Acceder</>
                    )}
                  </button>
                </form>
              ) : (
                /* ─── Register Form ─── */
                <form onSubmit={handleRegister} className="auth-form-fields">
                  <div className="auth-field">
                    <label>Nombre completo</label>
                    <input type="text" value={regNombre} onChange={e => setRegNombre(e.target.value)} placeholder="Tu nombre" required />
                  </div>
                  <div className="auth-field">
                    <label>Correo Electrónico</label>
                    <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="tu@email.com" required />
                  </div>
                  <div className="auth-field">
                    <label>Contraseña</label>
                    <div className="auth-password-wrap">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={regClave} 
                        onChange={e => setRegClave(e.target.value)} 
                        placeholder="Mínimo 6 caracteres" 
                        required 
                      />
                      <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="auth-field">
                    <label>Verificación: ¿Cuánto es {nums[0]} + {nums[1]}?</label>
                    <input type="number" value={captchaAnswer} onChange={e => setCaptchaAnswer(e.target.value)} placeholder="Tu respuesta" required />
                  </div>
                  <button type="submit" className="auth-submit-btn" disabled={loading}>
                    {loading ? (
                      <span className="auth-spinner"></span>
                    ) : (
                      <>Registrarme</>
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
