import { supabase } from './supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Register for redirect
WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  try {
    console.log("Starting Google Sign-in flow...");
    
    // Generate a random state for CSRF protection
    const randomState = Math.random().toString(36).substring(2, 15);
    await AsyncStorage.setItem('oauth_state', randomState);
    console.log("Generated state:", randomState);
    
    // Create redirect URI
    const redirectUri = makeRedirectUri({
      scheme: 'my-app', // Must match scheme in app.json
      path: 'auth/callback',
      useProxy: true, // Ensures compatibility with Expo Go
    });
    console.log("Redirect URI:", redirectUri);
    console.log('Redirect URI:', redirectUri);
    
    // Start the OAuth flow with Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
        queryParams: {
          state: randomState,
        },
      },
    });

    if (error) {
      console.error("Supabase OAuth initialization error:", error);
      throw error;
    }
    
    console.log("Opening auth URL:", data.url);
    
    // Open auth URL and wait for result
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    console.log("Auth result type:", result.type);

    if (result.type === 'success' && result.url) {
      console.log("Authentication successful, processing redirect URL...");
      
      const url = result.url;
      const parsedUrl = new URL(url);
      const params = new URLSearchParams(parsedUrl.hash.substring(1));
      
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token') || '';
      
      if (accessToken) {
        console.log("Found access token, setting session...");
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (sessionError) {
          console.error("Error setting session:", sessionError);
          throw sessionError;
        }
        
        console.log("Session set successfully");
        return sessionData;
      } else {
        console.log("No access token found in URL");
      }
    } else {
      console.log("Authentication was canceled or failed:", result.type);
    }
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}

// Utility function for manual token testing
export async function testWithToken(tokenUrl) {
  try {
    // Extract access token from URL
    const url = new URL(tokenUrl);
    const params = new URLSearchParams(url.hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token') || '';
    
    if (accessToken) {
      // Set session with token
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      
      if (error) {
        console.error("Error setting session:", error);
        return null;
      }
      
      console.log("Session set manually with token");
      return data;
    }
    
    return null;
  } catch (error) {
    console.error("Error in test token function:", error);
    return null;
  }
}