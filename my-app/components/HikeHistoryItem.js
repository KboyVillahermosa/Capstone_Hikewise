import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatDate, formatDistance, formatDuration, formatPace } from '../utils/formatters'

export default function HikeHistoryItem({ hike, onPress }) {
  if (!hike) {
    return null
  }

  const { date, stats } = hike

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="trail-sign" size={24} color="#FC4C02" />
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.dateText}>{formatDate(date)}</Text>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="speedometer-outline" size={16} color="#666" />
            <Text style={styles.statText}>{formatDistance(stats.distance)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.statText}>{formatDuration(stats.duration)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="footsteps-outline" size={16} color="#666" />
            <Text style={styles.statText}>{formatPace(stats.pace)}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.arrowContainer}>
        <Ionicons name="chevron-forward" size={24} color="#CCC" />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(252, 76, 2, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  arrowContainer: {
    marginLeft: 4,
  },
})