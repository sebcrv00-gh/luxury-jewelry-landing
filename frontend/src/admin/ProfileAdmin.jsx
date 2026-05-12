import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Camera, CheckCircle, AlertCircle, Save, Trash2, User, Phone, MapPin, Mail } from 'lucide-react';
import api from '../api/axios';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

export default function ProfileAdmin() {
  const { user, updateProfile } = useAuth();
  const fileRef = useRef(null);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fotoFile, setFotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setNombre(user.nombre || '');
      setEmail(user.email || '');
      setTelefono(user.telefono || '');
      setDireccion(user.direccion || '');
      setPreviewUrl(user.foto ? `http://localhost:3001/${user.foto}` : DEFAULT_AVATAR);
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
    setMessage(null);
    setSaving(true);

    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('email', email);
    formData.append('telefono', telefono);
    formData.append('direccion', direccion);
    if (fotoFile) formData.append('foto', fotoFile);

    try {
      await updateProfile(formData);
      setMessage({ type: 'success', text: '¡Perfil actualizado con la elegancia que te caracteriza!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al actualizar el perfil' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const inputStyle = {
    width: '100%', padding: '14px 18px 14px 45px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
    borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'all 0.3s',
    fontFamily: 'var(--font-body)'
  };

  const iconStyle = {
    position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-light)', opacity: 0.6
  };

  return (
    <div className="profile-admin-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="admin-header" style={{ marginBottom: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--gold)', letterSpacing: '2px' }}>MI PERFIL DE ADMINISTRADOR</h2>
        <p style={{ color: 'var(--text-muted)' }}>Gestiona tu identidad y seguridad dentro del ecosistema Luxury.</p>
      </div>

      {message && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 24px', borderRadius: '12px', marginBottom: '32px', background: message.type === 'success' ? 'rgba(78,205,196,0.08)' : 'rgba(231,76,60,0.08)', border: `1px solid ${message.type === 'success' ? 'rgba(78,205,196,0.3)' : 'rgba(231,76,60,0.3)'}`, color: message.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: '0.9rem', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          {message.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '40px' }}>
        {/* LADO IZQUIERDO: FOTO */}
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <div style={{ width: '180px', height: '180px', borderRadius: '50%', border: '2px solid var(--gold)', padding: '5px', background: 'rgba(201,168,76,0.1)' }}>
              <img src={previewUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            </div>
            <button 
              type="button" 
              onClick={() => fileRef.current?.click()}
              style={{ position: 'absolute', bottom: '8px', right: '8px', width: '45px', height: '45px', borderRadius: '50%', background: 'var(--gold)', border: 'none', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', transition: 'transform 0.3s' }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Camera size={20} />
            </button>
            <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>{user.nombre}</h3>
          <span style={{ color: 'var(--gold-light)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '600' }}>Administrador Master</span>
          
          <div style={{ marginTop: '32px', width: '100%', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Tu imagen de perfil es visible en los registros de auditoría y para los clientes en el soporte técnico.
            </p>
          </div>
        </div>

        {/* LADO DERECHO: FORMULARIO */}
        <div className="glass-card" style={{ padding: '40px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Nombre Completo</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={iconStyle} />
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} required />
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Correo Electrónico</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={iconStyle} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Teléfono de Contacto</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} style={iconStyle} />
                  <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} style={inputStyle} placeholder="+57 300 000 0000" />
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Dirección de Oficina</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={18} style={iconStyle} />
                  <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} style={inputStyle} placeholder="Calle 123 #45-67" />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={saving}
                style={{ padding: '16px 40px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', letterSpacing: '2px' }}
              >
                {saving ? 'GUARDANDO...' : <><Save size={18} /> GUARDAR CAMBIOS</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
