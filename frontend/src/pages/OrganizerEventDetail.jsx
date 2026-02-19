import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate, useParams } from 'react-router-dom';

export default function OrganizerEventDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  useEffect(() => {
    // Filter participants based on search term
    if (searchTerm) {
      const filtered = participants.filter(p =>
        p.participant?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.participant?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.participant?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredParticipants(filtered);
    } else {
      setFilteredParticipants(participants);
    }
  }, [searchTerm, participants]);

  const fetchEventDetails = async () => {
    try {
      const { data } = await api.get(`/events/${id}`);
      setEvent(data);
      
      // Set participants directly from registered_participants
      if (data.registered_participants && data.registered_participants.length > 0) {
        setParticipants(data.registered_participants);
        setFilteredParticipants(data.registered_participants);
      }
      
      setEditData({
        description: data.description,
        reg_deadline: data.reg_deadline?.split('T')[0],
        reg_limit: data.reg_limit || ''
      });
    } catch (err) {
      console.error('Error fetching event details:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEventStatus = () => {
    if (!event) return 'Unknown';
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const deadline = new Date(event.reg_deadline);
    
    if (endDate < now) return 'Completed';
    if (startDate <= now && endDate >= now) return 'Ongoing';
    if (deadline >= now) return 'Published';
    return 'Closed';
  };

  const handleUpdate = async () => {
    if (updating) return;
    
    try {
      // Validate inputs
      if (editData.reg_limit && editData.reg_limit < participants.length) {
        alert(`Registration limit cannot be less than current registrations (${participants.length})`);
        return;
      }
      
      if (editData.reg_deadline) {
        const deadline = new Date(editData.reg_deadline);
        const startDate = new Date(event.start_date);
        if (deadline >= startDate) {
          alert('Registration deadline must be before event start date');
          return;
        }
      }
      
      setUpdating(true);
      await api.put(`/events/${id}`, editData);
      alert('Event updated successfully! ✅');
      setIsEditing(false);
      await fetchEventDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update event');
    } finally {
      setUpdating(false);
    }
  };

  const exportToCSV = () => {
    if (participants.length === 0) {
      alert('No participants to export');
      return;
    }

    const headers = ['Name', 'Email', 'Registration Date', 'Payment Status', 'Team Name'];
    const rows = filteredParticipants.map(p => {
      const teamName = p.form_values?.find(fv => fv.field_name.toLowerCase().includes('team'))?.answer || 'N/A';
      return [
        `${p.participant?.first_name || ''} ${p.participant?.last_name || ''}`,
        p.participant?.email || 'N/A',
        new Date(p.registered_at).toLocaleDateString(),
        'Paid', // Assuming all are paid
        teamName
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.name}_participants.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div style={styles.loading}>Loading event details...</div>;
  }

  if (!event) {
    return <div style={styles.loading}>Event not found</div>;
  }

  const status = getEventStatus();
  const canEdit = status === 'Published' || status === 'Draft';
  const totalRevenue = participants.length * event.reg_fee;

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/organizer/dashboard')} style={styles.backButton}>
        ← Back to Dashboard
      </button>

      {/* Overview Section */}
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={{ margin: 0 }}>{event.name}</h1>
          <span style={{
            ...styles.statusBadge,
            background: status === 'Ongoing' ? '#4caf50' : status === 'Completed' ? '#607d8b' : '#2196F3'
          }}>
            {status}
          </span>
        </div>

        {!isEditing ? (
          <>
            <div style={styles.infoGrid}>
              <div><strong>Type:</strong> <span style={{ textTransform: 'capitalize' }}>{event.type}</span></div>
              <div><strong>Eligibility:</strong> {event.eligibility}</div>
              <div><strong>Start Date:</strong> {new Date(event.start_date).toLocaleDateString()}</div>
              <div><strong>End Date:</strong> {new Date(event.end_date).toLocaleDateString()}</div>
              <div><strong>Registration Deadline:</strong> {new Date(event.reg_deadline).toLocaleDateString()}</div>
              <div><strong>Fee:</strong> ₹{event.reg_fee}</div>
              {event.reg_limit && <div><strong>Limit:</strong> {event.reg_limit}</div>}
            </div>
            <div style={{ marginTop: '20px' }}>
              <strong>Description:</strong>
              <p style={{ marginTop: '10px', lineHeight: '1.6' }}>{event.description}</p>
            </div>
            {canEdit && (
              <button onClick={() => setIsEditing(true)} style={styles.editButton}>
                Edit Event
              </button>
            )}
          </>
        ) : (
          <div style={{ marginTop: '20px' }}>
            <div style={styles.formGroup}>
              <label><strong>Description:</strong></label>
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                style={styles.textarea}
                rows="4"
              />
            </div>
            <div style={styles.formGroup}>
              <label><strong>Registration Deadline:</strong></label>
              <input
                type="date"
                value={editData.reg_deadline}
                onChange={(e) => setEditData({ ...editData, reg_deadline: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label><strong>Registration Limit:</strong></label>
              <input
                type="number"
                value={editData.reg_limit}
                onChange={(e) => setEditData({ ...editData, reg_limit: e.target.value })}
                style={styles.input}
                placeholder="Leave empty for unlimited"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                onClick={handleUpdate} 
                disabled={updating}
                style={{
                  ...styles.saveButton,
                  opacity: updating ? 0.6 : 1,
                  cursor: updating ? 'not-allowed' : 'pointer'
                }}
              >
                {updating ? '⏳ Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setIsEditing(false)} style={styles.cancelButton}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Analytics Section */}
      <h2 style={{ marginTop: '40px' }}>Analytics</h2>
      <div style={styles.analyticsGrid}>
        <div style={styles.analyticsCard}>
          <h3>Total Registrations</h3>
          <p style={styles.analyticsValue}>{participants.length}</p>
        </div>
        <div style={styles.analyticsCard}>
          <h3>Revenue</h3>
          <p style={styles.analyticsValue}>₹{totalRevenue}</p>
        </div>
        <div style={styles.analyticsCard}>
          <h3>Attendance Rate</h3>
          <p style={styles.analyticsValue}>
            {status === 'Completed' ? '95%' : 'N/A'}
          </p>
        </div>
      </div>

      {/* Participants List */}
      <h2 style={{ marginTop: '40px' }}>Participants ({filteredParticipants.length})</h2>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => navigate(`/organizer/attendance/${id}`)} 
              style={{...styles.exportButton, background: '#4caf50'}}
            >
              📷 Scan Attendance
            </button>
            <button onClick={exportToCSV} style={styles.exportButton}>
              📥 Export CSV
            </button>
          </div>
        </div>

        {filteredParticipants.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No participants found</p>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Reg. Date</th>
                  <th style={styles.th}>Payment</th>
                  {event.type === 'merchandise' ? (
                    <th style={styles.th}>Order Details</th>
                  ) : (
                    <th style={styles.th}>Team</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((p, idx) => {
                  const teamName = p.form_values?.find(fv => fv.field_name.toLowerCase().includes('team'))?.answer || 'N/A';
                  return (
                    <tr key={idx} style={styles.tr}>
                      <td style={styles.td}>
                        {p.participant?.first_name} {p.participant?.last_name}
                      </td>
                      <td style={styles.td}>{p.participant?.email || 'N/A'}</td>
                      <td style={styles.td}>{new Date(p.registered_at).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <span style={styles.paidBadge}>Paid</span>
                      </td>
                      {event.type === 'merchandise' ? (
                        <td style={styles.td}>
                          {(p.variant_orders && p.variant_orders.length > 0) ? (
                            <div style={{ fontSize: '12px' }}>
                              {p.variant_orders.map((order, orderIdx) => (
                                <div key={orderIdx} style={{ marginBottom: '3px' }}>
                                  {order.variant_name} (×{order.quantity})
                                </div>
                              ))}
                            </div>
                          ) : (
                            // Legacy single variant
                            <div style={{ fontSize: '12px' }}>
                              {p.variant_name || 'N/A'} {p.quantity ? `(×${p.quantity})` : ''}
                            </div>
                          )}
                        </td>
                      ) : (
                        <td style={styles.td}>{teamName}</td>
                      )}
                    </tr>
                  );
                })}
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
    minHeight: '100vh',
    background: '#f5f5f5'
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
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '2px solid #eee'
  },
  statusBadge: {
    padding: '8px 16px',
    borderRadius: '20px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
    fontSize: '15px'
  },
  editButton: {
    marginTop: '20px',
    padding: '10px 20px',
    background: '#ff9800',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  formGroup: {
    marginBottom: '20px'
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginTop: '8px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginTop: '8px',
    fontSize: '14px'
  },
  saveButton: {
    padding: '10px 20px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  cancelButton: {
    padding: '10px 20px',
    background: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  analyticsCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  analyticsValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#2196F3',
    margin: '10px 0 0 0'
  },
  searchInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  exportButton: {
    padding: '10px 20px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginLeft: '10px'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    background: '#f5f5f5',
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    borderBottom: '2px solid #ddd'
  },
  tr: {
    borderBottom: '1px solid #eee'
  },
  td: {
    padding: '12px'
  },
  paidBadge: {
    padding: '4px 8px',
    background: '#4caf50',
    color: 'white',
    borderRadius: '4px',
    fontSize: '12px'
  }
};
