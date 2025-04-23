import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getHikeRecords } from '../services/hikeRecordService'
import { formatDate, formatDistance, formatDuration, formatPace } from '../utils/formatters'
import HikeHistoryItem from '../components/HikeHistoryItem'

export default function HikeHistoryScreen({ navigation }) {
  const [hikeRecords, setHikeRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHikeRecords()
    
    // Refresh when the screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchHikeRecords()
    })
    
    return unsubscribe
  }, [navigation])

  const fetchHikeRecords = async () => {
    try {
      setLoading(true)
      const records = await getHikeRecords()
      setHikeRecords(records)
    } catch (error) {
      console.error('Error fetching hike records:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="trail-sign-outline" size={80} color="#DDD" />
      <Text style={styles.emptyTitle}>No Hikes Yet</Text>
      <Text style={styles.emptyText}>
        Start tracking your hikes to see your history here.
      </Text>
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => navigation.navigate('TrackingScreen')}
      >
        <Text style={styles.startButtonText}>Start Tracking</Text>
        <Ionicons name="arrow-forward" size={16} color="white" />
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FC4C02" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hiking History</Text>
        <View style={{ width: 24 }}> 
          {/* Empty view for spacing */}
        </View>
      </View>
      
      <FlatList
        data={hikeRecords}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => (
          <HikeHistoryItem 
            hike={item} 
            onPress={() => navigation.navigate('HikeDetails', { hikeId: item.id })}
          />
        )}
        contentContainerStyle={hikeRecords.length === 0 ? { flex: 1 } : styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
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
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#FC4C02',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
})