import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    // Clear all localStorage to prevent stale data issues when switching between roles
    localStorage.clear();
    navigate('/login', { replace: true });
    // Force reload to clear any cached state
    window.location.reload();
  };

  const getDashboardPath = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'organizer') return '/organizer/dashboard';
    return '/dashboard';
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const styles = {
    navbar: {
      backgroundColor: '#2c3e50',
      padding: '15px 30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    },
    brand: {
      color: '#fff',
      fontSize: '24px',
      fontWeight: 'bold',
      cursor: 'pointer',
      textDecoration: 'none'
    },
    navLinks: {
      display: 'flex',
      gap: '20px',
      alignItems: 'center'
    },
    link: {
      color: '#ecf0f1',
      textDecoration: 'none',
      padding: '8px 16px',
      borderRadius: '4px',
      transition: 'background-color 0.3s',
      cursor: 'pointer',
      fontSize: '16px'
    },
    activeLink: {
      backgroundColor: '#34495e',
      color: '#fff'
    },
    logoutBtn: {
      backgroundColor: '#e74c3c',
      color: '#fff',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      transition: 'background-color 0.3s'
    },
    userInfo: {
      color: '#ecf0f1',
      marginRight: '15px',
      fontSize: '14px'
    }
  };

  // Public pages (no navbar needed)
  if (!user && (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register')) {
    return null;
  }

  return (
    <nav style={styles.navbar}>
      <div 
        style={styles.brand} 
        onClick={() => navigate(getDashboardPath())}
      >
        🎉 Felicity
      </div>

      <div style={styles.navLinks}>
        {user && (
          <>
            <a
              style={{
                ...styles.link,
                ...(isActive(getDashboardPath()) ? styles.activeLink : {})
              }}
              onClick={() => navigate(getDashboardPath())}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#34495e'}
              onMouseLeave={(e) => {
                if (!isActive(getDashboardPath())) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              Dashboard
            </a>

            {user.role === 'participant' && (
              <>
                <a
                  style={{
                    ...styles.link,
                    ...(isActive('/events') ? styles.activeLink : {})
                  }}
                  onClick={() => navigate('/events')}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#34495e'}
                  onMouseLeave={(e) => {
                    if (!isActive('/events')) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  Browse Events
                </a>
                <a
                  style={{
                    ...styles.link,
                    ...(isActive('/clubs') ? styles.activeLink : {})
                  }}
                  onClick={() => navigate('/clubs')}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#34495e'}
                  onMouseLeave={(e) => {
                    if (!isActive('/clubs')) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  Clubs/Organizers
                </a>
                <a
                  style={{
                    ...styles.link,
                    ...(isActive('/profile') ? styles.activeLink : {})
                  }}
                  onClick={() => navigate('/profile')}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#34495e'}
                  onMouseLeave={(e) => {
                    if (!isActive('/profile')) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  Profile
                </a>
              </>
            )}

            {user.role === 'organizer' && (
              <>
                <a
                  style={{
                    ...styles.link,
                    ...(isActive('/organizer/create-event') ? styles.activeLink : {})
                  }}
                  onClick={() => navigate('/organizer/create-event')}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#34495e'}
                  onMouseLeave={(e) => {
                    if (!isActive('/organizer/create-event')) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  Create Event
                </a>
                <a
                  style={{
                    ...styles.link,
                    ...(isActive('/organizer/ongoing-events') ? styles.activeLink : {})
                  }}
                  onClick={() => navigate('/organizer/ongoing-events')}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#34495e'}
                  onMouseLeave={(e) => {
                    if (!isActive('/organizer/ongoing-events')) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  Ongoing Events
                </a>
                <a
                  style={{
                    ...styles.link,
                    ...(isActive('/organizer/payment-approvals') ? styles.activeLink : {})
                  }}
                  onClick={() => navigate('/organizer/payment-approvals')}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#34495e'}
                  onMouseLeave={(e) => {
                    if (!isActive('/organizer/payment-approvals')) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  Payment Approvals
                </a>
                <a
                  style={{
                    ...styles.link,
                    ...(isActive('/organizer/profile') ? styles.activeLink : {})
                  }}
                  onClick={() => navigate('/organizer/profile')}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#34495e'}
                  onMouseLeave={(e) => {
                    if (!isActive('/organizer/profile')) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  Profile
                </a>
              </>
            )}

            {user.role === 'admin' && (
              <>
                <a
                  style={{
                    ...styles.link,
                    ...(isActive('/admin/manage-organizers') ? styles.activeLink : {})
                  }}
                  onClick={() => navigate('/admin/manage-organizers')}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#34495e'}
                  onMouseLeave={(e) => {
                    if (!isActive('/admin/manage-organizers')) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  Manage Clubs/Organizers
                </a>
                <a
                  style={{
                    ...styles.link,
                    ...(isActive('/admin/password-reset-requests') ? styles.activeLink : {})
                  }}
                  onClick={() => navigate('/admin/password-reset-requests')}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#34495e'}
                  onMouseLeave={(e) => {
                    if (!isActive('/admin/password-reset-requests')) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  Password Reset Requests
                </a>
              </>
            )}

            <span style={styles.userInfo}>
              {user.email} ({user.role})
            </span>

            <button
              style={styles.logoutBtn}
              onClick={handleLogout}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#c0392b'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#e74c3c'}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
