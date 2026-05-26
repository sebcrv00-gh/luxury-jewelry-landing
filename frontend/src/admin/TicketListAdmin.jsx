import { useState, useEffect } from 'react';
import { RefreshCw, MessageSquare, AlertCircle, CheckCircle, Clock, Inbox, ShieldCheck, History, Send, Phone, ExternalLink } from 'lucide-react';
import api from '../api/axios';

export default function TicketListAdmin({ refreshTrigger }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [replying, setReplying] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tickets/admin/all');
      setTickets(res.data);
      if (!selectedTicketId && res.data?.length) {
        setSelectedTicketId(res.data[0].id);
      }
    } catch (err) {
      setError('Error al sincronizar con el registro de mensajes/tickets.');
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (ticketId) => {
    if (!ticketId) {
      setConversation(null);
      return;
    }

    setConversationLoading(true);
    try {
      const res = await api.get(`/tickets/${ticketId}/messages`);
      setConversation(res.data);
    } catch (err) {
      setConversation(null);
      setError('No fue posible cargar la conversación del ticket.');
    } finally {
      setConversationLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [refreshTrigger]);

  useEffect(() => {
    loadConversation(selectedTicketId);
  }, [selectedTicketId]);

  const handleStatusChange = async (id, newStatus) => {
    setUpdating(id);
    try {
      await api.put(`/tickets/${id}/status`, { estado: newStatus });
      setTickets(prev => prev.map(t => t.id === id ? { ...t, estado: newStatus } : t));
      setConversation(prev => prev ? { ...prev, ticket: { ...prev.ticket, estado: newStatus } } : prev);
    } catch (err) {
      alert('Error al actualizar el estado del ticket');
    } finally {
      setUpdating(null);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    const mensaje = replyDraft.trim();
    if (!mensaje || !selectedTicketId) return;

    setReplying(true);
    try {
      const res = await api.post(`/tickets/${selectedTicketId}/messages`, { mensaje });
      setConversation(res.data.conversation);
      setReplyDraft('');
      setTickets(prev => prev.map(ticket =>
        ticket.id === selectedTicketId ? { ...ticket, estado: 'abierto' } : ticket
      ));
    } catch (err) {
      alert(err.response?.data?.error || 'No fue posible enviar la respuesta');
    } finally {
      setReplying(false);
    }
  };

  const selectedTicket = conversation?.ticket || tickets.find(ticket => ticket.id === selectedTicketId) || null;
  const cleanPhone = String(selectedTicket?.usuario_telefono || '').replace(/\D/g, '');
  const whatsappMessage = encodeURIComponent(
    replyDraft.trim() ||
      `Hola ${selectedTicket?.usuario_nombre || ''}, te escribimos desde Luxury Jewelry para dar seguimiento a tu solicitud "${selectedTicket?.asunto || ''}".`
  );
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${whatsappMessage}` : null;

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

  const openTickets = tickets.filter(ticket => ticket.estado === 'abierto').length;
  const resolvedTickets = tickets.filter(ticket => ticket.estado !== 'abierto').length;
  const latestTicketDate = tickets[0]?.creado_en
    ? new Date(tickets[0].creado_en).toLocaleDateString('es-CO')
    : 'Sin registros';

  return (
    <div className="admin-section-shell">
      <div className="admin-section-header-block">
        <div>
          <h2>Centro de Soporte y Atención</h2>
          <p>Controla tickets, mensajes de contacto y devoluciones desde una bandeja unificada pensada para tiempos de respuesta operativos.</p>
        </div>
        <button onClick={fetchTickets} className="btn-outline" style={{ padding: '10px 18px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          {loading ? 'Sincronizando...' : 'Actualizar soporte'}
        </button>
      </div>

      <div className="admin-summary-grid">
        <div className="admin-info-card">
          <div className="admin-info-card-top">
            <strong>Bandeja total</strong>
            <span className="admin-info-card-icon"><Inbox size={18} /></span>
          </div>
          <span className="admin-info-card-value">{tickets.length}</span>
          <span className="admin-info-card-meta">Interacciones y solicitudes registradas</span>
        </div>
        <div className="admin-info-card">
          <div className="admin-info-card-top">
            <strong>Abiertos</strong>
            <span className="admin-info-card-icon"><Clock size={18} /></span>
          </div>
          <span className="admin-info-card-value">{openTickets}</span>
          <span className="admin-info-card-meta">Casos en espera de atención</span>
        </div>
        <div className="admin-info-card">
          <div className="admin-info-card-top">
            <strong>Resueltos</strong>
            <span className="admin-info-card-icon"><ShieldCheck size={18} /></span>
          </div>
          <span className="admin-info-card-value">{resolvedTickets}</span>
          <span className="admin-info-card-meta">Solicitudes gestionadas correctamente</span>
        </div>
        <div className="admin-info-card">
          <div className="admin-info-card-top">
            <strong>Último ingreso</strong>
            <span className="admin-info-card-icon"><History size={18} /></span>
          </div>
          <span className="admin-info-card-value" style={{ fontSize: '1.2rem' }}>{latestTicketDate}</span>
          <span className="admin-info-card-meta">Fecha de la interacción más reciente</span>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="table-wrapper">
          <div className="table-header-flex">
            <div>
              <h3 className="text-gold-light" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>Buzón unificado</h3>
              <p className="admin-muted-note">Seguimiento de comunicación, devoluciones y solicitudes de soporte al cliente.</p>
            </div>
            <div className="admin-inline-actions">
              <span className="admin-badge-pill pending">{openTickets} en espera</span>
              <span className="admin-badge-pill success">{resolvedTickets} resueltos</span>
            </div>
          </div>

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
                  <tr
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    style={{
                      cursor: 'pointer',
                      background: ticket.id === selectedTicketId ? 'rgba(201, 168, 76, 0.06)' : 'transparent'
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="text-gold-light" style={{ fontWeight: 600 }}>{ticket.usuario_nombre}</span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>{ticket.usuario_email}</span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>{ticket.usuario_telefono || 'Sin teléfono'}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{ticket.asunto}</div>
                      <div className="text-muted" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ticket.mensaje}
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge-pill ${ticket.estado === 'abierto' ? 'pending' : 'success'}`}>
                        {ticket.estado === 'abierto' ? 'en espera' : 'resuelto'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {new Date(ticket.creado_en).toLocaleDateString('es-CO')}
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

      <div className="admin-table-card">
        <div className="table-wrapper">
          <div className="table-header-flex">
            <div>
              <h3 className="text-gold-light" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>Conversación del ticket</h3>
              <p className="admin-muted-note">Desde aquí puedes revisar el historial, responder y abrir WhatsApp con el mensaje ya redactado.</p>
            </div>
            {selectedTicket && (
              <div className="admin-inline-actions">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline"
                    style={{ padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Phone size={14} />
                    Abrir WhatsApp
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}
          </div>

          {!selectedTicket ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Selecciona un ticket para ver su detalle.
            </div>
          ) : conversationLoading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Cargando conversación...
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div className="admin-info-card" style={{ marginBottom: 0 }}>
                  <div className="admin-info-card-top"><strong>Cliente</strong><span className="admin-info-card-icon"><MessageSquare size={16} /></span></div>
                  <span className="admin-info-card-value" style={{ fontSize: '1rem' }}>{selectedTicket.usuario_nombre}</span>
                  <span className="admin-info-card-meta">{selectedTicket.usuario_email}</span>
                </div>
                <div className="admin-info-card" style={{ marginBottom: 0 }}>
                  <div className="admin-info-card-top"><strong>Contacto</strong><span className="admin-info-card-icon"><Phone size={16} /></span></div>
                  <span className="admin-info-card-value" style={{ fontSize: '1rem' }}>{selectedTicket.usuario_telefono || 'Sin teléfono'}</span>
                  <span className="admin-info-card-meta">Canal recomendado para seguimiento</span>
                </div>
                <div className="admin-info-card" style={{ marginBottom: 0 }}>
                  <div className="admin-info-card-top"><strong>Asunto</strong><span className="admin-info-card-icon"><Inbox size={16} /></span></div>
                  <span className="admin-info-card-value" style={{ fontSize: '1rem' }}>#{selectedTicket.id}</span>
                  <span className="admin-info-card-meta">{selectedTicket.asunto}</span>
                </div>
                <div className="admin-info-card" style={{ marginBottom: 0 }}>
                  <div className="admin-info-card-top"><strong>Estado</strong><span className="admin-info-card-icon"><ShieldCheck size={16} /></span></div>
                  <span className="admin-info-card-value" style={{ fontSize: '1rem' }}>{selectedTicket.estado}</span>
                  <span className="admin-info-card-meta">{new Date(selectedTicket.creado_en).toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {(conversation?.messages || []).map(message => {
                  const isAdmin = message.author_type === 'admin';
                  return (
                    <div
                      key={message.id}
                      style={{
                        alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                        maxWidth: '78%',
                        background: isAdmin ? 'rgba(201, 168, 76, 0.10)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isAdmin ? 'rgba(201, 168, 76, 0.25)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '14px',
                        padding: '14px 16px'
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', color: isAdmin ? 'var(--gold-light)' : 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                        {isAdmin ? 'Administrador' : (message.author_name || 'Cliente')}
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        {message.mensaje}
                      </div>
                      <div style={{ marginTop: '10px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(message.creado_en).toLocaleString('es-CO')}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleReply}>
                <label className="admin-muted-note" style={{ display: 'block', marginBottom: '8px' }}>Responder al cliente</label>
                <textarea
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  placeholder="Escribe la respuesta del soporte. Puedes usar este texto y luego abrir WhatsApp para enviarlo al cliente."
                  rows={5}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--text-primary)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn-outline" disabled={replying || !replyDraft.trim()} style={{ padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Send size={14} />
                    {replying ? 'Enviando...' : 'Guardar respuesta'}
                  </button>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-outline"
                      style={{ padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Phone size={14} />
                      Enviar por WhatsApp
                    </a>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
