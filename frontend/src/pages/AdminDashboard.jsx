import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [organizers, setOrganizers] = useState([]);
  const [events, setEvents] = useState([]);
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

  // Load data on startup
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get admin info from localStorage
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          navigate('/login');
          return;
        }
        const userData = JSON.parse(storedUser);
        
        // Verify user is admin
        if (userData.role !== 'admin') {
          // Redirect to correct dashboard based on actual role
          if (userData.role === 'organizer') {
            navigate('/organizer/dashboard');
          } else {
            navigate('/dashboard');
          }
          return;
        }
        
        setUser(userData);

        // Fetch all organizers
        const organizersResponse = await api.get('/admin/organizers');
        setOrganizers(organizersResponse.data);

        // Fetch all events
        const eventsResponse = await api.get('/events');
        setEvents(eventsResponse.data);

      } catch (err) {
        console.error("Failed to fetch admin data", err);
        setError("Could not load data.");
        
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

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

      // Refresh organizers list
      const response = await api.get('/admin/organizers');
      setOrganizers(response.data);

    } catch (err) {
      console.error("Failed to create organizer", err);
      setError(err.response?.data?.message || "Failed to create organizer");
    }
  };

  // Delete organizer
  const handleDeleteOrganizer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this organizer?')) {
      return;
    }

    try {
      await api.delete(`/admin/organizers/${id}`);
      
      // Refresh organizers list
      const { data } = await api.get('/admin/organizers');
      setOrganizers(data);

    } catch (err) {
      console.error("Failed to delete organizer", err);
      setError(err.response?.data?.message || "Failed to delete organizer");
    }
  };

  // Delete event
  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/admin/events/${id}`);
      
      // Refresh events list
      const eventsResponse = await api.get('/events');
      setEvents(eventsResponse.data);
      
      alert('Event deleted successfully');
    } catch (err) {
      console.error("Failed to delete event", err);
      setError(err.response?.data?.message || "Failed to delete event");
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Loading admin dashboard...</div>;
  }

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '20px', border: '1px solid #ddd' }}>
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => navigate('/profile')}
            style={{ padding: '8px 16px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            My Profile
          </button>
          <button 
            onClick={handleLogout}
            style={{ padding: '8px 16px', background: '#f44336', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div style={{ color: '#d32f2f', background: '#ffebee', padding: '10px', border: '1px solid #ef5350', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Success Message for Created Organizer */}
      {createSuccess && (
        <div style={{ background: '#e8f5e9', padding: '20px', border: '1px solid #4caf50', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>{createSuccess.message}</h3>
          <p style={{ margin: '5px 0' }}><strong>Organizer Name:</strong> {createSuccess.name}</p>
          <p style={{ margin: '5px 0' }}><strong>Email:</strong> {createSuccess.email}</p>
          <p style={{ margin: '5px 0' }}><strong>Password:</strong> {createSuccess.password}</p>
          <p style={{ margin: '10px 0 0 0', color: '#666', fontSize: '14px' }}>
            ⚠️ Please save these credentials! The password cannot be recovered later.
          </p>
          <button 
            onClick={() => setCreateSuccess(null)}
            style={{ marginTop: '10px', padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Got it!
          </button>
        </div>
      )}

      {/* Stats Card */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', background: 'white', border: '1px solid #ddd', flex: 1 }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Total Organizers</h3>
          <p style={{ fontSize: '32px', margin: 0, fontWeight: 'bold' }}>{organizers.length}</p>
        </div>
        <div style={{ padding: '20px', background: 'white', border: '1px solid #ddd', flex: 1 }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Admin Email</h3>
          <p style={{ fontSize: '16px', margin: 0 }}>{user?.email}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd', marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => navigate('/admin/payment-approvals')}
            style={{ padding: '12px 20px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            💳 Payment Approvals
          </button>
          <button 
            onClick={() => navigate('/admin/password-reset-requests')}
            style={{ padding: '12px 20px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            🔑 Password Reset Requests
          </button>
          <button 
            onClick={() => navigate('/admin/manage-organizers')}
            style={{ padding: '12px 20px', background: '#9c27b0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            👥 Manage Organizers
          </button>
        </div>
      </div>

      {/* Create New Organizer Button */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{ padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '16px' }}
        >
          {showCreateForm ? '✕ Cancel' : '+ Create New Organizer'}
        </button>
      </div>

      {/* Create Organizer Form */}
      {showCreateForm && (
        <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd', marginBottom: '30px' }}>
          <h2 style={{ marginTop: 0 }}>Create New Organizer</h2>
          <form onSubmit={handleCreateOrganizer}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Organizer Name *
              </label>
              <input 
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g., Enigma, Felicity, EDC"
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Category *
              </label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
              >
                <option value="club">Club</option>
                <option value="fest team">Fest Team</option>
                <option value="council">Council</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Description *
              </label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={3}
                placeholder="Brief description of the organizer"
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>

            <button 
              type="submit"
              style={{ padding: '10px 20px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
            >
              Create Organizer
            </button>
          </form>
        </div>
      )}

      {/* Organizers List */}
      <h2>All Organizers</h2>
      {organizers.length === 0 ? (
        <p style={{ background: 'white', padding: '30px', textAlign: 'center', border: '1px solid #ddd' }}>
          No organizers created yet. Create one using the form above.
        </p>
      ) : (
        <div style={{ background: 'white', border: '1px solid #ddd' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Category</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizers.map((organizer, index) => (
                <tr key={organizer._id} style={{ borderBottom: index < organizers.length - 1 ? '1px solid #eee' : 'none' }}>
                  <td style={{ padding: '12px', color: '#2c3e50' }}>{organizer.organizer_details?.name || 'N/A'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      background: organizer.organizer_details?.category === 'club' ? '#e3f2fd' : organizer.organizer_details?.category === 'fest team' ? '#fff3e0' : '#f3e5f5',
                      color: organizer.organizer_details?.category === 'club' ? '#1976d2' : organizer.organizer_details?.category === 'fest team' ? '#f57c00' : '#7b1fa2',
                      borderRadius: '3px',
                      fontSize: '14px'
                    }}>
                      {organizer.organizer_details?.category || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', maxWidth: '300px', color: '#2c3e50' }}>{organizer.organizer_details?.description || 'No description'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleDeleteOrganizer(organizer.organizer_details?._id)}
                      style={{ padding: '6px 12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Events Management Section */}
      <h2 style={{ marginTop: '40px' }}>All Events</h2>
      {events.length === 0 ? (
        <p style={{ background: 'white', padding: '30px', textAlign: 'center', border: '1px solid #ddd' }}>
          No events created yet.
        </p>
      ) : (
        <div style={{ background: 'white', border: '1px solid #ddd' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Event Name</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Organizer</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Start Date</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Registrations</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, index) => (
                <tr key={event._id} style={{ borderBottom: index < events.length - 1 ? '1px solid #eee' : 'none' }}>
                  <td style={{ padding: '12px', color: '#2c3e50', fontWeight: 'bold' }}>{event.name}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      background: event.type === 'normal' ? '#e8f5e9' : '#fff3e0',
                      color: event.type === 'normal' ? '#2e7d32' : '#f57c00',
                      borderRadius: '3px',
                      fontSize: '14px',
                      textTransform: 'capitalize'
                    }}>
                      {event.type}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#2c3e50' }}>
                    {event.organizer?.organizer_details?.name || 'Unknown'}
                  </td>
                  <td style={{ padding: '12px', color: '#2c3e50' }}>
                    {new Date(event.start_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#2c3e50' }}>
                    {event.registered_participants?.length || 0}
                    {event.reg_limit && event.reg_limit > 0 && ` / ${event.reg_limit}`}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleDeleteEvent(event._id)}
                      style={{ padding: '6px 12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
