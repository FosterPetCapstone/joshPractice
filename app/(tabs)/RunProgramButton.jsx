import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
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
      // Update with your backend URL
      const response = await axios.post('http://localhost:8080/api/run-foster-program');
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

  const clearStatus = () => {
    setStatus('');
    setShowLogs(false);
    setLogs([]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={runProgram}
        disabled={isRunning}
        style={[
          styles.button,
          isRunning ? styles.buttonDisabled : styles.buttonActive
        ]}
      >
        <Text style={styles.buttonText}>
          {isRunning ? 'Running...' : 'Run Program'}
        </Text>
      </TouchableOpacity>

      {status ? (
        <View style={[
          styles.statusContainer,
          status.includes('Error') ? styles.errorStatus : styles.successStatus
        ]}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusText}>{status}</Text>
            <TouchableOpacity 
              onPress={clearStatus}
              style={styles.closeButton}
            >
              <Icon name="times" size={16} color="#666" />
            </TouchableOpacity>
          </View>
          {logs.length > 0 && (
            <TouchableOpacity 
              onPress={toggleLogs}
              style={styles.logsToggleButton}
            >
              <Text style={styles.logsToggleText}>
                {showLogs ? 'Hide Logs' : 'Show Logs'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {showLogs && logs.length > 0 && (
        <ScrollView style={styles.logsContainer}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logEntry}>{log}</Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1000,
    maxWidth: 300,
  },
  button: {
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: '#4CAF50',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  statusContainer: {
    marginTop: 10,
    padding: 8,
    borderRadius: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  successStatus: {
    backgroundColor: '#e8f5e9',
  },
  errorStatus: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 14,
    flex: 1,
  },
  logsToggleButton: {
    marginTop: 5,
    padding: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  logsToggleText: {
    fontSize: 12,
  },
  logsContainer: {
    marginTop: 10,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#f5f5f5',
  },
  logEntry: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 4,
  }
});

export default RunProgramButton; 