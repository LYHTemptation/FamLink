import { useState, useEffect } from 'react';
import { PNG } from 'pngjs/browser.js';
import jpeg from 'jpeg-js';
import { Buffer } from 'buffer';

// Global In-Memory Cache for processed transparent PNGs
const transparentCache = new Map<string, string>();

/**
 * Pure JavaScript base64 to Buffer converter
 */
function base64ToBuffer(base64: string): Buffer {
  const clean = base64.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '');
  return Buffer.from(clean, 'base64');
}

/**
 * Pure JavaScript Buffer to base64 string converter
 */
function bufferToBase64(bytes: Uint8Array | Buffer): string {
  return Buffer.from(bytes).toString('base64');
}

/**
 * Pure JavaScript on-device background transparency converter
 * Removes connected white/near-white background pixels using 4-border BFS flood fill.
 * Works 100% natively on iOS, Android, and Web without any DOM or Canvas dependency!
 *
 * @param {string} imageSource - base64 Data URI or remote URL
 * @param {number} threshold - white brightness cutoff (default: 228)
 * @returns {Promise<string>} - transparent PNG Data URI (`data:image/png;base64,...`)
 */
export async function makeBackgroundTransparentOnDevice(imageSource: string, threshold: number = 228): Promise<string> {
  if (!imageSource || typeof imageSource !== 'string') return imageSource;

  // Already transparent SVG
  if (imageSource.startsWith('data:image/svg+xml')) return imageSource;

  if (transparentCache.has(imageSource)) {
    return transparentCache.get(imageSource)!;
  }

  try {
    let rawBytes = null;

    if (imageSource.startsWith('data:image')) {
      rawBytes = base64ToBuffer(imageSource);
    } else if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
      const resp = await fetch(imageSource);
      if (!resp.ok) return imageSource;
      const arrayBuffer = await resp.arrayBuffer();
      rawBytes = Buffer.from(arrayBuffer);
    } else {
      return imageSource;
    }

    if (!rawBytes || rawBytes.length < 8) return imageSource;

    let width = 0;
    let height = 0;
    let rgbaData = null;

    // Detect format by magic header bytes
    if (rawBytes[0] === 0xFF && rawBytes[1] === 0xD8) {
      // JPEG
      const decoded = jpeg.decode(rawBytes, { useTArray: true });
      width = decoded.width;
      height = decoded.height;
      rgbaData = decoded.data;
    } else if (rawBytes[0] === 0x89 && rawBytes[1] === 0x50 && rawBytes[2] === 0x4E && rawBytes[3] === 0x47) {
      // PNG
      const decoded = PNG.sync.read(Buffer.isBuffer(rawBytes) ? rawBytes : Buffer.from(rawBytes));
      width = decoded.width;
      height = decoded.height;
      rgbaData = decoded.data;
    } else {
      // Unsupported or raw format
      return imageSource;
    }

    if (!width || !height || !rgbaData) return imageSource;

    // Ultra-fast zero-allocation BFS Flood Fill from all 4 borders
    // with White-Character Silhouette Protection (흰색 반려몽 몸통 투명화 침식 방지)
    const totalPixels = width * height;

    // 1. Identify character feature/contour pixels (non-pure-white: outlines, eyes, nose, shading, color)
    const isFeature = new Uint8Array(totalPixels);
    const rowMinX = new Int32Array(height).fill(width);
    const rowMaxX = new Int32Array(height).fill(-1);
    const colMinY = new Int32Array(width).fill(height);
    const colMaxY = new Int32Array(width).fill(-1);

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const pIdx = rowOffset + x;
        const dIdx = pIdx * 4;
        const a = rgbaData[dIdx + 3];
        if (a < 50) continue;

        const r = rgbaData[dIdx];
        const g = rgbaData[dIdx + 1];
        const b = rgbaData[dIdx + 2];
        const maxVal = Math.max(r, g, b);
        const minVal = Math.min(r, g, b);

        // Character contour, shading, or colored pixel (not pure studio white background)
        if (minVal < 238 || maxVal - minVal > 12) {
          isFeature[pIdx] = 1;
          if (x < rowMinX[y]) rowMinX[y] = x;
          if (x > rowMaxX[y]) rowMaxX[y] = x;
          if (y < colMinY[x]) colMinY[x] = y;
          if (y > colMaxY[x]) colMaxY[x] = y;
        }
      }
    }

    // 2. Build 1px dilated edge barrier to seal micro-gaps in light outlines of white pets
    const isBarrier = new Uint8Array(totalPixels);
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const pIdx = rowOffset + x;
        if (isFeature[pIdx]) {
          isBarrier[pIdx] = 1;
          if (x > 0) isBarrier[pIdx - 1] = 1;
          if (x < width - 1) isBarrier[pIdx + 1] = 1;
          if (y > 0) isBarrier[pIdx - width] = 1;
          if (y < height - 1) isBarrier[pIdx + width] = 1;
        }
      }
    }

    const isBackgroundWhitePixel = (pIdx: number): boolean => {
      if (isBarrier[pIdx]) return false;
      const dIdx = pIdx * 4;
      if (rgbaData[dIdx + 3] < 50) return true;
      const r = rgbaData[dIdx];
      const g = rgbaData[dIdx + 1];
      const b = rgbaData[dIdx + 2];
      const maxVal = Math.max(r, g, b);
      const minVal = Math.min(r, g, b);
      // Only pure/near-pure neutral white studio background (never eat light gray/cream fur shading)
      const strictCutoff = Math.max(240, threshold);
      return minVal >= strictCutoff && maxVal - minVal <= 10;
    };

    const runFloodFill = (protectInteriorSilhouette: boolean): Uint8Array => {
      const visited = new Uint8Array(totalPixels);
      const bgMask = new Uint8Array(totalPixels);
      const queueX = new Int32Array(totalPixels);
      const queueY = new Int32Array(totalPixels);
      let head = 0;
      let tail = 0;

      const isProtectedInterior = (x: number, y: number): boolean => {
        if (!protectInteriorSilhouette) return false;
        // Enclosed both horizontally and vertically by character contour/features
        return (
          rowMinX[y] + 2 <= x &&
          x <= rowMaxX[y] - 2 &&
          colMinY[x] + 2 <= y &&
          y <= colMaxY[x] - 2
        );
      };

      const tryEnqueue = (x: number, y: number): void => {
        const pIdx = y * width + x;
        if (visited[pIdx]) return;
        visited[pIdx] = 1;
        if (isProtectedInterior(x, y)) return;
        if (isBackgroundWhitePixel(pIdx)) {
          bgMask[pIdx] = 1;
          queueX[tail] = x;
          queueY[tail] = y;
          tail++;
        }
      };

      for (let x = 0; x < width; x++) {
        tryEnqueue(x, 0);
        tryEnqueue(x, height - 1);
      }
      for (let y = 0; y < height; y++) {
        tryEnqueue(0, y);
        tryEnqueue(width - 1, y);
      }

      while (head < tail) {
        const cx = queueX[head];
        const cy = queueY[head];
        head++;

        if (cx > 0) tryEnqueue(cx - 1, cy);
        if (cx < width - 1) tryEnqueue(cx + 1, cy);
        if (cy > 0) tryEnqueue(cx, cy - 1);
        if (cy < height - 1) tryEnqueue(cx, cy + 1);
      }

      return bgMask;
    };

    // First pass: standard border flood fill with contour barrier
    let finalBgMask = runFloodFill(false);

    // Check if flood fill leaked into the character's interior core (e.g., borderless white fur)
    let interiorTotal = 0;
    let interiorErased = 0;
    for (let y = Math.floor(height * 0.2); y < Math.floor(height * 0.8); y++) {
      for (let x = Math.floor(width * 0.2); x < Math.floor(width * 0.8); x++) {
        if (
          rowMinX[y] + 2 <= x &&
          x <= rowMaxX[y] - 2 &&
          colMinY[x] + 2 <= y &&
          y <= colMaxY[x] - 2
        ) {
          interiorTotal++;
          if (finalBgMask[y * width + x]) interiorErased++;
        }
      }
    }

    // If > 8% of the character's enclosed interior was erased, re-run with interior silhouette shield
    if (interiorTotal > 0 && interiorErased / interiorTotal > 0.08) {
      finalBgMask = runFloodFill(true);
    }

    for (let pIdx = 0; pIdx < totalPixels; pIdx++) {
      if (finalBgMask[pIdx]) {
        rgbaData[pIdx * 4 + 3] = 0;
      }
    }

    // Pack into clean transparent PNG
    const outPng = new PNG({ width, height });
    outPng.data = Buffer.isBuffer(rgbaData) ? rgbaData : Buffer.from(rgbaData);
    const pngBytes = PNG.sync.write(outPng);

    const base64Png = bufferToBase64(pngBytes);
    const finalDataUri = `data:image/png;base64,${base64Png}`;

    transparentCache.set(imageSource, finalDataUri);
    return finalDataUri;
  } catch (err) {
    console.warn('[ImageTransparency] On-device conversion error:', err);
    return imageSource;
  }
}

/**
 * React Hook for rendering a transparent version of any image URI
 */
export function useTransparentImage(imageUri?: string | null): string | null | undefined {
  const [cleanUri, setCleanUri] = useState<string | null | undefined>(imageUri);

  useEffect(() => {
    if (!imageUri) {
      setCleanUri(null);
      return;
    }
    if (imageUri.startsWith('data:image/svg+xml')) {
      setCleanUri(imageUri);
      return;
    }

    let isMounted = true;
    makeBackgroundTransparentOnDevice(imageUri).then((res) => {
      if (isMounted && res) {
        setCleanUri(res);
      }
    }).catch(() => {
      if (isMounted) setCleanUri(imageUri);
    });

    return () => {
      isMounted = false;
    };
  }, [imageUri]);

  return cleanUri || imageUri;
}
