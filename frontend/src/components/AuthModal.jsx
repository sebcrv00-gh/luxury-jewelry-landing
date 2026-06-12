import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Eye, EyeOff, Sparkles, Crown, Diamond, ArrowLeft, Mail, KeyRound, ShieldCheck, RefreshCw } from 'lucide-react';
import api from '../api/axios';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authModalMode, openAuthModal, login, register } = useAuth();
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginClave, setLoginClave] = useState('');
  
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regClave, setRegClave] = useState('');
  const [regConfirmClave, setRegConfirmClave] = useState('');
  const [loginCaptchaPrompt, setLoginCaptchaPrompt] = useState('');
  const [loginCaptchaToken, setLoginCaptchaToken] = useState('');
  const [loginCaptchaAnswer, setLoginCaptchaAnswer] = useState('');
  const [loginCaptchaLoading, setLoginCaptchaLoading] = useState(false);
  const [registerCaptchaPrompt, setRegisterCaptchaPrompt] = useState('');
  const [registerCaptchaToken, setRegisterCaptchaToken] = useState('');
  const [registerCaptchaAnswer, setRegisterCaptchaAnswer] = useState('');
  const [registerCaptchaLoading, setRegisterCaptchaLoading] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const overlayRef = useRef(null);

  // Recovery state
  const [recoveryMode, setRecoveryMode] = useState(null); // null | 'email' | 'code' | 'reset' | 'success'
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryEmailHint, setRecoveryEmailHint] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');

  async function loadSimpleCaptcha(action) {
    const isRegisterCaptcha = action === 'register';
    const setLoadingState = isRegisterCaptcha ? setRegisterCaptchaLoading : setLoginCaptchaLoading;
    const setPromptState = isRegisterCaptcha ? setRegisterCaptchaPrompt : setLoginCaptchaPrompt;
    const setTokenState = isRegisterCaptcha ? setRegisterCaptchaToken : setLoginCaptchaToken;
    const setAnswerState = isRegisterCaptcha ? setRegisterCaptchaAnswer : setLoginCaptchaAnswer;

    setLoadingState(true);
    try {
      const { data } = await api.get(`/auth/simple-captcha?action=${action}`);
      setPromptState(String(data?.prompt || '').trim());
      setTokenState(String(data?.token || '').trim());
      setAnswerState('');
    } catch {
      setPromptState('');
      setTokenState('');
      setError('No fue posible cargar el captcha de seguridad. Intenta nuevamente.');
    } finally {
      setLoadingState(false);
    }
  }

  useEffect(() => {
    if (isAuthModalOpen) {
      setIsClosing(false);
      setError('');
      setSuccess('');
      setShowPassword(false);
      setRecoveryMode(null);
      setRecoveryEmail('');
      setRecoveryCode('');
      setRecoveryEmailHint('');
      setRecoveryNewPassword('');
      setRecoveryConfirmPassword('');
      setRegConfirmClave('');
      setLoginCaptchaAnswer('');
      setRegisterCaptchaAnswer('');
    }
  }, [isAuthModalOpen, authModalMode]);

  useEffect(() => {
    if (!isAuthModalOpen || recoveryMode) return;
    loadSimpleCaptcha(authModalMode === 'register' ? 'register' : 'login');
  }, [isAuthModalOpen, authModalMode, recoveryMode]);

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
    if (!loginCaptchaToken || !loginCaptchaPrompt) { setError('No fue posible cargar el captcha. Recárgalo e inténtalo nuevamente.'); return; }
    if (!loginCaptchaAnswer.trim()) { setError('Resuelve el captcha antes de continuar.'); return; }
    setLoading(true);
    try {
      await login(loginEmail, loginClave, false, {
        captchaToken: loginCaptchaToken,
        captchaAnswer: loginCaptchaAnswer
      });
      handleClose();
      setLoginEmail('');
      setLoginClave('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      if (isAuthModalOpen) {
        loadSimpleCaptcha('login');
      }
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (regClave !== regConfirmClave) {
      setError('La confirmación de la contraseña debe coincidir');
      return;
    }
    if (!registerCaptchaToken || !registerCaptchaPrompt) {
      setError('No fue posible cargar el captcha. Recárgalo e inténtalo nuevamente.');
      return;
    }
    if (!registerCaptchaAnswer.trim()) {
      setError('Resuelve el captcha antes de continuar.');
      return;
    }
    setLoading(true);
    try {
      const registeredEmail = regEmail;
      await register(regNombre, regEmail, regClave, regConfirmClave, {
        captchaToken: registerCaptchaToken,
        captchaAnswer: registerCaptchaAnswer
      });
      setRegNombre('');
      setRegEmail('');
      setRegClave('');
      setRegConfirmClave('');
      openAuthModal('login');
      setLoginEmail(registeredEmail);
      setTimeout(() => {
        setSuccess('Cuenta creada correctamente. Ahora confirma tu acceso iniciando sesión.');
      }, 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
    } finally {
      if (isAuthModalOpen) {
        loadSimpleCaptcha('register');
      }
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
      setRecoveryEmailHint(data.emailHint || '');
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
      setRecoveryMode('reset');
    } catch (err) {
      setError(err.response?.data?.error || 'Codigo invalido');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!recoveryNewPassword || !recoveryConfirmPassword) {
      setError('Debes completar la nueva contraseña y su confirmación');
      return;
    }
    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setError('La confirmación de la contraseña debe coincidir');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/recovery/reset-password', {
        email: recoveryEmail,
        code: recoveryCode,
        newPassword: recoveryNewPassword,
        confirmPassword: recoveryConfirmPassword
      });
      setSuccess(data.message);
      setRecoveryMode('success');
    } catch (err) {
      setError(err.response?.data?.error || 'No fue posible actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const exitRecovery = () => {
    setRecoveryMode(null);
    setRecoveryEmail('');
    setRecoveryCode('');
    setRecoveryEmailHint('');
    setRecoveryNewPassword('');
    setRecoveryConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const isLogin = authModalMode === 'login';
  const renderSimpleCaptcha = ({ prompt, answer, setAnswer, token, loadingState, onRefresh, compactText }) => (
    <div className="auth-simple-captcha-wrap">
      <div className="auth-simple-captcha-box">
        <div className="auth-simple-captcha-head">
          <span className="auth-simple-captcha-label">Captcha de seguridad</span>
          <button
            type="button"
            className="auth-simple-captcha-refresh"
            onClick={onRefresh}
            disabled={loadingState}
            aria-label="Recargar captcha"
          >
            <RefreshCw size={15} className={loadingState ? 'is-spinning' : ''} />
          </button>
        </div>
        <div className="auth-simple-captcha-prompt">
          {loadingState ? 'Generando captcha...' : prompt || 'No fue posible generar el captcha.'}
        </div>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value.replace(/[^\d-]/g, '').slice(0, 6))}
          placeholder="Escribe tu respuesta"
          className="auth-simple-captcha-input"
          disabled={loadingState || !token}
          required
        />
      </div>
      <p className="auth-simple-captcha-note">{compactText}</p>
    </div>
  );

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
            <p className="recovery-desc">Ingresa tu correo electronico y te enviaremos un codigo de 6 digitos a tu bandeja de entrada para recuperar el acceso a tu cuenta.</p>
          </div>
          <div className="auth-field">
            <label>Correo Electrónico</label>
            <input type="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} placeholder="tu@email.com" required autoFocus />
          </div>
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <span className="auth-spinner"></span> : <>Solicitar Recuperación</>}
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
              Ingresa el codigo de 6 digitos enviado a <strong>{recoveryEmailHint || recoveryEmail}</strong>. Si no lo ves, revisa spam o correo no deseado.
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
              className="recovery-code-input"
            />
          </div>
          <p className="recovery-note">El codigo vence en pocos minutos. Si Brevo no responde o el correo no llega, vuelve a solicitar uno nuevo.</p>
          <button type="submit" className="auth-submit-btn" disabled={loading || recoveryCode.length < 6}>
            {loading ? <span className="auth-spinner"></span> : <>Verificar Código</>}
          </button>
        </form>
      );
    }

    if (recoveryMode === 'reset') {
      return (
        <form onSubmit={handleResetPassword} className="auth-form-fields">
          <div className="recovery-header">
            <button type="button" className="recovery-back-btn" onClick={() => { setRecoveryMode('code'); setError(''); setSuccess(''); }}>
              <ArrowLeft size={16} /> Volver
            </button>
            <div className="recovery-icon"><KeyRound size={28} /></div>
            <h3 className="recovery-title">Nueva Contraseña</h3>
            <p className="recovery-desc">
              Define una nueva contraseña para <strong>{recoveryEmailHint || recoveryEmail}</strong>. El código verificado seguirá activo hasta completar el cambio.
            </p>
          </div>
          <div className="auth-field">
            <label>Nueva contraseña</label>
            <div className="auth-password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={recoveryNewPassword}
                onChange={e => setRecoveryNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="auth-field">
            <label>Confirmar nueva contraseña</label>
            <div className="auth-password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={recoveryConfirmPassword}
                onChange={e => setRecoveryConfirmPassword(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                required
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <p className="recovery-note">Usa una contraseña robusta y distinta a la anterior para mantener tu cuenta protegida.</p>
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <span className="auth-spinner"></span> : <>Actualizar Contraseña</>}
          </button>
        </form>
      );
    }

    if (recoveryMode === 'success') {
      return (
        <div className="auth-form-fields" style={{ textAlign: 'center' }}>
          <div className="recovery-header">
            <div className="recovery-icon recovery-icon-success"><KeyRound size={28} /></div>
            <h3 className="recovery-title">¡Contraseña Actualizada!</h3>
            <p className="recovery-desc">
              Tu contraseña fue actualizada correctamente para <strong>{recoveryEmailHint || recoveryEmail}</strong>. Ya puedes iniciar sesión con la nueva clave.
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
                  {renderSimpleCaptcha({
                    prompt: loginCaptchaPrompt,
                    answer: loginCaptchaAnswer,
                    setAnswer: setLoginCaptchaAnswer,
                    token: loginCaptchaToken,
                    loadingState: loginCaptchaLoading,
                    onRefresh: () => loadSimpleCaptcha('login'),
                    compactText: 'Protección sencilla activa para validar accesos al sistema.'
                  })}
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
                    <label>Confirmar contraseña</label>
                    <div className="auth-password-wrap">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={regConfirmClave}
                        onChange={e => setRegConfirmClave(e.target.value)}
                        placeholder="Repite tu contraseña"
                        required
                      />
                      <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  {renderSimpleCaptcha({
                    prompt: registerCaptchaPrompt,
                    answer: registerCaptchaAnswer,
                    setAnswer: setRegisterCaptchaAnswer,
                    token: registerCaptchaToken,
                    loadingState: registerCaptchaLoading,
                    onRefresh: () => loadSimpleCaptcha('register'),
                    compactText: 'Validación simple activa para proteger la creación de cuentas.'
                  })}
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
