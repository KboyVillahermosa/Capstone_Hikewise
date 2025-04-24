import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Platform, Alert, Modal, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getHikeRecords, deleteHikeRecord } from '../services/hikeRecordService'
import { formatDate, formatDistance, formatDuration, formatPace } from '../utils/formatters'
import HikeHistoryItem from '../components/HikeHistoryItem'
import { supabase } from '../utils/supabase'

export default function HikeHistoryScreen({ navigation }) {
  const [hikeRecords, setHikeRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [selectedHikeId, setSelectedHikeId] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check for current user
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    
    checkUser()
    
    // Listen for authentication state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    
    fetchHikeRecords()
    
    // Refresh when the screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchHikeRecords()
    })
    
    return () => {
      unsubscribe()
      authListener?.subscription?.unsubscribe()
    }
  }, [navigation])

  const fetchHikeRecords = async () => {
    try {
      setLoading(true)
      const records = await getHikeRecords()
      console.log('Fetched hike records:', records.length)
      setHikeRecords(records)
    } catch (error) {
      console.error('Error fetching hike records:', error)
      setHikeRecords([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteHike = (hikeId) => {
    setSelectedHikeId(hikeId)
    setDeleteModalVisible(true)
  }

  const confirmDeleteHike = async () => {
    try {
      await deleteHikeRecord(selectedHikeId)
      setDeleteModalVisible(false)
      
      // Remove the deleted hike from state
      setHikeRecords(prevRecords => 
        prevRecords.filter(hike => hike.id !== selectedHikeId)
      )
      
      // Show success message
      Alert.alert('Success', 'Hike deleted successfully')
    } catch (error) {
      console.error('Error deleting hike:', error)
      Alert.alert('Error', 'Failed to delete hike. Please try again.')
    }
  }

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#FC4C02" />
          <Text style={styles.emptyText}>Loading your hikes...</Text>
        </View>
      )
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trail-sign-outline" size={80} color="#DDD" />
        <Text style={styles.emptyTitle}>No Hikes Yet</Text>
        <Text style={styles.emptyText}>
          Start tracking your hikes to see your history here.
        </Text>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => {
            console.log("Navigating to Tracking screen")
            navigation.navigate('Tracking')
          }}
        >
          <Text style={styles.startButtonText}>Start Tracking</Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </TouchableOpacity>
      </View>
    )
  }

  const renderHikeItem = ({ item }) => (
    <View style={styles.hikeItemContainer}>
      <HikeHistoryItem 
        hike={item} 
        onPress={() => {
          console.log("Navigating to ActivityDetails screen with hike:", item.id)
          navigation.navigate('ActivityDetails', { activityId: item.id })
        }}
      />
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeleteHike(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#D32F2F" />
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
        renderItem={renderHikeItem}
        contentContainerStyle={hikeRecords.length === 0 ? { flex: 1 } : styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Hike?</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete this hike? This action cannot be undone.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.deleteConfirmButton]}
                onPress={confirmDeleteHike}
              >
                <Text style={styles.deleteConfirmButtonText}>Delete</Text>
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
  hikeItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteButton: {
    padding: 10,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
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
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  deleteConfirmButton: {
    backgroundColor: '#D32F2F',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  deleteConfirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  }
})