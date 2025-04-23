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
  Alert
} from 'react-native'
import { supabase } from '../utils/supabase'
import { MaterialIcons, FontAwesome } from '@expo/vector-icons'

export default function HikingSpotDetailsScreen({ route, navigation }) {
  const { spotId } = route.params
  const [spot, setSpot] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [userRating, setUserRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState(null)

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

  async function fetchSpotDetails() {
    try {
      setLoading(true)
      
      // Fetch hiking spot details
      const { data: spotData, error: spotError } = await supabase
        .from('hiking_spots')
        .select('*')
        .eq('id', spotId)
        .single()
      
      if (spotError) throw spotError
      setSpot(spotData)
      
      // Fetch comments
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
      
    } catch (error) {
      console.error('Error fetching spot details:', error.message)
      Alert.alert('Error', 'Failed to load hiking spot details')
    } finally {
      setLoading(false)
    }
  }

  async function submitComment() {
    if (!userRating) {
      Alert.alert('Error', 'Please select a rating')
      return
    }
    
    if (!commentText.trim()) {
      Alert.alert('Error', 'Please enter a comment')
      return
    }
    
    try {
      setSubmitting(true)
      
      // Add comment
      const { error } = await supabase
        .from('hiking_spot_comments')
        .insert({
          hiking_spot_id: spotId,
          user_id: user.id,
          comment: commentText.trim(),
          rating: userRating
        })
      
      if (error) throw error
      
      // Clear form
      setCommentText('')
      setUserRating(0)
      
      // Refresh data
      fetchSpotDetails()
      
      Alert.alert('Success', 'Your review has been submitted!')
    } catch (error) {
      console.error('Error submitting comment:', error.message)
      Alert.alert('Error', 'Failed to submit your review')
    } finally {
      setSubmitting(false)
    }
  }

  function RatingStars({ rating, onRatingChange, disabled = false }) {
    return (
      <View style={styles.ratingStarsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity 
            key={star}
            disabled={disabled}
            onPress={() => onRatingChange && onRatingChange(star)}
          >
            <FontAwesome 
              name={star <= rating ? "star" : "star-o"} 
              size={24} 
              color="#FFD700" 
              style={styles.ratingStar}
            />
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading spot details...</Text>
      </View>
    )
  }

  if (!spot) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Hiking spot not found</Text>
        <TouchableOpacity 
          style={styles.goBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <Image 
        source={{ uri: spot.image_url }} 
        style={styles.heroImage} 
        resizeMode="cover"
      />
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <MaterialIcons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{spot.name}</Text>
        
        <View style={styles.ratingRow}>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>
              {spot.average_rating ? spot.average_rating.toFixed(1) : 'N/A'} 
            </Text>
            <FontAwesome name="star" size={18} color="#FFD700" />
            <Text style={styles.ratingCount}>({spot.rating_count || 0} ratings)</Text>
          </View>
        </View>
        
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={18} color="#666" />
          <Text style={styles.location}>{spot.location}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{spot.description}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>
              Map will be displayed here. You'll need to implement Google Maps integration.
            </Text>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Write a Review</Text>
          <Text style={styles.ratingLabel}>Your Rating:</Text>
          <RatingStars rating={userRating} onRatingChange={setUserRating} />
          
          <TextInput
            style={styles.commentInput}
            placeholder="Share your experience..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
            textAlignVertical="top"
          />
          
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={submitComment}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          
          {comments.length === 0 ? (
            <Text style={styles.noReviewsText}>No reviews yet. Be the first to review!</Text>
          ) : (
            comments.map(comment => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUser}>
                    {comment.profiles?.username || 'Anonymous'}
                  </Text>
                  <RatingStars rating={comment.rating} disabled />
                </View>
                <Text style={styles.commentDate}>
                  {new Date(comment.created_at).toLocaleDateString()}
                </Text>
                <Text style={styles.commentText}>{comment.comment}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
  },
  goBackButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  goBackButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  heroImage: {
    height: 250,
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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
    marginRight: 5,
  },
  ratingCount: {
    color: '#666',
    marginLeft: 5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  location: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapPlaceholderText: {
    textAlign: 'center',
    color: '#666',
  },
  ratingLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  ratingStarsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  ratingStar: {
    marginRight: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 16,
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  noReviewsText: {
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 10,
  },
  commentCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  commentUser: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  commentDate: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 20,
  },
})