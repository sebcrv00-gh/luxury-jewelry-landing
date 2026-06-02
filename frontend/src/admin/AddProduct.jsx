import { useState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ImagePlus,
  Plus,
  Trash2
} from 'lucide-react';
import api from '../api/axios';

const createVariant = () => ({
  key: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  stock: '',
  imagen: null,
  preview: '',
  fileName: '',
  existingImageUrl: ''
});

export default function AddProduct({ onProductAdded }) {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [imagen, setImagen] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [fileName, setFileName] = useState('');
  const [variantes, setVariantes] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragTarget, setDragTarget] = useState('');

  const assignMainImage = (file) => {
    if (file) {
      setImagen(file);
      setFileName(file.name);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleFileChange = (e) => {
    assignMainImage(e.target.files[0]);
  };

  const updateVariant = (key, field, value) => {
    setVariantes(prev => prev.map(variant => (
      variant.key === key ? { ...variant, [field]: value } : variant
    )));
  };

  const assignVariantImage = (key, file) => {
    if (!file) return;
    setVariantes(prev => prev.map(variant => (
      variant.key === key
        ? {
            ...variant,
            imagen: file,
            fileName: file.name,
            preview: URL.createObjectURL(file)
          }
        : variant
    )));
  };

  const totalVariantStock = variantes.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  const hasVariants = variantes.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (hasVariants) {
      const invalidVariant = variantes.find(variant =>
        !variant.imagen || Number(variant.stock || 0) < 0
      );
      if (invalidVariant) {
        setError('Cada variante debe tener imagen y stock valido.');
        return;
      }
    }

    setSaving(true);

    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('categoria', categoria);
    formData.append('descripcion', descripcion);
    formData.append('precio', precio);
    formData.append('stock', hasVariants ? String(totalVariantStock) : stock);
    if (imagen) formData.append('imagen', imagen);

    if (hasVariants) {
      const payloadVariantes = variantes.map((variant, index) => {
        const imageField = `variante_imagen_${index}`;
        if (variant.imagen) {
          formData.append(imageField, variant.imagen);
        }
        return {
          stock: Number(variant.stock || 0),
          imageField,
          orden: index
        };
      });
      formData.append('variantes', JSON.stringify(payloadVariantes));
    }

    try {
      const res = await api.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(`¡Pieza registrada con éxito! SKU generado: ${res.data.sku}`);
      setNombre('');
      setCategoria('');
      setDescripcion('');
      setPrecio('');
      setStock('');
      setImagen(null);
      setImagePreview('');
      setFileName('');
      setVariantes([]);
      
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
            <input
              type="number"
              value={hasVariants ? totalVariantStock : stock}
              onChange={e => setStock(e.target.value)}
              placeholder="0"
              required
              disabled={hasVariants}
            />
            {hasVariants && (
              <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>
                El stock total se calcula automaticamente a partir de las variantes registradas.
              </small>
            )}
          </div>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Fotografía Principal (Catálogo)</label>
            <input id="main-product-image" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <label
              htmlFor="main-product-image"
              onDragOver={(e) => {
                e.preventDefault();
                setDragTarget('main');
              }}
              onDragLeave={() => setDragTarget('')}
              onDrop={(e) => {
                e.preventDefault();
                setDragTarget('');
                assignMainImage(e.dataTransfer.files?.[0]);
              }}
              style={{
                width: '100%',
                minHeight: '160px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                borderRadius: '18px',
                border: dragTarget === 'main' ? '1px solid rgba(201,168,76,0.7)' : '1px dashed rgba(201,168,76,0.35)',
                background: dragTarget === 'main' ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                padding: '18px'
              }}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview principal" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '14px' }} />
                  <span style={{ color: 'var(--gold-light)', fontSize: '0.78rem' }}>{fileName}</span>
                </>
              ) : (
                <>
                  <ImagePlus size={28} />
                  <strong>Arrastra la imagen aqui</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>
                    O haz clic para seleccionar la portada principal del producto
                  </span>
                </>
              )}
            </label>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <div>
              <h4 className="text-gold-light" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                Variantes del producto
              </h4>
              <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Registra varias imagenes del mismo modelo y ajusta el stock de cada variante.
              </p>
            </div>
            <button type="button" className="btn-outline" onClick={() => setVariantes(prev => [...prev, createVariant()])} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} />
              Agregar variante
            </button>
          </div>

          {variantes.length === 0 ? (
            <div style={{ border: '1px dashed rgba(201,168,76,0.28)', borderRadius: '16px', padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Puedes dejar el producto simple o agregar variantes de imagen para mostrar diferentes vistas del mismo modelo.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '18px' }}>
              {variantes.map((variant, index) => (
                <div key={variant.key} style={{ border: '1px solid var(--border-subtle)', borderRadius: '18px', padding: '18px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '16px' }}>
                    <strong style={{ color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Variante {index + 1}
                    </strong>
                    <button type="button" className="action-btn delete" onClick={() => setVariantes(prev => prev.filter(item => item.key !== variant.key))}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px', marginBottom: '18px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Stock de la variante</label>
                      <input type="number" min="0" value={variant.stock} onChange={e => updateVariant(variant.key, 'stock', e.target.value)} placeholder="0" required />
                    </div>
                  </div>

                  <input
                    id={`variant-upload-${variant.key}`}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => assignVariantImage(variant.key, e.target.files?.[0])}
                  />
                  <label
                    htmlFor={`variant-upload-${variant.key}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragTarget(`variant_${variant.key}`);
                    }}
                    onDragLeave={() => setDragTarget('')}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragTarget('');
                      assignVariantImage(variant.key, e.dataTransfer.files?.[0]);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      borderRadius: '16px',
                      border: dragTarget === `variant_${variant.key}` ? '1px solid rgba(201,168,76,0.7)' : '1px dashed rgba(201,168,76,0.35)',
                      background: dragTarget === `variant_${variant.key}` ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      minHeight: '150px',
                      padding: '16px'
                    }}
                  >
                    {variant.preview ? (
                      <>
                        <img src={variant.preview} alt={`Variante ${index + 1}`} style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '14px' }} />
                        <span style={{ color: 'var(--gold-light)', fontSize: '0.78rem' }}>{variant.fileName}</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={24} />
                        <strong>Imagen de la variante</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>
                          Arrastra la foto de esta variante o haz clic para subirla
                        </span>
                      </>
                    )}
                  </label>
                </div>
              ))}
            </div>
          )}
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
