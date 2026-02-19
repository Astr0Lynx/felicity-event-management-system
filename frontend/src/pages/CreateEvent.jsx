import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function CreateEvent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'normal',
    eligibility: 'all-participants',
    reg_deadline: '',
    start_date: '',
    end_date: '',
    reg_limit: '',
    reg_fee: 0,
    event_tags: ''
  });

  const [customFormFields, setCustomFormFields] = useState([]);
  const [merchandiseDetails, setMerchandiseDetails] = useState({
    item_name: '',
    variants: [],
    stock_quantity: 0,
    purchase_limit_per_participant: 1
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Custom Form Field Management
  const addCustomField = () => {
    setCustomFormFields([...customFormFields, {
      field_name: '',
      field_type: 'text',
      is_required: false
    }]);
  };

  const updateCustomField = (index, field, value) => {
    const updated = [...customFormFields];
    updated[index][field] = value;
    setCustomFormFields(updated);
  };

  const removeCustomField = (index) => {
    setCustomFormFields(customFormFields.filter((_, i) => i !== index));
  };

  const moveFieldUp = (index) => {
    if (index === 0) return;
    const updated = [...customFormFields];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setCustomFormFields(updated);
  };

  const moveFieldDown = (index) => {
    if (index === customFormFields.length - 1) return;
    const updated = [...customFormFields];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setCustomFormFields(updated);
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

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Date validation
      const deadline = new Date(formData.reg_deadline);
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (deadline >= startDate) {
        setError('Registration deadline must be before event start date');
        return;
      }
      
      if (startDate >= endDate) {
        setError('Event start date must be before end date');
        return;
      }

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

      if (formData.type === 'normal') {
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

      setLoading(true);
      const response = await api.post('/events', eventData);
      setSuccess('Event created successfully as Draft! ✅ Redirecting...');
      
      setTimeout(() => {
        navigate('/organizer/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/organizer/dashboard')} style={styles.backButton}>
        ← Back to Dashboard
      </button>

      <div style={styles.card}>
        <h1>Create New Event</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          Fill in the details below. The event will be created as a Draft and can be published later.
        </p>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <form onSubmit={handleCreateEvent}>
          {/* Basic Information */}
          <h2 style={{ marginTop: '30px', marginBottom: '20px' }}>Basic Information</h2>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Event Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Event Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                style={styles.input}
              >
                <option value="normal">Normal Event</option>
                <option value="merchandise">Merchandise</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Eligibility *</label>
              <select
                name="eligibility"
                value={formData.eligibility}
                onChange={handleInputChange}
                style={styles.input}
              >
                <option value="all-participants">All Participants</option>
                <option value="iiit-only">IIIT Only</option>
                <option value="non-iiit-only">Non-IIIT Only</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Registration Fee (₹) *</label>
              <input
                type="number"
                name="reg_fee"
                value={formData.reg_fee}
                onChange={handleInputChange}
                min="0"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Registration Limit</label>
              <input
                type="number"
                name="reg_limit"
                value={formData.reg_limit}
                onChange={handleInputChange}
                min="0"
                placeholder="Leave empty for unlimited"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Registration Deadline *</label>
              <input
                type="datetime-local"
                name="reg_deadline"
                value={formData.reg_deadline}
                onChange={handleInputChange}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Start Date *</label>
              <input
                type="datetime-local"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>End Date *</label>
              <input
                type="datetime-local"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows="4"
              style={styles.textarea}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Event Tags (comma-separated)</label>
            <input
              type="text"
              name="event_tags"
              value={formData.event_tags}
              onChange={handleInputChange}
              placeholder="e.g., Workshop, Tech, Competitive"
              style={styles.input}
            />
          </div>

          {/* Custom Form Builder for Normal Events */}
          {formData.type === 'normal' && (
            <>
              <h2 style={{ marginTop: '40px', marginBottom: '20px' }}>
                Custom Registration Form (Optional)
              </h2>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                Add custom fields for participant registration. Forms are locked after the first registration.
              </p>

              {customFormFields.map((field, index) => (
                <div key={index} style={styles.fieldCard}>
                  <div style={styles.fieldHeader}>
                    <h4 style={{ margin: 0 }}>Field {index + 1}</h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => moveFieldUp(index)}
                        disabled={index === 0}
                        style={styles.iconButton}
                        title="Move Up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFieldDown(index)}
                        disabled={index === customFormFields.length - 1}
                        style={styles.iconButton}
                        title="Move Down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomField(index)}
                        style={styles.removeButton}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Field Name *</label>
                      <input
                        type="text"
                        value={field.field_name}
                        onChange={(e) => updateCustomField(index, 'field_name', e.target.value)}
                        required
                        placeholder="e.g., Team Name, T-shirt Size"
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Field Type *</label>
                      <select
                        value={field.field_type}
                        onChange={(e) => updateCustomField(index, 'field_type', e.target.value)}
                        style={styles.input}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="email">Email</option>
                        <option value="tel">Phone</option>
                        <option value="date">Date</option>
                        <option value="textarea">Long Text</option>
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={field.is_required}
                          onChange={(e) => updateCustomField(index, 'is_required', e.target.checked)}
                        />
                        Required Field
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addCustomField}
                style={styles.addButton}
              >
                + Add Custom Field
              </button>
            </>
          )}

          {/* Merchandise Details */}
          {formData.type === 'merchandise' && (
            <>
              <h2 style={{ marginTop: '40px', marginBottom: '20px' }}>Merchandise Details</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>Item Name *</label>
                <input
                  type="text"
                  value={merchandiseDetails.item_name}
                  onChange={(e) => setMerchandiseDetails({ ...merchandiseDetails, item_name: e.target.value })}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Total Stock *</label>
                  <input
                    type="number"
                    value={merchandiseDetails.stock_quantity}
                    onChange={(e) => setMerchandiseDetails({ ...merchandiseDetails, stock_quantity: Number(e.target.value) })}
                    min="0"
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Purchase Limit per Participant *</label>
                  <input
                    type="number"
                    value={merchandiseDetails.purchase_limit_per_participant}
                    onChange={(e) => setMerchandiseDetails({ ...merchandiseDetails, purchase_limit_per_participant: Number(e.target.value) })}
                    min="1"
                    required
                    style={styles.input}
                  />
                </div>
              </div>

              <h3>Variants (e.g., sizes, colors) *</h3>
              {merchandiseDetails.variants.map((variant, index) => (
                <div key={index} style={styles.fieldCard}>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Variant Name *</label>
                      <input
                        type="text"
                        value={variant.variant_name}
                        onChange={(e) => updateVariant(index, 'variant_name', e.target.value)}
                        required
                        placeholder="e.g., Medium, Red, etc."
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Price (₹) *</label>
                      <input
                        type="number"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, 'price', Number(e.target.value))}
                        min="0"
                        required
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Stock *</label>
                      <input
                        type="number"
                        value={variant.stock_quantity}
                        onChange={(e) => updateVariant(index, 'stock_quantity', Number(e.target.value))}
                        min="0"
                        required
                        style={styles.input}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        style={styles.removeButton}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addVariant}
                style={styles.addButton}
              >
                + Add Variant
              </button>
            </>
          )}

          <button 
            type="submit" 
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Event (Draft)'}
          </button>
        </form>
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
    maxWidth: '1200px',
    margin: '0 auto'
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
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  fieldCard: {
    border: '1px solid #e0e0e0',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '15px',
    background: '#fafafa'
  },
  fieldHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  iconButton: {
    padding: '5px 10px',
    background: '#e0e0e0',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  removeButton: {
    padding: '8px 16px',
    background: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  addButton: {
    padding: '12px 24px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    marginTop: '10px'
  },
  submitButton: {
    marginTop: '40px',
    padding: '15px 40px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    width: '100%'
  }
};
