import { useState, useEffect } from 'react';
import { Edit3, Trash2, RefreshCw, AlertCircle, PackageOpen } from 'lucide-react';
import api from '../api/axios';

export default function ProductListAdmin({ refreshTrigger, setStats }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  // ── Estado del modal de edición ──
  const [editProduct, setEditProduct] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editImage, setEditImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editMsg, setEditMsg] = useState('');

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

  // ── Eliminar producto ──
  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar permanentemente "${nombre}" del catálogo?`)) return;
    setDeleting(id);
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  // ── Abrir modal de edición ──
  const openEdit = (p) => {
    setEditProduct(p);
    setEditForm({
      nombre: p.nombre,
      categoria: p.categoria,
      descripcion: p.descripcion || '',
      precio: p.precio,
      stock: p.stock
    });
    setEditImage(null);
    setEditMsg('');
  };

  // ── Guardar edición ──
  const handleEditSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setEditMsg('');
    try {
      const formData = new FormData();
      formData.append('nombre', editForm.nombre);
      formData.append('categoria', editForm.categoria);
      formData.append('descripcion', editForm.descripcion);
      formData.append('precio', editForm.precio);
      formData.append('stock', editForm.stock);
      if (editImage) formData.append('imagen', editImage);

      await api.put(`/products/${editProduct.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setEditMsg('✦ Joya actualizada correctamente en la bóveda.');
      fetchProducts();
      setTimeout(() => setEditProduct(null), 1500);
    } catch (err) {
      setEditMsg(err.response?.data?.error || 'Error al actualizar');
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
                        src={p.imagen_url ? `http://localhost:3001/${p.imagen_url}` : '/images/Logo_Luxury_Joyeria-removebg-preview.png'}
                        alt={p.nombre}
                      />
                      <span className="product-name text-gold-light">{p.nombre}</span>
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
                      <button className="action-btn delete" onClick={() => handleDelete(p.id, p.nombre)} disabled={deleting === p.id} title="Retirar del Catálogo">
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
        <div className="modal-overlay" onClick={() => setEditProduct(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="luxury-modal-content" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
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

            <form onSubmit={handleEditSave}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Denominación</label>
                  <input type="text" value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Familia</label>
                  <select value={editForm.categoria} onChange={e => setEditForm({ ...editForm, categoria: e.target.value })} required>
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
                <textarea rows="3" value={editForm.descripcion} onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Valor (COP)</label>
                  <input type="number" step="0.01" value={editForm.precio} onChange={e => setEditForm({ ...editForm, precio: e.target.value })} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Unidades Disponibles</label>
                  <input type="number" value={editForm.stock} onChange={e => setEditForm({ ...editForm, stock: e.target.value })} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Actualizar Fotografía</label>
                  <input type="file" accept="image/*" onChange={e => setEditImage(e.target.files[0])} style={{ padding: '10px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
                <button type="button" className="btn-outline" onClick={() => setEditProduct(null)}>Descartar</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Registrando...' : 'Confirmar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
