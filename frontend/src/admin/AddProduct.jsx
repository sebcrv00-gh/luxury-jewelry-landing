import { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
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
      setMessage(`¡Pieza registrada con éxito! SKU generado: ${res.data.sku}`);
      setNombre(''); setCategoria(''); setDescripcion('');
      setPrecio(''); setStock(''); setImagen(null); setFileName('');
      
      if (onProductAdded) {
        setTimeout(() => {
          onProductAdded();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al conectar con la bóveda de datos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h3 className="text-gold-light" style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '32px', textAlign: 'center' }}>
        Registro de Nueva Joya
      </h3>

      {message && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
          <CheckCircle2 size={20} />
          {message}
        </div>
      )}
      
      {error && (
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', marginBottom: '32px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Denominación de la Pieza</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Reloj Rolex Submariner" required />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Familia / Categoría</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)} required>
              <option value="">Seleccione una familia...</option>
              <option value="Anillos">Anillos de Lujo</option>
              <option value="Collares">Collares y Gargantillas</option>
              <option value="Pulseras">Pulseras Gold</option>
              <option value="Aretes">Aretes y Pendientes</option>
              <option value="Relojes">Alta Relojería</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '32px' }}>
          <label>Detalles Técnicos y Descripción</label>
          <textarea rows="3" value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Especifique quilates, materiales, tipo de corte..." required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px', marginBottom: '40px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Valor Comercial (COP)</label>
            <input type="number" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="0.00" required />
          </div>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Stock Inicial</label>
            <input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder="0" required />
          </div>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Fotografía Principal (Catálogo)</label>
            <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <button 
              type="button" 
              className="btn-outline" 
              onClick={() => fileRef.current?.click()} 
              style={{ width: '100%', height: '54px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              <UploadCloud size={18} />
              {fileName ? fileName.substring(0, 16) + '...' : 'Subir Imagen'}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '20px', fontSize: '0.9rem' }} disabled={saving}>
          <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            {saving ? (
              <>
                <RefreshCw size={20} className="spinning" />
                Validando Autenticidad e Ingresando a Bóveda...
              </>
            ) : 'Confirmar Registro en Catálogo Oficial'}
          </span>
        </button>
      </form>
    </div>
  );
}
