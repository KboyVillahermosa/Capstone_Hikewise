import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { getHikeRecords } from '../services/hikeRecordService';
import { formatDate, formatDistance, formatDuration, formatPace } from '../utils/formatters';

export default function ActivityDetailsScreen({ route, navigation }) {
  const { activityId } = route.params || {};
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        setLoading(true);
        const hikes = await getHikeRecords();
        const selectedHike = hikes.find(hike => hike.id === activityId);
        
        console.log('Loading activity:', activityId);
        console.log('Found hike:', selectedHike);
        
        if (selectedHike) {
          setActivity(selectedHike);
        } else {
          console.error('Hike not found with ID:', activityId);
        }
      } catch (error) {
        console.error('Error loading activity details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [activityId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.content}>
          <Text>Loading activity details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FC4C02" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Details</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {activity ? (
          <>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.dateText}>{formatDate(activity.date)}</Text>
            </View>
            
            <View style={styles.mapContainer}>
              {activity.routeCoordinates && activity.routeCoordinates.length > 0 ? (
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: activity.routeCoordinates[0].latitude,
                    longitude: activity.routeCoordinates[0].longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Polyline
                    coordinates={activity.routeCoordinates}
                    strokeWidth={4}
                    strokeColor="#FC4C02"
                  />
                </MapView>
              ) : (
                <View style={styles.noMap}>
                  <Text>No route data available</Text>
                </View>
              )}
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="speedometer-outline" size={24} color="#FC4C02" />
                <Text style={styles.statValue}>{formatDistance(activity.stats.distance)}</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={24} color="#FC4C02" />
                <Text style={styles.statValue}>{formatDuration(activity.stats.duration)}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="footsteps-outline" size={24} color="#FC4C02" />
                <Text style={styles.statValue}>{formatPace(activity.stats.pace)}</Text>
                <Text style={styles.statLabel}>Pace</Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="trending-up-outline" size={24} color="#FC4C02" />
                <Text style={styles.statValue}>{activity.stats.elevation?.toFixed(0) || 0} m</Text>
                <Text style={styles.statLabel}>Elevation</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.notFound}>
            <Ionicons name="alert-circle-outline" size={60} color="#FC4C02" />
            <Text style={styles.notFoundText}>Activity not found</Text>
          </View>
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FC4C02',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    padding: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  noMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  notFoundText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
});