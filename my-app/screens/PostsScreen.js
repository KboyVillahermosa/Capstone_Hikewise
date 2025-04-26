import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { supabase } from '../utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export default function PostsScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    getUser();
    fetchPosts();
    checkTablesExist(); // Add this line
  }, []);

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }

  async function fetchPosts() {
    setRefreshing(true);
    
    try {
      // First, get all posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        Alert.alert('Error', 'Failed to load posts');
        return;
      }

      // For each post, get the user details
      const enrichedPosts = await Promise.all(postsData.map(async (post) => {
        // Get profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', post.user_id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }
        
        // Get like count
        const { count: likeCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        // Get comment count
        const { count: commentCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        // Check if current user liked this post
        let isLiked = false;
        if (user) {
          const { data: likeData } = await supabase
            .from('likes')
            .select('*')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .single();
          
          isLiked = !!likeData;
        }
        
        return {
          ...post,
          profiles: profileData || { username: 'User', avatar_url: null },
          likeCount: likeCount || 0,
          commentCount: commentCount || 0,
          isLiked: isLiked
        };
      }));
      
      setPosts(enrichedPosts);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setRefreshing(false);
    }
  }

  async function checkTablesExist() {
    try {
      console.log('Checking if tables exist...');
      
      // Check posts table
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .limit(1);
      
      console.log('Posts table check:', postsError ? 'Error: ' + JSON.stringify(postsError) : 'Exists');
      
      // Check profiles table
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      console.log('Profiles table check:', profilesError ? 'Error: ' + JSON.stringify(profilesError) : 'Exists');
      
      // Check likes table
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('*')
        .limit(1);
      
      console.log('Likes table check:', likesError ? 'Error: ' + JSON.stringify(likesError) : 'Exists');
      
      // Check comments table
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .limit(1);
      
      console.log('Comments table check:', commentsError ? 'Error: ' + JSON.stringify(commentsError) : 'Exists');
      
      // Check current user profile exists
      if (user) {
        const { data: userProfile, error: userProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        console.log('User profile check:', userProfileError ? 'Error: ' + JSON.stringify(userProfileError) : 'Exists');
        
        // If user profile doesn't exist, create it
        if (userProfileError && userProfileError.code === 'PGRST116') {
          console.log('Creating user profile...');
          
          const { data, error } = await supabase
            .from('profiles')
            .insert([
              { id: user.id, username: 'User' + user.id.substring(0, 4) }
            ]);
          
          console.log('Profile creation:', error ? 'Error: ' + JSON.stringify(error) : 'Success');
        }
      }
    } catch (error) {
      console.error('Error checking tables:', error);
    }
  }

  async function pickImage() {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload images');
      return;
    }

    // Launch image picker
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  }

  async function uploadImage(uri) {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const filePath = `posts/${user.id}/${Date.now()}.jpg`;
      const contentType = 'image/jpeg';
      
      const { data, error } = await supabase.storage
        .from('post-images')
        .upload(filePath, decode(base64), { contentType });
      
      if (error) {
        throw error;
      }
      
      // Get the public URL for the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath);
        
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  async function createPost() {
    if (!newPostText.trim() && !selectedImage) {
      Alert.alert('Empty Post', 'Please add some text or an image to create a post');
      return;
    }
    
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to create a post');
      return;
    }
    
    setIsPosting(true);
    
    try {
      let imageUrl = null;
      
      // Upload image if one is selected
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }
      
      // Create the post record in the database
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          user_id: user.id,
          content: newPostText.trim(),
          image_url: imageUrl
        }])
        .select();
      
      if (error) {
        throw error;
      }
      
      Alert.alert('Success', 'Your post has been created!');
      setNewPostText('');
      setSelectedImage(null);
      fetchPosts(); // Refresh the posts list
      
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  }

  async function toggleLike(postId, isLiked) {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to like posts');
      return;
    }
    
    try {
      if (isLiked) {
        // Remove like
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
      } else {
        // Add like
        await supabase
          .from('likes')
          .insert([{
            user_id: user.id,
            post_id: postId
          }]);
      }
      
      // Update posts state
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1,
            isLiked: !isLiked
          };
        }
        return post;
      }));
      
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }

  function navigateToComments(postId) {
    navigation.navigate('Comments', { postId });
  }

  function navigateToProfile(userId) {
    navigation.navigate('Profile', { userId });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Add this header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Posts</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchPosts} />
        }
      >
        {/* Create Post Section */}
        <View style={styles.createPostContainer}>
          <TextInput
            style={styles.postInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#888"
            multiline={true}
            value={newPostText}
            onChangeText={setNewPostText}
          />
          
          {selectedImage && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.postActionBar}>
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={24} color="#2E7D32" />
              <Text style={styles.addImageText}>Add Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.postButton, (!newPostText.trim() && !selectedImage) && styles.postButtonDisabled]}
              onPress={createPost}
              disabled={isPosting || (!newPostText.trim() && !selectedImage)}
            >
              {isPosting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Posts List */}
        {posts.map(post => (
          <View key={post.id} style={styles.postCard}>
            <TouchableOpacity 
              style={styles.postHeader}
              onPress={() => navigateToProfile(post.user_id)}
            >
              <Image 
                source={{ 
                  uri: post.profiles?.avatar_url || 'https://www.gravatar.com/avatar/?d=mp' 
                }} 
                style={styles.avatar} 
              />
              <View>
                <Text style={styles.username}>{post.profiles?.username || 'User'}</Text>
                <Text style={styles.timestamp}>
                  {new Date(post.created_at).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
            
            {post.content && (
              <Text style={styles.postContent}>{post.content}</Text>
            )}
            
            {post.image_url && (
              <Image source={{ uri: post.image_url }} style={styles.postImage} />
            )}
            
            <View style={styles.postStats}>
              <Text style={styles.statsText}>
                {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'} • {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
              </Text>
            </View>
            
            <View style={styles.postActions}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => toggleLike(post.id, post.isLiked)}
              >
                <Ionicons 
                  name={post.isLiked ? "heart" : "heart-outline"} 
                  size={22} 
                  color={post.isLiked ? "#FF3B30" : "#666"} 
                />
                <Text style={[styles.actionText, post.isLiked && styles.likedText]}>Like</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigateToComments(post.id)}
              >
                <Ionicons name="chatbubble-outline" size={22} color="#666" />
                <Text style={styles.actionText}>Comment</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
        {posts.length === 0 && !refreshing && (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="trail-sign-outline" size={50} color="#ccc" />
            <Text style={styles.emptyStateText}>No posts yet</Text>
            <Text style={styles.emptyStateSubtext}>Be the first to share your hiking adventure!</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 30,
  },
  createPostContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  postInput: {
    minHeight: 80,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 10,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
  },
  postActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  addImageText: {
    marginLeft: 5,
    color: '#2E7D32',
    fontWeight: '500',
  },
  postButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  postButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  postButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  postCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 10,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  postContent: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  postStats: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
  },
  postActions: {
    flexDirection: 'row',
    padding: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  likedText: {
    color: '#FF3B30',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 5,
  },
});