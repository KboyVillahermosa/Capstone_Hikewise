import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native'
import { createStackNavigator } from '@react-navigation/stack'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import TrackingScreen from './TrackingScreen'
import HikeHistoryScreen from './HikeHistoryScreen'

const Stack = createStackNavigator()

function TrackHomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Track Activity</Text>
      </View>
      
      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.optionCard}
          onPress={() => navigation.navigate('TrackingScreen')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="footsteps" size={32} color="#2E7D32" />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Start Tracking</Text>
            <Text style={styles.optionDescription}>Track your hike with GPS, measure distance, pace and more</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.optionCard}
          onPress={() => navigation.navigate('HikeHistory')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="time" size={32} color="#2E7D32" />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Hiking History</Text>
            <Text style={styles.optionDescription}>View your past hikes, routes and stats</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default function TrackScreen() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen name="TrackHome" component={TrackHomeScreen} />
      <Stack.Screen name="TrackingScreen" component={TrackingScreen} />
      <Stack.Screen name="HikeHistory" component={HikeHistoryScreen} />
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF0EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
})