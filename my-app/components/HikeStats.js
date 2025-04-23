import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatDistance, formatDuration, formatPace, formatSpeed } from '../utils/formatters'

export default function HikeStats({ stats }) {
  return (
    <View style={styles.container}>
      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <Ionicons name="speedometer-outline" size={16} color="#FC4C02" />
            <Text style={styles.statLabel}>DISTANCE</Text>
          </View>
          <Text style={styles.statValue}>{formatDistance(stats.distance)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <Ionicons name="time-outline" size={16} color="#FC4C02" />
            <Text style={styles.statLabel}>DURATION</Text>
          </View>
          <Text style={styles.statValue}>{formatDuration(stats.duration)}</Text>
        </View>
      </View>
      
      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <Ionicons name="walk-outline" size={16} color="#FC4C02" />
            <Text style={styles.statLabel}>PACE</Text>
          </View>
          <Text style={styles.statValue}>{formatPace(stats.pace)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <Ionicons name="trending-up-outline" size={16} color="#FC4C02" />
            <Text style={styles.statLabel}>ELEVATION</Text>
          </View>
          <Text style={styles.statValue}>{stats.elevation.toFixed(0)} m</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    paddingHorizontal: 10,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#FC4C02',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
})