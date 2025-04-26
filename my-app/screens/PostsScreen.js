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
import { Video } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';

export default function PostsScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    getUser();
    checkTablesExist();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchPosts();
    }, [user])
  );

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }

  async function fetchPosts() {
    if (!user) return;
    
    setRefreshing(true);
    
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        Alert.alert('Error', 'Failed to load posts');
        return;
      }

      const { data: userLikes, error: userLikesError } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id);
        
      if (userLikesError && userLikesError.code !== 'PGRST116') {
        console.error('Error fetching user likes:', userLikesError);
      }
      
      const likedPostIds = new Set(userLikes?.map(like => like.post_id) || []);

      const enrichedPosts = await Promise.all(postsData.map(async (post) => {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', post.user_id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }
        
        const { count: likeCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        const { count: commentCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        const isLiked = likedPostIds.has(post.id);
        
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
      console.log('Checking if tables and buckets exist...');
      
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .limit(1);
      
      console.log('Posts table check:', postsError ? 'Error: ' + JSON.stringify(postsError) : 'Exists');
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      console.log('Profiles table check:', profilesError ? 'Error: ' + JSON.stringify(profilesError) : 'Exists');
      
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('*')
        .limit(1);
      
      console.log('Likes table check:', likesError ? 'Error: ' + JSON.stringify(likesError) : 'Exists');
      
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .limit(1);
      
      console.log('Comments table check:', commentsError ? 'Error: ' + JSON.stringify(commentsError) : 'Exists');
      
      if (user) {
        const { data: userProfile, error: userProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        console.log('User profile check:', userProfileError ? 'Error: ' + JSON.stringify(userProfileError) : 'Exists');
        
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
      
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError);
        return;
      }
      
      const storageBucketExists = buckets && buckets.some(bucket => bucket.name === 'storage');
      console.log(`Storage bucket exists: ${storageBucketExists ? 'Yes' : 'No'}`);
      
    } catch (error) {
      console.error('Error checking tables and buckets:', error);
    }
  }

  async function pickMedia(mediaType = 'all') {
    const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (mediaLibraryStatus !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your media library');
      return;
    }
    
    if (mediaType === 'video' || mediaType === 'all') {
      const { status: cameraRollStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraRollStatus !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your camera');
        return;
      }
    }

    const options = {
      mediaTypes: 
        mediaType === 'image' 
          ? ImagePicker.MediaTypeOptions.Images 
          : mediaType === 'video' 
            ? ImagePicker.MediaTypeOptions.Videos 
            : ImagePicker.MediaTypeOptions.All,
      allowsEditing: mediaType !== 'all',
      aspect: [4, 3],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    };

    const result = await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets) {
      setSelectedMedia(prevMedia => {
        const combinedMedia = [...prevMedia, ...result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type || (asset.uri.endsWith('.mp4') ? 'video' : 'image'),
          filename: asset.fileName || `file-${Date.now()}`
        }))];
        
        return combinedMedia.slice(0, 10);
      });
    }
  }

  async function uploadMedia(mediaFiles) {
    try {
      console.log('Starting media upload process...');
      
      const bucketName = 'storage';
      console.log(`Using bucket: ${bucketName}`);
      
      const uploadPromises = mediaFiles.map(async (media, index) => {
        console.log(`Processing media file ${index + 1}/${mediaFiles.length}, type: ${media.type}`);
        
        const base64 = await FileSystem.readAsStringAsync(media.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const isVideo = media.type === 'video';
        const extension = isVideo ? 'mp4' : 'jpg';
        const contentType = isVideo ? 'video/mp4' : 'image/jpeg';
        
        const folderPath = isVideo ? 'videos' : 'images';
        const filePath = `${folderPath}/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
        
        console.log(`Uploading to ${bucketName}/${filePath}`);
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, decode(base64), { contentType });
        
        if (error) {
          console.error(`Upload error for file ${index + 1}:`, error);
          throw error;
        }
        
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);
        
        const publicUrl = urlData?.publicUrl;
        console.log(`Successfully uploaded file ${index + 1}, URL: ${publicUrl}`);
        
        return {
          url: publicUrl,
          type: media.type
        };
      });
      
      const results = await Promise.all(uploadPromises);
      console.log(`Successfully uploaded ${results.length} files`);
      return results;
    } catch (error) {
      console.error('Error in uploadMedia function:', error);
      throw error;
    }
  }

  async function createPost() {
    if (!newPostText.trim() && selectedMedia.length === 0) {
      Alert.alert('Empty Post', 'Please add some text or media to create a post');
      return;
    }
    
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to create a post');
      return;
    }
    
    setIsPosting(true);
    
    try {
      let mediaUrls = [];
      
      if (selectedMedia.length > 0) {
        try {
          console.log(`Uploading ${selectedMedia.length} media files...`);
          mediaUrls = await uploadMedia(selectedMedia);
          console.log(`Successfully uploaded ${mediaUrls.length} files`);
        } catch (uploadError) {
          console.error('Media upload failed:', uploadError);
          Alert.alert(
            'Upload Error', 
            'Failed to upload media. Please try again later or check your internet connection.'
          );
          setIsPosting(false);
          return;
        }
      }
      
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          user_id: user.id,
          content: newPostText.trim(),
          media: mediaUrls.length > 0 ? mediaUrls : null
        }])
        .select();
      
      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }
      
      Alert.alert('Success', 'Your post has been created!');
      setNewPostText('');
      setSelectedMedia([]);
      fetchPosts();
      
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again later.');
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
      const currentPost = posts.find(post => post.id === postId);
      if (!currentPost) return;
      
      if (currentPost.likeInProgress) return;
      
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return { ...post, likeInProgress: true };
        }
        return post;
      }));
      
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
          
        if (error) throw error;
      } else {
        const { data: existingLike } = await supabase
          .from('likes')
          .select('*')
          .eq('user_id', user.id)
          .eq('post_id', postId)
          .single();
          
        if (!existingLike) {
          const { error } = await supabase
            .from('likes')
            .insert([{
              user_id: user.id,
              post_id: postId
            }]);
            
          if (error) throw error;
        }
      }
      
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likeCount: isLiked ? Math.max(0, post.likeCount - 1) : post.likeCount + 1,
            isLiked: !isLiked,
            likeInProgress: false
          };
        }
        return post;
      }));
      
    } catch (error) {
      console.error('Error toggling like:', error);
      
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return { ...post, likeInProgress: false };
        }
        return post;
      }));
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
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchPosts} />
        }
      >
        <View style={styles.createPostContainer}>
          <TextInput
            style={styles.postInput}
            placeholder="Share your hiking adventure..."
            placeholderTextColor="#A0A0A0"
            multiline={true}
            value={newPostText}
            onChangeText={setNewPostText}
          />
          
          {selectedMedia.length > 0 && (
            <View style={styles.mediaPreviewContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mediaPreviewScrollContent}
              >
                {selectedMedia.map((media, index) => (
                  <View key={index} style={styles.mediaPreviewWrapper}>
                    {media.type === 'video' ? (
                      <View style={styles.mediaPreviewVideoContainer}>
                        <Video
                          source={{ uri: media.uri }}
                          style={styles.mediaPreview}
                          resizeMode="cover"
                          shouldPlay={false}
                          isLooping={false}
                          usePoster={true}
                        />
                        <View style={styles.mediaTypeIndicator}>
                          <Ionicons name="videocam" size={14} color="#FFFFFF" />
                        </View>
                      </View>
                    ) : (
                      <Image source={{ uri: media.uri }} style={styles.mediaPreview} />
                    )}
                    <TouchableOpacity 
                      style={styles.removeMediaButton}
                      onPress={() => {
                        setSelectedMedia(prevMedia => prevMedia.filter((_, i) => i !== index));
                      }}
                    >
                      <Ionicons name="close-circle-sharp" size={22} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          
          <View style={styles.postActionBar}>
            <View style={styles.mediaButtons}>
              <TouchableOpacity style={styles.addMediaButton} onPress={() => pickMedia('image')}>
                <Ionicons name="image-outline" size={20} color="#4A6572" />
                <Text style={styles.addMediaText}>Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.addMediaButton} onPress={() => pickMedia('video')}>
                <Ionicons name="videocam-outline" size={20} color="#4A6572" />
                <Text style={styles.addMediaText}>Video</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.addMediaButton} onPress={() => pickMedia('all')}>
                <Ionicons name="images-outline" size={20} color="#4A6572" />
                <Text style={styles.addMediaText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.postButton, (!newPostText.trim() && selectedMedia.length === 0) && styles.postButtonDisabled]}
              onPress={createPost}
              disabled={isPosting || (!newPostText.trim() && selectedMedia.length === 0)}
            >
              {isPosting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
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
            
            {(post.media || post.media_urls) && (
              <View style={styles.postMediaContainer}>
                {(() => {
                  const mediaArray = post.media || post.media_urls || [];
                  if (!mediaArray || mediaArray.length === 0) return null;
                  
                  if (mediaArray.length === 1) {
                    const media = mediaArray[0];
                    return media.type === 'video' ? (
                      <View style={styles.videoWrapper}>
                        <Video
                          source={{ uri: media.url }}
                          style={styles.singlePostMedia}
                          useNativeControls
                          resizeMode="contain"
                          isLooping
                          shouldPlay={false}
                          usePoster={true}
                        />
                        <View style={styles.singleVideoIndicator}>
                          <Ionicons name="play-circle" size={40} color="#fff" />
                        </View>
                      </View>
                    ) : (
                      <Image 
                        source={{ uri: media.url }} 
                        style={styles.singlePostMedia} 
                        resizeMode="cover"
                      />
                    );
                  }
                  
                  if (mediaArray.length === 2) {
                    return (
                      <View style={styles.mediaGrid}>
                        {mediaArray.map((media, index) => (
                          <TouchableOpacity 
                            key={index} 
                            style={styles.gridItemHalf}
                            onPress={() => navigation.navigate('MediaViewer', { media: mediaArray, initialIndex: index })}
                          >
                            {media.type === 'video' ? (
                              <View style={styles.videoContainer}>
                                <Image 
                                  source={{ uri: media.url }} 
                                  style={styles.gridMedia} 
                                />
                                <View style={styles.videoIndicator}>
                                  <Ionicons name="play-circle" size={28} color="#fff" />
                                </View>
                              </View>
                            ) : (
                              <Image 
                                source={{ uri: media.url }} 
                                style={styles.gridMedia} 
                              />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  }
                  
                  if (mediaArray.length === 3) {
                    return (
                      <View style={styles.mediaGridThree}>
                        <TouchableOpacity 
                          style={styles.gridItemLarge}
                          onPress={() => navigation.navigate('MediaViewer', { media: mediaArray, initialIndex: 0 })}
                        >
                          {mediaArray[0].type === 'video' ? (
                            <View style={styles.videoContainer}>
                              <Image source={{ uri: mediaArray[0].url }} style={styles.gridMedia} />
                              <View style={styles.videoIndicator}>
                                <Ionicons name="play-circle" size={28} color="#fff" />
                              </View>
                            </View>
                          ) : (
                            <Image source={{ uri: mediaArray[0].url }} style={styles.gridMedia} />
                          )}
                        </TouchableOpacity>
                        
                        <View style={styles.gridItemStackContainer}>
                          {mediaArray.slice(1, 3).map((media, index) => (
                            <TouchableOpacity 
                              key={index} 
                              style={styles.gridItemStack}
                              onPress={() => navigation.navigate('MediaViewer', { media: mediaArray, initialIndex: index + 1 })}
                            >
                              {media.type === 'video' ? (
                                <View style={styles.videoContainer}>
                                  <Image source={{ uri: media.url }} style={styles.gridMedia} />
                                  <View style={styles.videoIndicator}>
                                    <Ionicons name="play-circle" size={22} color="#fff" />
                                  </View>
                                </View>
                              ) : (
                                <Image source={{ uri: media.url }} style={styles.gridMedia} />
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    );
                  }
                  
                  return (
                    <View style={styles.mediaGridFour}>
                      {mediaArray.slice(0, 4).map((media, index) => (
                        <TouchableOpacity 
                          key={index} 
                          style={styles.gridItemQuarter}
                          onPress={() => navigation.navigate('MediaViewer', { media: mediaArray, initialIndex: index })}
                        >
                          {media.type === 'video' ? (
                            <View style={styles.videoContainer}>
                              <Image source={{ uri: media.url }} style={styles.gridMedia} />
                              <View style={styles.videoIndicator}>
                                <Ionicons name="play-circle" size={22} color="#fff" />
                              </View>
                            </View>
                          ) : (
                            <Image source={{ uri: media.url }} style={styles.gridMedia} />
                          )}
                          
                          {mediaArray.length > 4 && index === 3 && (
                            <View style={styles.moreIndicator}>
                              <Text style={styles.moreIndicatorText}>+{mediaArray.length - 4}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })()}
              </View>
            )}
            
            <View style={styles.postStats}>
              <Text style={styles.statsText}>
                {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'} • {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
              </Text>
            </View>
            
            <View style={styles.postActions}>
              <TouchableOpacity 
                style={[styles.actionButton, post.likeInProgress && styles.actionButtonDisabled]} 
                onPress={() => toggleLike(post.id, post.isLiked)}
                disabled={post.likeInProgress}
              >
                <Ionicons 
                  name={post.isLiked ? "heart" : "heart-outline"} 
                  size={20} 
                  color={post.isLiked ? "#E57373" : "#757575"} 
                />
                <Text style={[styles.actionText, post.isLiked && styles.likedText]}>Like</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigateToComments(post.id)}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#757575" />
                <Text style={styles.actionText}>Comment</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
        {posts.length === 0 && !refreshing && (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="trail-sign-outline" size={56} color="#CFD8DC" />
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
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 50 : 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 6,
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#263238',
  },
  headerRight: {
    width: 30,
  },
  createPostContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  postInput: {
    minHeight: 85,
    fontSize: 16,
    color: '#37474F',
    textAlignVertical: 'top',
    padding: 4,
  },
  mediaPreviewContainer: {
    marginTop: 12,
    marginBottom: 6,
  },
  mediaPreviewScrollContent: {
    paddingRight: 6,
  },
  mediaPreviewWrapper: {
    position: 'relative',
    marginRight: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  mediaPreviewVideoContainer: {
    position: 'relative',
  },
  mediaPreview: {
    width: 110,
    height: 110,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  mediaTypeIndicator: {
    position: 'absolute',
    bottom: 6, 
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 3,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 2,
  },
  postActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
  },
  mediaButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginRight: 10,
    borderRadius: 8,
  },
  addMediaText: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: '500',
    color: '#4A6572',
  },
  postButton: {
    backgroundColor: '#3F51B5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 25,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#C5CAE9',
  },
  postButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  username: {
    fontWeight: '600',
    fontSize: 15,
    color: '#263238',
  },
  timestamp: {
    fontSize: 12,
    color: '#78909C',
    marginTop: 2,
  },
  postContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 15,
    color: '#37474F',
    lineHeight: 22,
  },
  postMediaContainer: {
    width: '100%', 
  },
  singlePostMedia: {
    width: '100%',
    height: 320,
    resizeMode: 'cover',
  },
  videoWrapper: {
    position: 'relative',
  },
  singleVideoIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    zIndex: 1,
  },
  mediaGrid: {
    flexDirection: 'row',
    width: '100%',
    height: 300,
  },
  gridItemHalf: {
    width: '50%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#fff',
  },
  mediaGridThree: {
    flexDirection: 'row',
    width: '100%',
    height: 300,
  },
  gridItemLarge: {
    width: '66.66%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#fff',
  },
  gridItemStackContainer: {
    width: '33.33%',
    height: '100%',
  },
  gridItemStack: {
    width: '100%',
    height: '50%',
    borderWidth: 1,
    borderColor: '#fff',
  },
  mediaGridFour: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: 300,
  },
  gridItemQuarter: {
    width: '50%',
    height: '50%',
    borderWidth: 1,
    borderColor: '#fff',
  },
  gridMedia: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -14 }, { translateY: -14 }],
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
  },
  moreIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIndicatorText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  postStats: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ECEFF1',
  },
  statsText: {
    fontSize: 13,
    color: '#78909C',
  },
  postActions: {
    flexDirection: 'row',
    padding: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
  },
  likedText: {
    color: '#E57373',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#90A4AE',
    textAlign: 'center',
    marginTop: 6,
  },
});