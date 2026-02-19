import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();

  // ===== STATE MANAGEMENT =====
  // isEditing: Toggle between view mode and edit mode
  // formData: Stores all the editable profile fields
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    contact_number: '',
    college_org_name: '',
    selected_interests: [],
    followed_clubs: []
  });
  
  // Non-editable fields (display only)
  const [nonEditableData, setNonEditableData] = useState({
    email: '',
    participant_type: ''
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userRole, setUserRole] = useState('participant');
  
  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // ===== LOAD USER DATA ON MOUNT =====
  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Fetch current user profile from backend
  const fetchUserProfile = async () => {
    try {
      // Check user role from localStorage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const role = storedUser.role;
      setUserRole(role);

      // For admin/organizer, just show localStorage data (no API call needed)
      if (role === 'admin') {
        setNonEditableData({
          email: storedUser.email || '',
          participant_type: 'N/A (Admin Account)'
        });
        setFormData({
          first_name: 'Admin',
          last_name: '',
          contact_number: '',
          college_org_name: 'IIIT Hyderabad',
          selected_interests: [],
          followed_clubs: []
        });
        setLoading(false);
        return;
      }

      if (role === 'organizer') {
        setNonEditableData({
          email: storedUser.email || '',
          participant_type: 'N/A (Organizer Account)'
        });
        setFormData({
          first_name: storedUser.organizerName || 'Organizer',
          last_name: '',
          contact_number: '',
          college_org_name: storedUser.category || '',
          selected_interests: [],
          followed_clubs: []
        });
        setLoading(false);
        return;
      }

      // For participants, fetch from API
      const { data } = await api.get('/participants/profile');
      
      // Separate editable and non-editable fields
      setFormData({
        first_name: data.data.first_name || '',
        last_name: data.data.last_name || '',
        contact_number: data.data.contact_number || '',
        college_org_name: data.data.college_org_name || '',
        selected_interests: data.data.selected_interests || [],
        followed_clubs: data.data.followed_clubs || []
      });

      setNonEditableData({
        email: data.data.email || '',
        participant_type: data.data.participant_type || ''
      });

    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
      
      // If unauthorized, redirect to login
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== HANDLE INPUT CHANGES =====
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ===== SAVE PROFILE CHANGES =====
  const handleSave = async () => {
    setError('');
    setSuccess('');

    try {
      // Send only editable fields to backend
      await api.put('/participants/profile', formData);
      
      setSuccess('Profile updated successfully!');
      setIsEditing(false);

      // Update localStorage user data
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...storedUser,
        first_name: formData.first_name,
        last_name: formData.last_name
      }));

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  // ===== CANCEL EDITING =====
  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    fetchUserProfile(); // Reload original data
  };

  // ===== CHANGE PASSWORD =====
  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      await api.put('/participants/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordSuccess('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordChange(false);

      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading your profile...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <div style={styles.header}>
        <h1 style={styles.title}>My Profile</h1>
        <button 
          onClick={() => {
            if (userRole === 'admin') navigate('/admin/dashboard');
            else if (userRole === 'organizer') navigate('/organizer/dashboard');
            else navigate('/dashboard');
          }}
          style={styles.backButton}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && <div style={styles.successBox}>{success}</div>}
      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.card}>
        
        {/* SECTION 1: Non-Editable Fields (Per Assignment Section 9.6) */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Account Information</h2>
          <p style={styles.helperText}>These fields cannot be modified</p>

          <div style={styles.fieldRow}>
            <label style={styles.label}>Email Address</label>
            <input 
              value={nonEditableData.email}
              disabled
              style={{ ...styles.input, ...styles.inputDisabled }}
            />
          </div>

          <div style={styles.fieldRow}>
            <label style={styles.label}>Participant Type</label>
            <input 
              value={nonEditableData.participant_type === 'iiit' ? 'IIIT Student' : 'Non-IIIT'}
              disabled
              style={{ ...styles.input, ...styles.inputDisabled }}
            />
          </div>
        </div>

        {/* SECTION 2: Editable Fields */}
        <div style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={styles.sectionTitle}>Personal Information</h2>
            {!isEditing && userRole === 'participant' && (
              <button 
                onClick={() => setIsEditing(true)}
                style={styles.editButton}
              >
                ✏️ Edit
              </button>
            )}
          </div>

          <div style={styles.fieldRow}>
            <label style={styles.label}>First Name</label>
            <input 
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              disabled={!isEditing}
              style={{
                ...styles.input,
                ...(isEditing ? {} : styles.inputDisabled)
              }}
            />
          </div>

          <div style={styles.fieldRow}>
            <label style={styles.label}>Last Name</label>
            <input 
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              disabled={!isEditing}
              style={{
                ...styles.input,
                ...(isEditing ? {} : styles.inputDisabled)
              }}
            />
          </div>

          <div style={styles.fieldRow}>
            <label style={styles.label}>Contact Number</label>
            <input 
              name="contact_number"
              value={formData.contact_number}
              onChange={handleChange}
              disabled={!isEditing}
              style={{
                ...styles.input,
                ...(isEditing ? {} : styles.inputDisabled)
              }}
            />
          </div>

          <div style={styles.fieldRow}>
            <label style={styles.label}>College/Organization Name</label>
            <input 
              name="college_org_name"
              value={formData.college_org_name}
              onChange={handleChange}
              disabled={!isEditing}
              style={{
                ...styles.input,
                ...(isEditing ? {} : styles.inputDisabled)
              }}
            />
          </div>

          {/* Action Buttons - Only show when editing */}
          {isEditing && (
            <div style={styles.buttonGroup}>
              <button 
                onClick={handleSave}
                style={styles.saveButton}
              >
                💾 Save Changes
              </button>
              <button 
                onClick={handleCancel}
                style={styles.cancelButton}
              >
                ❌ Cancel
              </button>
            </div>
          )}
        </div>

        {/* SECTION 3: Security Settings (Password Change - Optional for now) */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Security Settings</h2>
          
          {passwordSuccess && <div style={styles.successBox}>{passwordSuccess}</div>}
          {passwordError && <div style={styles.errorBox}>{passwordError}</div>}
          
          {!showPasswordChange ? (
            <button 
              style={styles.passwordButton}
              onClick={() => setShowPasswordChange(true)}
            >
              🔒 Change Password
            </button>
          ) : (
            <div style={{marginTop: '15px'}}>
              <div style={styles.formRow}>
                <label style={styles.label}>Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  style={styles.input}
                  placeholder="Enter current password"
                />
              </div>
              
              <div style={styles.formRow}>
                <label style={styles.label}>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  style={styles.input}
                  placeholder="Minimum 6 characters"
                />
              </div>
              
              <div style={styles.formRow}>
                <label style={styles.label}>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  style={styles.input}
                  placeholder="Re-enter new password"
                />
              </div>
              
              <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                <button onClick={handlePasswordChange} style={styles.saveButton}>
                  Save New Password
                </button>
                <button 
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                  }} 
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple styles
const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
    padding: '20px'
  },
  header: {
    maxWidth: '800px',
    margin: '0 auto 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: '28px',
    color: '#333'
  },
  backButton: {
    padding: '10px 20px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer'
  },
  card: {
    maxWidth: '800px',
    margin: '0 auto',
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '30px'
  },
  section: {
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #eee'
  },
  sectionTitle: {
    fontSize: '18px',
    color: '#333',
    marginBottom: '10px'
  },
  helperText: {
    fontSize: '13px',
    color: '#999',
    marginBottom: '15px'
  },
  fieldRow: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    color: '#555',
    marginBottom: '5px'
  },
  input: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '3px',
    boxSizing: 'border-box'
  },
  inputDisabled: {
    background: '#f5f5f5',
    color: '#999'
  },
  editButton: {
    padding: '8px 15px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px'
  },
  saveButton: {
    flex: 1,
    padding: '12px',
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    background: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  passwordButton: {
    padding: '10px 20px',
    background: '#999',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'not-allowed'
  },
  successBox: {
    maxWidth: '800px',
    margin: '0 auto 20px',
    background: '#d4edda',
    color: '#155724',
    padding: '12px',
    borderRadius: '3px',
    border: '1px solid #c3e6cb'
  },
  errorBox: {
    maxWidth: '800px',
    margin: '0 auto 20px',
    background: '#f8d7da',
    color: '#721c24',
    padding: '12px',
    borderRadius: '3px',
    border: '1px solid #f5c6cb'
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: '#666'
  }
};
