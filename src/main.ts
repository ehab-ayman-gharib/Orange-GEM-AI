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
let captureBtn: HTMLButtonElement;
let capturedImageData: string | null = null;
let downloadImageBtn: HTMLButtonElement;
let closePreviewBtn: HTMLButtonElement;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Camera Kit
  await initCameraKit();
})

// Initialize Camera Kit
async function initCameraKit() {
  let loadedLensesCount: number = 0;
  try {
    const cameraKit = await bootstrapCameraKit({ apiToken: APP_CONFIG.CAMERA_KIT_API_TOKEN });
    cameraKitSession = await cameraKit.createSession({ liveRenderTarget: camerakitCanvas });
    console.log(`Loaded ${loadedLensesCount} lenses`);
    // Hide loader immediately and start splash fade-out
    hideSplashLoader();
    setCameraKitSource(cameraKitSession, true); // Use Front Camera
    setTimeout(() => {
      setupCaptureUI();
    }, 0);
  }
  //});
  //});
  catch (error) {
    console.error('Failed to initialize CameraKit:', error);
  }
}

function setupCaptureUI() {
  captureBtn = document.getElementById('capture-btn') as HTMLButtonElement;
  downloadImageBtn = document.getElementById('download-btn') as HTMLButtonElement;
  closePreviewBtn = document.getElementById('retake-btn') as HTMLButtonElement;
  captureBtn.style.display = 'flex';
  captureBtn.addEventListener('click', capturePhoto);
  closePreviewBtn.addEventListener('click', ClosePreview);
  downloadImageBtn.addEventListener('click', SendToNanoBanana);
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

    // Hide capture button, show download and close buttons
    if (captureBtn) captureBtn.style.display = 'none';
    if (downloadImageBtn) downloadImageBtn.style.display = 'flex';
    if (closePreviewBtn) closePreviewBtn.style.display = 'flex';

  } catch (error) {
    console.error('Failed to capture photo:', error);
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

  // Hide download and close buttons

  if (downloadImageBtn) downloadImageBtn.style.display = 'none';
  if (closePreviewBtn) closePreviewBtn.style.display = 'none';
  ``
  // Show capture button again
  if (captureBtn) captureBtn.style.display = 'flex';
}

//@ts-ignore
function DownloadImage() {
  if (capturedImageData) {
    const a = document.createElement('a');
    a.href = capturedImageData;
    a.download = `photo-preview-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

    if (downloadImageBtn) {
      downloadImageBtn.disabled = true;
      downloadImageBtn.textContent = 'Processing...';
    }

    const body = {
      input: {
        image_input: [capturedImageData],
        prompt: APP_CONFIG.NANO_BANANA_PROMPT
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
    
    // Hide download button (image is already shown in preview)
    if (downloadImageBtn) {
      downloadImageBtn.style.display = 'none';
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
    
    if (downloadImageBtn) {
      downloadImageBtn.disabled = false;
      downloadImageBtn.textContent = 'Download';
    }
  }
}