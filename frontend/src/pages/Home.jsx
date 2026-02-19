import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  // Check if user is already logged in
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // Navigate to correct dashboard based on role
  const handleDashboardClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user.role === 'admin') {
      navigate('/admin/dashboard');
    } else if (user.role === 'organizer') {
      navigate('/organizer/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <h2 style={styles.logo}>Event Management System</h2>
          <div style={styles.navLinks}>
            <button onClick={() => navigate('/')} style={styles.navButton}>
              Home
            </button>
            <button onClick={() => navigate('/events')} style={styles.navButton}>
              Browse Events
            </button>
            {user ? (
              <button onClick={handleDashboardClick} style={styles.loginButton}>
                Dashboard
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} style={styles.navButton}>
                  Login
                </button>
                <button onClick={() => navigate('/register')} style={styles.loginButton}>
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Welcome to Event Management System</h1>
        <p style={styles.heroSubtitle}>
          Discover and register for events organized by clubs, councils, and fest teams
        </p>
        <div style={styles.heroButtons}>
          <button onClick={() => navigate('/events')} style={styles.primaryButton}>
            Browse Events
          </button>
          {!user && (
            <button onClick={() => navigate('/register')} style={styles.secondaryButton}>
              Get Started
            </button>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div style={styles.features}>
        <h2 style={styles.sectionTitle}>Features</h2>
        <div style={styles.featureGrid}>
          <div style={styles.featureCard}>
            <h3 style={styles.featureTitle}>Easy Registration</h3>
            <p style={styles.featureText}>
              Register for events in just a few clicks. Simple and straightforward process.
            </p>
          </div>
          <div style={styles.featureCard}>
            <h3 style={styles.featureTitle}>Event Discovery</h3>
            <p style={styles.featureText}>
              Browse through various events organized by different clubs and organizations.
            </p>
          </div>
          <div style={styles.featureCard}>
            <h3 style={styles.featureTitle}>Track Your Events</h3>
            <p style={styles.featureText}>
              Keep track of all your registered events in one convenient dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © 2026 Event Management System. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

// Simple styling
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column'
  },
  navbar: {
    background: 'white',
    borderBottom: '1px solid #ddd',
    padding: '15px 0'
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    margin: 0,
    color: '#333',
    fontSize: '20px'
  },
  navLinks: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  navButton: {
    background: 'none',
    border: 'none',
    color: '#333',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  loginButton: {
    background: '#2196F3',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  hero: {
    background: '#f5f5f5',
    padding: '80px 20px',
    textAlign: 'center'
  },
  heroTitle: {
    fontSize: '42px',
    margin: '0 0 20px 0',
    color: '#333'
  },
  heroSubtitle: {
    fontSize: '18px',
    color: '#666',
    margin: '0 0 40px 0',
    maxWidth: '600px',
    marginLeft: 'auto',
    marginRight: 'auto'
  },
  heroButtons: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center'
  },
  primaryButton: {
    background: '#2196F3',
    color: 'white',
    border: 'none',
    padding: '12px 30px',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  secondaryButton: {
    background: 'white',
    color: '#2196F3',
    border: '1px solid #2196F3',
    padding: '12px 30px',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  features: {
    flex: 1,
    padding: '60px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%'
  },
  sectionTitle: {
    textAlign: 'center',
    fontSize: '32px',
    marginBottom: '40px',
    color: '#333'
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '30px'
  },
  featureCard: {
    background: 'white',
    border: '1px solid #ddd',
    padding: '30px',
    textAlign: 'center'
  },
  featureTitle: {
    fontSize: '20px',
    marginBottom: '15px',
    color: '#333'
  },
  featureText: {
    color: '#666',
    lineHeight: '1.6'
  },
  footer: {
    background: '#333',
    color: 'white',
    padding: '20px',
    textAlign: 'center'
  },
  footerText: {
    margin: 0,
    fontSize: '14px'
  }
};
