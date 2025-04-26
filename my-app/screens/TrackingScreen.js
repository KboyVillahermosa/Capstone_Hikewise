import React, { useState, useEffect, useRef } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar, Platform, Alert, Modal } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import MapView, { Polyline, PROVIDER_GOOGLE, Marker } from 'react-native-maps'
import * as Location from 'expo-location'
import { formatDuration, formatPace, formatDistance } from '../utils/formatters'
import { saveHikeRecord } from '../services/hikeRecordService'
import HikeStats from '../components/HikeStats'

export default function TrackingScreen({ navigation }) {
  const [tracking, setTracking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [stats, setStats] = useState({
    distance: 0,       // in meters
    duration: 0,       // in seconds
    pace: 0,           // in minutes per km
    elevation: 0,      // in meters
    currentSpeed: 0,   // in m/s
  })
  const [saveModalVisible, setSaveModalVisible] = useState(false)
  
  const mapRef = useRef(null)
  const locationSubscription = useRef(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)
  const pausedTimeRef = useRef(0)  // For tracking total paused time
  const pauseStartTimeRef = useRef(null) // When pause started
  const initialAltitudeRef = useRef(null)
  const prevCoordinatesRef = useRef([])
  const lastValidDistanceRef = useRef(0) // To prevent erroneous distance jumps
  const lastStatsRef = useRef({}) // Store stats at pause time

  useEffect(() => {
    (async () => {
      // Request both foreground and background permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync()
      
      if (foregroundStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permissions to use the tracking feature.')
        navigation.goBack()
        return
      }
      
      // Background permissions are optional but helpful
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync()
        if (backgroundStatus !== 'granted') {
          Alert.alert('Limited Functionality', 
            'Background location permission not granted. Tracking may stop when app is in background.');
        }
      }
      
      // Get initial location with more retries
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
          timeout: 15000, // 15 second timeout
        });
        
        setCurrentLocation(location.coords);
        // Store initial altitude
        initialAltitudeRef.current = location.coords.altitude || 0;
        
        // Pre-populate first coordinate for route drawing
        prevCoordinatesRef.current = [{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }];
      } catch (error) {
        console.error('Initial location error:', error);
        Alert.alert('Error', 'Could not get your current location. Please check your GPS settings and try again.');
      }
    })();
    
    // Cleanup
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, []);

  const startTracking = async () => {
    try {
      if (!currentLocation) {
        Alert.alert('Error', 'Cannot start tracking without location. Please wait for GPS signal.');
        return;
      }
      
      // Reset values but initialize with current location
      const initialCoord = {
        latitude: currentLocation.latitude, 
        longitude: currentLocation.longitude
      };
      
      setRouteCoordinates([initialCoord]);
      prevCoordinatesRef.current = [initialCoord];
      lastValidDistanceRef.current = 0;
      
      const initialStats = {
        distance: 0,
        duration: 0,
        pace: 0,
        elevation: 0,
        currentSpeed: 0,
      };
      
      setStats(initialStats);
      lastStatsRef.current = {...initialStats};
      
      startTimeRef.current = new Date().getTime();
      pausedTimeRef.current = 0;
      initialAltitudeRef.current = currentLocation.altitude || 0;
      
      // Use subscription-based tracking
      startLocationTracking();
      
      // Start timer for duration updates
      startTimer();
      
      setTracking(true);
      setPaused(false);
      
      console.log('Tracking started');
    } catch (error) {
      Alert.alert('Error', 'Could not start tracking. Please check your GPS signal and try again.');
      console.error('Start tracking error:', error);
    }
  };

  const startLocationTracking = async () => {
    // Remove any existing subscription first
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }
    
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5, // update every 5 meters
        timeInterval: 1000,  // or at least every 1 second
      },
      (location) => {
        if (paused) return; // Don't update if paused
        
        const { latitude, longitude, altitude, speed } = location.coords;
        
        setCurrentLocation(location.coords);
        
        const newCoord = { latitude, longitude };
        
        // Update route on the map
        setRouteCoordinates(prevCoords => [...prevCoords, newCoord]);
        
        // Calculate new distance based on the previous coordinate
        if (prevCoordinatesRef.current.length > 0) {
          const lastCoord = prevCoordinatesRef.current[prevCoordinatesRef.current.length - 1];
          
          const newDistance = calculateDistance(
            lastCoord.latitude, 
            lastCoord.longitude, 
            latitude, 
            longitude
          );
          
          // Only update if we moved a reasonable distance (reduces GPS jitter)
          // Also check for unrealistic jumps in distance (more than 100m instantly)
          if (newDistance > 1 && newDistance < 100) {
            lastValidDistanceRef.current += newDistance;
            
            setStats(prevStats => {
              const newTotalDistance = lastValidDistanceRef.current;
              const newDuration = (new Date().getTime() - startTimeRef.current - pausedTimeRef.current) / 1000;
              
              // Calculate pace (minutes per km)
              const newPace = newTotalDistance > 0 ? (newDuration / 60) / (newTotalDistance / 1000) : 0;
              
              // Calculate elevation gain - only positive changes
              const elevationChange = 
                altitude && altitude > initialAltitudeRef.current ? 
                altitude - initialAltitudeRef.current : 0;
              
              const newStats = {
                distance: newTotalDistance,
                duration: newDuration,
                pace: newPace,
                elevation: elevationChange,
                currentSpeed: speed || 0,
              };
              
              // Update the last stats reference
              lastStatsRef.current = {...newStats};
              
              return newStats;
            });
            
            // Store the new coordinate for next calculation
            prevCoordinatesRef.current.push(newCoord);
          }
        }
        
        // Center map on current location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 500);
        }
      }
    );
  };

  const startTimer = () => {
    // Clear existing timer if any
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      if (paused) return; // Don't update if paused
      
      const currentTime = new Date().getTime();
      const elapsedSeconds = (currentTime - startTimeRef.current - pausedTimeRef.current) / 1000;
      
      setStats(prevStats => {
        const newStats = {
          ...prevStats,
          duration: elapsedSeconds,
          // Recalculate pace
          pace: prevStats.distance > 0 ? (elapsedSeconds / 60) / (prevStats.distance / 1000) : 0
        };
        
        // Update the last stats reference
        lastStatsRef.current = {...newStats};
        
        return newStats;
      });
    }, 1000);
  };

  const pauseTracking = () => {
    if (paused) {
      // Resume tracking
      console.log('Resuming tracking');
      
      // Calculate how long we were paused and add to total pause time
      const pauseDuration = new Date().getTime() - pauseStartTimeRef.current;
      pausedTimeRef.current += pauseDuration;
      
      // Restart location tracking and timer
      startLocationTracking();
      startTimer();
      
      setPaused(false);
    } else {
      // Pause tracking
      console.log('Pausing tracking');
      
      // Store when we paused
      pauseStartTimeRef.current = new Date().getTime();
      
      // Stop location updates and timer
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Save current stats
      lastStatsRef.current = {...stats};
      
      setPaused(true);
    }
  };

  const stopTracking = () => {
    // Clean up all tracking resources
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setTracking(false);
    setPaused(false);
    
    // Only show save option if we tracked something meaningful
    if (routeCoordinates.length > 5 && stats.distance > 10) {
      setSaveModalVisible(true);
    } else {
      Alert.alert('Tracking Stopped', 'Your tracking session was too short to save.');
    }
  };

  const handleSaveHike = async () => {
    try {
      const hikeData = {
        date: new Date().toISOString(),
        routeCoordinates,
        stats: {
          distance: stats.distance,
          duration: stats.duration,
          pace: stats.pace,
          elevation: stats.elevation
        }
      };
      
      await saveHikeRecord(hikeData);
      Alert.alert('Success', 'Your hike has been saved successfully!');
      setSaveModalVisible(false);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Could not save your hike. Please try again.');
      console.error('Save hike error:', error);
    }
  };

  const handleDiscardHike = () => {
    setSaveModalVisible(false);
    navigation.goBack();
  };

  // Haversine formula to calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return distance; // in meters
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <View style={styles.mapContainer}>
        {currentLocation ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            showsUserLocation={true}
            followsUserLocation={tracking && !paused}
            scrollEnabled={true}
            zoomEnabled={true}
            showsCompass={true}
            showsScale={true}
            mapType="standard"
          >
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeWidth={4}
                strokeColor="#FC4C02"
                lineCap="round"
                lineJoin="round"
              />
            )}
            
            {/* Start marker with custom callout */}
            {tracking && routeCoordinates.length > 0 && (
              <Marker
                coordinate={routeCoordinates[0]}
                title="Start"
                description="Your journey began here"
                pinColor="green"
              />
            )}
          </MapView>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        )}
        
        {/* Map overlay for current stats summary */}
        {tracking && !paused && (
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayText}>
              {formatDistance(stats.distance)} • {formatDuration(stats.duration)}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.statsContainer}>
        <HikeStats stats={stats} />
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            if (tracking) {
              Alert.alert(
                'Stop Tracking?',
                'Are you sure you want to stop tracking? Your current session will be lost unless you save it.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Stop', style: 'destructive', onPress: () => {
                    stopTracking();
                  }}
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        {!tracking ? (
          <TouchableOpacity 
            style={styles.trackButton} 
            onPress={startTracking}
            activeOpacity={0.8}
          >
            <Text style={styles.trackButtonText}>Start Tracking</Text>
            <Ionicons name="play" size={20} color="white" />
          </TouchableOpacity>
        ) : (
          <View style={styles.trackingButtonsContainer}>
            {/* Pause/Resume button */}
            <TouchableOpacity 
              style={[styles.actionButton, paused ? styles.resumeButton : styles.pauseButton]} 
              onPress={pauseTracking}
              activeOpacity={0.8}
            >
              <Ionicons name={paused ? "play" : "pause"} size={22} color="white" />
              <Text style={styles.actionButtonText}>{paused ? "Resume" : "Pause"}</Text>
            </TouchableOpacity>
            
            {/* Stop button */}
            <TouchableOpacity 
              style={[styles.actionButton, styles.stopButton]} 
              onPress={stopTracking}
              activeOpacity={0.8}
            >
              <Ionicons name="stop" size={22} color="white" />
              <Text style={styles.actionButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Enhanced Save Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={saveModalVisible}
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save Your Hike</Text>
              <MaterialIcons name="hiking" size={28} color="#FC4C02" />
            </View>
            
            <View style={styles.modalStatsContainer}>
              <View style={styles.modalStatRow}>
                <View style={styles.modalStatItem}>
                  <Ionicons name="speedometer-outline" size={22} color="#555" />
                  <Text style={styles.modalStatLabel}>Distance</Text>
                  <Text style={styles.modalStatValue}>{formatDistance(stats.distance)}</Text>
                </View>
                
                <View style={styles.modalStatItem}>
                  <Ionicons name="time-outline" size={22} color="#555" />
                  <Text style={styles.modalStatLabel}>Duration</Text>
                  <Text style={styles.modalStatValue}>{formatDuration(stats.duration)}</Text>
                </View>
              </View>
              
              <View style={styles.modalStatRow}>
                <View style={styles.modalStatItem}>
                  <MaterialIcons name="speed" size={22} color="#555" />
                  <Text style={styles.modalStatLabel}>Pace</Text>
                  <Text style={styles.modalStatValue}>{formatPace(stats.pace)}</Text>
                </View>
                
                <View style={styles.modalStatItem}>
                  <MaterialIcons name="terrain" size={22} color="#555" />
                  <Text style={styles.modalStatLabel}>Elevation</Text>
                  <Text style={styles.modalStatValue}>{stats.elevation.toFixed(1)}m</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.discardButton]}
                onPress={handleDiscardHike}
              >
                <Text style={styles.discardButtonText}>Discard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveHike}
              >
                <Text style={styles.saveButtonText}>Save Hike</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Enhanced Paused overlay */}
      {paused && tracking && (
        <View style={styles.pausedOverlay}>
          <View style={styles.pausedContent}>
            <Text style={styles.pausedText}>PAUSED</Text>
            <View style={styles.pausedStatsContainer}>
              <View style={styles.pausedStatRow}>
                <Ionicons name="speedometer-outline" size={20} color="#FC4C02" />
                <Text style={styles.pausedStat}>{formatDistance(stats.distance)}</Text>
              </View>
              
              <View style={styles.pausedStatRow}>
                <Ionicons name="time-outline" size={20} color="#FC4C02" />
                <Text style={styles.pausedStat}>{formatDuration(stats.duration)}</Text>
              </View>
              
              <View style={styles.pausedStatRow}>
                <MaterialIcons name="speed" size={20} color="#FC4C02" />
                <Text style={styles.pausedStat}>{formatPace(stats.pace)}</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.resumeOverlayButton}
              onPress={pauseTracking}
              activeOpacity={0.9}
            >
              <Ionicons name="play" size={24} color="white" />
              <Text style={styles.resumeButtonText}>RESUME</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E7D32',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  mapOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mapOverlayText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  statsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  trackButton: {
    flexDirection: 'row',
    backgroundColor: '#FC4C02',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  pauseButton: {
    backgroundColor: '#FFA000',
  },
  resumeButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#D32F2F',
  },
  trackButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalStatsContainer: {
    padding: 20,
  },
  modalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalStatItem: {
    alignItems: 'center',
    width: '48%',
  },
  modalStatLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  discardButton: {
    backgroundColor: '#f8f8f8',
    borderRightWidth: 0.5,
    borderRightColor: '#eaeaea',
  },
  saveButton: {
    backgroundColor: '#FC4C02',
    borderLeftWidth: 0.5,
    borderLeftColor: '#eaeaea',
  },
  discardButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  pausedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pausedContent: {
    width: '80%',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  pausedText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 25,
    letterSpacing: 3,
  },
  pausedStatsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12, 
    padding: 20,
    marginBottom: 30,
    width: '100%',
  },
  pausedStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  pausedStat: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 12,
  },
  resumeOverlayButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
  },
  resumeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
    letterSpacing: 1,
  }
})