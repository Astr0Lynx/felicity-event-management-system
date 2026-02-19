import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function PaymentApprovals() {
  const navigate = useNavigate();
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  
  // NEW: Track loaded payment proofs (lazy loading)
  const [loadedProofs, setLoadedProofs] = useState({});
  const [loadingProofs, setLoadingProofs] = useState({});

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      const { data } = await api.get('/events/organizer/pending-payments');
      setPendingPayments(data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setMessage(error.response?.data?.message || 'Failed to load payments');
      setMessageType('error');
      setLoading(false);
    }
  };

  // NEW: Fetch individual payment proof on-demand
  const fetchPaymentProof = async (eventId, registrationId) => {
    const key = `${eventId}_${registrationId}`;
    
    // Already loaded
    if (loadedProofs[key]) return;
    
    setLoadingProofs(prev => ({ ...prev, [key]: true }));
    
    try {
      const { data } = await api.get(`/events/${eventId}/payment/${registrationId}/proof`);
      setLoadedProofs(prev => ({ 
        ...prev, 
        [key]: data.data.payment_proof 
      }));
    } catch (error) {
      console.error('Error loading payment proof:', error);
      setMessage('Failed to load payment proof');
      setMessageType('error');
    } finally {
      setLoadingProofs(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleApprove = async (eventId, registrationId) => {
    if (!window.confirm('Approve this payment? Stock will be decremented and QR code will be generated.')) {
      return;
    }

    try {
      await api.put(`/events/${eventId}/payment/${registrationId}/approve`);
      setMessage('✅ Payment approved successfully! QR code generated.');
      setMessageType('success');
      fetchPendingPayments(); // Refresh list
    } catch (error) {
      console.error('Error approving payment:', error);
      setMessage(error.response?.data?.message || 'Failed to approve payment');
      setMessageType('error');
    }
  };

  const handleReject = async (eventId, registrationId) => {
    const reason = window.prompt('Enter rejection reason (optional):');
    if (reason === null) return; // User cancelled

    try {
      await api.put(`/events/${eventId}/payment/${registrationId}/reject`, { reason });
      setMessage('Payment rejected. Participant will need to re-upload proof.');
      setMessageType('success');
      fetchPendingPayments(); // Refresh list
    } catch (error) {
      console.error('Error rejecting payment:', error);
      setMessage(error.response?.data?.message || 'Failed to reject payment');
      setMessageType('error');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading pending payments...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/organizer/dashboard')} style={styles.backButton}>
        ← Back to Dashboard
      </button>

      <h1 style={styles.title}>Payment Approvals</h1>
      <p style={styles.subtitle}>
        Review and approve payment proofs for merchandise orders
      </p>

      {/* Message Display */}
      {message && (
        <div style={{
          ...styles.messageBox,
          background: messageType === 'success' ? '#d4edda' : '#f8d7da',
          color: messageType === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${messageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message}
        </div>
      )}

      {/* Statistics */}
      <div style={styles.statsCard}>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{pendingPayments.length}</span>
          <span style={styles.statLabel}>Pending Approvals</span>
        </div>
      </div>

      {/* Pending Payments List */}
      {pendingPayments.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>✅</div>
          <p style={styles.emptyText}>No pending payment approvals</p>
          <p style={styles.emptySubtext}>
            All merchandise orders have been reviewed or no orders have payment proofs uploaded yet.
          </p>
        </div>
      ) : (
        <div style={styles.paymentsGrid}>
          {pendingPayments.map((payment) => (
            <div key={payment.registration_id} style={styles.paymentCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.eventName}>{payment.event_name}</h3>
                <span style={styles.pendingBadge}>⏳ Pending</span>
              </div>

              <div style={styles.cardBody}>
                {/* Participant Info */}
                <div style={styles.section}>
                  <h4 style={styles.sectionTitle}>Participant</h4>
                  <p style={styles.infoText}><strong>Name:</strong> {payment.participant.name}</p>
                  <p style={styles.infoText}><strong>Email:</strong> {payment.participant.email}</p>
                  <p style={styles.infoText}><strong>Contact:</strong> {payment.participant.contact || 'N/A'}</p>
                </div>

                {/* Order Info */}
                <div style={styles.section}>
                  <h4 style={styles.sectionTitle}>Order Details</h4>
                  
                  {/* Show multiple variants if available */}
                  {payment.variant_orders && payment.variant_orders.length > 0 ? (
                    <>
                      <p style={styles.infoText}><strong>Items Ordered:</strong></p>
                      <div style={styles.variantList}>
                        {payment.variant_orders.map((order, idx) => (
                          <div key={idx} style={styles.variantItem}>
                            <span>{order.variant_name}</span>
                            <span>Qty: {order.quantity} × ₹{order.price} = ₹{order.quantity * order.price}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    // Legacy single variant display
                    <>
                      <p style={styles.infoText}><strong>Variant:</strong> {payment.variant_name}</p>
                      <p style={styles.infoText}><strong>Quantity:</strong> {payment.quantity}</p>
                    </>
                  )}
                  
                  <p style={styles.infoText}>
                    <strong>Total Price:</strong> 
                    <span style={styles.priceText}>₹{payment.total_price}</span>
                  </p>
                  <p style={styles.infoText}>
                    <strong>Ordered:</strong> {new Date(payment.registered_at).toLocaleString()}
                  </p>
                </div>

                {/* Payment Proof */}
                <div style={styles.section}>
                  <h4 style={styles.sectionTitle}>Payment Proof</h4>
                  <div style={styles.imageContainer}>
                    {(() => {
                      const proofKey = `${payment.event_id}_${payment.registration_id}`;
                      const isLoaded = loadedProofs[proofKey];
                      const isLoading = loadingProofs[proofKey];

                      if (isLoading) {
                        return (
                          <div style={styles.proofPlaceholder}>
                            <p>⏳ Loading payment proof...</p>
                          </div>
                        );
                      }

                      if (isLoaded) {
                        return (
                          <img 
                            src={isLoaded} 
                            alt="Payment Proof" 
                            style={styles.proofImage}
                            onClick={() => window.open(isLoaded, '_blank')}
                          />
                        );
                      }

                      // Default: Show button to load proof
                      return (
                        <div style={styles.proofPlaceholder}>
                          <p>📄 Payment proof uploaded</p>
                          <button
                            onClick={() => fetchPaymentProof(payment.event_id, payment.registration_id)}
                            style={styles.viewProofButton}
                          >
                            👁️ View Payment Proof
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={styles.actionButtons}>
                  <button 
                    onClick={() => handleApprove(payment.event_id, payment.registration_id)}
                    style={styles.approveButton}
                  >
                    ✓ Approve Payment
                  </button>
                  <button 
                    onClick={() => handleReject(payment.event_id, payment.registration_id)}
                    style={styles.rejectButton}
                  >
                    ✕ Reject Payment
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '30px',
    background: '#f5f5f5',
    minHeight: '100vh'
  },
  backButton: {
    padding: '8px 16px',
    background: '#607d8b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '20px'
  },
  loading: {
    textAlign: 'center',
    padding: '50px',
    fontSize: '18px',
    color: '#666'
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '32px',
    color: '#2c3e50'
  },
  subtitle: {
    margin: '0 0 30px 0',
    fontSize: '16px',
    color: '#7f8c8d'
  },
  messageBox: {
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px'
  },
  statsCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '8px',
    marginBottom: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'center'
  },
  statItem: {
    textAlign: 'center'
  },
  statValue: {
    display: 'block',
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#ff9800',
    marginBottom: '5px'
  },
  statLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#666',
    textTransform: 'uppercase'
  },
  emptyState: {
    background: 'white',
    padding: '60px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  emptyText: {
    fontSize: '20px',
    color: '#2c3e50',
    margin: '0 0 10px 0'
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#7f8c8d',
    margin: 0
  },
  paymentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '25px'
  },
  paymentCard: {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  cardHeader: {
    background: '#fff3cd',
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #ffc107'
  },
  eventName: {
    margin: 0,
    fontSize: '18px',
    color: '#2c3e50'
  },
  pendingBadge: {
    background: '#ff9800',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  cardBody: {
    padding: '20px'
  },
  section: {
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid #eee'
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#7f8c8d',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  infoText: {
    margin: '8px 0',
    fontSize: '14px',
    color: '#2c3e50'
  },
  priceText: {
    marginLeft: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#4caf50'
  },
  imageContainer: {
    marginTop: '10px'
  },
  proofImage: {
    width: '100%',
    maxHeight: '300px',
    objectFit: 'contain',
    border: '2px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  proofPlaceholder: {
    padding: '30px',
    background: '#f5f5f5',
    borderRadius: '4px',
    textAlign: 'center'
  },
  viewLink: {
    color: '#2196F3',
    textDecoration: 'none',
    fontWeight: 'bold'
  },
  viewProofButton: {
    marginTop: '10px',
    padding: '10px 20px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  variantList: {
    marginTop: '8px',
    marginLeft: '10px'
  },
  variantItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginBottom: '6px',
    fontSize: '14px'
  },
  actionButtons: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px'
  },
  approveButton: {
    flex: 1,
    padding: '12px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold'
  },
  rejectButton: {
    flex: 1,
    padding: '12px',
    background: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold'
  }
};
