import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function StartPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkLoginStatus = async () => {
    try {
      const studentLogin = await AsyncStorage.getItem('isLoggedIN');
      if (studentLogin === 'true') {
        setTimeout(() => router.push('/home'), 2000);
        return;
      }

    } catch (error) {
      console.error('Error checking :', error);
    } finally {
      setTimeout(() => setLoading(false), 2000);
    }
  };

  

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#8C78F0' }}>
        <ActivityIndicator size="large" color="blue" />
      </View>
    );
  }

  return null;
}