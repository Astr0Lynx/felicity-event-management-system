import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';

export default function AttendanceScanner() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanMode, setScanMode] = useState('manual'); // 'manual', 'camera', or 'file'
  const [participantId, setParticipantId] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    fetchEventAndAttendance();
  }, [eventId]);

  useEffect(() => {
    // Cleanup camera on unmount or mode change
    return () => {
      stopScanning();
    };
  }, [scanMode]);

  const fetchEventAndAttendance = async () => {
    try {
      const [eventRes, attendanceRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/events/${eventId}/attendance`)
      ]);

      setEvent(eventRes.data);
      setAttendanceData(attendanceRes.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage(error.response?.data?.message || 'Failed to load data');
      setMessageType('error');
      setLoading(false);
    }
  };

  const startCameraScanning = async () => {
    if (isScanning) return;

    try {
      const scanner = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanError
      );

      setIsScanning(true);
      setMessage('📷 Camera active. Point at QR code to scan.');
      setMessageType('success');
    } catch (err) {
      console.error('Camera error:', err);
      setMessage(`Camera error: ${err.message || 'Cannot access camera'}. Try file upload instead.`);
      setMessageType('error');
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      setIsScanning(false);
    }
  };

  const onScanSuccess = (decodedText) => {
    try {
      // Parse QR code data
      const qrData = JSON.parse(decodedText);
      
      // Validate QR code contains required fields
      if (!qrData.event_id || !qrData.participant_id) {
        setMessage('❌ Invalid QR code format');
        setMessageType('error');
        return;
      }

      // Validate correct event
      if (qrData.event_id !== eventId) {
        setMessage('❌ This ticket is for a different event!');
        setMessageType('error');
        return;
      }

      // Stop scanning and mark attendance
      stopScanning();
      markAttendance(qrData.participant_id, 'qr_scan');
    } catch (err) {
      setMessage('❌ Invalid QR code data format');
      setMessageType('error');
    }
  };

  const onScanError = (errorMessage) => {
    // Ignore continuous scan errors, only log major issues
    if (!errorMessage.includes('NotFoundException')) {
      console.debug('Scan error:', errorMessage);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const scanner = new Html5Qrcode("qr-reader-file");
      const result = await scanner.scanFile(file, false);
      
      // Parse and validate
      const qrData = JSON.parse(result);
      
      if (!qrData.event_id || !qrData.participant_id) {
        setMessage('❌ Invalid QR code format');
        setMessageType('error');
        return;
      }

      if (qrData.event_id !== eventId) {
        setMessage('❌ This ticket is for a different event!');
        setMessageType('error');
        return;
      }

      markAttendance(qrData.participant_id, 'qr_scan');
    } catch (err) {
      console.error('File scan error:', err);
      setMessage('❌ Failed to scan QR code from file. Make sure it\'s a valid QR code image.');
      setMessageType('error');
    }

    // Clear file input
    e.target.value = '';
  };

  const handleManualEntry = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!participantId.trim()) {
      setMessage('Please enter participant ID');
      setMessageType('error');
      return;
    }

    await markAttendance(participantId.trim(), 'manual_override');
  };

  const markAttendance = async (participantIdToMark, method) => {
    try {
      await api.post(`/events/${eventId}/scan-attendance`, {
        participant_id: participantIdToMark,
        scan_method: method
      });

      setMessage('✅ Attendance marked successfully!');
      setMessageType('success');
      setParticipantId('');
      
      // Refresh attendance data
      fetchEventAndAttendance();
      
      // Auto-clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error scanning:', error);
      setMessage(error.response?.data?.message || 'Failed to mark attendance');
      setMessageType('error');
    }
  };

  const handleModeChange = async (newMode) => {
    // Stop current scanning if active
    if (isScanning) {
      await stopScanning();
    }

    setScanMode(newMode);
    setMessage('');

    // Auto-start camera if camera mode selected
    if (newMode === 'camera') {
      setTimeout(() => startCameraScanning(), 100);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get(`/events/${eventId}/attendance/export`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${event.name}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage('✅ CSV exported successfully!');
      setMessageType('success');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      setMessage('Failed to export CSV');
      setMessageType('error');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/organizer/dashboard')} style={styles.backButton}>
        ← Back to Dashboard
      </button>

      <h1 style={styles.title}>QR Scanner & Attendance</h1>
      <h2 style={styles.subtitle}>{event?.name}</h2>

      {/* Statistics */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{attendanceData?.total_registered || 0}</div>
          <div style={styles.statLabel}>Total Registered</div>
        </div>
        <div style={styles.statCard}>
          <div style={{...styles.statValue, color: '#4caf50'}}>{attendanceData?.total_present || 0}</div>
          <div style={styles.statLabel}>Present</div>
        </div>
        <div style={styles.statCard}>
          <div style={{...styles.statValue, color: '#f44336'}}>{attendanceData?.total_absent || 0}</div>
          <div style={styles.statLabel}>Absent</div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div style={{
          ...styles.messageBox,
          background: messageType === 'success' ? '#d4edda' : '#f8d7da',
          color: messageType === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${messageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message}
        </div>
      )}

      {/* Scanner Interface */}
      <div style={styles.scannerCard}>
        <h3 style={styles.cardTitle}>Scan Attendance</h3>
        
        <div style={styles.modeSelector}>
          <button
            onClick={() => handleModeChange('camera')}
            style={{
              ...styles.modeButton,
              background: scanMode === 'camera' ? '#4caf50' : '#f5f5f5',
              color: scanMode === 'camera' ? 'white' : '#666'
            }}
          >
            📷 Camera Scan
          </button>
          <button
            onClick={() => handleModeChange('file')}
            style={{
              ...styles.modeButton,
              background: scanMode === 'file' ? '#2196F3' : '#f5f5f5',
              color: scanMode === 'file' ? 'white' : '#666'
            }}
          >
            📁 Upload QR
          </button>
          <button
            onClick={() => handleModeChange('manual')}
            style={{
              ...styles.modeButton,
              background: scanMode === 'manual' ? '#ff9800' : '#f5f5f5',
              color: scanMode === 'manual' ? 'white' : '#666'
            }}
          >
            ⌨️ Manual Entry
          </button>
        </div>

        {/* Camera Scanner Mode */}
        {scanMode === 'camera' && (
          <div>
            <div id="qr-reader" style={styles.qrReader}></div>
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              {isScanning ? (
                <button 
                  onClick={stopScanning} 
                  style={{...styles.scanButton, background: '#f44336'}}
                >
                  ⏹️ Stop Camera
                </button>
              ) : (
                <button 
                  onClick={startCameraScanning} 
                  style={styles.scanButton}
                >
                  📷 Start Camera
                </button>
              )}
            </div>
            <p style={styles.hint}>
              💡 Point your camera at the participant's QR code ticket. Scanning happens automatically.
            </p>
          </div>
        )}

        {/* File Upload Mode */}
        {scanMode === 'file' && (
          <div>
            <div id="qr-reader-file" style={{ display: 'none' }}></div>
            <div style={styles.fileUploadArea}>
              <div style={styles.uploadIcon}>📤</div>
              <h4 style={{ margin: '10px 0' }}>Upload QR Code Image</h4>
              <p style={{ color: '#666', fontSize: '14px', margin: '10px 0' }}>
                Take a photo of the participant's QR ticket or screenshot
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={styles.fileInput}
                id="qr-file-upload"
              />
              <label htmlFor="qr-file-upload" style={styles.uploadButton}>
                Choose Image File
              </label>
            </div>
            <p style={styles.hint}>
              💡 Works great for screenshots or photos of QR codes. No camera access needed!
            </p>
          </div>
        )}

        {/* Manual Entry Mode */}
        {scanMode === 'manual' && (
          <form onSubmit={handleManualEntry} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Participant ID:</label>
              <input
                type="text"
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                placeholder="Enter participant ID from ticket"
                style={styles.input}
              />
              <p style={styles.hint}>
                💡 Participant ID is found on their ticket. Use this as a fallback if QR scanning fails.
              </p>
            </div>

            <button type="submit" style={styles.scanButton}>
              ✓ Mark Attendance Manually
            </button>
          </form>
        )}
      </div>

      {/* Attendance List */}
      <div style={styles.attendanceCard}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Attendance List</h3>
          <button onClick={handleExportCSV} style={styles.exportButton}>
            📥 Export CSV
          </button>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Participant ID</th>
                <th style={styles.th}>Registered At</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Scanned At</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData?.attendance_report?.map((record, index) => (
                <tr key={index} style={styles.tableRow}>
                  <td style={styles.td}>{record.participant_name}</td>
                  <td style={styles.td}><code style={styles.emailCode}>{record.participant_email}</code></td>
                  <td style={styles.td}>
                    <code style={styles.idCode}>{record.participant_id}</code>
                  </td>
                  <td style={styles.td}>{new Date(record.registered_at).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      background: record.attendance_status === 'Present' ? '#d4edda' : '#fff3cd',
                      color: record.attendance_status === 'Present' ? '#155724' : '#856404'
                    }}>
                      {record.attendance_status === 'Present' ? '✓ Present' : '○ Absent'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {record.scanned_at ? new Date(record.scanned_at).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '30px',
    background: '#f5f5f5',
    minHeight: '100vh'
  },
  backButton: {
    padding: '8px 16px',
    background: '#607d8b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '20px'
  },
  loading: {
    textAlign: 'center',
    padding: '50px',
    fontSize: '18px',
    color: '#666'
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '32px',
    color: '#2c3e50'
  },
  subtitle: {
    margin: '0 0 30px 0',
    fontSize: '20px',
    color: '#7f8c8d'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  statValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: '10px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  messageBox: {
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px'
  },
  scannerCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    marginBottom: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  cardTitle: {
    margin: '0 0 20px 0',
    fontSize: '24px',
    color: '#2c3e50'
  },
  modeSelector: {
    display: 'flex',
    gap: '10px',
    marginBottom: '25px',
    flexWrap: 'wrap'
  },
  modeButton: {
    flex: 1,
    minWidth: '140px',
    padding: '12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.3s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  qrReader: {
    width: '100%',
    maxWidth: '500px',
    margin: '0 auto',
    border: '3px solid #4caf50',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  fileUploadArea: {
    border: '2px dashed #2196F3',
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
    background: '#f5f9ff'
  },
  uploadIcon: {
    fontSize: '48px',
    marginBottom: '10px'
  },
  fileInput: {
    display: 'none'
  },
  uploadButton: {
    display: 'inline-block',
    padding: '12px 30px',
    background: '#2196F3',
    color: 'white',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    marginTop: '10px',
    transition: 'background 0.3s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  form: {
    marginTop: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#2c3e50'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  hint: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic'
  },
  scanButton: {
    width: '100%',
    padding: '15px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  attendanceCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  exportButton: {
    padding: '10px 20px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    background: '#f5f5f5',
    borderBottom: '2px solid #ddd'
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#2c3e50',
    fontSize: '14px'
  },
  tableRow: {
    borderBottom: '1px solid #eee'
  },
  td: {
    padding: '12px',
    color: '#2c3e50'
  },
  emailCode: {
    background: '#f5f5f5',
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '13px'
  },
  idCode: {
    background: '#e3f2fd',
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '12px',
    color: '#1565c0',
    fontFamily: 'monospace'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block'
  }
};
