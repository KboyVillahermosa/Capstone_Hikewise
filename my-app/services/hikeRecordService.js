import { supabase } from '../utils/supabase'

// Save a new hike record
export const saveHikeRecord = async (hikeData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    const { data, error } = await supabase
      .from('hike_records')
      .insert({
        user_id: user.id,
        date: hikeData.date,
        route_coordinates: hikeData.routeCoordinates,
        distance: hikeData.stats.distance,
        duration: hikeData.stats.duration,
        pace: hikeData.stats.pace,
        elevation: hikeData.stats.elevation
      })
      .select()
    
    if (error) {
      console.error('Error saving hike record:', error)
      throw error
    }
    
    return data[0]
  } catch (error) {
    console.error('Error in saveHikeRecord:', error)
    // Return a dummy record for development until the database is set up
    return {
      id: Math.floor(Math.random() * 1000),
      date: new Date().toISOString(),
      stats: hikeData.stats
    }
  }
}

// Get all hike records for the current user
export const getHikeRecords = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    const { data, error } = await supabase
      .from('hike_records')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
    
    if (error) {
      console.error('Error fetching hike records:', error)
      throw error
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getHikeRecords:', error)
    // Return dummy data for development until the database is set up
    return []
  }
}

// Get a single hike record by ID
export const getHikeRecordById = async (hikeId) => {
  try {
    const { data, error } = await supabase
      .from('hike_records')
      .select('*')
      .eq('id', hikeId)
      .single()
    
    if (error) {
      console.error('Error fetching hike record:', error)
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Error in getHikeRecordById:', error)
    // Return dummy data for development
    return null
  }
}