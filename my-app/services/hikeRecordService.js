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
    const userId = await getCurrentUserId();
    if (!userId) return [];
    
    // Fetch from Supabase
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching hike records:', error);
    // Fallback to local storage if Supabase fails
    const storageKey = await getUserStorageKey();
    const recordsJson = await AsyncStorage.getItem(storageKey);
    return recordsJson ? JSON.parse(recordsJson) : [];
  }
};

// Modified version to save to Supabase
export const saveHikeRecord = async (hikeData) => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User is not authenticated');

    // First, save to Supabase
    const { data, error } = await supabase
      .from('activities') // assuming your table is called 'activities'
      .insert({
        ...hikeData,
        user_id: userId
      })
      .select();

    if (error) throw error;

    // Optionally, still keep a local copy in AsyncStorage
    const storageKey = await getUserStorageKey();
    const existingRecordsJson = await AsyncStorage.getItem(storageKey);
    const existingRecords = existingRecordsJson ? JSON.parse(existingRecordsJson) : [];
    
    // Add the new record with its database ID
    const newRecord = {
      ...hikeData,
      id: data[0].id // Use the ID from Supabase
    };
    
    const updatedRecords = [...existingRecords, newRecord];
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedRecords));
    
    return data[0];
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