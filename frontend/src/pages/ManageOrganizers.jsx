import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function ManageOrganizers() {
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(null);
  
  // Form state for creating new organizer
  const [formData, setFormData] = useState({
    name: '',
    category: 'club',
    description: ''
  });

  // Load organizers on mount
  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const { data } = await api.get('/admin/organizers');
      console.log('Fetched organizers:', data);
      setOrganizers(data);
    } catch (err) {
      console.error("Failed to fetch organizers", err);
      setError("Could not load organizers.");
      
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Create new organizer
  const handleCreateOrganizer = async (e) => {
    e.preventDefault();
    setError('');
    setCreateSuccess(null);

    try {
      const { data } = await api.post('/admin/organizers', formData);
      
      // Show credentials to admin
      setCreateSuccess({
        message: data.message,
        name: data.name,
        email: data.email,
        password: data.password
      });

      // Reset form
      setFormData({
        name: '',
        category: 'club',
        description: ''
      });

      // Hide form
      setShowCreateForm(false);

      // Refresh organizers list
      fetchOrganizers();

    } catch (err) {
      console.error("Failed to create organizer", err);
      setError(err.response?.data?.message || "Failed to create organizer");
    }
  };

  // Delete organizer
  const handleDeleteOrganizer = async (organizerId, organizerName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${organizerName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/admin/organizers/${organizerId}`);
      
      // Refresh organizers list
      fetchOrganizers();

    } catch (err) {
      console.error("Failed to delete organizer", err);
      setError(err.response?.data?.message || "Failed to delete organizer");
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading organizers...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/admin/dashboard')} style={styles.backButton}>
        ← Back to Dashboard
      </button>

      <h1 style={styles.title}>Manage Clubs/Organizers</h1>

      {/* Error Messages */}
      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      {/* Success Message for Created Organizer */}
      {createSuccess && (
        <div style={styles.successBox}>
          <h3 style={styles.successTitle}>{createSuccess.message}</h3>
          <div style={styles.credentialsBox}>
            <p style={styles.credentialRow}>
              <strong>Organizer Name:</strong> {createSuccess.name}
            </p>
            <p style={styles.credentialRow}>
              <strong>Login Email:</strong> <span style={styles.credentialValue}>{createSuccess.email}</span>
            </p>
            <p style={styles.credentialRow}>
              <strong>Password:</strong> <span style={styles.credentialValue}>{createSuccess.password}</span>
            </p>
          </div>
          <p style={styles.warningText}>
            ⚠️ <strong>Important:</strong> Please save these credentials and share them with the organizer. 
            The password cannot be recovered later. The organizer can log in immediately using these credentials.
          </p>
          <button 
            onClick={() => setCreateSuccess(null)}
            style={styles.successCloseButton}
          >
            Got it!
          </button>
        </div>
      )}

      {/* Create New Organizer Button */}
      <div style={styles.actionBar}>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={styles.createButton}
        >
          {showCreateForm ? '✕ Cancel' : '+ Add New Club/Organizer'}
        </button>
      </div>

      {/* Create Organizer Form */}
      {showCreateForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>Create New Organizer Account</h2>
          <p style={styles.formSubtitle}>
            System will auto-generate login email and password for the new organizer.
          </p>
          <form onSubmit={handleCreateOrganizer}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Organizer Name <span style={styles.required}>*</span>
              </label>
              <input 
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g., Enigma, Felicity, EDC, Phoenix"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Category <span style={styles.required}>*</span>
              </label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                style={styles.input}
              >
                <option value="club">Club</option>
                <option value="fest team">Fest Team</option>
                <option value="council">Council</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Description <span style={styles.required}>*</span>
              </label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                placeholder="Brief description of the club/organizer"
                style={{ ...styles.input, resize: 'vertical' }}
              />
            </div>

            <button 
              type="submit"
              style={styles.submitButton}
            >
              Create Organizer Account
            </button>
          </form>
        </div>
      )}

      {/* Organizers List */}
      <div style={styles.listCard}>
        <h2 style={styles.listTitle}>
          All Organizers ({organizers.length})
        </h2>
        
        {organizers.length === 0 ? (
          <p style={styles.emptyState}>
            No organizers created yet. Create your first organizer using the button above.
          </p>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.thActions}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizers.map((organizer) => (
                  <tr key={organizer._id} style={styles.tableRow}>
                    <td style={styles.td}>
                      <strong>{organizer.organizer_details?.name || 'N/A'}</strong>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.categoryBadge,
                        background: 
                          organizer.organizer_details?.category === 'club' ? '#e3f2fd' : 
                          organizer.organizer_details?.category === 'fest team' ? '#fff3e0' : 
                          '#f3e5f5',
                        color:
                          organizer.organizer_details?.category === 'club' ? '#1976d2' : 
                          organizer.organizer_details?.category === 'fest team' ? '#f57c00' : 
                          '#7b1fa2'
                      }}>
                        {organizer.organizer_details?.category || 'N/A'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <code style={styles.emailCode}>{organizer.email}</code>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.description}>
                        {organizer.organizer_details?.description || 'No description'}
                      </div>
                    </td>
                    <td style={styles.tdActions}>
                      <button 
                        onClick={() => handleDeleteOrganizer(organizer.organizer_details?._id, organizer.organizer_details?.name)}
                        style={styles.deleteButton}
                      >
                        🗑️ Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
    marginBottom: '20px',
    fontSize: '14px'
  },
  title: {
    margin: '0 0 30px 0',
    fontSize: '32px',
    color: '#2c3e50'
  },
  loading: {
    padding: '50px',
    textAlign: 'center',
    fontSize: '18px',
    color: '#666'
  },
  errorBox: {
    color: '#d32f2f',
    background: '#ffebee',
    padding: '15px',
    border: '1px solid #ef5350',
    borderRadius: '4px',
    marginBottom: '20px'
  },
  successBox: {
    background: '#e8f5e9',
    padding: '25px',
    border: '2px solid #4caf50',
    borderRadius: '6px',
    marginBottom: '30px'
  },
  successTitle: {
    margin: '0 0 20px 0',
    color: '#2e7d32',
    fontSize: '20px'
  },
  credentialsBox: {
    background: 'white',
    padding: '20px',
    borderRadius: '4px',
    marginBottom: '15px',
    border: '1px solid #c8e6c9'
  },
  credentialRow: {
    margin: '10px 0',
    fontSize: '16px',
    lineHeight: '1.6'
  },
  credentialValue: {
    background: '#f5f5f5',
    padding: '4px 12px',
    borderRadius: '3px',
    fontFamily: 'monospace',
    fontSize: '15px',
    color: '#d32f2f'
  },
  warningText: {
    margin: '15px 0 0 0',
    color: '#f57c00',
    fontSize: '14px',
    lineHeight: '1.6'
  },
  successCloseButton: {
    marginTop: '15px',
    padding: '10px 20px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  actionBar: {
    marginBottom: '30px'
  },
  createButton: {
    padding: '12px 24px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  formCard: {
    background: 'white',
    padding: '30px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    marginBottom: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  formTitle: {
    marginTop: 0,
    marginBottom: '10px',
    fontSize: '24px',
    color: '#2c3e50'
  },
  formSubtitle: {
    margin: '0 0 25px 0',
    color: '#666',
    fontSize: '14px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  required: {
    color: '#e74c3c'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box',
    fontSize: '15px'
  },
  submitButton: {
    padding: '12px 30px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  listCard: {
    background: 'white',
    padding: '30px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  listTitle: {
    marginTop: 0,
    marginBottom: '25px',
    fontSize: '24px',
    color: '#2c3e50'
  },
  emptyState: {
    padding: '50px',
    textAlign: 'center',
    color: '#999',
    fontSize: '16px'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    background: '#f5f5f5',
    borderBottom: '2px solid #ddd'
  },
  th: {
    padding: '15px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  thActions: {
    padding: '15px',
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  tableRow: {
    borderBottom: '1px solid #eee'
  },
  td: {
    padding: '15px',
    verticalAlign: 'top',
    color: '#2c3e50'
  },
  tdActions: {
    padding: '15px',
    textAlign: 'center',
    verticalAlign: 'middle'
  },
  categoryBadge: {
    padding: '6px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block'
  },
  emailCode: {
    background: '#f5f5f5',
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '13px',
    color: '#2c3e50'
  },
  description: {
    maxWidth: '400px',
    lineHeight: '1.5',
    color: '#555'
  },
  deleteButton: {
    padding: '8px 16px',
    background: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  }
};
