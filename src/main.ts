import {
  bootstrapCameraKit,
  CameraKitSession,
  createMediaStreamSource,
  Transform2D
} from '@snap/camera-kit';
import { APP_CONFIG } from './AppConfig';

let cameraKitSession: CameraKitSession;
let mediaStream: MediaStream;
const camerakitCanvas = document.getElementById('CameraKit-AR-Canvas') as HTMLCanvasElement;
let uploadBtn: HTMLButtonElement;
let captureBtn: HTMLButtonElement;
let capturedImageData: string | null = null;
let generateBtn: HTMLButtonElement;
let downloadImageBtn: HTMLButtonElement;
let closePreviewBtn: HTMLButtonElement;
let genderOverlay: HTMLDivElement;
let maleBtn: HTMLButtonElement;
let femaleBtn: HTMLButtonElement;
let currentPrompt: string = APP_CONFIG.NANO_BANANA_PROMPT;
let fileInput: HTMLInputElement;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Camera Kit
  await initCameraKit();
})

// Initialize Camera Kit
async function initCameraKit() {
  try {
    const cameraKit = await bootstrapCameraKit({ apiToken: APP_CONFIG.CAMERA_KIT_API_TOKEN });
    cameraKitSession = await cameraKit.createSession({ liveRenderTarget: camerakitCanvas });
    // Hide loader immediately and start splash fade-out
    hideSplashLoader();
    setCameraKitSource(cameraKitSession, true); // Use Front Camera
    setTimeout(() => {
      setupCaptureUI();
      setupGenderUI();
      showGenderOverlay();
    }, 0);
  }
  //});
  //});
  catch (error) {
    console.error('Failed to initialize CameraKit:', error);
  }
}

function setupCaptureUI() {
  uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement;
  captureBtn = document.getElementById('capture-btn') as HTMLButtonElement;
  generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
  downloadImageBtn = document.getElementById('download-btn') as HTMLButtonElement;
  closePreviewBtn = document.getElementById('retake-btn') as HTMLButtonElement;
  fileInput = document.getElementById('file-input') as HTMLInputElement;
  
  // Hide capture until gender selection is made
  uploadBtn.style.display = 'none';
  captureBtn.style.display = 'none';
  
  uploadBtn.addEventListener('click', () => openImageOnlyPicker());
  fileInput.addEventListener('change', handleFileUpload);
  captureBtn.addEventListener('click', capturePhoto);
  closePreviewBtn.addEventListener('click', ClosePreview);
  generateBtn.addEventListener('click', SendToNanoBanana);
  downloadImageBtn.addEventListener('click', DownloadImage);
}

function setupGenderUI() {
  genderOverlay = document.getElementById('gender-overlay') as HTMLDivElement;
  maleBtn = document.getElementById('select-male') as HTMLButtonElement;
  femaleBtn = document.getElementById('select-female') as HTMLButtonElement;
  if (maleBtn) maleBtn.onclick = () => onGenderSelected('male');
  if (femaleBtn) femaleBtn.onclick = () => onGenderSelected('female');
}

function showGenderOverlay() {
  if (genderOverlay) genderOverlay.style.display = 'flex';
}

function hideGenderOverlay() {
  if (genderOverlay) genderOverlay.style.display = 'none';
}

function onGenderSelected(gender: 'male' | 'female') {
  currentPrompt = gender === 'male' ? APP_CONFIG.NANO_BANANA_PROMPT_MALE : APP_CONFIG.NANO_BANANA_PROMPT_FEMALE;
  hideGenderOverlay();
  // Show camera controls wrapper and the individual buttons
  const cameraControls = document.querySelector('.camera-controls') as HTMLDivElement | null;
  if (cameraControls) {
    cameraControls.style.display = 'flex';
    cameraControls.setAttribute('aria-hidden', 'false');
  }

  if (captureBtn) captureBtn.style.display = 'flex';
  if (uploadBtn) uploadBtn.style.display = 'flex';
}


//@ts-ignore
async function setCameraKitSource(
  session: CameraKitSession,
  isFront: boolean = true) {

  mediaStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: isFront ? "user" : "environment" }
  });

  const source = createMediaStreamSource(mediaStream, {
    cameraType: isFront ? 'user' : 'environment'
  });

  await session.setSource(source);
  // Only apply mirror transform for front camera
  if (isFront) {
    source.setTransform(Transform2D.MirrorX);
  }
  session.play();
  source.setRenderSize(1080, 1920);
}

// Function to hide the splash loader
function hideSplashLoader() {
  const loader = document.getElementById('splash-loader');
  document.body.classList.add('splash-hidden');
  if (loader) loader.style.display = 'none';
}

function capturePhoto() {
  if (!camerakitCanvas) {
    console.error('Canvas not found');
    return;
  }
  try {
    if (captureBtn) {
      captureBtn.classList.add('click-anim');
      setTimeout(() => {
        if (captureBtn) captureBtn.classList.remove('click-anim');
      }, 600);
    }
    // Capture the current canvas content
    capturedImageData = camerakitCanvas.toDataURL('image/png');
    // Get the photo canvas and display the captured photo
    const photoPreviewCanvas = document.getElementById('photo-preview-canvas') as HTMLCanvasElement;
    if (photoPreviewCanvas) {
      // Set canvas dimensions to match the captured image
      photoPreviewCanvas.width = camerakitCanvas.width;
      photoPreviewCanvas.height = camerakitCanvas.height;

      // Get the 2D context and draw the captured photo
      const ctx = photoPreviewCanvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          // Clear the canvas and draw the captured image
          ctx.clearRect(0, 0, photoPreviewCanvas.width, photoPreviewCanvas.height);
          ctx.drawImage(img, 0, 0);

          // Show the photo canvas, hide the main canvas (CSS handles sizing/positioning)
          photoPreviewCanvas.style.display = 'block';
          camerakitCanvas.style.display = 'none';
        };
        img.src = capturedImageData;
      }
    }

    // Hide capture and upload buttons, show generate and close buttons
    if (captureBtn) captureBtn.style.display = 'none';
    if (uploadBtn) uploadBtn.style.display = 'none';
    if (generateBtn) generateBtn.style.display = 'flex';
    if (closePreviewBtn) closePreviewBtn.style.display = 'flex';

  } catch (error) {
    console.error('Failed to capture photo:', error);
  }
}

function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const uploadedImageData = e.target?.result as string;
    if (!uploadedImageData) return;

    displayUploadedImage(uploadedImageData);
  };
  reader.readAsDataURL(file);
}

function displayUploadedImage(imageData: string) {
  const photoPreviewCanvas = document.getElementById('photo-preview-canvas') as HTMLCanvasElement;
  if (!photoPreviewCanvas) return;

  // Set reasonable canvas dimensions for uploaded images
  photoPreviewCanvas.width = 1080;
  photoPreviewCanvas.height = 1920;

  const ctx = photoPreviewCanvas.getContext('2d');
  if (ctx) {
    const img = new Image();
    img.onload = () => {
      // Clear and draw the uploaded image, maintaining aspect ratio
      ctx.clearRect(0, 0, photoPreviewCanvas.width, photoPreviewCanvas.height);
      
      // Calculate dimensions to fit canvas while maintaining aspect ratio
      const imgAspect = img.width / img.height;
      const canvasAspect = photoPreviewCanvas.width / photoPreviewCanvas.height;
      
      let drawWidth = photoPreviewCanvas.width;
      let drawHeight = photoPreviewCanvas.height;
      let drawX = 0;
      let drawY = 0;

      if (imgAspect > canvasAspect) {
        drawHeight = drawWidth / imgAspect;
        drawY = (photoPreviewCanvas.height - drawHeight) / 2;
      } else {
        drawWidth = drawHeight * imgAspect;
        drawX = (photoPreviewCanvas.width - drawWidth) / 2;
      }

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // Update capturedImageData with the uploaded image
      capturedImageData = photoPreviewCanvas.toDataURL('image/png');

      // Show preview canvas, hide camera canvas
      photoPreviewCanvas.style.display = 'block';
      camerakitCanvas.style.display = 'none';

      // Hide capture and upload buttons, show generate and close buttons
      if (captureBtn) captureBtn.style.display = 'none';
      if (uploadBtn) uploadBtn.style.display = 'none';
      if (generateBtn) generateBtn.style.display = 'flex';
      if (closePreviewBtn) closePreviewBtn.style.display = 'flex';
    };
    img.src = imageData;
  }
}

function ClosePreview() {
  // Clear the captured image
  capturedImageData = null;

  // Hide photo preview canvas, show main canvas
  let previewCanvas = document.getElementById('photo-preview-canvas');
  if (previewCanvas) {
    previewCanvas.style.display = 'none';
  }

  if (camerakitCanvas) {
    camerakitCanvas.style.display = 'block';
  }

  // Hide generate, download and close buttons
  if (generateBtn) generateBtn.style.display = 'none';
  if (downloadImageBtn) downloadImageBtn.style.display = 'none';
  if (closePreviewBtn) closePreviewBtn.style.display = 'none';
  
  // Show capture and upload buttons again
  if (captureBtn) captureBtn.style.display = 'flex';
  if (uploadBtn) uploadBtn.style.display = 'flex';
}

//@ts-ignore
async function DownloadImage() {
  try {
    if (!capturedImageData) return;
    if (downloadImageBtn) downloadImageBtn.disabled = true;

    const compositeCanvas = document.createElement('canvas');
    const ctx = compositeCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

    // Load main (processed) image from current preview data
    const mainImg = await loadImage(capturedImageData);
    compositeCanvas.width = mainImg.width;
    compositeCanvas.height = mainImg.height;
    ctx.drawImage(mainImg, 0, 0);

    // Try to load the logo using the same resolved URL as the in-page logo element
    try {
      const appLogoEl = document.querySelector('.app-logo') as HTMLImageElement | null;
      const resolvedLogoSrc = appLogoEl?.src || 'Grand logo-pp final.png';
      const logoImg = await loadImage(resolvedLogoSrc);
      const logoWidth = compositeCanvas.width * 0.15; // ~15% of width
      const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
      const logoX = (compositeCanvas.width - logoWidth) / 2;
      const logoY = Math.max(20, compositeCanvas.height * 0.02);
      ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
    } catch (e) {
      console.warn('Logo overlay failed; proceeding without logo');
    }

    // Try to load the slogan and place at bottom center with offset matching on-screen size/position
    try {
      const appSloganEl = document.querySelector('.app-slogan') as HTMLImageElement | null;
      const resolvedSloganSrc = appSloganEl?.src || 'Orange-Slogan.png';
      const sloganImg = await loadImage(resolvedSloganSrc);
      // Map on-screen size/offset to image coordinates for a perfect match
      const vwToImg = compositeCanvas.width / window.innerWidth;
      const vhToImg = compositeCanvas.height / window.innerHeight;
      const onScreenWidth = appSloganEl?.clientWidth ?? (window.innerWidth * 0.873);
      const rect = appSloganEl?.getBoundingClientRect();
      const onScreenBottomOffset = rect ? (window.innerHeight - rect.bottom) : 150; // px from CSS
      const sloganWidth = onScreenWidth * vwToImg;
      const sloganHeight = (sloganImg.height / sloganImg.width) * sloganWidth;
      const bottomOffset = onScreenBottomOffset * vhToImg;
      const sloganX = (compositeCanvas.width - sloganWidth) / 2;
      const sloganY = compositeCanvas.height - bottomOffset - sloganHeight;
      ctx.drawImage(sloganImg, sloganX, sloganY, sloganWidth, sloganHeight);
    } catch (e) {
      console.warn('Slogan overlay failed; proceeding without slogan');
    }

    // Use toBlob + object URL for reliability (avoids giant data URLs)
    compositeCanvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to generate image blob');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orange-gem-ai-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (err) {
    console.error('DownloadImage failed:', err);
    alert('Failed to prepare image for download.');
  } finally {
    if (downloadImageBtn) downloadImageBtn.disabled = false;
  }
}

function displayImageInPreview(imageUrl: string) {
  const photoPreviewCanvas = document.getElementById('photo-preview-canvas') as HTMLCanvasElement;
  if (!photoPreviewCanvas || !camerakitCanvas) return;

  // Set canvas dimensions to match the camera canvas
  photoPreviewCanvas.width = camerakitCanvas.width;
  photoPreviewCanvas.height = camerakitCanvas.height;

  const ctx = photoPreviewCanvas.getContext('2d');
  if (ctx) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Clear and draw the image
      ctx.clearRect(0, 0, photoPreviewCanvas.width, photoPreviewCanvas.height);
      ctx.drawImage(img, 0, 0, photoPreviewCanvas.width, photoPreviewCanvas.height);

      // Update capturedImageData with the processed image
      capturedImageData = photoPreviewCanvas.toDataURL('image/png');

      // Show preview canvas, hide camera canvas
      photoPreviewCanvas.style.display = 'block';
      camerakitCanvas.style.display = 'none';

      // Show download button when processed image is displayed
      if (downloadImageBtn) {
        downloadImageBtn.style.display = 'flex';
      }
    };
    img.onerror = () => {
      console.error('Failed to load processed image');
      alert('Failed to load processed image. Please try again.');
    };
    img.src = imageUrl;
  }
}

async function SendToNanoBanana() {
  console.log("Sending to NanoBanana");
  const processingOverlay = document.getElementById('processing-overlay') as HTMLDivElement;
  
  try {
    if (!capturedImageData) {
      console.warn('No captured image to send.');
      return;
    }

    // Show processing overlay
    if (processingOverlay) {
      processingOverlay.style.display = 'flex';
    }

    // Disable generate button during processing
    if (generateBtn) {
      generateBtn.disabled = true;
    }

    const body = {
      input: {
        image_input: [capturedImageData],
        prompt: currentPrompt
      }
    };

    const resp = await fetch(APP_CONFIG.NANO_BANANA_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`API error: ${resp.status} ${text}`);
    }

    const data = await resp.json();
    const output = (data && (data.output ?? data.result ?? data.url ?? data)) as any;
    let resultUrl: string | null = null;
    if (Array.isArray(output) && output.length > 0 && typeof output[0] === 'string') {
      resultUrl = output[0];
    } else if (typeof output === 'string') {
      resultUrl = output;
    } else if (output && typeof output === 'object' && typeof output.url === 'string') {
      resultUrl = output.url;
    }

    if (!resultUrl) {
      throw new Error('No output URL returned by the API.');
    }

    // Display the processed image in preview canvas instead of downloading
    displayImageInPreview(resultUrl);
    
    // Hide generate button (processing complete)
    if (generateBtn) {
      generateBtn.style.display = 'none';
    }
    // Show retake button
    if (closePreviewBtn) {
      closePreviewBtn.style.display = 'flex';
    }

    console.log('Processed image displayed in preview:', resultUrl);
  } catch (err) {
    console.error('SendToNanoBanana error:', err);
    alert('Failed to process image with Nano Banana. Check console for details.');
  } finally {
    // Hide processing overlay
    if (processingOverlay) {
      processingOverlay.style.display = 'none';
    }
    
    // Hide generate button after processing and re-enable it
    if (generateBtn) {
      generateBtn.style.display = 'none';
      generateBtn.disabled = false;
    }
  }
}

// Open an image-only picker that prefers the native file picker (no camera) when supported.
// Uses the File System Access API (showOpenFilePicker) on supporting browsers (Chrome/Android).
// Falls back to the existing file input for browsers that don't support the API (e.g., iOS Safari).
async function openImageOnlyPicker(): Promise<void> {
  // Prefer the modern picker if available (this generally doesn't surface camera capture options)
  const wf = window as any;
  if (typeof wf.showOpenFilePicker === 'function') {
    try {
      const handles: Array<any> = await wf.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: 'Images',
            accept: {
              'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif']
            }
          }
        ],
        excludeAcceptAllOption: true
      });

      if (!handles || handles.length === 0) return;
      const fileHandle = handles[0];
      const file = await fileHandle.getFile();
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        if (data) displayUploadedImage(data);
      };
      reader.readAsDataURL(file);
      return;
    } catch (err) {
      // User cancelled or API not available/allowed — fall back to input
      console.warn('showOpenFilePicker not available or cancelled, falling back to input:', err);
    }
  }

  // Fallback for browsers without the File System Access API
  if (fileInput) fileInput.click();
}