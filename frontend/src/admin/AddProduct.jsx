import { useState, useRef } from 'react';
import api from '../api/axios';

export default function AddProduct({ onProductAdded }) {
  const fileRef = useRef(null);

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [imagen, setImagen] = useState(null);
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagen(file);
      setFileName(file.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    setSaving(true);

    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('categoria', categoria);
    formData.append('descripcion', descripcion);
    formData.append('precio', precio);
    formData.append('stock', stock);
    if (imagen) formData.append('imagen', imagen);

    try {
      const res = await api.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(`✦ ¡Pieza registrada con éxito! SKU: ${res.data.sku}`);
      setNombre(''); setCategoria(''); setDescripcion('');
      setPrecio(''); setStock(''); setImagen(null); setFileName('');
      if (onProductAdded) onProductAdded();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al conectar con la b\u00f3veda de datos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="premium-form-section">
      <h3 className="text-gold-light" style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '30px', textAlign: 'center' }}>
        Alta de Nueva Joya
      </h3>

      {message && <div className="alert alert-success" style={{ marginBottom: '30px' }}>{message}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: '30px' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', marginBottom: '30px' }}>
          <div className="form-group">
            <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Nombre de la Pieza</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Reloj Rolex Submariner" required />
          </div>

          <div className="form-group">
            <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Familia / Categor\u00eda</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)} required>
              <option value="">Seleccione una familia...</option>
              <option value="Anillos">Anillos de Lujo</option>
              <option value="Collares">Collares y Gargantillas</option>
              <option value="Pulseras">Pulseras Gold</option>
              <option value="Aretes">Aretes y Pendientes</option>
              <option value="Relojes">Alta Relojer\u00eda</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '30px' }}>
          <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Detalles T\u00e9cnicos y Descripci\u00f3n</label>
          <textarea rows="3" value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Especifique quilates, materiales, tipo de corte..." required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '30px', marginBottom: '30px' }}>
          <div className="form-group">
            <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Precio (COP)</label>
            <input type="number" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="0.00" required />
          </div>
          <div className="form-group">
            <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Stock Inicial</label>
            <input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder="0" required />
          </div>
          <div className="form-group">
            <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Fotograf\u00eda de Cat\u00e1logo</label>
            <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <button type="button" className="btn-outline" onClick={() => fileRef.current?.click()} style={{ width: '100%', height: '52px', fontSize: '0.8rem' }}>
              {fileName ? `\u2713 ${fileName.substring(0, 12)}...` : '+ Adjuntar Imagen'}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '18px' }} disabled={saving}>
          <span style={{ position: 'relative', zIndex: 1 }}>
            {saving ? 'Procesando en B\u00f3veda...' : 'Confirmar e Incorporar al Cat\u00e1logo'}
          </span>
        </button>
      </form>
    </div>
  );
}
