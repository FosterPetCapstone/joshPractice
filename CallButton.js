import React, { useState } from 'react';
import axios from 'axios';
import './CallButton.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const CallButton = ({ phoneNumber, fosterId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [callStatus, setCallStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleCallNow = async () => {
    if (!phoneNumber) {
      setError('Phone number is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCallStatus(null);

    try {
      const response = await axios.post(`${API_URL}/api/make-call`, {
        phoneNumber,
        fosterId
      });

      setCallStatus({
        success: true,
        message: 'Call initiated successfully',
        callId: response.data.call_id
      });
    } catch (err) {
      console.error('Error making call:', err);
      setError(err.response?.data?.error || 'Failed to initiate call');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="call-button-container">
      <button 
        onClick={handleCallNow} 
        disabled={isLoading}
        className="call-now-button"
      >
        {isLoading ? 'Calling...' : 'Call Now'}
      </button>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {callStatus && callStatus.success && (
        <div className="success-message">
          {callStatus.message}
          {callStatus.callId && <div>Call ID: {callStatus.callId}</div>}
        </div>
      )}
    </div>
  );
};

export default CallButton; 