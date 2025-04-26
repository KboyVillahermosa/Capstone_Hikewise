import React, { useState, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions, TouchableOpacity, StatusBar, ScrollView, Text } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function MediaViewerScreen({ route, navigation }) {
  const { media, initialIndex = 0 } = route.params;
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const scrollViewRef = useRef(null);

  // Hide status bar when component mounts
  React.useEffect(() => {
    StatusBar.setHidden(true);
    
    // Scroll to initial index when component mounts
    if (scrollViewRef.current && initialIndex > 0) {
      setTimeout(() => {
        scrollViewRef.current.scrollTo({ x: width * initialIndex, animated: false });
      }, 100);
    }
    
    return () => StatusBar.setHidden(false);
  }, []);

  // Handle scroll events to update active index
  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / width);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  };

  // Render a media item (image or video)
  const renderMediaItem = (item, index) => {
    if (!item || !item.url) {
      console.warn(`Invalid media item at index ${index}:`, item);
      return <View style={styles.slideContainer} key={index} />;
    }

    if (item.type === 'video') {
      return (
        <View style={styles.slideContainer} key={index}>
          <Video
            source={{ uri: item.url }}
            style={styles.media}
            useNativeControls
            resizeMode="contain"
            shouldPlay={index === activeIndex}
            isLooping
          />
        </View>
      );
    } else {
      return (
        <View style={styles.slideContainer} key={index}>
          <Image
            source={{ uri: item.url }}
            style={styles.media}
            resizeMode="contain"
          />
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Check if media array exists and has items */}
      {media && media.length > 0 ? (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.scrollView}
        >
          {media.map((item, index) => renderMediaItem(item, index))}
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No media to display</Text>
        </View>
      )}
      
      {media && media.length > 1 && (
        <View style={styles.pagination}>
          {media.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeIndex ? styles.paginationDotActive : {}
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  slideContainer: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: width,
    height: height * 0.8,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 5,
  },
  pagination: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#FFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFF',
    fontSize: 16,
  },
});