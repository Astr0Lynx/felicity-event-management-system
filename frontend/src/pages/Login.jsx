import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  
  // 1. STATE: Store form inputs and UI state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('participant'); // Default to participant
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 2. LOGIC: Handle login for all three roles (Participant, Organizer, Admin)
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent page reload
    setError(''); // Clear previous errors
    setLoading(true); // Show loading state

    try {
        // Determine which API endpoint to call based on selected role
        let endpoint = '';
        
        if (role === 'participant') {
            endpoint = '/participants/login';
        } else if (role === 'organizer') {
            endpoint = '/organizer/login';
        } else if (role === 'admin') {
            endpoint = '/admin/login';
        }

        // Send login request to backend
        const response = await api.post(endpoint, {
            email,
            password
        });

        console.log("Login Success:", response.data);

        // Save authentication token (used for protected routes)
        localStorage.setItem('token', response.data.token);

        // Save user info (so we don't need to fetch it again)
        // This includes: id, name, email, role
        const userData = {
            ...response.data.data,
            role: role // Explicitly store the role
        };

        // For organizers, flatten the details for easier access
        if (role === 'organizer' && response.data.data.details) {
            userData.organizerName = response.data.data.details.name;
            userData.category = response.data.data.details.category;
            userData.description = response.data.data.details.description;
        }

        localStorage.setItem('user', JSON.stringify(userData));
            
        // Redirect based on role
        if (role === 'admin') {
            navigate('/admin/dashboard');
        } else if (role === 'organizer') {
            navigate('/organizer/dashboard');
        } else {
            navigate('/dashboard'); // Participant dashboard
        }

    } catch (err) {
        console.error('Login error:', err);
        // Display user-friendly error message
        setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
        setLoading(false); // Hide loading state
    }
  };

  return (
    <div style={styles.container}>
        {/* Header Section */}
        <div style={styles.card}>
            <h2 style={styles.title}>Event Management System</h2>
            <p style={styles.subtitle}>Sign in to your account</p>
            
            {/* Error Message */}
            {error && (
                <div style={styles.errorBox}>
                    {error}
                </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} style={styles.form}>
                
                {/* Role Selection - Dropdown to choose user type */}
                <div style={styles.formGroup}>
                    <label style={styles.label}>I am a:</label>
                    <select 
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        style={styles.select}
                    >
                        <option value="participant">Participant (Student)</option>
                        <option value="organizer">Organizer (Club/Council)</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                {/* Email Input */}
                <div style={styles.formGroup}>
                    <label style={styles.label}>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={role === 'participant' ? 'john@students.iiit.ac.in' : 'Enter your email'}
                        required
                        style={styles.input}
                    />
                </div>

                {/* Password Input */}
                <div style={styles.formGroup}>
                    <label style={styles.label}>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        style={styles.input}
                    />
                </div>

                {/* Submit Button */}
                <button 
                    type="submit" 
                    disabled={loading}
                    style={{
                        ...styles.button,
                        ...(loading ? styles.buttonDisabled : {})
                    }}
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>

                {/* Link to Register (only for participants) */}
                {role === 'participant' && (
                    <p style={styles.registerLink}>
                        Don't have an account? {' '}
                        <Link to="/register" style={styles.link}>
                            Register here
                        </Link>
                    </p>
                )}

                {/* Info message for non-participants */}
                {role !== 'participant' && (
                    <p style={styles.infoText}>
                        {role === 'organizer' 
                            ? '📧 Contact admin for your credentials'
                            : '🔒 Admin credentials are system-provisioned'
                        }
                    </p>
                )}
            </form>
        </div>
    </div>
  );
}

// Simple styles - nothing fancy
const styles = {
    container: {
        minHeight: '100vh',
        background: '#f0f0f0',
        padding: '50px 20px'
    },
    card: {
        maxWidth: '450px',
        margin: '0 auto',
        background: 'white',
        padding: '30px',
        border: '1px solid #ddd',
        borderRadius: '4px'
    },
    title: {
        textAlign: 'center',
        color: '#333',
        marginBottom: '10px'
    },
    subtitle: {
        textAlign: 'center',
        color: '#666',
        fontSize: '14px',
        marginBottom: '25px'
    },
    errorBox: {
        background: '#ffebee',
        color: '#c62828',
        padding: '10px',
        marginBottom: '15px',
        borderRadius: '3px',
        border: '1px solid #ef5350'
    },
    form: {
        width: '100%'
    },
    formGroup: {
        marginBottom: '15px'
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        color: '#333',
        fontSize: '14px'
    },
    input: {
        width: '100%',
        padding: '10px',
        fontSize: '14px',
        border: '1px solid #ccc',
        borderRadius: '3px',
        boxSizing: 'border-box'
    },
    select: {
        width: '100%',
        padding: '10px',
        fontSize: '14px',
        border: '1px solid #ccc',
        borderRadius: '3px',
        boxSizing: 'border-box',
        background: 'white'
    },
    button: {
        width: '100%',
        padding: '12px',
        fontSize: '16px',
        color: 'white',
        background: '#2196F3',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        marginTop: '10px'
    },
    buttonDisabled: {
        background: '#90CAF9',
        cursor: 'not-allowed'
    },
    registerLink: {
        textAlign: 'center',
        marginTop: '20px',
        fontSize: '14px',
        color: '#666'
    },
    link: {
        color: '#2196F3',
        textDecoration: 'underline'
    },
    infoText: {
        textAlign: 'center',
        marginTop: '15px',
        fontSize: '13px',
        color: '#666',
        background: '#f5f5f5',
        padding: '10px',
        borderRadius: '3px'
    }
};