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
  // Map database paths to corresponding image requires
  const getImageSource = (path) => {
    // Check if it's already a valid URL
    if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
      return { uri: path };
    }
    
    // Map relative paths to actual image requires
    const imageMap = {
      '../assets/images/spot1.jpg': require('../assets/images/spot1.jpg'),
      '../assets/images/spot2.jpg': require('../assets/images/spot2.jpg'),
      '../assets/images/spot3.jpg': require('../assets/images/spot3.jpg'),
      '../assets/images/spot4.jpg': require('../assets/images/spot4.jpg'),
      '../assets/images/spot5.jpg': require('../assets/images/spot5.jpg'),
    };
    
    // Use the mapped image if available, or the first image as a fallback
    try {
      return imageMap[path] || require('../assets/images/spot1.jpg');
    } catch (error) {
      console.log('Error loading image:', error);
      // If all else fails, return the first image we know exists
      return require('../assets/images/spot1.jpg');
    }
  };

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
        source={getImageSource(spot.image_url)} 
        style={styles.cardImage} 
        resizeMode="cover"
        onError={() => console.log('Failed to load image:', spot.image_url)}
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
              <FontAwesome key={`star-${i}`} name="star" size={14} color="#2E7D32" style={{marginRight: 2}} />
            ))}
            
            {/* Render half star if needed */}
            {halfStar && <FontAwesome name="star-half-o" size={14} color="#2E7D32" style={{marginRight: 2}} />}
            
            {/* Render empty stars */}
            {[...Array(emptyStars)].map((_, i) => (
              <FontAwesome key={`empty-star-${i}`} name="star-o" size={14} color="#2E7D32" style={{marginRight: 2}} />
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
            <MaterialIcons name="arrow-forward" size={16} color="#1976D2" />
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
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading hiking spots...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <Text style={styles.headerTagline}>HikeWise</Text>
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.headerSubtitle}>Explore Cebu's best hiking trails</Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#2E7D32"]}
            tintColor="#2E7D32"
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

      <TouchableOpacity 
        style={styles.fabButton}
        onPress={() => navigation.navigate('Posts')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

function ProfileScreen({ user, profile, signOut, navigation }) {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [bio, setBio] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      if (!user) return;
      
      // Fetch user profile with bio and avatar_url
      const { data, error } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url')
        .eq('id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }
      
      if (data) {
        setBio(data.bio || 'No bio yet. Tap edit to add your bio.');
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }

  const navigateToEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const navigateToChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  return (
    <SafeAreaView style={styles.profileContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
      
      <View style={styles.profileHeader}>
        <Text style={styles.profileHeaderTitle}>Profile</Text>
      </View>
      
      <ScrollView style={styles.profileScrollView}>
        <View style={styles.profileContent}>
          {/* Profile image */}
          {avatarUrl ? (
            <Image 
              source={{ uri: avatarUrl }} 
              style={styles.profileAvatar}
              onError={() => setAvatarUrl(null)}
            />
          ) : (
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {profile?.username ? profile.username.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          
          <Text style={styles.profileUsername}>{profile?.username || "Username Not Set"}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          
          {/* Bio section */}
          <View style={styles.bioContainer}>
            <Text style={styles.bioTitle}>About Me</Text>
            <Text style={styles.bioText}>{bio}</Text>
          </View>
          
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
          
          {/* Edit Profile Button */}
          <TouchableOpacity 
            style={styles.profileActionButton}
            onPress={navigateToEditProfile}
          >
            <Ionicons name="create-outline" size={20} color="white" />
            <Text style={styles.profileActionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          
          {/* Change Password Button */}
          <TouchableOpacity 
            style={styles.profileActionButton}
            onPress={navigateToChangePassword}
          >
            <Ionicons name="key-outline" size={20} color="white" />
            <Text style={styles.profileActionButtonText}>Change Password</Text>
          </TouchableOpacity>
          
          {/* Sign Out Button */}
          <TouchableOpacity 
            style={[styles.profileActionButton, styles.signOutButton]} 
            onPress={signOut}
          >
            <MaterialIcons name="logout" size={20} color="white" />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#388E3C', // Dark green for active tabs
        tabBarInactiveTintColor: '#9E9E9E', // Medium gray for inactive
        headerShown: false,
        tabBarStyle: {
          elevation: 0,
          borderTopWidth: 0, 
          height: 60,
          paddingBottom: 10,
          paddingTop: 5,
          backgroundColor: '#FFFFFF',
          shadowColor: 'transparent',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: -5,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
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
            navigation={navigation}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Pure white for minimalist feel
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#9E9E9E',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 30,
    paddingBottom: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 40, // Even larger
    fontWeight: '700',
    color: '#212121', // Almost black
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -1, // Tighter letter spacing for modern look
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerTagline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#388E3C', // Darker green for better readability
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1, // Wider letter spacing for tagline
    textTransform: 'uppercase', // Uppercase for modern look
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#9E9E9E', // Medium gray
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
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
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  seeAllText: {
    fontSize: 13,
    color: '#388E3C', // Darker green
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  cardsContainer: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 0, // Remove elevation for flatter design
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderWidth: 1, // Add subtle border
    borderColor: '#F5F5F5', // Very light border
  },
  cardImage: {
    height: 200, // Taller image
    width: '100%',
  },
  cardBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(33, 33, 33, 0.85)', // Dark black with transparency
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 30,
  },
  cardBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRatingCount: {
    marginLeft: 5,
    color: '#9E9E9E',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLocation: {
    color: '#9E9E9E',
    fontSize: 12,
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  cardDescription: {
    color: '#616161',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
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
    color: '#388E3C', // Darker green
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9E9E9E',
    marginTop: 16,
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#388E3C', // Darker green instead of black
    borderRadius: 30,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  
  // Profile Screen Styles
  profileContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  profileHeader: {
    backgroundColor: '#FFFFFF', // White header for minimalist look
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 30,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profileHeaderTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  profileScrollView: {
    flex: 1,
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
    backgroundColor: '#EEEEEE', // Light gray background for avatar
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  profileAvatarText: {
    fontSize: 42,
    fontWeight: '600',
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  profileUsername: {
    fontSize: 26,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  profileEmail: {
    fontSize: 16,
    color: '#9E9E9E',
    marginBottom: 30,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  bioContainer: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  bioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#388E3C', // Darker green
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  bioText: {
    fontSize: 15,
    color: '#616161',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
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
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  statLabel: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  profileActionButton: {
    flexDirection: 'row',
    backgroundColor: '#388E3C', // Darker green for buttons
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    width: '85%',
  },
  profileActionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  signOutButton: {
    marginTop: 20,
    backgroundColor: '#F44336', // Red for caution
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#388E3C', // Darker green for floating action button
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
})