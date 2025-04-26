import * as Linking from 'expo-linking';

export const linking = {
  prefixes: ['hikewise://', 'https://email-confirmation-6j4r.onrender.com'],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      EmailConfirmation: 'auth/callback',
      Home: 'home',
      HikingSpotDetails: 'spot/:id',
      ActivityDetails: 'activity/:id',
      Tracking: 'tracking',
      HikeHistory: 'history'
    }
  }
};