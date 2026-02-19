import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createSuccess, setCreateSuccess] = useState('');
  
  // Form state for creating new event
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'normal',
    eligibility: '',
    reg_deadline: '',
    start_date: '',
    end_date: '',
    reg_limit: '',
    reg_fee: 0,
    event_tags: ''
  });

  // Custom form fields for normal events
  const [customFormFields, setCustomFormFields] = useState([]);
  
  // Merchandise details for merchandise events
  const [merchandiseDetails, setMerchandiseDetails] = useState({
    item_name: '',
    sizes: [],
    colors: [],
    variants: [],
    stock_quantity: 0,
    purchase_limit_per_participant: 1
  });

  // Load data on startup
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get organizer info from localStorage
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          navigate('/login');
          return;
        }
        const userData = JSON.parse(storedUser);
        
        // Verify user is organizer
        if (userData.role !== 'organizer') {
          // Redirect to correct dashboard based on actual role
          if (userData.role === 'admin') {
            navigate('/admin/dashboard');
          } else {
            navigate('/dashboard');
          }
          return;
        }
        
        setUser(userData);

        // Fetch organizer's events
        const { data } = await api.get('/events/organizer/me');
        setMyEvents(data.data);

      } catch (err) {
        console.error("Failed to fetch organizer data", err);
        setError("Could not load your events.");
        
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

  // Create new event
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setError('');
    setCreateSuccess('');

    try {
      // Convert event_tags from comma-separated string to array
      const eventData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        eligibility: formData.eligibility,
        reg_deadline: formData.reg_deadline,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reg_fee: Number(formData.reg_fee),
        reg_limit: formData.reg_limit ? Number(formData.reg_limit) : null,
        event_tags: formData.event_tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      // Add custom fields or merchandise details based on type
      if (formData.type === 'normal') {
        // Custom form fields are optional
        if (customFormFields.length > 0) {
          eventData.custom_form_fields = customFormFields;
        }
      } else if (formData.type === 'merchandise') {
        if (!merchandiseDetails.item_name || merchandiseDetails.variants.length === 0) {
          setError('Merchandise events must have item name and at least one variant');
          return;
        }
        eventData.merchandise_details = merchandiseDetails;
      }

      await api.post('/events', eventData);
      
      setCreateSuccess('Event created successfully!');

      // Reset form
      setFormData({
        name: '',
        description: '',
        type: 'normal',
        eligibility: '',
        reg_deadline: '',
        start_date: '',
        end_date: '',
        reg_limit: '',
        reg_fee: 0,
        event_tags: ''
      });
      setCustomFormFields([]);
      setMerchandiseDetails({
        item_name: '',
        sizes: [],
        colors: [],
        variants: [],
        stock_quantity: 0,
        purchase_limit_per_participant: 1
      });

      // Hide form
      setShowCreateForm(false);

      // Refresh events list
      const { data } = await api.get('/events/organizer/me');
      setMyEvents(data.data);

      // Hide success message after 3 seconds
      setTimeout(() => setCreateSuccess(''), 3000);

    } catch (err) {
      console.error("Failed to create event", err);
      setError(err.response?.data?.message || "Failed to create event");
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // Custom Form Fields Management
  const addFormField = () => {
    setCustomFormFields([...customFormFields, {
      field_name: '',
      field_type: 'text',
      is_required: false,
      options: []
    }]);
  };

  const updateFormField = (index, field, value) => {
    const updated = [...customFormFields];
    updated[index][field] = value;
    setCustomFormFields(updated);
  };

  const removeFormField = (index) => {
    setCustomFormFields(customFormFields.filter((_, i) => i !== index));
  };

  // Merchandise Management
  const addVariant = () => {
    setMerchandiseDetails({
      ...merchandiseDetails,
      variants: [...merchandiseDetails.variants, {
        variant_name: '',
        price: 0,
        stock_quantity: 0
      }]
    });
  };

  const updateVariant = (index, field, value) => {
    const updated = [...merchandiseDetails.variants];
    updated[index][field] = value;
    setMerchandiseDetails({ ...merchandiseDetails, variants: updated });
  };

  const removeVariant = (index) => {
    setMerchandiseDetails({
      ...merchandiseDetails,
      variants: merchandiseDetails.variants.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Loading organizer dashboard...</div>;
  }

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '20px', border: '1px solid #ddd' }}>
        <div>
          <h1 style={{ margin: 0 }}>Organizer Dashboard</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>{user?.organizerName || 'Loading...'}</p>
        </div>
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

      {/* Success Message */}
      {createSuccess && (
        <div style={{ color: '#2e7d32', background: '#e8f5e9', padding: '10px', border: '1px solid #4caf50', marginBottom: '20px' }}>
          {createSuccess}
        </div>
      )}

      {/* Error Messages */}
      {error && (
        <div style={{ color: '#d32f2f', background: '#ffebee', padding: '10px', border: '1px solid #ef5350', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Stats Card */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', background: 'white', border: '1px solid #ddd', flex: 1 }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Total Events Created</h3>
          <p style={{ fontSize: '32px', margin: 0, fontWeight: 'bold' }}>{myEvents.length}</p>
        </div>
        <div style={{ padding: '20px', background: 'white', border: '1px solid #ddd', flex: 1 }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Total Registrations</h3>
          <p style={{ fontSize: '32px', margin: 0, fontWeight: 'bold' }}>
            {myEvents.reduce((sum, event) => sum + (event.registered_participants?.length || 0), 0)}
          </p>
        </div>
      </div>

      {/* Create New Event Button */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{ padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '16px' }}
        >
          {showCreateForm ? '✕ Cancel' : '+ Create New Event'}
        </button>
      </div>

      {/* Create Event Form */}
      {showCreateForm && (
        <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd', marginBottom: '30px' }}>
          <h2 style={{ marginTop: 0 }}>Create New Event</h2>
          <form onSubmit={handleCreateEvent}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Event Name *
                </label>
                <input 
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Hackathon 2025"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Event Type *
                </label>
                <select 
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                >
                  <option value="normal">Normal Event</option>
                  <option value="merchandise">Merchandise</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Description *
                </label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  placeholder="Describe your event"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Eligibility *
                </label>
                <select
                  name="eligibility"
                  value={formData.eligibility}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                >
                  <option value="">Select eligibility</option>
                  <option value="All">All</option>
                  <option value="IIIT Hyderabad Only">IIIT Hyderabad Only</option>
                  <option value="Non-IIIT Only">Non-IIIT Only</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Registration Fee (₹)
                </label>
                <input 
                  type="number"
                  name="reg_fee"
                  value={formData.reg_fee}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="0"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Registration Deadline *
                </label>
                <input 
                  type="datetime-local"
                  name="reg_deadline"
                  value={formData.reg_deadline}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Start Date *
                </label>
                <input 
                  type="datetime-local"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  End Date *
                </label>
                <input 
                  type="datetime-local"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Registration Limit (Optional)
                </label>
                <input 
                  type="number"
                  name="reg_limit"
                  value={formData.reg_limit}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="Leave empty for unlimited"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Tags (comma-separated)
                </label>
                <input 
                  type="text"
                  name="event_tags"
                  value={formData.event_tags}
                  onChange={handleInputChange}
                  placeholder="e.g., Workshop, Technical, Coding"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Custom Form Builder for Normal Events */}
            {formData.type === 'normal' && (
              <div style={{ marginTop: '30px', padding: '20px', background: '#f9f9f9', border: '1px solid #ddd' }}>
                <h3 style={{ marginTop: 0 }}>Custom Registration Form Fields</h3>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                  Add custom fields that participants must fill when registering
                </p>

                {customFormFields.map((field, index) => (
                  <div key={index} style={{ marginBottom: '15px', padding: '15px', background: 'white', border: '1px solid #ddd' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                          Field Name *
                        </label>
                        <input
                          type="text"
                          value={field.field_name}
                          onChange={(e) => updateFormField(index, 'field_name', e.target.value)}
                          placeholder="e.g., Team Name"
                          style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                          Field Type *
                        </label>
                        <select
                          value={field.field_type}
                          onChange={(e) => updateFormField(index, 'field_type', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '3px' }}
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="email">Email</option>
                          <option value="dropdown">Dropdown</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="file upload">File Upload</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                          Required?
                        </label>
                        <input
                          type="checkbox"
                          checked={field.is_required}
                          onChange={(e) => updateFormField(index, 'is_required', e.target.checked)}
                          style={{ width: '20px', height: '20px' }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFormField(index)}
                        style={{ padding: '6px 12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>

                    {(field.field_type === 'dropdown' || field.field_type === 'checkbox') && (
                      <div style={{ marginTop: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                          Options (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={field.options.join(', ')}
                          onChange={(e) => updateFormField(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                          placeholder="e.g., Option 1, Option 2, Option 3"
                          style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addFormField}
                  style={{ padding: '8px 16px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                >
                  + Add Form Field
                </button>
              </div>
            )}

            {/* Merchandise Details for Merchandise Events */}
            {formData.type === 'merchandise' && (
              <div style={{ marginTop: '30px', padding: '20px', background: '#fff3e0', border: '1px solid #ff9800' }}>
                <h3 style={{ marginTop: 0 }}>Merchandise Details</h3>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={merchandiseDetails.item_name}
                    onChange={(e) => setMerchandiseDetails({ ...merchandiseDetails, item_name: e.target.value })}
                    placeholder="e.g., Club T-Shirt"
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Total Stock Quantity *
                    </label>
                    <input
                      type="number"
                      value={merchandiseDetails.stock_quantity}
                      onChange={(e) => setMerchandiseDetails({ ...merchandiseDetails, stock_quantity: Number(e.target.value) })}
                      min="0"
                      style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Purchase Limit Per Participant
                    </label>
                    <input
                      type="number"
                      value={merchandiseDetails.purchase_limit_per_participant}
                      onChange={(e) => setMerchandiseDetails({ ...merchandiseDetails, purchase_limit_per_participant: Number(e.target.value) })}
                      min="1"
                      style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <h4>Variants (e.g., Size M - Blue) *</h4>
                {merchandiseDetails.variants.map((variant, index) => (
                  <div key={index} style={{ marginBottom: '10px', padding: '10px', background: 'white', border: '1px solid #ddd', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                        Variant Name *
                      </label>
                      <input
                        type="text"
                        value={variant.variant_name}
                        onChange={(e) => updateVariant(index, 'variant_name', e.target.value)}
                        placeholder="e.g., Medium - Blue"
                        style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                        Price (₹) *
                      </label>
                      <input
                        type="number"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, 'price', Number(e.target.value))}
                        min="0"
                        style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                        Stock *
                      </label>
                      <input
                        type="number"
                        value={variant.stock_quantity}
                        onChange={(e) => updateVariant(index, 'stock_quantity', Number(e.target.value))}
                        min="0"
                        style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      style={{ padding: '6px 12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addVariant}
                  style={{ padding: '8px 16px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                >
                  + Add Variant
                </button>
              </div>
            )}

            <button 
              type="submit"
              style={{ marginTop: '15px', padding: '10px 20px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
            >
              Create Event
            </button>
          </form>
        </div>
      )}

      {/* Events Carousel */}
      <h2>Your Events</h2>
      {myEvents.length === 0 ? (
        <p style={{ background: 'white', padding: '30px', textAlign: 'center', border: '1px solid #ddd' }}>
          You haven't created any events yet. Create one using the form above.
        </p>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
          <div style={{ display: 'flex', gap: '15px', paddingBottom: '10px', minWidth: 'min-content' }}>
            {myEvents.map(event => {
              const now = new Date();
              const startDate = new Date(event.start_date);
              const endDate = new Date(event.end_date);
              const deadline = new Date(event.reg_deadline);
              
              let status = 'Draft';
              if (endDate < now) status = 'Completed';
              else if (startDate <= now && endDate >= now) status = 'Ongoing';
              else if (deadline >= now) status = 'Published';
              else status = 'Closed';

              const statusColors = {
                Draft: '#9e9e9e',
                Published: '#2196F3',
                Ongoing: '#4caf50',
                Completed: '#607d8b',
                Closed: '#f44336'
              };

              return (
                <div 
                  key={event._id} 
                  style={{ 
                    background: 'white', 
                    border: '1px solid #ddd', 
                    padding: '20px',
                    borderRadius: '8px',
                    minWidth: '320px',
                    maxWidth: '320px',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s'
                  }}
                  onClick={() => navigate(`/organizer/events/${event._id}`)}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, flex: 1 }}>{event.name}</h3>
                    <span style={{
                      padding: '4px 12px',
                      background: statusColors[status],
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      marginLeft: '10px'
                    }}>
                      {status}
                    </span>
                  </div>
                  
                  <p style={{ margin: '8px 0', color: '#666', fontSize: '14px' }}>
                    <strong>Type:</strong> <span style={{ textTransform: 'capitalize' }}>{event.type}</span>
                  </p>
                  <p style={{ margin: '8px 0', color: '#2196F3', fontSize: '14px', fontWeight: 'bold' }}>
                    👥 {event.registered_participants?.length || 0} participants
                    {event.reg_limit && ` / ${event.reg_limit}`}
                  </p>
                  <p style={{ margin: '8px 0', color: '#666', fontSize: '14px' }}>
                    💰 ₹{event.reg_fee}
                  </p>
                  <p style={{ margin: '8px 0', color: '#888', fontSize: '13px' }}>
                    📅 {new Date(event.start_date).toLocaleDateString()}
                  </p>
                  <p style={{ 
                    marginTop: '12px', 
                    fontSize: '13px',
                    color: '#555',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {event.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event Analytics for Completed Events */}
      {myEvents.some(e => new Date(e.end_date) < new Date()) && (
        <>
          <h2 style={{ marginTop: '40px' }}>Event Analytics (Completed Events)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>Total Registrations</h3>
              <p style={{ fontSize: '32px', margin: 0, fontWeight: 'bold', color: '#2196F3' }}>
                {myEvents
                  .filter(e => new Date(e.end_date) < new Date())
                  .reduce((sum, event) => sum + (event.registered_participants?.length || 0), 0)}
              </p>
            </div>
            <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>Total Revenue</h3>
              <p style={{ fontSize: '32px', margin: 0, fontWeight: 'bold', color: '#4caf50' }}>
                ₹{myEvents
                  .filter(e => new Date(e.end_date) < new Date())
                  .reduce((sum, event) => sum + (event.registered_participants?.length || 0) * event.reg_fee, 0)}
              </p>
            </div>
            <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>Completed Events</h3>
              <p style={{ fontSize: '32px', margin: 0, fontWeight: 'bold', color: '#607d8b' }}>
                {myEvents.filter(e => new Date(e.end_date) < new Date()).length}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
