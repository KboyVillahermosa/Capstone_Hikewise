// Create a new file ActivityDetailsScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, 
  ScrollView, TouchableOpacity, ActivityIndicator, 
  Dimensions, Platform, Share, StatusBar, Alert 
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';

const { width } = Dimensions.get('window');

export default function ActivityDetailsScreen({ route, navigation }) {
  const { activityId } = route.params;
  const [activity, setActivity] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityDetails();
  }, []);

  async function fetchActivityDetails() {
    try {
      setLoading(true);
      
      // Fetch activity details
      const { data, error } = await supabase
        .from('hiking_activities')
        .select('*')
        .eq('id', activityId)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setActivity(data);
        
        // Parse route coordinates
        if (data.route_data) {
          try {
            const coords = JSON.parse(data.route_data);
            setRouteCoords(coords);
          } catch (e) {
            console.error('Error parsing route data:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching activity details:', error.message);
      Alert.alert('Error', 'Could not load activity details.');
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s`;
  };

  const formatPace = (pace) => {
    if (!pace || pace === Infinity) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.floor((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
  };

  const shareActivity = async () => {
    try {
      const message = `I completed a ${activity.distance?.toFixed(2) || '0'} km hike with HikeWise! 🥾⛰️\n\nDuration: ${formatDuration(activity.duration)}\nElevation Gain: ${activity.elevation_gain?.toFixed(0) || '0'} m\nPace: ${formatPace(activity.average_pace)}\n\nDownload HikeWise to track your own hikes!`;
      
      await Share.share({
        message,
        title: 'My HikeWise Activity',
      });
    } catch (error) {
      console.error('Error sharing activity:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FC4C02" />
        <Text style={styles.loadingText}>Loading activity details...</Text>
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#FC4C02" />
        <Text style={styles.errorText}>Activity not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate map region to fit all coordinates
  const getMapRegion = () => {
    if (routeCoords.length === 0) {
      return {
        latitude: 10.3157, // Default to Cebu
        longitude: 123.8854,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }
    
    let minLat = routeCoords[0].latitude;
    let maxLat = routeCoords[0].latitude;
    let minLng = routeCoords[0].longitude;
    let maxLng = routeCoords[0].longitude;
    
    routeCoords.forEach(coord => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });
    
    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    
    // Add some padding
    const latDelta = (maxLat - minLat) * 1.4;
    const lngDelta = (maxLng - minLng) * 1.4;
    
    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: Math.max(0.01, latDelta),
      longitudeDelta: Math.max(0.01, lngDelta),
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FC4C02" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backArrow}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Details</Text>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={shareActivity}
        >
          <Ionicons name="share-social-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.activityMeta}>
          <Text style={styles.activityTitle}>Hiking Activity</Text>
          <Text style={styles.activityDate}>{formatDate(activity.start_time)}</Text>
        </View>
        
        <View style={styles.mapCard}>
          <MapView
            style={styles.map}
            initialRegion={getMapRegion()}
            zoomEnabled={true}
            scrollEnabled={true}
          >
            {routeCoords.length > 0 && (
              <>
                <Polyline
                  coordinates={routeCoords}
                  strokeColor="#FC4C02"
                  strokeWidth={4}
                />
                <Marker
                  coordinate={routeCoords[0]}
                  title="Start"
                  pinColor="green"
                />
                <Marker
                  coordinate={routeCoords[routeCoords.length - 1]}
                  title="Finish"
                  pinColor="red"
                />
              </>
            )}
          </MapView>
        </View>
        
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Activity Stats</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBlock}>
              <Ionicons name="speedometer-outline" size={24} color="#FC4C02" />
              <Text style={styles.statValue}>{activity.distance?.toFixed(2) || '0'} km</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            
            <View style={styles.statBlock}>
              <Ionicons name="time-outline" size={24} color="#FC4C02" />
              <Text style={styles.statValue}>{formatDuration(activity.duration)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            
            <View style={styles.statBlock}>
              <Ionicons name="trending-up-outline" size={24} color="#FC4C02" />
              <Text style={styles.statValue}>{activity.elevation_gain?.toFixed(0) || '0'} m</Text>
              <Text style={styles.statLabel}>Elevation Gain</Text>
            </View>
            
            <View style={styles.statBlock}>
              <Ionicons name="footsteps-outline" size={24} color="#FC4C02" />
              <Text style={styles.statValue}>{formatPace(activity.average_pace)}</Text>
              <Text style={styles.statLabel}>Avg Pace</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FC4C02',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 16,
  },
  backArrow: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  shareButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 16,
  },
  activityMeta: {
    marginBottom: 16,
  },
  activityTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  activityDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  mapCard: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
  },
  map: {
    height: 250,
    width: '100%',
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBlock: {
    width: '48%',
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#FC4C02',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

<Stack.Screen name="ActivityDetails" component={ActivityDetailsScreen} />