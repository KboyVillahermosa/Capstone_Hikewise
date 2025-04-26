import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CommentsScreen({ route, navigation }) {
  const { postId } = route.params;
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [user, setUser] = useState(null);
  const [post, setPost] = useState(null);
  const [postLoading, setPostLoading] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    getUser();
    checkPostExists(); // Add this to debug
    fetchPost();
    fetchComments();
  }, []);

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }

  async function fetchPost() {
    setPostLoading(true);
    try {
      // First, log the postId to debug
      console.log("Fetching post with ID:", postId);
      
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (postError) {
        console.error('Error fetching post:', postError);
        
        // Handle the "no rows" error more gracefully
        if (postError.code === 'PGRST116') {
          Alert.alert(
            'Post Not Found',
            'This post may have been deleted or is no longer available.',
            [{ text: 'Go Back', onPress: () => navigation.goBack() }]
          );
        }
        setPostLoading(false);
        return;
      }

      // Get profile data separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', postData.user_id)
        .single();

      setPost({
        ...postData,
        profiles: profileError ? { username: 'User', avatar_url: null } : profileData
      });
      setPostLoading(false);
    } catch (err) {
      console.error('Unexpected error:', err);
      Alert.alert('Error', 'An unexpected error occurred.');
      setPostLoading(false);
    }
  }

  async function fetchComments() {
    setLoading(true);
    try {
      // Get all comments for this post
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (commentError) {
        console.error('Error fetching comments:', commentError);
        Alert.alert('Error', 'Failed to load comments');
        return;
      }

      // For each comment, get the user profile separately
      const enrichedComments = await Promise.all(commentData.map(async (comment) => {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', comment.user_id)
          .single();

        return {
          ...comment,
          profiles: profileError ? { username: 'User', avatar_url: null } : profileData
        };
      }));

      setComments(enrichedComments);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function addComment() {
    if (!newComment.trim()) return;
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to comment');
      return;
    }

    setPosting(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          post_id: postId,
          user_id: user.id,
          content: newComment.trim()
        }])
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `);

      if (error) {
        console.error('Error adding comment:', error);
        Alert.alert('Error', 'Failed to post your comment');
      } else {
        setComments([...comments, data[0]]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setPosting(false);
    }
  }

  async function deleteComment(commentId) {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId);

              if (error) {
                console.error('Error deleting comment:', error);
                Alert.alert('Error', 'Failed to delete comment');
              } else {
                setComments(comments.filter(comment => comment.id !== commentId));
              }
            } catch (err) {
              console.error('Unexpected error:', err);
            }
          }
        }
      ]
    );
  }

  async function checkPostExists() {
    try {
      console.log("Checking if post exists with ID:", postId);
      
      // Get all posts to see what's in the database
      const { data: allPosts, error: postsError } = await supabase
        .from('posts')
        .select('id, content')
        .limit(5);
      
      if (postsError) {
        console.error("Error fetching posts list:", postsError);
      } else {
        console.log("Available posts in database:", allPosts);
      }
      
      // Check if we have valid UUID
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);
      console.log("Is valid UUID format:", isValidUUID);
      
    } catch (err) {
      console.error("Error in checkPostExists:", err);
    }
  }

  function renderCommentItem({ item }) {
    const isOwnComment = user && item.user_id === user.id;
    
    return (
      <View style={styles.commentItem}>
        <Image 
          source={{ 
            uri: item.profiles?.avatar_url || 'https://www.gravatar.com/avatar/?d=mp' 
          }} 
          style={styles.avatar} 
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.username}>{item.profiles?.username || 'User'}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
        
        {isOwnComment && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => deleteComment(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderPostPreview() {
    if (!post) return null;
    
    return (
      <View style={styles.postPreview}>
        <View style={styles.postHeader}>
          <Image 
            source={{ 
              uri: post.profiles?.avatar_url || 'https://www.gravatar.com/avatar/?d=mp' 
            }} 
            style={styles.postAvatar} 
          />
          <View>
            <Text style={styles.postUsername}>{post.profiles?.username || 'User'}</Text>
            <Text style={styles.postTimestamp}>
              {new Date(post.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        {post.content && (
          <Text style={styles.postContent} numberOfLines={2}>
            {post.content}
          </Text>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={styles.headerRight} />
      </View>
      
      {postLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#2E7D32" />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      ) : post ? (
        renderPostPreview()
      ) : (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#FF3B30" />
          <Text style={styles.errorText}>Post not found</Text>
          <TouchableOpacity 
            style={styles.goBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flexOne}
        keyboardVerticalOffset={90}
      >
        {loading ? (
          <ActivityIndicator style={styles.loader} color="#2E7D32" />
        ) : (
          <FlatList
            data={comments}
            renderItem={renderCommentItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.commentsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-outline" size={50} color="#ccc" />
                <Text style={styles.emptyText}>No comments yet</Text>
                <Text style={styles.emptySubtext}>Be the first to comment!</Text>
              </View>
            }
          />
        )}
        
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor="#888"
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity 
            style={[
              styles.sendButton, 
              (!newComment.trim() || posting) && styles.sendButtonDisabled
            ]}
            onPress={addComment}
            disabled={!newComment.trim() || posting}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  flexOne: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFF',
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
  postPreview: {
    backgroundColor: '#FFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  postAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  postUsername: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  postTimestamp: {
    fontSize: 12,
    color: '#888',
  },
  postContent: {
    fontSize: 14,
    color: '#666',
  },
  commentsList: {
    padding: 15,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 18,
    borderTopLeftRadius: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
    marginRight: 6,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  commentText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  deleteButton: {
    padding: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#2E7D32',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 5,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  goBackButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#2E7D32',
    borderRadius: 20,
  },
  goBackButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  }
});