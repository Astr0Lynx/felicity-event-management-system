import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function DiscussionForum({ eventId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('DiscussionForum mounted with eventId:', eventId);
    fetchMessages();
    // No polling - only fetch on mount
  }, [eventId]);

  const fetchMessages = async () => {
    try {
      console.log('Fetching messages for event:', eventId);
      const { data } = await api.get(`/events/${eventId}/forum/messages`);
      console.log('Received data:', data);
      setMessages(data.data);
      setIsOrganizer(data.is_organizer);
      setHasAccess(true);
      setError(null);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      // If user not registered, don't show forum
      if (error.response?.status === 403) {
        console.log('403 error - user not registered');
        setHasAccess(false);
      } else {
        // For other errors, still show the forum
        console.log('Other error - still showing forum');
        setHasAccess(true);
        setError(error.response?.data?.message || 'Failed to load forum');
      }
      setLoading(false);
    }
  };

  const handlePostMessage = async () => {
    if (!newMessage.trim()) {
      alert('Message cannot be empty');
      return;
    }

    if (submitting) {
      return; // Prevent double submission
    }

    try {
      setSubmitting(true);
      const response = await api.post(`/events/${eventId}/forum/messages`, {
        message: newMessage,
        is_announcement: showAnnouncement,
        parent_message_id: null
      });
      
      setNewMessage('');
      setShowAnnouncement(false);
      
      // Optimistic update - add the new message immediately
      if (response.data.data) {
        const newMsg = {
          ...response.data.data,
          reactions: response.data.data.reactions || []
        };
        setMessages(prev => [...prev, newMsg]);
      }
    } catch (error) {
      console.error('Error posting message:', error);
      alert(error.response?.data?.message || 'Failed to post message');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostReply = async (parentMessageId) => {
    const text = replyText[parentMessageId];
    if (!text || !text.trim()) {
      alert('Reply cannot be empty');
      return;
    }

    if (replyingTo) {
      return; // Already submitting a reply
    }

    setReplyingTo(parentMessageId);

    try {
      const response = await api.post(`/events/${eventId}/forum/messages`, {
        message: text,
        is_announcement: false,
        parent_message_id: parentMessageId
      });
      
      // Clear reply text
      setReplyText(prev => ({ ...prev, [parentMessageId]: '' }));
      setReplyTo(null);
      
      // Optimistic update
      if (response.data.data) {
        const newMsg = {
          ...response.data.data,
          reactions: response.data.data.reactions || []
        };
        setMessages(prev => [...prev, newMsg]);
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      alert(error.response?.data?.message || 'Failed to post reply');
    } finally {
      setReplyingTo(null);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      // Optimistic update
      setMessages(prev => prev.filter(msg => msg.message_id.toString() !== messageId.toString()));
      await api.delete(`/events/${eventId}/forum/messages/${messageId}`);
    } catch (error) {
      console.error('Error deleting message:', error);
      alert(error.response?.data?.message || 'Failed to delete message');
    }
  };

  const handlePinMessage = async (messageId) => {
    try {
      // Optimistic update
      setMessages(prev => prev.map(msg => 
        msg.message_id.toString() === messageId.toString() 
          ? { ...msg, is_pinned: !msg.is_pinned }
          : msg
      ));
      await api.put(`/events/${eventId}/forum/messages/${messageId}/pin`);
    } catch (error) {
      console.error('Error pinning message:', error);
      alert(error.response?.data?.message || 'Failed to pin message');
    }
  };

  const handleReact = async (messageId, emoji) => {
    try {
      console.log('Reacting to message:', messageId, 'with emoji:', emoji);
      await api.post(`/events/${eventId}/forum/messages/${messageId}/react`, { emoji });
      // Optimistic update
      setMessages(prev => prev.map(msg => {
        if (msg.message_id.toString() === messageId.toString()) {
          const userReacted = msg.reactions.some(r => r.user === JSON.parse(localStorage.getItem('user')).id && r.emoji === emoji);
          if (userReacted) {
            // Remove reaction
            return {
              ...msg,
              reactions: msg.reactions.filter(r => !(r.user === JSON.parse(localStorage.getItem('user')).id && r.emoji === emoji))
            };
          } else {
            // Add reaction
            return {
              ...msg,
              reactions: [...msg.reactions, { user: JSON.parse(localStorage.getItem('user')).id, emoji }]
            };
          }
        }
        return msg;
      }));
    } catch (error) {
      console.error('Error reacting to message:', error);
      alert(error.response?.data?.message || 'Failed to react');
    }
  };

  const getAuthorName = (message) => {
    if (message.author_type === 'Organizer') {
      return `${message.author?.email || 'Organizer'} 🎪`;
    }
    return `${message.author?.first_name} ${message.author?.last_name}`;
  };

  const groupByThread = (messages) => {
    const topLevel = messages.filter(msg => !msg.parent_message_id);
    const threads = topLevel.map(msg => ({
      ...msg,
      replies: messages.filter(reply => reply.parent_message_id?.toString() === msg.message_id.toString())
        .sort((a, b) => new Date(a.posted_at) - new Date(b.posted_at))
    }));
    return threads;
  };

  const renderReactionCount = (reactions) => {
    const grouped = {};
    reactions.forEach(r => {
      grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
    });
    return Object.entries(grouped).map(([emoji, count]) => (
      <span key={emoji} style={styles.reactionBadge}>
        {emoji} {count}
      </span>
    ));
  };

  if (loading) {
    return <div style={styles.loading}>Loading forum...</div>;
  }

  if (!hasAccess) {
    console.log('No access - hiding forum');
    return null; // Don't show forum if user not registered
  }

  const threads = groupByThread(messages);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>💬 Discussion Forum</h2>
      <p style={styles.subtitle}>Ask questions, share thoughts, and interact with other participants</p>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {/* Post New Message */}
      <div style={styles.postBox}>
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Share your thoughts..."
          style={styles.textarea}
          rows={3}
        />
        <div style={styles.postActions}>
          {isOrganizer && (
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={showAnnouncement}
                onChange={(e) => setShowAnnouncement(e.target.checked)}
              />
              <span style={{ marginLeft: '5px' }}>Post as Announcement 📢</span>
            </label>
          )}
          <button 
            onClick={handlePostMessage} 
            style={{
              ...styles.postButton,
              ...(submitting ? styles.postButtonDisabled : {})
            }}
            disabled={submitting}
          >
            {submitting ? '⏳ Posting...' : '📤 Post'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messagesList}>
        {threads.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No messages yet. Be the first to start a discussion!</p>
          </div>
        ) : (
          threads.map(thread => (
            <div key={thread.message_id} style={{
              ...styles.messageCard,
              ...(thread.is_pinned ? styles.pinnedCard : {}),
              ...(thread.is_announcement ? styles.announcementCard : {})
            }}>
              {/* Top-level message */}
              <div style={styles.messageHeader}>
                <div style={styles.authorInfo}>
                  <strong>{getAuthorName(thread)}</strong>
                  <span style={styles.timestamp}>
                    {new Date(thread.posted_at).toLocaleString()}
                  </span>
                </div>
                <div style={styles.badges}>
                  {thread.is_pinned && <span style={styles.pinnedBadge}>📌 Pinned</span>}
                  {thread.is_announcement && <span style={styles.announcementBadge}>📢 Announcement</span>}
                </div>
              </div>

              <div style={styles.messageBody}>
                {thread.message}
              </div>

              {/* Reactions */}
              <div style={styles.reactions}>
                {renderReactionCount(thread.reactions)}
                <button onClick={() => handleReact(thread.message_id, '👍')} style={styles.reactButton}>👍</button>
                <button onClick={() => handleReact(thread.message_id, '❤️')} style={styles.reactButton}>❤️</button>
                <button onClick={() => handleReact(thread.message_id, '😂')} style={styles.reactButton}>😂</button>
                <button onClick={() => handleReact(thread.message_id, '🎉')} style={styles.reactButton}>🎉</button>
              </div>

              {/* Actions */}
              <div style={styles.messageActions}>
                <button 
                  onClick={() => {
                    const msgId = thread.message_id.toString();
                    if (replyTo === msgId) {
                      setReplyTo(null);
                    } else {
                      setReplyTo(msgId);
                    }
                  }} 
                  style={{
                    ...styles.actionBtn,
                    ...(replyTo === thread.message_id.toString() ? { background: '#4caf50', color: 'white' } : {})
                  }}
                >
                  {replyTo === thread.message_id.toString() ? '✕ Cancel Reply' : `💬 Reply to ${getAuthorName(thread).split(' ')[0]}'s message (${thread.replies.length})`}
                </button>
                {isOrganizer && (
                  <>
                    <button onClick={() => handlePinMessage(thread.message_id)} style={styles.actionBtn}>
                      {thread.is_pinned ? '📍 Unpin' : '📌 Pin'}
                    </button>
                    <button onClick={() => handleDeleteMessage(thread.message_id)} style={styles.deleteBtn}>
                      🗑️ Delete
                    </button>
                  </>
                )}
              </div>

              {/* Inline Reply Box */}
              {replyTo === thread.message_id.toString() && (
                <div style={styles.inlineReplyBox}>
                  <textarea
                    value={replyText[thread.message_id.toString()] || ''}
                    onChange={(e) => setReplyText(prev => ({ ...prev, [thread.message_id.toString()]: e.target.value }))}
                    placeholder={`Reply to ${getAuthorName(thread)}...`}
                    style={styles.textarea}
                    rows={2}
                  />
                  <button 
                    onClick={() => handlePostReply(thread.message_id)}
                    disabled={replyingTo === thread.message_id.toString()}
                    style={{
                      ...styles.inlineReplyButton,
                      ...(replyingTo === thread.message_id.toString() ? { opacity: 0.6, cursor: 'not-allowed' } : {})
                    }}
                  >
                    {replyingTo === thread.message_id.toString() ? '⏳ Sending...' : '📤 Send Reply'}
                  </button>
                </div>
              )}

              {/* Replies (Threading) */}
              {thread.replies.length > 0 && (
                <div style={styles.repliesContainer}>
                  {thread.replies.map(reply => (
                    <div key={reply.message_id} style={styles.replyCard}>
                      <div style={styles.messageHeader}>
                        <div style={styles.authorInfo}>
                          <strong>{getAuthorName(reply)}</strong>
                          <span style={styles.timestamp}>
                            {new Date(reply.posted_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div style={styles.messageBody}>
                        {reply.message}
                      </div>
                      <div style={styles.reactions}>
                        {renderReactionCount(reply.reactions)}
                        <button onClick={() => handleReact(reply.message_id, '👍')} style={styles.reactButton}>👍</button>
                        <button onClick={() => handleReact(reply.message_id, '❤️')} style={styles.reactButton}>❤️</button>
                      </div>
                      {isOrganizer && (
                        <button onClick={() => handleDeleteMessage(reply.message_id)} style={styles.deleteBtn}>
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginTop: '40px',
    padding: '30px',
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px'
  },
  title: {
    margin: '0 0 5px 0',
    fontSize: '24px',
    color: '#2c3e50'
  },
  subtitle: {
    margin: '0 0 25px 0',
    fontSize: '14px',
    color: '#7f8c8d'
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: '#666'
  },
  error: {
    padding: '15px',
    marginBottom: '20px',
    background: '#ffebee',
    color: '#c62828',
    border: '1px solid #ef5350',
    borderRadius: '4px'
  },
  postBox: {
    marginBottom: '30px',
    padding: '20px',
    background: '#f9f9f9',
    border: '2px solid #e3f2fd',
    borderRadius: '6px'
  },
  replyIndicator: {
    marginBottom: '10px',
    padding: '8px 12px',
    background: '#fff3cd',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cancelReply: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0 8px'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box'
  },
  postActions: {
    marginTop: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px'
  },
  postButton: {
    padding: '10px 24px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  postButtonDisabled: {
    background: '#ccc',
    cursor: 'not-allowed',
    opacity: 0.6
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#999'
  },
  messageCard: {
    padding: '20px',
    background: '#fafafa',
    border: '1px solid #e0e0e0',
    borderRadius: '8px'
  },
  pinnedCard: {
    borderLeft: '4px solid #ff9800',
    background: '#fff8e1'
  },
  announcementCard: {
    borderLeft: '4px solid #4caf50',
    background: '#e8f5e9'
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px'
  },
  authorInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  timestamp: {
    fontSize: '12px',
    color: '#999'
  },
  badges: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start'
  },
  pinnedBadge: {
    padding: '4px 8px',
    background: '#ff9800',
    color: 'white',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 'bold'
  },
  announcementBadge: {
    padding: '4px 8px',
    background: '#4caf50',
    color: 'white',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 'bold'
  },
  messageBody: {
    marginBottom: '15px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap'
  },
  reactions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  reactionBadge: {
    padding: '4px 8px',
    background: '#e3f2fd',
    borderRadius: '12px',
    fontSize: '13px'
  },
  reactButton: {
    background: 'transparent',
    border: '1px solid #ddd',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  messageActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px'
  },
  actionBtn: {
    padding: '6px 12px',
    background: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  deleteBtn: {
    padding: '6px 12px',
    background: '#ffebee',
    border: '1px solid #ef5350',
    color: '#d32f2f',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  inlineReplyBox: {
    marginTop: '15px',
    padding: '15px',
    background: '#f0f7ff',
    border: '2px solid #2196F3',
    borderRadius: '6px'
  },
  inlineReplyButton: {
    marginTop: '10px',
    padding: '8px 20px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  repliesContainer: {
    marginTop: '20px',
    marginLeft: '30px',
    paddingLeft: '20px',
    borderLeft: '3px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  replyCard: {
    padding: '15px',
    background: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '6px'
  }
};
