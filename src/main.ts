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
let shareBtn: HTMLButtonElement;
let genderOverlay: HTMLDivElement;
let maleBtn: HTMLButtonElement;
let femaleBtn: HTMLButtonElement;
let fileInput: HTMLInputElement;
let launchParams = { launchParams: { genderSelected: "M" } }


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
  shareBtn = document.getElementById('share-btn') as HTMLButtonElement;
  fileInput = document.getElementById('file-input') as HTMLInputElement;

  // Hide capture until gender selection is made
  uploadBtn.style.display = 'none';
  captureBtn.style.display = 'none';

  uploadBtn.addEventListener('click', () => openImageOnlyPicker());
  fileInput.addEventListener('change', handleFileUpload);
  captureBtn.addEventListener('click', capturePhoto);
  closePreviewBtn.addEventListener('click', ClosePreview);
  generateBtn.addEventListener('click', () => { });
  downloadImageBtn.addEventListener('click', DownloadImage);
  if (shareBtn) {
    shareBtn.style.display = 'none';
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
//@ts-ignore
function onGenderSelected(gender: 'M' | 'F') {
  if(gender === 'M') {
    launchParams.launchParams.genderSelected = 'M';
  } else {
    launchParams.launchParams.genderSelected = 'F';
  }
  console.log(launchParams);
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
  if (shareBtn) shareBtn.style.display = 'none';

  // Show capture and upload buttons again
  if (captureBtn) captureBtn.style.display = 'flex';
  if (uploadBtn) uploadBtn.style.display = 'flex';
}

//@ts-ignore
async function DownloadImage() {
  try {
    if (!capturedImageData) return;
    if (downloadImageBtn) downloadImageBtn.disabled = true;

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