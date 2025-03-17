// App.js

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Alert,
  Platform,
  PermissionsAndroid
} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { decode as atob } from 'base-64';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Create BLE manager instance
const bleManager = new BleManager();

// Replace these with your actual ESP32 UUIDs
const ESP32_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const ACCIDENT_CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [accidentMessages, setAccidentMessages] = useState([]);

  useEffect(() => {
    // Request permissions and start scanning on app start
    requestPermissions();

    // Clean up on unmount
    return () => {
      bleManager.destroy();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        
        if (
          granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('All permissions granted');
          startScanning();
        } else {
          console.log('Some permissions denied');
          Alert.alert(
            'Permissions Required',
            'This app needs Bluetooth and Location permissions to connect to your helmet.',
            [{ text: 'OK' }]
          );
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      // iOS handles permissions differently
      startScanning();
    }
  };

  const startScanning = () => {
    console.log('Starting scan for devices...');
    
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Scan error:', error);
        return;
      }
      
      // Find your helmet device by name
      // Change this to match what your ESP32 advertises
      if (device.name === 'AccidentHelmet' || device.name?.includes('Helmet')) {
        console.log('Found helmet device:', device.name);
        bleManager.stopDeviceScan();
        connectToDevice(device);
      }
    });
    
    // Stop scan after 15 seconds to save battery
    setTimeout(() => {
      bleManager.stopDeviceScan();
    }, 15000);
  };

  const connectToDevice = async (device) => {
    try {
      console.log('Connecting to device:', device.name);
      const connectedDevice = await device.connect();
      setDeviceName(device.name);
      
      const discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();
      setIsConnected(true);
      
      // Subscribe to accident notifications
      listenForAccidents(discoveredDevice);
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Connection Error', 'Failed to connect to helmet. Please try again.');
    }
  };

  const listenForAccidents = (device) => {
    device.monitorCharacteristicForService(
      ESP32_SERVICE_UUID,
      ACCIDENT_CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          console.error('Monitoring error:', error);
          return;
        }
        
        if (characteristic && characteristic.value) {
          try {
            // Decode the base64 message from ESP32
            const messageString = atob(characteristic.value);
            console.log('Received accident message:', messageString);
            
            // Add the message to our list with timestamp
            const newMessage = {
              id: Date.now().toString(),
              text: messageString,
              timestamp: new Date().toLocaleString()
            };
            
            setAccidentMessages(prevMessages => [newMessage, ...prevMessages]);
            
            // Show alert for new accident
            Alert.alert('Accident Detected', messageString);
          } catch (error) {
            console.error('Error decoding message:', error);
          }
        }
      }
    );
  };

  const reconnectDevice = () => {
    setIsConnected(false);
    startScanning();
  };

  const renderAccidentItem = ({ item }) => (
    <View style={styles.messageItem}>
      <View style={styles.messageHeader}>
        <Ionicons name="warning" size={20} color="#FF5722" />
        <Text style={styles.messageTime}>{item.timestamp}</Text>
      </View>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4a6572" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Accident Detection</Text>
        <Text style={styles.headerSubtitle}>Smart Helmet Monitor</Text>
      </View>
      
      <View style={styles.connectionCard}>
        <View style={styles.connectionInfo}>
          <Ionicons 
            name={isConnected ? "bluetooth" : "bluetooth-outline"} 
            size={24} 
            color={isConnected ? "#4CAF50" : "#F44336"} 
          />
          <View style={styles.connectionTextContainer}>
            <Text style={styles.connectionStatus}>
              {isConnected ? "Connected" : "Disconnected"}
            </Text>
            {isConnected && deviceName && (
              <Text style={styles.deviceName}>{deviceName}</Text>
            )}
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={reconnectDevice}
        >
          <Text style={styles.scanButtonText}>
            {isConnected ? "Reconnect" : "Scan for Helmet"}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.messagesContainer}>
        <Text style={styles.messagesTitle}>Accident Notifications</Text>
        
        {accidentMessages.length === 0 ? (
          <View style={styles.noMessages}>
            <Ionicons name="shield-checkmark" size={48} color="#4CAF50" />
            <Text style={styles.noMessagesText}>No accidents detected</Text>
            <Text style={styles.noMessagesSubtext}>
              Accident notifications will appear here when detected by your helmet
            </Text>
          </View>
        ) : (
          <FlatList
            data={accidentMessages}
            renderItem={renderAccidentItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4a6572',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e0e0',
    marginTop: 4,
  },
  connectionCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  connectionTextContainer: {
    marginLeft: 12,
  },
  connectionStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  deviceName: {
    fontSize: 14,
    color: '#666666',
  },
  scanButton: {
    backgroundColor: '#4a6572',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    padding: 16,
  },
  messagesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  noMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noMessagesText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
  },
  noMessagesSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  messagesList: {
    flexGrow: 1,
  },
  messageItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageTime: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#333333',
  },
});