import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function ClubsOrganizers() {
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [followedClubs, setFollowedClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrganizers();
    fetchUserFollowedClubs();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const { data } = await api.get('/admin/organizers/public');
      // Set all organizers (data structure is Organizer with populated organizer_details)
      setOrganizers(data);
    } catch (err) {
      console.error('Error fetching organizers:', err);
      setError('Failed to load organizers');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserFollowedClubs = async () => {
    try {
      const { data } = await api.get('/participants/profile');
      // Extract just the IDs from populated followed_clubs
      const clubIds = (data.data.followed_clubs || []).map(club => 
        typeof club === 'string' ? club : club._id
      );
      setFollowedClubs(clubIds);
    } catch (err) {
      console.error('Error fetching followed clubs:', err);
    }
  };

  const handleFollowToggle = async (organizerDetailId) => {
    try {
      const isFollowing = followedClubs.some(id => id.toString() === organizerDetailId.toString());
      
      if (isFollowing) {
        // Unfollow
        await api.post('/participants/unfollow-club', { organizer_detail_id: organizerDetailId });
        setFollowedClubs(prev => prev.filter(id => id.toString() !== organizerDetailId.toString()));
      } else {
        // Follow
        await api.post('/participants/follow-club', { organizer_detail_id: organizerDetailId });
        setFollowedClubs(prev => [...prev, organizerDetailId]);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      alert(err.response?.data?.message || 'Failed to update follow status');
    }
  };

  const isFollowing = (organizerDetailId) => {
    return followedClubs.some(id => id.toString() === organizerDetailId.toString());
  };

  if (loading) {
    return <div style={styles.loading}>Loading clubs...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>🎪 Clubs & Organizers</h1>
        <p style={{ color: '#666', marginTop: '10px' }}>
          Discover and follow your favorite clubs to stay updated on their events
        </p>
      </div>

      {error && (
        <div style={styles.error}>{error}</div>
      )}

      <div style={styles.organizersGrid}>
        {organizers.length === 0 ? (
          <p style={styles.noData}>No approved organizers found</p>
        ) : (
          organizers.map(organizer => (
            <div key={organizer._id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 
                  style={styles.organizerName}
                  onClick={() => navigate(`/clubs/${organizer.organizer_details._id}`)}
                >
                  {organizer.organizer_details.name}
                </h3>
                <span style={styles.category}>{organizer.organizer_details.category}</span>
              </div>

              <p style={styles.description}>
                {organizer.organizer_details.description || 'No description available'}
              </p>

              <div style={styles.cardFooter}>
                <span style={styles.email}>📧 {organizer.email}</span>
                <button
                  onClick={() => handleFollowToggle(organizer.organizer_details._id)}
                  style={{
                    ...styles.followButton,
                    ...(isFollowing(organizer.organizer_details._id) ? styles.followingButton : {})
                  }}
                >
                  {isFollowing(organizer.organizer_details._id) ? '✓ Following' : '+ Follow'}
                </button>
              </div>
            </div>
          ))
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
  header: {
    marginBottom: '30px',
    textAlign: 'center'
  },
  loading: {
    padding: '50px',
    textAlign: 'center',
    fontSize: '18px'
  },
  error: {
    padding: '15px',
    background: '#ffebee',
    color: '#c62828',
    borderRadius: '4px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    fontSize: '16px',
    marginTop: '50px'
  },
  organizersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  card: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  organizerName: {
    margin: 0,
    fontSize: '20px',
    color: '#2c3e50',
    cursor: 'pointer',
    flex: 1
  },
  category: {
    padding: '4px 12px',
    background: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginLeft: '10px'
  },
  description: {
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '15px',
    minHeight: '60px'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #eee',
    paddingTop: '15px'
  },
  email: {
    color: '#888',
    fontSize: '14px'
  },
  followButton: {
    padding: '8px 20px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background 0.3s'
  },
  followingButton: {
    background: '#4CAF50'
  }
};
