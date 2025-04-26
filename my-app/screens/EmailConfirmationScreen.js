import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Image
} from 'react-native';
import { supabase } from '../utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function EmailConfirmationScreen({ navigation, route }) {
  const { email } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const cooldownTimerRef = useRef(null);

  // Function to resend verification email
  async function resendVerificationEmail() {
    if (resendCooldown) {
      Alert.alert(
        'Please Wait',
        `You can request another verification email in ${cooldownTime} seconds.`
      );
      return;
    }

    if (!email) {
      Alert.alert('Error', 'No email address provided. Please go back and try again.');
      return;
    }

    setLoading(true);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Verification Email Sent',
        'A new verification email has been sent to your email address. Please check your inbox and spam folder.'
      );
      
      // Set cooldown for resending
      setResendCooldown(true);
      setCooldownTime(60); // 60 seconds cooldown
      
      cooldownTimerRef.current = setInterval(() => {
        setCooldownTime((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(cooldownTimerRef.current);
            setResendCooldown(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    
    setLoading(false);
  }

  // Clean up interval when component unmounts
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      <View style={styles.circle3} />
      
      <SafeAreaView style={styles.content}>
        <View style={styles.iconContainer}>
          {/* Try to load the image, fallback to text emoji if it fails */}
          <View style={styles.emailIconPlaceholder}>
            <Text style={styles.emailIconText}>✉️</Text>
          </View>
        </View>
        
        <Text style={styles.title}>Verify Your Email</Text>
        
        <Text style={styles.description}>
          We've sent a verification email to:
        </Text>
        <Text style={styles.emailText}>{email || 'your email address'}</Text>
        
        <Text style={styles.instructions}>
          Please check your inbox and click the verification link to complete your registration.
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.resendButton, resendCooldown && styles.disabledButton]}
            onPress={resendVerificationEmail}
            disabled={loading || resendCooldown}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : resendCooldown ? (
              <Text style={styles.buttonText}>Resend in {cooldownTime}s</Text>
            ) : (
              <Text style={styles.buttonText}>Resend Verification Email</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            Didn't receive the email? Check your spam folder or try these steps:
          </Text>
          <Text style={styles.helpPoint}>• Make sure your email address is correct</Text>
          <Text style={styles.helpPoint}>• Check your spam or junk folder</Text>
          <Text style={styles.helpPoint}>• Wait a few minutes and try again</Text>
          <Text style={styles.helpPoint}>• Contact support if problems persist</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  // Circular design elements (same as RegisterScreen)
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(46, 125, 50, 0.15)', // Forest Green
    top: -50,
    right: -60,
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(25, 118, 210, 0.12)', // Mountain Blue
    top: 80,
    left: -40,
  },
  circle3: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(141, 110, 99, 0.08)', // Earthy Brown
    bottom: -100,
    right: -100,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  emailIconPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(46, 125, 50, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailIconText: {
    fontSize: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 24,
  },
  instructions: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 40,
  },
  resendButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 30,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loginButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1976D2',
    borderRadius: 30,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#1976D2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
    shadowOpacity: 0.15,
  },
  helpContainer: {
    backgroundColor: 'rgba(25, 118, 210, 0.08)',
    borderRadius: 10,
    padding: 15,
    width: '100%',
  },
  helpText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  helpPoint: {
    fontSize: 14,
    color: '#555',
    marginLeft: 5,
    marginBottom: 5,
  }
});