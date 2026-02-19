import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export default function TicketModal({ eventId, onClose }) {
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTicket();
  }, [eventId]);

  const fetchTicket = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/ticket`);
      setTicketData(data.data);
    } catch (err) {
      console.error('Error fetching ticket:', err);
      setError(err.response?.data?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <p style={{ textAlign: 'center', padding: '50px' }}>Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <p style={{ color: '#c62828', textAlign: 'center' }}>{error || 'Ticket not found'}</p>
          <button onClick={onClose} style={styles.closeButton}>Close</button>
        </div>
      </div>
    );
  }

  // Generate QR code URL using qrserver.com API
  // QR code contains event_id and participant_id for attendance scanning
  // Only generate QR for normal events or approved merchandise orders
  const shouldShowQR = ticketData.event.type === 'normal' || 
                       (ticketData.event.type === 'merchandise' && ticketData.registration.payment_status === 'approved');

  const qrData = JSON.stringify({
    event_id: eventId,
    participant_id: ticketData.participant.id,
    ticket_id: ticketData.ticket_id,
    event_name: ticketData.event.name
  });

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={{ margin: 0 }}>🎫 Event Ticket</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Ticket Content */}
        <div style={styles.ticketBody}>
          {/* QR Code - Only show if payment approved for merchandise */}
          {shouldShowQR ? (
            <div style={styles.qrSection}>
              <img 
                src={qrCodeUrl} 
                alt="Ticket QR Code" 
                style={styles.qrCode}
              />
              <div style={styles.ticketIdBox}>
                <strong>Ticket ID:</strong>
                <div style={styles.ticketIdText}>{ticketData.ticket_id}</div>
              </div>
            </div>
          ) : (
            <div style={styles.qrSection}>
              <div style={{ 
                padding: '30px', 
                background: '#fff3cd', 
                borderRadius: '8px',
                textAlign: 'center',
                border: '2px dashed #ffc107'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>⏳</div>
                <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>QR Code Pending</h3>
                <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
                  QR code will be generated after payment approval
                </p>
              </div>
              <div style={styles.ticketIdBox}>
                <strong>Ticket ID:</strong>
                <div style={styles.ticketIdText}>{ticketData.ticket_id}</div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div style={styles.divider}></div>

          {/* Event Details */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📅 Event Details</h3>
            <div style={styles.detailRow}>
              <span style={styles.label}>Event Name:</span>
              <span style={styles.value}>{ticketData.event.name}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Event Type:</span>
              <span style={{
                ...styles.badge,
                background: ticketData.event.type === 'normal' ? '#e3f2fd' : '#fff3e0',
                color: ticketData.event.type === 'normal' ? '#1976d2' : '#f57c00'
              }}>
                {ticketData.event.type.toUpperCase()}
              </span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Organizer:</span>
              <span style={styles.value}>{ticketData.event.organizer?.email || 'N/A'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Start Date:</span>
              <span style={styles.value}>{new Date(ticketData.event.start_date).toLocaleString()}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>End Date:</span>
              <span style={styles.value}>{new Date(ticketData.event.end_date).toLocaleString()}</span>
            </div>
          </div>

          {/* Participant Details */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>👤 Participant Details</h3>
            <div style={styles.detailRow}>
              <span style={styles.label}>Name:</span>
              <span style={styles.value}>{ticketData.participant.name}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Email:</span>
              <span style={styles.value}>{ticketData.participant.email}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Type:</span>
              <span style={styles.value}>{ticketData.participant.participant_type.toUpperCase()}</span>
            </div>
          </div>

          {/* Registration Details */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📝 Registration Details</h3>
            <div style={styles.detailRow}>
              <span style={styles.label}>Registered At:</span>
              <span style={styles.value}>{new Date(ticketData.registration.registered_at).toLocaleString()}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Status:</span>
              <span style={{
                ...styles.badge,
                background: ticketData.registration.status === 'Active' ? '#e8f5e9' : '#f5f5f5',
                color: ticketData.registration.status === 'Active' ? '#2e7d32' : '#666'
              }}>
                {ticketData.registration.status}
              </span>
            </div>
            
            {/* Custom Form Answers */}
            {ticketData.registration.form_values && ticketData.registration.form_values.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <strong style={{ display: 'block', marginBottom: '10px', color: '#666' }}>
                  Form Responses:
                </strong>
                {ticketData.registration.form_values.map((field, idx) => (
                  <div key={idx} style={styles.detailRow}>
                    <span style={styles.label}>{field.field_name}:</span>
                    <span style={styles.value}>{field.answer}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Merchandise Order Details */}
            {ticketData.event.type === 'merchandise' && (
              <div style={{ marginTop: '15px' }}>
                <strong style={{ display: 'block', marginBottom: '10px', color: '#666' }}>
                  Order Details:
                </strong>
                {(ticketData.registration.variant_orders && ticketData.registration.variant_orders.length > 0) ? (
                  <div style={{ marginBottom: '10px' }}>
                    {ticketData.registration.variant_orders.map((order, idx) => {
                      const variant = ticketData.event.merchandise_details?.variants?.find(
                        v => v.variant_name === order.variant_name
                      );
                      return (
                        <div key={idx} style={{ padding: '8px', background: '#f5f5f5', marginBottom: '5px', borderRadius: '4px', fontSize: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span><strong>{order.variant_name}</strong></span>
                            <span>Qty: {order.quantity} × ₹{variant?.price || 0}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ padding: '8px', background: '#e8f5e9', borderRadius: '4px', fontWeight: 'bold', marginTop: '5px' }}>
                      Total: ₹{ticketData.registration.variant_orders.reduce((sum, order) => {
                        const variant = ticketData.event.merchandise_details?.variants?.find(v => v.variant_name === order.variant_name);
                        return sum + ((variant?.price || 0) * order.quantity);
                      }, 0)}
                    </div>
                  </div>
                ) : (
                  // Legacy single variant display
                  <>
                    {ticketData.registration.variant_name && (
                      <div style={styles.detailRow}>
                        <span style={styles.label}>Variant:</span>
                        <span style={styles.value}>{ticketData.registration.variant_name}</span>
                      </div>
                    )}
                    {ticketData.registration.quantity && (
                      <div style={styles.detailRow}>
                        <span style={styles.label}>Quantity:</span>
                        <span style={styles.value}>{ticketData.registration.quantity}</span>
                      </div>
                    )}
                  </>
                )}
                <div style={styles.detailRow}>
                  <span style={styles.label}>Payment Status:</span>
                  <span style={{
                    ...styles.badge,
                    background: ticketData.registration.payment_status === 'approved' ? '#e8f5e9' : '#fff3e0',
                    color: ticketData.registration.payment_status === 'approved' ? '#2e7d32' : '#f57c00'
                  }}>
                    {ticketData.registration.payment_status?.toUpperCase() || 'PENDING'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={handlePrint} style={styles.printButton}>
            🖨️ Print Ticket
          </button>
          <button onClick={onClose} style={styles.closeButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '25px',
    borderBottom: '2px solid #eee',
    background: '#f9f9f9'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    width: '30px',
    height: '30px'
  },
  ticketBody: {
    padding: '30px'
  },
  qrSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '30px'
  },
  qrCode: {
    width: '200px',
    height: '200px',
    border: '4px solid #2196F3',
    borderRadius: '8px',
    padding: '10px',
    background: 'white'
  },
  ticketIdBox: {
    marginTop: '15px',
    textAlign: 'center',
    padding: '10px 20px',
    background: '#f5f5f5',
    borderRadius: '6px'
  },
  ticketIdText: {
    fontSize: '18px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: '#2196F3',
    marginTop: '5px'
  },
  divider: {
    height: '2px',
    background: '#eee',
    margin: '20px 0'
  },
  section: {
    marginBottom: '25px'
  },
  sectionTitle: {
    fontSize: '16px',
    marginBottom: '15px',
    color: '#333',
    borderBottom: '2px solid #2196F3',
    paddingBottom: '8px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0'
  },
  label: {
    fontWeight: 'bold',
    color: '#666',
    flex: '0 0 150px'
  },
  value: {
    color: '#333',
    textAlign: 'right',
    flex: 1
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  footer: {
    display: 'flex',
    gap: '10px',
    padding: '20px 25px',
    borderTop: '2px solid #eee',
    background: '#f9f9f9'
  },
  printButton: {
    flex: 1,
    padding: '12px 24px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  closeButton: {
    padding: '12px 24px',
    background: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  }
};
