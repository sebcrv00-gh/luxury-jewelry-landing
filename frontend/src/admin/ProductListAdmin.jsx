import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function ProductListAdmin({ refreshTrigger, setStats }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products');
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

  if (loading && products.length === 0) return <div className="loading-screen text-gold">Sincronizando Inventario Real...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="premium-table-container">
      <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 className="text-gold-light" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>Colecciones Registradas</h3>
        <button onClick={fetchProducts} className="btn-outline" style={{ padding: '8px 16px', fontSize: '0.7rem' }}>
          {loading ? 'Sincronizando...' : '↻ Actualizar Bóveda'}
        </button>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Pieza</th>
              <th>Referencia (SKU)</th>
              <th>Familia</th>
              <th>Valor Unitario</th>
              <th>Disponibilidad</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-muted" style={{ textAlign: 'center', padding: '60px' }}>
                  No hay joyas registradas en la b\u00f3veda de datos.
                </td>
              </tr>
            ) : (
              products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img 
                        src={p.imagen_url ? `http://localhost:3001/${p.imagen_url}` : '/images/Logo_Luxury_Joyeria-removebg-preview.png'} 
                        alt={p.nombre} 
                        className="premium-table-img"
                      />
                      <span className="text-gold-light" style={{ fontWeight: '500' }}>{p.nombre}</span>
                    </div>
                  </td>
                  <td><code className="premium-table-sku">{p.sku}</code></td>
                  <td><span className="category-tag">{p.categoria}</span></td>
                  <td className="premium-table-price">
                    ${parseFloat(p.precio).toLocaleString('es-CO')}
                  </td>
                  <td>
                    <span className={`badge-premium ${p.stock > 0 ? 'badge-gold' : 'badge-rose'}`}>
                      {p.stock > 0 ? `${p.stock} Unidades` : 'Agotado'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
