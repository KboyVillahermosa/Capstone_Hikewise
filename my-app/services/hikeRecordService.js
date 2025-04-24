import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabase';

const HIKE_RECORDS_KEY = 'hike_records_';

// Get the current user's ID
const getCurrentUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id;
};

// Get the storage key for the current user
const getUserStorageKey = async () => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User is not authenticated');
  return `${HIKE_RECORDS_KEY}${userId}`;
};

// Get all hike records for the current user
export const getHikeRecords = async () => {
  try {
    const storageKey = await getUserStorageKey();
    const recordsJson = await AsyncStorage.getItem(storageKey);
    
    if (recordsJson !== null) {
      const records = JSON.parse(recordsJson);
      return records.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first
    }
    
    return [];
  } catch (error) {
    console.error('Error getting hike records:', error);
    // Return empty array if user is not authenticated or other error
    return [];
  }
};

// Save a new hike record for the current user
export const saveHikeRecord = async (hikeData) => {
  try {
    const storageKey = await getUserStorageKey();
    const existingRecords = await getHikeRecords();
    
    // Generate a unique ID using timestamp and add user ID
    const userId = await getCurrentUserId();
    const newHike = {
      ...hikeData,
      id: Date.now().toString(),
      userId: userId,
    };
    
    const updatedRecords = [newHike, ...existingRecords];
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedRecords));
    
    return newHike;
  } catch (error) {
    console.error('Error saving hike record:', error);
    throw error;
  }
};

// Delete a hike record by ID
export const deleteHikeRecord = async (hikeId) => {
  try {
    const storageKey = await getUserStorageKey();
    const existingRecords = await getHikeRecords();
    const updatedRecords = existingRecords.filter(record => record.id !== hikeId);
    
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedRecords));
    return true;
  } catch (error) {
    console.error('Error deleting hike record:', error);
    throw error;
  }
};

// Get a single hike record by ID
export const getHikeRecordById = async (hikeId) => {
  try {
    const records = await getHikeRecords();
    return records.find(record => record.id === hikeId) || null;
  } catch (error) {
    console.error('Error getting hike record by ID:', error);
    throw error;
  }
};