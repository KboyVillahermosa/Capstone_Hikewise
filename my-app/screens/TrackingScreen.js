import React, { useState, useEffect, useRef } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar, Platform, Alert, Modal } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'
import { formatDuration, formatPace, formatDistance } from '../utils/formatters'
import { saveHikeRecord } from '../services/hikeRecordService'
import HikeStats from '../components/HikeStats'

export default function TrackingScreen({ navigation }) {
  const [tracking, setTracking] = useState(false)
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
  const watchId = useRef(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permissions to use the tracking feature.')
        navigation.goBack()
        return
      }
      
      // Get initial location
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        })
        setCurrentLocation(location.coords)
      } catch (error) {
        Alert.alert('Error', 'Could not get your current location. Please try again.')
      }
    })()
    
    // Cleanup
    return () => {
      if (watchId.current) {
        Location.stopLocationUpdatesAsync(watchId.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startTracking = async () => {
    try {
      // Reset values
      setRouteCoordinates([])
      setStats({
        distance: 0,
        duration: 0,
        pace: 0,
        elevation: 0,
        currentSpeed: 0,
      })
      
      startTimeRef.current = new Date().getTime()
      
      // Start location tracking
      watchId.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 5, // update every 5 meters
          timeInterval: 1000,  // or at least every 1 second
        },
        (location) => {
          const { latitude, longitude, altitude, speed } = location.coords
          
          setCurrentLocation(location.coords)
          
          // Update route coordinates
          setRouteCoordinates(prevCoords => {
            const newCoords = [...prevCoords, { latitude, longitude }]
            
            // Calculate new distance if we have at least 2 points
            if (newCoords.length >= 2) {
              const lastCoord = prevCoords[prevCoords.length - 1]
              const newDistance = calculateDistance(
                lastCoord.latitude, 
                lastCoord.longitude, 
                latitude, 
                longitude
              )
              
              setStats(prevStats => {
                const newTotalDistance = prevStats.distance + newDistance
                const newDuration = (new Date().getTime() - startTimeRef.current) / 1000
                const newPace = newTotalDistance > 0 ? (newDuration / 60) / (newTotalDistance / 1000) : 0
                
                return {
                  distance: newTotalDistance,
                  duration: newDuration,
                  pace: newPace,
                  elevation: altitude || prevStats.elevation,
                  currentSpeed: speed || 0,
                }
              })
            }
            
            return newCoords
          })
          
          // Center map on current location
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude,
              longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }, 500)
          }
        }
      )
      
      // Start timer for duration
      timerRef.current = setInterval(() => {
        const currentTime = new Date().getTime()
        const elapsedSeconds = (currentTime - startTimeRef.current) / 1000
        
        setStats(prevStats => ({
          ...prevStats,
          duration: elapsedSeconds,
          // Recalculate pace
          pace: prevStats.distance > 0 ? (elapsedSeconds / 60) / (prevStats.distance / 1000) : 0
        }))
      }, 1000)
      
      setTracking(true)
    } catch (error) {
      Alert.alert('Error', 'Could not start tracking. Please try again.')
      console.error(error)
    }
  }

  const stopTracking = () => {
    if (watchId.current) {
      Location.stopLocationUpdatesAsync(watchId.current)
      watchId.current = null
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    setTracking(false)
    
    // Only show save option if we tracked something meaningful
    if (routeCoordinates.length > 5 && stats.distance > 10) {
      setSaveModalVisible(true)
    } else {
      Alert.alert('Tracking Stopped', 'Your tracking session was too short to save.')
    }
  }

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
      }
      
      await saveHikeRecord(hikeData)
      Alert.alert('Success', 'Your hike has been saved successfully!')
      setSaveModalVisible(false)
      navigation.goBack()
    } catch (error) {
      Alert.alert('Error', 'Could not save your hike. Please try again.')
      console.error(error)
    }
  }

  const handleDiscardHike = () => {
    setSaveModalVisible(false)
    navigation.goBack()
  }

  // Haversine formula to calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3 // Earth radius in meters
    const φ1 = lat1 * Math.PI/180
    const φ2 = lat2 * Math.PI/180
    const Δφ = (lat2-lat1) * Math.PI/180
    const Δλ = (lon2-lon1) * Math.PI/180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c

    return distance // in meters
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
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
            followsUserLocation={true}
          >
            {routeCoordinates.length > 1 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeWidth={4}
                strokeColor="#FC4C02"
              />
            )}
          </MapView>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Getting your location...</Text>
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
                'Are you sure you want to stop tracking? Your current session will be lost.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Stop', style: 'destructive', onPress: () => {
                    stopTracking()
                    navigation.goBack()
                  }}
                ]
              )
            } else {
              navigation.goBack()
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        {!tracking ? (
          <TouchableOpacity 
            style={styles.trackButton} 
            onPress={startTracking}
          >
            <Text style={styles.trackButtonText}>Start Tracking</Text>
            <Ionicons name="play" size={20} color="white" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.trackButton, styles.stopButton]} 
            onPress={stopTracking}
          >
            <Text style={styles.trackButtonText}>Stop</Text>
            <Ionicons name="stop" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Save Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={saveModalVisible}
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Your Hike?</Text>
            <Text style={styles.modalText}>
              Distance: {formatDistance(stats.distance)}{'\n'}
              Duration: {formatDuration(stats.duration)}{'\n'}
              Pace: {formatPace(stats.pace)}
            </Text>
            
            <View style={styles.modalButtons}>
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
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
  },
  statsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#000',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackButton: {
    flexDirection: 'row',
    backgroundColor: '#FC4C02',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#D32F2F',
  },
  trackButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  discardButton: {
    backgroundColor: '#F5F5F5',
  },
  saveButton: {
    backgroundColor: '#FC4C02',
  },
  discardButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
})