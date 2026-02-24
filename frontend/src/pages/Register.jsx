import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  
  //state for all the fields backend needs
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    contact_number: '',
    participant_type: 'iiit', // Default value
    college_org_name: 'IIIT Hyderabad', // Default for IIIT students
    year_of_study: '2026'
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  //handle input change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    try {
      //send to backend
      const response = await api.post('/participants/register', formData);
      
      console.log("Registration Success:", response.data);
      setSuccess(true);
      
      //wait then redirect
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f0f0', padding: '50px 20px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', background: 'white', padding: '30px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>Create an Account</h2>
        
        {error && <p style={{ background: '#ffebee', color: '#c62828', padding: '10px', marginBottom: '15px', border: '1px solid #ef5350', borderRadius: '3px' }}>{error}</p>}
        {success && <p style={{ background: '#e8f5e9', color: '#2e7d32', padding: '10px', marginBottom: '15px', border: '1px solid #81c784', borderRadius: '3px' }}>Success! Redirecting to login...</p>}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Name Fields */}
          <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                name="first_name" placeholder="First Name" required 
                onChange={handleChange} style={{ padding: '10px', flex: 1, border: '1px solid #ccc', borderRadius: '3px' }} 
              />
              <input 
                name="last_name" placeholder="Last Name" required 
                onChange={handleChange} style={{ padding: '10px', flex: 1, border: '1px solid #ccc', borderRadius: '3px' }} 
              />
          </div>

          {/* Email & Password */}
          <input 
            type="email" name="email" placeholder="Email" required 
            onChange={handleChange} style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '3px' }} 
          />
          <input 
            type="password" name="password" placeholder="Password (min 6 characters)" required 
            minLength="6"
            onChange={handleChange} style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '3px' }} 
          />

          {/* Contact & Year */}
          <input 
            name="contact_number" placeholder="Phone Number" required 
            onChange={handleChange} style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '3px' }} 
          />
          <input 
            type="number" name="year_of_study" placeholder="Graduation Year" required 
            onChange={handleChange} style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '3px' }} 
          />

          {/* Dropdown for Type */}
          <select 
              name="participant_type" 
              value={formData.participant_type} 
              onChange={handleChange}
              style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '3px', background: 'white' }}
          >
              <option value="iiit">IIIT Student</option>
              <option value="non-iiit">Non-IIIT Student</option>
              <option value="faculty">Faculty</option>
          </select>

          {/* Dynamic College Name (Only show if NOT IIIT) */}
          {formData.participant_type === 'non-iiit' && (
              <input 
                name="college_org_name" 
                placeholder="College Name" 
                required 
                onChange={handleChange} 
                style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '3px' }} 
              />
          )}

          <button type="submit" style={{ padding: '12px', marginTop: '10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '16px' }}>
            Register
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
          Already have an account? <Link to="/login" style={{ color: '#2196F3', textDecoration: 'underline' }}>Login here</Link>
        </p>
      </div>
    </div>
  );
}