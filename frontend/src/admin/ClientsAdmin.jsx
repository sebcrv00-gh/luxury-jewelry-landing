import { useState, useEffect } from 'react';
import { Mail, Phone, User, Shield, Crown, ShoppingBag, XCircle, Users, Star, UserRoundCheck, FileSpreadsheet } from 'lucide-react';
import api, { getImageUrl } from '../api/axios';
import { exportClientsToExcel } from '../utils/adminExcelExport';

export default function ClientsAdmin() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vipConfirm, setVipConfirm] = useState(null);
  const [revokeConfirm, setRevokeConfirm] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data } = await api.get('/auth/users');
      setClients(data);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMakeVip = async (client) => {
    try {
      await api.put(`/auth/users/${client.id}/vip`);
      setVipConfirm(null);
      fetchClients();
    } catch (err) {
      console.error('Error al ascender a VIP:', err);
    }
  };

  const handleRemoveVip = async (client) => {
    try {
      await api.put(`/auth/users/${client.id}/remove-vip`);
      setRevokeConfirm(null);
      fetchClients();
    } catch (err) {
      console.error('Error al revocar VIP:', err);
    }
  };

  const handleExportClients = async () => {
    setExporting(true);
    try {
      const sourceData = clients.length > 0 ? clients : (await api.get('/auth/users')).data;
      exportClientsToExcel(Array.isArray(sourceData) ? sourceData : []);
    } catch (err) {
      console.error('Error al exportar clientes:', err);
    } finally {
      setExporting(false);
    }
  };

  const getRolBadge = (client) => {
    if (client.rol === 'admin') {
      return (
        <span style={{ 
          display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px',
          background: 'rgba(201, 168, 76, 0.15)', color: 'var(--gold-light)', border: '1px solid rgba(201, 168, 76, 0.3)'
        }}>
          <Shield size={12} style={{ marginRight: '6px' }}/> Administrador
        </span>
      );
    }
    if (client.rol === 'vip') {
      return (
        <span style={{ 
          display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px',
          background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.2), rgba(212, 175, 55, 0.1))', color: '#FFD700', border: '1px solid rgba(255, 215, 0, 0.4)',
          boxShadow: '0 0 12px rgba(255, 215, 0, 0.15)'
        }}>
          <Crown size={12} style={{ marginRight: '6px' }}/> Cliente VIP
        </span>
      );
    }
    return (
      <span style={{ 
        display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px',
        background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)'
      }}>
        Cliente Base
      </span>
    );
  };

  const totalClients = clients.filter(client => client.rol !== 'admin').length;
  const vipClients = clients.filter(client => client.rol === 'vip').length;
  const adminUsers = clients.filter(client => client.rol === 'admin').length;
  const activeBuyers = clients.filter(client => Number(client.total_pedidos) > 0).length;

  return (
    <div className="admin-section-shell">
      <div className="admin-section-header-block">
        <div>
          <h2>CRM y Segmentación de Clientes</h2>
          <p>Centraliza perfiles, comportamiento de compra y clasificación comercial para operar con mayor criterio y personalización.</p>
        </div>
        <button
          type="button"
          className="btn-outline"
          onClick={handleExportClients}
          disabled={exporting}
          style={{ padding: '10px 16px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <FileSpreadsheet size={14} />
          {exporting ? 'Exportando...' : 'Exportar base clientes XLSX'}
        </button>
      </div>

      <div className="admin-summary-grid">
        <div className="admin-info-card">
          <div className="admin-info-card-top">
            <strong>Clientes activos</strong>
            <span className="admin-info-card-icon"><Users size={18} /></span>
          </div>
          <span className="admin-info-card-value">{totalClients}</span>
          <span className="admin-info-card-meta">Base total de clientes no administrativos</span>
        </div>
        <div className="admin-info-card">
          <div className="admin-info-card-top">
            <strong>Clientes VIP</strong>
            <span className="admin-info-card-icon"><Crown size={18} /></span>
          </div>
          <span className="admin-info-card-value">{vipClients}</span>
          <span className="admin-info-card-meta">Segmento premium con beneficios especiales</span>
        </div>
        <div className="admin-info-card">
          <div className="admin-info-card-top">
            <strong>Compradores</strong>
            <span className="admin-info-card-icon"><UserRoundCheck size={18} /></span>
          </div>
          <span className="admin-info-card-value">{activeBuyers}</span>
          <span className="admin-info-card-meta">Clientes con pedidos registrados</span>
        </div>
        <div className="admin-info-card">
          <div className="admin-info-card-top">
            <strong>Equipo admin</strong>
            <span className="admin-info-card-icon"><Shield size={18} /></span>
          </div>
          <span className="admin-info-card-value">{adminUsers}</span>
          <span className="admin-info-card-meta">Usuarios con acceso al backoffice</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--gold)' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '16px' }}>Cargando directorio de clientes...</p>
        </div>
      ) : (
        <div className="admin-table-card">
          <div className="table-wrapper">
            <div className="table-header-flex">
              <div>
                <h3 className="text-gold-light" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>Directorio comercial</h3>
                <p className="admin-muted-note">Consulta contacto, nivel de membresía, actividad de compra y exporta la base actual de clientes.</p>
              </div>
              <div className="admin-inline-actions">
                <span className="admin-badge-pill success"><Star size={12} /> {vipClients} VIP</span>
                <span className="admin-badge-pill info">{activeBuyers} compradores</span>
              </div>
            </div>

            <table className="luxury-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Compras</th>
                  <th>Nivel</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  <tr key={client.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: client.rol === 'vip' ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(201,168,76,0.1))' : 'rgba(201, 168, 76, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: client.rol === 'vip' ? '#FFD700' : 'var(--gold)', border: client.rol === 'vip' ? '2px solid rgba(255,215,0,0.5)' : '1px solid rgba(201, 168, 76, 0.2)' }}>
                          {client.foto ? <img src={getImageUrl(client.foto)} alt="avatar" style={{width: '100%', height:'100%', objectFit: 'cover', borderRadius: '50%'}}/> : <User size={20} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            {client.nombre}
                            {client.rol === 'vip' && <Crown size={14} style={{ marginLeft: '8px', color: '#FFD700', verticalAlign: 'middle' }} />}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '1px' }}>ID: {client.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}><Mail size={14}/> {client.email}</div>
                        {client.telefono ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}><Phone size={14}/> {client.telefono}</div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontStyle: 'italic' }}><Phone size={14}/> Sin registrar</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '50%', background: client.total_pedidos > 0 ? 'rgba(78, 205, 196, 0.1)' : 'rgba(255,255,255,0.03)', border: client.total_pedidos > 0 ? '1px solid rgba(78, 205, 196, 0.3)' : '1px solid var(--border-subtle)' }}>
                          <ShoppingBag size={16} style={{ color: client.total_pedidos > 0 ? 'var(--success)' : 'var(--text-muted)' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '1.1rem', color: client.total_pedidos > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{client.total_pedidos}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Pedidos</div>
                        </div>
                      </div>
                    </td>
                    <td>{getRolBadge(client)}</td>
                    <td>
                      {client.rol === 'cliente' && (
                        <button 
                          onClick={() => setVipConfirm(client)}
                          style={{ 
                            background: 'transparent', border: '1px solid rgba(255, 215, 0, 0.3)', color: '#FFD700', padding: '8px 16px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.35s', display: 'inline-flex', alignItems: 'center', gap: '6px'
                          }}
                          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.1)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255,215,0,0.2)'; }}
                          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <Crown size={12}/> Ascender a VIP
                        </button>
                      )}
                      {client.rol === 'vip' && (
                        <button 
                          onClick={() => setRevokeConfirm(client)}
                          style={{ 
                            background: 'transparent', border: '1px solid rgba(231, 76, 60, 0.3)', color: 'var(--danger)', padding: '8px 16px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.35s', display: 'inline-flex', alignItems: 'center', gap: '6px'
                          }}
                          onMouseOver={e => { e.currentTarget.style.background = 'rgba(231,76,60,0.1)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(231,76,60,0.2)'; }}
                          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <XCircle size={12}/> Revocar VIP
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {clients.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                No hay clientes registrados en la base de datos.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN VIP */}
      {vipConfirm && (
        <>
          <div className="overlay" style={{ backdropFilter: 'blur(10px)', background: 'rgba(8, 8, 8, 0.85)', zIndex: 9999 }} onClick={() => setVipConfirm(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10000,
            background: 'linear-gradient(145deg, rgba(20, 20, 20, 0.95), rgba(12, 12, 12, 0.98))',
            borderRadius: '16px', border: '1px solid rgba(255, 215, 0, 0.3)', padding: '48px',
            width: '90%', maxWidth: '440px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255, 215, 0, 0.08)', color: '#FFD700', marginBottom: '24px', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
              <Crown size={36} strokeWidth={1.5} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '1px' }}>¿Ascender a VIP?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '10px', fontWeight: '300' }}>
              Estás por otorgarle el estatus <strong style={{ color: '#FFD700' }}>VIP</strong> a:
            </p>
            <p style={{ color: 'var(--gold-light)', fontSize: '1.2rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>{vipConfirm.nombre}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '32px' }}>
              Recibirá un <strong style={{ color: '#FFD700' }}>10% de descuento</strong> permanente en toda la tienda.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button className="btn-outline" onClick={() => setVipConfirm(null)} style={{ flex: 1, padding: '14px', borderRadius: '50px', fontSize: '0.8rem', letterSpacing: '1.5px' }}>CANCELAR</button>
              <button onClick={() => handleMakeVip(vipConfirm)} style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #FFD700, #DAA520)', color: '#000', border: 'none', borderRadius: '50px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', cursor: 'pointer', transition: 'all 0.35s', boxShadow: '0 4px 15px rgba(255,215,0,0.3)' }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(255,215,0,0.4)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(255,215,0,0.3)'; }}
              >CONFIRMAR VIP</button>
            </div>
          </div>
        </>
      )}

      {/* MODAL DE REVOCACIÓN VIP */}
      {revokeConfirm && (
        <>
          <div className="overlay" style={{ backdropFilter: 'blur(10px)', background: 'rgba(8, 8, 8, 0.85)', zIndex: 9999 }} onClick={() => setRevokeConfirm(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10000,
            background: 'linear-gradient(145deg, rgba(20, 20, 20, 0.95), rgba(12, 12, 12, 0.98))',
            borderRadius: '16px', border: '1px solid rgba(231, 76, 60, 0.3)', padding: '48px',
            width: '90%', maxWidth: '440px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(231, 76, 60, 0.08)', color: 'var(--danger)', marginBottom: '24px', border: '1px solid rgba(231, 76, 60, 0.2)' }}>
              <XCircle size={36} strokeWidth={1.5} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '1px' }}>¿Revocar VIP?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '10px', fontWeight: '300' }}>
              Estás por retirar los privilegios <strong style={{ color: 'var(--danger)' }}>VIP</strong> de:
            </p>
            <p style={{ color: 'var(--gold-light)', fontSize: '1.2rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>{revokeConfirm.nombre}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '32px' }}>
              No podrá acceder a los descuentos del <strong>10%</strong> hasta que lo vuelvas a ascender.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button className="btn-outline" onClick={() => setRevokeConfirm(null)} style={{ flex: 1, padding: '14px', borderRadius: '50px', fontSize: '0.8rem', letterSpacing: '1.5px' }}>CANCELAR</button>
              <button onClick={() => handleRemoveVip(revokeConfirm)} style={{ flex: 1, padding: '14px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50px', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px', cursor: 'pointer', transition: 'all 0.35s', boxShadow: '0 4px 15px rgba(231,76,60,0.3)' }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(231,76,60,0.4)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(231,76,60,0.3)'; }}
              >REVOCAR VIP</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
