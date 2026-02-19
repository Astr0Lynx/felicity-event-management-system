import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function OrganizerProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [organizerData, setOrganizerData] = useState({
    email: '',
    name: '',
    category: '',
    description: '',
    contact_number: '',
    discord_webhook: ''
  });
  const [editData, setEditData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // TIER B: Password Reset Request state
  const [showResetRequest, setShowResetRequest] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [resetHistory, setResetHistory] = useState([]);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchResetHistory();
  }, []);

  const fetchResetHistory = async () => {
    try {
      const { data } = await api.get('/organizer/password-reset-history');
      setResetHistory(data.data || []);
    } catch (err) {
      console.error('Error fetching reset history:', err);
      // Don't show error to user, just fail silently
    }
  };

  const fetchProfile = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        navigate('/login');
        return;
      }

      const user = JSON.parse(userStr);
      
      // Fetch organizer details from backend
      const { data } = await api.get('/organizer/profile');
      
      setOrganizerData({
        email: data.email,
        name: data.organizer_details?.name || '',
        category: data.organizer_details?.category || '',
        description: data.organizer_details?.description || '',
        contact_number: data.contact_number || '',
        discord_webhook: data.discord_webhook || ''
      });
      
      setEditData({
        name: data.organizer_details?.name || '',
        category: data.organizer_details?.category || '',
        description: data.organizer_details?.description || '',
        contact_number: data.contact_number || '',
        discord_webhook: data.discord_webhook || ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    try {
      await api.put('/organizer/profile', editData);
      setSuccess('Profile updated successfully!');
      setEditing(false);
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const testWebhook = async () => {
    if (!editData.discord_webhook) {
      alert('Please save a Discord Webhook URL first');
      return;
    }

    try {
      await api.post('/organizer/test-webhook', {
        webhook_url: editData.discord_webhook
      });
      alert('Test message sent to Discord! Check your channel.');
    } catch (err) {
      alert('Failed to send test message. Please check your webhook URL.');
    }
  };

  // TIER B: Handle password reset request
  const handleResetRequest = async () => {
    setResetError('');
    setResetMessage('');

    if (!resetReason.trim()) {
      setResetError('Please provide a reason for the password reset request');
      return;
    }

    try {
      await api.post('/organizer/request-password-reset', {
        reason: resetReason
      });

      setResetMessage('✅ Password reset request submitted successfully! Admin will review your request.');
      setResetReason('');
      setShowResetRequest(false);
      
      // Refresh history to show new request
      await fetchResetHistory();

      setTimeout(() => setResetMessage(''), 5000);
    } catch (err) {
      console.error('Error submitting reset request:', err);
      setResetError(err.response?.data?.message || 'Failed to submit password reset request');
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading profile...</div>;
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/organizer/dashboard')} style={styles.backButton}>
        ← Back to Dashboard
      </button>

      <div style={styles.card}>
        <div style={styles.header}>
          <h1>Organizer Profile</h1>
          {!editing && (
            <button onClick={() => setEditing(true)} style={styles.editButton}>
              Edit Profile
            </button>
          )}
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {!editing ? (
          // View Mode
          <div style={styles.infoSection}>
            <div style={styles.infoRow}>
              <strong>Organization Name:</strong>
              <span>{organizerData.name}</span>
            </div>
            <div style={styles.infoRow}>
              <strong>Category:</strong>
              <span style={{ textTransform: 'capitalize' }}>{organizerData.category}</span>
            </div>
            <div style={styles.infoRow}>
              <strong>Login Email:</strong>
              <span>{organizerData.email}</span>
              <span style={styles.badge}>Non-editable</span>
            </div>
            <div style={styles.infoRow}>
              <strong>Contact Number:</strong>
              <span>{organizerData.contact_number || 'Not provided'}</span>
            </div>
            <div style={styles.infoRow}>
              <strong>Description:</strong>
              <p style={{ marginTop: '10px', lineHeight: '1.6' }}>
                {organizerData.description || 'No description provided'}
              </p>
            </div>
            <div style={styles.infoRow}>
              <strong>Discord Webhook:</strong>
              <span>{organizerData.discord_webhook ? '✓ Configured' : 'Not configured'}</span>
            </div>
          </div>
        ) : (
          // Edit Mode
          <div style={styles.formSection}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Organization Name *</label>
              <input
                type="text"
                name="name"
                value={editData.name}
                onChange={handleInputChange}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Category *</label>
              <select
                name="category"
                value={editData.category}
                onChange={handleInputChange}
                style={styles.input}
              >
                <option value="club">Club</option>
                <option value="council">Council</option>
                <option value="fest team">Fest Team</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Login Email</label>
              <input
                type="email"
                value={organizerData.email}
                disabled
                style={{ ...styles.input, background: '#f5f5f5', cursor: 'not-allowed' }}
              />
              <small style={{ color: '#666' }}>Email cannot be changed</small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Contact Number</label>
              <input
                type="tel"
                name="contact_number"
                value={editData.contact_number}
                onChange={handleInputChange}
                placeholder="+91 1234567890"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description *</label>
              <textarea
                name="description"
                value={editData.description}
                onChange={handleInputChange}
                required
                rows="4"
                placeholder="Tell participants about your organization..."
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Discord Webhook URL</label>
              <input
                type="url"
                name="discord_webhook"
                value={editData.discord_webhook}
                onChange={handleInputChange}
                placeholder="https://discord.com/api/webhooks/..."
                style={styles.input}
              />
              <small style={{ color: '#666', display: 'block', marginTop: '8px' }}>
                New events will be automatically posted to your Discord channel
              </small>
              {editData.discord_webhook && (
                <button
                  type="button"
                  onClick={testWebhook}
                  style={styles.testButton}
                >
                  Test Webhook
                </button>
              )}
            </div>

            <div style={styles.buttonGroup}>
              <button onClick={handleSave} style={styles.saveButton}>
                Save Changes
              </button>
              <button onClick={() => setEditing(false)} style={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TIER B: Password Reset Request Section */}
      <div style={styles.card}>
        <h3 style={{ marginBottom: '20px' }}>🔐 Request Password Reset from Admin</h3>
        <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
          If you forgot your password or need it reset, submit a request to the admin.
        </p>

        {resetMessage && <div style={styles.success}>{resetMessage}</div>}
        {resetError && <div style={styles.error}>{resetError}</div>}

        {!showResetRequest ? (
          <button 
            style={styles.editButton}
            onClick={() => setShowResetRequest(true)}
          >
            📝 Submit Password Reset Request
          </button>
        ) : (
          <div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Reason for Reset *</label>
              <textarea
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                style={styles.textarea}
                rows={4}
                placeholder="Explain why you need a password reset (e.g., forgot password, security concern, etc.)"
              />
            </div>

            <div style={styles.buttonGroup}>
              <button onClick={handleResetRequest} style={styles.saveButton}>
                Submit Request
              </button>
              <button 
                onClick={() => {
                  setShowResetRequest(false);
                  setResetReason('');
                  setResetError('');
                }} 
                style={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Password Reset History */}
        {resetHistory.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <h4 style={{ marginBottom: '15px' }}>Your Reset Request History</h4>
            <div style={styles.historyList}>
              {resetHistory.map((req) => (
                <div key={req.request_id} style={styles.historyItem}>
                  <div style={styles.historyHeader}>
                    <span style={{
                      ...styles.statusBadge,
                      background: 
                        req.status === 'approved' ? '#4caf50' :
                        req.status === 'rejected' ? '#f44336' :
                        '#ff9800'
                    }}>
                      {req.status.toUpperCase()}
                    </span>
                    <span style={styles.historyDate}>
                      {new Date(req.requested_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={styles.historyContent}>
                    <p><strong>Reason:</strong> {req.reason}</p>
                    {req.reviewed_at && (
                      <>
                        <p><strong>Reviewed by:</strong> {req.reviewed_by || 'Admin'}</p>
                        <p><strong>Reviewed on:</strong> {new Date(req.reviewed_at).toLocaleDateString()}</p>
                      </>
                    )}
                    {req.admin_comment && (
                      <p><strong>Admin comment:</strong> {req.admin_comment}</p>
                    )}
                    {req.status === 'approved' && (
                      <div style={styles.approvedNote}>
                        ✅ Your password was reset. Admin should have shared the new password with you.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '30px',
    minHeight: '100vh',
    background: '#f5f5f5',
    maxWidth: '900px',
    margin: '0 auto'
  },
  loading: {
    padding: '50px',
    textAlign: 'center',
    fontSize: '18px'
  },
  backButton: {
    padding: '10px 20px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '20px'
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #eee'
  },
  editButton: {
    padding: '10px 20px',
    background: '#ff9800',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  error: {
    padding: '15px',
    background: '#ffebee',
    color: '#c62828',
    borderRadius: '4px',
    marginBottom: '20px'
  },
  success: {
    padding: '15px',
    background: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: '4px',
    marginBottom: '20px'
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  infoRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingBottom: '20px',
    borderBottom: '1px solid #eee'
  },
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    background: '#e0e0e0',
    borderRadius: '4px',
    fontSize: '12px',
    marginTop: '5px',
    width: 'fit-content'
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontWeight: 'bold',
    marginBottom: '8px',
    fontSize: '14px'
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  textarea: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  testButton: {
    marginTop: '10px',
    padding: '8px 16px',
    background: '#7289da',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    width: 'fit-content'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px'
  },
  saveButton: {
    padding: '12px 30px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  cancelButton: {
    padding: '12px 30px',
    background: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  infoCard: {
    background: '#e3f2fd',
    padding: '25px',
    borderRadius: '8px',
    lineHeight: '1.6'
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  historyItem: {
    padding: '15px',
    background: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: '6px'
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  statusBadge: {
    padding: '4px 12px',
    color: 'white',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  historyDate: {
    fontSize: '13px',
    color: '#666'
  },
  historyContent: {
    fontSize: '14px',
    lineHeight: '1.6'
  },
  approvedNote: {
    marginTop: '10px',
    padding: '12px',
    background: '#e8f5e9',
    border: '1px solid #4caf50',
    borderRadius: '4px',
    color: '#2e7d32'
  }
};
