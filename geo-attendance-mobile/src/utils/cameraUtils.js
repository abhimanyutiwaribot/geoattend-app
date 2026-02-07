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

    // Take picture
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.7, // Balance between quality and file size
      base64: true,
      skipProcessing: false,
    });

    if (!photo || !photo.base64) {
      throw new Error('Failed to capture photo');
    }

    console.log('✅ Photo captured successfully');

    // Return base64 with data URL prefix
    return `data:image/jpeg;base64,${photo.base64}`;
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
