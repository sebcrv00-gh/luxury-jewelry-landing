import { useState, useEffect } from 'react';
import { RefreshCw, MessageSquare, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import api from '../api/axios';

export default function TicketListAdmin({ refreshTrigger }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tickets/admin/all');
      setTickets(res.data);
    } catch (err) {
      setError('Error al sincronizar con el registro de mensajes/tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [refreshTrigger]);

  const handleStatusChange = async (id, newStatus) => {
    setUpdating(id);
    try {
      await api.put(`/tickets/${id}/status`, { estado: newStatus });
      setTickets(prev => prev.map(t => t.id === id ? { ...t, estado: newStatus } : t));
    } catch (err) {
      alert('Error al actualizar el estado del ticket');
    } finally {
      setUpdating(null);
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0' }}>
        <RefreshCw size={40} className="text-gold" style={{ animation: 'spin 2s linear infinite', marginBottom: '20px' }} />
        <h3 className="text-gold-light">Sincronizando Mensajes y Tickets...</h3>
        <p className="text-muted">Desencriptando comunicaciones de clientes.</p>
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
    <div className="inventory-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="text-gold" style={{ fontSize: '1.4rem' }}>Buzón de Consultas y Soporte</h2>
        <button onClick={fetchTickets} className="btn-outline" style={{ padding: '8px 16px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          {loading ? 'Sincronizando...' : 'Actualizar Buzón'}
        </button>
      </div>

      <div className="table-wrapper">
        <table className="luxury-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Asunto / Mensaje</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '80px 0' }}>
                  <MessageSquare size={48} className="text-muted" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                  <h4 className="text-gold-light" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Buzón Vacío</h4>
                  <p className="text-muted" style={{ fontSize: '0.9rem' }}>No hay mensajes de contacto registrados.</p>
                </td>
              </tr>
            ) : (
              tickets.map(ticket => (
                <tr key={ticket.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="text-gold-light" style={{ fontWeight: 600 }}>{ticket.usuario_nombre}</span>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>{ticket.usuario_email}</span>
                    </div>
                  </td>
                  <td style={{ maxWidth: '300px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{ticket.asunto}</div>
                    <div className="text-muted" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ticket.mensaje}
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: '4px', 
                      fontSize: '0.7rem', 
                      fontWeight: '700', 
                      textTransform: 'uppercase',
                      background: ticket.estado === 'abierto' ? 'rgba(201, 168, 76, 0.15)' : 'rgba(78, 205, 196, 0.1)',
                      color: ticket.estado === 'abierto' ? 'var(--gold)' : 'var(--success)',
                      border: ticket.estado === 'abierto' ? '1px solid var(--gold-subtle)' : '1px solid rgba(78, 205, 196, 0.3)'
                    }}>
                      {ticket.estado === 'abierto' ? 'EN ESPERA' : 'RESUELTO'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {new Date(ticket.creado_en).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {ticket.estado === 'abierto' ? (
                        <button 
                          className="action-btn edit" 
                          onClick={() => handleStatusChange(ticket.id, 'cerrado')}
                          disabled={updating === ticket.id}
                          style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
                          title="Marcar como Resuelto"
                        >
                          {updating === ticket.id ? <RefreshCw size={16} className="spinning" /> : <CheckCircle size={16} />}
                        </button>
                      ) : (
                        <button 
                          className="action-btn" 
                          onClick={() => handleStatusChange(ticket.id, 'abierto')}
                          disabled={updating === ticket.id}
                          style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
                          title="Reabrir Ticket"
                        >
                          {updating === ticket.id ? <RefreshCw size={16} className="spinning" /> : <Clock size={16} />}
                        </button>
                      )}
                    </div>
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
