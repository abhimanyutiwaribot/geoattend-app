import * as FileSystem from 'expo-file-system/legacy';

/**
 * Capture photo from camera and convert to base64
 * @param {Object} cameraRef - Reference to CameraView component
 * @returns {Promise<string>} Base64 encoded image
 */
export async function capturePhotoAsBase64(cameraRef) {
  if (!cameraRef || !cameraRef.current) {
    throw new Error('Camera reference is not available');
  }

  try {
    console.log('📸 Capturing photo from camera...');

    // Take picture (Support for both Expo and Vision Camera logic)
    if (cameraRef.current.takePictureAsync) {
      // Legacy Expo Camera logic
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
        skipProcessing: false,
      });
      return `data:image/jpeg;base64,${photo.base64}`;
    } else if (cameraRef.current.takePhoto) {
      // Vision Camera logic (Natively return Base64 string directly from Android buffer without file system)
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'speed',
      });

      const filePath = `file://${photo.path}`;

      try {
        console.log('Reading from file:', filePath);
        // Fallback to Expo FileSystem which is highly reliable for local file URIs
        const base64Content = await FileSystem.readAsStringAsync(filePath, {
          encoding: 'base64',
        });
        return `data:image/jpeg;base64,${base64Content}`;
      } catch (e) {
        console.log('FileSystem check blocked. Error:', e.message || e);
        console.log('Attempting classic fetch blob route...');
        const response = await fetch(filePath);
        const blob = await response.blob();

        const base64DataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return base64DataUrl;
      }
    }

    throw new Error('No supported camera method found on ref');
  } catch (error) {
    console.error('❌ Error capturing photo:', error);
    throw new Error('Failed to capture photo from camera');
  }
}

/**
 * Validate that an image contains a face (client-side check)
 * This is a simple check - real validation happens on server
 * @param {string} base64Image 
 * @returns {boolean}
 */
export function validateImageSize(base64Image) {
  // Check if image is not too large (> 5MB)
  const sizeInBytes = (base64Image.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);

  if (sizeInMB > 5) {
    throw new Error('Image is too large. Please try again.');
  }

  return true;
}
