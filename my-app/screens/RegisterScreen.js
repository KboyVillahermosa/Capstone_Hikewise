import { useState } from 'react'
import { 
  StyleSheet, 
  View, 
  TextInput, 
  Text, 
  TouchableOpacity, 
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
  Dimensions
} from 'react-native'
import { supabase } from '../utils/supabase'
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUpWithEmail() {
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }

    setLoading(true)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (authError) {
      Alert.alert('Error', authError.message)
      setLoading(false)
      return
    }

    // Insert username into profiles table
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: authData.user.id, username: username }])
      
      if (profileError) {
        Alert.alert('Error', profileError.message)
      } else {
        Alert.alert('Success', 'Registration successful! Please check your email for confirmation.')
        navigation.navigate('Login')
      }
    }
    
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      <View style={styles.circle3} />
      
      {/* Top navigation */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </SafeAreaView>
      
      {/* Content section */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Join HikeWise</Text>
          <Text style={styles.subtitle}>Create your account</Text>
          
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.formLabel}>Username</Text>
              <TextInput
                style={styles.input}
                onChangeText={(text) => setUsername(text)}
                value={username}
                placeholder="Choose a username"
                placeholderTextColor="#BBBBBB"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.input}
                onChangeText={(text) => setEmail(text)}
                value={email}
                placeholder="your@email.com"
                placeholderTextColor="#BBBBBB"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.formLabel}>Password</Text>
              <TextInput
                style={styles.input}
                onChangeText={(text) => setPassword(text)}
                value={password}
                secureTextEntry={true}
                placeholder="Create a password"
                placeholderTextColor="#BBBBBB"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.formLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                onChangeText={(text) => setConfirmPassword(text)}
                value={confirmPassword}
                secureTextEntry={true}
                placeholder="Re-enter your password"
                placeholderTextColor="#BBBBBB"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity 
              style={styles.registerButton}
              onPress={() => signUpWithEmail()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  // Circular design elements with stronger colors
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(252, 76, 2, 0.15)', // Stronger Strava orange
    top: -50,
    right: -60,
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(252, 76, 2, 0.12)', // More visible Strava orange
    top: 80,
    left: -40,
  },
  circle3: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(252, 76, 2, 0.08)', // Slightly visible Strava orange
    bottom: -100,
    right: -100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEEEEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#333',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  formContainer: {
    width: '100%',
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    borderBottomWidth: 1.5, // Slightly thicker border
    borderBottomColor: '#DDDDDD',
    paddingVertical: 10,
    fontSize: 16,
    color: '#222222',
  },
  registerButton: {
    backgroundColor: '#FC4C02', // Full Strava orange (no transparency)
    borderRadius: 30,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#FC4C02',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35, // More pronounced shadow
    shadowRadius: 10,
    elevation: 6, // Stronger elevation for Android
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold', // Bolder text
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    fontSize: 15,
    color: '#666',
  },
  loginLink: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FC4C02', // Full Strava orange
  }
})