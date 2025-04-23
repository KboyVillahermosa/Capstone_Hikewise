import { useState, useEffect, useRef } from 'react'
import * as Location from 'expo-location'

export default function useLocation(options = {}) {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [tracking, setTracking] = useState(false)
  const watchId = useRef(null)

  const defaultOptions = {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 5,  // meters
    timeInterval: 1000,   // milliseconds
  }

  const mergedOptions = { ...defaultOptions, ...options }

  useEffect(() => {
    return () => {
      if (watchId.current) {
        Location.stopLocationUpdatesAsync(watchId.current)
      }
    }
  }, [])

  const requestPermissions = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      
      if (status !== 'granted') {
        setError('Location permission not granted')
        return false
      }
      
      // For background tracking (if needed)
      if (options.background) {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync()
        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission not granted')
        }
      }
      
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  const getInitialLocation = async () => {
    try {
      const hasPermission = await requestPermissions()
      
      if (!hasPermission) {
        return null
      }
      
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: mergedOptions.accuracy,
      })
      
      setLocation(currentLocation)
      return currentLocation
    } catch (err) {
      setError(err.message)
      return null
    }
  }

  const startTracking = async () => {
    try {
      const hasPermission = await requestPermissions()
      
      if (!hasPermission) {
        return false
      }
      
      watchId.current = await Location.watchPositionAsync(
        mergedOptions,
        (newLocation) => {
          setLocation(newLocation)
        }
      )
      
      setTracking(true)
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  const stopTracking = () => {
    if (watchId.current) {
      Location.stopLocationUpdatesAsync(watchId.current)
      watchId.current = null
      setTracking(false)
      return true
    }
    return false
  }

  return {
    location,
    error,
    tracking,
    requestPermissions,
    getInitialLocation,
    startTracking,
    stopTracking,
  }
}