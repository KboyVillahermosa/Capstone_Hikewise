import { useState, useEffect } from 'react'
import { StyleSheet, View, Text, Button, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native'
import { supabase } from '../utils/supabase'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialIcons, FontAwesome } from '@expo/vector-icons'

const Tab = createBottomTabNavigator()

function HikingSpotCard({ spot, navigation }) {
  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('HikingSpotDetails', { spotId: spot.id })}
    >
      <Image 
        source={{ uri: spot.image_url }} 
        style={styles.cardImage} 
        resizeMode="cover"
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{spot.name}</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.cardRating}>
            {spot.average_rating ? spot.average_rating.toFixed(1) : 'No ratings'} 
          </Text>
          <FontAwesome name="star" size={16} color="#FFD700" />
          <Text style={styles.cardRatingCount}>({spot.rating_count || 0})</Text>
        </View>
        <Text style={styles.cardLocation}>
          <MaterialIcons name="location-on" size={14} color="#666" />
          {spot.location}
        </Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {spot.description}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

function HomeContent({ navigation, user }) {
  const [hikingSpots, setHikingSpots] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHikingSpots()
  }, [])

  async function fetchHikingSpots() {
    try {
      setLoading(true)
      
      console.log('Fetching hiking spots from:', supabase.supabaseUrl);
      
      // Get hiking spots with average rating
      const { data, error } = await supabase
        .from('hiking_spots')
        .select(`
          id, 
          name, 
          description, 
          location, 
          image_url,
          average_rating,
          rating_count
        `)
        .eq('region', 'Cebu')
        .order('name')
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Hiking spots fetched:', data?.length || 0);
      setHikingSpots(data || [])
    } catch (error) {
      console.error('Error fetching hiking spots:', error.message);
      Alert.alert('Connection Error', 
        'Unable to connect to the server. Please check your internet connection or try again later.'
      );
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading hiking spots...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cebu Hiking Spots</Text>
        <Text style={styles.headerSubtitle}>Discover the best trails</Text>
      </View>

      {hikingSpots.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hiking spots found</Text>
        </View>
      ) : (
        <View style={styles.cardsContainer}>
          {hikingSpots.map(spot => (
            <HikingSpotCard 
              key={spot.id} 
              spot={spot} 
              navigation={navigation} 
            />
          ))}
        </View>
      )}
    </ScrollView>
  )
}

function ProfileScreen({ user, profile, signOut }) {
  return (
    <View style={styles.profileContainer}>
      <Text style={styles.profileTitle}>Profile</Text>
      <Text style={styles.profileUsername}>{profile?.username || user?.email}</Text>
      <Text style={styles.profileEmail}>{user?.email}</Text>
      <Button title="Sign Out" onPress={signOut} />
    </View>
  )
}

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProfile()
  }, [])

  async function getProfile() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUser(user)
        
        // Fetch user profile
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single()
          
        if (error) throw error
        setProfile(data)
      }
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      navigation.navigate('Login')
    } catch (error) {
      alert(error.message)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Discover" 
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="explore" color={color} size={size} />
          ),
        }}
      >
        {props => <HomeContent {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Profile" 
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
        }}
      >
        {props => (
          <ProfileScreen 
            {...props} 
            user={user} 
            profile={profile} 
            signOut={signOut} 
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#4CAF50',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
    marginTop: 5,
  },
  cardsContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: {
    height: 180,
    width: '100%',
  },
  cardContent: {
    padding: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardRating: {
    marginRight: 5,
    fontWeight: 'bold',
  },
  cardRatingCount: {
    marginLeft: 3,
    color: '#666',
    fontSize: 12,
  },
  cardLocation: {
    color: '#666',
    marginBottom: 10,
    fontSize: 14,
  },
  cardDescription: {
    color: '#444',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  profileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  profileTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  profileUsername: {
    fontSize: 22,
    marginBottom: 10,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
})