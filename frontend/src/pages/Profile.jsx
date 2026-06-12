import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../api/axios';
import api from '../api/axios';
import { Lock, KeyRound, Eye, EyeOff, X, ShieldCheck, Diamond } from 'lucide-react';
import ThemePreferencePanel from '../components/ThemePreferencePanel';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

export default function Profile() {
  const { user, isLoggedIn, loading, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fotoFile, setFotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Password Modal State
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const pwdOverlayRef = useRef(null);

  useEffect(() => {
    if (!loading && !isLoggedIn) navigate('/login');
  }, [loading, isLoggedIn, navigate]);

  useEffect(() => {
    if (user) {
      setNombre(user.nombre || '');
      setEmail(user.email || '');
      setTelefono(user.telefono || '');
      setDireccion(user.direccion || '');
      setPreviewUrl(user.foto ? getImageUrl(user.foto) : DEFAULT_AVATAR);
    }
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    setSaving(true);

    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('email', email);
    formData.append('telefono', telefono);
    formData.append('direccion', direccion);
    if (fotoFile) formData.append('foto', fotoFile);

    try {
      await updateProfile(formData);
      setMessage('¡Tus datos han sido actualizados con éxito!');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirm = window.confirm("🚨 ADVERTENCIA: ¿Estás seguro que deseas borrar tu cuenta para siempre? Esta acción no se puede deshacer.");
    if (!confirm) return;

    setDeleting(true);
    try {
      await api.delete('/auth/profile');
      await logout();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar la cuenta');
      setDeleting(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdError(''); setPwdSuccess('');
    if (!pwdCurrent || !pwdNew) { setPwdError('Todos los campos son obligatorios'); return; }
    if (pwdNew.length < 6) { setPwdError('La nueva contraseña debe tener al menos 6 caracteres'); return; }
    
    setPwdLoading(true);
    try {
      const { data } = await api.put('/auth/change-password', { currentPassword: pwdCurrent, newPassword: pwdNew });
      setPwdSuccess(data.message);
      setPwdCurrent('');
      setPwdNew('');
      setTimeout(() => setShowPwdModal(false), 2500);
    } catch (err) {
      setPwdError(err.response?.data?.error || 'Error al actualizar la contraseña');
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) return <div className="loading-screen">Cargando...</div>;
  if (!user) return null;

  return (
    <div className="profile-layout">
      <aside className="profile-sidebar">
        <img src={previewUrl} alt="Foto de perfil" className="avatar-img" />
        <h3>{user.nombre}</h3>
        <p>Miembro Exclusivo</p>
        <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        <button type="button" className="btn-change-photo" onClick={() => fileRef.current?.click()}>
          Cambiar fotografía
        </button>
      </aside>

      <main className="profile-main">
        <h2>Mis Datos Personales</h2>

        {message && <div className="auth-alert auth-alert-success" style={{ margin: '0 0 20px 0' }}><span>✓</span> {message}</div>}
        {error && <div className="auth-alert auth-alert-error" style={{ margin: '0 0 20px 0' }}><span>⚠</span> {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre Completo</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Correo Electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Teléfono</label>
            <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+57 300 000 0000" />
          </div>

          <div className="form-group">
            <label>Dirección de Envío</label>
            <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Ej: Calle 14 No.2-101, Ibagué" />
          </div>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '10px' }}>
            <button type="submit" className="form-submit" disabled={saving || deleting} style={{ margin: 0, flex: 1 }}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button 
              type="button" 
              className="btn-outline" 
              onClick={() => { setShowPwdModal(true); setPwdError(''); setPwdSuccess(''); setPwdCurrent(''); setPwdNew(''); setShowPwd(false); }}
              style={{ padding: '14px 24px', flex: 1, display: 'flex', gap: '8px', justifyContent: 'center' }}
            >
              <KeyRound size={16} /> Modificar Contraseña
            </button>
          </div>
        </form>

        <div className="profile-theme-block">
          <ThemePreferencePanel
            title="Estilo de la página"
            description="Tu preferencia visual se guarda en tu cuenta para que siempre vuelvas al mismo ambiente, incluso al iniciar sesión desde otro dispositivo."
          />
        </div>

        <div style={{ marginTop: '50px', paddingTop: '30px', borderTop: '1px solid var(--border-subtle)' }}>
          <h3 style={{ color: 'var(--danger)', fontSize: '1.2rem', marginBottom: '10px' }}>Zona de Peligro</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Si borras tu cuenta, todos tus datos e historial de compras se perderán de manera permanente. 
            Esta acción es irreversible.
          </p>
          <button 
            type="button" 
            className="btn-danger" 
            onClick={handleDeleteAccount}
            disabled={saving || deleting}
            style={{ width: '100%', padding: '14px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}
          >
            {deleting ? 'Borrando...' : 'Borrar tu Cuenta Exclusiva'}
          </button>
        </div>
      </main>

      {/* ─── Password Change Modal ─── */}
      {showPwdModal && (
        <div className="auth-modal-overlay" ref={pwdOverlayRef} onClick={() => setShowPwdModal(false)}>
          <div className="auth-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', flexDirection: 'column' }}>
            
            <button className="auth-modal-close" onClick={() => setShowPwdModal(false)}>
              <X size={20} />
            </button>
            
            <div className="auth-modal-form-side" style={{ borderRadius: '20px' }}>
              <div className="recovery-header" style={{ marginBottom: '30px' }}>
                <div className="recovery-icon"><Lock size={28} /></div>
                <h3 className="recovery-title">Actualizar Contraseña</h3>
                <p className="recovery-desc">Mantén tu cuenta segura cambiando tu contraseña periódicamente.</p>
                <div className="auth-brand-ornament" style={{ justifyContent: 'center', marginTop: '15px' }}>
                  <span className="ornament-line"></span>
                  <Diamond size={10} style={{ color: 'var(--gold)' }} />
                  <span className="ornament-line"></span>
                </div>
              </div>

              {pwdError && (
                <div className="auth-alert auth-alert-error">
                  <span>⚠</span> {pwdError}
                </div>
              )}
              {pwdSuccess && (
                <div className="auth-alert auth-alert-success">
                  <span>✓</span> {pwdSuccess}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="auth-form-fields">
                <div className="auth-field">
                  <label>Contraseña Actual</label>
                  <div className="auth-password-wrap">
                    <input 
                      type={showPwd ? "text" : "password"} 
                      value={pwdCurrent} 
                      onChange={e => setPwdCurrent(e.target.value)} 
                      placeholder="••••••••" 
                      required 
                    />
                    <button type="button" className="auth-eye-btn" onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div className="auth-field">
                  <label>Nueva Contraseña</label>
                  <div className="auth-password-wrap">
                    <input 
                      type={showPwd ? "text" : "password"} 
                      value={pwdNew} 
                      onChange={e => setPwdNew(e.target.value)} 
                      placeholder="Mínimo 6 caracteres" 
                      required 
                    />
                    <button type="button" className="auth-eye-btn" onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn" disabled={pwdLoading} style={{ marginTop: '15px' }}>
                  {pwdLoading ? (
                    <span className="auth-spinner"></span>
                  ) : (
                    <><ShieldCheck size={18} style={{ marginRight: '8px' }}/> Guardar Nueva Contraseña</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
