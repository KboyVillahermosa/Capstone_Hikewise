import { useState, useEffect } from 'react'
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  Dimensions,
  Platform // Add this import
} from 'react-native'
import { supabase } from '../utils/supabase'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons'
import TrackScreen from './TrackScreen'

const Tab = createBottomTabNavigator()
const { width } = Dimensions.get('window');

function HikingSpotCard({ spot, navigation }) {
  // Calculate full stars, half stars and empty stars
  const fullStars = Math.floor(spot.average_rating || 0);
  const halfStar = (spot.average_rating || 0) - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('HikingSpotDetails', { spotId: spot.id })}
      activeOpacity={0.9}
    >
      <Image 
        source={{ uri: spot.image_url }} 
        style={styles.cardImage} 
        resizeMode="cover"
      />
      <View style={styles.cardBadge}>
        <Text style={styles.cardBadgeText}>Hiking</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{spot.name}</Text>
        
        <View style={styles.cardDetails}>
          <View style={styles.ratingContainer}>
            {/* Render full stars */}
            {[...Array(fullStars)].map((_, i) => (
              <FontAwesome key={`star-${i}`} name="star" size={14} color="#FC4C02" style={{marginRight: 2}} />
            ))}
            
            {/* Render half star if needed */}
            {halfStar && <FontAwesome name="star-half-o" size={14} color="#FC4C02" style={{marginRight: 2}} />}
            
            {/* Render empty stars */}
            {[...Array(emptyStars)].map((_, i) => (
              <FontAwesome key={`empty-star-${i}`} name="star-o" size={14} color="#FC4C02" style={{marginRight: 2}} />
            ))}
            
            <Text style={styles.cardRatingCount}>
              {spot.average_rating ? `${spot.average_rating.toFixed(1)} (${spot.rating_count})` : 'No ratings'}
            </Text>
          </View>
          
          <View style={styles.locationContainer}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            <Text style={styles.cardLocation}>{spot.location}</Text>
          </View>
        </View>
        
        <Text style={styles.cardDescription} numberOfLines={2}>
          {spot.description}
        </Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.exploreButton}>
            <Text style={styles.exploreButtonText}>Explore</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#FC4C02" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function HomeContent({ navigation, user }) {
  const [hikingSpots, setHikingSpots] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchHikingSpots()
  }, [])

  async function fetchHikingSpots() {
    try {
      setLoading(true)
      
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
        .order('average_rating', { ascending: false })
      
      if (error) {
        throw error;
      }
      
      setHikingSpots(data || [])
    } catch (error) {
      console.error('Error fetching hiking spots:', error.message);
      Alert.alert('Connection Error', 
        'Unable to connect to the server. Please check your internet connection or try again later.'
      );
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchHikingSpots()
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FC4C02" />
        <Text style={styles.loadingText}>Loading hiking spots...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#FC4C02" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSubtitle}>Explore Cebu's best hiking trails</Text>
        </View>
        <TouchableOpacity style={styles.profileIcon}>
          <MaterialIcons name="account-circle" size={32} color="white" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#FC4C02"]}
            tintColor="#FC4C02"
          />
        }
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Rated Spots</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {hikingSpots.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trail-sign-outline" size={60} color="#DDD" />
            <Text style={styles.emptyText}>No hiking spots found</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchHikingSpots}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
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
    </SafeAreaView>
  )
}

function ProfileScreen({ user, profile, signOut }) {
  return (
    <SafeAreaView style={styles.profileContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#FC4C02" />
      
      <View style={styles.profileHeader}>
        <Text style={styles.profileHeaderTitle}>Profile</Text>
      </View>
      
      <View style={styles.profileContent}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {profile?.username ? profile.username.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <Text style={styles.profileUsername}>{profile?.username || "Username Not Set"}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        
        <View style={styles.profileStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Hikes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <MaterialIcons name="logout" size={20} color="white" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
        <ActivityIndicator size="large" color="#FC4C02" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#FC4C02',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
        tabBarStyle: {
          elevation: 0,
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          height: 60,
          paddingBottom: 10,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen 
        name="Discover" 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" color={color} size={size} />
          ),
        }}
      >
        {props => <HomeContent {...props} user={user} />}
      </Tab.Screen>
      
      <Tab.Screen 
        name="Track" 
        component={TrackScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="footsteps" color={color} size={size} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="Profile" 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
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
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 20,
    backgroundColor: '#FC4C02',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginTop: 2,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#FC4C02',
    fontWeight: '500',
  },
  cardsContainer: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardImage: {
    height: 180,
    width: '100%',
  },
  cardBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(252, 76, 2, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 30,
  },
  cardBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRatingCount: {
    marginLeft: 5,
    color: '#666',
    fontSize: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLocation: {
    color: '#666',
    fontSize: 12,
    marginLeft: 4,
  },
  cardDescription: {
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exploreButtonText: {
    color: '#FC4C02',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FC4C02',
    borderRadius: 30,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  
  // Profile Screen Styles
  profileContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  profileHeader: {
    backgroundColor: '#FC4C02',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 20,
    alignItems: 'center',
  },
  profileHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  profileContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 30,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FC4C02',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatarText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
  },
  profileUsername: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 30,
    marginBottom: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  signOutButton: {
    flexDirection: 'row',
    backgroundColor: '#FC4C02',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  }
})