import { useState } from 'react';
import { Lock, Eye, EyeOff, Store, Truck, Percent, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api/axios';

export default function SettingsAdmin() {
  const [activeSection, setActiveSection] = useState('security');

  // ── SEGURIDAD ──
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  // ── NEGOCIO ──
  const [businessName, setBusinessName] = useState('Luxury Jewelry');
  const [businessDesc, setBusinessDesc] = useState('Alta joyería y relojería exclusiva');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');

  // ── ENVÍOS ──
  const [shippingLocal, setShippingLocal] = useState('15000');
  const [shippingNational, setShippingNational] = useState('25000');
  const [freeShippingMin, setFreeShippingMin] = useState('500000');

  // ── IMPUESTOS ──
  const [taxRate, setTaxRate] = useState('19');
  const [taxIncluded, setTaxIncluded] = useState(true);

  // ── NOTIFICACIONES ──
  const [savedMsg, setSavedMsg] = useState(null);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
      return;
    }
    if (newPwd.length < 6) {
      setPwdMsg({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }
    setPwdLoading(true);
    try {
      const { data } = await api.put('/auth/change-password', { currentPassword: currentPwd, newPassword: newPwd });
      setPwdMsg({ type: 'success', text: data.message });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.response?.data?.error || 'Error al cambiar la contraseña' });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleSaveGeneral = (section) => {
    setSavedMsg(section);
    setTimeout(() => setSavedMsg(null), 3000);
  };

  const sections = [
    { id: 'security', icon: Lock, label: 'Seguridad' },
    { id: 'business', icon: Store, label: 'Información del Negocio' },
    { id: 'shipping', icon: Truck, label: 'Tarifas de Envío' },
    { id: 'taxes', icon: Percent, label: 'Impuestos' },
  ];

  const inputStyle = {
    width: '100%', padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
    borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'all 0.3s',
    fontFamily: 'var(--font-body)'
  };

  const labelStyle = {
    display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase',
    letterSpacing: '1.5px', marginBottom: '8px', fontWeight: '500'
  };

  const cardStyle = {
    background: 'linear-gradient(145deg, rgba(20, 20, 20, 0.6), rgba(12, 12, 12, 0.8))',
    border: '1px solid rgba(201, 168, 76, 0.08)', borderRadius: '12px', padding: '40px', marginBottom: '24px'
  };

  return (
    <div className="admin-content-inner">
      <div className="admin-header">
        <h2>Configuración</h2>
        <p style={{ color: 'var(--text-muted)' }}>Administra la seguridad, información del negocio, envíos e impuestos.</p>
      </div>

      {/* SAVED TOAST */}
      {savedMsg && (
        <div style={{ position: 'fixed', bottom: '32px', right: '32px', zIndex: 15000, display: 'flex', alignItems: 'center', gap: '14px', background: 'linear-gradient(135deg, rgba(20,20,20,0.95), rgba(12,12,12,0.95))', backdropFilter: 'blur(12px)', border: '1px solid rgba(78, 205, 196, 0.3)', borderRadius: '12px', padding: '18px 28px', boxShadow: '0 15px 40px rgba(0,0,0,0.7)', animation: 'toastSlideUp 0.5s ease forwards' }}>
          <CheckCircle size={22} style={{ color: 'var(--success)' }} />
          <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Configuración de <strong>{savedMsg}</strong> guardada correctamente</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '32px' }}>
        {/* SIDEBAR DE SECCIONES */}
        <div style={{ minWidth: '220px' }}>
          {sections.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderRadius: '10px', cursor: 'pointer',
                marginBottom: '6px', transition: 'all 0.3s',
                background: activeSection === s.id ? 'rgba(201, 168, 76, 0.08)' : 'transparent',
                color: activeSection === s.id ? 'var(--gold-light)' : 'var(--text-muted)',
                borderLeft: activeSection === s.id ? '3px solid var(--gold)' : '3px solid transparent',
                fontSize: '0.85rem', fontWeight: activeSection === s.id ? '600' : '400', letterSpacing: '0.5px'
              }}
              onMouseOver={e => { if (activeSection !== s.id) e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseOut={e => { if (activeSection !== s.id) e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <s.icon size={18} />
              {s.label}
            </div>
          ))}
        </div>

        {/* CONTENIDO DINÁMICO */}
        <div style={{ flex: 1 }}>

          {/* ═══ SEGURIDAD ═══ */}
          {activeSection === 'security' && (
            <div style={cardStyle}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '8px' }}>Seguridad de la Cuenta</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '32px' }}>Actualiza la contraseña de acceso al panel de administración.</p>

              {pwdMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderRadius: '8px', marginBottom: '24px', background: pwdMsg.type === 'success' ? 'rgba(78,205,196,0.08)' : 'rgba(231,76,60,0.08)', border: `1px solid ${pwdMsg.type === 'success' ? 'rgba(78,205,196,0.3)' : 'rgba(231,76,60,0.3)'}`, color: pwdMsg.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: '0.85rem' }}>
                  {pwdMsg.type === 'success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
                  {pwdMsg.text}
                </div>
              )}

              <form onSubmit={handlePasswordChange}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Contraseña Actual</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showCurrent ? 'text' : 'password'} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} style={inputStyle} placeholder="Ingresa tu contraseña actual" required />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {showCurrent ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Nueva Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showNew ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} style={inputStyle} placeholder="Mínimo 6 caracteres" required />
                    <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {showNew ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: '32px' }}>
                  <label style={labelStyle}>Confirmar Nueva Contraseña</label>
                  <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} style={inputStyle} placeholder="Repite la nueva contraseña" required />
                </div>
                <button type="submit" className="btn-primary" disabled={pwdLoading} style={{ padding: '16px 40px', borderRadius: '50px', fontSize: '0.8rem', letterSpacing: '2px' }}>
                  {pwdLoading ? 'ACTUALIZANDO...' : 'ACTUALIZAR CONTRASEÑA'}
                </button>
              </form>
            </div>
          )}

          {/* ═══ INFO DEL NEGOCIO ═══ */}
          {activeSection === 'business' && (
            <div style={cardStyle}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '8px' }}>Información del Negocio</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '32px' }}>Datos públicos de tu tienda que los clientes podrán visualizar.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Nombre de la Tienda</label>
                  <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Correo de Contacto</label>
                  <input type="email" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} style={inputStyle} placeholder="contacto@luxuryjewelry.com" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input type="tel" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} style={inputStyle} placeholder="+57 300 000 0000" />
                </div>
                <div>
                  <label style={labelStyle}>Descripción</label>
                  <input type="text" value={businessDesc} onChange={e => setBusinessDesc(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <button className="btn-primary" onClick={() => handleSaveGeneral('Negocio')} style={{ padding: '16px 40px', borderRadius: '50px', fontSize: '0.8rem', letterSpacing: '2px', marginTop: '12px' }}>
                GUARDAR CAMBIOS
              </button>
            </div>
          )}

          {/* ═══ TARIFAS DE ENVÍO ═══ */}
          {activeSection === 'shipping' && (
            <div style={cardStyle}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '8px' }}>Tarifas de Envío</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '32px' }}>Configura los costos de envío que se aplicarán en el checkout.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '28px' }}>
                <div>
                  <label style={labelStyle}>Envío Local (COP)</label>
                  <input type="number" value={shippingLocal} onChange={e => setShippingLocal(e.target.value)} style={inputStyle} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>Dentro de la ciudad</span>
                </div>
                <div>
                  <label style={labelStyle}>Envío Nacional (COP)</label>
                  <input type="number" value={shippingNational} onChange={e => setShippingNational(e.target.value)} style={inputStyle} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>A otras ciudades</span>
                </div>
                <div>
                  <label style={labelStyle}>Envío Gratis desde (COP)</label>
                  <input type="number" value={freeShippingMin} onChange={e => setFreeShippingMin(e.target.value)} style={inputStyle} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>Monto mínimo para envío gratuito</span>
                </div>
              </div>
              <button className="btn-primary" onClick={() => handleSaveGeneral('Envíos')} style={{ padding: '16px 40px', borderRadius: '50px', fontSize: '0.8rem', letterSpacing: '2px' }}>
                GUARDAR TARIFAS
              </button>
            </div>
          )}

          {/* ═══ IMPUESTOS ═══ */}
          {activeSection === 'taxes' && (
            <div style={cardStyle}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '8px' }}>Impuestos (IVA)</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '32px' }}>Ajusta la tasa de impuestos aplicable a tus productos.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', marginBottom: '28px' }}>
                <div>
                  <label style={labelStyle}>Tasa de IVA (%)</label>
                  <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} style={inputStyle} min="0" max="100" />
                </div>
                <div>
                  <label style={labelStyle}>Método de Aplicación</label>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: taxIncluded ? 'var(--gold-light)' : 'var(--text-muted)', fontSize: '0.85rem', padding: '10px 18px', borderRadius: '8px', border: taxIncluded ? '1px solid var(--border-gold)' : '1px solid var(--border-subtle)', background: taxIncluded ? 'rgba(201,168,76,0.06)' : 'transparent', transition: 'all 0.3s' }}>
                      <input type="radio" name="tax" checked={taxIncluded} onChange={() => setTaxIncluded(true)} style={{ display: 'none' }} />
                      Incluido en precio
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: !taxIncluded ? 'var(--gold-light)' : 'var(--text-muted)', fontSize: '0.85rem', padding: '10px 18px', borderRadius: '8px', border: !taxIncluded ? '1px solid var(--border-gold)' : '1px solid var(--border-subtle)', background: !taxIncluded ? 'rgba(201,168,76,0.06)' : 'transparent', transition: 'all 0.3s' }}>
                      <input type="radio" name="tax" checked={!taxIncluded} onChange={() => setTaxIncluded(false)} style={{ display: 'none' }} />
                      Sumar al final
                    </label>
                  </div>
                </div>
              </div>
              <button className="btn-primary" onClick={() => handleSaveGeneral('Impuestos')} style={{ padding: '16px 40px', borderRadius: '50px', fontSize: '0.8rem', letterSpacing: '2px' }}>
                GUARDAR IMPUESTOS
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
