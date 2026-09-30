export interface ContactRevealData {
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  leads_balance?: number;
  already_revealed?: boolean;
  message?: string;
}

export interface ContactRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactData: ContactRevealData | null;
  listingTitle?: string;
}

export default function ContactRevealModal({ isOpen, onClose, contactData, listingTitle }: ContactRevealModalProps) {
  if (!isOpen || !contactData) return null;

  const { owner_name, owner_phone, owner_email, leads_balance, already_revealed, message } = contactData;
  const cleanPhone = owner_phone ? owner_phone.replace(/[^0-9]/g, '') : '';
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0c6253, #14a37a)',
            color: '#fff',
            padding: '24px',
            position: 'relative'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Direct Owner Contact
            </span>
            {already_revealed && (
              <span
                style={{
                  background: '#16a34a',
                  padding: '4px 8px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600
                }}
              >
                Previously Unlocked
              </span>
            )}
          </div>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>
            {owner_name}
          </h3>
          {listingTitle && (
            <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              For: {listingTitle}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {message && (
            <div
              style={{
                fontSize: '13px',
                color: '#065f46',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '16px'
              }}
            >
              {message}
            </div>
          )}

          {/* Contact Details List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 16px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}
              >
                <i className="fas fa-phone-alt"></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  Phone Number
                </div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                  {owner_phone || 'Not available'}
                </div>
              </div>
              {owner_phone && (
                <a
                  href={`tel:${cleanPhone}`}
                  style={{
                    background: '#0c6253',
                    color: '#fff',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  Call
                </a>
              )}
            </div>

            {cleanPhone && (
              <a
                href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                  `Hello ${owner_name || 'Owner'}, I saw your property listing "${listingTitle || 'on TradeCall'}" and would like to discuss it.`
                )}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#25d366',
                  color: '#fff',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)'
                }}
              >
                <i className="fab fa-whatsapp" style={{ fontSize: '20px' }}></i> Chat on WhatsApp
              </a>
            )}

            {owner_email && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#fef3c7',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}
                >
                  <i className="fas fa-envelope"></i>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Email Address
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {owner_email}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Balance Status Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: '#f1f5f9',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#475569'
            }}
          >
            <span>
              Remaining Lead Balance: <strong>{leads_balance ?? 0}</strong>
            </span>
            <span style={{ color: '#0c6253', fontWeight: 600 }}>Zero Brokerage</span>
          </div>

          <button
            type="button"
            className="btn-outline"
            onClick={onClose}
            style={{ width: '100%', marginTop: '16px', padding: '10px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
