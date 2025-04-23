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
  Dimensions
} from 'react-native'
import { supabase } from '../utils/supabase'
import { LinearGradient } from 'expo-linear-gradient';

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

  return (
    <View style={styles.container}>
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image 
                source={require('../assets/images/logo.png')} 
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

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerContainer: {
    height: height * 0.28,
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
    paddingBottom: 30,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 16,
  },
  logo: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
  },
  formContainer: {
    width: '100%',
    marginBottom: 30,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555555',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  inputContainer: {
    marginBottom: 20,
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
    padding: 16,
    fontSize: 16,
    color: '#333333',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#FC4C02', // Strava orange
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#FC4C02', // Strava orange
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: 15,
    color: '#666666',
  },
  registerLink: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FC4C02', // Strava orange
  }
})