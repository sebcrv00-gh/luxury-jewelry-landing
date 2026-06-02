import { useState, useEffect } from 'react';
import {
  Edit3,
  Trash2,
  RefreshCw,
  AlertCircle,
  PackageOpen,
  X,
  CheckCircle2,
  ImagePlus,
  Plus
} from 'lucide-react';
import api, { getImageUrl } from '../api/axios';

const mapVariantToForm = (variant = {}) => ({
  key: variant.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  id: variant.id || null,
  stock: String(variant.stock ?? ''),
  imagen: null,
  preview: variant.imagen_url ? getImageUrl(variant.imagen_url) : '',
  existingImageUrl: variant.imagen_url || '',
  fileName: variant.imagen_url ? variant.imagen_url.split('/').pop() : ''
});

export default function ProductListAdmin({ refreshTrigger, setStats }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [dragTarget, setDragTarget] = useState('');

  // ── Estado del modal de edición ──
  const [editProduct, setEditProduct] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [editMsg, setEditMsg] = useState('');
  const [saveState, setSaveState] = useState('idle');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products/admin/all');
      setProducts(res.data);
      if (setStats) {
        const total = res.data.length;
        const lowStock = res.data.filter(p => p.stock <= 2).length;
        const categories = [...new Set(res.data.map(p => p.categoria))].length;
        setStats({ total, lowStock, categories });
      }
    } catch (err) {
      setError('Error al conectar con la bóveda de inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [refreshTrigger]);

  const openDeleteDialog = (product) => {
    setDeleteProduct(product);
  };

  const confirmDelete = async () => {
    if (!deleteProduct) return;
    setDeleting(deleteProduct.id);
    try {
      await api.delete(`/products/${deleteProduct.id}`);
      setFeedback({
        type: 'success',
        text: `"${deleteProduct.nombre}" fue retirado del catálogo de Luxury correctamente.`
      });
      setDeleteProduct(null);
      fetchProducts();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.error || 'No fue posible eliminar la pieza seleccionada.'
      });
    } finally {
      setDeleting(null);
    }
  };

  const assignMainEditImage = (file) => {
    if (!file) return;
    setSaveState('idle');
    setEditImage(file);
    setEditImagePreview(URL.createObjectURL(file));
  };

  const updateEditVariant = (key, field, value) => {
    setSaveState('idle');
    setEditForm(prev => ({
      ...prev,
      variantes: (prev.variantes || []).map(variant => (
        variant.key === key ? { ...variant, [field]: value } : variant
      ))
    }));
  };

  const assignEditVariantImage = (key, file) => {
    if (!file) return;
    setSaveState('idle');
    setEditForm(prev => ({
      ...prev,
      variantes: (prev.variantes || []).map(variant => (
        variant.key === key
          ? {
              ...variant,
              imagen: file,
              preview: URL.createObjectURL(file),
              fileName: file.name
            }
          : variant
      ))
    }));
  };

  // ── Abrir modal de edición ──
  const openEdit = (p) => {
    setEditProduct(p);
    setEditForm({
      nombre: p.nombre,
      categoria: p.categoria,
      descripcion: p.descripcion || '',
      precio: p.precio,
      stock: p.stock,
      variantes: (p.variantes || []).map(mapVariantToForm)
    });
    setEditImage(null);
    setEditImagePreview(p.imagen_url ? getImageUrl(p.imagen_url) : '');
    setEditMsg('');
    setSaveState('idle');
  };

  const updateEditField = (field, value) => {
    setSaveState('idle');
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // ── Guardar edición ──
  const handleEditSave = async (e) => {
    e.preventDefault();
    const variants = editForm.variantes || [];
    const hasVariants = variants.length > 0;

    if (hasVariants) {
      const invalidVariant = variants.find(variant =>
        (!variant.imagen && !variant.existingImageUrl) || Number(variant.stock || 0) < 0
      );
      if (invalidVariant) {
        setEditMsg('Cada variante debe tener imagen y stock valido.');
        setSaveState('error');
        return;
      }
    }

    setSaving(true);
    setEditMsg('');
    setSaveState('saving');
    try {
      const formData = new FormData();
      formData.append('nombre', editForm.nombre);
      formData.append('categoria', editForm.categoria);
      formData.append('descripcion', editForm.descripcion);
      formData.append('precio', editForm.precio);
      formData.append(
        'stock',
        hasVariants
          ? String(variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0))
          : editForm.stock
      );
      if (editImage) formData.append('imagen', editImage);

      if (hasVariants) {
        const payloadVariantes = variants.map((variant, index) => {
          const imageField = `variante_imagen_${index}`;
          if (variant.imagen) {
            formData.append(imageField, variant.imagen);
          }
          return {
            id: variant.id,
            stock: Number(variant.stock || 0),
            keepExistingImage: Boolean(!variant.imagen && variant.existingImageUrl),
            imageField,
            orden: index
          };
        });
        formData.append('variantes', JSON.stringify(payloadVariantes));
      }

      await api.put(`/products/${editProduct.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setEditMsg('✦ Joya actualizada correctamente en la bóveda.');
      setSaveState('success');
      fetchProducts();
    } catch (err) {
      setEditMsg(err.response?.data?.error || 'Error al actualizar');
      setSaveState('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0' }}>
        <RefreshCw size={40} className="text-gold" style={{ animation: 'spin 2s linear infinite', marginBottom: '20px' }} />
        <h3 className="text-gold-light">Sincronizando Bóveda...</h3>
        <p className="text-muted">Desencriptando datos de inventario.</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
        <AlertCircle size={20} />
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="table-wrapper">
        <div className="table-header-flex">
          <h3 className="text-gold-light" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>Piezas del Catálogo</h3>
          <button onClick={fetchProducts} className="btn-outline" style={{ padding: '8px 16px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            {loading ? 'Sincronizando...' : 'Actualizar Bóveda'}
          </button>
        </div>

        {feedback && (
          <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {feedback.text}
            </span>
            <button type="button" className="action-btn" onClick={() => setFeedback(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        <table className="luxury-table">
          <thead>
            <tr>
              <th>Pieza / Detalles</th>
              <th>Referencia (SKU)</th>
              <th>Familia</th>
              <th>Valor Unitario (COP)</th>
              <th>Disponibilidad</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '80px 0' }}>
                  <PackageOpen size={48} className="text-muted" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                  <h4 className="text-gold-light" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Bóveda Vacía</h4>
                  <p className="text-muted" style={{ fontSize: '0.9rem' }}>No hay joyas registradas actualmente en el sistema central.</p>
                </td>
              </tr>
            ) : (
              products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="product-cell">
                      <img
                        src={p.imagen_url ? getImageUrl(p.imagen_url) : (p.variantes?.[0]?.imagen_url ? getImageUrl(p.variantes[0].imagen_url) : '/images/Logo_Luxury_Joyeria-removebg-preview.png')}
                        alt={p.nombre}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span className="product-name text-gold-light">{p.nombre}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', maxWidth: '320px', lineHeight: 1.5 }}>
                          {p.descripcion || 'Sin descripción personalizada registrada todavía.'}
                        </span>
                        {Array.isArray(p.variantes) && p.variantes.length > 0 && (
                          <span style={{ color: 'var(--gold)', fontSize: '0.72rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                            {p.variantes.length} variantes disponibles
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td><code style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{p.sku}</code></td>
                  <td>
                    <span style={{ padding: '4px 10px', background: 'rgba(201, 168, 76, 0.1)', color: 'var(--gold)', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '500', border: '1px solid rgba(201, 168, 76, 0.3)' }}>
                      {p.categoria}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: '500', letterSpacing: '1px' }}>
                    ${parseFloat(p.precio).toLocaleString('es-CO')}
                  </td>
                  <td>
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: '600', 
                      letterSpacing: '1px',
                      background: p.stock > 0 ? 'rgba(78, 205, 196, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                      color: p.stock > 0 ? 'var(--success)' : 'var(--danger)',
                      border: p.stock > 0 ? '1px solid rgba(78, 205, 196, 0.3)' : '1px solid rgba(231, 76, 60, 0.3)'
                    }}>
                      {p.stock > 0 ? `${p.stock} UDS` : 'AGOTADO'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <button className="action-btn edit" onClick={() => openEdit(p)} title="Editar Detalles">
                        <Edit3 size={18} />
                      </button>
                      <button className="action-btn" onClick={() => {
                          openEdit(p);
                          setTimeout(() => {
                            const variantsSection = document.querySelector('.admin-edit-variants-panel');
                            if (variantsSection) variantsSection.scrollIntoView({ behavior: 'smooth' });
                            setSaveState('idle');
                            setEditForm(prev => ({ ...prev, variantes: [...(prev.variantes || []), mapVariantToForm()] }));
                          }, 100);
                        }} title="Agregar variante rapida" style={{ color: 'var(--gold)' }}>
                        <Plus size={18} />
                      </button>
                      <button className="action-btn delete" onClick={() => openDeleteDialog(p)} disabled={deleting === p.id} title="Retirar del Catálogo">
                        {deleting === p.id ? <RefreshCw size={18} className="spinning" /> : <Trash2 size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal de Edición ── */}
      {editProduct && (
        <div className="modal-overlay admin-edit-product-overlay" onClick={() => setEditProduct(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="luxury-modal-content admin-edit-product-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-edit-product-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <h3 className="text-gold-light" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.6rem' }}>
                Auditoria de Pieza
              </h3>
              <button className="action-btn" onClick={() => setEditProduct(null)}><Trash2 size={24} style={{ display: 'none' }}/><span style={{fontSize:'1.5rem', lineHeight:1}}>×</span></button>
            </div>

            {editMsg && (
              <div className={`alert ${editMsg.startsWith('✦') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '24px' }}>
                {editMsg}
              </div>
            )}

            <form onSubmit={handleEditSave} className="admin-edit-product-form">
              <div className="admin-edit-product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Denominación</label>
                  <input type="text" value={editForm.nombre} onChange={e => updateEditField('nombre', e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Familia</label>
                  <select value={editForm.categoria} onChange={e => updateEditField('categoria', e.target.value)} required>
                    <option value="Anillos">Anillos de Lujo</option>
                    <option value="Collares">Collares y Gargantillas</option>
                    <option value="Pulseras">Pulseras Gold</option>
                    <option value="Aretes">Aretes y Pendientes</option>
                    <option value="Relojes">Alta Relojería</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Especificaciones Técnicas</label>
                <textarea rows="3" value={editForm.descripcion} onChange={e => updateEditField('descripcion', e.target.value)} />
              </div>

              <div className="admin-edit-product-grid admin-edit-product-grid--compact" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Valor (COP)</label>
                  <input type="number" step="0.01" value={editForm.precio} onChange={e => updateEditField('precio', e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Unidades Disponibles</label>
                  <input
                    type="number"
                    value={(editForm.variantes || []).length > 0 ? (editForm.variantes || []).reduce((sum, variant) => sum + Number(variant.stock || 0), 0) : editForm.stock}
                    onChange={e => updateEditField('stock', e.target.value)}
                    required
                    disabled={(editForm.variantes || []).length > 0}
                  />
                </div>
              </div>

              <div className="form-group admin-edit-upload-group" style={{ marginBottom: '24px' }}>
                  <label>Actualizar Fotografía</label>
                  <input id="edit-main-image" type="file" accept="image/*" onChange={e => assignMainEditImage(e.target.files[0])} style={{ display: 'none' }} />
                  <label
                    htmlFor="edit-main-image"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragTarget('edit-main');
                    }}
                    onDragLeave={() => setDragTarget('')}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragTarget('');
                      assignMainEditImage(e.dataTransfer.files?.[0]);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      minHeight: '170px',
                      borderRadius: '16px',
                      border: dragTarget === 'edit-main' ? '1px solid rgba(201,168,76,0.7)' : '1px dashed rgba(201,168,76,0.35)',
                      background: dragTarget === 'edit-main' ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      padding: '16px'
                    }}
                  >
                    {editImagePreview ? (
                      <img src={editImagePreview} alt="Portada actual" style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '12px' }} />
                    ) : (
                      <>
                        <ImagePlus size={24} />
                        <strong>Arrastra una nueva portada o haz clic</strong>
                      </>
                    )}
                  </label>
              </div>

              <div className="glass-card admin-edit-variants-panel" style={{ padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '18px', flexWrap: 'wrap' }}>
                  <div>
                    <h4 className="text-gold-light" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
                      Variantes del producto
                    </h4>
                    <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                      Ajusta imagen y stock de cada variante sin duplicar el producto.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      setSaveState('idle');
                      setEditForm(prev => ({ ...prev, variantes: [...(prev.variantes || []), mapVariantToForm()] }));
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Plus size={16} />
                    Agregar variante
                  </button>
                </div>

                {(editForm.variantes || []).length === 0 ? (
                  <div style={{ border: '1px dashed rgba(201,168,76,0.28)', borderRadius: '16px', padding: '18px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Este producto no tiene variantes registradas.
                  </div>
                ) : (
                  <div className="admin-edit-variants-list" style={{ display: 'grid', gap: '18px' }}>
                    {(editForm.variantes || []).map((variant, index) => (
                      <div key={variant.key} className="admin-edit-variant-card" style={{ border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                        <div className="admin-edit-variant-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <strong style={{ color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Variante {index + 1}
                          </strong>
                          <button
                            type="button"
                            className="action-btn delete"
                            onClick={() => {
                              setSaveState('idle');
                              setEditForm(prev => ({ ...prev, variantes: (prev.variantes || []).filter(item => item.key !== variant.key) }));
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="admin-edit-variant-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Stock de la variante</label>
                            <input type="number" min="0" value={variant.stock} onChange={e => updateEditVariant(variant.key, 'stock', e.target.value)} required />
                          </div>
                        </div>

                        <input
                          id={`edit-variant-upload-${variant.key}`}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={e => assignEditVariantImage(variant.key, e.target.files?.[0])}
                        />
                        <label
                          htmlFor={`edit-variant-upload-${variant.key}`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragTarget(`edit_variant_${variant.key}`);
                          }}
                          onDragLeave={() => setDragTarget('')}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragTarget('');
                            assignEditVariantImage(variant.key, e.dataTransfer.files?.[0]);
                          }}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            minHeight: '145px',
                            borderRadius: '14px',
                            border: dragTarget === `edit_variant_${variant.key}` ? '1px solid rgba(201,168,76,0.7)' : '1px dashed rgba(201,168,76,0.35)',
                            background: dragTarget === `edit_variant_${variant.key}` ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
                            cursor: 'pointer',
                            padding: '16px'
                          }}
                        >
                          {variant.preview ? (
                            <>
                              <img src={variant.preview} alt={`Variante ${index + 1}`} style={{ width: '100%', maxHeight: '135px', objectFit: 'cover', borderRadius: '12px' }} />
                              <span style={{ color: 'var(--gold-light)', fontSize: '0.78rem' }}>{variant.fileName || 'Imagen actual'}</span>
                            </>
                          ) : (
                            <>
                              <ImagePlus size={22} />
                              <strong>Sube la imagen de la variante</strong>
                            </>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="admin-edit-product-actions" style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
                <button type="button" className="btn-outline" onClick={() => setEditProduct(null)}>
                  Descartar
                </button>
                <button
                  type="submit"
                  className={saveState === 'success' ? 'btn-success' : 'btn-primary'}
                  disabled={saving}
                  style={saveState === 'error'
                    ? {
                        background: 'rgba(231, 76, 60, 0.12)',
                        border: '1px solid rgba(231, 76, 60, 0.28)',
                        color: '#ffb3ab'
                      }
                    : undefined}
                >
                  {saving
                    ? 'Guardando...'
                    : saveState === 'success'
                      ? 'Guardado exitosamente'
                      : saveState === 'error'
                        ? 'Error al guardar'
                        : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteProduct && (
        <div className="modal-overlay" onClick={() => setDeleteProduct(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div className="luxury-modal-content" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div>
                <span className="admin-surface-kicker">Confirmación Luxury</span>
                <h3 className="text-gold-light" style={{ margin: '10px 0 0', fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>
                  Retirar pieza del catálogo
                </h3>
              </div>
              <button type="button" className="action-btn" onClick={() => setDeleteProduct(null)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '24px' }}>
              Vas a eliminar <strong style={{ color: 'var(--gold-light)' }}>{deleteProduct.nombre}</strong> del catálogo administrativo.
              Esta acción retira la pieza y sus variantes asociadas del sistema activo.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px' }}>
              <button type="button" className="btn-outline" onClick={() => setDeleteProduct(null)}>
                Conservar producto
              </button>
              <button type="button" className="btn-primary" onClick={confirmDelete} disabled={deleting === deleteProduct.id}>
                {deleting === deleteProduct.id ? 'Retirando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
