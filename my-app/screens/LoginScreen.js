import { useState } from 'react'
import { 
  StyleSheet, 
  View, 
  TextInput, 
  Text, 
  TouchableOpacity, 
  Alert, 
  Image, 
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
  ScrollView
} from 'react-native'
import { supabase } from '../utils/supabase'
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithGoogle } from '../utils/auth';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }
    
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) Alert.alert('Error', error.message)
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const session = await signInWithGoogle();
      
      // Log the session for debugging
      console.log("Session returned:", session ? "Session exists" : "No session");
      
      if (session && session.session) {
        // Navigate to Main screen
        navigation.replace('Main'); // Use replace instead of navigate
      } else {
        console.log("No valid session returned");
        Alert.alert("Login Error", "Could not retrieve session after login");
      }
    } catch (error) {
      console.error("Google sign-in error in LoginScreen:", error);
      Alert.alert("Login Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      
      {/* Header with background image */}
      <View style={styles.headerContainer}>
        <ImageBackground 
          source={{ uri: 'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=1000' }}
          style={styles.headerBackground}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)', 'transparent']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <Text style={styles.headerText}>Welcome to</Text>
              <Text style={styles.headerTitle}>HikeWise</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>
      
      {/* Content section */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.content}
        keyboardVerticalOffset={Platform.OS === "ios" ? -64 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Image 
                  source={require('../assets/images/ascentra.png')} 
                  style={styles.logo}
                />
              </View>
              <Text style={styles.subtitle}>Discover trails. Share experiences.</Text>
            </View>
            
            <View style={styles.formContainer}>
              <Text style={styles.formLabel}>EMAIL</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  onChangeText={(text) => setEmail(text)}
                  value={email}
                  placeholder="your@email.com"
                  placeholderTextColor="#A0A0A0"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <Text style={styles.formLabel}>PASSWORD</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  onChangeText={(text) => setPassword(text)}
                  value={password}
                  secureTextEntry={true}
                  placeholder="Your password"
                  placeholderTextColor="#A0A0A0"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={() => Alert.alert('Reset Password', 'Password reset functionality will be implemented here')}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.loginButton}
                onPress={() => signInWithEmail()}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginButtonText}>LOG IN</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.separator}>
              <View style={styles.line} />
              <Text style={styles.separatorText}>OR</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity 
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Ionicons name="logo-google" size={24} color="#EA4335" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerContainer: {
    height: height * 0.25, // Reduced header height
    width: width,
  },
  headerBackground: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  headerContent: {
    padding: 20,
    paddingBottom: 20, // Reduced padding
  },
  headerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24, // Extra padding for iOS
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20, // Reduced margin
    marginTop: 10,
  },
  logoCircle: {
    width: 80, // Smaller logo
    height: 80, // Smaller logo
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 12, // Reduced margin
  },
  logo: {
    width: 60, // Smaller logo
    height: 60, // Smaller logo
    resizeMode: 'contain',
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
  },
  formContainer: {
    width: '100%',
    marginBottom: 20, // Reduced margin
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555555',
    marginBottom: 6, // Reduced margin
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  inputContainer: {
    marginBottom: 16, // Reduced margin
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F7F7FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  input: {
    padding: 14, // Reduced padding
    fontSize: 16,
    color: '#333333',
    height: 50, // Fixed height
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20, // Reduced margin
  },
  forgotPasswordText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    height: 50, // Reduced height
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16, // Reduced margin
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  separatorText: {
    paddingHorizontal: 10,
    color: '#757575',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12, // Matched to loginButton
    borderWidth: 1,
    borderColor: '#DADCE0',
    padding: 12,
    marginVertical: 8,
    height: 50, // Matched to loginButton
  },
  googleButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#444',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16, // Reduced margin
  },
  footerText: {
    fontSize: 15,
    color: '#666666',
  },
  registerLink: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1976D2',
  }
})