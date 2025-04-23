// Format distance in meters to a human-readable string
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`
  } else {
    return `${(meters / 1000).toFixed(2)} km`
  }
}

// Format duration in seconds to HH:MM:SS
export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}

// Format pace (minutes per km)
export const formatPace = (pace) => {
  if (!pace || pace === 0) return '--:--'
  
  const minutes = Math.floor(pace)
  const seconds = Math.floor((pace - minutes) * 60)
  
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`
}

// Format speed in m/s to km/h
export const formatSpeed = (metersPerSecond) => {
  if (!metersPerSecond) return '0.0 km/h'
  
  const kmPerHour = metersPerSecond * 3.6
  return `${kmPerHour.toFixed(1)} km/h`
}

// Format date to a readable string
export const formatDate = (dateString) => {
  const date = new Date(dateString)
  const options = { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
  
  return date.toLocaleDateString('en-US', options)
}