import { useState, useEffect } from 'react'
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StatusBar,
  SafeAreaView
} from 'react-native'
import { supabase } from '../utils/supabase'
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons'
import MapView, { Marker } from 'react-native-maps'

// Define a consistent color palette
const COLORS = {
  primary: '#FC4C02',       // Orange brand color (Strava orange)
  secondary: '#FC4C02',     // Changed from green to match Strava orange
  text: '#333333',          // Dark gray for text
  textLight: '#666666',     // Lighter gray for secondary text
  textMuted: '#888888',     // Very light gray for tertiary text
  background: '#FFFFFF',    // White background
  card: '#F8F8F8',          // Light gray for cards
  separator: '#EEEEEE',     // Very light gray for separators
  star: '#FC4C02',          // Changed from gold to Strava orange
  error: '#DC3545',         // Red for errors
  success: '#28A745',       // Green for success
  mapPlaceholder: '#F0F0F0' // Light gray for map placeholder
}

export default function HikingSpotDetailsScreen({ route, navigation }) {
  const { spotId } = route.params
  const [spot, setSpot] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [userRating, setUserRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState(null)
  const [coordinates, setCoordinates] = useState(null)
  const [userEmails, setUserEmails] = useState({});

  const getImageSource = (path) => {
    if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
      return { uri: path };
    }
    
    const imageMap = {
      '../assets/images/spot1.jpg': require('../assets/images/spot1.jpg'),
      '../assets/images/spot2.jpg': require('../assets/images/spot2.jpg'),
      '../assets/images/spot3.jpg': require('../assets/images/spot3.jpg'),
      '../assets/images/spot4.jpg': require('../assets/images/spot4.jpg'),
      '../assets/images/spot5.jpg': require('../assets/images/spot5.jpg'),
    };
    
    try {
      return imageMap[path] || require('../assets/images/spot1.jpg');
    } catch (error) {
      console.log('Error loading image:', error);
      return require('../assets/images/spot1.jpg');
    }
  };

  useEffect(() => {
    fetchSpotDetails()
    fetchUser()
  }, [spotId])

  async function fetchUser() {
    const { data } = await supabase.auth.getUser()
    if (data?.user) {
      setUser(data.user)
    }
  }

  async function fetchUserEmails(commentData) {
    if (!commentData.length || !user) return;
    
    try {
      const emails = {};
      
      if (user.email) {
        emails[user.id] = user.email;
      }
      
      setUserEmails(emails);
    } catch (error) {
      console.error("Error fetching user emails:", error);
    }
  }

  async function fetchSpotDetails() {
    try {
      setLoading(true)
      
      const { data: spotData, error: spotError } = await supabase
        .from('hiking_spots')
        .select('*')
        .eq('id', spotId)
        .single()
      
      if (spotError) throw spotError
      setSpot(spotData)
      
      const { data: commentData, error: commentError } = await supabase
        .from('hiking_spot_comments')
        .select(`
          id,
          comment,
          rating,
          created_at,
          user_id,
          profiles:user_id(username)
        `)
        .eq('hiking_spot_id', spotId)
        .order('created_at', { ascending: false })
      
      if (commentError) throw commentError
      setComments(commentData)
      
      fetchUserEmails(commentData);

      if (spotData.latitude && spotData.longitude) {
        setCoordinates({
          latitude: spotData.latitude,
          longitude: spotData.longitude
        })
      } else {
        setCoordinates({ latitude: 10.3157, longitude: 123.8854 })
      }
      
    } catch (error) {
      console.error('Error fetching spot details:', error.message)
      Alert.alert('Error', 'Failed to load hiking spot details')
    } finally {
      setLoading(false)
    }
  }

  async function submitComment() {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to leave a review')
      return
    }
    
    if (!userRating) {
      Alert.alert('Rating Required', 'Please select a rating')
      return
    }
    
    if (!commentText.trim()) {
      Alert.alert('Comment Required', 'Please share your experience')
      return
    }
    
    try {
      setSubmitting(true)
      
      const { error } = await supabase
        .from('hiking_spot_comments')
        .insert({
          hiking_spot_id: spotId,
          user_id: user.id,
          comment: commentText.trim(),
          rating: userRating
        })
      
      if (error) throw error
      
      setCommentText('')
      setUserRating(0)
      
      fetchSpotDetails()
      
      Alert.alert('Success', 'Your review has been submitted!')
    } catch (error) {
      console.error('Error submitting comment:', error.message)
      Alert.alert('Error', 'Failed to submit your review')
    } finally {
      setSubmitting(false)
    }
  }

  const openInMaps = (coords, label) => {
    const { latitude, longitude } = coords;
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${latitude},${longitude}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    
    Linking.openURL(url);
  };

  function RatingStars({ rating, onRatingChange, disabled = false, size = 24 }) {
    return (
      <View style={styles.ratingStarsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity 
            key={star}
            disabled={disabled}
            onPress={() => onRatingChange && onRatingChange(star)}
            style={styles.starButton}
          >
            <FontAwesome 
              name={star <= rating ? "star" : "star-o"} 
              size={size} 
              color={COLORS.star} 
            />
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading spot details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!spot) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={60} color={COLORS.error} />
          <Text style={styles.errorText}>Hiking spot not found</Text>
          <TouchableOpacity 
            style={styles.goBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image 
            source={getImageSource(spot.image_url)}
            style={styles.heroImage} 
            resizeMode="cover"
          />
          
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{spot.name}</Text>
          
          <View style={styles.ratingRow}>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>
                {spot.average_rating ? spot.average_rating.toFixed(1) : 'N/A'} 
              </Text>
              <FontAwesome name="star" size={18} color={COLORS.star} />
              <Text style={styles.ratingCount}>
                ({spot.rating_count || 0} {spot.rating_count === 1 ? 'rating' : 'ratings'})
              </Text>
            </View>
          </View>
          
          <View style={styles.locationContainer}>
            <MaterialIcons name="location-on" size={18} color={COLORS.textLight} />
            <Text style={styles.location}>{spot.location}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{spot.description}</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            {coordinates ? (
              <View style={styles.mapSection}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  provider="google"
                >
                  <Marker
                    coordinate={coordinates}
                    title={spot.name}
                    description={spot.location}
                    pinColor={COLORS.primary}
                  />
                </MapView>
                <TouchableOpacity 
                  style={styles.directionsButton}
                  onPress={() => openInMaps(coordinates, spot.name)}
                >
                  <Text style={styles.directionsButtonText}>Get Directions</Text>
                  <MaterialIcons name="directions" size={18} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map-outline" size={40} color={COLORS.textMuted} />
                <Text style={styles.mapPlaceholderText}>
                  Map location not available
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Write a Review</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.ratingLabel}>Your Rating:</Text>
              <RatingStars rating={userRating} onRatingChange={setUserRating} />
              
              <TextInput
                style={styles.commentInput}
                placeholder="Share your experience..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
                textAlignVertical="top"
                placeholderTextColor={COLORS.textMuted}
              />
              
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled
                ]}
                onPress={submitComment}
                disabled={submitting}
              >
                {submitting ? (
                  <View style={styles.submitButtonContent}>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </View>
                ) : (
                  <View style={styles.submitButtonContent}>
                    <Text style={styles.submitButtonText}>Submit Review</Text>
                    <Ionicons name="send" size={16} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Reviews {comments.length > 0 && `(${comments.length})`}
            </Text>
            
            {comments.length === 0 ? (
              <View style={styles.emptyReviewsContainer}>
                <Ionicons name="chatbubble-ellipses-outline" size={40} color={COLORS.textMuted} />
                <Text style={styles.noReviewsText}>No reviews yet. Be the first to review!</Text>
              </View>
            ) : (
              <View style={styles.reviewsContainer}>
                {comments.map(comment => (
                  <View key={comment.id} style={styles.commentCard}>
                    <View style={styles.commentHeader}>
                      <View style={styles.userInfo}>
                        <View style={styles.userAvatar}>
                          <Text style={styles.userInitial}>
                            {comment.profiles?.username 
                              ? comment.profiles.username[0].toUpperCase() 
                              : (userEmails[comment.user_id] ? userEmails[comment.user_id][0].toUpperCase() : 'A')}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.commentUser}>
                            {comment.profiles?.username || 
                            (userEmails[comment.user_id] ? userEmails[comment.user_id] : 'Anonymous')}
                          </Text>
                          <Text style={styles.commentDate}>
                            {new Date(comment.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.ratingBadge}>
                        <Text style={styles.ratingBadgeText}>{comment.rating.toFixed(1)}</Text>
                        <FontAwesome name="star" size={12} color="white" style={styles.ratingBadgeStar} />
                      </View>
                    </View>
                    <View style={styles.commentBodyContainer}>
                      <Text style={styles.commentText}>{comment.comment}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  imageContainer: {
    position: 'relative',
    height: 280,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.text,
    marginVertical: 20,
  },
  goBackButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    minWidth: 120,
    elevation: 2,
  },
  goBackButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  heroImage: {
    height: '100%',
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 35,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  contentContainer: {
    padding: 20,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginRight: 5,
  },
  ratingCount: {
    color: COLORS.textLight,
    marginLeft: 5,
    fontSize: 14,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  location: {
    fontSize: 16,
    color: COLORS.textLight,
    marginLeft: 5,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.separator,
    marginVertical: 10,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text,
  },
  mapSection: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: COLORS.mapPlaceholder,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapPlaceholderText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    marginTop: 10,
  },
  map: {
    height: 200,
    width: '100%',
    borderRadius: 12,
  },
  directionsButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    margin: 10,
    borderRadius: 8,
  },
  directionsButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 8,
  },
  reviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  ratingLabel: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
  },
  ratingStarsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  starButton: {
    padding: 2,
    marginRight: 6,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: COLORS.separator,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: COLORS.background,
    color: COLORS.text,
  },
  submitButton: {
    backgroundColor: COLORS.primary, // Changed to Strava orange
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginHorizontal: 8,
  },
  emptyReviewsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.separator,
    borderStyle: 'dashed',
  },
  noReviewsText: {
    fontStyle: 'italic',
    color: COLORS.textMuted,
    marginTop: 10,
    textAlign: 'center',
  },
  reviewsContainer: {
    gap: 15,
  },
  commentCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 0, // Remove padding to allow for more modular styling
    overflow: 'hidden',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: COLORS.separator,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.separator,
    backgroundColor: 'rgba(252, 76, 2, 0.05)', // Very light Strava orange background
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '80%', // Prevent long usernames from pushing the rating off screen
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitial: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  commentUser: {
    fontWeight: 'bold',
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 2,
  },
  commentDate: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  ratingBadge: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    minWidth: 50,
  },
  ratingBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 3,
  },
  ratingBadgeStar: {
    marginBottom: 1, // Slight alignment adjustment
  },
  commentBodyContainer: {
    padding: 15,
    backgroundColor: COLORS.background,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
  },
})