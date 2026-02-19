import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate, useParams } from 'react-router-dom';
import TicketModal from '../components/TicketModal';
import DiscussionForum from '../components/DiscussionForum';

export default function EventDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [registrationInfo, setRegistrationInfo] = useState(null);
  
  // Payment proof upload state for merchandise
  const [paymentProof, setPaymentProof] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  
  // Form state for custom fields
  const [formAnswers, setFormAnswers] = useState({});
  
  // Merchandise state - UPDATED to support multiple variants
  const [variantOrders, setVariantOrders] = useState([]);
  const [currentVariant, setCurrentVariant] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState(1);

  // TIER C: Feedback state
  const [feedbackData, setFeedbackData] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [ratingFilter, setRatingFilter] = useState('all');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Get user role for navigation
  const getUserDashboard = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return '/login';
    const user = JSON.parse(userStr);
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'organizer') return '/organizer/dashboard';
    return '/dashboard';
  };

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const { data } = await api.get(`/events/${id}`);
      
      if (!data) {
        setError('Event not found');
        return;
      }
      
      setEvent(data);
      
      // Check if user is already registered and get registration info
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const currentUser = JSON.parse(userStr);
        const registration = data.registered_participants.find(
          rp => rp.participant && rp.participant.toString() === currentUser.id
        );
        
        if (registration) {
          setIsAlreadyRegistered(true);
          setRegistrationInfo(registration);
        }
      }
      
      // Initialize form answers with empty values
      if (data.type === 'normal' && data.custom_form_fields) {
        const initialAnswers = {};
        data.custom_form_fields.forEach(field => {
          initialAnswers[field.field_name] = '';
        });
        setFormAnswers(initialAnswers);
      }
      
    } catch (err) {
      console.error("Error fetching event details:", err);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  // TIER C: Fetch feedback data
  const fetchFeedback = async () => {
    try {
      const { data } = await api.get(`/events/${id}/feedback`, {
        params: ratingFilter !== 'all' ? { rating_filter: ratingFilter } : {}
      });
      setFeedbackData(data.data);
    } catch (err) {
      console.error("Error fetching feedback:", err);
    }
  };

  // TIER C: Check if user can submit feedback
  const checkFeedbackStatus = async () => {
    try {
      const { data } = await api.get(`/events/${id}/feedback/check`);
      setFeedbackStatus(data.data);
    } catch (err) {
      console.error("Error checking feedback status:", err);
    }
  };

  // TIER C: Submit feedback
  const handleSubmitFeedback = async () => {
    if (feedbackRating === 0) {
      alert('Please select a rating');
      return;
    }
    if (!feedbackComment.trim()) {
      alert('Please provide a comment');
      return;
    }

    setSubmittingFeedback(true);
    try {
      await api.post(`/events/${id}/feedback`, {
        rating: feedbackRating,
        comment: feedbackComment
      });
      alert('✅ Feedback submitted successfully!');
      setFeedbackRating(0);
      setFeedbackComment('');
      setShowFeedbackForm(false);
      // Refresh feedback and status
      await fetchFeedback();
      await checkFeedbackStatus();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // TIER C: Export feedback (organizers only)
  const handleExportFeedback = async () => {
    try {
      const response = await api.get(`/events/${id}/feedback/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `feedback-${event.name}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to export feedback');
    }
  };

  // Fetch feedback on mount and when filter changes
  useEffect(() => {
    if (id) {
      fetchFeedback();
    }
  }, [id, ratingFilter]);

  // Check feedback status when event loads
  useEffect(() => {
    if (event && localStorage.getItem('user')) {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user.role === 'participant') {
        checkFeedbackStatus();
      }
    }
  }, [event]);

  const handleFormChange = (fieldName, value) => {
    setFormAnswers(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // NEW: Add variant to cart
  const addVariantToCart = () => {
    if (!currentVariant || currentVariant.trim() === '') {
      alert('⚠️ Please select a variant');
      return;
    }

    const qty = parseInt(currentQuantity);
    if (qty < 1) {
      alert('⚠️ Quantity must be at least 1');
      return;
    }

    // Check if variant already in cart
    const existingIndex = variantOrders.findIndex(v => v.variant_name === currentVariant);
    
    if (existingIndex >= 0) {
      // Update existing quantity
      const updated = [...variantOrders];
      updated[existingIndex].quantity += qty;
      setVariantOrders(updated);
    } else {
      // Add new variant
      setVariantOrders([...variantOrders, {
        variant_name: currentVariant,
        quantity: qty
      }]);
    }

    // Reset selection
    setCurrentVariant('');
    setCurrentQuantity(1);
  };

  // NEW: Remove variant from cart
  const removeVariantFromCart = (variantName) => {
    setVariantOrders(variantOrders.filter(v => v.variant_name !== variantName));
  };

  // NEW: Calculate total price
  const calculateTotalPrice = () => {
    if (!event || event.type !== 'merchandise') return 0;
    
    return variantOrders.reduce((total, order) => {
      const variant = event.merchandise_details.variants.find(
        v => v.variant_name === order.variant_name
      );
      return total + (variant?.price || 0) * order.quantity;
    }, 0);
  };

  const handleRegister = async () => {
    try {
      if (event.type === 'normal') {
        // Convert formAnswers object to array format
        const form_answers = Object.entries(formAnswers).map(([field_name, answer]) => ({
          field_name,
          answer
        }));
        
        await api.post(`/events/${id}/register`, { form_answers });
        alert('Registration successful! 🎉');
        setShowRegisterForm(false);
        // Refresh event details to show registration info
        await fetchEventDetails();
        
      } else if (event.type === 'merchandise') {
        if (variantOrders.length === 0) {
          alert('⚠️ Please add at least one variant to your cart before purchasing.');
          return;
        }
        
        await api.post(`/events/${id}/register`, {
          variant_orders: variantOrders
        });
        alert('🛒 Order placed! Please upload payment proof below to complete your purchase.');
        setShowRegisterForm(false);
        setVariantOrders([]); // Clear cart
        // Refresh event details to show registration info and payment upload section
        await fetchEventDetails();
      }
      
    } catch (err) {
      console.error('Registration error:', err);
      alert(err.response?.data?.message || 'Registration failed');
    }
  };

  const handlePaymentProofUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Convert image to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result;
      setPaymentProof(base64Image);
      
      // Auto-upload after selection
      setUploadingProof(true);
      try {
        await api.post(`/events/${id}/upload-payment-proof`, {
          payment_proof: base64Image
        });
        
        alert('✅ Payment proof uploaded! Waiting for organizer approval.');
        await fetchEventDetails(); // Refresh to show updated status
      } catch (error) {
        console.error('Error uploading payment proof:', error);
        alert(error.response?.data?.message || 'Failed to upload payment proof');
      } finally {
        setUploadingProof(false);
      }
    };
    
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Loading event details...</div>;
  }

  if (error || !event) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <p>{error || 'Event not found'}</p>
        <button onClick={() => navigate('/events')} style={styles.button}>
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button 
          onClick={() => navigate('/events')} 
          style={styles.backButton}
          aria-label="Navigate back to events list"
        >
          ← Back to Events
        </button>
      </div>

      {/* Event Info Card */}
      <div style={styles.card}>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>{event.name}</h1>
          <span style={event.type === 'normal' ? styles.tagNormal : styles.tagMerch}>
            {event.type.toUpperCase()}
          </span>
        </div>

        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <strong>🎪 Organized by:</strong> {event.organizer_id?.organizer_details?.name || event.organizer_id?.email || 'Unknown'}
          </div>
          <div style={styles.infoItem}>
            <strong>📅 Start Date:</strong> {new Date(event.start_date).toLocaleString()}
          </div>
          <div style={styles.infoItem}>
            <strong>📅 End Date:</strong> {new Date(event.end_date).toLocaleString()}
          </div>
          <div style={styles.infoItem}>
            <strong>⏰ Registration Deadline:</strong> {new Date(event.reg_deadline).toLocaleString()}
          </div>
          <div style={styles.infoItem}>
            <strong>💰 Registration Fee:</strong> {event.reg_fee === 0 ? 'Free' : `₹${event.reg_fee}`}
          </div>
          <div style={styles.infoItem}>
            <strong>👥 Eligibility:</strong> {event.eligibility}
          </div>
          {event.type === 'normal' && (
            <div style={styles.infoItem}>
              <strong>🎯 Spots Available:</strong> {event.reg_limit && event.reg_limit > 0 
                ? `${event.reg_limit - event.registered_participants.length} / ${event.reg_limit}`
                : 'Unlimited'
              }
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h3>📝 Description</h3>
          <p>{event.description}</p>
        </div>

        {event.event_tags && event.event_tags.length > 0 && (
          <div style={styles.section}>
            <h3>🏷️ Tags</h3>
            <div style={styles.tagContainer}>
              {event.event_tags.map((tag, idx) => (
                <span key={idx} style={styles.tag}>{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Register Button or Already Registered Message */}
        {(() => {
          const now = new Date();
          const deadline = new Date(event.reg_deadline);
          const endDate = new Date(event.end_date);
          const isDeadlinePassed = now > deadline;
          const isEventEnded = now > endDate;
          const isRegistrationFull = event.type === 'normal' && 
                                     event.reg_limit && 
                                     event.reg_limit > 0 && 
                                     event.registered_participants.length >= event.reg_limit;
          
          // Check if merchandise is out of stock
          // If variants exist, check if any variant has stock
          // Otherwise check overall stock_quantity
          const isOutOfStock = event.type === 'merchandise' && (
            event.merchandise_details?.variants?.length > 0
              ? event.merchandise_details.variants.every(v => v.stock_quantity <= 0)
              : event.merchandise_details?.stock_quantity <= 0
          );

          if (isAlreadyRegistered) {
            // Extract team name from form values
            const teamNameField = registrationInfo?.form_values?.find(
              fv => fv.field_name.toLowerCase().includes('team')
            );
            const teamName = teamNameField?.answer;
            
            return (
              <div style={styles.registrationCard}>
                <h3 style={{ margin: '0 0 20px 0', color: '#2e7d32', fontSize: '20px' }}>
                  ✅ You are Registered for this Event!
                </h3>
                
                <div style={styles.registrationDetails}>
                  <div style={styles.registrationRow}>
                    <span style={styles.registrationLabel}>🎫 Ticket ID:</span>
                    {event.type === 'merchandise' && registrationInfo?.payment_status !== 'approved' ? (
                      <span style={styles.ticketIdDisabled}>
                        {event._id.slice(-8).toUpperCase()} (Payment approval required)
                      </span>
                    ) : (
                      <span 
                        style={styles.ticketIdValue}
                        onClick={() => setShowTicketModal(true)}
                        title="Click to view full ticket"
                      >
                        {event._id.slice(-8).toUpperCase()} (Click to view)
                      </span>
                    )}
                  </div>
                  
                  <div style={styles.registrationRow}>
                    <span style={styles.registrationLabel}>📅 Registered On:</span>
                    <span>{new Date(registrationInfo?.registered_at).toLocaleString()}</span>
                  </div>
                  
                  {event.type === 'normal' && teamName && (
                    <div style={styles.registrationRow}>
                      <span style={styles.registrationLabel}>👥 Team Name:</span>
                      <span style={{ fontWeight: 'bold', color: '#2196F3' }}>{teamName}</span>
                    </div>
                  )}
                  
                  {event.type === 'merchandise' && (registrationInfo?.variant_orders?.length > 0 || registrationInfo?.variant_name) && (
                    <>
                      <div style={styles.registrationRow}>
                        <span style={styles.registrationLabel}>📦 Order Details:</span>
                      </div>
                      {(registrationInfo.variant_orders && registrationInfo.variant_orders.length > 0) ? (
                        <div style={{ marginLeft: '20px', marginBottom: '10px' }}>
                          {registrationInfo.variant_orders.map((order, idx) => {
                            const variant = event.merchandise_details?.variants?.find(
                              v => v.variant_name === order.variant_name
                            );
                            return (
                              <div key={idx} style={{ padding: '8px', background: '#f5f5f5', marginBottom: '5px', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontWeight: 'bold' }}>{order.variant_name}</span>
                                  <span>Qty: {order.quantity} × ₹{variant?.price || 0} = ₹{(variant?.price || 0) * order.quantity}</span>
                                </div>
                              </div>
                            );
                          })}
                          <div style={{ marginTop: '10px', padding: '8px', background: '#e8f5e9', borderRadius: '4px', fontWeight: 'bold' }}>
                            Total: ₹{registrationInfo.variant_orders.reduce((sum, order) => {
                              const variant = event.merchandise_details?.variants?.find(v => v.variant_name === order.variant_name);
                              return sum + ((variant?.price || 0) * order.quantity);
                            }, 0)}
                          </div>
                        </div>
                      ) : (
                        // Legacy single variant display
                        <>
                          <div style={{ marginLeft: '20px', padding: '8px', background: '#f5f5f5', marginBottom: '5px', borderRadius: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 'bold' }}>{registrationInfo.variant_name}</span>
                              <span>Qty: {registrationInfo.quantity}</span>
                            </div>
                          </div>
                        </>
                      )}
                      <div style={styles.registrationRow}>
                        <span style={styles.registrationLabel}>💳 Payment Status:</span>
                        <span style={{
                          fontWeight: 'bold',
                          color: registrationInfo.payment_status === 'approved' ? '#2e7d32' : 
                                 registrationInfo.payment_status === 'pending' ? '#ff9800' :
                                 registrationInfo.payment_status === 'rejected' ? '#d32f2f' : '#666'
                        }}>
                          {registrationInfo.payment_status === 'approved' ? '✓ Approved' : 
                           registrationInfo.payment_status === 'pending' ? '⏳ Pending Approval' :
                           registrationInfo.payment_status === 'rejected' ? '✕ Rejected' : 'N/A'}
                        </span>
                      </div>
                      
                      {/* Payment Proof Upload */}
                      {(registrationInfo.payment_status === 'pending' || registrationInfo.payment_status === 'rejected') && (
                        <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
                          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#856404' }}>
                            {registrationInfo.payment_status === 'rejected' 
                              ? '❌ Your payment proof was rejected. Please upload a new one.'
                              : '📸 Upload payment proof for organizer approval'}
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePaymentProofUpload}
                            style={{ display: 'block', marginBottom: '10px' }}
                            disabled={uploadingProof}
                          />
                          {uploadingProof && <p style={{ fontSize: '13px', color: '#666' }}>Uploading...</p>}
                          {registrationInfo.payment_proof && (
                            <p style={{ fontSize: '13px', color: '#155724', margin: '10px 0 0 0' }}>
                              ✓ Proof uploaded, waiting for approval
                            </p>
                          )}
                        </div>
                      )}
                      
                      {registrationInfo.payment_status === 'approved' && registrationInfo.qr_code_generated && (
                        <div style={{ marginTop: '15px', padding: '12px', background: '#d4edda', borderRadius: '6px', border: '1px solid #c3e6cb' }}>
                          <p style={{ margin: 0, fontSize: '14px', color: '#155724' }}>
                            ✅ Payment approved! Your QR ticket is ready.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {event.type === 'normal' && (
                    <div style={styles.registrationRow}>
                      <span style={styles.registrationLabel}>💳 Payment Status:</span>
                      <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>✓ Paid</span>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => navigate(getUserDashboard())}
                  style={styles.dashboardButton}
                  aria-label="View registration details in dashboard"
                >
                  View in My Dashboard
                </button>
              </div>
            );
          }

          if (isEventEnded) {
            return (
              <div style={styles.blockedMessage}>
                🏁 Event has ended
              </div>
            );
          }

          if (isDeadlinePassed) {
            return (
              <div style={styles.blockedMessage}>
                ⏰ Registration deadline has passed
              </div>
            );
          }

          if (isRegistrationFull) {
            return (
              <div style={styles.blockedMessage}>
                🚫 Registration limit reached - Event is full
              </div>
            );
          }

          if (isOutOfStock) {
            return (
              <div style={styles.blockedMessage}>
                📦 Out of stock - No items available
              </div>
            );
          }

          if (!showRegisterForm) {
            return (
              <button 
                onClick={() => setShowRegisterForm(true)}
                style={styles.registerButton}
              >
                Register for this Event
              </button>
            );
          }

          return null;
        })()}
      </div>

      {/* Registration Form */}
      {showRegisterForm && (
        <div style={styles.card}>
          <h2>Registration Form</h2>

          {event.type === 'normal' && event.custom_form_fields && (
            <div>
              {event.custom_form_fields.map((field, idx) => (
                <div key={idx} style={styles.formGroup}>
                  <label style={styles.label}>
                    {field.field_name} {field.is_required && <span style={{ color: 'red' }}>*</span>}
                  </label>

                  {field.field_type === 'text' && (
                    <input
                      type="text"
                      value={formAnswers[field.field_name] || ''}
                      onChange={(e) => handleFormChange(field.field_name, e.target.value)}
                      required={field.is_required}
                      style={styles.input}
                    />
                  )}

                  {field.field_type === 'number' && (
                    <input
                      type="number"
                      value={formAnswers[field.field_name] || ''}
                      onChange={(e) => handleFormChange(field.field_name, e.target.value)}
                      required={field.is_required}
                      style={styles.input}
                    />
                  )}

                  {field.field_type === 'email' && (
                    <input
                      type="email"
                      value={formAnswers[field.field_name] || ''}
                      onChange={(e) => handleFormChange(field.field_name, e.target.value)}
                      required={field.is_required}
                      style={styles.input}
                    />
                  )}

                  {field.field_type === 'dropdown' && field.options && (
                    <select
                      value={formAnswers[field.field_name] || ''}
                      onChange={(e) => handleFormChange(field.field_name, e.target.value)}
                      required={field.is_required}
                      style={styles.input}
                    >
                      <option value="">Select an option</option>
                      {field.options.map((option, optIdx) => (
                        <option key={optIdx} value={option}>{option}</option>
                      ))}
                    </select>
                  )}

                  {field.field_type === 'checkbox' && field.options && (
                    <div>
                      {field.options.map((option, optIdx) => (
                        <label key={optIdx} style={{ display: 'block', marginBottom: '5px' }}>
                          <input
                            type="checkbox"
                            value={option}
                            onChange={(e) => {
                              const currentValues = formAnswers[field.field_name] || '';
                              const valuesArray = currentValues.split(',').filter(v => v);
                              
                              if (e.target.checked) {
                                valuesArray.push(option);
                              } else {
                                const index = valuesArray.indexOf(option);
                                if (index > -1) valuesArray.splice(index, 1);
                              }
                              
                              handleFormChange(field.field_name, valuesArray.join(','));
                            }}
                          />
                          {' '}{option}
                        </label>
                      ))}
                    </div>
                  )}

                  {field.field_type === 'file upload' && (
                    <input
                      type="file"
                      onChange={(e) => handleFormChange(field.field_name, e.target.files[0]?.name || '')}
                      required={field.is_required}
                      style={styles.input}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {event.type === 'merchandise' && event.merchandise_details && (
            <div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Item: {event.merchandise_details.item_name}</label>
              </div>

              {event.merchandise_details.variants && event.merchandise_details.variants.length > 0 && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Select Variant *</label>
                    <select
                      value={currentVariant}
                      onChange={(e) => setCurrentVariant(e.target.value)}
                      style={styles.input}
                    >
                      <option value="">Choose variant</option>
                      {event.merchandise_details.variants.map((variant, idx) => (
                        <option key={idx} value={variant.variant_name}>
                          {variant.variant_name} - ₹{variant.price} (Stock: {variant.stock_quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Quantity</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        max={event.merchandise_details.purchase_limit_per_participant || 10}
                        value={currentQuantity}
                        onChange={(e) => setCurrentQuantity(e.target.value)}
                        style={{...styles.input, flex: 1}}
                      />
                      <button 
                        type="button"
                        onClick={addVariantToCart}
                        style={styles.addToCartButton}
                      >
                        ➕ Add to Cart
                      </button>
                    </div>
                  </div>

                  {/* Shopping Cart Display */}
                  {variantOrders.length > 0 && (
                    <div style={styles.cartContainer}>
                      <h4 style={styles.cartTitle}>🛒 Your Cart ({variantOrders.length} items)</h4>
                      {variantOrders.map((order, idx) => {
                        const variant = event.merchandise_details.variants.find(
                          v => v.variant_name === order.variant_name
                        );
                        return (
                          <div key={idx} style={styles.cartItem}>
                            <div style={styles.cartItemInfo}>
                              <strong>{order.variant_name}</strong>
                              <span>Qty: {order.quantity} × ₹{variant?.price} = ₹{(variant?.price || 0) * order.quantity}</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => removeVariantFromCart(order.variant_name)}
                              style={styles.removeButton}
                            >
                              🗑️ Remove
                            </button>
                          </div>
                        );
                      })}
                      <div style={styles.cartTotal}>
                        <strong>Total: ₹{calculateTotalPrice()}</strong>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={handleRegister} style={styles.submitButton}>
              {event.type === 'merchandise' ? 'Purchase' : 'Submit Registration'}
            </button>
            <button 
              onClick={() => setShowRegisterForm(false)} 
              style={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Ticket Modal */}
      {showTicketModal && (
        <TicketModal 
          eventId={event._id}
          onClose={() => setShowTicketModal(false)}
        />
      )}

      {/* TIER B: Discussion Forum - Show for registered participants and organizers */}
      {(isAlreadyRegistered || (event && event.organizer_id && event.organizer_id._id === JSON.parse(localStorage.getItem('user') || '{}').id)) && (
        <DiscussionForum eventId={event._id} />
      )}

      {/* TIER C: Anonymous Feedback System */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>⭐ Event Feedback</h2>
          {/* Export button for organizers */}
          {event && event.organizer_id && event.organizer_id._id === JSON.parse(localStorage.getItem('user') || '{}').id && feedbackData && feedbackData.statistics.total_feedback > 0 && (
            <button onClick={handleExportFeedback} style={{...styles.submitButton, background: '#4caf50'}}>
              📥 Export Feedback CSV
            </button>
          )}
        </div>

        {/* Feedback Statistics */}
        {feedbackData && feedbackData.statistics.total_feedback > 0 && (
          <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>📊 Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{ padding: '15px', background: 'white', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff9800' }}>
                  {feedbackData.statistics.average_rating}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>Average Rating</div>
              </div>
              <div style={{ padding: '15px', background: 'white', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2196F3' }}>
                  {feedbackData.statistics.total_feedback}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>Total Reviews</div>
              </div>
            </div>

            {/* Rating Distribution */}
            <div style={{ marginTop: '20px' }}>
              <h4>Rating Distribution</h4>
              {[5, 4, 3, 2, 1].map(rating => {
                const dist = feedbackData.statistics.rating_distribution[rating];
                return (
                  <div key={rating} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ width: '60px' }}>{rating} ⭐</span>
                    <div style={{ flex: 1, height: '20px', background: '#e0e0e0', borderRadius: '10px', overflow: 'hidden', marginRight: '10px' }}>
                      <div style={{ height: '100%', background: '#ff9800', width: `${dist.percentage}%` }}></div>
                    </div>
                    <span style={{ width: '80px', textAlign: 'right' }}>{dist.count} ({dist.percentage}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading state for feedback submission */}
        {!feedbackStatus && localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')).role === 'participant' && (
          <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '8px', border: '2px dashed #ccc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#666' }}>
              <div style={{ fontSize: '18px' }}>⏳</div>
              <div>Loading feedback options...</div>
            </div>
          </div>
        )}

        {/* Feedback Submission Form */}
        {feedbackStatus && feedbackStatus.can_submit && (
          <div style={{ marginBottom: '30px', padding: '20px', background: '#e8f5e9', borderRadius: '8px', border: '2px solid #4caf50' }}>
            {!showFeedbackForm ? (
              <button 
                onClick={() => setShowFeedbackForm(true)} 
                style={{...styles.submitButton, background: '#4caf50'}}
              >
                ✍️ Submit Your Feedback
              </button>
            ) : (
              <div>
                <h3 style={{ marginTop: 0 }}>Submit Anonymous Feedback</h3>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                  Your feedback is completely anonymous and helps improve future events
                </p>
                
                {/* Star Rating */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Rating *</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        style={{
                          fontSize: '32px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: star <= feedbackRating ? '#ff9800' : '#e0e0e0',
                          transition: 'all 0.2s ease',
                          transform: 'scale(1)',
                          filter: star <= feedbackRating ? 'drop-shadow(0 0 3px rgba(255, 152, 0, 0.5))' : 'none'
                        }}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                  {feedbackRating > 0 && (
                    <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: '600', color: '#ff9800' }}>
                      {feedbackRating === 5 && '⭐⭐⭐⭐⭐ Excellent!'}
                      {feedbackRating === 4 && '⭐⭐⭐⭐ Very Good!'}
                      {feedbackRating === 3 && '⭐⭐⭐ Good'}
                      {feedbackRating === 2 && '⭐⭐ Fair'}
                      {feedbackRating === 1 && '⭐ Poor'}
                    </div>
                  )}
                </div>

                {/* Comment */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                    Your Feedback *
                  </label>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Share your experience with this event..."
                    maxLength={1000}
                    rows={5}
                    style={{...styles.input, resize: 'vertical'}}
                  />
                  <div style={{ fontSize: '12px', color: '#666', textAlign: 'right' }}>
                    {feedbackComment.length}/1000 characters
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={handleSubmitFeedback}
                    disabled={submittingFeedback}
                    style={{
                      ...styles.submitButton,
                      background: '#4caf50',
                      opacity: submittingFeedback ? 0.6 : 1
                    }}
                  >
                    {submittingFeedback ? '⏳ Submitting...' : '📤 Submit Feedback'}
                  </button>
                  <button 
                    onClick={() => setShowFeedbackForm(false)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback submission status messages */}
        {feedbackStatus && !feedbackStatus.can_submit && feedbackStatus.is_registered && (
          <div style={{ marginBottom: '20px', padding: '15px', background: '#fff3e0', borderRadius: '6px' }}>
            {feedbackStatus.has_submitted && (
              <p style={{ margin: 0, color: '#2e7d32' }}>
                ✅ You have already submitted feedback for this event
              </p>
            )}
          </div>
        )}

        {/* Filter */}
        {feedbackData && feedbackData.feedback.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Filter by Rating:</label>
            <select 
              value={ratingFilter} 
              onChange={(e) => setRatingFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        )}

        {/* Feedback List */}
        {feedbackData && feedbackData.feedback.length > 0 ? (
          <div>
            <h3>{feedbackData.feedback.length} Review{feedbackData.feedback.length !== 1 ? 's' : ''}</h3>
            {feedbackData.feedback.map((fb, idx) => (
              <div key={idx} style={{ 
                padding: '20px', 
                marginBottom: '15px', 
                border: '1px solid #e0e0e0', 
                borderRadius: '8px',
                background: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <span key={star} style={{ 
                        fontSize: '20px', 
                        color: star <= fb.rating ? '#ff9800' : '#e0e0e0' 
                      }}>
                        ⭐
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: '14px', color: '#666' }}>
                    {new Date(fb.submitted_at).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ margin: 0, lineHeight: '1.6', color: '#333' }}>
                  {fb.comment}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#666', padding: '40px 0' }}>
            No feedback yet. Be the first to share your experience!
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    minHeight: '100vh',
    background: '#f5f5f5'
  },
  header: {
    marginBottom: '20px'
  },
  backButton: {
    padding: '8px 16px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer'
  },
  card: {
    background: 'white',
    padding: '30px',
    border: '1px solid #ddd',
    marginBottom: '20px'
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  title: {
    margin: 0,
    fontSize: '32px'
  },
  tagNormal: {
    padding: '6px 12px',
    background: '#e3f2fd',
    borderRadius: '3px',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  tagMerch: {
    padding: '6px 12px',
    background: '#fff3e0',
    borderRadius: '3px',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  infoItem: {
    padding: '10px',
    background: '#f9f9f9',
    border: '1px solid #eee',
    borderRadius: '3px'
  },
  section: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #eee'
  },
  tagContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  tag: {
    padding: '4px 10px',
    background: '#e3f2fd',
    borderRadius: '3px',
    fontSize: '14px'
  },
  registerButton: {
    marginTop: '30px',
    padding: '12px 24px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  alreadyRegistered: {
    marginTop: '30px',
    padding: '12px 24px',
    background: '#e8f5e9',
    color: '#2e7d32',
    border: '2px solid #4CAF50',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  registrationCard: {
    marginTop: '30px',
    padding: '25px',
    background: '#e8f5e9',
    border: '2px solid #4CAF50',
    borderRadius: '8px'
  },
  registrationDetails: {
    background: 'white',
    padding: '20px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  registrationRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0',
    alignItems: 'center'
  },
  registrationLabel: {
    fontWeight: 'bold',
    color: '#555',
    fontSize: '15px'
  },
  ticketIdValue: {
    color: '#2196F3',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontWeight: 'bold',
    fontSize: '16px',
    fontFamily: 'monospace'
  },
  ticketIdDisabled: {
    color: '#999',
    cursor: 'not-allowed',
    fontWeight: 'bold',
    fontSize: '16px',
    fontFamily: 'monospace',
    fontStyle: 'italic'
  },
  dashboardButton: {
    width: '100%',
    padding: '12px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  blockedMessage: {
    marginTop: '30px',
    padding: '12px 24px',
    background: '#ffebee',
    color: '#c62828',
    border: '2px solid #ef5350',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  formGroup: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold'
  },
  input: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '3px',
    boxSizing: 'border-box'
  },
  submitButton: {
    padding: '10px 20px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  cancelButton: {
    padding: '10px 20px',
    background: '#999',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  button: {
    padding: '10px 20px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer'
  },
  addToCartButton: {
    padding: '8px 16px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  },
  cartContainer: {
    marginTop: '20px',
    padding: '15px',
    background: '#f5f5f5',
    border: '2px solid #2196F3',
    borderRadius: '6px'
  },
  cartTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    color: '#2196F3'
  },
  cartItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginBottom: '10px'
  },
  cartItemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  removeButton: {
    padding: '6px 12px',
    background: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  cartTotal: {
    marginTop: '10px',
    padding: '12px',
    background: '#e3f2fd',
    borderRadius: '4px',
    textAlign: 'right',
    fontSize: '18px',
    color: '#1976d2'
  }
};
