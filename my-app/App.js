import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { supabase } from './utils/supabase';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { linking } from './utils/linking';

// Import screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import HikingSpotDetailsScreen from './screens/HikingSpotDetailsScreen';
import ActivityDetailsScreen from './screens/ActivityDetailsScreen';
import TrackingScreen from './screens/TrackingScreen';
import HikeHistoryScreen from './screens/HikeHistoryScreen';
import EmailConfirmationScreen from './screens/EmailConfirmationScreen';
import PostsScreen from './screens/PostsScreen';
import CommentsScreen from './screens/CommentsScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import MediaViewerScreen from './screens/MediaViewerScreen';

const Stack = createNativeStackNavigator();

// Helper function to store auth tokens securely
async function saveToken(key, value) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.log('Error saving token:', error);
  }
}

// Helper function to retrieve auth tokens
async function getToken(key) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.log('Error getting token:', error);
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Supabase auth with stored tokens on startup
  useEffect(() => {
    async function initializeAuth() {
      try {
        // Try to get stored tokens
        const accessToken = await getToken('supabase.access.token');
        const refreshToken = await getToken('supabase.refresh.token');
        
        if (accessToken && refreshToken) {
          // If we have tokens, try to set the session
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.log('Session restore error:', error.message);
            // Clear invalid tokens
            await SecureStore.deleteItemAsync('supabase.access.token');
            await SecureStore.deleteItemAsync('supabase.refresh.token');
          } else if (data?.session) {
            console.log('Session restored successfully');
            setSession(data.session);
          }
        }
        
        // If no stored tokens or session restore failed, check for active session
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setSession(data.session);
          
          // Save the valid tokens
          await saveToken('supabase.access.token', data.session.access_token);
          await saveToken('supabase.refresh.token', data.session.refresh_token);
        }
      } catch (e) {
        console.error('Auth initialization error:', e);
      } finally {
        setLoading(false);
      }
    }
    
    initializeAuth();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth event:', event);
        
        setSession(newSession);
        
        // When a new session is created, store the tokens
        if (newSession) {
          await saveToken('supabase.access.token', newSession.access_token);
          await saveToken('supabase.refresh.token', newSession.refresh_token);
        } else {
          // When session is ended, clear tokens
          await SecureStore.deleteItemAsync('supabase.access.token');
          await SecureStore.deleteItemAsync('supabase.refresh.token');
        }
      }
    );
    
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Simplified deep link handler
  const handleDeepLink = async ({ url }) => {
    if (!url) return;
    
    console.log("Received deep link:", url);
    
    if (url.includes('auth/callback') || url.includes('login')) {
      try {
        const parsedUrl = Linking.parse(url);
        
        if (parsedUrl.queryParams?.access_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token: parsedUrl.queryParams.access_token,
            refresh_token: parsedUrl.queryParams.refresh_token || '',
          });
          
          if (!error && data?.session) {
            console.log("Session established via deep link");
            setSession(data.session);
          }
        }
      } catch (e) {
        console.error("Error handling deep link:", e);
      }
    }
  };

  useEffect(() => {
    // Handle deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check for initial link
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url });
    });
    
    return () => subscription.remove();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading HikeWise...</Text>
      </View>
    );
  }

  // For debugging purposes, log the screens we have available
  console.log("Available screens in navigator:", [
    "Home", "HikingSpotDetails", "ActivityDetails", 
    "Tracking", "HikeHistory", "Login", "Register", "EmailConfirmation",
    "Posts", "Comments", "Profile", "EditProfile", "ChangePassword", "MediaViewer"
  ]);

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator>
        {session && session.user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Posts" component={PostsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Comments" component={CommentsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} />
            <Stack.Screen 
              name="HikingSpotDetails" 
              component={HikingSpotDetailsScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="ActivityDetails" 
              component={ActivityDetailsScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen name="Tracking" component={TrackingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="HikeHistory" component={HikeHistoryScreen} options={{ headerShown: false }} />
            <Stack.Screen 
              name="MediaViewer" 
              component={MediaViewerScreen} 
              options={{ headerShown: false }} 
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
            <Stack.Screen 
              name="EmailConfirmation" 
              component={EmailConfirmationScreen} 
              options={{ headerShown: false }} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2E7D32',
  },
});

const mapPlaceholder = (spot) => (
  <MapView
    style={styles.map}
    initialRegion={{
      latitude: spot?.latitude || 10.3157, // Default to Cebu coordinates
      longitude: spot?.longitude || 123.8854,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    }}
  >
    <Marker
      coordinate={{
        latitude: spot?.latitude || 10.3157,
        longitude: spot?.longitude || 123.8854,
      }}
      title={spot?.name || 'Hiking Spot'}
    />
  </MapView>
);
