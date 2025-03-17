import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet,Text } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function QRCodePage() {
    const [qrCode, setQRCode] = useState('');

    useEffect(() => {
        const fetchQRCode = async () => {
            try {
                const studentId = await AsyncStorage.getItem('userId');
                if (!studentId) {
                    alert('User not found. Please log in again.');
                    return;
                }

                const response = await axios.get('http://192.168.8.142:5001/get-qr-code', {
                    params: { studentId }
                });

                setQRCode(response.data.qrCode);
            } catch (error) {
                console.error('Error fetching QR code:', error);
            }
        };

        fetchQRCode();
    }, []);

    return (
        <View style={styles.container}>
            {qrCode ? (
                <Image
                    style={styles.qrImage}
                    source={{ uri: qrCode }}
                />
            ) : (
                <Text>Loading QR code...</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    qrImage: {
        width: 250,
        height: 250,
        resizeMode: 'contain',
    },
});
