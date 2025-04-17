import React, { useState } from 'react';
import axios from 'axios';

const RunProgramButton = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('');

  const runProgram = async () => {
    setIsRunning(true);
    setShowLogs(true);
    setLogs([]);
    setStatus('Running the foster call program...');

    try {
      const response = await axios.post('/api/run-foster-program');
      setLogs(response.data.logs || []);
      setStatus(response.data.success 
        ? `Success: ${response.data.message}` 
        : `Error: ${response.data.error}`);
    } catch (error) {
      console.error('Error running program:', error);
      setStatus(`Error: ${error.message || 'Failed to run program'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleLogs = () => {
    setShowLogs(!showLogs);
  };

  return (
    <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>
      <button 
        onClick={runProgram}
        disabled={isRunning}
        style={{
          padding: '8px 16px',
          backgroundColor: isRunning ? '#cccccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isRunning ? 'not-allowed' : 'pointer',
          fontWeight: 'bold'
        }}
      >
        {isRunning ? 'Running...' : 'Run Program'}
      </button>

      {status && (
        <div style={{ 
          marginTop: '10px', 
          padding: '8px', 
          backgroundColor: status.includes('Error') ? '#ffebee' : '#e8f5e9',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {status}
          {logs.length > 0 && (
            <button 
              onClick={toggleLogs}
              style={{
                marginLeft: '10px',
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: 'transparent',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {showLogs ? 'Hide Logs' : 'Show Logs'}
            </button>
          )}
        </div>
      )}

      {showLogs && logs.length > 0 && (
        <div style={{
          marginTop: '10px',
          maxHeight: '300px',
          overflowY: 'auto',
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RunProgramButton; 