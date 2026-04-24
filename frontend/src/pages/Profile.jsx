import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

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

  useEffect(() => {
    if (!loading && !isLoggedIn) navigate('/login');
  }, [loading, isLoggedIn, navigate]);

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

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

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

          <button type="submit" className="form-submit" disabled={saving || deleting}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>

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
    </div>
  );
}
