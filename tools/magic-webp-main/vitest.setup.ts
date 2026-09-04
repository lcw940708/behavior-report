import { readFileSync } from "fs";
import { resolve } from "path";

// Mock fetch to load WASM from filesystem
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  // Intercept WASM file requests
  if (url.includes("magic_webp.wasm")) {
    const wasmPath = resolve(__dirname, "pkg/magic_webp.wasm");
    try {
      const wasmBuffer = readFileSync(wasmPath);
      return new Response(wasmBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/wasm",
        },
      });
    } catch (e) {
      console.error("[vitest.setup] Failed to load WASM file:", e);
      throw e;
    }
  }

  // Fall back to original fetch for other requests
  return originalFetch(input, init);
};

// Mock createImageBitmap for happy-dom
// We'll use a simple implementation that extracts dimensions from WebP header
if (typeof globalThis.createImageBitmap === "undefined") {
  (globalThis as any).createImageBitmap = async (blob: Blob): Promise<ImageBitmap> => {
    const arrayBuffer = await blob.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Parse WebP dimensions from header
    let width = 0;
    let height = 0;

    // Check for VP8X chunk (extended format)
    if (data.length > 30 &&
        data[12] === 0x56 && data[13] === 0x50 && data[14] === 0x38 && data[15] === 0x58) {
      // VP8X chunk - dimensions at offset 24-26 (width) and 27-29 (height)
      width = (data[24] | (data[25] << 8) | (data[26] << 16)) + 1;
      height = (data[27] | (data[28] << 8) | (data[29] << 16)) + 1;
    }
    // Check for VP8 chunk (lossy)
    else if (data.length > 30 &&
             data[12] === 0x56 && data[13] === 0x50 && data[14] === 0x38 && data[15] === 0x20) {
      // VP8 chunk - dimensions at offset 26-27 (width) and 28-29 (height)
      width = data[26] | (data[27] << 8);
      height = data[28] | (data[29] << 8);
    }
    // Check for VP8L chunk (lossless)
    else if (data.length > 25 &&
             data[12] === 0x56 && data[13] === 0x50 && data[14] === 0x38 && data[15] === 0x4C) {
      // VP8L chunk - dimensions encoded in bits
      const bits = (data[21] | (data[22] << 8) | (data[23] << 16) | (data[24] << 24)) >>> 0;
      width = ((bits & 0x3FFF) + 1);
      height = (((bits >> 14) & 0x3FFF) + 1);
    }

    return {
      width,
      height,
      close: () => {},
    } as ImageBitmap;
  };
}

