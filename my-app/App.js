import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { supabase } from './utils/supabase';
import MapView, { Marker } from 'react-native-maps';

// Import screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import HikingSpotDetailsScreen from './screens/HikingSpotDetailsScreen';

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

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {session && session.user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen 
              name="HikingSpotDetails" 
              component={HikingSpotDetailsScreen} 
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} />
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
