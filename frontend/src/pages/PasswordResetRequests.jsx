import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const PasswordResetRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectModal, setRejectModal] = useState({ show: false, requestId: null, comment: '' });
  const [generatedPassword, setGeneratedPassword] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/admin/password-reset-requests');
      setRequests(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    if (!window.confirm('Are you sure you want to approve this password reset request? A new password will be generated.')) {
      return;
    }

    try {
      setError('');
      setSuccessMessage('');
      const response = await api.put(`/admin/password-reset-requests/${requestId}/approve`, {});
      setSuccessMessage('Request approved successfully!');
      setGeneratedPassword({
        requestId,
        password: response.data.data.new_password,
        organizerEmail: response.data.data.organizer_email
      });
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleRejectClick = (requestId) => {
    setRejectModal({ show: true, requestId, comment: '' });
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal.comment.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setError('');
      setSuccessMessage('');
      await api.put(`/admin/password-reset-requests/${rejectModal.requestId}/reject`, {
        admin_comment: rejectModal.comment
      });
      setSuccessMessage('Request rejected successfully');
      setRejectModal({ show: false, requestId: null, comment: '' });
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject request');
    }
  };

  const closeRejectModal = () => {
    setRejectModal({ show: false, requestId: null, comment: '' });
  };

  const closePasswordModal = () => {
    setGeneratedPassword(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#4caf50';
      case 'rejected': return '#f44336';
      case 'pending': return '#ff9800';
      default: return '#666';
    }
  };

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(req => req.status === statusFilter);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.headerSection}>
          <h1 style={styles.title}>Password Reset Requests</h1>
          <button onClick={() => navigate('/admin')} style={styles.backButton}>
            ← Back to Dashboard
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {successMessage && <div style={styles.success}>{successMessage}</div>}

        <div style={styles.filterSection}>
          <label style={styles.filterLabel}>Filter by Status:</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div style={styles.loading}>Loading requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div style={styles.noData}>
            {statusFilter === 'all' ? 'No password reset requests found' : `No ${statusFilter} requests found`}
          </div>
        ) : (
          <div style={styles.requestsList}>
            {filteredRequests.map((request) => (
              <div key={request.request_id} style={styles.requestCard}>
                <div style={styles.requestHeader}>
                  <div style={styles.organizerInfo}>
                    <h3 style={styles.clubName}>{request.club_name}</h3>
                    <p style={styles.email}>{request.organizer_email}</p>
                    <p style={styles.category}>Category: {request.club_category}</p>
                  </div>
                  <div style={{ ...styles.statusBadge, background: getStatusColor(request.status) }}>
                    {request.status.toUpperCase()}
                  </div>
                </div>

                <div style={styles.requestBody}>
                  <div style={styles.requestRow}>
                    <strong>Requested on:</strong>
                    <span>{new Date(request.requested_at).toLocaleString()}</span>
                  </div>

                  <div style={styles.requestRow}>
                    <strong>Reason:</strong>
                    <p style={styles.reason}>{request.reason}</p>
                  </div>

                  {request.status !== 'pending' && (
                    <>
                      <div style={styles.divider}></div>
                      <div style={styles.requestRow}>
                        <strong>Reviewed by:</strong>
                        <span>{request.reviewed_by || 'N/A'}</span>
                      </div>
                      <div style={styles.requestRow}>
                        <strong>Reviewed on:</strong>
                        <span>{request.reviewed_at ? new Date(request.reviewed_at).toLocaleString() : 'N/A'}</span>
                      </div>
                      {request.admin_comment && (
                        <div style={styles.requestRow}>
                          <strong>Admin Comment:</strong>
                          <p style={styles.adminComment}>{request.admin_comment}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {request.status === 'pending' && (
                  <div style={styles.actionButtons}>
                    <button 
                      onClick={() => handleApprove(request.request_id)}
                      style={styles.approveButton}
                    >
                      Approve Request
                    </button>
                    <button 
                      onClick={() => handleRejectClick(request.request_id)}
                      style={styles.rejectButton}
                    >
                      Reject Request
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reject Modal */}
        {rejectModal.show && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>Reject Password Reset Request</h2>
              <p style={styles.modalText}>Please provide a reason for rejecting this request:</p>
              <textarea
                value={rejectModal.comment}
                onChange={(e) => setRejectModal({ ...rejectModal, comment: e.target.value })}
                placeholder="Enter reason for rejection..."
                style={styles.modalTextarea}
                rows={4}
              />
              <div style={styles.modalButtons}>
                <button onClick={handleRejectSubmit} style={styles.modalConfirmButton}>
                  Confirm Rejection
                </button>
                <button onClick={closeRejectModal} style={styles.modalCancelButton}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generated Password Modal */}
        {generatedPassword && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>Password Reset Approved</h2>
              <div style={styles.passwordBox}>
                <p style={styles.modalText}>
                  New password for <strong>{generatedPassword.organizerEmail}</strong>:
                </p>
                <div style={styles.passwordDisplay}>
                  <code style={styles.passwordCode}>{generatedPassword.password}</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPassword.password);
                      alert('Password copied to clipboard!');
                    }}
                    style={styles.copyButton}
                  >
                    Copy
                  </button>
                </div>
                <p style={styles.warningText}>
                  ⚠️ Please share this password with the organizer securely. This password will not be shown again.
                </p>
              </div>
              <div style={styles.modalButtons}>
                <button onClick={closePasswordModal} style={styles.modalConfirmButton}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


const styles = {
  container: {
    padding: '30px',
    background: '#f5f5f5',
    minHeight: '100vh'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  headerSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  title: {
    margin: 0,
    fontSize: '32px',
    color: '#2c3e50'
  },
  backButton: {
    padding: '10px 20px',
    background: '#607d8b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  error: {
    background: '#ffebee',
    color: '#c62828',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px',
    border: '1px solid #ef5350'
  },
  success: {
    background: '#e8f5e9',
    color: '#2e7d32',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px',
    border: '1px solid #4caf50'
  },
  filterSection: {
    background: 'white',
    padding: '20px',
    borderRadius: '4px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    border: '1px solid #ddd'
  },
  filterLabel: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  filterSelect: {
    padding: '10px 15px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    minWidth: '200px'
  },
  loading: {
    background: 'white',
    padding: '40px',
    borderRadius: '4px',
    textAlign: 'center',
    fontSize: '18px',
    color: '#666',
    border: '1px solid #ddd'
  },
  noData: {
    background: 'white',
    padding: '40px',
    borderRadius: '4px',
    textAlign: 'center',
    fontSize: '16px',
    color: '#999',
    border: '1px solid #ddd'
  },
  requestsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  requestCard: {
    background: 'white',
    borderRadius: '4px',
    padding: '25px',
    border: '1px solid #ddd'
  },
  requestHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #f0f0f0'
  },
  organizerInfo: {
    flex: 1
  },
  clubName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '5px'
  },
  email: {
    fontSize: '14px',
    color: '#555',
    marginBottom: '3px'
  },
  category: {
    fontSize: '13px',
    color: '#777',
    fontStyle: 'italic'
  },
  statusBadge: {
    padding: '6px 16px',
    color: 'white',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  requestBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  requestRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  reason: {
    background: '#f9f9f9',
    padding: '12px',
    borderRadius: '4px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#2c3e50',
    margin: 0,
    border: '1px solid #eee'
  },
  divider: {
    height: '1px',
    background: '#e0e0e0',
    margin: '10px 0'
  },
  adminComment: {
    background: '#fff3e0',
    padding: '12px',
    borderRadius: '4px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#e65100',
    margin: 0,
    border: '1px solid #ffb74d'
  },
  actionButtons: {
    display: 'flex',
    gap: '15px',
    marginTop: '20px',
    paddingTop: '15px',
    borderTop: '2px solid #f0f0f0'
  },
  approveButton: {
    flex: 1,
    padding: '12px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
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
    fontSize: '14px',
    fontWeight: 'bold'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    background: 'white',
    borderRadius: '4px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto'
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '15px'
  },
  modalText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '15px'
  },
  modalTextarea: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    resize: 'vertical',
    fontFamily: 'inherit',
    marginBottom: '20px'
  },
  modalButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end'
  },
  modalConfirmButton: {
    padding: '10px 20px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  modalCancelButton: {
    padding: '10px 20px',
    background: '#ccc',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  passwordBox: {
    background: '#f9f9f9',
    padding: '20px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  passwordDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'white',
    padding: '15px',
    borderRadius: '4px',
    border: '2px solid #4caf50',
    marginBottom: '15px'
  },
  passwordCode: {
    flex: 1,
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#4caf50',
    fontFamily: 'monospace',
    letterSpacing: '2px'
  },
  copyButton: {
    padding: '8px 16px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  warningText: {
    fontSize: '13px',
    color: '#d84315',
    margin: 0
  }
};

export default PasswordResetRequests;

