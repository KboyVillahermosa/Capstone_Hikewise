import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatDate, formatDistance, formatDuration, formatPace } from '../utils/formatters'

export default function HikeHistoryItem({ hike, onPress }) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map-outline" size={32} color="#FC4C02" />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.date}>{formatDate(hike.date || new Date())}</Text>
        <Text style={styles.title}>Hiking Session</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="speedometer-outline" size={14} color="#666" />
            <Text style={styles.statText}>{formatDistance(hike.stats?.distance || 0)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.statText}>{formatDuration(hike.stats?.duration || 0)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="walk-outline" size={14} color="#666" />
            <Text style={styles.statText}>{formatPace(hike.stats?.pace || 0)}</Text>
          </View>
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  mapPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#FFF0EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
})