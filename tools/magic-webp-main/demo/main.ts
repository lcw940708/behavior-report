/**
 * Demo page for magic-webp
 * Uses MagicWebpWorker API for background processing to keep UI responsive
 */

import { MagicWebpWorker, setDebugMode } from '../src-js/index.js';
import WorkerUrl from '../src-js/worker.ts?worker&url';
import testAnimatedWebpUrl from './assets/test-animated.webp?url';

// Enable debug mode for demo (disabled by default in production)
setDebugMode(true);

// Create worker using MagicWebpWorker API
const webp = new MagicWebpWorker(WorkerUrl);

console.log("[demo] MagicWebpWorker created");

// Auto-load default image on page load
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch(testAnimatedWebpUrl);
    const blob = await response.blob();
    const file = new File([blob], 'test-animated.webp', { type: 'image/webp' });
    loadFile(file);
  } catch (e) {
    console.error('[demo] Failed to load default image:', e);
  }
});

// ── DOM refs ──────────────────────────────────────────────────────────────
const uploadArea = document.getElementById("uploadArea") as HTMLDivElement;
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const qualitySlider = document.getElementById("qualitySlider") as HTMLInputElement;
const qualityValue = document.getElementById("qualityValue") as HTMLSpanElement;
const btnCropCenter = document.getElementById("btnCropCenter") as HTMLButtonElement;
const btnResize400 = document.getElementById("btnResize400") as HTMLButtonElement;
const btnResizeFit300 = document.getElementById("btnResizeFit300") as HTMLButtonElement;
const btnCrop = document.getElementById("btnCrop") as HTMLButtonElement;
const btnResize = document.getElementById("btnResize") as HTMLButtonElement;
const btnResizeFit = document.getElementById("btnResizeFit") as HTMLButtonElement;
const origImg = document.getElementById("origImg") as HTMLImageElement;
const resultImg = document.getElementById("resultImg") as HTMLImageElement;
const origInfo = document.getElementById("origInfo") as HTMLDivElement;
const resultInfo = document.getElementById("resultInfo") as HTMLDivElement;
const statusContainer = document.getElementById("statusContainer") as HTMLDivElement;
const dlLink = document.getElementById("dlLink") as HTMLAnchorElement;

// ── State ─────────────────────────────────────────────────────────────────
let isImageLoaded = false;
let prevObjectURL = "";
let isProcessing = false;
let currentQuality = 75;

// ── Quality slider ────────────────────────────────────────────────────────
function updateQualityLabel(value: number) {
  let label = "";
  if (value === 100) {
    label = "💎 Lossless";
  } else if (value >= 90) {
    label = "✨ High";
  } else if (value >= 75) {
    label = "⚖️ Balanced";
  } else if (value >= 60) {
    label = "📦 Compressed";
  } else {
    label = "🗜️ Max Compression";
  }
  qualityValue.textContent = `${value} (${label})`;
  currentQuality = value;
}

qualitySlider.addEventListener('input', (e) => {
  const value = parseInt((e.target as HTMLInputElement).value);
  updateQualityLabel(value);
});

// Global function for preset buttons
(window as any).setQuality = (value: number) => {
  qualitySlider.value = value.toString();
  updateQualityLabel(value);
};

// Initialize quality label
updateQualityLabel(75);

// ── Helpers ───────────────────────────────────────────────────────────────
function isImageFile(file: File): boolean {
  const supportedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  return supportedTypes.includes(file.type) ||
         file.name.match(/\.(png|jpe?g|gif|webp)$/i) !== null;
}

function needsConversion(file: File): boolean {
  return file.type !== 'image/webp' && !file.name.toLowerCase().endsWith('.webp');
}

function setStatus(msg: string, kind: "ok" | "error" | "" = "") {
  if (msg) {
    statusContainer.innerHTML = `<div class="status ${kind}">${msg}</div>`;
  } else {
    statusContainer.innerHTML = '';
  }
}

function kb(bytes: number) {
  return (bytes / 1024).toFixed(2) + " KB";
}

function enableButtons(enabled: boolean) {
  btnCropCenter.disabled = !enabled;
  btnResize400.disabled = !enabled;
  btnResizeFit300.disabled = !enabled;
  btnCrop.disabled = !enabled;
  btnResize.disabled = !enabled;
  btnResizeFit.disabled = !enabled;
}

async function showResult(blob: Blob, operation: string) {
  // Revoke previous URL to avoid memory leaks
  if (prevObjectURL) URL.revokeObjectURL(prevObjectURL);
  prevObjectURL = URL.createObjectURL(blob);

  resultImg.src = prevObjectURL;
  resultImg.style.display = 'block';

  // Get actual dimensions from the result image
  await new Promise((resolve) => {
    resultImg.onload = () => {
      const width = resultImg.naturalWidth;
      const height = resultImg.naturalHeight;
      resultInfo.textContent = `${width} × ${height} px | Size: ${kb(blob.size)}`;
      setStatus(`✓ ${operation} complete → ${width}×${height} px, ${kb(blob.size)}`, "ok");
      resolve(null);
    };
  });

  dlLink.href = prevObjectURL;
  dlLink.download = `magic-webp-${operation}.webp`;
  dlLink.style.display = "inline-block";
}

// ── Drag & Drop ───────────────────────────────────────────────────────────
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const file = e.dataTransfer?.files[0];
  if (file && isImageFile(file)) {
    loadFile(file);
  } else {
    setStatus('Please drop a supported image file (PNG, JPEG, GIF, WebP)', 'error');
  }
});

fileInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    loadFile(file);
  }
});

// ── File load ─────────────────────────────────────────────────────────────
async function loadFile(file: File) {
  if (isProcessing) {
    setStatus("Please wait, processing...", "error");
    return;
  }

  setStatus("Loading…");
  isProcessing = true;
  enableButtons(false);

  try {
    console.log("[demo] Loading file:", file.name, "type:", file.type);

    // Show original image
    origImg.src = URL.createObjectURL(file);
    origImg.style.display = 'block';

    const originalSize = file.size;
    const fileType = file.type || `image/${file.name.split('.').pop()}`;

    // Check if conversion is needed
    let fileToLoad = file;
    let convertedBlob: Blob | null = null;

    if (needsConversion(file)) {
      const formatName = fileType.replace('image/', '').toUpperCase();
      setStatus(`🔄 Converting ${formatName} to WebP...`);
      console.log("[demo] Converting", formatName, "to WebP");

      // Convert to WebP using worker
      convertedBlob = await webp.convert(file, 75, false);

      // Create a new File object from the converted blob
      fileToLoad = new File([convertedBlob], file.name.replace(/\.[^.]+$/, '.webp'), {
        type: 'image/webp'
      });

      const compressionRatio = ((1 - convertedBlob.size / originalSize) * 100).toFixed(1);

      console.log("[demo] Conversion complete:", kb(originalSize), "→", kb(convertedBlob.size));

      // Show converted image in "Processed" section
      resultImg.src = URL.createObjectURL(convertedBlob);
      resultImg.style.display = 'block';
      resultInfo.textContent = `Converted to WebP | ${kb(originalSize)} → ${kb(convertedBlob.size)} (${compressionRatio}% smaller)`;

      // Setup download link
      dlLink.href = URL.createObjectURL(convertedBlob);
      dlLink.download = file.name.replace(/\.[^.]+$/, '.webp');
      dlLink.style.display = 'inline-block';
    } else {
      // Clear result for WebP files
      resultImg.src = "";
      resultImg.style.display = 'none';
      resultInfo.textContent = "";
      dlLink.style.display = "none";
    }

    origInfo.textContent = `${fileType.replace('image/', '').toUpperCase()} | Size: ${kb(originalSize)}`;

    // Load image using MagicWebpWorker
    // Note: fileToLoad is already in WebP format if conversion was needed
    console.log("[demo] Loading into worker:", fileToLoad.name, "type:", fileToLoad.type, "size:", kb(fileToLoad.size));
    const { width, height } = await webp.load(fileToLoad);

    // Update info with dimensions
    origInfo.textContent = `${fileType.replace('image/', '').toUpperCase()} | ${width} × ${height} px | Size: ${kb(originalSize)}`;

    if (convertedBlob) {
      setStatus(`✓ Image converted to WebP and loaded: ${width}×${height} px`, "ok");
      console.log("[demo] Image ready for processing (crop, resize, etc.)");
    } else {
      setStatus(`✓ Image loaded: ${width}×${height} px`, "ok");
    }

    isImageLoaded = true;
    isProcessing = false;
    enableButtons(true);

  } catch (e: any) {
    console.error("[demo] Error loading file:", e);
    setStatus(e.message || String(e), "error");
    isProcessing = false;
    enableButtons(false);
  }
}

// ── Quick Actions ───────────────────────────────────────────────────────────
btnCropCenter.addEventListener("click", async () => {
  if (!isImageLoaded) {
    setStatus("Load an image first.", "error");
    return;
  }
  if (isProcessing) {
    setStatus("Please wait, processing...", "error");
    return;
  }

  // Crop 200x200 from center (or smaller if image is too small)
  const width = webp.width || 0;
  const height = webp.height || 0;

  // Check if image is large enough for 200x200 crop
  if (width < 200 || height < 200) {
    setStatus(`Image too small for 200×200 crop (${width}×${height}). Minimum size: 200×200`, "error");
    return;
  }

  const x = Math.max(0, Math.floor((width - 200) / 2));
  const y = Math.max(0, Math.floor((height - 200) / 2));

  setStatus(`Cropping center 200×200 (quality: ${currentQuality})…`);
  isProcessing = true;

  try {
    const blob = await webp.crop(x, y, 200, 200, currentQuality);
    await showResult(blob, 'crop-center');
  } catch (e: any) {
    setStatus(e.message || String(e), "error");
  } finally {
    isProcessing = false;
  }
});

btnResize400.addEventListener("click", async () => {
  if (!isImageLoaded) {
    setStatus("Load an image first.", "error");
    return;
  }
  if (isProcessing) {
    setStatus("Please wait, processing...", "error");
    return;
  }

  setStatus(`Resizing to 400×400 cover (quality: ${currentQuality})…`);
  isProcessing = true;

  try {
    const blob = await webp.resize(400, 400, { mode: 'cover', quality: currentQuality });
    await showResult(blob, 'resize-cover-400');
  } catch (e: any) {
    setStatus(e.message || String(e), "error");
  } finally {
    isProcessing = false;
  }
});

btnResizeFit300.addEventListener("click", async () => {
  if (!isImageLoaded) {
    setStatus("Load an image first.", "error");
    return;
  }
  if (isProcessing) {
    setStatus("Please wait, processing...", "error");
    return;
  }

  setStatus(`Resizing to fit 300×300 contain (quality: ${currentQuality})…`);
  isProcessing = true;

  try {
    const blob = await webp.resize(300, 300, { mode: 'contain', quality: currentQuality });
    await showResult(blob, 'resize-contain-300');
  } catch (e: any) {
    setStatus(e.message || String(e), "error");
  } finally {
    isProcessing = false;
  }
});

// ── Advanced Crop ──────────────────────────────────────────────────────────
btnCrop.addEventListener("click", async () => {
  if (!isImageLoaded) {
    setStatus("Load an image first.", "error");
    return;
  }
  if (isProcessing) {
    setStatus("Please wait, processing...", "error");
    return;
  }

  const x = parseInt((document.getElementById("cropX") as HTMLInputElement).value);
  const y = parseInt((document.getElementById("cropY") as HTMLInputElement).value);
  const w = parseInt((document.getElementById("cropW") as HTMLInputElement).value);
  const h = parseInt((document.getElementById("cropH") as HTMLInputElement).value);

  setStatus(`Cropping (quality: ${currentQuality})…`);
  isProcessing = true;

  try {
    const blob = await webp.crop(x, y, w, h, currentQuality);
    await showResult(blob, 'crop');
  } catch (e: any) {
    setStatus(e.message || String(e), "error");
  } finally {
    isProcessing = false;
  }
});

// ── Resize (cover mode) ───────────────────────────────────────────────────
btnResize.addEventListener("click", async () => {
  if (!isImageLoaded) {
    setStatus("Load an image first.", "error");
    return;
  }
  if (isProcessing) {
    setStatus("Please wait, processing...", "error");
    return;
  }

  const w = parseInt((document.getElementById("resizeW") as HTMLInputElement).value);
  const h = parseInt((document.getElementById("resizeH") as HTMLInputElement).value);

  setStatus(`Resizing cover (quality: ${currentQuality})…`);
  isProcessing = true;

  try {
    const blob = await webp.resize(w, h, { mode: 'cover', quality: currentQuality });
    await showResult(blob, 'resize-cover');
  } catch (e: any) {
    setStatus(e.message || String(e), "error");
  } finally {
    isProcessing = false;
  }
});

// ── Resize (contain mode) ─────────────────────────────────────────────────
btnResizeFit.addEventListener("click", async () => {
  if (!isImageLoaded) {
    setStatus("Load an image first.", "error");
    return;
  }
  if (isProcessing) {
    setStatus("Please wait, processing...", "error");
    return;
  }

  const w = parseInt((document.getElementById("resizeW") as HTMLInputElement).value);
  const h = parseInt((document.getElementById("resizeH") as HTMLInputElement).value);

  setStatus(`Resizing contain (quality: ${currentQuality})…`);
  isProcessing = true;

  try {
    const blob = await webp.resize(w, h, { mode: 'contain', quality: currentQuality });
    await showResult(blob, 'resize-contain');
  } catch (e: any) {
    setStatus(e.message || String(e), "error");
  } finally {
    isProcessing = false;
  }
});



