// Format distance in meters to km with one decimal place
export const formatDistance = (meters) => {
  if (!meters && meters !== 0) return '0.0 km';
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
};

// Format duration in seconds to HH:MM:SS or MM:SS
export const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return '00:00';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
};

// Format pace (minutes per km)
export const formatPace = (pace) => {
  if (!pace || pace < 0 || !isFinite(pace)) return '--:--';
  
  const paceMinutes = Math.floor(pace);
  const paceSeconds = Math.floor((pace - paceMinutes) * 60);
  
  return `${paceMinutes.toString().padStart(2, '0')}:${paceSeconds.toString().padStart(2, '0')}`;
};

// Format speed in m/s to km/h
export const formatSpeed = (metersPerSecond) => {
  if (!metersPerSecond) return '0.0 km/h';
  
  const kmPerHour = metersPerSecond * 3.6;
  return `${kmPerHour.toFixed(1)} km/h`;
};

// Format date to readable format
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};