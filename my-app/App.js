import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { supabase } from './utils/supabase';
import MapView, { Marker } from 'react-native-maps';
import * as Linking from 'expo-linking';
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

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  useEffect(() => {
    // Handle deep links while the app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Also handle the initial URL that may have launched the app
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("App launched with URL:", url);
        handleDeepLink({ url });
      }
    });

    return () => subscription.remove();
  }, []);

  const handleDeepLink = async ({ url }) => {
    console.log("Received deep link:", url);
    
    // Check if this is an auth callback URL
    if (url && (url.includes('auth/callback') || url.includes('login'))) {
      console.log("Processing auth callback URL");
      
      try {
        // Parse the URL to get any tokens
        const parsedUrl = Linking.parse(url);
        
        // If we have an access_token in the URL, use it to set the session
        if (parsedUrl.queryParams && parsedUrl.queryParams.access_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token: parsedUrl.queryParams.access_token,
            refresh_token: parsedUrl.queryParams.refresh_token || '',
          });
          
          if (error) {
            console.error("Session error with tokens:", error);
          } else if (data && data.session) {
            console.log("Session established with tokens");
            setSession(data.session);
            return;
          }
        }
        
        // If no tokens in URL or token setting failed, try refreshing the session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error after deep link:", error);
        } else if (data && data.session) {
          console.log("Session refreshed after deep link");
          setSession(data.session);
        } else {
          console.log("No active session found, user will need to log in");
        }
      } catch (e) {
        console.error("Error handling deep link:", e);
      }
    }
  };

  if (loading) {
    return null; // Or a loading screen
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
