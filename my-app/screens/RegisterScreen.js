import { useState } from 'react'
import { StyleSheet, View, TextInput, Button, Text, TouchableOpacity, Alert } from 'react-native'
import { supabase } from '../utils/supabase'

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUpWithEmail() {
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
      <Text style={styles.title}>Create Account</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={(text) => setUsername(text)}
          value={username}
          placeholder="Username"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="Email"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Password"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={(text) => setConfirmPassword(text)}
          value={confirmPassword}
          secureTextEntry={true}
          placeholder="Confirm Password"
          autoCapitalize="none"
        />
      </View>

      <Button
        title={loading ? "Creating account..." : "Register"}
        onPress={() => signUpWithEmail()}
        disabled={loading}
      />

      <View style={styles.loginLink}>
        <Text>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 5,
    width: '100%',
  },
  loginLink: {
    flexDirection: 'row',
    marginTop: 20,
  },
  link: {
    color: 'blue',
    fontWeight: 'bold',
  },
})