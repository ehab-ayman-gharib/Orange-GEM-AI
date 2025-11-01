import {
  bootstrapCameraKit,
  CameraKitSession,
  createMediaStreamSource,
  createImageSource,
  Transform2D,
  type Lens
} from '@snap/camera-kit';
import { APP_CONFIG } from './AppConfig';

let cameraKitSession: CameraKitSession;
let mediaStream: MediaStream;
const camerakitCanvas = document.getElementById('CameraKit-AR-Canvas') as HTMLCanvasElement;
let uploadBtn: HTMLButtonElement;
let capturedImageData: string | null = null;
let generateBtn: HTMLButtonElement;
let downloadImageBtn: HTMLButtonElement;
let closePreviewBtn: HTMLButtonElement;
let shareBtn: HTMLButtonElement;
let genderOverlay: HTMLDivElement;
let maleBtn: HTMLButtonElement;
let femaleBtn: HTMLButtonElement;
let fileInput: HTMLInputElement;
//let launchParams = { launchParams: { genderSelected: "M" } }
let cameraKit: any;
let currentLens: Lens;
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Camera Kit
  await initCameraKit();
})

// Initialize Camera Kit
async function initCameraKit() {

  try {
    cameraKit = await bootstrapCameraKit({ apiToken: APP_CONFIG.CAMERA_KIT_API_TOKEN });
    cameraKitSession = await cameraKit.createSession({ liveRenderTarget: camerakitCanvas });
    cameraKit.lensRepository.loadLens(APP_CONFIG.LENS_ID, APP_CONFIG.LENS_GROUP_ID).then((lens: Lens) => {
      currentLens = lens;
      cameraKitSession.applyLens(currentLens, { launchParams: { genderSelected: "M" } }).then(()=>{
        cameraKitSession.removeLens();
        hideSplashLoader();
      setCameraKitSource(cameraKitSession, true); // Use Front Camera
        setTimeout(() => {
          setupCaptureUI();
          setupGenderUI();
          showGenderOverlay();
        }, 0);
      });
    });
    // Hide loader immediately and start splash fade-out

  }
  //});
  //});
  catch (error) {
    console.error('Failed to initialize CameraKit:', error);
  }
}

function setupCaptureUI() {
  uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement;
  generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
  downloadImageBtn = document.getElementById('download-btn') as HTMLButtonElement;
  closePreviewBtn = document.getElementById('retake-btn') as HTMLButtonElement;
  shareBtn = document.getElementById('share-btn') as HTMLButtonElement;
  fileInput = document.getElementById('file-input') as HTMLInputElement;

  // Hide all buttons until gender selection is made
  uploadBtn.style.display = 'none';
  if (shareBtn) shareBtn.style.display = 'none';
  if (downloadImageBtn) downloadImageBtn.style.display = 'none';
  if (closePreviewBtn) closePreviewBtn.style.display = 'none';

  uploadBtn.addEventListener('click', () => openImageOnlyPicker());
  fileInput.addEventListener('change', handleFileUpload);
  closePreviewBtn.addEventListener('click', ClosePreview);
  generateBtn.addEventListener('click', () => { });
  downloadImageBtn.addEventListener('click', DownloadImage);
  if (shareBtn) {
    shareBtn.addEventListener('click', ShareImage);
  }
}

function setupGenderUI() {
  genderOverlay = document.getElementById('gender-overlay') as HTMLDivElement;
  maleBtn = document.getElementById('select-male') as HTMLButtonElement;
  femaleBtn = document.getElementById('select-female') as HTMLButtonElement;
  if (maleBtn) maleBtn.onclick = () => onGenderSelected('M');
  if (femaleBtn) femaleBtn.onclick = () => onGenderSelected('F');
}

function showGenderOverlay() {
  if (genderOverlay) genderOverlay.style.display = 'flex';
}

function hideGenderOverlay() {
  if (genderOverlay) genderOverlay.style.display = 'none';
}
let selectedGender: 'M' | 'F' = 'M'; // Store selected gender

//@ts-ignore
function onGenderSelected(gender: 'M' | 'F') {
  selectedGender = gender;
  cameraKitSession.applyLens(currentLens, { launchParams: { genderSelected: gender } });
  hideGenderOverlay();

  // Show camera controls wrapper and all buttons
  const cameraControls = document.querySelector('.camera-controls') as HTMLDivElement | null;
  if (cameraControls) {
    cameraControls.style.display = 'flex';
    cameraControls.setAttribute('aria-hidden', 'false');
  }

  // Show all buttons: upload, share, retake, download
  if (uploadBtn) uploadBtn.style.display = 'flex';
  if (shareBtn) shareBtn.style.display = 'flex';
  if (downloadImageBtn) downloadImageBtn.style.display = 'flex';
  if (closePreviewBtn) closePreviewBtn.style.display = 'flex';
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

async function displayUploadedImage(imageData: string) {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageData;
    });

    // Create an image source for CameraKit using the uploaded image
    const imageSource = createImageSource(img);

    // Set the image as CameraKit's source
    await cameraKitSession.setSource(imageSource);
    cameraKitSession.removeLens();
    await cameraKitSession.applyLens(currentLens, { launchParams: { genderSelected: selectedGender } });
    imageSource.setRenderSize(1080, 1920);
    cameraKitSession.play();

    // Wait a moment for lens processing, then capture the result
    setTimeout(() => {
      if (!camerakitCanvas) {
        console.error('Canvas not found');
        return;
      }

      try {
        // Capture the processed canvas content
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
            const previewImg = new Image();
            previewImg.onload = () => {
              // Clear the canvas and draw the captured image
              ctx.clearRect(0, 0, photoPreviewCanvas.width, photoPreviewCanvas.height);
              ctx.drawImage(previewImg, 0, 0);

              // Show the photo canvas, hide the main canvas
              photoPreviewCanvas.style.display = 'block';
              camerakitCanvas.style.display = 'none';
            };
            previewImg.src = capturedImageData;
          }
        }

        // All buttons remain visible - no need to change visibility
      } catch (error) {
        console.error('Failed to capture processed image:', error);
      }
    }, 1000); // Wait 1 second for lens processing

  } catch (error) {
    console.error('Failed to set uploaded image as CameraKit source:', error);
    alert('Failed to load uploaded image. Please try again.');
  }
}

async function ClosePreview() {
  // Clear the captured image
  capturedImageData = null;

  // Hide photo preview canvas, show main canvas
  let previewCanvas = document.getElementById('photo-preview-canvas');
  if (previewCanvas) {
    previewCanvas.style.display = 'none';
  }

  // Restore camera stream source if we were using an uploaded image
  try {
    await setCameraKitSource(cameraKitSession, true);
  } catch (error) {
    console.error('Failed to restore camera source:', error);
  }

  if (camerakitCanvas) {
    camerakitCanvas.style.display = 'block';
  }

  // All buttons remain visible - no need to change visibility
}

//@ts-ignore
async function DownloadImage() {
  try {
    const photoPreviewCanvas = document.getElementById('photo-preview-canvas') as HTMLCanvasElement;
    if (!photoPreviewCanvas) {
      console.warn('Photo preview canvas not found');
      return;
    }

    if (downloadImageBtn) downloadImageBtn.disabled = true;

    // Get image data from the preview canvas
    const canvasImageData = photoPreviewCanvas.toDataURL('image/png');
    if (!canvasImageData) {
      throw new Error('Failed to get image data from canvas');
    }

    const compositeCanvas = document.createElement('canvas');
    const ctx = compositeCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

    // Load main image from preview canvas
    const mainImg = await loadImage(canvasImageData);
    compositeCanvas.width = mainImg.width;
    compositeCanvas.height = mainImg.height;
    ctx.drawImage(mainImg, 0, 0);

    // Try to load and overlay the logo - matching the on-screen position
    try {
      const appLogoEl = document.querySelector('.app-logo') as HTMLImageElement | null;
      const resolvedLogoSrc = appLogoEl?.src || 'Grand logo-pp final.png';
      const logoImg = await loadImage(resolvedLogoSrc);
      
      // Match the on-screen logo size and position from CSS
      const vwToImg = compositeCanvas.width / window.innerWidth;
      const onScreenWidth = appLogoEl?.clientWidth ?? 64; // CSS width: 64px
      
      // CSS: top: 25%, left: 90%, transform: translateX(-50%)
      const logoWidth = onScreenWidth * vwToImg;
      const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
      
      // Calculate position: 90% from left, then translateX(-50%) centers it
      const logoLeftPercent = 0.90;
      const logoX = (compositeCanvas.width * logoLeftPercent) - (logoWidth * 0.5); // 90% - half logo width
      const logoY = compositeCanvas.height * 0.25; // top: 25%
      
      ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
    } catch (e) {
      console.warn('Logo overlay failed; proceeding without logo');
    }

    // Try to load and overlay the slogan at bottom center
    try {
      const appSloganEl = document.querySelector('.app-slogan') as HTMLImageElement | null;
      const resolvedSloganSrc = appSloganEl?.src || 'Orange-Slogan.png';
      const sloganImg = await loadImage(resolvedSloganSrc);
      const vwToImg = compositeCanvas.width / window.innerWidth;
      const vhToImg = compositeCanvas.height / window.innerHeight;
      const onScreenWidth = appSloganEl?.clientWidth ?? (window.innerWidth * 0.873);
      const rect = appSloganEl?.getBoundingClientRect();
      const onScreenBottomOffset = rect ? (window.innerHeight - rect.bottom) : 150;
      const sloganWidth = onScreenWidth * vwToImg;
      const sloganHeight = (sloganImg.height / sloganImg.width) * sloganWidth;
      const bottomOffset = onScreenBottomOffset * vhToImg;
      const sloganX = (compositeCanvas.width - sloganWidth) / 2;
      const sloganY = compositeCanvas.height - bottomOffset - sloganHeight;
      ctx.drawImage(sloganImg, sloganX, sloganY, sloganWidth, sloganHeight);
    } catch (e) {
      console.warn('Slogan overlay failed; proceeding without slogan');
    }

    // Use toBlob + object URL for reliable download
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

// Share the current composite image using the native share dialog when available.
// Falls back to downloading the image if native sharing is not supported.
async function ShareImage() {


}
//@ts-ignore
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
      // Show share button when processed image is displayed
      if (shareBtn) {
        shareBtn.style.display = 'flex';
      }
    };
    img.onerror = () => {
      console.error('Failed to load processed image');
      alert('Failed to load processed image. Please try again.');
    };
    img.src = imageUrl;
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